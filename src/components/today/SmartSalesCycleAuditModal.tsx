import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  runSalesCycleAudit,
  executeAndVerifySalesCycleRepairs,
  SalesCycleIssue,
  SalesCycleClassification,
} from "../../utils/salesCycleIntegrityEngine";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Building2,
  RefreshCw,
  X,
  ShieldCheck,
  CheckSquare,
  Square,
  Lock,
  ArrowRight,
  Zap,
  Info,
  Check,
  AlertCircle,
  FileText,
  Trash2,
  EyeOff,
} from "lucide-react";

interface SmartSalesCycleAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartSalesCycleAuditModal: React.FC<SmartSalesCycleAuditModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    customers,
    companies,
    contracts,
    quotations,
    opportunities,
    sales,
    inquiries,
    followUps,
    inspections,
    payments,
    activeCompanyId,
    addSale,
    updateCustomer,
    updateContract,
    addOpportunity,
    updateOpportunity,
    setSelectedCustomerIdFor360,
    showToast,
    addAuditLog,
    addCustomer,
    updateInquiry,
    excludeRecord,
    deleteCustomer,
    deleteQuotation,
    deleteContract,
    deleteOpportunity,
    deleteInquiry,
    completeFollowUp,
    rescheduleFollowUp,
    updateInspection,
    canDeleteRecords,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"all" | "safe" | "review" | "conflicts">("safe");
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionReport, setExecutionReport] = useState<{
    executedCount: number;
    verifiedCount: number;
    failedCount: number;
  } | null>(null);

  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});
  const [showConfirmExclude, setShowConfirmExclude] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  // Compute live sales cycle audit freshly against live snapshot
  const auditSummary = useMemo(() => {
    return runSalesCycleAudit(
      {
        customers,
        companies,
        contracts,
        quotations,
        opportunities,
        sales,
        inquiries,
        followUps,
        inspections,
        payments,
      },
      activeCompanyId
    );
  }, [
    customers,
    companies,
    contracts,
    quotations,
    opportunities,
    sales,
    inquiries,
    followUps,
    inspections,
    payments,
    activeCompanyId,
  ]);

  // Filter issues according to active tab
  const filteredIssues = useMemo(() => {
    if (activeTab === "safe") {
      return auditSummary.issues.filter((i) => i.classification === "SAFE_TO_REPAIR" || i.classification === "NEEDS_LINK");
    }
    if (activeTab === "review") {
      return auditSummary.issues.filter((i) => i.classification === "REVIEW_REQUIRED");
    }
    if (activeTab === "conflicts") {
      return auditSummary.issues.filter((i) => i.classification === "CONFLICT" || i.classification === "DUPLICATE");
    }
    return auditSummary.issues;
  }, [auditSummary.issues, activeTab]);

  // Handle select/deselect all safe items
  const handleSelectAllSafe = () => {
    const safeIds = new Set<string>();
    auditSummary.issues.forEach((issue) => {
      if (issue.canAutoExecute) {
        safeIds.add(issue.id);
      }
    });
    setSelectedIssueIds(safeIds);
  };

  const handleDeselectAll = () => {
    setSelectedIssueIds(new Set());
  };

  const toggleIssueSelection = (issue: SalesCycleIssue) => {
    if (!issue.canAutoExecute) return; // Strictly prevent selecting non-safe items
    const newSet = new Set(selectedIssueIds);
    if (newSet.has(issue.id)) {
      newSet.delete(issue.id);
    } else {
      newSet.add(issue.id);
    }
    setSelectedIssueIds(newSet);
  };

  // Execute selected repairs
  const handleExecuteSelectedRepairs = async () => {
    if (selectedIssueIds.size === 0) {
      showToast("يرجى تحديد عنصر واحد على الأقل للإصلاح والتحقق", "warning");
      return;
    }

    setIsExecuting(true);
    setExecutionReport(null);

    try {
      const issuesToExecute = auditSummary.issues.filter((i) => selectedIssueIds.has(i.id));

      const result = await executeAndVerifySalesCycleRepairs(issuesToExecute, {
        addSale,
        updateCustomer,
        updateContract,
        addOpportunity,
        updateOpportunity,
        addCustomer,
        updateInquiry,
        addAuditLog,
        showToast,
      });

      setExecutionReport({
        executedCount: result.executedCount,
        verifiedCount: result.verifiedCount,
        failedCount: result.failedCount,
      });

      setSelectedIssueIds(new Set());
      showToast(
        `اكتمل التنفيذ والتحقق: تم إصلاح ${result.verifiedCount} عنصر معتمد بنجاح 🚀`,
        "success"
      );
    } catch (err: any) {
      console.error("Error executing repairs:", err);
      showToast("حدث خطأ أثناء تنفيذ الإصلاحات", "error");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleInputChange = (issueId: string, value: string) => {
    setInlineInputs(prev => ({ ...prev, [issueId]: value }));
  };

  const handleManualFix = async (issue: SalesCycleIssue) => {
    const inputVal = inlineInputs[issue.id];
    
    if (issue.id.startsWith("opp_no_val_")) {
      if (!inputVal || Number(inputVal) <= 0) {
        showToast("يرجى إدخال قيمة صحيحة أكبر من الصفر", "warning");
        return;
      }
      updateOpportunity(issue.entityId, { expectedValue: Number(inputVal) });
      showToast("تم تحديث القيمة المالية للفرصة بنجاح ✅", "success");
    } 
    else if (issue.id.startsWith("opp_lost_no_reason_")) {
      if (!inputVal) {
        showToast("يرجى تحديد أو إدخال سبب الفقدان", "warning");
        return;
      }
      updateOpportunity(issue.entityId, { lossReason: inputVal });
      showToast("تم تسجيل سبب فقدان الفرصة بنجاح ✅", "success");
    }
    else if (issue.id.startsWith("follow_overdue_")) {
      if (!inputVal) {
        showToast("يرجى اختيار تاريخ إعادة الجدولة الجديد", "warning");
        return;
      }
      rescheduleFollowUp(issue.entityId, inputVal, "إعادة جدولة من لوحة فحص الدورة البيعية");
      showToast("تم تأجيل وجدولة المتابعة بنجاح ✅", "success");
    }
    else if (issue.id.startsWith("ins_incomplete_")) {
      const insDate = inlineInputs[`${issue.id}_date`] || new Date().toISOString().split("T")[0];
      const insStatus = inlineInputs[`${issue.id}_status`] || "completed";
      updateInspection(issue.entityId, { date: insDate, result: insStatus as any });
      showToast("تم استكمال وتحديث بيانات المعاينة بنجاح ✅", "success");
    }
  };

  const handleExcludeIssue = (issue: SalesCycleIssue, reason: string) => {
    excludeRecord(issue.entityType, issue.entityId, reason || "استبعاد يدوي من محرك فحص سلامة الدورة البيعية");
    setShowConfirmExclude(null);
  };

  const handleDeleteIssue = (issue: SalesCycleIssue) => {
    const type = issue.entityType.toLowerCase();
    if (type === "contract") {
      deleteContract(issue.entityId);
    } else if (type === "opportunity") {
      deleteOpportunity(issue.entityId);
    } else if (type === "quotation") {
      deleteQuotation(issue.entityId);
    } else if (type === "customer") {
      deleteCustomer(issue.entityId);
    } else if (type === "inquiry") {
      deleteInquiry(issue.entityId);
    }
    showToast(`تم حذف سجل ${issue.entityType} نهائياً بنجاح ✅`, "success");
    setShowConfirmDelete(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">
                  محرك سلامة وإصلاح الدورة البيعية — Integrity Engine
                </h2>
                <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-lg text-xs font-bold">
                  v1.0 Live Audit
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                فحص العلاقات والترابط بين (الاستفسارات → المعاينات → العروض → العقود → المبيعات → التحصيلات)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Counter Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-6 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
          <div className="p-3 bg-white rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              سليمة (Healthy)
            </span>
            <span className="text-xl font-black text-emerald-700 mt-1">
              {auditSummary.healthyCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-blue-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              آمنة للإصلاح
            </span>
            <span className="text-xl font-black text-blue-700 mt-1">
              {auditSummary.safeToRepairCount + auditSummary.needsLinkCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              مطلوب مراجعة
            </span>
            <span className="text-xl font-black text-amber-700 mt-1">
              {auditSummary.reviewRequiredCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              تعارضات وتكرار
            </span>
            <span className="text-xl font-black text-rose-700 mt-1">
              {auditSummary.conflictCount + auditSummary.duplicateCount}
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              إجمالي المفحوصات
            </span>
            <span className="text-xl font-black text-slate-800 mt-1">
              {auditSummary.scannedEntitiesCount}
            </span>
          </div>
        </div>

        {/* Action Controls & Tab Filters */}
        <div className="p-4 sm:px-6 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setActiveTab("safe")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "safe"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              آمنة للإصلاح والربط ({auditSummary.safeToRepairCount + auditSummary.needsLinkCount})
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "review"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              مطلوب مراجعة ({auditSummary.reviewRequiredCount})
            </button>
            <button
              onClick={() => setActiveTab("conflicts")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "conflicts"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              تعارضات وتكرار ({auditSummary.conflictCount + auditSummary.duplicateCount})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              كل المشاكل ({auditSummary.totalIssuesCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllSafe}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>تحديد الكل الآمن</span>
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء التحديد
            </button>
            <button
              onClick={handleExecuteSelectedRepairs}
              disabled={isExecuting || selectedIssueIds.size === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              {isExecuting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>تنفيذ الإصلاحات المحددة ({selectedIssueIds.size})</span>
            </button>
          </div>
        </div>

        {/* Execution Report Banner if present */}
        {executionReport && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                تم تنفيذ المجموع المكون من ({executionReport.executedCount}) عنصر، تم التحقق والتأكيد المباشر لـ ({executionReport.verifiedCount}) منها.
              </span>
            </div>
            {executionReport.failedCount > 0 && (
              <span className="text-rose-700 font-bold">
                تعذر تنفيذ: {executionReport.failedCount}
              </span>
            )}
          </div>
        )}

        {/* Issues List Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                لا توجد مشاكل معروضة في هذه القائمة
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                جميع علاقات الدورة البيعية مطابقة لمعايير السلامة والاتساق
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const isSelected = selectedIssueIds.has(issue.id);
              const hasInlineFix =
                issue.id.startsWith("opp_no_val_") ||
                issue.id.startsWith("opp_lost_no_reason_") ||
                issue.id.startsWith("follow_overdue_") ||
                issue.id.startsWith("ins_incomplete_");

              return (
                <div
                  key={issue.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-300 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox or Disabled Lock */}
                      {issue.canAutoExecute ? (
                        <button
                          onClick={() => toggleIssueSelection(issue)}
                          className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300 bg-white hover:border-blue-400"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      ) : (
                        <div
                          className="mt-1 w-5 h-5 rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0"
                          title="يتطلب اتخاذ قرار يدوياً - غير قابل للتنفيذ التلقائي"
                        >
                          <Lock className="w-3 h-3" />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            {issue.entityType}: {issue.customerName}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                            {issue.companyName}
                          </span>

                          {/* Classification Tag */}
                          {issue.classification === "SAFE_TO_REPAIR" && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
                              آمن للإصلاح
                            </span>
                          )}
                          {issue.classification === "NEEDS_LINK" && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold">
                              يحتاج ربط
                            </span>
                          )}
                          {issue.classification === "REVIEW_REQUIRED" && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold">
                              مطلوب مراجعة
                            </span>
                          )}
                          {(issue.classification === "CONFLICT" || issue.classification === "DUPLICATE") && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold">
                              تعارض / تكرار
                            </span>
                          )}

                          {issue.executionStatus === "VERIFIED" && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-xs font-black">
                              VERIFIED ✓
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-slate-800 mt-2 leading-relaxed">
                          <span className="font-bold text-slate-900">المشكلة:</span> {issue.issue}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          <span className="font-bold text-slate-700">السبب:</span> {issue.cause}
                        </p>
                        <p className="text-xs text-blue-900 font-medium mt-1">
                          <span className="font-bold text-blue-950">الإجراء المقترح:</span> {issue.proposedAction}
                        </p>
                        <p className="text-xs text-emerald-800 font-bold mt-1 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/60">
                          <span>البيانات التي ستتغير:</span> {issue.dataToBeChanged}
                        </p>

                        {/* Tailored Manual Fix Forms */}
                        {hasInlineFix && (
                          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                              تصحيح يدوي فوري:
                            </span>

                            {issue.id.startsWith("opp_no_val_") && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  placeholder="أدخل القيمة المقدرة (ج.م)..."
                                  value={inlineInputs[issue.id] || ""}
                                  onChange={(e) => handleInputChange(issue.id, e.target.value)}
                                  className="w-48 px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 bg-white font-bold"
                                />
                                <button
                                  onClick={() => handleManualFix(issue)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  حفظ القيمة
                                </button>
                              </div>
                            )}

                            {issue.id.startsWith("opp_lost_no_reason_") && (
                              <div className="flex items-center gap-2">
                                <select
                                  value={inlineInputs[issue.id] || ""}
                                  onChange={(e) => handleInputChange(issue.id, e.target.value)}
                                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-hidden bg-white font-bold"
                                >
                                  <option value="">-- اختر سبب الفقدان --</option>
                                  <option value="سعر مرتفع">سعر مرتفع جداً</option>
                                  <option value="المنافسين">اتجه للمنافسين</option>
                                  <option value="تأخر العميل">تأخر العميل في الرد</option>
                                  <option value="مواصفات غير مطابقة">المواصفات غير مطابقة</option>
                                  <option value="غير مهتم حالياً">غير مهتم حالياً</option>
                                </select>
                                <button
                                  onClick={() => handleManualFix(issue)}
                                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  حفظ السبب
                                </button>
                              </div>
                            )}

                            {issue.id.startsWith("follow_overdue_") && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => {
                                    completeFollowUp(issue.entityId);
                                    showToast("تم إتمام المتابعة وتسجيل مكالمة الاتصال بنجاح ✅", "success");
                                  }}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  إتمام الاتصال والمتابعة
                                </button>
                                <span className="text-xs text-slate-400 font-bold">أو تأجيل إلى:</span>
                                <input
                                  type="date"
                                  value={inlineInputs[issue.id] || ""}
                                  onChange={(e) => handleInputChange(issue.id, e.target.value)}
                                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-hidden bg-white font-bold"
                                />
                                <button
                                  onClick={() => handleManualFix(issue)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  جدولة جديدة
                                </button>
                              </div>
                            )}

                            {issue.id.startsWith("ins_incomplete_") && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-500">تاريخ المعاينة:</span>
                                <input
                                  type="date"
                                  value={inlineInputs[`${issue.id}_date`] || ""}
                                  onChange={(e) => handleInputChange(`${issue.id}_date`, e.target.value)}
                                  className="px-2 py-0.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden bg-white font-bold"
                                />
                                <span className="text-xs text-slate-500">الحالة:</span>
                                <select
                                  value={inlineInputs[`${issue.id}_status`] || ""}
                                  onChange={(e) => handleInputChange(`${issue.id}_status`, e.target.value)}
                                  className="px-2 py-0.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden bg-white font-bold"
                                >
                                  <option value="completed">مكتملة (Completed)</option>
                                  <option value="cancelled">ملغاة (Cancelled)</option>
                                  <option value="pending">قيد الانتظار (Pending)</option>
                                </select>
                                <button
                                  onClick={() => handleManualFix(issue)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  تحديث المعاينة
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 self-end sm:self-start">
                      {issue.customerId && (
                        <button
                          onClick={() => {
                            setSelectedCustomerIdFor360(issue.customerId!);
                            onClose();
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          ملف العميل 360°
                        </button>
                      )}

                      {/* Exclude Action */}
                      {showConfirmExclude === issue.id ? (
                        <div className="flex items-center gap-1 bg-amber-50 p-1 border border-amber-200 rounded-lg">
                          <input
                            type="text"
                            placeholder="سبب الاستبعاد..."
                            value={inlineInputs[`exclude_reason_${issue.id}`] || ""}
                            onChange={(e) => handleInputChange(`exclude_reason_${issue.id}`, e.target.value)}
                            className="w-32 px-1.5 py-0.5 text-xxs border border-slate-300 bg-white rounded-md"
                          />
                          <button
                            onClick={() => handleExcludeIssue(issue, inlineInputs[`exclude_reason_${issue.id}`])}
                            className="px-2 py-0.5 bg-amber-600 text-white text-xxs rounded-md font-bold hover:bg-amber-700 cursor-pointer"
                          >
                            موافق
                          </button>
                          <button
                            onClick={() => setShowConfirmExclude(null)}
                            className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xxs rounded-md font-bold hover:bg-slate-300 cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowConfirmExclude(issue.id)}
                          className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          title="استبعاد السجل بالكامل من الـ KPIs والتقارير والتحليلات"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>استبعاد</span>
                        </button>
                      )}

                      {/* Delete Action (Strict Privilege Guard) */}
                      {canDeleteRecords && (
                        showConfirmDelete === issue.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 border border-rose-200 rounded-lg">
                            <span className="text-xxs font-bold text-rose-800">حذف نهائي؟</span>
                            <button
                              onClick={() => handleDeleteIssue(issue)}
                              className="px-2 py-0.5 bg-rose-600 text-white text-xxs rounded-md font-bold hover:bg-rose-700 cursor-pointer"
                            >
                              نعم
                            </button>
                            <button
                              onClick={() => setShowConfirmDelete(null)}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xxs rounded-md font-bold hover:bg-slate-300 cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowConfirmDelete(issue.id)}
                            className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                            title="حذف السجل بشكل نهائي من قاعدة البيانات تماماً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف نهائي</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>محرك الإصلاح والتحقق يضمن عدم التكرار والحفاظ على سلامة البيانات المقترنة.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
