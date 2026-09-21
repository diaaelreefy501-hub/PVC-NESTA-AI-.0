import {
  Customer,
  Inquiry,
  FollowUp,
  Opportunity,
  Quotation,
  Inspection,
  Contract,
  Sale,
  Payment,
  Company,
  CompanyId,
} from "../types";

export type PeriodType = "today" | "this_month" | "last_month" | "this_year" | "custom" | "all";

export interface PeriodFilterOptions {
  period?: PeriodType;
  month?: string; // YYYY-MM
  year?: string; // YYYY
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string; // YYYY-MM-DD
  referenceDate?: Date;
}

export interface KPIEngineDataSnapshot {
  companies: Company[];
  customers: Customer[];
  inquiries: Inquiry[];
  followUps: FollowUp[];
  opportunities: Opportunity[];
  quotations: Quotation[];
  inspections: Inspection[];
  contracts: Contract[];
  sales: Sale[];
  payments: Payment[];
}

/**
 * 1. Extract canonical event date for each business entity
 */
export function getEntityEventDate(entity: any, entityType: string): string {
  if (!entity) return "";
  switch (entityType) {
    case "contract":
      return entity.date || entity.signDate || entity.createdAt || "";
    case "sale":
      return entity.date || entity.createdAt || "";
    case "payment":
    case "collection":
      return entity.date || entity.createdAt || "";
    case "quotation":
      return entity.date || entity.createdAt || "";
    case "opportunity":
      return entity.closedAt || entity.date || entity.createdAt || "";
    case "inquiry":
      return entity.date || entity.createdAt || "";
    case "followup":
      return entity.dueDate || entity.date || entity.createdAt || "";
    case "inspection":
      return entity.date || entity.scheduledDate || entity.createdAt || "";
    case "customer":
      return entity.createdAt || "";
    default:
      return entity.date || entity.createdAt || "";
  }
}

/**
 * 2. Deterministic Date Period Matching
 */
export function isDateInPeriod(
  dateStr: string | undefined | null,
  options: PeriodFilterOptions = {}
): boolean {
  if (!options.period || options.period === "all") {
    // If a specific month or year filter is provided directly
    if (options.month) {
      return !!dateStr && dateStr.startsWith(options.month);
    }
    if (options.year) {
      return !!dateStr && dateStr.startsWith(options.year);
    }
    return true;
  }

  if (!dateStr) return false;
  const cleanDate = dateStr.split("T")[0];
  const now = options.referenceDate || new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentMonthKey = todayStr.slice(0, 7); // YYYY-MM
  const currentYearKey = todayStr.slice(0, 4); // YYYY

  switch (options.period) {
    case "today":
      return cleanDate === todayStr;

    case "this_month": {
      const targetMonth = options.month || currentMonthKey;
      return cleanDate.startsWith(targetMonth);
    }

    case "last_month": {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
      return cleanDate.startsWith(lastMonthKey);
    }

    case "this_year": {
      const targetYear = options.year || currentYearKey;
      return cleanDate.startsWith(targetYear);
    }

    case "custom": {
      if (options.customStartDate && cleanDate < options.customStartDate) return false;
      if (options.customEndDate && cleanDate > options.customEndDate) return false;
      return true;
    }

    default:
      return true;
  }
}

/**
 * 3. Filter helper by CompanyId
 */
export function filterByCompany<T extends { companyId?: string }>(
  items: T[],
  companyId?: string | null
): T[] {
  if (!companyId || companyId === "all") return items;
  return items.filter((item) => item.companyId === companyId);
}

/**
 * 4. Filter entities by both Company and Period using canonical event dates
 */
