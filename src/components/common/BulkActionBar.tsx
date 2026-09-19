import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { CompanyId, PriorityLevel } from "../../types";
import {
  Trash2,
  Building2,
  UserCheck,
  CalendarPlus,
  FileSpreadsheet,
  CheckCircle,
  X,
  AlertTriangle,
  ChevronDown,
  Layers,
  ShieldAlert,
} from "lucide-react";

export interface StatusOption {
  value: string;
  label: string;
  badgeClass?: string;
}

export interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  isAllSelected: boolean;
  entityName?: string;

  // Actions
  onDelete?: () => void;
  statusOptions?: StatusOption[];
  onStatusChange?: (newStatus: string) => void;
  onCompanyChange?: (newCompanyId: CompanyId) => void;
  onAssignResponsible?: (salesperson: string) => void;
  onDateChange?: (newDate: string) => void;
  dateLabel?: string;
  onAddFollowUp?: (followUpData: {
    dueDate: string;
    title: string;
    priority: PriorityLevel;
    notes?: string;
  }) => void;
  onExport?: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  isAllSelected,
  entityName = "عنصر",
  onDelete,
  statusOptions,
  onStatusChange,
  onCompanyChange,
  onAssignResponsible,
  onDateChange,
  dateLabel = "تحديد التاريخ",
  onAddFollowUp,
  onExport,
}) => {
  const { currentUser, currentCompanyRole, companies, users, showToast } = useApp();

  const isOwner =
    currentUser?.role === "owner" ||
    currentCompanyRole === "owner" ||
    currentUser?.role === "super_admin" ||
    currentCompanyRole === "super_admin";

  // Modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // Form selections
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<CompanyId>("pvc_nesta");
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [followUpTitle, setFollowUpTitle] = useState("متابعة مجمعة");
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().split("T")[0]);
  const [followUpPriority, setFollowUpPriority] = useState<PriorityLevel>("medium");
  const [followUpNotes, setFollowUpNotes] = useState("");

  if (selectedCount === 0) return null;

  const handleSensitiveActionCheck = (actionCallback: () => void, actionName: string) => {
    if (!isOwner) {
      showToast(
        `عذراً، عملية "${actionName}" المجمعة تتطلب صلاحية المالك (Owner) أو المشرف العام (Super Admin). دورك الحالي: ${currentCompanyRole}`,
        "warning"
      );
      return;
    }
    actionCallback();
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete();
      setShowDeleteModal(false);
      onClearSelection();
    }
  };

  const handleConfirmStatus = () => {
    if (onStatusChange && selectedStatus) {
      onStatusChange(selectedStatus);
      setShowStatusModal(false);
      onClearSelection();
    }
  };

  const handleConfirmCompany = () => {
    if (onCompanyChange && selectedCompanyId) {
      onCompanyChange(selectedCompanyId);
      setShowCompanyModal(false);
      onClearSelection();
    }
  };

  const handleConfirmAssign = () => {
    if (onAssignResponsible && selectedSalesperson) {
      onAssignResponsible(selectedSalesperson);
      setShowAssignModal(false);
      onClearSelection();
    }
  };

  const handleConfirmDate = () => {
    if (onDateChange && selectedDate) {
      onDateChange(selectedDate);
      setShowDateModal(false);
      onClearSelection();
    }
  };

  const handleConfirmFollowUp = () => {
    if (onAddFollowUp) {
      onAddFollowUp({
        title: followUpTitle,
        dueDate: followUpDate,
        priority: followUpPriority,
        notes: followUpNotes,
      });
      setShowFollowUpModal(false);
      onClearSelection();
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-11/12 max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-200">
        <div className="bg-[#111111] text-[#EDEDED] px-4 sm:px-6 py-3.5 rounded-2xl shadow-2xl border border-[#292B2E] flex flex-wrap items-center justify-between gap-3">
          {/* Selected Count & Select All */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#202225] px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-[#C8A75A] border border-[#292B2E]">
              <Layers className="w-4 h-4" />
              <span>
                {selectedCount} من {totalCount} {entityName} محدد
              </span>
            </div>

            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-[#A1A1AA] hover:text-[#EDEDED] underline font-medium cursor-pointer transition-colors"
            >
              {isAllSelected ? "إلغاء تحديد الكل" : `تحديد الكل (${totalCount})`}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Change */}
            {statusOptions && statusOptions.length > 0 && onStatusChange && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus(statusOptions[0]?.value || "");
                  setShowStatusModal(true);
                }}
                className="px-3 py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>تغيير الحالة</span>
              </button>
            )}

            {/* Move to Company (Owner only) */}
            {onCompanyChange && (
              <button
                type="button"
                onClick={() =>
                  handleSensitiveActionCheck(() => setShowCompanyModal(true), "نقل السجلات لشركة أخرى")
                }
                className={`px-3 py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isOwner ? "opacity-75" : ""
                }`}
                title={!isOwner ? "مخصص للمالك (Owner) فقط" : ""}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>نقل للشركة</span>
                {!isOwner && <ShieldAlert className="w-3 h-3 text-amber-400" />}
              </button>
            )}

            {/* Assign Responsible */}
            {onAssignResponsible && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSalesperson(users[0]?.name || "");
                  setShowAssignModal(true);
                }}
                className="px-3 py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>تعيين مسؤول</span>
              </button>
            )}

            {/* Date Selection */}
            {onDateChange && (
              <button
                type="button"
                onClick={() => setShowDateModal(true)}
                className="px-3 py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>{dateLabel}</span>
              </button>
            )}

            {/* Add Follow-up */}
            {onAddFollowUp && (
              <button
                type="button"
                onClick={() => setShowFollowUpModal(true)}
                className="px-3 py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-[#C8A75A]" />
                <span>جدولة متابعة</span>
              </button>
            )}

            {/* Export */}
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="px-3 py-1.5 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] border border-[#292B2E] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                <span>تصدير ({selectedCount})</span>
              </button>
            )}

            {/* Delete (Owner only) */}
            {onDelete && (
              <button
                type="button"
                onClick={() =>
                  handleSensitiveActionCheck(() => setShowDeleteModal(true), "الحذف الجماعي")
                }
                className={`px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isOwner ? "opacity-75" : ""
                }`}
                title={!isOwner ? "مخصص للمالك (Owner) فقط" : ""}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف ({selectedCount})</span>
                {!isOwner && <ShieldAlert className="w-3 h-3 text-amber-400" />}
              </button>
            )}

            {/* Clear Selection */}
            <button
              type="button"
              onClick={onClearSelection}
              className="p-1.5 text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg hover:bg-[#202225] transition-colors cursor-pointer mr-1"
              title="إلغاء التحديد"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18191B] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/30 space-y-4" dir="rtl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#EDEDED]">تأكيد الحذف المجمّع</h3>
                <p className="text-xs text-[#A1A1AA]">عملية حساسة ولا يمكن التراجع عنها</p>
              </div>
            </div>

            <p className="text-sm text-[#EDEDED] leading-relaxed">
              هل أنت متأكد من رغبتك في حذف{" "}
              <span className="font-bold text-rose-400 font-mono text-base">{selectedCount}</span>{" "}
              {entityName} بشكل نهائي من النظام؟
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>تم التحقق من صلاحيات المالك (Owner) للموافقة على هذه العملية.</span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#292B2E]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                نعم، احذف {selectedCount} {entityName}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && statusOptions && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18191B] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#292B2E] space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#EDEDED]">تغيير الحالة المجمّع</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA]">
              اختر الحالة الجديدة لتطبيقها على{" "}
              <span className="font-bold text-[#EDEDED]">{selectedCount}</span> {entityName}:
            </p>

            <div className="space-y-2">
              {statusOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedStatus === opt.value
                      ? "border-[#C8A75A] bg-[#C8A75A]/10 font-bold"
                      : "border-[#292B2E] bg-[#202225] hover:bg-[#292B2E]"
                  }`}
                >
                  <span className="text-xs text-[#EDEDED]">{opt.label}</span>
                  <input
                    type="radio"
                    name="bulkStatus"
                    value={opt.value}
                    checked={selectedStatus === opt.value}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="accent-[#C8A75A]"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#292B2E]">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-[#202225] text-[#EDEDED] text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmStatus}
                className="px-4 py-2 bg-[#C8A75A] hover:bg-[#d8b76a] text-[#111111] text-xs font-bold rounded-xl cursor-pointer"
              >
                تحديث الحالة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18191B] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#292B2E] space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#EDEDED]">نقل السجلات لشركة أخرى</h3>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="p-1 text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA]">
              سيتم نقل <span className="font-bold text-[#EDEDED]">{selectedCount}</span> {entityName} إلى الشركة المحددة مع الحفاظ على عزل البيانات:
            </p>

            <div className="space-y-2">
              {companies.map((comp) => (
                <label
                  key={comp.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedCompanyId === comp.id
                      ? "border-blue-500 bg-blue-500/10 font-bold"
                      : "border-[#292B2E] bg-[#202225] hover:bg-[#292B2E]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-[#EDEDED]">{comp.name}</span>
                  </div>
                  <input
                    type="radio"
                    name="bulkCompany"
                    value={comp.id}
                    checked={selectedCompanyId === comp.id}
                    onChange={(e) => setSelectedCompanyId(e.target.value as CompanyId)}
                    className="accent-blue-500"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#292B2E]">
              <button
                type="button"
                onClick={() => setShowCompanyModal(false)}
                className="px-4 py-2 bg-[#202225] text-[#EDEDED] text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmCompany}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                تأكيد النقل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Salesperson Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18191B] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#292B2E] space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#EDEDED]">تعيين مسؤول المبيعات</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA]">
              اختر المسؤول لتكليفه بـ{" "}
              <span className="font-bold text-[#EDEDED]">{selectedCount}</span> {entityName}:
            </p>

            <select
              value={selectedSalesperson}
              onChange={(e) => setSelectedSalesperson(e.target.value)}
              className="w-full p-3 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-medium text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#292B2E]">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-[#202225] text-[#EDEDED] text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                تعيين المسؤول
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Follow-up Schedule Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18191B] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#292B2E] space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#EDEDED]">جدولة متابعة مجمّعة</h3>
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="p-1 text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA]">
              سيتم إنشاء تذكير متابعة منفصل لكل عميل من الـ{" "}
              <span className="font-bold text-[#EDEDED]">{selectedCount}</span> المحددين:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">عنوان المتابعة</label>
                <input
                  type="text"
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                  placeholder="مثلاً: اتصال تذكيري بعرض السعر"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">تاريخ المتابعة</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] font-mono focus:border-[#C8A75A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] mb-1">الأولوية</label>
                  <select
                    value={followUpPriority}
                    onChange={(e) => setFollowUpPriority(e.target.value as PriorityLevel)}
                    className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] focus:border-[#C8A75A] focus:outline-none"
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية 🔥</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] resize-none focus:border-[#C8A75A] focus:outline-none"
                  placeholder="ملاحظات تفصيلية للمتابعة..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#292B2E]">
              <button
                type="button"
                onClick={() => setShowFollowUpModal(false)}
                className="px-4 py-2 bg-[#202225] text-[#EDEDED] text-xs font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmFollowUp}
                className="px-4 py-2 bg-[#C8A75A] hover:bg-[#d8b76a] text-[#111111] text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                جدولة {selectedCount} متابعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Update Modal */}
      {showDateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18191B] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#292B2E] space-y-4" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292B2E]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <CalendarPlus className="w-5 h-5" />
                </span>
                <h3 className="font-black text-sm text-[#EDEDED]">{dateLabel}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDateModal(false)}
                className="text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA]">
              اختر التاريخ الذي ترغب في تعيينه لـ <strong className="text-[#EDEDED]">{selectedCount}</strong> {entityName} محدد:
            </p>

            <div>
              <label className="block text-xs font-bold text-[#A1A1AA] mb-1">التاريخ المحدد</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-bold text-[#EDEDED] outline-hidden focus:border-[#C8A75A]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#292B2E]">
              <button
                type="button"
                onClick={() => setShowDateModal(false)}
                className="px-4 py-2 bg-[#202225] text-[#EDEDED] text-xs font-bold rounded-xl cursor-pointer hover:bg-[#292B2E]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDate}
                className="px-4 py-2 bg-[#C8A75A] text-[#111111] hover:bg-[#d8b76a] text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                تطبيق التاريخ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
