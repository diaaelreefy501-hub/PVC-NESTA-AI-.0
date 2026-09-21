import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { Company } from "../../types";
import { CompanyLogo } from "../common/CompanyLogo";
import { GlobalFilterBar } from "../common/GlobalFilterBar";
import { CompaniesView } from "./CompaniesView";
import {
  computeUnifiedKPIs,
  getCompanyKPIBreakdown,
  PeriodType,
  KPIEngineDataSnapshot,
} from "../../utils/kpiEngine";
import {
  Building2,
  TrendingUp,
  Target,
  Users,
  DollarSign,
  FileCheck2,
  FileSpreadsheet,
  Receipt,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Calendar,
  Filter,
  BarChart3,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Info,
  Settings,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LineChart,
  Line,
} from "recharts";

export const CompanyPerformanceView: React.FC = () => {
  const {
    companies,
    customers,
    inquiries,
    followUps,
    opportunities,
    quotations,
    inspections,
    contracts,
    sales,
    payments,
    globalFilters,
    setCurrentTab,
    navigateToTabWithFilter,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<"performance" | "comparison">("performance");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("this_month");
  const [selectedCompanyIdsForComp, setSelectedCompanyIdsForComp] = useState<string[]>(
    companies.map((c) => c.id)
  );
  const [metricToCompare, setMetricToCompare] = useState<
    "sales" | "contracts" | "quotations" | "inquiries" | "conversion" | "collections"
  >("sales");

  // Snapshot for KPI Engine
  const snapshot: KPIEngineDataSnapshot = useMemo(() => {
    return {
      companies,
      customers,
      inquiries,
      followUps,
      opportunities,
      quotations,
      inspections,
      contracts,
      sales,
      payments,
    };
  }, [
    companies,
    customers,
    inquiries,
    followUps,
    opportunities,
    quotations,
    inspections,
    contracts,
    sales,
    payments,
  ]);

  // Unified breakdown per company for the chosen period
  const companyMetrics = useMemo(() => {
    return companies.map((comp) => {
      const kpi = computeUnifiedKPIs(snapshot, {
        companyId: comp.id,
        period: selectedPeriod,
      });

      const totalContractsVal = kpi.contracts.totalValue;
      const totalSalesVal = kpi.sales.totalAmount;
      const totalCollections = kpi.collections.totalAmount;
      const totalReceivables = Math.max(0, totalContractsVal - totalCollections);

      // Conversion Rate: (Contracts count / Inquiries count) * 100 or Won / Total Opps
      const conversionRate =
        kpi.inquiries.count > 0
          ? Math.min(100, Math.round((kpi.contracts.count / kpi.inquiries.count) * 100))
          : kpi.opportunities.totalCount > 0
          ? Math.min(100, Math.round((kpi.opportunities.wonCount / kpi.opportunities.totalCount) * 100))
          : 0;

      // Target Achievement %
      const monthlyTarget = comp.monthlyTarget || 300000;
      const targetPct = Math.min(100, Math.round((totalSalesVal / monthlyTarget) * 100));

      return {
        company: comp,
        inquiriesCount: kpi.inquiries.count,
        customersCount: kpi.customers.total,
        opportunitiesCount: kpi.opportunities.totalCount,
        wonOpportunitiesCount: kpi.opportunities.wonCount,
        quotationsCount: kpi.quotations.count,
        quotationsValue: kpi.quotations.totalAmount,
        contractsCount: kpi.contracts.count,
        contractsValue: totalContractsVal,
        salesCount: kpi.sales.count,
        salesValue: totalSalesVal,
        collectionsValue: totalCollections,
        receivablesValue: totalReceivables,
        conversionRate,
        targetPct,
        monthlyTarget,
      };
    });
  }, [companies, snapshot, selectedPeriod]);

  // Aggregate stats across all companies for this period
  const totals = useMemo(() => {
    return companyMetrics.reduce(
      (acc, m) => {
        acc.inquiries += m.inquiriesCount;
        acc.customers += m.customersCount;
        acc.opportunities += m.opportunitiesCount;
        acc.quotationsValue += m.quotationsValue;
        acc.contractsValue += m.contractsValue;
        acc.salesValue += m.salesValue;
        acc.collectionsValue += m.collectionsValue;
        acc.receivablesValue += m.receivablesValue;
        acc.targetTotal += m.monthlyTarget;
        return acc;
      },
      {
        inquiries: 0,
        customers: 0,
        opportunities: 0,
        quotationsValue: 0,
        contractsValue: 0,
        salesValue: 0,
        collectionsValue: 0,
        receivablesValue: 0,
        targetTotal: 0,
      }
    );
  }, [companyMetrics]);

  // Comparison chart data
  const comparisonChartData = useMemo(() => {
    return companyMetrics
      .filter((m) => selectedCompanyIdsForComp.includes(m.company.id))
      .map((m) => ({
        name: m.company.name,
        sales: m.salesValue,
        contracts: m.contractsValue,
        quotations: m.quotationsValue,
        inquiries: m.inquiriesCount,
        conversion: m.conversionRate,
        collections: m.collectionsValue,
        target: m.monthlyTarget,
        color: m.company.color || "#C8A75A",
      }));
  }, [companyMetrics, selectedCompanyIdsForComp]);

  const toggleCompanyForComparison = (id: string) => {
    if (selectedCompanyIdsForComp.includes(id)) {
      if (selectedCompanyIdsForComp.length > 1) {
        setSelectedCompanyIdsForComp(selectedCompanyIdsForComp.filter((cid) => cid !== id));
      }
    } else {
      setSelectedCompanyIdsForComp([...selectedCompanyIdsForComp, id]);
    }
  };

  return (
    <div className="space-y-6 pb-20" dir="rtl" id="company-performance-view">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#C8A75A]/15 text-[#C8A75A] border border-[#C8A75A]/30">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#EDEDED]">أداء الشركات والمقارنات المؤسسية</h1>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            متابعة شاملة للمبيعات، التعاقدات، التحصيلات، ونسب التحويل لكل شركة ومقارنتها بدقة
          </p>
        </div>

        {/* Period Selector & Sub-tabs switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-[#18191B] p-1 rounded-xl border border-[#292B2E]">
            <button
              onClick={() => setSelectedPeriod("this_month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedPeriod === "this_month"
                  ? "bg-[#C8A75A] text-black shadow-xs"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              الشهر الحالي
            </button>
            <button
              onClick={() => setSelectedPeriod("last_month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedPeriod === "last_month"
                  ? "bg-[#C8A75A] text-black shadow-xs"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              الشهر السابق
            </button>
            <button
              onClick={() => setSelectedPeriod("this_year")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedPeriod === "this_year"
                  ? "bg-[#C8A75A] text-black shadow-xs"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              السنة الحالية
            </button>
            <button
              onClick={() => setSelectedPeriod("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedPeriod === "all"
                  ? "bg-[#C8A75A] text-black shadow-xs"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              كل الفترات
            </button>
          </div>

          {/* Sub-tabs switcher */}
          <div className="flex items-center gap-1 bg-[#18191B] p-1 rounded-xl border border-[#292B2E]">
            <button
              onClick={() => setActiveSubTab("performance")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "performance"
                  ? "bg-[#2A2D32] text-[#EDEDED] shadow-xs"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>لوحة أداء الشركات</span>
            </button>
            <button
              onClick={() => setActiveSubTab("comparison")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === "comparison"
                  ? "bg-[#2A2D32] text-[#EDEDED] shadow-xs"
                  : "text-[#A1A1AA] hover:text-[#EDEDED]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>أداة مقارنة الشركات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <GlobalFilterBar showCompanyFilter={false} />

      {/* Overall Multi-Company Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-3.5 space-y-1">
            <div className="text-[11px] text-[#A1A1AA]">إجمالي المبيعات</div>
            <div className="text-base font-bold text-emerald-400">
              {totals.salesValue.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-[#A1A1AA]">من كافة الشركات</div>
          </div>

          <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-3.5 space-y-1">
            <div className="text-[11px] text-[#A1A1AA]">إجمالي التعاقدات</div>
            <div className="text-base font-bold text-[#EDEDED]">
              {totals.contractsValue.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-[#A1A1AA]">عقود معتمدة</div>
          </div>

          <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-3.5 space-y-1">
            <div className="text-[11px] text-[#A1A1AA]">إجمالي التحصيلات</div>
            <div className="text-base font-bold text-[#C8A75A]">
              {totals.collectionsValue.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-[#A1A1AA]">دفعات مستلمة</div>
          </div>

          <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-3.5 space-y-1">
            <div className="text-[11px] text-[#A1A1AA]">المستحقات المتبقية</div>
            <div className="text-base font-bold text-amber-400">
              {totals.receivablesValue.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-[#A1A1AA]">قيد التحصيل</div>
          </div>

          <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-3.5 space-y-1">
            <div className="text-[11px] text-[#A1A1AA]">الاستفسارات والعملاء</div>
            <div className="text-base font-bold text-blue-400">
              {totals.inquiries} / {totals.customers}
            </div>
            <div className="text-[10px] text-[#A1A1AA]">استفسار / عميل</div>
          </div>

          <div className="bg-[#18191B] border border-[#292B2E] rounded-xl p-3.5 space-y-1">
            <div className="text-[11px] text-[#A1A1AA]">الهدف الإجمالي الشهري</div>
            <div className="text-base font-bold text-[#EDEDED]">
              {totals.targetTotal.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              تحقيق {Math.min(100, Math.round((totals.salesValue / (totals.targetTotal || 1)) * 100))}%
            </div>
          </div>
        </div>

      {activeSubTab === "performance" ? (
        /* Performance Cards & Grid per Company */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {companyMetrics.map((m) => {
              const comp = m.company;
              return (
                <div
                  key={comp.id}
                  id={`company-perf-card-${comp.id}`}
                  className="bg-[#18191B] border border-[#292B2E] hover:border-[#3E4247] rounded-2xl p-5 space-y-4 transition-all shadow-md relative overflow-hidden"
                >
                  {/* Top Color Accent Bar */}
                  <div
                    className="absolute top-0 right-0 left-0 h-1.5"
                    style={{
                      background: `linear-gradient(to left, ${comp.color || "#C8A75A"}, ${
                        comp.secondaryColor || "#111111"
                      })`,
                    }}
                  />

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      <CompanyLogo company={comp} size="md" />
                      <div>
                        <h3 className="text-base font-bold text-[#EDEDED]">{comp.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                          <span>{comp.nameEn || "Company"}</span>
                          <span>•</span>
                          <span>{comp.phone || "بدون هاتف"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-[10px] text-[#A1A1AA]">نسبة التحويل</div>
                      <div className="text-sm font-bold text-[#C8A75A]">
                        {m.conversionRate}%
                      </div>
                    </div>
                  </div>

                  {/* Progress to Target */}
                  <div className="bg-[#202225] p-3 rounded-xl space-y-2 border border-[#292B2E]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A1A1AA] flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-[#C8A75A]" />
                        <span>تحقيق الهدف الشهري:</span>
                      </span>
                      <span className="font-bold text-[#EDEDED]">
                        {m.salesValue.toLocaleString()} / {m.monthlyTarget.toLocaleString()} ج.م
                        <span className="text-[#C8A75A] mr-1.5">({m.targetPct}%)</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#18191B] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${m.targetPct}%`,
                          backgroundColor: comp.color || "#C8A75A",
                        }}
                      />
                    </div>
                  </div>

                  {/* 8-Metric Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-[#202225] p-2 rounded-lg border border-[#292B2E]">
                      <div className="text-[10px] text-[#A1A1AA]">الاستفسارات</div>
                      <div className="text-xs font-bold text-blue-400 mt-0.5">
                        {m.inquiriesCount}
                      </div>
                    </div>
                    <div className="bg-[#202225] p-2 rounded-lg border border-[#292B2E]">
                      <div className="text-[10px] text-[#A1A1AA]">العملاء</div>
                      <div className="text-xs font-bold text-[#EDEDED] mt-0.5">
                        {m.customersCount}
                      </div>
                    </div>
                    <div className="bg-[#202225] p-2 rounded-lg border border-[#292B2E]">
                      <div className="text-[10px] text-[#A1A1AA]">الفرص</div>
                      <div className="text-xs font-bold text-amber-400 mt-0.5">
                        {m.opportunitiesCount}
                      </div>
                    </div>
                    <div className="bg-[#202225] p-2 rounded-lg border border-[#292B2E]">
                      <div className="text-[10px] text-[#A1A1AA]">عروض الأسعار</div>
                      <div className="text-xs font-bold text-[#EDEDED] mt-0.5">
                        {m.quotationsCount}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2 bg-[#202225] p-2.5 rounded-xl border border-[#292B2E]">
                    <div>
                      <div className="text-[10px] text-[#A1A1AA]">قيمة التعاقدات:</div>
                      <div className="text-xs font-bold text-[#EDEDED]">
                        {m.contractsValue.toLocaleString()} ج.م
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#A1A1AA]">المتحصل الفعلي:</div>
                      <div className="text-xs font-bold text-emerald-400">
                        {m.collectionsValue.toLocaleString()} ج.م
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#A1A1AA]">المستحقات المتبقية:</div>
                      <div className="text-xs font-bold text-amber-400">
                        {m.receivablesValue.toLocaleString()} ج.م
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Master Company Performance Table */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4 shadow-md overflow-hidden">
            <h3 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#C8A75A]" />
              <span>جدول المقاييس التفصيلية لأداء الشركات</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-[#EDEDED]">
                <thead>
                  <tr className="border-b border-[#292B2E] text-[#A1A1AA] pb-2">
                    <th className="pb-2.5 font-semibold">الشركة</th>
                    <th className="pb-2.5 font-semibold">الاستفسارات</th>
                    <th className="pb-2.5 font-semibold">العملاء</th>
                    <th className="pb-2.5 font-semibold">الفرص</th>
                    <th className="pb-2.5 font-semibold">عروض الأسعار</th>
                    <th className="pb-2.5 font-semibold">التعاقدات</th>
                    <th className="pb-2.5 font-semibold">المبيعات</th>
                    <th className="pb-2.5 font-semibold">التحصيل</th>
                    <th className="pb-2.5 font-semibold">المستحقات</th>
                    <th className="pb-2.5 font-semibold">التحويل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {companyMetrics.map((m) => (
                    <tr key={m.company.id} className="hover:bg-[#202225]/50 transition-colors">
                      <td className="py-3 font-bold flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: m.company.color || "#C8A75A" }}
                        />
                        <span>{m.company.name}</span>
                      </td>
                      <td className="py-3 text-blue-400">{m.inquiriesCount}</td>
                      <td className="py-3">{m.customersCount}</td>
                      <td className="py-3 text-amber-400">{m.opportunitiesCount}</td>
                      <td className="py-3">{m.quotationsValue.toLocaleString()} ج.م</td>
                      <td className="py-3 font-semibold">{m.contractsValue.toLocaleString()} ج.م</td>
                      <td className="py-3 text-emerald-400 font-bold">
                        {m.salesValue.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 text-[#C8A75A] font-semibold">
                        {m.collectionsValue.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 text-amber-400">
                        {m.receivablesValue.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 font-bold text-[#C8A75A]">{m.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === "comparison" ? (
        /* Direct Multi-Company Comparison Tool */
        <div className="space-y-6">
          {/* Comparison Controls */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-[#EDEDED]">تحديد الشركات للمقارنة المباشرة</h3>
                <p className="text-xs text-[#A1A1AA]">
                  اختر شركتين أو أكثر لعرض المقارنة البيانية والأرقام المقابلة
                </p>
              </div>

              {/* Metric Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A1A1AA]">المعيار الأساسي:</span>
                <select
                  value={metricToCompare}
                  onChange={(e) => setMetricToCompare(e.target.value as any)}
                  className="bg-[#202225] border border-[#292B2E] rounded-lg px-3 py-1.5 text-xs text-[#EDEDED] cursor-pointer"
                >
                  <option value="sales">المبيعات الفعلية (Sales)</option>
                  <option value="contracts">قيمة التعاقدات (Contracts)</option>
                  <option value="quotations">عروض الأسعار (Quotations)</option>
                  <option value="collections">التحصيلات النقدية (Collections)</option>
                  <option value="inquiries">عدد الاستفسارات (Inquiries)</option>
                  <option value="conversion">معدل التحويل (Conversion Rate %)</option>
                </select>
              </div>
            </div>

            {/* Company Selection Chips */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#292B2E]">
              {companies.map((c) => {
                const isSelected = selectedCompanyIdsForComp.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCompanyForComparison(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#C8A75A] text-black border-[#C8A75A] font-bold"
                        : "bg-[#202225] text-[#A1A1AA] border-[#292B2E] hover:text-white"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: c.color || "#C8A75A" }}
                    />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparison Bar Chart */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-[#EDEDED]">
              مقارنة بيانية:{" "}
              {metricToCompare === "sales"
                ? "المبيعات مقابل الهدف"
                : metricToCompare === "contracts"
                ? "قيمة التعاقدات"
                : metricToCompare === "quotations"
                ? "عروض الأسعار"
                : metricToCompare === "collections"
                ? "التحصيلات"
                : metricToCompare === "conversion"
                ? "معدل التحويل %"
                : "الاستفسارات"}
            </h3>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292B2E" />
                  <XAxis dataKey="name" stroke="#A1A1AA" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#A1A1AA" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18191B",
                      border: "1px solid #292B2E",
                      borderRadius: "8px",
                      color: "#EDEDED",
                    }}
                  />
                  <Bar
                    dataKey={metricToCompare}
                    fill="#C8A75A"
                    radius={[6, 6, 0, 0]}
                    name={metricToCompare}
                  >
                    {comparisonChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side-by-Side Comparison Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companyMetrics
              .filter((m) => selectedCompanyIdsForComp.includes(m.company.id))
              .map((m) => (
                <div
                  key={m.company.id}
                  className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#292B2E]">
                    <CompanyLogo company={m.company} size="sm" />
                    <div>
                      <h4 className="text-sm font-bold text-[#EDEDED]">{m.company.name}</h4>
                      <span className="text-[10px] text-[#A1A1AA]">{m.company.nameEn}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#292B2E]/50">
                      <span className="text-[#A1A1AA]">المبيعات الفعلية:</span>
                      <span className="font-bold text-emerald-400">{m.salesValue.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#292B2E]/50">
                      <span className="text-[#A1A1AA]">التعاقدات:</span>
                      <span className="font-bold text-[#EDEDED]">{m.contractsValue.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#292B2E]/50">
                      <span className="text-[#A1A1AA]">عروض الأسعار:</span>
                      <span className="font-bold text-[#EDEDED]">{m.quotationsValue.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#292B2E]/50">
                      <span className="text-[#A1A1AA]">المتحصل النقدي:</span>
                      <span className="font-bold text-[#C8A75A]">{m.collectionsValue.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#292B2E]/50">
                      <span className="text-[#A1A1AA]">المستحقات المتبقية:</span>
                      <span className="font-bold text-amber-400">{m.receivablesValue.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#292B2E]/50">
                      <span className="text-[#A1A1AA]">الاستفسارات:</span>
                      <span className="font-bold text-blue-400">{m.inquiriesCount}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#A1A1AA]">معدل التحويل:</span>
                      <span className="font-bold text-[#C8A75A]">{m.conversionRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
