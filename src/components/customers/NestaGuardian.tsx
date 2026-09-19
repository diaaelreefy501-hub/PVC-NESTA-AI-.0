import React, { useMemo } from 'react';
import { ShieldAlert, AlertCircle, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Database, Search, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { analyzeCustomerJourney, generateGuardianSummary, GuardianStatus } from '../../utils/nestaIntelligence';

interface NestaGuardianProps {
  onFilterChange: (status: GuardianStatus | 'all') => void;
  currentFilter: GuardianStatus | 'all';
}

export const NestaGuardian: React.FC<NestaGuardianProps> = ({ onFilterChange, currentFilter }) => {
  const { customers, followUps, quotations, contracts, opportunities, inquiries, runCustomerCoverageAudit } = useApp();
  const todayStr = new Date().toISOString().split('T')[0];

  const insights = useMemo(() => {
    return customers.map(c => analyzeCustomerJourney(c, followUps, quotations, contracts, opportunities, todayStr));
  }, [customers, followUps, quotations, contracts, opportunities, todayStr]);

  const summary = useMemo(() => generateGuardianSummary(insights), [insights]);

  const [auditRunning, setAuditRunning] = React.useState(false);
  const [auditResult, setAuditResult] = React.useState<{ dbCount: number, visibleCount: number, hiddenCount: number, issues: any[] } | null>(null);

  
  const [integrityRunning, setIntegrityRunning] = React.useState(false);
  const [integrityIssues, setIntegrityIssues] = React.useState<any[]>([]);

  const runDataIntegrityCheck = () => {
    setIntegrityRunning(true);
    setTimeout(() => {
      const issues = [];
      const customerIds = new Set(customers.map(c => c.id));
      
      // Check orphan inquiries
      inquiries?.forEach(inq => {
        if (!customerIds.has(inq.customerId)) {
          issues.push({ type: 'orphan_inquiry', id: inq.id, desc: 'استفسار غير مرتبط بعميل موجود' });
        }
      });
      
      // Check orphan followUps
      followUps?.forEach(f => {
        if (!customerIds.has(f.customerId)) {
           issues.push({ type: 'orphan_followup', id: f.id, desc: 'متابعة غير مرتبطة بعميل موجود' });
        }
      });
      
      // Check orphan opportunities
      opportunities?.forEach(o => {
        if (!customerIds.has(o.customerId)) {
           issues.push({ type: 'orphan_opportunity', id: o.id, desc: 'فرصة بيعية غير مرتبطة بعميل موجود' });
        }
      });
      
      // Check orphan contracts
      contracts?.forEach(c => {
        if (!customerIds.has(c.customerId)) {
           issues.push({ type: 'orphan_contract', id: c.id, desc: 'عقد بيع غير مرتبط بعميل موجود' });
        }
      });
      
      setIntegrityIssues(issues);
      setIntegrityRunning(false);
    }, 500);
  };

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


  const cards = [
    { id: 'healthy', label: 'سليم', count: summary.healthyCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-[#18191B]', border: 'border-emerald-500/30', filter: 'healthy' as const },
    { id: 'needs_followup', label: 'يحتاج متابعة', count: summary.needsFollowupCount, icon: AlertCircle, color: 'text-amber-400', bg: 'bg-[#18191B]', border: 'border-amber-500/30', filter: 'needs_followup' as const },
    { id: 'intervention_required', label: 'يحتاج تدخل', count: summary.interventionCount, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-[#18191B]', border: 'border-rose-500/30', filter: 'intervention_required' as const },
    { id: 'conflict', label: 'تعارض / مزامنة', count: summary.conflictCount, icon: ShieldAlert, color: 'text-purple-400', bg: 'bg-[#18191B]', border: 'border-purple-500/30', filter: 'conflict' as const },
  ];

  return (
    <div className="bg-[#121212] p-5 rounded-2xl border border-[#292B2E] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#EDEDED] tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#C8A75A]" />
            NESTA Guardian
          </h2>
          <p className="text-sm text-[#A1A1AA] mt-1">مراقبة ذكية لصحة بيانات العملاء والمسار التشغيلي</p>
        </div>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => onFilterChange(currentFilter === card.filter ? 'all' : card.filter)}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${card.bg} ${card.border} ${currentFilter === card.filter ? 'ring-1 ring-[#C8A75A] shadow-[0_0_15px_rgba(200,167,90,0.15)]' : 'hover:border-slate-600'}`}
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
            <div className="bg-[#18191B] p-3 rounded-xl border border-[#292B2E]">
              <p className="text-xs text-[#A1A1AA]">العملاء في قاعدة البيانات (DB)</p>
              <p className="text-lg font-black text-[#EDEDED]">{auditResult.dbCount}</p>
            </div>
            <div className="bg-[#18191B] p-3 rounded-xl border border-[#292B2E]">
              <p className="text-xs text-[#A1A1AA]">العملاء المحملين (UI)</p>
              <p className="text-lg font-black text-emerald-400">{auditResult.visibleCount}</p>
            </div>
            <div className={`p-3 rounded-xl border ${auditResult.hiddenCount > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#18191B] border-[#292B2E]'}`}>
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

    </div>
    </div>
  );
};
