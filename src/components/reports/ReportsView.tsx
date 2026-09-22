import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  FileText,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Download,
  Calendar,
  Building2,
  PieChart,
  Percent,
  CheckCircle2,
  XCircle,
  Inbox,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  CreditCard,
  Award,
  Search,
} from "lucide-react";
import { PeriodType, PeriodFilterOptions, filterEntityCollection } from "../../utils/kpiEngine";
import { CompanyIdentity } from "../common/CompanyIdentity";

type ReportCategory =
  | "sales"
  | "collections"
  | "customers"
  | "pipeline"
  | "quotes_inquiries"
  | "team"
  | "marketing"
  | "companies_compare"
  | "nesta_services";

export const ReportsView: React.FC = () => {
  const {
    companies,
    selectedCompanyIds,
    activeCompany,
    filteredCustomers,
    filteredInquiries,
    filteredQuotations,
    filteredInspections,
    filteredContracts,
    filteredSales,
    filteredPayments,
    filteredOpportunities,
    lossReasons,
    users,
    setCurrentTab,
    setSelectedCustomerIdFor360,
    showToast,
  } = useApp();

  // Active Report Category
  const [activeCategory, setActiveCategory] = useState<ReportCategory>("sales");

  // Filter States
  const [period, setPeriod] = useState<PeriodType>("this_month");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");

  // Determine effective period options
  const periodOptions: PeriodFilterOptions = useMemo(() => {
    return {
      period,
      customStartDate: period === "custom" ? customStart : undefined,
      customEndDate: period === "custom" ? customEnd : undefined,
    };
  }, [period, customStart, customEnd]);

  // Target company filter: respect both global multi-company selection & local report filter
  const targetCompanyId = useMemo(() => {
    if (selectedCompanyFilter !== "all") return selectedCompanyFilter;
    if (selectedCompanyIds.length === 1 && selectedCompanyIds[0] !== "all") {
      return selectedCompanyIds[0];
    }
    if (selectedCompanyIds.length > 1) {
      return selectedCompanyIds;
    }
    return "all";
  }, [selectedCompanyFilter, selectedCompanyIds]);

  // Filtered Datasets for Reports using unified filterEntityCollection
  const reportData = useMemo(() => {
    const contracts = filterEntityCollection(filteredContracts, "contract", targetCompanyId, periodOptions);
    const sales = filterEntityCollection(filteredSales, "sale", targetCompanyId, periodOptions);
    const payments = filterEntityCollection(filteredPayments, "payment", targetCompanyId, periodOptions);
    const customers = filterEntityCollection(filteredCustomers, "customer", targetCompanyId, periodOptions);
    const inquiries = filterEntityCollection(filteredInquiries, "inquiry", targetCompanyId, periodOptions);
    const quotations = filterEntityCollection(filteredQuotations, "quotation", targetCompanyId, periodOptions);
    const opportunities = filterEntityCollection(filteredOpportunities, "opportunity", targetCompanyId, periodOptions);

    return {
      contracts,
      sales,
      payments,
      customers,
      inquiries,
      quotations,
      opportunities,
    };
  }, [
    filteredContracts,
    filteredSales,
    filteredPayments,
    filteredCustomers,
    filteredInquiries,
    filteredQuotations,
    filteredOpportunities,
    targetCompanyId,
    periodOptions,
  ]);

  // 1. Sales & Contracts Aggregations
  const salesAggregates = useMemo(() => {
    const totalVolume = reportData.contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    const count = reportData.contracts.length;
    const avgDeal = count > 0 ? Math.round(totalVolume / count) : 0;

    // By Company
    const byCompany: Record<string, { name: string; volume: number; count: number; color?: string }> = {};
    reportData.contracts.forEach((c) => {
      const comp = companies.find((cp) => cp.id === c.companyId);
      const name = comp?.name || "غير محدد";
      if (!byCompany[name]) {
        byCompany[name] = { name, volume: 0, count: 0, color: comp?.color };
      }
      byCompany[name].volume += c.totalValue || 0;
      byCompany[name].count += 1;
    });

    // By Sales Rep
    const byRep: Record<string, { name: string; volume: number; count: number }> = {};
    reportData.contracts.forEach((c) => {
      const rep = c.assignedTo || c.salesRep || "فريق المبيعات";
      if (!byRep[rep]) byRep[rep] = { name: rep, volume: 0, count: 0 };
      byRep[rep].volume += c.totalValue || 0;
      byRep[rep].count += 1;
    });

    return {
      totalVolume,
      count,
      avgDeal,
      byCompany: Object.values(byCompany),
      byRep: Object.values(byRep).sort((a, b) => b.volume - a.volume),
    };
  }, [reportData.contracts, companies]);

  // 2. Collections Aggregations
  const collectionsAggregates = useMemo(() => {
    const totalCollected = reportData.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalContractsValue = reportData.contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    const totalRemaining = Math.max(0, totalContractsValue - totalCollected);
    const rate = totalContractsValue > 0 ? Math.round((totalCollected / totalContractsValue) * 100) : 0;

    const byMethod: Record<string, number> = {};
    reportData.payments.forEach((p) => {
      const m = p.method || "other";
      byMethod[m] = (byMethod[m] || 0) + p.amount;
    });

    return {
      totalCollected,
      totalRemaining,
      rate,
      paymentsCount: reportData.payments.length,
      byMethod,
    };
  }, [reportData.payments, reportData.contracts]);

  // 3. Customer Sources & Areas
  const customerAggregates = useMemo(() => {
    const bySource: Record<string, number> = {};
    const byArea: Record<string, number> = {};

    reportData.customers.forEach((c) => {
      const src = c.source || "مباشر / هاتف";
      bySource[src] = (bySource[src] || 0) + 1;

      const area = c.area || c.city || "القاهرة الكبرى";
      byArea[area] = (byArea[area] || 0) + 1;
    });

    return {
      total: reportData.customers.length,
      bySource: Object.entries(bySource).map(([name, count]) => ({ name, count })),
      byArea: Object.entries(byArea).map(([name, count]) => ({ name, count })),
    };
  }, [reportData.customers]);

  // 4. Pipeline & Opportunities
  const pipelineAggregates = useMemo(() => {
    const total = reportData.opportunities.length;
    const won = reportData.opportunities.filter((o) => o.status === "won").length;
    const lost = reportData.opportunities.filter((o) => o.status === "lost").length;
    const open = reportData.opportunities.filter((o) => o.status === "open").length;
    const winRate = total > 0 ? Math.round((won / total) * 100) : 0;
    const pipelineValue = reportData.opportunities.reduce((sum, o) => sum + (o.value || 0), 0);

    // Lost reasons
    const lostReasonsMap: Record<string, number> = {};
    reportData.opportunities
      .filter((o) => o.status === "lost" && o.lossReason)
      .forEach((o) => {
        const r = o.lossReason || "أسباب أخرى";
        lostReasonsMap[r] = (lostReasonsMap[r] || 0) + 1;
      });

    return {
      total,
      won,
      lost,
      open,
      winRate,
      pipelineValue,
      lostReasons: Object.entries(lostReasonsMap).map(([reason, count]) => ({ reason, count })),
    };
  }, [reportData.opportunities]);

  // 5. Inquiries & Quotations Funnel
  const funnelAggregates = useMemo(() => {
    const inquiriesCount = reportData.inquiries.length;
    const quotesCount = reportData.quotations.length;
    const quotesTotalValue = reportData.quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
    const contractsCount = reportData.contracts.length;

    const inqToQuoteRate = inquiriesCount > 0 ? Math.round((quotesCount / inquiriesCount) * 100) : 0;
    const quoteToContractRate = quotesCount > 0 ? Math.round((contractsCount / quotesCount) * 100) : 0;

    return {
      inquiriesCount,
      quotesCount,
      quotesTotalValue,
      contractsCount,
      inqToQuoteRate,
      quoteToContractRate,
    };
  }, [reportData.inquiries, reportData.quotations, reportData.contracts]);

  // 6. Sales Team Matrix
  const teamAggregates = useMemo(() => {
    const repStats: Record<
      string,
      {
        name: string;
        inquiries: number;
        quotations: number;
        contracts: number;
        salesVolume: number;
        collected: number;
      }
    > = {};

    reportData.inquiries.forEach((inq) => {
      const rep = inq.assignedTo || "غير محدد";
      if (!repStats[rep]) {
        repStats[rep] = { name: rep, inquiries: 0, quotations: 0, contracts: 0, salesVolume: 0, collected: 0 };
      }
      repStats[rep].inquiries += 1;
    });

    reportData.quotations.forEach((q) => {
      const rep = q.assignedTo || q.createdBy || "غير محدد";
      if (!repStats[rep]) {
        repStats[rep] = { name: rep, inquiries: 0, quotations: 0, contracts: 0, salesVolume: 0, collected: 0 };
      }
      repStats[rep].quotations += 1;
    });

    reportData.contracts.forEach((c) => {
      const rep = c.assignedTo || c.salesRep || "غير محدد";
      if (!repStats[rep]) {
        repStats[rep] = { name: rep, inquiries: 0, quotations: 0, contracts: 0, salesVolume: 0, collected: 0 };
      }
      repStats[rep].contracts += 1;
      repStats[rep].salesVolume += c.totalValue || 0;
      repStats[rep].collected += c.paidAmount || 0;
    });

    return Object.values(repStats).sort((a, b) => b.salesVolume - a.salesVolume);
  }, [reportData.inquiries, reportData.quotations, reportData.contracts]);

  // 7. Company Comparison Matrix
  const companyComparison = useMemo(() => {
    return companies.map((comp) => {
      const compContracts = filteredContracts.filter(
        (c) =>
          c.companyId === comp.id &&
          c.recordStatus !== "duplicate" &&
          c.recordStatus !== "excluded" &&
          c.status !== "cancelled"
      );
      const compVolume = compContracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);
      const compPayments = filteredPayments.filter(
        (p) =>
          p.companyId === comp.id &&
          p.recordStatus !== "duplicate" &&
          p.recordStatus !== "excluded" &&
          p.status !== "reversed"
      );
      const compCollected = compPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const target = comp.monthlyTarget || 300000;
      const achievement = target > 0 ? Math.round((compVolume / target) * 100) : 0;
      const quotesCount = filteredQuotations.filter((q) => q.companyId === comp.id).length;

      return {
        company: comp,
        target,
        volume: compVolume,
        collected: compCollected,
        achievement,
        contractsCount: compContracts.length,
        quotesCount,
      };
    });
  }, [companies, filteredContracts, filteredPayments, filteredQuotations]);

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const csvRows: string[][] = [];
    if (activeCategory === "sales") {
      csvRows.push(["مسؤول المبيعات", "عدد العقود", "إجمالي المبيعات (ج.م)"]);
      salesAggregates.byRep.forEach((r) => {
        csvRows.push([`"${r.name}"`, String(r.count), String(r.volume)]);
      });
    } else if (activeCategory === "team") {
      csvRows.push(["مسؤول المبيعات", "الاستفسارات", "عروض الأسعار", "العقود", "إجمالي المبيعات", "المحصل"]);
      teamAggregates.forEach((r) => {
        csvRows.push([`"${r.name}"`, String(r.inquiries), String(r.quotations), String(r.contracts), String(r.salesVolume), String(r.collected)]);
      });
    } else {
      csvRows.push(["الشركة", "المستهدف", "المبيعات المحققة", "التحصيلات", "نسبة الإنجاز %"]);
      companyComparison.forEach((c) => {
        csvRows.push([`"${c.company.name}"`, String(c.target), String(c.volume), String(c.collected), `${c.achievement}%`]);
      });
    }

    const csvContent = "\uFEFF" + csvRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${activeCategory}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("تم تصدير التقرير بنجاح", "success");
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#18191B] p-5 rounded-2xl border border-[#292B2E] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-[#EDEDED]">مركز التقارير والتحليلات الموحد</h1>
              <CompanyIdentity size="xs" />
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              تقارير استراتيجية دقيقة ومحدثة آنياً من واقع السجلات المعتمدة لكافة العمليات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-[#202225] hover:bg-[#272A2D] text-[#EDEDED] text-xs font-bold rounded-xl border border-[#292B2E] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="تصدير التقرير الحالي إلى CSV"
          >
            <Download className="w-4 h-4 text-[#A1A1AA]" />
            <span>تصدير CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-[#202225] hover:bg-[#272A2D] text-[#EDEDED] text-xs font-bold rounded-xl border border-[#292B2E] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="طباعة التقرير"
          >
            <Printer className="w-4 h-4 text-[#A1A1AA]" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      {/* Unified Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#18191B] p-4 rounded-2xl border border-[#292B2E]">
        <div>
          <label className="block text-[11px] text-[#A1A1AA] mb-1 font-semibold">تصفية حسب الشركة</label>
          <select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-sky-500 cursor-pointer"
          >
            <option value="all">🌐 كافة الشركات المحددة ({companies.length})</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                🏢 {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-[#A1A1AA] mb-1 font-semibold">الفترة الزمنية</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="w-full p-2 bg-[#202225] border border-[#292B2E] rounded-xl text-xs text-[#EDEDED] outline-hidden focus:border-sky-500 cursor-pointer"
          >
            <option value="this_month">هذا الشهر الحالي</option>
            <option value="last_month">الشهر الماضي</option>
            <option value="today">اليوم فقط</option>
            <option value="this_year">هذا العام</option>
            <option value="all">كل الفترات التراكمية</option>
            <option value="custom">نطاق تاريخ مخصص...</option>
          </select>
        </div>

        {period === "custom" ? (
          <div>
            <label className="block text-[11px] text-[#A1A1AA] mb-1 font-semibold">من - إلى</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-1/2 p-1.5 bg-[#202225] border border-[#292B2E] rounded-lg text-xs text-[#EDEDED]"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-1/2 p-1.5 bg-[#202225] border border-[#292B2E] rounded-lg text-xs text-[#EDEDED]"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-end pb-1.5">
            <span className="text-[11px] text-[#71717A]">
              البيانات مبنية على أرقام العقود والتحصيلات المعتمدة رسمياً
            </span>
          </div>
        )}
      </div>

      {/* Report Categories Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#292B2E] pb-3 overflow-x-auto custom-scrollbar">
        {[
          { id: "sales", label: "📈 المبيعات والتعاقدات" },
          { id: "collections", label: "💰 التحصيلات والسيولة" },
          { id: "customers", label: "👥 العملاء والمناطق" },
          { id: "pipeline", label: "🎯 خط الفرص والتحويل" },
          { id: "quotes_inquiries", label: "📑 الاستفسارات والعروض" },
          { id: "team", label: "🏆 أداء فريق المبيعات" },
          { id: "marketing", label: "📢 التسويق والعائد" },
          { id: "companies_compare", label: "🏢 مقارنة أداء الشركات" },
          { id: "nesta_services", label: "🛡️ عقود وفوترة خدمة NESTA" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as ReportCategory)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeCategory === tab.id
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                : "text-[#A1A1AA] hover:bg-[#202225] hover:text-[#EDEDED]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. SALES REPORT */}
      {activeCategory === "sales" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">حجم المبيعات الإجمالي</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                {salesAggregates.totalVolume.toLocaleString()} ج.م
              </div>
              <div className="text-[11px] text-[#71717A] mt-0.5">خلال الفترة المحددة</div>
            </div>
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">عدد العقود المغلقة</div>
              <div className="text-xl font-black text-[#EDEDED] font-mono mt-1">
                {salesAggregates.count}
              </div>
              <div className="text-[11px] text-[#71717A] mt-0.5">عقود معتمدة وفعالة</div>
            </div>
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">متوسط قيمة الصفقة</div>
              <div className="text-xl font-black text-sky-400 font-mono mt-1">
                {salesAggregates.avgDeal.toLocaleString()} ج.م
              </div>
              <div className="text-[11px] text-[#71717A] mt-0.5">لكل عقد مبرم</div>
            </div>
          </div>

          {/* Sales by Rep Table */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#292B2E]">
              <h3 className="text-xs font-bold text-[#EDEDED]">توزيع المبيعات حسب مسؤول المبيعات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#202225] text-[#A1A1AA]">
                  <tr>
                    <th className="p-3.5">مسؤول المبيعات</th>
                    <th className="p-3.5">عدد العقود</th>
                    <th className="p-3.5">إجمالي المبيعات</th>
                    <th className="p-3.5">النسبة من الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {salesAggregates.byRep.map((rep, i) => {
                    const pct = salesAggregates.totalVolume > 0 ? Math.round((rep.volume / salesAggregates.totalVolume) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-[#202225]/50">
                        <td className="p-3.5 font-bold text-[#EDEDED]">{rep.name}</td>
                        <td className="p-3.5 font-mono text-[#A1A1AA]">{rep.count}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {rep.volume.toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#202225] text-sky-400 border border-[#292B2E]">
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. COLLECTIONS REPORT */}
      {activeCategory === "collections" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#18191B] border border-emerald-900/30 p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">إجمالي المحصل الفعلي</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                {collectionsAggregates.totalCollected.toLocaleString()} ج.م
              </div>
              <div className="text-[11px] text-emerald-400/70 mt-0.5">
                {collectionsAggregates.paymentsCount} إيصال سداد مسجل
              </div>
            </div>
            <div className="bg-[#18191B] border border-amber-900/30 p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">المتبقي غير المحصل</div>
              <div className="text-xl font-black text-amber-300 font-mono mt-1">
                {collectionsAggregates.totalRemaining.toLocaleString()} ج.م
              </div>
              <div className="text-[11px] text-amber-400/70 mt-0.5">طرف العملاء</div>
            </div>
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">نسبة التحصيل التراكمية</div>
              <div className="text-xl font-black text-sky-400 font-mono mt-1">
                {collectionsAggregates.rate}%
              </div>
              <div className="text-[11px] text-[#71717A] mt-0.5">من إجمالي التعاقدات</div>
            </div>
          </div>

          {/* Payment Methods Distribution */}
          <div className="bg-[#18191B] border border-[#292B2E] p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-[#EDEDED]">التحصيلات حسب طريقة الدفع</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(collectionsAggregates.byMethod).map(([method, amount]) => (
                <div key={method} className="bg-[#202225] p-3 rounded-xl border border-[#292B2E] flex justify-between items-center text-xs">
                  <span className="text-[#EDEDED] capitalize">{method}</span>
                  <span className="font-mono font-bold text-emerald-400">{amount.toLocaleString()} ج.م</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. CUSTOMERS REPORT */}
      {activeCategory === "customers" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* By Source */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-[#EDEDED]">توزيع العملاء حسب مصدر الجذب</h3>
              <div className="space-y-2">
                {customerAggregates.bySource.map((s, i) => (
                  <div key={i} className="flex justify-between items-center text-xs bg-[#202225] p-2.5 rounded-xl border border-[#292B2E]">
                    <span className="text-[#EDEDED]">{s.name}</span>
                    <span className="font-mono font-bold text-sky-400">{s.count} عميل</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Area */}
            <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-[#EDEDED]">توزيع العملاء حسب المنطقة الجغرافية</h3>
              <div className="space-y-2">
                {customerAggregates.byArea.map((a, i) => (
                  <div key={i} className="flex justify-between items-center text-xs bg-[#202225] p-2.5 rounded-xl border border-[#292B2E]">
                    <span className="text-[#EDEDED]">{a.name}</span>
                    <span className="font-mono font-bold text-emerald-400">{a.count} عميل</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PIPELINE REPORT */}
      {activeCategory === "pipeline" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">إجمالي الفرص</div>
              <div className="text-xl font-black text-[#EDEDED] font-mono mt-1">
                {pipelineAggregates.total}
              </div>
            </div>
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">الفرص الناجحة (Won)</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                {pipelineAggregates.won}
              </div>
            </div>
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">نسبة الفوز (Win Rate)</div>
              <div className="text-xl font-black text-sky-400 font-mono mt-1">
                {pipelineAggregates.winRate}%
              </div>
            </div>
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">قيمة خط الفرص</div>
              <div className="text-xl font-black text-[#C8A75A] font-mono mt-1">
                {pipelineAggregates.pipelineValue.toLocaleString()} ج.م
              </div>
            </div>
          </div>

          {/* Loss Reasons */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-[#EDEDED]">تحليل أسباب فقدان الصفقات والفرص</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pipelineAggregates.lostReasons.length === 0 ? (
                <div className="text-xs text-[#71717A] col-span-2 py-4 text-center">
                  لا توجد صفقات مفقودة مسجلة بأسباب محددة
                </div>
              ) : (
                pipelineAggregates.lostReasons.map((lr, i) => (
                  <div key={i} className="bg-[#202225] p-3 rounded-xl border border-[#292B2E] flex justify-between items-center text-xs">
                    <span className="text-[#EDEDED]">{lr.reason}</span>
                    <span className="font-mono font-bold text-rose-400">{lr.count} صفقة</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. QUOTES & INQUIRIES FUNNEL REPORT */}
      {activeCategory === "quotes_inquiries" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">الاستفسارات الواردة</div>
              <div className="text-xl font-black text-[#EDEDED] font-mono mt-1">
                {funnelAggregates.inquiriesCount}
              </div>
            </div>
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">عروض الأسعار المصدرة</div>
              <div className="text-xl font-black text-sky-400 font-mono mt-1">
                {funnelAggregates.quotesCount}
              </div>
              <div className="text-[11px] text-[#71717A] mt-0.5">
                بقيمة {funnelAggregates.quotesTotalValue.toLocaleString()} ج.م
              </div>
            </div>
            <div className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl">
              <div className="text-xs text-[#A1A1AA]">نسبة تحويل العرض إلى تعاقد</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                {funnelAggregates.quoteToContractRate}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TEAM MATRIX REPORT */}
      {activeCategory === "team" && (
        <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl overflow-hidden animate-in fade-in duration-150">
          <div className="p-4 border-b border-[#292B2E]">
            <h3 className="text-xs font-bold text-[#EDEDED]">مصفوفة أداء مسؤولي المبيعات الشاملة</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#202225] text-[#A1A1AA]">
                <tr>
                  <th className="p-3.5">مسؤول المبيعات</th>
                  <th className="p-3.5">الاستفسارات</th>
                  <th className="p-3.5">عروض الأسعار</th>
                  <th className="p-3.5">العقود المغلقة</th>
                  <th className="p-3.5">إجمالي المبيعات</th>
                  <th className="p-3.5">التحصيلات المحققة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292B2E]">
                {teamAggregates.map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#202225]/50">
                    <td className="p-3.5 font-bold text-[#EDEDED]">{t.name}</td>
                    <td className="p-3.5 font-mono text-[#A1A1AA]">{t.inquiries}</td>
                    <td className="p-3.5 font-mono text-[#A1A1AA]">{t.quotations}</td>
                    <td className="p-3.5 font-mono font-bold text-[#EDEDED]">{t.contracts}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      {t.salesVolume.toLocaleString()} ج.م
                    </td>
                    <td className="p-3.5 font-mono font-bold text-sky-400">
                      {t.collected.toLocaleString()} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. MARKETING REPORT */}
      {activeCategory === "marketing" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => {
              const b = c.monthlyAdvertisingBudget || 25000;
              const inqs = filteredInquiries.filter((i) => i.companyId === c.id).length;
              const custs = filteredCustomers.filter((cu) => cu.companyId === c.id).length;
              const rev = filteredContracts
                .filter((ct) => ct.companyId === c.id)
                .reduce((sum, ct) => sum + (ct.totalValue || 0), 0);
              const roas = b > 0 ? (rev / b).toFixed(1) : "0";

              return (
                <div key={c.id} className="bg-[#18191B] border border-[#292B2E] p-4 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-[#EDEDED] text-xs">{c.name}</h4>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#202225] text-[#C8A75A]">
                      ROAS {roas}x
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-[#A1A1AA]">
                    <div className="flex justify-between">
                      <span>الميزانية الإعلانية:</span>
                      <strong className="text-[#EDEDED] font-mono">{b.toLocaleString()} ج.م</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>الاستفسارات:</span>
                      <strong className="text-sky-400 font-mono">{inqs}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>المبيعات المحققة:</span>
                      <strong className="text-emerald-400 font-mono">{rev.toLocaleString()} ج.م</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 8. COMPANIES COMPARATIVE REPORT */}
      {activeCategory === "companies_compare" && (
        <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl overflow-hidden animate-in fade-in duration-150">
          <div className="p-4 border-b border-[#292B2E]">
            <h3 className="text-xs font-bold text-[#EDEDED]">تقرير مقارنة أداء الشركات الشامل</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#202225] text-[#A1A1AA]">
                <tr>
                  <th className="p-3.5">الشركة</th>
                  <th className="p-3.5">الهدف الشهري</th>
                  <th className="p-3.5">المبيعات المحققة</th>
                  <th className="p-3.5">نسبة الإنجاز</th>
                  <th className="p-3.5">التحصيلات النقدية</th>
                  <th className="p-3.5">عدد العقود</th>
                  <th className="p-3.5">عروض الأسعار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292B2E]">
                {companyComparison.map((comp) => (
                  <tr key={comp.company.id} className="hover:bg-[#202225]/50">
                    <td className="p-3.5 font-bold text-[#EDEDED] flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: comp.company.color || "#C8A75A" }}
                      />
                      <span>{comp.company.name}</span>
                    </td>
                    <td className="p-3.5 font-mono text-[#A1A1AA]">
                      {comp.target.toLocaleString()} ج.م
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      {comp.volume.toLocaleString()} ج.م
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                          comp.achievement >= 100
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : comp.achievement >= 50
                            ? "bg-sky-950 text-sky-400 border border-sky-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {comp.achievement}%
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-sky-400">
                      {comp.collected.toLocaleString()} ج.م
                    </td>
                    <td className="p-3.5 font-mono text-[#EDEDED]">{comp.contractsCount}</td>
                    <td className="p-3.5 font-mono text-[#A1A1AA]">{comp.quotesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. NESTA SERVICES & BILLING REPORT */}
      {activeCategory === "nesta_services" && (
        <div className="space-y-6 animate-in fade-in duration-150 text-xs">
          {/* Action Header Card */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <h3 className="font-bold text-[#EDEDED] text-sm">تقرير فوترة وعقود باقات خدمة NESTA للشركات</h3>
              <p className="text-[#A1A1AA] text-[11px]">
                تقرير مالي وإداري شامل ومستقل لاستعراض عوائد التشغيل والدعم ومبيعات باقات النظام.
              </p>
            </div>
            <button
              onClick={() => {
                showToast("تم تحضير وتصدير تقرير فوترة خدمة NESTA بصيغة PDF بنجاح!", "success");
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير كـ PDF</span>
            </button>
          </div>

          {/* Warning Message Card */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-3">
            <FileText className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[#A1A1AA]">
              <span className="font-bold text-[#EDEDED] block">منهجية الفصل المالي المعتمدة (v1.0 Frozen)</span>
              <span>
                ملاحظة نظام: سعر تقديم خدمة NESTA للشركة لا يدخل ضمن إيرادات مبيعات العملاء، التحصيلات، الميزانيات الإعلانية، أو عمولات موظفي المبيعات والتشغيل للشركات التابعة.
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-[#18191B] border border-[#292B2E] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#292B2E] flex justify-between items-center bg-[#1D1E21]">
              <span className="font-bold text-[#EDEDED]">عقود الخدمة النشطة والمعلقة</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-md font-mono">
                كافة الفترات الزمنية
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-[#202225] text-[#A1A1AA] text-[11px] font-bold">
                  <tr>
                    <th className="p-3.5">اسم الشركة</th>
                    <th className="p-3.5">باقة الخدمة</th>
                    <th className="p-3.5">سعر الخدمة شهرياً</th>
                    <th className="p-3.5">دورة الفوترة</th>
                    <th className="p-3.5">تاريخ التفعيل</th>
                    <th className="p-3.5">المنطقة الجغرافية</th>
                    <th className="p-3.5">حالة العقد والفوترة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292B2E]">
                  {companies.map((comp) => {
                    const status = comp.serviceStatus || "Active";
                    return (
                      <tr key={comp.id} className="hover:bg-[#202225]/50 text-xs text-[#EDEDED]">
                        <td className="p-3.5 font-bold flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: comp.color || "#C8A75A" }}
                          />
                          <div>
                            <span className="font-bold block">{comp.name}</span>
                            <span className="text-[10px] text-[#A1A1AA] font-mono">{comp.phone || "بدون هاتف"}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-amber-400 font-bold">{comp.servicePlan || "باقة الخدمة الأساسية"}</td>
                        <td className="p-3.5 font-bold font-mono text-emerald-400">{(comp.monthlyServicePrice || 0).toLocaleString()} ج.م</td>
                        <td className="p-3.5 text-[#A1A1AA]">{comp.billingCycle || "Monthly"}</td>
                        <td className="p-3.5 font-mono text-[#A1A1AA]">{comp.serviceStartDate || "2026-01-01"}</td>
                        <td className="p-3.5 text-[#A1A1AA]">{comp.address || "القاهرة الكبرى"}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              status === "Active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                : status === "Paused"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                            }`}
                          >
                            {status === "Active" ? "نشط" : status === "Paused" ? "موقوف مؤقتاً" : "منتهي العقد"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
