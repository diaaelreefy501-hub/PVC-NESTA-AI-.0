import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { MonthlyStatement } from "../../types";
import { Settings, X, CheckCircle2, Info, AlertTriangle, ShieldCheck } from "lucide-react";

interface EditStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  statement: MonthlyStatement | null;
}

export const EditStatementModal: React.FC<EditStatementModalProps> = ({
  isOpen,
  onClose,
  statement,
}) => {
  const { updateStatementOverride, addCommissionAdjustment, recalculateStatement, showToast, currentUser } = useApp();

  const [salaryDue, setSalaryDue] = useState<number | "">("");
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | "">("");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [auditReason, setAuditReason] = useState<string>("");

  const isApproved = statement?.status === 'approved';

  useEffect(() => {
    if (statement) {
      setSalaryDue(statement.salaryDue);
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setNotes(statement.notes || "");
      setAuditReason("");
    }
  }, [statement]);

  if (!isOpen || !statement) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isApproved && !auditReason.trim()) {
      showToast("الكشف معتمد رسمياً: يجب إدخال سبب التعديل الإداري لتوثيقه في سجل التدقيق المالي", "warning");
      return;
    }

    // 1. If an adjustment amount is provided, record it as a formal adjustment
    if (adjustmentAmount !== "" && Number(adjustmentAmount) !== 0) {
      if (!adjustmentReason.trim()) {
        showToast("يرجى كتابة سبب التسوية / الخصم / المكافأة", "warning");
        return;
      }
      await addCommissionAdjustment({
        employeeId: statement.employeeId,
        companyId: statement.companyId,
        period: statement.period,
        amount: Number(adjustmentAmount),
        reason: adjustmentReason.trim(),
        type: Number(adjustmentAmount) < 0 ? "deduction" : "bonus",
        date: new Date().toISOString().split("T")[0],
        createdBy: currentUser?.name || "المسؤول المالي",
      });
    }

    // 2. Update statement salary or notes if changed
    const reasonText = [notes.trim(), auditReason.trim() ? `[تعديل معتمد: ${auditReason.trim()}]` : ""].filter(Boolean).join(" | ");

    updateStatementOverride({
      employeeId: statement.employeeId,
      period: statement.period,
      salaryDue: salaryDue === "" ? undefined : Number(salaryDue),
      reason: reasonText,
    });

    // 3. Recalculate statement to ensure all derived values stay synchronized
    recalculateStatement(statement.employeeId, statement.period);

    showToast("تم حفظ التعديلات وإعادة حساب الكشف بنجاح", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
      <div className="bg-[#18191B] border border-[#292B2E] rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#292B2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#C8A75A]/10 text-[#C8A75A] border border-[#C8A75A]/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#EDEDED]">تعديل كشف الحساب المالي</h3>
              <p className="text-[11px] text-[#A1A1AA]">{statement.period} - {statement.employeeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#202225] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isApproved ? (
          <div className="bg-amber-950/40 p-3.5 rounded-2xl border border-amber-800/50 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-300">الكشف معتمد رسمياً (Approved)</p>
              <p className="text-[10px] text-amber-200/80 leading-relaxed">
                أي تعديل على كشف معتمد يتطلب توثيق سبب التعديل الإداري وسيتم تسجيله بصورة كاملة في سجل التدقيق (Audit Log) لمنع التغيير الصامت.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#202225] p-3 rounded-2xl border border-blue-500/20 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
              وفقاً للقواعد المالية، يتم اشتقاق العمولة وصافي المستحق آلياً من العقود والتسويات المسجلة. يمكنك تعديل الراتب أو تسجيل تسوية/خصم موثقة.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1.5 mr-1">الراتب الأساسي للشهر (ج.م)</label>
              <input
                type="number"
                value={salaryDue}
                onChange={(e) => setSalaryDue(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] font-mono font-bold text-xs outline-hidden focus:border-[#C8A75A] transition-all"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1.5 mr-1">إضافة تسوية/مكافأة أو خصم (ج.م)</label>
              <input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-amber-400 font-mono font-bold text-xs outline-hidden focus:border-[#C8A75A] transition-all"
                placeholder="موجب للمكافأة، سالب للخصم"
              />
            </div>
          </div>

          {adjustmentAmount !== "" && Number(adjustmentAmount) !== 0 && (
            <div>
              <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1.5 mr-1">سبب التسوية / الخصم *</label>
              <input
                type="text"
                required
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-amber-800/40 rounded-xl text-[#EDEDED] text-xs outline-hidden focus:border-amber-500 transition-all"
                placeholder="مثال: خصم تأخير أو مكافأة أداء استثنائية..."
              />
            </div>
          )}

          {isApproved && (
            <div>
              <label className="block text-[11px] font-bold text-amber-400 mb-1.5 mr-1">
                مبرر التعديل على الكشف المعتمد (إلزامي للتدقيق) *
              </label>
              <textarea
                required
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-amber-800/50 rounded-xl text-[#EDEDED] text-xs outline-hidden focus:border-amber-400 transition-all min-h-[60px] resize-none"
                placeholder="سبب إجراء التعديل بعد اعتماد الكشف رسميًا..."
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1.5 mr-1">ملاحظات عامة</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] text-xs outline-hidden focus:border-[#C8A75A] transition-all"
              placeholder="ملاحظات إدارية اختيارية..."
            />
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#202225] hover:bg-[#292B2E] text-[#A1A1AA] rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-[1.5] py-2.5 bg-[#C8A75A] hover:bg-[#D4B670] text-[#18191B] rounded-xl text-xs font-black transition-all shadow-lg shadow-[#C8A75A]/10 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ وتحديث الكشف</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