export function filterEntityCollection<T>(
  items: T[],
  entityType: string,
  companyId?: string | string[] | null,
  periodOptions?: PeriodFilterOptions,
  snapshot?: KPIEngineDataSnapshot
): T[] {
  let result = items;
  if (companyId) {
    if (Array.isArray(companyId)) {
      if (companyId.length > 0 && !companyId.includes("all")) {
        result = result.filter((item: any) => {
          let itemCompId = item.companyId;
          if ((!itemCompId || itemCompId === "all") && snapshot) {
            if (item.customerId) {
              const cust = snapshot.customers.find((c) => c.id === item.customerId || c.name === item.customerName);
              if (cust?.companyId) itemCompId = cust.companyId;
            }
            if ((!itemCompId || itemCompId === "all") && item.contractId) {
              const ctr = snapshot.contracts.find((c) => c.id === item.contractId);
              if (ctr?.companyId) itemCompId = ctr.companyId;
            }
          }
          return !itemCompId || itemCompId === "all" || companyId.includes(itemCompId);
        });
      }
    } else if (companyId !== "all") {
      result = result.filter((item: any) => {
        let itemCompId = item.companyId;
        if ((!itemCompId || itemCompId === "all") && snapshot) {
          if (item.customerId) {
            const cust = snapshot.customers.find((c) => c.id === item.customerId || c.name === item.customerName);
            if (cust?.companyId) itemCompId = cust.companyId;
          }
          if ((!itemCompId || itemCompId === "all") && item.contractId) {
            const ctr = snapshot.contracts.find((c) => c.id === item.contractId);
            if (ctr?.companyId) itemCompId = ctr.companyId;
          }
        }
        return !itemCompId || itemCompId === "all" || itemCompId === companyId;
      });
    }
  }
  if (periodOptions) {
    result = result.filter((item: any) => {
      const eventDate = getEntityEventDate(item, entityType);
      return isDateInPeriod(eventDate, periodOptions);
    });
  }

  // Apply strict financial and status exclusions for unified KPIs
  if (entityType === "contract") {
    result = result.filter(
      (item: any) =>
        item.recordStatus !== "duplicate" &&
        item.recordStatus !== "excluded" &&
        item.status !== "cancelled"
    );
  } else if (entityType === "payment" || entityType === "collection") {
    result = result.filter(
      (item: any) =>
        item.recordStatus !== "duplicate" &&
        item.recordStatus !== "excluded"
    );
  } else if (entityType === "sale" || entityType === "opportunity") {
    result = result.filter(
      (item: any) =>
        item.recordStatus !== "duplicate" &&
        item.recordStatus !== "excluded" &&
        item.recordStatus !== "unlinked" &&
        item.recordStatus !== "review_required"
    );
  }

  return result;
}

/**
 * 5. Customer 360 Relational Extractor
 * Finds all genuine business entities linked to a specific customer
 */
export interface Customer360Relations {
  customer: Customer;
  inquiries: Inquiry[];
  followUps: FollowUp[];
  opportunities: Opportunity[];
  quotations: Quotation[];
  inspections: Inspection[];
  contracts: Contract[];
  sales: Sale[];
  payments: Payment[];
  // Derived metrics
  totalQuotationsValue: number;
  totalContractsValue: number;
  totalSalesValue: number;
  totalCollectedValue: number;
  totalRemainingValue: number;
  isContracted: boolean;
  contractCount: number;
  salesCount: number;
  lastEventDate: string;
}

