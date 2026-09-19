import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { TaskItem, PriorityLevel } from "../../types";
import { GlobalFilterBar } from "../common/GlobalFilterBar";
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  Building2,
  Trash2,
  Edit2,
  X,
  Search,
  Filter,
  User,
  ArrowUpRight,
  Phone,
  RotateCw,
} from "lucide-react";

export const TasksView: React.FC = () => {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    companies,
    activeCompanyId,
    customers,
    followUps,
    quotations,
    contracts,
    currentUser,
    users,
    globalFilters,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "pending" | "in_progress" | "completed">("pending");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    type: TaskItem["type"];
    companyId: string;
    customerId?: string;
    dueDate: string;
    dueTime?: string;
    priority: PriorityLevel;
    responsible?: string;
    notes?: string;
  }>({
    title: "",
    type: "followup",
    companyId: activeCompanyId !== "all" ? activeCompanyId : "comp-newhouse",
    dueDate: todayStr,
    dueTime: "12:00",
    priority: "medium",
    responsible: currentUser?.name || "مسؤول المبيعات",
    notes: "",
  });

  // Filter Tasks
  const filteredList = useMemo(() => {
    return tasks.filter((t) => {
      // Company filter
      if (activeCompanyId !== "all" && t.companyId && t.companyId !== activeCompanyId) {
        return false;
      }
      if (
        globalFilters.companyIds &&
        globalFilters.companyIds.length > 0 &&
        t.companyId &&
        !globalFilters.companyIds.includes(t.companyId)
      ) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && t.status !== selectedStatus) {
        return false;
      }

      // Type filter
      if (selectedType !== "all" && t.type !== selectedType) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== "all" && t.priority !== selectedPriority) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCust = t.customerName?.toLowerCase().includes(q);
        const matchResp = t.responsible?.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchCust && !matchResp && !matchNotes) return false;
      }

      return true;
    });
  }, [tasks, activeCompanyId, globalFilters.companyIds, selectedStatus, selectedType, selectedPriority, searchQuery]);

  // Key stats
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const overdueCount = tasks.filter((t) => t.status === "pending" && t.dueDate < todayStr).length;
  const todayCount = tasks.filter((t) => t.status === "pending" && t.dueDate === todayStr).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const handleOpenAdd = () => {
    setFormData({
      title: "",
      type: "followup",
      companyId: activeCompanyId !== "all" ? activeCompanyId : (companies[0]?.id || "comp-newhouse"),
      dueDate: todayStr,
      dueTime: "12:00",
      priority: "medium",
      responsible: currentUser?.name || "مسؤول المبيعات",
      notes: "",
    });
    setEditingTask(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (t: TaskItem) => {
    setFormData({
      title: t.title,
      type: t.type,
      companyId: t.companyId,
      customerId: t.customerId,
      dueDate: t.dueDate,
      dueTime: t.dueTime || "12:00",
      priority: t.priority,
      responsible: t.responsible || currentUser?.name || "مسؤول المبيعات",
      notes: t.notes || "",
    });
    setEditingTask(t);
    setIsAddModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const matchedCust = customers.find((c) => c.id === formData.customerId);

    if (editingTask) {
      updateTask(editingTask.id, {
        title: formData.title,
        type: formData.type,
        companyId: formData.companyId,
        customerId: formData.customerId,
        customerName: matchedCust?.name || editingTask.customerName,
        customerPhone: matchedCust?.phone || editingTask.customerPhone,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        priority: formData.priority,
        responsible: formData.responsible,
        notes: formData.notes,
      });
    } else {
      addTask({
        title: formData.title,
        type: formData.type,
        companyId: formData.companyId,
        customerId: formData.customerId,
        customerName: matchedCust?.name,
        customerPhone: matchedCust?.phone,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        priority: formData.priority,
        status: "pending",
        responsible: formData.responsible,
        notes: formData.notes,
      });
    }

    setIsAddModalOpen(false);
  };

  const taskTypeLabels: Record<string, string> = {
    followup: "متابعة عميل",
    inspection: "معاينة ورفع مقاسات",
    quote_review: "مراجعة عرض سعر",
    contract_delivery: "توقيع وتسليم عقد",
    payment_collection: "تحصيل دفعة مالية",
    general: "مهمة إدارية عامة",
  };

  return (
    <div className="space-y-6 pb-20" dir="rtl" id="tasks-view">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#C8A75A]/15 text-[#C8A75A] border border-[#C8A75A]/30">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#EDEDED]">مركز إدارة المهام والعمليات</h1>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            جدولة وتوزيع ومتابعة كافة المهام اليومية والتشغيلية وربطها بالعملاء وفرق العمل
          </p>
        </div>

        <button
          id="add-task-btn"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C8A75A] text-black font-bold rounded-xl text-xs hover:bg-[#B3934B] transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مهمة جديدة</span>
        </button>
      </div>

      {/* Global Filter Bar */}
      <GlobalFilterBar showProductFilter={false} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#A1A1AA] text-xs">
            <span>مهام اليوم</span>
            <Calendar className="w-4 h-4 text-[#C8A75A]" />
          </div>
          <div className="text-2xl font-bold text-[#C8A75A]">{todayCount}</div>
          <div className="text-[11px] text-[#A1A1AA]">مستحقة التنفيذ اليوم</div>
        </div>

        <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#A1A1AA] text-xs">
            <span>مهام متأخرة</span>
            <AlertCircle className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="text-2xl font-bold text-[#EF4444]">{overdueCount}</div>
          <div className="text-[11px] text-[#A1A1AA]">تحتاج معالجة فورية</div>
        </div>

        <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#A1A1AA] text-xs">
            <span>قيد الانتظار</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{pendingCount}</div>
          <div className="text-[11px] text-[#A1A1AA]">إجمالي المهام المفتوحة</div>
        </div>

        <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-[#A1A1AA] text-xs">
            <span>المهام المكتملة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{completedCount}</div>
          <div className="text-[11px] text-[#A1A1AA]">تم إنجازها بنجاح</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#A1A1AA] absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            id="task-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بعنوان المهمة، اسم العميل، المسؤول..."
            className="w-full bg-[#202225] border border-[#292B2E] rounded-lg pr-9 pl-3 py-1.5 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[#202225] p-0.5 rounded-lg border border-[#292B2E]">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
              selectedStatus === "all" ? "bg-[#292B2E] text-white font-bold" : "text-[#A1A1AA]"
            }`}
          >
            كافة المهام
          </button>
          <button
            onClick={() => setSelectedStatus("pending")}
            className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
              selectedStatus === "pending" ? "bg-[#C8A75A] text-black font-bold" : "text-[#A1A1AA]"
            }`}
          >
            المعلقة ({pendingCount})
          </button>
          <button
            onClick={() => setSelectedStatus("completed")}
            className={`px-2.5 py-1 rounded text-xs cursor-pointer ${
              selectedStatus === "completed" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-[#A1A1AA]"
            }`}
          >
            المكتملة ({completedCount})
          </button>
        </div>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="bg-[#202225] border border-[#292B2E] rounded-lg px-2.5 py-1.5 text-xs text-[#EDEDED] cursor-pointer"
        >
          <option value="all">كافة الأولويات</option>
          <option value="urgent">عاجل جداً</option>
          <option value="high">مرتفع</option>
          <option value="medium">متوسط</option>
          <option value="low">منخفض</option>
        </select>
      </div>

      {/* Task Cards List */}
      <div className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-12 text-center space-y-3">
            <CheckSquare className="w-12 h-12 text-[#A1A1AA]/40 mx-auto" />
            <h3 className="text-sm font-bold text-[#EDEDED]">لا توجد مهام مطابقة للفلاتر الحالية</h3>
            <p className="text-xs text-[#A1A1AA]">
              يمكنك إضافة مهمة جديدة أو تعديل فلاتر البحث.
            </p>
          </div>
        ) : (
          filteredList.map((task) => {
            const isOverdue = task.status === "pending" && task.dueDate < todayStr;
            const isToday = task.status === "pending" && task.dueDate === todayStr;
            const comp = companies.find((c) => c.id === task.companyId);

            return (
              <div
                key={task.id}
                id={`task-item-${task.id}`}
                className={`bg-[#18191B] border rounded-xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  task.status === "completed"
                    ? "border-[#292B2E] opacity-75"
                    : isOverdue
                    ? "border-[#EF4444]/40 bg-[#EF4444]/5"
                    : isToday
                    ? "border-[#C8A75A]/50 bg-[#C8A75A]/5"
                    : "border-[#292B2E] hover:border-[#3E4247]"
                }`}
              >
                {/* Left side: Checkbox + Title + Meta */}
                <div className="flex items-start gap-3">
                  <button
                    id={`toggle-task-${task.id}`}
                    onClick={() => {
                      updateTask(task.id, {
                        status: task.status === "completed" ? "pending" : "completed",
                      });
                    }}
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                      task.status === "completed"
                        ? "bg-emerald-500 border-emerald-500 text-black font-bold"
                        : "border-[#3E4247] hover:border-[#C8A75A] text-transparent"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-xs font-bold leading-snug ${
                          task.status === "completed"
                            ? "line-through text-[#A1A1AA]"
                            : "text-[#EDEDED]"
                        }`}
                      >
                        {task.title}
                      </h4>

                      {/* Priority Tag */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          task.priority === "urgent"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : task.priority === "high"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-[#202225] text-[#A1A1AA]"
                        }`}
                      >
                        {task.priority === "urgent"
                          ? "عاجل"
                          : task.priority === "high"
                          ? "أولوية عالية"
                          : task.priority === "medium"
                          ? "متوسط"
                          : "عادي"}
                      </span>

                      {/* Type Tag */}
                      <span className="bg-[#202225] px-1.5 py-0.5 rounded text-[10px] text-[#C8A75A]">
                        {taskTypeLabels[task.type] || task.type}
                      </span>
                    </div>

                    {/* Customer & Company Details */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#A1A1AA]">
                      {task.customerName && (
                        <span className="flex items-center gap-1 text-[#EDEDED]">
                          <Users className="w-3 h-3 text-[#C8A75A]" />
                          <span>{task.customerName}</span>
                          {task.customerPhone && (
                            <span className="text-[#A1A1AA]">({task.customerPhone})</span>
                          )}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#C8A75A]" />
                        <span>{comp?.name || "الشركة"}</span>
                      </span>

                      {task.responsible && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-[#A1A1AA]" />
                          <span>{task.responsible}</span>
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-[11px] text-[#A1A1AA] pt-0.5">{task.notes}</p>
                    )}
                  </div>
                </div>

                {/* Right side: Due Date & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#292B2E]">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-[#A1A1AA]" />
                    <span
                      className={`font-semibold ${
                        isOverdue
                          ? "text-[#EF4444]"
                          : isToday
                          ? "text-[#C8A75A]"
                          : "text-[#A1A1AA]"
                      }`}
                    >
                      {task.dueDate} {task.dueTime ? `(${task.dueTime})` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-task-${task.id}`}
                      onClick={() => handleOpenEdit(task)}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#C8A75A] hover:bg-[#202225] rounded-md transition-colors cursor-pointer"
                      title="تعديل المهمة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-task-${task.id}`}
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف المهمة "${task.title}"؟`)) {
                          deleteTask(task.id);
                        }
                      }}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#202225] rounded-md transition-colors cursor-pointer"
                      title="حذف المهمة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Task Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 space-y-4 shadow-2xl text-[#EDEDED]"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#292B2E]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#C8A75A]" />
                <h3 className="font-bold text-sm">
                  {editingTask ? "تعديل بيانات المهمة" : "إضافة مهمة تشغيلية جديدة"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#A1A1AA] hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5 text-xs">
              {/* Task Title */}
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">عنوان المهمة *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: متابعة تفاصيل عرض السعر وتحديد موعد المعاينة"
                  className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                />
              </div>

              {/* Type & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">نوع المهمة</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskItem["type"] })}
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  >
                    <option value="followup">متابعة عميل</option>
                    <option value="inspection">معاينة ورفع مقاسات</option>
                    <option value="quote_review">مراجعة عرض سعر</option>
                    <option value="contract_delivery">توقيع وتسليم عقد</option>
                    <option value="payment_collection">تحصيل دفعة مالية</option>
                    <option value="general">مهمة إدارية عامة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">مستوى الأولوية</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityLevel })}
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  >
                    <option value="urgent">عاجل جداً (Urgent)</option>
                    <option value="high">أولوية مرتفعة (High)</option>
                    <option value="medium">متوسطة (Medium)</option>
                    <option value="low">منخفضة (Low)</option>
                  </select>
                </div>
              </div>

              {/* Customer & Company */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">الشركة التابعة</label>
                  <select
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">العميل المرتبط (اختياري)</label>
                  <select
                    value={formData.customerId || ""}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value || undefined })}
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  >
                    <option value="">-- بدون ربط عميل --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">تاريخ الاستحقاق *</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  />
                </div>

                <div>
                  <label className="block text-[#A1A1AA] mb-1 font-medium">التوقيت</label>
                  <input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                  />
                </div>
              </div>

              {/* Responsible Person */}
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">المسؤول عن التنفيذ</label>
                <input
                  type="text"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  placeholder="اسم الموظف أو المسؤول"
                  className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[#A1A1AA] mb-1 font-medium">تفاصيل وملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات حول خطوات التنفيذ..."
                  className="w-full bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-2 text-xs text-[#EDEDED] focus:outline-hidden focus:border-[#C8A75A]"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#292B2E]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#202225] text-[#A1A1AA] hover:text-white rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C8A75A] text-black font-bold rounded-lg hover:bg-[#B3934B] transition-colors cursor-pointer"
                >
                  {editingTask ? "حفظ التعديلات" : "إضافة المهمة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
