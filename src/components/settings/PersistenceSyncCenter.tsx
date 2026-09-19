import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Filter,
  Eye,
  Check,
  X,
  Server,
  Smartphone,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  globalPersistenceEngine,
  ChangeRecord,
  ChangeStatus,
  EntityType,
} from "../../dataLayer/persistenceEngine";

export const PersistenceSyncCenter: React.FC = () => {
  const { isCloudConnected, showToast } = useApp();
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [stats, setStats] = useState(globalPersistenceEngine.getStats());
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ChangeStatus | "all">("all");
  const [entityFilter, setEntityFilter] = useState<EntityType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConflict, setSelectedConflict] = useState<ChangeRecord | null>(null);
  const [selectedChangeDetails, setSelectedChangeDetails] = useState<ChangeRecord | null>(null);
  const [syncDetails, setSyncDetails] = useState<string[]>([]);

  const refreshData = () => {
    setChanges(globalPersistenceEngine.getAllChanges());
    setStats(globalPersistenceEngine.getStats());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = globalPersistenceEngine.subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncDetails([]);
    try {
      const res = await (window as any).syncPendingChangesGlobal?.();
      if (res) {
        setSyncDetails(res.details || []);
      }
      refreshData();
    } catch (err: any) {
      showToast("فشلت المزامنة: " + (err?.message || "خطأ غير معروف"), "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetrySingle = async (change: ChangeRecord) => {
    setIsSyncing(true);
    try {
      const { supabase } = await import("../../integrations/supabase/client");
      const res = await globalPersistenceEngine.executeChange(supabase, change);
      if (res.success) {
        showToast("تمت مزامنة التعديل بنجاح", "success");
      } else {
        showToast("فشلت إعادة المحاولة: " + res.message, "error");
      }
      refreshData();
    } catch (err: any) {
      showToast("فشلت العملية: " + (err?.message || "خطأ غير معروف"), "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResolveConflict = async (
    changeId: string,
    resolution: "keep_local" | "keep_cloud"
  ) => {
    const conflictChg = changes.find(c => c.id === changeId);
    
    globalPersistenceEngine.resolveConflict(changeId, resolution);
    setSelectedConflict(null);
    
    if (resolution === "keep_local") {
      showToast("تم اعتماد التعديل المحلي. جاري المزامنة مع السحابة...", "info");
      await handleSyncNow();
    } else {
       // keep_cloud: we need to revert local state to cloud state
       if (conflictChg?.conflictDetails?.cloudData) {
         try {
           const { supabase } = await import("../../integrations/supabase/client");
           // Trigger a refetch if we are discarding local
           // We can't directly mutate AppContext from here easily, but we can call a global refresh if it exists, or just tell user.
           if ((window as any).forceReloadAllData) {
             (window as any).forceReloadAllData();
             showToast("تم اعتماد نسخة السحابة وتم تحديث البيانات بنجاح", "success");
           } else {
             showToast("تم اعتماد نسخة السحابة. يرجى تحديث الصفحة لرؤية البيانات الأصلية.", "info");
           }
         } catch(e) {}
       } else {
         showToast("تم إلغاء التعديل المحلي واعتماد نسخة السحابة", "info");
       }
    }
    refreshData();
  };

  const filteredChanges = changes.filter((chg) => {
    if (statusFilter !== "all" && chg.status !== statusFilter) return false;
    if (entityFilter !== "all" && chg.entityType !== entityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = chg.description?.toLowerCase().includes(q);
      const matchUser = chg.userName?.toLowerCase().includes(q);
      const matchId = chg.recordId?.toLowerCase().includes(q);
      const matchErr = chg.errorMessage?.toLowerCase().includes(q);
      if (!matchDesc && !matchUser && !matchId && !matchErr) return false;
    }
    return true;
  });

  const getStatusBadge = (status: ChangeStatus) => {
    switch (status) {
      case "synced":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            متزامن
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            معلق
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            فشل الحفظ
          </span>
        );
      case "conflict":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            تعارض
          </span>
        );
    }
  };

  const getEntityNameAr = (type: EntityType) => {
    const map: Record<EntityType, string> = {
      customer: "عميل",
      inquiry: "استفسار",
      opportunity: "فرصة بيعية",
      quotation: "عرض سعر",
      contract: "عقد",
      sale: "مبيعات",
      payment: "تحصيل",
      followup: "متابعة",
      inspection: "معاينة",
      company: "شركة",
      user: "مستخدم",
      product: "منتج",
      interaction: "تواصل",
      task: "مهمة",
      bulk_operation: "عملية جماعية",
      import_operation: "استيراد بيانات",
      system_operation: "عملية نظام",
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header & Status Card */}
      <div className="bg-[#181A1D] border border-[#292B2E] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-[#292B2E]">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#C8A75A]">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#EDEDED]">
                  مركز المزامنة وسجل التعديلات الموحد
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  منظومة الحفظ الدائم لضمان عدم ضياع أي تعديل محلي والمزامنة التلقائية مع Supabase
                </p>
              </div>
            </div>
          </div>

          {/* Sync Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing || (stats.pending === 0 && stats.failed === 0)}
              className="px-4 py-2 bg-[#C8A75A] hover:bg-[#d8b76a] disabled:bg-[#202225] disabled:text-[#6B7280] text-[#111111] rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "جارٍ المزامنة..." : "مزامنة التعديلات المعلقة الآن (Sync Now)"}</span>
            </button>

            <button
              onClick={() => {
                globalPersistenceEngine.clearSynced();
                showToast("تم تنظيف السجلات المتزامنة بنجاح", "info");
              }}
              disabled={stats.synced === 0}
              className="px-3 py-2 bg-[#202225] hover:bg-[#292B2E] disabled:opacity-40 text-[#EDEDED] rounded-xl text-xs font-bold flex items-center gap-1.5 border border-[#292B2E] transition-all cursor-pointer disabled:cursor-not-allowed"
              title="مسح التعديلات المتزامنة بنجاح من السجل لتنظيف العرض"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#A1A1AA]" />
              <span>تنظيف المتزامن</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6">
          <div className="bg-[#121315] border border-[#292B2E] rounded-xl p-3 text-center">
            <span className="text-[11px] text-[#A1A1AA] block">إجمالي السجلات</span>
            <span className="text-lg font-black text-[#EDEDED]">{stats.total}</span>
          </div>

          <div className="bg-[#121315] border border-emerald-500/20 rounded-xl p-3 text-center">
            <span className="text-[11px] text-emerald-400 block flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> متزامن بنجاح
            </span>
            <span className="text-lg font-black text-emerald-400">{stats.synced}</span>
          </div>

          <div className="bg-[#121315] border border-amber-500/20 rounded-xl p-3 text-center">
            <span className="text-[11px] text-amber-400 block flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> بانتظار المزامنة
            </span>
            <span className="text-lg font-black text-amber-400">{stats.pending}</span>
          </div>

          <div className="bg-[#121315] border border-rose-500/20 rounded-xl p-3 text-center">
            <span className="text-[11px] text-rose-400 block flex items-center justify-center gap-1">
              <XCircle className="w-3 h-3" /> فشل الحفظ
            </span>
            <span className="text-lg font-black text-rose-400">{stats.failed}</span>
          </div>

          <div className="bg-[#121315] border border-purple-500/20 rounded-xl p-3 text-center">
            <span className="text-[11px] text-purple-400 block flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" /> تعارضات
            </span>
            <span className="text-lg font-black text-purple-400">{stats.conflict}</span>
          </div>
        </div>
      </div>

      {/* Sync Execution Details Output (if any) */}
      {syncDetails.length > 0 && (
        <div className="bg-[#181A1D] border border-emerald-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> نتائج عملية المزامنة الأخيرة:
            </span>
            <button
              onClick={() => setSyncDetails([])}
              className="text-[#A1A1AA] hover:text-[#EDEDED] text-xs"
            >
              إخفاء
            </button>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto text-xs font-mono text-[#EDEDED] bg-[#121315] p-2.5 rounded-lg border border-[#292B2E]">
            {syncDetails.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[#181A1D] p-1 rounded-xl border border-[#292B2E] overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "الكل", count: stats.total },
            { id: "pending", label: "معلق", count: stats.pending },
            { id: "failed", label: "فشل", count: stats.failed },
            { id: "conflict", label: "تعارض", count: stats.conflict },
            { id: "synced", label: "متزامن", count: stats.synced },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-[#C8A75A] text-[#111111]"
                  : "text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225]"
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-80 px-1 py-0.2 rounded-md bg-black/20">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Entity & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value as any)}
            className="h-9 px-3 text-xs rounded-xl border border-[#292B2E] bg-[#181A1D] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden"
          >
            <option value="all">كافة الكيانات</option>
            <option value="customer">العملاء</option>
            <option value="inquiry">الاستفسارات</option>
            <option value="opportunity">الفرص البيعية</option>
            <option value="quotation">عروض الأسعار</option>
            <option value="contract">العقود</option>
            <option value="sale">المبيعات</option>
            <option value="payment">التحصيلات</option>
            <option value="followup">المتابعات</option>
            <option value="inspection">المعاينات</option>
          </select>

          <input
            type="text"
            placeholder="بحث في سجل التعديلات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 px-3 text-xs rounded-xl border border-[#292B2E] bg-[#181A1D] text-[#EDEDED] focus:border-[#C8A75A] focus:outline-hidden w-full sm:w-48"
          />
        </div>
      </div>

      {/* Change Ledger Table */}
      <div className="bg-[#181A1D] border border-[#292B2E] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#121315] text-[#A1A1AA] border-b border-[#292B2E]">
              <tr>
                <th className="py-3 px-4 font-bold">وقت التعديل</th>
                <th className="py-3 px-4 font-bold">الكيان والعملية</th>
                <th className="py-3 px-4 font-bold">بيان التعديل</th>
                <th className="py-3 px-4 font-bold">المستخدم</th>
                <th className="py-3 px-4 font-bold text-center">الحالة</th>
                <th className="py-3 px-4 font-bold text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292B2E]">
              {filteredChanges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                    لا توجد تعديلات تطابق خيارات التصفية المحددة
                  </td>
                </tr>
              ) : (
                filteredChanges.map((chg) => (
                  <tr key={chg.id} className="hover:bg-[#202225]/50 transition-colors">
                    <td className="py-3 px-4 text-[#A1A1AA] font-mono whitespace-nowrap">
                      {new Date(chg.timestamp).toLocaleString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#EDEDED]">
                        {getEntityNameAr(chg.entityType)}
                      </span>
                      <span className="text-[10px] text-[#A1A1AA] block font-mono">
                        {chg.action === "insert"
                          ? "➕ إنشاء جديد"
                          : chg.action === "update"
                          ? "✏️ تعديل بيانات"
                          : "🗑️ حذف"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#EDEDED] line-clamp-1">
                        {chg.description}
                      </div>
                      {chg.errorMessage && (
                        <div className="text-[11px] text-rose-400 mt-0.5 line-clamp-1 font-mono">
                          ⚠️ خطأ: {chg.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA] whitespace-nowrap">
                      {chg.userName || "النظام"}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(chg.status)}
                    </td>
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {chg.status === "failed" && (
                          <button
                            onClick={() => handleRetrySingle(chg)}
                            disabled={isSyncing}
                            className="p-1.5 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 rounded-lg border border-amber-500/20 transition-all cursor-pointer"
                            title="إعادة محاولة المزامنة"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {chg.status === "conflict" && (
                          <button
                            onClick={() => setSelectedConflict(chg)}
                            className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="مراجعة وحل التعارض"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>حسم التعارض</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedChangeDetails(chg)}
                          className="p-1.5 hover:bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] rounded-lg border border-[#292B2E] transition-all cursor-pointer"
                          title="عرض تفاصيل التعديل"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            globalPersistenceEngine.removeChange(chg.id);
                            refreshData();
                          }}
                          className="p-1.5 hover:bg-rose-500/10 text-[#6B7280] hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                          title="حذف من السجل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#181A1D] border border-purple-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#292B2E]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-[#EDEDED]">
                    حسم تعارض البيانات (Data Conflict)
                  </h4>
                  <p className="text-xs text-[#A1A1AA]">
                    تم تعديل هذا السجل على السحابة بواسطة مستخدم آخر بعد وقت تعديلك المحلي
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#121315] border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> نسختك المحلية (Local)
                  </span>
                  <span className="text-[10px] text-[#A1A1AA]">
                    {new Date(selectedConflict.timestamp).toLocaleTimeString("ar-EG")}
                  </span>
                </div>
                <pre className="text-[11px] font-mono text-[#EDEDED] bg-[#181A1D] p-3 rounded-lg overflow-x-auto max-h-48 border border-[#292B2E]">
                  {JSON.stringify(selectedConflict.payload, null, 2)}
                </pre>
                <button
                  onClick={() => handleResolveConflict(selectedConflict.id, "keep_local")}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد نسختي وتحديث السحابة</span>
                </button>
              </div>

              <div className="bg-[#121315] border border-blue-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-4 h-4" /> نسخة السحابة (Cloud/DB)
                  </span>
                  <span className="text-[10px] text-[#A1A1AA]">السيرفر الحالي</span>
                </div>
                <pre className="text-[11px] font-mono text-[#EDEDED] bg-[#181A1D] p-3 rounded-lg overflow-x-auto max-h-48 border border-[#292B2E]">
                  {JSON.stringify(
                    selectedConflict.conflictDetails?.cloudData || "بيانات السحابة غير متاحة",
                    null,
                    2
                  )}
                </pre>
                <button
                  onClick={() => handleResolveConflict(selectedConflict.id, "keep_cloud")}
                  className="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد نسخة السحابة والتراجع</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Detail Viewer Modal */}
      {selectedChangeDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#181A1D] border border-[#292B2E] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#292B2E]">
              <h4 className="font-black text-base text-[#EDEDED]">
                تفاصيل السجل: {selectedChangeDetails.description}
              </h4>
              <button
                onClick={() => setSelectedChangeDetails(null)}
                className="text-[#A1A1AA] hover:text-[#EDEDED]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#121315] p-3 rounded-xl border border-[#292B2E]">
                <div>
                  <span className="text-[#A1A1AA] block">معرف السجل:</span>
                  <span className="font-mono text-[#EDEDED]">{selectedChangeDetails.recordId}</span>
                </div>
                <div>
                  <span className="text-[#A1A1AA] block">الحالة:</span>
                  <span className="font-bold">{getStatusBadge(selectedChangeDetails.status)}</span>
                </div>
                <div>
                  <span className="text-[#A1A1AA] block">المستخدم:</span>
                  <span className="text-[#EDEDED]">{selectedChangeDetails.userName || "النظام"}</span>
                </div>
                <div>
                  <span className="text-[#A1A1AA] block">عدد المحاولات:</span>
                  <span className="text-[#EDEDED]">{selectedChangeDetails.attempts || 0}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-[#EDEDED] block mb-1">
                  البيانات المرسلة (Payload):
                </span>
                <pre className="text-[11px] font-mono text-[#EDEDED] bg-[#121315] p-3 rounded-xl border border-[#292B2E] max-h-60 overflow-y-auto">
                  {JSON.stringify(selectedChangeDetails.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#292B2E]">
              <button
                onClick={() => setSelectedChangeDetails(null)}
                className="px-4 py-2 bg-[#202225] hover:bg-[#292B2E] text-[#EDEDED] rounded-xl text-xs font-bold cursor-pointer"
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
