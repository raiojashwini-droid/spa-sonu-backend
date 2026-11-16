"use strict";
/**
 * OMEGA SPA POS - Comprehensive Marketer Commission & Technician Deduction Test Suite
 *
 * Tests the client requirements:
 * 1. Marketer gets flat fee for newly acquired clients (on first paid visit).
 * 2. Marketer gets negotiated % (e.g. 2%) for life on every service visit.
 * 3. The % is deducted directly from the technician providing the service (e.g. 15% - 2% = 13%).
 * 4. Payout neutrality: Spa owner payout = standard technician commission rate.
 * 5. Repeat visits: Flat bounty = 0, recurring % continues automatically for life.
 * 6. 100 Clients scale simulation matching client's exact prompt.
 */
function calculateInvoiceCommission(items, isFirstVisit, marketer) {
    // 1. Calculate Marketer Commission
    let marketerBounty = 0;
    let marketerPercentageTotal = 0;
    const marketerRate = marketer ? marketer.lifetimeCommissionRate : 0;
    if (marketer && isFirstVisit) {
        marketerBounty = marketer.flatAcquisitionFee;
    }
    // Calculate technician commissions & deductions
    const technicianResults = items.map((item) => {
        const itemTotal = item.price * item.quantity;
        const baseCommission = Math.round(((itemTotal * item.technicianRate) / 100) * 100) / 100;
        let referralDeduction = 0;
        if (marketer && marketerRate > 0) {
            referralDeduction = Math.round(((itemTotal * marketerRate) / 100) * 100) / 100;
            // Cap at gross commission so technician never earns negative
            referralDeduction = Math.min(baseCommission, referralDeduction);
        }
        const netCommission = Math.max(0, baseCommission - referralDeduction);
        marketerPercentageTotal += referralDeduction;
        return {
            service: item.serviceName,
            technician: item.technicianName,
            serviceTotal: itemTotal,
            rate: item.technicianRate,
            grossCommission: baseCommission,
            referralDeduction,
            netCommission,
        };
    });
    const totalMarketerPayout = marketerBounty + marketerPercentageTotal;
    const totalTechnicianNetPayout = technicianResults.reduce((sum, t) => sum + t.netCommission, 0);
    const totalTechnicianGross = technicianResults.reduce((sum, t) => sum + t.grossCommission, 0);
    const totalTechnicianDeductions = technicianResults.reduce((sum, t) => sum + t.referralDeduction, 0);
    // Spa Owner neutral service payout = Tech Net + Marketer % = Tech Gross
    const isOwnerServiceNeutral = (totalTechnicianNetPayout + marketerPercentageTotal) === totalTechnicianGross;
    return {
        marketer: marketer ? {
            name: marketer.name,
            isFirstVisit,
            bounty: marketerBounty,
            lifetimePercentageEarned: marketerPercentageTotal,
            totalPayout: totalMarketerPayout,
        } : null,
        technicians: technicianResults,
        summary: {
            totalTechnicianGross,
            totalTechnicianDeductions,
            totalTechnicianNetPayout,
            marketerTotalPayout: totalMarketerPayout,
            isOwnerServiceNeutral,
        },
    };
}
// ---------------------------------------------------------------------
// TEST RUNNER
// ---------------------------------------------------------------------
let passedTests = 0;
let totalTests = 0;
function assert(condition, testName, details) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  [PASS] ${testName}`);
    }
    else {
        console.error(`  [FAIL] ${testName}${details ? ': ' + details : ''}`);
        process.exitCode = 1;
    }
}
console.log('================================================================');
console.log('--- OMEGA SPA POS: MARKETER COMMISSION & DEDUCTION TEST SUITE ---');
console.log('================================================================\n');
const testMarketer = {
    name: 'Alex Marketer',
    flatAcquisitionFee: 1000, // 1,000 FCFA bounty
    lifetimeCommissionRate: 2, // 2% negotiated lifetime
};
// ---------------------------------------------------------------------
// SCENARIO 1: Client's First Visit (Flat Bounty + 2% Lifetime Split)
// ---------------------------------------------------------------------
console.log('--- SCENARIO 1: Client First Visit (Acquisition Bounty + Split) ---');
const scenario1Items = [
    {
        serviceName: 'Signature Luxury Facial',
        category: 'Facial',
        price: 20000,
        quantity: 1,
        technicianName: 'Bella Technician',
        technicianRate: 15, // 15% standard rate
    },
];
const res1 = calculateInvoiceCommission(scenario1Items, true, testMarketer);
console.log(`Service Price: 20,000 FCFA`);
console.log(`Technician Gross (15%): ${res1.technicians[0].grossCommission} FCFA`);
console.log(`Technician Deduction (-2% Marketer): -${res1.technicians[0].referralDeduction} FCFA`);
console.log(`Technician Net Commission: ${res1.technicians[0].netCommission} FCFA`);
console.log(`Marketer Bounty (First Visit): ${res1.marketer?.bounty} FCFA`);
console.log(`Marketer Lifetime % (2%): ${res1.marketer?.lifetimePercentageEarned} FCFA`);
console.log(`Marketer Total Payout: ${res1.marketer?.totalPayout} FCFA`);
assert(res1.technicians[0].grossCommission === 3000, 'Technician gross commission is 15% of 20,000 = 3,000 FCFA');
assert(res1.technicians[0].referralDeduction === 400, 'Technician deduction is 2% of 20,000 = 400 FCFA');
assert(res1.technicians[0].netCommission === 2600, 'Technician net commission is 3,000 - 400 = 2,600 FCFA');
assert(res1.marketer?.bounty === 1000, 'Marketer received flat client acquisition bounty of 1,000 FCFA');
assert(res1.marketer?.lifetimePercentageEarned === 400, 'Marketer received 2% lifetime percentage = 400 FCFA');
assert(res1.marketer?.totalPayout === 1400, 'Marketer total payout = 1,000 bounty + 400 percentage = 1,400 FCFA');
assert(res1.summary.isOwnerServiceNeutral, 'Spa Owner service payout remains neutral (2,600 tech net + 400 mkt = 3,000 FCFA)');
// ---------------------------------------------------------------------
// SCENARIO 2: Repeat Visit by Same Client (2% Lifetime ONLY, Zero Bounty)
// ---------------------------------------------------------------------
console.log('\n--- SCENARIO 2: Repeat Visit by Same Client (Lifetime % ONLY) ---');
const scenario2Items = [
    {
        serviceName: 'Deep Tissue Massage',
        category: 'Massage',
        price: 15000,
        quantity: 1,
        technicianName: 'David Technician',
        technicianRate: 10, // 10% standard rate
    },
];
const res2 = calculateInvoiceCommission(scenario2Items, false, testMarketer);
console.log(`Service Price: 15,000 FCFA`);
console.log(`Technician Gross (10%): ${res2.technicians[0].grossCommission} FCFA`);
console.log(`Technician Deduction (-2% Marketer): -${res2.technicians[0].referralDeduction} FCFA`);
console.log(`Technician Net Commission: ${res2.technicians[0].netCommission} FCFA`);
console.log(`Marketer Bounty (Repeat Visit): ${res2.marketer?.bounty} FCFA`);
console.log(`Marketer Lifetime % (2%): ${res2.marketer?.lifetimePercentageEarned} FCFA`);
console.log(`Marketer Total Payout: ${res2.marketer?.totalPayout} FCFA`);
assert(res2.technicians[0].grossCommission === 1500, 'Technician gross commission is 10% of 15,000 = 1,500 FCFA');
assert(res2.technicians[0].referralDeduction === 300, 'Technician deduction is 2% of 15,000 = 300 FCFA');
assert(res2.technicians[0].netCommission === 1200, 'Technician net commission is 1,500 - 300 = 1,200 FCFA');
assert(res2.marketer?.bounty === 0, 'Marketer bounty on repeat visit is 0 FCFA (no duplicate bounty)');
assert(res2.marketer?.lifetimePercentageEarned === 300, 'Marketer lifetime 2% is earned on repeat visit = 300 FCFA');
assert(res2.marketer?.totalPayout === 300, 'Marketer total payout on repeat visit = 300 FCFA');
assert(res2.summary.isOwnerServiceNeutral, 'Spa Owner service payout remains neutral (1,200 + 300 = 1,500 FCFA)');
// ---------------------------------------------------------------------
// SCENARIO 3: Multi-Service Checkout on Repeat Visit
// ---------------------------------------------------------------------
console.log('\n--- SCENARIO 3: Multi-Service Repeat Visit ---');
const scenario3Items = [
    {
        serviceName: 'Luxury Gel Manicure',
        category: 'Nails',
        price: 8000,
        quantity: 1,
        technicianName: 'Chloe Technician',
        technicianRate: 15, // 15% rate
    },
    {
        serviceName: 'Spa Pedicure',
        category: 'Nails',
        price: 10000,
        quantity: 1,
        technicianName: 'Chloe Technician',
        technicianRate: 15, // 15% rate
    },
];
const res3 = calculateInvoiceCommission(scenario3Items, false, testMarketer);
console.log(`Item 1 (Manicure 8k): Gross 1,200 FCFA | Deduction -160 FCFA | Net 1,040 FCFA`);
console.log(`Item 2 (Pedicure 10k): Gross 1,500 FCFA | Deduction -200 FCFA | Net 1,300 FCFA`);
console.log(`Total Marketer Payout: ${res3.marketer?.totalPayout} FCFA`);
assert(res3.technicians[0].referralDeduction === 160, 'Item 1 deduction is 2% of 8,000 = 160 FCFA');
assert(res3.technicians[1].referralDeduction === 200, 'Item 2 deduction is 2% of 10,000 = 200 FCFA');
assert(res3.marketer?.totalPayout === 360, 'Marketer received total 360 FCFA (160 + 200) across all services');
assert(res3.summary.isOwnerServiceNeutral, 'Multi-service payout remains 100% owner neutral');
// ---------------------------------------------------------------------
// SCENARIO 4: Client Requirement Simulation — 100 New Clients Convinced
// "So if the marketer convinces 100 new clients, he gets a flat fee for
// the 100 clients and a negotiated % deducted from the technician"
// ---------------------------------------------------------------------
console.log('\n--- SCENARIO 4: 100 New Clients Simulation (Client Specification) ---');
let totalMarketerMonth1 = 0;
let totalTechnicianDeductionsMonth1 = 0;
let totalBountiesPaid = 0;
for (let i = 1; i <= 100; i++) {
    // Each client comes for a 20,000 FCFA service performed by a 15% technician
    const clientVisit = calculateInvoiceCommission([
        {
            serviceName: `Client #${i} Facial`,
            category: 'Facial',
            price: 20000,
            quantity: 1,
            technicianName: `Technician #${(i % 5) + 1}`,
            technicianRate: 15,
        },
    ], true, // First visit
    testMarketer);
    totalBountiesPaid += clientVisit.marketer?.bounty || 0;
    totalMarketerMonth1 += clientVisit.marketer?.totalPayout || 0;
    totalTechnicianDeductionsMonth1 += clientVisit.summary.totalTechnicianDeductions;
}
console.log(`100 Clients Acquired:`);
console.log(`  - Total Flat Acquisition Bounties Paid: ${totalBountiesPaid.toLocaleString()} FCFA (100 x 1,000)`);
console.log(`  - Total 2% Lifetime Percentage Earned: ${(totalMarketerMonth1 - totalBountiesPaid).toLocaleString()} FCFA (100 x 400)`);
console.log(`  - Total Marketer Month 1 Earnings: ${totalMarketerMonth1.toLocaleString()} FCFA`);
console.log(`  - Total Deducted from Technicians: ${totalTechnicianDeductionsMonth1.toLocaleString()} FCFA`);
assert(totalBountiesPaid === 100000, '100 Clients flat bounty equals 100,000 FCFA (100 x 1,000 FCFA)');
assert((totalMarketerMonth1 - totalBountiesPaid) === 40000, '100 Clients 2% service percentage equals 40,000 FCFA');
assert(totalMarketerMonth1 === 140000, 'Marketer total month 1 earnings equals 140,000 FCFA');
assert(totalTechnicianDeductionsMonth1 === 40000, 'Technician deductions exactly equal marketer percentage (40,000 FCFA)');
// Month 2: All 100 clients return for a second visit (Repeat Visits)
let totalMarketerMonth2 = 0;
let totalBountiesMonth2 = 0;
for (let i = 1; i <= 100; i++) {
    const repeatVisit = calculateInvoiceCommission([
        {
            serviceName: `Client #${i} Repeat Facial`,
            category: 'Facial',
            price: 20000,
            quantity: 1,
            technicianName: `Technician #${(i % 5) + 1}`,
            technicianRate: 15,
        },
    ], false, // Repeat visit
    testMarketer);
    totalBountiesMonth2 += repeatVisit.marketer?.bounty || 0;
    totalMarketerMonth2 += repeatVisit.marketer?.totalPayout || 0;
}
console.log(`\nMonth 2: All 100 Clients Return:`);
console.log(`  - Flat Bounties Paid: ${totalBountiesMonth2.toLocaleString()} FCFA (0 FCFA on repeat visits)`);
console.log(`  - Lifetime Recurring Percentage: ${totalMarketerMonth2.toLocaleString()} FCFA (Automatic 2% for life)`);
assert(totalBountiesMonth2 === 0, 'No bounties paid on repeat visits in Month 2');
assert(totalMarketerMonth2 === 40000, 'Marketer earned 40,000 FCFA lifetime percentage on repeat visits in Month 2');
// ---------------------------------------------------------------------
// SCENARIO 5: Safety Guard — Technician Net Commission Never Negative
// ---------------------------------------------------------------------
console.log('\n--- SCENARIO 5: Safety Guard (Technician Net Never Negative) ---');
const edgeItems = [
    {
        serviceName: 'Low Margin Promo Service',
        category: 'Promo',
        price: 10000,
        quantity: 1,
        technicianName: 'Junior Tech',
        technicianRate: 1, // Only 1% tech rate (100 FCFA)
    },
];
// Marketer has 2% rate (200 FCFA deduction)
const res5 = calculateInvoiceCommission(edgeItems, false, testMarketer);
console.log(`Gross Tech Commission (1%): ${res5.technicians[0].grossCommission} FCFA`);
console.log(`Capped Deduction: -${res5.technicians[0].referralDeduction} FCFA`);
console.log(`Net Tech Commission: ${res5.technicians[0].netCommission} FCFA`);
assert(res5.technicians[0].referralDeduction === 100, 'Deduction is capped at technician gross commission (100 FCFA)');
assert(res5.technicians[0].netCommission === 0, 'Technician net commission never drops below 0 FCFA');
// ---------------------------------------------------------------------
// SCENARIO 6: Fully Dynamic Custom Rates (e.g., Tech 20%, Marketer 3%)
// ---------------------------------------------------------------------
console.log('\n--- SCENARIO 6: Fully Dynamic Custom Rates (Tech 20%, Marketer 3%) ---');
const customMarketer = {
    name: 'VIP Marketer David',
    flatAcquisitionFee: 2500, // Custom 2,500 FCFA bounty
    lifetimeCommissionRate: 3.5, // Custom 3.5% negotiated rate
};
const customItems = [
    {
        serviceName: 'Premium Bridal Package',
        category: 'Special',
        price: 50000,
        quantity: 1,
        technicianName: 'Senior Master Stylist',
        technicianRate: 20, // 20% technician rate
    },
];
const res6 = calculateInvoiceCommission(customItems, true, customMarketer);
console.log(`Service Price: 50,000 FCFA`);
console.log(`Technician Gross (20%): ${res6.technicians[0].grossCommission} FCFA`);
console.log(`Marketer Deduction (-3.5%): -${res6.technicians[0].referralDeduction} FCFA`);
console.log(`Technician Net Commission (16.5%): ${res6.technicians[0].netCommission} FCFA`);
console.log(`Marketer Total Payout (2,500 Bounty + 1,750 %): ${res6.marketer?.totalPayout} FCFA`);
assert(res6.technicians[0].grossCommission === 10000, 'Senior Tech gross is 20% of 50,000 = 10,000 FCFA');
assert(res6.technicians[0].referralDeduction === 1750, 'Marketer deduction is 3.5% of 50,000 = 1,750 FCFA');
assert(res6.technicians[0].netCommission === 8250, 'Technician net commission is 10,000 - 1,750 = 8,250 FCFA (16.5%)');
assert(res6.marketer?.bounty === 2500, 'Custom bounty is 2,500 FCFA');
assert(res6.marketer?.lifetimePercentageEarned === 1750, 'Marketer custom 3.5% is 1,750 FCFA');
assert(res6.marketer?.totalPayout === 4250, 'Marketer total payout = 2,500 + 1,750 = 4,250 FCFA');
assert(res6.summary.isOwnerServiceNeutral, 'Spa Owner service payout remains neutral (8,250 + 1,750 = 10,000 FCFA)');
// ---------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} ASSERTIONS PASSED!`);
if (passedTests === totalTests) {
    console.log('STATUS: [ALL TESTS 100% SUCCESSFUL]');
}
else {
    console.log('STATUS: [SOME TESTS FAILED]');
}
console.log('================================================================\n');
//# sourceMappingURL=testMarketerLogicUnit.js.map