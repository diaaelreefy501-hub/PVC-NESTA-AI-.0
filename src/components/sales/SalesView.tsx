import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import {
  DollarSign,
  Search,
  Calendar,
  Building2,
  TrendingUp,
  MapPin,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  X,
  FileSpreadsheet,
  Plus,
  Edit2,
  History,
  ShieldCheck,
} from "lucide-react";
import { Sale, CompanyId } from "../../types";
import { BulkActionBar } from "../common/BulkActionBar";
import { exportToCSV } from "../../utils/exportUtils";

export const SalesView: React.FC = () => {
  const {
    filteredSales,
    companies,
    customers,
    todaySalesTotal,
    monthlySalesTotal,
    addSale,
    updateSale,
    deleteSale,
    batchDeleteSales,
    clearAllSales,
    auditLogs,
    currentCompanyRole,
    currentUser,
    activeCompanyId,
    navigationFilter,
    clearNavigationFilter,
    showToast,
  } = useApp();

  const isOwner =
    currentCompanyRole === "owner" || currentUser?.role === "super_admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState(navigationFilter?.area || "all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState<string>(navigationFilter?.month || "all");
  const [responsibleFilter, setResponsibleFilter] = useState<string>(
    navigationFilter?.responsible || "all"
  );
  const [exactDateFilter, setExactDateFilter] = useState<string>(
    navigationFilter?.date || ""
  );

  useEffect(() => {
    if (navigationFilter) {
      if (navigationFilter.date) setExactDateFilter(navigationFilter.date);
      if (navigationFilter.month) setMonthFilter(navigationFilter.month);
      if (navigationFilter.area) setAreaFilter(navigationFilter.area);
      if (navigationFilter.responsible) setResponsibleFilter(navigationFilter.responsible);
      if (navigationFilter.searchQuery) setSearchQuery(navigationFilter.searchQuery);
    }
  }, [navigationFilter]);

  // Selection state for batch actions
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Edit Sale State
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editArea, setEditArea] = useState("");
  const [editResponsible, setEditResponsible] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Add Historical / Manual Sale State
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [newSaleCustomerName, setNewSaleCustomerName] = useState("");
  const [newSaleCustomerId, setNewSaleCustomerId] = useState("");
  const [newSaleCompanyId, setNewSaleCompanyId] = useState<CompanyId>(
    activeCompanyId === "all" ? (companies[0]?.id || "company-1") : (activeCompanyId as CompanyId)
  );
  const [newSaleAmount, setNewSaleAmount] = useState<number>(0);
  const [newSaleDate, setNewSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [newSaleArea, setNewSaleArea] = useState("");
  const [newSaleResponsible, setNewSaleResponsible] = useState(currentUser?.name || "");
  const [newSaleNotes, setNewSaleNotes] = useState("");

  // Audit Log Modal State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditFilterType, setAuditFilterType] = useState<string>("all");

  const handleStartEdit = (sale: Sale) => {
    setSaleToEdit(sale);
    setEditDate(sale.date);
    setEditAmount(sale.amount);
    setEditArea(sale.area || "");
    setEditResponsible(sale.responsible || sale.salesPerson || "");
    setEditNotes(sale.notes || "");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToEdit) return;
    if (editAmount <= 0) {
      showToast("برجاء إدخال مبلغ صحيح للصفقة", "warning");
      return;
    }
    if (!editDate) {
      showToast("برجاء تحديد تاريخ الحدث التجاري", "warning");
      return;
    }
    updateSale(saleToEdit.id, {
      date: editDate,
      amount: editAmount,
      area: editArea,
      responsible: editResponsible,
      salesPerson: editResponsible,
      notes: editNotes,
    });
    setSaleToEdit(null);
  };

  const handleCreateSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaleCustomerName.trim()) {
      showToast("برجاء كتابة أو اختيار اسم العميل", "warning");
      return;
    }
    if (newSaleAmount <= 0) {
      showToast("برجاء إدخال قيمة صفقة صحيحة", "warning");
      return;
    }
    if (!newSaleDate) {
      showToast("برجاء اختيار تاريخ الحدث التجاري", "warning");
      return;
    }

    addSale({
      companyId: newSaleCompanyId,
      customerId: newSaleCustomerId || undefined,
      customerName: newSaleCustomerName.trim(),
      amount: newSaleAmount,
      date: newSaleDate,
      area: newSaleArea || undefined,
      responsible: newSaleResponsible || currentUser?.name,
      salesPerson: newSaleResponsible || currentUser?.name,
      notes: newSaleNotes || "صفقة بيع تاريخية / يدوية مسجلة بالنظام",
    });

    setShowAddSaleModal(false);
    setNewSaleCustomerName("");
    setNewSaleCustomerId("");
    setNewSaleAmount(0);
    setNewSaleNotes("");
  };

  // Extract unique areas
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    filteredSales.forEach((s) => {
      if (s.area && s.area !== "غير محدد") set.add(s.area);
    });
    return Array.from(set).sort();
  }, [filteredSales]);

  // Extract unique years
  const uniqueYears = useMemo(() => {
    const set = new Set<string>();
    filteredSales.forEach((s) => {
      if (s.date && s.date.length >= 4) set.add(s.date.slice(0, 4));
    });
    return Array.from(set).sort().reverse();
  }, [filteredSales]);

  const filtered = useMemo(() => {
    return filteredSales.filter((s) => {
      const matchSearch =
        !searchQuery.trim() ||
        s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.area && s.area.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchArea = areaFilter === "all" || s.area === areaFilter;
      const matchYear =
        yearFilter === "all" || (s.date && s.date.startsWith(yearFilter));
      const matchMonth =
        monthFilter === "all" || (s.date && s.date.startsWith(monthFilter));
      const matchResponsible =
        responsibleFilter === "all" || s.salesPerson === responsibleFilter;
      const matchExactDate = !exactDateFilter || s.date === exactDateFilter;

      return matchSearch && matchArea && matchYear && matchMonth && matchResponsible && matchExactDate;
    });
  }, [filteredSales, searchQuery, areaFilter, yearFilter, monthFilter, responsibleFilter, exactDateFilter]);

  const totalFilteredAmount = useMemo(() => {
    return filtered.reduce((acc, s) => acc + s.amount, 0);
  }, [filtered]);

  const getCompany = (compId: string) => companies.find((c) => c.id === compId);

  const toggleSelectAll = () => {
    if (selectedSaleIds.length === filtered.length && filtered.length > 0) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(filtered.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedSaleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    batchDeleteSales(selectedSaleIds);
    setSelectedSaleIds([]);
  };

  const handleExportSelected = () => {
    const selected = filteredSales.filter((s) => selectedSaleIds.includes(s.id));
    exportToCSV(
      "sales_export",
      [
        { header: "العميل", key: "customerName" },
        { header: "المبلغ (ج.م)", key: "amount" },
        { header: "التاريخ", key: "date" },
        { header: "المنطقة", key: "area" },
        {
          header: "الشركة",
          key: (item) => getCompany(item.companyId)?.name || item.companyId,
        },
        { header: "ملاحظات", key: "notes" },
      ],
      selected
    );
    showToast(`تم تصدير ${selected.length} صفقة بيع بنجاح إلى ملف Excel/CSV`, "success");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[#111111] text-[#C8A75A]">
              <DollarSign className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
                سجل المبيعات والصفقات المحققة
              </h1>
              <p className="text-xs sm:text-sm text-[#6B7280]">
                توثيق جميع العقود المبرمة وقيم المبيعات المحققة حسب الشركات والمناطق والتواريخ
              </p>
            </div>
          </div>
        </div>

        {/* Quick Total Badges & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddSaleModal(true)}
            className="px-3.5 py-2 bg-[#111111] hover:bg-black text-[#C8A75A] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل صفقة بيع تاريخية / يدوية</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setShowAuditModal(true)}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="عرض سجل التدقيق وتاريخ تعديل التواريخ والبيانات"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>سجل التدقيق ({auditLogs.length})</span>
            </button>
          )}

          <div className="bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
            <span className="text-[#6B7280]">مبيعات اليوم:</span>
            <span className="font-mono font-black text-[#22C55E]">
              {(todaySalesTotal || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
            <span className="text-[#6B7280]">مبيعات الشهر:</span>
            <span className="font-mono font-black text-[#111111]">
              {(monthlySalesTotal || 0).toLocaleString()} ج.م
            </span>
          </div>

          {isOwner && filteredSales.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="تصفير وحذف جميع سجلات المبيعات"
            >
              <Trash2 className="w-4 h-4" />
              <span>تصفير المبيعات</span>
            </button>
          )}
        </div>
      </div>

      {/* Drill-down active filter banner */}
      {(exactDateFilter || monthFilter !== "all" || areaFilter !== "all" || responsibleFilter !== "all") && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-900 font-bold flex-wrap">
            <Calendar className="w-4 h-4 text-[#C8A75A]" />
            <span>عرض نتائج مصفاة بالتحليل التفاعلي:</span>
            {exactDateFilter && (
              <span className="bg-amber-200/70 px-2 py-0.5 rounded-md font-mono">
                يوم: {exactDateFilter}
              </span>
            )}
            {monthFilter !== "all" && (
              <span className="bg-amber-200/70 px-2 py-0.5 rounded-md font-mono">
                شهر: {monthFilter}
              </span>
            )}
            {areaFilter !== "all" && (
              <span className="bg-amber-200/70 px-2 py-0.5 rounded-md">
                منطقة: {areaFilter}
              </span>
            )}
            {responsibleFilter !== "all" && (
              <span className="bg-amber-200/70 px-2 py-0.5 rounded-md">
                مسؤول: {responsibleFilter}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setExactDateFilter("");
              setMonthFilter("all");
              setAreaFilter("all");
              setResponsibleFilter("all");
              clearNavigationFilter();
            }}
            className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>إلغاء التصفية التفاعلية</span>
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم العميل أو المنطقة..."
              className="w-full pr-9 pl-4 py-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl text-xs focus:bg-white focus:border-[#C8A75A] outline-hidden text-[#111111]"
            />
          </div>

          {/* Area Filter */}
          <div className="w-full md:w-auto">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full md:w-auto p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl text-xs font-bold text-[#111111] cursor-pointer"
            >
              <option value="all">📍 كل المناطق ({filteredSales.length})</option>
              {uniqueAreas.map((a) => (
                <option key={a} value={a}>
                  📍 {a}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="w-full md:w-auto">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full md:w-auto p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl text-xs font-bold text-[#111111] cursor-pointer"
            >
              <option value="all">📅 كل السنوات</option>
              {uniqueYears.map((yr) => (
                <option key={yr} value={yr}>
                  سنة {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#6B7280] pt-2 border-t border-[#F0F0EE]">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 font-bold text-[#111111] hover:text-[#C8A75A] cursor-pointer"
            >
              {selectedSaleIds.length === filtered.length && filtered.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
              ) : (
                <Square className="w-4 h-4 text-[#9CA3AF]" />
              )}
              <span>تحديد الكل ({filtered.length})</span>
            </button>
            <span className="text-[#9CA3AF]">|</span>
            <span>
              عرض <strong>{filtered.length}</strong> صفقة بيع
            </span>
          </div>
          <span>
            القيمة الإجمالية:{" "}
            <strong className="text-[#111111] font-mono font-black">
              {totalFilteredAmount.toLocaleString()} ج.م
            </strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EAEAEA] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8F8F5] text-[#6B7280] font-bold border-b border-[#EAEAEA]">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="cursor-pointer text-[#9CA3AF] hover:text-[#111111]"
                  >
                    {selectedSaleIds.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">العميل</th>
                <th className="p-3.5">الشركة</th>
                <th className="p-3.5">المبلغ</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">المنطقة</th>
                <th className="p-3.5">ملاحظات</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {filtered.map((s) => {
                const isSelected = selectedSaleIds.includes(s.id);
                const comp = getCompany(s.companyId);

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-[#F8F8F5]/80 transition-colors ${
                      isSelected ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(s.id)}
                        className="accent-[#C8A75A] cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5 font-bold text-[#111111]">
                      {s.customerName}
                    </td>
                    <td className="p-3.5">
                      {comp && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                          {comp.name}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-black text-[#22C55E]">
                      {s.amount.toLocaleString()} ج.م
                    </td>
                    <td className="p-3.5 font-mono text-[#6B7280]">
                      {s.date}
                    </td>
                    <td className="p-3.5 text-[#6B7280]">{s.area || "-"}</td>
                    <td className="p-3.5 text-[#6B7280]">{s.notes || "-"}</td>
                    <td className="p-3.5 text-center flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleStartEdit(s)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="تعديل بيانات وتاريخ الصفقة"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSaleToDelete(s)}
                        className="p-1.5 text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف الصفقة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#EAEAEA] p-12 text-center text-[#6B7280] space-y-2">
          <DollarSign className="w-8 h-8 text-[#9CA3AF] mx-auto" />
          <h3 className="font-bold text-sm text-[#111111]">لا توجد صفقات مبيعات مطابقة</h3>
          <p className="text-xs">جرب تغيير الفلاتر أو البحث لتظهر النتائج.</p>
        </div>
      )}

      {/* Reusable Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedSaleIds.length}
        totalCount={filtered.length}
        isAllSelected={selectedSaleIds.length === filtered.length && filtered.length > 0}
        onSelectAll={toggleSelectAll}
        onClearSelection={() => setSelectedSaleIds([])}
        entityName="صفقة مبيعات"
        onDelete={handleBulkDelete}
        onExport={handleExportSelected}
      />

      {/* Delete Single Sale Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in" dir="rtl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#111111]">تأكيد حذف الصفقة</h3>
              <p className="text-xs text-[#6B7280]">
                هل أنت متأكد من حذف صفقة العميل <strong>{saleToDelete.customerName}</strong> بقيمة {saleToDelete.amount.toLocaleString()} ج.م؟
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSaleToDelete(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:bg-[#F8F8F5] cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={() => {
                  deleteSale(saleToDelete.id);
                  setSaleToDelete(null);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Sales Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-300 text-center space-y-4 animate-in fade-in" dir="rtl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-rose-600">تحذير: تصفير سجل المبيعات بالكامل</h3>
              <p className="text-xs text-[#6B7280]">
                هذا الإجراء سيقوم بحذف جميع سجلات المبيعات ({filteredSales.length} صفقة) ولا يمكن التراجع عنه. هل أنت متأكد؟
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:bg-[#F8F8F5] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  clearAllSales();
                  setShowClearAllModal(false);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                نعم، تصفير السجل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SALE MODAL (Historical event_date support & audit) */}
      {saleToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#EAEAEA] overflow-hidden animate-in fade-in" dir="rtl">
            <div className="p-4 bg-[#111111] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#C8A75A]" />
                <h3 className="font-bold text-sm">تعديل صفقة البيع للعميل {saleToEdit.customerName}</h3>
              </div>
              <button
                onClick={() => setSaleToEdit(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div className="bg-[#F8F8F5] p-3 rounded-xl border border-[#EAEAEA] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">اسم العميل:</span>
                  <strong className="text-[#111111]">{saleToEdit.customerName}</strong>
                </div>
                {saleToEdit.updatedAt && (
                  <div className="flex justify-between text-[11px] text-[#6B7280] pt-1 border-t border-[#EAEAEA]">
                    <span>آخر تعديل بالنظام:</span>
                    <span className="font-mono">{new Date(saleToEdit.updatedAt).toLocaleString("ar-EG")}</span>
                  </div>
                )}
              </div>

              {/* Event Date (Business Date) */}
              <div className="space-y-1">
                <label className="font-bold text-[#111111] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#C8A75A]" />
                  <span>تاريخ الحدث التجاري (تاريخ الصفقة الفعلي) *:</span>
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold font-mono text-[#111111]"
                />
                <p className="text-[10px] text-[#6B7280]">
                  هذا هو التاريخ الذي تعتمد عليه كافة التحليلات والتقارير الشهرية والسنوية.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="font-bold text-[#111111]">قيمة الصفقة (ج.م) *:</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold font-mono text-[#22C55E] text-sm"
                />
              </div>

              {/* Area & Responsible */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#111111]">المنطقة:</label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#111111]">مسؤول المبيعات:</label>
                  <input
                    type="text"
                    value={editResponsible}
                    onChange={(e) => setEditResponsible(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-[#111111]">ملاحظات:</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleToEdit(null)}
                  className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#F8F8F5] rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-[#C8A75A] rounded-xl shadow-xs cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD HISTORICAL / MANUAL SALE MODAL */}
      {showAddSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#EAEAEA] overflow-hidden animate-in fade-in" dir="rtl">
            <div className="p-4 bg-[#111111] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#C8A75A]" />
                <h3 className="font-bold text-sm">تسجيل صفقة بيع (تاريخية / يدوية)</h3>
              </div>
              <button
                onClick={() => setShowAddSaleModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="p-5 space-y-3.5 text-xs">
              {/* Customer selection or name */}
              <div className="space-y-1">
                <label className="font-bold text-[#111111]">العميل *:</label>
                <div className="space-y-1.5">
                  <select
                    value={newSaleCustomerId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setNewSaleCustomerId(id);
                      const found = customers.find((c) => c.id === id);
                      if (found) {
                        setNewSaleCustomerName(found.name);
                        setNewSaleCompanyId(found.companyId);
                        if (found.area) setNewSaleArea(found.area);
                      }
                    }}
                    className="w-full p-2 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold cursor-pointer"
                  >
                    <option value="">-- اختر من قائمة العملاء المسجلين (أو اكتب أدناه) --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="أو اكتب اسم العميل مباشرة هنا..."
                    value={newSaleCustomerName}
                    onChange={(e) => setNewSaleCustomerName(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold text-[#111111]"
                  />
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1">
                <label className="font-bold text-[#111111]">الشركة التابعة لها الصفقة *:</label>
                <select
                  value={newSaleCompanyId}
                  onChange={(e) => setNewSaleCompanyId(e.target.value as CompanyId)}
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#111111] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#C8A75A]" />
                    <span>تاريخ الحدث التجاري *:</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newSaleDate}
                    onChange={(e) => setNewSaleDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold font-mono text-[#111111]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#111111]">قيمة الصفقة (ج.م) *:</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newSaleAmount || ""}
                    onChange={(e) => setNewSaleAmount(Number(e.target.value))}
                    placeholder="مثال: 50000"
                    className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl font-bold font-mono text-[#22C55E]"
                  />
                </div>
              </div>

              {/* Area & Responsible */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#111111]">المنطقة:</label>
                  <input
                    type="text"
                    value={newSaleArea}
                    onChange={(e) => setNewSaleArea(e.target.value)}
                    placeholder="مثال: التجمع الخامس"
                    className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#111111]">مسؤول المبيعات:</label>
                  <input
                    type="text"
                    value={newSaleResponsible}
                    onChange={(e) => setNewSaleResponsible(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-[#111111]">ملاحظات:</label>
                <textarea
                  rows={2}
                  value={newSaleNotes}
                  onChange={(e) => setNewSaleNotes(e.target.value)}
                  placeholder="مواصفات الأعمال، شروط خاصة، رقم تعاقد سابق..."
                  className="w-full p-2.5 bg-[#F8F8F5] border border-[#EAEAEA] rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSaleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#F8F8F5] rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-[#C8A75A] rounded-xl shadow-xs cursor-pointer"
                >
                  تسجيل الصفقة بنجاح
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-[#EAEAEA] flex flex-col overflow-hidden animate-in fade-in" dir="rtl">
            <div className="p-4 bg-[#111111] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#C8A75A]" />
                <div>
                  <h3 className="font-bold text-sm">سجل التدقيق والتعديلات الإدارية (Audit Log)</h3>
                  <p className="text-[11px] text-slate-400">
                    توثيق كامل لكافة تعديلات التواريخ والبيانات الحساسة وحذف السجلات
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-[#EAEAEA] bg-[#F8F8F5] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-[#6B7280]">فلترة:</span>
                <select
                  value={auditFilterType}
                  onChange={(e) => setAuditFilterType(e.target.value)}
                  className="p-1.5 bg-white border border-[#EAEAEA] rounded-lg text-xs font-bold cursor-pointer"
                >
                  <option value="all">كل العمليات ({auditLogs.length})</option>
                  <option value="edit_date">تعديل التواريخ فقط</option>
                  <option value="edit_amount">تعديل القيم المالية فقط</option>
                  <option value="delete">عمليات الحذف والتنظيف</option>
                </select>
              </div>
              <span className="text-[11px] text-[#6B7280] font-mono">
                إجمالي السجلات: {auditLogs.length}
              </span>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-[#6B7280] space-y-2">
                  <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold">سجل التدقيق فارغ حالياً</p>
                  <p className="text-[11px]">سيتم تسجيل أي تعديل على التواريخ أو القيم تلقائياً هنا.</p>
                </div>
              ) : (
                auditLogs
                  .filter((log) => {
                    if (auditFilterType === "edit_date") return log.actionType === "edit_date";
                    if (auditFilterType === "edit_amount") return log.actionType === "edit_amount" || log.actionType === "edit_value";
                    if (auditFilterType === "delete") return log.actionType.includes("delete") || log.actionType.includes("cleanup");
                    return true;
                  })
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-white rounded-xl border border-[#EAEAEA] hover:border-slate-300 transition-all space-y-1.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              log.actionType === "edit_date"
                                ? "bg-amber-100 text-amber-800"
                                : log.actionType === "edit_amount" || log.actionType === "edit_value"
                                ? "bg-emerald-100 text-emerald-800"
                                : log.actionType.includes("delete")
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {log.actionType === "edit_date"
                              ? "تعديل تاريخ"
                              : log.actionType === "edit_amount" || log.actionType === "edit_value"
                              ? "تعديل قيمة"
                              : log.actionType.includes("delete")
                              ? "حذف سجل"
                              : log.actionType}
                          </span>
                          <span className="font-bold text-[#111111]">
                            بواسطة: {log.userName || "المسؤول"} ({log.userRole || "Admin"})
                          </span>
                        </div>
                        <span className="text-[10px] text-[#6B7280] font-mono">
                          {new Date(log.timestamp).toLocaleString("ar-EG")}
                        </span>
                      </div>
                      <p className="text-[#111111] font-medium">{log.description}</p>
                      {(log.oldValue || log.newValue) && (
                        <div className="flex items-center gap-3 text-[11px] font-mono bg-[#F8F8F5] p-2 rounded-lg border border-[#EAEAEA]">
                          {log.oldValue && (
                            <span className="text-rose-600 line-through">
                              القيمة السابقة: {typeof log.oldValue === "object" ? JSON.stringify(log.oldValue) : String(log.oldValue)}
                            </span>
                          )}
                          {log.newValue && (
                            <span className="text-emerald-600 font-bold">
                              القيمة الجديدة: {typeof log.newValue === "object" ? JSON.stringify(log.newValue) : String(log.newValue)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="p-3 border-t border-[#EAEAEA] bg-[#F8F8F5] flex justify-end shrink-0">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 bg-[#111111] text-[#C8A75A] font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
