import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Security Middleware: Prevent direct HTTP access to server source files, env files, and migrations
app.use((req, res, next) => {
  const reqPath = req.path.toLowerCase();
  if (
    reqPath === "/server.ts" ||
    reqPath.startsWith("/server.") ||
    reqPath.startsWith("/.env") ||
    reqPath.endsWith(".sql") ||
    reqPath.endsWith(".cjs") ||
    reqPath.endsWith(".env") ||
    reqPath.includes("/.env")
  ) {
    return res.status(403).json({ error: "Access Denied" });
  }
  next();
});

// Server-side Supabase Admin Client using Service Role Key (strictly loaded from environment)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  (process.env.VITE_SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY.startsWith("sb_publishable_")
    ? process.env.VITE_SUPABASE_ANON_KEY
    : "");

const safeUrl = (SUPABASE_URL && SUPABASE_URL.startsWith("http")) ? SUPABASE_URL : "https://nzuadqnfoswrimfakdsv.supabase.co";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is not configured in server environment. Admin APIs requiring service_role will be disabled.");
}

const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(safeUrl, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "PVC NESTA AI" });
});

app.post("/api/gemini/intake", async (req, res) => {
  const { text, existingCompanies } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "النص مطلوب" });
  }

  const prompt = `أنت المساعد الذكي لنظام "PVC NESTA AI" المتخصص في قطاعات UPVC والألومنيوم في مصر.
مهمتك استخراج بيانات العميل بدقة من النص التالي بدون أي تأليف أو اختلاق.
إذا كانت أي معلومة غير مذكورة بوضوح، اجعل قيمتها نصاً فارغاً أو null.
صنف درجة الاهتمام إلى: "hot" أو "warm" أو "cold".
القناة المصدرية: WhatsApp أو Facebook أو Phone Call أو Instagram أو "Manual".

أمثلة على المدخلات المحتملة:
- «أحمد — التجمع — 0103747784 — معاينة»
- «أحمد التجمع 0103747784 عرض سعر 66800»
- «أحمد التجمع 0103747784 متابعة»
- «العميل يريد معاينة ثم عرض سعر تقريبي بقيمة 66800»

النص المراد تحليله:
"""${text}"""

أخرج النتيجة بصيغة JSON حصراً بهذا الهيكل:
{
  "customerName": "اسم العميل فقط أو فارغ",
  "phone": "رقم الهاتف بدون مسافات أو فارغ",
  "secondaryPhone": "",
  "area": "المنطقة (مثل: التجمع، الشيخ زايد، أكتوبر، مدينة نصر، المعادي...) أو فارغ",
  "address": "العنوان بالتفصيل إن وجد",
  "productType": "نوع المنتجات المطلوبة (مثل: شبابيك وأبواب UPVC)",
  "orderDetails": "تفاصيل الطلب والكميات أو نص الملاحظة",
  "source": "WhatsApp | Facebook | Instagram | Phone Call | Website | Manual",
  "interestLevel": "hot | warm | cold",
  "stage": "inquiry | contacted | inspection | quotation | negotiation | contracted",
  "actionType": "inspection | quotation | contracted | followup | inquiry",
  "quoteAmount": 66800 أو null إذا لم يذكر سعر,
  "suggestedFollowUp": "تاريخ مقترح بصيغة YYYY-MM-DD",
  "summary": "ملخص تنفيذي",
  "needsInspection": true أو false
}`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const raw = response.text || "{}";
      try {
        const parsed = JSON.parse(raw);
        return res.json({ success: true, data: parsed });
      } catch (err) {
        const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        return res.json({ success: true, data: parsed });
      }
    }
  } catch (error: any) {
    console.warn("Gemini API call failed, falling back to smart heuristic extractor:", error?.message);
  }

  const fallbackData = extractSmartFallback(text);
  return res.json({ success: true, data: fallbackData, fallback: true });
});

