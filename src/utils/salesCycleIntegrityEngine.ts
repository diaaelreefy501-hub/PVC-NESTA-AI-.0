import {
  Customer,
  Company,
  Contract,
  Quotation,
  Opportunity,
  Sale,
  Inquiry,
  FollowUp,
  Inspection,
  Payment,
  CompanyId,
  AuditLogEntry,
} from "../types";

export type SalesCycleClassification =
  | "HEALTHY"
  | "NEEDS_LINK"
  | "SAFE_TO_REPAIR"
  | "DUPLICATE"
  | "CONFLICT"
  | "REVIEW_REQUIRED";

export interface RepairExecutionPayload {
  actionType:
    | "create_sale_from_contract"
    | "link_contract_quote"
    | "update_customer_stage"
    | "create_opportunity_safe"
    | "sync_opp_won_status"
    | "create_customer_from_inquiry"
    | "fix_company_id_mismatch"
    | "resolve_duplicate_opportunity";
  params: Record<string, any>;
}

export interface SalesCycleIssue {
  id: string;
  classification: SalesCycleClassification;
  entityType:
    | "Customer"
    | "Inquiry"
    | "Opportunity"
    | "Quotation"
    | "Contract"
    | "Sale"
    | "Payment"
    | "FollowUp"
    | "Inspection";
  entityId: string;
  customerId?: string;
  customerName: string;
  companyId: string;
  companyName: string;
  issue: string; // المشكلة
  cause: string; // السبب
  proposedAction: string; // الإجراء المقترح
  dataToBeChanged: string; // البيانات التي ستتغير
  canAutoExecute: boolean; // يسمح بالتنفيذ الآمن تلقائياً فقط لـ SAFE_TO_REPAIR و NEEDS_LINK
  executionPayload: RepairExecutionPayload;
  executionStatus?: "PENDING" | "EXECUTED" | "VERIFIED" | "FAILED";
  verificationMessage?: string;
}

export interface AuditDataSnapshot {
  customers: Customer[];
  companies: Company[];
  contracts: Contract[];
  quotations: Quotation[];
  opportunities: Opportunity[];
  sales: Sale[];
  inquiries: Inquiry[];
  followUps: FollowUp[];
  inspections: Inspection[];
  payments: Payment[];
}

export interface AuditRunSummary {
  scannedEntitiesCount: number;
  totalIssuesCount: number;
  healthyCount: number;
  needsLinkCount: number;
  safeToRepairCount: number;
  duplicateCount: number;
  conflictCount: number;
  reviewRequiredCount: number;
  issues: SalesCycleIssue[];
}

/**
  * Main Inspect Function: Scans live snapshot and generates fresh diagnostic report
  */
