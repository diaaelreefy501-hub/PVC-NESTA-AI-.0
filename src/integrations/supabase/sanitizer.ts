// Supabase Table Sanitizers to guarantee 100% schema compliance
// Strips out any UI/local-only fields that do not exist in the database table schema

export const cleanCustomer = (c: any) => ({
  id: c.id,
  companyId: c.companyId,
  name: c.name || "",
  phone: c.phone || "",
  secondaryPhone: c.secondaryPhone || null,
  area: c.area || "غير محدد",
  address: c.address || "",
  source: c.otherSource ? `${c.source || "Manual"} (${c.otherSource})` : (c.source || "Manual"),
  interestLevel: c.interestLevel || "warm",
  stage: c.stage || "inquiry",
  notes: c.notes || "",
  createdAt: c.createdAt || new Date().toISOString().split("T")[0],
  lastContactDate: c.lastContactDate || null,
  nextFollowUpDate: c.nextFollowUpDate || null,
  totalQuotationsValue: Number(c.totalQuotationsValue) || 0,
  totalSalesValue: Number(c.totalSalesValue) || 0,
});

export const cleanCustomerUpdate = (updates: any) => {
  const allowed = [
    "companyId",
    "name",
    "phone",
    "secondaryPhone",
    "area",
    "address",
    "source",
    "interestLevel",
    "stage",
    "notes",
    "createdAt",
    "lastContactDate",
    "nextFollowUpDate",
    "totalQuotationsValue",
    "totalSalesValue",
  ];
  const cleaned: Record<string, any> = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      cleaned[key] = updates[key];
    }
  }
  if (updates.otherSource && updates.source) {
    cleaned.source = `${updates.source} (${updates.otherSource})`;
  }
  return cleaned;
};

export const cleanInquiry = (i: any) => ({
  id: i.id,
  companyId: i.companyId,
  customerId: i.customerId || null,
  customerName: i.customerName || "",
  customerPhone: i.customerPhone || "",
  area: i.area || "غير محدد",
  productType: i.productType || "",
  details: i.details || "",
  source: i.source || "Manual",
  interestLevel: i.interestLevel || "warm",
  stage: i.stage || "inquiry",
  date: i.date || new Date().toISOString().split("T")[0],
  lastContactDate: i.lastContactDate || null,
  nextFollowUpDate: i.nextFollowUpDate || null,
});

export const cleanInquiryUpdate = (updates: any) => {
  const allowed = [
    "companyId",
    "customerId",
    "customerName",
    "customerPhone",
    "area",
    "productType",
    "details",
    "source",
    "interestLevel",
    "stage",
    "date",
    "lastContactDate",
    "nextFollowUpDate",
  ];
  const cleaned: Record<string, any> = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      cleaned[key] = updates[key];
    }
  }
  return cleaned;
};

export const cleanFollowUp = (f: any) => ({
  id: f.id,
  companyId: f.companyId,
  customerId: f.customerId || null,
  customerName: f.customerName || "",
  customerPhone: f.customerPhone || "",
  dueDate: f.dueDate,
  time: f.time || null,
  title: f.title || "",
  notes: f.notes || "",
  status: f.status || "pending",
  priority: f.priority || "medium",
  createdAt: f.createdAt || new Date().toISOString().split("T")[0],
});

export const cleanFollowUpUpdate = (updates: any) => {
  const allowed = [
    "companyId",
    "customerId",
    "customerName",
    "customerPhone",
    "dueDate",
    "time",
    "title",
    "notes",
    "status",
    "priority",
    "createdAt",
  ];
  const cleaned: Record<string, any> = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      cleaned[key] = updates[key];
    }
  }
  return cleaned;
};

export const cleanQuotation = (q: any) => ({
  id: q.id,
  quoteNumber: q.quoteNumber || "",
  companyId: q.companyId,
  customerId: q.customerId || null,
  customerName: q.customerName || "",
  customerPhone: q.customerPhone || "",
  area: q.area || "غير محدد",
  date: q.date || new Date().toISOString().split("T")[0],
  expiryDate: q.expiryDate || "",
  status: q.status || "draft",
  items: Array.isArray(q.items) ? q.items : [],
  subtotal: Number(q.subtotal) || 0,
  discountTotal: Number(q.discountTotal) || 0,
  totalAmount: Number(q.totalAmount) || 0,
  notes: q.notes || "",
  isSummaryQuote: Boolean(q.isSummaryQuote),
  totalMeters: Number(q.totalMeters) || 0,
  pricePerMeter: Number(q.pricePerMeter) || 0,
  summaryDescription: q.summaryDescription || "",
  profileType: q.profileType || "",
  glassType: q.glassType || "",
});

