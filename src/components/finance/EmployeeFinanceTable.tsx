import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { Employee, Contract } from "../../types";
import {
  Users,
  Search,
  Filter,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Percent,
  Banknote,
  Clock,
  CheckCircle2,
  ChevronRight,
  Download,
  Plus,
} from "lucide-react";
import { EmployeeFinanceDetailModal } from "./EmployeeFinanceDetailModal";
import { RecordSalaryPaymentModal } from "./RecordSalaryPaymentModal";
import { RecordCommissionPaymentModal } from "./RecordCommissionPaymentModal";

export const EmployeeFinanceTable: React.FC = () => {
  const {
    filteredEmployees,
    companies,
    filteredContracts,
    salaryPayments,
    commissionPayments,
    showToast,
    employeeStatements,
  } = useApp();

  // Period Filters
  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, "0");

  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<Employee | null>(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [activeEmployeeForModal, setActiveEmployeeForModal] = useState<Employee | null>(null);

  const selectedPeriod = useMemo(() => {
    if (selectedMonth === "all") return selectedYear;
    return `${selectedYear}-${selectedMonth}`;
  }, [selectedYear, selectedMonth]);

  // Compute Employee Finance Row Data
  const employeeFinanceRows = useMemo(() => {
    return filteredEmployees
      .filter((emp) => {
        if (selectedCompanyId !== "all" && emp.companyId !== selectedCompanyId) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = emp.name.toLowerCase().includes(q);
          const matchRole = emp.role.toLowerCase().includes(q);
          const matchPhone = emp.phone?.toLowerCase().includes(q);
          if (!matchName && !matchRole && !matchPhone) return false;
        }
        return true;
      })
      .map((emp) => {
        const company = companies.find((c) => c.id === emp.companyId);
        const stmts = employeeStatements[emp.id] || [];
        
        // Find or aggregate statements for the selected period
        const relevantStmts = selectedMonth === "all" 
          ? stmts.filter(s => s.period.startsWith(selectedYear))
          : stmts.filter(s => s.period === selectedPeriod);

        const salaryDue = relevantStmts.reduce((sum, s) => sum + s.salaryDue, 0);
        const salaryPaid = relevantStmts.reduce((sum, s) => sum + s.salaryPaid, 0);
        const salaryRemaining = Math.max(0, salaryDue - salaryPaid);
        
        const commissionEarned = relevantStmts.reduce((sum, s) => sum + s.commissionEarned, 0);
        const commissionPaid = relevantStmts.reduce((sum, s) => sum + s.paidCommission, 0);
        const adjustments = relevantStmts.reduce((sum, s) => sum + s.adjustments, 0);
        const commissionRemaining = Math.max(0, (commissionEarned + adjustments) - commissionPaid);
        
        const totalPaid = relevantStmts.reduce((sum, s) => sum + s.totalPaid, 0);
        const totalDue = relevantStmts.reduce((sum, s) => sum + s.totalDue, 0);
        const totalOutstanding = Math.max(0, totalDue - totalPaid);
        
        const contractsCount = relevantStmts.reduce((sum, s) => sum + s.eligibleContractsCount, 0);

        return {
          employee: emp,
          company,
          salaryDue,
          salaryPaid,
          salaryRemaining,
          commissionEarned: commissionEarned + adjustments,
          commissionPaid,
          commissionRemaining,
          totalPaid,
          totalOutstanding,
          contractsCount,
        };
      });
  }, [filteredEmployees, companies, selectedYear, selectedMonth, selectedCompanyId, searchQuery, employeeStatements]);

  // Aggregate Totals for Top KPIs
  const totals = useMemo(() => {
    return employeeFinanceRows.reduce(
      (acc, row) => ({
        totalSalaryDue: acc.totalSalaryDue + row.salaryDue,
        totalCommissionEarned: acc.totalCommissionEarned + row.commissionEarned,
        totalPaid: acc.totalPaid + row.totalPaid,
        totalOutstanding: acc.totalOutstanding + row.totalOutstanding,
      }),
      {
        totalSalaryDue: 0,
        totalCommissionEarned: 0,
        totalPaid: 0,
        totalOutstanding: 0,
      }
    );
  }, [employeeFinanceRows]);

  // Export to CSV
  const handleExportCSV = () => {
    if (employeeFinanceRows.length === 0) {
      showToast("لا توجد بيانات للتصدير", "warning");
      return;
    }

    const headers = [
      "الموظف",
      "الشركة",
      "الوظيفة",
      "الراتب المستحق (ج.م)",
      "العمولة المكتسبة (ج.م)",
      "إجمالي المدفوع (ج.م)",
      "المتبقي المستحق (ج.م)",
      "الفترة",
    ];

    const rows = employeeFinanceRows.map((r) => [
      `"${r.employee.name}"`,
      `"${r.company?.name || "-"}"`,
      `"${r.employee.role}"`,
      r.salaryDue,
      r.commissionEarned,
      r.totalPaid,
      r.totalOutstanding,
      `"${selectedPeriod}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `employee_finance_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("تم تصدير كشف حساب الموظفين بنجاح", "success");
  };

  const monthNames = [
    { value: "all", label: "كامل السنة" },
    { value: "01", label: "01 - يناير" },
    { value: "02", label: "02 - فبراير" },
    { value: "03", label: "03 - مارس" },
    { value: "04", label: "04 - أبريل" },
    { value: "05", label: "05 - مايو" },
    { value: "06", label: "06 - يونيو" },
    { value: "07", label: "07 - يوليو" },
    { value: "08", label: "08 - أغسطس" },
    { value: "09", label: "09 - سبتمبر" },
    { value: "10", label: "10 - أكتوبر" },
    { value: "11", label: "11 - نوفمبر" },
    { value: "12", label: "12 - ديسمبر" },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Filters & Actions Bar */}
      <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
          {/* Year Selector */}
          <div>
            <label className="block text-[11px] text-[#A1A1AA] mb-1 font-semibold">السنة</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A] cursor-pointer font-mono"
            >
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-[11px] text-[#A1A1AA] mb-1 font-semibold">الشهر</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A] cursor-pointer"
            >
              {monthNames.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-[11px] text-[#A1A1AA] mb-1 font-semibold">الشركة</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A] cursor-pointer"
            >
              <option value="all">كل الشركات المتاحة</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] text-[#A1A1AA] mb-1 font-semibold">البحث بالاسم / الدور</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="اسم الموظف أو وظيفته..."
                className="w-full pr-8 pl-2 py-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              />
            </div>
          </div>
        </div>

        {/* Buttons: Add Payout & Export */}
        <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#292B2E]">
          <button
            onClick={() => {
              setActiveEmployeeForModal(null);
              setIsSalaryModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>صرف راتب</span>
          </button>

          <button
            onClick={() => {
              setActiveEmployeeForModal(null);
              setIsCommissionModalOpen(true);
            }}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>صرف عمولة</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 bg-[#202225] hover:bg-[#272A2D] text-[#EDEDED] rounded-xl border border-[#292B2E] transition-colors cursor-pointer"
            title="تصدير إلى CSV"
          >
            <Download className="w-4 h-4 text-[#A1A1AA]" />
          </button>
        </div>
      </div>

      {/* KPI Cards for Employee Finance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>إجمالي الرواتب المستحقة</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-[#EDEDED] font-mono">
            {totals.totalSalaryDue.toLocaleString()} <span className="text-xs text-[#71717A] font-normal">ج.م</span>
          </div>
          <div className="text-[10px] text-[#71717A]">
            لفترة: {selectedPeriod}
          </div>
        </div>

        <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>إجمالي العمولات المكتسبة</span>
            <Percent className="w-4 h-4 text-[#C8A75A]" />
          </div>
          <div className="text-lg font-black text-[#C8A75A] font-mono">
            {totals.totalCommissionEarned.toLocaleString()} <span className="text-xs text-[#71717A] font-normal">ج.م</span>
          </div>
          <div className="text-[10px] text-[#71717A]">
            محسوبة من واقع العقود المغلقة
          </div>
        </div>

        <div className="bg-[#18191B] border border-emerald-900/30 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>إجمالي المنصرف فعلياً</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-400 font-mono">
            {totals.totalPaid.toLocaleString()} <span className="text-xs text-[#71717A] font-normal">ج.م</span>
          </div>
          <div className="text-[10px] text-emerald-400/80 font-semibold">
            سندات صرف موثقة
          </div>
        </div>

        <div className="bg-[#18191B] border border-amber-900/30 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>المتبقي المستحق للموظفين</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black text-amber-400 font-mono">
            {totals.totalOutstanding.toLocaleString()} <span className="text-xs text-[#71717A] font-normal">ج.م</span>
          </div>
          <div className="text-[10px] text-amber-400/80 font-semibold">
            رواتب وعمولات قيد الصرف
          </div>
        </div>
      </div>

      {/* The Core Employee Finance Table */}
      <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#202225] text-[#A1A1AA] border-b border-[#292B2E]">
              <tr>
                <th className="p-3.5 font-bold">الموظف</th>
                <th className="p-3.5 font-bold">الشركة</th>
                <th className="p-3.5 font-bold">الراتب المستحق</th>
                <th className="p-3.5 font-bold">العمولة المكتسبة</th>
                <th className="p-3.5 font-bold">إجمالي المدفوع</th>
                <th className="p-3.5 font-bold">المتبقي المستحق</th>
                <th className="p-3.5 font-bold">حالة السداد</th>
                <th className="p-3.5 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292B2E]">
              {employeeFinanceRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-[#71717A]">
                    لا توجد سجلات مالية مطابقة للموظفين
                  </td>
                </tr>
              ) : (
                employeeFinanceRows.map((row) => {
                  const isSettled = row.totalOutstanding === 0;
                  const isPartial = row.totalPaid > 0 && row.totalOutstanding > 0;

                  return (
                    <tr key={row.employee.id} className="hover:bg-[#202225]/50 transition-colors">
                      {/* Employee Info */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#202225] border border-[#292B2E] flex items-center justify-center text-[#C8A75A] font-bold text-xs">
                            {row.employee.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-[#EDEDED]">{row.employee.name}</div>
                            <div className="text-[10px] text-[#71717A]">{row.employee.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Company Badge */}
                      <td className="p-3.5">
                        {row.company ? (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1"
                            style={{
                              backgroundColor: `${row.company.color}20`,
                              color: row.company.color || "#C8A75A",
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: row.company.color }} />
                            {row.company.name}
                          </span>
                        ) : (
                          <span className="text-[#71717A]">-</span>
                        )}
                      </td>

                      {/* Salary Due */}
                      <td className="p-3.5 font-mono font-bold text-[#EDEDED]">
                        {row.salaryDue.toLocaleString()} ج.م
                      </td>

                      {/* Commission Earned */}
                      <td className="p-3.5 font-mono font-bold text-[#C8A75A]">
                        {row.commissionEarned.toLocaleString()} ج.م
                        {row.contractsCount > 0 && (
                          <span className="text-[10px] text-[#71717A] font-normal mr-1">
                            ({row.contractsCount} عقود)
                          </span>
                        )}
                      </td>

                      {/* Total Paid */}
                      <td className="p-3.5 font-mono font-bold text-emerald-400">
                        {row.totalPaid.toLocaleString()} ج.م
                      </td>

                      {/* Total Outstanding */}
                      <td className="p-3.5 font-mono font-bold text-amber-400">
                        {row.totalOutstanding.toLocaleString()} ج.م
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isSettled
                              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                              : isPartial
                              ? "bg-sky-950/60 text-sky-400 border-sky-800/40"
                              : "bg-amber-950/60 text-amber-400 border-amber-800/40"
                          }`}
                        >
                          {isSettled ? "مسدد بالكامل" : isPartial ? "مسدد جزئياً" : "بانتظار الصرف"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedEmployeeForDetail(row.employee)}
                            className="px-2.5 py-1 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="عرض كشف الحساب التفصيلي"
                          >
                            <span>التفاصيل</span>
                            <ChevronRight className="w-3 h-3 text-[#A1A1AA]" />
                          </button>

                          {row.salaryRemaining > 0 && (
                            <button
                              onClick={() => {
                                setActiveEmployeeForModal(row.employee);
                                setIsSalaryModalOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/30 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              title="صرف راتب الموظف"
                            >
                              صرف راتب
                            </button>
                          )}

                          {row.commissionRemaining > 0 && (
                            <button
                              onClick={() => {
                                setActiveEmployeeForModal(row.employee);
                                setIsCommissionModalOpen(true);
                              }}
                              className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                              title="صرف عمولة الموظف"
                            >
                              صرف عمولة
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Detail Modal */}
      {selectedEmployeeForDetail && (
        <EmployeeFinanceDetailModal
          isOpen={!!selectedEmployeeForDetail}
          onClose={() => setSelectedEmployeeForDetail(null)}
          employee={selectedEmployeeForDetail}
          period={selectedPeriod}
        />
      )}

      {/* Standalone Record Salary Modal */}
      <RecordSalaryPaymentModal
        isOpen={isSalaryModalOpen}
        onClose={() => {
          setIsSalaryModalOpen(false);
          setActiveEmployeeForModal(null);
        }}
        employee={activeEmployeeForModal}
        period={selectedPeriod}
      />

      {/* Standalone Record Commission Modal */}
      <RecordCommissionPaymentModal
        isOpen={isCommissionModalOpen}
        onClose={() => {
          setIsCommissionModalOpen(false);
          setActiveEmployeeForModal(null);
        }}
        employee={activeEmployeeForModal}
        period={selectedPeriod}
      />
    </div>
  );
};