app.post("/api/gemini/analyze-customer", async (req, res) => {
  const { customer, quotations, interactions, followUps } = req.body;

  if (!customer) {
    return res.status(400).json({ error: "بيانات العميل مطلوبة" });
  }

  const prompt = `أنت رئيس مبيعات استشاري خبير في قطاعات UPVC والألومنيوم في مصر.
قم بتحليل بيانات العميل التالية ومسار تعاملاته لتقديم توصية بيعية حاسمة:

بيانات العميل:
- الاسم: ${customer.name}
- المنطقة: ${customer.area}
- المرحلة الحالية: ${customer.stage}
- درجة الاهتمام: ${customer.interestLevel}
- إجمالي عروض الأسعار: ${customer.totalQuotationsValue} ج.م
- تاريخ آخر تواصل: ${customer.lastContactDate}
- عروض الأسعار: ${JSON.stringify(quotations || [])}
- سجل المكالمات والملاحظات: ${JSON.stringify(interactions || [])}
- المتابعات: ${JSON.stringify(followUps || [])}

المطلوب: أخرج النتيجة بتنسيق JSON حصراً بهذا الهيكل الدقيق:
{
  "dealHealthScore": 80,
  "riskFactor": "وصف دقيق لأكبر خطر يهدد الصفقة",
  "recommendedAction": "خطوة عملية محددة لمسؤول المبيعات للقيام بها الآن",
  "smartFollowupMessage": "رسالة واتساب مصرية احترافية ومقنعة جاهزة للإرسال فوراً للعميل",
  "bestTimeToSend": "صباحاً / بعد الظهر / فوراً"
}`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, analysis: parsed });
    }
  } catch (err: any) {
    console.error("AI Customer Analysis Error:", err?.message);
  }

  return res.json({
    success: true,
    analysis: {
      dealHealthScore: customer.interestLevel === "hot" ? 85 : 55,
      riskFactor: "احتمال استلام عروض أسعار من منافسين أو تأجيل البت في المواصفات.",
      recommendedAction: "التواصل لتقديم ميزة تأكيد السعر قبل أي تحديث في أسعار القطاعات.",
      smartFollowupMessage: `مساء الخير يا بشمهندس ${customer.name}، بنتابع مع حضرتك مقايسة الـ UPVC لتأكيد موعد التوريد وتثبيت نسبة الخصم لحضرتك. هل يناسبك نراجع التفاصيل هاتفياً؟`,
      bestTimeToSend: "فوراً",
    },
  });
});

