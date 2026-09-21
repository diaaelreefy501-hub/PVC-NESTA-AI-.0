import React, { useState, useRef, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { AIAgentMode, AIActionProposal } from "../../types/aiAgentTypes";
import { getComprehensiveReasoning, evaluateAutomationRules } from "../../utils/nestaIntelligence";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  PowerOff,
  Activity,
  Calculator,
  RotateCcw,
  Check,
  Search,
  Zap,
  ArrowRight,
  Filter,
  Building2,
  RefreshCw,
  Sliders,
  ChevronDown,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  time: string;
  mode?: AIAgentMode;
  actionProposal?: AIActionProposal;
  actionExecuted?: boolean;
  actionChangeSetId?: string;
  healthReportData?: any;
}

export const NestaAssistantDrawer: React.FC = () => {
  const {
    isAiAssistantOpen,
    setIsAiAssistantOpen,
    companies,
    activeCompanyId,
    activeCompany,
    currentTab,
    setCurrentTab,
    customers,
    inquiries,
    followUps,
    quotations,
    contracts,
    sales,
    opportunities,
    payments,
    todayFollowUps,
    overdueFollowUps,
    hotCustomers,
    monthlySalesTotal,
    monthlyTargetTotal,
    monthlyAchievementRate,
    isAiEmergencyStopEnabled,
    toggleAiEmergencyStop,
    isPremiumAiEnabled,
    guardianHealthReport,
    runGuardianFullCheck,
    executeVerifiedAiAction,
    rollbackChangeSet,
    setIsHealthCenterOpen,
    setSelectedMetricForLineage,
    currentUser,
    selectedCustomerIdFor360,
  } = useApp();

  const [currentMode, setCurrentMode] = useState<AIAgentMode>("ask");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-welcome",
      sender: "assistant",
      text: `أهلاً بك **${currentUser?.name || ""}** في **PVC NESTA AI** 🚀\n\nأنا وكيل الذكاء الاصطناعي الشامل المدمج بالمنظومة. أعمل بثلاثة أنماط رئيسية:\n- 💬 **اسألني (ASK):** للاستفسارات والتحليلات والملخصات وتوصيات الصفقات.\n- 🔍 **افحص (CHECK):** لتدقيق القواعد، كشف التكرارات والبيانات المفقودة، وفحص عزل الشركات.\n- ⚡ **نفّذ (ACT):** لتنفيذ العمليات المؤتمتة بضمانات التحقق والتراجع بنقرة واحدة.`,
      time: "الآن",
      mode: "ask",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [pendingActionConfirmation, setPendingActionConfirmation] = useState<AIActionProposal | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsAiAssistantOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsAiAssistantOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Contextual Dynamic Prompts based on Current Tab and App State
  const contextualPrompts = useMemo(() => {
    const basePrompts = [
      { mode: "ask" as AIAgentMode, label: "📅 ما هي مهامي العاجلة اليوم؟", query: "ما هي المهام والمتابعات المطلوبة مني اليوم؟" },
      { mode: "ask" as AIAgentMode, label: "🔥 العملاء الساخنون بدون متابعة", query: "أعطني قائمة بالعملاء الساخنين (Hot) الذين ليس لديهم متابعات مجدولة قادمة." },
      { mode: "check" as AIAgentMode, label: "🔍 فحص سلامة وتطابق البيانات", query: "قم بفحص شامل لسلامة المنظومة، عزل الشركات، ومطابقة الحسابات." },
      { mode: "ask" as AIAgentMode, label: "📊 من أين أتى إجمالي مبيعات الشهر؟", query: "اشرح لي خط سير واحتساب إجمالي مبيعات الشهر الحالي بالتفصيل.", isLineage: true, metricKey: "monthlySales" },
    ];

    if (currentTab === "inquiries") {
      return [
        { mode: "check" as AIAgentMode, label: "🔍 استفسارات غير محولة لعملاء", query: "افحص الاستفسارات التي لم يتم تحويلها لعملاء أو بدون مسؤول محدد." },
        { mode: "ask" as AIAgentMode, label: "⚡ أفضل إجراء للاستفسارات المعلقة", query: "ما هي الاستفسارات الأكثر أهمية اليوم للاتصال بها فوراً؟" },
        ...basePrompts.slice(0, 2),
      ];
    }

    if (currentTab === "quotations") {
      return [
        { mode: "ask" as AIAgentMode, label: "📑 عروض أسعار متأخرة وبحاجة لمتابعة", query: "حلل عروض الأسعار المرسلة التي مر عليها أكثر من 3 أيام دون رد." },
        { mode: "ask" as AIAgentMode, label: "💰 من أين أتى إجمالي عروض الأسعار؟", query: "اشرح لي خط سير واحتساب إجمالي عروض الأسعار.", isLineage: true, metricKey: "quotationsPending" },
        ...basePrompts.slice(0, 2),
      ];
    }

    if (currentTab === "sales" || currentTab === "contracts") {
      return [
        { mode: "check" as AIAgentMode, label: "💵 تدقيق مطابقة العقود والتحصيلات", query: "افحص مطابقة مبالغ العقود والدفعات المحصلة والمتبقية." },
        { mode: "ask" as AIAgentMode, label: "📈 من أين أتى إجمالي المبيعات؟", query: "اشرح لي تفاصيل احتساب إجمالي المبيعات.", isLineage: true, metricKey: "monthlySales" },
        ...basePrompts.slice(0, 2),
      ];
    }

    if (currentTab === "followups") {
      return [
        { mode: "ask" as AIAgentMode, label: "⏰ متابعات متأخرة تحتاج إعادة جدولة", query: "أعطني خطة للتعامل مع المتابعات المتأخرة وإعادة جدولتها." },
        { mode: "act" as AIAgentMode, label: "⚡ جدولة متابعة للعملاء الساخنين", query: "اقترح جدولة متابعات للعملاء الساخنين الذين ليس لديهم موعد قادم." },
        ...basePrompts.slice(0, 2),
      ];
    }

    return basePrompts;
  }, [currentTab]);

  if (!isAiAssistantOpen) return null;

  const handleSend = async (queryText?: string, targetMode?: AIAgentMode) => {
    const q = queryText || inputQuery;
    if (!q.trim() || loading) return;

    const activeM = targetMode || currentMode;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: q,
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      mode: activeM,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      // 1. Run Local Comprehensive Reasoning Engine FIRST
      const localReasoning = getComprehensiveReasoning(
        q,
        {
          companies,
          customers,
          inquiries,
          followUps,
          opportunities,
          quotations,
          contracts,
          sales,
          payments,
        },
        activeCompanyId,
        {
          name: currentUser?.name || "المستخدم الحالي",
          role: currentUser?.role || "sales",
        }
      );

      // Gather Real Local Context
      const contextData = {
        mode: activeM,
        currentTab,
        activeCompanyId,
        activeCompanyName: activeCompany?.name || "كل الشركات",
        selectedCustomerIdFor360,
        currentUser: {
          name: currentUser?.name || "المستخدم الحالي",
          role: currentUser?.role || "sales",
        },
        customersCount: customers.length,
        inquiriesCount: inquiries.length,
        todayFollowupsCount: todayFollowUps.length,
        overdueFollowupsCount: overdueFollowUps.length,
        hotCustomersCount: hotCustomers.length,
        monthlySalesTotal,
        monthlyTargetTotal,
        monthlyAchievementRate,
        companiesNames: companies.map((c) => c.name),
        localReasoningSummary: localReasoning.reply,
        isEmergencyStopEnabled: isAiEmergencyStopEnabled,
        healthStatus: guardianHealthReport?.overallStatus || "HEALTHY",
        violationsCount: guardianHealthReport?.businessRules.violationsCount || 0,
      };

      let replyText = "";
      let actionProposal: AIActionProposal | null = null;

      try {
        const res = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: q,
            mode: activeM,
            context: contextData,
            enablePremiumAi: isPremiumAiEnabled,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          replyText = data.reply;
          actionProposal = data.actionProposal || data.proposedAction || null;
        } else {
          throw new Error("Gemini API server returned error status");
        }
      } catch (geminiErr) {
        console.warn("Gemini Server call failed, falling back to offline local reasoning:", geminiErr);
        replyText = localReasoning.reply;
      }

      // If we don't have an action proposal yet and localReasoning suggests actions, map it!
      if (!actionProposal && (activeM === "act" || activeM === "check" || q.includes("أتمت") || q.includes("تلقائي") || q.includes("حل") || q.includes("تعديل"))) {
        const automations = evaluateAutomationRules(
          { companies, customers, inquiries, followUps, opportunities, quotations, contracts },
          activeCompanyId
        );
        const ruleWithProposal = automations.find((r) => r.proposedAction);
        if (ruleWithProposal && ruleWithProposal.proposedAction) {
          const act = ruleWithProposal.proposedAction;
          actionProposal = {
            id: `proposal_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            type: act.type as any,
            riskLevel: act.requiresConfirmation ? "safe_write" : "read",
            title: ruleWithProposal.ruleName,
            description: act.warningText || "إجراء مقترح تلقائياً بناءً على فحص الحارس المحلي",
            targetEntity: act.targetEntity as any,
            targetIds: [act.targetId],
            payload: act.payload,
            requiresConfirmation: act.requiresConfirmation,
            confirmationWarning: act.warningText,
          };
        }
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: replyText || localReasoning.reply,
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        mode: activeM,
        actionProposal,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Chat Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "assistant",
          text: `تم استرجاع البيانات المحلية بنجاح: لديك اليوم **${todayFollowUps.length}** متابعات مسجلة، و **${hotCustomers.length}** عملاء مهتمين (Hot) بحاجة لاهتمامك المباشر.`,
          time: "الآن",
          mode: activeM,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteProposal = async (proposal: AIActionProposal, messageId: string) => {
    // If high risk, request confirmation
    if (proposal.riskLevel === "restricted_write" && !pendingActionConfirmation) {
      setPendingActionConfirmation(proposal);
      return;
    }

    setExecutingActionId(proposal.id);
    try {
      const res = await executeVerifiedAiAction(proposal);
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  actionExecuted: true,
                  actionChangeSetId: res.changeSetId,
                }
              : m
          )
        );
      }
    } finally {
      setExecutingActionId(null);
      setPendingActionConfirmation(null);
    }
  };

  const handleRollbackProposal = async (changeSetId: string, messageId: string) => {
    setExecutingActionId(changeSetId);
    try {
      const success = await rollbackChangeSet(changeSetId);
      if (success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  actionExecuted: false,
                  actionChangeSetId: undefined,
                }
              : m
          )
        );
      }
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-xs flex justify-end animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-xl bg-[#141517] text-[#EDEDED] h-full shadow-2xl flex flex-col border-r border-[#292B2E]">
        {/* Header */}
        <div className="p-4 bg-[#18191B] border-b border-[#292B2E] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C8A75A]/15 border border-[#C8A75A]/30 flex items-center justify-center text-[#C8A75A]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-[#EDEDED]">وكيل NESTA AI الشامل</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-800/40">
                  Universal Agent
                </span>
                {isAiEmergencyStopEnabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 font-bold border border-rose-800/40 animate-pulse">
                    إيقاف طوارئ ⛔
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A1A1AA]">مستشارك الذكي • فاحص النزاهة • منفذ العمليات المعتمد</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHealthCenterOpen(true)}
              title="مركز صحة النظام وحارس Guardian"
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#C8A75A] hover:bg-[#202225] border border-[#292B2E] transition-colors cursor-pointer flex items-center gap-1 text-xs"
            >
              <Shield className="w-4 h-4 text-[#C8A75A]" />
              <span className="hidden sm:inline font-bold">الحارس</span>
            </button>

            <button
              onClick={() => setIsAiAssistantOpen(false)}
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#202225] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Context Ribbon */}
        <div className="px-4 py-2 bg-[#101113] border-b border-[#292B2E] flex items-center justify-between text-[11px] text-[#A1A1AA]">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="flex items-center gap-1 font-semibold text-[#EDEDED]">
              <Building2 className="w-3 h-3 text-[#C8A75A]" />
              {activeCompany?.name || "كل الشركات"}
            </span>
            <span>•</span>
            <span className="font-semibold text-[#EDEDED]">الشاشة: {currentTab}</span>
            {selectedCustomerIdFor360 && (
              <>
                <span>•</span>
                <span className="text-[#C8A75A] font-bold">ملف عميل 360 نشط</span>
              </>
            )}
          </div>
          <div className="text-[10px] text-[#6B7280] font-mono shrink-0">
            Ctrl+K
          </div>
        </div>

        {/* Operational Modes Bar */}
        <div className="p-2 bg-[#18191B] border-b border-[#292B2E] flex items-center gap-1.5">
          <button
            onClick={() => setCurrentMode("ask")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentMode === "ask"
                ? "bg-[#C8A75A] text-black shadow-xs"
                : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>اسألني (ASK)</span>
          </button>

          <button
            onClick={() => setCurrentMode("check")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentMode === "check"
                ? "bg-[#C8A75A] text-black shadow-xs"
                : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>افحص (CHECK)</span>
          </button>

          <button
            onClick={() => setCurrentMode("act")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentMode === "act"
                ? "bg-[#C8A75A] text-black shadow-xs"
                : "bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] border border-[#292B2E]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>نفّذ (ACT)</span>
          </button>
        </div>

        {/* Dynamic Contextual Prompts Chips */}
        <div className="p-2.5 bg-[#101113] border-b border-[#292B2E] flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {contextualPrompts.map((p, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => {
                if (p.isLineage && p.metricKey) {
                  setSelectedMetricForLineage(p.metricKey);
                } else {
                  setCurrentMode(p.mode);
                  handleSend(p.query, p.mode);
                }
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#18191B] hover:bg-[#202225] hover:text-[#C8A75A] border border-[#292B2E] text-[#A1A1AA] transition-colors cursor-pointer text-right flex items-center gap-1"
            >
              {p.isLineage && <Calculator className="w-3 h-3 text-[#C8A75A]" />}
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#141517] text-xs">
          {messages.map((m) => {
            const isMe = m.sender === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isMe ? "justify-start flex-row-reverse" : "justify-start"}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isMe
                      ? "bg-[#202225] text-[#EDEDED] border border-[#292B2E]"
                      : "bg-[#C8A75A]/20 text-[#C8A75A] border border-[#C8A75A]/40"
                  }`}
                >
                  {isMe ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-line shadow-xs ${
                    isMe
                      ? "bg-[#C8A75A] text-black font-semibold rounded-tr-xs"
                      : "bg-[#18191B] text-[#EDEDED] border border-[#292B2E] rounded-tl-xs"
                  }`}
                >
                  {m.text}

                  {/* Render Action Proposal Card if present */}
                  {m.actionProposal && (
                    <div className="mt-3 p-3 bg-[#141517] border border-[#C8A75A]/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-[#C8A75A]">
                          <Zap className="w-4 h-4 text-[#C8A75A]" />
                          <span>إجراء تنفيذي مقترح</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.actionProposal.riskLevel === "restricted_write"
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {m.actionProposal.riskLevel === "restricted_write" ? "يتطلب تأكيداً" : "آمن وقابل للتراجع"}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#A1A1AA]">
                        {m.actionProposal.description}
                      </div>

                      {/* Execution / Rollback Controls */}
                      <div className="pt-1 flex items-center gap-2">
                        {!m.actionExecuted ? (
                          <button
                            onClick={() => handleExecuteProposal(m.actionProposal!, m.id)}
                            disabled={executingActionId === m.actionProposal.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#C8A75A] hover:bg-[#B8974A] text-black font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{executingActionId === m.actionProposal.id ? "جاري التنفيذ والتحقق..." : "تنفيذ الإجراء الآن"}</span>
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              تم التنفيذ والتحقق من حفظ البيانات ✅
                            </span>
                            {m.actionChangeSetId && (
                              <button
                                onClick={() => handleRollbackProposal(m.actionChangeSetId!, m.id)}
                                disabled={executingActionId === m.actionChangeSetId}
                                className="px-2.5 py-1 bg-[#202225] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-400 rounded-lg text-[11px] font-bold border border-[#292B2E] transition-colors cursor-pointer"
                              >
                                تراجع ↩️
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`text-[9px] mt-1 text-right ${isMe ? "text-black/60 font-mono" : "text-[#6B7280]"}`}>
                    {m.time}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2.5 items-center text-[#A1A1AA] text-xs">
              <div className="w-7 h-7 rounded-lg bg-[#C8A75A]/20 text-[#C8A75A] flex items-center justify-center border border-[#C8A75A]/40">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#18191B] border border-[#292B2E] p-3 rounded-2xl flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#C8A75A] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#C8A75A] animate-bounce delay-100" />
                <span className="w-2 h-2 rounded-full bg-[#C8A75A] animate-bounce delay-200" />
                <span className="mr-2 text-[#A1A1AA]">
                  {currentMode === "check" ? "NESTA يفحص القواعد وقواعد البيانات..." : "NESTA AI يحلل البيانات..."}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Confirmation Modal for Restricted Actions */}
        {pendingActionConfirmation && (
          <div className="p-3.5 bg-rose-950/40 border-t border-rose-900/60 flex items-center justify-between gap-3 text-xs text-rose-200">
            <div>
              <div className="font-extrabold flex items-center gap-1.5 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>تأكيد العملية التعديلية (Safe Write Verification)</span>
              </div>
              <div className="text-[11px] text-rose-300/80 mt-0.5">{pendingActionConfirmation.title}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPendingActionConfirmation(null)}
                className="px-2.5 py-1 rounded-lg bg-[#202225] text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleExecuteProposal(pendingActionConfirmation, "pending")}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                تأكيد التنفيذ
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-[#18191B] border-t border-[#292B2E]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                currentMode === "ask"
                  ? "اسأل NESTA AI عن عميل، صفقة، أو ملخص أداء..."
                  : currentMode === "check"
                  ? "اطلب فحص التكرارات، عزل الشركات، أو تدقيق سلامة السجلات..."
                  : "اطلب تنفيذ إجراء مؤتمت (مثل: جدولة متابعة للعملاء الساخنين)..."
              }
              className="flex-1 p-2.5 bg-[#141517] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] placeholder:text-[#6B7280] focus:border-[#C8A75A] outline-hidden transition-colors"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="p-2.5 bg-[#C8A75A] hover:bg-[#B8974A] disabled:bg-[#202225] disabled:text-[#6B7280] text-black font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