export function getCustomer360Relations(
  customer: Customer,
  snapshot: KPIEngineDataSnapshot
): Customer360Relations {
  const cId = customer.id;
  const cPhone = customer.phone;

  // Inquiries
  const customerInquiries = snapshot.inquiries.filter(
    (i) => i.customerId === cId || (cPhone && i.customerPhone === cPhone)
  );

  // Follow-ups
  const customerFollowUps = snapshot.followUps.filter(
    (f) => f.customerId === cId || (cPhone && f.customerPhone === cPhone)
  );

  // Opportunities
  const customerOpportunities = snapshot.opportunities.filter(
    (o) => o.customerId === cId || (cPhone && o.customerPhone === cPhone)
  );

  // Quotations
  const customerQuotations = snapshot.quotations.filter(
    (q) => q.customerId === cId || (cPhone && q.customerPhone === cPhone)
  );

  // Inspections
  const customerInspections = snapshot.inspections.filter(
    (insp) => insp.customerId === cId || (cPhone && insp.customerPhone === cPhone)
  );

  // Contracts
  const customerContracts = snapshot.contracts.filter(
    (ctr) =>
      (ctr.customerId === cId || (cPhone && ctr.customerPhone === cPhone)) &&
      ctr.recordStatus !== "duplicate" &&
      ctr.recordStatus !== "excluded" &&
      ctr.status !== "cancelled"
  );

  // Contract IDs set for cascading lookup
  const contractIdSet = new Set(customerContracts.map((ctr) => ctr.id));

  // Sales (either by customerId, matching phone, or linked contractId)
  const customerSales = snapshot.sales.filter(
    (s) =>
      s.recordStatus !== "duplicate" &&
      s.recordStatus !== "excluded" &&
      (s.customerId === cId ||
        (s.contractId && contractIdSet.has(s.contractId)) ||
        (customer.name && s.customerName === customer.name && s.companyId === customer.companyId))
  );

  // Payments / Collections
  const customerPayments = snapshot.payments.filter(
    (p) =>
      p.recordStatus !== "duplicate" &&
      p.recordStatus !== "excluded" &&
      (p.customerId === cId ||
        (p.contractId && contractIdSet.has(p.contractId)) ||
        (customer.name && p.customerName === customer.name && p.companyId === customer.companyId))
  );

  // Totals calculation
  const totalQuotationsValue = customerQuotations.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const totalContractsValue = customerContracts.reduce((acc, c) => acc + (c.totalValue || 0), 0);
  const totalSalesValue = customerSales.reduce((acc, s) => acc + (s.amount || 0), 0);
  const totalCollectedValue = customerPayments.reduce(
    (acc, p) => p.status === "reversed" || p.status === "refunded" ? acc : acc + (p.amount || 0),
    customerContracts.reduce((acc, c) => acc + (c.paidAmount || 0), 0) > 0 && customerPayments.length === 0
      ? customerContracts.reduce((acc, c) => acc + (c.paidAmount || 0), 0)
      : 0
  );
  const totalRemainingValue = Math.max(0, totalContractsValue - totalCollectedValue);

  const isContracted =
    customerContracts.length > 0 ||
    customer.stage === "contracted" ||
    customer.stage === "sold";

  // Find latest event date across touchpoints
  const allDates: string[] = [customer.createdAt];
  customerInquiries.forEach((i) => i.date && allDates.push(i.date));
  customerQuotations.forEach((q) => q.date && allDates.push(q.date));
  customerContracts.forEach((c) => (c.signDate || c.date) && allDates.push(c.signDate || c.date));
  customerSales.forEach((s) => s.date && allDates.push(s.date));
  customerPayments.forEach((p) => p.date && allDates.push(p.date));
  customerFollowUps.forEach((f) => (f.dueDate || f.date) && allDates.push(f.dueDate || f.date || ""));

  const sortedDates = allDates.filter(Boolean).sort().reverse();
  const lastEventDate = sortedDates[0] || customer.createdAt || "";

  return {
    customer,
    inquiries: customerInquiries,
    followUps: customerFollowUps,
    opportunities: customerOpportunities,
    quotations: customerQuotations,
    inspections: customerInspections,
    contracts: customerContracts,
    sales: customerSales,
    payments: customerPayments,
    totalQuotationsValue,
    totalContractsValue,
    totalSalesValue,
    totalCollectedValue,
    totalRemainingValue,
    isContracted,
    contractCount: customerContracts.length,
    salesCount: customerSales.length,
    lastEventDate,
  };
}

/**
 * 6. UNIFIED KPI COMPUTATION ENGINE
 * Single authoritative source of truth for computing all business KPIs
 */
