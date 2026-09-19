import { CustomerStage } from "../types";

export interface ColumnMapping {
  nameCol: string;
  phoneCol: string;
  areaCol: string;
  companyCol: string;
  statusCol: string;
  contractDateCol: string;
  contractAmountCol: string;
  productCol: string;
  sourceCol: string;
  notesCol: string;
  addressCol?: string;
  secondaryPhoneCol?: string;
}

export function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    nameCol: "",
    phoneCol: "",
    areaCol: "",
    companyCol: "",
    statusCol: "",
    contractDateCol: "",
    contractAmountCol: "",
    productCol: "",
    sourceCol: "",
    notesCol: "",
    addressCol: "",
    secondaryPhoneCol: "",
  };

  const clean = (str: string) => str.trim().toLowerCase().replace(/[\s_-]+/g, "");

  headers.forEach((header) => {
    const c = clean(header);
    const raw = header.trim();

    // 1. Contract Date
    if (
      !mapping.contractDateCol &&
      (c.includes("تاريخالتعاقد") ||
        c.includes("تاريخالعقد") ||
        c.includes("تاريخالبيع") ||
        c.includes("تاريخالاتفاق") ||
        c.includes("contractdate") ||
        c.includes("saledate") ||
        (c.includes("تاريخ") && !c.includes("ميلاد")) ||
        c === "date")
    ) {
      mapping.contractDateCol = raw;
      return;
    }

    // 2. Contract Amount
    if (
      !mapping.contractAmountCol &&
      (c.includes("قيمةالتعاقد") ||
        c.includes("قيمةالعقد") ||
        c.includes("مبلغالتعاقد") ||
        c.includes("اجماليعقد") ||
        c.includes("إجماليعقد") ||
        c.includes("contractamount") ||
        c.includes("dealvalue") ||
        c.includes("totalamount") ||
        c.includes("قيمة") ||
        c.includes("مبلغ") ||
        c.includes("amount") ||
        c.includes("price") ||
        c.includes("سعر"))
    ) {
      mapping.contractAmountCol = raw;
      return;
    }

    // 3. Name (Exclude company name, representative name)
    if (
      !mapping.nameCol &&
      !c.includes("شركة") &&
      !c.includes("شركه") &&
      !c.includes("company") &&
      !c.includes("فرع") &&
      !c.includes("مندوب") &&
      !c.includes("مسؤول") &&
      !c.includes("بائع") &&
      (c.includes("اسمالعميل") ||
        c.includes("العميل") ||
        c.includes("اسمالمشتري") ||
        c.includes("الاسم") ||
        c.includes("اسم") ||
        c.includes("customername") ||
        c.includes("clientname") ||
        c === "name" ||
        c === "customer" ||
        c === "client")
    ) {
      mapping.nameCol = raw;
      return;
    }

    // 4. Phone
    if (
      !mapping.phoneCol &&
      (c.includes("موبايل") ||
        c.includes("هاتف") ||
        c.includes("تليفون") ||
        c.includes("جوال") ||
        c.includes("phone") ||
        c.includes("mobile") ||
        c.includes("tel") ||
        c.includes("cell"))
    ) {
      mapping.phoneCol = raw;
      return;
    }

    // 5. Area
    if (
      !mapping.areaCol &&
      (c.includes("منطقة") ||
        c.includes("منطقه") ||
        c.includes("حي") ||
        c.includes("مكان") ||
        c.includes("عنوان") ||
        c.includes("مدينة") ||
        c.includes("area") ||
        c.includes("district") ||
        c.includes("location") ||
        c.includes("city") ||
        c.includes("address"))
    ) {
      mapping.areaCol = raw;
      return;
    }

    // 6. Company
    if (
      !mapping.companyCol &&
      (c.includes("شركة") ||
        c.includes("شركه") ||
        c.includes("فرع") ||
        c.includes("براند") ||
        c.includes("company") ||
        c.includes("brand") ||
        c.includes("branch"))
    ) {
      mapping.companyCol = raw;
      return;
    }

    // 7. Status / Stage
    if (
      !mapping.statusCol &&
      (c.includes("حالة") ||
        c.includes("حاله") ||
        c.includes("مرحلة") ||
        c.includes("مرحله") ||
        c.includes("وضع") ||
        c.includes("status") ||
        c.includes("stage"))
    ) {
      mapping.statusCol = raw;
      return;
    }

    // 8. Source
    if (
      !mapping.sourceCol &&
      (c.includes("مصدر") || c.includes("source") || c.includes("channel") || c.includes("قناة"))
    ) {
      mapping.sourceCol = raw;
      return;
    }

    // 9. Product Type
    if (
      !mapping.productCol &&
      (c.includes("منتج") ||
        c.includes("قطاع") ||
        c.includes("نوع") ||
        c.includes("product") ||
        c.includes("type"))
    ) {
      mapping.productCol = raw;
      return;
    }

    // 10. Notes
    if (
      !mapping.notesCol &&
      (c.includes("ملاحظات") ||
        c.includes("ملاحظة") ||
        c.includes("تفاصيل") ||
        c.includes("notes") ||
        c.includes("details") ||
        c.includes("remarks"))
    ) {
      mapping.notesCol = raw;
      return;
    }
  });

  return mapping;
}

export function mapStageFromExcel(rawStatus: any): CustomerStage {
  if (!rawStatus) return "inquiry";
  const s = String(rawStatus).trim().toLowerCase();

  if (s.includes("تعاقد") || s.includes("عقد") || s.includes("contract")) {
    return "contracted";
  }
  if (s.includes("بيع") || s.includes("تم البيع") || s.includes("sold") || s.includes("شراء")) {
    return "sold";
  }
  if (s.includes("تفاوض") || s.includes("مفاوضة") || s.includes("negotiat")) {
    return "negotiation";
  }
  if (s.includes("عرض") || s.includes("سعر") || s.includes("quote") || s.includes("quotation")) {
    return "quotation";
  }
  if (s.includes("معاين") || s.includes("مقاس") || s.includes("رفع") || s.includes("inspect")) {
    return "inspection";
  }
  if (s.includes("متابع") || s.includes("follow")) {
    return "followup";
  }
  if (s.includes("تواصل") || s.includes("تم الاتصال") || s.includes("contact")) {
    return "contacted";
  }
  if (s.includes("ملغي") || s.includes("خسارة") || s.includes("مرفوض") || s.includes("lost")) {
    return "lost";
  }

  return "inquiry";
}
