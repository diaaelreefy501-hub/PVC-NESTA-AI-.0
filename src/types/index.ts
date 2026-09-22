export type CompanyId = string;

export type CompanyRole = 'owner' | 'admin' | 'manager' | 'sales' | 'viewer' | 'super_admin';

export type CompanyStatus = 'active' | 'archived' | 'closed';

export interface Company {
  id: CompanyId;
  name: string;
  nameEn?: string;
  color: string; // Hex or tailwind class
  secondaryColor?: string; // Hex secondary accent color
  badgeBg: string;
  badgeText: string;
  phone: string;
  email?: string;
  monthlyTarget: number; // in EGP
  annualTarget?: number; // in EGP
  active: boolean;
  status?: CompanyStatus; // 'active' | 'archived' | 'closed'
  logoText: string;
  logoUrl?: string; // High-res image logo (Base64 data URI or image URL)
  userTargets?: Record<string, number>; // userId -> target in EGP
  userRoles?: Record<string, CompanyRole>; // userId -> role in this company
  // Finance & Commissions Model
  commissionTiming?: 'contract_signing' | 'down_payment' | 'full_collection' | 'custom' | 'payment_based';
  commissionRate?: number; // e.g. 2.5%
  commissionNotes?: string;
  employeeAllocationRatio?: number; // e.g. 50% fixed allocation
  monthlyAdvertisingBudget?: number; // e.g. 25000 EGP/month
  archivedAt?: string;
  archivedBy?: string;
  // NESTA Service plan attributes
  servicePlan?: string;
  monthlyServicePrice?: number;
  serviceStartDate?: string;
  serviceStatus?: 'Active' | 'Paused' | 'Cancelled' | 'Expired';
  billingCycle?: 'Monthly' | 'Quarterly' | 'Yearly';
  serviceNotes?: string;
  address?: string;
}

export type InterestLevel = "hot" | "warm" | "cold" | "lost";

export type CustomerStage =
  | "new"
  | "qualified"
  | "active"
  | "contracted"
  | "inactive"
  | "not_interested"
  | "archived"
  | "inquiry"
  | "contacted"
  | "inspection"
  | "measurements"
  | "quotation"
  | "followup"
  | "negotiation"
  | "sold"
  | "won"
  | "lost"
  | "deferred"
  | "closed"
  | "duplicate";

export type InquiryStage =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "not_qualified"
  | "not_interested"
  | "no_response"
  | "duplicate"
  | "closed";

export type CustomerSource =
  | "WhatsApp"
  | "Facebook"
  | "Instagram"
  | "Phone Call"
  | "Phone"
  | "Website"
  | "Referral"
  | "Manual"
  | "Direct"
  | "Excel Import"
  | "AI Assistant"
  | "Other";

export interface Customer {
  importBatchId?: string;
  id: string;
  companyId: CompanyId;
  name: string;
  phone: string;
  secondaryPhone?: string;
  area: string;
  address?: string;
  source: CustomerSource;
  otherSource?: string;
  interestLevel: InterestLevel;
  stage: CustomerStage;
  lossReason?: string;
  notes?: string;
  createdAt: string;
  lastContactDate: string;
  nextFollowUpDate?: string;
  totalQuotationsValue: number;
  totalSalesValue: number;
  assignedTo?: string;
  responsible?: string;
  updatedAt?: string;
}

export interface Inquiry {
  id: string;
  createdAt?: string;
  companyId: CompanyId;
  customerId: string;
  customerName: string;
  customerPhone: string;
  area?: string;
  productType: string;
  details: string;
  source: CustomerSource;
  otherSource?: string;
  interestLevel: InterestLevel;
  stage: InquiryStage | CustomerStage;
  notes?: string;
  date: string;
  lastContactDate: string;
  nextFollowUpDate?: string;
  responsible?: string;
  updatedAt?: string;
}

export type InteractionType =
  | "call"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "inspection"
  | "measurement"
  | "quotation"
  | "quote"
  | "inquiry"
  | "status_change"
  | "meeting"
  | "note"
  | "contract"
  | "payment"
  | "sale"
  | "message";

export interface Interaction {
  id: string;
  createdAt?: string;
  customerId: string;
  companyId: CompanyId;
  type: InteractionType;
  date: string;
  notes: string;
  result: string;
  nextStep?: string;
  relatedEntityType?: "sale" | "contract" | "payment" | "quotation" | "inspection" | "followup" | "opportunity";
  relatedEntityId?: string;
  isSystemGenerated?: boolean;
  updatedAt?: string;
}

