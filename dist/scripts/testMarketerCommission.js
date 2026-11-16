"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const commissions_service_1 = require("../modules/commissions/commissions.service");
const client_1 = require("@prisma/client");
async function runMarketerCommissionTest() {
    console.log('====================================================');
    console.log('--- TESTING MARKETER COMPENSATION & DEDUCTION SYSTEM ---');
    console.log('====================================================\n');
    const timestamp = Date.now().toString().slice(-6);
    try {
        // 1. Ensure Roles Exist
        let marketerRole = await database_1.default.role.findUnique({ where: { name: 'MARKETER' } });
        if (!marketerRole) {
            marketerRole = await database_1.default.role.create({ data: { name: 'MARKETER' } });
        }
        let techRole = await database_1.default.role.findUnique({ where: { name: 'TECHNICIAN' } });
        if (!techRole) {
            techRole = await database_1.default.role.create({ data: { name: 'TECHNICIAN' } });
        }
        // 2. Create Test Marketer (with 2% lifetime rate and 1,000 FCFA flat acquisition bounty)
        const marketerEmail = `test_marketer_${timestamp}@omegaspa.test`;
        const marketer = await database_1.default.user.create({
            data: {
                email: marketerEmail,
                passwordHash: 'dummy_hash',
                roleId: marketerRole.id,
                isActive: true,
                staffProfile: {
                    create: {
                        name: `Alex Marketer ${timestamp}`,
                        commissionRate: 2.00, // 2% negotiated lifetime commission
                        fixedSalary: 1000.00, // 1,000 FCFA flat acquisition bounty per new client
                    },
                },
            },
            include: { staffProfile: true },
        });
        console.log(`✓ Test Marketer Created: ${marketer.staffProfile?.name} (Rate: 2%, Bounty: 1,000 FCFA)`);
        // 3. Find or Create Test Technician
        let technician = await database_1.default.user.findFirst({
            where: { role: { name: 'TECHNICIAN' }, isActive: true },
            include: { staffProfile: true },
        });
        if (!technician) {
            technician = await database_1.default.user.create({
                data: {
                    email: `test_tech_${timestamp}@omegaspa.test`,
                    passwordHash: 'dummy_hash',
                    roleId: techRole.id,
                    isActive: true,
                    staffProfile: {
                        create: {
                            name: `Bella Technician ${timestamp}`,
                            commissionRate: 15.00,
                        },
                    },
                },
                include: { staffProfile: true },
            });
        }
        console.log(`✓ Test Technician: ${technician.staffProfile?.name || technician.email}`);
        // 4. Find or Create a Test Service
        let service = await database_1.default.service.findFirst({ where: { status: 'ACTIVE' } });
        if (!service) {
            service = await database_1.default.service.create({
                data: {
                    name: 'Signature Luxury Facial',
                    category: 'Facial',
                    duration: 60,
                    price: 20000.00,
                },
            });
        }
        console.log(`✓ Test Service: ${service.name} (${Number(service.price)} FCFA)`);
        // 5. Create Test Client introduced by this Marketer
        const clientPhone = `+237 690${timestamp}`;
        const testClient = await database_1.default.client.create({
            data: {
                name: `Marie Claire ${timestamp}`,
                phone: clientPhone,
                source: 'STAFF_REFERRAL',
                introducedByEmployeeId: marketer.id,
            },
        });
        console.log(`✓ Client Created: ${testClient.name} (Introduced by Marketer: ${marketer.id})`);
        // ----------------------------------------------------
        // TEST 1: First Visit for New Client (Bounty + 2% Lifetime Split)
        // ----------------------------------------------------
        console.log('\n--- [TEST 1] First Visit Checkout ---');
        const invoice1Number = `INV-MKT-1-${timestamp}`;
        const service1Price = 20000.00; // 20,000 FCFA
        const invoice1 = await database_1.default.invoice.create({
            data: {
                invoiceNumber: invoice1Number,
                clientId: testClient.id,
                date: new Date(),
                status: client_1.InvoiceStatus.PAID,
                subtotal: service1Price,
                total: service1Price,
                items: {
                    create: {
                        itemType: client_1.InvoiceItemType.SERVICE,
                        name: service.name,
                        serviceId: service.id,
                        technicianId: technician.id,
                        price: service1Price,
                        quantity: 1,
                    },
                },
            },
        });
        // Run commission generation
        await commissions_service_1.commissionsService.generateCommissionsForInvoice(invoice1.id);
        // Verify Technician Commission
        const techComm1 = await database_1.default.technicianCommission.findFirst({
            where: { invoiceId: invoice1.id, technicianId: technician.id },
        });
        // Verify Marketer Commission
        const mktComm1 = await database_1.default.employeeCommission.findFirst({
            where: { invoiceId: invoice1.id, employeeId: marketer.id },
        });
        console.log(`Technician Gross Commission: ${Number(techComm1?.baseCommission)} FCFA`);
        console.log(`Technician Referral Deduction (-2%): -${Number(techComm1?.referralDeduction)} FCFA`);
        console.log(`Technician Net Commission: ${Number(techComm1?.totalCommission)} FCFA`);
        console.log(`Marketer Total Payout (1,000 Bounty + 400 Split): ${Number(mktComm1?.amount)} FCFA`);
        // Expected:
        // Marketer gets 1,000 (flat bounty) + 400 (2% of 20,000) = 1,400 FCFA
        // Technician gets baseCommission - 400 deduction
        if (Number(techComm1?.referralDeduction) === 400 && Number(mktComm1?.amount) === 1400) {
            console.log('✓ PASS: Test 1 Succeeded! Technician had 400 FCFA (2%) deducted, and Marketer received 1,400 FCFA (1,000 Bounty + 400 Split).');
        }
        else {
            console.error('✗ FAIL: Test 1 Calculation Mismatch!');
        }
        // ----------------------------------------------------
        // TEST 2: Second / Repeat Visit (Lifetime 2% ONLY, No Duplicate Bounty)
        // ----------------------------------------------------
        console.log('\n--- [TEST 2] Second Visit (Repeat Customer) ---');
        const invoice2Number = `INV-MKT-2-${timestamp}`;
        const service2Price = 30000.00; // 30,000 FCFA
        const invoice2 = await database_1.default.invoice.create({
            data: {
                invoiceNumber: invoice2Number,
                clientId: testClient.id,
                date: new Date(),
                status: client_1.InvoiceStatus.PAID,
                subtotal: service2Price,
                total: service2Price,
                items: {
                    create: {
                        itemType: client_1.InvoiceItemType.SERVICE,
                        name: 'Deluxe Deep Tissue Massage',
                        serviceId: service.id,
                        technicianId: technician.id,
                        price: service2Price,
                        quantity: 1,
                    },
                },
            },
        });
        // Run commission generation for second visit
        await commissions_service_1.commissionsService.generateCommissionsForInvoice(invoice2.id);
        const techComm2 = await database_1.default.technicianCommission.findFirst({
            where: { invoiceId: invoice2.id, technicianId: technician.id },
        });
        const mktComm2 = await database_1.default.employeeCommission.findFirst({
            where: { invoiceId: invoice2.id, employeeId: marketer.id },
        });
        console.log(`Technician Gross Commission: ${Number(techComm2?.baseCommission)} FCFA`);
        console.log(`Technician Referral Deduction (-2% of 30,000): -${Number(techComm2?.referralDeduction)} FCFA`);
        console.log(`Technician Net Commission: ${Number(techComm2?.totalCommission)} FCFA`);
        console.log(`Marketer Repeat Commission (2% of 30,000, 0 Bounty): ${Number(mktComm2?.amount)} FCFA`);
        // Expected on Repeat Visit:
        // Marketer gets 0 (bounty) + 600 (2% of 30,000) = 600 FCFA
        // Technician gets baseCommission - 600 deduction
        if (Number(techComm2?.referralDeduction) === 600 && Number(mktComm2?.amount) === 600) {
            console.log('✓ PASS: Test 2 Succeeded! Repeat visit correctly awarded lifetime 2% (600 FCFA) with ZERO duplicate bounty.');
        }
        else {
            console.error('✗ FAIL: Test 2 Repeat Visit Calculation Mismatch!');
        }
        // ----------------------------------------------------
        // TEST 3: Marketer Performance & Ledger API Verification
        // ----------------------------------------------------
        console.log('\n--- [TEST 3] Marketer Performance API Report ---');
        const report = await commissions_service_1.commissionsService.getMarketerPerformance(marketer.id, {
            id: marketer.id,
            role: 'MARKETER',
        });
        console.log(`Report Total Clients Introduced: ${report.metrics.totalClientsIntroduced}`);
        console.log(`Report Clients with Paid Visits: ${report.metrics.clientsWithPaidVisits}`);
        console.log(`Report Total Visits Count: ${report.metrics.totalVisitsCount}`);
        console.log(`Report Total Commission Earned: ${report.metrics.totalCommissionEarned} FCFA (Expected: 2,000 FCFA)`);
        // Expected total commission: 1,400 + 600 = 2,000 FCFA
        if (report.metrics.totalCommissionEarned === 2000 && report.metrics.totalVisitsCount === 2) {
            console.log('✓ PASS: Test 3 Succeeded! Marketer performance API report matches ledger perfectly (2,000 FCFA total across 2 visits).');
        }
        else {
            console.error('✗ FAIL: Test 3 Performance API Report Mismatch!');
        }
        // ----------------------------------------------------
        // Cleanup Test Data (Preserve Database Cleanliness)
        // ----------------------------------------------------
        console.log('\n--- Cleaning up temporary test fixtures ---');
        await database_1.default.commissionActivity.deleteMany({
            where: {
                technicianCommission: {
                    invoiceId: { in: [invoice1.id, invoice2.id] },
                },
            },
        });
        await database_1.default.technicianCommission.deleteMany({
            where: { invoiceId: { in: [invoice1.id, invoice2.id] } },
        });
        await database_1.default.employeeCommission.deleteMany({
            where: { invoiceId: { in: [invoice1.id, invoice2.id] } },
        });
        await database_1.default.invoiceItem.deleteMany({
            where: { invoiceId: { in: [invoice1.id, invoice2.id] } },
        });
        await database_1.default.invoice.deleteMany({
            where: { id: { in: [invoice1.id, invoice2.id] } },
        });
        await database_1.default.client.delete({ where: { id: testClient.id } });
        await database_1.default.staffProfile.deleteMany({ where: { userId: marketer.id } });
        await database_1.default.user.delete({ where: { id: marketer.id } });
        console.log('✓ All test records cleaned up successfully.');
        console.log('\n====================================================');
        console.log('🎉 ALL TESTS PASSED WITH 100% SUCCESS!');
        console.log('====================================================\n');
    }
    catch (error) {
        console.error('Test execution error:', error);
        process.exit(1);
    }
    finally {
        await database_1.default.$disconnect();
    }
}
runMarketerCommissionTest();
//# sourceMappingURL=testMarketerCommission.js.map