import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  FileSpreadsheet,
  Users,
  Building2,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
} from "lucide-react";

interface AuditIssue {
  id: string;
  customerId: string;
  customerName: string;
  companyId: string;
  companyName: string;
  type:
    | "contract_without_quote"
    | "contract_without_sale"
    | "quote_without_opp"
    | "accepted_quote_not_won"
    | "stage_mismatch"
    | "inquiry_without_followup";
  severity: "high" | "medium" | "low";
  description: string;
  suggestedAction: string;
  financialImpact?: number;
}

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
    migrateLegacyData,
    setSelectedCustomerIdFor360,
    showToast,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // Compute Comprehensive Audit Issues across all customers
  const auditIssues = useMemo(() => {
    const issues: AuditIssue[] = [];

    const getCompName = (compId: string) => {
      const c = companies.find((comp) => comp.id === compId);
      return c ? c.name : "شركة غير محددة";
    };

    customers.forEach((cust) => {
      const custContracts = contracts.filter((c) => c.customerId === cust.id);
      const custQuotes = quotations.filter((q) => q.customerId === cust.id);
      const custOpps = opportunities.filter((o) => o.customerId === cust.id);
      const custInquiries = inquiries.filter((i) => i.customerId === cust.id);
      const custFollowUps = followUps.filter((f) => f.customerId === cust.id);

      // 1. Contracts without Quotes
      custContracts.forEach((contract) => {
        const hasLinkedQuote =
          contract.quotationId &&
          quotations.some((q) => q.id === contract.quotationId);
        if (!hasLinkedQuote && custQuotes.length === 0) {
          issues.push({
            id: `cwq_${contract.id}`,
            customerId: cust.id,
            customerName: cust.name,
            companyId: contract.companyId,
            companyName: getCompName(contract.companyId),
            type: "contract_without_quote",
            severity: "high",
            description: `يوجد عقد مبيعات مسجل بقيمة ${contract.totalValue.toLocaleString()} ج.م بدون عرض سعر مسبق مرتبط بالدورة البيعية.`,
            suggestedAction:
              "توليد عرض سعر مرجعي تلقائياً وربطه بالعقد لتوثيق دورة المبيعات كاملة.",
            financialImpact: contract.totalValue,
          });
        }
      });

      // 2. Contracts without Sales record
      custContracts.forEach((contract) => {
        const hasSale = sales.some(
          (s) =>
            s.customerId === cust.id ||
            s.contractId === contract.id ||
            s.contractNumber === contract.contractNumber ||
            (s.date === contract.date && s.companyId === contract.companyId)
        );
        if (!hasSale && (contract.status === "active" || contract.status === "signed" || contract.status === "completed")) {
          issues.push({
            id: `cws_${contract.id}`,
            customerId: cust.id,
            customerName: cust.name,
            companyId: contract.companyId,
            companyName: getCompName(contract.companyId),
            type: "contract_without_sale",
            severity: "high",
            description: `العقد رقم (${contract.contractNumber || "جديد"}) بقيمة ${contract.totalValue.toLocaleString()} ج.م لم يُسجل كإيراد بيعي معتمد في تقارير المبيعات.`,
            suggestedAction:
              "إنشاء قيد مبيعات معتمد لحساب المستهدف الشهري والعمولات فوراً.",
            financialImpact: contract.totalValue,
          });
        }
      });

      // 3. Customer Stage Mismatch (Contract exists but stage is not contracted)
      if (custContracts.length > 0 && cust.stage !== "contracted") {
        const totalContractVal = custContracts.reduce(
          (sum, c) => sum + c.totalValue,
          0
        );
        issues.push({
          id: `sm_${cust.id}`,
          customerId: cust.id,
          customerName: cust.name,
          companyId: cust.companyId,
          companyName: getCompName(cust.companyId),
          type: "stage_mismatch",
          severity: "high",
          description: `العميل متعاقد فعلياً ولديه عقود بقيمة ${totalContractVal.toLocaleString()} ج.م، لكن مرحلته الحالية مسجلة كـ "${cust.stage}".`,
          suggestedAction:
            "ترقية مرحلة العميل إلى 'متعاقد' وتحديث إجمالي مبيعاته التراكمية.",
          financialImpact: totalContractVal,
        });
      }

      // 4. Quotations without Opportunities
      custQuotes.forEach((quote) => {
        const hasOpp = custOpps.some(
          (o) => o.quotationId === quote.id || o.companyId === quote.companyId
        );
        if (!hasOpp) {
          issues.push({
            id: `qwo_${quote.id}`,
            customerId: cust.id,
            customerName: cust.name,
            companyId: quote.companyId,
            companyName: getCompName(quote.companyId),
            type: "quote_without_opp",
            severity: "medium",
            description: `عرض سعر بقيمة ${quote.totalAmount.toLocaleString()} ج.م غير مدرج كفرصة تفاوض بيعية في الـ Pipeline.`,
            suggestedAction:
              "إنشاء فرصة بيعية نشطة وتتبع مراحل التفاوض حتى الإغلاق.",
            financialImpact: quote.totalAmount,
          });
        }
      });

      // 5. Accepted Quotation not Won
      custQuotes
        .filter((q) => q.status === "accepted")
        .forEach((quote) => {
          const wonOpp = custOpps.find(
            (o) => o.status === "won" || o.stage === "won"
          );
          if (!wonOpp && custContracts.length === 0) {
            issues.push({
              id: `aqnw_${quote.id}`,
              customerId: cust.id,
              customerName: cust.name,
              companyId: quote.companyId,
              companyName: getCompName(quote.companyId),
              type: "accepted_quote_not_won",
              severity: "medium",
              description: `عرض السعر معتمد ومقبول من العميل بقيمة ${quote.totalAmount.toLocaleString()} ج.م ولكن لم يُحرر له عقد رسمي بعد.`,
              suggestedAction:
                "تحويل الفرصة إلى 'كسبت' وإعداد مسودة عقد مبيعات لإنهاء الصفقة.",
              financialImpact: quote.totalAmount,
            });
          }
        });

      // 6. Inquiries without Follow-ups
      if (
        custInquiries.length > 0 &&
        custFollowUps.length === 0 &&
        custContracts.length === 0 &&
        (cust.stage === "inquiry" || cust.stage === "new")
      ) {
        issues.push({
          id: `iwf_${cust.id}`,
          customerId: cust.id,
          customerName: cust.name,
          companyId: cust.companyId,
          companyName: getCompName(cust.companyId),
          type: "inquiry_without_followup",
          severity: "low",
          description: "عميل لديه استفسار مسجل ولكن لم يتم جدولة أي مكالمة أو تذكير لمتابعته.",
          suggestedAction:
            "جدولة اتصال أولي لتحديد الاحتياجات وتحديد موعد للمعاينة.",
        });
      }
    });

    return issues;
  }, [customers, companies, contracts, quotations, opportunities, sales, inquiries, followUps]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    if (activeFilter === "all") return auditIssues;
    if (activeFilter === "contracts")
      return auditIssues.filter(
        (i) => i.type === "contract_without_quote" || i.type === "contract_without_sale"
      );
    if (activeFilter === "stages")
      return auditIssues.filter((i) => i.type === "stage_mismatch");
    if (activeFilter === "quotes")
      return auditIssues.filter(
        (i) => i.type === "quote_without_opp" || i.type === "accepted_quote_not_won"
      );
    if (activeFilter === "inquiries")
      return auditIssues.filter((i) => i.type === "inquiry_without_followup");
    return auditIssues;
  }, [auditIssues, activeFilter]);

  // Overall Sales Cycle Health Score
  const totalCustomers = customers.length || 1;
  const customersWithIssues = new Set(auditIssues.map((i) => i.customerId)).size;
  const synchronizedCustomers = Math.max(0, totalCustomers - customersWithIssues);
  const healthScore = Math.round((synchronizedCustomers / totalCustomers) * 100);

  // Total financial value tied to unlinked issues
  const totalFinancialAtRisk = useMemo(() => {
    return auditIssues.reduce((sum, i) => sum + (i.financialImpact || 0), 0);
  }, [auditIssues]);

  const handleExecuteSmartSync = async () => {
    setIsExecuting(true);
    try {
      const stats = await migrateLegacyData();
      const summaryMsg = `اكتمل الربط الذكي بنجاح: تم إنشاء ${stats.newQuotesCreated} عرض سعر، وربط ${stats.contractsLinked} عقد، وتحديث ${stats.oppsUpdated + stats.newOppsCreated} مرحلة بيعية، واعتماد ${stats.salesCreated} سجل مبيعات 🚀`;
      setLastSyncResult(summaryMsg);
      showToast(summaryMsg, "success");
    } catch (err) {
      console.error("Smart sync execution error:", err);
      showToast("حدث خطأ أثناء تنفيذ المزامنة", "error");
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">
                  المزامنة الذكية وتحليل الدورة البيعية
                </h2>
                <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-lg text-xs font-bold">
                  محرك التحليل الشامل
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                تشخيص رحلة كل عميل بدقة، واكتشاف أي فجوات بين الاستفسار والعرض والتعاقد والمبيعات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Health Score & Diagnostic Metrics Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Health Score */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  صحة الدورة البيعية
                </span>
                <span
                  className={`font-black ${
                    healthScore >= 90
                      ? "text-emerald-400"
                      : healthScore >= 70
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {healthScore}%
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    healthScore >= 90
                      ? "bg-emerald-500"
                      : healthScore >= 70
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {synchronizedCustomers} من {totalCustomers} عميل مترابطون 100%
              </p>
            </div>

            {/* Diagnosed Gaps */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                فجوات بحاجة لمعالجة
              </span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {auditIssues.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                لدى {customersWithIssues} عملاء مختلفين
              </p>
            </div>

            {/* Financial Value Impact */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                مبالغ مرتبطة بالفجوات
              </span>
              <div className="text-xl sm:text-2xl font-black text-teal-400 mt-1 font-mono">
                {totalFinancialAtRisk.toLocaleString()} <span className="text-xs">ج.م</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                عقود ومبيعات بحاجة للربط
              </p>
            </div>

            {/* One-Click Action Trigger */}
            <div className="bg-gradient-to-br from-emerald-950/70 to-teal-950/70 border border-emerald-500/40 rounded-2xl p-3 sm:p-4 flex flex-col justify-between">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                الربط التلقائي الفوري
              </div>
              <button
                onClick={handleExecuteSmartSync}
                disabled={isExecuting}
                className="mt-2 w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isExecuting ? "animate-spin" : ""}`} />
                <span>{isExecuting ? "جاري المعالجة والربط..." : "مزامنة وربط الكل الآن"}</span>
              </button>
            </div>
          </div>

          {lastSyncResult && (
            <div className="mt-3 p-2.5 bg-emerald-900/50 border border-emerald-400/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lastSyncResult}</span>
            </div>
          )}
        </div>

        {/* Filter Navigation */}
        <div className="flex border-b border-slate-200 px-5 pt-3 bg-slate-50 gap-2 overflow-x-auto shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveFilter("all")}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === "all"
                ? "border-amber-600 text-amber-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>جميع الفجوات المكتشفة</span>
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-md text-[10px]">
              {auditIssues.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter("contracts")}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === "contracts"
                ? "border-amber-600 text-amber-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>عقود ومبيعات غير متزامنة</span>
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-md text-[10px]">
              {
                auditIssues.filter(
                  (i) =>
                    i.type === "contract_without_quote" || i.type === "contract_without_sale"
                ).length
              }
            </span>
          </button>

          <button
            onClick={() => setActiveFilter("stages")}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === "stages"
                ? "border-amber-600 text-amber-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>حالات عملاء تحتاج ترقية</span>
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-md text-[10px]">
              {auditIssues.filter((i) => i.type === "stage_mismatch").length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter("quotes")}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === "quotes"
                ? "border-amber-600 text-amber-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>عروض أسعار وفرص بيعية</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-md text-[10px]">
              {
                auditIssues.filter(
                  (i) =>
                    i.type === "quote_without_opp" || i.type === "accepted_quote_not_won"
                ).length
              }
            </span>
          </button>

          <button
            onClick={() => setActiveFilter("inquiries")}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === "inquiries"
                ? "border-amber-600 text-amber-900 font-black"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>استفسارات بدون متابعات</span>
            <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-md text-[10px]">
              {auditIssues.filter((i) => i.type === "inquiry_without_followup").length}
            </span>
          </button>
        </div>

        {/* Issues List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`p-4 rounded-2xl border transition-all ${
                issue.severity === "high"
                  ? "bg-amber-50/50 border-amber-200"
                  : issue.severity === "medium"
                  ? "bg-blue-50/40 border-blue-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                      issue.severity === "high"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {issue.severity === "high" ? "⚠️" : "💡"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-sm">
                        {issue.customerName}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium">
                        🏢 {issue.companyName}
                      </span>
                      {issue.financialImpact && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                          {issue.financialImpact.toLocaleString()} ج.م
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedCustomerIdFor360(issue.customerId);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1 font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>ملف العميل 360</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 mt-2.5 leading-relaxed font-medium">
                {issue.description}
              </p>

              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <strong>الإجراء الذكي:</strong> {issue.suggestedAction}
                </span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  مشمول في المزامنة الآلية
                </span>
              </div>
            </div>
          ))}

          {filteredIssues.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-black text-slate-900 text-base">
                دورة المبيعات متزامنة ومترابطة 100%!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                لا توجد أي فجوات مكتشفة في هذا التصنيف. جميع عروض الأسعار والعقود والفرص والمبيعات مترابطة بشكل سليم وسلس.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            <strong>نظام الأمان:</strong> المزامنة تحافظ على كافة البيانات ولا تحذف أي عقد أو عرض سعر، بل تكمل النواقص وتربط الأطراف ببعضها.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
            >
              إغلاق
            </button>
            <button
              onClick={handleExecuteSmartSync}
              disabled={isExecuting}
              className="w-1/2 sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 ${isExecuting ? "animate-spin" : ""}`} />
              <span>{isExecuting ? "جاري تنفيذ الربط..." : "تنفيذ الربط الشامل والمزامنة ⚡"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