export interface UnifiedKPIResult {
  scope: {
    companyId: string;
    companyName: string;
    period: PeriodType;
    periodLabel: string;
  };
  customers: {
    total: number;
    contractedCount: number;
    inquiryStageCount: number;
    quotationStageCount: number;
    negotiationStageCount: number;
  };
  contracts: {
    count: number;
    totalValue: number;
    paidAmount: number;
    remainingAmount: number;
    activeCount: number;
    completedCount: number;
  };
  sales: {
    count: number;
    totalAmount: number;
    linkedToContractCount: number;
    directSalesCount: number;
    averageDealSize: number;
  };
  collections: {
    count: number;
    totalAmount: number;
    remainingAmount: number;
  };
  quotations: {
    count: number;
    totalAmount: number;
    acceptedCount: number;
    acceptanceRate: number;
  };
  opportunities: {
    totalCount: number;
    openCount: number;
    wonCount: number;
    lostCount: number;
    pipelineValue: number;
    wonValue: number;
    lostValue: number;
    totalValue: number;
    winRate: number;
  };
  inquiries: {
    count: number;
  };
  followUps: {
    total: number;
    todayPending: number;
    overduePending: number;
    upcomingPending: number;
    completed: number;
  };
  inspections: {
    total: number;
    completed: number;
    pending: number;
  };
  targets: {
    monthlyTarget: number;
    achievementRate: number; // Percentage against monthly sales
  };
}

