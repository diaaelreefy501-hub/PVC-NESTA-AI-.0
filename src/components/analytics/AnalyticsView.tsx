import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { computeAreaStatistics } from "../../utils/areaUtils";
import { getEntityEventDate } from "../../utils/kpiEngine";
import {
  BarChart3,
  MapPin,
  Building2,
  Calendar,
  TrendingUp,
  Filter,
  PieChart as PieIcon,
  Users,
  DollarSign,
  FileCheck2,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ChevronDown,
  Sparkles,
  Share2,
  XCircle,
  AlertCircle,
  Trophy,
  Target,
  Percent,
  Award,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type AnalyticsTab =
  | "overview"
  | "sales"
  | "conversion"
  | "pipeline"
  | "team"
  | "monthly"
  | "areas"
  | "companies"
  | "sources"
  | "losses";

const CHART_COLORS = [
  "#C8A75A",
  "#111111",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
  "#EF4444",
];

export const AnalyticsView: React.FC = () => {
  const {
    customers,
    inquiries,
    quotations,
    contracts,
    sales,
    opportunities,
    lossReasons,
    companies,
    users,
    activeCompanyId,
    navigateToTabWithFilter,
    setSelectedCustomerIdFor360,
    calculateContractedSalesTotal,
    payments,
    unifiedKPIs,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");

  // Keep analytics company filter in sync with global active company context
  React.useEffect(() => {
    if (activeCompanyId !== "all") {
      setSelectedCompanyId(activeCompanyId);
    } else {
      setSelectedCompanyId("all");
    }
  }, [activeCompanyId]);

  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>("all");

  // Extract available years from sales and contracts
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    sales.forEach((s) => {
      const d = getEntityEventDate(s, "sale");
      if (d && d.length >= 4) {
        years.add(d.slice(0, 4));
      }
    });
    contracts.forEach((c) => {
      const d = getEntityEventDate(c, "contract");
      if (d && d.length >= 4) {
        years.add(d.slice(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [sales, contracts]);

  // Extract available months for period filtering
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    sales.forEach((s) => {
      const d = getEntityEventDate(s, "sale");
      if (d && d.length >= 7) months.add(d.slice(0, 7));
    });
    contracts.forEach((c) => {
      const d = getEntityEventDate(c, "contract");
      if (d && d.length >= 7) months.add(d.slice(0, 7));
    });
    const nowKey = new Date().toISOString().slice(0, 7);
    months.add(nowKey);
    return Array.from(months).sort().reverse();
  }, [sales, contracts]);

  // Extract available employees
  const availableEmployees = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.name) set.add(u.name);
    });
    sales.forEach((s) => {
      if (s.salesPerson) set.add(s.salesPerson);
      if (s.responsible) set.add(s.responsible);
    });
    contracts.forEach((c) => {
      if (c.salesPerson) set.add(c.salesPerson);
      if (c.responsible) set.add(c.responsible);
    });
    inquiries.forEach((i) => {
      if (i.responsible) set.add(i.responsible);
    });
    return Array.from(set).sort();
  }, [users, sales, contracts, inquiries]);

  // Extract all unique areas
  const allUniqueAreas = useMemo(() => {
    const areaSet = new Set<string>();
    customers.forEach((c) => {
      if (c.area && c.area !== "غير محدد") areaSet.add(c.area);
    });
    return Array.from(areaSet).sort();
  }, [customers]);

  // Period / Date matching helper
  const matchPeriod = (dateStr?: string) => {
    if (!dateStr) return selectedMonth === "all" && selectedYear === "all";
    if (selectedMonth !== "all" && !dateStr.startsWith(selectedMonth)) return false;
    if (selectedYear !== "all" && !dateStr.startsWith(selectedYear)) return false;
    return true;
  };

  // Employee matching helper
  const matchEmployee = (person?: string, fallbackPerson?: string) => {
    if (selectedEmployee === "all") return true;
    return person === selectedEmployee || fallbackPerson === selectedEmployee;
  };

  // Filtered dataset according to local selectors (Company, Month, Year, Employee, Area)
  const filteredSalesData = useMemo(() => {
    return sales.filter((s) => {
      const d = getEntityEventDate(s, "sale");
      const matchCompany = selectedCompanyId === "all" || s.companyId === selectedCompanyId;
      const matchArea = selectedAreaFilter === "all" || s.area === selectedAreaFilter;
      const matchStatus = s.recordStatus !== "duplicate" && s.recordStatus !== "excluded";
      return (
        matchCompany &&
        matchArea &&
        matchStatus &&
        matchPeriod(d) &&
        matchEmployee(s.salesPerson, s.responsible)
      );
    });
  }, [sales, selectedCompanyId, selectedYear, selectedMonth, selectedAreaFilter, selectedEmployee]);

  const filteredContractsData = useMemo(() => {
    return contracts.filter((c) => {
      const d = getEntityEventDate(c, "contract");
      const matchCompany = selectedCompanyId === "all" || c.companyId === selectedCompanyId;
      const matchArea = selectedAreaFilter === "all" || c.area === selectedAreaFilter;
      const matchStatus = c.recordStatus !== "duplicate" && c.recordStatus !== "excluded" && c.status !== "cancelled";
      return (
        matchCompany &&
        matchArea &&
        matchStatus &&
        matchPeriod(d) &&
        matchEmployee(c.salesPerson, c.responsible)
      );
    });
  }, [contracts, selectedCompanyId, selectedYear, selectedMonth, selectedAreaFilter, selectedEmployee]);

  const filteredPaymentsData = useMemo(() => {
    return payments.filter((p) => {
      const d = getEntityEventDate(p, "payment");
      const customer = customers.find((c) => c.id === p.customerId || (c.name && c.name === p.customerName));
      const contract = contracts.find((c) => c.id === p.contractId);

      const pCompId = p.companyId && p.companyId !== "all" ? p.companyId : customer?.companyId || contract?.companyId;
      const matchCompany = selectedCompanyId === "all" || pCompId === selectedCompanyId;
      
      const paymentArea = (p as any).area || customer?.area || contract?.area;
      const paymentSalesPerson = (p as any).salesPerson || contract?.salesPerson || customer?.salesPerson || customer?.responsible;

      const matchArea = selectedAreaFilter === "all" || paymentArea === selectedAreaFilter;
      const matchStatus = p.recordStatus !== "duplicate" && p.recordStatus !== "excluded";
      return (
        matchCompany &&
        matchArea &&
        matchStatus &&
        matchPeriod(d) &&
        matchEmployee(paymentSalesPerson)
      );
    });
  }, [payments, customers, contracts, selectedCompanyId, selectedYear, selectedMonth, selectedAreaFilter, selectedEmployee]);

  const filteredCustomersData = useMemo(() => {
    return customers.filter((c) => {
      const d = getEntityEventDate(c, "customer");
      const matchCompany = selectedCompanyId === "all" || c.companyId === selectedCompanyId;
      const matchArea = selectedAreaFilter === "all" || c.area === selectedAreaFilter;
      return (
        matchCompany &&
        matchArea &&
        matchPeriod(d) &&
        matchEmployee(c.salesPerson, c.responsible)
      );
    });
  }, [customers, selectedCompanyId, selectedYear, selectedMonth, selectedAreaFilter, selectedEmployee]);

  const filteredInquiriesData = useMemo(() => {
    return inquiries.filter((i) => {
      const d = getEntityEventDate(i, "inquiry");
      const matchCompany = selectedCompanyId === "all" || i.companyId === selectedCompanyId;
      const matchArea = selectedAreaFilter === "all" || i.area === selectedAreaFilter;
      return (
        matchCompany &&
        matchArea &&
        matchPeriod(d) &&
        matchEmployee(i.responsible)
      );
    });
  }, [inquiries, selectedCompanyId, selectedYear, selectedMonth, selectedAreaFilter, selectedEmployee]);

  const filteredQuotationsData = useMemo(() => {
    return quotations.filter((q) => {
      const d = getEntityEventDate(q, "quotation");
      const matchCompany = selectedCompanyId === "all" || q.companyId === selectedCompanyId;
      const matchArea = selectedAreaFilter === "all" || q.area === selectedAreaFilter;
      return (
        matchCompany &&
        matchArea &&
        matchPeriod(d) &&
        matchEmployee(q.createdByName)
      );
    });
  }, [quotations, selectedCompanyId, selectedYear, selectedMonth, selectedAreaFilter, selectedEmployee]);

  const filteredOpportunitiesData = useMemo(() => {
    return opportunities.filter((o) => {
      const d = getEntityEventDate(o, "opportunity");
      const matchCompany = selectedCompanyId === "all" || o.companyId === selectedCompanyId;
      const matchArea = selectedAreaFilter === "all" || o.area === selectedAreaFilter;
      return (
        matchCompany &&
        matchArea &&
        matchPeriod(d) &&
        matchEmployee((o as any).assignedTo, (o as any).responsible)
      );
    });
  }, [opportunities, selectedCompanyId, selectedYear, selectedMonth, selectedAreaFilter, selectedEmployee]);

  // High-level summary metrics
  const totalContractsAmount = useMemo(() => {
    return filteredContractsData.reduce((sum, c) => sum + (Number(c.totalValue) || 0), 0);
  }, [filteredContractsData]);

  const totalSalesAmount = useMemo(() => {
    return filteredSalesData.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [filteredSalesData]);

  const totalPaymentsAmount = useMemo(() => {
    // If we are looking at all companies and no specific period filter is active in AnalyticsView,
    // we use the unifiedKPIs.collections.totalAmount which correctly handles the 520k legacy-to-payments reconciliation logic
    if (selectedCompanyId === "all" && activeCompanyId === "all") {
      return unifiedKPIs.collections.totalAmount;
    }
    
    // Fallback logic that mirrors kpiEngine's robust approach
    const paymentsByContract = new Map<string, number>();
    let directPaymentsSum = 0;

    filteredPaymentsData.forEach((p) => {
      if (p.status === "reversed" || p.status === "refunded") return;
      const amt = Number(p.amount) || 0;
      if (p.contractId) {
        paymentsByContract.set(p.contractId, (paymentsByContract.get(p.contractId) || 0) + amt);
      } else {
        directPaymentsSum += amt;
      }
    });

    let contractCollectionsSum = 0;
    filteredContractsData.forEach((c) => {
      if (paymentsByContract.has(c.id)) {
        contractCollectionsSum += paymentsByContract.get(c.id)!;
      } else {
        const legacyPaid = Number(c.paidAmount) || 0;
        if (legacyPaid > 0) {
          contractCollectionsSum += legacyPaid;
        }
      }
    });

    return contractCollectionsSum + directPaymentsSum;
  }, [filteredPaymentsData, filteredContractsData, unifiedKPIs, selectedCompanyId, activeCompanyId]);

  const totalContractsCount = filteredContractsData.length;
  const avgDealSize = totalContractsCount > 0 ? Math.round(totalContractsAmount / totalContractsCount) : 0;

  // 1. Area Statistics
  const areaStats = useMemo(() => {
    return computeAreaStatistics(
      filteredCustomersData,
      filteredInquiriesData,
      filteredQuotationsData,
      filteredContractsData,
      filteredSalesData,
      filteredOpportunitiesData
    );
  }, [
    filteredCustomersData,
    filteredInquiriesData,
    filteredQuotationsData,
    filteredContractsData,
    filteredSalesData,
    filteredOpportunitiesData,
  ]);

  // Top Areas Chart Data (formatted for Recharts)
  const topAreasChartData = useMemo(() => {
    return areaStats
      .filter((a) => a.area !== "غير محدد" && a.totalSales > 0)
      .slice(0, 8)
      .map((a) => ({
        area: a.area,
        sales: a.totalSales,
        contracts: a.contractsCount,
        customers: a.customersCount,
        avgSale: a.averageSale,
      }));
  }, [areaStats]);

  // 2. Company Statistics
  const companyStats = useMemo(() => {
    return companies.map((c) => {
      const compContracts = filteredContractsData.filter((ctr) => ctr.companyId === c.id);
      const totalAmount = calculateContractedSalesTotal(compContracts, "all", "all", "all");
      const compCustomers = filteredCustomersData.filter((cust) => cust.companyId === c.id);
      const percent = totalSalesAmount > 0 ? Math.round((totalAmount / totalSalesAmount) * 100) : 0;

      return {
        id: c.id,
        name: c.name,
        nameEn: c.nameEn,
        color: c.color,
        monthlyTarget: c.monthlyTarget,
        salesAmount: totalAmount,
        contractsCount: compContracts.length,
        customersCount: compCustomers.length,
        percentOfTotal: percent,
        avgDealSize: compContracts.length > 0 ? Math.round(totalAmount / compContracts.length) : 0,
      };
    });
  }, [companies, filteredContractsData, filteredCustomersData, totalSalesAmount, calculateContractedSalesTotal]);

  // 3. Monthly Timeline Breakdown
  const monthlyTimeline = useMemo(() => {
    const map: Record<
      string,
      {
        monthKey: string;
        salesCount: number;
        salesAmount: number;
        contractsCount: number;
        contractsAmount: number;
      }
    > = {};

    filteredSalesData.forEach((s) => {
      if (!s.date || s.date.length < 7) return;
      const mKey = s.date.slice(0, 7);
      if (!map[mKey]) {
        map[mKey] = {
          monthKey: mKey,
          salesCount: 0,
          salesAmount: 0,
          contractsCount: 0,
          contractsAmount: 0,
        };
      }
      map[mKey].salesCount += 1;
      map[mKey].salesAmount += s.amount || 0;
    });

    filteredContractsData.forEach((c) => {
      if (!c.date || c.date.length < 7) return;
      const mKey = c.date.slice(0, 7);
      if (!map[mKey]) {
        map[mKey] = {
          monthKey: mKey,
          salesCount: 0,
          salesAmount: 0,
          contractsCount: 0,
          contractsAmount: 0,
        };
      }
      map[mKey].contractsCount += 1;
      map[mKey].contractsAmount += c.totalValue || 0;
    });

    return Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredSalesData, filteredContractsData]);

  // Chronological Monthly Chart Data
  const monthlyChartData = useMemo(() => {
    return monthlyTimeline.map((item) => {
      const [y, m] = item.monthKey.split("-");
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      const label = d.toLocaleString("ar-EG", { month: "short" }) + " " + y;
      return {
        monthKey: item.monthKey,
        label,
        sales: item.salesAmount,
        salesCount: item.salesCount,
        contracts: item.contractsCount,
        contractsAmount: item.contractsAmount,
        avgDeal: item.salesCount > 0 ? Math.round(item.salesAmount / item.salesCount) : 0,
      };
    });
  }, [monthlyTimeline]);

  // 4. Sources breakdown
  const sourceStats = useMemo(() => {
    const allKnownSources = [
      "WhatsApp",
      "Facebook",
      "Instagram",
      "Website",
      "Phone",
      "Referral",
      "Manual",
      "Excel Import",
      "Other",
    ];

    return allKnownSources
      .map((src) => {
        const custs = filteredCustomersData.filter((c) => c.source === src);
        const sls = filteredSalesData.filter((s) => s.customerSource === src);
        const totalRev = sls.reduce((acc, s) => acc + s.amount, 0);
        const convRate =
          custs.length > 0
            ? Math.min(100, Math.round((sls.length / custs.length) * 100))
            : 0;
        return {
          source: src,
          customersCount: custs.length,
          salesCount: sls.length,
          revenue: totalRev,
          conversionRate: convRate,
        };
      })
      .filter((s) => s.customersCount > 0 || s.salesCount > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredCustomersData, filteredSalesData]);

  // 5. Lost Reasons Analytics
  const filteredOppsData = useMemo(() => {
    return opportunities.filter((o) => {
      const matchCompany =
        selectedCompanyId === "all" || o.companyId === selectedCompanyId;
      const matchArea =
        selectedAreaFilter === "all" || o.area === selectedAreaFilter;
      return matchCompany && matchArea;
    });
  }, [opportunities, selectedCompanyId, selectedAreaFilter]);

  const lostOppsData = useMemo(() => {
    return filteredOppsData.filter((o) => o.status === "lost");
  }, [filteredOppsData]);

  const lostReasonsStats = useMemo(() => {
    const reasonMap: Record<string, { count: number; value: number }> = {};
    lossReasons.forEach((r) => {
      reasonMap[r] = { count: 0, value: 0 };
    });

    lostOppsData.forEach((opp) => {
      const r = opp.lossReason || "سبب آخر";
      if (!reasonMap[r]) {
        reasonMap[r] = { count: 0, value: 0 };
      }
      reasonMap[r].count += 1;
      reasonMap[r].value += opp.expectedValue || 0;
    });

    const totalLostCount = lostOppsData.length;
    return Object.entries(reasonMap)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        value: data.value,
        percentage:
          totalLostCount > 0 ? Math.round((data.count / totalLostCount) * 100) : 0,
      }))
      .filter((item) => item.count > 0 || lossReasons.includes(item.reason))
      .sort((a, b) => b.count - a.count);
  }, [lostOppsData, lossReasons]);

  // 6. Funnel Data (Overview)
  const funnelStages = useMemo(() => {
    const countInquiries = filteredInquiriesData.length;
    const countQualifiedLeads = filteredCustomersData.filter((c) =>
      ["inspection", "quotation", "negotiation", "contracted"].includes(c.stage)
    ).length;
    const countQuotes = filteredQuotationsData.length;
    const countClosedDeals = filteredContractsData.length;

    const rateInquiryToLead =
      countInquiries > 0 ? Math.min(100, Math.round((countQualifiedLeads / countInquiries) * 100)) : 0;
    const rateLeadToQuote =
      countQualifiedLeads > 0 ? Math.min(100, Math.round((countQuotes / countQualifiedLeads) * 100)) : 0;
    const rateQuoteToContract =
      countQuotes > 0 ? Math.min(100, Math.round((countClosedDeals / countQuotes) * 100)) : 0;

    const baseInquiries = Math.max(1, countInquiries);

    return [
      {
        id: "inquiries",
        stepNumber: 1,
        title: "استفسارات واردة",
        subtitle: "نقطة البداية وقنوات الاتصال",
        count: countInquiries,
        pctOfTotal: countInquiries > 0 ? 100 : 0,
        rateNext: rateInquiryToLead,
        dropOffCount: Math.max(0, countInquiries - countQualifiedLeads),
        dropOffRate: Math.max(0, 100 - rateInquiryToLead),
        targetTab: "inquiries" as const,
        color: "#3B82F6",
        filter: { companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined },
      },
      {
        id: "leads",
        stepNumber: 2,
        title: "معاينات وقياسات",
        subtitle: "عملاء في مراحل المعاينة والتسعير",
        count: countQualifiedLeads,
        pctOfTotal: countInquiries > 0 ? Math.round((countQualifiedLeads / baseInquiries) * 100) : 0,
        rateNext: rateLeadToQuote,
        dropOffCount: Math.max(0, countQualifiedLeads - countQuotes),
        dropOffRate: Math.max(0, 100 - rateLeadToQuote),
        targetTab: "customers" as const,
        color: "#F59E0B",
        filter: {
          stage: "inspection",
          companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
          area: selectedAreaFilter !== "all" ? selectedAreaFilter : undefined,
        },
      },
      {
        id: "quotes",
        stepNumber: 3,
        title: "عروض أسعار مرسلة",
        subtitle: "عروض أسعار معتمدة ومفاوضات",
        count: countQuotes,
        pctOfTotal: countInquiries > 0 ? Math.round((countQuotes / baseInquiries) * 100) : 0,
        rateNext: rateQuoteToContract,
        dropOffCount: Math.max(0, countQuotes - countClosedDeals),
        dropOffRate: Math.max(0, 100 - rateQuoteToContract),
        targetTab: "quotations" as const,
        color: "#8B5CF6",
        filter: { companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined },
      },
      {
        id: "contracts",
        stepNumber: 4,
        title: "صفقات وعقود مبرمة 🤝",
        subtitle: "مبيعات فعلية تم توقيعها",
        count: countClosedDeals,
        pctOfTotal: countInquiries > 0 ? Math.round((countClosedDeals / baseInquiries) * 100) : 0,
        rateNext: 100,
        dropOffCount: 0,
        dropOffRate: 0,
        targetTab: "sales" as const,
        color: "#10B981",
        filter: {
          companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
          area: selectedAreaFilter !== "all" ? selectedAreaFilter : undefined,
        },
      },
    ];
  }, [
    filteredInquiriesData,
    filteredCustomersData,
    filteredQuotationsData,
    filteredContractsData,
    selectedCompanyId,
    selectedAreaFilter,
  ]);

  // 5. Team & Salesperson Statistics
  const teamStats = useMemo(() => {
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
        quotationsCount: number;
        wonOppsCount: number;
        lostOppsCount: number;
      }
    > = {};

    filteredSalesData.forEach((s) => {
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
          quotationsCount: 0,
          wonOppsCount: 0,
          lostOppsCount: 0,
        };
      }
      spMap[p].salesAmount += s.amount || 0;
      spMap[p].salesCount += 1;
    });

    filteredContractsData.forEach((c) => {
      const p = c.salesPerson || c.responsible || "مسؤول المبيعات";
      if (!spMap[p]) {
        const comp = companies.find((comp) => comp.id === c.companyId);
        spMap[p] = {
          name: p,
          companyId: c.companyId,
          companyName: comp ? comp.name : "عام",
          salesAmount: 0,
          salesCount: 0,
          contractsCount: 0,
          inquiriesCount: 0,
          quotationsCount: 0,
          wonOppsCount: 0,
          lostOppsCount: 0,
        };
      }
      spMap[p].contractsCount += 1;
    });

    filteredInquiriesData.forEach((i) => {
      const p = i.responsible || "مسؤول المبيعات";
      if (spMap[p]) {
        spMap[p].inquiriesCount += 1;
      }
    });

    filteredQuotationsData.forEach((q) => {
      const p = q.createdByName || "مسؤول المبيعات";
      if (spMap[p]) {
        spMap[p].quotationsCount += 1;
      }
    });

    filteredOpportunitiesData.forEach((o) => {
      const p = (o as any).assignedTo || (o as any).responsible || "مسؤول المبيعات";
      if (spMap[p]) {
        if (o.status === "won") spMap[p].wonOppsCount += 1;
        if (o.status === "lost") spMap[p].lostOppsCount += 1;
      }
    });

    return Object.values(spMap)
      .map((item) => {
        const conversionRate =
          item.inquiriesCount > 0
            ? Math.round((item.salesCount / item.inquiriesCount) * 100)
            : item.salesCount > 0
            ? 100
            : 0;
        const avgDeal = item.salesCount > 0 ? Math.round(item.salesAmount / item.salesCount) : 0;
        return {
          ...item,
          conversionRate,
          avgDeal,
        };
      })
      .sort((a, b) => b.salesAmount - a.salesAmount);
  }, [
    filteredSalesData,
    filteredContractsData,
    filteredInquiriesData,
    filteredQuotationsData,
    filteredOpportunitiesData,
    companies,
  ]);

  const teamChartData = useMemo(() => {
    return teamStats.map((item) => ({
      name: item.name,
      sales: item.salesAmount,
      contracts: item.contractsCount,
      deals: item.salesCount,
      conversion: item.conversionRate,
    }));
  }, [teamStats]);

  const topSalesperson = teamStats[0] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[#111111] text-[#C8A75A]">
              <BarChart3 className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
                  التحليلات ومؤشرات المبيعات
                </h1>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#C8A75A]/20 text-[#111111] border border-[#C8A75A]/40">
                  Interactive BI Dashboard
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#6B7280]">
                لوحة تحليلية تفاعلية مدعومة بالرسوم البيانية وإمكانية الاستكشاف المعمق (Drill-down)
              </p>
            </div>
          </div>
        </div>

        {/* Global Multi-Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Company Filter */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-2xs text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#C8A75A]" />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-transparent font-bold text-[#111111] focus:outline-hidden cursor-pointer"
            >
              <option value="all">جميع الشركات</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-2xs text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#C8A75A]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-[#111111] focus:outline-hidden cursor-pointer"
            >
              <option value="all">جميع الشهور</option>
              {availableMonths.map((m) => {
                const [y, mo] = m.split("-");
                const d = new Date(parseInt(y, 10), parseInt(mo, 10) - 1, 1);
                const name = d.toLocaleString("ar-EG", { month: "long" }) + " " + y;
                return (
                  <option key={m} value={m}>
                    {name} ({m})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Year Filter */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-2xs text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#C8A75A]" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-[#111111] focus:outline-hidden cursor-pointer"
            >
              <option value="all">كل السنوات</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  سنة {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-2xs text-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#C8A75A]" />
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="bg-transparent font-bold text-[#111111] focus:outline-hidden cursor-pointer"
            >
              <option value="all">جميع مسؤولي المبيعات</option>
              {availableEmployees.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-2xs text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#C8A75A]" />
            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="bg-transparent font-bold text-[#111111] focus:outline-hidden cursor-pointer"
            >
              <option value="all">كل المناطق</option>
              {allUniqueAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards with Drill-downs */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* Card 1: Registered Sales */}
        <div
          onClick={() =>
            navigateToTabWithFilter("sales", {
              companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
              area: selectedAreaFilter !== "all" ? selectedAreaFilter : undefined,
            })
          }
          className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-1 hover:border-[#C8A75A] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>إجمالي المبيعات المسجلة</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#C8A75A] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {(totalSalesAmount || 0).toLocaleString()}{" "}
            <span className="text-xs font-normal text-[#6B7280]">ج.م</span>
          </div>
          <span className="text-[11px] text-[#6B7280] group-hover:text-[#C8A75A] transition-colors">
            من جدول المبيعات ↗
          </span>
        </div>

        {/* Card 2: Contracts Value */}
        <div
          onClick={() =>
            navigateToTabWithFilter("contracts", {
              companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
            })
          }
          className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-1 hover:border-[#C8A75A] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>إجمالي قيمة العقود</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#C8A75A] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl font-black text-[#C8A75A] font-mono">
            {(totalContractsAmount || 0).toLocaleString()}{" "}
            <span className="text-xs font-normal text-[#6B7280]">ج.م</span>
          </div>
          <span className="text-[11px] text-[#6B7280] group-hover:text-[#C8A75A] transition-colors">
            استعراض العقود السارية ↗
          </span>
        </div>

        {/* Card 3: Collections / Payments */}
        <div
          className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-1 hover:border-[#C8A75A] transition-all cursor-pointer group"
          onClick={() => navigateToTabWithFilter("performance", {})}
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>إجمالي التحصيلات</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#C8A75A] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl font-black text-[#10B981] font-mono">
            {(totalPaymentsAmount || 0).toLocaleString()}{" "}
            <span className="text-xs font-normal text-[#6B7280]">ج.م</span>
          </div>
          <span className="text-[11px] text-[#6B7280] group-hover:text-[#C8A75A] transition-colors">
            إجمالي المدفوعات المستلمة ↗
          </span>
        </div>

        {/* Card 4: Contracts Count */}
        <div
          onClick={() =>
            navigateToTabWithFilter("contracts", {
              companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
            })
          }
          className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-1 hover:border-[#C8A75A] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>عدد العقود المعتمدة</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#C8A75A] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {totalContractsCount}
          </div>
          <span className="text-[11px] text-[#6B7280] group-hover:text-[#C8A75A] transition-colors">
            العقود المفعّلة جغرافياً ↗
          </span>
        </div>

        {/* Card 5: Average Contract Value */}
        <div className="bg-white rounded-2xl p-4 border border-[#EAEAEA] shadow-2xs space-y-1">
          <span className="text-xs font-bold text-[#6B7280]">متوسط قيمة العقد</span>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {(avgDealSize || 0).toLocaleString()}{" "}
            <span className="text-xs font-normal text-[#6B7280]">ج.م</span>
          </div>
          <span className="text-[11px] text-[#6B7280]">متوسط القيمة الاسمية للعقود</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#EAEAEA] shadow-2xs overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-[#111111] text-white font-black"
              : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
          }`}
        >
          <Filter className="w-4 h-4 text-[#C8A75A]" />
          <span>قمع التحويل الكلي (Overview)</span>
        </button>

        <button
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "sales" || activeTab === "monthly"
              ? "bg-[#111111] text-white font-black"
              : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#C8A75A]" />
          <span>المبيعات والصفقات (Sales)</span>
        </button>

        <button
          onClick={() => setActiveTab("conversion")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "conversion" || activeTab === "sources"
              ? "bg-[#111111] text-white font-black"
              : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
          }`}
        >
          <Share2 className="w-4 h-4 text-[#C8A75A]" />
          <span>معدلات التحويل ومصادر العملاء (Conversion)</span>
        </button>

        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "pipeline" || activeTab === "losses"
              ? "bg-[#111111] text-white font-black"
              : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
          }`}
        >
          <AlertCircle className="w-4 h-4 text-[#C8A75A]" />
          <span>مسار الصفقات وأسباب الخسارة (Pipeline)</span>
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "team"
              ? "bg-[#111111] text-white font-black"
              : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
          }`}
        >
          <Users className="w-4 h-4 text-[#C8A75A]" />
          <span>أداء فريق المبيعات (Team)</span>
        </button>

        <button
          onClick={() => setActiveTab("areas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "areas"
              ? "bg-[#111111] text-white font-black"
              : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
          }`}
        >
          <MapPin className="w-4 h-4 text-[#C8A75A]" />
          <span>المناطق (Areas)</span>
        </button>

        <button
          onClick={() => setActiveTab("companies")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "companies"
              ? "bg-[#111111] text-white font-black"
              : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
          }`}
        >
          <Building2 className="w-4 h-4 text-[#C8A75A]" />
          <span>مقارنة الشركات (Companies)</span>
        </button>

        <button
          onClick={() => setActiveTab("sources")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "sources"
              ? "bg-[#111111] text-white font-black"
              : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
          }`}
        >
          <Share2 className="w-4 h-4 text-[#C8A75A]" />
          <span>مصادر العملاء (Sources & Conversion)</span>
        </button>

        <button
          onClick={() => setActiveTab("losses")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "losses"
              ? "bg-[#111111] text-white font-black"
              : "text-[#6B7280] hover:text-[#111111] hover:bg-[#F8F8F5]"
          }`}
        >
          <XCircle className="w-4 h-4 text-rose-500" />
          <span>أسباب الخسارة (Lost Reasons)</span>
        </button>
      </div>

      {/* TAB 1: FUNNEL & OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Visual Funnel Card with Full RTL Step Flow & Transition Rates */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-6">
            {/* Funnel Header with High-Level Summary Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EAEAEA] pb-4">
              <div>
                <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                  <Filter className="w-5 h-5 text-[#C8A75A]" />
                  <span>قمع التحول ومسار المبيعات (Sales Conversion Funnel)</span>
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  تحليل مسار تحول العملاء من أول استفسار وحتى توقيع العقد، مع رصد نسب التحول ومواضع التسرب بدقة
                </p>
              </div>

              {/* Quick Summary Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold flex items-center gap-1.5">
                  <span className="text-[#6B7280]">المدخلات:</span>
                  <span className="font-mono font-black">{funnelStages[0]?.count || 0} استفسار</span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                  <span className="text-emerald-700">العقود المبرمة:</span>
                  <span className="font-mono font-black">{funnelStages[3]?.count || 0} عقد</span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-[#111111] text-[#C8A75A] border border-[#333333] text-xs font-bold flex items-center gap-1.5">
                  <span>معدل الإغلاق الإجمالي:</span>
                  <span className="font-mono font-black">
                    {funnelStages[0]?.count > 0
                      ? Math.round(((funnelStages[3]?.count || 0) / funnelStages[0].count) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Stepped Visual Funnel Flow Cards (RTL: 1 -> 2 -> 3 -> 4) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative">
              {funnelStages.map((st, idx) => {
                const isLast = idx === funnelStages.length - 1;
                const isBiggestDrop =
                  !isLast &&
                  st.dropOffRate > 0 &&
                  st.dropOffRate ===
                    Math.max(
                      ...funnelStages
                        .slice(0, 3)
                        .map((s) => s.dropOffRate)
                    );

                return (
                  <div
                    key={st.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 relative group ${
                      isLast
                        ? "bg-emerald-50/40 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/70"
                        : "bg-[#F8F8F5] border-[#EAEAEA] hover:bg-white hover:border-[#C8A75A] hover:shadow-xs"
                    }`}
                  >
                    {/* Stage Header */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#111111]">
                          <span
                            className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black font-mono text-white shadow-2xs"
                            style={{ backgroundColor: st.color }}
                          >
                            {st.stepNumber}
                          </span>
                          <span>{st.title}</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-[#EAEAEA] text-[#6B7280]">
                          {st.pctOfTotal}% من البداية
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] line-clamp-1">{st.subtitle}</p>
                    </div>

                    {/* Stage Count & Rate Badge */}
                    <div className="space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <div className="text-3xl font-black font-mono text-[#111111]">
                          {st.count}
                          <span className="text-xs font-normal text-[#6B7280] mr-1">
                            {idx === 0
                              ? "استفسار"
                              : idx === 1
                              ? "معاينة"
                              : idx === 2
                              ? "عرض سعر"
                              : "عقد موقع"}
                          </span>
                        </div>
                      </div>

                      {/* Transition & Drop-off indicator */}
                      {!isLast ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-emerald-700">نسبة التحول للتالي:</span>
                            <span className="font-mono text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                              {st.rateNext}%
                            </span>
                          </div>
                          {st.dropOffCount > 0 && (
                            <div className="flex items-center justify-between text-[10px] text-rose-700">
                              <span>نسبة الفاقد / التسرب:</span>
                              <span className="font-mono font-bold">
                                {st.dropOffRate}% ({st.dropOffCount})
                              </span>
                            </div>
                          )}
                          {isBiggestDrop && (
                            <div className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                              ⚠️ أعلى نقطة انخفاض في القمع
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] font-black text-emerald-800 bg-emerald-100/80 px-2 py-1 rounded-lg border border-emerald-300">
                          <span>نسبة النجاح والتحويل:</span>
                          <span className="font-mono">100% مكتمل</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => navigateToTabWithFilter(st.targetTab, st.filter)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isLast
                          ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                          : "bg-[#111111] hover:bg-[#C8A75A] text-white hover:text-[#111111]"
                      }`}
                    >
                      <span>استعراض السجلات</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Funnel Progress Matrix Visualizer */}
            <div className="pt-4 border-t border-[#EAEAEA] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-black text-sm text-[#111111] flex items-center gap-2">
                  <span>تدرج مسار التحويل الإجمالي ومقارنة المراحل</span>
                </h4>
                <span className="text-xs text-[#6B7280]">
                  تدرج تنازلي يوضح حجم العينة المحتفظ بها في كل محطة
                </span>
              </div>

              {/* Custom High-Clarity Visual Funnel Bars */}
              <div className="space-y-3 bg-[#F8F8F5] p-4 sm:p-5 rounded-2xl border border-[#EAEAEA]">
                {funnelStages.map((st, idx) => {
                  const maxCount = Math.max(...funnelStages.map((s) => s.count), 1);
                  const barWidthPct = Math.max(12, Math.round((st.count / maxCount) * 100));

                  return (
                    <div key={st.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: st.color }}
                          />
                          <span className="font-bold text-[#111111]">{st.title}</span>
                          <span className="text-[11px] text-[#6B7280] hidden sm:inline">
                            ({st.subtitle})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="font-black text-[#111111]">{st.count}</span>
                          <span className="text-[11px] text-[#6B7280] bg-white px-1.5 py-0.5 rounded border border-[#EAEAEA]">
                            {st.pctOfTotal}% من الإجمالي
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="w-full bg-[#EAEAEA] h-3.5 rounded-full overflow-hidden flex">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidthPct}%`,
                            backgroundColor: st.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Horizontal Bar Chart (Recharts) for detailed analysis */}
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={funnelStages.map((s) => ({
                      name: `${s.stepNumber}. ${s.title}`,
                      count: s.count,
                      color: s.color,
                      targetTab: s.targetTab,
                      filter: s.filter,
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 130, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#6B7280", fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: "#111111", fontSize: 11, fontWeight: "bold" }}
                      width={140}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val} سجل`, "العدد الفعلي"]}
                      contentStyle={{
                        backgroundColor: "#111111",
                        borderRadius: "12px",
                        border: "1px solid #333333",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        direction: "rtl",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[0, 8, 8, 0]}
                      onClick={(entry: any) => {
                        const matched = funnelStages.find((s) => `${s.stepNumber}. ${s.title}` === entry.name);
                        if (matched) navigateToTabWithFilter(matched.targetTab, matched.filter);
                      }}
                      className="cursor-pointer"
                    >
                      {funnelStages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES TRENDS & MONTHLY EVOLUTION */}
      {(activeTab === "sales" || activeTab === "monthly") && (
        <div className="space-y-6">
          {/* Revenue Trend Area Chart */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAEAEA] pb-4">
              <div>
                <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#C8A75A]" />
                  <span>منحنى اتجاه ونمو المبيعات التاريخية (Sales Revenue Trend)</span>
                </h3>
                <p className="text-xs text-[#6B7280]">
                  تطور الإيرادات الشهرية عبر الزمن (اضغط على أي نقطة أو شهر للانتقال المباشر لصفقاته)
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-[#6B7280] bg-[#F8F8F5] px-3 py-1.5 rounded-xl border border-[#EAEAEA]">
                إجمالي المبيعات: {(totalSalesAmount || 0).toLocaleString()} ج.م
              </span>
            </div>

            {monthlyChartData.length === 0 ? (
              <div className="text-center py-12 text-[#6B7280]">
                لا توجد بيانات مبيعات مسجلة في الفلتر الحالي.
              </div>
            ) : (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyChartData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                    onClick={(e: any) => {
                      // @ts-ignore
                      if (e && e.activePayload && e.activePayload[0]) {
                        // @ts-ignore
                        const mKey = e.activePayload[0].payload.monthKey;
                        navigateToTabWithFilter("sales", {
                          month: mKey,
                          companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                        });
                      }
                    }}
                  >
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C8A75A" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#C8A75A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val.toLocaleString()} ج.م`, "المبيعات المحققة"]}
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
                      dataKey="sales"
                      stroke="#C8A75A"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                      dot={{ r: 4, fill: "#111111", stroke: "#C8A75A", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#C8A75A", cursor: "pointer" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Deal Count & Average Deal Size Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
              <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#3B82F6]" />
                <span>عدد الصفقات الموقعة شهرياً</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val} عقد`, "عدد العقود"]}
                      contentStyle={{
                        backgroundColor: "#111111",
                        borderRadius: "12px",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        direction: "rtl",
                      }}
                    />
                    <Bar
                      dataKey="contracts"
                      fill="#111111"
                      radius={[4, 4, 0, 0]}
                      onClick={(entry: any) =>
                        navigateToTabWithFilter("sales", {
                          month: entry?.monthKey,
                          companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                        })
                      }
                      className="cursor-pointer hover:fill-[#C8A75A] transition-colors"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
              <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>متوسط قيمة العقد شهرياً (Avg Deal Size)</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 10 }} />
                    <YAxis
                      tick={{ fill: "#6B7280", fontSize: 10 }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val.toLocaleString()} ج.م`, "متوسط الصفقة"]}
                      contentStyle={{
                        backgroundColor: "#111111",
                        borderRadius: "12px",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        direction: "rtl",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgDeal"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Table with Drill-down Action */}
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-[#EAEAEA] flex items-center justify-between">
              <h3 className="font-black text-base text-[#111111]">
                جدول الشهور التاريخية وتفاصيل المبيعات
              </h3>
              <span className="text-xs text-[#6B7280]">
                {monthlyTimeline.length} شهور مسجلة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F8F8F5] text-[#6B7280] font-bold border-b border-[#EAEAEA]">
                    <th className="p-3.5">الشهر</th>
                    <th className="p-3.5 text-center">عدد العقود</th>
                    <th className="p-3.5 text-left">إجمالي المبيعات</th>
                    <th className="p-3.5 text-left">متوسط العقد</th>
                    <th className="p-3.5 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {[...monthlyChartData].reverse().map((row) => (
                    <tr key={row.monthKey} className="hover:bg-[#F8F8F5]/60 transition-colors">
                      <td className="p-3.5 font-bold text-[#111111]">{row.label}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#111111]">
                        {row.contracts}
                      </td>
                      <td className="p-3.5 text-left font-mono font-black text-[#111111]">
                        {row.sales.toLocaleString()} ج.م
                      </td>
                      <td className="p-3.5 text-left font-mono text-[#C8A75A] font-bold">
                        {row.avgDeal.toLocaleString()} ج.م
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() =>
                            navigateToTabWithFilter("sales", {
                              month: row.monthKey,
                              companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                            })
                          }
                          className="px-2.5 py-1 bg-[#111111] hover:bg-[#C8A75A] text-white hover:text-[#111111] rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>استعراض الصفقات</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AREAS DISTRIBUTION */}
      {activeTab === "areas" && (
        <div className="space-y-6">
          {/* Top Areas Bar Chart */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAEAEA] pb-4">
              <div>
                <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#C8A75A]" />
                  <span>توزيع المبيعات الجغرافي لأعلى المناطق (Top Sales Areas)</span>
                </h3>
                <p className="text-xs text-[#6B7280]">
                  ترتيب المناطق حسب إجمالي حجم التعاقدات (اضغط على العمود للانتقال لصفقات المنطقة)
                </p>
              </div>

              <span className="text-xs font-bold text-[#111111] bg-[#F8F8F5] px-3 py-1.5 rounded-xl border border-[#EAEAEA]">
                {areaStats.length} منطقة مسجلة
              </span>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topAreasChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    dataKey="area"
                    type="category"
                    tick={{ fill: "#111111", fontSize: 11, fontWeight: "bold" }}
                    width={90}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val.toLocaleString()} ج.م`, "المبيعات"]}
                    contentStyle={{
                      backgroundColor: "#111111",
                      borderRadius: "12px",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      direction: "rtl",
                    }}
                  />
                  <Bar
                    dataKey="sales"
                    fill="#C8A75A"
                    radius={[0, 6, 6, 0]}
                    onClick={(entry: any) =>
                      navigateToTabWithFilter("sales", {
                        area: entry?.area,
                        companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                      })
                    }
                    className="cursor-pointer hover:fill-[#111111] transition-colors"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Area Matrix Cards with Click-throughs */}
          <div className="space-y-4">
            <h3 className="font-black text-base text-[#111111]">
              مصفوفة تفصيلية لجميع المناطق ({areaStats.length} منطقة)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {areaStats.map((item, idx) => {
                const percent =
                  totalSalesAmount > 0
                    ? Math.round((item.totalSales / totalSalesAmount) * 100)
                    : 0;

                return (
                  <div
                    key={item.area}
                    className="p-5 rounded-3xl bg-white border border-[#EAEAEA] shadow-2xs hover:border-[#C8A75A] transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#111111] text-[#C8A75A] font-black text-xs flex items-center justify-center font-mono">
                            {idx + 1}
                          </span>
                          <span className="font-black text-sm text-[#111111]">
                            {item.area}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#C8A75A] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          {percent}% الحصة
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-[#6B7280]">
                        <div className="flex justify-between">
                          <span>المبيعات المحققة:</span>
                          <strong className="font-mono text-[#111111]">
                            {item.totalSales.toLocaleString()} ج.م
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>العقود الموقعة:</span>
                          <strong className="font-mono text-[#111111]">
                            {item.contractsCount} عقد
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>العملاء المسجلين:</span>
                          <strong className="font-mono text-[#111111]">
                            {item.customersCount} عميل
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>متوسط الصفقة:</span>
                          <strong className="font-mono text-emerald-700">
                            {item.averageSale.toLocaleString()} ج.م
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#F0F0EE]">
                      <button
                        onClick={() =>
                          navigateToTabWithFilter("sales", {
                            area: item.area,
                            companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                          })
                        }
                        className="flex-1 py-1.5 px-2 bg-[#111111] hover:bg-[#C8A75A] text-white hover:text-[#111111] rounded-xl text-[10px] font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>مبيعاتها</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() =>
                          navigateToTabWithFilter("customers", {
                            area: item.area,
                            companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                          })
                        }
                        className="flex-1 py-1.5 px-2 bg-[#F8F8F5] hover:bg-slate-200 text-[#111111] border border-[#EAEAEA] rounded-xl text-[10px] font-bold text-center transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>عملاؤها</span>
                        <Users className="w-3 h-3 text-[#6B7280]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPANIES DISTRIBUTION & TARGETS */}
      {activeTab === "companies" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart: Market Share */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
              <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-[#C8A75A]" />
                <span>حصة كل شركة من إجمالي المبيعات (Market Share)</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={companyStats}
                      dataKey="salesAmount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      onClick={(entry: any) => {
                        // @ts-ignore
                        const targetId = entry.id || entry.payload?.id;
                        if (targetId) navigateToTabWithFilter("sales", { companyId: targetId });
                      }}
                      className="cursor-pointer"
                    >
                      {companyStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val.toLocaleString()} ج.م`, "المبيعات"]}
                      contentStyle={{
                        backgroundColor: "#111111",
                        borderRadius: "12px",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        direction: "rtl",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Sales vs Targets */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
              <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#3B82F6]" />
                <span>مبيعات الشركات مقارنة بالمستهدف الشهري</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 10 }} />
                    <YAxis
                      tick={{ fill: "#6B7280", fontSize: 10 }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        `${val.toLocaleString()} ج.م`,
                        name === "salesAmount" ? "المبيعات الفعلية" : "المستهدف",
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
                      formatter={(val) => (val === "salesAmount" ? "المبيعات الفعلية" : "المستهدف")}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                    <Bar
                      dataKey="salesAmount"
                      name="salesAmount"
                      fill="#111111"
                      radius={[4, 4, 0, 0]}
                      onClick={(entry) =>
                        navigateToTabWithFilter("sales", { companyId: entry.id })
                      }
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="monthlyTarget"
                      name="monthlyTarget"
                      fill="#C8A75A"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Company Detailed Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {companyStats.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-3xl border border-[#EAEAEA] p-6 shadow-2xs hover:shadow-xs hover:border-[#C8A75A] transition-all space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <div>
                      <h4 className="font-black text-base text-[#111111]">{c.name}</h4>
                      <p className="text-xs text-[#6B7280]">{c.nameEn}</p>
                    </div>
                  </div>

                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-[#C8A75A]/20 text-[#111111] border border-[#C8A75A]/40 font-mono">
                    {c.percentOfTotal}% الحصة
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[#6B7280]">
                    <span>إجمالي المبيعات المحققة:</span>
                    <strong className="text-base font-black text-[#111111] font-mono">
                      {(c.salesAmount || 0).toLocaleString()} ج.م
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-[#6B7280]">
                    <span>عدد العقود الموقعة:</span>
                    <strong className="text-[#111111] font-mono text-sm">
                      {c.contractsCount} عقد
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-[#6B7280]">
                    <span>متوسط حجم العقد:</span>
                    <strong className="text-[#C8A75A] font-mono text-sm">
                      {(c.avgDealSize || 0).toLocaleString()} ج.م
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0F0EE] flex items-center gap-2">
                  <button
                    onClick={() => navigateToTabWithFilter("sales", { companyId: c.id })}
                    className="flex-1 py-2 px-3 bg-[#111111] hover:bg-[#C8A75A] text-white hover:text-[#111111] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>صفقات الشركة</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => navigateToTabWithFilter("performance", { companyId: c.id })}
                    className="py-2 px-3 bg-[#F8F8F5] hover:bg-amber-50 text-[#111111] border border-[#EAEAEA] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="تقرير الأداء الشهري للشركة"
                  >
                    الأداء الشهري
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SOURCES & CONVERSION */}
      {(activeTab === "conversion" || activeTab === "sources") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Source Chart */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
              <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#C8A75A]" />
                <span>إيرادات المبيعات حسب قناة المصدر</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                    <XAxis dataKey="source" tick={{ fill: "#6B7280", fontSize: 10 }} />
                    <YAxis
                      tick={{ fill: "#6B7280", fontSize: 10 }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val.toLocaleString()} ج.م`, "الإيراد"]}
                      contentStyle={{
                        backgroundColor: "#111111",
                        borderRadius: "12px",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        direction: "rtl",
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#111111"
                      radius={[4, 4, 0, 0]}
                      onClick={(entry: any) =>
                        navigateToTabWithFilter("customers", {
                          source: entry?.source,
                          companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                        })
                      }
                      className="cursor-pointer hover:fill-[#C8A75A] transition-colors"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Customers by Source Pie */}
            <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
              <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>توزيع أعداد العملاء حسب القناة</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={sourceStats}
                      dataKey="customersCount"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      onClick={(entry: any) => {
                        // @ts-ignore
                        const targetSource = entry.source || entry.payload?.source;
                        if (targetSource) {
                          navigateToTabWithFilter("customers", {
                            source: targetSource,
                            companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                          });
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {sourceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val} عميل`, "العدد"]}
                      contentStyle={{
                        backgroundColor: "#111111",
                        borderRadius: "12px",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        direction: "rtl",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sources Table with Direct Drill-down */}
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-[#EAEAEA] flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-[#111111]">
                  أداء القنوات البيعية ومعدل التحويل (Conversion Table)
                </h3>
                <p className="text-xs text-[#6B7280]">
                  مقارنة العملاء المحتملين مقابل الصفقات المبرمة مع رابط مباشر لعملاء كل قناة
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F8F8F5] text-[#6B7280] font-bold border-b border-[#EAEAEA]">
                    <th className="py-3.5 px-4">قناة المصدر</th>
                    <th className="py-3.5 px-4 text-center">العملاء المحتملين</th>
                    <th className="py-3.5 px-4 text-center">الصفقات المبرمة</th>
                    <th className="py-3.5 px-4 text-center">معدل التحويل (%)</th>
                    <th className="py-3.5 px-4 text-left">إجمالي الإيرادات</th>
                    <th className="py-3.5 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {sourceStats.map((st) => (
                    <tr key={st.source} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#111111] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#C8A75A]" />
                        <span>{st.source}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#111111]">
                        {st.customersCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">
                        {st.salesCount}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-mono font-bold text-[11px] ${
                            st.conversionRate >= 30
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : st.conversionRate >= 10
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-stone-100 text-stone-600 border border-stone-200"
                          }`}
                        >
                          {st.conversionRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-black text-[#111111]">
                        {st.revenue.toLocaleString()} ج.م
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() =>
                            navigateToTabWithFilter("customers", {
                              source: st.source,
                              companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                            })
                          }
                          className="px-2.5 py-1 bg-[#111111] hover:bg-[#C8A75A] text-white hover:text-[#111111] rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>عرض العملاء</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LOST REASONS & PIPELINE ANALYTICS */}
      {(activeTab === "pipeline" || activeTab === "losses") && (
        <div className="space-y-6">
          {/* Loss KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() =>
                navigateToTabWithFilter("opportunities", {
                  status: "lost",
                  companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                })
              }
              className="bg-white rounded-3xl p-5 border border-rose-200 shadow-2xs space-y-1 hover:border-rose-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
                <span>إجمالي الفرص الخاسرة</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {lostOppsData.length} فرصة
              </div>
              <span className="text-[11px] text-rose-600 group-hover:underline">
                اضغط لاستعراض كافة الفرص الخاسرة ↗
              </span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-[#EAEAEA] shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#6B7280]">
                إجمالي القيمة التقديرية المفقودة
              </span>
              <div className="text-2xl font-black text-[#111111] font-mono">
                {lostReasonsStats
                  .reduce((acc, r) => acc + r.value, 0)
                  .toLocaleString()}{" "}
                <span className="text-xs font-normal text-[#6B7280]">ج.م</span>
              </div>
              <span className="text-[11px] text-rose-500 font-bold">
                فرص تعاقد لم تكتمل
              </span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-[#EAEAEA] shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#6B7280]">
                السبب الأكثر شيوعاً للخسارة
              </span>
              <div className="text-lg font-black text-rose-700">
                {lostReasonsStats[0]?.count > 0
                  ? lostReasonsStats[0].reason
                  : "لا توجد فرص خاسرة"}
              </div>
              <span className="text-[11px] text-[#6B7280]">
                {lostReasonsStats[0]?.count > 0
                  ? `${lostReasonsStats[0].count} حالة (${lostReasonsStats[0].percentage}%)`
                  : "كل الفرص نشطة أو رابحة"}
              </span>
            </div>
          </div>

          {/* Loss Reasons Chart */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
            <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              <span>رسم بياني لأسباب فقدان الفرص (اضغط للفلترة السريعة)</span>
            </h3>

            {lostReasonsStats.length === 0 ? (
              <div className="text-center py-12 text-[#6B7280]">
                لا توجد فرص خاسرة مسجلة في الفلتر الحالي.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lostReasonsStats}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#6B7280", fontSize: 11 }} />
                    <YAxis
                      dataKey="reason"
                      type="category"
                      tick={{ fill: "#111111", fontSize: 11, fontWeight: "bold" }}
                      width={120}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        `${val} فرصة`,
                        name === "count" ? "العدد" : name,
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
                    <Bar
                      dataKey="count"
                      fill="#EF4444"
                      radius={[0, 6, 6, 0]}
                      onClick={(entry: any) =>
                        navigateToTabWithFilter("opportunities", {
                          status: "lost",
                          lossReason: entry?.reason,
                          companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                        })
                      }
                      className="cursor-pointer hover:fill-rose-700 transition-colors"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Detailed Lost Reasons Cards with Direct Action */}
          <div className="space-y-3">
            <h4 className="font-black text-sm text-[#111111]">
              قائمة أسباب الخسارة مع زر التصفية المباشر:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lostReasonsStats.map((item) => (
                <div
                  key={item.reason}
                  className="p-4 rounded-2xl bg-white border border-[#EAEAEA] shadow-2xs hover:border-rose-300 transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-black text-sm text-[#111111]">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span>{item.reason}</span>
                    </div>
                    <div className="text-xs text-[#6B7280] font-mono">
                      {item.count} فرصة خاسرة ({item.percentage}%) — {item.value.toLocaleString()} ج.م مفقودة
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      navigateToTabWithFilter("opportunities", {
                        status: "lost",
                        lossReason: item.reason,
                        companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                      })
                    }
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <span>استعراض الفرص</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SALES TEAM & EMPLOYEE PERFORMANCE */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {/* Top Salesperson & Team Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Podium Card: Top Salesperson */}
            {topSalesperson && topSalesperson.salesAmount > 0 ? (
              <div
                onClick={() =>
                  navigateToTabWithFilter("sales", {
                    salesPerson: topSalesperson.name,
                    companyId:
                      topSalesperson.companyId ||
                      (selectedCompanyId !== "all" ? selectedCompanyId : undefined),
                  })
                }
                className="bg-gradient-to-br from-[#111111] via-[#1A1A1A] to-[#111111] rounded-3xl p-5 text-white border border-[#C8A75A]/40 shadow-xl relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A75A]/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between relative z-10 mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-black text-[#C8A75A] bg-[#C8A75A]/15 px-2.5 py-1 rounded-full border border-[#C8A75A]/30">
                    <Trophy className="w-3.5 h-3.5 text-[#C8A75A]" />
                    <span>مسؤول المبيعات الأكثر مبيعاً (Top Rep)</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[#C8A75A] opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-1 relative z-10">
                  <div className="text-xl font-black text-white">{topSalesperson.name}</div>
                  <div className="text-xs text-[#C8A75A] font-medium">{topSalesperson.companyName}</div>
                  <div className="pt-2 flex items-baseline gap-1 font-mono">
                    <span className="text-2xl font-black text-[#C8A75A]">
                      {topSalesperson.salesAmount.toLocaleString()}
                    </span>
                    <span className="text-xs text-white/60">ج.م مبيعات</span>
                  </div>
                  <div className="flex items-center gap-3 pt-2 text-xs text-white/80 border-t border-white/10 mt-2">
                    <span>
                      العقود: <strong className="text-white font-mono">{topSalesperson.contractsCount}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      التحويل: <strong className="text-emerald-400 font-mono">{topSalesperson.conversionRate}%</strong>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-5 border border-[#EAEAEA] shadow-2xs flex flex-col justify-center items-center text-center text-[#6B7280]">
                <Users className="w-8 h-8 text-[#C8A75A] mb-2 opacity-50" />
                <span className="text-xs font-bold">لا توجد مبيعات مسجلة لفريق المبيعات في هذا النطاق</span>
              </div>
            )}

            {/* Total Team Sales Card */}
            <div className="bg-white rounded-3xl p-5 border border-[#EAEAEA] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
                <span>إجمالي مبيعات الفريق</span>
                <DollarSign className="w-4 h-4 text-[#C8A75A]" />
              </div>
              <div className="text-2xl font-black text-[#111111] font-mono">
                {totalSalesAmount.toLocaleString()}{" "}
                <span className="text-xs font-normal text-[#6B7280]">ج.م</span>
              </div>
              <div className="text-xs text-[#6B7280] flex items-center gap-2">
                <span>
                  متوسط الصفقة:{" "}
                  <strong className="text-[#111111] font-mono">
                    {avgDealSize.toLocaleString()} ج.م
                  </strong>
                </span>
              </div>
            </div>

            {/* Total Closed Deals Card */}
            <div className="bg-white rounded-3xl p-5 border border-[#EAEAEA] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
                <span>إجمالي الصفقات والعقود</span>
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600 font-mono">
                {totalContractsCount}{" "}
                <span className="text-xs font-normal text-[#6B7280]">عقد موقع</span>
              </div>
              <div className="text-xs text-[#6B7280]">
                عبر {teamStats.length} مسؤولي مبيعات
              </div>
            </div>
          </div>

          {/* Team Chart: Sales Reps Comparison */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAEAEA] pb-4">
              <div>
                <h3 className="font-black text-base text-[#111111] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#C8A75A]" />
                  <span>مقارنة إيرادات المبيعات حسب مسؤولي المبيعات (Sales Reps Performance)</span>
                </h3>
                <p className="text-xs text-[#6B7280]">
                  حجم المبيعات المحققة لكل مسؤول مبيعات (اضغط على أي عمود للفلترة السريعة)
                </p>
              </div>
            </div>

            {teamChartData.length === 0 ? (
              <div className="text-center py-12 text-[#6B7280]">
                لا توجد بيانات مسجلة لمسؤولي المبيعات في الفلتر الحالي.
              </div>
            ) : (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teamChartData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EE" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#111111", fontSize: 11, fontWeight: "bold" }}
                      angle={-15}
                      textAnchor="end"
                      height={45}
                    />
                    <YAxis
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        name === "sales" ? `${val.toLocaleString()} ج.م` : `${val} عقد`,
                        name === "sales" ? "إجمالي المبيعات" : "عدد العقود",
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
                    <Bar
                      dataKey="sales"
                      name="sales"
                      fill="#C8A75A"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry: any) =>
                        navigateToTabWithFilter("sales", {
                          salesPerson: entry?.name,
                          companyId: selectedCompanyId !== "all" ? selectedCompanyId : undefined,
                        })
                      }
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Detailed Sales Reps Table */}
          <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-[#EAEAEA] flex items-center justify-between">
              <h4 className="font-black text-sm text-[#111111] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C8A75A]" />
                <span>مصفوفة إنجازات وتفاصيل أداء مسؤولي المبيعات:</span>
              </h4>
              <span className="text-xs text-[#6B7280] font-mono">
                {teamStats.length} مسؤول مبيعات
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#F8F8F5] text-[#6B7280] border-b border-[#EAEAEA] font-bold">
                    <th className="py-3 px-4">مسؤول المبيعات</th>
                    <th className="py-3 px-4">الشركة</th>
                    <th className="py-3 px-4 text-center">الاستفسارات</th>
                    <th className="py-3 px-4 text-center">عروض الأسعار</th>
                    <th className="py-3 px-4 text-center">العقود الموقعة</th>
                    <th className="py-3 px-4 text-left">إجمالي المبيعات</th>
                    <th className="py-3 px-4 text-left">متوسط الصفقة</th>
                    <th className="py-3 px-4 text-center">معدل التحويل</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {teamStats.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-[#6B7280]">
                        لا توجد بيانات مسجلة لمسؤولي المبيعات
                      </td>
                    </tr>
                  ) : (
                    teamStats.map((st, idx) => (
                      <tr key={st.name} className="hover:bg-[#F8F8F5]/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#111111] flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              idx === 0
                                ? "bg-amber-100 text-amber-800"
                                : idx === 1
                                ? "bg-stone-200 text-stone-800"
                                : idx === 2
                                ? "bg-orange-100 text-orange-800"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span>{st.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#6B7280]">{st.companyName}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-[#6B7280]">
                          {st.inquiriesCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-[#6B7280]">
                          {st.quotationsCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">
                          {st.contractsCount}
                        </td>
                        <td className="py-3.5 px-4 text-left font-mono font-black text-[#111111]">
                          {st.salesAmount.toLocaleString()} ج.م
                        </td>
                        <td className="py-3.5 px-4 text-left font-mono text-[#6B7280]">
                          {st.avgDeal.toLocaleString()} ج.م
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-black font-mono ${
                              st.conversionRate >= 30
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : st.conversionRate >= 10
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-stone-100 text-stone-600 border border-stone-200"
                            }`}
                          >
                            {st.conversionRate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() =>
                              navigateToTabWithFilter("sales", {
                                salesPerson: st.name,
                                companyId:
                                  st.companyId ||
                                  (selectedCompanyId !== "all" ? selectedCompanyId : undefined),
                              })
                            }
                            className="px-2.5 py-1 bg-[#111111] hover:bg-[#C8A75A] text-white hover:text-[#111111] rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>عرض الصفقات</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
