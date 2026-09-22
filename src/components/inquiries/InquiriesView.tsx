import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { CustomerStage, CompanyId, PriorityLevel } from "../../types";
import {
  Inbox,
  Sparkles,
  Phone,
  MessageCircle,
  Eye,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  UserCheck,
  UserX,
  PlusCircle,
  FileText,
  TrendingUp,
  RefreshCw,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { BulkActionBar, StatusOption } from "../common/BulkActionBar";
import { SmartFilterBar, FilterState } from "../common/SmartFilterBar";
import { exportToCSV } from "../../utils/exportUtils";
import { CompanyIdentity } from "../common/CompanyIdentity";

export const InquiriesView: React.FC = () => {
  const {
    filteredInquiries,
    companies,
    opportunities,
    quotations,
    contracts,
    canDeleteRecords,
    updateInquiryStage,
    updateInquiry,
    batchUpdateInquiries,
    deleteInquiry,
    batchDeleteInquiries,
    batchAddFollowUps,
    addFollowUp,
    addQuotation,
    addOpportunity,
    setSelectedCustomerIdFor360,
    setCurrentTab,
    navigateToTabWithFilter,
    navigationFilter,
    showToast,
  } = useApp();

  // Smart Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    companyId: navigationFilter?.companyId || "all",
    stage: navigationFilter?.stage || "all",
    status: "all",
    area: "all",
    responsible: "all",
    source: "all",
    interestLevel: "all",
    priority: "all",
    datePreset: navigationFilter?.date ? "custom" : "all",
    startDate: navigationFilter?.date || "",
    endDate: navigationFilter?.date || "",
  });

  const [interestTab, setInterestTab] = useState<"all" | "interested" | "not_interested" | "closed">("all");

  // Sync navigationFilter when it changes
  useEffect(() => {
    if (navigationFilter) {
      setFilters((prev) => ({
        ...prev,
        companyId: navigationFilter.companyId || prev.companyId,
        stage: navigationFilter.stage || prev.stage,
        startDate: navigationFilter.date || prev.startDate,
        endDate: navigationFilter.date || prev.endDate,
        datePreset: navigationFilter.date ? "custom" : prev.datePreset,
        search: navigationFilter.searchQuery || prev.search,
      }));
    }
  }, [navigationFilter]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  // Helper to determine if an inquiry is "not interested" (including cold and lost)
  const isNotInterestedInquiry = (inq: any) => {
    return (
      inq.stage === "lost" ||
      inq.interestLevel === "lost" ||
      inq.interestLevel === "cold" ||
      inq.isNotInterested === true ||
      inq.status === "not_interested" ||
      inq.status === "lost"
    );
  };

  // Helper to determine if an inquiry is closed (won or lost)
  const isClosedInquiry = (inq: any) => {
    return (
      inq.stage === "won" ||
      inq.stage === "contracted" ||
      inq.stage === "lost" ||
      inq.interestLevel === "lost" ||
      inq.status === "lost"
    );
  };

  // Base list of inquiries matching company filter
  const baseInquiriesList = useMemo(() => {
    if (filters.companyId === "all") return filteredInquiries;
    return filteredInquiries.filter((i) => i.companyId === filters.companyId);
  }, [filteredInquiries, filters.companyId]);

  const interestedInquiriesList = useMemo(() => {
    return baseInquiriesList.filter((i) => !isNotInterestedInquiry(i) && !isClosedInquiry(i));
  }, [baseInquiriesList]);

  const notInterestedInquiriesList = useMemo(() => {
    return baseInquiriesList.filter((i) => isNotInterestedInquiry(i) && !isClosedInquiry(i));
  }, [baseInquiriesList]);

  const closedInquiriesList = useMemo(() => {
    return baseInquiriesList.filter((i) => isClosedInquiry(i));
  }, [baseInquiriesList]);

  const totalInquiriesCount = baseInquiriesList.length;
  const interestedCount = interestedInquiriesList.length;
  const notInterestedCount = notInterestedInquiriesList.length;
  const closedCount = closedInquiriesList.length;

  // Filtered inquiries calculation
  const filtered = useMemo(() => {
    let sourceList = baseInquiriesList;
    if (interestTab === "interested") sourceList = interestedInquiriesList;
    else if (interestTab === "not_interested") sourceList = notInterestedInquiriesList;
    else if (interestTab === "closed") sourceList = closedInquiriesList;

    return sourceList.filter((inq) => {
      const q = filters.search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        inq.customerName.toLowerCase().includes(q) ||
        inq.customerPhone.includes(q) ||
        inq.productType.toLowerCase().includes(q) ||
        inq.details.toLowerCase().includes(q);

      const matchesStage =
        filters.stage === "all" ||
        inq.stage === filters.stage ||
        (filters.stage === "contracted" && inq.stage === "won");

      const matchesSource =
        filters.source === "all" ||
        (inq.source && inq.source.toLowerCase() === filters.source.toLowerCase());

      // Date filtering
      let matchesDate = true;
      if (filters.datePreset === "today") {
        const today = new Date().toISOString().split("T")[0];
        matchesDate = inq.date === today;
      } else if (filters.datePreset === "custom") {
        if (filters.startDate && inq.date < filters.startDate) matchesDate = false;
        if (filters.endDate && inq.date > filters.endDate) matchesDate = false;
      }

      return matchesSearch && matchesStage && matchesSource && matchesDate;
    });
  }, [baseInquiriesList, interestedInquiriesList, notInterestedInquiriesList, closedInquiriesList, interestTab, filters]);

  const getCompany = (compId: string) => companies.find((c) => c.id === compId);

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Single Quick Actions for Interested Inquiries
  const handleQuickAddFollowUp = (inq: any) => {
    const todayStr = new Date().toISOString().split("T")[0];
    addFollowUp({
      customerId: inq.customerId,
      companyId: inq.companyId,
      customerName: inq.customerName,
      customerPhone: inq.customerPhone,
      dueDate: todayStr,
      time: "12:00",
      title: `متابعة استفسار: ${inq.productType}`,
      notes: inq.details,
      priority: "high",
      status: "pending",
      type: "call",
      assignedTo: inq.responsible || "مسؤول المبيعات",
    });
    showToast(`تمت إضافة متابعة جديدة للعميل ${inq.customerName}`, "success");
  };

  const handleQuickCreateOpportunity = (inq: any) => {
    addOpportunity({
      companyId: inq.companyId,
      customerId: inq.customerId,
      customerName: inq.customerName,
      customerPhone: inq.customerPhone,
      customerScope: "specific",
      inquiryId: inq.id,
      title: `فرصة بيعية: ${inq.productType}`,
      expectedValue: 50000,
      confidence: 70,
      stage: "qualified",
      temperature: "warm",
      source: inq.source || "Phone",
      salesPerson: inq.responsible || "مسؤول المبيعات",
      notes: inq.details,
      status: "open",
    });
    updateInquiryStage(inq.id, "qualified");
    showToast(`تم إنشاء فرصة بيعية جديدة للعميل ${inq.customerName} وتحديث المرحلة إلى مؤهل 🟢`, "success");
  };

  const handleReactivateInquiry = (inq: any) => {
    updateInquiry(inq.id, {
      stage: "inquiry",
      interestLevel: "warm",
    });
    showToast(`تمت إعادة تفعيل الاستفسار للعميل ${inq.customerName} وإدراجه ضمن المهتمين 🟢`, "success");
  };

  // Bulk Operations
  const handleBulkDelete = () => {
    batchDeleteInquiries(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkStatusChange = (newStage: string) => {
    batchUpdateInquiries(selectedIds, { stage: newStage as CustomerStage });
    setSelectedIds([]);
    showToast(`تم تحديث مرحلة ${selectedIds.length} استفسار بنجاح`, "success");
  };

  const handleBulkCompanyChange = (newCompanyId: CompanyId) => {
    batchUpdateInquiries(selectedIds, { companyId: newCompanyId });
    setSelectedIds([]);
    showToast(`تم نقل ${selectedIds.length} استفسار إلى الشركة المحددة`, "success");
  };

  const handleBulkAddFollowUp = (data: {
    dueDate: string;
    title: string;
    priority: PriorityLevel;
    notes?: string;
  }) => {
    const selectedInquiries = filteredInquiries.filter((inq) => selectedIds.includes(inq.id));
    const items = selectedInquiries.map((inq) => ({
      customerId: inq.customerId,
      companyId: inq.companyId,
      customerName: inq.customerName,
      customerPhone: inq.customerPhone,
    }));

    batchAddFollowUps(items, {
      dueDate: data.dueDate,
      time: "12:00",
      title: data.title,
      priority: data.priority,
      notes: data.notes || `متابعة مجدولة لاستفسارات العملاء`,
    });
    setSelectedIds([]);
    showToast(`تمت جدولة ${items.length} متابعة بنجاح`, "success");
  };

  const handleExportSelected = () => {
    const selectedInquiries = filteredInquiries.filter((inq) => selectedIds.includes(inq.id));
    exportToCSV(
      "inquiries_export",
      [
        { header: "اسم العميل", key: "customerName" },
        { header: "رقم الهاتف", key: "customerPhone" },
        { header: "نوع المنتج", key: "productType" },
        { header: "المرحلة", key: "stage" },
        { header: "المصدر", key: "source" },
        { header: "التاريخ", key: "date" },
        {
          header: "الشركة",
          key: (item) => getCompany(item.companyId)?.name || item.companyId,
        },
        { header: "التفاصيل", key: "details" },
      ],
      selectedInquiries
    );
    showToast(`تم تصدير ${selectedInquiries.length} استفسار بنجاح إلى ملف Excel/CSV`, "success");
  };

  const handleConfirmSingleDelete = () => {
    if (singleDeleteId) {
      deleteInquiry(singleDeleteId);
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteId));
      setSingleDeleteId(null);
    }
  };

  const stageStatusOptions: StatusOption[] = [
    { value: "inquiry", label: "استفسار جديد" },
    { value: "contacted", label: "تم التواصل" },
    { value: "inspection", label: "معاينة ومقاسات" },
    { value: "quotation", label: "عرض سعر" },
    { value: "negotiation", label: "تفاوض" },
    { value: "contracted", label: "تم التعاقد (Won) 🤝" },
    { value: "lost", label: "صفقة خاسرة (Lost) ❌" },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-24" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[#111111] text-[#C8A75A]">
              <Inbox className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
                  سجل الاستفسارات والطلبات (Inquiries)
                </h1>
                <CompanyIdentity size="xs" />
              </div>
              <p className="text-xs sm:text-sm text-[#6B7280]">
                تفصيل الاستفسارات (العملاء المهتمون والتأهيل 🟢 / العملاء غير المهتمين 🔴) مع المعادلة التجميعية المطلوبة
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCurrentTab("intake")}
          className="px-4 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] border border-[#C8A75A]/40 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#C8A75A]" />
          <span>تسجيل استفسار ذكي جديد</span>
        </button>
      </div>

      {/* Inquiry Classification KPI Cards (Formula Verification) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Inquiries */}
        <div className="bg-[#111111] text-white p-4 rounded-2xl border border-[#222222] shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-[#C8A75A] font-bold">
            <span className="flex items-center gap-1.5">
              <Inbox className="w-4 h-4" />
              <span>إجمالي الاستفسارات الكلي</span>
            </span>
            <span className="bg-[#C8A75A]/20 px-2 py-0.5 rounded text-[10px]">المعادلة الأساسية</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-black text-[#C8A75A]">{totalInquiriesCount}</span>
            <span className="text-[11px] text-stone-400 font-mono">
              = {interestedCount} مهتم + {notInterestedCount} غير مهتم
            </span>
          </div>
          <p className="text-[11px] text-stone-400 border-t border-[#222222] pt-2 mt-1">
            يشمل جميع الوارد التاريخي الصافي لضمان تحليل معدلات الاهتمام
          </p>
        </div>

        {/* Card 2: Interested / Qualified Inquiries */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>1. العملاء المهتمون (Interested)</span>
            </span>
            <span className="bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded text-[10px]">
              {Math.round((interestedCount / (totalInquiriesCount || 1)) * 100)}% من الإجمالي
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-black text-emerald-700">{interestedCount}</span>
            <span className="text-xs text-emerald-800 font-bold">جاهزون للتحويل للمراحل</span>
          </div>
          <p className="text-[11px] text-emerald-700/80 border-t border-emerald-200/60 pt-2 mt-1">
            يمكن الانتقال منهم إلى: متابعة، مهمة، عرض سعر، فرصة بيعية
          </p>
        </div>

        {/* Card 3: Not Interested Inquiries */}
        <div className="bg-[#F8F8F5] border border-[#EAEAEA] p-4 rounded-2xl shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-700 font-bold">
            <span className="flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-600" />
              <span>2. العملاء غير المهتمين (Not Interested)</span>
            </span>
            <span className="bg-stone-200 text-stone-800 px-2 py-0.5 rounded text-[10px]">
              {Math.round((notInterestedCount / (totalInquiriesCount || 1)) * 100)}% من الإجمالي
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-black text-stone-800">{notInterestedCount}</span>
            <span className="text-xs text-stone-500 font-bold">سجل تاريخي محفوظ</span>
          </div>
          <p className="text-[11px] text-stone-500 border-t border-[#EAEAEA] pt-2 mt-1">
            لا تنشئ مراحل بيع تلقائيًا وتظل محسوبة في المجموع الكلي
          </p>
        </div>
      </div>

      {/* Visual Section Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#EAEAEA]">
        <button
          onClick={() => setInterestTab("all")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            interestTab === "all"
              ? "bg-[#111111] text-[#C8A75A] shadow-xs"
              : "bg-[#F8F8F5] text-[#6B7280] hover:text-[#111111] border border-[#EAEAEA]"
          }`}
        >
          <span>جميع الاستفسارات (All Inquiries)</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-800 font-mono">
            {totalInquiriesCount}
          </span>
        </button>

        <button
          onClick={() => setInterestTab("interested")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            interestTab === "interested"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-[#F8F8F5] text-[#6B7280] hover:text-emerald-700 border border-[#EAEAEA]"
          }`}
        >
          <span>🟢 العملاء المهتمون والتأهيل ({interestedCount})</span>
        </button>

        <button
          onClick={() => setInterestTab("not_interested")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            interestTab === "not_interested"
              ? "bg-rose-700 text-white shadow-xs"
              : "bg-[#F8F8F5] text-[#6B7280] hover:text-rose-700 border border-[#EAEAEA]"
          }`}
        >
          <span>🔴 العملاء غير المهتمين ({notInterestedCount})</span>
        </button>

        <button
          onClick={() => setInterestTab("closed")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            interestTab === "closed"
              ? "bg-[#6B7280] text-white shadow-xs"
              : "bg-[#F8F8F5] text-[#6B7280] hover:text-stone-800 border border-[#EAEAEA]"
          }`}
        >
          <span>🤝🔒 الصفقات المغلقة ({closedCount})</span>
        </button>
      </div>

      {/* Smart Filters Bar */}
      <SmartFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={() =>
          setFilters({
            search: "",
            companyId: "all",
            stage: "all",
            status: "all",
            area: "all",
            responsible: "all",
            source: "all",
            interestLevel: "all",
            priority: "all",
            datePreset: "all",
          })
        }
        stageOptions={stageStatusOptions}
        showAreaFilter={false}
        showResponsibleFilter={false}
        showInterestFilter={false}
        totalResultsCount={filtered.length}
      />

      {/* Selection Summary Bar */}
      <div className="flex items-center justify-between text-xs text-[#6B7280] px-1">
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-1.5 font-bold text-[#111111] hover:text-[#C8A75A] cursor-pointer"
        >
          {selectedIds.length === filtered.length && filtered.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
          ) : (
            <Square className="w-4 h-4 text-[#9CA3AF]" />
          )}
          <span>تحديد الكل في هذه النتائج ({filtered.length})</span>
        </button>
        <span>
          عرض <strong>{filtered.length}</strong> استفسار
        </span>
      </div>

      {/* Inquiries Cards List */}
      <div className="space-y-3">
        {filtered.map((inq) => {
          const comp = getCompany(inq.companyId);
          const isSelected = selectedIds.includes(inq.id);
          const isNotInterested = isNotInterestedInquiry(inq);
          const isClosed = isClosedInquiry(inq);
          const isWon = inq.stage === "won" || inq.stage === "contracted";
          const isLost = inq.stage === "lost" || inq.interestLevel === "lost" || inq.status === "lost";

          // Find related opportunity
          const relatedOpp = opportunities.find(
            (o) => o.inquiryId === inq.id || (o.customerId === inq.customerId && o.status === (isWon ? "won" : isLost ? "lost" : "open"))
          ) || opportunities.find((o) => o.customerId === inq.customerId);

          // Find related contract
          const relatedContract = contracts.find(
            (c) => c.opportunityId === relatedOpp?.id || c.customerId === inq.customerId
          );

          return (
            <div
              key={inq.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 ${
                isSelected
                  ? "border-[#C8A75A] ring-1 ring-[#C8A75A] bg-amber-50/20"
                  : isClosed
                  ? isWon
                    ? "border-emerald-200 bg-emerald-50/5"
                    : "border-rose-200 bg-rose-50/5"
                  : isNotInterested
                  ? "border-stone-300 bg-stone-50/40"
                  : "border-[#EAEAEA]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => toggleSelectOne(inq.id)}
                    className="text-[#9CA3AF] hover:text-[#C8A75A] cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <span
                    onClick={() => setSelectedCustomerIdFor360(inq.customerId)}
                    className="font-extrabold text-sm text-[#111111] hover:text-[#C8A75A] cursor-pointer transition-colors"
                  >
                    {inq.customerName}
                  </span>

                  {/* Section Badge */}
                  {isClosed ? (
                    isWon ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>تم التعاقد والنجاح ✓ (Won)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <UserX className="w-3 h-3 text-rose-600" />
                        <span>صفقة خاسرة ❌ (Lost)</span>
                      </span>
                    )
                  ) : isNotInterested ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                      <UserX className="w-3 h-3 text-rose-600" />
                      <span>غير مهتم (سجل محفوظ)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      <span>عميل مهتم / جاهز للتأهيل</span>
                    </span>
                  )}

                  {comp && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 bg-[#F8F8F5] border border-[#EAEAEA] text-[#111111]">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: comp.color || "#111111" }}
                      />
                      {comp.name}
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#F8F8F5] text-[#6B7280] border border-[#EAEAEA]">
                    المصدر: {inq.source || "غير محدد"}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF] font-mono">{inq.date}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7280]">المرحلة:</span>
                  <select
                    value={inq.stage === "won" ? "contracted" : inq.stage}
                    onChange={(e) => updateInquiryStage(inq.id, e.target.value as CustomerStage)}
                    className={`text-xs font-bold p-1.5 rounded-xl cursor-pointer ${
                      inq.stage === "contracted" || inq.stage === "won"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                        : isNotInterested
                        ? "bg-rose-50 text-rose-700 border border-rose-300"
                        : "bg-[#F8F8F5] border border-[#EAEAEA] text-[#111111]"
                    }`}
                  >
                    <option value="inquiry">استفسار جديد</option>
                    <option value="contacted">تم التواصل</option>
                    <option value="inspection">معاينة ومقاسات</option>
                    <option value="quotation">عرض سعر</option>
                    <option value="negotiation">تفاوض</option>
                    <option value="contracted">تم التعاقد (Won) 🤝</option>
                    <option value="lost">صفقة خاسرة / غير مهتم (Lost) ❌</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#F8F8F5] p-3 rounded-xl border border-[#EAEAEA] space-y-1">
                <div className="font-bold text-xs text-[#111111]">{inq.productType}</div>
                <p className="text-xs text-[#6B7280] leading-relaxed">{inq.details}</p>
              </div>

              {isClosed && (
                <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${isWon ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" : "bg-rose-50/70 border-rose-200 text-rose-950"}`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {isWon ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>تم التعاقد والنجاح بنجاح 🤝 (Won)</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>صفقة خاسرة / غير مهتم ❌ (Lost)</span>
                        </>
                      )}
                    </span>
                    {isWon && (relatedContract?.totalAmount !== undefined || relatedOpp?.expectedValue !== undefined) && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                        قيمة الصفقة: {((relatedContract?.totalAmount || relatedOpp?.expectedValue || 0)).toLocaleString()} ج.م
                      </span>
                    )}
                  </div>

                  {/* Related entities and metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600">
                    {relatedOpp && (
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-stone-850">الفرصة البيعية:</span>
                        <span>{relatedOpp.title} ({relatedOpp.stage})</span>
                      </div>
                    )}
                    {isLost && (relatedOpp?.lossReason || inq.notes) && (
                      <div className="col-span-1 sm:col-span-2 bg-white/60 p-2 rounded-lg border border-rose-100/60 mt-1">
                        <div className="font-bold text-rose-900 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>سبب الخسارة: {relatedOpp?.lossReason || "غير محدد"}</span>
                        </div>
                        {relatedOpp?.lossNotes && (
                          <p className="text-stone-500 mt-0.5">{relatedOpp.lossNotes}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Related Records Navigation Links */}
                  <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-dashed border-stone-200">
                    <span className="text-[10px] text-stone-500 font-bold">الانتقال السريع للسجلات:</span>
                    <button
                      onClick={() => setSelectedCustomerIdFor360(inq.customerId)}
                      className="px-2 py-0.5 rounded-md bg-white border border-stone-200 hover:border-[#C8A75A] text-stone-700 hover:text-[#111111] transition-colors cursor-pointer text-[10px] font-bold"
                    >
                      👤 ملف العميل 360
                    </button>
                    {relatedOpp && (
                      <button
                        onClick={() => navigateToTabWithFilter("opportunities", { searchQuery: inq.customerName, companyId: inq.companyId })}
                        className="px-2 py-0.5 rounded-md bg-white border border-stone-200 hover:border-amber-600 text-stone-700 hover:text-amber-800 transition-colors cursor-pointer text-[10px] font-bold"
                      >
                        📈 الفرصة البيعية ({relatedOpp.title})
                      </button>
                    )}
                    {relatedContract && (
                      <button
                        onClick={() => navigateToTabWithFilter("contracts", { searchQuery: inq.customerName, companyId: inq.companyId })}
                        className="px-2 py-0.5 rounded-md bg-white border border-stone-200 hover:border-emerald-600 text-stone-700 hover:text-emerald-800 transition-colors cursor-pointer text-[10px] font-bold"
                      >
                        🤝 العقد ({relatedContract.contractNumber})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#F0F0EE]">
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${inq.customerPhone}`}
                    className="p-1.5 rounded-lg bg-[#F8F8F5] hover:bg-slate-200 text-[#111111]"
                    title="اتصال"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`https://wa.me/${inq.customerPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                    title="واتساب"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-xs font-mono text-[#6B7280]" dir="ltr">
                    {inq.customerPhone}
                  </span>
                </div>

                {/* Conversion Actions based on Current State & RBAC */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!isNotInterested ? (
                    <>
                      <button
                        onClick={() => handleQuickAddFollowUp(inq)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#111111] text-[#C8A75A] hover:bg-[#222222] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Calendar className="w-3 h-3 text-[#C8A75A]" />
                        <span>+ متابعة</span>
                      </button>

                      {(() => {
                        const existingOpp = opportunities.find(
                          (o) => o.inquiryId === inq.id || (o.customerId === inq.customerId && o.status === "open")
                        );
                        const isContractedOrWon = inq.stage === "contracted" || inq.stage === "won" || contracts.some((c) => c.customerId === inq.customerId);

                        if (isContractedOrWon) {
                          return (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>تم التعاقد ✓</span>
                            </span>
                          );
                        }

                        if (existingOpp) {
                          return (
                            <button
                              onClick={() => {
                                navigateToTabWithFilter("opportunities", {
                                  companyId: inq.companyId,
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/50 hover:bg-amber-900/60 flex items-center gap-1 cursor-pointer transition-colors"
                              title={`تم فتح الفرصة البيعية مسبقاً: ${existingOpp.title}`}
                            >
                              <TrendingUp className="w-3 h-3 text-amber-400" />
                              <span>الفرصة قائمة ({existingOpp.stage})</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={() => handleQuickCreateOpportunity(inq)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>+ فرصة بيعية</span>
                          </button>
                        );
                      })()}

                      {(() => {
                        const existingQuote = quotations.find((q) => q.customerId === inq.customerId);
                        if (existingQuote) {
                          return (
                            <button
                              onClick={() => {
                                navigateToTabWithFilter("quotations", {
                                  companyId: inq.companyId,
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-950/70 text-blue-300 border border-blue-800/50 hover:bg-blue-900/60 flex items-center gap-1 cursor-pointer transition-colors"
                              title={`عرض السعر مسجل: ${existingQuote.quoteNumber}`}
                            >
                              <FileText className="w-3 h-3 text-blue-400" />
                              <span>عرض السعر ({existingQuote.status})</span>
                            </button>
                          );
                        }
                        return (
                          <button
                            onClick={() => {
                              navigateToTabWithFilter("quotations", {
                                companyId: inq.companyId,
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>+ عرض سعر</span>
                          </button>
                        );
                      })()}
                    </>
                  ) : (
                    <button
                      onClick={() => handleReactivateInquiry(inq)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 text-indigo-600" />
                      <span>إعادة تفعيل إلى عميل مهتم 🟢</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedCustomerIdFor360(inq.customerId)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#F8F8F5] text-[#111111] hover:bg-[#EAEAEA] border border-[#EAEAEA] flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3 text-[#C8A75A]" />
                    <span>ملف العميل</span>
                  </button>

                  {canDeleteRecords && (
                    <button
                      onClick={() => setSingleDeleteId(inq.id)}
                      title="حذف الاستفسار"
                      className="p-1 text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#EAEAEA] space-y-2">
            <Inbox className="w-8 h-8 text-[#9CA3AF] mx-auto" />
            <h3 className="font-bold text-sm text-[#111111]">لا توجد استفسارات مطابقة للفلاتر المحددة</h3>
            <p className="text-xs text-gray-500">جرب مسح الفلاتر أو تغيير معايير البحث.</p>
          </div>
        )}
      </div>

      {/* Reusable Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filtered.length}
        isAllSelected={selectedIds.length === filtered.length && filtered.length > 0}
        onSelectAll={handleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        entityName="استفسار"
        onDelete={handleBulkDelete}
        statusOptions={stageStatusOptions}
        onStatusChange={handleBulkStatusChange}
        onCompanyChange={handleBulkCompanyChange}
        onAddFollowUp={handleBulkAddFollowUp}
        onExport={handleExportSelected}
      />

      {/* Single Delete Confirmation Modal */}
      {singleDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in" dir="rtl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#111111]">حذف الاستفسار</h3>
              <p className="text-xs text-[#6B7280]">هل أنت متأكد من رغبتك في حذف هذا الاستفسار؟</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSingleDeleteId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:bg-[#F8F8F5] cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
