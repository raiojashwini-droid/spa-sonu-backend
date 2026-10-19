/**
 * OMEGA SPA POS — Unit Test Suite: Target-Based Salary & Commission Engine
 * Verifies contract updates, advisory warnings, Mode A vs Mode B dynamic switching,
 * minimum guaranteed floor protection, and referral deduction caps.
 */

import { UsersService } from '../modules/users/users.service';
import { CommissionsService } from '../modules/commissions/commissions.service';
import prisma from '../config/database';

async function runUnitTests() {
  console.log('========================================================================');
  console.log('  TEST SUITE: Target-Based Salary & Commission Engine (Mode A vs Mode B)');
  console.log('========================================================================\n');

  const usersService = new UsersService();
  const commissionsService = new CommissionsService();
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

  // Backup original prisma methods
  const originalUserFindUnique = prisma.user.findUnique;
  const originalProfileUpdate = prisma.staffProfile.update;
  const originalProfileCreate = prisma.staffProfile.create;
  const originalInvoiceItemFindMany = prisma.invoiceItem.findMany;
  const originalTechCommFindMany = prisma.technicianCommission.findMany;
  const originalPayrollFindUnique = prisma.monthlyPayrollRecord.findUnique;

  try {
    const mockTech = {
      id: 'tech-uuid-1111',
      email: 'amina@omega.com',
      role: { name: 'TECHNICIAN' },
      staffProfile: {
        id: 'profile-uuid-1111',
        name: 'Amina',
        monthlyTarget: 500000,
        basePay: 50000,
        commissionRate: 15.0,
        fixedSalary: 80000,
        targetScope: 'INDIVIDUAL',
        specialties: ['Nails', 'Nail Tech'],
      },
    };

    const mockReceptionist = {
      id: 'reception-uuid-2222',
      email: 'claire@omega.com',
      role: { name: 'RECEPTION' },
      staffProfile: {
        id: 'profile-uuid-2222',
        name: 'Claire',
        monthlyTarget: 3500000,
        basePay: 150000,
        commissionRate: 0,
        fixedSalary: 100000,
        targetScope: 'SPA_TOTAL',
        specialties: [],
      },
    };

    // 1. Test Contract Validation & Advisory Warning
    console.log('[Test Group 1: Contract Validation & Advisory Warnings]');

    (prisma.user as any).findUnique = async ({ where }: any) => {
      if (where.id === 'tech-uuid-1111') return mockTech;
      if (where.id === 'reception-uuid-2222') return mockReceptionist;
      return null;
    };

    (prisma.staffProfile as any).update = async ({ data }: any) => ({
      ...mockTech.staffProfile,
      ...data,
    });

    // Test: Non-negative check
    let negativeFailed = false;
    try {
      await usersService.updateSalaryContract('tech-uuid-1111', {
        monthlyTarget: -500,
        basePay: 50000,
        commissionRate: 15,
        fixedSalary: 80000,
      });
    } catch (e: any) {
      negativeFailed = e.message.includes('non-negative');
    }
    assert(negativeFailed, 'Rejects negative monthlyTarget (400)');

    // Test: Commission rate bound check (>100)
    let rateOverflowFailed = false;
    try {
      await usersService.updateSalaryContract('tech-uuid-1111', {
        monthlyTarget: 500000,
        basePay: 50000,
        commissionRate: 120,
        fixedSalary: 80000,
      });
    } catch (e: any) {
      rateOverflowFailed = e.message.includes('between 0% and 100%');
    }
    assert(rateOverflowFailed, 'Rejects commission rate > 100% (400)');

    // Test: Advisory warning triggered when Base + Comm at target < Fixed Salary
    // e.g. Base 20,000 + (300,000 * 10% = 30,000) = 50,000 < Fixed 80,000
    const advisoryRes = await usersService.updateSalaryContract('tech-uuid-1111', {
      monthlyTarget: 300000,
      basePay: 20000,
      commissionRate: 10,
      fixedSalary: 80000,
      targetScope: 'INDIVIDUAL',
    });
    assert(
      typeof advisoryRes.advisoryWarning === 'string' &&
      advisoryRes.advisoryWarning.includes('Advisory: Base pay + commission at exact target'),
      'Generates configuration advisory warning when projected target payout is less than fixed salary'
    );

    // Test: Clean contract update without advisory when formula is sound
    const soundRes = await usersService.updateSalaryContract('tech-uuid-1111', {
      monthlyTarget: 500000,
      basePay: 50000,
      commissionRate: 15,
      fixedSalary: 80000,
      targetScope: 'INDIVIDUAL',
    });
    assert(soundRes.advisoryWarning === null, 'No advisory warning when target payout (125,000 FCFA) >= fixed salary (80,000 FCFA)');

    // 2. Test Dynamic Switcher: Mode A (Below Target)
    console.log('\n[Test Group 2: Mode A — Below Target Evaluation]');

    // Mock individual sales = 350,000 FCFA (Target is 500,000 FCFA)
    (prisma.invoiceItem as any).findMany = async ({ where }: any) => {
      if (where.technicianId === 'tech-uuid-1111') {
        return [
          { price: 20000, quantity: 10 }, // 200,000
          { price: 15000, quantity: 10 }, // 150,000 => Total 350,000
        ];
      }
      return [{ price: 50000, quantity: 40 }]; // Spa total = 2,000,000
    };

    (prisma.technicianCommission as any).findMany = async () => [
      { baseCommission: 30000, referralDeduction: 5000 },
      { baseCommission: 22500, referralDeduction: 2000 },
    ];

    (prisma.monthlyPayrollRecord as any).findUnique = async () => null;

    const summaryA = await commissionsService.getSalarySummary('tech-uuid-1111', '2026-10');
    assert(summaryA.performance.mtdSales === 350000, 'Calculates MTD sales accurately as 350,000 FCFA');
    assert(summaryA.performance.targetQuota === 500000, 'Target quota is 500,000 FCFA');
    assert(summaryA.performance.targetProgressPercent === 70, 'Calculates 70.0% progress toward target');
    assert(summaryA.performance.isTargetMet === false, 'isTargetMet is FALSE below quota');
    assert(summaryA.performance.salesRemainingToTarget === 150000, 'Distance to quota is 150,000 FCFA');
    assert(summaryA.calculation.activeMode === 'FIXED_SALARY', 'Active mode is FIXED_SALARY (Mode A)');
    assert(summaryA.calculation.currentProjectedPayout === 80000, 'Current payout is guaranteed flat baseline (80,000 FCFA)');
    assert(summaryA.calculation.referralDeductionsTotal === 7000, 'Records referral deductions total (7,000 FCFA)');
    assert(summaryA.calculation.netCommissionAccumulated === 45500, 'Calculates conditional net commission (52,500 - 7,000 = 45,500 FCFA)');

    // 3. Test Dynamic Switcher: Mode B (Target Reached)
    console.log('\n[Test Group 3: Mode B — Target Met Evaluation]');

    // Mock individual sales = 520,000 FCFA (Target is 500,000 FCFA)
    (prisma.invoiceItem as any).findMany = async ({ where }: any) => {
      if (where.technicianId === 'tech-uuid-1111') {
        return [
          { price: 20000, quantity: 20 }, // 400,000
          { price: 12000, quantity: 10 }, // 120,000 => Total 520,000
        ];
      }
      return [{ price: 50000, quantity: 50 }]; // Spa total = 2,500,000
    };

    (prisma.technicianCommission as any).findMany = async () => [
      { baseCommission: 60000, referralDeduction: 5000 },
      { baseCommission: 18000, referralDeduction: 2000 },
    ];

    const summaryB = await commissionsService.getSalarySummary('tech-uuid-1111', '2026-10');
    assert(summaryB.performance.mtdSales === 520000, 'Calculates MTD sales as 520,000 FCFA');
    assert(summaryB.performance.isTargetMet === true, 'isTargetMet is TRUE when revenue >= quota');
    assert(summaryB.calculation.activeMode === 'BASE_PLUS_COMMISSION', 'Active mode switches to BASE_PLUS_COMMISSION (Mode B)');
    // Gross comm = 78,000 | deductions = 7,000 | net = 71,000
    // Payout = Base (50,000) + Net (71,000) = 121,000 FCFA
    assert(summaryB.calculation.netCommissionAccumulated === 71000, 'Calculates net commission (78,000 - 7,000 = 71,000 FCFA)');
    assert(summaryB.calculation.currentProjectedPayout === 121000, 'Projected payout is 50,000 Base + 71,000 Net Comm = 121,000 FCFA');

    // 4. Test Guaranteed Floor Protection
    console.log('\n[Test Group 4: Minimum Guaranteed Floor Protection]');
    // Even if high deductions reduce net commission, payout cannot drop below fixed salary (80,000 FCFA)
    (prisma.technicianCommission as any).findMany = async () => [
      { baseCommission: 75000, referralDeduction: 60000 }, // net = 15,000 => Base 50,000 + 15,000 = 65,000 < 80,000
    ];
    const summaryFloor = await commissionsService.getSalarySummary('tech-uuid-1111', '2026-10');
    assert(
      summaryFloor.calculation.currentProjectedPayout === 80000,
      'Mathematically enforces guaranteed floor: max(80,000, 50,000 + 15,000) = 80,000 FCFA'
    );

    // 5. Test Receptionist Spa Total Quota
    console.log('\n[Test Group 5: Receptionist Spa-Wide Target Evaluation]');

    (prisma.invoiceItem as any).findMany = async () => [
      { price: 100000, quantity: 36 }, // Spa total = 3,600,000 FCFA (Target is 3,500,000 FCFA)
    ];

    const summaryRecept = await commissionsService.getSalarySummary('reception-uuid-2222', '2026-10');
    assert(summaryRecept.performance.spaTotalSales === 3600000, 'Evaluates against Spa Total Sales (3,600,000 FCFA)');
    assert(summaryRecept.performance.isTargetMet === true, 'Receptionist target met (3.6M >= 3.5M)');
    assert(summaryRecept.calculation.activeMode === 'BASE_PLUS_COMMISSION', 'Receptionist switches to elevated base pay mode');
    assert(summaryRecept.calculation.currentProjectedPayout === 150000, 'Receptionist receives elevated Base Pay (150,000 FCFA)');

    // 6. Test Payroll Finalization & Immutability Guard
    console.log('\n[Test Group 6: Payroll Finalization & Immutability Guard]');
    let payrollStore: any = null;
    (prisma.monthlyPayrollRecord as any).findUnique = async () => payrollStore;
    (prisma.monthlyPayrollRecord as any).upsert = async (args: any) => {
      payrollStore = { ...args.create, id: 'payroll-123' };
      return payrollStore;
    };

    const finalizedRecord = await commissionsService.finalizeMonthlyPayroll('tech-uuid-1111', '2026-10', 'manager-uuid-0000');
    assert(finalizedRecord.isFinalized === true, 'Successfully finalizes monthly payroll record');
    assert(finalizedRecord.finalizedById === 'manager-uuid-0000', 'Records manager user ID who finalized the payroll');

    // Attempting to modify a finalized record must throw 403 Forbidden
    let blockedError: any = null;
    try {
      await commissionsService.finalizeMonthlyPayroll('tech-uuid-1111', '2026-10', 'manager-uuid-0000');
    } catch (err: any) {
      blockedError = err;
    }
    assert(blockedError !== null, 'Rejects modification attempt on finalized payroll');
    assert(blockedError.statusCode === 403, 'Returns HTTP 403 Forbidden on finalized record edit');
    assert(
      blockedError.message.includes('locked against modification'),
      'Provides clear immutability message: locked against modification'
    );

  } finally {
    // Restore mocks
    prisma.user.findUnique = originalUserFindUnique;
    prisma.staffProfile.update = originalProfileUpdate;
    prisma.staffProfile.create = originalProfileCreate;
    prisma.invoiceItem.findMany = originalInvoiceItemFindMany;
    prisma.technicianCommission.findMany = originalTechCommFindMany;
    prisma.monthlyPayrollRecord.findUnique = originalPayrollFindUnique;
  }

  console.log('\n========================================================================');
  console.log(`  SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} tests`);
  console.log('========================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runUnitTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
