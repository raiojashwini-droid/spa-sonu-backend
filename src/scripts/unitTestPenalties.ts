/**
 * OMEGA SPA POS — Unit Test Suite: Feature 4 Staff Conduct Rules & Penalties
 * Verifies business logic, standard rules catalog, validations, and penalty calculations.
 */

import { PenaltiesService } from '../modules/penalties/penalties.service';
import prisma from '../config/database';

async function runUnitTests() {
  console.log('===============================================================');
  console.log('  TEST SUITE: Feature 4 — Staff Conduct Rules & Penalty Records');
  console.log('===============================================================\n');

  const penaltiesService = new PenaltiesService();
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✔ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  ✖ FAIL: ${testName}`);
      failCount++;
    }
  }

  // 1. Test Standard Rules Catalog
  console.log('[Test Group 1: Standard Conduct Rules Catalog]');
  const rules = penaltiesService.getStandardRules();
  assert(rules.length === 5, 'Returns exactly 5 standard rules in catalog');
  assert(rules.some((r) => r.name === 'Late coming' && r.defaultAmount === 2000), 'Rule 1: Late coming is 2,000 FCFA');
  assert(rules.some((r) => r.name === 'No show / Missed work' && r.defaultAmount === 5000), 'Rule 2: No show / Missed work is 5,000 FCFA');
  assert(rules.some((r) => r.name === 'Not dressed properly' && r.defaultAmount === 2000), 'Rule 3: Not dressed properly is 2,000 FCFA');
  assert(rules.some((r) => r.name === 'Rude / Disrespectful to clients' && r.defaultAmount === 5000), 'Rule 4: Rude / Disrespectful to clients is 5,000 FCFA');
  assert(rules.some((r) => r.name === 'Sitting / Hiding in rooms' && r.defaultAmount === 2500), 'Rule 5: Sitting / Hiding in rooms is 2,500 FCFA');

  // Backup prisma methods
  const originalUserFindUnique = prisma.user.findUnique;
  const originalPenaltyCreate = (prisma as any).staffPenalty.create;
  const originalPenaltyFindMany = (prisma as any).staffPenalty.findMany;
  const originalPenaltyFindUnique = (prisma as any).staffPenalty.findUnique;
  const originalPenaltyDelete = (prisma as any).staffPenalty.delete;

  try {
    const mockStaff = {
      id: 'staff-uuid-1111',
      email: 'tech@omega.com',
      role: { name: 'TECHNICIAN' },
      staffProfile: { name: 'Marie Technician' },
    };

    const mockManager = {
      id: 'manager-uuid-9999',
      email: 'manager@omega.com',
      role: { name: 'MANAGER' },
      staffProfile: { name: 'Jean Manager' },
    };

    // Mock prisma.user.findUnique
    (prisma.user as any).findUnique = async ({ where }: any) => {
      if (where.id === 'staff-uuid-1111') return mockStaff;
      if (where.id === 'manager-uuid-9999') return mockManager;
      return null;
    };

    // 2. Test Validations
    console.log('\n[Test Group 2: Create Penalty Validation Checks]');
    
    // Test: Non-existent staff
    let nonExistentFailed = false;
    try {
      await penaltiesService.createPenalty({
        staffId: 'unknown-id',
        ruleName: 'Late coming',
        penaltyAmount: 2000,
        date: '2026-10-19',
        recordedById: 'manager-uuid-9999',
      });
    } catch (e: any) {
      nonExistentFailed = e.message.includes('Staff member not found');
    }
    assert(nonExistentFailed, 'Rejects penalty creation for non-existent staff member (404)');

    // Test: Missing rule name
    let emptyRuleFailed = false;
    try {
      await penaltiesService.createPenalty({
        staffId: 'staff-uuid-1111',
        ruleName: '   ',
        penaltyAmount: 2000,
        date: '2026-10-19',
        recordedById: 'manager-uuid-9999',
      });
    } catch (e: any) {
      emptyRuleFailed = e.message.includes('Rule name is required');
    }
    assert(emptyRuleFailed, 'Rejects penalty with empty rule name (400)');

    // Test: Negative or zero penalty amount
    let zeroAmountFailed = false;
    try {
      await penaltiesService.createPenalty({
        staffId: 'staff-uuid-1111',
        ruleName: 'Late coming',
        penaltyAmount: 0,
        date: '2026-10-19',
        recordedById: 'manager-uuid-9999',
      });
    } catch (e: any) {
      zeroAmountFailed = e.message.includes('must be a positive number');
    }
    assert(zeroAmountFailed, 'Rejects penalty amount <= 0 (400)');

    // Test: Invalid date format
    let invalidDateFailed = false;
    try {
      await penaltiesService.createPenalty({
        staffId: 'staff-uuid-1111',
        ruleName: 'Late coming',
        penaltyAmount: 2000,
        date: '19-10-2026',
        recordedById: 'manager-uuid-9999',
      });
    } catch (e: any) {
      invalidDateFailed = e.message.includes('Invalid date format');
    }
    assert(invalidDateFailed, 'Rejects invalid date format (expects YYYY-MM-DD) (400)');

    // 3. Test Successful Penalty Creation
    console.log('\n[Test Group 3: Penalty Record Creation & Response Mapping]');

    let capturedCreateData: any = null;
    (prisma as any).staffPenalty.create = async ({ data }: any) => {
      capturedCreateData = data;
      return {
        id: 'penalty-uuid-1234',
        staffId: data.staffId,
        ruleName: data.ruleName,
        penaltyAmount: data.penaltyAmount,
        date: data.date,
        notes: data.notes,
        recordedById: data.recordedById,
        createdAt: new Date('2026-10-19T08:30:00Z'),
        updatedAt: new Date('2026-10-19T08:30:00Z'),
        staff: mockStaff,
        recordedBy: mockManager,
      };
    };

    const created = await penaltiesService.createPenalty({
      staffId: 'staff-uuid-1111',
      ruleName: 'Sitting / Hiding in rooms',
      penaltyAmount: 2500,
      date: '2026-10-19',
      notes: 'Found in room 3 on mobile during shift',
      recordedById: 'manager-uuid-9999',
    });

    assert(created.id === 'penalty-uuid-1234', 'Penalty record created with generated UUID');
    assert(created.staffName === 'Marie Technician', 'Correctly resolved staff name from profile');
    assert(created.recordedByName === 'Jean Manager', 'Correctly resolved manager name from profile');
    assert(created.penaltyAmount === 2500, 'Penalty amount mapped accurately as number');
    assert(created.ruleName === 'Sitting / Hiding in rooms', 'Rule name saved accurately');
    assert(created.date === '2026-10-19', 'Date mapped in YYYY-MM-DD format');
    assert(capturedCreateData.notes === 'Found in room 3 on mobile during shift', 'Infraction notes captured in DB data');

    // 4. Test Queries & Total Calculation
    console.log('\n[Test Group 4: Penalty Querying & Aggregate Sum]');

    (prisma as any).staffPenalty.findMany = async () => [
      {
        id: 'p-1',
        staffId: 'staff-uuid-1111',
        ruleName: 'Late coming',
        penaltyAmount: 2000,
        date: new Date('2026-10-15'),
        notes: '30 mins late',
        recordedById: 'manager-uuid-9999',
        createdAt: new Date('2026-10-15T09:00:00Z'),
        staff: mockStaff,
        recordedBy: mockManager,
      },
      {
        id: 'p-2',
        staffId: 'staff-uuid-1111',
        ruleName: 'Sitting / Hiding in rooms',
        penaltyAmount: 2500,
        date: new Date('2026-10-19'),
        notes: 'Room 3 idling',
        recordedById: 'manager-uuid-9999',
        createdAt: new Date('2026-10-19T10:00:00Z'),
        staff: mockStaff,
        recordedBy: mockManager,
      },
      {
        id: 'p-3',
        staffId: 'staff-uuid-1111',
        ruleName: 'Custom: Phone use during service',
        penaltyAmount: 1500,
        date: new Date('2026-10-19'),
        notes: 'Answering personal phone in client presence',
        recordedById: 'manager-uuid-9999',
        createdAt: new Date('2026-10-19T11:00:00Z'),
        staff: mockStaff,
        recordedBy: mockManager,
      },
    ];

    const result = await penaltiesService.getPenalties({ staffId: 'staff-uuid-1111' });
    assert(result.count === 3, 'Found 3 penalty records for staff');
    assert(result.totalPenalties === 6000, 'Accurately calculates total recorded penalties sum (2000 + 2500 + 1500 = 6,000 FCFA)');
    assert(result.penalties[2].ruleName === 'Custom: Phone use during service', 'Supports custom rule creation with custom penalty amount');

    // 5. Test Deletion / Void
    console.log('\n[Test Group 5: Penalty Record Deletion / Voiding]');
    (prisma as any).staffPenalty.findUnique = async ({ where }: any) => {
      if (where.id === 'p-1') return { id: 'p-1' };
      return null;
    };
    (prisma as any).staffPenalty.delete = async () => ({ id: 'p-1' });

    const delResult = await penaltiesService.deletePenalty('p-1');
    assert(delResult.success === true, 'Successfully voids/deletes mistaken penalty record');

    let deleteNonExistent = false;
    try {
      await penaltiesService.deletePenalty('p-999');
    } catch (e: any) {
      deleteNonExistent = e.message.includes('not found');
    }
    assert(deleteNonExistent, 'Rejects deletion of non-existent penalty record (404)');

  } finally {
    // Restore mocks
    prisma.user.findUnique = originalUserFindUnique;
    (prisma as any).staffPenalty.create = originalPenaltyCreate;
    (prisma as any).staffPenalty.findMany = originalPenaltyFindMany;
    (prisma as any).staffPenalty.findUnique = originalPenaltyFindUnique;
    (prisma as any).staffPenalty.delete = originalPenaltyDelete;
  }

  console.log('\n===============================================================');
  console.log(`  SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} tests`);
  console.log('===============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runUnitTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
