import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Quotation, QuoteStatus, CompanyId } from "../../types";
import { CreateQuotationModal } from "./CreateQuotationModal";
import { EditQuotationModal } from "./EditQuotationModal";
import {
  FileSpreadsheet,
  Plus,
  Printer,
  Eye,
  Building2,
  Trash2,
  MapPin,
  Edit2,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import { BulkActionBar, StatusOption } from "../common/BulkActionBar";
import { SmartFilterBar, FilterState } from "../common/SmartFilterBar";
import { exportToCSV } from "../../utils/exportUtils";

export const QuotationsView: React.FC = () => {
  const {
    filteredQuotations,
    companies,
    updateQuotationStatus,
    batchUpdateQuotations,
    deleteQuotation,
    batchDeleteQuotations,
    setSelectedQuotationForPrint,
    setSelectedCustomerIdFor360,
    navigationFilter,
    showToast,
  } = useApp();

  // Smart Filters State
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    companyId: navigationFilter?.companyId || "all",
    stage: "all",
    status: navigationFilter?.status || "all",
    area: "all",
    responsible: "all",
    source: "all",
    interestLevel: "all",
    priority: "all",
    datePreset: navigationFilter?.date ? "custom" : "all",
    startDate: navigationFilter?.date || "",
    endDate: navigationFilter?.date || "",
  });

  useEffect(() => {
    if (navigationFilter) {
      setFilters((prev) => ({
        ...prev,
        companyId: navigationFilter.companyId || prev.companyId,
        status: navigationFilter.status || prev.status,
        startDate: navigationFilter.date || prev.startDate,
        endDate: navigationFilter.date || prev.endDate,
        datePreset: navigationFilter.date ? "custom" : prev.datePreset,
      }));
    }
  }, [navigationFilter]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return filteredQuotations.filter((q) => {
      const matchesStatus = filters.status === "all" || q.status === filters.status;
      const matchesCompany = filters.companyId === "all" || q.companyId === filters.companyId;
      const matchesArea = filters.area === "all" || q.area === filters.area;

      const query = filters.search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        q.quoteNumber.toLowerCase().includes(query) ||
        q.customerName.toLowerCase().includes(query) ||
        q.customerPhone.includes(query) ||
        (q.area && q.area.toLowerCase().includes(query));

      // Date filtering
      let matchesDate = true;
      if (filters.datePreset === "today") {
        const today = new Date().toISOString().split("T")[0];
        matchesDate = q.date === today;
      } else if (filters.datePreset === "custom") {
        if (filters.startDate && q.date < filters.startDate) matchesDate = false;
        if (filters.endDate && q.date > filters.endDate) matchesDate = false;
      }

      return matchesStatus && matchesCompany && matchesArea && matchesSearch && matchesDate;
    });
  }, [filteredQuotations, filters]);

  const getCompany = (compId: CompanyId) => companies.find((c) => c.id === compId);

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((q) => q.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Operations
  const handleBulkDelete = () => {
    batchDeleteQuotations(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkStatusChange = (newStatus: string) => {
    batchUpdateQuotations(selectedIds, { status: newStatus as QuoteStatus });
    setSelectedIds([]);
    showToast(`تم تحديث حالة ${selectedIds.length} عرض سعر بنجاح`, "success");
  };

  const handleBulkCompanyChange = (newCompanyId: CompanyId) => {
    batchUpdateQuotations(selectedIds, { companyId: newCompanyId });
    setSelectedIds([]);
    showToast(`تم نقل ${selectedIds.length} عرض سعر إلى الشركة المحددة`, "success");
  };

  const handleExportSelected = () => {
    const selectedQuotes = filteredQuotations.filter((q) => selectedIds.includes(q.id));
    exportToCSV(
      "quotations_export",
      [
        { header: "رقم العرض", key: "quoteNumber" },
        { header: "اسم العميل", key: "customerName" },
        { header: "رقم الهاتف", key: "customerPhone" },
        { header: "المنطقة", key: "area" },
        { header: "التاريخ", key: "date" },
        { header: "صالح حتى", key: "expiryDate" },
        { header: "الحالة", key: "status" },
        { header: "إجمالي القيمة (ج.م)", key: "totalAmount" },
        {
          header: "الشركة",
          key: (item) => getCompany(item.companyId)?.name || item.companyId,
        },
      ],
      selectedQuotes
    );
    showToast(`تم تصدير ${selectedQuotes.length} عرض سعر بنجاح إلى ملف Excel/CSV`, "success");
  };

  const statusOptions: StatusOption[] = [
    { value: "draft", label: "مسودة" },
    { value: "sent", label: "أُرسل للعميل" },
    { value: "negotiation", label: "في التفاوض" },
    { value: "accepted", label: "مقبول ✅" },
    { value: "rejected", label: "مرفوض" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-800">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
              عروض الأسعار (Quotations Engine)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            حساب مقاسات وتكاليف قطاعات الـ UPVC، إصدار عروض الأسعار الرسمية، والطباعة والإرسال عبر واتساب
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء عرض سعر جديد</span>
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
        showStageFilter={false}
        showStatusFilter={true}
        statusOptions={statusOptions}
        showResponsibleFilter={false}
        showSourceFilter={false}
        showInterestFilter={false}
        totalResultsCount={filtered.length}
      />

      {/* Selection Summary */}
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
          عرض <strong>{filtered.length}</strong> عرض سعر
        </span>
      </div>

      {/* Quotations List */}
      <div className="space-y-3">
        {filtered.map((q) => {
          const comp = getCompany(q.companyId);
          const isSelected = selectedIds.includes(q.id);

          return (
            <div
              key={q.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isSelected
                  ? "border-[#C8A75A] ring-1 ring-[#C8A75A] bg-amber-50/20"
                  : "border-[#EAEAEA]"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleSelectOne(q.id)}
                  className="text-[#9CA3AF] hover:text-[#C8A75A] cursor-pointer mt-1"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#C8A75A]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                      {q.quoteNumber}
                    </span>
                    {comp && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${comp.badgeBg} ${comp.badgeText}`}
                      >
                        {comp.name}
                      </span>
                    )}
                    {q.area && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        <span>{q.area}</span>
                      </span>
                    )}
                    <span 
    className="font-extrabold text-sm text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
    onClick={() => setSelectedCustomerIdFor360(q.customerId)}
  >
    {q.customerName}
  </span>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>تاريخ: {q.date}</span>
                    <span>صالح حتى: {q.expiryDate}</span>
                    <span>عدد الفتحات: {q.items.length}</span>
                  </div>
                </div>
              </div>

              {/* Status & Amount */}
              <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                <div className="text-left">
                  <div className="text-base font-black text-slate-900">
                    {(q.totalAmount || 0).toLocaleString()} <span className="text-xs text-slate-500 font-normal">ج.م</span>
                  </div>
                  <select
                    value={q.status}
                    onChange={(e) => updateQuotationStatus(q.id, e.target.value as QuoteStatus)}
                    className="text-[11px] font-bold mt-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 cursor-pointer"
                  >
                    <option value="draft">مسودة</option>
                    <option value="sent">أُرسل للعميل</option>
                    <option value="negotiation">في التفاوض</option>
                    <option value="accepted">مقبول ✅</option>
                    <option value="rejected">مرفوض</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingQuotation(q)}
                    className="px-3 py-1.5 bg-[#F8F8F5] hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button
                    onClick={() => setSelectedQuotationForPrint(q)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة</span>
                  </button>

                  <button
                    onClick={() => setSelectedCustomerIdFor360(q.customerId)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs cursor-pointer"
                    title="ملف العميل"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setSingleDeleteId(q.id)}
                    title="حذف عرض السعر"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            لا توجد عروض أسعار مطابقة لخيارات البحث أو الفلاتر.
          </div>
        )}
      </div>

      {/* CREATE QUOTATION MODAL */}
      {showCreateModal && (
        <CreateQuotationModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* EDIT QUOTATION MODAL */}
      {editingQuotation && (
        <EditQuotationModal 
          quotation={editingQuotation} 
          onClose={() => setEditingQuotation(null)} 
        />
      )}

      {/* Reusable Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        totalCount={filtered.length}
        isAllSelected={selectedIds.length === filtered.length && filtered.length > 0}
        onSelectAll={handleSelectAll}
        onClearSelection={() => setSelectedIds([])}
        entityName="عرض سعر"
        onDelete={handleBulkDelete}
        statusOptions={statusOptions}
        onStatusChange={handleBulkStatusChange}
        onCompanyChange={handleBulkCompanyChange}
        onExport={handleExportSelected}
      />

      {/* Single Delete Modal */}
      {singleDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 text-center space-y-4 animate-in fade-in" dir="rtl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#111111]">حذف عرض السعر</h3>
              <p className="text-xs text-[#6B7280]">هل أنت متأكد من رغبتك في حذف هذا العرض نهائياً؟</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSingleDeleteId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:bg-[#F8F8F5] cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={() => {
                  deleteQuotation(singleDeleteId);
                  setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteId));
                  setSingleDeleteId(null);
                }}
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
