import { Customer, Contract, Sale } from "../types";

export interface DuplicateContractInfo {
  contractId: string;
  contractNumber: string;
  customerName: string;
  date?: string;
  totalValue: number;
  duplicateType: "by_contract_number" | "by_customer_date_value";
  matchedWithContractIds: string[];
  reason: string;
}

export interface CustomerContractBreakdown {
  customerId: string;
  customerName: string;
  phone: string;
  area: string;
  contractsCount: number;
  totalContractsValue: number;
  contracts: Array<{
    contractId: string;
    contractNumber: string;
    date?: string;
    totalValue: number;
    paidAmount?: number;
    remainingAmount?: number;
    status: string;
    recordStatus?: string;
    linkedSalesCount: number;
    linkedSalesTotal: number;
    isDuplicate: boolean;
    duplicateReason?: string;
  }>;
}

export interface OrphanContractsGroup {
  customerNameInContract: string;
  phoneInContract: string;
  contractsCount: number;
  totalValue: number;
  sampleContractNumbers: string[];
  sampleContractIds: string[];
}

export interface SalesMappingSummary {
  totalSalesCount: number;
  salesLinkedToContractsCount: number;
  unlinkedSalesCount: number;
  contractsWithSalesCount: number;
  contractsWithoutSalesCount: number;
}

export interface ContractDiagnosticReport {
  timestamp: string;
  summary: {
    totalRegisteredCustomers: number;
    totalContracts: number;
    registeredContractsCount: number;
    orphanContractsCount: number;
    totalSales: number;
    duplicateContractsCount: number;
    contractsPerRegisteredCustomerAvg: number;
    rootCauses: string[];
    recommendations: string[];
  };
  customerBreakdown: CustomerContractBreakdown[];
  duplicateContracts: DuplicateContractInfo[];
  orphanContractsGrouped: OrphanContractsGroup[];
  salesMappingSummary: SalesMappingSummary;
}

/**
 * Diagnostic function to analyze Contracts and Sales against Registered Customers.
 * Identifies duplicate contracts, unlinked orphan contracts, and linked sales per contract.
 */
