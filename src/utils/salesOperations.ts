import {
  Opportunity,
  OpportunityStage,
  Customer,
  Quotation,
  Contract,
  FollowUp,
  Inspection,
  AppNotification,
  CompanyId,
} from "../types";

export interface StageConfig {
  id: OpportunityStage;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  defaultAction: string;
  description: string;
  iconName: string;
}

export const OPPORTUNITY_STAGES_CONFIG: StageConfig[] = [
  {
    id: "inquiry",
    label: "استفسار جديد (Inquiry)",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-800",
    borderColor: "border-slate-200",
    defaultAction: "التواصل الأولي وتأهيل متطلبات العميل",
    description: "استفسار جديد دخل النظام وبانتظار التواصل الأول",
    iconName: "HelpCircle",
  },
  {
    id: "followup",
    label: "متابعة وتأهيل (Follow-up)",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    borderColor: "border-amber-200",
    defaultAction: "تنفيذ المتابعة المجدولة للوصول لاتفاق",
    description: "العميل في مرحلة المتابعة والاتصالات الدورية",
    iconName: "Clock",
  },
  {
    id: "qualified",
    label: "مؤهلة (Qualified)",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    borderColor: "border-amber-200",
    defaultAction: "تحديد الخطوة التالية وتأهيل العميل",
    description: "عميل مناسب للبيع ويحتاج تحديد الإجراء القادم",
    iconName: "Target",
  },
  {
    id: "needs_inspection",
    label: "محتاج معاينة (Needs Inspection)",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    borderColor: "border-blue-200",
    defaultAction: "تنفيذ المعاينة ورفع المقاسات بالموقع",
    description: "يحتاج معاينة موقعية أو رفع مقاسات هندسية",
    iconName: "Ruler",
  },
  {
    id: "inspection_completed",
    label: "تمت المعاينة (Inspection Completed)",
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-800",
    borderColor: "border-cyan-200",
    defaultAction: "إعداد وتجهيز عرض السعر الفني والمالي",
    description: "المعاينة تمت بنجاح وأصبح جاهزاً للتسعير وحساب المقايسة",
    iconName: "ClipboardCheck",
  },
  {
    id: "needs_quote",
    label: "محتاج عرض سعر (Needs Quote)",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-800",
    borderColor: "border-indigo-200",
    defaultAction: "إنشاء وإرسال عرض السعر للعميل",
    description: "البيانات مكتملة وبانتظار إصدار عرض السعر",
    iconName: "FileText",
  },
  {
    id: "quote_sent",
    label: "عرض سعر مُرسل (Quote Sent)",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    borderColor: "border-purple-200",
    defaultAction: "متابعة استلام ودراسة العرض مع العميل",
    description: "تم إرسال العرض للعميل ولم يتم التعاقد بعد",
    iconName: "Send",
  },
  {
    id: "negotiation",
    label: "تفاوض (Negotiation)",
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-800",
    borderColor: "border-violet-200",
    defaultAction: "متابعة التفاوض والوصول للاتفاق النهائي",
    description: "العميل يتفاوض على الأسعار أو جداول الدفع أو المواصفات",
    iconName: "Handshake",
  },
  {
    id: "ready_to_contract",
    label: "جاهز للتعاقد (Ready to Contract)",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    borderColor: "border-emerald-300",
    defaultAction: "إتمام وتوقيع العقد الرسمي والتحصيل",
    description: "فرصة مفتوحة واحتمال التعاقد مرتفع جداً وبانتظار التوقيع",
    iconName: "FileCheck",
  },
  {
    id: "won",
    label: "تم التعاقد (Won / Contracted)",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    borderColor: "border-emerald-700",
    defaultAction: "تم التعاقد بنجاح وتحويل العقد للتصنيع والتنفيذ",
    description: "تم توقيع العقد وخروج الصفقة من المسار المفتوح إلى العقود والمبيعات",
    iconName: "Trophy",
  },
  {
    id: "lost",
    label: "صفقة خاسرة (Lost)",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    borderColor: "border-rose-200",
    defaultAction: "صفقة مغلقة بالخسارة مع تسجيل السبب",
    description: "تم فقد الصفقة مع تسجيل سبب الخسارة إجبارياً للتحليل",
    iconName: "XCircle",
  },
];