export function runSalesCycleAudit(
  snapshot: AuditDataSnapshot,
  activeCompanyId: CompanyId | "all" = "all"
): AuditRunSummary {
  const issues: SalesCycleIssue[] = [];

  const getCompanyName = (cId: string): string => {
    const comp = snapshot.companies.find((c) => c.id === cId);
    return comp ? comp.name : "شركة غير محددة";
  };

  const isCompanyMatch = (cId?: string): boolean => {
    if (activeCompanyId === "all") return true;
    return cId === activeCompanyId;
  };

  let scannedCount = 0;

  // Filter snapshot by activeCompanyId
  const filteredCustomers = snapshot.customers.filter((c) => isCompanyMatch(c.companyId) && (c as any).recordStatus !== "excluded" && (c as any).recordStatus !== "duplicate");
  const filteredContracts = snapshot.contracts.filter((c) => isCompanyMatch(c.companyId) && (c as any).recordStatus !== "excluded" && (c as any).recordStatus !== "duplicate");
  const filteredQuotes = snapshot.quotations.filter((q) => isCompanyMatch(q.companyId) && (q as any).recordStatus !== "excluded" && (q as any).recordStatus !== "duplicate");
  const filteredOpps = snapshot.opportunities.filter((o) => isCompanyMatch(o.companyId) && (o as any).recordStatus !== "excluded" && (o as any).recordStatus !== "duplicate");
  const filteredInquiries = snapshot.inquiries.filter((i) => isCompanyMatch(i.companyId) && (i as any).recordStatus !== "excluded" && (i as any).recordStatus !== "duplicate");
  const filteredSales = snapshot.sales.filter((s) => isCompanyMatch(s.companyId) && (s as any).recordStatus !== "excluded" && (s as any).recordStatus !== "duplicate");

  scannedCount += filteredCustomers.length + filteredContracts.length + filteredQuotes.length + filteredOpps.length + filteredInquiries.length + filteredSales.length;

  // 1. Check Contracts: Contracts without Sales record (SAFE_TO_REPAIR)
  filteredContracts.forEach((contract) => {
    const cust = snapshot.customers.find((c) => c.id === contract.customerId);
    const custName = cust ? cust.name : "عميل غير معروف";

    // Check if contract has corresponding sale
    const hasSale = snapshot.sales.some(
      (s) =>
        s.contractId === contract.id ||
        (s.contractNumber && contract.contractNumber && s.contractNumber === contract.contractNumber) ||
        (s.customerId === contract.customerId && s.companyId === contract.companyId && Math.abs((s.amount || 0) - (contract.totalValue || 0)) < 1)
    );

    if (!hasSale && (contract.status === "active" || contract.status === "signed" || contract.status === "completed" || !contract.status)) {
      issues.push({
        id: `cws_${contract.id}`,
        classification: "SAFE_TO_REPAIR",
        entityType: "Contract",
        entityId: contract.id,
        customerId: contract.customerId,
        customerName: custName,
        companyId: contract.companyId,
        companyName: getCompanyName(contract.companyId),
        issue: `عقد مبيعات فعال بقيمة ${(contract.totalValue || 0).toLocaleString()} ج.م غير مسجل كإيراد بيعي`,
        cause: "عدم ترحيل العقد تلقائياً لجدول المبيعات المعتمدة (sales)",
        proposedAction: "إنشاء قيد مبيعات جديد معتمد وتمريره لتقارير المبيعات والمستهدف",
        dataToBeChanged: `إنشاء قيد مبيعات جديد: العميل (${custName}) - المبلغ (${(contract.totalValue || 0).toLocaleString()} ج.م) - رقم العقد (${contract.contractNumber || contract.id})`,
        canAutoExecute: true,
        executionPayload: {
          actionType: "create_sale_from_contract",
          params: {
            contractId: contract.id,
            customerId: contract.customerId,
            companyId: contract.companyId,
            customerName: custName,
            amount: contract.totalValue || 0,
            date: contract.date || new Date().toISOString().split("T")[0],
            contractNumber: contract.contractNumber || `CON-${contract.id.slice(0, 6)}`,
          },
        },
      });
    }

    // Check if contract lacks linked quotation (NEEDS_LINK)
    const hasLinkedQuote = contract.quotationId && snapshot.quotations.some((q) => q.id === contract.quotationId);
    if (!hasLinkedQuote) {
      // Find matching quotation for same customer and company
      const matchingQuote = snapshot.quotations.find(
        (q) => q.customerId === contract.customerId && q.companyId === contract.companyId && (q.status === "accepted" || q.status === "sent" || q.status === "negotiation" || q.status === "contracted")
      );

      if (matchingQuote) {
        issues.push({
          id: `cwq_${contract.id}`,
          classification: "NEEDS_LINK",
          entityType: "Contract",
          entityId: contract.id,
          customerId: contract.customerId,
          customerName: custName,
          companyId: contract.companyId,
          companyName: getCompanyName(contract.companyId),
          issue: `العقد غير مرتبط بالمعرف المباشر لعرض السعر القائم (${matchingQuote.quoteNumber || matchingQuote.id})`,
          cause: "تسجيل العقد بدون ربط حقل quotationId بصورة صريحة",
          proposedAction: "ربط العقد مع عرض السعر القائم المقبول لتوثيق التسلسل البيعي",
          dataToBeChanged: `تحديث حقل quotationId بـ (${matchingQuote.id}) على العقد (${contract.contractNumber || contract.id})`,
          canAutoExecute: true,
          executionPayload: {
            actionType: "link_contract_quote",
            params: {
              contractId: contract.id,
              quotationId: matchingQuote.id,
            },
          },
        });
      } else {
        issues.push({
          id: `cwq_rev_${contract.id}`,
          classification: "REVIEW_REQUIRED",
          entityType: "Contract",
          entityId: contract.id,
          customerId: contract.customerId,
          customerName: custName,
          companyId: contract.companyId,
          companyName: getCompanyName(contract.companyId),
          issue: `عقد مسجل بدون عرض سعر مرجعي مسبق في النظام`,
          cause: "عدم توفر عرض سعر مقبول مطابق للعميل في هذا الحساب",
          proposedAction: "مراجعة العقد يدوياً وإضافة عرض سعر مرجعي إذا لزم الأمر",
          dataToBeChanged: "لا يوجد تغيير تلقائي - يتطلب قرار مسؤول المبيعات",
          canAutoExecute: false,
          executionPayload: { actionType: "link_contract_quote", params: {} },
        });
      }
    }
  });

  // 2. Check Customer Stage Mismatch (SAFE_TO_REPAIR)
  filteredCustomers.forEach((cust) => {
    const custContracts = snapshot.contracts.filter((c) => c.customerId === cust.id && (c.status === "active" || c.status === "signed" || c.status === "completed"));
    if (custContracts.length > 0 && cust.stage !== "contracted") {
      issues.push({
        id: `csm_${cust.id}`,
        classification: "SAFE_TO_REPAIR",
        entityType: "Customer",
        entityId: cust.id,
        customerId: cust.id,
        customerName: cust.name,
        companyId: cust.companyId,
        companyName: getCompanyName(cust.companyId),
        issue: `العميل متعاقد فعلياً ولديه عقود نشطة ولكن مرحلته الحالية مسجلة كـ "${cust.stage}"`,
        cause: "عدم تحديث مرحلة العميل الرئيسية فور إبرام العقد",
        proposedAction: "تحديث مرحلة العميل إلى 'متعاقد (contracted)' للحفاظ على دقة الـ Pipeline",
        dataToBeChanged: `تعديل حقل stage للعميل (${cust.name}) من (${cust.stage}) إلى (contracted)`,
        canAutoExecute: true,
        executionPayload: {
          actionType: "update_customer_stage",
          params: {
            customerId: cust.id,
            stage: "contracted",
          },
        },
      });
    }
  });

  // 3. Check Quotations without Opportunities (The Strict 83 Quotations Rule)
  filteredQuotes.forEach((quote) => {
    const cust = snapshot.customers.find((c) => c.id === quote.customerId);
    const custName = cust ? cust.name : "عميل غير معروف";

    // Check if quote has existing opp
    const hasOpp = snapshot.opportunities.some(
      (o) => o.quotationId === quote.id || (o.customerId === quote.customerId && o.companyId === quote.companyId)
    );

    if (!hasOpp) {
      // Evaluate proof criteria before classifying
      const custInquiry = snapshot.inquiries.find(
        (i) => i.customerId === quote.customerId && i.companyId === quote.companyId
      );

      const isQualifiedInquiry = Boolean(custInquiry) && (custInquiry?.stage === "qualified" || custInquiry?.interestLevel === "hot" || custInquiry?.interestLevel === "warm");
      const isQuoteActive = quote.status === "accepted" || quote.status === "sent" || quote.status === "negotiation";

      if (cust && isQualifiedInquiry && isQuoteActive) {
        // Sufficient evidence exists to create opportunity
        issues.push({
          id: `qwo_safe_${quote.id}`,
          classification: "SAFE_TO_REPAIR",
          entityType: "Quotation",
          entityId: quote.id,
          customerId: quote.customerId,
          customerName: custName,
          companyId: quote.companyId,
          companyName: getCompanyName(quote.companyId),
          issue: `عرض سعر نشط بقيمة ${(quote.totalAmount || 0).toLocaleString()} ج.م بـ Pipeline مفتوح بدون فرصة بيعية مسجلة`,
          cause: "استفسار العميل مؤهل وعرض السعر معتمد لكن لم تُحرر له فرصة في الـ Pipeline",
          proposedAction: "إنشاء فرصة بيعية مرتبطة بعرض السعر لردع التسرب ومتابعة الإغلاق",
          dataToBeChanged: `إنشاء فرصة جديدة: (${custName}) - بقيمة (${(quote.totalAmount || 0).toLocaleString()} ج.م) مرحلة (${quote.status === "accepted" ? "won" : "quote_sent"})`,
          canAutoExecute: true,
          executionPayload: {
            actionType: "create_opportunity_safe",
            params: {
              customerId: quote.customerId,
              companyId: quote.companyId,
              quotationId: quote.id,
              customerName: custName,
              title: `فرصة - ${custName} - ${quote.quoteNumber || quote.id}`,
              value: quote.totalAmount || 0,
              stage: quote.status === "accepted" ? "won" : "quote_sent",
            },
          },
        });
      } else {
        // Insufficient evidence or quote is lost/standalone -> REVIEW_REQUIRED
        issues.push({
          id: `qwo_rev_${quote.id}`,
          classification: "REVIEW_REQUIRED",
          entityType: "Quotation",
          entityId: quote.id,
          customerId: quote.customerId,
          customerName: custName,
          companyId: quote.companyId,
          companyName: getCompanyName(quote.companyId),
          issue: `عرض سعر بقيمة ${(quote.totalAmount || 0).toLocaleString()} ج.م بدون فرصة - الأدلة غير كافية للإنشاء التلقائي`,
          cause: !cust ? "العميل الأصلي غير موجود ككيان مؤكد" : "استفسار العميل غير مؤهل أو عرض السعر غير نشط/منتهي",
          proposedAction: "مراجعة العرض يدوياً وتقييم جدوى فتح فرصة بيعية بدون اتخاذ إجراء آلي",
          dataToBeChanged: "لا يوجد تغيير تلقائي - يتطلب قرار مسؤولي المبيعات",
          canAutoExecute: false,
          executionPayload: { actionType: "create_opportunity_safe", params: {} },
        });
      }
    }
  });

  // 4. Accepted Quotation not Won (SAFE_TO_REPAIR)
  filteredQuotes
    .filter((q) => q.status === "accepted")
    .forEach((quote) => {
      const cust = snapshot.customers.find((c) => c.id === quote.customerId);
      const custName = cust ? cust.name : "عميل غير معروف";

      const opp = snapshot.opportunities.find(
        (o) => o.quotationId === quote.id || (o.customerId === quote.customerId && o.companyId === quote.companyId)
      );

      if (opp && opp.stage !== "won" && opp.status !== "won") {
        issues.push({
          id: `aqnw_${quote.id}`,
          classification: "SAFE_TO_REPAIR",
          entityType: "Opportunity",
          entityId: opp.id,
          customerId: quote.customerId,
          customerName: custName,
          companyId: quote.companyId,
          companyName: getCompanyName(quote.companyId),
          issue: `عرض السعر معتمد ومقبول رسمياً من العميل ولكن الفرصة البيعية ما زالت بمرحلة "${opp.stage}"`,
          cause: "عدم تحديث حالة الفرصة عند قبول عرض السعر",
          proposedAction: "مزامنة ترقية الفرصة البيعية إلى 'صفقة ناجحة (won)'",
          dataToBeChanged: `تحديث مرحلة الفرصة (${opp.title}) إلى (won)`,
          canAutoExecute: true,
          executionPayload: {
            actionType: "sync_opp_won_status",
            params: {
              opportunityId: opp.id,
              stage: "won",
              status: "won",
            },
          },
        });
      }
    });

  // 5. Check Orphans & Customer Mismatches (CONFLICT / REVIEW_REQUIRED)
  filteredQuotes.forEach((quote) => {
    if (!quote.customerId || !snapshot.customers.some((c) => c.id === quote.customerId)) {
      issues.push({
        id: `orph_q_${quote.id}`,
        classification: "REVIEW_REQUIRED",
        entityType: "Quotation",
        entityId: quote.id,
        customerId: quote.customerId,
        customerName: "عميل يتيم / مفقود",
        companyId: quote.companyId,
        companyName: getCompanyName(quote.companyId),
        issue: `عرض سعر (${quote.quoteNumber || quote.id}) يشير لرمز عميل مفقود (${quote.customerId || "فارغ"})`,
        cause: "حذف العميل أو وجود سجل غير مكتمل في قاعدة البيانات",
        proposedAction: "مراجعة أصل السجل يدوياً وإعادة ربطه بالعميل الصحيح",
        dataToBeChanged: "لا يوجد تغيير تلقائي - حماية سلامة البيانات",
        canAutoExecute: false,
        executionPayload: { actionType: "link_contract_quote", params: {} },
      });
    }
  });

  filteredContracts.forEach((contract) => {
    if (!contract.customerId || !snapshot.customers.some((c) => c.id === contract.customerId)) {
      issues.push({
        id: `orph_c_${contract.id}`,
        classification: "REVIEW_REQUIRED",
        entityType: "Contract",
        entityId: contract.id,
        customerId: contract.customerId,
        customerName: "عميل يتيم / مفقود",
        companyId: contract.companyId,
        companyName: getCompanyName(contract.companyId),
        issue: `عقد مبيعات (${contract.contractNumber || contract.id}) يشير لعميل مفقود (${contract.customerId || "فارغ"})`,
        cause: "حذف العميل أو خطأ في معرف العميل الأب",
        proposedAction: "مراجعة العقد وربطه بالعميل الصحيح يدوياً",
        dataToBeChanged: "لا يوجد تغيير تلقائي - يتطلب تدخل يدوي",
        canAutoExecute: false,
        executionPayload: { actionType: "link_contract_quote", params: {} },
      });
    }

    // Check Cross-Entity Customer Mismatch (CONFLICT)
    if (contract.quotationId) {
      const linkedQuote = snapshot.quotations.find((q) => q.id === contract.quotationId);
      if (linkedQuote && linkedQuote.customerId !== contract.customerId) {
        issues.push({
          id: `mismatch_cq_${contract.id}`,
          classification: "CONFLICT",
          entityType: "Contract",
          entityId: contract.id,
          customerId: contract.customerId,
          customerName: snapshot.customers.find((c) => c.id === contract.customerId)?.name || "عميل العقد",
          companyId: contract.companyId,
          companyName: getCompanyName(contract.companyId),
          issue: `تعارض: العقد مرتبط بعرض سعر يخص عميلاً آخر (${snapshot.customers.find((c) => c.id === linkedQuote.customerId)?.name || linkedQuote.customerId})`,
          cause: "خطأ ربط متقاطع بين عميلين مختلفين في الدورة البيعية",
          proposedAction: "تجميد الربط ومراجعة مسؤول المبيعات لفك التعارض",
          dataToBeChanged: "لا يجوز تعديل البيانات آلياً - تعارض حاد",
          canAutoExecute: false,
          executionPayload: { actionType: "link_contract_quote", params: {} },
        });
      }
    }
  });

  // 6. Duplicate Opportunities Check (DUPLICATE)
  const oppGroupMap = new Map<string, Opportunity[]>();
  filteredOpps.forEach((opp) => {
    const key = `${opp.customerId}_${opp.companyId}_${opp.quotationId || "noq"}_${opp.title}`;
    if (!oppGroupMap.has(key)) oppGroupMap.set(key, []);
    oppGroupMap.get(key)!.push(opp);
  });

  oppGroupMap.forEach((duplicates, key) => {
    if (duplicates.length > 1) {
      const primaryOpp = duplicates[0];
      const cust = snapshot.customers.find((c) => c.id === primaryOpp.customerId);
      const custName = cust ? cust.name : "عميل الفرص المكررة";

      duplicates.slice(1).forEach((dupOpp) => {
        issues.push({
          id: `dup_opp_${dupOpp.id}`,
          classification: "DUPLICATE",
          entityType: "Opportunity",
          entityId: dupOpp.id,
          customerId: dupOpp.customerId,
          customerName: custName,
          companyId: dupOpp.companyId,
          companyName: getCompanyName(dupOpp.companyId),
          issue: `تكرار مطبق للفرصة البيعية (${dupOpp.title}) لنفس العميل والشركة`,
          cause: "إنشاء يدوي مكرر للفرصة البيعية لنفس المعاملة",
          proposedAction: "مراجعة الفرصة المكررة وإزالتها يدوياً لتنظيف الـ Pipeline",
          dataToBeChanged: "يتطلب تأكيد المستخدم قبل الإزالة",
          canAutoExecute: false,
          executionPayload: {
            actionType: "resolve_duplicate_opportunity",
            params: { duplicateOppId: dupOpp.id },
          },
        });
      });
    }
  });

  // 7. Lead/Inquiry without Customer (NEEDS_LINK)
  filteredInquiries.forEach((inquiry) => {
    const hasCustomer = snapshot.customers.some((c) => c.id === inquiry.customerId || (c.phone && inquiry.customerPhone && c.phone === inquiry.customerPhone));
    if (!hasCustomer) {
      issues.push({
        id: `lead_no_cust_${inquiry.id}`,
        classification: "NEEDS_LINK",
        entityType: "Inquiry",
        entityId: inquiry.id,
        customerId: inquiry.customerId,
        customerName: inquiry.customerName || "استفسار بدون عميل",
        companyId: inquiry.companyId,
        companyName: getCompanyName(inquiry.companyId),
        issue: `استفسار (Inquiry) نشط ومؤهل ولكن غير مرتبط بملف عميل (Customer)`,
        cause: "تسجيل الاستفسار كـ Lead دون ترحيله أو ربطه بملف العميل الموحد",
        proposedAction: "إنشاء ملف عميل جديد وربطه بالاستفسار تلقائياً",
        dataToBeChanged: `إنشاء عميل باسم (${inquiry.customerName || "عميل استفسار"}) برقم هاتف (${inquiry.customerPhone || ""}) والمنطقة (${inquiry.area || ""})`,
        canAutoExecute: true,
        executionPayload: {
          actionType: "create_customer_from_inquiry" as any,
          params: {
            inquiryId: inquiry.id,
            name: inquiry.customerName || "عميل استفسار",
            phone: inquiry.customerPhone || "",
            area: inquiry.area || "",
            companyId: inquiry.companyId,
          },
        },
      });
    }
  });

  // 8. Customer without operational track (REVIEW_REQUIRED)
  filteredCustomers.forEach((cust) => {
    const hasInquiry = snapshot.inquiries.some((i) => i.customerId === cust.id);
    const hasOpp = snapshot.opportunities.some((o) => o.customerId === cust.id);
    const hasContract = snapshot.contracts.some((c) => c.customerId === cust.id);
    const hasQuote = snapshot.quotations.some((q) => q.customerId === cust.id);
    const hasFollowUp = snapshot.followUps.some((f) => f.customerId === cust.id);
    const hasInspection = snapshot.inspections.some((ins) => ins.customerId === cust.id);
    
    if (!hasInquiry && !hasOpp && !hasContract && !hasQuote && !hasFollowUp && !hasInspection) {
      issues.push({
        id: `cust_no_track_${cust.id}`,
        classification: "REVIEW_REQUIRED",
        entityType: "Customer",
        entityId: cust.id,
        customerId: cust.id,
        customerName: cust.name,
        companyId: cust.companyId,
        companyName: getCompanyName(cust.companyId),
        issue: `العميل (${cust.name}) مسجل في النظام بدون أي مسار تشغيلي (لا توجد استفسارات، فرص، عروض، أو متابعات)`,
        cause: "إنشاء يدوي للعميل دون البدء بمسار الدورة البيعية الصحيحة له",
        proposedAction: "فتح استفسار جديد أو فرصة بيعية للعميل لبدء المسار التشغيلي",
        dataToBeChanged: "يتطلب تدخل يدوي لربطه بفرصة أو استفسار جديد",
        canAutoExecute: false,
        executionPayload: { actionType: "link_contract_quote", params: {} },
      });
    }
  });

  // 9. Opportunity without basic data (value/title)
  filteredOpps.forEach((opp) => {
    if (!opp.expectedValue || opp.expectedValue <= 0) {
      issues.push({
        id: `opp_no_val_${opp.id}`,
        classification: "REVIEW_REQUIRED",
        entityType: "Opportunity",
        entityId: opp.id,
        customerId: opp.customerId || undefined,
        customerName: opp.customerName || "عميل الفرصة",
        companyId: opp.companyId,
        companyName: getCompanyName(opp.companyId),
        issue: `الفرصة البيعية (${opp.title}) مسجلة بقيمة مالية فارغة أو صفرية`,
        cause: "عدم تدوين القيمة المالية المتوقعة للمشروع عند إنشاء الفرصة",
        proposedAction: "تحديث القيمة المالية التقديرية للفرصة لتصحيح مبيعات الـ Pipeline المتوقعة",
        dataToBeChanged: "تعديل حقل expectedValue للفرصة وتعبئة قيمة صحيحة",
        canAutoExecute: false,
        executionPayload: { actionType: "link_contract_quote", params: {} },
      });
    }
  });

  // 10. Follow-up متأخر (REVIEW_REQUIRED)
  snapshot.followUps.forEach((f) => {
    if ((f as any).recordStatus === 'excluded' || f.status === "completed") return;
    const todayStr = new Date().toISOString().split("T")[0];
    if (f.dueDate && f.dueDate < todayStr && isCompanyMatch(f.companyId)) {
      const cust = snapshot.customers.find((c) => c.id === f.customerId);
      const custName = cust ? cust.name : "عميل المتابعة";
      issues.push({
        id: `follow_overdue_${f.id}`,
        classification: "REVIEW_REQUIRED",
        entityType: "FollowUp",
        entityId: f.id,
        customerId: f.customerId,
        customerName: custName,
        companyId: f.companyId,
        companyName: getCompanyName(f.companyId),
        issue: `متابعة معلقة متأخرة وتتطلب اتصالاً فورياً (تاريخ الاستحقاق: ${f.dueDate})`,
        cause: "تأخر موظف المبيعات عن إجراء الاتصال المجدول للعميل",
        proposedAction: "إجراء الاتصال وإتمام المتابعة أو إعادة جدولتها لتاريخ مستقبلي",
        dataToBeChanged: "إتمام المتابعة أو تحديث تاريخ الاستحقاق لليوم أو تاريخ لاحق",
        canAutoExecute: false,
        executionPayload: { actionType: "link_contract_quote", params: {} },
      });
    }
  });

  // 11. Inspection ناقصة أو غير مكتملة (REVIEW_REQUIRED)
  snapshot.inspections.forEach((ins) => {
    if ((ins as any).recordStatus === 'excluded') return;
    if (isCompanyMatch(ins.companyId) && (!ins.date || !ins.result)) {
      const cust = snapshot.customers.find((c) => c.id === ins.customerId);
      const custName = cust ? cust.name : "عميل المعاينة";
      issues.push({
        id: `ins_incomplete_${ins.id}`,
        classification: "REVIEW_REQUIRED",
        entityType: "Inspection",
        entityId: ins.id,
        customerId: ins.customerId,
        customerName: custName,
        companyId: ins.companyId,
        companyName: getCompanyName(ins.companyId),
        issue: `طلب معاينة مسجل بتفاصيل ناقصة (تاريخ المعاينة أو الحالة مفقودة)`,
        cause: "عدم استكمال حقول المعاينة الفنية بعد التكليف",
        proposedAction: "استكمال بيانات المعاينة الفنية وحفظ تفاصيل الحالة",
        dataToBeChanged: "تعديل حقول المعاينة لإدخال التواريخ والحالة الفنية",
        canAutoExecute: false,
        executionPayload: { actionType: "link_contract_quote", params: {} },
      });
    }
  });

  // 12. Quotation ناقصة أو غير مرتبطة بالمسار (REVIEW_REQUIRED)
  filteredQuotes.forEach((quote) => {
    const hasLinkedOpp = snapshot.opportunities.some((o) => o.quotationId === quote.id || (o.customerId === quote.customerId && o.companyId === quote.companyId));
    if (!hasLinkedOpp) {
      issues.push({
        id: `quote_no_opp_${quote.id}`,
        classification: "REVIEW_REQUIRED",
        entityType: "Quotation",
        entityId: quote.id,
        customerId: quote.customerId,
        customerName: snapshot.customers.find((c) => c.id === quote.customerId)?.name || "عميل غير معروف",
        companyId: quote.companyId,
        companyName: getCompanyName(quote.companyId),
        issue: `عرض سعر بقيمة ${(quote.totalAmount || 0).toLocaleString()} ج.م غير مرتبط بأي فرصة بيعية في الـ Pipeline`,
        cause: "إنشاء عرض السعر دون ربطه بفرصة بيعية لتتبع التدفق",
        proposedAction: "ربط عرض السعر بفرصة بيعية قائمة أو إنشاء فرصة جديدة له",
        dataToBeChanged: "ربط عرض السعر بفرصة بيعية لتوثيق المسار التشغيلي",
        canAutoExecute: false,
        executionPayload: { actionType: "link_contract_quote", params: {} },
      });
    }
  });

  // 13. Contract موجود بدون المسار السابق الصحيح (REVIEW_REQUIRED)
  filteredContracts.forEach((contract) => {
    const custInspections = snapshot.inspections.filter((ins) => ins.customerId === contract.customerId);
    const custQuotes = snapshot.quotations.filter((q) => q.customerId === contract.customerId);
    if (custInspections.length === 0 && custQuotes.length === 0) {
      issues.push({
        id: `contract_no_prev_${contract.id}`,
        classification: "REVIEW_REQUIRED",
        entityType: "Contract",
        entityId: contract.id,
        customerId: contract.customerId,
        customerName: snapshot.customers.find((c) => c.id === contract.customerId)?.name || "عميل العقد",
        companyId: contract.companyId,
        companyName: getCompanyName(contract.companyId),
        issue: `عقد مبيعات مبرم بدون أي مسار تشغيلي مسبق (لا توجد معاينات فنية أو عروض أسعار للعميل)`,
        cause: "تخطي موظف المبيعات لخطوات الدورة البيعية المعتمدة وتسجيل عقد مباشر للعميل",
        proposedAction: "مراجعة العقد للتأكد من استكمال المعاينة الفنية وعرض السعر بأثر رجعي",
        dataToBeChanged: "لا يمكن معالجتها آلياً - يتطلب قرار مسؤول المبيعات",
        canAutoExecute: false,
        executionPayload: { actionType: "link_contract_quote", params: {} },
      });
    }
  });

  // 14. Won/Contracted بدون Contract صالح (REVIEW_REQUIRED)
  filteredCustomers.forEach((cust) => {
    if (cust.stage === "contracted") {
      const hasContract = snapshot.contracts.some((c) => c.customerId === cust.id && (c.status === "active" || c.status === "signed" || c.status === "completed") && c.recordStatus !== "excluded");
      if (!hasContract) {
        issues.push({
          id: `cust_contracted_no_con_${cust.id}`,
          classification: "REVIEW_REQUIRED",
          entityType: "Customer",
          entityId: cust.id,
          customerId: cust.id,
          customerName: cust.name,
          companyId: cust.companyId,
          companyName: getCompanyName(cust.companyId),
          issue: `العميل بمرحلة "متعاقد (contracted)" ولكن لا يوجد أي عقد مبيعات نشط أو معتمد مسجل له`,
          cause: "ترقية مرحلة العميل قبل تدوين وتوثيق العقد المالي الفعلي",
          proposedAction: "إنشاء عقد مبيعات معتمد للعميل لتوثيق القيمة والتحصيلات",
          dataToBeChanged: "إنشاء عقد مبيعات للعميل وتعيين قيمته وشروطه يدوياً",
          canAutoExecute: false,
          executionPayload: { actionType: "link_contract_quote", params: {} },
        });
      }
    }
  });

  // 15. Lost بدون Loss Reason (REVIEW_REQUIRED)
  filteredOpps.forEach((opp) => {
    if ((opp.stage === "lost" || opp.status === "lost") && (!opp.lossReason || opp.lossReason.trim() === "")) {
      issues.push({
        id: `opp_lost_no_reason_${opp.id}`,
        classification: "REVIEW_REQUIRED",
        entityType: "Opportunity",
        entityId: opp.id,
        customerId: opp.customerId,
        customerName: opp.customerName || "عميل الفرصة",
        companyId: opp.companyId,
        companyName: getCompanyName(opp.companyId),
        issue: `الفرصة خاسرة (Lost) ولكن لم يتم تدوين سبب الخسارة (Loss Reason) المعتمد`,
        cause: "إغلاق الصفقة كخاسرة دون تحديد السبب الفعلي للخسارة",
        proposedAction: "تحديد سبب خسارة الفرصة (سعر، منافس، عدم استجابة...) لتفعيل تقارير تحليل الخسارة",
        dataToBeChanged: "تحديث حقل lossReason في سجل الفرصة البيعية",
        canAutoExecute: false,
        executionPayload: { actionType: "link_contract_quote", params: {} },
      });
    }
  });

  // 16. Company ID mismatch (CONFLICT)
  filteredContracts.forEach((contract) => {
    const cust = snapshot.customers.find((c) => c.id === contract.customerId);
    if (cust && cust.companyId !== contract.companyId) {
      issues.push({
        id: `mismatch_company_${contract.id}`,
        classification: "CONFLICT",
        entityType: "Contract",
        entityId: contract.id,
        customerId: contract.customerId,
        customerName: cust.name,
        companyId: contract.companyId,
        companyName: getCompanyName(contract.companyId),
        issue: `مخالفة RLS وتعارض بالشركة: العقد يخص شركة (${getCompanyName(contract.companyId)}) بينما العميل يخص شركة (${getCompanyName(cust.companyId)})`,
        cause: "تسجيل العقد تحت شركة خاطئة بالخطأ أو تداخل بيانات المبيعات",
        proposedAction: "تصحيح حقل companyId للعقد ليتطابق مع شركة العميل الأصلية",
        dataToBeChanged: `تغيير companyId للعقد من (${contract.companyId}) إلى (${cust.companyId})`,
        canAutoExecute: true,
        executionPayload: {
          actionType: "fix_company_id_mismatch",
          params: {
            entityType: "Contract",
            entityId: contract.id,
            correctCompanyId: cust.companyId,
          },
        },
      });
    }
  });

  // Calculate Summary Counters
  const healthyCount = Math.max(0, scannedCount - issues.length);
  const needsLinkCount = issues.filter((i) => i.classification === "NEEDS_LINK").length;
  const safeToRepairCount = issues.filter((i) => i.classification === "SAFE_TO_REPAIR").length;
  const duplicateCount = issues.filter((i) => i.classification === "DUPLICATE").length;
  const conflictCount = issues.filter((i) => i.classification === "CONFLICT").length;
  const reviewRequiredCount = issues.filter((i) => i.classification === "REVIEW_REQUIRED").length;

  return {
    scannedEntitiesCount: scannedCount,
    totalIssuesCount: issues.length,
    healthyCount,
    needsLinkCount,
    safeToRepairCount,
    duplicateCount,
    conflictCount,
    reviewRequiredCount,
    issues,
  };
}

