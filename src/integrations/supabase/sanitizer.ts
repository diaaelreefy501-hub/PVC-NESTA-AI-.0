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
  status: c.status || (c.active === false ? "inactive" : "active"),
  archivedAt: c.archivedAt || null,
  archivedBy: c.archivedBy || null,
  servicePlan: c.servicePlan || null,
  monthlyServicePrice: c.monthlyServicePrice !== undefined ? Number(c.monthlyServicePrice) : null,
  serviceStartDate: c.serviceStartDate || null,
  serviceStatus: c.serviceStatus || null,
  billingCycle: c.billingCycle || null,
  serviceNotes: c.serviceNotes || null,
  address: c.address || null,
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
    "status",
    "archivedAt",
    "archivedBy",
    "servicePlan",
    "monthlyServicePrice",
    "serviceStartDate",
    "serviceStatus",
    "billingCycle",
    "serviceNotes",
    "address",
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

export const cleanOpportunity = (o: any) => ({
  id: o.id,
  companyId: o.companyId,
  customerId: o.customerId || null,
  inquiryId: o.inquiryId || null,
  title: o.title || "فرصة جديدة",
  stage: o.stage || "inquiry",
  status: o.status || "active",
  lossReason: o.lossReason || null,
  lossNotes: o.lossNotes || null,
  expectedValue: Number(o.expectedValue) || 0,
  productType: o.productType || "",
  area: o.area || "",
  source: o.source || "",
  assignedTo: o.assignedTo || null,
  quotationId: o.quotationId || null,
  contractId: o.contractId || null,
  lastContactDate: o.lastContactDate || null,
  nextFollowUpDate: o.nextFollowUpDate || null,
  notes: o.notes || "",
  createdAt: o.createdAt || new Date().toISOString().split("T")[0],
  updatedAt: o.updatedAt || null,
  closedAt: o.closedAt || null,
});

export const cleanEmployee = (e: any) => ({
  id: e.id,
  companyId: e.companyId,
  name: e.name || "",
  role: e.role || "موظف",
  phone: e.phone || null,
  email: e.email || null,
  startDate: e.startDate || new Date().toISOString().split("T")[0],
  active: e.active !== false,
  monthlySalary: Number(e.monthlySalary) || 0,
  commissionRule: e.commissionRule || "percentage_of_contract",
  commissionPercentage: Number(e.commissionPercentage) || 0,
  commissionTiming: e.commissionTiming || "contract_signing",
  commissionNotes: e.commissionNotes || null,
  commissionHistory: Array.isArray(e.commissionHistory) ? e.commissionHistory : [],
  salaryHistory: Array.isArray(e.salaryHistory) ? e.salaryHistory : [],
  createdAt: e.createdAt || new Date().toISOString().split("T")[0],
  updatedAt: e.updatedAt || null,
});

export const cleanEmployeeUpdate = (updates: any) => {
  const allowed = [
    "name",
    "role",
    "phone",
    "email",
    "startDate",
    "active",
    "monthlySalary",
    "commissionRule",
    "commissionPercentage",
    "commissionTiming",
    "commissionNotes",
    "commissionHistory",
    "salaryHistory",
    "updatedAt",
  ];
  const cleaned: Record<string, any> = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      cleaned[key] = updates[key];
    }
  }
  if (updates.monthlySalary !== undefined) {
    cleaned.monthlySalary = Number(updates.monthlySalary) || 0;
  }
  if (updates.commissionPercentage !== undefined) {
    cleaned.commissionPercentage = Number(updates.commissionPercentage) || 0;
  }
  if (updates.active !== undefined) {
    cleaned.active = Boolean(updates.active);
  }
  return cleaned;
};

export const cleanSalaryPayment = (sp: any) => ({
  id: sp.id,
  companyId: sp.companyId,
  employeeId: sp.employeeId,
  employeeName: sp.employeeName || "",
  period: sp.period,
  amount: Number(sp.amount) || 0,
  paymentDate: sp.paymentDate || new Date().toISOString().split("T")[0],
  paymentMethod: sp.paymentMethod || "cash",
  receiptNumber: sp.receiptNumber || null,
  status: sp.status || "paid",
  notes: sp.notes || null,
  createdAt: sp.createdAt || new Date().toISOString(),
  createdBy: sp.createdBy || null,
});

export const cleanCommissionPayment = (cp: any) => ({
  id: cp.id,
  companyId: cp.companyId,
  employeeId: cp.employeeId,
  employeeName: cp.employeeName || "",
  contractId: cp.contractId || null,
  contractNumber: cp.contractNumber || null,
  opportunityId: cp.opportunityId || null,
  customerName: cp.customerName || null,
  period: cp.period,
  contractValue: cp.contractValue ? Number(cp.contractValue) : null,
  commissionRate: cp.commissionRate ? Number(cp.commissionRate) : null,
  calculatedEarnedAmount: Number(cp.calculatedEarnedAmount) || 0,
  amount: Number(cp.amount) || 0,
  paymentDate: cp.paymentDate || new Date().toISOString().split("T")[0],
  status: cp.status || "paid",
  paymentMethod: cp.paymentMethod || "bank_transfer",
  receiptNumber: cp.receiptNumber || null,
  notes: cp.notes || null,
  createdAt: cp.createdAt || new Date().toISOString(),
  createdBy: cp.createdBy || null,
});

