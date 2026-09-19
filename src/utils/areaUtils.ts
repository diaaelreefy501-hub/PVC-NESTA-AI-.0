export const STANDARD_AREAS = [
  "التجمع",
  "مدينة نصر",
  "الشيخ زايد",
  "أكتوبر",
  "الرحاب",
  "مدينتي",
  "الشروق",
  "العبور",
  "العاصمة الإدارية",
  "المعادي",
  "مصر الجديدة",
  "المهندسين",
  "الدقي",
  "المقطم",
  "الزمالك",
  "الهرم",
  "فيصل",
  "حدائق الأهرام",
  "الساحل الشمالي",
  "العين السخنة",
  "الإسكندرية",
  "طنطا",
  "المنصورة",
] as const;

export function normalizeArea(rawArea: string | undefined | null): string {
  if (!rawArea || typeof rawArea !== "string") return "";
  const cleaned = rawArea.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  if (cleaned === "غير محدد") return "غير محدد";

  const lower = cleaned.toLowerCase();

  // New Cairo / Tagamoa
  if (
    cleaned.includes("تجمع") ||
    cleaned.includes("القاهرة الجديدة") ||
    cleaned.includes("النرجس") ||
    cleaned.includes("الياسمين") ||
    cleaned.includes("البنفسج") ||
    cleaned.includes("بيت الوطن") ||
    lower.includes("tagamoa") ||
    lower.includes("new cairo")
  ) {
    return "التجمع";
  }

  // Sheikh Zayed
  if (
    cleaned.includes("زايد") ||
    lower.includes("zayed")
  ) {
    return "الشيخ زايد";
  }

  // 6th of October
  if (
    cleaned.includes("أكتوبر") ||
    cleaned.includes("اكتوبر") ||
    lower.includes("october")
  ) {
    return "أكتوبر";
  }

  // Nasr City
  if (
    cleaned.includes("مدينة نصر") ||
    cleaned.includes("مكرم عبيد") ||
    cleaned.includes("عباس العقاد") ||
    lower.includes("nasr city")
  ) {
    return "مدينة نصر";
  }

  // Heliopolis
  if (
    cleaned.includes("مصر الجديدة") ||
    cleaned.includes("مصر الجديده") ||
    cleaned.includes("الكوربة") ||
    lower.includes("heliopolis")
  ) {
    return "مصر الجديدة";
  }

  // Maadi
  if (
    cleaned.includes("المعادي") ||
    cleaned.includes("المعادى") ||
    cleaned.includes("دجلة") ||
    lower.includes("maadi")
  ) {
    return "المعادي";
  }

  // Rehab
  if (cleaned.includes("الرحاب") || lower.includes("rehab")) {
    return "الرحاب";
  }

  // Madinaty
  if (cleaned.includes("مدينتي") || cleaned.includes("مدينتى") || lower.includes("madinaty")) {
    return "مدينتي";
  }

  // Shorouk
  if (cleaned.includes("الشروق") || lower.includes("shorouk") || lower.includes("shrouk")) {
    return "الشروق";
  }

  // Obour
  if (cleaned.includes("العبور") || lower.includes("obour") || lower.includes("obur")) {
    return "العبور";
  }

  // New Capital
  if (
    cleaned.includes("العاصمة الإدارية") ||
    cleaned.includes("العاصمة الادارية") ||
    cleaned.includes("العاصمة") ||
    lower.includes("capital")
  ) {
    return "العاصمة الإدارية";
  }

  // Mokattam
  if (cleaned.includes("المقطم") || lower.includes("mokattam")) {
    return "المقطم";
  }

  // Mohandessin
  if (cleaned.includes("المهندسين") || lower.includes("mohandessin")) {
    return "المهندسين";
  }

  // Dokki
  if (cleaned.includes("الدقي") || cleaned.includes("الدقى") || lower.includes("dokki")) {
    return "الدقي";
  }

  // Zamalek
  if (cleaned.includes("الزمالك") || lower.includes("zamalek")) {
    return "الزمالك";
  }

  // North Coast
  if (cleaned.includes("الساحل") || lower.includes("north coast") || lower.includes("sahel")) {
    return "الساحل الشمالي";
  }

  // Ain Sokhna
  if (cleaned.includes("السخنة") || cleaned.includes("السخنه") || lower.includes("sokhna")) {
    return "العين السخنة";
  }

  // Alexandria
  if (cleaned.includes("الإسكندرية") || cleaned.includes("اسكندرية") || lower.includes("alex")) {
    return "الإسكندرية";
  }

  return cleaned;
}

export interface AreaPerformanceStat {
  area: string;
  customersCount: number;
  inquiriesCount: number;
  opportunitiesCount?: number;
  quotationsCount: number;
  contractsCount: number;
  totalSales: number;
  averageSale: number;
  conversionRate: number; // Contracts / Customers %
}

export function computeAreaStatistics(
  customers: Array<{ area?: string }>,
  inquiries: Array<{ area?: string }>,
  quotations: Array<{ area?: string }>,
  contracts: Array<{ area?: string; totalValue?: number }>,
  sales: Array<{ area?: string; amount?: number }>,
  opportunities?: Array<{ area?: string }>
): AreaPerformanceStat[] {
  const map: Record<
    string,
    {
      customersCount: number;
      inquiriesCount: number;
      opportunitiesCount: number;
      quotationsCount: number;
      contractsCount: number;
      totalSales: number;
    }
  > = {};

  const ensure = (area: string) => {
    const key = normalizeArea(area);
    if (!map[key]) {
      map[key] = {
        customersCount: 0,
        inquiriesCount: 0,
        opportunitiesCount: 0,
        quotationsCount: 0,
        contractsCount: 0,
        totalSales: 0,
      };
    }
    return key;
  };

  customers.forEach((c) => {
    const k = ensure(c.area || "غير محدد");
    map[k].customersCount += 1;
  });

  inquiries.forEach((i) => {
    const k = ensure(i.area || "غير محدد");
    map[k].inquiriesCount += 1;
  });

  if (opportunities) {
    opportunities.forEach((o) => {
      const k = ensure(o.area || "غير محدد");
      map[k].opportunitiesCount += 1;
    });
  }

  quotations.forEach((q) => {
    const k = ensure(q.area || "غير محدد");
    map[k].quotationsCount += 1;
  });

  contracts.forEach((ct) => {
    const k = ensure(ct.area || "غير محدد");
    map[k].contractsCount += 1;
  });

  sales.forEach((s) => {
    const k = ensure(s.area || "غير محدد");
    map[k].totalSales += Number(s.amount || 0);
  });

  const result: AreaPerformanceStat[] = Object.entries(map).map(([area, data]) => {
    const avgSale = data.contractsCount > 0 ? Math.round(data.totalSales / data.contractsCount) : 0;
    const convRate = data.customersCount > 0 ? Math.round((data.contractsCount / data.customersCount) * 100) : 0;

    return {
      area,
      customersCount: data.customersCount,
      inquiriesCount: data.inquiriesCount,
      opportunitiesCount: data.opportunitiesCount,
      quotationsCount: data.quotationsCount,
      contractsCount: data.contractsCount,
      totalSales: data.totalSales,
      averageSale: avgSale,
      conversionRate: convRate,
    };
  });

  // Default sorting: highest sales first, then highest contracts
  return result.sort((a, b) => b.totalSales - a.totalSales || b.contractsCount - a.contractsCount);
}
