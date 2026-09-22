import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { FollowUp, PriorityLevel, CompanyId } from "../../types";
import {
  Clock,
  Plus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Phone,
  MessageCircle,
  Eye,
  Check,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Target,
} from "lucide-react";
import { BulkActionBar, StatusOption } from "../common/BulkActionBar";
import { SmartFilterBar, FilterState } from "../common/SmartFilterBar";
import { exportToCSV } from "../../utils/exportUtils";

export const FollowupsView: React.FC = () => {
  const {
    filteredFollowUps,
    completeFollowUp,
    rescheduleFollowUp,
    addFollowUp,
    deleteFollowUp,
    batchDeleteFollowUps,
    batchUpdateFollowUps,
    customers,
    companies,
    setSelectedCustomerIdFor360,
    navigationFilter,
    showToast,
    navigateToTabWithFilter,
  } = useApp();

  const todayStr = new Date().toISOString().split("T")[0];

  // Smart Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    companyId: navigationFilter?.companyId || "all",
    stage: "all",
    status: "all",
    area: "all",
    responsible: "all",
    source: "all",
    interestLevel: "all",
    priority: "all",
    datePreset: "all",
    followUpStatus: navigationFilter?.followUpStatus || "active",
  });

  // Sync navigationFilter when drill-down triggers it
  useEffect(() => {
    if (navigationFilter) {
      setFilters((prev) => ({
        ...prev,
        companyId: navigationFilter.companyId || prev.companyId,
        followUpStatus: navigationFilter.followUpStatus || prev.followUpStatus,
      }));
    }
  }, [navigationFilter]);

  const [showAddModal, setShowAddModal] = useState(false);

  // Reschedule state
  const [rescheduleItem, setRescheduleItem] = useState<FollowUp | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  // New Follow-up form
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || "");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("12:00");
  const [priority, setPriority] = useState<PriorityLevel>("medium");
  const [notes, setNotes] = useState("");

  const pendingCount = filteredFollowUps.filter((f) => f.status === "pending").length;
  const todayCount = filteredFollowUps.filter((f) => f.status === "pending" && f.dueDate === todayStr).length;
  const overdueCount = filteredFollowUps.filter((f) => f.status === "pending" && f.dueDate < todayStr).length;
  const upcomingCount = filteredFollowUps.filter((f) => f.status === "pending" && f.dueDate > todayStr).length;
  const completedCount = filteredFollowUps.filter((f) => f.status === "completed").length;

  const filtered = useMemo(() => {
    return filteredFollowUps.filter((f) => {
      let matchesTimeline = true;
      const fStatus = filters.followUpStatus || "active";
      if (fStatus === "active") matchesTimeline = f.status === "pending";
      else if (fStatus === "today") matchesTimeline = f.status === "pending" && f.dueDate === todayStr;
      else if (fStatus === "overdue") matchesTimeline = f.status === "pending" && f.dueDate < todayStr;
      else if (fStatus === "upcoming") matchesTimeline = f.status === "pending" && f.dueDate > todayStr;
      else if (fStatus === "completed") matchesTimeline = f.status === "completed";
      else if (fStatus === "all") matchesTimeline = true;

      const matchesPriority = filters.priority === "all" || f.priority === filters.priority;
      const matchesCompany = filters.companyId === "all" || f.companyId === filters.companyId;

      const q = filters.search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        f.customerName.toLowerCase().includes(q) ||
        f.customerPhone.includes(q) ||
        f.title.toLowerCase().includes(q) ||
        (f.notes && f.notes.toLowerCase().includes(q));

      return matchesTimeline && matchesPriority && matchesCompany && matchesSearch;
    });
  }, [filteredFollowUps, filters, todayStr]);

  const getCompany = (compId: string) => companies.find((c) => c.id === compId);

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((f) => f.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Operations
  const handleBulkDelete = () => {
    batchDeleteFollowUps(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkStatusChange = (newStatus: string) => {
    batchUpdateFollowUps(selectedIds, { status: newStatus as "pending" | "completed" });
    setSelectedIds([]);
    showToast(`تم تحديث حالة ${selectedIds.length} متابعة بنجاح`, "success");
  };

  const handleBulkCompanyChange = (newCompanyId: CompanyId) => {
    batchUpdateFollowUps(selectedIds, { companyId: newCompanyId });
    setSelectedIds([]);
    showToast(`تم نقل ${selectedIds.length} متابعة إلى الشركة المحددة`, "success");
  };

  const handleExportSelected = () => {
    const selectedFollowUps = filteredFollowUps.filter((f) => selectedIds.includes(f.id));
    exportToCSV(
      "followups_export",
      [
        { header: "اسم العميل", key: "customerName" },
        { header: "رقم الهاتف", key: "customerPhone" },
        { header: "عنوان المتابعة", key: "title" },
        { header: "تاريخ الاستحقاق", key: "dueDate" },
        { header: "الوقت", key: "dueTime" },
        { header: "الأولوية", key: "priority" },
        { header: "الحالة", key: "status" },
        {
          header: "الشركة",
          key: (item) => getCompany(item.companyId)?.name || item.companyId,
        },
        { header: "ملاحظات", key: "notes" },
      ],
      selectedFollowUps
    );
    showToast(`تم تصدير ${selectedFollowUps.length} متابعة بنجاح إلى ملف Excel/CSV`, "success");
  };

  const handleConfirmSingleDelete = () => {
    if (singleDeleteId) {
      deleteFollowUp(singleDeleteId);
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteId));
      setSingleDeleteId(null);
    }
  };

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return;

    addFollowUp({
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      companyId: cust.companyId,
      dueDate,
      dueTime: time,
      title: title || "متابعة دورية",
      priority,
      notes,
      source: "manual",
      status: "pending",
    });

    setShowAddModal(false);
    setTitle("");
    setNotes("");
    showToast("تمت إضافة موعد المتابعة بنجاح", "success");
  };

  const followUpStatusOptions: StatusOption[] = [
    { value: "completed", label: "تم الإنجاز (Completed) ✓" },
    { value: "pending", label: "معلقة / قيد الانتظار (Pending) ⏰" },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-24" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[#111111] text-[#C8A75A]">
              <Clock className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
                إدارة المتابعات والمهام (Follow-ups)
              </h1>
              <p className="text-xs sm:text-sm text-[#6B7280]">
                جدولة المواعيد والتواصل، تتبع المتأخرات، والفلاتر الذكية مع العمليات المجمعة
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] border border-[#C8A75A]/40 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#C8A75A]" />
          <span>إضافة موعد متابعة</span>
        </button>
      </div>

      {/* Quick KPI Timeline Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilters((prev) => ({ ...prev, followUpStatus: "active" }))}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            filters.followUpStatus === "active"
              ? "bg-[#111111] text-[#C8A75A] shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#111111] border border-[#EAEAEA]"
          }`}
        >
          <span>النشطة (تحتاج إجراء)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filters.followUpStatus === "active" ? "bg-[#C8A75A] text-[#111111]" : "bg-[#F8F8F5] text-[#6B7280]"
            }`}
          >
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setFilters((prev) => ({ ...prev, followUpStatus: "today" }))}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            filters.followUpStatus === "today"
              ? "bg-amber-500 text-white shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#111111] border border-[#EAEAEA]"
          }`}
        >
          <span>مستحقة اليوم</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filters.followUpStatus === "today" ? "bg-white text-amber-600 font-black" : "bg-[#F8F8F5] text-[#6B7280]"
            }`}
          >
            {todayCount}
          </span>
        </button>

        <button
          onClick={() => setFilters((prev) => ({ ...prev, followUpStatus: "overdue" }))}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            filters.followUpStatus === "overdue"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#111111] border border-[#EAEAEA]"
          }`}
        >
          <span>متأخرة ⚠️</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filters.followUpStatus === "overdue" ? "bg-white text-rose-600 font-black" : "bg-rose-50 text-rose-600"
            }`}
          >
            {overdueCount}
          </span>
        </button>

        <button
          onClick={() => setFilters((prev) => ({ ...prev, followUpStatus: "upcoming" }))}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            filters.followUpStatus === "upcoming"
              ? "bg-[#111111] text-[#C8A75A] shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#111111] border border-[#EAEAEA]"
          }`}
        >
          <span>القادمة</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filters.followUpStatus === "upcoming" ? "bg-[#C8A75A] text-[#111111]" : "bg-[#F8F8F5] text-[#6B7280]"
            }`}
          >
            {upcomingCount}
          </span>
        </button>

        <button
          onClick={() => setFilters((prev) => ({ ...prev, followUpStatus: "completed" }))}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            filters.followUpStatus === "completed"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#111111] border border-[#EAEAEA]"
          }`}
        >
          <span>المكتملة ✓</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filters.followUpStatus === "completed" ? "bg-white text-emerald-600 font-black" : "bg-[#F8F8F5] text-[#6B7280]"
            }`}
          >
            {completedCount}
          </span>
        </button>
      </div>

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
            followUpStatus: "all",
          })
        }
        showStageFilter={false}
        showAreaFilter={false}
        showResponsibleFilter={false}
        showSourceFilter={false}
        showInterestFilter={false}
        showPriorityFilter={true}
        showFollowUpStatusFilter={true}
        totalResultsCount={filtered.length}
      />

      {/* Select All Toggle Header */}
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
          <span>تحديد الكل ({filtered.length})</span>
        </button>
        <span>
          عرض <strong>{filtered.length}</strong> متابعة
        </span>
      </div>

      {/* Follow-ups List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const isOverdue = item.status === "pending" && item.dueDate < todayStr;
          const isToday = item.status === "pending" && item.dueDate === todayStr;
          const comp = getCompany(item.companyId);
          const isSelected = selectedIds.includes(item.id);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 ${
                isSelected
                  ? "border-[#C8A75A] ring-1 ring-[#C8A75A] bg-amber-50/20"
                  : isOverdue
                  ? "border-rose-200 bg-rose-50/20"
                  : isToday
                  ? "border-amber-200 bg-amber-50/10"
                  : "border-[#EAEAEA]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => toggleSelectOne(item.id)}
                    className="text-[#9CA3AF] hover:text-[#C8A75A] cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <span
                    onClick={() => setSelectedCustomerIdFor360(item.customerId)}
                    className="font-extrabold text-sm text-[#111111] hover:text-[#C8A75A] cursor-pointer transition-colors"
                  >
                    {item.customerName}
                  </span>

                  {comp && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 bg-[#F8F8F5] border border-[#EAEAEA] text-[#111111]"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: comp.color || "#111111" }}
                      />
                      {comp.name}
                    </span>
                  )}

                  {isOverdue && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      متأخرة
                    </span>
                  )}

                  {isToday && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      مستحقة اليوم
                    </span>
                  )}

                  {item.status === "completed" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      مكتملة
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[#6B7280]">{item.dueDate}</span>
                  {item.dueTime && (
                    <span className="font-mono text-[#9CA3AF] bg-[#F8F8F5] px-1.5 py-0.5 rounded">
                      {item.dueTime}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.priority === "high"
                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                        : item.priority === "medium"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-[#F8F8F5] text-[#6B7280] border border-[#EAEAEA]"
                    }`}
                  >
                    {item.priority === "high" ? "أولوية عالية 🔥" : item.priority === "medium" ? "متوسطة" : "عادية"}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8F8F5] p-3 rounded-xl border border-[#EAEAEA] space-y-1">
                <div className="font-bold text-xs text-[#111111]">{item.title}</div>
                {item.notes && <p className="text-xs text-[#6B7280] leading-relaxed">{item.notes}</p>}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#F0F0EE]">
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${item.customerPhone}`}
                    className="p-1.5 rounded-lg bg-[#F8F8F5] hover:bg-slate-200 text-[#111111]"
                    title="اتصال"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`https://wa.me/${item.customerPhone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                    title="واتساب"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-xs font-mono text-[#6B7280]" dir="ltr">
                    {item.customerPhone}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.status === "pending" && (
                    <>
                      <button
                        onClick={() => completeFollowUp(item.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>تم التواصل</span>
                      </button>
                      <button
                        onClick={() => {
                          setRescheduleItem(item);
                          setRescheduleDate(item.dueDate);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F8F8F5] hover:bg-[#EAEAEA] text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>تأجيل</span>
                      </button>
                    </>
                  )}

                  {item.opportunityId && (
                    <button
                      onClick={() => navigateToTabWithFilter("opportunities", { searchQuery: item.customerName || "" })}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#18191B] text-[#C8A75A] border border-[#292B2E] hover:border-[#C8A75A] flex items-center gap-1 cursor-pointer"
                      title="الانتقال إلى الفرصة المرتبطة"
                    >
                      <Target className="w-3 h-3 text-[#C8A75A]" />
                      <span>الفرصة</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedCustomerIdFor360(item.customerId)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#111111] text-[#C8A75A] hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>الملف</span>
                  </button>

                  <button
                    onClick={() => setSingleDeleteId(item.id)}
                    title="حذف المتابعة"
                    className="p-1 text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#EAEAEA] space-y-2">
            <Clock className="w-8 h-8 text-[#9CA3AF] mx-auto" />
            <h3 className="font-bold text-sm text-[#111111]">لا توجد متابعات في هذا القسم</h3>
            <p className="text-xs text-[#6B7280]">كل شيء تحت السيطرة!</p>
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
        entityName="متابعة"
        onDelete={handleBulkDelete}
        statusOptions={followUpStatusOptions}
        onStatusChange={handleBulkStatusChange}
        onCompanyChange={handleBulkCompanyChange}
        onExport={handleExportSelected}
      />

      {/* Add Follow-up Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#EAEAEA] overflow-hidden animate-in fade-in">
            <div className="p-4 bg-[#111111] text-white flex items-center justify-between border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C8A75A]" />
                <h3 className="font-bold text-sm">إضافة موعد متابعة جديد</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#111111]">اختر العميل *:</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl text-[#111111] outline-hidden focus:border-[#C8A75A]"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#111111]">عنوان / غرض المتابعة *:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: اتصال هاتفي لمتابعة العرض الفني"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl text-[#111111] outline-hidden focus:border-[#C8A75A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#111111]">تاريخ الاستحقاق *:</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono text-[#111111] outline-hidden focus:border-[#C8A75A]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#111111]">الوقت:</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono text-[#111111] outline-hidden focus:border-[#C8A75A]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#111111]">الأولوية:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl text-[#111111] outline-hidden focus:border-[#C8A75A]"
                >
                  <option value="low">عادية / منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية جداً 🔥</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#111111]">ملاحظات وتفاصيل إضافية:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي نقاط هامة يجب مراعاتها أثناء الاتصال..."
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl outline-hidden focus:border-[#C8A75A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F0F0EE]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-[#6B7280] hover:text-[#111111] rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ المتابعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#EAEAEA] overflow-hidden animate-in fade-in" dir="rtl">
            <div className="p-4 bg-[#111111] text-white flex items-center justify-between border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C8A75A]" />
                <h3 className="font-bold text-sm">تأجيل موعد المتابعة</h3>
              </div>
              <button
                onClick={() => setRescheduleItem(null)}
                className="text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!rescheduleDate) return;
                rescheduleFollowUp(rescheduleItem.id, rescheduleDate, rescheduleNotes);
                setRescheduleItem(null);
                setRescheduleDate("");
                setRescheduleNotes("");
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div className="p-3 bg-[#F8F8F5] rounded-xl border border-[#EAEAEA] space-y-1">
                <div className="font-bold text-[#111111] text-sm">{rescheduleItem.customerName}</div>
                <div className="text-[#6B7280]">{rescheduleItem.title}</div>
                <div className="text-[11px] font-mono text-[#9CA3AF]">
                  الموعد الحالي: {rescheduleItem.dueDate} {rescheduleItem.time || ""}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#111111]">تاريخ المتابعة الجديد *:</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-mono text-[#111111] outline-hidden focus:border-[#C8A75A]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#111111]">سبب التأجيل / ملاحظات التحديث:</label>
                <textarea
                  rows={2}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="مثال: طلب العميل التواصل الأسبوع القادم بعد المعاينة..."
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl outline-hidden focus:border-[#C8A75A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F0F0EE]">
                <button
                  type="button"
                  onClick={() => setRescheduleItem(null)}
                  className="px-4 py-2 text-[#6B7280] hover:text-[#111111] rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#111111] hover:bg-[#222222] text-[#C8A75A] font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ وتأجيل المتابعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {singleDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in" dir="rtl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#111111]">حذف المتابعة</h3>
              <p className="text-xs text-[#6B7280]">هل أنت متأكد من رغبتك في حذف هذه المتابعة؟</p>
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
