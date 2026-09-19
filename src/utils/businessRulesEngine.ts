import {
  Customer,
  Inquiry,
  FollowUp,
  Quotation,
  Contract,
  Sale,
  Opportunity,
  Company,
  CompanyId,
} from "../types";
import { BusinessRuleViolation } from "../types/aiAgentTypes";

export interface SystemDataSnapshot {
  companies: Company[];
  customers: Customer[];
  inquiries: Inquiry[];
  followUps: FollowUp[];
  quotations: Quotation[];
  contracts: Contract[];
  sales: Sale[];
  opportunities: Opportunity[];
}

export class BusinessRulesEngine {
  /**
   * Run full deterministic business rules audit over the data snapshot
   */
  public static runAudit(data: SystemDataSnapshot): BusinessRuleViolation[] {
    const violations: BusinessRuleViolation[] = [];
    const validCompanyIds = new Set(data.companies.map((c) => c.id));
    const customerMap = new Map(data.customers.map((c) => [c.id, c]));

    // Rule 1: Company Isolation - All entities must have a valid companyId
    data.customers.forEach((c) => {
      if (!c.companyId || !validCompanyIds.has(c.companyId)) {
        violations.push({
          ruleId: "RULE_COMPANY_ISOLATION",
          ruleName: "عزل الشركات وسلامة المعرف",
          severity: "critical",
          entityType: "customer",
          entityId: c.id,
          entityLabel: c.name || "عميل بدون اسم",
          companyId: c.companyId || "unknown",
          description: `العميل "${c.name}" مرتبط بشركة غير معروفة أو محذوفة (${c.companyId})`,
          suggestedFix: "تعيين العميل لإحدى الشركات النشطة المعتمدة.",
        });
      }
    });

    // Rule 2: Inquiry -> Customer relationship & Company matching
    data.inquiries.forEach((inq) => {
      const cust = inq.customerId ? customerMap.get(inq.customerId) : null;
      if (!cust) {
        violations.push({
          ruleId: "RULE_INQUIRY_CUSTOMER_LINK",
          ruleName: "ربط الاستفسار بملف عميل",
          severity: "high",
          entityType: "inquiry",
          entityId: inq.id,
          entityLabel: inq.customerName || "استفسار",
          companyId: inq.companyId,
          description: `الاستفسار الخاص بـ "${inq.customerName}" ليس له ملف عميل مرتبط بالمعرف.`,
          suggestedFix: "إنشاء أو ربط ملف عميل تلقائياً بواسطة رقم الهاتف.",
        });
      } else if (cust.companyId !== inq.companyId) {
        violations.push({
          ruleId: "RULE_COMPANY_MISMATCH",
          ruleName: "تطابق شركة الاستفسار مع العميل",
          severity: "critical",
          entityType: "inquiry",
          entityId: inq.id,
          entityLabel: inq.customerName,
          companyId: inq.companyId,
          description: `الاستفسار تابع للشركة (${inq.companyId}) بينما العميل تابع للشركة (${cust.companyId})`,
          suggestedFix: "توحيد معرف الشركة ليكون مطابقاً لملف العميل المعتمد.",
        });
      }
    });

    // Rule 3: Open Quotation -> Must have scheduled next action or recent contact
    data.quotations.forEach((quote) => {
      if (quote.status === "negotiation" || quote.status === "draft") {
        const hasActiveFollowUp = data.followUps.some(
          (f) => f.customerId === quote.customerId && f.status === "pending"
        );
        if (!hasActiveFollowUp) {
          violations.push({
            ruleId: "RULE_QUOTE_FOLLOWUP_REQUIRED",
            ruleName: "متابعة عرض السعر المفتوح",
            severity: "medium",
            entityType: "quotation",
            entityId: quote.id,
            entityLabel: `عرض سعر ${quote.quoteNumber} - ${quote.customerName}`,
            companyId: quote.companyId,
            description: `عرض السعر رقم ${quote.quoteNumber} للعميل "${quote.customerName}" مفتوح دون وجود أي متابعة قادمة مجدولة.`,
            suggestedFix: "جدولة موعد متابعة للتواصل مع العميل وحسم القرار.",
          });
        }
      }
    });

    // Rule 4: Quotation Won -> exactly 1 corresponding sale / contract
    data.quotations.forEach((quote) => {
      if (quote.status === "accepted") {
        const hasSale = data.sales.some(
          (s) => s.customerId === quote.customerId || s.contractId === quote.id
        );
        const hasContract = data.contracts.some(
          (c) => c.customerId === quote.customerId || c.quotationId === quote.id
        );
        if (!hasSale && !hasContract) {
          violations.push({
            ruleId: "RULE_WON_QUOTE_WITHOUT_SALE",
            ruleName: "توثيق مبيعات عرض السعر المقبول",
            severity: "high",
            entityType: "quotation",
            entityId: quote.id,
            entityLabel: `عرض سعر ${quote.quoteNumber} - ${quote.customerName}`,
            companyId: quote.companyId,
            description: `تم قبول عرض السعر رقم ${quote.quoteNumber} لكن لم يتم إنشاء سجل مبيعات أو عقد تعاقد له.`,
            suggestedFix: "توليد عقد ومبيعات مساوية لقيمة عرض السعر المقبول.",
          });
        }
      }
    });

    // Rule 5: Opportunity or Customer Lost -> must have a documented lossReason
    data.customers.forEach((cust) => {
      if (cust.stage === "lost" && (!cust.lossReason || cust.lossReason.trim() === "")) {
        violations.push({
          ruleId: "RULE_LOST_REASON_REQUIRED",
          ruleName: "توثيق سبب خسارة العميل",
          severity: "low",
          entityType: "customer",
          entityId: cust.id,
          entityLabel: cust.name,
          companyId: cust.companyId,
          description: `العميل "${cust.name}" مصنف كـ (خسارة / Lost) دون تدوين سبب الخسارة.`,
          suggestedFix: "تحديد سبب الخسارة (مثل: السعر، مواصفات، تأخير، اختيار منافس) للتحليل الإحصائي.",
        });
      }
    });

    // Rule 6: Duplicate Phone Numbers
    const phoneMap = new Map<string, Customer[]>();
    data.customers.forEach((c) => {
      const cleanPhone = c.phone.replace(/[^\d]/g, "");
      if (cleanPhone.length >= 8) {
        const list = phoneMap.get(cleanPhone) || [];
        list.push(c);
        phoneMap.set(cleanPhone, list);
      }
    });

    phoneMap.forEach((duplicates, phone) => {
      if (duplicates.length > 1) {
        violations.push({
          ruleId: "RULE_DUPLICATE_PHONE",
          ruleName: "منع تكرار أرقام الهواتف",
          severity: "high",
          entityType: "customer",
          entityId: duplicates[0].id,
          entityLabel: duplicates.map((d) => d.name).join(" و "),
          companyId: duplicates[0].companyId,
          description: `تم اكتشاف تكرار رقم الهاتف (${phone}) بين ${duplicates.length} عملاء (${duplicates.map((d) => d.name).join("، ")}).`,
          suggestedFix: "دمج سجلات العميل في ملف عميل 360 موحد لتفادي تشتت المتابعات.",
        });
      }
    });

    // Rule 7: Hot Customer without Next Action
    const todayStr = new Date().toISOString().split("T")[0];
    data.customers.forEach((cust) => {
      if (cust.interestLevel === "hot" && cust.stage !== "contracted" && cust.stage !== "sold" && cust.stage !== "won") {
        const hasPendingFollowUp = data.followUps.some(
          (f) => f.customerId === cust.id && f.status === "pending"
        );
        if (!hasPendingFollowUp) {
          violations.push({
            ruleId: "RULE_HOT_CUSTOMER_NO_ACTION",
            ruleName: "حسم عميل مهتم جداً (Hot)",
            severity: "high",
            entityType: "customer",
            entityId: cust.id,
            entityLabel: cust.name,
            companyId: cust.companyId,
            description: `العميل المهتم جداً "${cust.name}" لا توجد له أي متابعة مجدولة قادمة لحسم التعاقد.`,
            suggestedFix: "جدولة اتصال عاجل أو زيارة فنية لإغلاق الصفقة فوراً.",
          });
        }
      }
    });

    return violations;
  }

  /**
   * Validate a single operation before execution
   */
  public static validateOperation(
    actionType: string,
    payload: any,
    snapshot: SystemDataSnapshot
  ): { valid: boolean; error?: string; warnings?: string[] } {
    const warnings: string[] = [];

    if (actionType === "move_company" || actionType === "batch_move_company") {
      const targetCompany = snapshot.companies.find((c) => c.id === payload.targetCompanyId);
      if (!targetCompany) {
        return { valid: false, error: "الشركة المستهدفة غير موجودة بالنظام." };
      }
    }

    if (actionType === "create_customer") {
      if (!payload.name || !payload.phone) {
        return { valid: false, error: "اسم العميل ورقم الهاتف إلزاميان لإنشاء ملف العميل." };
      }
      const existing = snapshot.customers.find(
        (c) => c.phone.replace(/[^\d]/g, "") === payload.phone.replace(/[^\d]/g, "")
      );
      if (existing) {
        warnings.push(`العميل برقم الهاتف ${payload.phone} مسجل مسبقاً باسم "${existing.name}".`);
      }
    }

    return { valid: true, warnings: warnings.length ? warnings : undefined };
  }
}
