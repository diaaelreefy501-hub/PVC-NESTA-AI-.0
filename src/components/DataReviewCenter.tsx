import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { DataReviewItem, Contract, Sale } from "../types";
import { runContractsDiagnostic } from "../utils/contractDiagnostic";
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Layers, 
  Check, 
  X, 
  Eye, 
  FileCheck2, 
  DollarSign, 
  Activity, 
  FileSpreadsheet, 
  Ban, 
  ShieldCheck, 
  Scale, 
  ArrowRightLeft,
  UserPlus,
  Trash2,
  Users,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export const DataReviewCenter: React.FC = () => {
  const {
    dataReviewItems,
    contracts,
    sales,
    opportunities,
    customers,
    quotations,
    inquiries,
    companies,
    tasks,
    followUps,
    inspections,
    interactions,
    approveRecord,
    excludeRecord,
    showToast,
    payments,
    salesOverrideValue,
    salesManualAdjustment,
    purgeOrphanContracts,
    createCustomersFromOrphanContracts,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'duplicates' | 'conflicts' | 'missing' | 'generated' | 'diagnostic'>('all');
  const [selectedItem, setSelectedItem] = useState<DataReviewItem | null>(null);
  const [expandedCustId, setExpandedCustId] = useState<string | null>(null);

  // Exact Quotation Reconciliation Calculation (~120 Quotations)
  const quotationReconciliation = useMemo(() => {
    const totalQuotations = quotations.length;
    const contractedCustomerIds = new Set(
      contracts
        .filter((c) => c.recordStatus !== 'duplicate' && c.recordStatus !== 'excluded')
        .map((c) => c.customerId)
        .filter(Boolean)
    );

    const realOppsMap = new Map(opportunities.map((o) => [o.id, o]));
    const realInqsSet = new Set(inquiries.map((i) => i.id));

    let linkedToContractedCount = 0;
    let linkedToOppsCount = 0;
    let linkedToInqsCount = 0;
    const oppsStageBreakdown: Record<string, number> = {};

    const duplicateMap = new Map<string, typeof quotations>();
    const orphanQuotes: Array<{ quote: typeof quotations[0]; reason: string }> = [];

    quotations.forEach((q) => {
      if (q.customerId && contractedCustomerIds.has(q.customerId)) {
        linkedToContractedCount++;
      }
      if (q.opportunityId && realOppsMap.has(q.opportunityId)) {
        linkedToOppsCount++;
        const opp = realOppsMap.get(q.opportunityId);
        const stage = (opp as any)?.stage || (opp as any)?.status || 'open';
        oppsStageBreakdown[stage] = (oppsStageBreakdown[stage] || 0) + 1;
      }
      if (q.inquiryId && realInqsSet.has(q.inquiryId)) {
        linkedToInqsCount++;
      }

      const dupKey = q.quoteNumber
        ? `${q.companyId}_${q.quoteNumber.trim()}`
        : `${q.companyId}_${q.customerId}_${q.totalAmount}`;
      const group = duplicateMap.get(dupKey) || [];
      group.push(q);
      duplicateMap.set(dupKey, group);

      const hasCust = Boolean(q.customerId && customers.some((c) => c.id === q.customerId));
      const hasOpp = Boolean(q.opportunityId && realOppsMap.has(q.opportunityId));
      const hasInq = Boolean(q.inquiryId && realInqsSet.has(q.inquiryId));

      if (!hasCust && !hasOpp && !hasInq) {
        orphanQuotes.push({
          quote: q,
          reason: 'عرض سعر تائه: لا ينتمي لعميل مسجل أو فرصة أو استفسار',
        });
      }
    });

    const duplicateGroups = Array.from(duplicateMap.values()).filter((g) => g.length > 1);
    const duplicatesCount = duplicateGroups.reduce((sum, g) => sum + (g.length - 1), 0);
    const validStandaloneCount = Math.max(0, totalQuotations - orphanQuotes.length - duplicatesCount);

    return {
      totalQuotations,
      linkedToContractedCount,
      linkedToOppsCount,
      oppsStageBreakdown,
      linkedToInqsCount,
      validStandaloneCount,
      duplicatesCount,
      orphanQuotesCount: orphanQuotes.length,
      reconciledTotal: totalQuotations - duplicatesCount,
    };
  }, [quotations, contracts, opportunities, inquiries, customers]);

  // Live Diagnostic Report computation
  const diagnosticReport = useMemo(() => {
    return runContractsDiagnostic(customers, contracts, sales);
  }, [customers, contracts, sales]);

  // Filter review items
  const filteredItems = dataReviewItems.filter((item) => {
    if (activeTab === 'duplicates') return item.issueType === 'DUPLICATE_CONTRACT' || item.issueType === 'DUPLICATE_RECORD';
    if (activeTab === 'conflicts') return item.issueType === 'AMOUNT_MISMATCH' || item.issueType === 'CUSTOMER_LINK_MISMATCH' || item.issueType === 'CONFLICT';
    if (activeTab === 'missing') return item.issueType === 'SALE_WITHOUT_CONTRACT' || item.issueType === 'CONTRACT_WITHOUT_SALE' || item.issueType === 'OPPORTUNITY_WITHOUT_CONTRACT';
    if (activeTab === 'generated') return item.description && item.description.includes('تلقائياً');
    return true;
  });

  const duplicatesCount = dataReviewItems.filter(i => i.issueType.includes('DUPLICATE')).length;
  const conflictsCount = dataReviewItems.filter(i => i.issueType === 'CONFLICT' || i.issueType.includes('MISMATCH')).length;
  const missingCount = dataReviewItems.filter(i => i.issueType.includes('WITHOUT')).length;

  // 1. Contracts breakdown
  const rawContractsCount = contracts.length;
  const rawContractsValueSum = contracts.reduce((sum, c) => sum + (Number(c.totalValue) || 0), 0);

  const excludedContracts = contracts.filter(c => c.recordStatus === 'duplicate' || c.recordStatus === 'excluded');
  const excludedContractsValueSum = excludedContracts.reduce((sum, c) => sum + (Number(c.totalValue) || 0), 0);

  const cancelledContracts = contracts.filter(c => c.status === 'cancelled' && c.recordStatus !== 'duplicate' && c.recordStatus !== 'excluded');
  const cancelledContractsValueSum = cancelledContracts.reduce((sum, c) => sum + (Number(c.totalValue) || 0), 0);

  const activeContracts = contracts.filter(c => c.recordStatus !== 'duplicate' && c.recordStatus !== 'excluded' && c.status !== 'cancelled');
  const activeContractsValueSum = activeContracts.reduce((sum, c) => sum + (Number(c.totalValue) || 0), 0);

  // 2. Sales breakdown
  const rawSalesCount = sales.length;
  const rawSalesValueSum = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const excludedSales = sales.filter(s => s.recordStatus === 'duplicate' || s.recordStatus === 'excluded');
  const excludedSalesValueSum = excludedSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const directSales = sales.filter(s => s.recordStatus !== 'duplicate' && s.recordStatus !== 'excluded' && !s.contractId);
  const directSalesValueSum = directSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const activeSales = sales.filter(s => s.recordStatus !== 'duplicate' && s.recordStatus !== 'excluded');
  const activeSalesValueSum = activeSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // 3. Payments / Collections breakdown
  const paymentsList = payments || [];
  const rawPaymentsCount = paymentsList.length;
  const rawPaymentsValueSum = paymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const excludedPayments = paymentsList.filter(p => p.recordStatus === 'duplicate' || p.recordStatus === 'excluded');
  const excludedPaymentsValueSum = excludedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const activePayments = paymentsList.filter(p => p.recordStatus !== 'duplicate' && p.recordStatus !== 'excluded');
  const activePaymentsValueSum = activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#C8A75A] animate-pulse" />
              <h1 className="text-xl font-bold text-[#EDEDED]">مراجعة واعتماد البيانات (Data Review Center)</h1>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">
              مركز الرقابة والتدقيق الصارم للتعارضات، السجلات المكررة، والروابط الناقصة مع أداة التحليل ومطابقة الأرقام (Reconciliation Diagnostic).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#C8A75A] font-semibold">
              إجمالي التنبيهات: {dataReviewItems.length}
            </span>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-t border-[#292B2E] pt-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-[#C8A75A] text-black shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            الكل ({dataReviewItems.length})
          </button>
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'duplicates'
                ? 'bg-[#C8A75A] text-black shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            التكرارات المحتملة ({duplicatesCount})
          </button>
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'conflicts'
                ? 'bg-[#C8A75A] text-black shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            التعارضات المالية ({conflictsCount})
          </button>
          <button
            onClick={() => setActiveTab('missing')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'missing'
                ? 'bg-[#C8A75A] text-black shadow-md'
                : 'bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]'
            }`}
          >
            الروابط الناقصة ({missingCount})
          </button>
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'diagnostic'
                ? 'bg-[#C8A75A] text-black shadow-md'
                : 'bg-amber-950/40 text-[#C8A75A] hover:bg-amber-950/60 border border-amber-800/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            تشخيص ومطابقة البيانات 🔍
          </button>
        </div>
      </div>

      {/* Review Items Grid / Table or Diagnostic View */}
      {activeTab === 'diagnostic' ? (
        <div className="space-y-6">
          {/* Quick Explanation Banner */}
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-2 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-extrabold text-sm text-amber-300">
                    تقرير التشخيص والتدقيق المباشر (Diagnostic Audit Report)
                  </h3>
                  <span className="text-[10px] text-amber-400 bg-amber-900/40 px-2.5 py-1 rounded-full border border-amber-800/60 font-mono">
                    تاريخ الفحص: {new Date(diagnosticReport.timestamp).toLocaleString("ar-EG")}
                  </span>
                </div>

                <p className="text-xs text-amber-200/90 leading-relaxed">
                  هذا التقرير يفسر أسباب وجود <span className="font-black text-amber-300">{diagnosticReport.summary.totalContracts} عقداً</span> مقابل <span className="font-black text-amber-300">{diagnosticReport.summary.totalRegisteredCustomers} عملاء مسجلين</span>:
                </p>

                <ul className="list-disc list-inside text-xs text-amber-200/80 space-y-1 pr-1 font-medium">
                  {diagnosticReport.summary.rootCauses.map((cause, idx) => (
                    <li key={idx}>{cause}</li>
                  ))}
                </ul>

                {(diagnosticReport.summary.orphanContractsCount > 0 || diagnosticReport.summary.duplicateContractsCount > 0) && (
                  <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-amber-800/40 mt-3">
                    {diagnosticReport.summary.orphanContractsCount > 0 && (
                      <button
                        onClick={createCustomersFromOrphanContracts}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>تسجيل ملفات لـ ({diagnosticReport.summary.orphanContractsCount}) تعاقد متبقي</span>
                      </button>
                    )}
                    {diagnosticReport.summary.orphanContractsCount > 0 && (
                      <button
                        onClick={purgeOrphanContracts}
                        className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف وتصفية التعاقدات التائهة</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostic Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#A1A1AA]">العملاء المسجلين</span>
              <p className="text-xl font-black text-[#EDEDED] font-mono">{diagnosticReport.summary.totalRegisteredCustomers}</p>
              <span className="text-[10px] text-emerald-400">في جدول العملاء</span>
            </div>

            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#A1A1AA]">إجمالي العقود</span>
              <p className="text-xl font-black text-[#C8A75A] font-mono">{diagnosticReport.summary.totalContracts}</p>
              <span className="text-[10px] text-[#A1A1AA]">في جدول العقود</span>
            </div>

            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#A1A1AA]">عقود مسجلة</span>
              <p className="text-xl font-black text-emerald-400 font-mono">{diagnosticReport.summary.registeredContractsCount}</p>
              <span className="text-[10px] text-emerald-400">مرتبطة بالعملاء الـ {diagnosticReport.summary.totalRegisteredCustomers}</span>
            </div>

            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#A1A1AA]">عقود غير مسجلة (Orphan)</span>
              <p className="text-xl font-black text-amber-400 font-mono">{diagnosticReport.summary.orphanContractsCount}</p>
              <span className="text-[10px] text-amber-400">بدون عميل مرتبط</span>
            </div>

            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#A1A1AA]">عقود مكررة</span>
              <p className="text-xl font-black text-rose-400 font-mono">{diagnosticReport.summary.duplicateContractsCount}</p>
              <span className="text-[10px] text-rose-400">تكرار رقم/تاريخ</span>
            </div>

            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-semibold text-[#A1A1AA]">إجمالي المبيعات</span>
              <p className="text-xl font-black text-blue-400 font-mono">{diagnosticReport.summary.totalSales}</p>
              <span className="text-[10px] text-blue-400">{diagnosticReport.salesMappingSummary.salesLinkedToContractsCount} مرتبطة بعقود</span>
            </div>
          </div>

          {/* Quotations Reconciliation Audit Panel (~120 Quotations) */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#292B2E]">
              <div>
                <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#C8A75A]" />
                  تقرير تدقيق ومطابقة عروض الأسعار (Quotations Reconciliation Audit)
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  تفكيك ومطابقة عروض الأسعار الإجمالية ({quotationReconciliation.totalQuotations} عرض سعر) مع العملاء المتعاقدين، الفرص الاستثمارية، والاستفسارات.
                </p>
              </div>
              <span className="px-3 py-1 bg-[#C8A75A]/15 border border-[#C8A75A]/30 text-[#C8A75A] font-extrabold text-xs rounded-xl self-start sm:self-auto">
                العدد المطابق الصافي: {quotationReconciliation.reconciledTotal} عرض سعر
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#141517] p-3.5 rounded-xl border border-[#292B2E]">
                <span className="text-[11px] text-[#A1A1AA] block">إجمالي عروض الأسعار</span>
                <span className="text-lg font-black text-[#EDEDED] font-mono">{quotationReconciliation.totalQuotations}</span>
              </div>
              <div className="bg-[#141517] p-3.5 rounded-xl border border-[#292B2E]">
                <span className="text-[11px] text-[#A1A1AA] block">مرتبطة بالعملاء المتعاقدين الـ (83)</span>
                <span className="text-lg font-black text-emerald-400 font-mono">{quotationReconciliation.linkedToContractedCount}</span>
              </div>
              <div className="bg-[#141517] p-3.5 rounded-xl border border-[#292B2E]">
                <span className="text-[11px] text-[#A1A1AA] block">مرتبطة بفرص بيعية حقيقية</span>
                <span className="text-lg font-black text-blue-400 font-mono">{quotationReconciliation.linkedToOppsCount}</span>
              </div>
              <div className="bg-[#141517] p-3.5 rounded-xl border border-[#292B2E]">
                <span className="text-[11px] text-[#A1A1AA] block">عروض مكررة / تائهة</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {quotationReconciliation.duplicatesCount + quotationReconciliation.orphanQuotesCount}
                </span>
              </div>
            </div>

            {/* Stages & Types breakdown */}
            <div className="p-3 bg-[#141517] rounded-xl border border-[#292B2E] text-xs space-y-2">
              <span className="font-bold text-[#EDEDED] block">تفاصيل الربط بالفرص والاستفسارات:</span>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#A1A1AA]">
                <span className="bg-[#202225] px-2.5 py-1 rounded-lg border border-[#292B2E]">
                  مرتبطة باستفسارات: <strong className="text-white">{quotationReconciliation.linkedToInqsCount}</strong>
                </span>
                <span className="bg-[#202225] px-2.5 py-1 rounded-lg border border-[#292B2E]">
                  عروض مستقلة معتمدة: <strong className="text-emerald-400">{quotationReconciliation.validStandaloneCount}</strong>
                </span>
                <span className="bg-[#202225] px-2.5 py-1 rounded-lg border border-[#292B2E]">
                  مكررة بنفس الرقم/المبلغ: <strong className="text-rose-400">{quotationReconciliation.duplicatesCount}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Total Entities Breakdown Card */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C8A75A]" />
                تفاصيل وحصر السجلات والكيانات التشغيلية (Total Entities Breakdown)
              </h3>
              <span className="text-xs text-[#A1A1AA] font-mono">
                المجموع الكلي: {companies.length + customers.length + inquiries.length + opportunities.length + quotations.length + contracts.length + sales.length + payments.length + tasks.length + followUps.length + inspections.length + interactions.length} كيان
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">الشركات</span>
                <span className="font-black text-[#EDEDED] font-mono">{companies.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">العملاء</span>
                <span className="font-black text-[#EDEDED] font-mono">{customers.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">الاستفسارات</span>
                <span className="font-black text-[#EDEDED] font-mono">{inquiries.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">الفرص البيعية</span>
                <span className="font-black text-[#EDEDED] font-mono">{opportunities.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">عروض الأسعار</span>
                <span className="font-black text-[#EDEDED] font-mono">{quotations.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">العقود</span>
                <span className="font-black text-[#EDEDED] font-mono">{contracts.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">المبيعات</span>
                <span className="font-black text-[#EDEDED] font-mono">{sales.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">المدفوعات/التحصيلات</span>
                <span className="font-black text-[#EDEDED] font-mono">{payments.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">المهام</span>
                <span className="font-black text-[#EDEDED] font-mono">{tasks.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">المتابعات</span>
                <span className="font-black text-[#EDEDED] font-mono">{followUps.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">المعاينات</span>
                <span className="font-black text-[#EDEDED] font-mono">{inspections.length}</span>
              </div>
              <div className="bg-[#141517] p-2.5 rounded-xl border border-[#292B2E] text-center">
                <span className="text-[#A1A1AA] text-[10px] block">التفاعلات/التنفيذ</span>
                <span className="font-black text-[#EDEDED] font-mono">{interactions.length}</span>
              </div>
            </div>
          </div>

          {/* 1. Customer Breakdown Section */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C8A75A]" />
                1. توزيع ودراسة العقود لكل عميل مسجل ({diagnosticReport.customerBreakdown.length} عملاء)
              </h3>
              <span className="text-xs text-[#A1A1AA] font-mono">
                متوسط {diagnosticReport.summary.contractsPerRegisteredCustomerAvg} عقد لكل عميل
              </span>
            </div>

            <div className="space-y-3">
              {diagnosticReport.customerBreakdown.map((cust) => {
                const isExpanded = expandedCustId === cust.customerId;
                return (
                  <div key={cust.customerId} className="bg-[#141517] border border-[#292B2E] rounded-xl overflow-hidden">
                    <div 
                      onClick={() => setExpandedCustId(isExpanded ? null : cust.customerId)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#1f2124] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#202225] border border-[#292B2E] text-[#C8A75A] font-bold text-xs flex items-center justify-center">
                          {cust.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-[#EDEDED]">{cust.customerName}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 font-bold">
                              {cust.contractsCount} عقود
                            </span>
                          </div>
                          <span className="text-[10px] text-[#A1A1AA]">الهاتف: {cust.phone} | المنطقة: {cust.area}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <span className="text-[10px] text-[#A1A1AA] block">إجمالي قيمة التعاقدات</span>
                          <span className="font-mono text-xs font-bold text-[#C8A75A]">
                            {cust.totalContractsValue.toLocaleString()} ج.م
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#A1A1AA]" /> : <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-[#292B2E] bg-[#111214] overflow-x-auto">
                        {cust.contracts.length === 0 ? (
                          <p className="text-xs text-[#A1A1AA]">لا توجد عقود مرتبطة بهذا العميل حالياً.</p>
                        ) : (
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="border-b border-[#292B2E] text-[#A1A1AA]">
                                <th className="pb-2">رقم العقد</th>
                                <th className="pb-2">التاريخ</th>
                                <th className="pb-2">إجمالي القيمة</th>
                                <th className="pb-2">المبيعات المرتبطة</th>
                                <th className="pb-2">الحالة والتشخيص</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cust.contracts.map((ctr) => (
                                <tr key={ctr.contractId} className="border-b border-[#292B2E]/40 hover:bg-[#18191B]">
                                  <td className="py-2 font-mono font-bold text-[#EDEDED]">{ctr.contractNumber}</td>
                                  <td className="py-2 text-[#A1A1AA]">{ctr.date || "غير حدد"}</td>
                                  <td className="py-2 font-mono text-[#C8A75A]">{ctr.totalValue.toLocaleString()} ج.م</td>
                                  <td className="py-2">
                                    <span className="font-bold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/40">
                                      {ctr.linkedSalesCount} مبيعة ({ctr.linkedSalesTotal.toLocaleString()} ج.م)
                                    </span>
                                  </td>
                                  <td className="py-2">
                                    {ctr.isDuplicate ? (
                                      <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40 text-[10px]">
                                        ⚠️ {ctr.duplicateReason}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40 text-[10px]">
                                        ✓ عقد سليم ومرتبط
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Duplicate Contracts Audit Table */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              2. العقود المكررة المكتشفة ({diagnosticReport.duplicateContracts.length} عقود)
            </h3>

            {diagnosticReport.duplicateContracts.length === 0 ? (
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>لا توجد عقود مكررة حالياً في قاعدة البيانات. جميع أرقام وبيانات العقود فريدة.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-[#292B2E] text-[#A1A1AA]">
                      <th className="pb-2">رقم العقد</th>
                      <th className="pb-2">اسم العميل</th>
                      <th className="pb-2">التاريخ والقيمة</th>
                      <th className="pb-2">نوع التكرار والسبب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnosticReport.duplicateContracts.map((dup) => (
                      <tr key={dup.contractId} className="border-b border-[#292B2E]/40">
                        <td className="py-2.5 font-mono text-[#EDEDED] font-bold">{dup.contractNumber}</td>
                        <td className="py-2.5 text-[#EDEDED]">{dup.customerName}</td>
                        <td className="py-2.5 font-mono text-[#C8A75A]">
                          {dup.date || "—"} | {dup.totalValue.toLocaleString()} ج.م
                        </td>
                        <td className="py-2.5 text-amber-400 font-bold">{dup.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. Orphan Contracts (Non-Registered) Clusters */}
          {diagnosticReport.orphanContractsGrouped.length > 0 && (
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-black text-[#EDEDED] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  3. العقود التائهة التاريخية ({diagnosticReport.summary.orphanContractsCount} عقود غير مرتبطة بعملاء مسجلين)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={createCustomersFromOrphanContracts}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    إنشاء ملفات تلقائية لهم
                  </button>
                  <button
                    onClick={purgeOrphanContracts}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف الكل
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-[#292B2E] text-[#A1A1AA]">
                      <th className="pb-2">اسم العميل بالعقد</th>
                      <th className="pb-2">الهاتف المسجل</th>
                      <th className="pb-2">عدد العقود</th>
                      <th className="pb-2">إجمالي القيم</th>
                      <th className="pb-2">عينة أرقام العقود</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnosticReport.orphanContractsGrouped.map((grp, idx) => (
                      <tr key={idx} className="border-b border-[#292B2E]/40 hover:bg-[#141517]">
                        <td className="py-2.5 font-bold text-[#EDEDED]">{grp.customerNameInContract}</td>
                        <td className="py-2.5 font-mono text-[#A1A1AA]">{grp.phoneInContract}</td>
                        <td className="py-2.5 font-mono text-amber-400 font-bold">{grp.contractsCount} عقود</td>
                        <td className="py-2.5 font-mono text-[#C8A75A]">{grp.totalValue.toLocaleString()} ج.م</td>
                        <td className="py-2.5 font-mono text-[10px] text-[#A1A1AA]">
                          {grp.sampleContractNumbers.join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#141517] border border-[#292B2E] rounded-2xl p-12 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-[#EDEDED]">لا توجد تنبيهات مراجعة في هذا القسم</h3>
          <p className="text-xs text-[#A1A1AA]">جميع السجلات سليمة وخالية من التعارضات الحالية.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isDuplicate = item.issueType.includes('DUPLICATE');
            const isMissing = item.issueType.includes('WITHOUT');
            return (
              <div
                key={item.id}
                className="bg-[#18191B] border border-[#292B2E] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#C8A75A]/40"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isDuplicate ? 'bg-amber-950/40 border-amber-900/40 text-amber-400' :
                    isMissing ? 'bg-blue-950/40 border-blue-900/40 text-blue-400' :
                    'bg-rose-950/40 border-rose-900/40 text-rose-400'
                  }`}>
                    {isDuplicate ? <Layers className="w-5 h-5" /> : isMissing ? <FileText className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#EDEDED]">{item.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#202225] border border-[#292B2E] text-[#A1A1AA]">
                        {item.entityType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">{item.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[#6B7280]">
                      <span>تاريخ الاكتشاف: {new Date(item.createdAt).toLocaleDateString('ar-EG')}</span>
                      <span>معرّف السجل: {item.entityId}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      approveRecord(item.entityType, item.entityId);
                      showToast("تم اعتماد السجل وتفعيل ح도ه في الحسابات بنجاح", "success");
                    }}
                    className="px-3 py-1.5 bg-[#C8A75A] hover:bg-[#B8974A] text-black font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    اعتماد السجل
                  </button>
                  <button
                    onClick={() => {
                      excludeRecord(item.entityType, item.entityId, "استبعاد يدوي من مركز المراجعة");
                      showToast("تم استبعاد السجل كمكرر/غير معتمد بنجاح", "info");
                    }}
                    className="px-3 py-1.5 bg-red-950/40 text-red-400 hover:bg-red-950/60 border border-red-900/30 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    استبعاد كمكرر
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
