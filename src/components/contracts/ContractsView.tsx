import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Contract, CompanyId, PaymentMethod, CollectionStatus } from "../../types";
import {
  FileCheck2,
  Plus,
  Search,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  Receipt,
  MapPin,
  Trash2,
  AlertTriangle,
  Edit2,
  X,
  Check,
  UserPlus,
  Users,
} from "lucide-react";

export const ContractsView: React.FC = () => {
  const {
    filteredContracts,
    customers,
    quotations,
    companies,
    activeCompanyId,
    addContract,
    updateContract,
    addPayment,
    deleteContract,
    clearAllContracts,
    purgeOrphanContracts,
    createCustomersFromOrphanContracts,
    setSelectedCustomerIdFor360,
    showToast,
    setCurrentTab,
    calculateContractedSalesTotal,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentContract, setPaymentContract] = useState<Contract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null);
  const [editTotalValue, setEditTotalValue] = useState<number>(0);
  const [editDeliveryDate, setEditDeliveryDate] = useState<string>("");
  const [editStatus, setEditStatus] = useState<Contract["status"]>("signed");
  const [editCollectionStatus, setEditCollectionStatus] = useState<CollectionStatus>("contracted");
  const [editArea, setEditArea] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [smartFilter, setSmartFilter] = useState<"all" | "pending_collection" | "pending_signature">("all");
  const [customerLinkFilter, setCustomerLinkFilter] = useState<"registered_only" | "all" | "unlinked_only">("registered_only");

  // Registered Customer lookup set
  const registeredCustomerIds = useMemo(() => new Set(customers.map((c) => c.id)), [customers]);

  // Dynamically enrich contracts with the customer's latest name, phone, and area from the central customers state
  const enrichedContracts = useMemo(() => {
    return filteredContracts.map((c) => {
      const cust = customers.find((cust) => cust.id === c.customerId);
      if (cust) {
        return {
          ...c,
          customerName: cust.name,
          customerPhone: cust.phone || c.customerPhone,
          area: cust.area || c.area,
        };
      }
      return c;
    });
  }, [filteredContracts, customers]);

  // Registered vs Orphan Contract Counts
  const registeredContractsCount = useMemo(() => {
    return enrichedContracts.filter((c) => registeredCustomerIds.has(c.customerId)).length;
  }, [enrichedContracts, registeredCustomerIds]);

  const orphanContractsCount = useMemo(() => {
    return enrichedContracts.filter((c) => !registeredCustomerIds.has(c.customerId)).length;
  }, [enrichedContracts, registeredCustomerIds]);

  // Unique areas in contracts
  const uniqueMonths = Array.from(
    new Set(
      enrichedContracts
        .map((c) => {
          const d = c.date || c.signDate || c.createdAt;
          if (!d) return null;
          return d.substring(0, 7); // YYYY-MM
        })
        .filter(Boolean)
    )
  ).sort().reverse();
  
  const uniqueAreas = Array.from(
    new Set(enrichedContracts.map((c) => c.area).filter((a): a is string => Boolean(a && a !== "غير محدد")))
  ).sort();

  const displayedContracts = useMemo(() => {
    return enrichedContracts.filter((c) => {
      // Customer Link Filter
      if (customerLinkFilter === "registered_only" && !registeredCustomerIds.has(c.customerId)) return false;
      if (customerLinkFilter === "unlinked_only" && registeredCustomerIds.has(c.customerId)) return false;

      // Month Filter
      const cMonth = (c.date || c.signDate || c.createdAt)?.substring(0, 7);
      if (monthFilter !== "all" && cMonth !== monthFilter) return false;
      
      // Company Filter
      if (companyFilter !== "all" && c.companyId !== companyFilter) return false;
      // Area Filter
      if (areaFilter !== "all" && c.area !== areaFilter) return false;
      
      // Smart Filter
      if (smartFilter === "pending_collection" && c.collectionStatus === "paid") return false;
      if (smartFilter === "pending_signature" && c.status === "signed") return false;
      
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCustomer = c.customerName.toLowerCase().includes(q);
        const matchNumber = c.contractNumber.toLowerCase().includes(q);
        const matchCompany = companies.find(comp => comp.id === c.companyId)?.name.toLowerCase().includes(q);
        
        if (!matchCustomer && !matchNumber && !matchCompany) return false;
      }
      
      return true;
    });
  }, [enrichedContracts, registeredCustomerIds, customerLinkFilter, monthFilter, companyFilter, areaFilter, smartFilter, searchQuery, companies]);

  // Summary KPI metrics for displayed contracts
  const contractStats = useMemo(() => {
    const count = displayedContracts.length;
    const totalValue = calculateContractedSalesTotal(displayedContracts, "all", "all", "all");
    const paidValue = displayedContracts.reduce((sum, c) => sum + (Number(c.paidAmount) || 0), 0);
    const remainingValue = displayedContracts.reduce((sum, c) => {
      const remaining =
        typeof c.remainingAmount === "number"
          ? c.remainingAmount
          : (Number(c.totalValue) || 0) - (Number(c.paidAmount) || 0);
      return sum + Math.max(0, remaining);
    }, 0);
    const avgValue = count > 0 ? Math.round(totalValue / count) : 0;

    return {
      count,
      totalValue,
      paidValue,
      remainingValue,
      avgValue,
    };
  }, [displayedContracts, calculateContractedSalesTotal]);

  // New Contract Form
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || "");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>("");
  const [targetCompanyId, setTargetCompanyId] = useState<CompanyId>(
    activeCompanyId !== "all" ? activeCompanyId : companies[0]?.id || "comp-newhouse"
  );
  const [totalValue, setTotalValue] = useState<number>(45000);
  const [downPayment, setDownPayment] = useState<number>(20000);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 25 * 86400000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  // Quotations for selected customer
  const customerQuotations = useMemo(() => {
    return quotations.filter(
      (q) => q.customerId === selectedCustomerId && q.status !== "rejected"
    );
  }, [quotations, selectedCustomerId]);

  // When customer changes, sync quotation
  useEffect(() => {
    if (customerQuotations.length > 0) {
      const q = customerQuotations[0];
      setSelectedQuotationId(q.id);
      setTargetCompanyId(q.companyId);
      setTotalValue(q.totalAmount);
      setDownPayment(Math.round(q.totalAmount * 0.5));
    } else {
      setSelectedQuotationId("");
    }
  }, [selectedCustomerId, customerQuotations]);

  const handleSelectQuotation = (qId: string) => {
    setSelectedQuotationId(qId);
    const q = customerQuotations.find((item) => item.id === qId);
    if (q) {
      setTargetCompanyId(q.companyId);
      setTotalValue(q.totalAmount);
      setDownPayment(Math.round(q.totalAmount * 0.5));
    }
  };

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState<number>(10000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [contractDate, setContractDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [editDate, setEditDate] = useState<string>("");

  const getCompany = (compId: CompanyId) => companies.find((c) => c.id === compId);

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return;

    if (!selectedQuotationId) {
      showToast("تنبيه: لا يمكن إنشاء عقد بدون اختيار عرض سعر معتمد أولاً وفقاً للدورة البيعية!", "warning");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const eventDate = contractDate || todayStr;

    const newCtr = addContract({
      companyId: targetCompanyId,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      quotationId: selectedQuotationId,
      area: cust.area,
      date: eventDate,
      signDate: eventDate,
      deliveryDate,
      totalValue,
      paidAmount: downPayment,
      remainingAmount: Math.max(0, totalValue - downPayment),
      status: "signed",
      notes,
    });

    if (downPayment > 0) {
      addPayment({
        companyId: targetCompanyId,
        customerId: cust.id,
        contractId: newCtr.id,
        customerName: cust.name,
        amount: downPayment,
        date: eventDate,
        method: "cash",
        notes: "دفعة مقدمة عند التعاقد",
      });
    }

    setShowAddModal(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentContract) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const payDate = paymentDate || todayStr;

    addPayment({
      companyId: paymentContract.companyId,
      customerId: paymentContract.customerId,
      contractId: paymentContract.id,
      customerName: paymentContract.customerName,
      amount: paymentAmount,
      date: payDate,
      method: paymentMethod,
      notes: paymentNotes || `دفعة من قيمة العقد رقم ${paymentContract.contractNumber}`,
    });

    setPaymentContract(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Customer Sync Alert Banner */}
      {orphanContractsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                  <span>مزامنة التعاقدات مع سجل العملاء ({customers.length} عملاء مسجلين)</span>
                  <span className="text-xs font-normal text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 font-mono font-bold">
                    تم اكتشاف {orphanContractsCount} تعاقد غير مسجل
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  قائمة العملاء تحتوي حالياً على <span className="font-extrabold text-slate-900">{customers.length} عملاء مسجلين</span>. 
                  التعاقدات الخاصة بالعملاء المسجلين هي <span className="font-extrabold text-emerald-700">{registeredContractsCount} تعاقد</span>، 
                  وهناك <span className="font-extrabold text-amber-700">{orphanContractsCount} تعاقد</span> من بيانات تاريخية/مستوردة غير مرتبطة بالعملاء الـ {customers.length}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-amber-200">
              <button
                onClick={createCustomersFromOrphanContracts}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>إنشاء ملفات للعملاء الـ ({orphanContractsCount}) المتبقين</span>
              </button>
              <button
                onClick={purgeOrphanContracts}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف وتصفية التعاقدات التائهة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              إدارة العقود والاتفاقيات (Contracts)
            </h1>
            {/* Top Metrics Badges: Count & Total Value */}
            <div className="flex items-center gap-2 mr-0 sm:mr-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs">
                <span>عدد التعاقدات:</span>
                <span className="font-mono font-black text-sm">{contractStats.count.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-100 font-normal">عقد</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 text-emerald-400 font-bold text-xs shadow-xs">
                <span>إجمالي القيمة:</span>
                <span className="font-mono font-black text-sm">{contractStats.totalValue.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-normal">ج.م</span>
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            متابعة الصفقات المبرمة، الدفعات المسددة، والمتبقي للتحصيل ومواعيد التسليم
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          {/* Customer Link Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => setCustomerLinkFilter("registered_only")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                customerLinkFilter === "registered_only"
                  ? "bg-white text-emerald-800 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>العملاء المسجلين ({registeredContractsCount})</span>
            </button>

            <button
              onClick={() => setCustomerLinkFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                customerLinkFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>الجميع ({enrichedContracts.length})</span>
            </button>

            {orphanContractsCount > 0 && (
              <button
                onClick={() => setCustomerLinkFilter("unlinked_only")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  customerLinkFilter === "unlinked_only"
                    ? "bg-white text-amber-800 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>غير مسجلة ({orphanContractsCount})</span>
              </button>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث برقم العقد أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-3 pr-9 py-1.5 w-full sm:w-64 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
              dir="rtl"
            />
          </div>

          {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          >
            <option value="all">كل الشهور</option>
            {uniqueMonths.map((m) => (
              <option key={m} value={m as string}>{m}</option>
            ))}
          </select>
          
          {/* Company Filter (if activeCompanyId is all) */}
          {activeCompanyId === "all" && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="all">كل الشركات</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>{comp.name}</option>
              ))}
            </select>
          )}

          {/* Smart Filters */}
          <select
            value={smartFilter}
            onChange={(e) => setSmartFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          >
            <option value="all">جميع العقود</option>
            <option value="pending_collection">قيد التحصيل (غير مسددة بالكامل)</option>
            <option value="pending_signature">بانتظار التوقيع</option>
          </select>

          {/* Area Filter */}
          <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-2xs text-xs">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="all">كل المناطق ({filteredContracts.length})</option>
              {uniqueAreas.map((ar) => (
                <option key={ar} value={ar}>
                  📍 {ar}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>توقيع عقد جديد</span>
          </button>

          {filteredContracts.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="حذف جميع العقود"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">حذف الكل</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Contracts KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Contracts Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي عدد التعاقدات</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <FileCheck2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {contractStats.count.toLocaleString()}
            <span className="text-xs font-normal text-slate-500 mr-1.5">عقد</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {monthFilter !== "all" || companyFilter !== "all" || areaFilter !== "all" || searchQuery
              ? "ضمن الفلتر والتصفية الحالية"
              : "كافة العقود المسجلة في النظام"}
          </div>
        </div>

        {/* Total Contracts Value */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 p-4 sm:p-5 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">إجمالي قيمة التعاقدات</span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
            {contractStats.totalValue.toLocaleString()}
            <span className="text-xs font-normal text-emerald-800 mr-1">ج.م</span>
          </div>
          <div className="text-[11px] text-emerald-700/80 font-medium">
            متوسط قيمة العقد: {contractStats.avgValue.toLocaleString()} ج.م
          </div>
        </div>

        {/* Total Paid Amount */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي المحصل الفعلي</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 font-mono">
            {contractStats.paidValue.toLocaleString()}
            <span className="text-xs font-normal text-slate-500 mr-1">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            نسبة التحصيل: {contractStats.totalValue > 0 ? Math.round((contractStats.paidValue / contractStats.totalValue) * 100) : 0}%
          </div>
        </div>

        {/* Total Remaining Amount */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المتبقي للتحصيل</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
            {contractStats.remainingValue.toLocaleString()}
            <span className="text-xs font-normal text-slate-500 mr-1">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400">
            مستحقات آجلة قيد التحصيل والتسليم
          </div>
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedContracts.map((c) => {
          const comp = getCompany(c.companyId);
          const percentPaid = Math.round((c.paidAmount / c.totalValue) * 100);

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {c.contractNumber}
                      </span>
                      {c.area && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span>{c.area}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <h3 
                        className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-emerald-600 transition-colors"
                        onClick={() => setSelectedCustomerIdFor360(c.customerId)}
                      >
                        {c.customerName}
                      </h3>
                      {registeredCustomerIds.has(c.customerId) ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          عميل مسجل ✓
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          غير مسجل ⚠️
                        </span>
                      )}
                    </div>
                    {comp && (
                      <span
                        className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded ${comp.badgeBg} ${comp.badgeText}`}
                      >
                        {comp.name}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      c.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : c.status === "in_production"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {c.status === "signed" && "موقع"}
                    {c.status === "in_production" && "في التصنيع"}
                    {c.status === "installed" && "تم التركيب"}
                    {c.status === "completed" && "مكتمل بالكامل ✅"}
                  </span>
                </div>

                {/* Financial Progress */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-600">إجمالي العقد:</span>
                    <span className="text-slate-900">{(c.totalValue || 0).toLocaleString()} ج.م</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>المسدد ({percentPaid}%):</span>
                    <span className="text-emerald-700 font-bold">
                      {(c.paidAmount || 0).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>المتبقي:</span>
                    <span className="text-rose-600 font-bold">
                      {(c.remainingAmount || 0).toLocaleString()} ج.م
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div>تاريخ التوقيع: {c.signDate}</div>
                  <div>تاريخ التسليم المتوقع: {c.deliveryDate}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                {c.remainingAmount > 0 && (
                  <button
                    onClick={() => {
                      setPaymentContract(c);
                      setPaymentAmount(c.remainingAmount);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>تحصيل دفعة</span>
                  </button>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => {
                      setContractToEdit(c);
                      setEditDate(c.date || c.signDate || "");
                      setEditTotalValue(c.totalValue);
                      setEditDeliveryDate(c.deliveryDate || "");
                      setEditStatus(c.status);
                      setEditCollectionStatus(c.collectionStatus || "contracted");
                      setEditArea(c.area || "");
                      setEditNotes(c.notes || "");
                    }}
                    title="تعديل بيانات وتاريخ العقد"
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setSelectedCustomerIdFor360(c.customerId)}
                    className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ملف العميل</span>
                  </button>

                  <button
                    onClick={() => setContractToDelete(c)}
                    title="حذف هذا العقد"
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW CONTRACT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">تسجيل وتوقيع عقد جديد</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">العميل *:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quotation Selector (Mandatory in Sales Lifecycle) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>عرض السعر المعتمد * (إلزامي للتعاقد):</span>
                  {customerQuotations.length > 0 && (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      {customerQuotations.length} عرض متوفر
                    </span>
                  )}
                </label>
                {customerQuotations.length > 0 ? (
                  <select
                    value={selectedQuotationId}
                    onChange={(e) => handleSelectQuotation(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {customerQuotations.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.quoteNumber} — {q.totalAmount.toLocaleString()} ج.م ({q.items?.length || 0} بنود / {q.totalMeters || 0} م²)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between gap-2">
                    <span>⚠️ لا يوجد عرض سعر مسجل لهذا العميل بعد.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setCurrentTab("quotations");
                      }}
                      className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold shrink-0 cursor-pointer"
                    >
                      إنشاء عرض سعر
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">الشركة المصنعة *:</label>
                <select
                  value={targetCompanyId}
                  onChange={(e) => setTargetCompanyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">إجمالي قيمة العقد (ج.م):</label>
                  <input
                    type="number"
                    required
                    value={totalValue}
                    onChange={(e) => setTotalValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">الدفعة المقدمة (ج.م):</label>
                  <input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تاريخ توقيع العقد *:</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">تاريخ التسليم المتفق عليه:</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">شروط أو ملاحظات العقد:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات المواصفات، شروط الدفع، موقع التسليم..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-slate-600 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  تأكيد توقيع العقد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                تحصيل دفعة مالية للعقد ({paymentContract.contractNumber})
              </h3>
              <button
                onClick={() => setPaymentContract(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">العميل:</span>
                  <strong className="text-slate-800">{paymentContract.customerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المبلغ المتبقي:</span>
                  <strong className="text-rose-600 font-mono">
                    {paymentContract.remainingAmount.toLocaleString()} ج.م
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">المبلغ المحصل (ج.م) *:</label>
                  <input
                    type="number"
                    required
                    max={paymentContract.remainingAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-emerald-700 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
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
                <label className="font-bold text-slate-700">طريقة التحصيل *:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="cash">نقداً (Cash)</option>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="instaPay">انستاباي (InstaPay)</option>
                  <option value="cheque">شيك مصرفي</option>
                  <option value="vodafone_cash">محفظة إلكترونية</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">ملاحظات التحصيل:</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="رقم التحويل أو اسم البنك..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentContract(null)}
                  className="px-3 py-2 text-slate-600 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  تأكيد التحصيل وإصدار الإيصال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM SINGLE CONTRACT DELETE MODAL */}
      {contractToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">تأكيد حذف العقد</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف العقد رقم{" "}
                <strong className="text-slate-800">{contractToDelete.contractNumber}</strong> للعميل{" "}
                <strong className="text-slate-800">{contractToDelete.customerName}</strong>؟ سيتم أيضاً حذف المبيعات والدفعات المرتبطة به.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setContractToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteContract(contractToDelete.id);
                  setContractToDelete(null);
                }}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR ALL CONTRACTS MODAL */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">حذف جميع العقود</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                هل أنت متأكد من حذف <strong>كافة العقود ({filteredContracts.length})</strong>؟ سيؤدي هذا الإجراء أيضاً إلى تصفير كافة سجلات المبيعات والدفعات المرتبطة بها.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  clearAllContracts();
                  setShowClearAllModal(false);
                }}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                نعم، احذف الكل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CONTRACT MODAL */}
      {contractToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden" dir="rtl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
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

                updateContract(contractToEdit.id, {
                  totalValue: Number(editTotalValue),
                  deliveryDate: editDeliveryDate,
                  date: editDate,
                  status: editStatus,
                  collectionStatus: editCollectionStatus,
                  area: editArea,
                  notes: editNotes,
                });
                setContractToEdit(null);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <span className="text-xs text-slate-500 block">العميل:</span>
                <span className="text-sm font-bold text-slate-900">{contractToEdit.customerName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>تاريخ توقيع العقد (تاريخ الحدث):</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">إجمالي قيمة العقد (ج.م):</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editTotalValue}
                    onChange={(e) => setEditTotalValue(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">حالة التنفيذ:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Contract["status"])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="signed">موقع</option>
                    <option value="in_production">في التصنيع</option>
                    <option value="installed">تم التركيب</option>
                    <option value="completed">مكتمل بالكامل</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">حالة التحصيل:</label>
                  <select
                    value={editCollectionStatus}
                    onChange={(e) => setEditCollectionStatus(e.target.value as CollectionStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="contracted">تم التعاقد</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="delivered">تم التسليم</option>
                    <option value="collected">تم التحصيل</option>
                    <option value="closed">مغلق</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تاريخ التسليم المتوقع:</label>
                  <input
                    type="date"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">المنطقة:</label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ملاحظات العقد:</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