app.post("/api/gemini/chat", async (req, res) => {
  const { message, mode = "ask", context } = req.body;
  if (!message) {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  const prompt = `أنت "NESTA AI" - الوكيل الذكي الشامل والمستشار التشغيلي لمنظومة إدارة مبيعات وعمليات شركات UPVC والألومنيوم في مصر (PVC NESTA AI).
أنت تدعم 3 أنماط عمل أساسية:
1. نمط السؤال والاستفسار (ASK): تقديم إجابات وتحليلات ومقارنات دقيقة وسريعة بلهجة عمل مصرية مباشرة واحترافية.
2. نمط الفحص والتدقيق (CHECK): تشخيص ملفات العملاء، تدقيق العلاقات وقواعد العمل، فحص خط سير البيانات وعزل الشركات.
3. نمط التنفيذ الميداني (ACT): اقتراح وتجهيز أوامر تشغيلية محددة مثل جدولة المتابعات، تحديث الحالات، تعيين المسؤولين، وإصلاح المشكلات.

النمط الحالي المطلوب: ${mode.toUpperCase()}
سياق الشاشة الحالية والبيانات:
- الشاشة الحالية: ${context?.currentPage || "dashboard"}
- الشركة النشطة: ${context?.activeCompanyName || "كافة الشركات"} (ID: ${context?.activeCompanyId || "all"})
- العميل المحدد حالياً: ${context?.selectedCustomer ? JSON.stringify(context.selectedCustomer) : "لا يوجد"}
- عدد العناصر المحددة في الجدول: ${context?.selectedRecordsCount || 0}
- إجمالي العملاء: ${context?.customersCount || 0}
- الاستفسارات المفتوحة: ${context?.inquiriesCount || 0}
- متابعات اليوم: ${context?.todayFollowupsCount || 0}
- المتابعات المتأخرة: ${context?.overdueFollowupsCount || 0}
- العملاء الساخنون (Hot): ${context?.hotCustomersCount || 0}
- مبيعات هذا الشهر: ${Number(context?.monthlySalesTotal || 0).toLocaleString()} ج.م
- المستهدف الشهري: ${Number(context?.monthlyTargetTotal || 0).toLocaleString()} ج.م
- الشركات بالنظام: ${context?.companiesNames?.join(", ") || "PVC NESTA"}
- التنبيهات المفتوحة: ${context?.openAlertsCount || 0}
- الحوادث المكتشفة: ${context?.openIncidentsCount || 0}
${context?.localReasoningSummary ? `\n--- تحليل وتدقيق السجلات المحلي (مؤكد وصحيح 100%): \n${context.localReasoningSummary}\n---` : ""}

طلب المستخدم:
"""${message}"""

المطلوب:
أجب باللغة العربية بأسلوب مستشار مبيعات وعمليات خبير بالعامية المصرية الراقية والعملية الفعالة. اعتمد بالكامل على "تحليل وتدقيق السجلات المحلي" المرفق أعلاه للإجابة على الفروقات المالية أو مسار العميل، ولا تقم باختلاق (Hallucinate) أي أرقام، أسماء، تواريخ، أو علاقات من خارج هذا السياق. إذا كان السؤال عن مصدر رقم أو إحصائية أو تدقيق، وضّح الحساب بدقة.
إذا كان الطلب ينطوي على أمر تنفيذي (مثل إضافة متابعة، تحديث حالة، تعيين مسؤول، فحص مشكلة)، أرفق مقترحاً صريحاً للخطوة التالية.`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.25,
        },
      });
      return res.json({ success: true, reply: response.text || "جاهز لمساعدتك دائماً." });
    }
  } catch (error: any) {
    console.warn("Gemini Chat failed, using smart fallback:", error?.message);
  }

  let fallbackReply = "أهلاً بك. أنا المساعد الذكي لنظام PVC NESTA AI.";
  const q = message.toLowerCase();
  if (q.includes("اليوم") || q.includes("متابعة") || q.includes("مهام")) {
    fallbackReply = `لديك اليوم ${context?.todayFollowupsCount || 0} متابعة مجدولة، و ${context?.overdueFollowupsCount || 0} متابعة متأخرة تحتاج لحسم فوري.`;
  } else if (q.includes("مبيعات") || q.includes("تارجت") || q.includes("هدف")) {
    const achievePercent = context?.monthlyTargetTotal
      ? Math.round(((context.monthlySalesTotal || 0) / context.monthlyTargetTotal) * 100)
      : 0;
    fallbackReply = `حققت هذا الشهر ${Number(context?.monthlySalesTotal || 0).toLocaleString()} ج.م من أصل ${Number(context?.monthlyTargetTotal || 0).toLocaleString()} ج.م بنسبة إنجاز ${achievePercent}%.`;
  } else if (q.includes("حارس") || q.includes("فحص") || q.includes("مشاكل") || q.includes("سلامة")) {
    fallbackReply = `تقرير الحارس الذكي (Guardian): النظام يعمل بكفاءة، مع وجود ${context?.openAlertsCount || 0} تنبيهات تشغيلية و ${context?.openIncidentsCount || 0} مشكلات بحاجة للمراجعة.`;
  } else {
    fallbackReply = `جاهز لمساعدتك في الاستفسار، فحص البيانات (CHECK)، أو تنفيذ الإجراءات الميدانية (ACT).`;
  }

  return res.json({ success: true, reply: fallbackReply });
});

