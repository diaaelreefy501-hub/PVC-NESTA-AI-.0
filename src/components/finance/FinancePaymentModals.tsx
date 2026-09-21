import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { SalaryPayment, CommissionPayment, CommissionAdjustment, CompanyId } from "../../types";
import { X, CheckCircle2, AlertCircle, Banknote, Percent, Trash2 } from "lucide-react";

// ==========================================
// 1. EDIT PAYMENT MODAL (Salary or Commission)
// ==========================================
interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "salary" | "commission";
  payment: SalaryPayment | CommissionPayment | null;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  type,
  payment,
}) => {
  const { updateSalaryPayment, updateCommissionPayment, showToast, recalculateStatement } = useApp();

  const [amount, setAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("تحويل بنكي");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount);
      setPaymentDate(payment.paymentDate || new Date().toISOString().split("T")[0]);
      setPaymentMethod(payment.paymentMethod || "تحويل بنكي");
      setReferenceNumber(payment.referenceNumber || "");
      setNotes(payment.notes || "");
    }
  }, [payment]);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      showToast("يرجى إدخال مبلغ صحيح أكبر من الصفر", "warning");
      return;
    }

    if (type === "salary") {
      await updateSalaryPayment({
        ...(payment as SalaryPayment),
        amount: payAmount,
        paymentDate,
        paymentMethod: paymentMethod as any,
        referenceNumber,
        notes,
      });
    } else {
      await updateCommissionPayment({
        ...(payment as CommissionPayment),
        amount: payAmount,
        paymentDate,
        paymentMethod: paymentMethod as any,
        referenceNumber,
        notes,
      });
    }

    // Trigger recalculation to keep statement status and remaining in sync
    recalculateStatement(payment.employeeId, payment.period);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
      <div className="bg-[#18191B] border border-[#292B2E] rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl border ${type === "salary" ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40" : "bg-amber-950/40 text-amber-400 border-amber-800/40"}`}>
              {type === "salary" ? <Banknote className="w-5 h-5" /> : <Percent className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#EDEDED]">
                تعديل حركة صرف {type === "salary" ? "الراتب" : "العمولة"}
              </h3>
              <p className="text-[10px] text-[#A1A1AA]">
                {payment.employeeName} • شهر {payment.period}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#202225] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">المبلغ المنصرف (ج.م) *</label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-emerald-400 font-mono font-bold outline-hidden focus:border-emerald-500"
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A1A1AA] mb-1 font-semibold">تاريخ الصرف *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] font-mono outline-hidden focus:border-[#C8A75A]"
              />
            </div>
            <div>
              <label className="block text-[#A1A1AA] mb-1 font-semibold">طريقة الصرف *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              >
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="نقداً (خزينة)">نقداً (خزينة)</option>
                <option value="شيك">شيك</option>
                <option value="فودافون كاش / محفظة">فودافون كاش / محفظة</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">رقم السند / الإيصال</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] font-mono outline-hidden focus:border-[#C8A75A]"
              placeholder="مثال: SAL-00123 أو REC-445"
            />
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">البيان / ملاحظات الصرف</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A] min-h-[60px] resize-none"
              placeholder="ملاحظات توثيق الصرف..."
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#292B2E]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#202225] hover:bg-[#292B2E] text-[#A1A1AA] rounded-xl font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-[1.5] py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. EDIT ADJUSTMENT / DEDUCTION MODAL
// ==========================================
interface EditAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustment: CommissionAdjustment | null;
}

export const EditAdjustmentModal: React.FC<EditAdjustmentModalProps> = ({
  isOpen,
  onClose,
  adjustment,
}) => {
  const { updateCommissionAdjustment, showToast, recalculateStatement } = useApp();

  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [type, setType] = useState<"deduction" | "bonus">("deduction");

  useEffect(() => {
    if (adjustment) {
      const isDed = adjustment.amount < 0 || adjustment.type === "deduction";
      setType(isDed ? "deduction" : "bonus");
      setAmount(Math.abs(adjustment.amount));
      setReason(adjustment.reason || "");
      setDate(adjustment.date || new Date().toISOString().split("T")[0]);
    }
  }, [adjustment]);

  if (!isOpen || !adjustment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      showToast("يرجى إدخال مبلغ صحيح أكبر من الصفر", "warning");
      return;
    }
    if (!reason.trim()) {
      showToast("يرجى كتابة سبب التسوية / الخصم", "warning");
      return;
    }

    const finalAmount = type === "deduction" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

    await updateCommissionAdjustment({
      ...adjustment,
      amount: finalAmount,
      type,
      reason: reason.trim(),
      date,
    });

    recalculateStatement(adjustment.employeeId, adjustment.period);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
      <div className="bg-[#18191B] border border-[#292B2E] rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl border ${type === "deduction" ? "bg-rose-950/40 text-rose-400 border-rose-800/40" : "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#EDEDED]">
                تعديل {type === "deduction" ? "الخصم" : "المكافأة / التسوية"}
              </h3>
              <p className="text-[10px] text-[#A1A1AA]">شهر الاستحقاق: {adjustment.period}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#202225] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">نوع التسوية *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("deduction")}
                className={`py-2 rounded-xl font-bold cursor-pointer transition-all border ${type === "deduction" ? "bg-rose-950/50 text-rose-400 border-rose-800" : "bg-[#202225] text-[#A1A1AA] border-[#292B2E]"}`}
              >
                خصم (-)
              </button>
              <button
                type="button"
                onClick={() => setType("bonus")}
                className={`py-2 rounded-xl font-bold cursor-pointer transition-all border ${type === "bonus" ? "bg-emerald-950/50 text-emerald-400 border-emerald-800" : "bg-[#202225] text-[#A1A1AA] border-[#292B2E]"}`}
              >
                مكافأة / إضافة (+)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">المبلغ (ج.م) *</label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              className={`w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl font-mono font-bold outline-hidden ${type === "deduction" ? "text-rose-400 focus:border-rose-500" : "text-emerald-400 focus:border-emerald-500"}`}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">السبب والبيان التوضيحي *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              placeholder="سبب الخصم أو المكافأة..."
            />
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">تاريخ التسجيل *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] font-mono outline-hidden focus:border-[#C8A75A]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#292B2E]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#202225] hover:bg-[#292B2E] text-[#A1A1AA] rounded-xl font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`flex-[1.5] py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs text-white ${type === "deduction" ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تحديث التسوية</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 3. ADD PERIOD ADJUSTMENT / DEDUCTION MODAL
// ==========================================
interface AddPeriodAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  companyId: CompanyId;
  period: string;
  defaultType?: "deduction" | "bonus";
}

