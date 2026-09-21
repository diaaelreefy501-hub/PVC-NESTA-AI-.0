import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Customer, CustomerStage, InterestLevel, CompanyId, PriorityLevel } from "../../types";
import {
  Users,
  Plus,
  Phone,
  MessageCircle,
  MapPin,
  Building2,
  Eye,
  Flame,
  Clock,
  Trash2,
  CheckSquare,
  Square,
  UploadCloud,
  Edit2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { CustomerEditModal } from "./CustomerEditModal";
import { BulkActionBar, StatusOption } from "../common/BulkActionBar";
import { SmartFilterBar, FilterState } from "../common/SmartFilterBar";
import { exportToCSV } from "../../utils/exportUtils";
import { NestaGuardian } from "./NestaGuardian";
import { GuardianStatus, analyzeCustomerJourney } from "../../utils/nestaIntelligence";

export const CustomersView: React.FC = () => {
  const {
    filteredCustomers,
    followUps,
    quotations,
    contracts,
    opportunities,
    companies,
    setSelectedCustomerIdFor360,
    setCurrentTab,
    deleteCustomer,
    batchDeleteCustomers,
    batchUpdateCustomers,
    batchAddFollowUps,
    navigationFilter,
    showToast,
  } = useApp();

  const [guardianFilter, setGuardianFilter] = useState<GuardianStatus | 'all'>('all');

  // Smart Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    companyId: navigationFilter?.companyId || "all",
    stage: navigationFilter?.stage || "all",
    status: "all",
    area: "all",
    responsible: "all",
    source: "all",
    interestLevel: navigationFilter?.interestLevel || "all",
    priority: "all",
    datePreset: navigationFilter?.date ? "custom" : "all",
    startDate: navigationFilter?.date || "",
    endDate: navigationFilter?.date || "",
  });

  // Sync navigationFilter when updated from drill-down
  useEffect(() => {
    if (navigationFilter) {
      setFilters((prev) => ({
        ...prev,
        companyId: navigationFilter.companyId || prev.companyId,
        stage: navigationFilter.stage || prev.stage,
        area: navigationFilter.area || prev.area,
        source: navigationFilter.source || prev.source,
        search: navigationFilter.searchQuery || prev.search,
        interestLevel: navigationFilter.interestLevel || prev.interestLevel,
        startDate: navigationFilter.date || prev.startDate,
        endDate: navigationFilter.date || prev.endDate,
        datePreset: navigationFilter.date ? "custom" : prev.datePreset,
      }));
    }
  }, [navigationFilter]);

  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [filterIncompleteOnly, setFilterIncompleteOnly] = useState(false);

  // Count customers without name or with placeholder
  const incompleteCustomers = useMemo(() => {
    return filteredCustomers.filter(
      (c) => !c.name?.trim() || c.name.startsWith("عميل بدون اسم")
    );
  }, [filteredCustomers]);

  // Unique areas
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    filteredCustomers.forEach((c) => {
      if (c.area && c.area !== "غير محدد") set.add(c.area);
    });
    return Array.from(set).sort();
  }, [filteredCustomers]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return filteredCustomers.filter((c) => {
      const isNoName = !c.name?.trim() || c.name.startsWith("عميل بدون اسم");
      if (filterIncompleteOnly && !isNoName) {
        return false;
      }

      const q = filters.search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.area && c.area.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (isNoName &&
          (q.includes("بدون") ||
            q.includes("اسم") ||
            q.includes("فارغ") ||
            q.includes("إكمال")));

      const matchesCompany =
        filters.companyId === "all" || c.companyId === filters.companyId;
      const matchesStage = filters.stage === "all" || c.stage === filters.stage;
      const matchesInterest =
        filters.interestLevel === "all" || c.interestLevel === filters.interestLevel;
      const matchesArea = filters.area === "all" || c.area === filters.area;
      const matchesResponsible =
        filters.responsible === "all" || c.assignedTo === filters.responsible;
      const matchesSource =
        filters.source === "all" ||
        (c.source && c.source.toLowerCase() === filters.source.toLowerCase());

      // Date preset filtering
      let matchesDate = true;
      if (filters.datePreset === "today") {
        const today = new Date().toISOString().split("T")[0];
        matchesDate = c.createdAt ? c.createdAt.startsWith(today) : false;
      } else if (filters.datePreset === "custom") {
        if (filters.startDate && c.createdAt && c.createdAt < filters.startDate) {
          matchesDate = false;
        }
        if (filters.endDate && c.createdAt && c.createdAt > filters.endDate + "T23:59:59") {
          matchesDate = false;
        }
      }

      let matchesGuardian = true;
      if (guardianFilter !== 'all') {
        const todayStr = new Date().toISOString().split("T")[0];
        const insight = analyzeCustomerJourney(c, followUps, quotations, contracts, opportunities, todayStr);
        matchesGuardian = insight.status === guardianFilter;
      }

      return (
        matchesSearch &&
        matchesCompany &&
        matchesStage &&
        matchesInterest &&
        matchesArea &&
        matchesResponsible &&
        matchesSource &&
        matchesDate &&
        matchesGuardian
      );
    });
  }, [filteredCustomers, filters, filterIncompleteOnly, guardianFilter, followUps, quotations, contracts, opportunities]);

  const getCompany = (compId: CompanyId) => companies.find((c) => c.id === compId);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk operations
  const handleBulkDelete = () => {
    batchDeleteCustomers(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkStatusChange = (newStage: string) => {
    batchUpdateCustomers(selectedIds, { stage: newStage as CustomerStage });
    setSelectedIds([]);
    showToast(`تم تحديث مرحلة ${selectedIds.length} عميل بنجاح`, "success");
  };

  const handleBulkCompanyChange = (newCompanyId: CompanyId) => {
    batchUpdateCustomers(selectedIds, { companyId: newCompanyId });
    setSelectedIds([]);
    showToast(`تم نقل ${selectedIds.length} عميل إلى الشركة المحددة`, "success");
  };

  const handleBulkAssignResponsible = (salesperson: string) => {
    batchUpdateCustomers(selectedIds, { assignedTo: salesperson });
    setSelectedIds([]);
    showToast(`تم تعيين المسؤول (${salesperson}) لـ ${selectedIds.length} عميل`, "success");
  };

  const handleBulkAddFollowUp = (data: {
    dueDate: string;
    title: string;
    priority: PriorityLevel;
    notes?: string;
  }) => {
    const selectedCustomers = filteredCustomers.filter((c) => selectedIds.includes(c.id));
    const items = selectedCustomers.map((c) => ({
      companyId: c.companyId,
      customerId: c.id,
      customerName: c.name,
      customerPhone: c.phone,
    }));

    batchAddFollowUps(items, {
      dueDate: data.dueDate,
      time: "12:00",
      title: data.title,
      priority: data.priority,
      notes: data.notes || `متابعة دورية مجدولة للعميل`,
    });
    setSelectedIds([]);
    showToast(`تمت جدولة ${items.length} متابعة للعملاء المحددين بنجاح`, "success");
  };

  const handleExportSelected = () => {
    const selectedCustomers = filteredCustomers.filter((c) => selectedIds.includes(c.id));
    exportToCSV(
      "customers_export",
      [
        { header: "اسم العميل", key: "name" },
        { header: "رقم الهاتف", key: "phone" },
        { header: "المنطقة", key: "area" },
        { header: "المرحلة", key: "stage" },
        { header: "درجة الاهتمام", key: "interestLevel" },
        {
          header: "الشركة",
          key: (item) => getCompany(item.companyId)?.name || item.companyId,
        },
        { header: "المسؤول", key: (item) => item.assignedTo || "غير محدد" },
        { header: "المصدر", key: "source" },
        { header: "إجمالي العروض", key: "totalQuotationsValue" },
        { header: "إجمالي المبيعات", key: "totalSalesValue" },
      ],
      selectedCustomers
    );
    showToast(`تم تصدير ${selectedCustomers.length} عميل بنجاح إلى ملف Excel/CSV`, "success");
  };

  const handleConfirmSingleDelete = () => {
    if (singleDeleteId) {
      deleteCustomer(singleDeleteId);
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteId));
      setSingleDeleteId(null);
    }
  };

  const stageOptions: StatusOption[] = [
    { value: "inquiry", label: "استفسار جديد" },
    { value: "contacted", label: "تم التواصل" },
    { value: "inspection", label: "معاينة ومقاسات" },
    { value: "quotation", label: "عرض سعر" },
    { value: "negotiation", label: "تفاوض" },
    { value: "contracted", label: "تم التعاقد" },
    { value: "lost", label: "صفقة خاسرة" },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-24" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292B2E] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[#18191B] text-[#C8A75A] border border-[#292B2E]">
              <Users className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#EDEDED]">
                قاعدة العملاء والتحكم بالبيانات (Customers)
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA]">
                إدارة وسجلات العملاء مع نظام الفلاتر الذكية والعمليات المجمعة الشاملة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab("import")}
            className="px-3.5 py-2.5 bg-[#18191B] hover:bg-[#202225] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-bold shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-[#C8A75A]" />
            <span>استيراد Excel الذكي</span>
          </button>

          <button
            onClick={() => setCurrentTab("intake")}
            className="px-4 py-2.5 bg-[#C8A75A] hover:bg-[#d8b76a] text-[#111111] rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#111111]" />
            <span>تسجيل عميل جديد</span>
          </button>
        </div>
      </div>

      <NestaGuardian onFilterChange={setGuardianFilter} currentFilter={guardianFilter} />

      {/* Incomplete / Missing Name Customers Banner */}
      {incompleteCustomers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-300 flex items-center gap-2 flex-wrap">
                <span>تنبيه: يوجد {incompleteCustomers.length} عميل مستورد بدون اسم في الشركات</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  بحاجة لإكمال البيانات
                </span>
              </p>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                بيانات الصفوف محفوظة بالكامل مع ترك الاسم فارغاً. يمكنك النقر على أي عميل لإدخال اسمه وتعديل كافة بياناته فوراً.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={() => setFilterIncompleteOnly(!filterIncompleteOnly)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterIncompleteOnly
                  ? "bg-amber-500 text-[#111111] shadow-xs hover:bg-amber-400"
                  : "bg-[#202225] text-amber-300 border border-amber-500/30 hover:bg-[#292B2E] shadow-2xs"
              }`}
            >
              <span>{filterIncompleteOnly ? "عرض كل العملاء" : "تصفية: العملاء بدون اسم فقط"}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">
                {incompleteCustomers.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Smart Filter Bar */}
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
        stageOptions={stageOptions}
        areaOptions={uniqueAreas}
        totalResultsCount={filtered.length}
      />

      {/* Selection Summary & Layout Toggle */}
      <div className="flex items-center justify-between text-xs text-[#A1A1AA] px-1">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 font-bold text-[#EDEDED] hover:text-[#C8A75A] cursor-pointer"
          >
            {selectedIds.length === filtered.length && filtered.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
            ) : (
              <Square className="w-4 h-4 text-[#6B7280]" />
            )}
            <span>تحديد الكل في هذه النتائج ({filtered.length})</span>
          </button>
          <span className="text-[#292B2E]">|</span>
          <span>
            عرض <strong className="text-[#EDEDED]">{filtered.length}</strong> من أصل {filteredCustomers.length} عميل
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === "cards" ? "bg-[#C8A75A] text-[#111111]" : "text-[#A1A1AA] hover:bg-[#202225]"
            }`}
          >
            بطاقات
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === "table" ? "bg-[#C8A75A] text-[#111111]" : "text-[#A1A1AA] hover:bg-[#202225]"
            }`}
          >
            جدول تفصيلي
          </button>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const comp = getCompany(c.companyId);
            const isSelected = selectedIds.includes(c.id);
            const isNoName = !c.name?.trim() || c.name.startsWith("عميل بدون اسم");

            return (
              <div
                key={c.id}
                className={`bg-[#18191B] rounded-2xl border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 relative group ${
                  isSelected
                    ? "border-[#C8A75A] ring-1 ring-[#C8A75A] bg-[#C8A75A]/5"
                    : isNoName
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-[#292B2E] hover:border-[#383A3E]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSelectOne(c.id)}
                      className="text-[#6B7280] hover:text-[#C8A75A] cursor-pointer mt-0.5"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedCustomerIdFor360(c.id)}
                          className={`font-black text-sm text-right hover:text-[#C8A75A] transition-colors cursor-pointer ${
                            isNoName ? "text-amber-400 underline decoration-dashed" : "text-[#EDEDED]"
                          }`}
                        >
                          {c.name || "عميل بدون اسم (انقر للتعديل)"}
                        </button>
                        {isNoName && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                            غير مكتمل
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#A1A1AA] font-mono" dir="ltr">
                          {c.phone}
                        </span>
                        {c.area && c.area !== "غير محدد" && (
                          <span className="text-[10px] text-[#A1A1AA] flex items-center gap-0.5 bg-[#202225] border border-[#292B2E] px-1.5 py-0.5 rounded">
                            <MapPin className="w-2.5 h-2.5 text-[#C8A75A]" />
                            {c.area}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stage & Interest Badges */}
                  <div className="flex flex-col items-end gap-1">
                    {c.interestLevel === "hot" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        Hot 🔥
                      </span>
                    )}
                    {comp && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 bg-[#202225] border border-[#292B2E] text-[#EDEDED]"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: comp.color || "#C8A75A" }}
                        />
                        {comp.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Values and Status Row */}
                <div className="bg-[#202225] border border-[#292B2E] p-2.5 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#A1A1AA] block text-[10px]">المرحلة:</span>
                    <span className="font-bold text-[#EDEDED]">
                      {c.stage === "inquiry"
                        ? "استفسار"
                        : c.stage === "contacted"
                        ? "تم التواصل"
                        : c.stage === "inspection"
                        ? "معاينة"
                        : c.stage === "quotation"
                        ? "عرض سعر"
                        : c.stage === "contracted"
                        ? "تعاقد ✓"
                        : c.stage}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className="text-[#A1A1AA] block text-[10px]">قيمة المبيعات:</span>
                    <span className="font-mono font-black text-[#22C55E]">
                      {(c.totalSalesValue || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>

                {/* Guardian Warning Reason */}
                {guardianFilter !== 'all' && (
                  <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl space-y-1 text-right">
                    <p className="text-[11px] font-black text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>تنبيه الحارس ({guardianFilter === 'intervention_required' ? 'يحتاج تدخل' : guardianFilter})</span>
                    </p>
                    {analyzeCustomerJourney(c, followUps, quotations, contracts, opportunities, new Date().toISOString().split('T')[0]).reasons.map((r, rIdx) => (
                      <p key={rIdx} className="text-[10px] text-rose-300">{r}</p>
                    ))}
                    {analyzeCustomerJourney(c, followUps, quotations, contracts, opportunities, new Date().toISOString().split('T')[0]).nextAction && (
                      <p className="text-[9px] text-[#A1A1AA] mt-1 border-t border-rose-500/20 pt-1">
                        الإجراء التالي: <strong className="text-rose-200">{analyzeCustomerJourney(c, followUps, quotations, contracts, opportunities, new Date().toISOString().split('T')[0]).nextAction}</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-[#292B2E]">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${c.phone}`}
                      className="p-1.5 rounded-lg bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E]"
                      title="اتصال"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                      title="واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingCustomer(c)}
                      className="p-1.5 rounded-lg bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="تعديل البيانات"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#A1A1AA]" />
                      <span>تعديل</span>
                    </button>

                    <button
                      onClick={() => setSelectedCustomerIdFor360(c.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#C8A75A] hover:bg-[#d8b76a] text-[#111111] flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>الملف</span>
                    </button>

                    <button
                      onClick={() => setSingleDeleteId(c.id)}
                      title="حذف العميل"
                      className="p-1.5 text-[#6B7280] hover:text-rose-400 hover:bg-rose-500/20 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-[#18191B] rounded-2xl border border-[#292B2E] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-[#111111] text-[#A1A1AA] font-bold border-b border-[#292B2E]">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={handleSelectAll}
                      className="accent-[#C8A75A] cursor-pointer"
                    />
                  </th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">الشركة</th>
                  <th className="p-3">المنطقة</th>
                  <th className="p-3">المرحلة</th>
                  <th className="p-3">الاهتمام</th>
                  <th className="p-3">المسؤول</th>
                  <th className="p-3">قيمة العروض</th>
                  <th className="p-3">قيمة المبيعات</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292B2E]">
                {filtered.map((c) => {
                  const comp = getCompany(c.companyId);
                  const isSelected = selectedIds.includes(c.id);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-[#202225]/80 transition-colors ${
                        isSelected ? "bg-[#C8A75A]/10" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(c.id)}
                          className="accent-[#C8A75A] cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold text-[#EDEDED]">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedCustomerIdFor360(c.id)}
                            className="hover:text-[#C8A75A] cursor-pointer text-right"
                          >
                            {c.name || "عميل بدون اسم"}
                          </button>
                        </div>
                        <span className="text-[10px] text-[#A1A1AA] font-mono block" dir="ltr">
                          {c.phone}
                        </span>
                        {guardianFilter !== 'all' && (
                          <div className="mt-1 bg-rose-500/10 border border-rose-500/20 p-1.5 rounded text-[10px] text-rose-300 max-w-xs leading-normal">
                            ⚠️ {analyzeCustomerJourney(c, followUps, quotations, contracts, opportunities, new Date().toISOString().split('T')[0]).reasons.join(" | ")}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {comp && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#202225] border border-[#292B2E] text-[#EDEDED]">
                            {comp.name}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[#A1A1AA]">{c.area || "-"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#202225] border border-[#292B2E] text-[#EDEDED]">
                          {c.stage}
                        </span>
                      </td>
                      <td className="p-3">
                        {c.interestLevel === "hot" && (
                          <span className="text-rose-400 font-bold">🔥 Hot</span>
                        )}
                        {c.interestLevel === "warm" && (
                          <span className="text-amber-400 font-bold">🟠 Warm</span>
                        )}
                        {c.interestLevel === "cold" && (
                          <span className="text-blue-400 font-bold">🔵 Cold</span>
                        )}
                      </td>
                      <td className="p-3 text-[#A1A1AA]">{c.assignedTo || "غير محدد"}</td>
                      <td className="p-3 font-mono font-bold text-[#EDEDED]">
                        {(c.totalQuotationsValue || 0).toLocaleString()} ج.م
                      </td>
                      <td className="p-3 font-mono font-bold text-[#22C55E]">
                        {(c.totalSalesValue || 0).toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingCustomer(c)}
                            className="p-1 text-[#A1A1AA] hover:text-[#C8A75A] cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedCustomerIdFor360(c.id)}
                            className="p-1 text-[#A1A1AA] hover:text-[#C8A75A] cursor-pointer"
                            title="الملف"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSingleDeleteId(c.id)}
                            className="p-1 text-[#6B7280] hover:text-rose-400 cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-[#18191B] rounded-2xl p-12 text-center border border-[#292B2E] space-y-2">
          <Users className="w-8 h-8 text-[#6B7280] mx-auto" />
          <h3 className="font-bold text-sm text-[#EDEDED]">لا يوجد عملاء يطابقون خيارات الفرز</h3>
          <p className="text-xs text-[#A1A1AA]">جرب مسح الفلاتر أو تغيير معايير البحث.</p>
        </div>
      )}

      {/* Reusable Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filtered.length}
        isAllSelected={selectedIds.length === filtered.length && filtered.length > 0}
        onSelectAll={handleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        entityName="عميل"
        onDelete={handleBulkDelete}
        statusOptions={stageOptions}
        onStatusChange={handleBulkStatusChange}
        onCompanyChange={handleBulkCompanyChange}
        onAssignResponsible={handleBulkAssignResponsible}
        onAddFollowUp={handleBulkAddFollowUp}
        onExport={handleExportSelected}
      />

      {/* Single Customer Delete Confirmation Modal */}
      {singleDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18191B] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-500/30 text-center space-y-4 animate-in fade-in" dir="rtl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#EDEDED]">تأكيد حذف العميل</h3>
              <p className="text-xs text-[#A1A1AA]">
                هل أنت متأكد من رغبتك في حذف هذا العميل من النظام؟
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSingleDeleteId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-[#A1A1AA] hover:bg-[#202225] border border-[#292B2E] cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md"
              >
                نعم، احذف العميل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit & Complete Customer Profile Modal */}
      <CustomerEditModal
        customer={editingCustomer}
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
      />
    </div>
  );
};
