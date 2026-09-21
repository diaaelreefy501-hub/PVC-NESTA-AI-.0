import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { MonthlyStatement } from "../../types";
import { Settings, X, CheckCircle2, Info } from "lucide-react";

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
  const { updateStatementOverride, showToast } = useApp();

  const [salaryDue, setSalaryDue] = useState<number | "">("");
  const [commissionEarned, setCommissionEarned] = useState<number | "">("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (statement) {
      setSalaryDue(statement.salaryDue);
      setCommissionEarned(statement.commissionEarned);
      setNotes("");
    }
  }, [statement]);

  if (!isOpen || !statement) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateStatementOverride({
      employeeId: statement.employeeId,
      period: statement.period,
      salaryDue: salaryDue === "" ? undefined : Number(salaryDue),
      commissionEarned: commissionEarned === "" ? undefined : Number(commissionEarned),
      reason: notes.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
      <div className="bg-[#18191B] border border-[#292B2E] rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#292B2E] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#C8A75A]/10 text-[#C8A75A] border border-[#C8A75A]/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#EDEDED]">تعديل قيم استحقاق الشهر</h3>
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

        <div className="bg-[#202225] p-3 rounded-2xl border border-blue-500/20 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-[#A1A1AA] leading-relaxed">
            استخدم هذا الخيار لتعديل القيم المحسوبة تلقائياً في حال وجود استثناءات مالية خاصة بهذا الشهر لا يغطيها النظام التلقائي.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1.5 mr-1">الراتب المستحق عن الشهر (ج.م)</label>
              <input
                type="number"
                value={salaryDue}
                onChange={(e) => setSalaryDue(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full p-3 bg-[#202225] border border-[#292B2E] rounded-2xl text-[#EDEDED] font-mono font-bold outline-hidden focus:border-[#C8A75A] transition-all"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1.5 mr-1">العمولة المكتسبة المستحقة (ج.م)</label>
              <input
                type="number"
                value={commissionEarned}
                onChange={(e) => setCommissionEarned(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full p-3 bg-[#202225] border border-[#292B2E] rounded-2xl text-[#EDEDED] font-mono font-bold outline-hidden focus:border-[#C8A75A] transition-all"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#A1A1AA] mb-1.5 mr-1">ملاحظات التعديل اليدوي</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 bg-[#202225] border border-[#292B2E] rounded-2xl text-[#EDEDED] text-xs outline-hidden focus:border-[#C8A75A] transition-all min-h-[80px] resize-none"
                placeholder="اكتب سبب التعديل اليدوي هنا..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#202225] hover:bg-[#292B2E] text-[#A1A1AA] rounded-2xl text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-[1.5] py-3 bg-[#C8A75A] hover:bg-[#D4B670] text-[#18191B] rounded-2xl text-xs font-black transition-all shadow-lg shadow-[#C8A75A]/10 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ التعديلات اليدوية</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
