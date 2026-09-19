import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  Users,
  Clock,
  Flame,
  DollarSign,
  Target,
  Sparkles,
  CalendarDays,
  ArrowUpRight,
  AlertCircle,
  Eye,
  Phone,
  MessageCircle,
  Brain,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    activeCompany,
    activeCompanyId,
    companies,
    filteredCustomers,
    filteredInquiries,
    todayFollowUps,
    overdueFollowUps,
    hotCustomers,
    todaySalesTotal,
    monthlySalesTotal,
    monthlyTargetTotal,
    monthlyAchievementRate,
    filteredSales,
    setCurrentTab,
    setSelectedCustomerIdFor360,
    navigateToTabWithFilter,
    setSelectedMetricForLineage,
    salesOverrideValue,
    salesManualAdjustment,
    opportunities,
  } = useApp();

  const [greeting, setGreeting] = useState("");
  const [subGreeting, setSubGreeting] = useState("");
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    const firstName = currentUser?.name?.split(" ")[0] || "بطل";

    if (hour < 12) {
      setGreeting(`صباح الخير يا ${firstName} ☀️`);
      setSubGreeting("يومك موفق ومليان إنجاز!");
    } else {
      setGreeting(`مساء الخير يا ${firstName} 🌙`);
      setSubGreeting("عاش مجهودك وتركيزك اليوم!");
    }
  }, [currentUser]);

  const getStrategicAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "قدم لي نصيحة استراتيجية سريعة كمدير مبيعات بناءً على وضع اليوم الحالي.",
          context: {
            customersCount: filteredCustomers.length,
            inquiriesCount: filteredInquiries.length,
            todayFollowupsCount: todayFollowUps.length,
            overdueFollowupsCount: overdueFollowUps.length,
            hotCustomersCount: hotCustomers.length,
            monthlySalesTotal,
            monthlyTargetTotal,
            companiesNames: companies.map((c) => c.name),
          },
        }),
      });
      const data = await response.json();
      setAiAdvice(data.reply);
    } catch (err) {
      setAiAdvice("حاول التركيز على المتابعات المتأخرة والعملاء الساخنين (Hot) اليوم لزيادة فرص الإغلاق.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  const stagesCount = {
    inquiry: filteredCustomers.filter((c) => c.stage === "inquiry").length,
    contacted: filteredCustomers.filter((c) => c.stage === "contacted").length,
    inspection: filteredCustomers.filter((c) => c.stage === "inspection").length,
    quotation: filteredCustomers.filter((c) => c.stage === "quotation").length,
    negotiation: filteredCustomers.filter((c) => c.stage === "negotiation").length,
    contracted: filteredCustomers.filter((c) => c.stage === "contracted").length,
  };

  const funnelData = [
    { key: "inquiry", name: "استفسار", value: stagesCount.inquiry, fill: "#E2E8F0" },
    { key: "contacted", name: "تم التواصل", value: stagesCount.contacted, fill: "#BFDBFE" },
    { key: "inspection", name: "معاينة ومقاسات", value: stagesCount.inspection, fill: "#FDE68A" },
    { key: "quotation", name: "عرض سعر", value: stagesCount.quotation, fill: "#DDD6FE" },
    { key: "negotiation", name: "تفاوض", value: stagesCount.negotiation, fill: "#FED7AA" },
    { key: "contracted", name: "تم التعاقد", value: stagesCount.contracted, fill: "#A7F3D0" },
  ].filter((item) => item.value > 0);

  const salesTrendData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("ar-EG", { weekday: "short" });
      const total = filteredSales
        .filter((s) => s.date === dateStr)
        .reduce((acc, s) => acc + s.amount, 0);
      return { day: dayName, date: dateStr, amount: total };
    });
  }, [filteredSales]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-[#EDEDED]" dir="rtl">
      {/* 1. Top Core Hero */}
      <div className="bg-[#111111] text-[#EDEDED] rounded-3xl p-6 sm:p-7 border border-[#292B2E] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8A75A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#C8A75A]/15 text-[#C8A75A] border border-[#C8A75A]/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                مركز العمليات الذكي
              </span>
              <span className="text-xs text-[#A1A1AA]">
                {activeCompanyId === "all"
                  ? `🌐 جميع الشركات (${companies.length})`
                  : `🏢 ${activeCompany?.name}`}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#EDEDED]">
              {greeting}
            </h1>
            <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-xl leading-relaxed">
              {subGreeting} <br />
              عندك النهاردة{" "}
              <button
                onClick={() => navigateToTabWithFilter("followups", { followUpStatus: "today" })}
                className="text-[#EDEDED] font-bold underline decoration-dashed hover:text-[#C8A75A] cursor-pointer transition-colors"
                title="اضغط للانتقال لمتابعات اليوم"
              >
                {todayFollowUps.length} متابعة مستحقة ⏰
              </button>
              ، و{" "}
              <button
                onClick={() => navigateToTabWithFilter("customers", { interestLevel: "hot" })}
                className="text-[#C8A75A] font-bold underline decoration-dashed hover:text-white cursor-pointer transition-colors"
                title="اضغط للانتقال لعملاء Hot"
              >
                {hotCustomers.length} فرص بيع جاهزة للإغلاق 🔥
              </button>
              ، وإجمالي مبيعات اليوم{" "}
              <button
                onClick={() => navigateToTabWithFilter("sales", { date: todayStr })}
                className="text-emerald-400 font-bold underline decoration-dashed hover:text-emerald-300 cursor-pointer transition-colors"
                title="اضغط للانتقال لسجل مبيعات اليوم"
              >
                {(todaySalesTotal || 0).toLocaleString()} ج.م 💰
              </button>
              .
              {overdueFollowUps.length > 0 && (
                <button
                  onClick={() => navigateToTabWithFilter("followups", { followUpStatus: "overdue" })}
                  className="text-rose-400 font-bold block mt-1 hover:underline cursor-pointer transition-colors text-right"
                >
                  ⚠️ ولديك {overdueFollowUps.length} متابعات متأخرة تحتاج تدخلك فوراً! (انقر للعرض)
                </button>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentTab("intake")}
              className="px-4 py-2.5 bg-[#C8A75A] hover:bg-[#DFC17B] text-[#111111] font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-[#111111]" />
              <span>تسجيل استفسار ذكي (AI)</span>
            </button>
            <button
              onClick={() => navigateToTabWithFilter("followups", { followUpStatus: "today" })}
              className="px-4 py-2.5 bg-[#18191B] hover:bg-[#202225] text-[#EDEDED] font-semibold rounded-xl text-xs sm:text-sm border border-[#292B2E] flex items-center gap-2 cursor-pointer transition-all"
            >
              <CalendarDays className="w-4 h-4 text-[#C8A75A]" />
              <span>خطة اليوم ({todayFollowUps.length})</span>
            </button>
          </div>
        </div>

        {/* Monthly Target Live Progress */}
        <div className="mt-6 pt-5 border-t border-[#292B2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div
            onClick={() => navigateToTabWithFilter("performance", {})}
            className="flex items-center gap-3 cursor-pointer group"
            title="عرض تقارير الأداء"
          >
            <div className="p-2 rounded-xl bg-[#18191B] border border-[#292B2E] text-[#C8A75A] group-hover:scale-110 transition-transform">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A1A1AA] block">إنجاز الهدف الشهري للمبيعات المسجلة (انقر للتفاصيل):</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMetricForLineage("monthlySales");
                  }}
                  className="text-[10px] font-bold text-[#C8A75A] hover:underline flex items-center gap-0.5 bg-[#202225] px-1.5 py-0.5 rounded border border-[#292B2E]"
                  title="تتبع خط سير واحتساب مبيعات الشهر (Data Lineage)"
                >
                  🔍 من أين أتى هذا الرقم؟
                </button>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                <span className="text-lg sm:text-xl font-mono font-black text-[#EDEDED]">
                  {(monthlySalesTotal || 0).toLocaleString()} ج.م
                </span>
                <span className="text-xs text-[#A1A1AA]">
                  {monthlyTargetTotal > 0
                    ? `من أصل ${monthlyTargetTotal.toLocaleString()} ج.م`
                    : "الهدف غير محدد"}
                </span>
                {(salesOverrideValue !== null || salesManualAdjustment !== 0) && (
                  <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-amber-950/60 text-amber-400 border border-amber-800/40 animate-pulse" title="قيمة معدلة يدوياً">
                    تعديل يدوي نشط ⚠️
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            onClick={() => navigateToTabWithFilter("performance", {})}
            className="flex-1 max-w-xs space-y-1.5 cursor-pointer"
            title="عرض تقارير الأداء"
          >
            <div className="flex justify-between text-xs font-mono font-bold">
              <span className="text-[#A1A1AA]">نسبة التحقيق</span>
              <span className="text-[#C8A75A]">{monthlyAchievementRate}%</span>
            </div>
            <div className="w-full bg-[#202225] rounded-full h-2 overflow-hidden border border-[#292B2E]">
              <div
                className="bg-gradient-to-r from-[#C8A75A] to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, monthlyAchievementRate)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Strategic Copilot */}
      <div className="bg-[#18191B] rounded-2xl p-5 border border-[#292B2E] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#202225] border border-[#292B2E] text-[#C8A75A] shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#EDEDED]">مستشار الذكاء الاصطناعي (AI Copilot)</h3>
              <p className="text-xs text-[#A1A1AA] leading-relaxed mt-1">
                {aiAdvice ? (
                  <span className="text-[#EDEDED] font-medium whitespace-pre-line leading-relaxed">{aiAdvice}</span>
                ) : (
                  "قم بطلب نصيحة استراتيجية سريعة بناءً على مؤشرات الأداء الحالية ومتابعات اليوم لمساعدتك على التركيز في إغلاق الصفقات الهامة."
                )}
              </p>
            </div>
          </div>
          <button
            onClick={getStrategicAdvice}
            disabled={loadingAdvice}
            className="shrink-0 px-4 py-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs font-bold text-[#EDEDED] hover:bg-[#25282C] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loadingAdvice ? (
              <RefreshCw className="w-4 h-4 text-[#C8A75A] animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#C8A75A]" />
            )}
            <span>{aiAdvice ? "تحديث النصيحة" : "اطلب نصيحة استراتيجية"}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid with Drill-down */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1: Opportunities */}
        <div
          onClick={() => navigateToTabWithFilter("opportunities", {})}
          className="bg-[#18191B] rounded-2xl p-4 border border-[#292B2E] shadow-sm hover:border-[#C8A75A] transition-all cursor-pointer group"
          title="انقر لفتح مركز الفرص البيعية"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A1A1AA]">الفرص البيعية 📈</span>
            <div className="p-2 rounded-xl bg-blue-950/50 border border-blue-800/40 text-blue-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#EDEDED] font-mono mt-2">
            {opportunities.length}
          </div>
          <p className="text-[11px] text-[#A1A1AA] mt-1">اضغط لاستعراض كافة الفرص الحالية</p>
        </div>

        {/* Metric 1: Follow-ups */}
        <div
          onClick={() => navigateToTabWithFilter("followups", { followUpStatus: "today" })}
          className="bg-[#18191B] rounded-2xl p-4 border border-[#292B2E] shadow-sm hover:border-[#C8A75A] transition-all cursor-pointer group"
          title="انقر لفتح متابعات اليوم"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A1A1AA]">متابعات اليوم</span>
            <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-800/40 text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#EDEDED] font-mono mt-2">
            {todayFollowUps.length}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px]">
            {overdueFollowUps.length > 0 ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToTabWithFilter("followups", { followUpStatus: "overdue" });
                }}
                className="font-bold text-rose-400 flex items-center gap-0.5 hover:underline"
                title="انقر لعرض المتابعات المتأخرة فقط"
              >
                <AlertCircle className="w-3 h-3" />
                {overdueFollowUps.length} متأخرة
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">لا يوجد متأخرات ✓</span>
            )}
          </div>
        </div>

        {/* Metric 2: Hot Customers */}
        <div
          onClick={() => navigateToTabWithFilter("customers", { interestLevel: "hot" })}
          className="bg-[#18191B] rounded-2xl p-4 border border-[#292B2E] shadow-sm hover:border-[#C8A75A] transition-all cursor-pointer group"
          title="انقر لفتح عملاء Hot فقط"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A1A1AA]">عملاء Hot 🔥</span>
            <div className="p-2 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-400 group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono mt-2">
            {hotCustomers.length}
          </div>
          <p className="text-[11px] text-[#A1A1AA] mt-1">فرص إغلاق سريعة (انقر للتصفية)</p>
        </div>

        {/* Metric 3: Customers & Inquiries */}
        <div
          onClick={() => navigateToTabWithFilter("customers", {})}
          className="bg-[#18191B] rounded-2xl p-4 border border-[#292B2E] shadow-sm hover:border-[#C8A75A] transition-all cursor-pointer group"
          title="انقر لفتح سجل العملاء"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A1A1AA]">قاعدة العملاء</span>
            <div className="p-2 rounded-xl bg-[#202225] border border-[#292B2E] text-[#EDEDED] group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#EDEDED] font-mono mt-2">
            {filteredCustomers.length}
          </div>
          <p
            onClick={(e) => {
              e.stopPropagation();
              navigateToTabWithFilter("inquiries", {});
            }}
            className="text-[11px] text-[#A1A1AA] mt-1 hover:text-[#C8A75A] hover:underline"
            title="انقر لفتح شاشة الاستفسارات"
          >
            {filteredInquiries.length} استفسار مسجل
          </p>
        </div>

        {/* Metric 4: Sales Today */}
        <div
          onClick={() => navigateToTabWithFilter("sales", { date: todayStr })}
          className="bg-[#18191B] rounded-2xl p-4 border border-[#292B2E] shadow-sm hover:border-[#C8A75A] transition-all cursor-pointer group"
          title="انقر لفتح المبيعات المسجلة اليوم"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A1A1AA]">المبيعات المسجلة اليوم</span>
            <div className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-2">
            {(todaySalesTotal || 0).toLocaleString()}{" "}
            <span className="text-[10px] text-[#A1A1AA] font-normal">ج.م</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-semibold mt-1">المبيعات المسجلة اليوم (انقر للعرض)</p>
        </div>

        {/* Metric 5: Monthly Target */}
        <div
          onClick={() => navigateToTabWithFilter("performance", {})}
          className="bg-[#18191B] rounded-2xl p-4 border border-[#292B2E] shadow-sm hover:border-[#C8A75A] transition-all cursor-pointer group col-span-2 lg:col-span-1"
          title="انقر لفتح لوحة أداء المبيعات"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#A1A1AA]">الهدف الشهري 🎯</span>
            <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-800/40 text-[#C8A75A] group-hover:scale-110 transition-transform">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#C8A75A] font-mono mt-2">
            {monthlyAchievementRate}%
          </div>
          <p className="text-[11px] text-[#A1A1AA] mt-1">
            {(monthlySalesTotal || 0).toLocaleString()} ج.م محققة
          </p>
        </div>
      </div>

      {/* 3. Interactive Sales Charts & Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sales Pipeline Funnel Overview */}
        <div className="bg-[#18191B] rounded-2xl p-5 border border-[#292B2E] shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#EDEDED]">
                مسار المبيعات التفاعلي (Sales Funnel)
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                اضغط على أي مرحلة لاستعراض وتصفية عملائها فوراً
              </p>
            </div>
            <button
              onClick={() => navigateToTabWithFilter("customers", {})}
              className="text-xs font-bold text-[#C8A75A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>عرض كل العملاء</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col mt-2 flex-1 justify-center h-[230px] w-full" style={{ direction: "ltr" }}>
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip
                  formatter={(value: number) => [value, "العدد"]}
                  contentStyle={{
                    backgroundColor: "#18191B",
                    borderColor: "#292B2E",
                    color: "#EDEDED",
                    textAlign: "right",
                    borderRadius: "8px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                  }}
                />
                <Funnel
                  dataKey="value"
                  data={funnelData}
                  isAnimationActive
                  onClick={(entry: any) => {
                    if (entry && entry.key) {
                      navigateToTabWithFilter("customers", { stage: String(entry.key) as any });
                    }
                  }}
                  className="cursor-pointer"
                >
                  <LabelList
                    position="center"
                    fill="#111111"
                    stroke="none"
                    dataKey="name"
                    className="font-bold text-xs pointer-events-none"
                  />
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity cursor-pointer" />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Stage Buttons (Mobile & Desktop Accessible Drill-down) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2 border-t border-[#292B2E]">
            {[
              { key: "inquiry", label: "استفسار", count: stagesCount.inquiry },
              { key: "contacted", label: "تواصل", count: stagesCount.contacted },
              { key: "inspection", label: "معاينة", count: stagesCount.inspection },
              { key: "quotation", label: "عرض سعر", count: stagesCount.quotation },
              { key: "negotiation", label: "تفاوض", count: stagesCount.negotiation },
              { key: "contracted", label: "تعاقد ✓", count: stagesCount.contracted },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => navigateToTabWithFilter("customers", { stage: st.key })}
                className="p-1.5 rounded-lg border border-[#292B2E] hover:border-[#C8A75A] bg-[#202225] text-center cursor-pointer transition-all hover:scale-105"
                title={`تصفية العملاء في مرحلة ${st.label}`}
              >
                <div className="text-[10px] text-[#A1A1AA]">{st.label}</div>
                <div className="text-xs font-black text-[#EDEDED]">{st.count}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Monthly Revenue Trend */}
        <div className="bg-[#18191B] rounded-2xl p-5 border border-[#292B2E] shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#EDEDED]">
                تطور المبيعات اليومي (آخر 7 أيام)
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                اضغط على أي يوم لفتح سجل مبيعاته فوراً
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-[#202225] text-[#C8A75A]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 min-h-[230px] pt-4 w-full" style={{ direction: "ltr" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#292B2E" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A1A1AA" }} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#A1A1AA" }}
                  dx={-10}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number) => [`${(value || 0).toLocaleString()} ج.م`, "المبيعات"]}
                  contentStyle={{
                    backgroundColor: "#18191B",
                    borderColor: "#292B2E",
                    color: "#EDEDED",
                    textAlign: "right",
                    borderRadius: "8px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                  }}
                  cursor={{ fill: "#202225" }}
                />
                <Bar
                  dataKey="amount"
                  fill="#C8A75A"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  onClick={(entry: any) => {
                    if (entry && entry.date) {
                      navigateToTabWithFilter("sales", { date: entry.date });
                    }
                  }}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Daily Badges for Direct Drill-down */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pt-2 border-t border-[#292B2E] scrollbar-none">
            {salesTrendData.map((d) => (
              <button
                key={d.date}
                onClick={() => navigateToTabWithFilter("sales", { date: d.date })}
                className="px-2 py-1 rounded-lg bg-[#202225] hover:bg-[#25282C] hover:border-[#C8A75A] border border-[#292B2E] text-center cursor-pointer shrink-0 transition-colors"
                title={`عرض مبيعات ${d.day} (${d.date})`}
              >
                <span className="block text-[10px] text-[#A1A1AA]">{d.day}</span>
                <span className="block text-[11px] font-mono font-bold text-[#EDEDED]">
                  {(d.amount || 0).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Action Focus Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Priority Follow-ups */}
        <div className="bg-[#18191B] rounded-2xl p-5 border border-[#292B2E] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-950/50 border border-amber-800/40 text-amber-400">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold text-[#EDEDED]">
                متابعات تتطلب اتخاذ إجراء اليوم ({todayFollowUps.length})
              </h3>
            </div>
            <button
              onClick={() => navigateToTabWithFilter("followups", { followUpStatus: "today" })}
              className="text-xs font-bold text-[#C8A75A] hover:underline cursor-pointer"
            >
              عرض الكل ({todayFollowUps.length})
            </button>
          </div>

          <div className="space-y-2">
            {todayFollowUps.slice(0, 4).map((f) => (
              <div
                key={f.id}
                className="p-3 rounded-xl bg-[#202225] border border-[#292B2E] hover:border-[#C8A75A]/60 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span 
    className="font-extrabold text-xs text-[#EDEDED] truncate cursor-pointer hover:text-[#C8A75A] transition-colors"
    onClick={(e) => {
      e.stopPropagation();
      setSelectedCustomerIdFor360(f.customerId);
    }}
  >
    {f.customerName}
  </span>
                    {f.time && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300 font-semibold font-mono">
                        {f.time}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5">{f.title}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${f.customerPhone}`}
                    className="p-1.5 bg-[#18191B] hover:bg-[#25282C] text-[#EDEDED] rounded-lg border border-[#292B2E]"
                    title="اتصال"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setSelectedCustomerIdFor360(f.customerId)}
                    className="p-1.5 bg-[#18191B] text-[#C8A75A] rounded-lg hover:bg-[#25282C] border border-[#292B2E] cursor-pointer"
                    title="ملف العميل"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {todayFollowUps.length === 0 && (
              <div className="p-6 text-center text-xs text-[#A1A1AA] bg-[#202225] rounded-xl border border-[#292B2E]">
                لا توجد متابعات مستحقة اليوم. أحسنت! 🎉
              </div>
            )}
          </div>
        </div>

        {/* Hot Opportunities requiring closing */}
        <div className="bg-[#18191B] rounded-2xl p-5 border border-[#292B2E] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-950/50 border border-rose-800/40 text-rose-400">
                <Flame className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold text-[#EDEDED]">
                فرص بيعية ساخنة تحتاج للإغلاق ({hotCustomers.length})
              </h3>
            </div>
            <button
              onClick={() => navigateToTabWithFilter("customers", { interestLevel: "hot" })}
              className="text-xs font-bold text-[#C8A75A] hover:underline cursor-pointer"
            >
              عرض الكل ({hotCustomers.length})
            </button>
          </div>

          <div className="space-y-2">
            {hotCustomers.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-[#202225] border border-[#292B2E] hover:border-[#C8A75A]/60 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-[#EDEDED] truncate">
                      {c.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-950/60 text-rose-400 font-bold border border-rose-800/40">
                      🔥 Hot
                    </span>
                  </div>
                  <div className="text-[11px] text-[#A1A1AA] flex items-center gap-2 mt-0.5">
                    <span>{c.area}</span>
                    <span>•</span>
                    <span className="font-mono text-[#EDEDED] font-bold">
                      {(c.totalQuotationsValue || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-400 rounded-lg border border-emerald-800/40"
                    title="واتساب"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setSelectedCustomerIdFor360(c.id)}
                    className="p-1.5 bg-[#18191B] text-[#C8A75A] rounded-lg hover:bg-[#25282C] border border-[#292B2E] cursor-pointer"
                    title="فتح الملف الكامل"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {hotCustomers.length === 0 && (
              <div className="p-6 text-center text-xs text-[#A1A1AA] bg-[#202225] rounded-xl border border-[#292B2E]">
                لا توجد فرص ساخنة حالياً. سجّل استفسارات جديدة لبناء الفرص.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setCurrentTab("import")}
          className="p-3 bg-[#18191B] border border-[#292B2E] rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-[#202225] hover:border-[#C8A75A] transition-colors cursor-pointer group text-[#EDEDED]"
        >
          <FileSpreadsheet className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#C8A75A]" />
          <span className="text-[11px] font-bold text-[#EDEDED]">استيراد اكسيل</span>
        </button>
        <button
          onClick={() => setCurrentTab("performance")}
          className="p-3 bg-[#18191B] border border-[#292B2E] rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-[#202225] hover:border-[#C8A75A] transition-colors cursor-pointer group text-[#EDEDED]"
        >
          <Target className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#C8A75A]" />
          <span className="text-[11px] font-bold text-[#EDEDED]">أداء المبيعات</span>
        </button>
        <button
          onClick={() => setCurrentTab("inquiries")}
          className="p-3 bg-[#18191B] border border-[#292B2E] rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-[#202225] hover:border-[#C8A75A] transition-colors cursor-pointer group text-[#EDEDED]"
        >
          <Users className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#C8A75A]" />
          <span className="text-[11px] font-bold text-[#EDEDED]">الاستفسارات والعملاء</span>
        </button>
        <button
          onClick={() => setCurrentTab("settings")}
          className="p-3 bg-[#18191B] border border-[#292B2E] rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-[#202225] hover:border-[#C8A75A] transition-colors cursor-pointer group text-[#EDEDED]"
        >
          <Settings className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#C8A75A]" />
          <span className="text-[11px] font-bold text-[#EDEDED]">إعدادات النظام</span>
        </button>
      </div>
    </div>
  );
};