export function runContractsDiagnostic(
  customers: Customer[],
  contracts: Contract[],
  sales: Sale[]
): ContractDiagnosticReport {
  const validCustMap = new Map<string, Customer>();
  customers.forEach((c) => validCustMap.set(c.id, c));

  // Map Sales by Contract ID
  const salesByContractId = new Map<string, Sale[]>();
  let salesLinkedToContractsCount = 0;
  let unlinkedSalesCount = 0;

  sales.forEach((s) => {
    if (s.contractId) {
      salesLinkedToContractsCount++;
      if (!salesByContractId.has(s.contractId)) {
        salesByContractId.set(s.contractId, []);
      }
      salesByContractId.get(s.contractId)!.push(s);
    } else {
      unlinkedSalesCount++;
    }
  });

  // Identify Duplicate Contracts
  const seenNumbers = new Map<string, string[]>();
  const seenCombos = new Map<string, string[]>();

  contracts.forEach((c) => {
    const numKey = (c.contractNumber || "").trim().toLowerCase();
    if (numKey) {
      if (!seenNumbers.has(numKey)) seenNumbers.set(numKey, []);
      seenNumbers.get(numKey)!.push(c.id);
    }

    const comboKey = `${(c.customerName || "").trim().toLowerCase()}_${c.date || c.signDate || "nodate"}_${c.totalValue || 0}`;
    if (!seenCombos.has(comboKey)) seenCombos.set(comboKey, []);
    seenCombos.get(comboKey)!.push(c.id);
  });

  const duplicateMap = new Map<string, { type: "by_contract_number" | "by_customer_date_value"; matchedWith: string[]; reason: string }>();

  seenNumbers.forEach((ids, numKey) => {
    if (ids.length > 1) {
      // Mark all except first as duplicate
      ids.slice(1).forEach((id) => {
        duplicateMap.set(id, {
          type: "by_contract_number",
          matchedWith: ids.filter((i) => i !== id),
          reason: `تكرار رقم العقد (${numKey}) مع ${ids.length - 1} عقود أخرى`,
        });
      });
    }
  });

  seenCombos.forEach((ids, comboKey) => {
    if (ids.length > 1) {
      ids.slice(1).forEach((id) => {
        if (!duplicateMap.has(id)) {
          duplicateMap.set(id, {
            type: "by_customer_date_value",
            matchedWith: ids.filter((i) => i !== id),
            reason: `تكرار بيانات العقد (العميل + التاريخ + القيمة) مكرر ${ids.length} مرات`,
          });
        }
      });
    }
  });

  const duplicateContractsList: DuplicateContractInfo[] = [];
  contracts.forEach((c) => {
    const dupInfo = duplicateMap.get(c.id);
    if (dupInfo) {
      duplicateContractsList.push({
        contractId: c.id,
        contractNumber: c.contractNumber || "بدون رقم",
        customerName: c.customerName || "غير معروف",
        date: c.date || c.signDate,
        totalValue: c.totalValue || 0,
        duplicateType: dupInfo.type,
        matchedWithContractIds: dupInfo.matchedWith,
        reason: dupInfo.reason,
      });
    }
  });

  // Group Contracts by Registered Customer vs Orphan Contracts
  const customerBreakdownMap = new Map<string, CustomerContractBreakdown>();
  customers.forEach((cust) => {
    customerBreakdownMap.set(cust.id, {
      customerId: cust.id,
      customerName: cust.name,
      phone: cust.phone || "غير محدد",
      area: cust.area || "غير محدد",
      contractsCount: 0,
      totalContractsValue: 0,
      contracts: [],
    });
  });

  const orphanGroupMap = new Map<string, OrphanContractsGroup>();
  let registeredContractsCount = 0;
  let orphanContractsCount = 0;
  let contractsWithSalesCount = 0;
  let contractsWithoutSalesCount = 0;

  contracts.forEach((c) => {
    const linkedSales = salesByContractId.get(c.id) || [];
    const linkedSalesCount = linkedSales.length;
    const linkedSalesTotal = linkedSales.reduce((sum, s) => sum + (s.amount || 0), 0);

    if (linkedSalesCount > 0) {
      contractsWithSalesCount++;
    } else {
      contractsWithoutSalesCount++;
    }

    const isDup = duplicateMap.has(c.id);
    const dupReason = duplicateMap.get(c.id)?.reason;

    if (validCustMap.has(c.customerId)) {
      registeredContractsCount++;
      const breakdown = customerBreakdownMap.get(c.customerId)!;
      breakdown.contractsCount++;
      breakdown.totalContractsValue += Number(c.totalValue) || 0;
      breakdown.contracts.push({
        contractId: c.id,
        contractNumber: c.contractNumber || c.id,
        date: c.date || c.signDate,
        totalValue: Number(c.totalValue) || 0,
        paidAmount: Number(c.paidAmount) || 0,
        remainingAmount: Number(c.remainingAmount) || 0,
        status: c.status || "signed",
        recordStatus: c.recordStatus,
        linkedSalesCount,
        linkedSalesTotal,
        isDuplicate: isDup,
        duplicateReason: dupReason,
      });
    } else {
      orphanContractsCount++;
      const key = `${(c.customerName || "عميل غير مسمى").trim()}_${(c.customerPhone || "بدون_هاتف").trim()}`;
      if (!orphanGroupMap.has(key)) {
        orphanGroupMap.set(key, {
          customerNameInContract: c.customerName || "عميل غير مسمى",
          phoneInContract: c.customerPhone || "غير محدد",
          contractsCount: 0,
          totalValue: 0,
          sampleContractNumbers: [],
          sampleContractIds: [],
        });
      }
      const grp = orphanGroupMap.get(key)!;
      grp.contractsCount++;
      grp.totalValue += Number(c.totalValue) || 0;
      if (grp.sampleContractNumbers.length < 5 && c.contractNumber) {
        grp.sampleContractNumbers.push(c.contractNumber);
      }
      if (grp.sampleContractIds.length < 5) {
        grp.sampleContractIds.push(c.id);
      }
    }
  });

  const customerBreakdown = Array.from(customerBreakdownMap.values()).sort(
    (a, b) => b.contractsCount - a.contractsCount
  );
  const orphanContractsGrouped = Array.from(orphanGroupMap.values()).sort(
    (a, b) => b.contractsCount - a.contractsCount
  );

  const totalRegisteredCustomers = customers.length;
  const contractsPerRegisteredCustomerAvg =
    totalRegisteredCustomers > 0
      ? Number((registeredContractsCount / totalRegisteredCustomers).toFixed(2))
      : 0;

  // Derive Root Causes and Explanation
  const rootCauses: string[] = [];
  if (orphanContractsCount > 0) {
    rootCauses.push(
      `وجود ${orphanContractsCount} تعاقد تاريخي أو مستورد تنتمي لعملاء غير موجودين في جدول العملاء الـ (${totalRegisteredCustomers}) المسجلين حالياً.`
    );
  }
  if (duplicateContractsList.length > 0) {
    rootCauses.push(
      `وجود ${duplicateContractsList.length} عقد مكرر نتيجة إعادة استيراد Excel أو تكرار إدخال نفس العقد بنفس الرقم أو التاريخ والقيمة.`
    );
  }
  if (registeredContractsCount > totalRegisteredCustomers) {
    rootCauses.push(
      `وجود عملاء مسجلين لديهم أكثر من عقد واحد (متوسط ${contractsPerRegisteredCustomerAvg} عقد لكل عميل).`
    );
  }
  if (rootCauses.length === 0) {
    rootCauses.push("البيانات متطابقة وسليمة بنسبة 100%.");
  }

  const recommendations: string[] = [];
  if (orphanContractsCount > 0) {
    recommendations.push(
      `استخدام زر "إنشاء ملفات للعملاء المتبقين" لإنشاء ملفات عملاء تلقائياً للـ ${orphanContractsCount} تعاقد المتبقية، أو زر "حذف وتصفية التعاقدات التائهة".`
    );
  }
  if (duplicateContractsList.length > 0) {
    recommendations.push(
      `دمج وحذف الـ ${duplicateContractsList.length} عقود المكررة للحد من التضخم.`
    );
  }

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalRegisteredCustomers,
      totalContracts: contracts.length,
      registeredContractsCount,
      orphanContractsCount,
      totalSales: sales.length,
      duplicateContractsCount: duplicateContractsList.length,
      contractsPerRegisteredCustomerAvg,
      rootCauses,
      recommendations,
    },
    customerBreakdown,
    duplicateContracts: duplicateContractsList,
    orphanContractsGrouped,
    salesMappingSummary: {
      totalSalesCount: sales.length,
      salesLinkedToContractsCount,
      unlinkedSalesCount,
      contractsWithSalesCount,
      contractsWithoutSalesCount,
    },
  };
}

