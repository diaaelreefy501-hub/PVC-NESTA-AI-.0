import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Employee, Contract, PaymentMethod } from "../../types";
import { Percent, X, CheckCircle2, FileText, Info } from "lucide-react";

interface RecordCommissionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  initialContract?: Contract | null;
  period: string; // e.g. "2026-09"
  remainingCommission?: number;
}

export const RecordCommissionPaymentModal: React.FC<RecordCommissionPaymentModalProps> = ({
  isOpen,
  onClose,
  employee,
  initialContract,
  period,
  remainingCommission = 0,
}) => {
  const {
    filteredEmployees,
    filteredContracts,
    companies,
    recordCommissionPayment,
    showToast,
    currentUser,
  } = useApp();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(employee?.id || "");
  const [selectedContractId, setSelectedContractId] = useState<string>(initialContract?.id || "");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(period || new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState<number | "">(remainingCommission > 0 ? remainingCommission : "");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const targetEmployee = employee || filteredEmployees.find((e) => e.id === selectedEmpId);
  const employeeCompany = companies.find((c) => c.id === targetEmployee?.companyId);

  // Contracts attributed to this employee or company
  const relevantContracts = filteredContracts.filter((c) => {
    if (!targetEmployee) return true;
    return (
      c.salesRep === targetEmployee.name ||
      c.assignedTo === targetEmployee.name ||
      c.companyId === targetEmployee.companyId
    );
  });

  const selectedContract = filteredContracts.find((c) => c.id === selectedContractId);

  // Compute contract commission details
  const contractCommissionDetails = React.useMemo(() => {
    if (!selectedContract) return null;
    const comp = companies.find((c) => c.id === selectedContract.companyId);
    
    // Use employee's specific rate if set, otherwise fallback to company rate
    const rate = (targetEmployee?.commissionPercentage !== undefined && targetEmployee.commissionPercentage > 0)
      ? targetEmployee.commissionPercentage
      : (comp?.commissionRate || 2.5);

    const totalVal = selectedContract.totalValue || 0;
    const paidAmt = selectedContract.paidAmount || 0;
    const earned = Math.round((totalVal * rate) / 100);
    return {
      rate,
      totalVal,
      paidAmt,
      earned,
    };
  }, [selectedContract, companies, targetEmployee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployee) {
      showToast("يرجى اختيار الموظف المستحق للعمولة", "warning");
      return;
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      showToast("يرجى إدخال مبلغ عمولة صحيح", "warning");
      return;
    }

    const contractSourceDesc = selectedContract
      ? `عقد رقم ${selectedContract.contractNumber || selectedContract.id.slice(0, 8)} - العميل: ${selectedContract.customerName}`
      : "حافز أداء ومبيعات عام";

    recordCommissionPayment({
      employeeId: targetEmployee.id,
      companyId: targetEmployee.companyId,
      contractId: selectedContractId || undefined,
      period: selectedPeriod,
      amount: payAmount,
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || `COMM-${Date.now().toString().slice(-6)}`,
      notes: notes.trim() || `صرف عمولة مبيعات عن ${contractSourceDesc}`,
      status: "paid",
      createdByName: currentUser?.name || "المسؤول المالي",
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150">
      <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#EDEDED]">تسجيل صرف عمولة مبيعات</h3>
              <p className="text-[11px] text-[#A1A1AA]">
                توثيق صرف العمولة وربطها المباشر بالعقد ونسبة الاستحقاق
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
            <label className="block text-[#A1A1AA] mb-1 font-semibold">الموظف المستحق للعمولة *</label>
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
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-amber-500 cursor-pointer"
              >
                <option value="">-- اختر الموظف --</option>
                {filteredEmployees.map((emp) => {
                  const comp = companies.find((c) => c.id === emp.companyId);
                  return (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({comp?.name || "شركة غير محددة"})
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Contract Source Linkage */}
          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">
              مصدر العمولة (العقد المرتبط)
            </label>
            <select
              value={selectedContractId}
              onChange={(e) => {
                setSelectedContractId(e.target.value);
                const ctr = filteredContracts.find((c) => c.id === e.target.value);
                if (ctr) {
                  const comp = companies.find((c) => c.id === ctr.companyId);
                  const rate = comp?.commissionRate || 2.5;
                  const earned = Math.round(((ctr.totalValue || 0) * rate) / 100);
                  setAmount(earned);
                }
              }}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="">-- حافز مبيعات عام / بدون ربط بعقد محدد --</option>
              {relevantContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  عقد {c.contractNumber || c.id.slice(0, 8)} - {c.customerName} (قيمة العقد: {(c.totalValue || 0).toLocaleString()} ج.م)
                </option>
              ))}
            </select>
          </div>

          {/* Mathematical Proof of Commission if Contract is chosen */}
          {contractCommissionDetails && (
            <div className="bg-[#202225] border border-amber-900/30 p-3 rounded-xl space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Info className="w-3.5 h-3.5" />
                <span>حساب استحقاق العمولة بناءً على العقد:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="bg-[#18191B] p-1.5 rounded-lg border border-[#292B2E]">
                  <div className="text-[#71717A] text-[10px]">قيمة العقد</div>
                  <div className="text-[#EDEDED] font-bold">{contractCommissionDetails.totalVal.toLocaleString()} ج.م</div>
                </div>
                <div className="bg-[#18191B] p-1.5 rounded-lg border border-[#292B2E]">
                  <div className="text-[#71717A] text-[10px]">نسبة العمولة</div>
                  <div className="text-[#C8A75A] font-bold">{contractCommissionDetails.rate}%</div>
                </div>
                <div className="bg-[#18191B] p-1.5 rounded-lg border border-[#292B2E]">
                  <div className="text-[#71717A] text-[10px]">إجمالي المستحق</div>
                  <div className="text-emerald-400 font-bold">{contractCommissionDetails.earned.toLocaleString()} ج.م</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A1A1AA] mb-1 font-semibold">فترة الاستحقاق (الشهر/السنة) *</label>
              <input
                type="month"
                required
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[#A1A1AA] mb-1 font-semibold">تاريخ الصرف الفعلي *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-amber-500"
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
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-amber-400 font-mono font-bold text-sm outline-hidden focus:border-amber-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-[#A1A1AA] mb-1 font-semibold">طريقة الصرف *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-amber-500 cursor-pointer"
              >
                <option value="cash">💵 نقدًا (خزينة)</option>
                <option value="bank_transfer">🏦 تحويل بنكي</option>
                <option value="instapay">⚡ إنستاباي (InstaPay)</option>
                <option value="vodafone_cash">📱 محفظة إلكترونية</option>
                <option value="cheque">📝 شيك بنكي</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">رقم السند / الشيك / العملية</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-amber-500 font-mono"
              placeholder="تلقائي إن تُرِك فارغاً"
            />
          </div>

          <div>
            <label className="block text-[#A1A1AA] mb-1 font-semibold">بيان وملاحظات صرف العمولة</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-amber-500"
              placeholder="مثال: صرف عمولة إغلاق عقد قطاعات PVC..."
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
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد وصرف العمولة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
