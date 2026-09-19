import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Opportunity } from "../../types";
import {
  X,
  Trophy,
  XCircle,
  DollarSign,
  Calendar,
  AlertCircle,
  FileText,
  CheckCircle2,
  Building2,
  User,
} from "lucide-react";

interface CloseDealModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CloseDealModal: React.FC<CloseDealModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    closeDealWon,
    closeDealLost,
    lossReasons,
    companies,
    showToast,
  } = useApp();

  const [closeType, setCloseType] = useState<"won" | "lost">("won");

  // Won fields
  const [dealAmount, setDealAmount] = useState<number>(0);
  const [dealDate, setDealDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [wonNotes, setWonNotes] = useState<string>("");

  // Lost fields
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [lossNotes, setLossNotes] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (opportunity) {
      setDealAmount(opportunity.expectedValue || 0);
      setDealDate(new Date().toISOString().split("T")[0]);
      setWonNotes("");
      setSelectedReason("");
      setCustomReason("");
      setLossNotes("");
      setErrorMsg("");
      setCloseType(opportunity.status === "lost" ? "lost" : "won");
    }
  }, [opportunity, isOpen]);

  if (!isOpen || !opportunity) return null;

  const comp = companies.find((c) => c.id === opportunity.companyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      if (closeType === "won") {
        if (dealAmount <= 0) {
          setErrorMsg("يرجى إدخال قيمة صحيحة للصفقة");
          setIsSubmitting(false);
          return;
        }
        const res = closeDealWon(opportunity.id, {
          amount: dealAmount,
          date: dealDate,
          notes: wonNotes,
        });
        if (res.success) {
          onSuccess?.();
          onClose();
        } else {
          setIsSubmitting(false);
        }
      } else {
        const finalReason =
          selectedReason === "سبب آخر" ? customReason.trim() : selectedReason.trim();

        if (!finalReason) {
          setErrorMsg("سبب الخسارة إلزامي ولا يمكن إغلاق الصفقة بدونه!");
          setIsSubmitting(false);
          return;
        }

        const res = closeDealLost(opportunity.id, {
          lossReason: finalReason,
          lossNotes: lossNotes.trim(),
        });
        if (res.success) {
          onSuccess?.();
          onClose();
        } else {
          setIsSubmitting(false);
        }
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const standardReasons = [
    "السعر",
    "اختار شركة أخرى",
    "لم يعد مهتمًا",
    "تأجيل",
    "عدم الرد",
    "مشكلة في المنتج",
    "مشكلة في التنفيذ/المدة",
    "سبب آخر",
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-[#18191B] text-[#EDEDED] rounded-3xl max-w-lg w-full shadow-2xl border border-[#292B2E] overflow-hidden my-8 animate-in fade-in">
        {/* Header */}
        <div
          className={`p-5 text-white flex items-center justify-between border-b ${
            closeType === "won"
              ? "bg-[#111111] border-emerald-800/40"
              : "bg-[#111111] border-rose-800/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`p-2.5 rounded-2xl ${
                closeType === "won"
                  ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/40"
                  : "bg-rose-950/70 text-rose-400 border border-rose-800/40"
              }`}
            >
              {closeType === "won" ? (
                <Trophy className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
            </span>
            <div>
              <h3 className="font-black text-lg text-[#EDEDED]">إغلاق الصفقة (Deal Closing)</h3>
              <p className="text-xs text-[#A1A1AA]">
                {opportunity.title} — {comp?.name || "الشركة"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A1A1AA] hover:text-[#EDEDED] p-1 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Opportunity Context Bar */}
        <div className="bg-[#202225] px-5 py-3 border-b border-[#292B2E] flex items-center justify-between text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-[#C8A75A]" />
            <span className="font-bold text-[#EDEDED]">
              {opportunity.customerScope === "all"
                ? "نطاق عام (جميع العملاء)"
                : opportunity.customerName || "عميل محدد"}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span>القيمة المتوقعة:</span>
            <strong className="text-emerald-400 font-bold">
              {(opportunity.expectedValue || 0).toLocaleString()} ج.م
            </strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Toggle Won vs Lost */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-[#202225] border border-[#292B2E] rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setCloseType("won");
                setErrorMsg("");
              }}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                closeType === "won"
                  ? "bg-emerald-600 text-white shadow-md scale-[1.01]"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Won — تم التعاقد</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCloseType("lost");
                setErrorMsg("");
              }}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                closeType === "lost"
                  ? "bg-rose-600 text-white shadow-md scale-[1.01]"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>Lost — خسارة</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/40 text-rose-400 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}

          {/* Won Mode Form */}
          {closeType === "won" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تأكيد التعاقد وتسجيل البيع</span>
                </div>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                  سيتم تسجيل الفرصة كـ Won، وإنشاء سجل بيع رسمي للشركة، وتحديث
                  مؤشرات الأداء البيعي مع منع تكرار البيع.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#EDEDED] flex items-center justify-between">
                  <span>قيمة الصفقة الفعلية (ج.م) *</span>
                  <span className="text-[11px] text-[#A1A1AA] font-normal">
                    المتوقع: {(opportunity.expectedValue || 0).toLocaleString()} ج.م
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={1}
                    value={dealAmount}
                    onChange={(e) => setDealAmount(Number(e.target.value))}
                    className="w-full p-3 pl-10 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-mono font-bold text-sm focus:border-[#C8A75A] outline-hidden"
                  />
                  <DollarSign className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#EDEDED]">تاريخ التعاقد:</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={dealDate}
                    onChange={(e) => setDealDate(e.target.value)}
                    className="w-full p-3 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl font-mono focus:border-[#C8A75A] outline-hidden"
                  />
                  <Calendar className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#EDEDED]">
                  ملاحظات التعاقد (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={wonNotes}
                  onChange={(e) => setWonNotes(e.target.value)}
                  placeholder="أي تفاصيل خاصة بالدفعة المقدمة أو جدول التوريد..."
                  className="w-full p-3 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-[#C8A75A] outline-hidden resize-none placeholder-[#6B7280]"
                />
              </div>
            </div>
          )}

          {/* Lost Mode Form */}
          {closeType === "lost" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-rose-950/40 border border-rose-800/40 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>تحديد سبب الخسارة إلزامي</span>
                </div>
                <p className="text-[11px] text-rose-300/80 leading-relaxed">
                  الرجاء تحديد السبب الفعلي لخسارة الصفقة بدقة، حيث يُستخدم في
                  تحليلات أسباب الخسارة (Lost Reasons Analytics).
                </p>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-[#EDEDED]">
                  سبب الخسارة الرئيسي * (إلزامي):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {standardReasons.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setSelectedReason(reason)}
                        className={`p-2.5 rounded-xl border text-right font-bold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-[#202225] text-[#EDEDED] border-[#292B2E] hover:border-rose-500"
                        }`}
                      >
                        {reason}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedReason === "سبب آخر" && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="font-bold text-[#EDEDED]">
                    اكتب سبب الخسارة بالتفصيل *:
                  </label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="اكتب السبب غير المدرج في القائمة..."
                    className="w-full p-3 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-rose-500 outline-hidden placeholder-[#6B7280]"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-[#EDEDED]">
                  ملاحظات إضافية حول الخسارة (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={lossNotes}
                  onChange={(e) => setLossNotes(e.target.value)}
                  placeholder="ملاحظات تفصيلية يستفاد منها في خطة المبيعات وتطوير المنتج..."
                  className="w-full p-3 bg-[#202225] border border-[#292B2E] text-[#EDEDED] rounded-xl focus:border-rose-500 outline-hidden resize-none placeholder-[#6B7280]"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#292B2E]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-[#A1A1AA] hover:text-[#EDEDED] rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-md transition-all ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              } ${
                closeType === "won"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {isSubmitting ? "جاري الإغلاق..." : closeType === "won" ? "تأكيد التعاقد (Won)" : "تأكيد الإغلاق كخسارة (Lost)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