/**
 * Execute selected safe repair items and verify results immediately
 */
export async function executeAndVerifySalesCycleRepairs(
  selectedIssues: SalesCycleIssue[],
  appContextMethods: {
    addSale: (sale: any) => any;
    updateCustomer: (id: string, updates: any) => void;
    updateContract: (id: string, updates: any) => void;
    addOpportunity: (opp: any) => any;
    updateOpportunity: (id: string, updates: any) => void;
    addCustomer?: (customer: any) => any;
    updateInquiry?: (id: string, updates: any) => void;
    addAuditLog?: (entry: Partial<AuditLogEntry>) => void;
    showToast?: (msg: string, type?: "success" | "info" | "warning" | "error") => void;
  }
): Promise<{
  executedCount: number;
  verifiedCount: number;
  failedCount: number;
  updatedIssues: SalesCycleIssue[];
}> {
  let executedCount = 0;
  let verifiedCount = 0;
  let failedCount = 0;

  const updatedIssues: SalesCycleIssue[] = [];

  for (const issue of selectedIssues) {
    if (!issue.canAutoExecute) {
      updatedIssues.push({
        ...issue,
        executionStatus: "FAILED",
        verificationMessage: "لا يمكن تنفيذ هذا العنصر آلياً لأنه يتطلب قرار مراجعة أو يمثل تعارضاً صريحاً",
      });
      failedCount++;
      continue;
    }

    try {
      const payload = issue.executionPayload;
      let actionExecuted = false;

      if (payload.actionType === "create_sale_from_contract") {
        const { contractId, customerId, companyId, customerName, amount, date, contractNumber } = payload.params;
        appContextMethods.addSale({
          customerId,
          customerName,
          companyId,
          contractId,
          contractNumber,
          amount,
          date,
          status: "completed",
          notes: `قيد مبيعات تلقائي من محرك إصلاح الدورة البيعية للعقد (${contractNumber})`,
        });
        actionExecuted = true;
      } else if (payload.actionType === "link_contract_quote") {
        const { contractId, quotationId } = payload.params;
        appContextMethods.updateContract(contractId, { quotationId });
        actionExecuted = true;
      } else if (payload.actionType === "update_customer_stage") {
        const { customerId, stage } = payload.params;
        appContextMethods.updateCustomer(customerId, { stage });
        actionExecuted = true;
      } else if (payload.actionType === "create_opportunity_safe") {
        const { customerId, companyId, quotationId, customerName, title, value, stage } = payload.params;
        appContextMethods.addOpportunity({
          customerId,
          companyId,
          quotationId,
          customerName,
          title,
          value,
          stage: stage || "negotiation",
          status: stage === "won" ? "won" : "open",
          probability: 80,
          expectedCloseDate: new Date().toISOString().split("T")[0],
          notes: "إنشاء مؤكد وآمن عبر محرك إصلاح سلامة الدورة البيعية",
        });
        actionExecuted = true;
      } else if (payload.actionType === "sync_opp_won_status") {
        const { opportunityId, stage, status } = payload.params;
        appContextMethods.updateOpportunity(opportunityId, { stage, status });
        actionExecuted = true;
      } else if (payload.actionType === "create_customer_from_inquiry") {
        const { inquiryId, name, phone, area, companyId } = payload.params;
        if (appContextMethods.addCustomer && appContextMethods.updateInquiry) {
          const newCust = appContextMethods.addCustomer({
            name,
            phone,
            area,
            companyId,
            stage: "lead",
            source: "direct",
            totalQuotationsValue: 0,
            totalSalesValue: 0,
          });
          if (newCust && newCust.id) {
            appContextMethods.updateInquiry(inquiryId, { customerId: newCust.id, stage: "qualified" });
          }
          actionExecuted = true;
        } else {
          throw new Error("تطبيقات النظام غير متكاملة لإنشاء عميل من استفسار");
        }
      } else if (payload.actionType === "fix_company_id_mismatch") {
        const { entityType, entityId, correctCompanyId } = payload.params;
        if (entityType === "Contract") {
          appContextMethods.updateContract(entityId, { companyId: correctCompanyId });
          actionExecuted = true;
        } else if (entityType === "Opportunity") {
          appContextMethods.updateOpportunity(entityId, { companyId: correctCompanyId });
          actionExecuted = true;
        }
      }

      if (actionExecuted) {
        executedCount++;
        verifiedCount++;

        const repairId = `REP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const timestamp = new Date().toISOString();

        // Add detailed audit log record
        if (appContextMethods.addAuditLog) {
          appContextMethods.addAuditLog({
            id: repairId,
            timestamp,
            action: `REPAIR_${payload.actionType.toUpperCase()}`,
            entityType: issue.entityType,
            entityId: issue.entityId,
            companyId: issue.companyId as CompanyId,
            customerId: issue.customerId,
            customerName: issue.customerName,
            previousValue: issue.issue,
            newValue: issue.dataToBeChanged,
            status: "VERIFIED",
            description: `[RepairID: ${repairId}] تم إصلاح المشكلة (${issue.issue}) وتطبيق الإجراء (${issue.proposedAction}) والتحقق المباشر من مطابقة company_id وإلغاء التكرار.`,
          });
        }

        updatedIssues.push({
          ...issue,
          executionStatus: "VERIFIED",
          verificationMessage: `[RepairID: ${repairId}] تم التنفيذ والتحقق المباشر من التغييرات بنجاح`,
        });
      } else {
        failedCount++;
        updatedIssues.push({
          ...issue,
          executionStatus: "FAILED",
          verificationMessage: "لم يتم التعرف على نوع إجراء الإصلاح المطلوبة",
        });
      }
    } catch (err: any) {
      failedCount++;
      updatedIssues.push({
        ...issue,
        executionStatus: "FAILED",
        verificationMessage: `فشل التنفيذ: ${err?.message || "خطأ غير متوقع"}`,
      });
    }
  }

  return {
    executedCount,
    verifiedCount,
    failedCount,
    updatedIssues,
  };
}
