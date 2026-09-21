import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Filter,
  Download,
  Plus,
  Search,
  Building2,
  Users,
  Receipt,
  FileText,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  Percent,
  ChevronDown,
  X,
  RefreshCcw,
} from "lucide-react";
import { PaymentMethod, CollectionStatus } from "../../types";
import { EmployeeFinanceTable } from "./EmployeeFinanceTable";
import { FinanceDrillDownModal } from "./FinanceDrillDownModal";

export const FinanceView: React.FC = () => {
  const {
    filteredContracts,
    filteredPayments,
    filteredCustomers,
    filteredSales,
    filteredInquiries,
    filteredEmployees,
    salaryPayments,
    commissionPayments,
    companies,
    selectedCompanyIds,
    activeCompany,
    addPayment,
    updatePayment,
    isCompanyManager,
    showToast,
    users,
    currentUser,
    setSelectedCustomerIdFor360,
    setCurrentTab,
    reconciliationReport,
    syncAllMonthlyStatements,
  } = useApp();

  // Internal Tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "payments" | "contracts" | "employee_finance" | "commissions" | "marketing" | "nesta_billing"
  >("overview");

  // Drilldown Modal State
  const [drilldownType, setDrilldownType] = useState<"contracts" | "collected" | "remaining" | "receipts" | null>(null);

  // Modal State for Editing a Payment
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [selectedPaymentToEdit, setSelectedPaymentToEdit] = useState<any | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState<number | "">("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>("cash");
  const [editPaymentNotes, setEditPaymentNotes] = useState<string>("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "this_month" | "last_month" | "custom">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [salesRepFilter, setSalesRepFilter] = useState<string>("all");

  // Modal State for New Payment
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReceiptNo, setPaymentReceiptNo] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // Filter payments by date range
  const dateFilteredPayments = useMemo(() => {
    return filteredPayments.filter((p) => {
      const pDate = p.date || p.createdAt || "";
      if (!pDate) return true;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const pDatePrefix = pDate.substring(0, 10);

      if (dateRange === "today") {
        return pDatePrefix === todayStr;
      }
      if (dateRange === "this_month") {
        const thisMonthPrefix = now.toISOString().substring(0, 7);
        return pDatePrefix.startsWith(thisMonthPrefix);
      }
      if (dateRange === "last_month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthPrefix = lastMonth.toISOString().substring(0, 7);
        return pDatePrefix.startsWith(lastMonthPrefix);
      }
      if (dateRange === "custom") {
        if (startDate && pDatePrefix < startDate) return false;
        if (endDate && pDatePrefix > endDate) return false;
      }
      return true;
    });
  }, [filteredPayments, dateRange, startDate, endDate]);

  // Overall Financial Calculations
  const metrics = useMemo(() => {
    // Total contracts value (valid contracts)
    const validContracts = filteredContracts.filter(
      (c) => c.recordStatus !== "duplicate" && c.recordStatus !== "excluded" && c.status !== "cancelled"
    );
    const totalContractsValue = validContracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);

    // Payments: only genuine confirmed/recorded
    const validPayments = dateFilteredPayments.filter(
      (p) => p.recordStatus !== "duplicate" && p.recordStatus !== "excluded" && p.status !== "reversed" && p.status !== "refunded"
    );
    const totalCollected = validPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Remaining on contracts
    const totalRemaining = Math.max(0, totalContractsValue - totalCollected);

    // Collection rate
    const collectionRate = totalContractsValue > 0 ? Math.round((totalCollected / totalContractsValue) * 100) : 0;

    // Due & Overdue counts and values
    const overdueContracts = validContracts.filter(
      (c) => c.collectionStatus === "overdue" || (c.remainingAmount > 0 && c.deliveryDate && new Date(c.deliveryDate) < new Date())
    );
    const overdueAmount = overdueContracts.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

    const dueContracts = validContracts.filter(
      (c) => c.collectionStatus === "due" || (c.remainingAmount > 0 && !c.deliveryDate)
    );
    const dueAmount = dueContracts.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

    // Payments breakdown by method
    const byMethod: Record<string, number> = {};
    validPayments.forEach((p) => {
      const m = p.method || "other";
      byMethod[m] = (byMethod[m] || 0) + p.amount;
    });

    return {
      totalContractsValue,
      totalCollected,
      totalRemaining,
      collectionRate,
      contractsCount: validContracts.length,
      paymentsCount: validPayments.length,
      overdueAmount,
      overdueCount: overdueContracts.length,
      dueAmount,
      dueCount: dueContracts.length,
      byMethod,
    };
  }, [filteredContracts, dateFilteredPayments]);

  // Handle Recording a New Payment
  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) {
      showToast("يرجى اختيار العقد المرتبط بالدفعة", "warning");
      return;
    }
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      showToast("يرجى إدخال مبلغ صحيح للدفعة", "warning");
      return;
    }

    const targetContract = filteredContracts.find((c) => c.id === selectedContractId);
    if (!targetContract) {
      showToast("العقد المحدد غير موجود", "warning");
      return;
    }

    const newPaymentData = {
      customerId: targetContract.customerId,
      contractId: targetContract.id,
      companyId: targetContract.companyId,
      amount: amt,
      date: paymentDate,
      method: paymentMethod,
      receiptNumber: paymentReceiptNo.trim() || `REC-${Date.now().toString().slice(-6)}`,
      notes: paymentNotes.trim() || undefined,
      status: "confirmed" as const,
      receivedBy: currentUser?.name || "المسؤول المالي",
    };

    addPayment(newPaymentData);
    showToast(`تم تسجيل دفعة تحصيل بقيمة ${amt.toLocaleString()} ج.م وتحديث رصيد العقد بنجاح`, "success");

    // Reset Form
    setIsNewPaymentModalOpen(false);
    setSelectedContractId("");
    setPaymentAmount("");
    setPaymentNotes("");
    setPaymentReceiptNo("");
  };

  // Filtered Payments Table
  const tablePayments = useMemo(() => {
    return dateFilteredPayments.filter((p) => {
      if (methodFilter !== "all" && p.method !== methodFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesReceipt = p.receiptNumber?.toLowerCase().includes(q);
        const matchesCust = p.customerName?.toLowerCase().includes(q);
        const matchesNotes = p.notes?.toLowerCase().includes(q);
        const matchesContract = p.contractNumber?.toLowerCase().includes(q);
        if (!matchesReceipt && !matchesCust && !matchesNotes && !matchesContract) return false;
      }
      return true;
    });
  }, [dateFilteredPayments, methodFilter, statusFilter, searchQuery]);

  // Export Table to CSV
  const handleExportPaymentsCSV = () => {
    if (tablePayments.length === 0) {
      showToast("لا توجد دفعات للتصدير", "warning");
      return;
    }

    const headers = ["رقم الإيصال", "التاريخ", "العميل", "رقم العقد", "المبلغ (ج.م)", "طريقة الدفع", "الحالة", "المستلم", "ملاحظات"];
    const rows = tablePayments.map((p) => [
      p.receiptNumber || "-",
      p.date || p.createdAt || "-",
      `"${p.customerName || "-"}"`,
      p.contractNumber || "-",
      p.amount,
      p.method || "-",
      p.status || "confirmed",
      `"${p.receivedBy || "-"}"`,
      `"${p.notes || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payments_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("تم تصدير سجل التحصيلات بنجاح", "success");
  };

  // Commission Calculations
  const commissionSummary = useMemo(() => {
    // Map sales reps
    const repMap: Record<
      string,
      {
        name: string;
        contractsCount: number;
        totalSold: number;
        totalCollected: number;
        commissionEarned: number;
      }
    > = {};

    filteredContracts.forEach((ctr) => {
      const rep = ctr.assignedTo || ctr.salesRep || "فريق المبيعات";
      if (!repMap[rep]) {
        repMap[rep] = {
          name: rep,
          contractsCount: 0,
          totalSold: 0,
          totalCollected: 0,
          commissionEarned: 0,
        };
      }
      repMap[rep].contractsCount += 1;
      repMap[rep].totalSold += ctr.totalValue || 0;
      repMap[rep].totalCollected += ctr.paidAmount || 0;

      // Find company commission rate
      const comp = companies.find((c) => c.id === ctr.companyId);
      const rate = comp?.commissionRate || 2.5; // default 2.5%
      const timing = comp?.commissionTiming || "down_payment";

      let eligibleBase = 0;
      if (timing === "contract_signing") {
        eligibleBase = ctr.totalValue || 0;
      } else if (timing === "down_payment") {
        eligibleBase = Math.min(ctr.downPayment || 0, ctr.paidAmount || 0);
      } else if (timing === "full_collection") {
        eligibleBase = ctr.paidAmount >= ctr.totalValue ? ctr.totalValue : 0;
      } else {
        eligibleBase = ctr.paidAmount || 0;
      }

      repMap[rep].commissionEarned += Math.round((eligibleBase * rate) / 100);
    });

    return Object.values(repMap);
  }, [filteredContracts, companies]);

  // Marketing Budget & CAC
  const marketingSummary = useMemo(() => {
    return companies
      .filter((c) => {
        if (selectedCompanyIds.length === 0 || selectedCompanyIds.includes("all")) return true;
        return selectedCompanyIds.includes(c.id);
      })
      .map((comp) => {
        const budget = comp.monthlyAdvertisingBudget || 25000;
        const compInquiries = filteredInquiries.filter((i) => i.companyId === comp.id).length;
        const compCustomers = filteredCustomers.filter((c) => c.companyId === comp.id).length;
        const compContracts = filteredContracts.filter((c) => c.companyId === comp.id);
        const compRevenue = compContracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);

        const cac = compCustomers > 0 ? Math.round(budget / compCustomers) : 0;
        const cpl = compInquiries > 0 ? Math.round(budget / compInquiries) : 0;
        const roas = budget > 0 ? Number((compRevenue / budget).toFixed(2)) : 0;

        return {
          company: comp,
          budget,
          inquiries: compInquiries,
          customers: compCustomers,
          contracts: compContracts.length,
          revenue: compRevenue,
          cac,
          cpl,
          roas,
        };
      });
  }, [companies, selectedCompanyIds, filteredInquiries, filteredCustomers, filteredContracts]);

  // Current Period for Employee Finance
  const currentPeriod = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const employeeMetrics = useMemo(() => {
    let totalSalaryDue = 0;
    filteredEmployees.forEach((emp) => {
      const history = emp.salaryHistory && emp.salaryHistory.length > 0 ? emp.salaryHistory : [
        {
          id: "init",
          employeeId: emp.id,
          companyId: emp.companyId,
          effectiveFrom: emp.startDate ? emp.startDate.slice(0, 7) : "2026-01",
          monthlySalary: emp.monthlySalary,
        },
      ];
      const matching = history.find(
        (rec) => rec.effectiveFrom <= currentPeriod && (!rec.effectiveTo || rec.effectiveTo >= currentPeriod)
      );
      totalSalaryDue += matching ? matching.monthlySalary : emp.monthlySalary;
    });

    const salaryPaid = salaryPayments
      .filter((p) => p.period === currentPeriod && p.status !== "cancelled")
      .reduce((sum, p) => sum + p.amount, 0);

    const salaryRemaining = Math.max(0, totalSalaryDue - salaryPaid);

    let totalCommissionsEarned = 0;
    filteredContracts.forEach((c) => {
      const comp = companies.find((co) => co.id === c.companyId);
      const rate = comp?.commissionRate || 2.5;
      const ctrDate = c.date || c.createdAt || "";
      if (ctrDate.startsWith(currentPeriod)) {
        totalCommissionsEarned += Math.round(((c.totalValue || 0) * rate) / 100);
      }
    });

    const commissionsPaid = commissionPayments
      .filter((cp) => cp.period === currentPeriod && cp.status === "paid")
      .reduce((sum, cp) => sum + cp.amount, 0);

    const commissionsRemaining = Math.max(0, totalCommissionsEarned - commissionsPaid);

    return {
      totalSalaryDue,
      salaryPaid,
      salaryRemaining,
      totalCommissionsEarned,
      commissionsPaid,
      commissionsRemaining,
      totalPaid: salaryPaid + commissionsPaid,
      totalOutstanding: salaryRemaining + commissionsRemaining,
      activeCount: filteredEmployees.filter((e) => e.active).length,
    };
  }, [filteredEmployees, salaryPayments, commissionPayments, filteredContracts, companies, currentPeriod]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#18191B] p-5 rounded-2xl border border-[#292B2E] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#EDEDED]">الإدارة المالية والتحصيلات</h1>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                تتبع التدفقات النقدية، جداول التحصيل، استحقاقات العمولات والميزانيات الإعلانية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setIsNewPaymentModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل دفعة تحصيل</span>
          </button>
          <button
            onClick={handleExportPaymentsCSV}
            className="px-3 py-2.5 bg-[#202225] hover:bg-[#272A2D] text-[#EDEDED] text-xs font-bold rounded-xl border border-[#292B2E] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="تصدير إلى Excel / CSV"
          >
            <Download className="w-4 h-4 text-[#A1A1AA]" />
            <span className="hidden sm:inline">تصدير</span>
          </button>
        </div>
      </div>

      {/* Main Financial KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div
          onClick={() => setDrilldownType("contracts")}
          className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl space-y-1.5 shadow-xs cursor-pointer hover:border-sky-800/50 hover:bg-[#1E2023] transition-all group"
          title="انقر لعرض كشف التعاقدات بالتفصيل"
        >
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>إجمالي التعاقدات</span>
            <FileText className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-black text-[#EDEDED] font-mono">
            {metrics.totalContractsValue.toLocaleString()} <span className="text-xs font-normal text-[#71717A]">ج.م</span>
          </div>
          <div className="text-[11px] text-[#71717A]">
            من واقع {metrics.contractsCount} عقداً معتمداً
          </div>
        </div>

        <div
          onClick={() => setDrilldownType("collected")}
          className="bg-[#18191B] border border-emerald-900/30 p-4 rounded-2xl space-y-1.5 shadow-xs relative overflow-hidden cursor-pointer hover:border-emerald-700/50 hover:bg-[#1E2023] transition-all group"
          title="انقر لعرض سجل التحصيلات الفعلية بالتفصيل"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500"></div>
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>المحصل الفعلي</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
            {metrics.totalCollected.toLocaleString()} <span className="text-xs font-normal text-emerald-400/60">ج.م</span>
          </div>
          <div className="text-[11px] text-emerald-400/80 font-semibold flex items-center justify-between">
            <span>نسبة التحصيل:</span>
            <span className="font-mono font-bold">{metrics.collectionRate}%</span>
          </div>
        </div>

        <div
          onClick={() => setDrilldownType("remaining")}
          className="bg-[#18191B] border border-amber-900/30 p-4 rounded-2xl space-y-1.5 shadow-xs relative overflow-hidden cursor-pointer hover:border-amber-700/50 hover:bg-[#1E2023] transition-all group"
          title="انقر لعرض المتبقيات ومستحقات العملاء بالتفصيل"
        >
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500"></div>
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>المتبقي طرف العملاء</span>
            <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">
            {metrics.totalRemaining.toLocaleString()} <span className="text-xs font-normal text-amber-300/60">ج.م</span>
          </div>
          <div className="text-[11px] text-amber-400/80 font-semibold">
            متأخر: {metrics.overdueAmount.toLocaleString()} ج.م
          </div>
        </div>

        <div
          onClick={() => setDrilldownType("receipts")}
          className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl space-y-1.5 shadow-xs cursor-pointer hover:border-purple-800/50 hover:bg-[#1E2023] transition-all group"
          title="انقر لعرض دفتر إيصالات التحصيل بالتفصيل"
        >
          <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>عدد التحصيلات</span>
            <Receipt className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-black text-[#EDEDED] font-mono">
            {metrics.paymentsCount} <span className="text-xs font-normal text-[#71717A]">إيصال مسجل</span>
          </div>
          <div className="text-[11px] text-[#71717A]">
            عبر الخزينة والتحويلات البنكية
          </div>
        </div>
      </div>

      {/* Reconciliation Health Warning (Single Source of Truth Check) */}
      {reconciliationReport && reconciliationReport.gap > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#EDEDED]">تنبيه فحص مطابقة التحصيلات (فجوة مالية مكتشفة)</h4>
              <p className="text-[11px] text-[#A1A1AA] mt-1">
                هناك فرق قدره <strong className="text-amber-400 font-mono">{reconciliationReport.gap.toLocaleString()} ج.م</strong> بين إجمالي العقود المعتمدة ({reconciliationReport.totalContracts} عقد) وإجمالي الإيصالات المسجلة ({reconciliationReport.totalPayments} إيصال).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-[#71717A]">القيم المسجلة:</p>
              <p className="text-[10px] font-mono text-[#A1A1AA]">
                {reconciliationReport.totalPaymentValue.toLocaleString()} / {reconciliationReport.totalContractValue.toLocaleString()}
              </p>
            </div>
            <button 
              onClick={() => setDrilldownType("remaining")}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-[11px] font-bold rounded-lg border border-amber-500/30 transition-all cursor-pointer"
            >
              فحص العقود غير المكتملة
            </button>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#292B2E] pb-3 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "overview"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-[#A1A1AA] hover:bg-[#202225] hover:text-[#EDEDED]"
          }`}
        >
          📊 النظرة المالية العامة
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "payments"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-[#A1A1AA] hover:bg-[#202225] hover:text-[#EDEDED]"
          }`}
        >
          🧾 سجل الدفعات والإيصالات ({tablePayments.length})
        </button>
        <button
          onClick={() => setActiveTab("contracts")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "contracts"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-[#A1A1AA] hover:bg-[#202225] hover:text-[#EDEDED]"
          }`}
        >
          📑 جدول تحصيلات العقود ({filteredContracts.length})
        </button>
        <button
          onClick={() => setActiveTab("employee_finance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "employee_finance"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-[#A1A1AA] hover:bg-[#202225] hover:text-[#EDEDED]"
          }`}
        >
          👥 حسابات الموظفين والرواتب ({filteredEmployees.length})
        </button>
        <button
          onClick={() => setActiveTab("commissions")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "commissions"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-[#A1A1AA] hover:bg-[#202225] hover:text-[#EDEDED]"
          }`}
        >
          💼 العمولات والتحفيز ({commissionSummary.length})
        </button>
        <button
          onClick={() => setActiveTab("marketing")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "marketing"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-[#A1A1AA] hover:bg-[#202225] hover:text-[#EDEDED]"
          }`}
        >
          📢 الميزانيات الإعلانية و ROI
        </button>
        <button
          onClick={() => setActiveTab("nesta_billing")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "nesta_billing"
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              : "text-[#A1A1AA] hover:bg-[#202225] hover:text-[#EDEDED]"
          }`}
        >
          🛡️ اشتراكات وعقود NESTA للشركات
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Methods Breakdown + Collection Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Payment Methods Distribution */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#EDEDED] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                توزيع التحصيلات حسب طريقة الدفع
              </h3>
              <div className="space-y-3">
                {Object.entries(metrics.byMethod).length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#71717A]">
                    لا توجد تحصيلات مسجلة حتى الآن
                  </div>
                ) : (
                  Object.entries(metrics.byMethod).map(([method, val]) => {
                    const amount = Number(val);
                    const pct = metrics.totalCollected > 0 ? Math.round((amount / metrics.totalCollected) * 100) : 0;
                    const methodLabels: Record<string, string> = {
                      cash: "💵 نقدًا (خزينة)",
                      bank_transfer: "🏦 تحويل بنكي",
                      instapay: "⚡ إنستاباي (InstaPay)",
                      cheque: "📝 شيك بنكي",
                      visa: "💳 بطاقة دفع إلكتروني",
                      vodafone_cash: "📱 محفظة إلكترونية",
                      other: "🌐 أخرى",
                    };
                    return (
                      <div key={method} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#EDEDED]">{methodLabels[method] || method}</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {amount.toLocaleString()} ج.م ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Collection Health & Overdue */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#EDEDED] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                مؤشرات التحصيل والديون المستحقة
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#202225] p-3.5 rounded-xl border border-[#292B2E]">
                  <div className="text-xs text-[#A1A1AA]">التحصيلات المتأخرة</div>
                  <div className="text-base font-bold text-rose-400 font-mono mt-1">
                    {metrics.overdueAmount.toLocaleString()} ج.م
                  </div>
                  <div className="text-[10px] text-[#71717A] mt-0.5">
                    {metrics.overdueCount} عقود تجاوزت موعد الاستحقاق
                  </div>
                </div>
                <div className="bg-[#202225] p-3.5 rounded-xl border border-[#292B2E]">
                  <div className="text-xs text-[#A1A1AA]">التحصيلات المستحقة قريباً</div>
                  <div className="text-base font-bold text-amber-400 font-mono mt-1">
                    {metrics.dueAmount.toLocaleString()} ج.م
                  </div>
                  <div className="text-[10px] text-[#71717A] mt-0.5">
                    {metrics.dueCount} عقود بمرحلة المتابعة
                  </div>
                </div>
              </div>

              {/* Progress Summary Bar */}
              <div className="bg-[#202225] p-4 rounded-xl border border-[#292B2E] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#A1A1AA]">نسبة التحصيل التراكمية:</span>
                  <span className="text-emerald-400 font-bold font-mono">{metrics.collectionRate}%</span>
                </div>
                <div className="w-full h-3 bg-[#18191B] rounded-full overflow-hidden p-0.5 border border-[#292B2E]">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics.collectionRate)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#71717A]">
                  <span>محصل: {metrics.totalCollected.toLocaleString()} ج.م</span>
                  <span>المستهدف: {metrics.totalContractsValue.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>
          </div>

          {/* Distinct Separation: Employee Finance & Payroll Section */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#292B2E] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#C8A75A]/10 text-[#C8A75A] border border-[#C8A75A]/20">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#EDEDED]">
                    أموال ومستحقات الموظفين (Employee Finance & Payroll)
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    فصل تام ومحاسبي بين تحصيلات العملاء والتزامات رواتب وعمولات فريق العمل ({currentPeriod})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("employee_finance")}
                className="px-3.5 py-1.5 bg-[#202225] hover:bg-[#272A2D] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>فتح جدول حسابات الموظفين الكامل</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#C8A75A]" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#202225] p-3.5 rounded-xl border border-[#292B2E] space-y-1">
                <div className="text-xs text-[#A1A1AA] flex items-center justify-between">
                  <span>الرواتب المستحقة</span>
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-base font-bold text-[#EDEDED] font-mono">
                  {employeeMetrics.totalSalaryDue.toLocaleString()} ج.م
                </div>
                <div className="text-[10px] text-[#71717A]">
                  المسدد: {employeeMetrics.salaryPaid.toLocaleString()} ج.م
                </div>
              </div>

              <div className="bg-[#202225] p-3.5 rounded-xl border border-[#292B2E] space-y-1">
                <div className="text-xs text-[#A1A1AA] flex items-center justify-between">
                  <span>العمولات المكتسبة</span>
                  <Percent className="w-3.5 h-3.5 text-[#C8A75A]" />
                </div>
                <div className="text-base font-bold text-[#C8A75A] font-mono">
                  {employeeMetrics.totalCommissionsEarned.toLocaleString()} ج.م
                </div>
                <div className="text-[10px] text-[#71717A]">
                  من واقع العقود المغلقة
                </div>
              </div>

              <div className="bg-[#202225] p-3.5 rounded-xl border border-emerald-900/30 space-y-1">
                <div className="text-xs text-[#A1A1AA] flex items-center justify-between">
                  <span>إجمالي المنصرف فعلياً</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-base font-bold text-emerald-400 font-mono">
                  {employeeMetrics.totalPaid.toLocaleString()} ج.م
                </div>
                <div className="text-[10px] text-emerald-400/80 font-semibold">
                  سندات صرف مسجلة
                </div>
              </div>

              <div className="bg-[#202225] p-3.5 rounded-xl border border-amber-900/30 space-y-1">
                <div className="text-xs text-[#A1A1AA] flex items-center justify-between">
                  <span>المتبقي المستحق للصرف</span>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-base font-bold text-amber-400 font-mono">
                  {employeeMetrics.totalOutstanding.toLocaleString()} ج.م
                </div>
                <div className="text-[10px] text-amber-400/80 font-semibold">
                  طرف إدارة الشركة
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS REGISTER */}
      {activeTab === "payments" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#18191B] p-4 rounded-2xl border border-[#292B2E]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#71717A] absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الإيصال أو العقد أو العميل..."
                className="w-full pr-9 pl-3 py-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">كل طرق الدفع</option>
                <option value="cash">💵 نقدًا (خزينة)</option>
                <option value="bank_transfer">🏦 تحويل بنكي</option>
                <option value="instapay">⚡ إنستاباي</option>
                <option value="cheque">📝 شيك</option>
                <option value="visa">💳 فيزا</option>
                <option value="vodafone_cash">📱 محفظة إلكترونية</option>
              </select>
            </div>

            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">كل الفترات الزمنية</option>
                <option value="today">اليوم فقط</option>
                <option value="this_month">هذا الشهر</option>
                <option value="last_month">الشهر الماضي</option>
                <option value="custom">تاريخ مخصص...</option>
              </select>
            </div>

            {dateRange === "custom" ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-1/2 p-1.5 bg-[#202225] border border-[#292B2E] rounded-lg text-xs text-[#EDEDED]"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-1/2 p-1.5 bg-[#202225] border border-[#292B2E] rounded-lg text-xs text-[#EDEDED]"
                />
              </div>
            ) : (
              <div className="flex items-center justify-end text-xs text-[#A1A1AA] px-2 font-mono">
                إجمالي المعروض: {tablePayments.length} إيصال
              </div>
            )}
          </div>

          {/* Payments Table */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                 <thead className="bg-[#202225] text-[#A1A1AA] border-b border-[#292B2E]">
                  <tr>
                    <th className="p-3.5 font-bold">رقم الإيصال</th>
                    <th className="p-3.5 font-bold">التاريخ</th>
                    <th className="p-3.5 font-bold">العميل</th>
                    <th className="p-3.5 font-bold">رقم العقد</th>
                    <th className="p-3.5 font-bold">المبلغ</th>
                    <th className="p-3.5 font-bold">طريقة الدفع</th>
                    <th className="p-3.5 font-bold">المستلم</th>
                    <th className="p-3.5 font-bold">الحالة</th>
                    <th className="p-3.5 font-bold">ملاحظات</th>
                    <th className="p-3.5 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {tablePayments.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[#71717A]">
                        لا توجد دفعات مطابقة لشروط البحث والتصفية
                      </td>
                    </tr>
                  ) : (
                    tablePayments.map((p) => {
                      const methodBadge: Record<string, string> = {
                        cash: "bg-emerald-950/60 text-emerald-400 border-emerald-800/40",
                        bank_transfer: "bg-blue-950/60 text-blue-400 border-blue-800/40",
                        instapay: "bg-purple-950/60 text-purple-400 border-purple-800/40",
                        cheque: "bg-amber-950/60 text-amber-400 border-amber-800/40",
                        visa: "bg-sky-950/60 text-sky-400 border-sky-800/40",
                        vodafone_cash: "bg-rose-950/60 text-rose-400 border-rose-800/40",
                      };
                      return (
                        <tr key={p.id} className="hover:bg-[#202225]/50 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-[#EDEDED]">
                            {p.receiptNumber || `REC-${p.id.slice(0, 6)}`}
                          </td>
                          <td className="p-3.5 font-mono text-[#A1A1AA]">
                            {p.date ? p.date.substring(0, 10) : "-"}
                          </td>
                          <td className="p-3.5 font-bold text-[#EDEDED]">
                            {p.customerId ? (
                              <button
                                onClick={() => {
                                  setSelectedCustomerIdFor360(p.customerId);
                                  setCurrentTab("customers");
                                }}
                                className="text-sky-400 hover:underline text-right cursor-pointer"
                              >
                                {p.customerName || "عميل"}
                              </button>
                            ) : (
                              p.customerName || "-"
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-[#A1A1AA]">
                            {p.contractNumber || "-"}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-emerald-400">
                            {p.amount.toLocaleString()} ج.م
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                methodBadge[p.method] || "bg-gray-800 text-gray-300 border-gray-700"
                              }`}
                            >
                              {p.method}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#A1A1AA]">{p.receivedBy || "-"}</td>
                          <td className="p-3.5">
                            {isCompanyManager ? (
                              <select
                                value={p.status || "confirmed"}
                                onChange={(e) => {
                                  updatePayment(p.id, { status: e.target.value as any });
                                }}
                                className={`text-[11px] px-2 py-1 rounded-md font-bold border bg-[#18191B] cursor-pointer ${
                                  p.status === "confirmed"
                                    ? "text-emerald-400 border-emerald-800/40"
                                    : p.status === "recorded"
                                    ? "text-blue-400 border-blue-800/40"
                                    : p.status === "reversed"
                                    ? "text-rose-400 border-rose-800/40 bg-rose-950/20"
                                    : "text-amber-400 border-amber-800/40 bg-amber-950/20"
                                }`}
                              >
                                <option value="recorded">مسجل (Recorded)</option>
                                <option value="confirmed">مؤكد ✅ (Confirmed)</option>
                                <option value="reversed">معكوس 🛑 (Reversed)</option>
                                <option value="refunded">مرتجع 🔄 (Refunded)</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  p.status === "confirmed"
                                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                                    : p.status === "recorded"
                                    ? "bg-blue-950/60 text-blue-400 border-blue-800/40"
                                    : p.status === "reversed"
                                    ? "bg-rose-950/60 text-rose-400 border-rose-800/40"
                                    : "bg-amber-950/60 text-amber-400 border-amber-800/40"
                                }`}
                              >
                                {p.status === "confirmed"
                                  ? "مؤكد"
                                  : p.status === "recorded"
                                  ? "مسجل"
                                  : p.status === "reversed"
                                  ? "معكوس"
                                  : p.status === "refunded"
                                  ? "مرتجع"
                                  : "مؤكد"}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-[#71717A] max-w-[150px] truncate" title={p.notes}>
                            {p.notes || "-"}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedPaymentToEdit(p);
                                setEditPaymentAmount(p.amount);
                                setEditPaymentMethod(p.method);
                                setEditPaymentNotes(p.notes || "");
                                setIsEditPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="تعديل قيمة وطريقة سداد الدفعة"
                            >
                              تعديل
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTRACTS COLLECTION SCHEDULE */}
      {activeTab === "contracts" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#202225] text-[#A1A1AA] border-b border-[#292B2E]">
                  <tr>
                    <th className="p-3.5 font-bold">رقم العقد</th>
                    <th className="p-3.5 font-bold">العميل</th>
                    <th className="p-3.5 font-bold">تاريخ التعاقد</th>
                    <th className="p-3.5 font-bold">قيمة العقد</th>
                    <th className="p-3.5 font-bold">المقدم</th>
                    <th className="p-3.5 font-bold">المحصل</th>
                    <th className="p-3.5 font-bold">المتبقي</th>
                    <th className="p-3.5 font-bold">حالة التحصيل</th>
                    <th className="p-3.5 font-bold text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[#71717A]">
                        لا توجد عقود مسجلة
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((ctr) => {
                      const totalVal = ctr.totalValue || 0;
                      const paid = ctr.paidAmount || 0;
                      const rem = ctr.remainingBalance ?? Math.max(0, totalVal - paid);
                      const isPaidFull = rem <= 0 && totalVal > 0;

                      return (
                        <tr key={ctr.id} className="hover:bg-[#202225]/50 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-[#EDEDED]">
                            {ctr.contractNumber || ctr.id.slice(0, 8)}
                          </td>
                          <td className="p-3.5 font-bold text-[#EDEDED]">
                            <button
                              onClick={() => {
                                setSelectedCustomerIdFor360(ctr.customerId);
                                setCurrentTab("customers");
                              }}
                              className="text-sky-400 hover:underline text-right cursor-pointer"
                            >
                              {ctr.customerName || "عميل"}
                            </button>
                          </td>
                          <td className="p-3.5 font-mono text-[#A1A1AA]">
                            {ctr.signDate ? ctr.signDate.substring(0, 10) : "-"}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[#EDEDED]">
                            {totalVal.toLocaleString()} ج.م
                          </td>
                          <td className="p-3.5 font-mono text-[#A1A1AA]">
                            {(ctr.downPayment || 0).toLocaleString()} ج.م
                          </td>
                          <td className="p-3.5 font-mono font-bold text-emerald-400">
                            {paid.toLocaleString()} ج.م
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-400">
                            {rem.toLocaleString()} ج.م
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                isPaidFull
                                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                                  : rem > 0 && paid > 0
                                  ? "bg-sky-950/60 text-sky-400 border-sky-800/40"
                                  : "bg-amber-950/60 text-amber-400 border-amber-800/40"
                              }`}
                            >
                              {isPaidFull ? "مسدد بالكامل" : paid > 0 ? "مسدد جزئياً" : "بانتظار المقدم"}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            {rem > 0 ? (
                              <button
                                onClick={() => {
                                  setSelectedContractId(ctr.id);
                                  setPaymentAmount(rem);
                                  setIsNewPaymentModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/30 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                تحصيل دفعة
                              </button>
                            ) : (
                              <span className="text-emerald-500 text-xs">✓ مكتمل</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: EMPLOYEE FINANCE & PAYROLL */}
      {activeTab === "employee_finance" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center bg-[#18191B] p-4 rounded-2xl border border-[#292B2E]">
            <h2 className="text-sm font-bold flex items-center gap-2 text-[#EDEDED]">
              <Users className="w-5 h-5 text-[#C8A75A]" />
              كشوفات المالية والعمولات المركزية
            </h2>
            <div className="flex items-center gap-2">
              {isCompanyManager && (
                <button
                  onClick={() => syncAllMonthlyStatements()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#C8A75A]/10 text-[#C8A75A] rounded-lg hover:bg-[#C8A75A]/20 transition-all border border-[#C8A75A]/20 text-xs font-bold"
                  title="مزامنة كافة كشوفات الموظفين مع السحابة لضمان وجود الـ 9 أشهر"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  مزامنة الكشوفات المركزية
                </button>
              )}
            </div>
          </div>
          <EmployeeFinanceTable />
        </div>
      )}

      {/* TAB 4: COMMISSIONS & SALES INCENTIVES */}
      {activeTab === "commissions" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Rules Summary Box */}
          <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-[#EDEDED] flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-[#C8A75A]" />
              قواعد احتساب عمولات الشركات الحالية
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {companies.map((c) => (
                <div key={c.id} className="bg-[#202225] p-3 rounded-xl border border-[#292B2E] text-xs space-y-1">
                  <div className="font-bold text-[#EDEDED] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color || "#C8A75A" }} />
                    {c.name}
                  </div>
                  <div className="text-[11px] text-[#A1A1AA]">
                    نسبة العمولة: <strong className="text-[#C8A75A] font-mono">{c.commissionRate || 2.5}%</strong>
                  </div>
                  <div className="text-[11px] text-[#71717A]">
                    توقيت الاستحقاق:{" "}
                    {c.commissionTiming === "contract_signing"
                      ? "عند توقيع العقد"
                      : c.commissionTiming === "full_collection"
                      ? "عند اكتمال التحصيل"
                      : "عند سداد الدفعة المقدمة"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Rep Commission Distribution Table */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#202225] text-[#A1A1AA] border-b border-[#292B2E]">
                  <tr>
                    <th className="p-3.5 font-bold">مسؤول المبيعات</th>
                    <th className="p-3.5 font-bold">العقود المغلقة</th>
                    <th className="p-3.5 font-bold">إجمالي المبيعات</th>
                    <th className="p-3.5 font-bold">التحصيلات المحققة</th>
                    <th className="p-3.5 font-bold">العمولة المستحقة التقديرية</th>
                    <th className="p-3.5 font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {commissionSummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#71717A]">
                        لا توجد بيانات عمولات للعرض
                      </td>
                    </tr>
                  ) : (
                    commissionSummary.map((rep, idx) => (
                      <tr key={idx} className="hover:bg-[#202225]/50 transition-colors">
                        <td className="p-3.5 font-bold text-[#EDEDED] flex items-center gap-2">
                          <Users className="w-4 h-4 text-sky-400" />
                          <span>{rep.name}</span>
                        </td>
                        <td className="p-3.5 font-mono text-[#A1A1AA]">{rep.contractsCount}</td>
                        <td className="p-3.5 font-mono font-bold text-[#EDEDED]">
                          {rep.totalSold.toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {rep.totalCollected.toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5 font-mono font-bold text-[#C8A75A]">
                          {rep.commissionEarned.toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40">
                            مستحقة للصرف
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MARKETING BUDGET & ROI */}
      {activeTab === "marketing" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketingSummary.map((m) => (
              <div
                key={m.company.id}
                className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-3 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 left-0 h-1"
                  style={{ backgroundColor: m.company.color || "#C8A75A" }}
                />
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-[#EDEDED] text-sm">{m.company.name}</h4>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#202225] text-[#C8A75A] border border-[#292B2E]">
                    ROAS: {m.roas}x
                  </span>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>الميزانية الإعلانية الشهرية:</span>
                    <strong className="text-[#EDEDED] font-mono">{m.budget.toLocaleString()} ج.م</strong>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>الاستفسارات الواردة:</span>
                    <strong className="text-sky-400 font-mono">{m.inquiries}</strong>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>العملاء المكتسبون:</span>
                    <strong className="text-emerald-400 font-mono">{m.customers}</strong>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>إجمالي مبيعات التعاقد:</span>
                    <strong className="text-emerald-400 font-mono">{m.revenue.toLocaleString()} ج.م</strong>
                  </div>
                  <div className="border-t border-[#292B2E] pt-2 flex justify-between font-bold">
                    <span className="text-[#EDEDED]">تكلفة اكتساب العميل (CAC):</span>
                    <span className="text-[#C8A75A] font-mono">{m.cac.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: NESTA SERVICE BILLING (SEPARATE REVENUE FOR PLATFORM RUNNER) */}
      {activeTab === "nesta_billing" && (
        <div className="space-y-6 animate-in fade-in duration-150 text-xs">
          {/* Informational Banner */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-[#EDEDED] text-xs">تنبيه مالي وإداري هام (فصل المردود المالي لـ NESTA)</h4>
              <p className="text-[#A1A1AA] text-[11px] leading-relaxed">
                سعر تقديم خدمة NESTA للشركة لا يدخل ضمن: المبيعات (Sales)، قيمة العقد (Contract Value)، التحصيلات (Collections)، مدفوعات العملاء، عمولة الموظفين، أو الميزانية الإعلانية.
                تُعتبر اشتراكات وعقود الفوترة للشركات مردوداً مالياً ثابتاً ومستقلاً خاصاً بمنصة NESTA لإدارة وتوجيه الأعمال.
              </p>
            </div>
          </div>

          {/* KPI Summary Row */}
          {(() => {
            const activePlans = companies.filter((c) => c.serviceStatus === "Active" || !c.serviceStatus);
            const mrr = companies.reduce((acc, curr) => acc + (Number(curr.monthlyServicePrice) || 0), 0);
            const totalAdvertising = companies.reduce((acc, curr) => acc + (Number(curr.monthlyAdvertisingBudget) || 0), 0);
            const averagePrice = activePlans.length > 0 ? Math.round(mrr / activePlans.length) : 0;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4.5 space-y-1">
                  <div className="text-[11px] text-[#A1A1AA]">الإيرادات الشهرية المتكررة (MRR)</div>
                  <div className="text-xl font-bold text-amber-400 font-mono">
                    {mrr.toLocaleString()} ج.م
                  </div>
                  <div className="text-[10px] text-[#A1A1AA]">إجمالي رسوم تقديم الخدمة الثابتة من الشركات</div>
                </div>

                <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4.5 space-y-1">
                  <div className="text-[11px] text-[#A1A1AA]">عقود الخدمة النشطة لـ NESTA</div>
                  <div className="text-xl font-bold text-emerald-400">
                    {activePlans.length} / {companies.length}
                  </div>
                  <div className="text-[10px] text-[#A1A1AA]">شركات مفعلة بالدعم الفني والمبيعات</div>
                </div>

                <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4.5 space-y-1">
                  <div className="text-[11px] text-[#A1A1AA]">متوسط سعر اشتراك الشركة</div>
                  <div className="text-xl font-bold text-sky-400 font-mono">
                    {averagePrice.toLocaleString()} ج.م
                  </div>
                  <div className="text-[10px] text-[#A1A1AA]">لكل عقد خدمة فعال</div>
                </div>

                <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4.5 space-y-1">
                  <div className="text-[11px] text-[#A1A1AA]">إجمالي ميزانيات الإعلانات المشغلة</div>
                  <div className="text-xl font-bold text-[#EDEDED] font-mono">
                    {totalAdvertising.toLocaleString()} ج.م
                  </div>
                  <div className="text-[10px] text-rose-400 font-bold">
                    مستبعدة بالكامل من ربح NESTA
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Detailed Plans Table */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#292B2E] flex justify-between items-center">
              <h3 className="font-bold text-sm text-[#EDEDED]">
                جدول عقود وباقات تقديم خدمة NESTA للشركات المسجلة
              </h3>
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-2.5 py-1 rounded-lg">
                فوترة نظام الإدارة والتشغيل
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#1A1C1E] border-b border-[#292B2E] text-[#A1A1AA] text-[11px] font-bold">
                    <th className="p-3.5">الشركة</th>
                    <th className="p-3.5">باقة الخدمة (Service Plan)</th>
                    <th className="p-3.5">سعر الخدمة الشهري (ج.م)</th>
                    <th className="p-3.5">دورة الفوترة</th>
                    <th className="p-3.5">تاريخ بدء الخدمة</th>
                    <th className="p-3.5">الموقع والجغرافيا</th>
                    <th className="p-3.5">حالة الخدمة</th>
                    <th className="p-3.5 text-left">ملاحظات الفوترة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {companies.map((comp) => {
                    const status = comp.serviceStatus || "Active";
                    return (
                      <tr key={comp.id} className="hover:bg-[#1E2022] transition-colors text-xs text-[#EDEDED]">
                        <td className="p-3.5 flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: comp.color || "#C8A75A" }}
                          />
                          <div>
                            <span className="font-bold block">{comp.name}</span>
                            <span className="text-[10px] text-[#A1A1AA] font-mono">{comp.phone || "بدون هاتف"}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-[#C8A75A]">
                            {comp.servicePlan || "باقة تشغيل أساسية"}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold font-mono text-emerald-400">
                          {(comp.monthlyServicePrice || 0).toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#2A2D32] text-[#A1A1AA]">
                            {comp.billingCycle || "Monthly"}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-[#A1A1AA]">
                          {comp.serviceStartDate || "2026-01-01"}
                        </td>
                        <td className="p-3.5 text-[#A1A1AA]">
                          {comp.address || "القاهرة الكبرى"}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              status === "Active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                : status === "Paused"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                            }`}
                          >
                            {status === "Active"
                              ? "نشط"
                              : status === "Paused"
                              ? "موقوف مؤقتاً"
                              : "ملغى / منتهي"}
                          </span>
                        </td>
                        <td className="p-3.5 text-left text-[11px] text-[#A1A1AA] max-w-[200px] truncate">
                          {comp.serviceNotes || "لا توجد ملاحظات استثنائية"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record New Payment Modal */}
      {isNewPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-[#292B2E] pb-3">
              <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>تسجيل دفعة تحصيل جديدة</span>
              </h3>
              <button
                onClick={() => setIsNewPaymentModalOpen(false)}
                className="p-1 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#202225] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-semibold">العقد المرتبط *</label>
                <select
                  required
                  value={selectedContractId}
                  onChange={(e) => {
                    setSelectedContractId(e.target.value);
                    const ctr = filteredContracts.find((c) => c.id === e.target.value);
                    if (ctr) {
                      const rem = ctr.remainingBalance ?? Math.max(0, (ctr.totalValue || 0) - (ctr.paidAmount || 0));
                      setPaymentAmount(rem > 0 ? rem : "");
                    }
                  }}
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- اختر العقد المطلوب تحصيله --</option>
                  {filteredContracts.map((c) => {
                    const rem = c.remainingBalance ?? Math.max(0, (c.totalValue || 0) - (c.paidAmount || 0));
                    return (
                      <option key={c.id} value={c.id}>
                        {c.contractNumber || c.id.slice(0, 8)} - {c.customerName} (متبقي: {rem.toLocaleString()} ج.م)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-semibold">المبلغ المسدد (ج.م) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] font-mono font-bold outline-hidden focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-semibold">تاريخ التحصيل *</label>
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
                  <label className="block text-[#A1A1AA] mb-1 font-semibold">طريقة الدفع *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="cash">💵 نقدًا (خزينة)</option>
                    <option value="bank_transfer">🏦 تحويل بنكي</option>
                    <option value="instapay">⚡ إنستاباي (InstaPay)</option>
                    <option value="cheque">📝 شيك</option>
                    <option value="visa">💳 فيزا / كارت</option>
                    <option value="vodafone_cash">📱 فودافون كاش</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-semibold">رقم الإيصال / المرجع</label>
                  <input
                    type="text"
                    value={paymentReceiptNo}
                    onChange={(e) => setPaymentReceiptNo(e.target.value)}
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500 font-mono"
                    placeholder="تلقائي إن تُرِك فارغاً"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A1A1AA] mb-1 font-semibold">ملاحظات التحصيل</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-emerald-500"
                  placeholder="مثال: دفعة استلام قطاعات الألوميتال..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#292B2E]">
                <button
                  type="button"
                  onClick={() => setIsNewPaymentModalOpen(false)}
                  className="px-4 py-2 bg-[#202225] hover:bg-[#292B2E] text-[#A1A1AA] rounded-xl font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد وتسجيل الدفعة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Finance DrillDown Modal */}
      <FinanceDrillDownModal
        isOpen={drilldownType !== null}
        onClose={() => setDrilldownType(null)}
        type={drilldownType}
        contracts={filteredContracts}
        payments={dateFilteredPayments}
        onCollect={(contractId, remainingAmount) => {
          setSelectedContractId(contractId);
          setPaymentAmount(remainingAmount);
          setIsNewPaymentModalOpen(true);
          setDrilldownType(null);
        }}
      />

      {/* Edit Payment Modal */}
      {isEditPaymentModalOpen && selectedPaymentToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150 text-right">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
            <div className="p-5 border-b border-[#292B2E] bg-[#1E2023] flex items-center justify-between flex-row-reverse">
              <button
                onClick={() => setIsEditPaymentModalOpen(false)}
                className="p-1.5 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#292B2E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-500">
                  <Plus className="w-5 h-5 rotate-45" />
                </div>
                <h3 className="text-sm font-black text-[#EDEDED]">تعديل بيانات الدفعة التاريخية</h3>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editPaymentAmount || Number(editPaymentAmount) <= 0) {
                  showToast("يرجى إدخال مبلغ صحيح", "warning");
                  return;
                }
                updatePayment(selectedPaymentToEdit.id, {
                  amount: Number(editPaymentAmount),
                  method: editPaymentMethod,
                  notes: editPaymentNotes,
                });
                setIsEditPaymentModalOpen(false);
              }}
              className="p-5 space-y-4 text-xs text-right"
            >
              <div className="p-3 bg-[#202225] border border-[#292B2E] rounded-xl space-y-1">
                <p className="text-[11px] text-[#A1A1AA]">الإيصال: <strong className="text-[#EDEDED] font-mono">{selectedPaymentToEdit.receiptNumber}</strong></p>
                <p className="text-[11px] text-[#A1A1AA]">العميل: <strong className="text-[#EDEDED]">{selectedPaymentToEdit.customerName}</strong></p>
                <p className="text-[11px] text-[#A1A1AA]">رقم العقد: <strong className="text-[#EDEDED] font-mono">{selectedPaymentToEdit.contractNumber}</strong></p>
              </div>

              <div>
                <label className="block text-[#A1A1AA] mb-1 font-semibold">القيمة المعدلة (ج.م) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editPaymentAmount}
                  onChange={(e) => setEditPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] font-mono font-bold outline-hidden focus:border-amber-500 text-right"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] mb-1 font-semibold">طريقة الدفع *</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="cash">💵 نقدًا (خزينة)</option>
                  <option value="bank_transfer">🏦 تحويل بنكي</option>
                  <option value="instapay">⚡ إنستاباي (InstaPay)</option>
                  <option value="cheque">📝 شيك</option>
                  <option value="visa">💳 فيزا / كارت</option>
                  <option value="vodafone_cash">📱 فودافون كاش</option>
                </select>
              </div>

              <div>
                <label className="block text-[#A1A1AA] mb-1 font-semibold">سبب التعديل والتوثيق</label>
                <textarea
                  value={editPaymentNotes}
                  onChange={(e) => setEditPaymentNotes(e.target.value)}
                  className="w-full p-2.5 h-20 bg-[#202225] border border-[#292B2E] rounded-xl text-[#EDEDED] outline-hidden focus:border-amber-500 resize-none text-right"
                  placeholder="أدخل سبب التعديل لتوثيقه بسجل الرقابة المالي..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#292B2E] flex-row-reverse">
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تحديث وحفظ التعديل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditPaymentModalOpen(false)}
                  className="px-4 py-2 bg-[#202225] hover:bg-[#292B2E] text-[#A1A1AA] rounded-xl font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
