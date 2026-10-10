/**
 * Test script to verify Africa/Douala timezone handling in Spa-backend attendance service
 */

import {
  COMPANY_TIMEZONE,
  getCompanyTodayDateStr,
  formatTimeInCompanyTz,
  format24HourInCompanyTz,
  parseCompanyTimeToUtc,
  calculateDuration,
  formatAttendanceRecord,
} from '../modules/attendance/attendance.service';

function runTimezoneTests() {
  console.log('====================================================');
  console.log('VERIFYING AFRICA/DOUALA ATTENDANCE TIMEZONE HANDLING');
  console.log('====================================================\n');

  // Test 1: Timezone identity
  console.log('▶ [TEST 1] Single Timezone Source:');
  console.log(`  Company Timezone: ${COMPANY_TIMEZONE}`);
  if (COMPANY_TIMEZONE === 'Africa/Douala') {
    console.log('  ✔ PASSED: Timezone is strictly Africa/Douala');
  } else {
    throw new Error(`Expected Africa/Douala, got ${COMPANY_TIMEZONE}`);
  }

  // Test 2: Douala today date
  console.log('\n▶ [TEST 2] Cameroon Current Date:');
  const todayStr = getCompanyTodayDateStr();
  console.log(`  getCompanyTodayDateStr(): ${todayStr}`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(todayStr)) {
    console.log('  ✔ PASSED: Valid YYYY-MM-DD format in Africa/Douala');
  } else {
    throw new Error(`Invalid date format: ${todayStr}`);
  }

  // Test 3: Formatting UTC ISO strings into Cameroon time
  console.log('\n▶ [TEST 3] UTC to Douala Time Formatting:');
  // 08:30 UTC should be 09:30 AM in Cameroon (UTC+1)
  const utcMorning = new Date('2026-09-17T08:30:00.000Z');
  const douala12h = formatTimeInCompanyTz(utcMorning);
  const douala24h = format24HourInCompanyTz(utcMorning);
  console.log(`  UTC 08:30:00Z -> Douala 12h: "${douala12h}", 24h: "${douala24h}"`);
  if (douala12h?.includes('09:30') && douala12h?.includes('AM')) {
    console.log('  ✔ PASSED: UTC 08:30:00Z converts to 09:30 AM in Douala');
  } else {
    throw new Error(`Unexpected 12h formatting: ${douala12h}`);
  }
  if (douala24h === '09:30') {
    console.log('  ✔ PASSED: UTC 08:30:00Z converts to 24h 09:30 in Douala');
  } else {
    throw new Error(`Unexpected 24h formatting: ${douala24h}`);
  }

  // 14:15 UTC should be 03:15 PM / 15:15 in Cameroon (UTC+1)
  const utcAfternoon = new Date('2026-09-17T14:15:00.000Z');
  const pm12h = formatTimeInCompanyTz(utcAfternoon);
  const pm24h = format24HourInCompanyTz(utcAfternoon);
  console.log(`  UTC 14:15:00Z -> Douala 12h: "${pm12h}", 24h: "${pm24h}"`);
  if (pm12h?.includes('03:15') && pm12h?.includes('PM')) {
    console.log('  ✔ PASSED: UTC 14:15:00Z converts to 03:15 PM in Douala');
  } else {
    throw new Error(`Unexpected 12h formatting: ${pm12h}`);
  }
  if (pm24h === '15:15') {
    console.log('  ✔ PASSED: UTC 14:15:00Z converts to 24h 15:15 in Douala');
  } else {
    throw new Error(`Unexpected 24h formatting: ${pm24h}`);
  }

  // Test 4: Parsing Douala local time input to UTC Date
  console.log('\n▶ [TEST 4] Parsing Douala Local Time to UTC Date (Manual Entry):');
  // Manager inputs 10:30 on 2026-09-17 in Douala (+01:00)
  // This must produce 09:30:00.000Z in UTC regardless of the host machine's timezone
  const parsedUtc = parseCompanyTimeToUtc('2026-09-17', '10:30');
  console.log(`  Douala "2026-09-17" 10:30 -> UTC ISO: ${parsedUtc.toISOString()}`);
  if (parsedUtc.toISOString() === '2026-09-17T09:30:00.000Z') {
    console.log('  ✔ PASSED: Exact UTC timestamp generated (09:30:00.000Z)');
  } else {
    throw new Error(`Expected 2026-09-17T09:30:00.000Z, got ${parsedUtc.toISOString()}`);
  }

  // When formatted back into Douala time, it should be exactly 10:30 AM / 10:30
  const backToDouala = formatTimeInCompanyTz(parsedUtc);
  console.log(`  Formatted back in Douala: ${backToDouala}`);
  if (backToDouala?.includes('10:30') && backToDouala?.includes('AM')) {
    console.log('  ✔ PASSED: Round-trip preserves exact Douala time');
  } else {
    throw new Error(`Round-trip failure: ${backToDouala}`);
  }

  // Test 5: Worked Duration Calculation
  console.log('\n▶ [TEST 5] Worked Duration Calculation:');
  const inTime = new Date('2026-09-17T09:00:00.000Z');
  const outTime = new Date('2026-09-17T09:05:00.000Z');
  const shortDur = calculateDuration(inTime, outTime);
  console.log(`  5-minute session duration: ${shortDur}`);
  if (shortDur === '0h 5m') {
    console.log('  ✔ PASSED: 5-minute session correctly displays "0h 5m"');
  } else {
    throw new Error(`Expected "0h 5m", got "${shortDur}"`);
  }

  const shiftIn = new Date('2026-09-17T08:00:00.000Z');
  const shiftOut = new Date('2026-09-17T16:45:00.000Z');
  const fullDur = calculateDuration(shiftIn, shiftOut);
  console.log(`  Full shift duration: ${fullDur}`);
  if (fullDur === '8h 45m') {
    console.log('  ✔ PASSED: 8h 45m shift displays "8h 45m"');
  } else {
    throw new Error(`Expected "8h 45m", got "${fullDur}"`);
  }

  // Test 6: formatAttendanceRecord output
  console.log('\n▶ [TEST 6] formatAttendanceRecord Output:');
  const mockRecord = {
    id: 'test-att-1',
    employeeId: 'emp-1',
    employee: { staffProfile: { name: 'Sarah Tech' }, role: { name: 'TECHNICIAN' } },
    date: new Date('2026-09-17T00:00:00.000Z'),
    clockInTime: new Date('2026-09-17T08:00:00.000Z'), // 09:00 Douala
    clockOutTime: new Date('2026-09-17T17:00:00.000Z'), // 18:00 Douala
    workingHours: 9,
    status: 'COMPLETED',
    isManual: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const formatted = formatAttendanceRecord(mockRecord);
  console.log('  Formatted record:', {
    clockIn: formatted?.clockIn,
    clockOut: formatted?.clockOut,
    workingHours: formatted?.workingHours,
    date: formatted?.date,
  });

  if (formatted?.clockIn?.includes('09:00') && formatted?.clockIn?.includes('AM')) {
    console.log('  ✔ PASSED: Record clockIn is 09:00 AM (Douala time)');
  } else {
    throw new Error(`Unexpected clockIn: ${formatted?.clockIn}`);
  }

  if (formatted?.clockOut?.includes('06:00') && formatted?.clockOut?.includes('PM')) {
    console.log('  ✔ PASSED: Record clockOut is 06:00 PM (Douala time)');
  } else {
    throw new Error(`Unexpected clockOut: ${formatted?.clockOut}`);
  }

  if (formatted?.workingHours === '9h 0m') {
    console.log('  ✔ PASSED: Record workingHours is "9h 0m"');
  } else {
    throw new Error(`Unexpected workingHours: ${formatted?.workingHours}`);
  }

  console.log('\n====================================================');
  console.log('ALL TIMEZONE TESTS PASSED SUCCESSFULLY! ✅');
  console.log('====================================================');
}

runTimezoneTests();
