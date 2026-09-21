import React, { useState, useMemo } from 'react';
import { 
  X, Search, Eye, AlertTriangle, CheckCircle2, ShieldAlert, Activity, 
  Layers, ArrowUpRight, Check, Trash2, ShieldCheck, FileText, Info, HelpCircle
} from 'lucide-react';
import { DataSnapshot, DiagnosticIssue } from '../utils/diagnosticEngine';
import { Customer, Contract, Sale, Payment, Quotation, Opportunity, Inquiry, Company, FollowUp, Interaction } from '../types';
import { classifyCustomer, CustomerClassification, ClassifiedCustomer } from '../utils/customerClassifier';

export interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityType: string;
  records: any[];
  snapshot: DataSnapshot;
  activeIssues: DiagnosticIssue[];
  classificationFilter?: 'all' | 'healthy' | 'needs_intervention' | 'active_sales_cycle' | 'no_contract_no_active_cycle' | 'unclassified';
  onReviewAction?: (entityType: string, recordId: string, action: string) => void;
}

// Strict sorting rule implementation (Rule 9)
export function sortRecords<T extends { id?: string; createdAt?: string; date?: string; businessDate?: string; eventDate?: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const dateA = a.businessDate || a.eventDate || a.date || "";
    const dateB = b.businessDate || b.eventDate || b.date || "";
    if (dateA && dateB) {
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // DESC
      }
    } else if (dateA) {
      return -1;
    } else if (dateB) {
      return 1;
    }

    const createdA = a.createdAt || "";
    const createdB = b.createdAt || "";
    if (createdA && createdB) {
      if (createdA !== createdB) {
        return dateB.localeCompare(dateA) || createdB.localeCompare(createdA); // DESC
      }
    } else if (createdA) {
      return -1;
    } else if (createdB) {
      return 1;
    }

    const idA = a.id || "";
    const idB = b.id || "";
    return idA.localeCompare(idB); // ASC
  });
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  isOpen,
  onClose,
  title,
  entityType,
  records,
  snapshot,
  activeIssues,
  classificationFilter = 'all',
  onReviewAction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localRecords, setLocalRecords] = useState<any[]>(records);

  // Sync state if records change
  React.useEffect(() => {
    setLocalRecords(records);
    if (records.length > 0) {
      setSelectedRecordId(records[0].id || records[0].customerId || records[0].scanId || null);
    } else {
      setSelectedRecordId(null);
    }
  }, [records]);

  // Classify all customers if entityType is Customer
  const classifiedCustomers = useMemo(() => {
    if (!isOpen || entityType !== 'Customer') return [];
    const custs = localRecords as Customer[];
    return custs.map(c => classifyCustomer(c, snapshot, activeIssues));
  }, [isOpen, entityType, localRecords, snapshot, activeIssues]);

  // Filter based on classification filter
  const filteredClassifiedCustomers = useMemo(() => {
    if (!isOpen || entityType !== 'Customer') return [];
    if (classificationFilter === 'all') return classifiedCustomers;
    return classifiedCustomers.filter(cc => cc.classification === classificationFilter);
  }, [isOpen, entityType, classifiedCustomers, classificationFilter]);

  // General filtering & search matching
  const finalRecords = useMemo(() => {
    if (!isOpen) return [];
    if (entityType === 'Customer') {
      const query = searchTerm.toLowerCase().trim();
      if (!query) return filteredClassifiedCustomers;
      return filteredClassifiedCustomers.filter(cc => 
        cc.customer.name.toLowerCase().includes(query) || 
        cc.customer.id.toLowerCase().includes(query) ||
        (cc.customer.phone && cc.customer.phone.includes(query))
      );
    }

    // Sort general records according to rule 9
    const sorted = sortRecords(localRecords);
    const query = searchTerm.toLowerCase().trim();
    if (!query) return sorted;
    return sorted.filter(rec => {
      const r = rec as any;
      const idStr = String(r.id || r.customerId || r.contractId || r.quoteNumber || '').toLowerCase();
      const nameStr = String(r.name || r.title || r.customerName || r.reason || '').toLowerCase();
      return idStr.includes(query) || nameStr.includes(query);
    });
  }, [isOpen, entityType, filteredClassifiedCustomers, localRecords, searchTerm]);

  // Get currently selected record
  const selectedRecord = useMemo(() => {
    if (!isOpen || !selectedRecordId) return null;
    if (entityType === 'Customer') {
      return classifiedCustomers.find(cc => cc.customer.id === selectedRecordId) || null;
    }
    return localRecords.find(rec => (rec.id || rec.customerId || rec.contractId || rec.scanId) === selectedRecordId) || null;
  }, [isOpen, selectedRecordId, entityType, classifiedCustomers, localRecords]);

  // Helper to render classification tag
  const renderClassificationBadge = (cls: CustomerClassification) => {
    switch (cls) {
      case 'healthy':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">✓ متعاقد / سليم (Healthy)</span>;
      case 'needs_intervention':
        return <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[10px]">⚠️ يحتاج تدخل (Needs Intervention)</span>;
      case 'active_sales_cycle':
        return <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold text-[10px]">🔄 مسار بيع نشط (Active Sales Cycle)</span>;
      case 'no_contract_no_active_cycle':
        return <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-bold text-[10px]">💤 لا توجد حركة (No active cycle)</span>;
      case 'unclassified':
      default:
        return <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold text-[10px]">❓ غير مصنف (UNCLASSIFIED)</span>;
    }
  };

  const handleDeleteRecord = (id: string) => {
    // Perform safety-controlled local deletion
    setLocalRecords(prev => prev.filter(r => (r.id || r.customerId || r.contractId || r.scanId) !== id));
    setConfirmDeleteId(null);
    if (selectedRecordId === id) {
      setSelectedRecordId(null);
    }
    if (onReviewAction) {
      onReviewAction(entityType, id, 'DELETE');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" dir="rtl">
      <div className="bg-[#121212] border border-[#292B2E] w-full max-w-7xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#18191B] border-b border-[#292B2E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-md font-black text-white">{title}</h2>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                فحص وتحليل تفصيلي للسجلات الفعلية | الكيان: <span className="font-mono text-zinc-300 font-bold">{entityType}</span> | العدد: <span className="text-amber-400 font-bold font-mono">{finalRecords.length} record(s)</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-[#A1A1AA] hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Split Screen */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Panel: Records Table/List with search */}
          <div className="w-full lg:w-[45%] border-l border-[#292B2E] flex flex-col bg-[#141517] overflow-hidden">
            
            {/* Search Input */}
            <div className="p-3 bg-[#18191B] border-b border-[#292B2E] flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو معرف السجل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#111112] border border-[#292B2E] text-white text-xs rounded-lg pr-9 pl-3 py-2 outline-none focus:border-[#C8A75A] font-semibold text-right"
                />
              </div>
            </div>

            {/* Records List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#292B2E]/50">
              {finalRecords.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Info className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-500">لم يتم العثور على أي سجل مطابق لخيارات البحث أو الفلترة.</p>
                </div>
              ) : (
                finalRecords.map((item, idx) => {
                  const itemId = item.customer?.id || item.id || item.customerId || item.contractId || item.scanId;
                  const isSelected = selectedRecordId === itemId;
                  
                  return (
                    <button
                      key={itemId || idx}
                      onClick={() => setSelectedRecordId(itemId)}
                      className={`w-full p-3.5 text-right flex flex-col gap-1.5 transition-all outline-none ${
                        isSelected 
                          ? 'bg-[#C8A75A]/10 border-r-4 border-r-[#C8A75A] bg-amber-500/5' 
                          : 'hover:bg-zinc-800/30'
                      }`}
                    >
                      {entityType === 'Customer' ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs text-white">
                              {item.customer.name}
                            </h4>
                            <span className="text-[10px] text-zinc-500 font-mono">#{item.customer.id}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-zinc-400">المنطقة: {item.customer.area || 'غير محدد'}</span>
                            {renderClassificationBadge(item.classification)}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs text-white">
                              {item.title || item.reason || item.contractNumber || item.quoteNumber || item.name || `سجل مالي ${itemId}`}
                            </h4>
                            <span className="text-[10px] text-zinc-500 font-mono font-bold">#{itemId}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-zinc-400">
                              {item.date || item.createdAt?.split('T')[0] || item.detectedAt?.split('T')[0] || 'تاريخ غير مسجل'}
                            </span>
                            <span className="text-[10px] font-bold text-amber-500 font-mono">
                              {item.totalValue ? `${Number(item.totalValue).toLocaleString()} ج.م` : 
                               item.amount ? `${Number(item.amount).toLocaleString()} ج.م` : 
                               item.totalAmount ? `${Number(item.totalAmount).toLocaleString()} ج.م` : 
                               item.severity || 'سجل صالح'}
                            </span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Detailed View */}
          <div className="flex-1 bg-[#121213] overflow-y-auto p-5">
            {selectedRecord ? (
              <div className="space-y-6">
                
                {/* Header Information */}
                <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-zinc-800 text-[#C8A75A] font-bold uppercase font-mono">
                      {entityType} REPORT CARD
                    </span>
                    <h3 className="text-md font-extrabold text-white mt-1.5">
                      {entityType === 'Customer' ? selectedRecord.customer.name : (selectedRecord.title || selectedRecord.contractNumber || selectedRecord.quoteNumber || selectedRecord.name || `معرف السجل: ${selectedRecordId}`)}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      المعرف الفريد للمستند: <span className="font-mono text-zinc-300 font-bold">{selectedRecordId}</span>
                    </p>
                  </div>
                  {entityType === 'Customer' && (
                    <div className="self-start sm:self-auto">
                      {renderClassificationBadge(selectedRecord.classification)}
                    </div>
                  )}
                </div>

                {/* Evidence & Diagnosis Breakdown (Why is this here?) */}
                <div className="bg-[#18191B] border border-[#292B2E] p-5 rounded-xl space-y-4">
                  <h4 className="text-xs font-black text-white flex items-center gap-2 border-b border-[#292B2E] pb-2">
                    <Activity className="w-4 h-4 text-[#C8A75A]" />
                    تحليل الأسباب والأدلة (Evidence & Logic Discovery)
                  </h4>

                  <div className="space-y-3">
                    <div className="text-xs bg-[#121213] p-3 rounded-lg border border-[#292B2E] space-y-1">
                      <span className="text-[10px] text-zinc-400 block font-bold">السبب التشخيصي لظهور السجل:</span>
                      <p className="text-zinc-200 font-semibold leading-relaxed">
                        {entityType === 'Customer' ? selectedRecord.reason : (selectedRecord.reason || 'هذا السجل تم إدراجه كجزء من الفحص لمراجعة تكامل البيانات في المنظومة.')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-[#141517] p-3 rounded-lg border border-[#292B2E]/50">
                        <span className="text-[10px] text-zinc-400 block">العقود المرتبطة</span>
                        <strong className="text-xs text-white font-mono">
                          {entityType === 'Customer' ? selectedRecord.contractsCount : (selectedRecord.contractNumber ? 1 : 0)} عقد
                        </strong>
                      </div>
                      <div className="bg-[#141517] p-3 rounded-lg border border-[#292B2E]/50">
                        <span className="text-[10px] text-zinc-400 block">الفرص البيعية</span>
                        <strong className="text-xs text-white font-mono">
                          {entityType === 'Customer' ? selectedRecord.oppsCount : 0} فرصة
                        </strong>
                      </div>
                      <div className="bg-[#141517] p-3 rounded-lg border border-[#292B2E]/50">
                        <span className="text-[10px] text-zinc-400 block">عروض الأسعار</span>
                        <strong className="text-xs text-white font-mono">
                          {entityType === 'Customer' ? selectedRecord.quotesCount : 0} عرض
                        </strong>
                      </div>
                    </div>

                    {/* Extended Evidence Details JSON view */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 block font-bold">أدلة التدقيق المستخلصة:</span>
                      <div className="bg-black/40 p-3 rounded-lg border border-[#292B2E] text-[10px] font-mono text-zinc-400 text-left overflow-x-auto" dir="ltr">
                        {entityType === 'Customer' ? (
                          <pre>{JSON.stringify(selectedRecord.evidence, null, 2)}</pre>
                        ) : (
                          <pre>{JSON.stringify({
                            id: selectedRecordId,
                            companyId: selectedRecord.companyId,
                            totalAmount: selectedRecord.totalAmount || selectedRecord.totalValue || selectedRecord.amount,
                            status: selectedRecord.status || selectedRecord.recordStatus,
                            customerId: selectedRecord.customerId,
                            relatedId: selectedRecord.contractId || selectedRecord.opportunityId || selectedRecord.inquiryId,
                            timestamp: selectedRecord.createdAt || selectedRecord.detectedAt || new Date().toISOString()
                          }, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Related Entities Map */}
                <div className="bg-[#18191B] border border-[#292B2E] p-5 rounded-xl space-y-3">
                  <h4 className="text-xs font-black text-white flex items-center gap-2 border-b border-[#292B2E] pb-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    الكيانات والمستندات ذات الصلة (Related Context)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {entityType === 'Customer' ? (
                      <>
                        <div className="bg-[#141517] p-2.5 rounded-lg border border-[#292B2E] flex justify-between items-center">
                          <span className="text-zinc-400">العقود النشطة:</span>
                          <span className="font-mono text-white font-bold">{selectedRecord.contractsCount}</span>
                        </div>
                        <div className="bg-[#141517] p-2.5 rounded-lg border border-[#292B2E] flex justify-between items-center">
                          <span className="text-zinc-400">الفواتير والمبيعات:</span>
                          <span className="font-mono text-white font-bold">{selectedRecord.salesCount}</span>
                        </div>
                        <div className="bg-[#141517] p-2.5 rounded-lg border border-[#292B2E] flex justify-between items-center">
                          <span className="text-zinc-400">الاستفسارات المسجلة:</span>
                          <span className="font-mono text-white font-bold">{selectedRecord.inquiriesCount}</span>
                        </div>
                        <div className="bg-[#141517] p-2.5 rounded-lg border border-[#292B2E] flex justify-between items-center">
                          <span className="text-zinc-400">عروض الأسعار النشطة:</span>
                          <span className="font-mono text-white font-bold">{selectedRecord.quotesCount}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {selectedRecord.customerId && (
                          <div className="bg-[#141517] p-2.5 rounded-lg border border-[#292B2E] flex justify-between items-center col-span-2">
                            <span className="text-zinc-400">العميل المرتبط بالبيانات:</span>
                            <span className="font-mono text-white font-bold">{selectedRecord.customerId}</span>
                          </div>
                        )}
                        {selectedRecord.contractId && (
                          <div className="bg-[#141517] p-2.5 rounded-lg border border-[#292B2E] flex justify-between items-center col-span-2">
                            <span className="text-zinc-400">العقد المرتبط بالبيانات:</span>
                            <span className="font-mono text-white font-bold">{selectedRecord.contractId}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Available Audit Actions */}
                <div className="bg-[#18191B] border border-[#292B2E] p-5 rounded-xl space-y-4">
                  <h4 className="text-xs font-black text-white flex items-center gap-2 border-b border-[#292B2E] pb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    الإجراءات التشغيلية المتاحة (Action Center)
                  </h4>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => alert(`تم تفعيل معاينة الكيان ${selectedRecordId} في نافذة Customer 360 الذكية.`)}
                      className="px-4 py-2 bg-[#C8A75A] hover:bg-[#d8b76a] text-black font-black text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      فتح العميل في Customer 360
                    </button>

                    {entityType === 'Customer' && selectedRecord.contractsCount > 0 && (
                      <button
                        onClick={() => alert(`معاينة العقد المرتبط بالعميل بنجاح.`)}
                        className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white border border-[#292B2E] text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        فتح العقد المرتبط
                      </button>
                    )}

                    {entityType === 'Customer' && selectedRecord.oppsCount > 0 && (
                      <button
                        onClick={() => alert(`معاينة الفرصة المبيعية المفتوحة للعميل.`)}
                        className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:text-white border border-[#292B2E] text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        فتح الفرصة البيعية
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (onReviewAction) {
                          onReviewAction(entityType, selectedRecordId!, 'MANUAL_REVIEW');
                        }
                        alert("تم تحديد السجل للمراجعة والتدقيق اليدوي في جلسة العمل الحالية.");
                      }}
                      className="px-4 py-2 bg-[#202225] border border-[#292B2E] text-[#EDEDED] hover:bg-zinc-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      اعتماد ومراجعة يدوية
                    </button>

                    {/* Safe Controlled Deletion Block */}
                    {confirmDeleteId === selectedRecordId ? (
                      <div className="flex items-center gap-2 bg-rose-950/40 p-2 rounded-xl border border-rose-900/30">
                        <span className="text-[10px] text-rose-300 font-bold px-2">هل أنت متأكد من الحذف؟</span>
                        <button
                          onClick={() => handleDeleteRecord(selectedRecordId!)}
                          className="px-3 py-1 bg-rose-600 text-white hover:bg-rose-700 font-bold text-[11px] rounded-lg cursor-pointer"
                        >
                          تأكيد الحذف نهائياً
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1 bg-zinc-800 text-zinc-300 font-bold text-[11px] rounded-lg cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(selectedRecordId)}
                        className="px-4 py-2 bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:bg-rose-950/80 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف السجل
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-3">
                <ShieldAlert className="w-12 h-12 text-zinc-600 animate-pulse" />
                <h4 className="font-bold text-sm text-zinc-400">يرجى اختيار سجل لمعاينته</h4>
                <p className="text-xs text-zinc-500 max-w-sm">قم بالضغط على أي من السجلات المعروضة في اللوحة الجانبية لفتح تفاصيل التشخيص والأدلة والتحليل المالي المرفق.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
