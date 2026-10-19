import { ClientsService } from '../modules/clients/clients.service';
import prisma from '../config/database';
import { ClientSource } from '@prisma/client';

async function runUnitTests() {
  console.log('--- Unit Testing ClientsService Referral Attribution Logic ---');

  const clientsService = new ClientsService();
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failCount++;
    }
  }

  // Backup original prisma methods
  const originalUserFindFirst = prisma.user.findFirst;
  const originalClientFindFirst = prisma.client.findFirst;
  const originalClientFindMany = prisma.client.findMany;
  const originalClientCreate = prisma.client.create;
  const originalHistoryCreate = prisma.clientHistory.create;

  try {
    // Mock user database
    const mockTech = {
      id: '11111111-1111-1111-1111-111111111111',
      isActive: true,
      role: { name: 'TECHNICIAN' },
    };
    const mockCleaner = {
      id: '22222222-2222-2222-2222-222222222222',
      isActive: true,
      role: { name: 'CLEANER' },
    };
    const mockManager = {
      id: '33333333-3333-3333-3333-333333333333',
      isActive: true,
      role: { name: 'MANAGER' },
    };

    // Test 1: Manager creates Direct Walk-In client
    (prisma.client.findFirst as any) = async () => null;
    (prisma.client.findMany as any) = async () => [];
    let capturedCreateData: any = null;
    (prisma.client.create as any) = async (args: any) => {
      capturedCreateData = args.data;
      return { id: 'c1', ...args.data };
    };
    (prisma.clientHistory.create as any) = async () => ({ id: 'h1' });

    await clientsService.createClient(
      {
        name: 'Direct Client',
        phone: '+237 671111111',
        introducedByEmployeeId: null,
      },
      { id: mockManager.id, role: 'MANAGER' }
    );

    assert(
      capturedCreateData?.source === ClientSource.DIRECT && capturedCreateData?.introducedByEmployeeId === null,
      'Test 1: Manager Direct creation sets source DIRECT and introducedByEmployeeId null'
    );

    // Test 2: Manager creates client with valid Technician referral
    (prisma.user.findFirst as any) = async (args: any) => {
      if (args.where.id === mockTech.id) return mockTech;
      return null;
    };

    await clientsService.createClient(
      {
        name: 'Referred Client',
        phone: '+237 672222222',
        introducedByEmployeeId: mockTech.id,
      },
      { id: mockManager.id, role: 'MANAGER' }
    );

    assert(
      capturedCreateData?.source === ClientSource.STAFF_REFERRAL && capturedCreateData?.introducedByEmployeeId === mockTech.id,
      'Test 2: Manager-selected active technician sets STAFF_REFERRAL and tech ID'
    );

    // Test 3: Manager passes nonexistent staff ID
    let caughtNotFound = false;
    try {
      await clientsService.createClient(
        {
          name: 'Invalid Staff Client',
          phone: '+237 673333333',
          introducedByEmployeeId: '00000000-0000-0000-0000-000000000000',
        },
        { id: mockManager.id, role: 'MANAGER' }
      );
    } catch (err: any) {
      caughtNotFound = err.statusCode === 400 && err.message.includes('does not exist or is inactive');
    }
    assert(caughtNotFound, 'Test 3: Nonexistent staff referral throws 400 Bad Request');

    // Test 4: Manager passes cleaner as referrer (ineligible role)
    (prisma.user.findFirst as any) = async (args: any) => {
      if (args.where.id === mockCleaner.id) return mockCleaner;
      return null;
    };
    let caughtIneligible = false;
    try {
      await clientsService.createClient(
        {
          name: 'Cleaner Referral Client',
          phone: '+237 674444444',
          introducedByEmployeeId: mockCleaner.id,
        },
        { id: mockManager.id, role: 'MANAGER' }
      );
    } catch (err: any) {
      caughtIneligible = err.statusCode === 400 && err.message.includes('not eligible');
    }
    assert(caughtIneligible, 'Test 4: Ineligible cleaner role referral throws 400 Bad Request');

    // Test 5: Staff creates client (auto-derived from session)
    await clientsService.createClient(
      {
        name: 'Staff Created Client',
        phone: '+237 675555555',
      },
      { id: mockTech.id, role: 'TECHNICIAN' }
    );
    assert(
      capturedCreateData?.source === ClientSource.STAFF_REFERRAL && capturedCreateData?.introducedByEmployeeId === mockTech.id,
      'Test 5: Staff client creation automatically sets STAFF_REFERRAL and session tech ID'
    );

    // Test 6: Staff attempts to spoof another staff member's ID in body
    await clientsService.createClient(
      {
        name: 'Spoofed Attempt Client',
        phone: '+237 676666666',
        introducedByEmployeeId: 'some-other-uuid',
      },
      { id: mockTech.id, role: 'TECHNICIAN' }
    );
    assert(
      capturedCreateData?.introducedByEmployeeId === mockTech.id,
      'Test 6: Staff body referral ID is ignored; backend strictly sets session user ID'
    );

    // Test 7: Duplicate phone check
    (prisma.client.findFirst as any) = async () => ({ id: 'c_existing', name: 'Existing User' });
    let caughtDuplicate = false;
    try {
      await clientsService.createClient(
        {
          name: 'Duplicate Phone Client',
          phone: '+237 675555555',
        },
        { id: mockManager.id, role: 'MANAGER' }
      );
    } catch (err: any) {
      caughtDuplicate = err.statusCode === 409 && err.message.includes('already exists');
    }
    assert(caughtDuplicate, 'Test 7: Duplicate phone returns 409 Conflict with existing client name');

    // =========================================================================
    // TESTS 8 - 11: GET CLIENTS REFERRAL ISOLATION TESTS
    // =========================================================================
    let capturedFindManyWhere: any = null;
    (prisma.client.count as any) = async () => 0;
    (prisma.client.findMany as any) = async (args: any) => {
      capturedFindManyWhere = args?.where;
      return [];
    };

    const otherStaffId = '99999999-9999-9999-9999-999999999999';

    // Test 8: Technician queries another staff member's referrals via query param tampering
    capturedFindManyWhere = null;
    await clientsService.getClients(
      { introducedByEmployeeId: otherStaffId },
      { id: mockTech.id, role: 'TECHNICIAN' }
    );
    assert(
      capturedFindManyWhere?.introducedByEmployeeId === mockTech.id,
      'Test 8: Technician query for another staff ID is overridden to their own session ID'
    );

    // Test 9: Technician queries general client list without introducedByEmployeeId
    capturedFindManyWhere = null;
    await clientsService.getClients(
      { search: 'Amina' },
      { id: mockTech.id, role: 'TECHNICIAN' }
    );
    assert(
      capturedFindManyWhere?.introducedByEmployeeId === undefined,
      'Test 9: Technician general client search does not restrict to referrals'
    );

    // Test 10: Manager queries specific staff member referrals
    capturedFindManyWhere = null;
    await clientsService.getClients(
      { introducedByEmployeeId: otherStaffId },
      { id: mockManager.id, role: 'MANAGER' }
    );
    assert(
      capturedFindManyWhere?.introducedByEmployeeId === otherStaffId,
      'Test 10: Manager retains permitted access to filter by any specific staff ID'
    );

    // Test 11: Receptionist queries specific staff member referrals
    capturedFindManyWhere = null;
    const mockReception = { id: '44444444-4444-4444-4444-444444444444', role: 'RECEPTION' };
    await clientsService.getClients(
      { introducedByEmployeeId: otherStaffId },
      mockReception
    );
    assert(
      capturedFindManyWhere?.introducedByEmployeeId === otherStaffId,
      'Test 11: Reception staff retains permitted access to filter by staff member'
    );

  } finally {
    // Restore original prisma methods
    prisma.user.findFirst = originalUserFindFirst;
    prisma.client.findFirst = originalClientFindFirst;
    prisma.client.findMany = originalClientFindMany;
    prisma.client.create = originalClientCreate;
    prisma.clientHistory.create = originalHistoryCreate;
  }

  console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount > 0) process.exit(1);
  console.log('🎉 ALL UNIT TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runUnitTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