export type PriorityLevel = "urgent" | "high" | "medium" | "low";

export type FollowUpStatus = "pending" | "in_progress" | "completed" | "cancelled" | "skipped";

export interface FollowUp {
  id: string;
  companyId: CompanyId;
  customerId: string;
  customerName: string;
  customerPhone: string;
  opportunityId?: string;
  dueDate: string; // YYYY-MM-DD
  time?: string;
  dueTime?: string;
  date?: string; // Backwards compatible alias
  title: string;
  notes?: string;
  status: FollowUpStatus;
  priority: PriorityLevel;
  createdAt: string;
  responsible?: string;
  source?: string;
  updatedAt?: string;
}

export type UserRole = 'owner' | 'admin' | 'sales' | 'super_admin' | 'manager' | 'viewer';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyRoles?: Record<string, CompanyRole>; // companyId -> role in that company
  allowedCompanyIds: string[]; // ['all'] or explicit company IDs like ['comp-newhouse']
  permissions?: Partial<Record<string, boolean>>; // e.g. { data_review_approval: true }
  active: boolean;
  phone?: string;
}

export type CommissionRuleType = 'percentage_of_contract' | 'percentage_of_collection' | 'fixed_per_contract';
export type CommissionTimingType = 'contract_signing' | 'down_payment' | 'full_collection' | 'custom';

export interface EmployeeSalaryRecord {
  id: string;
  employeeId: string;
  companyId: CompanyId;
  effectiveFrom: string; // YYYY-MM
  effectiveTo?: string; // YYYY-MM (null if current)
  monthlySalary: number; // in EGP
  notes?: string;
  createdAt: string;
}

export interface CommissionAdjustment {
  id: string;
  employeeId: string;
  companyId: CompanyId;
  amount: number; // Positive for bonus, negative for deduction
  period: string; // YYYY-MM
  reason: string;
  date?: string; // YYYY-MM-DD
  type?: "adjustment" | "bonus" | "deduction";
  contractId?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

export interface CommissionRateRecord {
  id: string;
  employeeId: string;
  companyId: CompanyId;
  effectiveFrom: string; // YYYY-MM
  effectiveTo?: string; // YYYY-MM
  percentage: number;
  notes?: string;
  createdAt: string;
}

export type StatementApprovalStatus = 'calculated' | 'draft' | 'reviewed' | 'approved' | 'partially_paid' | 'paid';

export interface StatementContractDetail {
  id: string;
  contractId: string;
  contractNumber: string;
  customerName: string;
  date: string;
  totalValue: number;
  paidAmount: number;
  remainingAmount: number;
  isEligible: boolean;
  ineligibilityReason?: string;
  commissionRate: number;
  commissionBase: number;
  earnedAmount: number;
  triggerStatus: string;
}

export interface MonthlyStatement {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: CompanyId;
  period: string; // YYYY-MM
  startDate: string;
  endDate: string;
  
  // Salary
  salaryDue: number;
  salaryPaid: number;
  
  // Commission Calculation (Monthly Aggregate)
  eligibleContractsCount: number;
  eligibleContractsTotal: number;
  eligibleCollectionTotal: number; // Sum of collected amounts for eligible contracts
  commissionRateUsed: number;
  commissionEarned: number; // calculated_commission (Total * Rate)
  
  // Adjustments
  bonuses: number;
  deductions: number;
  adjustments: number; // Net adjustment amount
  
  // Totals
  totalDue: number; // Salary + Commission + Bonuses - Deductions
  totalPaid: number;
  paidCommission: number;
  paidSalary: number;
  remaining: number;
  
  // Status & Workflow
  status: StatementApprovalStatus;
  calculatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  paidBy?: string;
  recalculatedAt?: string;
  
  // Audit & Metadata
  notes?: string;
  history?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    reason: string;
    user: string;
    date: string;
  }>;
  contractDetails: StatementContractDetail[];
  updatedAt: string;
}