export function computeUnifiedKPIs(
  snapshot: KPIEngineDataSnapshot,
  options: {
    companyId?: string;
    period?: PeriodType;
    month?: string;
    year?: string;
    customStartDate?: string;
    customEndDate?: string;
    referenceDate?: Date;
  } = {}
): UnifiedKPIResult {
  const companyId = options.companyId || "all";
  const period = options.period || (options.month ? "this_month" : "all");

  const company = snapshot.companies.find((c) => c.id === companyId);
  const companyName = companyId === "all" ? "كافة الشركات" : company?.name || companyId;

  // Filter entities according to Company and Canonical Date
  const filteredCustomers = filterByCompany(snapshot.customers, companyId);
  
  const periodOpts: PeriodFilterOptions = {
    period,
    month: options.month,
    year: options.year,
    customStartDate: options.customStartDate,
    customEndDate: options.customEndDate,
    referenceDate: options.referenceDate,
  };

  const periodContracts = filterEntityCollection(snapshot.contracts, "contract", companyId, periodOpts, snapshot);
  const periodSales = filterEntityCollection(snapshot.sales, "sale", companyId, periodOpts, snapshot);
  const periodPayments = filterEntityCollection(snapshot.payments, "payment", companyId, periodOpts, snapshot);
  const periodQuotations = filterEntityCollection(snapshot.quotations, "quotation", companyId, periodOpts, snapshot);
  const periodOpportunities = filterEntityCollection(snapshot.opportunities, "opportunity", companyId, periodOpts, snapshot);
  const periodInquiries = filterEntityCollection(snapshot.inquiries, "inquiry", companyId, periodOpts, snapshot);
  const periodFollowUps = filterEntityCollection(snapshot.followUps, "followup", companyId, periodOpts, snapshot);
  const periodInspections = filterEntityCollection(snapshot.inspections, "inspection", companyId, periodOpts, snapshot);

  // 1. Contracts KPIs
  const contractsTotalValue = periodContracts.reduce((sum, c) => sum + (Number(c.totalValue) || 0), 0);
  const contractsPaidAmount = periodContracts.reduce((sum, c) => sum + (Number(c.paidAmount) || 0), 0);
  const contractsRemainingAmount = periodContracts.reduce((sum, c) => sum + (Number(c.remainingAmount) || 0), 0);
  const activeContractsCount = periodContracts.filter((c) => c.status === "active" || (c as any).status === "signed").length;
  const completedContractsCount = periodContracts.filter((c) => c.status === "completed").length;

  // Contracted customers in this period
  const contractedCustomerIds = new Set<string>();
  periodContracts.forEach((c) => {
    if (c.customerId) contractedCustomerIds.add(c.customerId);
    else if (c.customerName) contractedCustomerIds.add(c.customerName);
  });

  // 2. Sales KPIs
  const salesTotalAmount = periodSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const linkedSalesCount = periodSales.filter((s) => Boolean(s.contractId)).length;
  const directSalesCount = periodSales.length - linkedSalesCount;
  const avgDealSize = periodSales.length > 0 ? Math.round(salesTotalAmount / periodSales.length) : 0;

  // 3. Collections KPIs (Source of truth: Valid Payment records, with legacy contract.paidAmount fallback only when 0 payment records exist)
  const paymentsByContract = new Map<string, number>();
  let directPaymentsSum = 0;

  periodPayments.forEach((p) => {
    if (p.status === "reversed" || p.status === "refunded") return; // Exclude reversed and refunded from collections totals
    const amt = Number(p.amount) || 0;
    if (p.contractId) {
      paymentsByContract.set(p.contractId, (paymentsByContract.get(p.contractId) || 0) + amt);
    } else {
      directPaymentsSum += amt;
    }
  });

  let contractCollectionsSum = 0;
  periodContracts.forEach((c) => {
    if (paymentsByContract.has(c.id)) {
      // Contract has actual Payment records -> Payments are the exclusive source of truth
      contractCollectionsSum += paymentsByContract.get(c.id)!;
    } else {
      // Legacy historical fallback ONLY when no Payment records exist for this contract
      const legacyPaid = Number(c.paidAmount) || 0;
      if (legacyPaid > 0) {
        contractCollectionsSum += legacyPaid;
      }
    }
  });

  const collectionsTotalAmount = contractCollectionsSum + directPaymentsSum;

  // 4. Quotations KPIs
  const quotationsTotalAmount = periodQuotations.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0);
  const acceptedQuotesCount = periodQuotations.filter((q) => q.status === "accepted" || q.status === "contracted").length;
  const quoteAcceptanceRate = periodQuotations.length > 0 ? Math.round((acceptedQuotesCount / periodQuotations.length) * 100) : 0;

  // 5. Opportunities KPIs
  const wonOpps = periodOpportunities.filter((o) => o.status === "won");
  const lostOpps = periodOpportunities.filter((o) => o.status === "lost");
  const openOpps = periodOpportunities.filter((o) => o.status === "open");
  const oppsPipelineValue = openOpps.reduce((sum, o) => sum + (Number(o.expectedValue) || 0), 0);
  const oppsWonValue = wonOpps.reduce((sum, o) => sum + (Number(o.expectedValue) || 0), 0);
  const oppsLostValue = lostOpps.reduce((sum, o) => sum + (Number(o.expectedValue) || 0), 0);
  const oppsTotalValue = oppsPipelineValue + oppsWonValue + oppsLostValue;
  const oppsWinRate = periodOpportunities.length > 0 ? Math.round((wonOpps.length / periodOpportunities.length) * 100) : 0;

  // 6. Follow-ups KPIs
  const todayDateStr = (options.referenceDate || new Date()).toISOString().split("T")[0];
  const compFollowUps = filterByCompany(snapshot.followUps, companyId);
  const todayPendingFollowUps = compFollowUps.filter((f) => f.status === "pending" && f.dueDate === todayDateStr).length;
  const overduePendingFollowUps = compFollowUps.filter((f) => f.status === "pending" && f.dueDate < todayDateStr).length;
  const upcomingPendingFollowUps = compFollowUps.filter((f) => f.status === "pending" && f.dueDate > todayDateStr).length;
  const completedFollowUps = periodFollowUps.filter((f) => f.status === "completed").length;

  // 7. Inspections KPIs
  const completedInspections = periodInspections.filter((i) => i.result === "completed" || i.status === "completed").length;
  const pendingInspections = periodInspections.filter((i) => i.result === "pending" || i.status === "pending").length;

  // 8. Target Calculation
  let monthlyTarget = 0;
  if (companyId === "all") {
    monthlyTarget = snapshot.companies.reduce((sum, c) => sum + (c.monthlyTarget || 0), 0);
  } else {
    monthlyTarget = company?.monthlyTarget || 0;
  }
  const achievementRate = monthlyTarget > 0 ? Number(((salesTotalAmount / monthlyTarget) * 100).toFixed(1)) : 0;

  // Period label
  let periodLabel = "كل الفترات";
  if (period === "today") periodLabel = "اليوم";
  else if (period === "this_month" || options.month) periodLabel = `شهر ${options.month || todayDateStr.slice(0, 7)}`;
  else if (period === "last_month") periodLabel = "الشهر السابق";
  else if (period === "this_year" || options.year) periodLabel = `سنة ${options.year || todayDateStr.slice(0, 4)}`;
  else if (period === "custom") periodLabel = `فترة مخصصة (${options.customStartDate || ""} - ${options.customEndDate || ""})`;

  return {
    scope: {
      companyId,
      companyName,
      period,
      periodLabel,
    },
    customers: {
      total: filteredCustomers.length,
      contractedCount: contractedCustomerIds.size,
      inquiryStageCount: filteredCustomers.filter((c) => c.stage === "inquiry").length,
      quotationStageCount: filteredCustomers.filter((c) => c.stage === "quotation").length,
      negotiationStageCount: filteredCustomers.filter((c) => c.stage === "negotiation").length,
    },
    contracts: {
      count: periodContracts.length,
      totalValue: contractsTotalValue,
      paidAmount: contractsPaidAmount,
      remainingAmount: contractsRemainingAmount,
      activeCount: activeContractsCount,
      completedCount: completedContractsCount,
    },
    sales: {
      count: periodSales.length,
      totalAmount: salesTotalAmount,
      linkedToContractCount: linkedSalesCount,
      directSalesCount: directSalesCount,
      averageDealSize: avgDealSize,
    },
    collections: {
      count: periodPayments.length,
      totalAmount: collectionsTotalAmount,
      remainingAmount: Math.max(0, contractsTotalValue - collectionsTotalAmount),
    },
    quotations: {
      count: periodQuotations.length,
      totalAmount: quotationsTotalAmount,
      acceptedCount: acceptedQuotesCount,
      acceptanceRate: quoteAcceptanceRate,
    },
    opportunities: {
      totalCount: periodOpportunities.length,
      openCount: openOpps.length,
      wonCount: wonOpps.length,
      lostCount: lostOpps.length,
      pipelineValue: oppsPipelineValue,
      wonValue: oppsWonValue,
      lostValue: oppsLostValue,
      totalValue: oppsTotalValue,
      winRate: oppsWinRate,
    },
    inquiries: {
      count: periodInquiries.length,
    },
    followUps: {
      total: periodFollowUps.length,
      todayPending: todayPendingFollowUps,
      overduePending: overduePendingFollowUps,
      upcomingPending: upcomingPendingFollowUps,
      completed: completedFollowUps,
    },
    inspections: {
      total: periodInspections.length,
      completed: completedInspections,
      pending: pendingInspections,
    },
    targets: {
      monthlyTarget,
      achievementRate,
    },
  };
}

/**
 * 7. Company-by-Company KPI Breakdown Helper
 * Returns unified KPI metrics for each active company for the exact same given period
 */
export function getCompanyKPIBreakdown(
  snapshot: KPIEngineDataSnapshot,
  options: {
    period?: PeriodType;
    month?: string;
    year?: string;
    customStartDate?: string;
    customEndDate?: string;
  } = {}
) {
  return snapshot.companies.map((comp) => {
    const kpi = computeUnifiedKPIs(snapshot, {
      ...options,
      companyId: comp.id,
    });
    return {
      company: comp,
      kpi,
    };
  });
}
