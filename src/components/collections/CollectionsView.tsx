import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  Receipt,
  DollarSign,
  CheckSquare,
  Square,
  CheckCircle2,
  Package,
  X,
  Filter,
  Search,
  Eye,
  Trash2,
  Edit2,
  Check,
  Clock,
  Building2,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CollectionStatus, Contract, PaymentMethod, CompanyId } from "../../types";
import { BulkActionBar, StatusOption } from "../common/BulkActionBar";
import { exportToCSV } from "../../utils/exportUtils";

export const CollectionsView: React.FC = () => {
  const {
    activeCompanyId,
    filteredContracts,
    companies,
    payments,
    updateContractCollectionStatus,
    batchUpdateContractCollectionStatus,
    batchUpdateContracts,
    batchDeleteContracts,
    updateContract,
    deleteContract,
    addPayment,
    deletePayment,
    setSelectedCustomerIdFor360,
    currentUser,
    currentCompanyRole,
    showToast,
  } = useApp();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // Modals
  const [paymentTargetContract, setPaymentTargetContract] = useState<Contract | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [paymentReceiptNumber, setPaymentReceiptNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
  const [editTotalValue, setEditTotalValue] = useState<number>(0);
  const [editDeliveryDate, setEditDeliveryDate] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCollectionStatus, setEditCollectionStatus] = useState<CollectionStatus>("contracted");
  const [editNotes, setEditNotes] = useState("");

  const getCompany = (compId: string) => companies.find((c) => c.id === compId);

  const uniqueMonths = Array.from(
    new Set(
      filteredContracts
        .map((c) => {
          const d = c.date || c.signDate || c.createdAt;
          if (!d) return null;
          return d.substring(0, 7);
        })
        .filter(Boolean)
    )
  ).sort().reverse();
  
  const displayedContracts = useMemo(() => {
    return filteredContracts.filter((c) => {
      const matchStatus =
        statusFilter === "all" ||
        c.collectionStatus === statusFilter ||
        (!c.collectionStatus && statusFilter === "contracted");

      // Month Filter
      const cMonth = (c.date || c.signDate || c.createdAt)?.substring(0, 7);
      const matchMonth = monthFilter === "all" || cMonth === monthFilter;
      
      // Company Filter
      const matchCompany = companyFilter === "all" || c.companyId === companyFilter;
      
      const matchSearch =
        !searchQuery.trim() ||
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.area && c.area.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchStatus && matchSearch && matchMonth && matchCompany;
    });
  }, [filteredContracts, statusFilter, searchQuery, monthFilter, companyFilter]);

  const totalExpected = displayedContracts.reduce((acc, c) => acc + c.totalValue, 0);
  const totalCollected = displayedContracts.reduce((acc, c) => acc + (c.paidAmount || 0), 0);
  const totalRemaining = displayedContracts.reduce((acc, c) => acc + (c.remainingAmount || 0), 0);

  const isAllSelected =
    displayedContracts.length > 0 && displayedContracts.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedContracts.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const collectionStatusOptions: StatusOption[] = [
    { value: "contracted", label: "تم التعاقد" },
    { value: "in_progress", label: "قيد التنفيذ" },
    { value: "delivered", label: "تم التسليم" },
    { value: "collected", label: "تم التحصيل" },
    { value: "closed", label: "مغلق" },
  ];

  const handleBatchStatusChange = (newStatus: string) => {
    if (selectedIds.length === 0) return;
    batchUpdateContractCollectionStatus(selectedIds, newStatus as CollectionStatus);
    setSelectedIds([]);
  };

  const handleBatchAssignResponsible = (salesperson: string) => {
    if (selectedIds.length === 0) return;
    batchUpdateContracts(selectedIds, { salesPerson: salesperson, responsible: salesperson });
    setSelectedIds([]);
  };

  const handleBatchDateChange = (newDate: string) => {
    if (selectedIds.length === 0) return;
    batchUpdateContracts(selectedIds, { date: newDate });
    setSelectedIds([]);
  };

  const handleBatchCompanyChange = (newCompanyId: CompanyId) => {
    if (selectedIds.length === 0) return;
    batchUpdateContracts(selectedIds, { companyId: newCompanyId });
    setSelectedIds([]);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    batchDeleteContracts(selectedIds);
    setSelectedIds([]);
  };

  const handleExport = () => {
    const contractsToExport =
      selectedIds.length > 0
        ? displayedContracts.filter((c) => selectedIds.includes(c.id))
        : displayedContracts;

    if (contractsToExport.length === 0) {
      showToast("لا توجد عقود لتصديرها", "warning");
      return;
    }

    exportToCSV(
      "عقود_وتحصيلات_العملاء",
      [
        { header: "رقم العقد", key: "contractNumber" },
        { header: "اسم العميل", key: "customerName" },
        { header: "هاتف العميل", key: "customerPhone" },
        { header: "الشركة", key: (c: Contract) => getCompany(c.companyId)?.name || c.companyId },
        { header: "المنطقة", key: (c: Contract) => c.area || "غير محدد" },
        { header: "تاريخ العقد", key: "date" },
        { header: "القيمة الإجمالية", key: (c: Contract) => c.totalValue || 0 },
        { header: "المبلغ المحصل", key: (c: Contract) => c.paidAmount || 0 },
        { header: "المبلغ المتبقي", key: (c: Contract) => c.remainingAmount || 0 },
        {
          header: "حالة التحصيل",
          key: (c: Contract) =>
            statusLabels[c.collectionStatus || "contracted"]?.label || c.collectionStatus || "",
        },
        { header: "المسؤول", key: (c: Contract) => c.salesPerson || c.responsible || "غير محدد" },
        { header: "ملاحظات", key: (c: Contract) => c.notes || "" },
      ],
      contractsToExport
    );
    showToast(`تم تصدير ${contractsToExport.length} سجل بنجاح إلى ملف CSV / Excel`, "success");
  };

  const handleBatchUpdate = (status: CollectionStatus) => {
    if (selectedIds.length === 0) return;
    batchUpdateContractCollectionStatus(selectedIds, status);
    setSelectedIds([]);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetContract) return;

    const amt = Number(paymentAmount) || 0;
    if (amt <= 0) {
      showToast("برجاء إدخال مبلغ صحيح للدفعة", "warning");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const submitDate = paymentDate || todayStr;
    addPayment({
      companyId: paymentTargetContract.companyId,
      customerId: paymentTargetContract.customerId,
      customerName: paymentTargetContract.customerName,
      contractId: paymentTargetContract.id,
      amount: amt,
      date: submitDate,
      method: paymentMethod,
      receiptNumber: paymentReceiptNumber || undefined,
      notes: paymentNotes || "تحصيل مسجل من إدارة ما بعد البيع",
    });

    setPaymentTargetContract(null);
    setPaymentAmount(0);
    setPaymentNotes("");
    setPaymentReceiptNumber("");
  };

  const statusLabels: Record<CollectionStatus, { label: string; color: string; bg: string }> = {
    contracted: { label: "تم التعاقد", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
    in_progress: { label: "قيد التنفيذ", color: "text-purple-700", bg: "bg-purple-100 border-purple-200" },
    delivered: { label: "تم التسليم", color: "text-blue-700", bg: "bg-blue-100 border-blue-200" },
    collected: { label: "تم التحصيل", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-200" },
    closed: { label: "مغلق", color: "text-slate-700", bg: "bg-slate-100 border-slate-200" },
    completed: { label: "مكتمل", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-200" },
    partial: { label: "تحصيل جزئي", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
              <Receipt className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              التحصيلات والتسليمات (ما بعد البيع)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إدارة رحلة العميل بعد التعاقد: تحصيل الدفعات، متابعة التسليم، وتحديث رصيد العقود
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-2xl text-left">
            <span className="text-[10px] text-slate-600 font-bold block">إجمالي العقود</span>
            <span className="text-xs font-black text-slate-900 font-mono">
              {(totalExpected || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="bg-emerald-50 border border-emerald-300 px-3.5 py-1.5 rounded-2xl text-left">
            <span className="text-[10px] text-emerald-800 font-bold block">المحصل</span>
            <span className="text-xs font-black text-emerald-700 font-mono">
              {(totalCollected || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="bg-rose-50 border border-rose-300 px-3.5 py-1.5 rounded-2xl text-left">
            <span className="text-[10px] text-rose-800 font-bold block">المتبقي</span>
            <span className="text-xs font-black text-rose-700 font-mono">
              {(totalRemaining || 0).toLocaleString()} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Filters, Search, and Batch Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {isAllSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
            <span>تحديد الكل</span>
          </button>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:border-teal-500 outline-hidden cursor-pointer"
          >
            <option value="all">جميع الحالات ({filteredContracts.length})</option>
            <option value="contracted">تم التعاقد</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="delivered">تم التسليم</option>
            <option value="collected">تم التحصيل</option>
            <option value="closed">مغلق</option>
          </select>

                    {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-teal-500 cursor-pointer"
          >
            <option value="all">كل الشهور</option>
            {uniqueMonths.map((m) => (
              <option key={m} value={m as string}>{m}</option>
            ))}
          </select>
          
          {/* Company Filter */}
          {activeCompanyId === "all" && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-teal-500 cursor-pointer"
            >
              <option value="all">كل الشركات</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>{comp.name}</option>
              ))}
            </select>
          )}

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالاسم، رقم العقد أو المنطقة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-teal-500 outline-hidden font-bold"
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 animate-in fade-in">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              المحدد: {selectedIds.length}
            </span>
            <button
              onClick={() => handleBatchUpdate("contracted")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer transition-colors"
            >
              التعاقد
            </button>
            <button
              onClick={() => handleBatchUpdate("in_progress")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer transition-colors"
            >
              التنفيذ
            </button>
            <button
              onClick={() => handleBatchUpdate("delivered")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
            >
              التسليم
            </button>
            <button
              onClick={() => handleBatchUpdate("collected")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
            >
              التحصيل
            </button>
            <button
              onClick={() => handleBatchUpdate("closed")}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-900 shadow-xs cursor-pointer transition-colors"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>

      {/* Grid of contracts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedContracts.map((c) => {
          const comp = getCompany(c.companyId);
          const isSelected = selectedIds.includes(c.id);
          const currentStatus = c.collectionStatus || "contracted";
          const statusConfig = statusLabels[currentStatus] || statusLabels.contracted;
          const isExpanded = expandedContractId === c.id;
          const contractPayments = payments.filter((p) => p.contractId === c.id);
          const percentPaid =
            c.totalValue > 0 ? Math.min(100, Math.round(((c.paidAmount || 0) / c.totalValue) * 100)) : 0;

          return (
            <div
              key={c.id}
              className={`bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all relative flex flex-col justify-between ${
                isSelected ? "border-teal-500 ring-1 ring-teal-500 bg-teal-50/10" : "border-slate-200"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleSelectOne(c.id)}
                      className="mt-0.5 text-slate-400 hover:text-teal-600 cursor-pointer transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 truncate max-w-[160px]">
                        <span 
    className="cursor-pointer hover:text-teal-600 transition-colors"
    onClick={() => setSelectedCustomerIdFor360(c.customerId)}
  >
    {c.customerName}
  </span>
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {comp && (
                          <span className="text-[10px] text-slate-500 inline-block px-1.5 py-0.5 rounded bg-slate-100">
                            {comp.name}
                          </span>
                        )}
                        {c.area && (
                          <span className="text-[10px] text-slate-500 inline-block px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100">
                            {c.area}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`px-2 py-1 rounded-lg text-[10px] font-black border ${statusConfig.bg} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </div>
                </div>

                {/* Financial Overview */}
                <div className="space-y-2 mb-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">رقم العقد:</span>
                    <span className="font-mono font-bold text-slate-900">{c.contractNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">القيمة الإجمالية:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(c.totalValue || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">المحصل ({percentPaid}%):</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {(c.paidAmount || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-500">المتبقي:</span>
                    <span className="font-mono font-black text-rose-600">
                      {(c.remainingAmount || 0).toLocaleString()} ج.م
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                </div>

                {/* Quick Status Buttons */}
                <div className="mb-3">
                  <span className="text-[10px] font-bold text-slate-400 mb-1.5 block">تغيير مرحلة ما بعد البيع:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => updateContractCollectionStatus(c.id, "contracted")}
                      className={`flex-1 min-w-[50px] py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        currentStatus === "contracted"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      متعاقد
                    </button>
                    <button
                      onClick={() => updateContractCollectionStatus(c.id, "in_progress")}
                      className={`flex-1 min-w-[50px] py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        currentStatus === "in_progress"
                          ? "bg-purple-100 text-purple-800 border-purple-300"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      تنفيذ
                    </button>
                    <button
                      onClick={() => updateContractCollectionStatus(c.id, "delivered")}
                      className={`flex-1 min-w-[50px] py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        currentStatus === "delivered"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      تسليم
                    </button>
                    <button
                      onClick={() => updateContractCollectionStatus(c.id, "collected")}
                      className={`flex-1 min-w-[50px] py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        currentStatus === "collected"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      تحصيل
                    </button>
                    <button
                      onClick={() => updateContractCollectionStatus(c.id, "closed")}
                      className={`flex-1 min-w-[50px] py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        currentStatus === "closed"
                          ? "bg-slate-800 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      إغلاق
                    </button>
                  </div>
                </div>

                {/* Collapsible Payment History */}
                <div className="mb-3">
                  <button
                    onClick={() => setExpandedContractId(isExpanded ? null : c.id)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-teal-600" />
                      <span>سجل الإيصالات والدفعات ({contractPayments.length})</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="space-y-1.5 mt-2 bg-teal-50/30 p-2 rounded-xl border border-teal-100 text-xs animate-in fade-in">
                      {contractPayments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-slate-900 font-mono">
                              {(p.amount || 0).toLocaleString()} ج.م
                            </span>
                            <span className="text-slate-500 mr-2">
                              {p.date} • {p.method}
                            </span>
                            {p.receiptNumber && (
                              <span className="text-slate-400 font-mono text-[10px] mr-1">
                                #{p.receiptNumber}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`حذف إيصال الدفعة بقيمة ${p.amount.toLocaleString()} ج.م؟`)) {
                                deletePayment(p.id);
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                            title="حذف هذا الإيصال وإعادة حساب الرصيد"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {contractPayments.length === 0 && (
                        <div className="text-center py-2 text-slate-400 text-[11px]">
                          لا توجد إيصالات مسجلة بعد لهذا العميل.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                {c.remainingAmount > 0 && (
                  <button
                    onClick={() => {
                      setPaymentTargetContract(c);
                      setPaymentAmount(c.remainingAmount);
                      setPaymentMethod("bank_transfer");
                    }}
                    className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>تحصيل دفعة</span>
                  </button>
                )}

                <div className="flex items-center gap-1 mr-auto">
                  {/* Edit Contract */}
                  <button
                    onClick={() => {
                      setContractToEdit(c);
                      setEditTotalValue(c.totalValue);
                      setEditDate(c.date || c.signDate || "");
                      setEditDeliveryDate(c.deliveryDate || "");
                      setEditCollectionStatus(c.collectionStatus || "contracted");
                      setEditNotes(c.notes || "");
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="تعديل قيمة العقد وتاريخه"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Customer Profile 360 */}
                  <button
                    onClick={() => setSelectedCustomerIdFor360(c.customerId)}
                    className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="فتح بطاقة العميل 360"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">العميل</span>
                  </button>

                  {/* Delete Contract */}
                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف العقد ${c.contractNumber} نهائياً؟`)) {
                        deleteContract(c.id);
                      }
                    }}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف العقد"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {displayedContracts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            لا توجد سجلات ما بعد البيع مطابقة لمعايير البحث.
          </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {paymentTargetContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                <h3 className="font-extrabold text-sm">تحصيل دفعة مالية جديدة</h3>
              </div>
              <button
                onClick={() => setPaymentTargetContract(null)}
                className="text-teal-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4 text-xs">
              <div className="bg-teal-50 p-3 rounded-xl border border-teal-100 flex justify-between items-center">
                <div>
                  <span className="text-teal-800 block font-bold">العميل: {paymentTargetContract.customerName}</span>
                  <span className="text-teal-600 font-mono text-[11px]">عقد رقم: {paymentTargetContract.contractNumber}</span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-slate-500 text-[10px] block">المتبقي:</span>
                  <span className="font-black text-rose-600 text-sm">
                    {(paymentTargetContract.remainingAmount || 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">المبلغ المحصل (ج.م) *:</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-emerald-700 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تاريخ التحصيل *:</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">طريقة الدفع:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="cash">نقداً (كاش)</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="instapay">إنستاباي (InstaPay)</option>
                  <option value="vodafone_cash">فودافون كاش / محفظة</option>
                  <option value="cheque">شيك مصرفي</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">رقم الإيصال / السند (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: REC-2026-004"
                  value={paymentReceiptNumber}
                  onChange={(e) => setPaymentReceiptNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">ملاحظات الدفعة:</label>
                <textarea
                  rows={2}
                  placeholder="دفعة بعد رفع المقاسات / دفعة تسليم قطاعات..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentTargetContract(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  تأكيد التحصيل وتحديث الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTRACT MODAL */}
      {contractToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm">تعديل بيانات العقد {contractToEdit.contractNumber}</h3>
              </div>
              <button
                onClick={() => setContractToEdit(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();

                const originalDate = contractToEdit.date || contractToEdit.signDate;
                if (editDate !== originalDate) {
                  const confirmMsg = "سيؤثر تغيير تاريخ الحدث (تاريخ العقد) على ترتيب رحلة العميل في Customer 360 وبعض التقارير الزمنية. هل أنت متأكد من حفظ التعديل؟";
                  if (!window.confirm(confirmMsg)) {
                    return;
                  }
                }

                updateContract(contractToEdit.id, {
                  totalValue: Number(editTotalValue),
                  deliveryDate: editDeliveryDate,
                  date: editDate,
                  collectionStatus: editCollectionStatus,
                  notes: editNotes,
                });
                setContractToEdit(null);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <span className="text-slate-500 block">العميل:</span>
                <span className="text-sm font-bold text-slate-900">{contractToEdit.customerName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تاريخ العقد *:</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">إجمالي قيمة العقد (ج.م):</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editTotalValue}
                    onChange={(e) => setEditTotalValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-emerald-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">حالة التحصيل والتسليم:</label>
                <select
                  value={editCollectionStatus}
                  onChange={(e) => setEditCollectionStatus(e.target.value as CollectionStatus)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="contracted">تم التعاقد</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="delivered">تم التسليم</option>
                  <option value="collected">تم التحصيل</option>
                  <option value="closed">مغلق</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">تاريخ التسليم المجدول:</label>
                <input
                  type="date"
                  value={editDeliveryDate}
                  onChange={(e) => setEditDeliveryDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">الملاحظات:</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setContractToEdit(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={displayedContracts.length}
        onSelectAll={toggleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        isAllSelected={isAllSelected}
        entityName="عقد"
        statusOptions={collectionStatusOptions}
        onStatusChange={handleBatchStatusChange}
        onAssignResponsible={handleBatchAssignResponsible}
        onDateChange={handleBatchDateChange}
        dateLabel="تعديل التاريخ"
        onCompanyChange={handleBatchCompanyChange}
        onDelete={handleBatchDelete}
        onExport={handleExport}
      />
    </div>
  );
};