export const extractContractCollectionStatus = (c: any): string => {
  if (c.collectionStatus) return c.collectionStatus;
  if (c.notes && typeof c.notes === "string" && c.notes.includes("<!--col_status:")) {
    const match = c.notes.match(/<!--col_status:([a-z_]+)-->/);
    if (match && match[1]) return match[1];
  }
  if (["contracted", "in_progress", "delivered", "collected", "closed"].includes(c.status)) {
    return c.status;
  }
  return "contracted";
};

export const cleanContract = (c: any) => {
  const colStatus = extractContractCollectionStatus(c);
  let notesStr = typeof c.notes === "string" ? c.notes : "";
  if (notesStr.includes("<!--col_status:")) {
    notesStr = notesStr.replace(/<!--col_status:[a-z_]+-->/g, `<!--col_status:${colStatus}-->`);
  } else {
    notesStr = `${notesStr} <!--col_status:${colStatus}-->`.trim();
  }

  return {
    id: c.id,
    contractNumber: c.contractNumber || "",
    companyId: c.companyId,
    customerId: c.customerId || null,
    customerName: c.customerName || "",
    customerPhone: c.customerPhone || "",
    area: c.area || "غير محدد",
    quotationId: c.quotationId || null,
    date: c.date || new Date().toISOString().split("T")[0],
    totalValue: Number(c.totalValue) || 0,
    paidAmount: Number(c.paidAmount) || 0,
    remainingAmount: Number(c.remainingAmount) || 0,
    status: colStatus || c.status || "contracted",
    notes: notesStr,
  };
};

export const cleanSale = (s: any) => ({
  id: s.id,
  companyId: s.companyId,
  customerId: s.customerId || "",
  customerName: s.customerName || "",
  area: s.area || "غير محدد",
  contractId: s.contractId || null,
  amount: Number(s.amount) || 0,
  date: s.date || new Date().toISOString().split("T")[0],
  responsible: s.responsible || s.salesPerson || "",
  customerSource: s.customerSource || "Manual",
});

export const cleanCompany = (c: any) => ({
  id: c.id,
  name: c.name || "",
  nameEn: c.nameEn || c.name || "",
  color: c.color || "#2563eb",
  badgeBg: c.badgeBg || "#dbeafe",
  badgeText: c.badgeText || "#1e40af",
  phone: c.phone || "",
  email: c.email || null,
  monthlyTarget: typeof c.monthlyTarget === "number" ? c.monthlyTarget : Number(c.monthlyTarget) || 0,
  active: c.active !== false && c.status !== "archived" && c.status !== "closed",
  logoText: c.logoText || c.name || "",
  logoUrl: c.logoUrl || null,
});

export const cleanCompanyUpdate = (updates: any) => {
  const allowed = [
    "name",
    "nameEn",
    "color",
    "badgeBg",
    "badgeText",
    "phone",
    "email",
    "monthlyTarget",
    "active",
    "logoText",
    "logoUrl",
  ];
  const cleaned: Record<string, any> = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      cleaned[key] = updates[key];
    }
  }
  if (updates.monthlyTarget !== undefined) {
    cleaned.monthlyTarget = Number(updates.monthlyTarget) || 0;
  }
  if (updates.active !== undefined) {
    cleaned.active = updates.active !== false && updates.status !== "archived" && updates.status !== "closed";
  }
  return cleaned;
};

export const cleanPayment = (p: any) => ({
  id: p.id,
  contractId: p.contractId,
  customerId: p.customerId,
  customerName: p.customerName || "",
  companyId: p.companyId,
  amount: Number(p.amount) || 0,
  date: p.date || new Date().toISOString().split("T")[0],
  method: p.method || "cash",
  receiptNumber: p.receiptNumber || "",
  notes: p.notes || "",
});

export const cleanInspection = (ins: any) => ({
  id: ins.id,
  companyId: ins.companyId,
  customerId: ins.customerId,
  customerName: ins.customerName || "",
  customerPhone: ins.customerPhone || "",
  area: ins.area || "غير محدد",
  address: ins.address || "",
  date: ins.date || ins.scheduledDate || new Date().toISOString().split("T")[0],
  surveyor: ins.surveyor || "",
  notes: ins.notes || "",
  result: ins.result || "pending",
  measurementsCount: Number(ins.measurementsCount) || 0,
});

export const cleanInspectionUpdate = (updates: any) => {
  const allowed = [
    "companyId",
    "customerId",
    "customerName",
    "customerPhone",
    "area",
    "address",
    "date",
    "surveyor",
    "notes",
    "result",
    "measurementsCount",
  ];
  const cleaned: Record<string, any> = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      cleaned[key] = updates[key];
    }
  }
  if (updates.scheduledDate && !updates.date) {
    cleaned.date = updates.scheduledDate;
  }
  return cleaned;
};

export const cleanInteraction = (inter: any) => ({
  id: inter.id,
  customerId: inter.customerId,
  companyId: inter.companyId,
  type: inter.type || "note",
  date: inter.date || new Date().toISOString().split("T")[0],
  notes: inter.notes || "",
  result: inter.result || "",
  nextStep: inter.nextStep || null,
});