export const updateLeadsStatusDeclaration = {
  name: "update_leads_status_by_filter",
  description: "تحديث الحالة (Stage) لجميع العملاء التابعين لشركة محددة أو لمعرفات محددة.",
  parameters: {
    type: "OBJECT",
    properties: {
      company_name: {
        type: "STRING",
        description: "اسم الشركة المستهدفة التي ينتمي إليها العملاء (مثل: 'نيو هاوس', 'Nesta')."
      },
      new_status: {
        type: "STRING",
        description: "الحالة الجديدة المراد التحويل إليها (مثل: 'contracted', 'inspection', 'followup', 'inquiry', 'sold')."
      }
    },
    required: ["company_name", "new_status"]
  }
};

export const createFollowupDeclaration = {
  name: "create_scheduled_followup",
  description: "جدولة موعد متابعة لعميل أو قائمة عملاء محددين.",
  parameters: {
    type: "OBJECT",
    properties: {
      customer_name: { type: "STRING", description: "اسم العميل" },
      due_date: { type: "STRING", description: "تاريخ المتابعة بصيغة YYYY-MM-DD" },
      title: { type: "STRING", description: "عنوان أو غرض المتابعة" },
      priority: { type: "STRING", description: "درجة الأهمية: high أو medium أو low" }
    },
    required: ["customer_name", "due_date", "title"]
  }
};

app.post("/api/gemini/execute-command", async (req, res) => {
  const { userMessage, context } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        isCommand: false,
        message: "تم استقبال الأمر بنجاح (وضع المعالجة الذاتية للنظام)."
      });
    }
    const ai = getGenAI();

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `سياق النظام: ${JSON.stringify(context || {})} \n أمر المستخدم: ${userMessage}`,
      config: {
        tools: [{ functionDeclarations: [updateLeadsStatusDeclaration as any, createFollowupDeclaration as any] }],
        systemInstruction: "أنت المساعد التنفيذي لنظام PVC NESTA AI. حلل طلب المستخدم واستدع الدالة المناسبة إذا كان طلباً تشغيلياً للتحديث أو الجدولة."
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];

      if (call.name === "update_leads_status_by_filter") {
        const { company_name, new_status } = call.args as any;
        return res.json({
          success: true,
          isCommand: true,
          command: {
            action: "UPDATE_LEADS_STATUS",
            company_name,
            new_status
          },
          message: `تم تجهيز أمر التحديث: تحويل عملاء ${company_name} إلى حالة ${new_status}.`
        });
      }

      if (call.name === "create_scheduled_followup") {
        const { customer_name, due_date, title, priority } = call.args as any;
        return res.json({
          success: true,
          isCommand: true,
          command: {
            action: "CREATE_FOLLOWUP",
            customer_name,
            due_date,
            title,
            priority: priority || "medium"
          },
          message: `تم تجهيز أمر جدولة المتابعة لـ ${customer_name} بتاريخ ${due_date}.`
        });
      }
    }

    return res.json({ success: true, isCommand: false, message: response.text });
  } catch (error: any) {
    console.error("Function Calling Error:", error?.message);
    return res.status(500).json({ error: "حدث خطأ أثناء معالجة الأمر الذكي." });
  }
});


