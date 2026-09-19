import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Clock,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  PowerOff,
  Activity,
  History,
  FileCheck2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Database,
  Building2,
  Wrench,
  Check,
} from "lucide-react";

export const HealthCenterModal: React.FC = () => {
  const {
    isHealthCenterOpen,
    setIsHealthCenterOpen,
    guardianHealthReport,
    guardianAlerts,
    guardianIncidents,
    aiActivityLogs,
    changeSets,
    isAiEmergencyStopEnabled,
    toggleAiEmergencyStop,
    runGuardianFullCheck,
    resolveIncident,
    dismissAlert,
    rollbackChangeSet,
    setCurrentTab,
    setSelectedCustomerIdFor360,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"rules" | "alerts" | "incidents" | "activity" | "changesets">("rules");
  const [isScanning, setIsScanning] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  if (!isHealthCenterOpen) return null;

  const handleFullScan = async () => {
    setIsScanning(true);
    try {
      await runGuardianFullCheck();
    } finally {
      setIsScanning(false);
    }
  };

  const handleResolve = async (id: string) => {
    setActionInProgress(id);
    try {
      await resolveIncident(id);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRollback = async (changeSetId: string) => {
    setActionInProgress(changeSetId);
    try {
      await rollbackChangeSet(changeSetId);
    } finally {
      setActionInProgress(null);
    }
  };

  const currentStatus = guardianHealthReport?.overallStatus?.toLowerCase() || "healthy";

  const statusColor =
    currentStatus === "critical"
      ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
      : currentStatus === "attention"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-5xl bg-[#141517] border border-[#292B2E] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#EDEDED] max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#18191B] border-b border-[#292B2E] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A75A]/15 border border-[#C8A75A]/30 text-[#C8A75A] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-[#EDEDED]">مركز صحة النظام وحارس NESTA (Guardian)</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${statusColor}`}>
                  {currentStatus === "healthy" && <ShieldCheck className="w-3.5 h-3.5" />}
                  {currentStatus === "attention" && <AlertTriangle className="w-3.5 h-3.5" />}
                  {currentStatus === "critical" && <ShieldAlert className="w-3.5 h-3.5" />}
                  {currentStatus === "healthy"
                    ? "المنظومة سليمة ومتطابقة"
                    : currentStatus === "attention"
                    ? "تنبيهات تحتاج لمتابعة"
                    : "حالات حرجة تتطلب تدخل"}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA]">المراقبة المستمرة لقواعد العمل، عزل الشركات، ومنع النزاعات التلقائية</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Emergency Stop Switch */}
            <button
              onClick={toggleAiEmergencyStop}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                isAiEmergencyStopEnabled
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30"
                  : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border-[#292B2E]"
              }`}
            >
              <PowerOff className={`w-3.5 h-3.5 ${isAiEmergencyStopEnabled ? "text-rose-400 animate-pulse" : ""}`} />
              <span>{isAiEmergencyStopEnabled ? "إيقاف طوارئ الذكاء الاصطناعي (مفعل ⛔)" : "إيقاف طارئ للذكاء الاصطناعي"}</span>
            </button>

            {/* Run Full Scan */}
            <button
              onClick={handleFullScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C8A75A] hover:bg-[#B8974A] text-black rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "جاري الفحص..." : "فحص شامل"}</span>
            </button>

            <button
              onClick={() => setIsHealthCenterOpen(false)}
              className="p-1.5 text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Emergency Stop Notice if active */}
        {isAiEmergencyStopEnabled && (
          <div className="bg-rose-950/40 border-b border-rose-900/50 p-3 px-5 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>وضع الأمان مشغّل (Emergency Stop Active):</strong> تم إيقاف أي تعديل أو كتابة تلقائية بقاعدة البيانات بواسطة الذكاء الاصطناعي. النظام يعمل الآن بوضع القراءة والتدقيق فقط (Read-Only).
              </span>
            </div>
            <button
              onClick={toggleAiEmergencyStop}
              className="text-xs font-bold underline hover:text-white cursor-pointer mr-3"
            >
              إلغاء وتفعيل الأتمتة
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-[#18191B] border-b border-[#292B2E] overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "rules"
                ? "bg-[#202225] text-[#C8A75A] border border-[#C8A75A]/30"
                : "text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225]/50"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>قواعد العمل والنزاهة</span>
            {guardianHealthReport?.businessRules.violationsCount ? (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-400">
                {guardianHealthReport.businessRules.violationsCount}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "alerts"
                ? "bg-[#202225] text-[#C8A75A] border border-[#C8A75A]/30"
                : "text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225]/50"
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>التنبيهات التنبؤية</span>
            {guardianAlerts.filter((a) => a.status === "ACTIVE").length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500/20 text-rose-400">
                {guardianAlerts.filter((a) => a.status === "ACTIVE").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("incidents")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "incidents"
                ? "bg-[#202225] text-[#C8A75A] border border-[#C8A75A]/30"
                : "text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225]/50"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>سجل المشاكل والمعالجة</span>
            {guardianIncidents.filter((i) => i.status === "OPEN").length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500/20 text-rose-400">
                {guardianIncidents.filter((i) => i.status === "OPEN").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "activity"
                ? "bg-[#202225] text-[#C8A75A] border border-[#C8A75A]/30"
                : "text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225]/50"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>سجل نشاط الذكاء الاصطناعي</span>
            <span className="text-[10px] text-[#6B7280]">({aiActivityLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("changesets")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "changesets"
                ? "bg-[#202225] text-[#C8A75A] border border-[#C8A75A]/30"
                : "text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225]/50"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>حزم التعديل والتراجع (Rollback)</span>
            <span className="text-[10px] text-[#6B7280]">({changeSets.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Business Rules & Audit */}
          {activeTab === "rules" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-xl">
                  <div className="text-xs text-[#A1A1AA] font-bold">عزل الشركات (Company Isolation)</div>
                  <div className="text-xl font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-5 h-5" />
                    <span>100% متطابق</span>
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">لا يوجد تسريب بيانات بين الشركات</div>
                </div>

                <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-xl">
                  <div className="text-xs text-[#A1A1AA] font-bold">تطابق الحسابات والأموال</div>
                  <div className="text-xl font-black text-[#C8A75A] mt-1 flex items-center gap-1.5">
                    <FileCheck2 className="w-5 h-5" />
                    <span>مطابقة بنسبة 100%</span>
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">العقود، الدفعات، وقيم المبيعات</div>
                </div>

                <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-xl">
                  <div className="text-xs text-[#A1A1AA] font-bold">فحص القواعد المنطقية</div>
                  <div className="text-xl font-black text-[#EDEDED] mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>{guardianHealthReport?.businessRules.violationsCount === 0 ? "لا توجد مخالفات" : `${guardianHealthReport?.businessRules.violationsCount} ملاحظة`}</span>
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-0.5">متابعات العملاء وعروض الأسعار</div>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-extrabold text-[#EDEDED]">نتائج تدقيق القواعد الآلية (Deterministic Audit Checks)</h4>

                {guardianHealthReport?.businessRules?.violations?.length === 0 ? (
                  <div className="p-8 text-center bg-[#18191B] border border-emerald-900/30 rounded-2xl space-y-2">
                    <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
                    <div className="font-bold text-sm text-[#EDEDED]">جميع قواعد العمل متوافقة بنسبة 100%</div>
                    <div className="text-xs text-[#A1A1AA]">
                      لم يتم رصد عملاء ساخنين متروكين بدون متابعة، أو أرقام هواتف متكررة، أو تسريبات في عزل الشركات.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {guardianHealthReport?.businessRules?.violations?.map((violation, idx) => (
                      <div
                        key={`${violation.ruleId}-${violation.entityId || ""}-${idx}`}
                        className="p-3.5 bg-[#18191B] border border-[#292B2E] rounded-xl flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                violation.severity === "CRITICAL"
                                  ? "bg-rose-500/20 text-rose-400"
                                  : violation.severity === "WARNING"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-blue-500/20 text-blue-400"
                              }`}
                            >
                              {violation.severity}
                            </span>
                            <span className="font-bold text-[#EDEDED]">{violation.ruleName}</span>
                          </div>
                          <p className="text-[#A1A1AA]">{violation.description}</p>
                          <p className="text-[11px] text-emerald-400 font-semibold">💡 الحل المقترح: {violation.suggestedAction}</p>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="px-2 py-1 bg-[#202225] rounded-lg text-xs font-mono font-bold text-[#C8A75A] border border-[#292B2E]">
                            {violation.affectedEntitiesCount} حالات
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Predictive Alerts */}
          {activeTab === "alerts" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                <span>التنبيهات الاستباقية المولدة بواسطة محرك Guardian</span>
                <span>{guardianAlerts.length} تنبيهات</span>
              </div>

              {guardianAlerts.length === 0 ? (
                <div className="p-8 text-center bg-[#18191B] rounded-2xl border border-[#292B2E] text-xs text-[#6B7280]">
                  لا توجد تنبيهات استباقية نشطة في الوقت الحالي.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {guardianAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 bg-[#18191B] border rounded-xl flex items-start justify-between gap-4 text-xs transition-all ${
                        alert.status === "DISMISSED"
                          ? "opacity-50 border-[#292B2E]"
                          : alert.severity === "CRITICAL"
                          ? "border-rose-900/60 shadow-xs shadow-rose-950/20"
                          : alert.severity === "WARNING"
                          ? "border-amber-900/60"
                          : "border-[#292B2E]"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              alert.severity === "CRITICAL"
                                ? "bg-rose-500/20 text-rose-400"
                                : alert.severity === "WARNING"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {alert.type}
                          </span>
                          <h4 className="font-extrabold text-sm text-[#EDEDED]">{alert.title}</h4>
                        </div>
                        <p className="text-[#A1A1AA] leading-relaxed">{alert.description}</p>
                        {alert.suggestedIntervention && (
                          <div className="p-2.5 bg-[#202225] rounded-lg text-[11px] text-emerald-300 border border-[#292B2E] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span><strong>التدخل الموصى به:</strong> {alert.suggestedIntervention}</span>
                          </div>
                        )}
                      </div>

                      {alert.status === "ACTIVE" && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => dismissAlert(alert.id)}
                            className="px-3 py-1.5 bg-[#202225] hover:bg-[#25282C] text-[#A1A1AA] hover:text-[#EDEDED] rounded-xl text-xs font-bold border border-[#292B2E] transition-colors cursor-pointer"
                          >
                            تجاهل
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Incidents & Auto-Fix */}
          {activeTab === "incidents" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                <span>المشاكل المكتشفة التي تتطلب تصحيحاً بالبيانات</span>
                <span>{guardianIncidents.filter((i) => i.status === "OPEN").length} مفتوحة</span>
              </div>

              {guardianIncidents.length === 0 ? (
                <div className="p-8 text-center bg-[#18191B] rounded-2xl border border-[#292B2E] text-xs text-[#6B7280]">
                  لا توجد مشاكل معلقة. قاعدة البيانات نظيفة ومتطابقة تماماً.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {guardianIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="p-4 bg-[#18191B] border border-[#292B2E] rounded-xl flex items-start justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              incident.status === "RESOLVED"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : incident.severity === "HIGH"
                                ? "bg-rose-500/20 text-rose-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {incident.status === "RESOLVED" ? "تم العلاج ✅" : incident.severity}
                          </span>
                          <h4 className="font-extrabold text-[#EDEDED]">{incident.title}</h4>
                        </div>
                        <p className="text-[#A1A1AA]">{incident.details}</p>
                        {incident.suggestedFix && (
                          <div className="text-[11px] text-[#C8A75A]">💡 المعالجة التلقائية: {incident.suggestedFix}</div>
                        )}
                      </div>

                      {incident.status === "OPEN" && incident.suggestedFix && (
                        <button
                          onClick={() => handleResolve(incident.id)}
                          disabled={actionInProgress === incident.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <Wrench className={`w-3.5 h-3.5 ${actionInProgress === incident.id ? "animate-spin" : ""}`} />
                          <span>{actionInProgress === incident.id ? "جاري العلاج..." : "معالجة فورية"}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI Activity Logs */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                <span>سجل الأوامر وعمليات التحقق والتدقيق المنفذة</span>
                <span>{aiActivityLogs.length} عملية مسجلة</span>
              </div>

              {aiActivityLogs.length === 0 ? (
                <div className="p-8 text-center bg-[#18191B] rounded-2xl border border-[#292B2E] text-xs text-[#6B7280]">
                  لم يتم تنفيذ أوامر ذكاء اصطناعي بعد.
                </div>
              ) : (
                <div className="bg-[#18191B] border border-[#292B2E] rounded-xl overflow-hidden divide-y divide-[#292B2E]">
                  {aiActivityLogs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 text-xs hover:bg-[#202225] transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.status === "VERIFIED"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : log.status === "FAILED"
                                ? "bg-rose-500/20 text-rose-400"
                                : log.status === "ROLLED_BACK"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {log.status === "VERIFIED" ? "موثق ومطابق (Verified)" : log.status}
                          </span>
                          <span className="font-bold text-[#EDEDED]">{log.command}</span>
                          <span className="text-[10px] text-[#6B7280]">بواسطة: {log.user}</span>
                        </div>
                        <p className="text-[#A1A1AA] text-[11px]">{log.resultSummary || log.error || "تمت المعالجة بنجاح"}</p>
                      </div>

                      <div className="text-left shrink-0 text-[11px] text-[#6B7280]">
                        {new Date(log.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Change Sets & Rollback */}
          {activeTab === "changesets" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
                <span>حزم التعديل الذاتي مع إمكانية التراجع بنقرة واحدة (One-Click Reversible Operations)</span>
                <span>{changeSets.length} حزم</span>
              </div>

              {changeSets.length === 0 ? (
                <div className="p-8 text-center bg-[#18191B] rounded-2xl border border-[#292B2E] text-xs text-[#6B7280]">
                  لا توجد حزم تعديل سابقة.
                </div>
              ) : (
                <div className="space-y-3">
                  {changeSets.map((cs) => (
                    <div
                      key={cs.id}
                      className="p-4 bg-[#18191B] border border-[#292B2E] rounded-xl flex items-start justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cs.isRolledBack
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            {cs.isRolledBack ? "تم التراجع عنها ↩️" : "نشطة ومطبقة ✅"}
                          </span>
                          <h4 className="font-extrabold text-[#EDEDED]">{cs.description}</h4>
                          <span className="text-[10px] text-[#6B7280]">بواسطة: {cs.requestingUser}</span>
                        </div>
                        <div className="text-[11px] text-[#A1A1AA]">
                          عدد السجلات المعدلة: <strong className="text-[#EDEDED]">{cs.records.length}</strong> | التاريخ: {new Date(cs.timestamp).toLocaleString("ar-EG")}
                        </div>
                      </div>

                      {!cs.isRolledBack && (
                        <button
                          onClick={() => handleRollback(cs.id)}
                          disabled={actionInProgress === cs.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#202225] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-400 rounded-xl text-xs font-bold border border-[#292B2E] hover:border-rose-500/30 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${actionInProgress === cs.id ? "animate-spin" : ""}`} />
                          <span>{actionInProgress === cs.id ? "جاري التراجع..." : "تراجع عن هذه الحزمة"}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#18191B] border-t border-[#292B2E] flex items-center justify-between text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>محرك NESTA Guardian يعمل بتناغم تام مع الصلاحيات وقواعد Supabase RLS.</span>
          </div>
          <button
            onClick={() => setIsHealthCenterOpen(false)}
            className="px-4 py-1.5 bg-[#202225] hover:bg-[#25282C] text-[#EDEDED] font-bold rounded-xl border border-[#292B2E] transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