export interface Employee {
  id: string;
  companyId: CompanyId;
  name: string;
  role: string; // Job Title
  phone?: string;
  email?: string;
  startDate: string; // YYYY-MM-DD
  active: boolean; // Active / Inactive
  monthlySalary: number; // Current Base Monthly Salary in EGP
  salaryHistory?: EmployeeSalaryRecord[]; // Historical salaries with effective dates
  commissionRule: CommissionRuleType;
  commissionPercentage: number; // e.g. 2.0%
  commissionHistory?: CommissionRateRecord[]; // Historical commission rates
  commissionTiming: CommissionTimingType;
  commissionNotes?: string;
  commissionAdjustments?: CommissionAdjustment[];
  monthlyStatements?: MonthlyStatement[];
  createdAt: string;
  updatedAt?: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: CompanyId;
  period: string; // YYYY-MM
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  status: 'paid' | 'pending' | 'cancelled';
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface CommissionPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: CompanyId;
  contractId?: string;
  contractNumber?: string;
  opportunityId?: string;
  customerName?: string;
  period: string; // YYYY-MM
  contractValue?: number;
  commissionRate?: number;
  calculatedEarnedAmount: number; // Total commission earned from this deal
  amount: number; // Amount paid in this transaction
  paymentDate: string; // YYYY-MM-DD
  status: 'paid' | 'pending' | 'cancelled';
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface AdvertisingBudget {
  id: string;
  companyId: CompanyId;
  period: string; // YYYY-MM
  budgetAmount: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdSpend {
  id: string;
  companyId: CompanyId;
  date: string; // YYYY-MM-DD
  amount: number;
  channel: string;
  campaign?: string;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export type OwnerRuleType = 'fixed_monthly' | 'percentage_of_revenue' | 'profit_share' | 'manual_due';

export interface OwnerFinancialRule {
  id: string;
  companyId: CompanyId;
  ruleType: OwnerRuleType;
  value: number;
  effectiveFrom: string; // YYYY-MM
  effectiveTo?: string;
  active: boolean;
  notes?: string;
  createdAt?: string;
}

export interface OwnerPayment {
  id: string;
  companyId: CompanyId;
  period: string; // YYYY-MM
  dueAmount: number;
  paidAmount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod?: string;
  status: 'paid' | 'pending' | 'cancelled';
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export type PermissionName =
  | "view_customers"
  | "manage_customers"
  | "view_inquiries"
  | "manage_opportunities"
  | "manage_followups"
  | "manage_quotations"
  | "close_opportunities"
  | "manage_sales"
  | "view_analytics"
  | "manage_targets"
  | "manage_company_users"
  | "manage_company_settings"
  | "delete_records"
  | "approve_records"
  | "data_review_approval"
  | "manage_finance"
  | "manage_settings";

export type CustomerScope = "specific" | "all";
export type OpportunityStage =
  | "inquiry"
  | "followup"
  | "qualified"
  | "needs_inspection"
  | "inspection_completed"
  | "needs_quote"
  | "quote_sent"
  | "negotiation"
  | "ready_to_contract"
  | "won"
  | "lost"
  | "quotation"; // for backwards compatibility
export type OpportunityStatus = "open" | "won" | "lost";

export interface Opportunity {
  importBatchId?: string;
  id: string;
  companyId: CompanyId;
  title: string;
  customerScope: CustomerScope;
  customerId?: string | null;
  inquiryId?: string;
  customerName?: string;
  customerPhone?: string;
  area?: string;
  productType?: string;
  expectedValue: number;
  stage: OpportunityStage;
  status: OpportunityStatus;
  lossReason?: string;
  lossNotes?: string;
  source?: CustomerSource;
  otherSource?: string;
  createdAt: string;
  closedAt?: string;
  notes?: string;
  saleId?: string;
  // Sales Operations Fields
  assignedTo?: string;
  temperature?: InterestLevel;
  nextAction?: string;
  lastContactDate?: string;
  lastActivity?: string;
  nextFollowUpDate?: string;
  quotationId?: string;
  quotationValue?: number;
  quoteNumber?: string;
  quoteDate?: string;
  hasInspection?: boolean;
  hasQuote?: boolean;
  isQuoteSent?: boolean;
  hasContract?: boolean;
  contractId?: string;
  contractNumber?: string;
  updatedAt?: string;
  recordStatus?: 'active' | 'duplicate' | 'excluded' | 'approved' | 'pending' | 'unlinked' | 'review_required';
  excludedAt?: string;
  excludedBy?: string;
  exclusionReason?: string;
  duplicateOf?: string;
  verificationStatus?: string;
}

export interface ImportColumnMapping {
  nameCol: string;
  phoneCol: string;
  areaCol: string;
  companyCol: string;
  productCol: string;
  statusCol: string;
  contractDateCol: string;
  contractAmountCol: string;
  sourceCol?: string;
  notesCol?: string;
}

export interface QuotationItem {
  id: string;
  description: string;
  width?: number;
  height?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  systemType?: string;
  glassType?: string;
  profileType?: string;
  // Keep optional old fields for compatibility during transition
  product?: string;
  type?: "window" | "door" | "shutter" | "other";
  area?: number;
  discount?: number;
  total?: number;
}

export type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "revised"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled"
  | "negotiation"
  | "contracted";

export interface Quotation {
  importBatchId?: string;
  id: string;
  createdAt?: string;
  quoteNumber: string;
  companyId: CompanyId;
  customerId: string;
  customerName: string;
  customerPhone: string;
  area?: string;
  opportunityId?: string;
  date: string;
  expiryDate: string;
  status: QuoteStatus;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  discount?: number; // alias for discountTotal
  totalAmount: number;
  notes?: string;
  // Summary Quotation fields (أمتار وقيمة ملخصة دون إدخال كل مقايسة بالكامل)
  isSummaryQuote?: boolean;
  totalMeters?: number; // إجمالي عدد الأمتار المسطحة (م٢)
  pricePerMeter?: number; // متوسط سعر المتر (ج.م/م٢)
  summaryDescription?: string; // بيان الأعمال والملخص
  profileType?: string; // نوع القطاع
  glassType?: string; // نوع وتوصيف الزجاج
  responsible?: string;
  createdByName?: string;
  updatedAt?: string;
}

export type InspectionStatus =
  | "requested"
  | "scheduled"
  | "confirmed"
  | "completed"
  | "no_show"
  | "rescheduled"
  | "cancelled"
  | "needs_revisit"
  | "invalid"
  | "pending"; // backwards compatibility

export interface Inspection {
  id: string;
  createdAt?: string;
  companyId: CompanyId;
  customerId: string;
  customerName: string;
  customerPhone: string;
  area?: string;
  address: string;
  date: string;
  time?: string;
  surveyor: string;
  notes: string;
  result: InspectionStatus;
  status?: InspectionStatus;
  scheduledDate?: string;
  measurementsCount: number;
  updatedAt?: string;
}

export type ContractStatus =
  | "draft"
  | "pending_signature"
  | "active"
  | "completed"
  | "cancelled"
  | "suspended"
  | "signed"
  | "in_production"
  | "installed";
export type CollectionStatus =
  | "scheduled"
  | "due"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled"
  | "contracted"
  | "in_progress"
  | "delivered"
  | "collected"
  | "closed"
  | "completed"
  | "partial";

export interface Contract {
  importBatchId?: string;
  id: string;
  createdAt?: string;
  contractNumber: string;
  companyId: CompanyId;
  customerId: string;
  customerName: string;
  customerPhone: string;
  area?: string;
  quotationId?: string;
  opportunityId?: string;
  date: string; // Event Date of contract
  signDate?: string;
  deliveryDate?: string;
  expectedDeliveryDate?: string;
  totalValue: number;
  paidAmount: number;
  downPayment?: number;
  remainingAmount: number;
  status: ContractStatus;
  collectionStatus?: CollectionStatus;
  notes?: string;
  salesPerson?: string;
  responsible?: string;
  updatedAt?: string;
  recordStatus?: 'active' | 'duplicate' | 'excluded' | 'approved' | 'pending' | 'unlinked' | 'review_required';
  excludedAt?: string;
  excludedBy?: string;
  exclusionReason?: string;
  duplicateOf?: string;
  verificationStatus?: string;
}

export type NotificationType =
  | "overdue_followup"
  | "today_followup"
  | "today_inspection"
  | "quote_followup"
  | "negotiation_followup"
  | "missing_next_action"
  | "contract_signed"
  | "payment_due";

export interface AppNotification {
  id: string;
  companyId: CompanyId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: "customer" | "opportunity" | "quotation" | "contract" | "followup" | "inspection" | "payment";
  relatedEntityId: string;
  customerId?: string;
  createdAt: string;
  readAt?: string | null;
  priority: "high" | "medium" | "low";
  severity?: "high" | "medium" | "low";
}

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "instapay"
  | "instaPay"
  | "check"
  | "cheque"
  | "visa"
  | "vodafone_cash";

export type PaymentStatus = "recorded" | "confirmed" | "reversed" | "refunded";

export interface Payment {
  id: string;
  createdAt?: string; // Recorded At timestamp
  contractId: string;
  customerId: string;
  customerName: string;
  companyId: CompanyId;
  amount: number;
  date: string; // Event Date of collection/payment (transaction date)
  method: PaymentMethod;
  status?: PaymentStatus;
  receiptNumber?: string;
  notes?: string;
  updatedAt?: string;
  recordStatus?: "active" | "duplicate" | "excluded";
}

export interface Sale {
  importBatchId?: string;
  id: string;
  createdAt?: string;
  companyId: CompanyId;
  customerId?: string;
  customerName: string;
  area?: string;
  contractId?: string;
  contractNumber?: string;
  amount: number;
  date: string; // Event Date of sale
  responsible: string;
  customerSource?: CustomerSource;
  notes?: string;
  salesPerson?: string;
  updatedAt?: string;
  recordStatus?: 'active' | 'duplicate' | 'excluded' | 'approved' | 'pending' | 'unlinked' | 'review_required';
  excludedAt?: string;
  excludedBy?: string;
  exclusionReason?: string;
  duplicateOf?: string;
  verificationStatus?: string;
}

export interface DataReviewItem {
  id: string;
  entityType: 'sale' | 'contract' | 'opportunity' | 'customer' | 'quotation';
  entityId: string;
  issueType: 'SALE_WITHOUT_CONTRACT' | 'CONTRACT_WITHOUT_SALE' | 'DUPLICATE_CONTRACT' | 'AMOUNT_MISMATCH' | 'CUSTOMER_LINK_MISMATCH' | 'OPPORTUNITY_WITHOUT_CONTRACT' | 'DUPLICATE_RECORD' | 'CONFLICT';
  status: 'pending' | 'resolved' | 'excluded' | 'approved';
  title: string;
  description: string;
  companyId: string;
  createdAt: string;
  metadata?: any;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  companyId: CompanyId;
  action?: string;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  customerId?: string;
  customerName?: string;
  description: string;
  oldValue?: any;
  previousValue?: any;
  newValue?: any;
  status?: string;
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  importedAt: string; // ISO date-time
  totalRows: number;
  importedCustomers: number;
  updatedCustomers: number;
  skippedRows: number;
  createdContracts: number;
  totalImportedSalesAmount: number;
  status: "success" | "partial" | "failed";
  notes?: string;
  customerIds?: string[];
  contractIds?: string[];
  quotationIds?: string[];
  opportunityIds?: string[];
  saleIds?: string[];
}

export interface Product {
  id: string;
  companyId: CompanyId;
  company_id?: CompanyId; // alias for Sheets / sync compatibility
  name: string;
  category: string;
  type: string;
  specifications: string;
  unit: string;
  price: number;
  cost?: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export type DateFilterOption = "all" | "today" | "week" | "month" | "last_month" | "custom";

export interface GlobalFilterState {
  companyIds: string[]; // empty array or ['all'] means all companies, or explicit IDs like ['comp-newhouse']
  productIds: string[]; // empty array or ['all'] means all products, or explicit IDs
  dateRange: DateFilterOption;
  customStartDate?: string;
  customEndDate?: string;
}

export interface TaskItem {
  id: string;
  companyId: CompanyId;
  title: string;
  type: "followup" | "inspection" | "quote_review" | "contract_delivery" | "payment_collection" | "general";
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  dueDate: string;
  dueTime?: string;
  priority: PriorityLevel;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  responsible?: string;
  notes?: string;
  relatedEntityType?: "customer" | "opportunity" | "quotation" | "contract" | "payment" | "inspection" | "followup";
  relatedEntityId?: string;
  createdAt: string;
  updatedAt: string;
}

export type NavigationTab =
  | "dashboard"
  | "today"
  | "inquiries"
  | "followups"
  | "tasks"
  | "customers"
  | "opportunities"
  | "quotations"
  | "contracts"
  | "collections"
  | "finance"
  | "reports"
  | "products"
  | "analytics"
  | "performance"
  | "import"
  | "settings"
  | "inspections"
  | "sales"
  | "companies"
  | "intake"
  | "review";

export interface NavigationFilterContext {
  companyId?: string;
  stage?: string;
  status?: string;
  area?: string;
  source?: string;
  responsible?: string;
  interestLevel?: string;
  priority?: string;
  date?: string;
  dateRange?: string;
  month?: string;
  searchQuery?: string;
  followUpStatus?: "all" | "today" | "upcoming" | "overdue" | "completed";
  lossReason?: string;
}