/**
 * Diagnostic function that connects directly to Supabase tables `contracts`, `sales`, and `customers`
 * and generates the complete diagnostic audit report.
 */
export async function runSupabaseContractsDiagnostic(supabaseClient: any): Promise<{
  report: ContractDiagnosticReport | null;
  rawData: { customers: any[]; contracts: any[]; sales: any[] };
  error?: string;
}> {
  try {
    if (!supabaseClient) {
      return {
        report: null,
        rawData: { customers: [], contracts: [], sales: [] },
        error: "لم يتم توفير عميل Supabase.",
      };
    }

    const [custRes, ctrRes, saleRes] = await Promise.all([
      supabaseClient.from("customers").select("*"),
      supabaseClient.from("contracts").select("*"),
      supabaseClient.from("sales").select("*"),
    ]);

    if (custRes.error || ctrRes.error || saleRes.error) {
      const errMsgs = [
        custRes.error?.message,
        ctrRes.error?.message,
        saleRes.error?.message,
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        report: null,
        rawData: {
          customers: custRes.data || [],
          contracts: ctrRes.data || [],
          sales: saleRes.data || [],
        },
        error: `خطأ أثناء استعلام Supabase: ${errMsgs}`,
      };
    }

    const rawCustomers: Customer[] = custRes.data || [];
    const rawContracts: Contract[] = ctrRes.data || [];
    const rawSales: Sale[] = saleRes.data || [];

    const report = runContractsDiagnostic(rawCustomers, rawContracts, rawSales);

    return {
      report,
      rawData: {
        customers: rawCustomers,
        contracts: rawContracts,
        sales: rawSales,
      },
    };
  } catch (err: any) {
    return {
      report: null,
      rawData: { customers: [], contracts: [], sales: [] },
      error: `فشل استثناء غير متوقع: ${err?.message || String(err)}`,
    };
  }
}
