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
interface ServiceItem {
    serviceName: string;
    category: string;
    price: number;
    quantity: number;
    technicianName: string;
    technicianRate: number;
}
interface MarketerContract {
    name: string;
    flatAcquisitionFee: number;
    lifetimeCommissionRate: number;
}
declare function calculateInvoiceCommission(items: ServiceItem[], isFirstVisit: boolean, marketer: MarketerContract | null): {
    marketer: {
        name: string;
        isFirstVisit: boolean;
        bounty: number;
        lifetimePercentageEarned: number;
        totalPayout: number;
    } | null;
    technicians: {
        service: string;
        technician: string;
        serviceTotal: number;
        rate: number;
        grossCommission: number;
        referralDeduction: number;
        netCommission: number;
    }[];
    summary: {
        totalTechnicianGross: number;
        totalTechnicianDeductions: number;
        totalTechnicianNetPayout: number;
        marketerTotalPayout: number;
        isOwnerServiceNeutral: boolean;
    };
};
declare let passedTests: number;
declare let totalTests: number;
declare function assert(condition: boolean, testName: string, details?: string): void;
declare const testMarketer: MarketerContract;
declare const scenario1Items: ServiceItem[];
declare const res1: {
    marketer: {
        name: string;
        isFirstVisit: boolean;
        bounty: number;
        lifetimePercentageEarned: number;
        totalPayout: number;
    } | null;
    technicians: {
        service: string;
        technician: string;
        serviceTotal: number;
        rate: number;
        grossCommission: number;
        referralDeduction: number;
        netCommission: number;
    }[];
    summary: {
        totalTechnicianGross: number;
        totalTechnicianDeductions: number;
        totalTechnicianNetPayout: number;
        marketerTotalPayout: number;
        isOwnerServiceNeutral: boolean;
    };
};
declare const scenario2Items: ServiceItem[];
declare const res2: {
    marketer: {
        name: string;
        isFirstVisit: boolean;
        bounty: number;
        lifetimePercentageEarned: number;
        totalPayout: number;
    } | null;
    technicians: {
        service: string;
        technician: string;
        serviceTotal: number;
        rate: number;
        grossCommission: number;
        referralDeduction: number;
        netCommission: number;
    }[];
    summary: {
        totalTechnicianGross: number;
        totalTechnicianDeductions: number;
        totalTechnicianNetPayout: number;
        marketerTotalPayout: number;
        isOwnerServiceNeutral: boolean;
    };
};
declare const scenario3Items: ServiceItem[];
declare const res3: {
    marketer: {
        name: string;
        isFirstVisit: boolean;
        bounty: number;
        lifetimePercentageEarned: number;
        totalPayout: number;
    } | null;
    technicians: {
        service: string;
        technician: string;
        serviceTotal: number;
        rate: number;
        grossCommission: number;
        referralDeduction: number;
        netCommission: number;
    }[];
    summary: {
        totalTechnicianGross: number;
        totalTechnicianDeductions: number;
        totalTechnicianNetPayout: number;
        marketerTotalPayout: number;
        isOwnerServiceNeutral: boolean;
    };
};
declare let totalMarketerMonth1: number;
declare let totalTechnicianDeductionsMonth1: number;
declare let totalBountiesPaid: number;
declare let totalMarketerMonth2: number;
declare let totalBountiesMonth2: number;
declare const edgeItems: ServiceItem[];
declare const res5: {
    marketer: {
        name: string;
        isFirstVisit: boolean;
        bounty: number;
        lifetimePercentageEarned: number;
        totalPayout: number;
    } | null;
    technicians: {
        service: string;
        technician: string;
        serviceTotal: number;
        rate: number;
        grossCommission: number;
        referralDeduction: number;
        netCommission: number;
    }[];
    summary: {
        totalTechnicianGross: number;
        totalTechnicianDeductions: number;
        totalTechnicianNetPayout: number;
        marketerTotalPayout: number;
        isOwnerServiceNeutral: boolean;
    };
};
declare const customMarketer: MarketerContract;
declare const customItems: ServiceItem[];
declare const res6: {
    marketer: {
        name: string;
        isFirstVisit: boolean;
        bounty: number;
        lifetimePercentageEarned: number;
        totalPayout: number;
    } | null;
    technicians: {
        service: string;
        technician: string;
        serviceTotal: number;
        rate: number;
        grossCommission: number;
        referralDeduction: number;
        netCommission: number;
    }[];
    summary: {
        totalTechnicianGross: number;
        totalTechnicianDeductions: number;
        totalTechnicianNetPayout: number;
        marketerTotalPayout: number;
        isOwnerServiceNeutral: boolean;
    };
};
//# sourceMappingURL=testMarketerLogicUnit.d.ts.map