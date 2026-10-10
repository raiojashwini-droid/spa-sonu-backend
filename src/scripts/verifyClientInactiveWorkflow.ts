import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api/v1';

async function request(endpoint: string, options: any = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data: any = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    (err as any).data = data;
    throw err;
  }
  return data;
}

async function main() {
  console.log('=== VERIFY CLIENT INACTIVE STATUS WORKFLOW ===\n');

  // 1. Get an authentication token for MANAGER
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'manager@gmail.com',
      password: 'password',
    }),
  });

  const token = loginRes?.data?.token;
  if (!token) {
    throw new Error('Could not authenticate as manager');
  }
  const headers = { Authorization: `Bearer ${token}` };
  console.log('1. Manager authenticated successfully');

  // 2. Create a test client
  const uniquePhone = `+237699${Math.floor(100000 + Math.random() * 900000)}`;
  const createRes = await request('/clients', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Automated Status Test Client',
      phone: uniquePhone,
      whatsapp: uniquePhone,
      quartier: 'Akwa Nord',
    }),
  });

  const testClient = createRes.data;
  console.log('2. Created test client:', {
    id: testClient.id,
    name: testClient.name,
    phone: testClient.phone,
    status: testClient.status,
    isActive: testClient.isActive,
  });

  if (testClient.status !== 'ACTIVE' || testClient.isActive !== true) {
    throw new Error(`Expected client to be ACTIVE/isActive:true by default, got status: ${testClient.status}, isActive: ${testClient.isActive}`);
  }
  console.log('   PASS: Client created with default ACTIVE status and isActive=true');

  // 3. Mark client as Inactive via PATCH /status
  const deactivateRes = await request(`/clients/${testClient.id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'INACTIVE' }),
  });
  const inactiveClient = deactivateRes.data;
  console.log('3. Updated status to INACTIVE:', {
    id: inactiveClient.id,
    status: inactiveClient.status,
    isActive: inactiveClient.isActive,
  });

  if (inactiveClient.status !== 'INACTIVE' || inactiveClient.isActive !== false) {
    throw new Error(`Expected client status to be INACTIVE/isActive:false, got status: ${inactiveClient.status}, isActive: ${inactiveClient.isActive}`);
  }
  console.log('   PASS: Client successfully marked as INACTIVE');

  // 4. Verify client list filtering
  const allRes = await request('/clients?status=ALL&limit=200', { headers });
  const activeRes = await request('/clients?status=ACTIVE&limit=200', { headers });
  const inactRes = await request('/clients?status=INACTIVE&limit=200', { headers });

  const inAll = allRes.data?.find((c: any) => c.id === testClient.id);
  const inActive = activeRes.data?.find((c: any) => c.id === testClient.id);
  const inInactive = inactRes.data?.find((c: any) => c.id === testClient.id);

  console.log('4. Filter checks:');
  console.log(`   Found in status=ALL: ${Boolean(inAll)} (status: ${inAll?.status})`);
  console.log(`   Found in status=ACTIVE: ${Boolean(inActive)}`);
  console.log(`   Found in status=INACTIVE: ${Boolean(inInactive)} (status: ${inInactive?.status})`);

  if (!inAll || inActive || !inInactive) {
    throw new Error('Filtering check failed: inactive client appeared in active list or was missing from all/inactive lists');
  }
  console.log('   PASS: Status filtering correctly partitions clients');

  // 5. Restore client to ACTIVE via POST /restore
  const restoreRes = await request(`/clients/${testClient.id}/restore`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });
  const restoredClient = restoreRes.data;
  console.log('5. Restored client to ACTIVE:', {
    id: restoredClient.id,
    status: restoredClient.status,
    isActive: restoredClient.isActive,
  });

  if (restoredClient.status !== 'ACTIVE' || restoredClient.isActive !== true) {
    throw new Error(`Expected client status to be ACTIVE/isActive:true after restore, got status: ${restoredClient.status}, isActive: ${restoredClient.isActive}`);
  }
  console.log('   PASS: Client successfully restored to ACTIVE');

  // 6. Check history entries logged
  const historyRes = await request(`/clients/${testClient.id}/history`, { headers });
  const history = historyRes.data || [];
  console.log('6. Client History Audit Log entries:', history.map((h: any) => ({ action: h.action, details: h.details })));

  const deactivatedLog = history.find((h: any) => h.action === 'CLIENT_DEACTIVATED');
  const restoredLog = history.find((h: any) => h.action === 'CLIENT_RESTORED');

  if (!deactivatedLog || !restoredLog) {
    throw new Error('Audit history entries CLIENT_DEACTIVATED or CLIENT_RESTORED missing');
  }
  console.log('   PASS: Client history properly audited deactivate & restore actions');

  // 7. Verify lastServiceDate support
  const testServiceDate = new Date().toISOString();
  const updateDateRes = await request(`/clients/${testClient.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ lastServiceDate: testServiceDate }),
  });
  console.log('7. lastServiceDate persistence check:', {
    lastServiceDate: updateDateRes.data?.lastServiceDate,
  });
  if (!updateDateRes.data?.lastServiceDate) {
    throw new Error('Failed to update lastServiceDate');
  }
  console.log('   PASS: lastServiceDate stored for 4-month retention reminder');

  // Clean up test client
  await prisma.clientHistory.deleteMany({ where: { clientId: testClient.id } });
  await prisma.client.delete({ where: { id: testClient.id } });
  console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===');
}

main()
  .catch((err) => {
    console.error('VERIFICATION ERROR:', err.message, err.data || '');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
