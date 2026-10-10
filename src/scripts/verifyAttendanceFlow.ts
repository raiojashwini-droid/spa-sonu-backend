/**
 * Verification Test Suite: Attendance Clock In & Clock Out with Photo Verification
 * Tests:
 * 1. Clock In with verification photo -> Creates record in MySQL & Cloudinary URL
 * 2. Duplicate Clock In Protection -> Re-clock-in on same day blocked with "Already clocked in today"
 * 3. Retrieval 1 (Simulated Refresh after Clock In) -> Retrieves clockInTime and clockInPhoto
 * 4. Clock Out Without Photo -> MUST be rejected with "Verification photo is required for Clock Out"
 * 5. Clock Out With Photo -> Updates MySQL record with clockOutTime, clockOutPhoto, workingHours, COMPLETED
 * 6. Retrieval 2 (Simulated Refresh after Clock Out) -> Both clockInPhoto and clockOutPhoto persisted in DB
 * 7. Manager View -> Returns both Clock In Photo and Clock Out Photo for employee
 */

import prisma from '../config/database';
import { attendanceService } from '../modules/attendance/attendance.service';

const sampleClockInPhoto =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const sampleClockOutPhoto =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function runTests() {
  console.log('====================================================');
  console.log('OMEGA SPA POS — Attendance & Dual Photo Verification');
  console.log('====================================================\n');

  // Pick an employee
  const employee = await prisma.user.findFirst({
    where: {
      role: {
        name: { in: ['TECHNICIAN', 'RECEPTION'] },
      },
    },
    include: { staffProfile: true, role: true },
  });

  if (!employee) {
    throw new Error('No technician/reception employee found in database for testing');
  }

  console.log(`[Setup] Using employee: ${employee.staffProfile?.name || employee.email} (${employee.id})`);

  // Today's normalized date
  const now = new Date();
  const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayDateStr = todayDate.toISOString().slice(0, 10);

  // Clean any pre-existing test attendance for today to ensure a clean slate
  await prisma.attendance.deleteMany({
    where: {
      employeeId: employee.id,
      date: todayDate,
    },
  });
  console.log(`[Setup] Cleared pre-existing attendance for ${todayDateStr}`);

  // ----------------------------------------------------
  // TEST 1: Clock In Flow with Photo
  // ----------------------------------------------------
  console.log('\n▶ [TEST 1] Clock In Flow & Persistence with Photo');
  const clockInRecord = await attendanceService.clockIn(
    employee.id,
    undefined,
    sampleClockInPhoto,
    todayDateStr
  );

  console.log('  Clock In response:', {
    id: clockInRecord?.id,
    clockIn: clockInRecord?.clockIn,
    status: clockInRecord?.status,
    photoUrl: clockInRecord?.clockInPhoto ? clockInRecord.clockInPhoto.slice(0, 45) + '...' : null,
  });

  if (!clockInRecord || clockInRecord.status !== 'working' || !clockInRecord.clockInPhoto) {
    throw new Error('❌ TEST 1 FAILED: Clock In record invalid or status is not working');
  }

  const dbRecord1 = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: todayDate,
      },
    },
  });

  if (!dbRecord1 || !dbRecord1.clockInTime || !dbRecord1.clockInPhoto) {
    throw new Error('❌ TEST 1 FAILED: Attendance record was NOT persisted in MySQL database');
  }
  console.log('  ✔ Confirmed in MySQL: ID =', dbRecord1.id, 'status =', dbRecord1.status);
  console.log('  ✔ [TEST 1 PASSED]: Clock In with photo successfully created and saved in MySQL.\n');

  // ----------------------------------------------------
  // TEST 2: Duplicate Protection
  // ----------------------------------------------------
  console.log('▶ [TEST 2] Duplicate Clock In Protection');
  let duplicateBlocked = false;
  try {
    await attendanceService.clockIn(
      employee.id,
      undefined,
      sampleClockInPhoto,
      todayDateStr
    );
  } catch (err: any) {
    if (err?.message?.includes('Already clocked in today')) {
      duplicateBlocked = true;
      console.log('  ✔ Blocked with expected message:', err.message);
    }
  }

  if (!duplicateBlocked) {
    throw new Error('❌ TEST 2 FAILED: Duplicate clock in was NOT blocked');
  }
  console.log('  ✔ [TEST 2 PASSED]: Duplicate clock in prevented.\n');

  // ----------------------------------------------------
  // TEST 3: Simulated Refresh After Clock In
  // ----------------------------------------------------
  console.log('▶ [TEST 3] Simulated Refresh 1 (Clock In State)');
  const refresh1 = await attendanceService.getTodayAttendance(employee.id, todayDateStr);
  const rec1 = refresh1.record;

  console.log('  Fetched on refresh 1:', {
    clockIn: rec1?.clockIn,
    status: rec1?.status,
    hasClockInPhoto: !!rec1?.clockInPhoto,
  });

  if (!rec1 || rec1.status !== 'working' || !rec1.clockInPhoto) {
    throw new Error('❌ TEST 3 FAILED: Clock in state not found on refresh');
  }
  console.log('  ✔ [TEST 3 PASSED]: Clock in and photo persist across refresh.\n');

  // ----------------------------------------------------
  // TEST 4: Clock Out Without Photo (Must be rejected)
  // ----------------------------------------------------
  console.log('▶ [TEST 4] Clock Out Without Photo Protection');
  let noPhotoBlocked = false;
  try {
    await attendanceService.clockOut(
      employee.id,
      undefined,
      undefined, // No photo provided!
      todayDateStr
    );
  } catch (err: any) {
    if (err?.message?.includes('Verification photo is required for Clock Out')) {
      noPhotoBlocked = true;
      console.log('  ✔ Blocked with expected message:', err.message);
    } else {
      console.log('  Error received:', err.message);
    }
  }

  if (!noPhotoBlocked) {
    throw new Error('❌ TEST 4 FAILED: Clock out without photo was NOT blocked');
  }
  console.log('  ✔ [TEST 4 PASSED]: Clock out without photo strictly blocked.\n');

  // ----------------------------------------------------
  // TEST 5: Clock Out Flow with Departure Photo
  // ----------------------------------------------------
  console.log('▶ [TEST 5] Clock Out Flow with Departure Photo');
  const clockOutRecord = await attendanceService.clockOut(
    employee.id,
    undefined,
    sampleClockOutPhoto,
    todayDateStr
  );

  console.log('  Clock Out response:', {
    clockOut: clockOutRecord?.clockOut,
    status: clockOutRecord?.status,
    workingHours: clockOutRecord?.workingHours,
    clockOutPhoto: clockOutRecord?.clockOutPhoto ? clockOutRecord.clockOutPhoto.slice(0, 45) + '...' : null,
  });

  if (!clockOutRecord || clockOutRecord.status !== 'completed' || !clockOutRecord.clockOutPhoto) {
    throw new Error('❌ TEST 5 FAILED: Clock out did not record clockOutPhoto properly');
  }

  const dbRecord2 = await prisma.attendance.findUnique({
    where: { id: dbRecord1.id },
  });

  if (!dbRecord2 || !dbRecord2.clockOutTime || !dbRecord2.clockOutPhoto || dbRecord2.status !== 'COMPLETED') {
    throw new Error('❌ TEST 5 FAILED: Clock out photo was NOT persisted to MySQL');
  }

  // Ensure it updated the SAME record, not created a new one
  if (dbRecord2.id !== dbRecord1.id) {
    throw new Error('❌ TEST 5 FAILED: Clock out created a new record instead of updating existing!');
  }
  console.log('  ✔ Confirmed same record updated in MySQL: ID =', dbRecord2.id);
  console.log('  ✔ Clock Out Photo in DB:', dbRecord2.clockOutPhoto.slice(0, 45) + '...');
  console.log('  ✔ [TEST 5 PASSED]: Clock out with photo saved to MySQL.\n');

  // ----------------------------------------------------
  // TEST 6: Simulated Refresh After Clock Out (Both Photos Persist)
  // ----------------------------------------------------
  console.log('▶ [TEST 6] Simulated Refresh 2 (Both Photos Persisted in Database)');
  const refresh2 = await attendanceService.getTodayAttendance(employee.id, todayDateStr);
  const rec2 = refresh2.record;

  console.log('  Fetched on refresh 2:', {
    clockIn: rec2?.clockIn,
    clockOut: rec2?.clockOut,
    status: rec2?.status,
    workingHours: rec2?.workingHours,
    hasClockInPhoto: !!rec2?.clockInPhoto,
    hasClockOutPhoto: !!rec2?.clockOutPhoto,
  });

  if (!rec2 || !rec2.clockInPhoto || !rec2.clockOutPhoto || rec2.status !== 'completed') {
    throw new Error('❌ TEST 6 FAILED: Both photos did NOT persist across refresh');
  }
  console.log('  ✔ [TEST 6 PASSED]: Both Clock In & Clock Out photos persist across refresh.\n');

  // ----------------------------------------------------
  // TEST 7: Manager View (Dual Photos Visible)
  // ----------------------------------------------------
  console.log('▶ [TEST 7] Manager View (Both Photos Accessible to Manager)');
  const allRecords = await attendanceService.getAttendanceRecords({ date: todayDateStr });
  const foundInManager = allRecords.find((r) => r && r.employeeId === employee.id);

  if (!foundInManager || !foundInManager.clockInPhoto || !foundInManager.clockOutPhoto) {
    throw new Error('❌ TEST 7 FAILED: Manager cannot see both photos');
  }
  console.log('  Manager sees:', {
    employeeName: foundInManager.employeeName,
    clockIn: foundInManager.clockIn,
    clockOut: foundInManager.clockOut,
    inPhoto: foundInManager.clockInPhoto.slice(0, 40) + '...',
    outPhoto: foundInManager.clockOutPhoto.slice(0, 40) + '...',
  });
  console.log('  ✔ [TEST 7 PASSED]: Manager view successfully contains both photos.\n');

  // Clean up test attendance
  await prisma.attendance.delete({
    where: { id: dbRecord1.id },
  });
  console.log('[Cleanup] Test attendance record cleanly removed from DB.');

  console.log('\n====================================================');
  console.log('ALL 7 ATTENDANCE TESTS PASSED SUCCESSFULLY! ✅');
  console.log('====================================================');
}

runTests()
  .catch((err) => {
    console.error('\n❌ Attendance Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