/**
 * Return default next action for a given stage
 */
export function getOpportunityNextAction(stage: OpportunityStage): string {
  const found = OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === stage);
  return found ? found.defaultAction : "متابعة العميل والصفقة";
}

/**
 * Stage configuration helper
 */
export function getStageConfig(stage: OpportunityStage): StageConfig {
  return (
    OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === stage) || {
      id: stage,
      label: stage,
      badgeBg: "bg-stone-100",
      badgeText: "text-stone-800",
      borderColor: "border-stone-200",
      defaultAction: "متابعة الصفقة",
      description: "",
      iconName: "Target",
    }
  );
}

/**
 * Calculate days between two dates (YYYY-MM-DD)
 */
export function getDaysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Generate real, dynamic notifications from actual business data
 * Guaranteed no duplicates, strict company isolation
 */
export function generateRealNotifications(params: {
  companyId: CompanyId;
  followUps: FollowUp[];
  quotations: Quotation[];
  contracts: Contract[];
  opportunities: Opportunity[];
  inspections: Inspection[];
  todayStr: string;
  readNotificationIds: string[];
}): AppNotification[] {
  const {
    companyId,
    followUps,
    quotations,
    contracts,
    opportunities,
    inspections,
    todayStr,
    readNotificationIds,
  } = params;

  const notifications: AppNotification[] = [];
  const readSet = new Set(readNotificationIds);

  // Filter entities by company if not "all"
  const filterByComp = <T extends { companyId: string }>(items: T[]): T[] => {
    if (companyId === "all") return items;
    return items.filter((i) => i.companyId === companyId);
  };

  const compFollowUps = filterByComp(followUps);
  const compQuotations = filterByComp(quotations);
  const compContracts = filterByComp(contracts);
  const compOpportunities = filterByComp(opportunities);
  const compInspections = filterByComp(inspections);

  // 1. Overdue follow-ups (🔴 High priority)
  compFollowUps
    .filter((f) => f.status === "pending" && f.dueDate < todayStr)
    .slice(0, 15)
    .forEach((f) => {
      const id = `notif-overdue-${f.id}`;
      notifications.push({
        id,
        companyId: f.companyId,
        type: "overdue_followup",
        title: `متابعة متأخرة: ${f.customerName}`,
        message: `متابعة كان موعدها ${f.dueDate} تتطلب اتصالاً عاجلاً الآن.`,
        relatedEntityType: "followup",
        relatedEntityId: f.customerId,
        createdAt: f.dueDate,
        readAt: readSet.has(id) ? todayStr : null,
        priority: "high",
      });
    });

  // 2. Today's follow-ups (🟠 Medium/High)
  compFollowUps
    .filter((f) => f.status === "pending" && f.dueDate === todayStr)
    .slice(0, 15)
    .forEach((f) => {
      const id = `notif-today-${f.id}`;
      notifications.push({
        id,
        companyId: f.companyId,
        type: "today_followup",
        title: `متابعة اليوم: ${f.customerName}`,
        message: f.title || "متابعة مجدولة لليوم للوصول للاتفاق.",
        relatedEntityType: "followup",
        relatedEntityId: f.customerId,
        createdAt: todayStr,
        readAt: readSet.has(id) ? todayStr : null,
        priority: "high",
      });
    });

  // 3. Today's Inspections (📐 High)
  compInspections
    .filter((insp) => (insp.result === "pending" || !insp.result) && insp.date === todayStr)
    .slice(0, 10)
    .forEach((insp) => {
      const id = `notif-insp-${insp.id}`;
      notifications.push({
        id,
        companyId: insp.companyId,
        type: "today_inspection",
        title: `معاينة موقع اليوم: ${insp.customerName}`,
        message: `معاينة ورفع مقاسات مجدولة مع الفني ${insp.surveyor || "المسؤول"}.`,
        relatedEntityType: "inspection",
        relatedEntityId: insp.customerId,
        createdAt: todayStr,
        readAt: readSet.has(id) ? todayStr : null,
        priority: "high",
      });
    });

  // 4. Quotes sent needing follow-up (📄 Medium)
  compQuotations
    .filter((q) => {
      if (q.status !== "sent" && q.status !== "negotiation") return false;
      const hasContract = compContracts.some((c) => c.quotationId === q.id || c.customerId === q.customerId);
      return !hasContract;
    })
    .slice(0, 15)
    .forEach((q) => {
      const id = `notif-quote-${q.id}`;
      notifications.push({
        id,
        companyId: q.companyId,
        type: "quote_followup",
        title: `عرض سعر مرسل بانتظار الرد: ${q.customerName}`,
        message: `عرض سعر رقم ${q.quoteNumber} بقيمة ${(q.totalAmount || 0).toLocaleString()} ج.م يحتاج متابعة مع العميل.`,
        relatedEntityType: "quotation",
        relatedEntityId: q.customerId,
        createdAt: q.date,
        readAt: readSet.has(id) ? todayStr : null,
        priority: "medium",
      });
    });

  // 5. Active Negotiations (🤝 High)
  compOpportunities
    .filter((o) => o.status === "open" && o.stage === "negotiation")
    .slice(0, 10)
    .forEach((opp) => {
      const id = `notif-neg-${opp.id}`;
      notifications.push({
        id,
        companyId: opp.companyId,
        type: "negotiation_followup",
        title: `صفقة في مرحلة التفاوض: ${opp.customerName || opp.title}`,
        message: `العميل في مرحلة التفاوض بقيمة متوقعة ${(opp.expectedValue || 0).toLocaleString()} ج.م.`,
        relatedEntityType: "opportunity",
        relatedEntityId: opp.customerId || opp.id,
        createdAt: opp.createdAt,
        readAt: readSet.has(id) ? todayStr : null,
        priority: "high",
      });
    });

  // 6. Opportunities missing next action (⚠️ Medium)
  compOpportunities
    .filter((o) => o.status === "open" && (!o.nextAction || o.nextAction.trim() === ""))
    .slice(0, 10)
    .forEach((opp) => {
      const id = `notif-no-action-${opp.id}`;
      notifications.push({
        id,
        companyId: opp.companyId,
        type: "missing_next_action",
        title: `فرصة بدون إجراء قادم: ${opp.customerName || opp.title}`,
        message: `المرحلة: ${opp.stage} - يرجى تحديد ماذا يحتاج العميل الآن لإتمام الصفقة.`,
        relatedEntityType: "opportunity",
        relatedEntityId: opp.customerId || opp.id,
        createdAt: opp.createdAt,
        readAt: readSet.has(id) ? todayStr : null,
        priority: "medium",
      });
    });

  // 7. Recent signed contracts (📜 Info / Low)
  compContracts.slice(0, 5).forEach((c) => {
    const id = `notif-contract-${c.id}`;
    notifications.push({
      id,
      companyId: c.companyId,
      type: "contract_signed",
      title: `عقد تم إبرامه بنجاح: ${c.customerName}`,
      message: `العقد رقم ${c.contractNumber} بقيمة ${(c.totalValue || 0).toLocaleString()} ج.م تم تسجيله بنجاح.`,
      relatedEntityType: "contract",
      relatedEntityId: c.customerId,
      createdAt: c.date,
      readAt: readSet.has(id) ? todayStr : null,
      priority: "low",
    });
  });

  // 8. Payment due / collection pending (💰 Medium)
  compContracts
    .filter((c) => (c.remainingAmount || 0) > 0 && c.status === "active")
    .slice(0, 8)
    .forEach((c) => {
      const id = `notif-payment-${c.id}`;
      notifications.push({
        id,
        companyId: c.companyId,
        type: "payment_due",
        title: `دفعة مستحقة التحصيل: ${c.customerName}`,
        message: `متبقي ${(c.remainingAmount || 0).toLocaleString()} ج.م من عقد رقم ${c.contractNumber}.`,
        relatedEntityType: "contract",
        relatedEntityId: c.customerId,
        createdAt: c.date,
        readAt: readSet.has(id) ? todayStr : null,
        priority: "medium",
      });
    });

  // Sort: unread first, then high priority, then newest
  return notifications.sort((a, b) => {
    const aRead = a.readAt ? 1 : 0;
    const bRead = b.readAt ? 1 : 0;
    if (aRead !== bRead) return aRead - bRead;

    const prioWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const pDiff = (prioWeight[b.priority] || 0) - (prioWeight[a.priority] || 0);
    if (pDiff !== 0) return pDiff;

    return b.createdAt.localeCompare(a.createdAt);
  });
}
