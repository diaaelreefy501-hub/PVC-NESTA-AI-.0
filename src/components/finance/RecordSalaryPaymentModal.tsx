import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Employee, PaymentMethod } from "../../types";
import { Banknote, X, CheckCircle2, Calendar, FileText } from "lucide-react";

interface RecordSalaryPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  period: string; // e.g. "2026-09"
  remainingSalary?: number;
}

export const RecordSalaryPaymentModal: React.FC<RecordSalaryPaymentModalProps> = ({
  isOpen,
  onClose,
  employee,
  period,
  remainingSalary = 0,
}) => {
  const {
    filteredEmployees,
    companies,
    recordSalaryPayment,
    showToast,
    currentUser,
  } = useApp();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(employee?.id || "");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(period || new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState<number | "">(remainingSalary > 0 ? remainingSalary : "");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  if (!isOpen) return null;

  const targetEmployee = employee || filteredEmployees.find((e) => e.id === selectedEmpId);
  const employeeCompany = companies.find((c) => c.id === targetEmployee?.companyId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployee) {
      showToast("يرجى اختيار الموظف المراد صرف الراتب له", "warning");
      return;
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      showToast("يرجى إدخال مبلغ صحيح للصرف", "warning");
      return;
    }

    if (remainingSalary > 0 && payAmount > remainingSalary) {
      showToast(`لا يمكن صرف مبلغ (${payAmount.toLocaleString()} ج.م) يتجاوز الراتب المتبقي المستحق (${remainingSalary.toLocaleString()} ج.م). لمنع الرصيد السالب.`, "warning");
      return;
    }

    recordSalaryPayment({
      employeeId: targetEmployee.id,
      companyId: targetEmployee.companyId,
      period: selectedPeriod,
      amount: payAmount,
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || `SAL-${Date.now().toString().slice(-6)}`,
      notes: notes.trim() || `صرف راتب شهر ${selectedPeriod} للموظف ${targetEmployee.name}`,
      status: "paid",
      createdByName: currentUser?.name || "المسؤول المالي",
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150">
      <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#EDEDED]">تسجيل حركة صرف راتب</h3>
              <p className="text-[11px] text-[#A1A1AA]">
                صرف مسير رواتب موثق مع ربط كامل بالشركة وسجل الفترة المالية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#202225] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Employee Selection */}
          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">الموظف المستحق *</label>
            {employee ? (
              <div className="p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#EDEDED]">{employee.name}</span>
                  <span className="text-[11px] text-[#A1A1AA] mr-2">({employee.role})</span>
                </div>
                {employeeCompany && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: `${employeeCompany.color}20`,
                      color: employeeCompany.color || "#C8A75A",
                    }}
                  >
                    {employeeCompany.name}
                  </span>
                )}
              </div>
            ) : (
              <select
                required
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  const emp = filteredEmployees.find((item) => item.id === e.target.value);
                  if (emp) {
                    setAmount(emp.monthlySalary);
                  }
                }}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="">-- اختر الموظف --</option>
                {filteredEmployees.map((emp) => {
                  const comp = companies.find((c) => c.id === emp.companyId);
                  return (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({comp?.name || "شركة غير محددة"}) - الراتب: {emp.monthlySalary.toLocaleString()} ج.م
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A1A1AA] mb-1 font-semibold">فترة الراتب (الشهر/السنة) *</label>
              <div className="relative">
                <input
                  type="month"
                  required
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#A1A1AA] mb-1 font-semibold">تاريخ الصرف الفعلي *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A1A1AA] mb-1 font-semibold">المبلغ المنصرف (ج.م) *</label>
              <input
                type="number"
                required
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-emerald-400 font-mono font-bold text-sm outline-hidden focus:border-emerald-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-[#A1A1AA] mb-1 font-semibold">طريقة الصرف *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="bank_transfer">🏦 تحويل بنكي</option>
                <option value="cash">💵 نقدًا (خزينة)</option>
                <option value="instapay">⚡ إنستاباي (InstaPay)</option>
                <option value="cheque">📝 شيك بنكي</option>
                <option value="vodafone_cash">📱 محفظة إلكترونية</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">رقم المرجع / التحويل / السند</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500 font-mono"
              placeholder="تلقائي إن تُرِك فارغاً"
            />
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">ملاحظات الصرف</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500"
              placeholder="مثال: تحويل راتب الشهر لحساب الموظف في البنك الأهلي..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#292B2E]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#202225] hover:bg-[#292B2E] text-[#A1A1AA] rounded-xl font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد وصرف الراتب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
