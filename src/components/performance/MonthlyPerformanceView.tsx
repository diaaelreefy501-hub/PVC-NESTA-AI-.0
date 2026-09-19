import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { Sale } from "../../types";
import {
  computeUnifiedKPIs,
  filterEntityCollection,
  KPIEngineDataSnapshot,
} from "../../utils/kpiEngine";
import {
  TrendingUp,
  Target,
  Building2,
  Calendar,
  Sparkles,
  Edit2,
  Check,
  Flame,
  Award,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  Settings as SettingsIcon,
  Filter,
  FileCheck2,
  MapPin,
  Clock,
  Printer,
  FileSpreadsheet,
  MessageCircle,
  PhoneCall,
  CheckCircle2,
  DollarSign,
  Briefcase,
  Layers,
  Activity,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts";

export const MonthlyPerformanceView: React.FC = () => {
  const {
    companies,
    sales,
    contracts,
    inquiries,
    followUps,
    quotations,
    payments,
    opportunities,
    users,
    updateCompanyTarget,
    monthlyTargetTotal,
    activeCompanyId,
    setCurrentTab,
    navigateToTabWithFilter,
    setSelectedCustomerIdFor360,
  } = useApp();

  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [newTargetValue, setNewTargetValue] = useState<number>(0);
  const [bottomTableTab, setBottomTableTab] = useState<"deals" | "contracts" | "sales">("deals");

  // Available months extracted from sales, inquiries, contracts, opportunities + current month
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);
    sales.forEach((s) => {
      if (s.date && s.date.length >= 7) {
        monthSet.add(s.date.slice(0, 7));
      }
    });
    inquiries.forEach((i) => {
      if (i.date && i.date.length >= 7) {
        monthSet.add(i.date.slice(0, 7));
      }
    });
    contracts.forEach((c) => {
      if (c.date && c.date.length >= 7) {
        monthSet.add(c.date.slice(0, 7));
      }
    });
    opportunities.forEach((o) => {
      const d = o.createdAt || (o as any).date || o.closedAt;
      if (d && d.length >= 7) {
        monthSet.add(d.slice(0, 7));
      }
    });
    return Array.from(monthSet).sort().reverse();
  }, [sales, inquiries, contracts, opportunities, currentMonthKey]);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Parse selected month
  const [selYearStr, selMonthStr] = selectedMonth.split("-");
  const selYear = parseInt(selYearStr, 10);
  const selMonth = parseInt(selMonthStr, 10);
  const isCurrentMonth = selectedMonth === currentMonthKey;

  const selDateObj = new Date(selYear, selMonth - 1, 1);
  const monthName = selDateObj.toLocaleString("ar-EG", { month: "long" });

  const lastDayOfMonth = new Date(selYear, selMonth, 0).getDate();
  const daysRemaining = isCurrentMonth
    ? Math.max(1, lastDayOfMonth - now.getDate())
    : 0;

  // Helper for company matching
  const matchesCompany = (itemCoId?: string) =>
    !activeCompanyId || activeCompanyId === "all" || itemCoId === activeCompanyId;

  // 1. Inquiries metrics (This Month vs All Time)
  const monthInquiries = useMemo(() => {
    return inquiries.filter(
      (i) => matchesCompany(i.companyId) && i.date && i.date.startsWith(selectedMonth)
    );
  }, [inquiries, selectedMonth, activeCompanyId]);

  const allTimeInquiries = useMemo(() => {
    return inquiries.filter((i) => matchesCompany(i.companyId));
  }, [inquiries, activeCompanyId]);

  // 2. Follow-ups metrics (This Month vs All Time)
  const monthFollowUps = useMemo(() => {
    return followUps.filter(
      (f) =>
        matchesCompany(f.companyId) &&
        ((f.dueDate && f.dueDate.startsWith(selectedMonth)) ||
          (f.date && f.date.startsWith(selectedMonth)))
    );
  }, [followUps, selectedMonth, activeCompanyId]);

  const monthCompletedFollowUps = useMemo(() => {
    return monthFollowUps.filter((f) => f.status === "completed");
  }, [monthFollowUps]);

  const allTimeFollowUps = useMemo(() => {
    return followUps.filter((f) => matchesCompany(f.companyId));
  }, [followUps, activeCompanyId]);

  // 3. Opportunities / Deals metrics (This Month vs All Time)
  const monthOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      if (!matchesCompany(o.companyId)) return false;
      const d = o.createdAt || (o as any).date;
      return d && d.startsWith(selectedMonth);
    });
  }, [opportunities, selectedMonth, activeCompanyId]);

  const allTimeOpportunities = useMemo(() => {
    return opportunities.filter((o) => matchesCompany(o.companyId));
  }, [opportunities, activeCompanyId]);

  const monthWonOpportunities = useMemo(() => {
    return opportunities.filter(
      (o) => matchesCompany(o.companyId) && o.status === "won" && o.closedAt && o.closedAt.startsWith(selectedMonth)
    );
  }, [opportunities, selectedMonth, activeCompanyId]);

  const monthLostOpportunities = useMemo(() => {
    return opportunities.filter(
      (o) => matchesCompany(o.companyId) && o.status === "lost" && o.closedAt && o.closedAt.startsWith(selectedMonth)
    );
  }, [opportunities, selectedMonth, activeCompanyId]);

  const monthOpenOpportunities = useMemo(() => {
    return monthOpportunities.filter(
      (o) => o.status === "open" || (!o.status && o.stage !== "won" && o.stage !== "lost")
    );
  }, [monthOpportunities]);

  // 4. Quotations metrics (This Month vs All Time)
  const monthQuotations = useMemo(() => {
    return quotations.filter(
      (q) => matchesCompany(q.companyId) && q.date && q.date.startsWith(selectedMonth)
    );
  }, [quotations, selectedMonth, activeCompanyId]);

  const monthQuotationsTotalValue = useMemo(() => {
    return monthQuotations.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  }, [monthQuotations]);

  const allTimeQuotations = useMemo(() => {
    return quotations.filter((q) => matchesCompany(q.companyId));
  }, [quotations, activeCompanyId]);

  const allTimeQuotationsTotalValue = useMemo(() => {
    return allTimeQuotations.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  }, [allTimeQuotations]);

  // 5. Sales & Contracts for this selected month
  const monthContracts = useMemo(() => {
    return contracts.filter(
      (c) => matchesCompany(c.companyId) && c.date && c.date.startsWith(selectedMonth)
    );
  }, [contracts, selectedMonth, activeCompanyId]);

  const monthContractsTotalValue = useMemo(() => {
    return monthContracts.reduce((acc, c) => acc + (c.totalValue || 0), 0);
  }, [monthContracts]);

  const monthSales = useMemo(() => {
    return sales.filter(
      (s) => matchesCompany(s.companyId) && s.date && s.date.startsWith(selectedMonth)
    );
  }, [sales, selectedMonth, activeCompanyId]);

  const monthSalesTotal = useMemo(() => {
    return monthSales.reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [monthSales]);

  const allTimeSalesTotal = useMemo(() => {
    return sales
      .filter((s) => matchesCompany(s.companyId))
      .reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [sales, activeCompanyId]);

  const monthPayments = useMemo(() => {
    return payments.filter(
      (p) => matchesCompany(p.companyId) && p.date && p.date.startsWith(selectedMonth)
    );
  }, [payments, selectedMonth, activeCompanyId]);

  const monthPaymentsTotal = useMemo(() => {
    return monthPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [monthPayments]);

  // 6. Target & Achievement
  const monthAchievementRate = useMemo(() => {
    if (!monthlyTargetTotal) return 0;
    return Math.min(100, Math.round((monthSalesTotal / monthlyTargetTotal) * 100));
  }, [monthSalesTotal, monthlyTargetTotal]);

  const remainingTotal = Math.max(0, monthlyTargetTotal - monthSalesTotal);
  const dailyNeededTotal = daysRemaining > 0 ? Math.round(remainingTotal / daysRemaining) : 0;

  // 7. Comprehensive Monthly Company Performance Report Matrix
  const companyMonthlyReport = useMemo(() => {
    return companies.map((comp) => {
      // Inquiries
      const compInqMonth = monthInquiries.filter((i) => i.companyId === comp.id);
      const compInqAllTime = allTimeInquiries.filter((i) => i.companyId === comp.id);

      // Follow-ups
      const compFollowUpsMonth = monthFollowUps.filter((f) => f.companyId === comp.id);
      const compFollowUpsCompleted = compFollowUpsMonth.filter((f) => f.status === "completed");

      // Opportunities / Deals
      const compOppsMonth = monthOpportunities.filter((o) => o.companyId === comp.id);
      const compOppsWonMonth = compOppsMonth.filter((o) => o.status === "won");
      const compOppsOpenMonth = compOppsMonth.filter(
        (o) => o.status === "open" || (!o.status && o.stage !== "won" && o.stage !== "lost")
      );
      const compOppsAllTime = allTimeOpportunities.filter((o) => o.companyId === comp.id);

      // Quotations
      const compQuotesMonth = monthQuotations.filter((q) => q.companyId === comp.id);
      const compQuotesValMonth = compQuotesMonth.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

      // Contracts & Sales
      const compContractsMonth = monthContracts.filter((c) => c.companyId === comp.id);
      const compContractsValMonth = compContractsMonth.reduce((acc, c) => acc + (c.totalValue || 0), 0);

      const compSalesMonthRecords = monthSales.filter((s) => s.companyId === comp.id);
      const compSalesMonth = compSalesMonthRecords.reduce((acc, s) => acc + s.amount, 0);

      const target = comp.monthlyTarget || 0;
      const achievementRate = target > 0 ? Math.round((compSalesMonth / target) * 100) : 0;
      const remainingTarget = Math.max(0, target - compSalesMonth);

      // Conversion Rate (Contracts ÷ Inquiries %)
      const conversionRate =
        compInqMonth.length > 0
          ? Math.round((compContractsMonth.length / compInqMonth.length) * 100)
          : compContractsMonth.length > 0
          ? 100
          : 0;

      // Collections received this month for this company
      const compPaymentsMonth = monthPayments.filter((p) => p.companyId === comp.id);
      const compCollectedMonth = compPaymentsMonth.reduce((acc, p) => acc + (p.amount || 0), 0);

      return {
        company: comp,
        inquiriesMonth: compInqMonth.length,
        inquiriesAllTime: compInqAllTime.length,
        followUpsMonth: compFollowUpsMonth.length,
        followUpsCompleted: compFollowUpsCompleted.length,
        opportunitiesMonthCount: compOppsMonth.length,
        opportunitiesWonMonthCount: compOppsWonMonth.length,
        opportunitiesOpenMonthCount: compOppsOpenMonth.length,
        opportunitiesAllTimeCount: compOppsAllTime.length,
        quotationsMonthCount: compQuotesMonth.length,
        quotationsMonthValue: compQuotesValMonth,
        contractsMonthCount: compContractsMonth.length,
        contractsMonthValue: compContractsValMonth,
        salesMonth: compSalesMonth,
        salesMonthCount: compSalesMonthRecords.length,
        target,
        achievementRate,
        remainingTarget,
        conversionRate,
        collectedMonth: compCollectedMonth,
      };
    });
  }, [
    companies,
    monthInquiries,
    allTimeInquiries,
    monthFollowUps,
    monthOpportunities,
    allTimeOpportunities,
    monthQuotations,
    monthContracts,
    monthSales,
    payments,
    contracts,
    selectedMonth,
  ]);

  // Selected month calculations
  const monthAvgDealValue = useMemo(() => {
    return monthContracts.length > 0 ? Math.round(monthSalesTotal / monthContracts.length) : 0;
  }, [monthSalesTotal, monthContracts]);

  // Previous month index for MoM calculations
  const { prevMonthSalesTotal, momGrowthRate } = useMemo(() => {
    const curIdx = availableMonths.indexOf(selectedMonth);
    const prevKey = curIdx !== -1 && curIdx < availableMonths.length - 1 ? availableMonths[curIdx + 1] : null;
    if (!prevKey) return { prevMonthSalesTotal: 0, momGrowthRate: 0 };

    const pSales = sales
      .filter((s) => s.date && s.date.startsWith(prevKey))
      .reduce((sum, s) => sum + s.amount, 0);
    const growth = pSales > 0 ? Math.round(((monthSalesTotal - pSales) / pSales) * 100) : 0;
    return { prevMonthSalesTotal: pSales, momGrowthRate: growth };
  }, [availableMonths, selectedMonth, sales, monthSalesTotal]);

  // Top Company calculation
  const topCompany = useMemo(() => {
    const valid = companyMonthlyReport.filter((c) => c.salesMonth > 0);
    if (valid.length === 0) return null;
    const sorted = [...valid].sort((a, b) => b.salesMonth - a.salesMonth);
    const top = sorted[0];

    // Find top salesperson within this top company
    const compSales = monthSales.filter((s) => s.companyId === top.company.id);
    const spMap: Record<string, number> = {};
    compSales.forEach((s) => {
      const p = s.salesPerson || s.responsible || "مسؤول المبيعات";
      spMap[p] = (spMap[p] || 0) + (s.amount || 0);
    });
    const topSpEntry = Object.entries(spMap).sort((a, b) => b[1] - a[1])[0];

    return {
      ...top,
      topSalespersonName: topSpEntry ? topSpEntry[0] : "لا يوجد",
      topSalespersonSales: topSpEntry ? topSpEntry[1] : 0,
    };
  }, [companyMonthlyReport, monthSales]);

  // Top Salesperson calculation
  const topSalesperson = useMemo(() => {
    const spMap: Record<
      string,
      {
        name: string;
        companyId?: string;
        companyName: string;
        salesAmount: number;
        salesCount: number;
        contractsCount: number;
        inquiriesCount: number;
      }
    > = {};

    monthSales.forEach((s) => {
      const p = s.salesPerson || s.responsible || "مسؤول المبيعات";
      if (!spMap[p]) {
        const comp = companies.find((c) => c.id === s.companyId);
        spMap[p] = {
          name: p,
          companyId: s.companyId,
          companyName: comp ? comp.name : "عام",
          salesAmount: 0,
          salesCount: 0,
          contractsCount: 0,
          inquiriesCount: 0,
        };
      }
      spMap[p].salesAmount += s.amount || 0;
      spMap[p].salesCount += 1;
    });

    monthContracts.forEach((c) => {
      const p = c.salesPerson || c.responsible || "مسؤول المبيعات";
      if (spMap[p]) {
        spMap[p].contractsCount += 1;
      }
    });

    monthInquiries.forEach((i) => {
      const p = i.responsible || "مسؤول المبيعات";
      if (spMap[p]) {
        spMap[p].inquiriesCount += 1;
      }
    });

    const list = Object.values(spMap).filter((s) => s.salesAmount > 0);
    if (list.length === 0) return null;
    list.sort((a, b) => b.salesAmount - a.salesAmount);
    const top = list[0];

    const matchedUser = users.find((u) => u.name === top.name || u.id === top.name);
    const userTarget = (matchedUser as any)?.monthlyTarget || 0;
    const achievementRate = userTarget > 0 ? Math.round((top.salesAmount / userTarget) * 100) : null;

    const conversionRate =
      top.inquiriesCount > 0
        ? Math.round((top.salesCount / top.inquiriesCount) * 100)
        : top.salesCount > 0
        ? 100
        : 0;

    return {
      ...top,
      userTarget,
      achievementRate,
      conversionRate,
    };
  }, [monthSales, monthContracts, monthInquiries, companies, users]);

  // Monthly historical timeline (sorted chronologically ascending)
  const monthlyTimelineData = useMemo(() => {
    const sortedAsc = [...availableMonths].reverse();
    return sortedAsc.map((m, idx) => {
      const [y, mo] = m.split("-");
      const d = new Date(parseInt(y, 10), parseInt(mo, 10) - 1, 1);
      const shortName = d.toLocaleString("ar-EG", { month: "short" });
      const label = `${shortName} ${y.slice(2)}`;

      // Direct Canonical Event Date for Sales: sale.date defines when the sale took place
      const mContracts = contracts.filter((c) => c.date && c.date.startsWith(m));
      const mContractsCount = mContracts.length;

      const mSales = sales.filter((s) => s.date && s.date.startsWith(m));
      const mSalesTotal = mSales.reduce((sum, s) => sum + (s.amount || 0), 0);

      const mOpportunities = opportunities.filter((o) => {
        const od = o.createdAt || (o as any).date || o.closedAt;
        return od && od.startsWith(m);
      });
      const mOpportunitiesCount = mOpportunities.length;

      const avgDeal = mContractsCount > 0 ? Math.round(mSalesTotal / mContractsCount) : 0;
      const target = monthlyTargetTotal || 1;
      const achievement = Math.min(200, Math.round((mSalesTotal / target) * 100));

      let growth = 0;
      if (idx > 0) {
        const prevM = sortedAsc[idx - 1];
        const prevSales = sales
          .filter((s) => s.date && s.date.startsWith(prevM))
          .reduce((sum, s) => sum + (s.amount || 0), 0);
        if (prevSales > 0) {
          growth = Math.round(((mSalesTotal - prevSales) / prevSales) * 100);
        }
      }

      return {
        monthKey: m,
        label,
        salesTotal: mSalesTotal,
        salesCount: mSales.length,
        contractsCount: mContractsCount,
        dealsCount: mOpportunitiesCount,
        avgDealValue: avgDeal,
        achievementRate: achievement,
        momGrowth: growth,
        target,
        isSelected: m === selectedMonth,
      };
    });
  }, [availableMonths, sales, contracts, opportunities, monthlyTargetTotal, selectedMonth]);

  const companyTargetActualData = useMemo(() => {
    return companyMonthlyReport.map((c) => ({
      companyId: c.company.id,
      name: c.company.name,
      target: c.target,
      achieved: c.salesMonth,
      achievementRate: c.achievementRate,
      color: c.company.color || "#C8A75A",
    }));
  }, [companyMonthlyReport]);

  const handleStartEdit = (companyId: string, currentTarget: number) => {
    setEditingTargetId(companyId);
    setNewTargetValue(currentTarget);
  };

  const handleSaveTarget = (companyId: string) => {
    updateCompanyTarget(companyId, newTargetValue);
    setEditingTargetId(null);
  };

  // Performance per salesperson
  const performanceByPerson = useMemo(() => {
    const stats: Record<
      string,
      {
        inquiries: number;
        followUps: number;
        quotations: number;
        contracts: number;
        salesAmount: number;
      }
    > = {};

    const getPersonName = (nameOrId?: string) => {
      if (!nameOrId) return "غير محدد";
      const user = users.find((u) => u.id === nameOrId || u.name === nameOrId);
      return user ? user.name : nameOrId;
    };

    // Initialize with known users
    users.forEach((u) => {
      stats[u.name] = {
        inquiries: 0,
        followUps: 0,
        quotations: 0,
        contracts: 0,
        salesAmount: 0,
      };
    });

    monthInquiries.forEach((i) => {
      const p = getPersonName(i.responsible);
      if (!stats[p])
        stats[p] = { inquiries: 0, followUps: 0, quotations: 0, contracts: 0, salesAmount: 0 };
      stats[p].inquiries++;
    });

    monthFollowUps.forEach((f) => {
      const p = getPersonName(f.responsible);
      if (!stats[p])
        stats[p] = { inquiries: 0, followUps: 0, quotations: 0, contracts: 0, salesAmount: 0 };
      stats[p].followUps++;
    });

    monthQuotations.forEach((q) => {
      const p = getPersonName(q.createdByName);
      if (!stats[p])
        stats[p] = { inquiries: 0, followUps: 0, quotations: 0, contracts: 0, salesAmount: 0 };
      stats[p].quotations++;
    });

    monthContracts.forEach((c) => {
      const p = getPersonName(c.salesPerson || c.responsible);
      if (!stats[p])
        stats[p] = { inquiries: 0, followUps: 0, quotations: 0, contracts: 0, salesAmount: 0 };
      stats[p].contracts++;
    });

    monthSales.forEach((s) => {
      const p = getPersonName(s.salesPerson || s.responsible);
      if (!stats[p])
        stats[p] = { inquiries: 0, followUps: 0, quotations: 0, contracts: 0, salesAmount: 0 };
      stats[p].salesAmount += s.amount;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
      }))
      .filter(
        (p) =>
          p.inquiries > 0 ||
          p.followUps > 0 ||
          p.quotations > 0 ||
          p.contracts > 0 ||
          p.salesAmount > 0
      )
      .sort((a, b) => b.salesAmount - a.salesAmount);
  }, [monthInquiries, monthFollowUps, monthQuotations, monthContracts, monthSales, users]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#111111] text-[#C8A75A]">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
              الأداء الشهري الشامل — Performance Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            تحليل شامل لأداء الشركات، الاستفسارات، المتابعات، عروض الأسعار، والمبيعات المحققة
          </p>
        </div>

        {/* Action Controls & Month Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-[#EAEAEA] rounded-xl px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-[#C8A75A]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-black text-[#111111] bg-transparent outline-hidden cursor-pointer"
            >
              {availableMonths.map((m) => {
                const [y, mo] = m.split("-");
                const d = new Date(parseInt(y, 10), parseInt(mo, 10) - 1, 1);
                const name = d.toLocaleString("ar-EG", { month: "long" });
                return (
                  <option key={m} value={m}>
                    {name} {y} {m === currentMonthKey ? "(الشهر الجاري)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {isCurrentMonth && (
            <div className="bg-[#111111] text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs border border-[#2A2A2A]">
              <Clock className="w-3.5 h-3.5 text-[#C8A75A]" />
              <span className="text-[#9CA3AF]">متبقي:</span>
              <span className="font-extrabold text-[#C8A75A] font-mono">
                {daysRemaining} يوم
              </span>
            </div>
          )}

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-white border border-[#EAEAEA] hover:bg-[#F8F8F5] text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            title="طباعة التقرير الشهري الشامل"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>طباعة التقرير</span>
          </button>

          <button
            onClick={() => setCurrentTab("settings")}
            title="تعديل الأهداف في الإعدادات"
            className="p-2 bg-white border border-[#EAEAEA] hover:bg-[#F8F8F5] rounded-xl text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6-COLUMN COMPREHENSIVE PERIOD & ANALYTICAL METRICS (Clickable Drill-downs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Monthly Sales */}
        <div
          onClick={() => navigateToTabWithFilter("sales", { month: selectedMonth })}
          className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-2 hover:border-[#C8A75A] transition-all cursor-pointer group"
          title="انقر للانتقال المباشر لسجل المبيعات لهذا الشهر"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#C8A75A]" />
              إجمالي المبيعات
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#C8A75A] transition-colors" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-[#C8A75A] font-mono">
              {monthSalesTotal.toLocaleString()}{" "}
              <span className="text-[10px] font-normal text-slate-500">ج.م</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>عمليات البيع:</span>
              <strong className="text-slate-900 font-bold font-mono">
                {monthSales.length} عملية ({allTimeSalesTotal.toLocaleString()} ج.م إجمالي)
              </strong>
            </div>
          </div>
        </div>

        {/* 2. Opportunities / Deals Count */}
        <div
          onClick={() => navigateToTabWithFilter("opportunities")}
          className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-2 hover:border-indigo-400 transition-all cursor-pointer group"
          title="انقر للانتقال المباشر للفرص والصفقات البيعية"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-indigo-600" />
              الصفقات والفرص
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-indigo-950 font-mono">
              {monthOpportunities.length}{" "}
              <span className="text-[10px] font-normal text-slate-500">فرصة/صفقة</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>الحالة:</span>
              <strong className="text-slate-900 font-bold font-mono">
                {monthWonOpportunities.length} رابحة • {monthOpenOpportunities.length} جارية
              </strong>
            </div>
          </div>
        </div>

        {/* 3. Contracts Count & Total Value */}
        <div
          onClick={() => navigateToTabWithFilter("collections")}
          className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-2 hover:border-teal-400 transition-all cursor-pointer group"
          title="انقر للانتقال المباشر لقسم العقود والتحصيلات"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-teal-600" />
              العقود الموقعة
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-teal-900 font-mono">
              {monthContracts.length}{" "}
              <span className="text-[10px] font-normal text-slate-500">عقد</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>قيمة العقود:</span>
              <strong className="text-teal-800 font-bold font-mono">
                {monthContractsTotalValue.toLocaleString()} ج.م
              </strong>
            </div>
          </div>
        </div>

        {/* 4. Target vs Actual Rate & MoM Growth */}
        <div className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              نسبة التحقيق والنمو
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                momGrowthRate >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {momGrowthRate >= 0 ? `+${momGrowthRate}%` : `${momGrowthRate}%`}
            </span>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {monthAchievementRate}%{" "}
              <span className="text-[10px] font-normal text-slate-500">من الهدف</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>نمو المبيعات (MoM):</span>
              <strong
                className={`font-mono font-bold ${
                  momGrowthRate >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {momGrowthRate >= 0 ? `+${momGrowthRate}%` : `${momGrowthRate}%`}
              </strong>
            </div>
          </div>
        </div>

        {/* 5. Quotations */}
        <div
          onClick={() => navigateToTabWithFilter("quotations")}
          className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-2 hover:border-amber-400 transition-all cursor-pointer group"
          title="انقر للانتقال المباشر لعروض الأسعار"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              عروض الأسعار
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {monthQuotations.length}{" "}
              <span className="text-[10px] font-normal text-slate-500">عرض</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>بقيمة:</span>
              <strong className="text-slate-900 font-bold font-mono">
                {monthQuotationsTotalValue.toLocaleString()} ج.م
              </strong>
            </div>
          </div>
        </div>

        {/* 6. Inquiries & Follow-ups */}
        <div
          onClick={() => navigateToTabWithFilter("inquiries")}
          className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-2 hover:border-blue-400 transition-all cursor-pointer group"
          title="انقر للانتقال المباشر للاستفسارات والمتابعات"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              الاستفسارات
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {monthInquiries.length}{" "}
              <span className="text-[10px] font-normal text-slate-500">استفسار</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>متابعات منجزة:</span>
              <strong className="text-emerald-700 font-bold font-mono">
                {monthCompletedFollowUps.length} متابعة
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Target Progress Bar Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAEAEA] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8A75A]" />
            <h3 className="font-extrabold text-sm text-[#111111]">
              مستوى تحقيق الهدف البيعي الشهري ({monthName} {selYear})
            </h3>
          </div>
          <span className="text-xs font-mono font-black text-[#111111]">
            المحقق: {monthSalesTotal.toLocaleString()} ج.م / المستهدف:{" "}
            {monthlyTargetTotal.toLocaleString()} ج.م ({monthAchievementRate}%)
          </span>
        </div>

        <div className="w-full bg-[#F8F8F5] rounded-full h-3.5 overflow-hidden p-0.5 border border-[#EAEAEA]">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              monthAchievementRate >= 100
                ? "bg-gradient-to-l from-[#22C55E] to-emerald-400"
                : monthAchievementRate >= 70
                ? "bg-gradient-to-l from-[#C8A75A] to-amber-300"
                : "bg-gradient-to-l from-[#111111] to-[#C8A75A]"
            }`}
            style={{ width: `${Math.min(100, monthAchievementRate)}%` }}
          />
        </div>
      </div>

      {/* Top Company & Top Salesperson Podium Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: الشركة الأكثر مبيعاً */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-50 text-[#C8A75A] border border-amber-200">
                <Trophy className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-[#111111]">
                  الشركة الأكثر مبيعًا — Top Company
                </h4>
                <p className="text-[11px] text-slate-500">الأعلى تحقيقاً للمبيعات لشهر {monthName}</p>
              </div>
            </div>
            {topCompany && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-lg text-white"
                style={{ backgroundColor: topCompany.company.color || "#111111" }}
              >
                {topCompany.company.name}
              </span>
            )}
          </div>

          {topCompany ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-black text-[#C8A75A] font-mono">
                    {topCompany.salesMonth.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-slate-500">ج.م مبيعات</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    مستهدف الشركة: {(topCompany.target || 0).toLocaleString()} ج.م
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-black font-mono px-2.5 py-1 rounded-md ${
                      topCompany.achievementRate >= 100
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    نسبة التحقيق: {topCompany.achievementRate}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">الصفقات / المبيعات</span>
                  <strong className="text-xs font-black text-slate-800 font-mono">
                    {topCompany.salesMonthCount} صفقة
                  </strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">العقود الموقعة</span>
                  <strong className="text-xs font-black text-slate-800 font-mono">
                    {topCompany.contractsMonthCount} عقد
                  </strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">إجمالي التحصيلات</span>
                  <strong className="text-xs font-black text-emerald-700 font-mono">
                    {topCompany.collectedMonth.toLocaleString()} ج.م
                  </strong>
                </div>
              </div>

              <div className="bg-[#F8F8F5] p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                  <Award className="w-4 h-4 text-[#C8A75A]" />
                  مسؤول المبيعات الأعلى داخلها:
                </span>
                <strong className="text-slate-900 font-bold">
                  {topCompany.topSalespersonName}{" "}
                  <span className="text-slate-500 font-mono font-normal">
                    ({topCompany.topSalespersonSales.toLocaleString()} ج.م)
                  </span>
                </strong>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              لا توجد بيانات مبيعات كافية للفترة المحددة
            </div>
          )}
        </div>

        {/* Card 2: مسؤول المبيعات الأكثر مبيعاً */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                <Award className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-[#111111]">
                  مسؤول المبيعات الأكثر مبيعًا — Top Salesperson
                </h4>
                <p className="text-[11px] text-slate-500">أعلى مسؤول مبيعات تحقيقاً للصفقات لشهر {monthName}</p>
              </div>
            </div>
            {topSalesperson && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                {topSalesperson.companyName}
              </span>
            )}
          </div>

          {topSalesperson ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-black text-purple-900 font-mono">
                    {topSalesperson.salesAmount.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-slate-500">ج.م مبيعات</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-bold mt-0.5">
                    {topSalesperson.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black font-mono px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                    {topSalesperson.achievementRate !== null
                      ? `تحقيق الهدف: ${topSalesperson.achievementRate}%`
                      : `معدل التحويل: ${topSalesperson.conversionRate}%`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">الصفقات المحققة</span>
                  <strong className="text-xs font-black text-slate-800 font-mono">
                    {topSalesperson.salesCount} صفقة
                  </strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">العقود الموقعة</span>
                  <strong className="text-xs font-black text-slate-800 font-mono">
                    {topSalesperson.contractsCount} عقد
                  </strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">معدل التحويل</span>
                  <strong className="text-xs font-black text-purple-700 font-mono">
                    {topSalesperson.conversionRate}%
                  </strong>
                </div>
              </div>

              <div className="bg-[#F8F8F5] p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  الشركة التابع لها:
                </span>
                <strong className="text-slate-900 font-bold">
                  {topSalesperson.companyName}
                </strong>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              لا توجد بيانات مبيعات كافية للفترة المحددة
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE ANALYTICAL CHARTS (Recharts with drill-down support)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Sales & Deal Count Timeline */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#C8A75A]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#111111]">
                  مسار المبيعات الشهرية وعدد الصفقات
                </h3>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                اضغط على أي عمود شهر للتبديل إليه، أو انتقل لسجل المبيعات مباشرة
              </p>
            </div>
            <button
              onClick={() => navigateToTabWithFilter("sales", { month: selectedMonth })}
              className="text-xs font-bold text-[#111111] hover:text-[#C8A75A] bg-[#F8F8F5] hover:bg-amber-50 px-3 py-1.5 rounded-xl border border-[#EAEAEA] flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <span>عرض صفقات {monthName}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#C8A75A]" />
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTimelineData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const mKey = e.activePayload[0].payload.monthKey;
                    if (mKey) setSelectedMonth(mKey);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={{ stroke: "#EAEAEA" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="sales"
                  orientation="right"
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`}
                />
                <YAxis
                  yAxisId="deals"
                  orientation="left"
                  tick={{ fill: "#10B981", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(val: any, name: string) => {
                    if (name === "salesTotal") return [`${Number(val).toLocaleString()} ج.م`, "المبيعات المحققة"];
                    if (name === "dealsCount") return [`${val} صفقة/فرصة`, "الصفقات والفرص"];
                    if (name === "contractsCount") return [`${val} عقد`, "العقود الموقعة"];
                    return [val, name];
                  }}
                  labelFormatter={(lbl, items) => {
                    const p = items?.[0]?.payload;
                    return p ? `شهر ${lbl} ${p.monthKey === selectedMonth ? "(المحدد حالياً)" : ""}` : lbl;
                  }}
                  contentStyle={{
                    backgroundColor: "#111111",
                    borderRadius: "12px",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    direction: "rtl",
                  }}
                />
                <Legend
                  formatter={(val) => {
                    if (val === "salesTotal") return "إجمالي المبيعات (ج.م)";
                    if (val === "dealsCount") return "الصفقات والفرص";
                    if (val === "contractsCount") return "العقود الموقعة";
                    return val;
                  }}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                />
                <Bar yAxisId="sales" dataKey="salesTotal" name="salesTotal" radius={[6, 6, 0, 0]} cursor="pointer">
                  {monthlyTimelineData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.monthKey === selectedMonth ? "#C8A75A" : "#1E293B"}
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="deals"
                  type="monotone"
                  dataKey="dealsCount"
                  name="dealsCount"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#6366F1" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="deals"
                  type="monotone"
                  dataKey="contractsCount"
                  name="contractsCount"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10B981" }}
                  activeDot={{ r: 5 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Target vs Actual by Company for Selected Month */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#C8A75A]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#111111]">
                  الهدف مقابل المحقق حسب الشركات ({monthName})
                </h3>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                اضغط على أي شركة للانتقال المباشر لعقودها ومبيعاتها لشهر {monthName}
              </p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-bold self-start sm:self-auto">
              نسبة الإنجاز: {monthAchievementRate}%
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={companyTargetActualData}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const cId = e.activePayload[0].payload.companyId;
                    if (cId) navigateToTabWithFilter("sales", { companyId: cId, month: selectedMonth });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={{ stroke: "#EAEAEA" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    `${Number(val).toLocaleString()} ج.م`,
                    name === "target" ? "المستهدف" : "المحقق",
                  ]}
                  contentStyle={{
                    backgroundColor: "#111111",
                    borderRadius: "12px",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    direction: "rtl",
                  }}
                />
                <Legend
                  formatter={(val) => (val === "target" ? "المستهدف (ج.م)" : "المبيعات المحققة (ج.م)")}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                />
                <Bar dataKey="target" name="target" fill="#94A3B8" radius={[4, 4, 0, 0]} cursor="pointer" />
                <Bar dataKey="achieved" name="achieved" fill="#C8A75A" radius={[4, 4, 0, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Average Deal Value Evolution */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#C8A75A]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#111111]">
                  تطور متوسط قيمة الصفقة (Average Deal Ticket)
                </h3>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                معدل حجم الصفقة الواحدة في العقود الموقعة عبر الشهور
              </p>
            </div>
            <div className="text-left">
              <span className="text-[10px] text-[#6B7280] block">متوسط {monthName}:</span>
              <span className="text-xs font-mono font-black text-[#111111]">
                {monthAvgDealValue.toLocaleString()} ج.م
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTimelineData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="avgDealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8A75A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C8A75A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={{ stroke: "#EAEAEA" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ج.م`, "متوسط قيمة الصفقة"]}
                  contentStyle={{
                    backgroundColor: "#111111",
                    borderRadius: "12px",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    direction: "rtl",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgDealValue"
                  name="متوسط قيمة الصفقة"
                  stroke="#C8A75A"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#avgDealGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Monthly Growth Rate & Target Achievement Rate */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#C8A75A]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#111111]">
                  نسبة تحقيق الهدف ونمو المبيعات شهرياً
                </h3>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                تتبع نسبة الإنجاز والنمو الشهري مقارنة بالشهر السابق (MoM)
              </p>
            </div>
            <div className="text-left">
              <span className="text-[10px] text-[#6B7280] block">نمو {monthName}:</span>
              <span
                className={`text-xs font-mono font-black ${
                  momGrowthRate >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {momGrowthRate >= 0 ? `+${momGrowthRate}%` : `${momGrowthRate}%`}
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTimelineData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={{ stroke: "#EAEAEA" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    `${val}%`,
                    name === "achievementRate" ? "نسبة تحقيق الهدف" : "النمو الشهري (MoM)",
                  ]}
                  contentStyle={{
                    backgroundColor: "#111111",
                    borderRadius: "12px",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    direction: "rtl",
                  }}
                />
                <Legend
                  formatter={(val) => (val === "achievementRate" ? "نسبة تحقيق الهدف %" : "النمو الشهري MoM %")}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                />
                <ReferenceLine y={100} stroke="#EF4444" strokeDasharray="3 3" />
                <Bar dataKey="achievementRate" name="achievementRate" fill="#111111" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="momGrowth"
                  name="momGrowth"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE COMPANY MONTHLY PERFORMANCE REPORT */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#C8A75A]" />
              <h2 className="font-black text-base sm:text-lg text-slate-900">
                تقرير أداء الشركات الشهري الكامل — {monthName} {selYear}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              مصفوفة تفصيلية تقارن أداء كل شركة: الاستفسارات، المتابعات، عروض الأسعار، العقود، والتحصيلات
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-bold">
              {companies.length} شركات مسجلة
            </span>
          </div>
        </div>

        {/* Master Comparison Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">الشركة</th>
                <th className="p-3 text-center">الاستفسارات (شهر / كل)</th>
                <th className="p-3 text-center">المتابعات (منجزة / شهر)</th>
                <th className="p-3 text-center">عروض الأسعار</th>
                <th className="p-3 text-center">الصفقات والفرص</th>
                <th className="p-3 text-center">العقود الموقعة</th>
                <th className="p-3 text-left">المبيعات المحققة</th>
                <th className="p-3 text-left">المستهدف</th>
                <th className="p-3 text-center">نسبة الإنجاز</th>
                <th className="p-3 text-center">معدل التحويل</th>
                <th className="p-3 text-left">التحصيلات المستلمة</th>
                <th className="p-3 text-center">التقييم</th>
                <th className="p-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companyMonthlyReport.map((row) => {
                const isOverTarget = row.achievementRate >= 100;
                const isGood = row.achievementRate >= 70;
                return (
                  <tr key={row.company.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Company Name & Brand */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: row.company.color || "#111111" }}
                        />
                        <div>
                          <div className="font-bold text-slate-900">{row.company.name}</div>
                          {row.company.nameEn && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {row.company.nameEn}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Inquiries */}
                    <td className="p-3 text-center">
                      <span className="font-bold text-blue-700">{row.inquiriesMonth}</span>
                      <span className="text-slate-400 text-[10px] mr-1 font-mono">
                        / {row.inquiriesAllTime}
                      </span>
                    </td>

                    {/* Follow-ups */}
                    <td className="p-3 text-center">
                      <span className="font-bold text-emerald-700">
                        {row.followUpsCompleted}
                      </span>
                      <span className="text-slate-400 text-[10px] mr-1 font-mono">
                        / {row.followUpsMonth}
                      </span>
                    </td>

                    {/* Quotations */}
                    <td className="p-3 text-center">
                      <div className="font-bold text-amber-800 font-mono">
                        {row.quotationsMonthCount} عروض
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {row.quotationsMonthValue.toLocaleString()} ج.م
                      </div>
                    </td>

                    {/* Opportunities / Deals */}
                    <td className="p-3 text-center">
                      <div className="font-bold text-indigo-900 font-mono">
                        {row.opportunitiesMonthCount} صفقة
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {row.opportunitiesWonMonthCount} رابحة • {row.opportunitiesOpenMonthCount} جارية
                      </div>
                    </td>

                    {/* Contracts */}
                    <td className="p-3 text-center">
                      <div className="font-bold text-teal-800 font-mono">
                        {row.contractsMonthCount} عقد
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {row.contractsMonthValue.toLocaleString()} ج.م
                      </div>
                    </td>

                    {/* Sales Achieved */}
                    <td className="p-3 text-left font-mono font-black text-slate-900">
                      <div>{row.salesMonth.toLocaleString()} ج.م</div>
                      <div className="text-[10px] text-slate-400 font-normal">({row.salesMonthCount} عملية)</div>
                    </td>

                    {/* Target */}
                    <td className="p-3 text-left font-mono text-slate-600">
                      {row.target.toLocaleString()} ج.م
                    </td>

                    {/* Achievement Rate */}
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${
                          isOverTarget
                            ? "bg-emerald-100 text-emerald-800"
                            : isGood
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {row.achievementRate}%
                      </span>
                    </td>

                    {/* Conversion Rate */}
                    <td className="p-3 text-center font-mono font-bold text-slate-700">
                      {row.conversionRate}%
                    </td>

                    {/* Collections */}
                    <td className="p-3 text-left font-mono font-bold text-emerald-700">
                      {row.collectedMonth.toLocaleString()} ج.م
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 text-center">
                      {isOverTarget ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                          🌟 متفوق
                        </span>
                      ) : isGood ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                          ⚡ في المسار
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                          ⏳ بحاجة لتنشيط
                        </span>
                      )}
                    </td>

                    {/* Drill-down action */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() =>
                            navigateToTabWithFilter("opportunities", {
                              companyId: row.company.id,
                            })
                          }
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg font-bold text-[10px] inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                          title="استعراض صفقات الشركة"
                        >
                          <span>الصفقات</span>
                        </button>
                        <button
                          onClick={() =>
                            navigateToTabWithFilter("sales", {
                              companyId: row.company.id,
                              month: selectedMonth,
                            })
                          }
                          className="px-2 py-1 bg-[#F8F8F5] hover:bg-amber-50 text-[#111111] hover:text-[#C8A75A] border border-[#EAEAEA] hover:border-amber-300 rounded-lg font-bold text-[10px] inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                          title="استعراض مبيعات الشركة لهذا الشهر"
                        >
                          <span>المبيعات</span>
                          <ArrowUpRight className="w-3 h-3 text-[#C8A75A]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Breakdown Cards per Company (with inline editing) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-[#111111]">
            أهداف الشركات وتوزيع المستهدف لشهر {monthName} {selYear}:
          </h3>
          <button
            onClick={() => setCurrentTab("settings")}
            className="text-xs font-bold text-[#C8A75A] hover:underline flex items-center gap-1"
          >
            <span>إعدادات الأهداف</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {companies.map((c) => {
            const compSales = monthSales
              .filter((s) => s.companyId === c.id)
              .reduce((acc, s) => acc + s.amount, 0);

            const compTarget = c.monthlyTarget || 0;
            const rate = compTarget > 0 ? Math.round((compSales / compTarget) * 100) : 0;
            const remaining = Math.max(0, compTarget - compSales);
            const isEditing = editingTargetId === c.id;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-2xs space-y-4 hover:border-[#C8A75A]/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color || "#111111" }}
                    />
                    <div>
                      <h4 className="font-bold text-sm text-[#111111]">{c.name}</h4>
                      {c.nameEn && (
                        <span className="text-[10px] text-[#6B7280] font-mono block">
                          {c.nameEn}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                      rate >= 100
                        ? "bg-emerald-100 text-emerald-800"
                        : rate >= 70
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {rate}%
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[#6B7280]">
                    <span>المحقق:</span>
                    <strong className="text-[#111111] font-mono">
                      {(compSales || 0).toLocaleString()} ج.م
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-[#6B7280]">
                    <span>الهدف:</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={newTargetValue}
                          onChange={(e) => setNewTargetValue(Number(e.target.value))}
                          className="w-24 px-1.5 py-0.5 bg-white border border-[#C8A75A] rounded text-xs font-mono font-bold text-left outline-hidden"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveTarget(c.id)}
                          className="p-1 bg-[#111111] text-[#C8A75A] rounded hover:bg-black cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <strong className="text-[#111111] font-mono">
                          {(c.monthlyTarget || 0).toLocaleString()} ج.م
                        </strong>
                        <button
                          onClick={() => handleStartEdit(c.id, c.monthlyTarget)}
                          title="تعديل سريع للتارجت"
                          className="text-[#9CA3AF] hover:text-[#C8A75A] cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[#6B7280]">
                    <span>المتبقي:</span>
                    <strong className="text-amber-700 font-mono">
                      {(remaining || 0).toLocaleString()} ج.م
                    </strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#6B7280]">نسبة الإنجاز</span>
                    <span className="text-[#C8A75A] font-mono">{rate}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#F8F8F5] rounded-full overflow-hidden border border-[#EAEAEA]">
                    <div
                      className="h-full bg-gradient-to-r from-[#111111] to-[#C8A75A] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, rate)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance By Person */}
      <div className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
        <h3 className="font-extrabold text-base text-[#111111] flex items-center gap-2">
          <Award className="w-5 h-5 text-[#C8A75A]" />
          <span>أداء فريق العمل لشهر {monthName} {selYear}</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm text-right border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[#6B7280] font-bold">
                <th className="pb-2">اسم الموظف / المسؤول</th>
                <th className="pb-2 text-center">الاستفسارات</th>
                <th className="pb-2 text-center">المتابعات</th>
                <th className="pb-2 text-center">عروض الأسعار</th>
                <th className="pb-2 text-center">التعاقدات</th>
                <th className="pb-2 text-left">قيمة المبيعات</th>
                <th className="pb-2 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {performanceByPerson.map((person, idx) => (
                <tr key={idx} className="bg-[#F8F8F5] transition-colors">
                  <td className="p-3 rounded-r-xl border border-l-0 border-[#EAEAEA] font-bold text-[#111111]">
                    {person.name}
                  </td>
                  <td className="p-3 border-y border-[#EAEAEA] text-center font-mono font-bold text-[#111111]">
                    {person.inquiries}
                  </td>
                  <td className="p-3 border-y border-[#EAEAEA] text-center font-mono font-bold text-[#111111]">
                    {person.followUps}
                  </td>
                  <td className="p-3 border-y border-[#EAEAEA] text-center font-mono font-bold text-[#111111]">
                    {person.quotations}
                  </td>
                  <td className="p-3 border-y border-[#EAEAEA] text-center font-mono font-bold text-[#22C55E]">
                    {person.contracts}
                  </td>
                  <td className="p-3 border-y border-[#EAEAEA] text-left font-mono font-bold text-[#C8A75A]">
                    {person.salesAmount.toLocaleString()} ج.م
                  </td>
                  <td className="p-3 rounded-l-xl border border-r-0 border-[#EAEAEA] text-center">
                    <button
                      onClick={() =>
                        navigateToTabWithFilter("sales", {
                          responsible: person.name,
                          month: selectedMonth,
                        })
                      }
                      className="px-2.5 py-1 bg-[#111111] hover:bg-[#C8A75A] text-white hover:text-[#111111] text-[10px] font-bold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="استعراض مبيعات المسؤول في هذا الشهر"
                    >
                      <span>مبيعاته</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {performanceByPerson.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center p-6 text-[#9CA3AF]">
                    لا توجد بيانات أداء مسجلة في هذا الشهر.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Records Explorer of Selected Month (Deals, Contracts, Sales) */}
      <div className="bg-white rounded-2xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-[#C8A75A]" />
            <h3 className="font-extrabold text-base text-[#111111]">
              تفاصيل حركة شهر {monthName} {selYear}
            </h3>
          </div>

          {/* Sub-tab navigation */}
          <div className="flex items-center gap-1.5 bg-[#F8F8F5] p-1 rounded-xl border border-[#EAEAEA]">
            <button
              onClick={() => setBottomTableTab("deals")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                bottomTableTab === "deals"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الصفقات والفرص ({monthOpportunities.length})
            </button>
            <button
              onClick={() => setBottomTableTab("contracts")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                bottomTableTab === "contracts"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              العقود ({monthContracts.length})
            </button>
            <button
              onClick={() => setBottomTableTab("sales")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                bottomTableTab === "sales"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              المبيعات ({monthSales.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Deals / Opportunities */}
        {bottomTableTab === "deals" && (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-[#EAEAEA] rounded-xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F8F8F5] text-[#6B7280] font-bold border-b border-[#EAEAEA]">
                    <th className="p-3">الصفقة / الفرصة</th>
                    <th className="p-3">العميل</th>
                    <th className="p-3">🏢 الشركة</th>
                    <th className="p-3">📍 المنطقة</th>
                    <th className="p-3">المرحلة / الحالة</th>
                    <th className="p-3">المسؤول</th>
                    <th className="p-3 text-left">القيمة المتوقعة</th>
                    <th className="p-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {monthOpportunities.map((opp) => {
                    const comp = companies.find((c) => c.id === opp.companyId);
                    const isWon = opp.stage === "won" || opp.status === "won";
                    const isLost = opp.stage === "lost" || opp.status === "lost";
                    return (
                      <tr key={opp.id} className="hover:bg-[#F8F8F5]/60 transition-colors">
                        <td className="p-3 font-bold text-slate-900">
                          {opp.title || "صفقة جديدة"}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => opp.customerId && setSelectedCustomerIdFor360(opp.customerId)}
                            className="font-bold text-slate-900 hover:text-[#C8A75A] hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>{opp.customerName || "عميل"}</span>
                            {opp.customerId && <ExternalLink className="w-3 h-3 text-[#C8A75A]" />}
                          </button>
                        </td>
                        <td className="p-3 font-medium text-[#6B7280]">
                          {comp?.name || opp.companyName || "-"}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-slate-800 border border-amber-200 text-[11px] font-bold">
                            <MapPin className="w-3 h-3 text-[#C8A75A]" />
                            <span>{opp.area || "غير محدد"}</span>
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isWon
                                ? "bg-emerald-100 text-emerald-800"
                                : isLost
                                ? "bg-rose-100 text-rose-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {isWon ? "✓ رابحة / مغلقة" : isLost ? "✕ خاسرة" : `جارية (${opp.stage || "تفاوض"})`}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">
                          {opp.salesPerson || opp.responsible || "غير محدد"}
                        </td>
                        <td className="p-3 font-mono font-black text-left text-slate-900">
                          {((opp.expectedValue || opp.value || 0)).toLocaleString()} ج.م
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() =>
                              navigateToTabWithFilter("opportunities", {
                                companyId: opp.companyId,
                              })
                            }
                            className="px-2 py-1 bg-[#F8F8F5] hover:bg-amber-50 text-slate-900 hover:text-[#C8A75A] border border-[#EAEAEA] rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>عرض</span>
                            <ArrowUpRight className="w-3 h-3 text-[#C8A75A]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {monthOpportunities.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        لا توجد صفقات أو فرص مسجلة في هذا الشهر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Contracts */}
        {bottomTableTab === "contracts" && (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-[#EAEAEA] rounded-xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F8F8F5] text-[#6B7280] font-bold border-b border-[#EAEAEA]">
                    <th className="p-3">رقم العقد</th>
                    <th className="p-3">العميل</th>
                    <th className="p-3">📍 المنطقة</th>
                    <th className="p-3">🏢 الشركة</th>
                    <th className="p-3">📅 التاريخ</th>
                    <th className="p-3 text-left">💰 القيمة</th>
                    <th className="p-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {monthContracts.map((ctr) => {
                    const comp = companies.find((c) => c.id === ctr.companyId);
                    return (
                      <tr key={ctr.id} className="hover:bg-[#F8F8F5]/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#111111]">
                          {ctr.contractNumber}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => ctr.customerId && setSelectedCustomerIdFor360(ctr.customerId)}
                            className="font-bold text-[#111111] hover:text-[#C8A75A] hover:underline inline-flex items-center gap-1 cursor-pointer text-right transition-colors"
                            title="عرض ملف العميل الشامل (Customer 360)"
                          >
                            <span>{ctr.customerName}</span>
                            <ExternalLink className="w-3 h-3 text-[#C8A75A]" />
                          </button>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-[#111111] border border-amber-200 text-[11px] font-bold">
                            <MapPin className="w-3 h-3 text-[#C8A75A]" />
                            <span>{ctr.area || "غير محدد"}</span>
                          </span>
                        </td>
                        <td className="p-3 font-medium text-[#6B7280]">{comp?.name || "-"}</td>
                        <td className="p-3 font-mono text-[#6B7280]">{ctr.date}</td>
                        <td className="p-3 font-mono font-extrabold text-[#111111] text-left">
                          {(ctr.totalValue || 0).toLocaleString()} ج.م
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() =>
                              navigateToTabWithFilter("sales", {
                                month: selectedMonth,
                                companyId: ctr.companyId,
                                searchQuery: ctr.customerName,
                              })
                            }
                            className="px-2 py-1 bg-[#F8F8F5] hover:bg-amber-50 text-[#111111] hover:text-[#C8A75A] border border-[#EAEAEA] rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="استعراض في سجل المبيعات"
                          >
                            <span>تفاصيل</span>
                            <ArrowUpRight className="w-3 h-3 text-[#C8A75A]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {monthContracts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        لا توجد عقود مسجلة في هذا الشهر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Sales */}
        {bottomTableTab === "sales" && (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-[#EAEAEA] rounded-xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F8F8F5] text-[#6B7280] font-bold border-b border-[#EAEAEA]">
                    <th className="p-3">كود العملية</th>
                    <th className="p-3">العميل</th>
                    <th className="p-3">🏢 الشركة</th>
                    <th className="p-3">المسؤول</th>
                    <th className="p-3">📅 التاريخ</th>
                    <th className="p-3 text-left">المبلغ</th>
                    <th className="p-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {monthSales.map((s) => {
                    const comp = companies.find((c) => c.id === s.companyId);
                    return (
                      <tr key={s.id} className="hover:bg-[#F8F8F5]/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#111111]">
                          {s.id.slice(0, 8)}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {s.customerName}
                        </td>
                        <td className="p-3 font-medium text-[#6B7280]">{comp?.name || "-"}</td>
                        <td className="p-3 text-slate-600">{s.salesPerson || "-"}</td>
                        <td className="p-3 font-mono text-[#6B7280]">{s.date}</td>
                        <td className="p-3 font-mono font-black text-left text-slate-900">
                          {s.amount.toLocaleString()} ج.م
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() =>
                              navigateToTabWithFilter("sales", {
                                month: selectedMonth,
                                companyId: s.companyId,
                                searchQuery: s.customerName,
                              })
                            }
                            className="px-2 py-1 bg-[#F8F8F5] hover:bg-amber-50 text-[#111111] hover:text-[#C8A75A] border border-[#EAEAEA] rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>تفاصيل</span>
                            <ArrowUpRight className="w-3 h-3 text-[#C8A75A]" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {monthSales.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        لا توجد عمليات مبيعات مسجلة في هذا الشهر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
