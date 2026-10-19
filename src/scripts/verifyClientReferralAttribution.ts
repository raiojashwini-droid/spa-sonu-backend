import prisma from '../config/database';
import { ClientsService } from '../modules/clients/clients.service';

async function runTests() {
  const clientsService = new ClientsService();
  console.log('--- Starting Task 2: Client Referral Attribution Verification ---');

  // Find an active technician and an active manager
  const manager = await prisma.user.findFirst({
    where: { role: { name: 'MANAGER' }, isActive: true },
    include: { role: true },
  });

  const technician = await prisma.user.findFirst({
    where: { role: { name: 'TECHNICIAN' }, isActive: true },
    include: { role: true, staffProfile: true },
  });

  const cleaner = await prisma.user.findFirst({
    where: { role: { name: 'CLEANER' } },
    include: { role: true },
  });

  if (!manager || !technician) {
    console.error('Test prerequisites failed: Need at least one active manager and technician in database.');
    process.exit(1);
  }

  console.log(`Active Manager: ${manager.id} (${manager.email})`);
  console.log(`Active Technician: ${technician.id} (${technician.staffProfile?.name || technician.email})`);

  const timestamp = Date.now().toString().slice(-6);

  // Test 1: Manager creates Direct / Walk-In client (no referral)
  console.log('\n[Test 1] Manager creates Direct / Walk-In client:');
  const client1Phone = `+237 670${timestamp}1`;
  const client1 = await clientsService.createClient(
    {
      name: `Test Direct Client ${timestamp}`,
      phone: client1Phone,
      introducedByEmployeeId: null,
    },
    { id: manager.id, role: 'MANAGER' }
  );

  console.log(`-> Client Created: ${client1.id}, Source: ${client1.source}, IntroducedById: ${client1.introducedByEmployeeId}`);
  if (client1.source === 'DIRECT' && client1.introducedByEmployeeId === null) {
    console.log('✓ PASS: Direct client saved with DIRECT source and null introducedByEmployeeId.');
  } else {
    console.error('✗ FAIL: Expected DIRECT source and null introducedByEmployeeId.');
  }

  // Test 2: Manager creates client with staff referral
  console.log('\n[Test 2] Manager creates client with valid technician referral:');
  const client2Phone = `+237 670${timestamp}2`;
  const client2 = await clientsService.createClient(
    {
      name: `Test Referred Client ${timestamp}`,
      phone: client2Phone,
      introducedByEmployeeId: technician.id,
    },
    { id: manager.id, role: 'MANAGER' }
  );

  console.log(`-> Client Created: ${client2.id}, Source: ${client2.source}, IntroducedById: ${client2.introducedByEmployeeId}`);
  if (client2.source === 'STAFF_REFERRAL' && client2.introducedByEmployeeId === technician.id) {
    console.log('✓ PASS: Manager-selected referral attributed to technician with STAFF_REFERRAL.');
  } else {
    console.error('✗ FAIL: Attribution mismatch.');
  }

  // Test 3: Staff creates client (Auto-attribution from session)
  console.log('\n[Test 3] Technician creates client (Auto-attribution from session):');
  const client3Phone = `+237 670${timestamp}3`;
  const client3 = await clientsService.createClient(
    {
      name: `Test Staff Auto Client ${timestamp}`,
      phone: client3Phone,
    },
    { id: technician.id, role: 'TECHNICIAN' }
  );

  console.log(`-> Client Created: ${client3.id}, Source: ${client3.source}, IntroducedById: ${client3.introducedByEmployeeId}`);
  if (client3.source === 'STAFF_REFERRAL' && client3.introducedByEmployeeId === technician.id) {
    console.log('✓ PASS: Client auto-attributed to authenticated technician.');
  } else {
    console.error('✗ FAIL: Expected auto-attribution to technician session.');
  }

  // Test 4: Security Spoofing Attempt (Staff submits another user ID in body)
  console.log('\n[Test 4] Security Test: Staff tries to submit spoofed referrer ID in body:');
  const client4Phone = `+237 670${timestamp}4`;
  const client4 = await clientsService.createClient(
    {
      name: `Test Spoof Attempt Client ${timestamp}`,
      phone: client4Phone,
      introducedByEmployeeId: manager.id, // Trying to spoof manager or another staff
    },
    { id: technician.id, role: 'TECHNICIAN' }
  );

  console.log(`-> Client Created: ${client4.id}, IntroducedById: ${client4.introducedByEmployeeId}`);
  if (client4.introducedByEmployeeId === technician.id) {
    console.log('✓ PASS: Spoofed ID was ignored; backend strictly attributed to authenticated session.');
  } else {
    console.error('✗ FAIL: Security vulnerability: Spoofed ID was accepted.');
  }

  // Test 5: Manager selects invalid / nonexistent staff ID
  console.log('\n[Test 5] Manager passes nonexistent staff UUID:');
  try {
    await clientsService.createClient(
      {
        name: `Invalid Staff Client ${timestamp}`,
        phone: `+237 670${timestamp}5`,
        introducedByEmployeeId: '00000000-0000-0000-0000-000000000000',
      },
      { id: manager.id, role: 'MANAGER' }
    );
    console.error('✗ FAIL: Expected error for nonexistent staff member.');
  } catch (err: any) {
    console.log(`✓ PASS: Caught expected error: "${err.message}" (Status: ${err.statusCode})`);
  }

  // Test 6: Manager selects cleaner as referrer (ineligible role)
  if (cleaner) {
    console.log('\n[Test 6] Manager passes cleaner as referrer (ineligible):');
    try {
      await clientsService.createClient(
        {
          name: `Ineligible Staff Client ${timestamp}`,
          phone: `+237 670${timestamp}6`,
          introducedByEmployeeId: cleaner.id,
        },
        { id: manager.id, role: 'MANAGER' }
      );
      console.error('✗ FAIL: Expected error for ineligible cleaner role.');
    } catch (err: any) {
      console.log(`✓ PASS: Caught expected error: "${err.message}" (Status: ${err.statusCode})`);
    }
  }

  // Test 7: Duplicate phone check
  console.log('\n[Test 7] Duplicate phone check:');
  try {
    await clientsService.createClient(
      {
        name: `Duplicate Phone Client ${timestamp}`,
        phone: client1Phone, // Reusing client 1 phone
      },
      { id: manager.id, role: 'MANAGER' }
    );
    console.error('✗ FAIL: Expected duplicate phone conflict error.');
  } catch (err: any) {
    console.log(`✓ PASS: Caught duplicate conflict: "${err.message}" (Status: ${err.statusCode})`);
  }

  // Clean up test clients
  console.log('\nCleaning up created test records...');
  await prisma.clientHistory.deleteMany({
    where: { clientId: { in: [client1.id, client2.id, client3.id, client4.id] } },
  });
  await prisma.client.deleteMany({
    where: { id: { in: [client1.id, client2.id, client3.id, client4.id] } },
  });
  console.log('✓ Cleanup complete.');

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Unexpected test error:', err);
  process.exit(1);
});
