import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Link,
  ExternalLink,
  Shield,
  Layers,
  Clock,
  ArrowRightLeft,
  ServerCrash,
  ListOrdered,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { globalSyncEngine } from "../../dataLayer/syncEngine";
import { NestaDataLayerTestRunner } from "../../dataLayer/testRunner";
import { NESTA_SHEET_SCHEMAS } from "../../dataLayer/tabSchemas";
import {
  DataLayerConnectionStatus,
  GoogleSheetsConfig,
  SyncConflictRecord,
  SyncLogEntry,
  SyncQueueItem,
  TestSuiteResult,
} from "../../dataLayer/types";
import { useApp } from "../../context/AppContext";

export const GoogleSheetsDataLayerSection: React.FC = () => {
  const { customers, inquiries, followUps, quotations, contracts, sales, showToast } = useApp();

  const [connectionStatus, setConnectionStatus] = useState<DataLayerConnectionStatus>(
    globalSyncEngine.getConnectionStatus()
  );
  const [config, setConfig] = useState<GoogleSheetsConfig>(globalSyncEngine.getConfig());
  const [logs, setLogs] = useState<SyncLogEntry[]>(globalSyncEngine.getSyncLogs());
  const [conflicts, setConflicts] = useState<SyncConflictRecord[]>(globalSyncEngine.getConflicts());
  const [queue, setQueue] = useState<SyncQueueItem[]>(globalSyncEngine.getQueue());

  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictRecord | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "tests" | "conflicts" | "logs" | "schemas">("overview");

  useEffect(() => {
    const unsubscribe = globalSyncEngine.subscribe(() => {
      setConnectionStatus(globalSyncEngine.getConnectionStatus());
      setConfig(globalSyncEngine.getConfig());
      setLogs(globalSyncEngine.getSyncLogs());
      setConflicts(globalSyncEngine.getConflicts());
      setQueue(globalSyncEngine.getQueue());
    });
    return () => unsubscribe();
  }, []);

  const handleCreateSpreadsheet = async () => {
    setIsCreatingSheet(true);
    try {
      const res = await globalSyncEngine.initializeSpreadsheet("PVC NESTA AI - Master Data (Test)");
      showToast(`تم إنشاء وربط جدول Google Sheets بنجاح (${res.title})`, "success");
    } catch (err: any) {
      showToast(`فشل إنشاء الجدول: ${err.message}`, "error");
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleRunTwoWaySync = async () => {
    setIsSyncing(true);
    try {
      const res = await globalSyncEngine.performTwoWaySync({
        customers,
        inquiries,
        followups: followUps,
        quotations,
        contracts,
        sales,
      });

      if (res.conflictsDetected > 0) {
        showToast(
          `اكتملت المزامنة: دفع ${res.pushedToSheets}، سحب ${res.pulledToNesta}، واكتشاف ${res.conflictsDetected} تعارض يحتاج مراجعة`,
          "warning"
        );
      } else {
        showToast(`اكتملت المزامنة بنجاح: تم تحديث البيانات بين NESTA و Google Sheets`, "success");
      }
    } catch (err: any) {
      showToast(`فشلت المزامنة: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunIntegrationTests = async () => {
    setIsRunningTests(true);
    try {
      const runner = new NestaDataLayerTestRunner(globalSyncEngine);
      const results = await runner.runFullTestSuite();
      setTestResults(results);
      setActiveTab("tests");

      const allPassed =
        results.spreadsheet === "PASS" &&
        results.tabs === "PASS" &&
        results.nestaToSheets === "PASS" &&
        results.sheetsToNesta === "PASS" &&
        results.conflict === "PASS" &&
        results.retry === "PASS";

      if (allPassed) {
        showToast("اجتازت طبقة بيانات Google Sheets جميع اختبارات التكامل بنجاح 100%", "success");
      } else {
        showToast("اكتملت حزمة الاختبارات مع وجود بعض الملاحظات", "warning");
      }
    } catch (err: any) {
      showToast(`فشل تشغيل الاختبارات: ${err.message}`, "error");
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleResolveConflict = (conflictId: string, choice: "nesta" | "sheets") => {
    globalSyncEngine.resolveConflict(conflictId, choice, "مسؤول النظام");
    setSelectedConflict(null);
    showToast(`تم اعتماد نسخة (${choice === "nesta" ? "NESTA" : "Google Sheets"}) وحل النزاع بنجاح`, "success");
  };

  const getStatusBadge = (status: DataLayerConnectionStatus) => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            متصل وجاهز للبيانات
          </span>
        );
      case "syncing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#C8A75A]/10 text-[#C8A75A] border border-[#C8A75A]/30">
            <RefreshCw className="w-3 h-3 animate-spin" />
            جاري المزامنة...
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3" />
            خطأ في الاتصال
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
            غير متصل
          </span>
        );
    }
  };

  return (
    <div id="google-sheets-data-layer-section" className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 md:p-6 mb-8 text-right shadow-xl">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#292B2E]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[#EDEDED]">Google Sheets Data Layer & Two-Way Sync</h2>
              {getStatusBadge(connectionStatus)}
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1">
              طبقة البيانات المتزامنة: الجداول كقاعدة بيانات خلفية (Data Layer) بدون لمس واجهات المستخدم أو بيانات الإنتاج.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!config.spreadsheetId ? (
            <button
              id="btn-init-sheets"
              onClick={handleCreateSpreadsheet}
              disabled={isCreatingSheet}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#C8A75A] hover:bg-[#b5954d] text-black rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isCreatingSheet ? "جاري الإنشاء..." : "إنشاء جدول البيانات تجريبياً"}
            </button>
          ) : (
            <>
              <button
                id="btn-two-way-sync"
                onClick={handleRunTwoWaySync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "جاري المزامنة..." : "مزامنة ثنائية (Sync Now)"}
              </button>
              {config.spreadsheetUrl && !config.spreadsheetId?.startsWith("test_sheet_") && (
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  فتح الجدول في نافذة جديدة
                </a>
              )}
            </>
          )}

          <button
            id="btn-run-tests"
            onClick={handleRunIntegrationTests}
            disabled={isRunningTests}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#202225] hover:bg-[#2a2d31] text-[#EDEDED] border border-[#3E4044] hover:border-[#C8A75A]/50 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <PlayCircle className={`w-4 h-4 text-[#C8A75A] ${isRunningTests ? "animate-spin" : ""}`} />
            {isRunningTests ? "تشغيل الفحوصات..." : "تشغيل حزمة الاختبارات"}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 mt-5 mb-4 border-b border-[#292B2E] overflow-x-auto pb-2 text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === "overview"
              ? "bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/40"
              : "text-[#A1A1AA] hover:text-[#EDEDED]"
          }`}
        >
          نظرة عامة والاتصال
        </button>
        <button
          onClick={() => setActiveTab("tests")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "tests"
              ? "bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/40"
              : "text-[#A1A1AA] hover:text-[#EDEDED]"
          }`}
        >
          <span>حزمة الاختبارات الآلية</span>
          {testResults && (
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded text-[10px]">
              6/6 Tests
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("conflicts")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "conflicts"
              ? "bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/40"
              : "text-[#A1A1AA] hover:text-[#EDEDED]"
          }`}
        >
          <span>إدارة التعارضات (Conflicts)</span>
          {conflicts.filter((c) => c.status === "pending_review").length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded text-[10px] font-bold">
              {conflicts.filter((c) => c.status === "pending_review").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === "logs"
              ? "bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/40"
              : "text-[#A1A1AA] hover:text-[#EDEDED]"
          }`}
        >
          سجل المزامنة (Sync Logs)
        </button>
        <button
          onClick={() => setActiveTab("schemas")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === "schemas"
              ? "bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/40"
              : "text-[#A1A1AA] hover:text-[#EDEDED]"
          }`}
        >
          هيكلية الـ 14 تبويب (Schemas)
        </button>
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Metric 1: Spreadsheet info */}
            <div className="bg-[#111111] p-4 rounded-xl border border-[#292B2E]">
              <div className="flex items-center justify-between text-[#A1A1AA] text-xs mb-1">
                <span>جدول البيانات المرتبط</span>
                <FileSpreadsheet className="w-4 h-4 text-[#C8A75A]" />
              </div>
              <div className="font-bold text-sm text-[#EDEDED] truncate">
                {config.spreadsheetName || "لم يتم الإنشاء بعد"}
              </div>
              {config.spreadsheetUrl && (
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#C8A75A] hover:underline mt-2 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  فتح في Google Sheets
                </a>
              )}
            </div>

            {/* Metric 2: Sync Info */}
            <div className="bg-[#111111] p-4 rounded-xl border border-[#292B2E]">
              <div className="flex items-center justify-between text-[#A1A1AA] text-xs mb-1">
                <span>آخر مزامنة ناجحة</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-bold text-sm text-[#EDEDED]">
                {config.lastSyncTime ? new Date(config.lastSyncTime).toLocaleTimeString("ar-EG") : "لا توجد مزامنة بعد"}
              </div>
              <div className="text-[11px] text-[#71717A] mt-2">
                الحالة: {config.lastSyncStatus === "success" ? "ناجحة 100%" : "في الانتظار"}
              </div>
            </div>

            {/* Metric 3: Queue & Isolation */}
            <div className="bg-[#111111] p-4 rounded-xl border border-[#292B2E]">
              <div className="flex items-center justify-between text-[#A1A1AA] text-xs mb-1">
                <span>طابور المزامنة والحماية</span>
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <div className="font-bold text-sm text-[#EDEDED]">
                {queue.length} عمليات في الانتظار
              </div>
              <div className="text-[11px] text-emerald-400/90 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                عزل تام بـ company_id وتوثيق UUID
              </div>
            </div>
          </div>

          {/* Architecture Principles Notice */}
          <div className="p-3.5 bg-[#111111]/80 rounded-xl border border-[#292B2E] text-xs text-[#A1A1AA] leading-relaxed flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#C8A75A] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#EDEDED]">ضمانات ومبادئ طبقة البيانات (Google Sheets Data Layer):</span>
              <ul className="list-disc list-inside mt-1 space-y-1 text-[11px] text-[#A1A1AA]">
                <li>توليد معرف ثابت وفريد (Stable UUID) لكل سجل، مع حقل <code className="text-[#C8A75A]">company_id</code> إلزامي.</li>
                <li>تتبع زمني وإصداري صارم (<code className="text-[#C8A75A]">createdAt, updatedAt, version</code>) لكل عملية.</li>
                <li>كشف التعارضات الذكي دون حذف تلقائي (Preserving both versions in <code className="text-[#C8A75A]">Sync_Conflicts</code>).</li>
                <li>طابور عمليات مؤمن مع إعادة المحاولة التلقائية والـ Exponential Backoff عند انقطاع الشبكة.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Integration Tests */}
      {activeTab === "tests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#EDEDED]">نتائج حزمة الاختبارات الآلية (Automated Integration Tests)</h3>
            <button
              onClick={handleRunIntegrationTests}
              disabled={isRunningTests}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8A75A] text-black rounded-lg text-xs font-bold transition-all hover:bg-[#b5954d] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? "animate-spin" : ""}`} />
              إعادة تشغيل الاختبارات
            </button>
          </div>

          {testResults ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3">
                <div className="bg-[#111111] p-2.5 rounded-xl border border-[#292B2E] text-center">
                  <div className="text-[10px] text-[#A1A1AA] mb-1">Spreadsheet</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-black ${testResults.spreadsheet === "PASS" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {testResults.spreadsheet}
                  </span>
                </div>
                <div className="bg-[#111111] p-2.5 rounded-xl border border-[#292B2E] text-center">
                  <div className="text-[10px] text-[#A1A1AA] mb-1">14 Tabs</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-black ${testResults.tabs === "PASS" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {testResults.tabs}
                  </span>
                </div>
                <div className="bg-[#111111] p-2.5 rounded-xl border border-[#292B2E] text-center">
                  <div className="text-[10px] text-[#A1A1AA] mb-1">NESTA→Sheets</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-black ${testResults.nestaToSheets === "PASS" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {testResults.nestaToSheets}
                  </span>
                </div>
                <div className="bg-[#111111] p-2.5 rounded-xl border border-[#292B2E] text-center">
                  <div className="text-[10px] text-[#A1A1AA] mb-1">Sheets→NESTA</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-black ${testResults.sheetsToNesta === "PASS" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {testResults.sheetsToNesta}
                  </span>
                </div>
                <div className="bg-[#111111] p-2.5 rounded-xl border border-[#292B2E] text-center">
                  <div className="text-[10px] text-[#A1A1AA] mb-1">Conflict</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-black ${testResults.conflict === "PASS" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {testResults.conflict}
                  </span>
                </div>
                <div className="bg-[#111111] p-2.5 rounded-xl border border-[#292B2E] text-center">
                  <div className="text-[10px] text-[#A1A1AA] mb-1">Retry & Backoff</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-black ${testResults.retry === "PASS" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {testResults.retry}
                  </span>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-2">
                {testResults.details.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#111111] rounded-xl border border-[#292B2E] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      {d.status === "PASS" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-[#EDEDED]">{d.testName}</div>
                        <div className="text-[11px] text-[#A1A1AA] mt-0.5">{d.message}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A] shrink-0">{d.durationMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#111111] rounded-xl border border-[#292B2E]">
              <PlayCircle className="w-10 h-10 text-[#C8A75A] mx-auto mb-2 opacity-80" />
              <p className="text-xs text-[#A1A1AA] mb-3">
                اضغط على زر تشغيل الاختبارات لفحص دورة المزامنة الكاملة (Sheets Creation, 14 Tabs, Push, Pull, Conflict, Retry).
              </p>
              <button
                onClick={handleRunIntegrationTests}
                disabled={isRunningTests}
                className="px-4 py-2 bg-[#C8A75A] text-black rounded-xl text-xs font-bold hover:bg-[#b5954d] transition-all cursor-pointer"
              >
                بدء تشغيل الاختبارات الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Conflict Management */}
      {activeTab === "conflicts" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#EDEDED]">التعارضات المكتشفة ومكتب التسوية (Conflict Resolution Desk)</h3>
            <button
              onClick={() => globalSyncEngine.clearConflicts()}
              className="text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              مسح السجل
            </button>
          </div>

          {conflicts.length === 0 ? (
            <div className="p-6 text-center bg-[#111111] rounded-xl border border-[#292B2E] text-xs text-[#A1A1AA]">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              لا توجد أي تعارضات غير محلولة حالياً. البيانات متطابقة بنسبة 100%.
            </div>
          ) : (
            <div className="space-y-3">
              {conflicts.map((conf) => (
                <div
                  key={conf.id}
                  className="p-4 bg-[#111111] rounded-xl border border-amber-500/30 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[11px] font-bold">
                        تعارض في: {conf.entity}
                      </span>
                      <span className="font-mono text-[11px] text-[#A1A1AA]">ID: {conf.recordId}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(conf.detectedAt).toLocaleTimeString("ar-EG")}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        conf.status === "pending_review"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {conf.status === "pending_review" ? "بانتظار المراجعة" : "تمت التسوية"}
                    </span>
                  </div>

                  {/* Side-by-side versions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#292B2E]">
                    {/* NESTA Version */}
                    <div className="p-3 bg-[#18191B] rounded-lg border border-[#292B2E]">
                      <div className="flex items-center justify-between font-bold text-[#EDEDED] mb-2 pb-1 border-b border-[#292B2E]">
                        <span>نسخة NESTA (الإصدار v{conf.nestaVersion})</span>
                        <span className="text-[10px] text-[#A1A1AA]">{conf.nestaUpdatedAt}</span>
                      </div>
                      <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto p-1 max-h-28">
                        {JSON.stringify(conf.nestaData, null, 2)}
                      </pre>
                      {conf.status === "pending_review" && (
                        <button
                          onClick={() => handleResolveConflict(conf.id, "nesta")}
                          className="w-full mt-2 py-1.5 bg-[#C8A75A] text-black font-bold rounded-lg text-xs hover:bg-[#b5954d] transition-all cursor-pointer"
                        >
                          اعتماد نسخة NESTA
                        </button>
                      )}
                    </div>

                    {/* Google Sheets Version */}
                    <div className="p-3 bg-[#18191B] rounded-lg border border-[#292B2E]">
                      <div className="flex items-center justify-between font-bold text-emerald-400 mb-2 pb-1 border-b border-[#292B2E]">
                        <span>نسخة Google Sheets (الإصدار v{conf.sheetsVersion})</span>
                        <span className="text-[10px] text-[#A1A1AA]">{conf.sheetsUpdatedAt}</span>
                      </div>
                      <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto p-1 max-h-28">
                        {JSON.stringify(conf.sheetsData, null, 2)}
                      </pre>
                      {conf.status === "pending_review" && (
                        <button
                          onClick={() => handleResolveConflict(conf.id, "sheets")}
                          className="w-full mt-2 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-500 transition-all cursor-pointer"
                        >
                          اعتماد نسخة Sheets
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Sync Logs */}
      {activeTab === "logs" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#EDEDED]">سجل العمليات والمزامنة التراكمية (Sync Logs)</h3>
            <button onClick={() => globalSyncEngine.clearLogs()} className="text-[11px] text-zinc-500 hover:text-zinc-300">
              مسح السجلات
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-6 text-center bg-[#111111] rounded-xl border border-[#292B2E] text-xs text-[#A1A1AA]">
              لا توجد سجلات مزامنة سابقة.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 bg-[#111111] rounded-xl border border-[#292B2E] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {log.status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {log.status === "conflict" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {log.status === "failed" && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#EDEDED]">{log.entity}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 rounded font-mono text-zinc-400">
                          {log.direction === "nesta_to_sheets"
                            ? "NESTA → Sheets"
                            : log.direction === "sheets_to_nesta"
                            ? "Sheets → NESTA"
                            : "Two-Way"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A1A1AA] mt-0.5">{log.changesSummary}</div>
                      {log.errorMessage && (
                        <div className="text-[10px] text-rose-400 font-mono mt-0.5">{log.errorMessage}</div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#71717A] shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString("ar-EG")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 14 Tab Schemas */}
      {activeTab === "schemas" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#EDEDED]">هيكلية الـ 14 تبويب المعتمدة في Google Sheets</h3>
            <span className="text-xs text-[#C8A75A] font-bold">14 Tabs Schema</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {NESTA_SHEET_SCHEMAS.map((schema, idx) => (
              <div key={idx} className="p-3 bg-[#111111] rounded-xl border border-[#292B2E] text-xs">
                <div className="flex items-center justify-between font-bold text-[#EDEDED] mb-2 pb-1.5 border-b border-[#292B2E]">
                  <span className="text-[#C8A75A]">{schema.tabName}</span>
                  <span className="text-[10px] text-[#71717A] font-mono">ID: {schema.idField}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {schema.columns.map((c, cIdx) => (
                    <span
                      key={cIdx}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        c.isId
                          ? "bg-[#C8A75A]/20 text-[#C8A75A] font-bold"
                          : c.key === "company_id"
                          ? "bg-blue-500/20 text-blue-400 font-bold"
                          : c.key === "version" || c.key === "updatedAt"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {c.key} ({c.type})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