function extractSmartFallback(text: string) {
  // Normalize dashes and commas
  const cleanText = text.trim();
  
  // 1. Phone matching
  const phoneMatch = cleanText.match(/(01[0125]\d{8}|\+?201[0125]\d{8}|\d{10,11})/);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, "") : "";

  // 2. Quote Amount matching (e.g., عرض سعر 66800, بقيمة 66800, 66800 ج.م)
  let quoteAmount: number | null = null;
  const quoteMatch = cleanText.match(/(?:عرض\s*سعر|سعر|بقيمة|قيمة|مبلغ|بـ|ب)\s*(?:تقريبي\s*)?(?:بقيمة\s*)?(\d{2,9}(?:[.,]\d+)?)/i);
  if (quoteMatch && quoteMatch[1]) {
    const val = parseFloat(quoteMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0 && val !== (phone ? parseFloat(phone) : 0)) {
      quoteAmount = val;
    }
  }

  // If no quote amount found via keyword, look for a standalone number (4 to 8 digits) that isn't the phone
  if (quoteAmount === null) {
    const allNumbers = cleanText.match(/\b\d{4,8}\b/g);
    if (allNumbers) {
      for (const numStr of allNumbers) {
        if (!phone.includes(numStr)) {
          const val = parseFloat(numStr);
          if (!isNaN(val) && val >= 1000) {
            quoteAmount = val;
            break;
          }
        }
      }
    }
  }

  // 3. Area matching
  let area = "";
  const areas = [
    "التجمع الخامس", "التجمع الأول", "التجمع الثالث", "التجمع",
    "الشيخ زايد", "زايد", "أكتوبر", "6 أكتوبر", "حدائق أكتوبر",
    "المعادي", "مدينة نصر", "مصر الجديدة", "الشروق", "بدر",
    "الساحل الشمالي", "الساحل", "الرحاب", "مدينتي", "المستقبل",
    "العاصمة الإدارية", "المهندسين", "الدقي", "الهرم", "فيصل",
    "الإسكندرية", "طنطا", "المنصورة", "العبور", "المقطم"
  ];
  for (const a of areas) {
    if (cleanText.includes(a)) {
      area = a;
      break;
    }
  }

  // 4. Action Type & Stage
  let actionType: "inspection" | "quotation" | "contracted" | "followup" | "inquiry" = "inquiry";
  let stage: "inquiry" | "contacted" | "inspection" | "quotation" | "negotiation" | "contracted" = "inquiry";
  let needsInspection = false;

  if (cleanText.includes("تعاقد") || cleanText.includes("توقيع عقد") || cleanText.includes("تم التعاقد")) {
    actionType = "contracted";
    stage = "contracted";
  } else if (cleanText.includes("معاينة") || cleanText.includes("مقاسات") || cleanText.includes("رفع مقاس") || cleanText.includes("زيارة فنية")) {
    actionType = "inspection";
    stage = "inspection";
    needsInspection = true;
  } else if (quoteAmount !== null || cleanText.includes("عرض سعر") || cleanText.includes("مقايسة") || cleanText.includes("سعر")) {
    actionType = "quotation";
    stage = "quotation";
  } else if (cleanText.includes("متابعة") || cleanText.includes("اتصال") || cleanText.includes("تواصل") || cleanText.includes("كلمته")) {
    actionType = "followup";
    stage = "contacted";
  }

  // 5. Customer Name extraction
  let customerName = "";
  // Check honorific prefixes first
  const honorificMatch = cleanText.match(/(?:أستاذ|أستاذة|المهندس|المهندسة|م\.|الحاج|الحاجة|دكتور|دكتورة|د\.|العميل|الباشمهندس)\s+([^\s,،—\-_]+(?:\s+[^\s,،—\-_]+)?)/i);
  if (honorificMatch) {
    customerName = honorificMatch[1].trim();
  } else if (cleanText.includes("—") || cleanText.includes("-") || cleanText.includes("–")) {
    // Delimited format e.g. "أحمد — التجمع — 0103747784 — معاينة"
    const parts = cleanText.split(/[—–\-]/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const hasPhone = phone && part.includes(phone);
      const isArea = area && part.includes(area);
      const isAction = /معاينة|مقاسات|عرض سعر|متابعة|تعاقد|استفسار/.test(part);
      const isNumeric = /^\d+$/.test(part);
      if (!hasPhone && !isArea && !isAction && !isNumeric && part.length >= 2 && part.length <= 40) {
        customerName = part;
        break;
      }
    }
  } else {
    // Space-separated fallback e.g. "أحمد التجمع 0103747784 متابعة"
    const words = cleanText.split(/\s+/);
    if (words.length > 0) {
      const firstWord = words[0];
      const secondWord = words[1] || "";
      const stopWords = ["العميل", "عميل", "طلب", "استفسار", "معاينة", "عرض", "سعر", "متابعة", "في", "من"];
      if (!stopWords.includes(firstWord) && !firstWord.match(/\d/)) {
        if (secondWord && !stopWords.includes(secondWord) && !secondWord.match(/\d/) && (!area || !secondWord.includes(area))) {
          customerName = `${firstWord} ${secondWord}`;
        } else {
          customerName = firstWord;
        }
      }
    }
  }

  // Clean customerName of trailing action words if any
  customerName = customerName.replace(/(?:معاينة|متابعة|عرض سعر|تعاقد)/g, "").trim();

  // 6. Product Type
  let productType = "شبابيك وأبواب UPVC";
  if (cleanText.includes("شباك") || cleanText.includes("شبابيك")) productType = "شبابيك UPVC";
  if (cleanText.includes("باب") || cleanText.includes("أبواب")) productType = "أبواب UPVC";
  if (cleanText.includes("شتر") || cleanText.includes("شيش حصيرة")) productType = "شيش حصيرة";
  if (cleanText.includes("ألومنيوم") || cleanText.includes("الومنيوم")) productType = "قطاعات ألومنيوم";

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    customerName,
    phone,
    secondaryPhone: "",
    area,
    address: "",
    productType,
    orderDetails: cleanText,
    source: cleanText.includes("واتس") ? "WhatsApp" : "Manual",
    interestLevel: cleanText.includes("مستعجل") || cleanText.includes("عاجل") || cleanText.includes("عايز أتعاقد") ? "hot" : "warm",
    stage,
    actionType,
    quoteAmount,
    suggestedFollowUp: tomorrow.toISOString().split("T")[0],
    summary: `استفسار عن ${productType}${area ? ` في ${area}` : ""}`,
    needsInspection,
  };
}