export const AddPeriodAdjustmentModal: React.FC<AddPeriodAdjustmentModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  companyId,
  period,
  defaultType = "deduction",
}) => {
  const { addCommissionAdjustment, showToast, recalculateStatement, currentUser } = useApp();

  const [type, setType] = useState<"deduction" | "bonus">(defaultType);
  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    setType(defaultType);
    setAmount("");
    setReason("");
    setDate(new Date().toISOString().split("T")[0]);
  }, [defaultType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      showToast("يرجى إدخال مبلغ صحيح أكبر من الصفر", "warning");
      return;
    }
    if (!reason.trim()) {
      showToast("يرجى كتابة سبب التسوية / الخصم", "warning");
      return;
    }

    const finalAmount = type === "deduction" ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);

    await addCommissionAdjustment({
      employeeId,
      companyId,
      period,
      amount: finalAmount,
      type,
      reason: reason.trim(),
      date,
      createdBy: currentUser?.name || "المسؤول المالي",
    });

    recalculateStatement(employeeId, period);
    showToast(`تم تسجيل ${type === "deduction" ? "الخصم" : "المكافأة"} وإعادة حساب الكشف بنجاح`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
      <div className="bg-[#18191B] border border-[#292B2E] rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl border ${type === "deduction" ? "bg-rose-950/40 text-rose-400 border-rose-800/40" : "bg-emerald-950/40 text-emerald-400 border-emerald-800/40"}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#EDEDED]">
                تسجيل {type === "deduction" ? "خصم جديد" : "مكافأة / تسوية جديدة"}
              </h3>
              <p className="text-[10px] text-[#A1A1AA]">شهر الاستحقاق: {period}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#202225] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">نوع البند *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("deduction")}
                className={`py-2 rounded-xl font-bold cursor-pointer transition-all border ${type === "deduction" ? "bg-rose-950/50 text-rose-400 border-rose-800" : "bg-[#202225] text-[#A1A1AA] border-[#292B2E]"}`}
              >
                خصم على الموظف (-)
              </button>
              <button
                type="button"
                onClick={() => setType("bonus")}
                className={`py-2 rounded-xl font-bold cursor-pointer transition-all border ${type === "bonus" ? "bg-emerald-950/50 text-emerald-400 border-emerald-800" : "bg-[#202225] text-[#A1A1AA] border-[#292B2E]"}`}
              >
                مكافأة / إضافة (+)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">المبلغ (ج.م) *</label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              className={`w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl font-mono font-bold outline-hidden ${type === "deduction" ? "text-rose-400 focus:border-rose-500" : "text-emerald-400 focus:border-emerald-500"}`}
              placeholder="مثال: 500"
            />
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">السبب والبيان التوضيحي *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              placeholder={type === "deduction" ? "مثال: خصم غياب أو غرامة تأخير..." : "مثال: مكافأة تحقيق الهدف البيعي..."}
            />
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">التاريخ *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] font-mono outline-hidden focus:border-[#C8A75A]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#292B2E]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#202225] hover:bg-[#292B2E] text-[#A1A1AA] rounded-xl font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`flex-[1.5] py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs text-white ${type === "deduction" ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>إضافة التسوية وإعادة الحساب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
