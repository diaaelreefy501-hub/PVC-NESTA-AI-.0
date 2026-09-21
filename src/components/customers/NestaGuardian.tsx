import React, { useMemo } from 'react';
import { ShieldAlert, AlertCircle, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Database, Search, RefreshCw, Activity, Layers, Scale } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { analyzeCustomerJourney, generateGuardianSummary, GuardianStatus } from '../../utils/nestaIntelligence';
import { DiagnosticEngine } from '../../utils/diagnosticEngine';
import { DrillDownModal } from '../DrillDownModal';
import { classifyCustomer } from '../../utils/customerClassifier';

interface NestaGuardianProps {
  onFilterChange: (status: GuardianStatus | 'all') => void;
  currentFilter: GuardianStatus | 'all';
}

export const NestaGuardian: React.FC<NestaGuardianProps> = ({ onFilterChange, currentFilter }) => {
  const {
    companies,
    customers,
    followUps,
    quotations,
    contracts,
    opportunities,
    inquiries,
    inspections,
    sales,
    payments,
    runCustomerCoverageAudit
  } = useApp();
  const todayStr = new Date().toISOString().split('T')[0];

  const insights = useMemo(() => {
    return customers.map(c => analyzeCustomerJourney(c, followUps, quotations, contracts, opportunities, todayStr));
  }, [customers, followUps, quotations, contracts, opportunities, todayStr]);

  const rawSummary = useMemo(() => generateGuardianSummary(insights), [insights]);

  const snapshot = useMemo(() => ({
    snapshotId: `SNAP-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    source: 'GUARDIAN_UI',
    companyScope: 'All',
    recordCounts: {
      companies: companies.length,
      customers: customers.length,
      inquiries: inquiries.length,
      opportunities: opportunities.length,
      followups: followUps.length,
      quotations: quotations.length,
      contracts: contracts.length,
      sales: sales.length,
      payments: payments.length
    },
    companies,
    customers,
    inquiries,
    opportunities,
    followups: followUps,
    quotations,
    contracts,
    sales,
    payments
  }), [companies, customers, inquiries, opportunities, followUps, quotations, contracts, sales, payments]);

  const diagResult = useMemo(() => {
    return DiagnosticEngine.run(snapshot);
  }, [snapshot]);

  // Overriding summary based on exact and deterministic classified customers to sum to 88
  const classifiedCustomersList = useMemo(() => {
    return customers.map(c => classifyCustomer(c, snapshot, diagResult.issues));
  }, [customers, snapshot, diagResult.issues]);

  const summary = useMemo(() => {
    const healthy = classifiedCustomersList.filter(cc => cc.classification === 'healthy').length;
    const activeSales = classifiedCustomersList.filter(cc => cc.classification === 'active_sales_cycle').length;
    const intervention = classifiedCustomersList.filter(cc => cc.classification === 'needs_intervention').length;
    const noActive = classifiedCustomersList.filter(cc => cc.classification === 'no_contract_no_active_cycle' || cc.classification === 'unclassified').length;

    return {
      healthyCount: healthy,
      needsFollowupCount: activeSales,
      interventionCount: intervention,
      conflictCount: noActive
    };
  }, [classifiedCustomersList]);

  const [auditRunning, setAuditRunning] = React.useState(false);
  const [auditResult, setAuditResult] = React.useState<{ dbCount: number, visibleCount: number, hiddenCount: number, issues: any[] } | null>(null);

  const [integrityRunning, setIntegrityRunning] = React.useState(false);
  const [integrityIssues, setIntegrityIssues] = React.useState<any[]>([]);

  // Drill Down State
  const [drillDown, setDrillDown] = React.useState<{
    isOpen: boolean;
    title: string;
    entityType: string;
    records: any[];
    classificationFilter?: 'all' | 'healthy' | 'needs_intervention' | 'active_sales_cycle' | 'no_contract_no_active_cycle' | 'unclassified';
  }>({
    isOpen: false,
    title: '',
    entityType: '',
    records: []
  });

  const runCoverageAudit = async () => {
    setAuditRunning(true);
    setAuditResult(null);
    try {
      const result = await runCustomerCoverageAudit();
      setAuditResult(result);
    } catch (err: any) {
      alert("فشل الفحص: " + err.message);
    } finally {
      setAuditRunning(false);
    }
  };

  const handleCardClick = (cardId: string, label: string) => {
    let filterVal: any = 'all';
    if (cardId === 'healthy') filterVal = 'healthy';
    else if (cardId === 'needs_followup') filterVal = 'active_sales_cycle';
    else if (cardId === 'intervention_required') filterVal = 'needs_intervention';
    else if (cardId === 'conflict') filterVal = 'no_contract_no_active_cycle';

    setDrillDown({
      isOpen: true,
      title: `مراجعة وتدقيق جودة العملاء: ${label}`,
      entityType: 'Customer',
      records: customers,
      classificationFilter: filterVal
    });
  };

  const cards = [
    { id: 'healthy', label: 'سليم (Healthy)', count: summary.healthyCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-[#18191B]', border: 'border-emerald-500/30' },
    { id: 'needs_followup', label: 'مسار بيع نشط (Active Sales)', count: summary.needsFollowupCount, icon: AlertCircle, color: 'text-blue-400', bg: 'bg-[#18191B]', border: 'border-blue-500/30' },
    { id: 'intervention_required', label: 'يحتاج تدخل (Intervention)', count: summary.interventionCount, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-[#18191B]', border: 'border-rose-500/30' },
    { id: 'conflict', label: 'خامل / لا توجد حركة', count: summary.conflictCount, icon: ShieldAlert, color: 'text-purple-400', bg: 'bg-[#18191B]', border: 'border-purple-500/30' },
  ];

  return (
    <div className="bg-[#121212] p-5 rounded-2xl border border-[#292B2E] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-black text-[#EDEDED] tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-[#C8A75A]" />
              NESTA Guardian
            </h2>
            <p className="text-sm text-[#A1A1AA] mt-1">مراقبة ذكية لصحة بيانات العملاء والمسار التشغيلي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* General 88 Customers Drill-down clickable badge */}
          <button
            onClick={() => setDrillDown({
              isOpen: true,
              title: "مراجعة وفحص كافة العملاء المسجلين",
              entityType: "Customer",
              records: customers,
              classificationFilter: "all"
            })}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-[#292B2E] shadow-xs"
          >
            جميع العملاء المسجلين: <strong className="text-amber-400 font-mono">{customers.length}</strong>
          </button>
          
          {currentFilter !== 'all' && (
            <button
              onClick={() => onFilterChange('all')}
              className="flex items-center gap-1.5 text-xs font-bold text-[#111111] bg-[#C8A75A] px-3 py-2 rounded-xl hover:bg-[#d8b76a] transition-colors shadow-2xs"
            >
              إلغاء الفلتر
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id, card.label)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${card.bg} ${card.border} hover:border-[#C8A75A]/60 hover:shadow-[0_0_12px_rgba(200,167,90,0.05)] cursor-pointer`}
          >
            <div className={`p-2 rounded-lg bg-black/40 ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[#A1A1AA]">{card.label}</p>
              <p className={`text-2xl font-black ${card.color}`}>{card.count}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Unified Diagnostic & Reconciliation Panel */}
      <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-[#EDEDED] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#C8A75A] animate-pulse" />
              <span>محرك التشخيص الموحد — Diagnostic Engine Report</span>
            </h3>
            <p className="text-[10px] text-[#A1A1AA]">
              معرف الفحص: <strong className="font-mono text-white">{diagResult.scanId}</strong> | نطاق الشركات: <span className="text-zinc-300">{diagResult.companiesScope}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border ${
              diagResult.issues.length > 0
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}>
              حالة النظام: {diagResult.issues.length > 0 ? "تنبيه (ATTENTION)" : "سليم (HEALTHY)"}
            </span>
            <button
              onClick={() => setDrillDown({
                isOpen: true,
                title: "تقرير القضايا والانتهاكات المكتشفة بالمنظومة",
                entityType: "Issue",
                records: diagResult.issues
              })}
              className="px-2 py-1 bg-zinc-800 text-zinc-300 border border-[#292B2E] text-[10px] font-bold rounded-lg hover:bg-zinc-700 transition-all cursor-pointer"
            >
              قضايا: {diagResult.issues.length} 🔍
            </button>
          </div>
        </div>

        {/* Reconciliation Status Items */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-[#292B2E] pt-3">
          {diagResult.reconciliations.map((recon, idx) => (
            <button
              key={idx}
              onClick={() => {
                let entity = 'Contract';
                let recs = contracts;
                if (recon.source.includes('البيع')) {
                  entity = 'Sale';
                  recs = sales;
                } else if (recon.source.includes('الدفعة')) {
                  entity = 'Payment';
                  recs = payments;
                } else if (recon.source.includes('العرض')) {
                  entity = 'Quotation';
                  recs = quotations;
                }
                setDrillDown({
                  isOpen: true,
                  title: `مراجعة مطابقة ومزامنة: ${recon.source} ↔ ${recon.target}`,
                  entityType: entity,
                  records: recs
                });
              }}
              className="bg-[#141517] border border-[#292B2E] hover:border-[#C8A75A]/40 p-2.5 rounded-xl text-right transition-all cursor-pointer"
            >
              <span className="text-[10px] text-[#A1A1AA] block">{recon.source} ↔ {recon.target}</span>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[11px] font-black ${
                  recon.status === "PASS" ? "text-emerald-400" : recon.status === "FAIL" ? "text-rose-400" : "text-amber-400"
                }`}>
                  {recon.status === "PASS" ? "✓ مطابق" : "⚠️ يحتاج مراجعة"}
                </span>
                <span className="text-[10px] text-[#6B7280] font-mono">{recon.recordsPassed}/{recon.recordsChecked}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Coverage Audit Section */}
      <div className="mt-4 pt-4 border-t border-[#292B2E]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#EDEDED] flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              Customer Coverage Audit (DB vs UI)
            </h3>
            <p className="text-xs text-[#A1A1AA]">تأكد من أن جميع العملاء في السحابة يظهرون بشكل صحيح في البرنامج</p>
          </div>
          <button
            onClick={runCoverageAudit}
            disabled={auditRunning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {auditRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {auditRunning ? 'جاري الفحص...' : 'بدء الفحص الشامل'}
          </button>
        </div>
        
        {auditResult && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <button
              onClick={() => setDrillDown({
                isOpen: true,
                title: "مراجعة ملفات عملاء قاعدة البيانات (DB)",
                entityType: "Customer",
                records: customers
              })}
              className="bg-[#18191B] hover:bg-zinc-800 p-3 rounded-xl border border-[#292B2E] text-right cursor-pointer"
            >
              <p className="text-xs text-[#A1A1AA]">العملاء في قاعدة البيانات (DB)</p>
              <p className="text-lg font-black text-[#EDEDED]">{auditResult.dbCount}</p>
            </button>
            <button
              onClick={() => setDrillDown({
                isOpen: true,
                title: "مراجعة العملاء المحملين بالكامل في الواجهة (UI)",
                entityType: "Customer",
                records: customers
              })}
              className="bg-[#18191B] hover:bg-zinc-800 p-3 rounded-xl border border-[#292B2E] text-right cursor-pointer"
            >
              <p className="text-xs text-[#A1A1AA]">العملاء المحملين (UI)</p>
              <p className="text-lg font-black text-emerald-400">{auditResult.visibleCount}</p>
            </button>
            <div className={`p-3 rounded-xl border text-right ${auditResult.hiddenCount > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#18191B] border-[#292B2E]'}`}>
              <p className="text-xs text-[#A1A1AA]">العملاء المختفين (Hidden)</p>
              <p className={`text-lg font-black ${auditResult.hiddenCount > 0 ? 'text-rose-400' : 'text-[#EDEDED]'}`}>{auditResult.hiddenCount}</p>
            </div>
          </div>
        )}
        
        {auditResult && auditResult.issues.length > 0 && (
          <div className="mt-3 space-y-2">
            {auditResult.issues.map((issue, idx) => (
              <div key={idx} className="flex items-center justify-between bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-xs">
                <div>
                  <strong className="text-rose-400 block">{issue.name || 'بدون اسم'}</strong>
                  <span className="text-rose-300">{issue.reason}</span>
                </div>
                <span className="text-[10px] text-[#6B7280] font-mono">{issue.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drill Down Modal Integration */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        entityType={drillDown.entityType}
        records={drillDown.records}
        snapshot={snapshot}
        activeIssues={diagResult.issues}
        classificationFilter={drillDown.classificationFilter}
      />
    </div>
  );
};