// -----------------------------------------------------------------------------
// P0 Security: Server-side Authentication Middleware & Admin Management API
// -----------------------------------------------------------------------------

async function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "الخدمة الإدارية غير مهيأة (مفتاح الإدارة غير متوفر في بيئة الخادم)" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "جلسة غير صالحة: يرجى تسجيل الدخول أولاً" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "جلسة غير صالحة أو منتهية" });
    }

    const callerAuthId = userData.user.id;
    // Check caller profile in users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", callerAuthId)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "حساب المستخدم غير مسجل كعضو في النظام (DENIED: No valid profile)" });
    }

    if (profile.active === false) {
      return res.status(403).json({ error: "حسابك موقوف، يرجى مراجعة الإدارة (DENIED: Inactive user)" });
    }

    if (profile.role !== "admin" && profile.role !== "owner") {
      return res.status(403).json({ error: "غير مصرح لك: يتطلب صلاحية إدارية Admin أو Owner (DENIED: Insufficient role)" });
    }

    (req as any).caller = profile;
    (req as any).callerAuth = userData.user;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: "فشل التحقق من هوية المستخدم: " + err.message });
  }
}

// 1. Create employee/user via Supabase Auth Admin API (Bypasses email rate limit & sends no spam)
app.post("/api/admin/users", authenticateAdmin, async (req, res) => {
  const caller = (req as any).caller;
  const { name, email, password, role, allowedCompanyIds } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" });
  }

  const requestedRole = role === "admin" ? "admin" : "sales";
  if (requestedRole === "admin" && caller.role !== "owner") {
    return res.status(403).json({ error: "فقط المالك (Owner) يستطيع إنشاء مستخدمين بصلاحية مدير (Admin)" });
  }

  try {
    // Call Supabase Admin API on server-side
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError) {
      return res.status(400).json({ error: "فشل إنشاء المستخدم في Supabase Auth: " + authError.message });
    }

    if (!authData?.user) {
      return res.status(500).json({ error: "لم يتم إرجاع بيانات المستخدم" });
    }

    const userId = authData.user.id;
    const profile = {
      id: userId,
      name,
      email,
      role: requestedRole,
      allowedCompanyIds: Array.isArray(allowedCompanyIds) ? allowedCompanyIds : ["all"],
      active: true,
    };

    const { error: dbError } = await supabaseAdmin.from("users").upsert([profile]);
    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: "فشل حفظ الملف التعريفي للمستخدم: " + dbError.message });
    }

    return res.status(201).json({ success: true, user: profile });
  } catch (err: any) {
    return res.status(500).json({ error: "خطأ غير متوقع: " + err.message });
  }
});

