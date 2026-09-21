import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Customer, CustomerSource, InterestLevel, CustomerStage, CompanyId } from "../../types";
import { DuplicateCustomerModal } from "../common/DuplicateCustomerModal";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Phone,
  MapPin,
  Calendar,
  Flame,
  HelpCircle,
  FileText,
  RotateCcw,
} from "lucide-react";

interface SmartAiIntakeProps {
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const SmartAiIntake: React.FC<SmartAiIntakeProps> = ({ onClose, isEmbedded = false }) => {
  const {
    companies,
    activeCompanyId,
    addCustomer,
    addInquiry,
    addFollowUp,
    findCustomerByPhone,
    setCurrentTab,
    setSelectedCustomerIdFor360,
    isPremiumAiEnabled,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"smart" | "manual">("smart");
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted data state (editable by user before saving)
  const [extractedData, setExtractedData] = useState<{
    companyId: CompanyId;
    customerName: string;
    phone: string;
    secondaryPhone: string;
    area: string;
    address: string;
    productType: string;
    orderDetails: string;
    source: CustomerSource;
    interestLevel: InterestLevel;
    stage: CustomerStage;
    suggestedFollowUp: string;
    summary: string;
  } | null>(null);

  // Duplicate modal trigger
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);
  const [successSaved, setSuccessSaved] = useState(false);

  // Check speech recognition support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSpeech = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
      setSpeechSupported(hasSpeech);
    }
  }, []);

  const toggleRecording = () => {
    if (!speechSupported) {
      alert("خاصية التسجيل الصوتي المباشر غير مدعومة في هذا المتصفح، يمكنك كتابة النص مباشرة.");
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = "ar-EG";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const samplePrompts = [
    {
      label: "عميل التجمع (أحمد - شبابيك UPVC)",
      text: "عميل كلمني على واتساب اسمه أحمد وعايز شبابيك UPVC لشقة في التجمع، وقال إنه لسه بيجهز الشقة وعايز حد يكلمه بكرة رقمه 01019882233.",
    },
    {
      label: "طلب معاينة الشيخ زايد",
      text: "عميلة من الشيخ زايد اسمها نادية تليفونها 01223344556 عايزة تغير شبابيك الشقة ألومنيوم لـ UPVC عازل للصوت وطلبت معاينة عاجلة الأسبوع القادم.",
    },
    {
      label: "طلب سعر مدينة نصر (باب بلكونة وشباكين)",
      text: "عميل اسمه محمد مصطفى كلمني النهاردة وعايز باب بلكونة وشباكين UPVC في مدينة نصر ورقم تليفونه 01009988776 وقال ابعتله عرض سعر مستعجل.",
    },
  ];

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setErrorMessage("برجاء كتابة ملاحظة أو استفسار للتحليل.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setSuccessSaved(false);

    try {
      const res = await fetch("/api/gemini/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          existingCompanies: companies,
          enablePremiumAi: isPremiumAiEnabled,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;

        // Determine best target company
        const defaultComp =
          activeCompanyId !== "all" ? activeCompanyId : companies[0]?.id || "comp-newhouse";

        // Format tomorrow date if suggested
        let followUpDate = d.suggestedFollowUp || "";
        if (followUpDate.includes("غدا") || followUpDate.includes("بكرة") || !followUpDate) {
          const tom = new Date();
          tom.setDate(tom.getDate() + 1);
          followUpDate = tom.toISOString().split("T")[0];
        }

        setExtractedData({
          companyId: defaultComp,
          customerName: d.customerName || "",
          phone: d.phone || "",
          secondaryPhone: d.secondaryPhone || "",
          area: d.area || "",
          address: d.address || "",
          productType: d.productType || "شبابيك وأبواب UPVC",
          orderDetails: d.orderDetails || inputText,
          source: (d.source as CustomerSource) || "WhatsApp",
          interestLevel: (d.interestLevel as InterestLevel) || "warm",
          stage: (d.stage as CustomerStage) || (d.needsInspection ? "inspection" : "inquiry"),
          suggestedFollowUp: followUpDate,
          summary: d.summary || `استفسار جديد من ${d.customerName || "عميل"}`,
        });

        // Check for duplicate immediately if phone exists
        if (d.phone) {
          const existing = findCustomerByPhone(d.phone, d.companyId);
          if (existing) {
            setDuplicateCustomer(existing);
          }
        }
      } else {
        setErrorMessage("تعذر التحليل، برجاء التأكد من النص والمحاولة مجدداً.");
      }
    } catch (err: any) {
      console.error("Intake Error:", err);
      setErrorMessage("حدث خطأ في الاتصال بالمساعد الذكي، جارٍ استخدام الوضع التلقائي.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveExtracted = () => {
    if (!extractedData) return;

    if (!extractedData.customerName.trim()) {
      alert("برجاء إدخال اسم العميل على الأقل.");
      return;
    }

    // Check duplicate phone
    if (extractedData.phone) {
      const existing = findCustomerByPhone(extractedData.phone, extractedData.companyId);
      if (existing) {
        setDuplicateCustomer(existing);
        return;
      }
    }

    // 1. Create Customer
    const createdCust = addCustomer({
      companyId: extractedData.companyId,
      name: extractedData.customerName,
      phone: extractedData.phone || "بدون رقم",
      secondaryPhone: extractedData.secondaryPhone,
      area: extractedData.area || "غير محدد",
      address: extractedData.address,
      source: extractedData.source,
      interestLevel: extractedData.interestLevel,
      stage: extractedData.stage,
      notes: extractedData.orderDetails,
      nextFollowUpDate: extractedData.suggestedFollowUp,
    });

    // 2. Create Inquiry
    addInquiry({
      companyId: extractedData.companyId,
      customerId: createdCust.id,
      customerName: createdCust.name,
      customerPhone: createdCust.phone,
      productType: extractedData.productType,
      details: extractedData.orderDetails,
      source: extractedData.source,
      interestLevel: extractedData.interestLevel,
      stage: extractedData.stage,
      nextFollowUpDate: extractedData.suggestedFollowUp,
    });

    // 3. Create FollowUp if date provided
    if (extractedData.suggestedFollowUp) {
      addFollowUp({
        companyId: extractedData.companyId,
        customerId: createdCust.id,
        customerName: createdCust.name,
        customerPhone: createdCust.phone,
        dueDate: extractedData.suggestedFollowUp,
        time: "12:00",
        title: `متابعة استفسار: ${extractedData.productType}`,
        notes: extractedData.summary,
        status: "pending",
        priority: extractedData.interestLevel === "hot" ? "high" : "medium",
      });
    }

    setSuccessSaved(true);
    setInputText("");
    setExtractedData(null);
  };

  const content = (
    <div className="space-y-6 max-w-4xl mx-auto pb-6">
      {/* Duplicate Customer Warning Modal */}
      {duplicateCustomer && (
        <DuplicateCustomerModal
          customer={duplicateCustomer}
          onClose={() => setDuplicateCustomer(null)}
          onAddInquiryToExisting={(existing) => {
            if (extractedData) {
              addInquiry({
                companyId: extractedData.companyId,
                customerId: existing.id,
                customerName: existing.name,
                customerPhone: existing.phone,
                productType: extractedData.productType,
                details: extractedData.orderDetails,
                source: extractedData.source,
                interestLevel: extractedData.interestLevel,
                stage: extractedData.stage,
                nextFollowUpDate: extractedData.suggestedFollowUp,
              });
              setDuplicateCustomer(null);
              setSelectedCustomerIdFor360(existing.id);
            }
          }}
        />
      )}

      {/* View Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              تسجيل استفسار جديد (AI Intake)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            اكتب أو أملِ ما حدث بطبيعتك، ودع الذكاء الاصطناعي يستخرج البيانات وينظمها بدون إدخال يدوي شاق
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-start">
          <button
            onClick={() => setActiveTab("smart")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "smart"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ✨ الإدخال الذكي (AI)
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📝 الإدخال اليدوي
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successSaved && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">تم تسجيل العميل والاستفسار والمتابعة بنجاح!</p>
              <p className="text-xs text-emerald-700">تظهر المتابعة الآن في صفحة "اليوم (My Day)"</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTab("today")}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            فتح اليوم (My Day)
          </button>
        </div>
      )}

      {/* SMART INTAKE TAB */}
      {activeTab === "smart" && (
        <div className="space-y-6">
          {/* Main Natural Text Input Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                اكتب ما قاله العميل أو تفاصيل المكالمة:
              </label>

              {/* Dictation Button */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isRecording
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
                title="إملاء صوتي مباشر"
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? "جارٍ الاستماع..." : "تسجيل صوتي"}</span>
              </button>
            </div>

            <textarea
              id="ai-intake-textarea"
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="مثال: عميل كلمني على واتساب اسمه أحمد وعايز شبابيك UPVC لشقة في التجمع، وقال إنه لسه بيجهز الشقة وعايز حد يكلمه بكرة ورقم تليفونه 01001234567..."
              className="w-full p-4 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all placeholder:text-slate-400 resize-y"
            />

            {/* Example Prompt Chips */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                أمثلة سريعة للتجربة الفورية:
              </div>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(p.text)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-600 transition-colors text-right cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </p>
            )}

            {/* Submit Analyze Button */}
            <div className="flex items-center justify-end pt-2">
              <button
                id="analyze-and-register-btn"
                type="button"
                disabled={isAnalyzing}
                onClick={handleAnalyze}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-sm rounded-xl shadow-xs hover:shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>{isAnalyzing ? "جارٍ التحليل بواسطة AI..." : "✨ حلّل وسجّل"}</span>
              </button>
            </div>
          </div>

          {/* AI Extraction Preview Card (Rule #28: User must verify before saving) */}
          {extractedData && (
            <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-md p-5 sm:p-6 space-y-5 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-base font-bold text-slate-900">
                    مراجعة البيانات المستخرجة بواسطة AI قبل الحفظ
                  </h2>
                </div>
                <button
                  onClick={() => setExtractedData(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  إلغاء المراجعة
                </button>
              </div>

              {/* Editable Extracted Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Company selection */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    الشركة المعنية:
                  </label>
                  <select
                    value={extractedData.companyId}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, companyId: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Name */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    اسم العميل:
                  </label>
                  <input
                    type="text"
                    value={extractedData.customerName}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, customerName: e.target.value })
                    }
                    placeholder="اسم العميل"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                  />
                  {!extractedData.customerName && (
                    <span className="text-[10px] text-amber-600 font-medium">⚠️ لم يذكر الاسم في النص</span>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    رقم الهاتف:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={extractedData.phone}
                    onChange={(e) => {
                      const newPhone = e.target.value;
                      setExtractedData({ ...extractedData, phone: newPhone });
                      if (newPhone) {
                        const existing = findCustomerByPhone(newPhone, extractedData.companyId);
                        if (existing) setDuplicateCustomer(existing);
                      }
                    }}
                    placeholder="010XXXXXXXX"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                  />
                  {!extractedData.phone && (
                    <span className="text-[10px] text-amber-600 font-medium">⚠️ لم يذكر رقم الهاتف</span>
                  )}
                </div>

                {/* Area */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    المنطقة / المحافظة:
                  </label>
                  <input
                    type="text"
                    value={extractedData.area}
                    onChange={(e) => setExtractedData({ ...extractedData, area: e.target.value })}
                    placeholder="مثال: التجمع، الشيخ زايد..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                {/* Product Type */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">نوع المنتج المطلوب:</label>
                  <input
                    type="text"
                    value={extractedData.productType}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, productType: e.target.value })
                    }
                    placeholder="شبابيك UPVC، أبواب..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                  />
                </div>

                {/* Source */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">مصدر العميل:</label>
                  <select
                    value={extractedData.source}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        source: e.target.value as CustomerSource,
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone Call">Phone Call (اتصال)</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Website">Website</option>
                    <option value="Manual">Manual</option>
                    <option value="AI Assistant">AI Assistant</option>
                  </select>
                </div>

                {/* Interest Level */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    درجة الاهتمام:
                  </label>
                  <select
                    value={extractedData.interestLevel}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        interestLevel: e.target.value as InterestLevel,
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
                  >
                    <option value="hot">🔥 Hot (شراء فوري أو معاينة)</option>
                    <option value="warm">🟠 Warm (مهتم ويجهز)</option>
                    <option value="cold">🔵 Cold (استفسار مبدئي)</option>
                  </select>
                </div>

                {/* Stage */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">مرحلة العميل:</label>
                  <select
                    value={extractedData.stage}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        stage: e.target.value as CustomerStage,
                      })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="inquiry">استفسار جديد</option>
                    <option value="contacted">تم التواصل</option>
                    <option value="inspection">معاينة ورفع مقاسات</option>
                    <option value="quotation">عرض سعر</option>
                    <option value="negotiation">تفاوض</option>
                  </select>
                </div>

                {/* Follow up Date */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    تاريخ المتابعة القادم:
                  </label>
                  <input
                    type="date"
                    value={extractedData.suggestedFollowUp}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, suggestedFollowUp: e.target.value })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                  />
                </div>

                {/* Details Full Width */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-1">
                  <label className="font-semibold text-slate-700">ملخص وملاحظات الطلب:</label>
                  <textarea
                    rows={2}
                    value={extractedData.orderDetails}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, orderDetails: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Confirm & Save Button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  سيتم إنشاء العميل وتسجيل الاستفسار وتحديد المتابعة فوراً.
                </span>
                <button
                  id="confirm-and-save-ai-btn"
                  onClick={handleSaveExtracted}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تأكيد وحفظ في النظام</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANUAL INTAKE TAB */}
      {activeTab === "manual" && <ManualIntakeForm onSuccess={() => setSuccessSaved(true)} />}
    </div>
  );

  if (!isEmbedded && onClose) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm">تسجيل استفسار ذكي جديد (AI Intake)</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return content;
};

// Extracted sub-component for manual intake form
const ManualIntakeForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const {
    companies,
    activeCompanyId,
    addCustomer,
    addInquiry,
    addFollowUp,
    findCustomerByPhone,
  } = useApp();

  const [companyId, setCompanyId] = useState<CompanyId>(
    activeCompanyId !== "all" ? activeCompanyId : companies[0]?.id || "comp-newhouse"
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState<CustomerSource>("WhatsApp");
  const [interestLevel, setInterestLevel] = useState<InterestLevel>("warm");
  const [productType, setProductType] = useState("شبابيك وأبواب UPVC");
  const [stage, setStage] = useState<CustomerStage>("inquiry");
  const [details, setDetails] = useState("");

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [followUpDate, setFollowUpDate] = useState(tomorrowStr);

  const [duplicateWarning, setDuplicateWarning] = useState<Customer | null>(null);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (val.length >= 8) {
      const existing = findCustomerByPhone(val, companyId);
      if (existing) setDuplicateWarning(existing);
      else setDuplicateWarning(null);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("يرجى إدخال اسم العميل");
      return;
    }

    if (phone) {
      const existing = findCustomerByPhone(phone, companyId);
      if (existing) {
        setDuplicateWarning(existing);
        return;
      }
    }

    const createdCust = addCustomer({
      companyId,
      name,
      phone: phone || "بدون هاتف",
      secondaryPhone,
      area,
      address,
      source,
      interestLevel,
      stage,
      notes: details,
      nextFollowUpDate: followUpDate,
    });

    addInquiry({
      companyId,
      customerId: createdCust.id,
      customerName: createdCust.name,
      customerPhone: createdCust.phone,
      productType,
      details,
      source,
      interestLevel,
      stage,
      nextFollowUpDate: followUpDate,
    });

    if (followUpDate) {
      addFollowUp({
        companyId,
        customerId: createdCust.id,
        customerName: createdCust.name,
        customerPhone: createdCust.phone,
        dueDate: followUpDate,
        time: "12:00",
        title: `متابعة: ${productType}`,
        notes: details,
        status: "pending",
        priority: interestLevel === "hot" ? "high" : "medium",
      });
    }

    onSuccess();
    setName("");
    setPhone("");
    setSecondaryPhone("");
    setArea("");
    setAddress("");
    setDetails("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5"
    >
      {duplicateWarning && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <span>⚠️ هذا الهاتف مسجل مسبقاً باسم: <strong>{duplicateWarning.name}</strong></span>
          <button
            type="button"
            onClick={() => alert(`العميل مسجل مسبقاً: ${duplicateWarning.name} (${duplicateWarning.area})`)}
            className="text-amber-800 underline font-bold cursor-pointer"
          >
            عرض التفاصيل
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Company */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700">الشركة:</label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Name */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700">اسم العميل *:</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الثلاثي أو الثنائي"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label className="font-bold text-slate-700">رقم الهاتف الرئيسي:</label>
          <input
            type="text"
            dir="ltr"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="010XXXXXXXX"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
          />
        </div>

        {/* Secondary Phone */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700">رقم إضافي (اختياري):</label>
          <input
            type="text"
            dir="ltr"
            value={secondaryPhone}
            onChange={(e) => setSecondaryPhone(e.target.value)}
            placeholder="رقم آخر أو أرضي"
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        {/* Area */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700">المنطقة:</label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="التجمع، زايد، نصر، المعادي..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        {/* Source */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700">مصدر العميل:</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as CustomerSource)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="WhatsApp">WhatsApp</option>
            <option value="Phone Call">Phone Call (هاتف)</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
            <option value="Website">Website</option>
            <option value="Manual">Manual</option>
            <option value="Excel Import">Excel Import</option>
            <option value="AI Assistant">AI Assistant</option>
          </select>
        </div>

        {/* Product Type */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700">نوع المنتج:</label>
          <input
            type="text"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            placeholder="شبابيك UPVC عازل، أبواب، شيش..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          />
        </div>

        {/* Interest Level */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700">درجة الاهتمام:</label>
          <select
            value={interestLevel}
            onChange={(e) => setInterestLevel(e.target.value as InterestLevel)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
          >
            <option value="hot">🔥 Hot (قريب من الشراء / مستعجل)</option>
            <option value="warm">🟠 Warm (مهتم ومحتاج متابعة)</option>
            <option value="cold">🔵 Cold (اهتمام ضعيف أو بعيد)</option>
          </select>
        </div>

        {/* Next Follow Up */}
        <div className="space-y-1">
          <label className="font-semibold text-slate-700">موعد المتابعة القادم:</label>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
          />
        </div>

        {/* Address */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-1">
          <label className="font-semibold text-slate-700">العنوان التفصيلي (اختياري):</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="الشارع، رقم العمارة، الشقة أو الفيلا..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        {/* Details */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-1">
          <label className="font-semibold text-slate-700">تفاصيل الطلب والملاحظات:</label>
          <textarea
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="المقاسات التقريبية، عدد الفتحات، رغبة العميل في عزل الصوت والحرارة..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t border-slate-100">
        <button
          type="submit"
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
        >
          حفظ وتسجيل الاستفسار
        </button>
      </div>
    </form>
  );
};