export const cleanAdvertisingBudget = (ab: any) => ({
  id: ab.id,
  companyId: ab.companyId,
  period: ab.period,
  budgetAmount: Number(ab.budgetAmount) || 0,
  notes: ab.notes || null,
  createdAt: ab.createdAt || new Date().toISOString(),
  updatedAt: ab.updatedAt || null,
});

export const cleanAdSpend = (as: any) => ({
  id: as.id,
  companyId: as.companyId,
  date: as.date || new Date().toISOString().split("T")[0],
  amount: Number(as.amount) || 0,
  channel: as.channel || "Facebook",
  campaign: as.campaign || null,
  notes: as.notes || null,
  createdAt: as.createdAt || new Date().toISOString(),
  createdBy: as.createdBy || null,
});

export const cleanOwnerFinancialRule = (ofr: any) => ({
  id: ofr.id,
  companyId: ofr.companyId,
  ruleType: ofr.ruleType || "fixed_monthly",
  value: Number(ofr.value) || 0,
  effectiveFrom: ofr.effectiveFrom,
  effectiveTo: ofr.effectiveTo || null,
  active: ofr.active !== false,
  notes: ofr.notes || null,
  createdAt: ofr.createdAt || new Date().toISOString(),
});

export const cleanOwnerPayment = (op: any) => ({
  id: op.id,
  companyId: op.companyId,
  period: op.period,
  dueAmount: Number(op.dueAmount) || 0,
  paidAmount: Number(op.paidAmount) || 0,
  paymentDate: op.paymentDate || new Date().toISOString().split("T")[0],
  paymentMethod: op.paymentMethod || "bank_transfer",
  status: op.status || "paid",
  notes: op.notes || null,
  createdAt: op.createdAt || new Date().toISOString(),
  createdBy: op.createdBy || null,
});

export const cleanCommissionAdjustment = (data: any) => ({
  id: data.id,
  companyId: data.companyId || "all",
  employeeId: data.employeeId,
  period: data.period,
  amount: Number(data.amount) || 0,
  reason: data.reason || "",
  createdAt: data.createdAt || new Date().toISOString(),
});

export const cleanAuditLog = (data: any) => ({
  id: data.id,
  timestamp: data.timestamp || new Date().toISOString(),
  userId: data.userId || "",
  userName: data.userName || "",
  userRole: data.userRole || "",
  actionType: data.actionType || "",
  entityType: data.entityType || "",
  entityId: data.entityId || "",
  companyId: data.companyId || "all",
  description: data.description || "",
  previousValue: data.previousValue || null,
  newValue: data.newValue || null,
  status: data.status || "success",
});

export const cleanMonthlyStatement = (data: any) => ({
  id: data.id,
  employeeId: data.employeeId,
  employeeName: data.employeeName || "",
  companyId: data.companyId,
  period: data.period,
  startDate: data.startDate || "",
  endDate: data.endDate || "",
  salaryDue: Number(data.salaryDue) || 0,
  salaryPaid: Number(data.salaryPaid) || 0,
  eligibleContractsCount: Number(data.eligibleContractsCount) || 0,
  eligibleContractsTotal: Number(data.eligibleContractsTotal) || 0,
  commissionRateUsed: Number(data.commissionRateUsed) || 0,
  commissionEarned: Number(data.commissionEarned) || 0,
  bonuses: Number(data.bonuses) || 0,
  deductions: Number(data.deductions) || 0,
  adjustments: Number(data.adjustments) || 0,
  totalDue: Number(data.totalDue) || 0,
  totalPaid: Number(data.totalPaid) || 0,
  paidCommission: Number(data.paidCommission) || 0,
  paidSalary: Number(data.paidSalary) || 0,
  remaining: Number(data.remaining) || 0,
  status: data.status || "calculated",
  calculatedAt: data.calculatedAt || new Date().toISOString(),
  reviewedAt: data.reviewedAt || null,
  reviewedBy: data.reviewedBy || null,
  approvedAt: data.approvedAt || null,
  approvedBy: data.approvedBy || null,
  paidAt: data.paidAt || null,
  paidBy: data.paidBy || null,
  recalculatedAt: data.recalculatedAt || null,
  notes: data.notes || "",
  contractDetails: Array.isArray(data.contractDetails) ? data.contractDetails : [],
  updatedAt: data.updatedAt || new Date().toISOString(),
});


