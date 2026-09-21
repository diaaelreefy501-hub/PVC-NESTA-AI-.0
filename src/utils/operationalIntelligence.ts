/**
 * PVC NESTA AI - Operational Intelligence Engine (Rule-Based)
 * This module replaces generative AI dependencies with deterministic logic
 * for data analysis, health checks, and task automation.
 */

export interface CustomerData {
  id: string;
  name: string;
  area?: string;
  stage: string;
  interestLevel: "hot" | "warm" | "cold";
  lastContactDate?: string;
  totalQuotationsValue?: number;
  createdAt?: string;
}

export interface AnalysisResult {
  dealHealthScore: number;
  riskFactor: string;
  recommendedAction: string;
  smartFollowupMessage: string;
  bestTimeToSend: "صباحاً" | "بعد الظهر" | "فوراً";
}

/**
 * Deterministic analysis of customer deal health based on interaction patterns.
 */
export function analyzeCustomerHeuristics(
  customer: CustomerData,
  quotations: any[] = [],
  interactions: any[] = [],
  followUps: any[] = []
): AnalysisResult {
  let score = 50; // Neutral starting point
  let riskFactor = "مسار طبيعي للصفقة.";
  let recommendedAction = "الاستمرار في المتابعة الدورية.";
  
  const now = new Date();
  const lastContact = customer.lastContactDate ? new Date(customer.lastContactDate) : null;
  const daysSinceLastContact = lastContact ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)) : 99;
  
  // Interest Level weights
  if (customer.interestLevel === "hot") score += 20;
  if (customer.interestLevel === "warm") score += 10;
  if (customer.interestLevel === "cold") score -= 10;

  // Recency weights
  if (daysSinceLastContact <= 2) score += 15;
  else if (daysSinceLastContact > 7) {
    score -= 20;
    riskFactor = "تأخر في المتابعة (أكثر من أسبوع بدون تواصل).";
    recommendedAction = "إجراء اتصال هاتفي فوراً لاستعادة الزخم.";
  }

  // Quotation weights
  const hasActiveQuote = quotations.some(q => q.status === "sent" || q.status === "pending");
  if (hasActiveQuote) {
    score += 10;
  } else if (customer.stage === "quotation") {
    score -= 15;
    riskFactor = "العميل في مرحلة المقايسة ولكن لم يتم إصدار عرض سعر بعد.";
    recommendedAction = "تجهيز وإرسال عرض السعر الفني والمالي.";
  }

  // Interaction depth
  if (interactions.length > 5) score += 10;
  if (followUps.some(f => f.status === "overdue")) {
    score -= 15;
    riskFactor = "وجود متابعات متأخرة لم يتم تنفيذها.";
    recommendedAction = "تنفيذ المتابعات المتأخرة وتحديث حالة العميل.";
  }

  // Cap score
  score = Math.min(Math.max(score, 0), 100);

  // Dynamic Message Generation
  let smartFollowupMessage = `مساء الخير يا بشمهندس ${customer.name}، بنتابع مع حضرتك بخصوص طلب الـ UPVC لتأكيد المواصفات الفنية. هل في أي استفسار محتاج مراجعته؟`;
  
  if (customer.stage === "quotation" && !hasActiveQuote) {
    smartFollowupMessage = `أهلاً بشمهندس ${customer.name}، جاري العمل على عرض السعر الخاص بحضرتك وسيكون جاهزاً خلال ساعات. هل تحب نركز على نوع قطاع معين؟`;
  } else if (daysSinceLastContact > 7) {
    smartFollowupMessage = `تحياتي يا بشمهندس ${customer.name}، بنعتذر لو انشغلنا عن حضرتك. حابين نطمن هل تم الاستقرار على المواصفات ولا لسه في مرحلة المقارنة؟`;
  } else if (customer.interestLevel === "hot") {
    smartFollowupMessage = `مساء الخير يا فندم، متاح حالياً موعد معاينة فنية في منطقتكم خلال الـ 48 ساعة القادمة. هل يناسبكم حجز الموعد لتأكيد المقاسات النهائية؟`;
  }

  return {
    dealHealthScore: score,
    riskFactor,
    recommendedAction,
    smartFollowupMessage,
    bestTimeToSend: daysSinceLastContact > 3 ? "فوراً" : "صباحاً"
  };
}

