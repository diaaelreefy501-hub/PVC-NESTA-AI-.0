import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { Employee, Contract, MonthlyStatement } from "../../types";
import {
  X,
  User,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  Percent,
  Banknote,
  History,
  AlertCircle,
  Edit,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Settings,
  Info,
} from "lucide-react";
import { EditStatementModal } from "./EditStatementModal";
import { RecordSalaryPaymentModal } from "./RecordSalaryPaymentModal";
import { RecordCommissionPaymentModal } from "./RecordCommissionPaymentModal";

interface EmployeeFinanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  period: string; // "YYYY-MM" or "YYYY"
}

export const EmployeeFinanceDetailModal: React.FC<EmployeeFinanceDetailModalProps> = ({
  isOpen,
  onClose,
  employee,
  period,
}) => {
  const {
    companies,
    filteredContracts,
    salaryPayments,
    commissionPayments,
    updateEmployeeSalary,
    deleteSalaryPayment,
    deleteCommissionPayment,
    addCommissionAdjustment,
    deleteCommissionAdjustment,
    approveStatement,
    recalculateStatement,
    showToast,
    employeeStatements,
    auditLogs,
  } = useApp();

  const statements = useMemo(() => employeeStatements[employee.id] || [], [employeeStatements, employee.id]);

  const currentStatement = useMemo(() => {
    if (!period || period === "all") return null;
    return statements.find(s => s.period === period);
  }, [statements, period]);

  const summaryData = useMemo(() => {
    if (currentStatement) {
      return {
        salaryDue: currentStatement.salaryDue,
        salaryPaid: currentStatement.salaryPaid,
        salaryRemaining: Math.max(0, currentStatement.salaryDue - currentStatement.salaryPaid),
        commEarned: currentStatement.commissionEarned,
        commPaid: currentStatement.paidCommission,
        commRemaining: Math.max(0, currentStatement.commissionEarned - currentStatement.paidCommission),
        totalDue: currentStatement.totalDue,
        totalPaid: currentStatement.totalPaid,
        totalRemaining: currentStatement.remaining
      };
    }

    // Fallback/All periods logic
    const totalSalaryDue = statements.reduce((sum, s) => sum + s.salaryDue, 0);
    const totalSalaryPaid = statements.reduce((sum, s) => sum + s.salaryPaid, 0);
    const totalCommEarned = statements.reduce((sum, s) => sum + s.commissionEarned, 0);
    const totalCommPaid = statements.reduce((sum, s) => sum + s.paidCommission, 0);
    const totalBonuses = statements.reduce((sum, s) => sum + s.bonuses, 0);
    const totalDeductions = statements.reduce((sum, s) => sum + s.deductions, 0);
    
    const totalDue = totalSalaryDue + totalCommEarned + totalBonuses - totalDeductions;
    const totalPaid = totalSalaryPaid + totalCommPaid;
    
    return {
      salaryDue: totalSalaryDue,
      salaryPaid: totalSalaryPaid,
      salaryRemaining: Math.max(0, totalSalaryDue - totalSalaryPaid),
      commEarned: totalCommEarned,
      commPaid: totalCommPaid,
      commRemaining: Math.max(0, totalCommEarned - totalCommPaid),
      totalDue,
      totalPaid,
      totalRemaining: Math.max(0, totalDue - totalPaid)
    };
  }, [statements, currentStatement]);

  const [activeTab, setActiveTab] = useState<"statements" | "contracts" | "salary_history" | "salary_payments" | "commission_payments" | "commission_adjustments" | "audit_log">("statements");

  // Modals for actions
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [targetContractForCommission, setTargetContractForCommission] = useState<Contract | null>(null);

  // Statement view state
  const [isEditStatementModalOpen, setIsEditStatementModalOpen] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<MonthlyStatement | null>(null);
  const [expandedStatement, setExpandedStatement] = useState<string | null>(null);

  // New salary adjustment form state
  const [isAddingSalaryAdj, setIsAddingSalaryAdj] = useState(false);
  const [newSalaryAmount, setNewSalaryAmount] = useState<number | "">("");
  const [effectivePeriod, setEffectivePeriod] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [adjustmentNotes, setAdjustmentNotes] = useState("");

  // New commission adjustment form state
  const [isAddingCommissionAdj, setIsAddingCommissionAdj] = useState(false);
  const [newCommissionAdjAmount, setNewCommissionAdjAmount] = useState<number | "">("");
  const [adjPeriod, setAdjPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [commissionAdjReason, setCommissionAdjReason] = useState("");

  if (!isOpen || !employee) return null;

  const employeeCompany = companies.find((c) => c.id === employee.companyId);

  // 1. Employee Salary History
  const salaryHistory = employee.salaryHistory || [
    {
      id: "init",
      employeeId: employee.id,
      companyId: employee.companyId,
      effectiveFrom: employee.startDate ? employee.startDate.slice(0, 7) : "2026-01",
      monthlySalary: employee.monthlySalary,
      notes: "الراتب الأساسي المعتمد",
      createdAt: employee.createdAt,
    },
  ];

  // Employee's Salary Payments for current tab view
  const empSalaryPayments = useMemo(() => {
    return salaryPayments.filter((sp) => {
      if (sp.employeeId !== employee.id) return false;
      if (period && period !== "all") {
        return sp.period === period;
      }
      return true;
    });
  }, [salaryPayments, employee.id, period]);

  // Employee's Contracts and Commission calculation for the contracts tab
  const employeeContracts = useMemo(() => {
    return filteredContracts.filter((c) => {
      const isRep = c.salesRep === employee.name || c.assignedTo === employee.name || c.salesPerson === employee.name || c.responsible === employee.name;
      const isCompMatch = c.companyId === employee.companyId && employee.role === "sales_rep";
      return isRep || isCompMatch;
    });
  }, [filteredContracts, employee]);

  const commissionRate = employeeCompany?.commissionRate || 2.5;
  const commissionTiming = employeeCompany?.commissionTiming || "contract_signing";

  // Detailed contract commissions breakdown
  const contractCommissionList = useMemo(() => {
    return employeeContracts.map((c) => {
      const contractTotal = c.totalValue || 0;
      const paidByCustomer = c.paidAmount || 0;

      // Check if contract is eligible for commission based on company-specific timing
      let isEligible = true;
      let reasonNotEligible = "";
      if (commissionTiming === "down_payment") {
        isEligible = paidByCustomer > 0;
        if (!isEligible) {
          reasonNotEligible = "بانتظار سداد الدفعة الأولى من العميل";
        }
      } else if (commissionTiming === "full_collection") {
        const rem = c.remainingBalance ?? Math.max(0, contractTotal - paidByCustomer);
        isEligible = rem <= 0 && contractTotal > 0;
        if (!isEligible) {
          reasonNotEligible = `بانتظار التحصيل الكامل (متبقي: ${rem.toLocaleString()} ج.م)`;
        }
      }

      const earned = isEligible ? Math.round((contractTotal * commissionRate) / 100) : 0;

      // find payments already made for this specific contract
      const paidForContract = commissionPayments
        .filter((cp) => cp.employeeId === employee.id && cp.contractId === c.id && cp.status === "paid")
        .reduce((sum, cp) => sum + cp.amount, 0);

      const remaining = Math.max(0, earned - paidForContract);

      return {
        contract: c,
        contractTotal,
        paidByCustomer,
        commissionRate,
        earned,
        paid: paidForContract,
        remaining,
        isEligible,
        reasonNotEligible,
      };
    });
  }, [employeeContracts, commissionRate, commissionTiming, commissionPayments, employee.id]);

  // Employee's Commission Payments
  const empCommissionPayments = useMemo(() => {
    return commissionPayments.filter((cp) => {
      if (cp.employeeId !== employee.id) return false;
      if (period && period !== "all") {
        return cp.period === period;
      }
      return true;
    });
  }, [commissionPayments, employee.id, period]);

  // Handle salary adjustment submission
  const handleSaveSalaryAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const sal = Number(newSalaryAmount);
    if (!sal || sal <= 0) {
      showToast("يرجى إدخال مبلغ راتب صحيح", "warning");
      return;
    }
    if (!effectivePeriod) {
      showToast("يرجى تحديد شهر بدء سريان الراتب", "warning");
      return;
    }

    updateEmployeeSalary(employee.id, sal, effectivePeriod, adjustmentNotes);
    setIsAddingSalaryAdj(false);
    setNewSalaryAmount("");
    setAdjustmentNotes("");
  };

  const handleSaveCommissionAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newCommissionAdjAmount);
    if (amount === 0) {
      showToast("يرجى إدخال مبلغ صحيح", "warning");
      return;
    }
    if (!adjPeriod) {
      showToast("يرجى تحديد فترة التسوية", "warning");
      return;
    }

    addCommissionAdjustment({
      employeeId: employee.id,
      companyId: employee.companyId,
      amount,
      period: adjPeriod,
      reason: commissionAdjReason,
      date: new Date().toISOString().split("T")[0],
    });
    setIsAddingCommissionAdj(false);
    setNewCommissionAdjAmount("");
    setCommissionAdjReason("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-150">
      <div className="bg-[#18191B] border border-[#292B2E] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#292B2E] bg-[#1E2023] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C8A75A]/10 border border-[#C8A75A]/20 flex items-center justify-center text-[#C8A75A]">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#EDEDED]">{employee.name}</h2>
                {employeeCompany && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: `${employeeCompany.color}25`,
                      color: employeeCompany.color || "#C8A75A",
                    }}
                  >
                    {employeeCompany.name}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#292B2E] text-[#A1A1AA]">
                  {employee.role}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    employee.active ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
                  }`}
                >
                  {employee.active ? "نشط" : "غير نشط"}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1 flex items-center gap-3">
                <span>تاريخ التعيين: {employee.startDate || "-"}</span>
                <span>•</span>
                <span>فترة التقرير: <strong className="text-[#C8A75A] font-mono">{period}</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#292B2E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Summary Top Cards */}
        <div className="p-6 border-b border-[#292B2E] bg-[#18191B] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#202225] border border-[#292B2E] p-3.5 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>الراتب المستحق ({period === 'all' ? 'الكل' : period})</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base font-black text-[#EDEDED] font-mono">
              {summaryData.salaryDue.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-[#71717A]">
              المسدد: <span className="text-emerald-400">{summaryData.salaryPaid.toLocaleString()}</span> | متبقي: <span className="text-amber-400">{summaryData.salaryRemaining.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-[#202225] border border-[#292B2E] p-3.5 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>العمولات المكتسبة</span>
              <Percent className="w-4 h-4 text-[#C8A75A]" />
            </div>
            <div className="text-base font-black text-[#C8A75A] font-mono">
              {summaryData.commEarned.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-[#71717A]">
              {period === 'all' ? 'إجمالي العمولات المعتمدة' : `عمولات شهر ${period}`}
            </div>
          </div>

          <div className="bg-[#202225] border border-emerald-900/30 p-3.5 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>إجمالي المصروف فعلياً</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base font-black text-emerald-400 font-mono">
              {summaryData.totalPaid.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-[#71717A]">
              رواتب: {summaryData.salaryPaid.toLocaleString()} + عمولات: {summaryData.commPaid.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#202225] border border-amber-900/30 p-3.5 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>إجمالي المتبقي المستحق</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-base font-black text-amber-400 font-mono">
              {summaryData.totalRemaining.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-amber-400/70 font-semibold">
              مستحق الصرف للموظف
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-[#292B2E] bg-[#1E2023]/50">
          <button
            onClick={() => setActiveTab("statements")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "statements"
                ? "bg-[#18191B] text-[#EDEDED] border-t-2 border-[#C8A75A]"
                : "text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>كشوفات الاستحقاق الشهرية ({statements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("contracts")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "contracts"
                ? "bg-[#18191B] text-[#EDEDED] border-t-2 border-[#C8A75A]"
                : "text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>تفاصيل العمولات والعقود ({contractCommissionList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("salary_payments")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "salary_payments"
                ? "bg-[#18191B] text-[#EDEDED] border-t-2 border-emerald-500"
                : "text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>حركات صرف الرواتب ({empSalaryPayments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("commission_payments")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "commission_payments"
                ? "bg-[#18191B] text-[#EDEDED] border-t-2 border-amber-500"
                : "text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>حركات صرف العمولات ({empCommissionPayments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("commission_adjustments")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "commission_adjustments"
                ? "bg-[#18191B] text-[#EDEDED] border-t-2 border-orange-500"
                : "text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>تسويات العمولات ({(employee.commissionAdjustments || []).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("salary_history")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "salary_history"
                ? "bg-[#18191B] text-[#EDEDED] border-t-2 border-sky-500"
                : "text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>السجل التاريخي للراتب ({salaryHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("audit_log")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "audit_log"
                ? "bg-[#18191B] text-[#EDEDED] border-t-2 border-[#C8A75A]"
                : "text-[#A1A1AA] hover:text-[#EDEDED]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل المراجعة (Audit Log)</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* TAB 0: MONTHLY STATEMENTS */}
          {activeTab === "statements" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[#EDEDED]">كشوف العمولات الشهرية</h4>
                  <p className="text-[11px] text-[#A1A1AA] mt-1">كشف مالي مستقل لكل شهر يوضح الراتب والعمولة والتسويات.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-1 bg-[#292B2E] text-[#A1A1AA] rounded-md border border-[#35383C]">
                    من تاريخ التعيين: {employee.startDate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {statements.length === 0 ? (
                  <div className="p-12 text-center bg-[#202225] border border-dashed border-[#35383C] rounded-2xl">
                    <p className="text-xs text-[#71717A]">لا توجد كشوف مالية مسجلة حالياً.</p>
                  </div>
                ) : (
                  statements.map((stmt) => (
                    <div key={stmt.id} className={`bg-[#202225] border rounded-2xl overflow-hidden transition-all ${expandedStatement === stmt.id ? 'border-[#C8A75A]/60 ring-1 ring-[#C8A75A]/20' : 'border-[#292B2E] hover:border-[#35383C]'}`}>
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#292B2E] pb-3 mb-3">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setExpandedStatement(expandedStatement === stmt.id ? null : stmt.id)}
                              className="w-10 h-10 rounded-xl bg-[#292B2E] hover:bg-[#35383C] flex flex-col items-center justify-center text-[#A1A1AA] hover:text-[#EDEDED] transition-colors cursor-pointer group"
                            >
                              <span className="text-[10px] font-bold text-[#C8A75A] group-hover:scale-110 transition-transform">Audit</span>
                              {expandedStatement === stmt.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-[#EDEDED]">{stmt.period}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  stmt.status === 'approved' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' :
                                  stmt.status === 'reviewed' ? 'bg-sky-950/60 text-sky-400 border-sky-800/40' :
                                  'bg-[#292B2E] text-[#A1A1AA] border-[#35383C]'
                                }`}>
                                  {stmt.status === 'approved' ? 'معتمد' : stmt.status === 'reviewed' ? 'تمت المراجعة' : stmt.status === 'paid' ? 'تم الصرف' : 'مسودة (Calculated)'}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#71717A] mt-0.5 font-mono">
                                الاستحقاق: {stmt.totalDue.toLocaleString()} ج.م | المتبقي: {stmt.remaining.toLocaleString()} ج.م
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button 
                              onClick={() => recalculateStatement(employee.id, stmt.period)}
                              className="px-3 py-1.5 rounded-lg bg-[#292B2E] text-[#A1A1AA] hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1.5 text-[10px] font-bold border border-[#35383C]"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" />
                              <span>إعادة حساب</span>
                            </button>
                            
                            <button 
                              onClick={() => {
                                setSelectedStatement(stmt);
                                setIsEditStatementModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#C8A75A]/10 text-[#C8A75A] hover:bg-[#C8A75A]/20 transition-colors cursor-pointer flex items-center gap-1.5 text-[10px] font-bold border border-[#C8A75A]/20"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                          <div className="p-2 bg-[#18191B] rounded-xl border border-[#292B2E]">
                            <p className="text-[9px] text-[#71717A] mb-1">الراتب الأساسي</p>
                            <p className="text-xs text-[#EDEDED] font-black font-mono">{stmt.salaryDue.toLocaleString()} ج.م</p>
                          </div>
                          <div className="p-2 bg-[#18191B] rounded-xl border border-[#292B2E]">
                            <p className="text-[9px] text-[#71717A] mb-1">عقود مؤهلة ({stmt.eligibleContractsCount})</p>
                            <p className="text-xs text-[#EDEDED] font-black font-mono">{stmt.eligibleContractsTotal.toLocaleString()} ج.م</p>
                          </div>
                          <div className="p-2 bg-[#18191B] rounded-xl border border-[#292B2E]">
                            <p className="text-[9px] text-[#71717A] mb-1">التحصيل المؤهل</p>
                            <p className="text-xs text-sky-400 font-black font-mono">{(stmt.eligibleCollectionTotal || 0).toLocaleString()} ج.م</p>
                          </div>
                          <div className="p-2 bg-[#18191B] rounded-xl border border-[#292B2E]">
                            <p className="text-[9px] text-[#71717A] mb-1">نسبة العمولة</p>
                            <p className="text-xs text-[#C8A75A] font-black font-mono">{stmt.commissionRateUsed}%</p>
                          </div>
                          <div className="p-2 bg-[#18191B] rounded-xl border border-[#292B2E]">
                            <p className="text-[9px] text-[#71717A] mb-1">عمولة الشهر</p>
                            <p className="text-xs text-[#C8A75A] font-black font-mono">{stmt.commissionEarned.toLocaleString()} ج.م</p>
                          </div>
                          <div className="p-2 bg-[#18191B] rounded-xl border border-[#C8A75A]/30">
                            <p className="text-[9px] text-[#C8A75A] mb-1">صافي المستحق</p>
                            <p className="text-xs text-[#EDEDED] font-black font-mono">{stmt.totalDue.toLocaleString()} ج.م</p>
                          </div>
                        </div>
                      </div>

                      {/* Summary Bar: Paid vs Remaining */}
                      <div className="px-4 py-2 bg-[#18191B]/50 flex items-center justify-between text-[10px] border-t border-[#292B2E]">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#71717A]">المدفوع:</span>
                            <span className="text-emerald-400 font-bold font-mono">{stmt.totalPaid.toLocaleString()} ج.م</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#71717A]">المتبقي:</span>
                            <span className="text-rose-400 font-bold font-mono">{stmt.remaining.toLocaleString()} ج.م</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full ${stmt.remaining <= 0 ? 'bg-emerald-500' : stmt.totalPaid > 0 ? 'bg-amber-500' : 'bg-gray-600'}`}></span>
                           <span className="text-[#A1A1AA]">{stmt.remaining <= 0 ? 'مدفوع بالكامل' : stmt.totalPaid > 0 ? 'مدفوع جزئياً' : 'بانتظار الصرف'}</span>
                        </div>
                      </div>

                      {/* Expanded View: Contract Audit */}
                      {expandedStatement === stmt.id && (
                        <div className="bg-[#1E2023] border-t border-[#292B2E] p-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-[11px] font-black text-[#EDEDED] flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#C8A75A]" />
                              عرض العقود المكوِّنة للعمولة - {stmt.period}
                            </h5>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-[#292B2E] mb-4">
                            <table className="w-full text-right text-[10px]">
                              <thead className="bg-[#18191B] text-[#71717A] border-b border-[#292B2E]">
                                <tr>
                                  <th className="p-2 font-bold">العقد</th>
                                  <th className="p-2 font-bold">العميل</th>
                                  <th className="p-2 font-bold">التاريخ</th>
                                  <th className="p-2 font-bold">قيمة العقد</th>
                                  <th className="p-2 font-bold">مؤهل للعمولة؟</th>
                                  <th className="p-2 font-bold text-left">الحالة</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#292B2E]">
                                {stmt.contractDetails.map(detail => (
                                  <tr key={detail.contractId} className="hover:bg-[#202225] transition-colors">
                                    <td className="p-2 font-mono font-bold text-[#EDEDED]">{detail.contractNumber}</td>
                                    <td className="p-2 font-bold text-[#EDEDED]">{detail.customerName}</td>
                                    <td className="p-2 text-[#A1A1AA]">{detail.date}</td>
                                    <td className="p-2 font-mono text-[#EDEDED]">{detail.totalValue.toLocaleString()} ج.م</td>
                                    <td className="p-2">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        detail.isEligible ? 'bg-emerald-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'
                                      }`}>
                                        {detail.isEligible ? 'نعم' : 'لا'}
                                      </span>
                                    </td>
                                    <td className="p-2 text-left text-[#71717A]">{detail.triggerStatus}</td>
                                  </tr>
                                ))}
                                {stmt.contractDetails.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="p-6 text-center italic text-[#71717A]">
                                      لا توجد عقود مسجلة لهذا الشهر.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#18191B] p-4 rounded-xl border border-[#292B2E]">
                            <div>
                              <p className="text-[9px] text-[#71717A] mb-1">إجمالي قيمة العقود</p>
                              <p className="text-sm font-black text-[#EDEDED] font-mono">{stmt.eligibleContractsTotal.toLocaleString()} جنيه</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-[#71717A] mb-1">نسبة العمولة</p>
                              <p className="text-sm font-black text-[#C8A75A] font-mono">{stmt.commissionRateUsed}%</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="text-[9px] text-[#C8A75A] mb-1">عمولة الشهر</p>
                              <p className="text-sm font-black text-emerald-400 font-mono">{stmt.commissionEarned.toLocaleString()} جنيه</p>
                            </div>
                          </div>
                          
                          <p className="mt-4 text-[9px] text-[#71717A] italic text-center">
                            العقود هنا مصدر شفافية ومراجعة، وليست سجلات عمولة مستقلة يتم جمعها كدفعات منفصلة.
                          </p>

                          {/* Audit History for Manual Overrides */}
                          {stmt.history && stmt.history.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-[#292B2E] space-y-3">
                              <div className="flex items-center gap-2 text-[#EDEDED] text-[10px] font-bold">
                                <History className="w-3.5 h-3.5 text-amber-500" />
                                <span>سجل التعديلات اليدوية (Audit Trail)</span>
                              </div>
                              <div className="space-y-2">
                                {stmt.history.map((h, idx) => (
                                  <div key={idx} className="p-3 bg-[#18191B] rounded-xl border border-[#292B2E] flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-amber-400">
                                        تعديل {h.field === 'salaryDue' ? 'الراتب' : 'العمولة'}
                                      </span>
                                      <span className="text-[8px] text-[#71717A] font-mono">{new Date(h.date).toLocaleString('ar-EG')}</span>
                                    </div>
                                    <p className="text-[10px] text-[#EDEDED]">
                                      تم التغيير من <span className="font-mono text-[#A1A1AA] font-bold">{h.oldValue.toLocaleString()}</span> إلى <span className="font-mono text-emerald-400 font-bold">{h.newValue.toLocaleString()}</span> ج.م
                                    </p>
                                    <p className="text-[9px] text-[#A1A1AA]">
                                      <span className="font-bold text-[#EDEDED]">السبب:</span> {h.reason || 'تعديل يدوي'} | <span className="font-bold text-[#EDEDED]">بواسطة:</span> {h.user}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 1: CONTRACTS & COMMISSION BREAKDOWN */}
          {activeTab === "contracts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#A1A1AA]">
                  كشف العقود المنسوبة للموظف ونسبة استحقاق العمولة وقيمة المتبقي للصرف:
                </p>
                <button
                  onClick={() => {
                    setTargetContractForCommission(null);
                    setIsCommissionModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>صرف عمولة جديدة</span>
                </button>
              </div>

              <div className="bg-[#202225] border border-[#292B2E] rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#292B2E] text-[#A1A1AA] border-b border-[#35383C]">
                    <tr>
                      <th className="p-3 font-bold">رقم العقد</th>
                      <th className="p-3 font-bold">العميل</th>
                      <th className="p-3 font-bold">قيمة العقد</th>
                      <th className="p-3 font-bold">المحصل</th>
                      <th className="p-3 font-bold">أهلية الاستحقاق</th>
                      <th className="p-3 font-bold">العمولة المستحقة</th>
                      <th className="p-3 font-bold">المنصرف</th>
                      <th className="p-3 font-bold">المتبقي</th>
                      <th className="p-3 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292B2E]">
                    {contractCommissionList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-[#71717A]">
                          لا توجد عقود بيعية مسجلة للموظف حالياً
                        </td>
                      </tr>
                    ) : (
                      contractCommissionList.map((item) => (
                        <tr key={item.contract.id} className="hover:bg-[#25282B] transition-colors">
                          <td className="p-3 font-mono font-bold text-[#EDEDED]">
                            {item.contract.contractNumber || item.contract.id.slice(0, 8)}
                          </td>
                          <td className="p-3 font-bold text-[#EDEDED]">{item.contract.customerName}</td>
                          <td className="p-3 font-mono text-[#EDEDED]">{item.contractTotal.toLocaleString()} ج.م</td>
                          <td className="p-3 font-mono text-emerald-400">{item.paidByCustomer.toLocaleString()} ج.م</td>
                          <td className="p-3">
                            {item.isEligible ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold">
                                مؤهل للتنشيط ({commissionTiming === "contract_signing" ? "توقيع العقد" : commissionTiming === "down_payment" ? "الدفعة الأولى" : "التحصيل الكامل"})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40 text-[10px] font-bold block max-w-[200px]" title={item.reasonNotEligible}>
                                غير مؤهل: {item.reasonNotEligible}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-[#C8A75A]">{item.earned.toLocaleString()} ج.م ({item.commissionRate}%)</td>
                          <td className="p-3 font-mono text-emerald-400">{item.paid.toLocaleString()} ج.م</td>
                          <td className="p-3 font-mono font-bold text-amber-400">
                            {item.remaining.toLocaleString()} ج.m
                          </td>
                          <td className="p-3 text-center">
                            {item.isEligible && item.remaining > 0 ? (
                              <button
                                onClick={() => {
                                  setTargetContractForCommission(item.contract);
                                  setIsCommissionModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                صرف الدفعة
                              </button>
                            ) : item.isEligible && item.remaining <= 0 ? (
                              <span className="text-emerald-400 text-xs font-bold">✓ مسدد بالكامل</span>
                            ) : (
                              <span className="text-[#A1A1AA] text-[10px] font-bold">بانتظار أهلية الصرف</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SALARY PAYMENTS */}
          {activeTab === "salary_payments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#A1A1AA]">
                  سجل سندات صرف الرواتب الشهرية الموثقة للموظف:
                </p>
                <button
                  onClick={() => setIsSalaryModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>صرف راتب جديد</span>
                </button>
              </div>

              <div className="bg-[#202225] border border-[#292B2E] rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#292B2E] text-[#A1A1AA] border-b border-[#35383C]">
                    <tr>
                      <th className="p-3 font-bold">رقم السند</th>
                      <th className="p-3 font-bold">الفترة</th>
                      <th className="p-3 font-bold">تاريخ الصرف</th>
                      <th className="p-3 font-bold">المبلغ المنصرف</th>
                      <th className="p-3 font-bold">طريقة الصرف</th>
                      <th className="p-3 font-bold">بواسطة</th>
                      <th className="p-3 font-bold">البيان</th>
                      <th className="p-3 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292B2E]">
                    {empSalaryPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-[#71717A]">
                          لا توجد سندات صرف راتب مسجلة لهذا الموظف
                        </td>
                      </tr>
                    ) : (
                      empSalaryPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-[#25282B] transition-colors">
                          <td className="p-3 font-mono font-bold text-[#EDEDED]">{p.referenceNumber}</td>
                          <td className="p-3 font-mono text-[#C8A75A] font-bold">{p.period}</td>
                          <td className="p-3 font-mono text-[#A1A1AA]">{p.paymentDate}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">
                            {p.amount.toLocaleString()} ج.م
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18191B] text-[#EDEDED] border border-[#35383C]">
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3 text-[#A1A1AA]">{p.createdByName || "-"}</td>
                          <td className="p-3 text-[#71717A] max-w-[200px] truncate" title={p.notes}>
                            {p.notes || "-"}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                if (window.confirm("هل أنت متأكد من إلغاء حركة صرف الراتب هذه؟")) {
                                  deleteSalaryPayment(p.id);
                                }
                              }}
                              className="text-rose-400 hover:text-rose-300 text-[11px] underline cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: COMMISSION PAYMENTS */}
          {activeTab === "commission_payments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#A1A1AA]">
                  سجل سندات صرف العمولات والمكافآت الموثقة للموظف:
                </p>
                <button
                  onClick={() => {
                    setTargetContractForCommission(null);
                    setIsCommissionModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>صرف عمولة جديدة</span>
                </button>
              </div>

              <div className="bg-[#202225] border border-[#292B2E] rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#292B2E] text-[#A1A1AA] border-b border-[#35383C]">
                    <tr>
                      <th className="p-3 font-bold">رقم السند</th>
                      <th className="p-3 font-bold">العقد المرتبط</th>
                      <th className="p-3 font-bold">الفترة</th>
                      <th className="p-3 font-bold">تاريخ الصرف</th>
                      <th className="p-3 font-bold">المبلغ</th>
                      <th className="p-3 font-bold">طريقة الصرف</th>
                      <th className="p-3 font-bold">البيان</th>
                      <th className="p-3 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292B2E]">
                    {empCommissionPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-[#71717A]">
                          لا توجد سندات صرف عمولة مسجلة لهذا الموظف
                        </td>
                      </tr>
                    ) : (
                      empCommissionPayments.map((cp) => (
                        <tr key={cp.id} className="hover:bg-[#25282B] transition-colors">
                          <td className="p-3 font-mono font-bold text-[#EDEDED]">{cp.referenceNumber}</td>
                          <td className="p-3 font-mono text-[#A1A1AA]">{cp.contractId || "حافز عام"}</td>
                          <td className="p-3 font-mono text-[#C8A75A] font-bold">{cp.period}</td>
                          <td className="p-3 font-mono text-[#A1A1AA]">{cp.paymentDate}</td>
                          <td className="p-3 font-mono font-bold text-amber-400">
                            {cp.amount.toLocaleString()} ج.م
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18191B] text-[#EDEDED] border border-[#35383C]">
                              {cp.paymentMethod}
                            </span>
                          </td>
                          <td className="p-3 text-[#71717A] max-w-[200px] truncate" title={cp.notes}>
                            {cp.notes || "-"}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                if (window.confirm("هل أنت متأكد من إلغاء حركة صرف العمولة هذه؟")) {
                                  deleteCommissionPayment(cp.id);
                                }
                              }}
                              className="text-rose-400 hover:text-rose-300 text-[11px] underline cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: COMMISSION ADJUSTMENTS */}
          {activeTab === "commission_adjustments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <span>تسويات مالية ومكافآت (Commission Adjustments)</span>
                  </h4>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                    إضافة مبالغ إضافية (بونص) أو خصومات يدوية تؤثر على إجمالي العمولة المستحقة للموظف.
                  </p>
                </div>
                {!isAddingCommissionAdj && (
                  <button
                    onClick={() => setIsAddingCommissionAdj(true)}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة تسوية يدوية</span>
                  </button>
                )}
              </div>

              {isAddingCommissionAdj && (
                <form
                  onSubmit={handleSaveCommissionAdjustment}
                  className="bg-[#202225] border border-orange-800/40 p-4 rounded-2xl space-y-3 animate-in fade-in duration-100"
                >
                  <div className="flex items-center justify-between border-b border-[#292B2E] pb-2 text-xs font-bold text-orange-400">
                    <span>تسجيل تسوية عمولة جديدة</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingCommissionAdj(false)}
                      className="text-[#A1A1AA] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[#A1A1AA] mb-1 font-semibold">
                        المبلغ (ج.م) * (سالب للخصم)
                      </label>
                      <input
                        type="number"
                        required
                        value={newCommissionAdjAmount}
                        onChange={(e) =>
                          setNewCommissionAdjAmount(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="w-full p-2 bg-[#18191B] border border-[#292B2E] rounded-xl text-orange-400 font-mono font-bold outline-hidden focus:border-orange-500"
                        placeholder="مثال: 500 أو -200"
                      />
                    </div>

                    <div>
                      <label className="block text-[#A1A1AA] mb-1 font-semibold">
                        الفترة (شهر الاستحقاق) *
                      </label>
                      <input
                        type="month"
                        required
                        value={adjPeriod}
                        onChange={(e) => setAdjPeriod(e.target.value)}
                        className="w-full p-2 bg-[#18191B] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-orange-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[#A1A1AA] mb-1 font-semibold">
                        السبب / البيان *
                      </label>
                      <input
                        type="text"
                        required
                        value={commissionAdjReason}
                        onChange={(e) => setCommissionAdjReason(e.target.value)}
                        className="w-full p-2 bg-[#18191B] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-orange-500"
                        placeholder="مثال: مكافأة مبيعات استثنائية..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#292B2E]">
                    <button
                      type="button"
                      onClick={() => setIsAddingCommissionAdj(false)}
                      className="px-3 py-1.5 bg-[#18191B] hover:bg-[#25282B] text-[#A1A1AA] rounded-xl text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>حفظ التسوية</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-[#202225] border border-[#292B2E] rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#292B2E] text-[#A1A1AA] border-b border-[#35383C]">
                    <tr>
                      <th className="p-3 font-bold">التاريخ</th>
                      <th className="p-3 font-bold">الفترة</th>
                      <th className="p-3 font-bold">المبلغ</th>
                      <th className="p-3 font-bold">البيان</th>
                      <th className="p-3 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292B2E]">
                    {(employee.commissionAdjustments || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#71717A]">
                          لا توجد تسويات مالية مسجلة لهذه العمولة
                        </td>
                      </tr>
                    ) : (
                      (employee.commissionAdjustments || []).map((adj) => (
                        <tr key={adj.id} className="hover:bg-[#25282B] transition-colors">
                          <td className="p-3 font-mono text-[#A1A1AA]">{adj.date}</td>
                          <td className="p-3 font-mono text-[#C8A75A] font-bold">{adj.period}</td>
                          <td className={`p-3 font-mono font-bold ${adj.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {adj.amount.toLocaleString()} ج.م
                          </td>
                          <td className="p-3 text-[#EDEDED]">{adj.reason}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                if (window.confirm("هل أنت متأكد من حذف هذه التسوية؟")) {
                                  deleteCommissionAdjustment(employee.id, adj.id);
                                }
                              }}
                              className="text-rose-400 hover:text-rose-300 text-[11px] underline cursor-pointer"
                            >
                              حذف
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: HISTORICAL SALARY RECORDS & EFFECTIVE DATES */}
          {activeTab === "salary_history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#EDEDED] flex items-center gap-1.5">
                    <History className="w-4 h-4 text-sky-400" />
                    <span>تدرج الرواتب وتاريخ التعديلات (Historical Salary Integrity)</span>
                  </h4>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                    أي تعديل على الراتب يسري فقط اعتبارا من الفترة المحددة ولا يغير الفترات السابقة بأثر رجعي.
                  </p>
                </div>
                {!isAddingSalaryAdj && (
                  <button
                    onClick={() => setIsAddingSalaryAdj(true)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تعديل الراتب اعتبارا من فترة محددة</span>
                  </button>
                )}
              </div>

              {/* Add Adjustment Inline Form */}
              {isAddingSalaryAdj && (
                <form
                  onSubmit={handleSaveSalaryAdjustment}
                  className="bg-[#202225] border border-sky-800/40 p-4 rounded-2xl space-y-3 animate-in fade-in duration-100"
                >
                  <div className="flex items-center justify-between border-b border-[#292B2E] pb-2 text-xs font-bold text-sky-400">
                    <span>تسجيل تعديل راتب سارٍ اعتبارا من تاريخ محدد</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingSalaryAdj(false)}
                      className="text-[#A1A1AA] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[#A1A1AA] mb-1 font-semibold">
                        الراتب الشهري الجديد (ج.م) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={newSalaryAmount}
                        onChange={(e) =>
                          setNewSalaryAmount(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="w-full p-2 bg-[#18191B] border border-[#292B2E] rounded-xl text-emerald-400 font-mono font-bold outline-hidden focus:border-sky-500"
                        placeholder="مثال: 9000"
                      />
                    </div>

                    <div>
                      <label className="block text-[#A1A1AA] mb-1 font-semibold">
                        يسري اعتبارا من شهر *
                      </label>
                      <input
                        type="month"
                        required
                        value={effectivePeriod}
                        onChange={(e) => setEffectivePeriod(e.target.value)}
                        className="w-full p-2 bg-[#18191B] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-sky-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[#A1A1AA] mb-1 font-semibold">
                        سبب التعديل / ملاحظات
                      </label>
                      <input
                        type="text"
                        value={adjustmentNotes}
                        onChange={(e) => setAdjustmentNotes(e.target.value)}
                        className="w-full p-2 bg-[#18191B] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-sky-500"
                        placeholder="مثال: ترقية أو زيادة سنوية..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#292B2E]">
                    <button
                      type="button"
                      onClick={() => setIsAddingSalaryAdj(false)}
                      className="px-3 py-1.5 bg-[#18191B] hover:bg-[#25282B] text-[#A1A1AA] rounded-xl text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>حفظ التعديل في السجل التاريخي</span>
                    </button>
                  </div>
                </form>
              )}

              {/* History Timeline Table */}
              <div className="bg-[#202225] border border-[#292B2E] rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#292B2E] text-[#A1A1AA] border-b border-[#35383C]">
                    <tr>
                      <th className="p-3 font-bold">الراتب الشهري</th>
                      <th className="p-3 font-bold">يسري من شهر</th>
                      <th className="p-3 font-bold">يسري حتى شهر</th>
                      <th className="p-3 font-bold">الحالة</th>
                      <th className="p-3 font-bold">ملاحظات التعديل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292B2E]">
                    {salaryHistory.map((rec) => {
                      const isCurrent = !rec.effectiveTo;
                      return (
                        <tr key={rec.id} className="hover:bg-[#25282B] transition-colors">
                          <td className="p-3 font-mono font-bold text-emerald-400 text-sm">
                            {rec.monthlySalary.toLocaleString()} ج.م
                          </td>
                          <td className="p-3 font-mono text-[#EDEDED] font-bold">{rec.effectiveFrom}</td>
                          <td className="p-3 font-mono text-[#A1A1AA]">
                            {rec.effectiveTo || "مستمر (حالي)"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCurrent
                                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                  : "bg-gray-800 text-gray-400 border border-gray-700"
                              }`}
                            >
                              {isCurrent ? "الراتب الفعّال حالياً" : "فترة سابقة مؤرشفة"}
                            </span>
                          </td>
                          <td className="p-3 text-[#A1A1AA]">{rec.notes || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT LOG */}
          {activeTab === "audit_log" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[#EDEDED]">سجل العمليات والمراجعة (Financial Audit Log)</h4>
                  <p className="text-[11px] text-[#A1A1AA] mt-1">تتبع كافة التعديلات المالية والاعتمادات التي تمت على حساب الموظف.</p>
                </div>
              </div>

              <div className="bg-[#202225] border border-[#292B2E] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="bg-[#18191B] border-b border-[#292B2E] text-[#71717A]">
                        <th className="px-4 py-3 font-bold">التاريخ والوقت</th>
                        <th className="px-4 py-3 font-bold">العملية</th>
                        <th className="px-4 py-3 font-bold">الوصف</th>
                        <th className="px-4 py-3 font-bold">بواسطة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#292B2E]">
                      {auditLogs
                        .filter(log => log.entityId === employee.id)
                        .map(log => (
                          <tr key={log.id} className="hover:bg-[#292B2E]/30 transition-colors">
                            <td className="px-4 py-3 text-[#A1A1AA] font-mono">{new Date(log.timestamp).toLocaleString('ar-EG')}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-[#292B2E] text-[#EDEDED] rounded border border-[#35383C] text-[9px] font-bold">
                                {log.actionType || 'UPDATE'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#EDEDED] font-medium">{log.description}</td>
                            <td className="px-4 py-3 text-[#A1A1AA]">{log.userName || 'System'}</td>
                          </tr>
                        ))}
                      {auditLogs.filter(log => log.entityId === employee.id).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-[#71717A] italic">
                            لا يوجد سجل عمليات لهذا الموظف حالياً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Quick Payout Actions */}
        <div className="p-4 border-t border-[#292B2E] bg-[#1E2023] flex items-center justify-between">
          <div className="text-xs text-[#A1A1AA]">
            <span>إجمالي المستحق غير المصروف: </span>
            <strong className="text-amber-400 font-mono font-bold text-sm">
              {summaryData.totalRemaining.toLocaleString()} ج.م
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSalaryModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Banknote className="w-4 h-4" />
              <span>صرف راتب ({summaryData.salaryRemaining.toLocaleString()} ج.م)</span>
            </button>
            <button
              onClick={() => {
                setTargetContractForCommission(null);
                setIsCommissionModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Percent className="w-4 h-4" />
              <span>صرف عمولة ({summaryData.commRemaining.toLocaleString()} ج.م)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub Modals */}
      <RecordSalaryPaymentModal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        employee={employee}
        period={period}
        remainingSalary={summaryData.salaryRemaining}
      />

      <RecordCommissionPaymentModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        employee={employee}
        initialContract={targetContractForCommission}
        period={period}
        remainingCommission={summaryData.commRemaining}
      />

      <EditStatementModal 
        isOpen={isEditStatementModalOpen}
        onClose={() => setIsEditStatementModalOpen(false)}
        statement={selectedStatement}
      />
    </div>
  );
};