// Update user details (name, password)
app.patch("/api/admin/users/:id", authenticateAdmin, async (req, res) => {
  const caller = (req as any).caller;
  const targetId = req.params.id;
  const { name, password } = req.body;

  try {
    const { data: targetUser, error: fetchErr } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", targetId)
      .single();

    if (fetchErr || !targetUser) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    if (targetUser.role === "owner" && caller.role !== "owner") {
      return res.status(403).json({ error: "فقط المالك يمكنه تعديل حساب المالك" });
    }

    const authUpdates: any = {};
    if (name) {
      authUpdates.user_metadata = { name };
      const { error: dbUpdateErr } = await supabaseAdmin.from("users").update({ name }).eq("id", targetId);
      if (dbUpdateErr) throw dbUpdateErr;
    }
    if (password) {
      authUpdates.password = password;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(targetId, authUpdates);
      if (authErr) throw authErr;
    }

    return res.json({ success: true, message: "تم تحديث بيانات المستخدم بنجاح" });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل التحديث: " + err.message });
  }
});

// 2. Toggle active/inactive
app.patch("/api/admin/users/:id/status", authenticateAdmin, async (req, res) => {
  const caller = (req as any).caller;
  const targetId = req.params.id;
  const { active } = req.body;

  if (typeof active !== "boolean") {
    return res.status(400).json({ error: "حقل الحالة (active) مطلوب كقيمة منطقية" });
  }

  if (targetId === caller.id) {
    return res.status(400).json({ error: "لا يمكنك إيقاف حسابك الحالي" });
  }

  const { data: targetUser, error: fetchErr } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", targetId)
    .single();

  if (fetchErr || !targetUser) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }

  if (targetUser.role === "owner" && caller.role !== "owner") {
    return res.status(403).json({ error: "لا يمكن تعديل حالة المالك" });
  }

  try {
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ active })
      .eq("id", targetId);

    if (updateError) throw updateError;

    // Ban/unban auth user so Supabase Auth itself blocks login or token refresh
    await supabaseAdmin.auth.admin.updateUserById(targetId, {
      ban_duration: active ? "none" : "876000h",
    });

    return res.json({ success: true, active });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحديث الحالة: " + err.message });
  }
});

// 3. Update role and company membership
app.patch("/api/admin/users/:id/role", authenticateAdmin, async (req, res) => {
  const caller = (req as any).caller;
  const targetId = req.params.id;
  const { role, allowedCompanyIds } = req.body;

  if (caller.role !== "owner" && role === "admin") {
    return res.status(403).json({ error: "فقط المالك يمكنه ترقية مستخدم إلى مدير" });
  }

  try {
    const updateData: any = {};
    if (role) updateData.role = role;
    if (allowedCompanyIds) updateData.allowedCompanyIds = allowedCompanyIds;

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", targetId);

    if (updateError) throw updateError;
    return res.json({ success: true, updated: updateData });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل تحديث الصلاحيات: " + err.message });
  }
});

// 4. Delete user permanently from auth & db
app.delete("/api/admin/users/:id", authenticateAdmin, async (req, res) => {
  const caller = (req as any).caller;
  const targetId = req.params.id;

  if (targetId === caller.id) {
    return res.status(400).json({ error: "لا يمكنك حذف حسابك الحالي" });
  }

  const { data: targetUser } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", targetId)
    .single();

  if (targetUser?.role === "owner") {
    return res.status(403).json({ error: "لا يمكن حذف حساب المالك" });
  }

  try {
    await supabaseAdmin.from("users").delete().eq("id", targetId);
    await supabaseAdmin.auth.admin.deleteUser(targetId);

    return res.json({ success: true, message: "تم حذف المستخدم نهائياً" });
  } catch (err: any) {
    return res.status(500).json({ error: "فشل حذف المستخدم: " + err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PVC NESTA AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