/**
 * Intelligent Data Integrity Check (The "Guardian" Engine)
 */
export function performHealthCheck(data: {
  customers: any[];
  quotations: any[];
  followUps: any[];
}) {
  const incidents: any[] = [];
  const now = new Date();

  // 1. Check for duplicate phone numbers
  const phoneMap = new Map();
  data.customers.forEach(c => {
    if (c.phone) {
      const normalized = c.phone.replace(/\D/g, "");
      if (phoneMap.has(normalized)) {
        incidents.push({
          type: "duplicate_phone",
          severity: "medium",
          description: `رقم الهاتف ${c.phone} مكرر للعميل ${c.name} والعميل ${phoneMap.get(normalized).name}`,
          entityId: c.id,
          entityType: "customer"
        });
      } else {
        phoneMap.set(normalized, c);
      }
    }
  });

  // 2. Check for overdue follow-ups
  data.followUps.forEach(f => {
    if (f.status === "pending" || f.status === "scheduled") {
      const dueDate = new Date(f.dueDate);
      if (dueDate < now) {
        incidents.push({
          type: "overdue_followup",
          severity: "high",
          description: `متابعة متأخرة للعميل ${f.customerName} منذ تاريخ ${f.dueDate}`,
          entityId: f.id,
          entityType: "followup"
        });
      }
    }
  });

  // 3. Check for customers stuck in stages
  data.customers.forEach(c => {
    const createdAt = new Date(c.createdAt || c.lastContactDate || now);
    const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (c.stage === "inquiry" && ageInDays > 3) {
      incidents.push({
        type: "stuck_lead",
        severity: "medium",
        description: `العميل ${c.name} عالق في مرحلة "استفسار" لأكثر من 3 أيام.`,
        entityId: c.id,
        entityType: "customer"
      });
    }
  });

  return incidents;
}

/**
 * Regex-based Command Parser for AI-like interactions
 */
export function parseOperationalCommand(message: string) {
  const text = message.toLowerCase();
  
  // 1. Update Status Pattern: "حول عملاء نيو هاوس لمتعاقد"
  const statusMatch = text.match(/(?:حول|تغيير|تحديث)\s+(?:عملاء|كل)\s+([^\s]+)\s+(?:لـ|إلى|ليكونوا)\s+([^\s]+)/i);
  if (statusMatch) {
    return {
      action: "UPDATE_LEADS_STATUS",
      company_name: statusMatch[1],
      new_status: mapStatusKeyword(statusMatch[2])
    };
  }

  // 2. Schedule Follow-up Pattern: "كلم احمد بكره بخصوص المعاينة"
  const followupMatch = text.match(/(?:كلم|متابعة|اتصل بـ)\s+([^\s]+)\s+(بكره|بعده|يوم\s+[^\s]+)\s+(?:بخصوص|عشان)\s+(.+)/i);
  if (followupMatch) {
    return {
      action: "CREATE_FOLLOWUP",
      customer_name: followupMatch[1],
      due_date: parseRelativeDate(followupMatch[2]),
      title: followupMatch[3],
      priority: "medium"
    };
  }

  return null;
}

function mapStatusKeyword(keyword: string): string {
  const map: Record<string, string> = {
    "متعاقد": "contracted",
    "عقد": "contracted",
    "معاينة": "inspection",
    "مقاسات": "inspection",
    "عرض": "quotation",
    "سعر": "quotation",
    "مقايسة": "quotation",
    "متابعة": "followup",
    "مباع": "sold",
    "تم": "sold"
  };
  return map[keyword] || keyword;
}

function parseRelativeDate(relative: string): string {
  const d = new Date();
  if (relative === "بكره") d.setDate(d.getDate() + 1);
  if (relative === "بعده") d.setDate(d.getDate() + 2);
  // Default to tomorrow if unsure
  return d.toISOString().split("T")[0];
}
