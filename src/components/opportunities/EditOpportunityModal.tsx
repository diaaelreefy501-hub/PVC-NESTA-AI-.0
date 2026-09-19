import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  Opportunity,
  OpportunityStage,
  OpportunityStatus,
  InterestLevel,
  CompanyId,
  CustomerSource,
} from "../../types";
import {
  X,
  Save,
  DollarSign,
  Target,
  FileText,
  User,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Flame,
  Clock,
  AlertCircle,
  Trophy,
  XCircle,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { OPPORTUNITY_STAGES_CONFIG } from "../../utils/salesOperations";

interface EditOpportunityModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditOpportunityModal: React.FC<EditOpportunityModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { updateOpportunity, companies, users, showToast } = useApp();

  const [title, setTitle] = useState("");
  const [expectedValue, setExpectedValue] = useState<number>(0);
  const [stage, setStage] = useState<OpportunityStage>("qualified");
  const [status, setStatus] = useState<OpportunityStatus>("open");
  const [companyId, setCompanyId] = useState<CompanyId>("all");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [area, setArea] = useState("");
  const [productType, setProductType] = useState("");
  const [temperature, setTemperature] = useState<InterestLevel>("warm");
  const [source, setSource] = useState<CustomerSource>("WhatsApp");
  const [assignedTo, setAssignedTo] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [lossNotes, setLossNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (opportunity) {
      setTitle(opportunity.title || "");
      setExpectedValue(opportunity.expectedValue || 0);
      setStage(opportunity.stage || "qualified");
      setStatus(opportunity.status || "open");
      setCompanyId(opportunity.companyId);
      setCustomerName(opportunity.customerName || "");
      setCustomerPhone(opportunity.customerPhone || "");
      setArea(opportunity.area || "");
      setProductType(opportunity.productType || "");
      setTemperature(opportunity.temperature || "warm");
      setSource(opportunity.source || "WhatsApp");
      setAssignedTo(opportunity.assignedTo || "");
      setNextAction(opportunity.nextAction || "");
      setNextFollowUpDate(opportunity.nextFollowUpDate || "");
      setLossReason(opportunity.lossReason || "");
      setLossNotes(opportunity.lossNotes || "");
      setNotes(opportunity.notes || "");
    }
  }, [opportunity, isOpen]);

  if (!isOpen || !opportunity) return null;

  const handleStatusChange = (newStatus: OpportunityStatus) => {
    setStatus(newStatus);
    if (newStatus === "won") {
      setStage("won");
      setNextAction("صفقة رابحة - تم إبرام التعاقد");
    } else if (newStatus === "lost") {
      setStage("lost");
      setNextAction("صفقة مغلقة بالخسارة");
    } else {
      if (stage === "won" || stage === "lost") {
        setStage("qualified");
        setNextAction("إعادة فتح الفرصة والمتابعة");
      }
    }
  };

  const handleStageChange = (newStage: OpportunityStage) => {
    setStage(newStage);
    const config = OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === newStage);
    if (config) {
      setNextAction(config.defaultAction);
    }
    if (newStage === "won") {
      setStatus("won");
    } else if (newStage === "lost") {
      setStatus("lost");
    } else {
      setStatus("open");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      showToast("يرجى إدخال عنوان الفرصة", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateOpportunity(opportunity.id, {
        title,
        expectedValue,
        stage,
        status,
        companyId,
        customerName,
        customerPhone,
        area,
        productType,
        temperature,
        source,
        assignedTo,
        nextAction,
        nextFollowUpDate,
        lossReason: status === "lost" ? lossReason : undefined,
        lossNotes: status === "lost" ? lossNotes : undefined,
        notes,
      });

      showToast("تم تحديث وحفظ بيانات الفرصة بنجاح ✅", "success");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء التحديث", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-[#18191B] text-[#EDEDED] rounded-3xl max-w-2xl w-full shadow-2xl border border-[#292B2E] overflow-hidden my-auto animate-in fade-in"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#111111] text-[#EDEDED] flex items-center justify-between border-b border-[#292B2E]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#202225] text-[#C8A75A] border border-[#292B2E]">
              <Target className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-base text-[#EDEDED]">
                تعديل الفرصة البيعية وحالتها
              </h3>
              <p className="text-xs text-[#A1A1AA]">
                التحكم الكامل بمراحل الدورة البيعية وحالة الفرصة المفتوحة والجارية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A1A1AA] hover:text-[#EDEDED] p-1.5 rounded-xl hover:bg-[#202225] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Status Selection (مفتوحة / جارية - مغلقة بربح - مغلقة بخسارة) */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-[#202225] border border-[#292B2E]">
            <label className="font-bold text-[#EDEDED] block mb-1">
              حالة الفرصة البيعية الرئيسية:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange("open")}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === "open"
                    ? "bg-[#C8A75A] text-[#111111] shadow-xs font-black"
                    : "bg-[#18191B] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>مفتوحة / جارية</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("won")}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === "won"
                    ? "bg-emerald-600 text-white shadow-xs font-black"
                    : "bg-[#18191B] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>مغلقة بنجاح (Won)</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("lost")}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status === "lost"
                    ? "bg-rose-600 text-white shadow-xs font-black"
                    : "bg-[#18191B] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>مفقودة (Lost)</span>
              </button>
            </div>
          </div>

          {/* Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED]">عنوان الفرصة البيعية *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED]">الشركة التابعة</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value as CompanyId)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden cursor-pointer font-bold"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED] flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#A1A1AA]" />
                اسم العميل
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED] flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#A1A1AA]" />
                رقم الهاتف
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                dir="ltr"
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-mono focus:border-[#C8A75A] outline-hidden"
              />
            </div>
          </div>

          {/* Stage & Expected Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED]">المرحلة البيعية (Stage) *</label>
              <select
                value={stage}
                onChange={(e) => handleStageChange(e.target.value as OpportunityStage)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] font-bold outline-hidden cursor-pointer"
              >
                {OPPORTUNITY_STAGES_CONFIG.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED]">القيمة المتوقعة (ج.م) *</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={0}
                  value={expectedValue}
                  onChange={(e) => setExpectedValue(Number(e.target.value))}
                  className="w-full p-2.5 pl-9 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-mono font-bold focus:border-[#C8A75A] outline-hidden"
                />
                <DollarSign className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Area & Product Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#A1A1AA]" />
                المنطقة / الموقع
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="مثال: الشيخ زايد، التجمع الخامس..."
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden placeholder-[#6B7280]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#A1A1AA]" />
                نوع المنتج
              </label>
              <input
                type="text"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="مثال: شبابيك UPVC، قطاعات سحاب..."
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden placeholder-[#6B7280]"
              />
            </div>
          </div>

          {/* Temperature & Assigned Salesperson */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#C8A75A]" />
                درجة اهتمام العميل
              </label>
              <select
                value={temperature}
                onChange={(e) => setTemperature(e.target.value as InterestLevel)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden cursor-pointer"
              >
                <option value="hot">🔥 حار (جاهز وفوري للتعاقد)</option>
                <option value="warm">🌤️ دافئ (مهتم ومتابع)</option>
                <option value="cold">❄️ بارد (استفسار أولي / بطيء)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED]">المسؤول / الموظف المعين</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden cursor-pointer"
              >
                <option value="">-- غير محدد --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Next Action & Next Follow-Up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED]">الإجراء القادم (Next Action)</label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="مثال: إرسال عرض السعر والتواصل بعد 48 ساعة"
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden placeholder-[#6B7280]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#EDEDED] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#A1A1AA]" />
                موعد المتابعة القادم
              </label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-mono focus:border-[#C8A75A] outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Conditional Loss Fields */}
          {status === "lost" && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/40 rounded-2xl space-y-2 animate-in fade-in">
              <div className="space-y-1">
                <label className="font-bold text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  سبب خسارة الصفقة *
                </label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-rose-500 outline-hidden font-bold"
                >
                  <option value="">اختر سبب الخسارة...</option>
                  <option value="السعر مرتفع مقارنة بالمنافسين">السعر مرتفع مقارنة بالمنافسين</option>
                  <option value="تأجيل المشروع أو الإلغاء">تأجيل المشروع أو الإلغاء</option>
                  <option value="التعاقد مع مورد آخر">التعاقد مع مورد آخر</option>
                  <option value="عدم توفر المواصفات المطلوبة">عدم توفر المواصفات المطلوبة</option>
                  <option value="عدم الجدية أو انقطاع التواصل">عدم الجدية أو انقطاع التواصل</option>
                  <option value="سبب آخر">سبب آخر</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-rose-400">ملاحظات إضافية حول الخسارة:</label>
                <input
                  type="text"
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                  placeholder="تفاصيل إضافية حول قرار العميل..."
                  className="w-full p-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl outline-hidden text-xs placeholder-[#6B7280]"
                />
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-1">
            <label className="font-bold text-[#EDEDED]">ملاحظات وتفاصيل فنية:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل أو اشتراطات خاصة بالفرصة..."
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden resize-none placeholder-[#6B7280]"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex justify-end gap-2.5 border-t border-[#292B2E]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-[#A1A1AA] hover:text-[#EDEDED] font-bold rounded-xl cursor-pointer hover:bg-[#202225] transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#C8A75A] hover:bg-[#DFC17B] text-[#111111] font-black rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات والحالة"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
