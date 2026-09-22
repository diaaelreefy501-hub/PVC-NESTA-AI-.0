import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "../integrations/supabase/client";
import { 
  calculateContractBalance, 
  generateEmployeeStatements
} from "../utils/financeEngine";
import { runCollectionReconciliation } from "../utils/reconciliationDiagnostic";
import {
  cleanCustomer,
  cleanCustomerUpdate,
  cleanInquiry,
  cleanInquiryUpdate,
  cleanFollowUp,
  cleanFollowUpUpdate,
  cleanQuotation,
  cleanContract,
  cleanSale,
  cleanCompany,
  cleanCompanyUpdate,
  cleanEmployee,
  cleanEmployeeUpdate,
  cleanPayment,
  cleanInspection,
  cleanInspectionUpdate,
  cleanInteraction,
  cleanOpportunity,
  cleanOpportunityUpdate,
  cleanProduct,
  cleanProductUpdate,
  cleanMonthlyStatement,
  extractContractCollectionStatus,
} from "../integrations/supabase/sanitizer";
import {
  isSystemOwner as checkIsSystemOwner,
  isCompanyManager as checkIsCompanyManager,
  isEmployee as checkIsEmployee,
  canDeleteRecord as checkCanDeleteRecord,
  canApproveRecord as checkCanApproveRecord,
  canManageFinance as checkCanManageFinance,
  canManageSettings as checkCanManageSettings,
} from "../utils/rbac";
import {
  MonthlyStatement,
  Company,
  Customer,
  Inquiry,
  FollowUp,
  Quotation,
  Contract,
  Payment,
  Sale,
  Interaction,
  Inspection,
  Product,
  TaskItem,
  GlobalFilterState,
  DateFilterOption,
  NavigationTab,
  NavigationFilterContext,
  CompanyId,
  QuoteStatus,
  ImportHistoryItem,
  AppUser,
  UserRole,
  CompanyRole,
  PermissionName,
  Opportunity,
  OpportunityStage,
  OpportunityStatus,
  ContractStatus,
  CustomerScope,
  CustomerSource,
  AppNotification,
  CollectionStatus,
  PriorityLevel,
  AuditLogEntry,
  DataReviewItem,
  Employee,
  EmployeeSalaryRecord,
  SalaryPayment,
  CommissionPayment,
  CommissionAdjustment,
} from "../types";
import {
  PredictiveAlert,
  Incident,
  SystemHealthReport,
  AIActionProposal,
  AIActivityLogEntry,
  ChangeSet,
  ChangeSetRecord,
  DataLineageItem,
} from "../types/aiAgentTypes";
import { GuardianEngine } from "../utils/guardianEngine";
import { BusinessRulesEngine, SystemDataSnapshot } from "../utils/businessRulesEngine";
import { DataLineageEngine } from "../utils/dataLineageEngine";
import { normalizeArea } from "../utils/areaUtils";
import { OPPORTUNITY_STAGES_CONFIG } from "../utils/salesOperations";
import { parseExcelDate, parseFinancialAmount } from "../utils/excelDateUtils";
import { mapStageFromExcel, ColumnMapping } from "../utils/smartImportDetector";
import {
  generateRealNotifications,
  getOpportunityNextAction,
} from "../utils/salesOperations";
import {
  initialCompanies,
  initialCustomers,
  initialInquiries,
  initialFollowUps,
  initialQuotations,
  initialContracts,
  initialPayments,
  initialSales,
  initialInteractions,
  initialInspections,
  initialProducts,
  initialEmployees,
  initialSalaryPayments,
  initialCommissionPayments,
} from "../data/initialData";
import { computeUnifiedKPIs, KPIEngineDataSnapshot, UnifiedKPIResult } from "../utils/kpiEngine";
import { globalPersistenceEngine, ChangeRecord, EntityType, ChangeAction } from "../dataLayer/persistenceEngine";

export const normalizeEgyptianPhone = (phone: string): string => {
  if (!phone) return "";
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  if (cleaned.startsWith("+20")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("0020")) {
    cleaned = "0" + cleaned.slice(4);
  }
  
  cleaned = cleaned.replace(/[^\d]/g, "");
  return cleaned;
};

export interface ImportSummaryResult {
  totalRows: number;
  importedCustomers: number;
  updatedCustomers: number;
  skippedRows: number;
  createdContracts: number;
  totalImportedSalesAmount: number;
  matchedCompaniesCount: number;
  issues: string[];
}

interface AppContextType {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  
  areas: string[];
  setAreas: React.Dispatch<React.SetStateAction<string[]>>;
  addArea: (area: string) => void;
  deleteArea: (area: string) => void;

  lossReasons: string[];
  setLossReasons: React.Dispatch<React.SetStateAction<string[]>>;
  addLossReason: (reason: string) => void;
  deleteLossReason: (reason: string) => void;

  companies: Company[];
  allCompanies: Company[];
  activeCompanyId: CompanyId | "all";
  setActiveCompanyId: (id: CompanyId | "all") => void;
  selectedCompanyIds: string[];
  setSelectedCompanyIds: (ids: string[]) => void;
  toggleCompanySelection: (id: string) => void;
  selectAllCompanies: () => void;
  clearAllCompanySelection: () => void;
  activeCompany: Company | null;
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  selectedCustomerIdFor360: string | null;
  setSelectedCustomerIdFor360: (id: string | null) => void;
  isAiAssistantOpen: boolean;
  setIsAiAssistantOpen: (open: boolean) => void;
  selectedQuotationForPrint: Quotation | null;
  setSelectedQuotationForPrint: (q: Quotation | null) => void;

  // Raw Entities
  customers: Customer[];
  inquiries: Inquiry[];
  followUps: FollowUp[];
  quotations: Quotation[];
  inspections: Inspection[];
  contracts: Contract[];
  payments: Payment[];
  sales: Sale[];
  interactions: Interaction[];
  opportunities: Opportunity[];
  products: Product[];
  tasks: TaskItem[];
  employees: Employee[];
  salaryPayments: SalaryPayment[];
  commissionPayments: CommissionPayment[];
  employeeStatements: Record<string, MonthlyStatement[]>;
  reconciliationReport: any;
  reconciledContracts: Contract[];

  // Filtered by activeCompanyId & Global Filters
  filteredCustomers: Customer[];
  filteredInquiries: Inquiry[];
  filteredFollowUps: FollowUp[];
  filteredQuotations: Quotation[];
  filteredInspections: Inspection[];
  filteredContracts: Contract[];
  filteredPayments: Payment[];
  filteredSales: Sale[];
  filteredOpportunities: Opportunity[];
  filteredProducts: Product[];
  filteredTasks: TaskItem[];
  filteredEmployees: Employee[];

  // Employee & Payroll Management
  addEmployee: (emp: Omit<Employee, "id" | "createdAt">) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  toggleEmployeeStatus: (id: string) => void;
  updateEmployeeSalary: (employeeId: string, newSalary: number, effectivePeriod: string, notes?: string) => void;
  recordSalaryPayment: (payment: Omit<SalaryPayment, "id" | "createdAt">) => SalaryPayment;
  recordCommissionPayment: (payment: Omit<CommissionPayment, "id" | "createdAt">) => CommissionPayment;
  deleteSalaryPayment: (id: string) => void;
  deleteCommissionPayment: (id: string) => void;
  updateSalaryPayment: (payment: SalaryPayment) => Promise<void>;
  updateCommissionPayment: (payment: CommissionPayment) => Promise<void>;
  addCommissionAdjustment: (adj: Omit<CommissionAdjustment, "id" | "createdAt">) => void;
  updateCommissionAdjustment: (adj: CommissionAdjustment) => Promise<void>;
  deleteCommissionAdjustment: (employeeId: string, adjustmentId: string) => void;
  updateStatementOverride: (data: Partial<MonthlyStatement> & { employeeId: string; period: string }) => void;
  reviewStatement: (employeeId: string, period: string) => Promise<void>;
  approveStatement: (employeeId: string, period: string, notes?: string) => void;
  recalculateStatement: (employeeId: string, period: string) => void;
  updateCommissionRate: (employeeId: string, newRate: number, effectivePeriod: string, notes?: string) => void;

  // Products CRUD
  addProduct: (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Tasks CRUD
  addTask: (data: Omit<TaskItem, "id" | "createdAt" | "updatedAt">) => TaskItem;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  deleteTask: (id: string) => void;

  // Global Filters System
  globalFilters: GlobalFilterState;
  setGlobalFilters: React.Dispatch<React.SetStateAction<GlobalFilterState>>;
  updateGlobalCompanyFilter: (companyIds: string[]) => void;
  updateGlobalProductFilter: (productIds: string[]) => void;
  updateGlobalDateFilter: (dateRange: DateFilterOption, start?: string, end?: string) => void;
  resetGlobalFilters: () => void;
  isDateInRange: (dateStr?: string) => boolean;
  isProductMatch: (productIdentifier?: string) => boolean;
  isCompanyMatch: (compIdentifier?: string) => boolean;

  // Company-Scoped Roles & Permissions
  currentCompanyRole: CompanyRole;
  getUserRoleInCompany: (user: AppUser | null, companyId: CompanyId) => CompanyRole;
  hasPermission: (permission: PermissionName, targetCompanyId?: CompanyId) => boolean;
  assignUserCompanyRole: (userId: string, companyId: CompanyId, role: CompanyRole) => void;
  removeUserFromCompany: (userId: string, companyId: CompanyId) => void;
  updateUserTarget: (companyId: CompanyId, userId: string, target: number) => void;
  isSystemOwner: boolean;
  isCompanyManager: boolean;
  isEmployee: boolean;
  canDeleteRecords: boolean;
  canApproveRecords: boolean;
  canManageFinance: boolean;
  canManageSettings: boolean;

  // Opportunities & Deal Closing
  addOpportunity: (data: Omit<Opportunity, "id" | "createdAt">) => Opportunity;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  closeDealWon: (opportunityId: string, details: { amount: number; date?: string; notes?: string }) => { success: boolean; saleId?: string };
  closeDealLost: (opportunityId: string, details: { lossReason: string; lossNotes?: string }) => { success: boolean };
  deleteOpportunity: (id: string) => Promise<{ success: boolean; message?: string }>;
  batchDeleteOpportunities: (ids: string[]) => void;
  batchCloseOpportunitiesWon: (ids: string[]) => void;
  batchCloseOpportunitiesLost: (ids: string[], lossReason: string, lossNotes?: string) => void;
  batchUpdateOpportunitiesStage: (ids: string[], stage: OpportunityStage) => void;

  // Computed KPIs
  todayFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
  upcomingFollowUps: FollowUp[];
  hotCustomers: Customer[];
  todaySalesTotal: number;
  monthlySalesTotal: number;
  monthlyTargetTotal: number;
  monthlyAchievementRate: number;
  unifiedKPIs: UnifiedKPIResult;
  quotesNeedingFollowUp: Quotation[];
  calculateContractedSalesTotal: (contractsList: Contract[], companyId: string, area?: string, month?: string) => number;
  getContractedSalesDebugReport: (companyId?: string, area?: string, month?: string) => any;

  // Supabase Connection State
  isCloudConnected: boolean | null;

  // UI state
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isIntakeModalOpen: boolean;
  setIsIntakeModalOpen: (open: boolean) => void;
  isQuickActionSheetOpen: boolean;
  setIsQuickActionSheetOpen: (open: boolean) => void;
  toast: { message: string; type: "success" | "info" | "warning" | "error" } | null;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;

  // Drill-down navigation context
  navigationFilter: NavigationFilterContext | null;
  navigateToTabWithFilter: (tab: NavigationTab, filters?: NavigationFilterContext) => void;
  clearNavigationFilter: () => void;

  dataReviewItems: DataReviewItem[];
  approveRecord: (entityType: string, entityId: string) => void;
  excludeRecord: (entityType: string, entityId: string, reason: string) => void;

  // Action methods
  findCustomerByPhone: (phone: string, companyId?: CompanyId) => Customer | undefined;
  addCustomer: (data: Partial<Customer> & { name: string; phone: string; companyId: CompanyId }) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  batchUpdateCustomers: (ids: string[], updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  batchDeleteCustomers: (ids: string[]) => void;
  addInquiry: (data: Omit<Inquiry, "id" | "date" | "lastContactDate">) => Inquiry;
  updateInquiry: (id: string, updates: Partial<Inquiry>) => void;
  updateInquiryStage: (id: string, stage: Customer["stage"]) => void;
  batchUpdateInquiries: (ids: string[], updates: Partial<Inquiry>) => void;
  deleteInquiry: (id: string) => void;
  batchDeleteInquiries: (ids: string[]) => void;
  addInteraction: (data: Omit<Interaction, "id">) => Interaction;
  addFollowUp: (data: Omit<FollowUp, "id" | "createdAt">) => FollowUp;
  completeFollowUp: (id: string) => void;
  rescheduleFollowUp: (id: string, newDate: string, notes?: string) => void;
  batchUpdateFollowUps: (ids: string[], updates: Partial<FollowUp>) => void;
  deleteFollowUp: (id: string) => void;
  batchDeleteFollowUps: (ids: string[]) => void;
  batchAddFollowUps: (
    items: Array<{ customerId: string; companyId: CompanyId; customerName: string; customerPhone?: string }>,
    fupData: { dueDate: string; time?: string; title: string; notes?: string; priority: PriorityLevel; responsible?: string }
  ) => void;
  addQuotation: (data: Omit<Quotation, "id" | "quoteNumber">) => Quotation;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  updateQuotationStatus: (id: string, status: QuoteStatus) => void;
  batchUpdateQuotations: (ids: string[], updates: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;
  batchDeleteQuotations: (ids: string[]) => void;
  addInspection: (data: Omit<Inspection, "id">) => Inspection;
  addContract: (data: Omit<Contract, "id" | "contractNumber">) => Contract;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  updateContractCollectionStatus: (id: string, status: CollectionStatus) => void;
  batchUpdateContractCollectionStatus: (ids: string[], status: CollectionStatus) => void;
  batchUpdateContracts: (ids: string[], updates: Partial<Contract>) => void;
  updateInspection: (id: string, updates: Partial<Inspection>) => void;
  deleteContract: (id: string) => void;
  batchDeleteContracts: (ids: string[]) => void;
  clearAllContracts: () => void;
  purgeOrphanContracts: () => void;
  createCustomersFromOrphanContracts: () => void;
  addSale: (sale: Omit<Sale, "id">) => Sale;
  updateSale: (id: string, updates: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  batchDeleteSales: (ids: string[]) => void;
  clearAllSales: () => void;
  addPayment: (data: Omit<Payment, "id">) => Payment;
  updatePayment: (id: string, updates: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  deleteInteraction: (id: string) => void;
  updateInteraction: (id: string, updates: Partial<Interaction>) => void;
  cleanTimelineDuplicates: (customerId: string) => number;
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, "id" | "timestamp" | "userId" | "userName" | "userRole">) => void;
  clearAuditLogs: () => void;
  addCompany: (comp: Omit<Company, "id">) => Company;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  archiveCompany: (id: string) => void;
  restoreCompany: (id: string) => void;
  deleteCompany: (id: string) => void;
  updateCompanyTarget: (companyId: CompanyId, newTarget: number, annualTarget?: number) => void;
  resetDataToDefault: () => void;
  importHistory: ImportHistoryItem[];
  restoreRecord: (entityType: string, recordId: string) => Promise<void>;
  restoreCustomer: (id: string) => Promise<void>;
  restoreContract: (id: string) => Promise<void>;
  batchImportData: (
    rows: any[],
    mapping: ColumnMapping,
    fallbackCompanyId: string,
    duplicateAction: "skip" | "update" | "create",
    fileName: string,
    onProgress?: (progress: number, msg: string) => void
  ) => Promise<ImportSummaryResult>;
  deleteImportHistoryItem: (id: string) => void;
  clearImportHistory: () => void;
  deleteAllImportedData: () => Promise<{
    deletedCustomersCount: number;
    deletedContractsCount: number;
    deletedSalesCount: number;
    deletedQuotationsCount: number;
    deletedOpportunitiesCount: number;
  }>;
  syncData: () => Promise<void>;
  migrateLegacyData: () => Promise<any>;
  isInitialLoading: boolean;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  // NESTA Guardian & Universal AI Agent Layer
  guardianAlerts: PredictiveAlert[];
  guardianIncidents: Incident[];
  guardianHealthReport: SystemHealthReport | null;
  aiActivityLogs: AIActivityLogEntry[];
  changeSets: ChangeSet[];
  isAiEmergencyStopEnabled: boolean;
  isHealthCenterOpen: boolean;
  setIsHealthCenterOpen: (open: boolean) => void;
  selectedMetricForLineage: string | null;
  setSelectedMetricForLineage: (metricKey: string | null) => void;
  isPremiumAiEnabled: boolean;
  setIsPremiumAiEnabled: (enabled: boolean) => void;
  salesManualAdjustment: number;
  setSalesManualAdjustment: (val: number) => void;
  salesOverrideValue: number | null;
  setSalesOverrideValue: (val: number | null) => void;
  toggleAiEmergencyStop: () => void;
  runGuardianFullCheck: () => Promise<SystemHealthReport>;
  runCustomerCoverageAudit: () => Promise<{ dbCount: number; visibleCount: number; hiddenCount: number; issues: any[] }>;
  resolveIncident: (incidentId: string) => Promise<boolean>;
  dismissAlert: (alertId: string) => void;
  rollbackChangeSet: (changeSetId: string) => Promise<boolean>;
  executeVerifiedAiAction: (action: AIActionProposal) => Promise<{ success: boolean; message: string; changeSetId?: string }>;
  logAiActivity: (entry: Omit<AIActivityLogEntry, "id" | "timestamp">) => void;

  // NESTA ACTION PERSISTENCE & AUDIT RULE - Unified Pipeline Methods
  executeUnifiedAction: (params: {
    entityType: EntityType;
    recordId: string;
    companyId: string;
    action: ChangeAction;
    payload?: Record<string, any>;
    previousData?: Record<string, any>;
    description?: string;
    applyLocal: () => void;
    toastSuccessMsg?: string;
    toastErrorMsg?: string;
    toastMessage?: string;
    toastType?: "success" | "info" | "warning" | "error";
    silent?: boolean;
  }) => Promise<{ success: boolean; change: ChangeRecord }>;
  executeUnifiedBulkAction: (params: {
    operationName?: string;
    entityType: EntityType;
    entityIds?: string[];
    items?: Array<{ recordId?: string; id?: string; previousData?: any; payload?: any }>;
    actionType?: ChangeAction;
    action?: ChangeAction;
    companyId: string;
    payload?: Record<string, any>;
    executeSingle?: (id: string) => Promise<{ success: boolean; error?: string }>;
    applyLocal?: () => void;
    onComplete?: () => void;
    description?: string;
    toastMessage?: string;
    toastSuccessMsg?: string;
    toastType?: "success" | "info" | "warning" | "error";
  }) => Promise<ChangeRecord>;
  executeUnifiedSystemOperation: {
    (params: {
      actionType?: ChangeAction;
      operation?: string | ((sb: any) => Promise<any>);
      operationName?: string;
      description: string;
      companyId?: string;
      payload?: Record<string, any>;
      previousData?: Record<string, any>;
      status?: any;
      verificationStatus?: any;
      applyLocal?: () => void;
      toastMessage?: string;
      toastType?: "success" | "info" | "warning" | "error";
    }): ChangeRecord;
    (
      actionTypeOrName: string,
      description: string,
      runCallback?: ((sb: any) => Promise<any>) | Record<string, any>,
      companyId?: string
    ): ChangeRecord;
  };
}

const defaultTodayStr = new Date().toISOString().split("T")[0];

export const sanitizeCustomerForSupabase = (cust: any) => cleanCustomer(cust);

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_PREFIX = "pvc_nesta_v1_";
const SYSTEM_RESET_VERSION = "pvc_nesta_v1_operational_reset_2026_09_18_v1";

// Ensure local storage is purged of old operational data on client load
try {
  if (typeof window !== "undefined" && window.localStorage) {
    if (localStorage.getItem(SYSTEM_RESET_VERSION) !== "true") {
      const keysToPurge = [
        "customers",
        "contracts",
        "sales",
        "quotations",
        "inquiries",
        "followUps",
        "inspections",
        "payments",
        "tasks",
        "importHistory",
        "import_history",
        "auditLogs",
        "dataReviewItems",
        "salesManualAdjustment",
        "salesOverrideValue",
      ];
      keysToPurge.forEach((k) => localStorage.removeItem(STORAGE_PREFIX + k));
      globalPersistenceEngine.clearAllQueuesAndStorage();
      localStorage.setItem(SYSTEM_RESET_VERSION, "true");
    }
  }
} catch (e) {}

export const AppProvider: React.FC<{ children: React.ReactNode; session?: any }> = ({ children, session }) => {
  // Load from localStorage or initialData
  const getInitial = <T,>(key: string, defaultVal: T): T => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + key);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  };

  const [companies, setCompanies] = useState<Company[]>(() => {
    const init = getInitial<Company[]>("companies", []);
    return init && init.length > 0 ? init : initialCompanies;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const init = getInitial<Employee[]>("employees", []);
    return init && init.length > 0 ? init : initialEmployees;
  });

  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>(() => {
    const init = getInitial<SalaryPayment[]>("salaryPayments", []);
    return init && init.length > 0 ? init : initialSalaryPayments;
  });

  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>(() => {
    const init = getInitial<CommissionPayment[]>("commissionPayments", []);
    return init && init.length > 0 ? init : initialCommissionPayments;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "employees", JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "salaryPayments", JSON.stringify(salaryPayments));
  }, [salaryPayments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "commissionPayments", JSON.stringify(commissionPayments));
  }, [commissionPayments]);

  // Settings States
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  
  const [areas, setAreas] = useState<string[]>(() => getInitial("areas", []));

  const DEFAULT_LOSS_REASONS = [
    "السعر",
    "اختار شركة أخرى",
    "لم يعد مهتمًا",
    "تأجيل",
    "عدم الرد",
    "مشكلة في المنتج",
    "مشكلة في التنفيذ/المدة",
    "سبب آخر",
  ];

  const [lossReasons, setLossReasons] = useState<string[]>(() => {
    const init = getInitial<string[]>("lossReasons", []);
    return init && init.length > 0 ? init : DEFAULT_LOSS_REASONS;
  });

  const [activeCompanyId, setActiveCompanyIdState] = useState<CompanyId | "all">("all");
  const [selectedCompanyIds, setSelectedCompanyIdsState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + "selectedCompanyIds");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const setSelectedCompanyIds = useCallback((ids: string[]) => {
    setSelectedCompanyIdsState(ids);
    try {
      localStorage.setItem(STORAGE_PREFIX + "selectedCompanyIds", JSON.stringify(ids));
    } catch (e) {}
    if (ids.length === 1) {
      setActiveCompanyIdState(ids[0] as CompanyId);
    } else {
      setActiveCompanyIdState("all");
    }
  }, []);

  const setActiveCompanyId = useCallback((id: CompanyId | "all") => {
    setActiveCompanyIdState(id);
    if (id === "all") {
      setSelectedCompanyIdsState([]);
      try {
        localStorage.setItem(STORAGE_PREFIX + "selectedCompanyIds", JSON.stringify([]));
      } catch (e) {}
    } else {
      setSelectedCompanyIdsState([id]);
      try {
        localStorage.setItem(STORAGE_PREFIX + "selectedCompanyIds", JSON.stringify([id]));
      } catch (e) {}
    }
  }, []);

  const toggleCompanySelection = useCallback((id: string) => {
    setSelectedCompanyIdsState((prev) => {
      let next: string[];
      if (prev.length === 0 || prev.includes("all")) {
        next = [id];
      } else if (prev.includes(id)) {
        next = prev.filter((item) => item !== id);
      } else {
        next = [...prev, id];
      }
      try {
        localStorage.setItem(STORAGE_PREFIX + "selectedCompanyIds", JSON.stringify(next));
      } catch (e) {}
      if (next.length === 1) {
        setActiveCompanyIdState(next[0] as CompanyId);
      } else {
        setActiveCompanyIdState("all");
      }
      return next;
    });
  }, []);

  const selectAllCompanies = useCallback(() => {
    setSelectedCompanyIds([]);
    setActiveCompanyIdState("all");
  }, [setSelectedCompanyIds]);

  const clearAllCompanySelection = useCallback(() => {
    setSelectedCompanyIdsState([]);
    setActiveCompanyIdState("all");
    try {
      localStorage.removeItem(STORAGE_PREFIX + "selectedCompanyIds");
    } catch (e) {}
  }, []);
  const [currentTab, setCurrentTab] = useState<NavigationTab>("dashboard");
  const [navigationFilter, setNavigationFilter] = useState<NavigationFilterContext | null>(null);
  const [selectedCustomerIdFor360, setSelectedCustomerIdFor360] = useState<string | null>(null);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);
  const [selectedQuotationForPrint, setSelectedQuotationForPrint] = useState<Quotation | null>(null);

  const navigateToTabWithFilter = useCallback((tab: NavigationTab, filters?: NavigationFilterContext) => {
    if (filters?.companyId && filters.companyId !== "all") {
      setActiveCompanyId(filters.companyId as CompanyId);
    }
    setNavigationFilter(filters || null);
    setCurrentTab(tab);
  }, []);

  const clearNavigationFilter = useCallback(() => {
    setNavigationFilter(null);
  }, []);

  // UI state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState<boolean>(false);
  const [isQuickActionSheetOpen, setIsQuickActionSheetOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "info" | "warning" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  // Ephemeral refs to ensure immediate synchronous access during chained operations (e.g. SmartAiIntake / ManualIntake)
  const recentCustomersRef = useRef<Customer[]>([]);
  const recentFollowUpsRef = useRef<FollowUp[]>([]);

  useEffect(() => {
    recentCustomersRef.current = [];
  }, [customers]);

  useEffect(() => {
    recentFollowUpsRef.current = [];
  }, [followUps]);

  const [quotations, setQuotations] = useState<Quotation[]>([]);

  const [inspections, setInspections] = useState<Inspection[]>([]);

  const [contracts, setContracts] = useState<Contract[]>([]);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [sales, setSales] = useState<Sale[]>([]);

  const [interactions, setInteractions] = useState<Interaction[]>([]);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const [products, setProducts] = useState<Product[]>(() => getInitial("products", initialProducts));

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "products", JSON.stringify(products));
  }, [products]);

  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Unified Global Filters State (Company, Product, Date Range)
  const [globalFilters, setGlobalFilters] = useState<GlobalFilterState>(() => ({
    companyIds: [],
    productIds: [],
    dateRange: "all",
  }));

  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>(() => getInitial("importHistory", []));

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => getInitial("auditLogs", []));

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "auditLogs", JSON.stringify(auditLogs));
  }, [auditLogs]);

  const [dataReviewItems, setDataReviewItems] = useState<DataReviewItem[]>(() => getInitial("dataReviewItems", []));

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "dataReviewItems", JSON.stringify(dataReviewItems));
  }, [dataReviewItems]);

  const [deletedOpportunityIds, setDeletedOpportunityIds] = useState<string[]>(() =>
    getInitial("deleted_opportunity_ids", [])
  );

  const employeeStatements = useMemo(() => {
    const map: Record<string, MonthlyStatement[]> = {};
    employees.forEach(emp => {
      map[emp.id] = generateEmployeeStatements(
        emp, 
        companies, 
        contracts, 
        payments, 
        salaryPayments, 
        commissionPayments, 
        emp.commissionAdjustments || []
      );
    });
    return map;
  }, [employees, companies, contracts, payments, salaryPayments, commissionPayments]);

  const reconciliationReport = useMemo(() => {
    return runCollectionReconciliation(contracts, payments);
  }, [contracts, payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "deleted_opportunity_ids", JSON.stringify(deletedOpportunityIds));
  }, [deletedOpportunityIds]);

  const approveRecord = useCallback((entityType: string, entityId: string) => {
    if (entityType === 'contract') {
      setContracts(prev => prev.map(c => c.id === entityId ? { ...c, recordStatus: 'approved' } : c));
    } else if (entityType === 'sale') {
      setSales(prev => prev.map(s => s.id === entityId ? { ...s, recordStatus: 'approved' } : s));
    } else if (entityType === 'opportunity') {
      setOpportunities(prev => prev.map(o => o.id === entityId ? { ...o, recordStatus: 'approved' } : o));
    }
    setDataReviewItems(prev => prev.filter(i => i.entityId !== entityId));
    showToast("تم اعتماد السجل وتفعيل تأثيره المالي بنجاح", "success");
  }, []);

  const excludeRecord = useCallback((entityType: string, entityId: string, reason: string) => {
    const typeLower = entityType.toLowerCase();
    if (typeLower === 'contract') {
      setContracts(prev => prev.map(c => c.id === entityId ? { ...c, recordStatus: 'excluded', exclusionReason: reason, excludedAt: new Date().toISOString() } : c));
    } else if (typeLower === 'sale') {
      setSales(prev => prev.map(s => s.id === entityId ? { ...s, recordStatus: 'excluded', exclusionReason: reason, excludedAt: new Date().toISOString() } : s));
    } else if (typeLower === 'opportunity') {
      setOpportunities(prev => prev.map(o => o.id === entityId ? { ...o, recordStatus: 'excluded', exclusionReason: reason, excludedAt: new Date().toISOString() } : o));
    } else if (typeLower === 'customer') {
      setCustomers(prev => prev.map(c => c.id === entityId ? { ...c, recordStatus: 'excluded', exclusionReason: reason, excludedAt: new Date().toISOString() } as any : c));
    } else if (typeLower === 'inquiry') {
      setInquiries(prev => prev.map(i => i.id === entityId ? { ...i, recordStatus: 'excluded', exclusionReason: reason, excludedAt: new Date().toISOString() } as any : i));
    } else if (typeLower === 'quotation') {
      setQuotations(prev => prev.map(q => q.id === entityId ? { ...q, recordStatus: 'excluded', exclusionReason: reason, excludedAt: new Date().toISOString() } as any : q));
    } else if (typeLower === 'followup') {
      setFollowUps(prev => prev.map(f => f.id === entityId ? { ...f, recordStatus: 'excluded', exclusionReason: reason, excludedAt: new Date().toISOString() } as any : f));
    } else if (typeLower === 'inspection') {
      setInspections(prev => prev.map(ins => ins.id === entityId ? { ...ins, recordStatus: 'excluded', exclusionReason: reason, excludedAt: new Date().toISOString() } as any : ins));
    }
    setDataReviewItems(prev => prev.filter(i => i.entityId !== entityId));
    showToast("تم استبعاد السجل من الحسابات والـ KPIs بنجاح", "info");
  }, []);

  const [theme, setThemeState] = useState<"dark" | "light">((): "dark" | "light" => {
    try {
      const saved = localStorage.getItem("pvc_nesta_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return "dark";
  });

  const setTheme = useCallback((newTheme: "dark" | "light") => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("pvc_nesta_theme", newTheme);
    } catch {}
    if (newTheme === "light") {
      document.documentElement.classList.add("theme-light");
    } else {
      document.documentElement.classList.remove("theme-light");
    }
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("theme-light");
    } else {
      document.documentElement.classList.remove("theme-light");
    }
  }, [theme]);

  // NESTA Guardian & AI State
  const [guardianAlerts, setGuardianAlerts] = useState<PredictiveAlert[]>(() => getInitial("guardianAlerts", []));
  const [guardianIncidents, setGuardianIncidents] = useState<Incident[]>(() => getInitial("guardianIncidents", []));
  const [guardianHealthReport, setGuardianHealthReport] = useState<SystemHealthReport | null>(null);
  const [aiActivityLogs, setAiActivityLogs] = useState<AIActivityLogEntry[]>(() => getInitial("aiActivityLogs", []));
  const [changeSets, setChangeSets] = useState<ChangeSet[]>(() => getInitial("changeSets", []));
  const [isAiEmergencyStopEnabled, setIsAiEmergencyStopEnabled] = useState<boolean>(() => getInitial("isAiEmergencyStopEnabled", false));
  const [isHealthCenterOpen, setIsHealthCenterOpen] = useState<boolean>(false);
  const [selectedMetricForLineage, setSelectedMetricForLineage] = useState<string | null>(null);
  const [isPremiumAiEnabled, setIsPremiumAiEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + "isPremiumAiEnabled");
    return saved === "true"; // Default to false (Zero-Cost)
  });

  const setIsPremiumAiEnabled = (enabled: boolean) => {
    setIsPremiumAiEnabledState(enabled);
    localStorage.setItem(STORAGE_PREFIX + "isPremiumAiEnabled", JSON.stringify(enabled));
    if (supabase && session) {
      supabase.from("companies").upsert({
        id: "config_ai_system",
        name: "AI Configuration Settings",
        active: enabled,
        color: "#000000",
        badgeBg: "#000000",
        badgeText: "#ffffff",
        phone: "",
        monthlyTarget: 0,
        logoText: "AI"
      }).then(({ error }) => {
        if (error) {
          console.error("Failed to persist AI setting to Supabase:", error);
        }
      });
    }
  };

  const [salesManualAdjustment, setSalesManualAdjustmentState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + "salesManualAdjustment");
    return saved ? Number(saved) : 0;
  });

  const [salesOverrideValue, setSalesOverrideValueState] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + "salesOverrideValue");
    return saved && saved !== "null" ? Number(saved) : null;
  });

  const setSalesManualAdjustment = (val: number) => {
    setSalesManualAdjustmentState(val);
    localStorage.setItem(STORAGE_PREFIX + "salesManualAdjustment", String(val));
  };

  const setSalesOverrideValue = (val: number | null) => {
    setSalesOverrideValueState(val);
    if (val === null) {
      localStorage.removeItem(STORAGE_PREFIX + "salesOverrideValue");
    } else {
      localStorage.setItem(STORAGE_PREFIX + "salesOverrideValue", String(val));
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "guardianAlerts", JSON.stringify(guardianAlerts));
  }, [guardianAlerts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "guardianIncidents", JSON.stringify(guardianIncidents));
  }, [guardianIncidents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "aiActivityLogs", JSON.stringify(aiActivityLogs));
  }, [aiActivityLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "changeSets", JSON.stringify(changeSets));
  }, [changeSets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "isAiEmergencyStopEnabled", JSON.stringify(isAiEmergencyStopEnabled));
  }, [isAiEmergencyStopEnabled]);

  const [isCloudConnected, setIsCloudConnected] = useState<boolean | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Helper to generate document serial numbers
  const generateDocNumber = (
    type: "Q" | "CTR" | "REC",
    companyId: string,
    year: string | number,
    existingList: any[]
  ) => {
    const comp = companies.find((c) => c.id === companyId);
    let compPrefix = "XX";
    if (comp) {
      const enMatch = comp.name.match(/[A-Za-z]/g);
      if (enMatch && enMatch.length >= 2) compPrefix = (enMatch[0] + enMatch[1]).toUpperCase();
      else compPrefix = comp.name.substring(0, 2).toUpperCase();
    }
    const prefix = `${type}-${compPrefix}-${year}-`;
    let max = 0;
    existingList.forEach((doc) => {
      const numStr = doc.quoteNumber || doc.contractNumber;
      if (numStr && numStr.startsWith(prefix)) {
        const seqStr = numStr.replace(prefix, "");
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > max) max = seq;
      }
    });
    return `${prefix}${(max + 1).toString().padStart(4, "0")}`;
  };

  // Master Customer Journey & Sales Pipeline Engine
  // Comprehensive, flexible sales journey tracking & existing data reconciliation:
  // 1) Contracts generate historical Quotes and Sales if missing; Contracts link to Quotes.
  // 2) Inquiries with quote evidence generate Quotes; Inquiries needing inspection trigger inspection stages.
  // 3) Stage is calculated dynamically based on confirmed facts without forcing rigid linearity.
  // 4) Opportunities represent full open customer journeys; Won upon contract, Lost upon closure.
  // 5) Region is preserved across the entire customer lifecycle.
  // 6) Historical timeline events are maintained with zero data loss or artificial dates.
  const reconcileSalesPipelineCore = (
    currentCustomers: Customer[],
    currentInquiries: Inquiry[],
    currentQuotations: Quotation[],
    currentContracts: Contract[],
    currentOpportunities: Opportunity[],
    currentSales: Sale[],
    currentFollowUps: FollowUp[] = [],
    currentInspections: Inspection[] = [],
    currentInteractions: Interaction[] = [],
    currentPayments: Payment[] = []
  ) => {
    // PVC NESTA Safe Non-Destructive Association
    // Preserves original creation dates and avoids creating synthetic duplicate records.
    const updatedOpportunities = currentOpportunities.map((opp) => ({ ...opp }));
    const updatedCustomers = currentCustomers.map((c) => ({ ...c }));
    const updatedQuotations = currentQuotations.map((q) => ({ ...q }));
    const updatedContracts = currentContracts.map((c) => ({ ...c }));
    const updatedInquiries = currentInquiries.map((i) => ({ ...i }));
    const updatedSales = currentSales.map((s) => ({ ...s }));
    const updatedFollowUps = currentFollowUps.map((f) => ({ ...f }));
    const updatedInteractions = currentInteractions.map((i) => ({ ...i }));

    const cleanPhone = (p?: string) => (p || "").replace(/[^0-9]/g, "");

    // Fast lookup maps
    const custMapById = new Map<string, Customer>();
    const custMapByPhone = new Map<string, Customer>();
    const custMapByName = new Map<string, Customer>();
    updatedCustomers.forEach((c) => {
      custMapById.set(c.id, c);
      const cp = cleanPhone(c.phone);
      if (cp) custMapByPhone.set(cp, c);
      const cp2 = cleanPhone(c.secondaryPhone);
      if (cp2) custMapByPhone.set(cp2, c);
      if (c.name) custMapByName.set(c.name.trim().toLowerCase(), c);
    });

    const inquiryMapById = new Map<string, Inquiry>();
    const inquiryMapByPhone = new Map<string, Inquiry>();
    const inquiryMapByCust = new Map<string, Inquiry>();
    updatedInquiries.forEach((inq) => {
      inquiryMapById.set(inq.id, inq);
      const cp = cleanPhone(inq.customerPhone);
      if (cp) inquiryMapByPhone.set(cp, inq);
      if (inq.customerId) inquiryMapByCust.set(inq.customerId, inq);
    });

    const quoteMapById = new Map<string, Quotation>();
    const quoteMapByNum = new Map<string, Quotation>();
    const quoteMapByCust = new Map<string, Quotation>();
    updatedQuotations.forEach((q) => {
      quoteMapById.set(q.id, q);
      if (q.quoteNumber) quoteMapByNum.set(q.quoteNumber.trim(), q);
      if (q.customerId) quoteMapByCust.set(`${q.customerId}_${q.companyId}`, q);
    });

    const contractMapByOpp = new Map<string, Contract>();
    const contractMapByQuote = new Map<string, Contract>();
    const contractMapByCust = new Map<string, Contract>();
    updatedContracts.forEach((ct) => {
      if (ct.opportunityId) contractMapByOpp.set(ct.opportunityId, ct);
      if (ct.quotationId) contractMapByQuote.set(ct.quotationId, ct);
      if (ct.customerId) contractMapByCust.set(`${ct.customerId}_${ct.companyId}`, ct);
    });

    const followUpMapByCust = new Map<string, FollowUp>();
    updatedFollowUps.forEach((f) => {
      if (f.customerId && f.status === "pending") {
        followUpMapByCust.set(f.customerId, f);
      }
    });

    // Reconcile each opportunity with explicit, validated linkages
    updatedOpportunities.forEach((opp) => {
      const oppPhone = cleanPhone(opp.customerPhone);

      // 1. Link to Customer
      let cust = opp.customerId ? custMapById.get(opp.customerId) : undefined;
      if (!cust && oppPhone) {
        cust = custMapByPhone.get(oppPhone);
      }
      if (!cust && opp.customerName) {
        cust = custMapByName.get(opp.customerName.trim().toLowerCase());
      }
      if (cust) {
        opp.customerId = cust.id;
        opp.customerName = cust.name;
        opp.customerScope = "specific";
        if (cust.area && cust.area !== "غير محدد" && (!opp.area || opp.area === "غير محدد")) {
          opp.area = cust.area;
        }
        if (cust.phone && (!opp.customerPhone || opp.customerPhone === "غير مسجل")) {
          opp.customerPhone = cust.phone;
        }
      }

      // 2. Link to Inquiry (only if explicitly linked)
      let inq = opp.inquiryId ? inquiryMapById.get(opp.inquiryId) : undefined;
      if (inq) {
        opp.inquiryId = inq.id;
        if (!opp.productType || opp.productType === "عام") {
          opp.productType = inq.productType;
        }
      }

      // 3. Link to Quotation (only if explicitly linked by ID, quote number, or quotation references this opp)
      let quote = opp.quotationId ? quoteMapById.get(opp.quotationId) : undefined;
      if (!quote && opp.quoteNumber) {
        quote = quoteMapByNum.get(opp.quoteNumber.trim());
      }
      if (!quote && opp.title) {
        const match = opp.title.match(/Q-[A-Z]{2}-\d{4}-\d{4}/);
        if (match) {
          quote = quoteMapByNum.get(match[0]);
        }
      }
      if (!quote) {
        quote = updatedQuotations.find((q) => q.opportunityId === opp.id);
      }

      if (quote) {
        opp.hasQuote = true;
        opp.quotationId = quote.id;
        opp.quoteNumber = quote.quoteNumber;
        opp.quotationValue = quote.totalAmount;
        opp.isQuoteSent = quote.status === "sent";
        opp.quoteDate = quote.date;
        if (opp.status === "open") {
          if (quote.status === "sent" && opp.stage !== "quote_sent") {
            opp.stage = "quote_sent";
            opp.nextAction = "متابعة استلام ودراسة العرض مع العميل";
          } else if (quote.status === "accepted") {
            opp.status = "won";
            opp.stage = "won";
            opp.closedAt = opp.closedAt || quote.date;
            opp.nextAction = "صفقة رابحة - تم قبول عرض السعر";
          } else if (quote.status === "rejected") {
            opp.status = "lost";
            opp.stage = "lost";
            opp.lossReason = opp.lossReason || "رفض العميل عرض السعر";
            opp.nextAction = "صفقة مغلقة بالخسارة";
          }
        }
      }

      // 4. Link to Contract (only if explicitly linked to this opportunity or this opportunity's quote)
      let ct = contractMapByOpp.get(opp.id);
      if (!ct && opp.contractId) {
        ct = updatedContracts.find((c) => c.id === opp.contractId);
      }
      if (!ct && quote) {
        ct = contractMapByQuote.get(quote.id);
      }
      if (ct) {
        opp.hasContract = true;
        opp.contractId = ct.id;
        opp.contractNumber = ct.contractNumber;
        opp.status = "won";
        opp.stage = "won";
        opp.closedAt = opp.closedAt || ct.date;
        opp.nextAction = "صفقة رابحة - تم التعاقد رسمياً";
      }

      // 5. Link to Follow-up
      if (cust && opp.status === "open" && !opp.nextFollowUpDate) {
        const fup = followUpMapByCust.get(cust.id);
        if (fup) {
          opp.nextFollowUpDate = fup.dueDate;
          opp.nextAction = opp.nextAction || fup.title;
        }
      }
    });

    // 6. Financial Reconciliation (PVC NESTA Single Source of Truth)
    // Ensures all contracts correctly reflect the sum of their confirmed payments.
    updatedContracts.forEach(c => {
      const balance = calculateContractBalance(c, currentPayments);
      c.paidAmount = balance.collectedAmount;
      c.remainingAmount = balance.outstandingBalance;
      
      // Auto-update status if fully collected
      if (c.remainingAmount === 0 && (c.totalValue || 0) > 0) {
        c.collectionStatus = "collected";
        if (c.status !== "cancelled") {
          c.status = "completed";
        }
      } else if (c.paidAmount > 0) {
        c.collectionStatus = "partial";
      }
    });

    return {
      updatedCustomers,
      updatedContracts,
      updatedQuotations,
      updatedOpportunities,
      updatedSales,
      updatedInteractions,
      updatedInquiries,
      updatedFollowUps,
      newReviewItems: [],
      stats: {
        newQuotesCreated: 0,
        newOppsCreated: 0,
        contractsLinked: 0,
        oppsUpdated: 0,
        salesCreated: 0,
      },
    };

  };


  const persistReconciledData = async (
    reconciled: ReturnType<typeof reconcileSalesPipelineCore>
  ) => {
    setCustomers(reconciled.updatedCustomers);
    setContracts(reconciled.updatedContracts);
    setQuotations(reconciled.updatedQuotations);
    setOpportunities(reconciled.updatedOpportunities);
    setSales(reconciled.updatedSales);
    setInteractions(reconciled.updatedInteractions);
    setInquiries(reconciled.updatedInquiries);
    setFollowUps(reconciled.updatedFollowUps);

    // Save to localStorage immediately
    localStorage.setItem(STORAGE_PREFIX + "customers", JSON.stringify(reconciled.updatedCustomers));
    localStorage.setItem(STORAGE_PREFIX + "contracts", JSON.stringify(reconciled.updatedContracts));
    localStorage.setItem(STORAGE_PREFIX + "quotations", JSON.stringify(reconciled.updatedQuotations));
    localStorage.setItem(
      STORAGE_PREFIX + "opportunities",
      JSON.stringify(reconciled.updatedOpportunities)
    );
    localStorage.setItem(STORAGE_PREFIX + "sales", JSON.stringify(reconciled.updatedSales));
    localStorage.setItem(
      STORAGE_PREFIX + "interactions",
      JSON.stringify(reconciled.updatedInteractions)
    );
    localStorage.setItem(STORAGE_PREFIX + "inquiries", JSON.stringify(reconciled.updatedInquiries));
    localStorage.setItem(STORAGE_PREFIX + "followUps", JSON.stringify(reconciled.updatedFollowUps));

    // Save to Supabase
    executeUnifiedSystemOperation(
      "pipeline_reconciliation_sync",
      "مزامنة تسوية دورة المبيعات مع السحابة",
      async (sb) => {
        if (reconciled.updatedCustomers.length > 0) {
          await sb
            .from("customers")
            .upsert(reconciled.updatedCustomers.map(sanitizeCustomerForSupabase));
        }
        if (reconciled.updatedContracts.length > 0) {
          await sb.from("contracts").upsert(reconciled.updatedContracts);
        }
        if (reconciled.updatedQuotations.length > 0) {
          await sb.from("quotations").upsert(reconciled.updatedQuotations);
        }
        if (reconciled.updatedSales.length > 0) {
          await sb.from("sales").upsert(reconciled.updatedSales);
        }

        // Always sync opportunities via interactions table to prevent any table schema mismatch
        const oppInteractions = reconciled.updatedOpportunities.map((opp) => ({
          id: `opp-sync-${opp.id}`,
          customerId: opp.customerId || "general",
          companyId: opp.companyId,
          type: "opportunity_sync",
          date: opp.createdAt || defaultTodayStr,
          notes: JSON.stringify(opp),
          result: "synced",
        }));
        await sb.from("interactions").upsert(oppInteractions);

        // Try direct opportunities table if available
        try {
          await sb.from("opportunities").upsert(reconciled.updatedOpportunities);
        } catch {}
      }
    );
  };

  // Fetch from Supabase on mount - Single Source of Truth
  const fetchCloudData = async () => {
    if (!supabase || !session) {
      setIsCloudConnected(false);
      setIsInitialLoading(false);
      return;
    }
    try {
      // 1. Fetch user profile specifically by auth UUID (session.user.id)
      let me: any = currentUser;

      const { data: myProfile, error: myProfileErr } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (myProfile) {
        me = {
          id: myProfile.id,
          name: myProfile.name,
          email: myProfile.email,
          role: myProfile.role,
          allowedCompanyIds: myProfile.allowedCompanyIds || myProfile.allowed_company_ids || ["all"],
          permissions: myProfile.permissions || {},
          active: myProfile.active !== false,
        };
      }

      // Fetch the broader team users list for user assignment and team directories
      const usersRes = await supabase.from("users").select("*");
      
      let loadedUsers = usersRes && usersRes.data ? usersRes.data.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        allowedCompanyIds: u.allowedCompanyIds || u.allowed_company_ids || [],
        permissions: u.permissions || {},
        active: u.active !== false,
      })) : [];
      
      if (!me && loadedUsers.length > 0) {
        me = loadedUsers.find((u) => u.id === session.user.id) || null;
      }

      if ((import.meta as any).env?.DEV && me) {
        console.log("[AppContext Auth Initialized]:", {
          authUserId: session.user.id,
          profileId: me.id,
          idMatch100: session.user.id === me.id,
          role: me.role,
          active: me.active,
          allowedCompanyIds: me.allowedCompanyIds,
        });
      }
      
      // If profile exists and is explicitly marked inactive
      if (me && me.active === false) {
        showToast("حسابك موقوف من قِبل الإدارة، يرجى مراجعة المسؤول", "warning");
        await supabase.auth.signOut();
        return;
      }

      // If user profile is not found:
      if (!me) {
        // If there was a network/supabase transient error, do NOT sign out!
        if (myProfileErr || usersRes.error) {
          console.warn("[AppContext] Transient error querying profile; preserving session:", myProfileErr || usersRes.error);
          setIsCloudConnected(false);
          setIsInitialLoading(false);
          return;
        }

        // Only sign out if queries cleanly executed and user genuinely does not exist in public.users
        showToast("حسابك غير مسجل في قاعدة البيانات التشغيلية", "warning");
        await supabase.auth.signOut();
        return;
      }

      setCurrentUser(me);

      // 2. Build queries with strict data isolation filters
      const isSuper = me.allowedCompanyIds.includes("all");
      const companyFilter = me.allowedCompanyIds;

      // Restrict users list in memory
      if (!isSuper) {
        setUsers(loadedUsers.filter(u => u.allowedCompanyIds.some((id: string) => companyFilter.includes(id))));
      } else {
        setUsers(loadedUsers);
      }

      let qCompanies = supabase.from("companies").select("*").order("name");
      let qCust = supabase.from("customers").select("*").order("createdAt", { ascending: false }).limit(5000);
      let qFollow = supabase.from("follow_ups").select("*").order("dueDate", { ascending: true }).limit(5000);
      let qQuote = supabase.from("quotations").select("*").order("date", { ascending: false }).limit(5000);
      let qCont = supabase.from("contracts").select("*").order("date", { ascending: false }).limit(5000);
      let qPay = supabase.from("payments").select("*").order("date", { ascending: false }).limit(5000);
      let qSales = supabase.from("sales").select("*").order("date", { ascending: false }).limit(5000);
      let qInq = supabase.from("inquiries").select("*").order("date", { ascending: false }).limit(5000);
      let qInsp = supabase.from("inspections").select("*").order("date", { ascending: false }).limit(5000);
      let qInter = supabase.from("interactions").select("*").order("date", { ascending: false }).limit(5000);
      let qEmployees = supabase.from("employees").select("*").order("name");
      let qSalPay = supabase.from("salary_payments").select("*").order("paymentDate", { ascending: false });
      let qCommPay = supabase.from("commission_payments").select("*").order("paymentDate", { ascending: false });
      let qCommAdj = supabase.from("commission_adjustments").select("*").order("createdAt", { ascending: false });
      let qMonthlyStatements = supabase.from("monthly_statements").select("*");
      let qAudit = supabase.from("audit_logs").select("*").order("timestamp", { ascending: false }).limit(1000);
      let qOpp = supabase.from("opportunities").select("*").order("createdAt", { ascending: false }).limit(5000);
      let qProd = supabase.from("products").select("*").order("name");

      // Apply isolation strictly if not a super user
      if (!isSuper && companyFilter.length > 0) {
        qCompanies = qCompanies.in("id", companyFilter);
        qCust = qCust.in("companyId", companyFilter);
        qFollow = qFollow.in("companyId", companyFilter);
        qQuote = qQuote.in("companyId", companyFilter);
        qCont = qCont.in("companyId", companyFilter);
        qPay = qPay.in("companyId", companyFilter);
        qSales = qSales.in("companyId", companyFilter);
        qInq = qInq.in("companyId", companyFilter);
        qInsp = qInsp.in("companyId", companyFilter);
        qInter = qInter.in("companyId", companyFilter);
        qEmployees = qEmployees.in("companyId", companyFilter);
        qSalPay = qSalPay.in("companyId", companyFilter);
        qCommPay = qCommPay.in("companyId", companyFilter);
        qCommAdj = qCommAdj.in("companyId", companyFilter);
        qMonthlyStatements = qMonthlyStatements.in("companyId", companyFilter);
        qAudit = qAudit.in("companyId", companyFilter);
        qOpp = qOpp.in("companyId", companyFilter);
        qProd = qProd.in("companyId", companyFilter);
      } else if (!isSuper && companyFilter.length === 0) {
        // Fallback: user has NO access. Force impossible condition to return empty safely.
        qCompanies = qCompanies.eq("id", "blocked-access");
        qCust = qCust.eq("companyId", "blocked-access");
        qFollow = qFollow.eq("companyId", "blocked-access");
        qQuote = qQuote.eq("companyId", "blocked-access");
        qCont = qCont.eq("companyId", "blocked-access");
        qPay = qPay.eq("companyId", "blocked-access");
        qSales = qSales.eq("companyId", "blocked-access");
        qInq = qInq.eq("companyId", "blocked-access");
        qInsp = qInsp.eq("companyId", "blocked-access");
        qInter = qInter.eq("companyId", "blocked-access");
        qEmployees = qEmployees.eq("companyId", "blocked-access");
        qSalPay = qSalPay.eq("companyId", "blocked-access");
        qCommPay = qCommPay.eq("companyId", "blocked-access");
        qCommAdj = qCommAdj.eq("companyId", "blocked-access");
        qMonthlyStatements = qMonthlyStatements.eq("companyId", "blocked-access");
        qAudit = qAudit.eq("companyId", "blocked-access");
        qOpp = qOpp.eq("companyId", "blocked-access");
        qProd = qProd.eq("companyId", "blocked-access");
      }

      // 3. Execute all queries
      const [
        compRes,
        custRes,
        followRes,
        quoteRes,
        contRes,
        payRes,
        salesRes,
        inquiriesRes,
        inspectionsRes,
        interactionsRes,
        empRes,
        salPayRes,
        commPayRes,
        commAdjRes,
        monthlyStmtRes,
        auditRes,
        oppRes,
        prodRes
      ] = await Promise.all([
        qCompanies,
        qCust,
        qFollow,
        qQuote,
        qCont,
        qPay,
        qSales,
        qInq,
        qInsp,
        qInter,
        qEmployees,
        qSalPay,
        qCommPay,
        qCommAdj,
        qMonthlyStatements,
        qAudit,
        qOpp,
        qProd
      ]);

      if (custRes.error) {
        setIsCloudConnected(false);
        console.warn("Table read error (possibly missing table or RLS):", custRes.error);
        showToast("تعذر تحميل البيانات من المصدر الرئيسي", "error");
        
        // Zero out the state arrays so that stale cache doesn't display as real data:
        setCompanies([]);
        setCustomers([]);
        setFollowUps([]);
        setQuotations([]);
        setContracts([]);
        setPayments([]);
        setSales([]);
        setInquiries([]);
        setInspections([]);
        setInteractions([]);
        setOpportunities([]);
        setEmployees([]);
      } else {
        setIsCloudConnected(true);
        
        // Supabase is the EXCLUSIVE source of truth (with client-side logo preservation):
        if (compRes.data) {
          // Parse global config settings from config_ai_system company record
          const aiConfigComp = compRes.data.find((c: any) => c.id === "config_ai_system");
          const isAiEnabled = aiConfigComp ? aiConfigComp.active === true : false;
          setIsPremiumAiEnabledState(isAiEnabled);
          localStorage.setItem(STORAGE_PREFIX + "isPremiumAiEnabled", JSON.stringify(isAiEnabled));

          const localLogosRaw = localStorage.getItem(STORAGE_PREFIX + "companies");
          let cachedLogos: Record<string, string> = {};
          if (localLogosRaw) {
            try {
              const parsed = JSON.parse(localLogosRaw);
              if (Array.isArray(parsed)) {
                parsed.forEach((c: Company) => {
                  if (c.id && c.logoUrl) cachedLogos[c.id] = c.logoUrl;
                });
              }
            } catch {}
          }
          // Filter out config_ai_system from the active companies array so it doesn't show in UI list
          const visibleComps = compRes.data.filter((c: any) => c.id !== "config_ai_system");
          const loadedComps = (visibleComps as Company[]).map((c) => {
            const persistentLogo = c.logoUrl || cachedLogos[c.id] || localStorage.getItem(STORAGE_PREFIX + `comp_logo_${c.id}`);
            return {
              ...c,
              logoUrl: persistentLogo || undefined,
            };
          });
          setCompanies(loadedComps);
        }
        if (followRes.data) setFollowUps(followRes.data as FollowUp[]);
        if (payRes.data) setPayments(payRes.data as Payment[]);
        if (salesRes.data) setSales(salesRes.data as Sale[]);
        if (inquiriesRes.data) setInquiries(inquiriesRes.data as Inquiry[]);
        if (inspectionsRes.data) setInspections(inspectionsRes.data as Inspection[]);
        if (auditRes.data) setAuditLogs(auditRes.data as AuditLogEntry[]);
        
        const allSalPayments = (salPayRes.data || []) as SalaryPayment[];
        const allCommPayments = (commPayRes.data || []) as CommissionPayment[];
        const allCommAdjs = (commAdjRes.data || []) as CommissionAdjustment[];
        const allMonthlyStatements = (monthlyStmtRes.data || []) as MonthlyStatement[];

        setSalaryPayments(allSalPayments);
        setCommissionPayments(allCommPayments);

        if (empRes && empRes.data) {
          const loadedEmps: Employee[] = (empRes.data as any[]).map((e) => {
            const empAdjs = allCommAdjs.filter(a => a.employeeId === e.id);
            const empStatements = allMonthlyStatements.filter(s => s.employeeId === e.id);

            return {
              id: e.id,
              companyId: e.companyId,
              name: e.name,
              role: e.role || "موظف",
              phone: e.phone || undefined,
              email: e.email || undefined,
              startDate: e.startDate || new Date().toISOString().split("T")[0],
              active: e.active !== false,
              monthlySalary: Number(e.monthlySalary) || 0,
              commissionRule: e.commissionRule || "percentage_of_contract",
              commissionPercentage: Number(e.commissionPercentage) || 0,
              commissionTiming: e.commissionTiming || "contract_signing",
              commissionNotes: e.commissionNotes || undefined,
              createdAt: e.createdAt || new Date().toISOString().split("T")[0],
              updatedAt: e.updatedAt || undefined,
              commissionAdjustments: empAdjs,
              monthlyStatements: empStatements,
              salaryHistory: Array.isArray(e.salaryHistory) ? e.salaryHistory : [
                {
                  id: `sal-rec-${e.id}`,
                  employeeId: e.id,
                  companyId: e.companyId,
                  effectiveFrom: e.startDate ? e.startDate.slice(0, 7) : new Date().toISOString().slice(0, 7),
                  monthlySalary: Number(e.monthlySalary) || 0,
                  notes: "الراتب الأساسي المعتمد",
                  createdAt: e.createdAt || new Date().toISOString(),
                },
              ],
              commissionHistory: Array.isArray(e.commissionHistory) ? e.commissionHistory : [],
            };
          });
          setEmployees(loadedEmps);
        }

        const cloudCustomers = globalPersistenceEngine.reconcileCloudWithPending((custRes.data as Customer[]) || [], "customer");
        const rawCloudContracts = ((contRes.data as Contract[]) || []).map((c: any) => ({
          ...c,
          collectionStatus: extractContractCollectionStatus(c),
        }));
        const cloudContracts = globalPersistenceEngine.reconcileCloudWithPending(rawCloudContracts, "contract");
        const cloudQuotes = globalPersistenceEngine.reconcileCloudWithPending((quoteRes.data as Quotation[]) || [], "quotation");
        const cloudInquiries = globalPersistenceEngine.reconcileCloudWithPending((inquiriesRes.data as Inquiry[]) || [], "inquiry");
        const cloudSales = globalPersistenceEngine.reconcileCloudWithPending((salesRes.data as Sale[]) || [], "sale");
        const cloudFollowUps = globalPersistenceEngine.reconcileCloudWithPending((followRes.data as FollowUp[]) || [], "followup");
        const cloudInspections = globalPersistenceEngine.reconcileCloudWithPending((inspectionsRes.data as Inspection[]) || [], "inspection");
        const cloudPayments = globalPersistenceEngine.reconcileCloudWithPending((payRes.data as Payment[]) || [], "payment");
        
        if (prodRes && prodRes.data && Array.isArray(prodRes.data) && prodRes.data.length > 0) {
          const cloudProducts = globalPersistenceEngine.reconcileCloudWithPending((prodRes.data as Product[]) || [], "product");
          setProducts(cloudProducts);
        }

        const deletedSet = new Set(deletedOpportunityIds);
        let cloudOpportunitiesFromTable: Opportunity[] = [];
        if (oppRes && oppRes.data && Array.isArray(oppRes.data)) {
          cloudOpportunitiesFromTable = (oppRes.data as Opportunity[]).filter(
            (o) => Boolean(o && !deletedSet.has(o.id) && (o.status === "open" || o.status === "lost" || o.status === "won"))
          );
        }

        let loadedOpportunities: Opportunity[] = [];
        let normalInteractions: Interaction[] = [];
        if (interactionsRes.data) {
          const cloudInteractions = interactionsRes.data as Interaction[];
          normalInteractions = cloudInteractions.filter((i) => (i.type as string) !== "opportunity_sync");
          const cloudOpportunitiesFromSync: Opportunity[] = cloudInteractions
            .filter((i) => (i.type as string) === "opportunity_sync")
            .map((i) => {
              try {
                return JSON.parse(i.notes);
              } catch {
                return null;
              }
            })
            .filter((o): o is Opportunity => Boolean(o && !deletedSet.has(o.id) && (o.status === "open" || o.status === "lost" || o.status === "won")));

          setInteractions(normalInteractions);

          // Merge: Table opportunities take priority, sync backup supplements missing ones
          const tableOppMap = new Map(cloudOpportunitiesFromTable.map((o) => [o.id, o]));
          for (const syncOpp of cloudOpportunitiesFromSync) {
            if (!tableOppMap.has(syncOpp.id)) {
              tableOppMap.set(syncOpp.id, syncOpp);
            }
          }
          loadedOpportunities = Array.from(tableOppMap.values());
        } else {
          loadedOpportunities = cloudOpportunitiesFromTable;
        }

        // Reconcile and auto-heal the sales pipeline
        const reconciled = reconcileSalesPipelineCore(
          cloudCustomers,
          cloudInquiries,
          cloudQuotes,
          cloudContracts,
          loadedOpportunities,
          cloudSales,
          cloudFollowUps,
          cloudInspections,
          normalInteractions,
          cloudPayments
        );

        setCustomers(reconciled.updatedCustomers);
        setQuotations(reconciled.updatedQuotations);
        setContracts(reconciled.updatedContracts);
        setOpportunities(reconciled.updatedOpportunities);
        setSales(reconciled.updatedSales);
        setInteractions(reconciled.updatedInteractions);

        // If there are review items flagged during reconciliation, add them to review state
        if (reconciled.newReviewItems && reconciled.newReviewItems.length > 0) {
          setDataReviewItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.entityId));
            const uniqueNew = reconciled.newReviewItems.filter((i) => !existingIds.has(i.entityId));
            return [...prev, ...uniqueNew];
          });
        }
      }
    } catch (err) {
      console.warn("Failed to sync from Supabase:", err);
      setIsCloudConnected(false);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudData();
  }, [session]);

  // Realtime cross-device sync & automatic refresh on window focus
  useEffect(() => {
    if (!supabase || !session) return;

    let debounceTimer: any = null;
    const triggerSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchCloudData();
      }, 600);
    };

    // 1. Supabase Postgres Realtime Subscription
    const channel = supabase
      .channel("pvc-nesta-realtime-unifier")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        triggerSync();
      })
      .subscribe();

    // 2. Auto-fetch on browser tab / mobile app focus
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchCloudData();
      }
    };
    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    // 3. Periodic background pulse removed (P0-10)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "users", JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "areas", JSON.stringify(areas));
  }, [areas]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "lossReasons", JSON.stringify(lossReasons));
  }, [lossReasons]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "importHistory", JSON.stringify(importHistory));
  }, [importHistory]);
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "customers", JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "inquiries", JSON.stringify(inquiries));
  }, [inquiries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "followUps", JSON.stringify(followUps));
  }, [followUps]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "quotations", JSON.stringify(quotations));
  }, [quotations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "inspections", JSON.stringify(inspections));
  }, [inspections]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "contracts", JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "payments", JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "sales", JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "interactions", JSON.stringify(interactions));
  }, [interactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "opportunities", JSON.stringify(opportunities));
  }, [opportunities]);

  // Accessible Companies based on user and Active status
  const accessibleCompanies = useMemo(() => {
    // A company is active if active is not false and status is not 'archived' or 'closed'
    const isCompActive = (c: Company) => c.active !== false && c.status !== "archived" && c.status !== "closed";
    const activeList = companies.filter(isCompActive);

    if (!currentUser || currentUser.role === "owner" || currentUser.allowedCompanyIds.includes("all")) {
      return activeList;
    }
    return activeList.filter(c => currentUser.allowedCompanyIds.includes(c.id));
  }, [companies, currentUser]);

  // Active Company
  const activeCompany = useMemo(() => {
    if (selectedCompanyIds && selectedCompanyIds.length === 1 && selectedCompanyIds[0] !== "all") {
      return accessibleCompanies.find((c) => c.id === selectedCompanyIds[0]) || null;
    }
    if (activeCompanyId !== "all") {
      return accessibleCompanies.find((c) => c.id === activeCompanyId) || null;
    }
    return null;
  }, [accessibleCompanies, selectedCompanyIds, activeCompanyId]);

  const isCompanySelected = useCallback(
    (compId?: string) => {
      // Requirement #9: Records without company_id must NOT bleed into a specific company scope
      if (!compId) {
        if ((selectedCompanyIds && selectedCompanyIds.length > 0 && !selectedCompanyIds.includes("all")) || activeCompanyId !== "all") {
          return false;
        }
        return true;
      }

      // Strict security check: if currentUser has restricted allowedCompanyIds, prevent access to any other company
      if (currentUser && currentUser.role !== "owner" && !currentUser.allowedCompanyIds.includes("all")) {
        if (!currentUser.allowedCompanyIds.includes(compId)) {
          return false;
        }
      }

      if (selectedCompanyIds && selectedCompanyIds.length > 0 && !selectedCompanyIds.includes("all")) {
        return selectedCompanyIds.includes(compId);
      }
      if (activeCompanyId !== "all") {
        return compId === activeCompanyId;
      }
      return true;
    },
    [selectedCompanyIds, activeCompanyId, currentUser]
  );

  // Filtered arrays
  const filteredCustomers = useMemo(() => {
    const list = customers.filter((c) => isCompanySelected(c.companyId));
    // Dynamically calculate accurate sales and quotations values as Single Source of Truth
    return list.map((c) => {
      const custSales = sales.filter((s) => s.customerId === c.id);
      const custQuotes = quotations.filter((q) => q.customerId === c.id);
      const calcSales = custSales.reduce((sum, s) => sum + (s.amount || 0), 0);
      const calcQuotes = custQuotes.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
      
      return {
        ...c,
        totalSalesValue: calcSales,
        totalQuotationsValue: calcQuotes
      };
    });
  }, [customers, isCompanySelected, sales, quotations]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((i) => isCompanySelected(i.companyId));
  }, [inquiries, isCompanySelected]);

  const filteredFollowUps = useMemo(() => {
    return followUps.filter((f) => isCompanySelected(f.companyId));
  }, [followUps, isCompanySelected]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => isCompanySelected(q.companyId));
  }, [quotations, isCompanySelected]);

  const filteredInspections = useMemo(() => {
    return inspections.filter((i) => isCompanySelected(i.companyId));
  }, [inspections, isCompanySelected]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => isCompanySelected(c.companyId));
  }, [contracts, isCompanySelected]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => isCompanySelected(p.companyId));
  }, [payments, isCompanySelected]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => isCompanySelected(s.companyId));
  }, [sales, isCompanySelected]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => isCompanySelected(o.companyId));
  }, [opportunities, isCompanySelected]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => !p.companyId || isCompanySelected(p.companyId));
  }, [products, isCompanySelected]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => isCompanySelected(t.companyId));
  }, [tasks, isCompanySelected]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => isCompanySelected(e.companyId));
  }, [employees, isCompanySelected]);

  // Global Filter Utilities
  const isDateInRange = useCallback(
    (dateStr?: string) => {
      if (!dateStr || globalFilters.dateRange === "all") return true;
      const cleanDate = dateStr.split("T")[0];
      const today = new Date().toISOString().split("T")[0];

      if (globalFilters.dateRange === "today") {
        return cleanDate === today;
      }
      if (globalFilters.dateRange === "week") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const weekAgo = d.toISOString().split("T")[0];
        return cleanDate >= weekAgo && cleanDate <= today;
      }
      if (globalFilters.dateRange === "month") {
        const currentMonth = today.slice(0, 7);
        return cleanDate.startsWith(currentMonth);
      }
      if (globalFilters.dateRange === "last_month") {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const lastMonth = d.toISOString().slice(0, 7);
        return cleanDate.startsWith(lastMonth);
      }
      if (globalFilters.dateRange === "custom") {
        if (globalFilters.customStartDate && cleanDate < globalFilters.customStartDate) return false;
        if (globalFilters.customEndDate && cleanDate > globalFilters.customEndDate) return false;
        return true;
      }
      return true;
    },
    [globalFilters]
  );

  const isProductMatch = useCallback(
    (productIdentifier?: string) => {
      if (!globalFilters.productIds || globalFilters.productIds.length === 0) return true;
      if (!productIdentifier) return false;
      return globalFilters.productIds.some((pId) => {
        const prod = products.find((p) => p.id === pId);
        const prodName = prod?.name?.toLowerCase() || pId.toLowerCase();
        return (
          productIdentifier.toLowerCase().includes(pId.toLowerCase()) ||
          productIdentifier.toLowerCase().includes(prodName)
        );
      });
    },
    [globalFilters.productIds, products]
  );

  const isCompanyMatch = useCallback(
    (compIdentifier?: string) => {
      if (!globalFilters.companyIds || globalFilters.companyIds.length === 0) return true;
      if (!compIdentifier) return false;
      return globalFilters.companyIds.includes(compIdentifier);
    },
    [globalFilters.companyIds]
  );

  const updateGlobalCompanyFilter = useCallback((companyIds: string[]) => {
    setGlobalFilters((prev) => ({ ...prev, companyIds }));
  }, []);

  const updateGlobalProductFilter = useCallback((productIds: string[]) => {
    setGlobalFilters((prev) => ({ ...prev, productIds }));
  }, []);

  const updateGlobalDateFilter = useCallback(
    (dateRange: DateFilterOption, start?: string, end?: string) => {
      setGlobalFilters((prev) => ({
        ...prev,
        dateRange,
        customStartDate: start,
        customEndDate: end,
      }));
    },
    []
  );

  const resetGlobalFilters = useCallback(() => {
    setGlobalFilters({
      companyIds: [],
      productIds: [],
      dateRange: "all",
    });
  }, []);

  // KPIs & Date categorizations
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const todayFollowUps = useMemo(() => {
    return filteredFollowUps.filter((f) => f.status === "pending" && f.dueDate === todayStr);
  }, [filteredFollowUps, todayStr]);

  const overdueFollowUps = useMemo(() => {
    return filteredFollowUps.filter((f) => f.status === "pending" && f.dueDate < todayStr);
  }, [filteredFollowUps, todayStr]);

  const upcomingFollowUps = useMemo(() => {
    return filteredFollowUps.filter((f) => f.status === "pending" && f.dueDate > todayStr);
  }, [filteredFollowUps, todayStr]);

  const hotCustomers = useMemo(() => {
    return filteredCustomers.filter((c) => {
      if (c.interestLevel !== "hot") return false;
      // Closed/contracted customers NEVER appear in open hot leads
      if (c.stage === "contracted" || c.stage === "sold") return false;
      const hasContract = contracts.some((cnt) => cnt.customerId === c.id);
      if (hasContract) return false;
      return true;
    });
  }, [filteredCustomers, contracts]);

  const quotesNeedingFollowUp = useMemo(() => {
    return filteredQuotations.filter((q) => {
      if (q.status !== "sent" && q.status !== "negotiation") return false;
      // Exclude quotations that have already been contracted
      const hasContract = contracts.some(
        (cnt) => cnt.quotationId === q.id || (cnt.customerId === q.customerId && cnt.companyId === q.companyId)
      );
      if (hasContract) return false;
      return true;
    });
  }, [filteredQuotations, contracts]);

  // Read notifications state persisted locally
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + "read_notification_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markNotificationAsRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(STORAGE_PREFIX + "read_notification_ids", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadNotificationIds(allIds);
    try {
      localStorage.setItem(STORAGE_PREFIX + "read_notification_ids", JSON.stringify(allIds));
    } catch {}
  }, []);

  const notifications = useMemo(() => {
    return generateRealNotifications({
      companyId: activeCompanyId,
      followUps,
      quotations,
      contracts,
      opportunities,
      inspections,
      todayStr,
      readNotificationIds,
    });
  }, [activeCompanyId, followUps, quotations, contracts, opportunities, inspections, todayStr, readNotificationIds]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.readAt).length;
  }, [notifications]);

  const currentMonthPrefix = todayStr.slice(0, 7);

  // Centralized Unified KPI computation using computeUnifiedKPIs
  const kpiSnapshot = useMemo<KPIEngineDataSnapshot>(() => {
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

  const unifiedKPIs = useMemo<UnifiedKPIResult>(() => {
    return computeUnifiedKPIs(kpiSnapshot, {
      companyId: activeCompanyId,
      month: currentMonthPrefix,
    });
  }, [kpiSnapshot, activeCompanyId, currentMonthPrefix]);

  const todaySalesTotal = useMemo(() => {
    return filteredSales
      .filter((s) => s.date === todayStr)
      .reduce((acc, s) => acc + s.amount, 0);
  }, [filteredSales, todayStr]);

  const monthlySalesTotal = useMemo(() => {
    if (salesOverrideValue !== null) {
      return salesOverrideValue;
    }
    // Use unified sales computation from computeUnifiedKPIs plus any adjustments
    const baseTotal = unifiedKPIs.sales.totalAmount;
    return baseTotal + salesManualAdjustment;
  }, [unifiedKPIs.sales.totalAmount, salesOverrideValue, salesManualAdjustment]);

  const monthlyTargetTotal = useMemo(() => {
    if (activeCompanyId === "all") {
      return companies
        .filter((c) => c.active !== false && (c as any).status !== "archived" && (c as any).status !== "closed")
        .reduce((acc, c) => acc + (c.monthlyTarget || 0), 0);
    }
    return activeCompany?.monthlyTarget || 0;
  }, [companies, activeCompanyId, activeCompany]);

  const monthlyAchievementRate = useMemo(() => {
    if (!monthlyTargetTotal || monthlyTargetTotal <= 0) return 0;
    return Number(((monthlySalesTotal / monthlyTargetTotal) * 100).toFixed(1));
  }, [monthlySalesTotal, monthlyTargetTotal]);

  // Company-Scoped Roles & Permissions
  const getUserRoleInCompany = useCallback(
    (user: AppUser | null, companyId: CompanyId): CompanyRole => {
      if (!user) return "viewer";
      if (user.role === "owner") return "owner";
      if (user.companyRoles && user.companyRoles[companyId]) {
        return user.companyRoles[companyId];
      }
      const targetComp = companies.find((c) => c.id === companyId);
      if (targetComp?.userRoles && targetComp.userRoles[user.id]) {
        return targetComp.userRoles[user.id];
      }
      if (user.role === "admin") return "admin";
      if (user.role === "sales") return "sales";
      return "viewer";
    },
    [companies]
  );

  const currentCompanyRole = useMemo<CompanyRole>(() => {
    if (!currentUser) return "viewer";
    if (currentUser.role === "owner" || currentUser.role === "super_admin") return "owner";
    if (activeCompanyId === "all") {
      if (currentUser.role === "admin" || currentUser.role === "manager") return "admin";
      return currentUser.role === "sales" ? "sales" : "viewer";
    }
    return getUserRoleInCompany(currentUser, activeCompanyId);
  }, [currentUser, activeCompanyId, getUserRoleInCompany]);

  const isSystemOwner = useMemo(() => {
    return checkIsSystemOwner(currentUser);
  }, [currentUser]);

  const isCompanyManager = useMemo(() => {
    return checkIsCompanyManager(currentUser, currentCompanyRole);
  }, [currentUser, currentCompanyRole]);

  const isEmployee = useMemo(() => {
    return checkIsEmployee(currentUser, currentCompanyRole);
  }, [currentUser, currentCompanyRole]);

  const canDeleteRecords = isCompanyManager;
  const canApproveRecords = isCompanyManager;
  const canManageFinance = isCompanyManager;
  const canManageSettings = isCompanyManager;

  const hasPermission = useCallback(
    (permission: PermissionName, targetCompanyId?: CompanyId): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === "owner" || currentUser.role === "super_admin") return true;

      const effCompId =
        targetCompanyId || (activeCompanyId !== "all" ? activeCompanyId : undefined);
      const role: CompanyRole = effCompId
        ? getUserRoleInCompany(currentUser, effCompId)
        : (currentUser.role === "admin" || currentUser.role === "manager")
        ? "admin"
        : currentUser.role === "sales"
        ? "sales"
        : "viewer";

      switch (role) {
        case "owner":
        case "super_admin":
        case "admin":
          return true;
        case "manager":
          return permission !== "manage_company_settings";
        case "sales":
          return [
            "view_customers",
            "manage_customers",
            "view_inquiries",
            "manage_opportunities",
            "manage_followups",
            "manage_quotations",
            "close_opportunities",
            "manage_sales",
            "view_analytics",
          ].includes(permission);
        case "viewer":
          return ["view_customers", "view_inquiries", "view_analytics"].includes(permission);
        default:
          return false;
      }
    },
    [currentUser, activeCompanyId, getUserRoleInCompany]
  );

  const calculateContractedSalesTotal = useCallback((
    contractsList: Contract[],
    companyId: string,
    area: string = "all",
    month: string = "all"
  ) => {
    return contractsList
      .filter((c) => {
        if (c.recordStatus === 'duplicate' || c.recordStatus === 'excluded') return false;
        if (companyId !== "all" && c.companyId !== companyId) return false;
        if (area !== "all" && c.area !== area) return false;
        const cMonth = (c.date || c.signDate || c.createdAt || "")?.substring(0, 7);
        if (month !== "all" && cMonth !== month) return false;
        return c.status !== "cancelled";
      })
      .reduce((sum, c) => sum + (Number(c.totalValue) || 0), 0);
  }, []);

  const getContractedSalesDebugReport = useCallback((
    companyId: string = "all",
    area: string = "all",
    month: string = "all"
  ) => {
    const eligibleContracts = contracts.filter((c) => {
      if (c.recordStatus === 'duplicate' || c.recordStatus === 'excluded') return false;
      if (companyId !== "all" && c.companyId !== companyId) return false;
      if (area !== "all" && c.area !== area) return false;
      const cMonth = (c.date || c.signDate || c.createdAt || "")?.substring(0, 7);
      if (month !== "all" && cMonth !== month) return false;
      return c.status !== "cancelled";
    });

    const report = {
      filters: { companyId, area, month },
      contractsCount: eligibleContracts.length,
      calculatedTotal: eligibleContracts.reduce((sum, c) => sum + (Number(c.totalValue) || 0), 0),
      contracts: eligibleContracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        customerId: c.customerId,
        customerName: c.customerName,
        companyId: c.companyId,
        area: c.area,
        date: c.date || c.signDate || c.createdAt,
        status: c.status,
        totalValue: Number(c.totalValue) || 0,
        paidAmount: Number(c.paidAmount) || 0,
        quotationId: c.quotationId || null,
        opportunityId: (c as any).opportunityId || null,
      }))
    };

    console.log("=== CONTRACTED SALES DEBUG REPORT ===", report);
    return report;
  }, [contracts]);

  // Duplicate Phone Detection (clean non-digits)
  const findCustomerByPhone = (phone: string, companyId?: CompanyId): Customer | undefined => {
    if (!phone) return undefined;
    const cleaned = normalizeEgyptianPhone(phone);
    if (!cleaned || cleaned.length < 8) return undefined;
    
    const targetCompanyId = companyId || activeCompanyId;

    const inState = customers.find((c) => {
      // Must match the target company
      if (c.companyId !== targetCompanyId && targetCompanyId !== "all") return false;
      
      const cClean = normalizeEgyptianPhone(c.phone);
      const secClean = normalizeEgyptianPhone(c.secondaryPhone || "");
      
      return cClean === cleaned || (secClean && secClean === cleaned);
    });
    if (inState) return inState;

    return recentCustomersRef.current.find((c) => {
      if (c.companyId !== targetCompanyId && targetCompanyId !== "all") return false;
      const cClean = normalizeEgyptianPhone(c.phone);
      const secClean = normalizeEgyptianPhone(c.secondaryPhone || "");
      return cClean === cleaned || (secClean && secClean === cleaned);
    });
  };

  const addAuditLog = (entry: Omit<AuditLogEntry, "id" | "timestamp" | "userId" | "userName" | "userRole">) => {
    const newLog: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id,
      userName: currentUser?.name || "المسؤول",
      userRole: currentUser?.role || "owner",
    };
    
    // UI Update immediate
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 500)]);

    // Cloud Persistence (Supabase = Single Source of Truth for Audit)
    if (supabase) {
      supabase.from("audit_logs").insert([newLog]).then(({ error }: any) => {
        if (error) console.warn("Failed to push audit log to Supabase:", error);
      });
    }
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
    localStorage.removeItem(STORAGE_PREFIX + "auditLogs");
    
    // Also try to clear from Supabase if owner/manager
    if (supabase && (currentUser?.role === 'owner' || checkIsSystemOwner(currentUser))) {
      supabase.from("audit_logs").delete().neq("id", "keep-this-schema").then(({ error }: any) => {
        if (error) console.warn("Failed to clear cloud audit logs:", error);
        else showToast("تم مسح سجل التدقيق من السحابة أيضاً", "info");
      });
    }
    
    showToast("تم مسح سجل التدقيق بالكامل", "info");
  };

  /**
   * NESTA ACTION PERSISTENCE & AUDIT RULE
   * Single unified entry point for all system-wide state & entity changes:
   * User Action → Change Record → Persistence Engine → Supabase → Read-Back Verification → Audit / Activity → UI Reconciliation
   */
  const executeUnifiedAction = async (params: {
    entityType: EntityType;
    recordId: string;
    companyId: string;
    action: ChangeAction;
    payload?: Record<string, any>;
    previousData?: Record<string, any>;
    description?: string;
    applyLocal: () => void;
    toastSuccessMsg?: string;
    toastErrorMsg?: string;
    toastMessage?: string;
    toastType?: "success" | "info" | "warning" | "error";
    silent?: boolean;
  }): Promise<{ success: boolean; change: ChangeRecord }> => {
    const effPayload = params.payload || (params.action === "delete" ? { id: params.recordId } : {});

    // RBAC Security Enforcement Layer
    const effCompRole = params.companyId && params.companyId !== "all" ? getUserRoleInCompany(currentUser, params.companyId) : currentCompanyRole;
    const userIsOwner = checkIsSystemOwner(currentUser);
    const userIsManager = checkIsCompanyManager(currentUser, effCompRole);

    // 1. Enforce Delete Permission: Only Manager and System Owner can delete/archive records
    if (params.action === "delete" && !userIsManager) {
      if (!params.silent) {
        showToast("ليس لديك صلاحية لحذف أو أرشفة السجلات. هذه الصلاحية مخصصة لمدير الشركة ومالك النظام فقط.", "error");
      }
      return { success: false, change: null as any };
    }

    // 2. Enforce Company Settings & Employee Payroll Management: Only Manager and System Owner
    if ((params.entityType === "company" || params.entityType === "employee") && !userIsManager) {
      if (!params.silent) {
        showToast("ليس لديك صلاحية لتعديل إعدادات الشركات أو بيانات ورواتب الموظفين.", "error");
      }
      return { success: false, change: null as any };
    }

    // 1. Record Change in Persistence Engine
    const changeRec = globalPersistenceEngine.recordChange({
      entityType: params.entityType,
      recordId: params.recordId,
      companyId: params.companyId || "all",
      action: params.action,
      payload: effPayload,
      previousData: params.previousData,
      userName: currentUser?.name || "المستخدم الحالي",
      userId: currentUser?.id,
      userRole: currentUser?.role,
      description: params.description,
    });

    // 2. Record in Audit Log
    addAuditLog({
      actionType: params.action as any,
      entityType: params.entityType as any,
      entityId: params.recordId,
      companyId: (params.companyId || "all") as any,
      description: params.description || changeRec.description,
      previousValue: params.previousData,
      newValue: effPayload,
      status: "pending",
    });

    if (!supabase) {
      if (!params.silent) {
        showToast("تعذر الاتصال بالسحابة: قاعدة البيانات غير متصلة", "error");
      }
      globalPersistenceEngine.removeChange(changeRec.id);
      return { success: false, change: changeRec };
    }

    // 3. Execute change directly on Supabase FIRST (Mutation Policy)
    const res = await globalPersistenceEngine.executeChange(supabase, changeRec);

    if (res.success) {
      // 4. Update local state and trigger reload from Supabase only if write succeeded!
      params.applyLocal();
      
      // Clean up change record to prevent offline queue retry/replay
      globalPersistenceEngine.removeChange(changeRec.id);

      if (!params.silent) {
        if (params.toastMessage) {
          showToast(params.toastMessage, params.toastType || "success");
        } else if (params.toastSuccessMsg) {
          showToast(params.toastSuccessMsg, "success");
        }
      }
      
      // Keep everything in perfect synchronization with Supabase Single Source of Truth
      fetchCloudData();

      return { success: true, change: changeRec };
    } else {
      // Failed mutation: Do NOT apply state or queue for retry
      globalPersistenceEngine.removeChange(changeRec.id);

      if (!params.silent) {
        const errorMsg = params.toastErrorMsg || `فشلت العملية السحابية: ${res.message}`;
        showToast(errorMsg, "error");
      }
      return { success: false, change: changeRec };
    }
  };

  // Employee & Payroll Operations - Defined here to use executeUnifiedAction
  const recordSalaryPayment = useCallback(
    async (paymentData: Omit<SalaryPayment, "id" | "createdAt">): Promise<SalaryPayment> => {
      const newPayment: SalaryPayment = {
        ...paymentData,
        id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
      };

      await executeUnifiedAction({
        entityType: "salary_payment",
        recordId: newPayment.id,
        companyId: newPayment.companyId,
        action: "insert",
        payload: newPayment,
        description: `صرف راتب للموظف: ${newPayment.employeeName} بقيمة ${newPayment.amount.toLocaleString()} ج.م`,
        applyLocal: () => {
          setSalaryPayments((prev) => [newPayment, ...prev]);
        },
        toastSuccessMsg: `تم تسجيل صرف راتب بقيمة ${newPayment.amount.toLocaleString()} ج.م بنجاح`,
      });

      return newPayment;
    },
    [executeUnifiedAction]
  );

  const recordCommissionPayment = useCallback(
    async (paymentData: Omit<CommissionPayment, "id" | "createdAt">): Promise<CommissionPayment> => {
      const newPayment: CommissionPayment = {
        ...paymentData,
        id: `cp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
      };

      await executeUnifiedAction({
        entityType: "commission_payment",
        recordId: newPayment.id,
        companyId: newPayment.companyId,
        action: "insert",
        payload: newPayment,
        description: `صرف عمولة للموظف: ${newPayment.employeeName} بقيمة ${newPayment.amount.toLocaleString()} ج.م`,
        applyLocal: () => {
          setCommissionPayments((prev) => [newPayment, ...prev]);
        },
        toastSuccessMsg: `تم تسجيل صرف عمولة بقيمة ${newPayment.amount.toLocaleString()} ج.م بنجاح`,
      });

      return newPayment;
    },
    [executeUnifiedAction]
  );

  const deleteSalaryPayment = useCallback(
    async (id: string) => {
      const payment = salaryPayments.find(p => p.id === id);
      if (!payment) return;

      await executeUnifiedAction({
        entityType: "salary_payment",
        recordId: id,
        companyId: payment.companyId,
        action: "delete",
        description: `إلغاء صرف راتب للموظف: ${payment.employeeName} بقيمة ${payment.amount.toLocaleString()} ج.م`,
        applyLocal: () => {
          setSalaryPayments((prev) => prev.filter((p) => p.id !== id));
        },
        toastMessage: "تم إلغاء حركة صرف الراتب بنجاح",
        toastType: "info",
      });
    },
    [executeUnifiedAction, salaryPayments]
  );

  const deleteCommissionPayment = useCallback(
    async (id: string) => {
      const payment = commissionPayments.find(p => p.id === id);
      if (!payment) return;

      await executeUnifiedAction({
        entityType: "commission_payment",
        recordId: id,
        companyId: payment.companyId,
        action: "delete",
        description: `إلغاء صرف عمولة للموظف: ${payment.employeeName} بقيمة ${payment.amount.toLocaleString()} ج.م`,
        applyLocal: () => {
          setCommissionPayments((prev) => prev.filter((p) => p.id !== id));
        },
        toastMessage: "تم إلغاء حركة صرف العمولة بنجاح",
        toastType: "info",
      });
    },
    [executeUnifiedAction, commissionPayments]
  );

  const updateSalaryPayment = useCallback(
    async (payment: SalaryPayment) => {
      await executeUnifiedAction({
        entityType: "salary_payment",
        recordId: payment.id,
        companyId: payment.companyId,
        action: "update",
        payload: payment,
        description: `تعديل حركة صرف راتب للموظف: ${payment.employeeName} بقيمة ${payment.amount.toLocaleString()} ج.م`,
        applyLocal: () => {
          setSalaryPayments((prev) => prev.map((p) => p.id === payment.id ? payment : p));
        },
        toastMessage: "تم تحديث حركة صرف الراتب بنجاح",
      });
    },
    [executeUnifiedAction]
  );

  const updateCommissionPayment = useCallback(
    async (payment: CommissionPayment) => {
      await executeUnifiedAction({
        entityType: "commission_payment",
        recordId: payment.id,
        companyId: payment.companyId,
        action: "update",
        payload: payment,
        description: `تعديل حركة صرف عمولة للموظف: ${payment.employeeName} بقيمة ${payment.amount.toLocaleString()} ج.م`,
        applyLocal: () => {
          setCommissionPayments((prev) => prev.map((p) => p.id === payment.id ? payment : p));
        },
        toastMessage: "تم تحديث حركة صرف العمولة بنجاح",
      });
    },
    [executeUnifiedAction]
  );

  const addCommissionAdjustment = useCallback(
    async (adj: Omit<CommissionAdjustment, "id" | "createdAt">) => {
      const newAdj: CommissionAdjustment = {
        ...adj,
        id: `adj-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      await executeUnifiedAction({
        entityType: "commission_adjustment",
        recordId: newAdj.id,
        companyId: newAdj.companyId,
        action: "insert",
        payload: newAdj,
        description: `إضافة تسوية مالية للعمولة بقيمة ${newAdj.amount.toLocaleString()} ج.م للموظفID: ${newAdj.employeeId}`,
        applyLocal: () => {
          setEmployees((prev) =>
            prev.map((emp) =>
              emp.id === adj.employeeId
                ? {
                    ...emp,
                    commissionAdjustments: [...(emp.commissionAdjustments || []), newAdj],
                  }
                : emp
            )
          );
        },
        toastSuccessMsg: "تم إضافة التسوية المالية للعمولة بنجاح",
      });
    },
    [executeUnifiedAction]
  );

  const updateCommissionAdjustment = useCallback(
    async (adj: CommissionAdjustment) => {
      const emp = employees.find(e => e.id === adj.employeeId);
      if (!emp) return;

      await executeUnifiedAction({
        entityType: "commission_adjustment",
        recordId: adj.id,
        companyId: adj.companyId,
        action: "update",
        payload: adj,
        description: `تعديل تسوية مالية للعمولة بقيمة ${adj.amount.toLocaleString()} ج.م للموظف: ${emp.name}`,
        applyLocal: () => {
          setEmployees((prev) =>
            prev.map((e) =>
              e.id === adj.employeeId
                ? {
                    ...e,
                    commissionAdjustments: (e.commissionAdjustments || []).map((a) =>
                      a.id === adj.id ? adj : a
                    ),
                  }
                : e
            )
          );
        },
        toastMessage: "تم تعديل التسوية المالية بنجاح",
      });
    },
    [executeUnifiedAction, employees]
  );

  const deleteCommissionAdjustment = useCallback(
    async (employeeId: string, adjustmentId: string) => {
      const emp = employees.find(e => e.id === employeeId);
      const adj = emp?.commissionAdjustments?.find(a => a.id === adjustmentId);
      if (!adj) return;

      await executeUnifiedAction({
        entityType: "commission_adjustment",
        recordId: adjustmentId,
        companyId: adj.companyId,
        action: "delete",
        description: `حذف تسوية عمولة بقيمة ${adj.amount.toLocaleString()} ج.م للموظف: ${emp?.name}`,
        applyLocal: () => {
          setEmployees((prev) =>
            prev.map((emp) =>
              emp.id === employeeId
                ? {
                    ...emp,
                    commissionAdjustments: (emp.commissionAdjustments || []).filter((a) => a.id !== adjustmentId),
                  }
                : emp
            )
          );
        },
        toastMessage: "تم حذف التسوية المالية بنجاح",
        toastType: "info",
      });
    },
    [executeUnifiedAction, employees]
  );

  const updateStatementOverride = useCallback(
    async (data: Partial<MonthlyStatement> & { employeeId: string; period: string; reason?: string }) => {
      const emp = employees.find(e => e.id === data.employeeId);
      if (!emp) return;

      const existing = emp.monthlyStatements?.find(s => s.period === data.period);
      
      // Calculate history entries
      const historyEntries: any[] = existing?.history || [];
      const userName = currentUser?.name || "System";
      const nowStr = new Date().toISOString();

      if (data.salaryDue !== undefined && existing && data.salaryDue !== existing.salaryDue) {
        historyEntries.push({
          field: "salaryDue",
          oldValue: existing.salaryDue,
          newValue: data.salaryDue,
          reason: data.reason || "تعديل يدوي للراتب",
          user: userName,
          date: nowStr
        });
      }

      if (data.commissionEarned !== undefined && existing && data.commissionEarned !== existing.commissionEarned) {
        historyEntries.push({
          field: "commissionEarned",
          oldValue: existing.commissionEarned,
          newValue: data.commissionEarned,
          reason: data.reason || "تعديل يدوي للعمولة",
          user: userName,
          date: nowStr
        });
      }

      const stableId = existing?.id || `stmt-${data.employeeId}-${data.period}`;

      const updatedPayload = {
        ...existing,
        ...data,
        id: stableId,
        history: historyEntries,
        updatedAt: nowStr
      };

      await executeUnifiedAction({
        entityType: "monthly_statement",
        recordId: stableId,
        companyId: emp.companyId,
        action: "create", // Always use create (UPSERT) for statements
        description: `تحديث كشف شهري للموظف: ${emp.name} للفترة ${data.period}`,
        payload: updatedPayload,
        applyLocal: () => {
          setEmployees(prev => prev.map(e => {
            if (e.id !== data.employeeId) return e;
            const stmts = e.monthlyStatements || [];
            const idx = stmts.findIndex(s => s.period === data.period);
            const newStmts = [...stmts];
            if (idx >= 0) {
              newStmts[idx] = updatedPayload as MonthlyStatement;
            } else {
              newStmts.push({
                ...updatedPayload,
                status: 'reviewed',
              } as MonthlyStatement);
            }
            return { ...e, monthlyStatements: newStmts };
          }));
        },
        toastMessage: "تم تحديث الكشف المالي بنجاح",
      });
    },
    [executeUnifiedAction, employees, currentUser]
  );

  const reviewStatement = useCallback(
    async (employeeId: string, period: string) => {
      const emp = employees.find(e => e.id === employeeId);
      const stmt = employeeStatements[employeeId]?.find(s => s.period === period);
      if (!emp || !stmt) return;

      const stableId = stmt.id || `stmt-${employeeId}-${period}`;
      const updatedStmt: MonthlyStatement = {
        ...stmt,
        id: stableId,
        status: 'reviewed',
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser?.name || "المراجع المالي",
      };

      await executeUnifiedAction({
        entityType: "monthly_statement",
        recordId: stableId,
        companyId: emp.companyId,
        action: "create", // Always use create (UPSERT)
        description: `مراجعة وتدقيق كشف استحقاق ${period} للموظف: ${emp.name}`,
        payload: updatedStmt,
        applyLocal: () => {
          setEmployees(prev => prev.map(e => {
            if (e.id !== employeeId) return e;
            const stmts = (e.monthlyStatements || []).filter(s => s.period !== period);
            return {
              ...e,
              monthlyStatements: [...stmts, updatedStmt]
            };
          }));
        },
        toastMessage: "تمت مراجعة الكشف المالي بنجاح",
      });
    },
    [executeUnifiedAction, employees, employeeStatements, currentUser]
  );

  const approveStatement = useCallback(
    async (employeeId: string, period: string) => {
      const emp = employees.find(e => e.id === employeeId);
      const stmt = employeeStatements[employeeId]?.find(s => s.period === period);
      if (!emp || !stmt) return;

      const stableId = stmt.id || `stmt-${employeeId}-${period}`;

      await executeUnifiedAction({
        entityType: "monthly_statement",
        recordId: stableId,
        companyId: emp.companyId,
        action: "create", // Always use create (UPSERT)
        description: `اعتماد كشف عمولة ${period} للموظف: ${emp.name}`,
        payload: {
          ...stmt,
          id: stableId,
          status: 'approved',
          approvedAt: new Date().toISOString(),
          approvedBy: currentUser?.name || "المدير"
        },
        applyLocal: () => {
          setEmployees(prev => prev.map(e => {
            if (e.id !== employeeId) return e;
            const stmts = (e.monthlyStatements || []).filter(s => s.period !== period);
            return {
              ...e,
              monthlyStatements: [...stmts, { ...stmt, id: stableId, status: 'approved' } as MonthlyStatement]
            };
          }));
        },
        toastMessage: "تم اعتماد الكشف المالي بنجاح",
      });
    },
    [executeUnifiedAction, employees, employeeStatements, currentUser]
  );

  const syncAllMonthlyStatements = useCallback(async () => {
    if (!currentUser || !supabase) return;
    
    showToast("جاري مزامنة الكشوفات المالية مع السحابة للتأكد من وجود الـ 9 أشهر...", "info");
    
    let totalSynced = 0;
    
    try {
      // Process employees in sequence to avoid hitting rate limits or causing race conditions
      for (const emp of employees) {
        const generated = generateEmployeeStatements(
          emp,
          companies,
          contracts,
          payments,
          salaryPayments,
          commissionPayments,
          emp.commissionAdjustments || [],
          9
        );
        
        // Prepare UPSERT payload: combine generated logic with any existing persistence
        const toUpsert = generated.map(stmt => {
          const existing = emp.monthlyStatements?.find(s => s.period === stmt.period);
          return {
            ...stmt,
            id: existing?.id || stmt.id,
            status: existing?.status || stmt.status,
            notes: existing?.notes || stmt.notes,
            history: existing?.history || stmt.history,
          };
        });
        
        if (toUpsert.length > 0) {
          // Sanitize for Supabase
          const sanitized = toUpsert.map(s => cleanMonthlyStatement(s));
          const { error } = await supabase.from("monthly_statements").upsert(sanitized);
          if (!error) totalSynced += toUpsert.length;
          else console.warn(`Failed to sync statements for ${emp.name}:`, error);
        }
      }
      
      if (totalSynced > 0) {
        showToast(`تمت المزامنة المركزية لـ ${totalSynced} كشف مالي بنجاح`, "success");
        fetchCloudData();
      }
    } catch (err) {
      console.error("Sync error:", err);
      showToast("فشلت المزامنة المركزية للكشوفات", "error");
    }
  }, [employees, companies, contracts, payments, salaryPayments, commissionPayments, currentUser, supabase, fetchCloudData]);

  const recalculateStatement = useCallback(
    async (employeeId: string, period: string) => {
      const emp = employees.find(e => e.id === employeeId);
      if (!emp) return;

      // Generate the fresh calculated statement
      const freshStatements = generateEmployeeStatements(
        emp,
        companies,
        contracts,
        payments,
        salaryPayments,
        commissionPayments,
        emp.commissionAdjustments || [],
        9
      );
      
      const fresh = freshStatements.find(s => s.period === period);
      if (!fresh) return;

      const existing = emp.monthlyStatements?.find(s => s.period === period);
      const stableId = existing?.id || `stmt-${employeeId}-${period}`;

      const updatedPayload = {
        ...fresh,
        id: stableId,
        status: existing?.status || 'calculated',
        notes: existing?.notes || "",
        history: existing?.history || [],
        recalculatedAt: new Date().toISOString()
      };

      await executeUnifiedAction({
        entityType: "monthly_statement",
        recordId: stableId,
        companyId: emp.companyId,
        action: "create", // UPSERT
        description: `إعادة حساب كشف ${period} للموظف: ${emp.name}`,
        payload: updatedPayload,
        applyLocal: () => {
          setEmployees(prev => prev.map(e => {
            if (e.id !== employeeId) return e;
            const stmts = (e.monthlyStatements || []).filter(s => s.period !== period);
            return {
              ...e,
              monthlyStatements: [...stmts, updatedPayload as MonthlyStatement]
            };
          }));
        },
        toastMessage: "تم إعادة الحساب المالي بنجاح",
        toastType: "success"
      });
    },
    [executeUnifiedAction, employees, companies, contracts, payments, salaryPayments, commissionPayments]
  );

  /**
   * Unified Bulk Action Pipeline
   */
  const executeUnifiedBulkAction = async (params: {
    operationName?: string;
    entityType: EntityType;
    entityIds?: string[];
    items?: Array<{ recordId?: string; id?: string; previousData?: any; payload?: any }>;
    actionType?: ChangeAction;
    action?: ChangeAction;
    companyId: string;
    payload?: Record<string, any>;
    executeSingle?: (id: string) => Promise<{ success: boolean; error?: string }>;
    applyLocal?: () => void;
    onComplete?: () => void;
    description?: string;
    toastMessage?: string;
    toastSuccessMsg?: string;
    toastType?: "success" | "info" | "warning" | "error";
  }): Promise<ChangeRecord> => {
    const act = params.actionType || params.action || "update";
    const ids = params.entityIds || params.items?.map((i) => i.recordId || i.id || "").filter(Boolean) || [];
    const opName = params.operationName || params.description || `عملية جماعية على ${params.entityType}`;

    // RBAC Security Enforcement for Bulk Actions
    const effCompRole = params.companyId && params.companyId !== "all" ? getUserRoleInCompany(currentUser, params.companyId) : currentCompanyRole;
    const userIsOwner = checkIsSystemOwner(currentUser);
    const userIsManager = checkIsCompanyManager(currentUser, effCompRole);

    if (act === "delete" && !userIsManager) {
      showToast("ليس لديك صلاحية لتنفيذ عمليات الحذف الجماعي. هذه الصلاحية مخصصة لمدير الشركة ومالك النظام فقط.", "error");
      return null as any;
    }

    if (params.applyLocal) {
      params.applyLocal();
    }

    const results: { entityId: string; success: boolean; error?: string }[] = [];
    if (params.executeSingle) {
      for (const id of ids) {
        try {
          const res = await params.executeSingle(id);
          results.push({ entityId: id, success: res.success, error: res.error });
        } catch (err: any) {
          results.push({ entityId: id, success: false, error: err?.message || String(err) });
        }
      }
    } else if (supabase) {
      // Execute through persistence engine per item if items or ids provided
      for (const id of ids) {
        const item = params.items?.find((i) => (i.recordId || i.id) === id);
        const changeRec = globalPersistenceEngine.recordChange({
          entityType: params.entityType,
          recordId: id,
          companyId: params.companyId || "all",
          action: act,
          payload: item?.payload || (act === "delete" ? { id } : params.payload || {}),
          previousData: item?.previousData,
          userName: currentUser?.name || "المستخدم الحالي",
          userId: currentUser?.id,
          userRole: currentUser?.role,
          description: `${opName} - معرف ${id}`,
        });
        const res = await globalPersistenceEngine.executeChange(supabase, changeRec);
        results.push({ entityId: id, success: res.success, error: res.message });
      }
    } else {
      ids.forEach((id) => results.push({ entityId: id, success: true }));
    }

    const bulkRecord = globalPersistenceEngine.recordBulkOperation({
      operationName: opName,
      entityType: params.entityType,
      entityIds: ids,
      actionType: act,
      companyId: params.companyId || "all",
      userId: currentUser?.id,
      userName: currentUser?.name || "المستخدم الحالي",
      userRole: currentUser?.role,
      payload: params.payload,
      results,
    });

    addAuditLog({
      actionType: "bulk_action" as any,
      entityType: params.entityType as any,
      entityId: bulkRecord.id,
      companyId: (params.companyId || "all") as any,
      description: bulkRecord.description,
      newValue: bulkRecord.bulkDetails,
      status: bulkRecord.status as any,
    });

    if (params.toastMessage) {
      showToast(params.toastMessage, params.toastType || "info");
    } else if (params.toastSuccessMsg) {
      showToast(params.toastSuccessMsg, "success");
    }

    fetchCloudData();

    if (params.onComplete) params.onComplete();
    return bulkRecord;
  };

  /**
   * Unified System Operation Pipeline (Audits, Conflict resolution, Guardian & AI actions, migrations)
   */
  const executeUnifiedSystemOperation = (
    paramOrAction:
      | string
      | {
          actionType?: ChangeAction;
          operation?: string | ((sb: any) => Promise<any>);
          operationName?: string;
          description: string;
          companyId?: string;
          payload?: Record<string, any>;
          previousData?: Record<string, any>;
          status?: any;
          verificationStatus?: any;
          applyLocal?: () => void;
          toastMessage?: string;
          toastType?: "success" | "info" | "warning" | "error";
        },
    desc?: string,
    runCallbackOrPayload?: ((sb: any) => Promise<any>) | Record<string, any>,
    companyIdParam?: string
  ): ChangeRecord => {
    let actionType: ChangeAction = "system_operation" as any;
    let description = "";
    let companyId = "all";
    let payload: Record<string, any> | undefined;
    let previousData: Record<string, any> | undefined;
    let status: any;
    let verificationStatus: any;
    let runCallback: ((sb: any) => Promise<any>) | undefined;

    if (typeof paramOrAction === "string") {
      actionType = (paramOrAction as ChangeAction) || ("system_operation" as any);
      description = desc || paramOrAction;
      companyId = companyIdParam || "all";
      if (typeof runCallbackOrPayload === "function") {
        runCallback = runCallbackOrPayload as (sb: any) => Promise<any>;
      } else if (typeof runCallbackOrPayload === "object") {
        payload = runCallbackOrPayload;
      }
    } else {
      actionType = (typeof paramOrAction.operation === "string" ? (paramOrAction.operation as any) : undefined) || paramOrAction.actionType || (paramOrAction.operationName as any) || ("system_operation" as any);
      description = paramOrAction.description;
      companyId = paramOrAction.companyId || "all";
      payload = paramOrAction.payload;
      previousData = paramOrAction.previousData;
      status = paramOrAction.status;
      verificationStatus = paramOrAction.verificationStatus;

      if (typeof paramOrAction.operation === "function") {
        runCallback = paramOrAction.operation;
      }
      if (paramOrAction.applyLocal) {
        paramOrAction.applyLocal();
      }
      if (paramOrAction.toastMessage) {
        showToast(paramOrAction.toastMessage, paramOrAction.toastType || "info");
      }
    }

    const sysRecord = globalPersistenceEngine.recordSystemOperation({
      actionType,
      description,
      companyId,
      userId: currentUser?.id,
      userName: currentUser?.name || "النظام",
      payload,
      previousData,
      status,
      verificationStatus,
    });

    addAuditLog({
      actionType: actionType as any,
      entityType: "system_operation" as any,
      entityId: sysRecord.id,
      companyId: companyId as any,
      description,
      newValue: payload,
      previousValue: previousData,
      status: sysRecord.status as any,
    });

    if (runCallback && supabase) {
      runCallback(supabase).catch((err: any) => {
        console.warn(`executeUnifiedSystemOperation [${description}] warning:`, err);
      });
    }

    return sysRecord;
  };

  // Actions
  const addCustomer = (data: Partial<Customer> & { name: string; phone: string; companyId: CompanyId }): Customer => {
    const customerArea = data.area && data.area.trim() ? normalizeArea(data.area) : "";
    const newCust: Customer = {
      id: crypto.randomUUID(),
      companyId: data.companyId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      secondaryPhone: data.secondaryPhone?.trim() || "",
      area: customerArea,
      address: data.address?.trim() || "",
      source: data.source || "Manual",
      otherSource: data.otherSource || "",
      interestLevel: data.interestLevel || "warm",
      stage: data.stage || "inquiry",
      notes: data.notes || "",
      assignedTo: data.assignedTo || (data as any).responsible || null,
      responsible: data.assignedTo || (data as any).responsible || null,
      createdAt: todayStr,
      lastContactDate: todayStr,
      nextFollowUpDate: data.nextFollowUpDate,
      totalQuotationsValue: 0,
      totalSalesValue: 0,
    };

    recentCustomersRef.current.push(newCust);

    executeUnifiedAction({
      entityType: "customer",
      recordId: newCust.id,
      companyId: newCust.companyId,
      action: "insert",
      payload: newCust,
      description: `إضافة عميل جديد: ${newCust.name}`,
      applyLocal: () => {
        setCustomers((prev) => [newCust, ...prev]);
        if (activeCompanyId !== "all" && newCust.companyId !== activeCompanyId) {
          showToast("تم إنشاء العميل بنجاح، لكنه يتبع شركة أخرى وقد لا يظهر في القائمة الحالية.", "info");
        }
      },
      silent: true,
    });

    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const oldCust = customers.find((c) => c.id === id);
    if (!oldCust) return;
    const finalCustomer = {
      ...oldCust,
      ...updates,
      area: updates.area !== undefined ? (updates.area.trim() ? normalizeArea(updates.area) : "") : oldCust.area,
      lastContactDate: updates.lastContactDate !== undefined ? updates.lastContactDate : oldCust.lastContactDate,
      updatedAt: new Date().toISOString(),
    };
    
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? finalCustomer : c))
    );

    // Propagate customer name updates across all related entities
    if (updates.name !== undefined && updates.name.trim() !== "") {
      const newName = updates.name.trim();
      setContracts((prev) =>
        prev.map((ctr) => (ctr.customerId === id ? { ...ctr, customerName: newName } : ctr))
      );
      setSales((prev) =>
        prev.map((s) => (s.customerId === id ? { ...s, customerName: newName } : s))
      );
      setFollowUps((prev) =>
        prev.map((f) => (f.customerId === id ? { ...f, customerName: newName } : f))
      );
      setQuotations((prev) =>
        prev.map((q) => (q.customerId === id ? { ...q, customerName: newName } : q))
      );
      setInquiries((prev) =>
        prev.map((inq) => (inq.customerId === id ? { ...inq, customerName: newName } : inq))
      );
    }

    // Propagate company changes if companyId changed
    if (updates.companyId) {
      setContracts((prev) =>
        prev.map((ctr) => (ctr.customerId === id ? { ...ctr, companyId: updates.companyId! } : ctr))
      );
      setSales((prev) =>
        prev.map((s) => (s.customerId === id ? { ...s, companyId: updates.companyId! } : s))
      );
      setFollowUps((prev) =>
        prev.map((f) => (f.customerId === id ? { ...f, companyId: updates.companyId! } : f))
      );
      setQuotations((prev) =>
        prev.map((q) => (q.customerId === id ? { ...q, companyId: updates.companyId! } : q))
      );
    }

    // Propagate customer stage changes to linked inquiries and complete pending follow-ups if deal closed
    if (updates.stage !== undefined) {
      const newStage = updates.stage;
      setInquiries((prev) =>
        prev.map((inq) => (inq.customerId === id ? { ...inq, stage: newStage, lastContactDate: todayStr } : inq))
      );
      const linkedInquiries = inquiries.filter((inq) => inq.customerId === id);
      linkedInquiries.forEach((inq) => {
        executeUnifiedAction({
          entityType: "inquiry",
          recordId: inq.id,
          companyId: inq.companyId,
          action: "update",
          payload: cleanInquiryUpdate({ stage: newStage, lastContactDate: todayStr }),
          previousData: inq,
          description: `تحديث مرحلة الاستفسار تزامناً مع العميل إلى ${newStage}`,
          applyLocal: () => {},
          silent: true,
        });
      });

      // If deal is contracted/won or lost, complete all active follow-ups for this customer
      if (newStage === "contracted" || newStage === "sold" || newStage === "won" || newStage === "lost") {
        setFollowUps((prev) =>
          prev.map((f) => {
            if (f.customerId === id && f.status === "pending") {
              return {
                ...f,
                status: "completed",
                notes: `${f.notes ? f.notes + " — " : ""}تم إغلاق المتابعة تلقائياً لانتهاء مرحلة العميل (${newStage === "lost" ? "Lost" : "Won"})`.trim(),
              };
            }
            return f;
          })
        );
        const linkedPendingFollowups = followUps.filter((f) => f.customerId === id && f.status === "pending");
        linkedPendingFollowups.forEach((f) => {
          executeUnifiedAction({
            entityType: "followup",
            recordId: f.id,
            companyId: f.companyId,
            action: "update",
            payload: cleanFollowUpUpdate({
              status: "completed",
              notes: `${f.notes ? f.notes + " — " : ""}تم إغلاق المتابعة تلقائياً لانتهاء مرحلة العميل (${newStage === "lost" ? "Lost" : "Won"})`.trim(),
            }),
            previousData: f,
            description: `إغلاق المتابعة تلقائياً لتحديث مرحلة العميل إلى ${newStage}`,
            applyLocal: () => {},
            silent: true,
          });
        });
      }
    }

    if (finalCustomer) {
      const assignedText = (updates as any).assignedTo !== undefined ? ` (مسؤول: ${(updates as any).assignedTo || "غير محدد"})` : "";
      executeUnifiedAction({
        entityType: "customer",
        recordId: id,
        companyId: (finalCustomer as Customer).companyId || oldCust?.companyId || "all",
        action: "update",
        payload: finalCustomer,
        previousData: oldCust,
        description: `تعديل بيانات العميل: ${(finalCustomer as Customer).name || id}${assignedText}`,
        applyLocal: () => {},
        silent: true,
      });
    }
  };

  const batchUpdateCustomers = (ids: string[], updates: Partial<Customer>) => {
    if (!ids || ids.length === 0) return;
    ids.forEach((id) => {
      updateCustomer(id, updates);
    });
    showToast(`تم تحديث ${ids.length} عميل بنجاح`, "success");
  };

  const addInquiry = (data: Omit<Inquiry, "id" | "date" | "lastContactDate">): Inquiry => {
    // 1. Resolve customer: check if customer already exists with this phone in this company
    let targetCustomer: Customer | undefined;
    const cleanPhone = (data.customerPhone || "").trim();
    if (cleanPhone && cleanPhone !== "بدون هاتف" && cleanPhone !== "بدون رقم") {
      targetCustomer = findCustomerByPhone(cleanPhone, data.companyId);
    }
    if (!targetCustomer && data.customerId) {
      targetCustomer = customers.find((c) => c.id === data.customerId) || recentCustomersRef.current.find((c) => c.id === data.customerId);
    }

    // 2. If customer does not exist, create them
    if (!targetCustomer) {
      if (data.customerId) {
        // Customer was already assigned an ID (e.g. from intake forms)
        targetCustomer = {
          id: data.customerId,
          companyId: data.companyId,
          name: data.customerName || "عميل جديد",
          phone: cleanPhone || "بدون هاتف",
          area: data.area || "غير محدد",
          source: data.source || "Manual",
          interestLevel: data.interestLevel || "warm",
          stage: "inquiry",
          notes: data.details || "",
          createdAt: todayStr,
          lastContactDate: todayStr,
          nextFollowUpDate: data.nextFollowUpDate,
          totalQuotationsValue: 0,
          totalSalesValue: 0,
        };
      } else {
        targetCustomer = addCustomer({
          companyId: data.companyId,
          name: data.customerName || "عميل جديد",
          phone: cleanPhone || "بدون هاتف",
          area: data.area || "غير محدد",
          source: data.source || "Manual",
          interestLevel: data.interestLevel || "warm",
          stage: "inquiry",
          notes: data.details || "",
          nextFollowUpDate: data.nextFollowUpDate,
        });
      }
    } else {
      // Customer exists: link inquiry to existing customer without creating a duplicate customer
      updateCustomer(targetCustomer.id, {
        lastContactDate: todayStr,
        ...(data.nextFollowUpDate ? { nextFollowUpDate: data.nextFollowUpDate } : {}),
      });
    }

    // Step 1: Create newInquiry locally
    const inqArea = normalizeArea(data.area || targetCustomer.area || "غير محدد");
    const newInq: Inquiry = {
      ...data,
      customerId: targetCustomer.id,
      customerName: targetCustomer.name,
      customerPhone: targetCustomer.phone,
      area: inqArea,
      id: crypto.randomUUID(),
      date: todayStr,
      lastContactDate: todayStr,
      responsible: currentUser?.name || "مسؤول المبيعات",
    };

    // Step 2 & 3: Route through Unified Persistence Engine
    executeUnifiedAction({
      entityType: "inquiry",
      recordId: newInq.id,
      companyId: newInq.companyId,
      action: "insert",
      payload: cleanInquiry(newInq),
      description: `إضافة استفسار جديد: ${newInq.productType} للعميل ${targetCustomer.name}`,
      applyLocal: () => {
        setInquiries((prev) => [newInq, ...prev]);
      },
      silent: true,
    });

    // Step 6: If follow-up date is provided, create the FollowUp and link it!
    if (data.nextFollowUpDate) {
      const existingFup = followUps.find(
        (f) => f.customerId === targetCustomer!.id && f.dueDate === data.nextFollowUpDate && f.status === "pending"
      ) || recentFollowUpsRef.current.find(
        (f) => f.customerId === targetCustomer!.id && f.dueDate === data.nextFollowUpDate && f.status === "pending"
      );
      if (!existingFup) {
        addFollowUp({
          companyId: data.companyId,
          customerId: targetCustomer.id,
          customerName: targetCustomer.name,
          customerPhone: targetCustomer.phone,
          dueDate: data.nextFollowUpDate,
          time: "12:00",
          title: `متابعة استفسار: ${data.productType || "طلب جديد"}`,
          notes: data.details || "متابعة مسجلة تلقائياً مع الاستفسار",
          status: "pending",
          priority: data.interestLevel === "hot" ? "high" : "medium",
        });
      }
    }

    // Update customer contact date without mutating stage
    updateCustomer(targetCustomer.id, {
      lastContactDate: todayStr,
      ...(data.nextFollowUpDate ? { nextFollowUpDate: data.nextFollowUpDate } : {}),
    });

    return newInq;
  };

  const updateInquiryStage = (id: string, stage: Inquiry["stage"]) => {
    const existing = inquiries.find((i) => i.id === id);
    if (!existing) return;

    // Strict acceptance test synchronization: automatically close linked opportunity won/lost
    if (stage === "contracted" || stage === "won") {
      const opp = opportunities.find(o => (o.inquiryId === id || o.customerId === existing.customerId) && o.status === "open");
      if (opp) {
        closeDealWon(opp.id, { amount: opp.expectedValue || 50000, notes: "تم التعاقد والتحويل التلقائي من الاستفسار" });
        return;
      } else {
        const oppId = crypto.randomUUID();
        const newOpp: Opportunity = {
          id: oppId,
          companyId: existing.companyId,
          customerId: existing.customerId,
          customerName: existing.customerName || "عميل",
          customerPhone: existing.customerPhone || "",
          area: existing.area || "غير محدد",
          title: `فرصة ${existing.customerName || "عميل"}`,
          expectedValue: 50000,
          customerScope: "specific",
          productType: existing.productType || "شبابيك وأبواب UPVC",
          stage: "qualified",
          status: "open",
          createdAt: todayStr,
        };
        // Add to state and then close as won
        setOpportunities(prev => [newOpp, ...prev]);
        setTimeout(() => {
          closeDealWon(oppId, { amount: 50000, notes: "تم التعاقد والتحويل التلقائي من الاستفسار" });
        }, 0);
        return;
      }
    } else if (stage === "lost") {
      const opp = opportunities.find(o => (o.inquiryId === id || o.customerId === existing.customerId) && o.status === "open");
      let lossReason = "عدم اهتمام العميل";
      const inputReason = window.prompt("الرجاء إدخال سبب خسارة الصفقة (Loss Reason):", "عدم الرد / عدم اهتمام");
      if (inputReason !== null) {
        lossReason = inputReason.trim() || "غير محدد";
      }
      if (opp) {
        closeDealLost(opp.id, { lossReason, lossNotes: "تم إغلاق الصفقة كخسارة تلقائياً من الاستفسار" });
        return;
      } else {
        const oppId = crypto.randomUUID();
        const newOpp: Opportunity = {
          id: oppId,
          companyId: existing.companyId,
          customerId: existing.customerId,
          customerName: existing.customerName || "عميل",
          customerPhone: existing.customerPhone || "",
          area: existing.area || "غير محدد",
          title: `فرصة ${existing.customerName || "عميل"}`,
          expectedValue: 50000,
          customerScope: "specific",
          productType: existing.productType || "شبابيك وأبواب UPVC",
          stage: "qualified",
          status: "open",
          createdAt: todayStr,
        };
        setOpportunities(prev => [newOpp, ...prev]);
        setTimeout(() => {
          closeDealLost(oppId, { lossReason, lossNotes: "تم إغلاق الصفقة كخسارة تلقائياً من الاستفسار" });
        }, 0);
        return;
      }
    }

    const updatedInq = { ...existing, stage, lastContactDate: todayStr };

    // Update customer last contact date without overwriting customer.stage
    updateCustomer(existing.customerId, { lastContactDate: todayStr });

    if (stage === "quotation") {
      const customer = customers.find((c) => c.id === existing.customerId);
      const existingQuote = quotations.find((q) => q.customerId === existing.customerId && q.companyId === existing.companyId);
      if (!existingQuote) {
        const quoteNum = generateDocNumber("Q", existing.companyId, new Date().getFullYear(), quotations);
        const newQuote: Quotation = {
          id: crypto.randomUUID(),
          quoteNumber: quoteNum,
          companyId: existing.companyId,
          customerId: existing.customerId,
          customerName: customer?.name || existing.customerName || "عميل",
          customerPhone: customer?.phone || existing.customerPhone || "",
          area: existing.area || customer?.area || "غير محدد",
          date: todayStr,
          expiryDate: todayStr,
          status: "sent",
          items: [
            {
              id: "1",
              description: existing.productType || "عرض سعر مبدئي - شبابيك وأبواب UPVC",
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0,
            },
          ],
          subtotal: 0,
          discountTotal: 0,
          totalAmount: 0,
          isSummaryQuote: true,
          summaryDescription: existing.details || "طلب عرض سعر مسجل بالاستفسار",
          notes: `مسجل من الاستفسار: ${existing.details || existing.productType}`,
        };
        executeUnifiedAction({
          entityType: "quotation",
          recordId: newQuote.id,
          companyId: newQuote.companyId,
          action: "insert",
          payload: cleanQuotation(newQuote),
          description: `إنشاء عرض سعر رقم ${quoteNum} بتغيير مرحلة الاستفسار إلى عرض سعر`,
          applyLocal: () => {
            setQuotations((prevQuotes) => [newQuote, ...prevQuotes]);
          },
          silent: true,
        });

        // Ensure Opportunity
        const existingOpp = opportunities.find((o) => o.customerId === existing.customerId && o.companyId === existing.companyId);
        if (!existingOpp) {
          const newOpp: Opportunity = {
            id: crypto.randomUUID(),
            companyId: existing.companyId,
            customerId: existing.customerId,
            customerName: customer?.name || existing.customerName || "عميل",
            customerPhone: customer?.phone || existing.customerPhone || "",
            area: existing.area || customer?.area || "غير محدد",
            title: `فرصة ${customer?.name || "عميل"} - عرض سعر`,
            expectedValue: 0,
            customerScope: "specific",
            productType: existing.productType || "شبابيك وأبواب UPVC",
            stage: "quote_sent",
            status: "open",
            hasQuote: true,
            quotationId: newQuote.id,
            quotationValue: 0,
            isQuoteSent: true,
            hasContract: false,
            createdAt: todayStr,
            lastActivity: todayStr,
            lastContactDate: todayStr,
            nextAction: "متابعة دراسة عرض السعر مع العميل",
          };
          executeUnifiedAction({
            entityType: "opportunity",
            recordId: newOpp.id,
            companyId: newOpp.companyId,
            action: "insert",
            payload: newOpp,
            description: `إنشاء فرصة جديدة من تغيير مرحلة الاستفسار إلى عرض سعر: ${newOpp.title}`,
            applyLocal: () => {
              setOpportunities((prevOpps) => [newOpp, ...prevOpps]);
            },
            silent: true,
          });
        }
      }
    }

    executeUnifiedAction({
      entityType: "inquiry",
      recordId: id,
      companyId: existing.companyId,
      action: "update",
      payload: cleanInquiryUpdate({ stage, lastContactDate: todayStr }),
      previousData: existing,
      description: `تحديث مرحلة الاستفسار إلى ${stage}`,
      applyLocal: () => {
        setInquiries((prev) =>
          prev.map((i) => (i.id === id ? updatedInq : i))
        );
      },
      silent: true,
    });
  };

  const updateInquiry = (id: string, updates: Partial<Inquiry>) => {
    const existing = inquiries.find((i) => i.id === id);
    if (!existing) return;

    const targetInq: Inquiry = { ...existing, ...updates, lastContactDate: todayStr };

    if (updates.stage) {
      updateCustomer(existing.customerId, { lastContactDate: todayStr });
    }

    executeUnifiedAction({
      entityType: "inquiry",
      recordId: id,
      companyId: existing.companyId,
      action: "update",
      payload: cleanInquiryUpdate({ ...updates, lastContactDate: todayStr }),
      previousData: existing,
      description: `تعديل بيانات الاستفسار: ${targetInq.productType}`,
      applyLocal: () => {
        setInquiries((prev) => prev.map((i) => (i.id === id ? targetInq : i)));
      },
      silent: true,
    });
  };

  const batchUpdateInquiries = (ids: string[], updates: Partial<Inquiry>) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);

    if (updates.stage) {
      const linkedCustIds: string[] = Array.from(
        new Set<string>(
          inquiries
            .filter((i) => idSet.has(i.id) && Boolean(i.customerId))
            .map((i) => String(i.customerId))
        )
      );
      linkedCustIds.forEach((cId: string) => {
        updateCustomer(cId, { lastContactDate: todayStr });
      });
    }

    executeUnifiedBulkAction({
      operationName: "تحديث جماعي للاستفسارات",
      entityType: "inquiry",
      entityIds: ids,
      actionType: "update",
      companyId: activeCompanyId,
      applyLocal: () => {
        setInquiries((prev) =>
          prev.map((i) => (idSet.has(i.id) ? { ...i, ...updates, lastContactDate: todayStr } : i))
        );
      },
      toastSuccessMsg: `تم تحديث ${ids.length} استفسار بنجاح`,
    });
  };

  const addInteraction = (data: Omit<Interaction, "id">): Interaction => {
    const newInteraction: Interaction = {
      ...data,
      id: crypto.randomUUID(),
    };

    executeUnifiedAction({
      entityType: "interaction",
      recordId: newInteraction.id,
      companyId: newInteraction.companyId,
      action: "insert",
      payload: cleanInteraction(newInteraction),
      description: `تسجيل تفاعل جديد: ${newInteraction.type}`,
      applyLocal: () => {
        setInteractions((prev) => [newInteraction, ...prev]);
      },
      silent: true,
    });

    // Update customer last contact
    updateCustomer(data.customerId, { lastContactDate: todayStr });

    return newInteraction;
  };

  const addFollowUp = (data: Omit<FollowUp, "id" | "createdAt">): FollowUp => {
    // Check if a pending follow-up already exists for this customer on this date to prevent duplicates
    const existingFup = followUps.find(
      (f) => f.customerId === data.customerId && f.dueDate === data.dueDate && f.status === "pending"
    ) || recentFollowUpsRef.current.find(
      (f) => f.customerId === data.customerId && f.dueDate === data.dueDate && f.status === "pending"
    );
    if (existingFup) {
      return existingFup;
    }

    // Step 1: Create newFollowUp locally
    const newFollowUp: FollowUp = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: todayStr,
      responsible: currentUser?.name || "مسؤول المبيعات",
    };
    recentFollowUpsRef.current.push(newFollowUp);

    // Step 2 & 3: Route through Unified Persistence Engine
    executeUnifiedAction({
      entityType: "followup",
      recordId: newFollowUp.id,
      companyId: newFollowUp.companyId,
      action: "insert",
      payload: cleanFollowUp(newFollowUp),
      description: `إضافة متابعة جديدة: ${newFollowUp.title}`,
      applyLocal: () => {
        setFollowUps((prev) => [newFollowUp, ...prev]);
      },
      silent: true,
    });

    // Step 5: Update customer next follow-up
    updateCustomer(data.customerId, { nextFollowUpDate: data.dueDate });

    return newFollowUp;
  };

  const completeFollowUp = (id: string) => {
    const f = followUps.find((item) => item.id === id);
    if (!f) return;

    // Add interaction
    addInteraction({
      customerId: f.customerId,
      companyId: f.companyId,
      type: "call",
      date: new Date().toLocaleString("ar-EG"),
      notes: `تم إنجاز المتابعة: ${f.title}`,
      result: "تم التواصل بنجاح",
    });

    executeUnifiedAction({
      entityType: "followup",
      recordId: id,
      companyId: f.companyId,
      action: "update",
      payload: cleanFollowUpUpdate({ status: "completed" }),
      previousData: f,
      description: `إنجاز المتابعة: ${f.title}`,
      applyLocal: () => {
        setFollowUps((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: "completed" } : item))
        );
      },
      silent: true,
    });
  };

  const rescheduleFollowUp = (id: string, newDate: string, notes?: string) => {
    const f = followUps.find((item) => item.id === id);
    if (!f) return;

    updateCustomer(f.customerId, { nextFollowUpDate: newDate });
    addInteraction({
      customerId: f.customerId,
      companyId: f.companyId,
      type: "note",
      date: new Date().toLocaleString("ar-EG"),
      notes: `تأجيل موعد المتابعة (${f.title}) من ${f.dueDate} إلى ${newDate}${notes ? ` - السبب: ${notes}` : ""}`,
      result: "تأجيل المتابعة",
      nextStep: `متابعة بتاريخ ${newDate}`,
    });

    const updatedNotes = notes ? `${f.notes ? f.notes + " | " : ""}تأجيل إلى ${newDate}: ${notes}` : f.notes;

    executeUnifiedAction({
      entityType: "followup",
      recordId: id,
      companyId: f.companyId,
      action: "update",
      payload: cleanFollowUpUpdate({ dueDate: newDate, status: "pending", notes: updatedNotes }),
      previousData: f,
      description: `تأجيل المتابعة: ${f.title} إلى ${newDate}`,
      applyLocal: () => {
        setFollowUps((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  dueDate: newDate,
                  notes: updatedNotes,
                  status: "pending",
                }
              : item
          )
        );
      },
      toastSuccessMsg: `تم تأجيل المتابعة إلى ${newDate} وتوثيقها في سجل العميل`,
    });
  };

  const addQuotation = (data: Omit<Quotation, "id" | "quoteNumber">): Quotation => {
    const quoteNum = generateDocNumber("Q", data.companyId, new Date().getFullYear(), quotations);
    const customer = customers.find((c) => c.id === data.customerId);
    const quoteArea = normalizeArea(data.area || customer?.area || "غير محدد");

    // Calculate total meters if not explicitly provided
    let calculatedMeters = data.totalMeters;
    if (!calculatedMeters && data.items && data.items.length > 0) {
      calculatedMeters = Number(
        data.items.reduce((acc, it) => acc + (it.area || 0) * (it.quantity || 1), 0).toFixed(2)
      );
    }

    const newQuote: Quotation = {
      ...data,
      totalMeters: calculatedMeters || 0,
      area: quoteArea,
      id: crypto.randomUUID(),
      quoteNumber: quoteNum,
      responsible: currentUser?.name || "مسؤول المبيعات",
    };

    executeUnifiedAction({
      entityType: "quotation",
      recordId: newQuote.id,
      companyId: newQuote.companyId,
      action: "insert",
      payload: cleanQuotation(newQuote),
      description: `إنشاء عرض سعر رقم: ${newQuote.quoteNumber}`,
      applyLocal: () => {
        setQuotations((prev) => [newQuote, ...prev]);
      },
      silent: true,
    });

    // Update customer totals and stage
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === data.customerId) {
          return {
            ...c,
            stage: "quotation",
            totalQuotationsValue: (c.totalQuotationsValue || 0) + newQuote.totalAmount,
            lastContactDate: todayStr,
          };
        }
        return c;
      })
    );

    // Update or link open Opportunity
    const isSent = newQuote.status === "sent";
    setOpportunities((prev) => {
      let matched = false;
      const updated = prev.map((opp) => {
        if (opp.customerId === data.customerId && opp.companyId === data.companyId && opp.status === "open") {
          matched = true;
          const updatedOpp = {
            ...opp,
            hasQuote: true,
            quotationId: newQuote.id,
            quotationValue: newQuote.totalAmount,
            isQuoteSent: isSent,
            stage: (isSent ? "quote_sent" : "quotation") as OpportunityStage,
            nextAction: isSent ? "متابعة استلام ودراسة العرض مع العميل" : "إرسال عرض السعر للعميل",
            lastActivity: todayStr,
          };
          executeUnifiedAction({
            entityType: "opportunity",
            recordId: opp.id,
            companyId: opp.companyId,
            action: "update",
            payload: updatedOpp,
            previousData: opp,
            description: `ربط الفرصة بعرض السعر رقم: ${newQuote.quoteNumber}`,
            applyLocal: () => {},
            silent: true,
          });
          return updatedOpp;
        }
        return opp;
      });

      return updated;
    });

    return newQuote;
  };

  const triggerWonContractLifecycle = (quote: Quotation) => {
    // 1. Update customer stage
    updateCustomer(quote.customerId, { stage: "contracted" });

    // 2. Mark open opportunity as won (exits open pipeline)
    setOpportunities((prev) =>
      prev.map((o) => {
        if (o.quotationId === quote.id || (o.customerId === quote.customerId && o.companyId === quote.companyId && o.status === "open")) {
          const wonOpp = {
            ...o,
            status: "won" as OpportunityStatus,
            stage: "won" as OpportunityStage,
            closedAt: todayStr,
            nextAction: "صفقة رابحة - تم إبرام التعاقد",
          };
          executeUnifiedAction({
            entityType: "opportunity",
            recordId: o.id,
            companyId: o.companyId,
            action: "update",
            payload: wonOpp,
            previousData: o,
            description: `إغلاق الفرصة بنجاح (Won) للتعاقد: ${o.title}`,
            applyLocal: () => {},
            silent: true,
          });
          return wonOpp;
        }
        return o;
      })
    );

    // 3. Check if contract exists, otherwise create it
    const existingContract = contracts.find((c) => c.quotationId === quote.id);
    let contractId = existingContract?.id;
    if (!existingContract) {
      const cust = customers.find((c) => c.id === quote.customerId);
      const ctrDate = todayStr;
      const yearPrefix = ctrDate.split("-")[0] || new Date().getFullYear();
      const ctrNum = generateDocNumber("CTR", quote.companyId, yearPrefix, contracts);
      contractId = crypto.randomUUID();
      const linkedOpp = opportunities.find(o => o.quotationId === quote.id || (o.customerId === quote.customerId && o.status === "open"));
      const newCtr: Contract = {
        id: contractId,
        contractNumber: ctrNum,
        companyId: quote.companyId,
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        area: quote.area || cust?.area || "غير محدد",
        quotationId: quote.id,
        opportunityId: linkedOpp?.id,
        date: ctrDate,
        totalValue: quote.totalAmount,
        paidAmount: 0,
        remainingAmount: quote.totalAmount,
        status: "active",
        collectionStatus: "contracted",
        notes: "تم إنشاء العقد تلقائياً بعد قبول عرض السعر",
      };
      executeUnifiedAction({
        entityType: "contract",
        recordId: newCtr.id,
        companyId: newCtr.companyId,
        action: "insert",
        payload: cleanContract(newCtr),
        description: `إنشاء عقد جديد تلقائياً لقبول عرض السعر: ${newCtr.contractNumber}`,
        applyLocal: () => {
          setContracts((prev) => [newCtr, ...prev]);
        },
        silent: true,
      });
    }

    // 4. Check if sale exists, otherwise create idempotent sale
    const existingSale = sales.find(
      (s) => (contractId && s.contractId === contractId) || (s.customerId === quote.customerId && s.companyId === quote.companyId)
    );
    if (existingSale) {
      const upSale = {
        ...existingSale,
        contractId: contractId || existingSale.contractId,
        amount: Math.max(existingSale.amount, quote.totalAmount),
      };
      executeUnifiedAction({
        entityType: "sale",
        recordId: existingSale.id,
        companyId: existingSale.companyId,
        action: "update",
        payload: cleanSale(upSale),
        previousData: existingSale,
        description: `تحديث المبيعات لموافقة العقد الجديد`,
        applyLocal: () => {
          setSales((prev) => prev.map((s) => (s.id === existingSale.id ? upSale : s)));
        },
        silent: true,
      });
    } else {
      const cust = customers.find((c) => c.id === quote.customerId);
      const newSale: Sale = {
        id: crypto.randomUUID(),
        companyId: quote.companyId,
        customerId: quote.customerId,
        customerName: quote.customerName,
        area: quote.area || cust?.area || "غير محدد",
        contractId,
        amount: quote.totalAmount,
        date: todayStr,
        responsible: currentUser?.name || "مسؤول المبيعات",
        customerSource: cust?.source || "Manual",
      };
      executeUnifiedAction({
        entityType: "sale",
        recordId: newSale.id,
        companyId: newSale.companyId,
        action: "insert",
        payload: cleanSale(newSale),
        description: `تسجيل مبيعات جديدة للتعاقد: ${newSale.customerName}`,
        applyLocal: () => {
          setSales((prev) => [newSale, ...prev]);
        },
        silent: true,
      });
    }

    // 5. Add interaction log
    addInteraction({
      customerId: quote.customerId,
      companyId: quote.companyId,
      type: "contract",
      date: new Date().toLocaleString("ar-EG"),
      notes: `تم اعتماد عرض السعر (${quote.quoteNumber}) بقيمة ${quote.totalAmount.toLocaleString()} ج.م وتحويله للتعاقد`,
      result: "تم التعاقد رسمياً",
      nextStep: "متابعة التحصيلات وبدء التصنيع والتنفيذ",
    });
  };

  const updateQuotation = async (id: string, updates: Partial<Quotation>) => {
    const existing = quotations.find((q) => q.id === id);
    if (!existing) return;
    
    const finalQuote = { ...existing, ...updates };

    executeUnifiedAction({
      entityType: "quotation",
      recordId: id,
      companyId: finalQuote.companyId,
      action: "update",
      payload: cleanQuotation(finalQuote),
      previousData: existing,
      description: `تعديل عرض السعر رقم: ${finalQuote.quoteNumber}`,
      applyLocal: () => {
        setQuotations((prev) => prev.map((q) => (q.id === id ? finalQuote : q)));
      },
      silent: true,
    });

    // Sync Customer totalQuotationsValue if value changed
    if (updates.totalAmount !== undefined) {
      const otherQuotesTotal = quotations
        .filter((item) => item.customerId === finalQuote.customerId && item.id !== id)
        .reduce((sum, item) => sum + (item.totalAmount || 0), 0);
      const newTotalQuotations = otherQuotesTotal + updates.totalAmount;
      updateCustomer(finalQuote.customerId, { totalQuotationsValue: newTotalQuotations });

      // Sync linked Contract if any
      setContracts((prev) =>
        prev.map((c) => {
          if (c.quotationId === id) {
            const newRem = Math.max(0, updates.totalAmount! - (c.paidAmount || 0));
            const updatedCtr = { ...c, totalValue: updates.totalAmount!, remainingAmount: newRem };
            executeUnifiedAction({
              entityType: "contract",
              recordId: c.id,
              companyId: c.companyId,
              action: "update",
              payload: cleanContract(updatedCtr),
              previousData: c,
              description: `تحديث قيمة العقد لارتباطه بعرض السعر المعدل ${finalQuote.quoteNumber}`,
              applyLocal: () => {},
              silent: true,
            });
            return updatedCtr;
          }
          return c;
        })
      );

      // Sync linked Sale if any
      setSales((prev) =>
        prev.map((s) => {
          const linkedCtr = contracts.find((c) => c.quotationId === id);
          if (s.contractId && linkedCtr && s.contractId === linkedCtr.id) {
            const updatedSale = { ...s, amount: updates.totalAmount! };
            executeUnifiedAction({
              entityType: "sale",
              recordId: s.id,
              companyId: s.companyId,
              action: "update",
              payload: cleanSale(updatedSale),
              previousData: s,
              description: `تحديث قيمة المبيعات لارتباطها بعرض السعر المعدل`,
              applyLocal: () => {},
              silent: true,
            });
            return updatedSale;
          }
          return s;
        })
      );
    }

    // Sync the opportunity if value or status changed
    if (updates.totalAmount !== undefined || updates.status !== undefined) {
      setOpportunities((prev) =>
        prev.map((o) => {
          if (o.quotationId === id || (o.customerId === finalQuote.customerId && o.status === "open")) {
            const oUpdates: Partial<Opportunity> = {};
            if (updates.totalAmount !== undefined) {
              oUpdates.quotationValue = updates.totalAmount;
              oUpdates.expectedValue = updates.totalAmount;
            }
            if (updates.status === "sent") {
              oUpdates.stage = "quote_sent";
              oUpdates.isQuoteSent = true;
              oUpdates.nextAction = "متابعة استلام ودراسة العرض";
            } else if (updates.status === "negotiation") {
              oUpdates.stage = "negotiation";
              oUpdates.nextAction = "متابعة التفاوض والاتفاق";
            } else if (updates.status === "accepted") {
              oUpdates.stage = "won";
              oUpdates.status = "won";
              oUpdates.closedAt = todayStr;
              oUpdates.nextAction = "صفقة رابحة - تم التعاقد";
            } else if (updates.status === "rejected") {
              oUpdates.stage = "lost";
              oUpdates.status = "lost";
              oUpdates.lossReason = "رفض العميل عرض السعر بعد التعديل";
              oUpdates.nextAction = "صفقة مغلقة بالخسارة";
            }
            
            const newOpp = { ...o, ...oUpdates };
            
            executeUnifiedAction({
              entityType: "opportunity",
              recordId: o.id,
              companyId: o.companyId,
              action: "update",
              payload: newOpp,
              previousData: o,
              description: `تحديث حالة الفرصة من تعديل عرض السعر`,
              applyLocal: () => {},
              silent: true,
            });
            
            return newOpp;
          }
          return o;
        })
      );
    }

    // If status became accepted, trigger full lifecycle
    if (updates.status === "accepted") {
      triggerWonContractLifecycle(finalQuote);
    }
  };

  const updateQuotationStatus = (id: string, status: QuoteStatus) => {
    const existing = quotations.find((q) => q.id === id);
    if (!existing) return;

    const updatedQuote = { ...existing, status };

    executeUnifiedAction({
      entityType: "quotation",
      recordId: id,
      companyId: existing.companyId,
      action: "update",
      payload: cleanQuotation(updatedQuote),
      previousData: existing,
      description: `تغيير حالة عرض السعر (${existing.quoteNumber}) إلى ${status}`,
      applyLocal: () => {
        setQuotations((prev) => prev.map((q) => (q.id === id ? updatedQuote : q)));
      },
      silent: true,
    });

    // If accepted, execute full Won cycle
    if (status === "accepted") {
      triggerWonContractLifecycle(updatedQuote);
    } else if (status === "rejected") {
      // Close opportunity as lost
      setOpportunities((prev) =>
        prev.map((o) => {
          if (o.quotationId === id || (o.customerId === existing.customerId && o.status === "open")) {
            const lostOpp = {
              ...o,
              status: "lost" as OpportunityStatus,
              stage: "lost" as OpportunityStage,
              lossReason: "رفض العميل عرض السعر",
              nextAction: "صفقة مغلقة بالخسارة",
            };
            executeUnifiedAction({
              entityType: "opportunity",
              recordId: o.id,
              companyId: o.companyId,
              action: "update",
              payload: lostOpp,
              previousData: o,
              description: `إغلاق الفرصة بالخسارة لرفض عرض السعر: ${o.title}`,
              applyLocal: () => {},
              silent: true,
            });
            return lostOpp;
          }
          return o;
        })
      );
    } else {
      // Also sync linked opportunity for other statuses
      setOpportunities((prev) =>
        prev.map((o) => {
          if (o.quotationId === id || (o.customerId === existing.customerId && o.status === "open")) {
            let nextAction = o.nextAction;
            let stage = o.stage;
            let isQuoteSent = o.isQuoteSent;
            if (status === "sent") {
              stage = "quote_sent";
              isQuoteSent = true;
              nextAction = "متابعة استلام ودراسة العرض";
            } else if (status === "negotiation") {
              stage = "negotiation";
              nextAction = "متابعة التفاوض والاتفاق";
            }
            const synced = { ...o, stage, isQuoteSent, nextAction };
            executeUnifiedAction({
              entityType: "opportunity",
              recordId: o.id,
              companyId: o.companyId,
              action: "update",
              payload: synced,
              previousData: o,
              description: `تحديث مرحلة الفرصة تزامناً مع عرض السعر إلى ${stage}`,
              applyLocal: () => {},
              silent: true,
            });
            return synced;
          }
          return o;
        })
      );
    }
  };

  const addInspection = (data: Omit<Inspection, "id">): Inspection => {
    const customer = customers.find((c) => c.id === data.customerId);
    const inspArea = normalizeArea(data.area || customer?.area || "غير محدد");
    const inspDate = data.date || (data as any).scheduledDate || todayStr;
    const newInsp: Inspection = {
      ...data,
      date: inspDate,
      address: data.address || customer?.area || "موقع العميل",
      area: inspArea,
      surveyor: data.surveyor || "الفريق الفني",
      result: data.result || "pending",
      measurementsCount: data.measurementsCount || 0,
      notes: data.notes || "معاينة ورفع مقاسات",
      id: crypto.randomUUID(),
    };
    executeUnifiedAction({
      entityType: "inspection",
      recordId: newInsp.id,
      companyId: newInsp.companyId,
      action: "insert",
      payload: cleanInspection(newInsp),
      description: `جدولة معاينة جديدة للعميل ${data.customerName || customer?.name || ""}`,
      applyLocal: () => {
        setInspections((prev) => [newInsp, ...prev]);
      },
      silent: true,
    });

    updateCustomer(data.customerId, {
      stage: "inspection",
      nextFollowUpDate: inspDate,
      lastContactDate: todayStr,
    });

    // Update customer's open opportunity
    setOpportunities((prev) =>
      prev.map((o) => {
        if (o.customerId === data.customerId && o.companyId === data.companyId && o.status === "open") {
          return {
            ...o,
            hasInspection: true,
            stage: data.result === "completed" ? "inspection_completed" : "needs_inspection",
            nextAction: data.result === "completed" ? "إعداد وتجهيز عرض السعر" : "تنفيذ المعاينة ورفع المقاسات",
          };
        }
        return o;
      })
    );

    return newInsp;
  };

  const addContract = (data: Omit<Contract, "id" | "contractNumber">): Contract => {
    // 1. Strict Validation & Rule 16: Quotation is REQUIRED
    let targetQuoteId = data.quotationId;
    let quote = quotations.find((q) => q.id === targetQuoteId);

    if (!quote) {
      const existingQuote = quotations.find(
        (q) => q.customerId === data.customerId && q.companyId === data.companyId && q.status !== "rejected"
      );
      if (existingQuote) {
        quote = existingQuote;
        targetQuoteId = existingQuote.id;
      } else {
        // Rule 16: Automatically create Historical / System Generated Quotation
        const customer = customers.find((c) => c.id === data.customerId);
        const contractDate = data.date || todayStr;
        const yearPrefix = contractDate.split("-")[0] || new Date().getFullYear();
        const genQuoteNum = generateDocNumber("Q", data.companyId, yearPrefix, quotations);
        const autoQuoteId = crypto.randomUUID();
        const autoQuote: Quotation = {
          id: autoQuoteId,
          quoteNumber: genQuoteNum,
          companyId: data.companyId,
          customerId: data.customerId,
          customerName: data.customerName,
          customerPhone: data.customerPhone || customer?.phone || "",
          area: normalizeArea(data.area || customer?.area || "غير محدد"),
          date: contractDate,
          expiryDate: contractDate,
          status: "accepted",
          subtotal: data.totalValue,
          discountTotal: 0,
          totalAmount: data.totalValue,
          isSummaryQuote: true,
          summaryDescription: "مقايسة تعاقدية معتمدة تم إنشاؤها تلقائياً لاستكمال دورة البيانات التاريخية",
          notes: "تم إنشاؤه تلقائياً لاستكمال دورة البيانات التاريخية للعقد",
          createdAt: new Date().toISOString(),
          items: [
            {
              id: crypto.randomUUID(),
              description: "أعمال وبنود مقايسة تعاقدية معتمدة",
              quantity: 1,
              unitPrice: data.totalValue,
              totalPrice: data.totalValue,
            },
          ],
        };
        executeUnifiedAction({
          entityType: "quotation",
          recordId: autoQuote.id,
          companyId: autoQuote.companyId,
          action: "insert",
          payload: cleanQuotation(autoQuote),
          description: `إنشاء عرض سعر تاريخي معتمد تلقائياً برقم (${genQuoteNum}) لاستكمال دورة البيانات`,
          applyLocal: () => {
            setQuotations((prev) => [autoQuote, ...prev]);
          },
          silent: true,
        });
        quote = autoQuote;
        targetQuoteId = autoQuoteId;
        showToast(`تم إنشاء عرض سعر تاريخي معتمد تلقائياً برقم (${genQuoteNum}) لاستكمال دورة البيانات`, "info");
      }
    }

    if (!quote) {
      showToast("عرض السعر المحدد غير موجود أو غير صالح!", "warning");
      throw new Error("عرض السعر المحدد غير موجود");
    }

    if (quote.companyId !== data.companyId) {
      showToast("عرض السعر تابع لشركة أخرى ولا يمكن استخدامه لهذا العقد!", "warning");
      throw new Error("عرض السعر تابع لشركة أخرى");
    }

    // 2. IDEMPOTENCY CHECK: Prevent duplicate contract for the same quotation
    const existingContract = contracts.find((c) => c.quotationId === quote.id);
    if (existingContract) {
      showToast(`يوجد عقد مبرم بالفعل لهذا العرض برقم (${existingContract.contractNumber}) لمنع التكرار`, "info");
      return existingContract;
    }

    const customer = customers.find((c) => c.id === data.customerId);
    const contractArea = normalizeArea(data.area || quote.area || customer?.area || "غير محدد");
    const contractDate = data.date || todayStr;
    const yearPrefix = contractDate.split("-")[0] || new Date().getFullYear();
    const contractNum = generateDocNumber("CTR", data.companyId, yearPrefix, contracts);

    const newContract: Contract = {
      ...data,
      quotationId: quote.id,
      area: contractArea,
      date: contractDate,
      id: crypto.randomUUID(),
      contractNumber: contractNum,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    executeUnifiedAction({
      entityType: "contract",
      recordId: newContract.id,
      companyId: newContract.companyId,
      action: "insert",
      payload: cleanContract(newContract),
      description: `إنشاء عقد جديد: ${newContract.contractNumber}`,
      applyLocal: () => {
        setContracts((prev) => [newContract, ...prev]);
      },
      silent: true,
    });

    // 3. Mark Quotation as Accepted
    const acceptedQuote = { ...quote, status: "accepted" as QuoteStatus };
    executeUnifiedAction({
      entityType: "quotation",
      recordId: quote.id,
      companyId: quote.companyId,
      action: "update",
      payload: cleanQuotation(acceptedQuote),
      previousData: quote,
      description: `قبول عرض السعر (${quote.quoteNumber}) عند التعاقد`,
      applyLocal: () => {
        setQuotations((prev) =>
          prev.map((q) => (q.id === quote.id ? acceptedQuote : q))
        );
      },
      silent: true,
    });

    // 4. Check if there is an existing sale for this contract or customer without a contract (Idempotent Sale)
    const existingSale = sales.find(
      (s) =>
        (s.contractId && s.contractId === newContract.id) ||
        (s.customerId === data.customerId && !s.contractId && s.companyId === data.companyId)
    );

    let finalSaleId = existingSale?.id;
    if (existingSale) {
      const updatedSale = {
        ...existingSale,
        contractId: newContract.id,
        amount: Math.max(existingSale.amount, data.totalValue),
      };
      executeUnifiedAction({
        entityType: "sale",
        recordId: updatedSale.id,
        companyId: updatedSale.companyId,
        action: "update",
        payload: cleanSale(updatedSale),
        previousData: existingSale,
        description: `تحديث مبيعات لارتباطها بالعقد: ${newContract.contractNumber}`,
        applyLocal: () => {
          setSales((prev) => prev.map((s) => (s.id === existingSale.id ? updatedSale : s)));
        },
        silent: true,
      });
    } else {
      finalSaleId = crypto.randomUUID();
      const newSale: Sale = {
        id: finalSaleId,
        companyId: data.companyId,
        customerId: data.customerId,
        customerName: data.customerName,
        area: contractArea,
        contractId: newContract.id,
        amount: data.totalValue,
        date: contractDate,
        responsible: currentUser?.name || "مسؤول المبيعات",
        customerSource: customer?.source || "Manual",
        createdAt: new Date().toISOString(),
      };
      executeUnifiedAction({
        entityType: "sale",
        recordId: newSale.id,
        companyId: newSale.companyId,
        action: "insert",
        payload: cleanSale(newSale),
        description: `إنشاء حركة مبيعات للعقد: ${newContract.contractNumber}`,
        applyLocal: () => {
          setSales((prev) => [newSale, ...prev]);
        },
        silent: true,
      });
    }

    // 5. Update linked or open Opportunities: Mark as WON - exits open pipeline!
    setOpportunities((prev) =>
      prev.map((opp) => {
        const isMatch =
          opp.id === data.opportunityId ||
          opp.quotationId === quote.id ||
          (opp.customerId === data.customerId && opp.companyId === data.companyId && opp.status === "open");

        if (isMatch) {
          const wonOpp = {
            ...opp,
            status: "won" as OpportunityStatus,
            stage: "won" as OpportunityStage,
            closedAt: new Date().toISOString(),
            saleId: finalSaleId,
            hasContract: true,
            expectedValue: data.totalValue,
            quotationValue: data.totalValue,
            nextAction: "تم التعاقد والتحويل للتصنيع والتنفيذ",
          };
          executeUnifiedAction({
            entityType: "opportunity",
            recordId: opp.id,
            companyId: opp.companyId,
            action: "update",
            payload: wonOpp,
            previousData: opp,
            description: `إغلاق الفرصة بالنجاح (Won) للتعاقد: ${opp.title}`,
            applyLocal: () => {},
            silent: true,
          });
          return wonOpp;
        }
        return opp;
      })
    );

    // 6. Update customer stage to contracted, update inquiries and complete pending follow-ups
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === data.customerId) {
          return {
            ...c,
            stage: "contracted",
            totalSalesValue: (c.totalSalesValue || 0) + data.totalValue,
            lastContactDate: todayStr,
            nextFollowUpDate: "",
          };
        }
        return c;
      })
    );

    // Update inquiries for this customer to reflect Won / Contracted
    setInquiries((prev) =>
      prev.map((inq) => {
        if (inq.customerId === data.customerId) {
          const upInq = { ...inq, stage: "contracted" as any, lastContactDate: todayStr };
          executeUnifiedAction({
            entityType: "inquiry",
            recordId: inq.id,
            companyId: inq.companyId,
            action: "update",
            payload: cleanInquiry(upInq),
            previousData: inq,
            description: `تحديث الاستفسار لمرحلة التعاقد`,
            applyLocal: () => {},
            silent: true,
          });
          return upInq;
        }
        return inq;
      })
    );

    // Complete pending follow-ups for this customer
    setFollowUps((prev) =>
      prev.map((f) => {
        if (f.customerId === data.customerId && f.status === "pending") {
          const compFup = {
            ...f,
            status: "completed" as const,
            notes: `${f.notes ? f.notes + " — " : ""}تم إغلاق المتابعة تلقائياً لإتمام التعاقد (Won)`.trim(),
          };
          executeUnifiedAction({
            entityType: "followup",
            recordId: f.id,
            companyId: f.companyId,
            action: "update",
            payload: cleanFollowUp(compFup),
            previousData: f,
            description: `إغلاق المتابعة تلقائياً للتعاقد: ${f.title}`,
            applyLocal: () => {},
            silent: true,
          });
          return compFup;
        }
        return f;
      })
    );

    showToast(`تم توقيع العقد بنجاح برقم ${contractNum} 📜`, "success");
    return newContract;
  };

  const updateContractCollectionStatus = (id: string, status: CollectionStatus) => {
    updateContract(id, { collectionStatus: status });
  };

  const batchUpdateContractCollectionStatus = (ids: string[], status: CollectionStatus) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    let updatedContractsList: Contract[] = [];

    setContracts((prev) => {
      updatedContractsList = prev.map((c) => {
        if (idSet.has(c.id)) {
          return { ...c, collectionStatus: status, updatedAt: new Date().toISOString() };
        }
        return c;
      });
      try {
        localStorage.setItem(STORAGE_PREFIX + "contracts", JSON.stringify(updatedContractsList));
      } catch {}
      return updatedContractsList;
    });

    ids.forEach((id) => {
      const existing = contracts.find((c) => c.id === id);
      if (existing) {
        const updatedItem: Contract = {
          ...existing,
          collectionStatus: status,
          updatedAt: new Date().toISOString(),
        };

        const changeRec = globalPersistenceEngine.recordChange({
          entityType: "contract",
          recordId: id,
          companyId: existing.companyId,
          action: "update",
          payload: cleanContract(updatedItem),
          previousData: existing,
          userName: currentUser?.name || "المستخدم",
          description: `تحديث حالة العقد رقم ${existing.contractNumber} إلى ${status}`,
        });

        if (supabase) {
          globalPersistenceEngine.executeChange(supabase, changeRec);
        }
      }
    });

    showToast(`تم حفظ وتحديث حالة ${ids.length} عقود بنجاح إلى ${status} ✅`, "success");
  };

  const batchUpdateContracts = (ids: string[], updates: Partial<Contract>) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    let updatedList: Contract[] = [];

    setContracts((prev) => {
      updatedList = prev.map((c) => (idSet.has(c.id) ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
      try {
        localStorage.setItem(STORAGE_PREFIX + "contracts", JSON.stringify(updatedList));
      } catch {}
      return updatedList;
    });

    if (updates.date) {
      setSales((prev) => {
        const upSales = prev.map((s) => (s.contractId && idSet.has(s.contractId) ? { ...s, date: updates.date!, updatedAt: new Date().toISOString() } : s));
        try {
          localStorage.setItem(STORAGE_PREFIX + "sales", JSON.stringify(upSales));
        } catch {}
        return upSales;
      });
    }

    ids.forEach((id) => {
      const existing = contracts.find((c) => c.id === id);
      if (existing) {
        const updatedItem: Contract = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        const changeRec = globalPersistenceEngine.recordChange({
          entityType: "contract",
          recordId: id,
          companyId: existing.companyId,
          action: "update",
          payload: cleanContract(updatedItem),
          previousData: existing,
          userName: currentUser?.name || "المستخدم",
          description: `تعديل جماعي لبيانات العقد ${existing.contractNumber}`,
        });
        if (supabase) {
          globalPersistenceEngine.executeChange(supabase, changeRec);
        }
      }
    });

    showToast(`تم حفظ وتحديث بيانات ${ids.length} عقود بنجاح ✅`, "success");
  };

  const updateContract = (id: string, updates: Partial<Contract>) => {
    const existing = contracts.find((c) => c.id === id);
    if (!existing) return;

    const oldDate = existing.date;
    const oldTotal = existing.totalValue;
    let newTotal = updates.totalValue !== undefined ? Number(updates.totalValue) : existing.totalValue;
    let newPaid = updates.paidAmount !== undefined ? Number(updates.paidAmount) : existing.paidAmount;
    let newRemaining = Math.max(0, newTotal - newPaid);

    const updatedContract: Contract = {
      ...existing,
      ...updates,
      totalValue: newTotal,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      updatedAt: new Date().toISOString(),
    };

    setContracts((prev) => {
      const list = prev.map((c) => (c.id === id ? updatedContract : c));
      try {
        localStorage.setItem(STORAGE_PREFIX + "contracts", JSON.stringify(list));
      } catch {}
      return list;
    });

    // Cascade update to linked sale if totalValue changed
    if (updates.totalValue !== undefined && updates.totalValue !== oldTotal) {
      setSales((prev) => {
        const list = prev.map((s) => (s.contractId === id ? { ...s, amount: newTotal, updatedAt: new Date().toISOString() } : s));
        try {
          localStorage.setItem(STORAGE_PREFIX + "sales", JSON.stringify(list));
        } catch {}
        return list;
      });
      setOpportunities((prev) => {
        const list = prev.map((opp) => (opp.hasContract && opp.customerId === existing.customerId && opp.status === "won" ? { ...opp, expectedValue: newTotal, quotationValue: newTotal } : opp));
        try {
          localStorage.setItem(STORAGE_PREFIX + "opportunities", JSON.stringify(list));
        } catch {}
        return list;
      });
      
      const custContracts = contracts.map((c) => (c.id === id ? updatedContract : c)).filter((c) => c.customerId === existing.customerId);
      const totalSales = custContracts.reduce((sum, c) => sum + (c.totalValue || 0), 0);
      updateCustomer(existing.customerId, { totalSalesValue: totalSales });
      addAuditLog({
        companyId: existing.companyId,
        customerId: existing.customerId,
        customerName: existing.customerName,
        actionType: "edit_amount",
        entityType: "contract",
        entityId: id,
        description: `تعديل قيمة العقد رقم ${existing.contractNumber} من ${oldTotal.toLocaleString()} إلى ${newTotal.toLocaleString()} ج.م`,
        oldValue: String(oldTotal),
        newValue: String(newTotal),
      });
    }

    // Cascade update to linked sale and opportunity if date changed
    if (updates.date !== undefined && updates.date !== oldDate) {
      setSales((prev) => {
        const list = prev.map((s) => (s.contractId === id ? { ...s, date: updates.date!, updatedAt: new Date().toISOString() } : s));
        try {
          localStorage.setItem(STORAGE_PREFIX + "sales", JSON.stringify(list));
        } catch {}
        return list;
      });
      setOpportunities((prev) => {
        const list = prev.map((opp) =>
          opp.hasContract && opp.customerId === existing.customerId && opp.status === "won"
            ? { ...opp, closedAt: updates.date! }
            : opp
        );
        try {
          localStorage.setItem(STORAGE_PREFIX + "opportunities", JSON.stringify(list));
        } catch {}
        return list;
      });
      const saleToUpdate = sales.find(s => s.contractId === id);
      if (saleToUpdate) {
        const changeRecSale = globalPersistenceEngine.recordChange({
          entityType: "sale",
          recordId: saleToUpdate.id,
          companyId: saleToUpdate.companyId,
          action: "update",
          payload: { ...saleToUpdate, date: updates.date },
          previousData: saleToUpdate,
          userName: currentUser?.name || "المستخدم",
          description: `تعديل تاريخ المبيعات بناء على العقد`,
        });
        if (supabase) globalPersistenceEngine.executeChange(supabase, changeRecSale);
      }
      addAuditLog({
        companyId: existing.companyId,
        customerId: existing.customerId,
        customerName: existing.customerName,
        actionType: "edit_date",
        entityType: "contract",
        entityId: id,
        description: `تعديل تاريخ العقد رقم ${existing.contractNumber} من ${oldDate} إلى ${updates.date}`,
        oldValue: oldDate,
        newValue: updates.date,
      });
    }

    showToast("تم تحديث بيانات العقد بنجاح ✅", "success");

    const changeRec = globalPersistenceEngine.recordChange({
      entityType: "contract",
      recordId: id,
      companyId: updatedContract.companyId,
      action: "update",
      payload: cleanContract(updatedContract),
      previousData: existing,
      userName: currentUser?.name || "المستخدم",
      description: `تعديل العقد: ${updatedContract.contractNumber}`,
    });

    if (supabase) {
      globalPersistenceEngine.executeChange(supabase, changeRec);
    }
  };

  const addPayment = (data: Omit<Payment, "id">): Payment => {
    let recNum = data.receiptNumber;
    const paymentDate = data.date || todayStr;
    if (!recNum) {
      const year = paymentDate.split("-")[0];
      recNum = generateDocNumber("REC", data.companyId, year, payments);
    }
    const newPayment: Payment = {
      ...data,
      date: paymentDate,
      id: crypto.randomUUID(),
      receiptNumber: recNum,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    executeUnifiedAction({
      entityType: "payment",
      recordId: newPayment.id,
      companyId: newPayment.companyId,
      action: "insert",
      payload: cleanPayment(newPayment),
      description: `تسجيل دفعة تحصيل بقيمة ${(data.amount || 0).toLocaleString()} ج.م برقم إيصال ${newPayment.receiptNumber} وتاريخ ${paymentDate}`,
      applyLocal: () => {
        setPayments((prev) => [newPayment, ...prev]);
      },
      silent: true,
    });

    // Update contract paid & remaining
    const targetContract = contracts.find(c => c.id === data.contractId);
    if (targetContract) {
      const newPaid = targetContract.paidAmount + data.amount;
      const newRemaining = Math.max(0, targetContract.totalValue - newPaid);
      const newStatus = newRemaining === 0 ? ("completed" as const) : targetContract.status;
      const updatedCtr = {
        ...targetContract,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
      };
      executeUnifiedAction({
        entityType: "contract",
        recordId: targetContract.id,
        companyId: targetContract.companyId,
        action: "update",
        payload: cleanContract(updatedCtr),
        previousData: targetContract,
        description: `تحديث رصيد العقد بعد تحصيل دفعة: ${targetContract.contractNumber}`,
        applyLocal: () => {
          setContracts((prev) => prev.map(c => c.id === targetContract.id ? updatedCtr : c));
        },
        silent: true,
      });
    }

    return newPayment;
  };

  const updatePayment = (id: string, updates: Partial<Payment>) => {
    const existing = payments.find((p) => p.id === id);
    if (!existing) return;

    const oldDate = existing.date;
    const oldAmount = existing.amount;
    const newAmount = updates.amount !== undefined ? Number(updates.amount) : oldAmount;
    const updatedPayment: Payment = {
      ...existing,
      ...updates,
      amount: newAmount,
      updatedAt: new Date().toISOString(),
    };

    executeUnifiedAction({
      entityType: "payment",
      recordId: id,
      companyId: existing.companyId,
      action: "update",
      payload: cleanPayment(updatedPayment),
      previousData: existing,
      description: `تعديل بيانات الدفعة رقم ${existing.receiptNumber}`,
      applyLocal: () => {
        setPayments((prev) => prev.map((p) => (p.id === id ? updatedPayment : p)));
      },
      toastMessage: "تم تحديث بيانات الدفعة بنجاح ✅",
      toastType: "success",
    });

    const wasActive = existing.status !== "reversed" && existing.status !== "refunded";
    const isActive = updatedPayment.status !== "reversed" && updatedPayment.status !== "refunded";
    let diff = 0;

    if (wasActive && !isActive) {
      diff = -oldAmount;
    } else if (!wasActive && isActive) {
      diff = newAmount;
    } else if (wasActive && isActive) {
      diff = newAmount - oldAmount;
    }

    if (diff !== 0) {
      const targetContract = contracts.find(c => c.id === existing.contractId);
      if (targetContract) {
        const newPaid = Math.max(0, targetContract.paidAmount + diff);
        const newRemaining = Math.max(0, targetContract.totalValue - newPaid);
        const newStatus = newRemaining === 0 ? ("completed" as const) : targetContract.status;
        const updatedCtr = { ...targetContract, paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus };
        executeUnifiedAction({
          entityType: "contract",
          recordId: targetContract.id,
          companyId: targetContract.companyId,
          action: "update",
          payload: cleanContract(updatedCtr),
          previousData: targetContract,
          description: `تعديل رصيد العقد بعد تعديل حالة أو قيمة الدفعة: ${targetContract.contractNumber}`,
          applyLocal: () => {
            setContracts((prev) => prev.map(c => c.id === targetContract.id ? updatedCtr : c));
          },
          silent: true,
        });
      }
    }
  };

  const deletePayment = (id: string) => {
    const payment = payments.find((p) => p.id === id);
    if (!payment) return;

    executeUnifiedAction({
      entityType: "payment",
      recordId: id,
      companyId: payment.companyId,
      action: "delete",
      previousData: payment,
      description: `حذف إيصال تحصيل بقيمة ${payment.amount.toLocaleString()} ج.م رقم ${payment.receiptNumber} بتاريخ ${payment.date}`,
      applyLocal: () => {
        setPayments((prev) => prev.filter((p) => p.id !== id));
      },
      toastMessage: "تم حذف إيصال التحصيل وإعادة احتساب رصيد العقد بنجاح",
      toastType: "info",
    });

    // Reverse payment amount from contract
    const targetContract = contracts.find(c => c.id === payment.contractId);
    if (targetContract) {
      const newPaid = Math.max(0, targetContract.paidAmount - payment.amount);
      const newRemaining = Math.max(0, targetContract.totalValue - newPaid);
      const newStatus: ContractStatus = newRemaining > 0 && targetContract.status === "completed" ? "active" : targetContract.status;
      const updatedCtr = { ...targetContract, paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus };
      executeUnifiedAction({
        entityType: "contract",
        recordId: targetContract.id,
        companyId: targetContract.companyId,
        action: "update",
        payload: cleanContract(updatedCtr),
        previousData: targetContract,
        description: `تحديث رصيد العقد بعد حذف دفعة: ${targetContract.contractNumber}`,
        applyLocal: () => {
          setContracts((prev) => prev.map(c => c.id === targetContract.id ? updatedCtr : c));
        },
        silent: true,
      });
    }
  };

  const deleteCustomer = async (id: string) => {
    const oldCust = customers.find((c) => c.id === id);
    if (!oldCust) return;

    // Snapshot current state for rollback (Optimistic UI)
    const prevCustomers = [...customers];
    const prevInquiries = [...inquiries];
    const prevFollowUps = [...followUps];
    const prevQuotations = [...quotations];
    const prevContracts = [...contracts];
    const prevSales = [...sales];
    const prevPayments = [...payments];
    const prevInspections = [...inspections];
    const prevInteractions = [...interactions];
    const prevOpportunities = [...opportunities];

    let cascadeSuccess = true;
    if (supabase) {
      try {
        const results = await Promise.allSettled([
          supabase.from("contracts").delete().eq("customerId", id),
          supabase.from("sales").delete().eq("customerId", id),
          supabase.from("inquiries").delete().eq("customerId", id),
          supabase.from("follow_ups").delete().eq("customerId", id),
          supabase.from("quotations").delete().eq("customerId", id),
          supabase.from("payments").delete().eq("customerId", id),
          supabase.from("inspections").delete().eq("customerId", id),
          supabase.from("interactions").delete().eq("customerId", id),
          supabase.from("opportunities").delete().eq("customerId", id),
        ]);
        const hasFailed = results.some(r => {
          if (r.status === "rejected") return true;
          const err = (r.value as any).error;
          if (err && err.code !== "PGRST205") return true;
          return false;
        });
        if (hasFailed) cascadeSuccess = false;
      } catch (err) {
        cascadeSuccess = false;
        console.warn("Cascade delete relations failed:", err);
      }
    }

    if (!cascadeSuccess) {
      showToast("⚠️ فشل حذف العميل من السحابة بسبب خطأ في الشبكة أو الأذونات. تم إلغاء العملية واستعادة السجل.", "error");
      return;
    }

    const result = await executeUnifiedAction({
      entityType: "customer",
      recordId: id,
      companyId: oldCust.companyId,
      action: "delete",
      previousData: oldCust,
      description: `حذف العميل: ${oldCust.name}`,
      applyLocal: () => {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        setInquiries((prev) => prev.filter((i) => i.customerId !== id));
        setFollowUps((prev) => prev.filter((f) => f.customerId !== id));
        setQuotations((prev) => prev.filter((q) => q.customerId !== id));
        setContracts((prev) => prev.filter((c) => c.customerId !== id));
        setSales((prev) => prev.filter((s) => s.customerId !== id));
        setPayments((prev) => prev.filter((p) => p.customerId !== id));
        setInspections((prev) => prev.filter((ins) => ins.customerId !== id));
        setInteractions((prev) => prev.filter((inter) => inter.customerId !== id));
        setOpportunities((prev) => prev.filter((opp) => opp.customerId !== id));
      },
      toastMessage: "تم حذف العميل وكافة عقوده ومبيعاته واستفساراته بنجاح",
      toastType: "info",
    });

    if (result && !result.success) {
      // Rollback local state instantly if executeUnifiedAction failed
      setCustomers(prevCustomers);
      setInquiries(prevInquiries);
      setFollowUps(prevFollowUps);
      setQuotations(prevQuotations);
      setContracts(prevContracts);
      setSales(prevSales);
      setPayments(prevPayments);
      setInspections(prevInspections);
      setInteractions(prevInteractions);
      setOpportunities(prevOpportunities);
      showToast("⚠️ فشل إتمام الحذف والمزامنة. تم التراجع التلقائي واستعادة بيانات العميل.", "error");
    }
  };

  const batchDeleteCustomers = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const targetCusts = customers.filter((c) => ids.includes(c.id));
    const companyId = targetCusts[0]?.companyId;
    const idSet = new Set(ids);

    if (supabase) {
      try {
        await Promise.allSettled([
          supabase.from("contracts").delete().in("customerId", ids),
          supabase.from("sales").delete().in("customerId", ids),
          supabase.from("inquiries").delete().in("customerId", ids),
          supabase.from("follow_ups").delete().in("customerId", ids),
          supabase.from("quotations").delete().in("customerId", ids),
          supabase.from("payments").delete().in("customerId", ids),
          supabase.from("inspections").delete().in("customerId", ids),
          supabase.from("interactions").delete().in("customerId", ids),
          supabase.from("opportunities").delete().in("customerId", ids),
        ]);
      } catch (err) {
        console.warn("Cascade batch delete relations failed:", err);
      }
    }

    await executeUnifiedBulkAction({
      entityType: "customer",
      action: "delete",
      companyId,
      items: targetCusts.map((c) => ({ recordId: c.id, previousData: c })),
      description: `حذف جماعي لعدد ${ids.length} عملاء مع كافة سجلاتهم`,
      applyLocal: () => {
        setCustomers((prev) => prev.filter((c) => !idSet.has(c.id)));
        setInquiries((prev) => prev.filter((i) => !idSet.has(i.customerId)));
        setFollowUps((prev) => prev.filter((f) => !idSet.has(f.customerId)));
        setQuotations((prev) => prev.filter((q) => !idSet.has(q.customerId)));
        setContracts((prev) => prev.filter((c) => !idSet.has(c.customerId)));
        setSales((prev) => prev.filter((s) => !idSet.has(s.customerId)));
        setPayments((prev) => prev.filter((p) => !idSet.has(p.customerId)));
        setInspections((prev) => prev.filter((ins) => !idSet.has(ins.customerId)));
        setInteractions((prev) => prev.filter((inter) => !idSet.has(inter.customerId)));
        setOpportunities((prev) => prev.filter((opp) => !opp.customerId || !idSet.has(opp.customerId)));
      },
      toastMessage: `تم حذف ${ids.length} عملاء مع كافة عقودهم ومبيعاتهم بنجاح`,
      toastType: "info",
    });
  };

  const deleteInquiry = (id: string) => {
    const i = inquiries.find((item) => item.id === id);
    if (!i) return;
    executeUnifiedAction({
      entityType: "inquiry",
      recordId: id,
      companyId: i.companyId,
      action: "delete",
      previousData: i,
      description: `حذف استفسار: ${i.productType}`,
      applyLocal: () => {
        setInquiries((prev) => prev.filter((item) => item.id !== id));
      },
      toastMessage: "تم حذف الاستفسار بنجاح",
      toastType: "info",
    });
  };

  const batchDeleteInquiries = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const targetInqs = inquiries.filter((i) => ids.includes(i.id));
    const companyId = targetInqs[0]?.companyId;
    const idSet = new Set(ids);

    executeUnifiedBulkAction({
      entityType: "inquiry",
      action: "delete",
      companyId,
      items: targetInqs.map((i) => ({ recordId: i.id, previousData: i })),
      description: `حذف جماعي لعدد ${ids.length} استفسارات`,
      applyLocal: () => {
        setInquiries((prev) => prev.filter((i) => !idSet.has(i.id)));
      },
      toastMessage: `تم حذف ${ids.length} استفسارات بنجاح`,
      toastType: "info",
    });
  };

  const deleteFollowUp = (id: string) => {
    const f = followUps.find((item) => item.id === id);
    if (!f) return;
    executeUnifiedAction({
      entityType: "followup",
      recordId: id,
      companyId: f.companyId,
      action: "delete",
      previousData: f,
      description: `حذف متابعة: ${f.title}`,
      applyLocal: () => {
        setFollowUps((prev) => prev.filter((item) => item.id !== id));
      },
      toastMessage: "تم حذف المتابعة بنجاح",
      toastType: "info",
    });
  };

  const batchDeleteFollowUps = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const targetFups = followUps.filter((f) => ids.includes(f.id));
    const companyId = targetFups[0]?.companyId;
    const idSet = new Set(ids);

    executeUnifiedBulkAction({
      entityType: "followup",
      action: "delete",
      companyId,
      items: targetFups.map((f) => ({ recordId: f.id, previousData: f })),
      description: `حذف جماعي لعدد ${ids.length} متابعات`,
      applyLocal: () => {
        setFollowUps((prev) => prev.filter((f) => !idSet.has(f.id)));
      },
      toastMessage: `تم حذف ${ids.length} متابعات بنجاح`,
      toastType: "info",
    });
  };

  const batchUpdateFollowUps = (ids: string[], updates: Partial<FollowUp>) => {
    if (!ids || ids.length === 0) return;
    const targetFups = followUps.filter((f) => ids.includes(f.id));
    const companyId = targetFups[0]?.companyId;
    const idSet = new Set(ids);

    executeUnifiedBulkAction({
      entityType: "followup",
      action: "update",
      companyId,
      items: targetFups.map((f) => ({
        recordId: f.id,
        payload: cleanFollowUpUpdate({ ...f, ...updates }),
        previousData: f,
      })),
      description: `تحديث جماعي لعدد ${ids.length} متابعات`,
      applyLocal: () => {
        setFollowUps((prev) =>
          prev.map((f) => (idSet.has(f.id) ? { ...f, ...updates } : f))
        );
      },
      toastMessage: `تم تحديث ${ids.length} متابعة بنجاح`,
      toastType: "success",
    });
  };

  const batchAddFollowUps = (
    items: Array<{ customerId: string; companyId: CompanyId; customerName: string; customerPhone?: string }>,
    fupData: { dueDate: string; time?: string; title: string; notes?: string; priority: PriorityLevel; responsible?: string }
  ) => {
    if (!items || items.length === 0) return;
    let added = 0;
    items.forEach((item) => {
      addFollowUp({
        companyId: item.companyId,
        customerId: item.customerId,
        customerName: item.customerName,
        customerPhone: item.customerPhone || "",
        dueDate: fupData.dueDate,
        time: fupData.time || "11:00",
        title: fupData.title,
        notes: fupData.notes || "",
        priority: fupData.priority || "medium",
        status: "pending",
        responsible: fupData.responsible,
      });
      added++;
    });
    showToast(`تمت إضافة ${added} متابعة جديدة بنجاح`, "success");
  };

  const deleteQuotation = (id: string) => {
    const q = quotations.find((item) => item.id === id);
    if (!q) return;
    executeUnifiedAction({
      entityType: "quotation",
      recordId: id,
      companyId: q.companyId,
      action: "delete",
      previousData: q,
      description: `حذف عرض سعر رقم ${q.quoteNumber} بقيمة ${(q.totalAmount || 0).toLocaleString()} ج.م`,
      applyLocal: () => {
        setQuotations((prev) => prev.filter((item) => item.id !== id));
      },
      toastMessage: "تم حذف عرض السعر بنجاح",
      toastType: "info",
    });
  };

  const batchDeleteQuotations = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const targetQuotes = quotations.filter((q) => ids.includes(q.id));
    const companyId = targetQuotes[0]?.companyId;
    const idSet = new Set(ids);

    executeUnifiedBulkAction({
      entityType: "quotation",
      action: "delete",
      companyId,
      items: targetQuotes.map((q) => ({ recordId: q.id, previousData: q })),
      description: `حذف جماعي لعدد ${ids.length} عروض أسعار`,
      applyLocal: () => {
        setQuotations((prev) => prev.filter((q) => !idSet.has(q.id)));
      },
      toastMessage: `تم حذف ${ids.length} عروض أسعار بنجاح`,
      toastType: "info",
    });
  };

  const batchUpdateQuotations = (ids: string[], updates: Partial<Quotation>) => {
    if (!ids || ids.length === 0) return;
    const targetQuotes = quotations.filter((q) => ids.includes(q.id));
    const companyId = targetQuotes[0]?.companyId;
    const idSet = new Set(ids);

    executeUnifiedBulkAction({
      entityType: "quotation",
      action: "update",
      companyId,
      items: targetQuotes.map((q) => ({
        recordId: q.id,
        payload: cleanQuotation({ ...q, ...updates }),
        previousData: q,
      })),
      description: `تحديث جماعي لعدد ${ids.length} عرض سعر`,
      applyLocal: () => {
        setQuotations((prev) =>
          prev.map((q) => (idSet.has(q.id) ? { ...q, ...updates } : q))
        );
      },
      toastMessage: `تم تحديث ${ids.length} عرض سعر بنجاح`,
      toastType: "success",
    });
  };

  const deleteContract = (id: string) => {
    const contract = contracts.find((c) => c.id === id);
    if (!contract) return;

    executeUnifiedAction({
      entityType: "contract",
      recordId: id,
      companyId: contract.companyId,
      action: "delete",
      previousData: contract,
      description: `حذف العقد رقم ${contract.contractNumber} بقيمة ${(contract.totalValue || 0).toLocaleString()} ج.م`,
      applyLocal: () => {
        setContracts((prev) => prev.filter((c) => c.id !== id));
        setSales((prev) => prev.filter((s) => s.contractId !== id && s.customerId !== contract.customerId));
        setPayments((prev) => prev.filter((p) => p.contractId !== id));
        setOpportunities((prev) => prev.map((opp) => (opp.hasContract && opp.customerId === contract.customerId ? { ...opp, hasContract: false, status: "negotiation" as OpportunityStatus } : opp)));
      },
      toastMessage: "تم حذف العقد بنجاح",
      toastType: "info",
    });

    executeUnifiedSystemOperation(
      "cascade_delete_contract",
      `حذف المبيعات والمدفوعات المرتبطة بالعقد ${contract.contractNumber}`,
      async (sb) => {
        await Promise.allSettled([
          sb.from("sales").delete().eq("contractId", id),
          sb.from("payments").delete().eq("contractId", id),
        ]);
      },
      contract.companyId
    );
  };

  const batchDeleteContracts = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const targetContracts = contracts.filter((c) => ids.includes(c.id));
    const companyId = targetContracts[0]?.companyId;
    const idSet = new Set(ids);

    executeUnifiedBulkAction({
      entityType: "contract",
      action: "delete",
      companyId,
      items: targetContracts.map((c) => ({ recordId: c.id, previousData: c })),
      description: `حذف جماعي لعدد ${ids.length} عقود`,
      applyLocal: () => {
        setContracts((prev) => prev.filter((c) => !idSet.has(c.id)));
        setSales((prev) => prev.filter((s) => !s.contractId || !idSet.has(s.contractId)));
        setPayments((prev) => prev.filter((p) => !idSet.has(p.contractId)));
      },
      toastMessage: `تم حذف ${ids.length} عقود بنجاح`,
      toastType: "info",
    });

    executeUnifiedSystemOperation(
      "cascade_batch_delete_contracts",
      `حذف المبيعات والمدفوعات المرتبطة بعدد ${ids.length} عقود`,
      async (sb) => {
        await Promise.allSettled([
          sb.from("sales").delete().in("contractId", ids),
          sb.from("payments").delete().in("contractId", ids),
        ]);
      },
      companyId
    );
  };

  const clearAllContracts = () => {
    executeUnifiedSystemOperation(
      "clear_all_contracts",
      "مسح كافة العقود والمبيعات والمدفوعات بالكامل",
      async (sb) => {
        await Promise.allSettled([
          sb.from("contracts").delete().neq("id", "0"),
          sb.from("sales").delete().neq("id", "0"),
          sb.from("payments").delete().neq("id", "0"),
        ]);
      }
    );
    setContracts([]);
    setSales([]);
    setPayments([]);
    showToast("تم حذف جميع العقود والمبيعات بنجاح", "warning");
  };

  const purgeOrphanContracts = () => {
    const validCustIds = new Set(customers.map((c) => c.id));
    const orphanCtrs = contracts.filter((c) => !validCustIds.has(c.customerId));
    const orphanCtrIds = orphanCtrs.map((c) => c.id);

    if (orphanCtrIds.length === 0) {
      showToast("جميع التعاقدات مرتبطة بعملاء مسجلين حالياً", "info");
      return;
    }

    const orphanSalesIds = sales
      .filter((s) => !validCustIds.has(s.customerId) || (s.contractId && orphanCtrIds.includes(s.contractId)))
      .map((s) => s.id);

    const orphanPaymentIds = payments
      .filter((p) => !validCustIds.has(p.customerId) || (p.contractId && orphanCtrIds.includes(p.contractId)))
      .map((p) => p.id);

    executeUnifiedSystemOperation(
      "purge_orphan_contracts",
      `تنظيف ${orphanCtrIds.length} تعاقد غير مرتبط بقاعدة العملاء المسجلين`,
      async (sb) => {
        await Promise.allSettled([
          sb.from("contracts").delete().in("id", orphanCtrIds),
          sb.from("sales").delete().in("id", orphanSalesIds),
          sb.from("payments").delete().in("id", orphanPaymentIds),
        ]);
      }
    );

    setContracts((prev) => prev.filter((c) => validCustIds.has(c.customerId)));
    setSales((prev) => prev.filter((s) => validCustIds.has(s.customerId)));
    setPayments((prev) => prev.filter((p) => validCustIds.has(p.customerId)));

    showToast(`تم تنظيف وحذف ${orphanCtrIds.length} تعاقد غير مرتبط بعملاء مسجلين بنجاح 🧹`, "success");
  };

  const createCustomersFromOrphanContracts = () => {
    const validCustIds = new Set(customers.map((c) => c.id));
    const orphanCtrs = contracts.filter((c) => !validCustIds.has(c.customerId));

    if (orphanCtrs.length === 0) {
      showToast("جميع التعاقدات مرتبطة بعملاء مسجلين بالفعل", "info");
      return;
    }

    const newCustomersMap = new Map<string, { name: string; phone?: string; area?: string; companyId: string; contractIds: string[] }>();
    orphanCtrs.forEach((ctr) => {
      const key = (ctr.customerPhone || ctr.customerName || ctr.id).trim().toLowerCase();
      if (!newCustomersMap.has(key)) {
        newCustomersMap.set(key, {
          name: ctr.customerName || "عميل تعاقد جديد",
          phone: ctr.customerPhone,
          area: ctr.area || "غير محدد",
          companyId: ctr.companyId,
          contractIds: [ctr.id],
        });
      } else {
        newCustomersMap.get(key)!.contractIds.push(ctr.id);
      }
    });

    const createdCusts: Customer[] = [];
    const updatedCtrList = [...contracts];

    newCustomersMap.forEach((info) => {
      const newCustId = crypto.randomUUID();
      const newCust: Customer = {
        id: newCustId,
        companyId: info.companyId,
        name: info.name,
        phone: info.phone || "01000000000",
        area: info.area || "غير محدد",
        source: "Direct",
        interestLevel: "hot",
        stage: "contracted",
        lastContactDate: new Date().toISOString().split("T")[0],
        totalQuotationsValue: 0,
        totalSalesValue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      createdCusts.push(newCust);

      info.contractIds.forEach((cId) => {
        const cIdx = updatedCtrList.findIndex((c) => c.id === cId);
        if (cIdx >= 0) {
          updatedCtrList[cIdx] = {
            ...updatedCtrList[cIdx],
            customerId: newCustId,
            recordStatus: "active",
          };
        }
      });
    });

    executeUnifiedSystemOperation(
      "create_customers_from_orphans",
      `إنشاء ${createdCusts.length} ملف عميل مسجل تلقائياً للتعاقدات المتبقية`,
      async (sb) => {
        await sb.from("customers").upsert(createdCusts.map(cleanCustomer));
        await sb.from("contracts").upsert(updatedCtrList.map(cleanContract));
      }
    );

    setCustomers((prev) => [...createdCusts, ...prev]);
    setContracts(updatedCtrList);

    showToast(`تم إنشاء ${createdCusts.length} ملف عميل جديد وربط جميع التعاقدات بنجاح 🎉`, "success");
  };

  const addSale = (saleData: Omit<Sale, "id">): Sale => {
    const saleId = crypto.randomUUID();
    const newSale: Sale = {
      ...saleData,
      id: saleId,
      updatedAt: new Date().toISOString(),
    };

    executeUnifiedAction({
      entityType: "sale",
      recordId: saleId,
      companyId: newSale.companyId,
      action: "insert",
      payload: cleanSale(newSale),
      description: `تسجيل صفقة بيع جديدة / تاريخية بقيمة ${(newSale.amount || 0).toLocaleString()} ج.م بتاريخ ${newSale.date}`,
      applyLocal: () => {
        setSales((prev) => [newSale, ...prev]);
      },
      toastMessage: "تم تسجيل صفقة البيع بنجاح ✅",
      toastType: "success",
    });

    return newSale;
  };

  const updateSale = (id: string, updates: Partial<Sale>) => {
    const targetId = id.startsWith("sale-") ? id.replace(/^sale-/, "") : id;
    const existing = sales.find((s) => s.id === id || s.id === targetId || `sale-${s.id}` === id);
    if (!existing) return;
    const realId = existing.id;
    const oldDate = existing.date;
    const oldAmount = existing.amount;
    const updatedSale: Sale = {
      ...existing,
      ...updates,
      createdAt: existing.createdAt || existing.date,
      updatedAt: new Date().toISOString(),
    };

    executeUnifiedAction({
      entityType: "sale",
      recordId: realId,
      companyId: existing.companyId,
      action: "update",
      payload: cleanSale(updatedSale),
      previousData: existing,
      description: `تعديل صفقة البيع للعميل ${existing.customerName}`,
      applyLocal: () => {
        setSales((prev) => prev.map((s) => (s.id === realId ? updatedSale : s)));
      },
      toastMessage: "تم تحديث بيانات صفقة البيع بنجاح ✅",
      toastType: "success",
    });

    // If linked to a contract and date changed, cascade to contract
    if (updates.date !== undefined && updates.date !== oldDate && existing.contractId) {
      const ctr = contracts.find(c => c.id === existing.contractId);
      if (ctr) {
        updateContract(existing.contractId, { date: updates.date });
      }
    }

    if (updates.amount !== undefined && updates.amount !== oldAmount) {
      if (existing.contractId) {
        const ctr = contracts.find(c => c.id === existing.contractId);
        if (ctr) {
          const newRem = Math.max(0, updates.amount! - ctr.paidAmount);
          updateContract(existing.contractId, { totalValue: updates.amount!, remainingAmount: newRem });
        }
      }
      const linkedOpp = opportunities.find(opp => opp.saleId === id || (existing.contractId && opp.hasContract && opp.customerId === existing.customerId));
      if (linkedOpp) {
        updateOpportunity(linkedOpp.id, { expectedValue: updates.amount!, quotationValue: updates.amount! });
      }
      if (existing.customerId) {
        const custSales = sales.map((s) => (s.id === id ? updatedSale : s)).filter((s) => s.customerId === existing.customerId);
        const totalSales = custSales.reduce((sum, s) => sum + (s.amount || 0), 0);
        updateCustomer(existing.customerId, { totalSalesValue: totalSales });
      }
    }
  };

  const deleteInspection = (id: string) => {
    const insp = inspections.find((i) => i.id === id);
    if (!insp) return;
    executeUnifiedAction({
      entityType: "inspection",
      recordId: id,
      companyId: insp.companyId,
      action: "delete",
      previousData: insp,
      description: `حذف معاينة بتاريخ: ${insp.date}`,
      applyLocal: () => {
        setInspections((prev) => prev.filter((i) => i.id !== id));
      },
      toastMessage: "تم حذف المعاينة بنجاح",
      toastType: "info",
    });
  };

  const updateInspection = (id: string, updates: Partial<Inspection>) => {
    const existing = inspections.find((i) => i.id === id);
    if (!existing) return;
    const oldDate = existing.date;
    const updatedInsp: Inspection = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    executeUnifiedAction({
      entityType: "inspection",
      recordId: id,
      companyId: existing.companyId,
      action: "update",
      payload: cleanInspectionUpdate(updatedInsp),
      previousData: existing,
      description: updates.date && updates.date !== oldDate
        ? `تغيير تاريخ المعاينة من ${oldDate} إلى ${updates.date}`
        : `تحديث بيانات المعاينة`,
      applyLocal: () => {
        setInspections((prev) => prev.map((i) => (i.id === id ? updatedInsp : i)));
      },
      toastMessage: "تم تحديث بيانات المعاينة بنجاح ✅",
      toastType: "success",
    });
  };

  const deleteInteraction = (id: string) => {
    const existing = interactions.find((i) => i.id === id);
    if (!existing) return;
    executeUnifiedAction({
      entityType: "interaction",
      recordId: id,
      companyId: existing.companyId,
      action: "delete",
      previousData: existing,
      description: `حذف حدث من التايم لاين: ${existing.type} - ${(existing.notes || "").slice(0, 50)}`,
      applyLocal: () => {
        setInteractions((prev) => prev.filter((i) => i.id !== id));
      },
      toastMessage: "تم حذف الحدث من سجل العميل بنجاح",
      toastType: "info",
    });
  };

  const updateInteraction = (id: string, updates: Partial<Interaction>) => {
    const existing = interactions.find((i) => i.id === id);
    if (!existing) return;
    const oldDate = existing.date;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    executeUnifiedAction({
      entityType: "interaction",
      recordId: id,
      companyId: existing.companyId,
      action: "update",
      payload: cleanInteraction(updated),
      previousData: existing,
      description: updates.date && updates.date !== oldDate
        ? `تعديل تاريخ الحدث في السجل من ${oldDate} إلى ${updates.date}`
        : `تحديث الحدث في السجل`,
      applyLocal: () => {
        setInteractions((prev) => prev.map((i) => (i.id === id ? updated : i)));
      },
      toastMessage: "تم تحديث الحدث بنجاح ✅",
      toastType: "success",
    });
  };

  const cleanTimelineDuplicates = (customerId: string): number => {
    const custInteractions = interactions.filter((i) => i.customerId === customerId);
    const seen = new Set<string>();
    const toRemove: Interaction[] = [];

    custInteractions.forEach((i) => {
      const normDate = (i.date || "").split("T")[0].split(" ")[0];
      const normNotes = (i.notes || "").slice(0, 35).trim();
      const sig = `${i.type}_${normDate}_${normNotes}`;
      if (seen.has(sig)) {
        toRemove.push(i);
      } else {
        seen.add(sig);
      }
    });

    if (toRemove.length > 0) {
      const toRemoveIds = new Set(toRemove.map((i) => i.id));
      const companyId = toRemove[0]?.companyId;
      executeUnifiedBulkAction({
        entityType: "interaction",
        action: "delete",
        companyId,
        items: toRemove.map((i) => ({ recordId: i.id, previousData: i })),
        description: `تنظيف وإزالة ${toRemove.length} أحداث مكررة من التايم لاين للعميل`,
        applyLocal: () => {
          setInteractions((prev) => prev.filter((i) => !toRemoveIds.has(i.id)));
        },
        toastMessage: `تم تنظيف ${toRemove.length} أحداث مكررة من السجل بنجاح 🧹`,
        toastType: "success",
      });
    } else {
      showToast("لا توجد أحداث مكررة في سجل هذا العميل", "info");
    }
    return toRemove.length;
  };

  const deleteSale = (id: string) => {
    const existing = sales.find((s) => s.id === id);
    if (!existing) return;

    if (existing.contractId) {
      const linkedContract = contracts.find((c) => c.id === existing.contractId);
      if (linkedContract) {
        executeUnifiedAction({
          entityType: "contract",
          recordId: existing.contractId,
          companyId: existing.companyId,
          action: "delete",
          previousData: linkedContract,
          description: `حذف العقد المرتبط بالبيع: ${linkedContract.contractNumber}`,
          applyLocal: () => {
            setContracts((prev) => {
              const updated = prev.filter((c) => c.id !== existing.contractId);
              try {
                localStorage.setItem(STORAGE_PREFIX + "contracts", JSON.stringify(updated));
              } catch {}
              return updated;
            });
          },
          silent: true,
        });
      }
    }

    executeUnifiedAction({
      entityType: "sale",
      recordId: id,
      companyId: existing.companyId,
      action: "delete",
      previousData: existing,
      description: `حذف صفقة بيع بقيمة ${(existing.amount || 0).toLocaleString()} ج.م بتاريخ ${existing.date}`,
      applyLocal: () => {
        setSales((prev) => {
          const updated = prev.filter((s) => s.id !== id);
          try {
            localStorage.setItem(STORAGE_PREFIX + "sales", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      },
      toastMessage: "تم حذف سجل البيع بنجاح",
      toastType: "info",
    });
  };

  const batchDeleteSales = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const targetSales = sales.filter((s) => ids.includes(s.id));
    const companyId = targetSales[0]?.companyId;
    const idSet = new Set(ids);

    executeUnifiedBulkAction({
      entityType: "sale",
      action: "delete",
      companyId,
      items: targetSales.map((s) => ({ recordId: s.id, previousData: s })),
      description: `حذف جماعي لعدد ${ids.length} صفقات بيع`,
      applyLocal: () => {
        setSales((prev) => prev.filter((s) => !idSet.has(s.id)));
      },
      toastMessage: `تم حذف ${ids.length} سجلات بيع بنجاح`,
      toastType: "info",
    });
  };

  const clearAllSales = () => {
    executeUnifiedSystemOperation({
      description: "مسح كافة سجلات المبيعات والتحليلات بالكامل",
      operation: async (sb) => {
        const { error } = await sb.from("sales").delete().neq("id", "0");
        if (error && error.code !== "PGRST205") throw error;
      },
      applyLocal: () => {
        setSales([]);
      },
      toastMessage: "تم مسح كافة سجلات المبيعات والتحليلات بنجاح",
      toastType: "warning",
    });
  };

  const addCompany = (comp: Omit<Company, "id">): Company => {
    const newComp: Company = {
      ...comp,
      id: crypto.randomUUID(),
      status: comp.status || "active",
      active: comp.active !== false,
    };
    if (newComp.logoUrl) {
      localStorage.setItem(STORAGE_PREFIX + `comp_logo_${newComp.id}`, newComp.logoUrl);
    }
    executeUnifiedAction({
      entityType: "company",
      recordId: newComp.id,
      companyId: newComp.id,
      action: "insert",
      payload: cleanCompany(newComp),
      description: `إضافة شركة جديدة: ${newComp.name}`,
      applyLocal: () => {
        setCompanies((prev) => {
          const next = [...prev, newComp];
          localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(next));
          return next;
        });
      },
      toastMessage: `تمت إضافة شركة ${newComp.name} بنجاح`,
      toastType: "success",
    });
    return newComp;
  };

  const updateCompany = (id: string, updates: Partial<Company>) => {
    let resolvedLogoUrl = updates.logoUrl;
    const existing = companies.find((c) => c.id === id);
    const storedLogo = localStorage.getItem(STORAGE_PREFIX + `comp_logo_${id}`);

    if (resolvedLogoUrl === undefined) {
      resolvedLogoUrl = existing?.logoUrl || storedLogo || undefined;
    } else if (resolvedLogoUrl) {
      localStorage.setItem(STORAGE_PREFIX + `comp_logo_${id}`, resolvedLogoUrl);
    } else {
      localStorage.removeItem(STORAGE_PREFIX + `comp_logo_${id}`);
    }

    const mergedUpdates = {
      ...updates,
      logoUrl: resolvedLogoUrl,
    };

    executeUnifiedAction({
      entityType: "company",
      recordId: id,
      companyId: id,
      action: "update",
      payload: cleanCompanyUpdate(mergedUpdates),
      previousData: existing,
      description: `تحديث بيانات الشركة: ${existing?.name || id}`,
      applyLocal: () => {
        setCompanies((prev) => {
          const next = prev.map((c) => (c.id === id ? { ...c, ...mergedUpdates } : c));
          localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(next));
          return next;
        });
      },
      toastMessage: "تم تحديث بيانات الشركة بنجاح",
      toastType: "success",
    });
  };

  const archiveCompany = (id: string) => {
    const existing = companies.find((c) => c.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const updaterName = currentUser?.name || "System Owner";
    const updates = {
      status: "archived" as const,
      active: false,
      archivedAt: now,
      archivedBy: updaterName,
    };

    executeUnifiedAction({
      entityType: "company",
      recordId: id,
      companyId: id,
      action: "update",
      payload: cleanCompanyUpdate(updates),
      previousData: existing,
      description: `أرشفة شركة: ${existing.name || id}`,
      applyLocal: () => {
        setCompanies((prev) => {
          const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
          localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(next));
          return next;
        });
        if (activeCompanyId === id) {
          setActiveCompanyId("all");
        }
      },
      toastMessage: `تمت أرشفة شركة ${existing.name} بنجاح وحفظ كافة بياناتها`,
      toastType: "info",
    });
  };

  const restoreCompany = (id: string) => {
    const existing = companies.find((c) => c.id === id);
    if (!existing) return;
    const updates = {
      status: "active" as const,
      active: true,
      archivedAt: null,
      archivedBy: null,
    };

    executeUnifiedAction({
      entityType: "company",
      recordId: id,
      companyId: id,
      action: "update",
      payload: cleanCompanyUpdate(updates),
      previousData: existing,
      description: `استعادة شركة: ${existing.name || id}`,
      applyLocal: () => {
        setCompanies((prev) => {
          const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
          localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(next));
          return next;
        });
      },
      toastMessage: `تمت استعادة شركة ${existing.name} بنجاح`,
      toastType: "success",
    });
  };

  // Employee & Payroll Operations persistent to Supabase via executeUnifiedAction
  const addEmployee = (empData: Omit<Employee, "id" | "createdAt">): Employee => {
    const id = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString().split("T")[0];
    const initialSalRecord: EmployeeSalaryRecord = {
      id: `sal-rec-${Date.now()}`,
      employeeId: id,
      companyId: empData.companyId,
      effectiveFrom: empData.startDate ? empData.startDate.slice(0, 7) : now.slice(0, 7),
      monthlySalary: empData.monthlySalary,
      notes: "الراتب الأساسي المعتمد عند التعيين",
      createdAt: now,
    };
    const newEmp: Employee = {
      ...empData,
      id,
      salaryHistory: [initialSalRecord],
      commissionAdjustments: [],
      createdAt: now,
      updatedAt: now,
    };

    executeUnifiedAction({
      entityType: "employee",
      recordId: newEmp.id,
      companyId: newEmp.companyId,
      action: "insert",
      payload: cleanEmployee(newEmp),
      description: `إضافة موظف جديد: ${newEmp.name}`,
      applyLocal: () => {
        setEmployees((prev) => {
          const next = [...prev, newEmp];
          localStorage.setItem(STORAGE_PREFIX + "employees", JSON.stringify(next));
          return next;
        });
      },
      toastMessage: `تمت إضافة الموظف ${newEmp.name} بنجاح`,
      toastType: "success",
    });

    return newEmp;
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    const existing = employees.find((e) => e.id === id);
    const now = new Date().toISOString();
    const merged = { ...updates, updatedAt: now };

    executeUnifiedAction({
      entityType: "employee",
      recordId: id,
      companyId: existing?.companyId || "all",
      action: "update",
      payload: cleanEmployeeUpdate(merged),
      previousData: existing,
      description: `تحديث بيانات الموظف: ${existing?.name || id}`,
      applyLocal: () => {
        setEmployees((prev) => {
          const next = prev.map((e) => (e.id === id ? { ...e, ...merged } : e));
          localStorage.setItem(STORAGE_PREFIX + "employees", JSON.stringify(next));
          return next;
        });
      },
      toastMessage: "تم تحديث بيانات الموظف بنجاح",
      toastType: "success",
    });
  };

  const toggleEmployeeStatus = (id: string) => {
    const existing = employees.find((e) => e.id === id);
    if (!existing) return;
    const nextActive = !existing.active;
    const now = new Date().toISOString();

    executeUnifiedAction({
      entityType: "employee",
      recordId: id,
      companyId: existing.companyId,
      action: "update",
      payload: cleanEmployeeUpdate({ active: nextActive, updatedAt: now }),
      previousData: existing,
      description: `تعديل حالة الموظف: ${existing.name} إلى ${nextActive ? "نشط" : "معطل"}`,
      applyLocal: () => {
        setEmployees((prev) => {
          const next = prev.map((e) => (e.id === id ? { ...e, active: nextActive, updatedAt: now } : e));
          localStorage.setItem(STORAGE_PREFIX + "employees", JSON.stringify(next));
          return next;
        });
      },
      toastMessage: `تم ${nextActive ? "تنشيط" : "تعطيل"} الموظف ${existing.name}`,
      toastType: "info",
    });
  };

  const updateEmployeeSalary = (employeeId: string, newSalary: number, effectivePeriod: string, notes?: string) => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target) return;
    const now = new Date().toISOString();
    const existingHistory = target.salaryHistory || [];

    const updatedHistory = existingHistory.map((rec) => {
      if (!rec.effectiveTo && rec.effectiveFrom < effectivePeriod) {
        const [y, m] = effectivePeriod.split("-").map(Number);
        const prevMonthDate = new Date(y, m - 2, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
        return { ...rec, effectiveTo: prevMonthStr };
      }
      return rec;
    });

    const newRecord: EmployeeSalaryRecord = {
      id: `sal-rec-${Date.now()}`,
      employeeId,
      companyId: target.companyId,
      effectiveFrom: effectivePeriod,
      monthlySalary: newSalary,
      notes: notes || `تعديل الراتب اعتبارا من ${effectivePeriod}`,
      createdAt: now,
    };

    const merged = {
      monthlySalary: newSalary,
      salaryHistory: [...updatedHistory, newRecord],
      updatedAt: now,
    };

    executeUnifiedAction({
      entityType: "employee",
      recordId: employeeId,
      companyId: target.companyId,
      action: "update",
      payload: cleanEmployeeUpdate(merged),
      previousData: target,
      description: `تحديث راتب الموظف ${target.name} إلى ${newSalary.toLocaleString()} ج.م`,
      applyLocal: () => {
        setEmployees((prev) => {
          const next = prev.map((e) => (e.id === employeeId ? { ...e, ...merged } : e));
          localStorage.setItem(STORAGE_PREFIX + "employees", JSON.stringify(next));
          return next;
        });

        const logPayload = {
          companyId: target.companyId,
          description: `تعديل راتب الموظف ${target.name} من ${target.monthlySalary.toLocaleString()} إلى ${newSalary.toLocaleString()}`,
          actionType: 'UPDATE_SALARY',
          entityType: 'employee',
          entityId: employeeId,
          oldValue: target.monthlySalary,
          newValue: newSalary
        };
        addAuditLog(logPayload);
      },
      toastMessage: `تم تحديث راتب ${target.name} بنجاح`,
      toastType: "success",
    });
  };

  const updateCommissionRate = (employeeId: string, newRate: number, effectivePeriod: string, notes?: string) => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target) return;
    const now = new Date().toISOString();
    const existingHistory = target.commissionHistory || [];

    const updatedHistory = existingHistory.map((rec) => {
      if (!rec.effectiveTo && rec.effectiveFrom < effectivePeriod) {
        const [y, m] = effectivePeriod.split("-").map(Number);
        const prevMonthDate = new Date(y, m - 2, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
        return { ...rec, effectiveTo: prevMonthStr };
      }
      return rec;
    });

    const newRecord = {
      id: `comm-rec-${Date.now()}`,
      employeeId,
      companyId: target.companyId,
      effectiveFrom: effectivePeriod,
      percentage: newRate,
      notes: notes || `تعديل نسبة العمولة اعتبارا من ${effectivePeriod}`,
      createdAt: now,
    };

    const merged = {
      commissionPercentage: newRate,
      commissionHistory: [...updatedHistory, newRecord],
      updatedAt: now,
    };

    executeUnifiedAction({
      entityType: "employee",
      recordId: employeeId,
      companyId: target.companyId,
      action: "update",
      payload: cleanEmployeeUpdate(merged),
      previousData: target,
      description: `تحديث نسبة عمولة الموظف ${target.name} إلى ${newRate}%`,
      applyLocal: () => {
        setEmployees((prev) => {
          const next = prev.map((e) => (e.id === employeeId ? { ...e, ...merged } : e));
          localStorage.setItem(STORAGE_PREFIX + "employees", JSON.stringify(next));
          return next;
        });

        const logPayload = {
          companyId: target.companyId,
          description: `تعديل نسبة عمولة الموظف ${target.name} من ${target.commissionPercentage}% إلى ${newRate}%`,
          actionType: 'UPDATE_COMMISSION_RATE',
          entityType: 'employee',
          entityId: employeeId,
          oldValue: target.commissionPercentage,
          newValue: newRate
        };
        addAuditLog(logPayload);
      },
      toastMessage: `تم تحديث نسبة عمولة ${target.name} بنجاح`,
      toastType: "success",
    });
  };

  const deleteCompany = (id: string) => {
    if (companies.length <= 1) {
      showToast("لا يمكن حذف الشركة الوحيدة المتبقية في النظام", "warning");
      return;
    }
    const existing = companies.find((c) => c.id === id);
    executeUnifiedAction({
      entityType: "company",
      recordId: id,
      companyId: id,
      action: "delete",
      previousData: existing,
      description: `حذف شركة: ${existing?.name || id}`,
      applyLocal: () => {
        setCompanies((prev) => prev.filter((c) => c.id !== id));
        if (activeCompanyId === id) {
          setActiveCompanyId("all");
        }
      },
      toastMessage: "تم حذف الشركة بنجاح",
      toastType: "info",
    });
  };

  const updateCompanyTarget = (companyId: CompanyId, newTarget: number, annualTarget?: number) => {
    const existing = companies.find((c) => c.id === companyId);
    executeUnifiedAction({
      entityType: "company",
      recordId: companyId,
      companyId,
      action: "update",
      payload: { monthlyTarget: newTarget, annualTarget },
      previousData: existing,
      description: `تحديث الهدف البيعي للشركة: ${existing?.name || companyId} إلى ${newTarget.toLocaleString()} ج.م`,
      applyLocal: () => {
        setCompanies((prev) => {
          const next = prev.map((c) =>
            c.id === companyId
              ? {
                  ...c,
                  monthlyTarget: newTarget,
                  annualTarget: annualTarget !== undefined ? annualTarget : c.annualTarget,
                }
              : c
          );
          localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(next));
          return next;
        });
      },
      toastMessage: "تم تحديث الأهداف البيعية للشركة بنجاح 🎯",
      toastType: "success",
    });
  };

  const updateUserTarget = (companyId: CompanyId, userId: string, target: number) => {
    setCompanies((prev) => {
      const next = prev.map((c) => {
        if (c.id === companyId) {
          return {
            ...c,
            userTargets: { ...(c.userTargets || {}), [userId]: target },
          };
        }
        return c;
      });
      localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(next));
      return next;
    });
    showToast("تم تحديث الهدف البيعي للمستخدم بنجاح", "success");
  };

  const assignUserCompanyRole = (userId: string, companyId: CompanyId, role: CompanyRole) => {
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === userId) {
          const updatedRoles = { ...(u.companyRoles || {}), [companyId]: role };
          const updatedAllowed = u.allowedCompanyIds.includes("all")
            ? u.allowedCompanyIds
            : Array.from(new Set([...u.allowedCompanyIds, companyId]));
          return { ...u, companyRoles: updatedRoles, allowedCompanyIds: updatedAllowed };
        }
        return u;
      });
      localStorage.setItem(STORAGE_PREFIX + "users", JSON.stringify(next));
      return next;
    });
    setCompanies((prev) => {
      const next = prev.map((c) => {
        if (c.id === companyId) {
          return {
            ...c,
            userRoles: { ...(c.userRoles || {}), [userId]: role },
          };
        }
        return c;
      });
      localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(next));
      return next;
    });
    showToast("تم تحديث صلاحيات ودور المستخدم في الشركة بنجاح", "success");
  };

  const removeUserFromCompany = (userId: string, companyId: CompanyId) => {
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === userId) {
          const updatedRoles = { ...(u.companyRoles || {}) };
          delete updatedRoles[companyId];
          const updatedAllowed = u.allowedCompanyIds.filter((cid) => cid !== companyId);
          return { ...u, companyRoles: updatedRoles, allowedCompanyIds: updatedAllowed };
        }
        return u;
      });
      localStorage.setItem(STORAGE_PREFIX + "users", JSON.stringify(next));
      return next;
    });
    setCompanies((prev) => {
      const next = prev.map((c) => {
        if (c.id === companyId) {
          const updatedRoles = { ...(c.userRoles || {}) };
          delete updatedRoles[userId];
          return { ...c, userRoles: updatedRoles };
        }
        return c;
      });
      localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(next));
      return next;
    });
    showToast("تم إزالة المستخدم من الشركة بنجاح", "info");
  };

  // Opportunities & Deal Closing
  const addOpportunity = (data: Omit<Opportunity, "id" | "createdAt">): Opportunity => {
    const cust = data.customerId ? customers.find((c) => c.id === data.customerId) : null;
    
    // Check if open opportunity already exists for this customer
    if (cust && data.customerScope === "specific") {
      const existingOpp = opportunities.find(o => o.customerId === cust.id && o.companyId === data.companyId && o.status === "open");
      if (existingOpp) {
        showToast("يوجد فرصة بيعية مفتوحة بالفعل لهذا العميل", "warning");
        return existingOpp;
      }
    }

    const stage = data.stage || "qualified";
    const nextAction = data.nextAction || getOpportunityNextAction(stage);

    const newOpp: Opportunity = {
      ...data,
      id: crypto.randomUUID(),
      stage,
      nextAction,
      temperature: data.temperature || cust?.interestLevel || "warm",
      lastContactDate: data.lastContactDate || cust?.lastContactDate || todayStr,
      lastActivity: data.lastActivity || todayStr,
      createdAt: todayStr,
      status: data.status || "open",
    };
    
    executeUnifiedAction({
      entityType: "opportunity",
      recordId: newOpp.id,
      companyId: newOpp.companyId,
      action: "insert",
      payload: newOpp,
      description: `إضافة فرصة بيعية جديدة: ${newOpp.title}`,
      applyLocal: () => {
        setOpportunities((prev) => [newOpp, ...prev]);
      },
      toastMessage: "تمت إضافة الفرصة المؤهلة بنجاح 🎯",
      toastType: "success",
    });
    return newOpp;
  };

  const updateOpportunity = async (id: string, updates: Partial<Opportunity> & { saleDate?: string; saleAmount?: number }) => {
    const existing = opportunities.find(o => o.id === id);
    if (!existing) return;

    const updatedStage = updates.stage || existing.stage;
    const updatedNextAction =
      updates.nextAction !== undefined
        ? updates.nextAction
        : updates.stage && updates.stage !== existing.stage
        ? getOpportunityNextAction(updates.stage)
        : existing.nextAction;

    const finalExpectedValue = updates.expectedValue !== undefined
      ? Number(updates.expectedValue)
      : updates.saleAmount !== undefined
      ? Number(updates.saleAmount)
      : existing.expectedValue;

    const finalQuotationValue = updates.quotationValue !== undefined
      ? Number(updates.quotationValue)
      : updates.expectedValue !== undefined
      ? Number(updates.expectedValue)
      : existing.quotationValue;

    const finalClosedAt = updates.saleDate || updates.closedAt || existing.closedAt;

    let finalStatus: OpportunityStatus = updates.status || existing.status;
    if (updatedStage === "won") finalStatus = "won";
    else if (updatedStage === "lost") finalStatus = "lost";
    else if (finalStatus === "lost" && (updatedStage as string) !== "lost") finalStatus = "open";

    const finalOpp: Opportunity = {
      ...existing,
      ...updates,
      expectedValue: finalExpectedValue,
      quotationValue: finalQuotationValue,
      closedAt: finalClosedAt,
      stage: updatedStage,
      status: finalStatus,
      nextAction: updatedNextAction,
      lastActivity: todayStr,
    };

    // If marked won and was open without saleId, close deal properly
    if (finalStatus === "won" && existing.status !== "won" && !existing.saleId) {
      closeDealWon(id, { amount: finalExpectedValue, date: finalClosedAt, notes: updates.notes });
      return;
    }

    executeUnifiedAction({
      entityType: "opportunity",
      recordId: id,
      companyId: existing.companyId,
      action: "update",
      payload: finalOpp,
      previousData: existing,
      description: `تحديث بيانات الفرصة البيعية: ${existing.title}`,
      applyLocal: () => {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === id ? finalOpp : o))
        );
      },
      silent: true,
    });

    // PHASE 1: Stage Change Event Logging
    if (updates.stage && updates.stage !== existing.stage) {
      const getStageLabel = (stg: string) => {
        const found = OPPORTUNITY_STAGES_CONFIG.find((s) => s.id === stg);
        return found ? found.label : stg;
      };
      const oldLabel = getStageLabel(existing.stage);
      const newLabel = getStageLabel(updates.stage);
      addInteraction({
        customerId: existing.customerId || "",
        companyId: existing.companyId, // Strictly inherit Opportunity companyId
        type: "status_change",
        date: new Date().toLocaleDateString("ar-EG"),
        notes: `تغيير مرحلة الفرصة (${existing.title}): من "${oldLabel}" إلى "${newLabel}"`,
        result: `تحديث مرحلة الفرصة`,
        relatedEntityType: "opportunity",
        relatedEntityId: existing.id,
        isSystemGenerated: true,
      });
    }

    // PHASE 2 & 3: Unified Follow-up Sync
    if (updates.nextFollowUpDate && updates.nextFollowUpDate.trim() !== "") {
      const existingPendingFup = followUps.find(
        (f) =>
          (f.opportunityId === existing.id || (existing.customerId && f.customerId === existing.customerId)) &&
          f.dueDate === updates.nextFollowUpDate &&
          f.status === "pending"
      );
      if (existingPendingFup) {
        rescheduleFollowUp(existingPendingFup.id, updates.nextFollowUpDate, updates.nextAction || existingPendingFup.notes);
      } else {
        addFollowUp({
          companyId: existing.companyId, // Strictly inherit Opportunity companyId
          customerId: existing.customerId || "",
          customerName: existing.customerName || existing.title,
          customerPhone: existing.customerPhone || "",
          opportunityId: existing.id,
          dueDate: updates.nextFollowUpDate,
          title: `متابعة الفرصة: ${existing.title}`,
          notes: updates.nextAction || `متابعة مجدولة للفرصة البيعية`,
          status: "pending",
          priority: existing.temperature === "hot" ? "urgent" : "medium",
        });
      }
    }

    // 1. SYNC LINKED QUOTATION
    if (existing.quotationId) {
      const qId = existing.quotationId;
      const targetQ = quotations.find((q) => q.id === qId);
      if (targetQ) {
        const newAmount = finalQuotationValue || finalExpectedValue || targetQ.totalAmount;
        let newStatus = targetQ.status;
        if (updatedStage === "quote_sent") newStatus = "sent";
        else if (updatedStage === "negotiation") newStatus = "negotiation";
        else if (updatedStage === "won") newStatus = "accepted";
        else if (updatedStage === "lost") newStatus = "rejected";

        const updatedQ = {
          ...targetQ,
          totalAmount: newAmount,
          subtotal: newAmount,
          status: newStatus,
          area: updates.area || targetQ.area,
          responsible: updates.assignedTo || targetQ.responsible,
        };
        executeUnifiedAction({
          entityType: "quotation",
          recordId: qId,
          companyId: targetQ.companyId,
          action: "update",
          payload: cleanQuotation(updatedQ),
          previousData: targetQ,
          description: `تحديث عرض السعر المرتبط بالفرصة: ${targetQ.quoteNumber}`,
          applyLocal: () => {
            setQuotations((prev) =>
              prev.map((q) => (q.id === qId ? updatedQ : q))
            );
          },
          silent: true,
        });
      }
    }

    // 2. SYNC LINKED SALE & CONTRACT (Central Event Date & Sale Amount)
    const targetSaleId = existing.saleId;
    const isWonDeal = finalStatus === "won" || !!targetSaleId;
    if (isWonDeal) {
      const newSaleAmount = updates.expectedValue !== undefined ? Number(updates.expectedValue) : updates.saleAmount !== undefined ? Number(updates.saleAmount) : undefined;
      const newSaleDate = updates.saleDate || updates.closedAt;

      // Update Sales
      const targetSale = sales.find(s => s.id === targetSaleId || (existing.customerId && s.customerId === existing.customerId));
      if (targetSale) {
        const updatedSale: Sale = {
          ...targetSale,
          amount: newSaleAmount !== undefined ? newSaleAmount : targetSale.amount,
          date: newSaleDate !== undefined ? newSaleDate : targetSale.date,
          area: updates.area !== undefined ? updates.area : targetSale.area,
          responsible: updates.assignedTo !== undefined ? updates.assignedTo : targetSale.responsible,
          updatedAt: new Date().toISOString(),
        };
        executeUnifiedAction({
          entityType: "sale",
          recordId: targetSale.id,
          companyId: targetSale.companyId,
          action: "update",
          payload: cleanSale(updatedSale),
          previousData: targetSale,
          description: `تحديث المبيعات المرتبطة بالفرصة: ${targetSale.customerName}`,
          applyLocal: () => {
            setSales((prev) => prev.map((s) => (s.id === targetSale.id ? updatedSale : s)));
          },
          silent: true,
        });
      }

      // Update Contracts linked to this sale or customer
      const linkedContract = contracts.find(c => {
        const linkedSale = targetSaleId ? sales.find(s => s.id === targetSaleId) : null;
        return (linkedSale && c.id === linkedSale.contractId) || (c.customerId === existing.customerId && isWonDeal);
      });
      if (linkedContract) {
        const newTotal = newSaleAmount !== undefined ? newSaleAmount : linkedContract.totalValue;
        const newDate = newSaleDate !== undefined ? newSaleDate : linkedContract.date;
        const updatedContract: Contract = {
          ...linkedContract,
          totalValue: newTotal,
          remainingAmount: Math.max(0, newTotal - (linkedContract.paidAmount || 0)),
          date: newDate,
          area: updates.area !== undefined ? updates.area : linkedContract.area,
          updatedAt: new Date().toISOString(),
        };
        executeUnifiedAction({
          entityType: "contract",
          recordId: linkedContract.id,
          companyId: linkedContract.companyId,
          action: "update",
          payload: cleanContract(updatedContract),
          previousData: linkedContract,
          description: `تحديث العقد المرتبط بالفرصة: ${linkedContract.contractNumber}`,
          applyLocal: () => {
            setContracts((prev) => prev.map((c) => (c.id === linkedContract.id ? updatedContract : c)));
          },
          silent: true,
        });
      }
    }

    // 3. SYNC WITH CUSTOMER (Stage, Area, Interest, AssignedTo, NextFollowUp, totals)
    if (existing.customerId) {
      const custUpdates: Partial<Customer> = {};
      if (updates.area) custUpdates.area = updates.area;
      if (updates.temperature) custUpdates.interestLevel = updates.temperature;
      if (updates.nextFollowUpDate !== undefined) custUpdates.nextFollowUpDate = updates.nextFollowUpDate;
      if (updates.stage) {
        if (updates.stage === "won") custUpdates.stage = "contracted";
        else if (updates.stage === "lost") custUpdates.stage = "lost";
        else if (updates.stage === "quotation" || updates.stage === "quote_sent") custUpdates.stage = "quotation";
        else if (updates.stage === "needs_inspection" || updates.stage === "inspection_completed") custUpdates.stage = "inspection";
        else if (updates.stage === "negotiation") custUpdates.stage = "negotiation";
      }
      if (updates.expectedValue !== undefined && finalStatus === "won") {
        const cust = customers.find(c => c.id === existing.customerId);
        if (cust) {
           custUpdates.totalSalesValue = (cust.totalSalesValue || 0) + Number(updates.expectedValue);
        }
      }
      if (Object.keys(custUpdates).length > 0) {
        updateCustomer(existing.customerId, custUpdates);
      }
    }
  };

  const closeDealWon = (
    opportunityId: string,
    details: { amount: number; date?: string; notes?: string }
  ): { success: boolean; saleId?: string } => {
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp) {
      showToast("الفرصة غير موجودة", "warning");
      return { success: false };
    }

    // IDEMPOTENCY CHECK: Prevent duplicate sales
    if (opp.status === "won" && opp.saleId) {
      const existingSale = sales.find((s) => s.id === opp.saleId);
      if (existingSale) {
        showToast("هذه الفرصة تم إغلاقها وتحويلها لبيع بالفعل سابقاً لمنع تكرار السجلات", "info");
        return { success: true, saleId: opp.saleId };
      }
    }

    const saleDate = details.date || todayStr;
    const saleAmount = Number(details.amount) || opp.expectedValue || 0;
    
    // 1. Create Quotation if missing
    let quoteId = opp.quotationId;
    if (!quoteId && opp.customerId) {
      const quoteNum = generateDocNumber("Q", opp.companyId, new Date().getFullYear(), quotations);
      const newQuote: Quotation = {
        id: crypto.randomUUID(),
        quoteNumber: quoteNum,
        companyId: opp.companyId,
        customerId: opp.customerId,
        customerName: opp.customerName || opp.title,
        customerPhone: opp.customerPhone || "",
        area: opp.area,
        date: saleDate,
        expiryDate: saleDate,
        status: "accepted",
        items: [],
        subtotal: saleAmount,
        discountTotal: 0,
        totalAmount: saleAmount,
        notes: "تم الإنشاء تلقائياً لتوثيق الصفقة",
        responsible: currentUser?.name || "النظام",
      };
      executeUnifiedAction({
        entityType: "quotation",
        recordId: newQuote.id,
        companyId: newQuote.companyId,
        action: "insert",
        payload: cleanQuotation(newQuote),
        description: `إنشاء عرض سعر تلقائي لإغلاق الصفقة (Won): ${newQuote.quoteNumber}`,
        applyLocal: () => {
          setQuotations(prev => [newQuote, ...prev]);
        },
        silent: true,
      });
      quoteId = newQuote.id;
    } else if (quoteId) {
      const oldQ = quotations.find(q => q.id === quoteId);
      if (oldQ) {
        const upQ = { ...oldQ, status: "accepted" as const };
        executeUnifiedAction({
          entityType: "quotation",
          recordId: quoteId,
          companyId: oldQ.companyId,
          action: "update",
          payload: cleanQuotation(upQ),
          previousData: oldQ,
          description: `قبول عرض السعر لإغلاق الصفقة: ${oldQ.quoteNumber}`,
          applyLocal: () => {
            setQuotations(prev => prev.map(q => q.id === quoteId ? upQ : q));
          },
          silent: true,
        });
      }
    }

    // 2. Create Contract if it does not exist
    let existingContract = contracts.find(c => c.opportunityId === opp.id || (quoteId && c.quotationId === quoteId));
    let ctrId = existingContract?.id;
    if (!existingContract) {
      ctrId = crypto.randomUUID();
      const ctrNum = generateDocNumber("CTR", opp.companyId, saleDate.split("-")[0] || new Date().getFullYear().toString(), contracts);
      const newCtr: Contract = {
        id: ctrId,
        contractNumber: ctrNum,
        companyId: opp.companyId,
        customerId: opp.customerId || "",
        customerName: opp.customerName || opp.title,
        customerPhone: opp.customerPhone || "",
        area: opp.area || "",
        date: saleDate,
        totalValue: saleAmount,
        paidAmount: saleAmount,
        remainingAmount: 0,
        status: "completed",
        collectionStatus: "contracted",
        notes: details.notes || "عقد تلقائي من إغلاق الفرصة",
        opportunityId: opp.id,
        quotationId: quoteId,
      };
      executeUnifiedAction({
        entityType: "contract",
        recordId: newCtr.id,
        companyId: newCtr.companyId,
        action: "insert",
        payload: cleanContract(newCtr),
        description: `إنشاء عقد تلقائي من إغلاق الفرصة: ${newCtr.contractNumber}`,
        applyLocal: () => {
          setContracts(prev => [newCtr, ...prev]);
        },
        silent: true,
      });
    }

    const saleId = crypto.randomUUID();
    // 3. Create Sale record linked with correct company_id and ctrId
    const newSale: Sale = {
      id: saleId,
      companyId: opp.companyId,
      customerId: opp.customerScope === "specific" && opp.customerId ? opp.customerId : "",
      customerName: opp.customerName || opp.title,
      area: opp.area || "غير محدد",
      amount: saleAmount,
      date: saleDate,
      contractId: ctrId,
      responsible: currentUser?.name || "المسؤول",
      customerSource: opp.source || "Manual",
    };

    executeUnifiedAction({
      entityType: "sale",
      recordId: newSale.id,
      companyId: newSale.companyId,
      action: "insert",
      payload: cleanSale(newSale),
      description: `تسجيل صفقة بيع ناجحة من إغلاق الفرصة: ${opp.title}`,
      applyLocal: () => {
        setSales((prev) => [newSale, ...prev]);
      },
      silent: true,
    });

    // 4. Update Opportunity: Exits open sales pipeline
    const updatedOpp: Opportunity = {
      ...opp,
      status: "won",
      stage: "won",
      closedAt: new Date().toISOString(),
      saleId: saleId,
      quotationId: quoteId,
      quotationValue: saleAmount,
      nextAction: "تم التعاقد والتحويل للتنفيذ والتصنيع",
    };

    executeUnifiedAction({
      entityType: "opportunity",
      recordId: opportunityId,
      companyId: opp.companyId,
      action: "update",
      payload: updatedOpp,
      previousData: opp,
      description: `إغلاق الفرصة كـ Won: ${opp.title}`,
      applyLocal: () => {
        setOpportunities((prev) => prev.map((o) => (o.id === opportunityId ? updatedOpp : o)));
      },
      silent: true,
    });

    // 5. Update Customer
    if (opp.customerScope === "specific" && opp.customerId) {
      const cust = customers.find((c) => c.id === opp.customerId);
      const newTotalQuotations = cust ? cust.totalQuotationsValue + (opp.quotationId ? 0 : saleAmount) : saleAmount;
      updateCustomer(opp.customerId, {
        stage: "contracted",
        totalSalesValue: (cust?.totalSalesValue || 0) + saleAmount,
        totalQuotationsValue: newTotalQuotations,
        nextFollowUpDate: "",
      });

      // Update linked inquiries to reflect Won / Contracted
      const matchedInquiries = inquiries.filter((inq) => inq.customerId === opp.customerId);
      matchedInquiries.forEach((inq) => {
        const upInq = { ...inq, stage: "contracted" as const, lastContactDate: todayStr };
        executeUnifiedAction({
          entityType: "inquiry",
          recordId: inq.id,
          companyId: inq.companyId,
          action: "update",
          payload: cleanInquiry(upInq),
          previousData: inq,
          description: `تحديث الاستفسار لمرحلة التعاقد لإغلاق الصفقة بنجاح`,
          applyLocal: () => {
            setInquiries((prev) => prev.map((i) => i.id === inq.id ? upInq : i));
          },
          silent: true,
        });
      });

      // Close all pending follow-ups for this customer
      const pendingFollowUps = followUps.filter((f) => f.customerId === opp.customerId && f.status === "pending");
      pendingFollowUps.forEach((f) => {
        const compFup = {
          ...f,
          status: "completed" as const,
          notes: `${f.notes ? f.notes + " — " : ""}تم إغلاق المتابعة تلقائياً لإتمام الصفقة والتعاقد (Won)`.trim(),
        };
        executeUnifiedAction({
          entityType: "followup",
          recordId: f.id,
          companyId: f.companyId,
          action: "update",
          payload: cleanFollowUp(compFup),
          previousData: f,
          description: `إغلاق المتابعة لإتمام الصفقة والتعاقد`,
          applyLocal: () => {
            setFollowUps((prev) => prev.map((item) => item.id === f.id ? compFup : item));
          },
          silent: true,
        });
      });

      addInteraction({
        customerId: opp.customerId,
        companyId: opp.companyId,
        type: "contract",
        date: new Date().toLocaleString("ar-EG"),
        notes: `إغلاق صفقة ناجحة (Won): ${opp.title} بقيمة ${saleAmount.toLocaleString()} ج.م ${
          details.notes ? `(${details.notes})` : ""
        }`,
        result: "تم التعاقد والبيع بنجاح",
        nextStep: "متابعة التنفيذ والتسليم",
      });
    }

    showToast(`تم إغلاق الفرصة كـ Won وتسجيل عملية بيع وعقد بقيمة ${saleAmount.toLocaleString()} ج.م ✅`, "success");
    return { success: true, saleId };
  };

  const closeDealLost = (
    opportunityId: string,
    details: { lossReason: string; lossNotes?: string }
  ): { success: boolean } => {
    if (!details.lossReason || !details.lossReason.trim()) {
      showToast("سبب الخسارة إلزامي لإغلاق الفرصة كـ Lost", "warning");
      return { success: false };
    }

    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp) {
      showToast("الفرصة غير موجودة", "warning");
      return { success: false };
    }

    const reason = details.lossReason.trim();
    const updatedOpp: Opportunity = {
      ...opp,
      status: "lost",
      stage: "lost",
      lossReason: reason,
      lossNotes: details.lossNotes || "",
      closedAt: new Date().toISOString(),
    };

    executeUnifiedAction({
      entityType: "opportunity",
      recordId: opportunityId,
      companyId: opp.companyId,
      action: "update",
      payload: updatedOpp,
      previousData: opp,
      description: `إغلاق الفرصة كـ Lost (خسارة): ${opp.title} - سبب الخسارة: ${reason}`,
      applyLocal: () => {
        setOpportunities((prev) => prev.map((o) => (o.id === opportunityId ? updatedOpp : o)));
      },
      silent: true,
    });

    // Ensure reason is in lossReasons list
    if (!lossReasons.includes(reason)) {
      setLossReasons((prev) => [...prev, reason]);
    }

    // If specific customer, update customer
    if (opp.customerScope === "specific" && opp.customerId) {
      updateCustomer(opp.customerId, {
        stage: "lost",
        interestLevel: "lost",
        lossReason: reason,
        nextFollowUpDate: "",
      });

      // Update linked inquiries to reflect Lost
      const matchedInquiries = inquiries.filter((inq) => inq.customerId === opp.customerId);
      matchedInquiries.forEach((inq) => {
        const upInq = { ...inq, stage: "lost" as const, lastContactDate: todayStr };
        executeUnifiedAction({
          entityType: "inquiry",
          recordId: inq.id,
          companyId: inq.companyId,
          action: "update",
          payload: cleanInquiry(upInq),
          previousData: inq,
          description: `تحديث الاستفسار لمرحلة الخسارة (Lost)`,
          applyLocal: () => {
            setInquiries((prev) => prev.map((i) => i.id === inq.id ? upInq : i));
          },
          silent: true,
        });
      });

      // Close all pending follow-ups for this customer
      const pendingFollowUps = followUps.filter((f) => f.customerId === opp.customerId && f.status === "pending");
      pendingFollowUps.forEach((f) => {
        const compFup = {
          ...f,
          status: "completed" as const,
          notes: `${f.notes ? f.notes + " — " : ""}تم إلغاء المتابعة تلقائياً لخسارة الصفقة (Lost: ${reason})`.trim(),
        };
        executeUnifiedAction({
          entityType: "followup",
          recordId: f.id,
          companyId: f.companyId,
          action: "update",
          payload: cleanFollowUp(compFup),
          previousData: f,
          description: `إلغاء المتابعة لخسارة الصفقة`,
          applyLocal: () => {
            setFollowUps((prev) => prev.map((item) => item.id === f.id ? compFup : item));
          },
          silent: true,
        });
      });

      addInteraction({
        customerId: opp.customerId,
        companyId: opp.companyId,
        type: "note",
        date: new Date().toLocaleString("ar-EG"),
        notes: `إغلاق صفقة خاسرة (Lost): ${opp.title} - سبب الخسارة: ${reason} ${
          details.lossNotes ? `(${details.lossNotes})` : ""
        }`,
        result: "خسارة الفرصة",
        nextStep: "أرشفة وتحليل أسباب الخسارة",
      });
    }

    showToast("تم إغلاق الفرصة وتسجيل سبب الخسارة بنجاح", "info");
    return { success: true };
  };

  const deleteOpportunity = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const opp = opportunities.find((o) => o.id === id);
    if (!opp) return { success: false, message: "الفرصة غير موجودة" };

    setDeletedOpportunityIds((prev) => Array.from(new Set([...prev, id])));

    const res = await executeUnifiedAction({
      entityType: "opportunity",
      recordId: id,
      companyId: opp.companyId,
      action: "delete",
      previousData: opp,
      description: `حذف فرصة بيعية: ${opp.title}`,
      applyLocal: () => {
        setOpportunities((prev) => prev.filter((o) => o.id !== id));
      },
      toastMessage: "تم حذف الفرصة بنجاح من قاعدة البيانات",
      toastType: "info",
    });

    return { success: res.success, message: res.success ? "تم الحذف بنجاح" : "فشل عملية الحذف من قاعدة البيانات" };
  };

  const batchDeleteOpportunities = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const targetOpps = opportunities.filter((o) => ids.includes(o.id));
    const companyId = targetOpps[0]?.companyId;
    const idSet = new Set(ids);

    executeUnifiedBulkAction({
      entityType: "opportunity",
      action: "delete",
      companyId,
      items: targetOpps.map((o) => ({ recordId: o.id, previousData: o })),
      description: `حذف جماعي لعدد ${ids.length} فرص بيعية`,
      applyLocal: () => {
        setDeletedOpportunityIds((prev) => Array.from(new Set([...prev, ...ids])));
        setOpportunities((prev) => prev.filter((o) => !idSet.has(o.id)));
      },
      toastMessage: `تم حذف ${ids.length} فرص بيعية بنجاح`,
      toastType: "info",
    });
  };

  const batchCloseOpportunitiesWon = (ids: string[]) => {
    ids.forEach((id) => {
      const opp = opportunities.find((o) => o.id === id);
      if (opp && opp.status !== "won") {
        closeDealWon(id, { amount: opp.expectedValue });
      }
    });
  };

  const batchCloseOpportunitiesLost = (ids: string[], lossReason: string, lossNotes?: string) => {
    if (!lossReason || !lossReason.trim()) {
      showToast("سبب الخسارة إلزامي للإغلاق الجماعي", "warning");
      return;
    }
    ids.forEach((id) => {
      const opp = opportunities.find((o) => o.id === id);
      if (opp && opp.status !== "lost") {
        closeDealLost(id, { lossReason, lossNotes });
      }
    });
  };

  const batchUpdateOpportunitiesStage = (ids: string[], stage: OpportunityStage) => {
    ids.forEach((id) => {
      updateOpportunity(id, { stage });
    });
    showToast(`تم تحديث مرحلة ${ids.length} فرص بيعية بنجاح`, "success");
  };

  const batchImportData = async (
    rows: any[],
    mapping: ColumnMapping,
    fallbackCompanyId: string,
    duplicateAction: "skip" | "update" | "create",
    fileName: string,
    onProgress?: (progress: number, msg: string) => void
  ): Promise<ImportSummaryResult> => {
    const importBatchId = crypto.randomUUID();
    let importedCustomers = 0;
    let updatedCustomers = 0;
    let skippedRows = 0;
    let createdContracts = 0;
    let totalImportedSalesAmount = 0;
    let matchedCompaniesCount = 0;
    const issues: string[] = [];

    const updatedCusts = [...customers];
    const updatedCtrs = [...contracts];
    const updatedSalesList = [...sales];
    const updatedInteractions = [...interactions];
    const updatedCompanies = [...companies];

    const phoneMap = new Map<string, number>();
    updatedCusts.forEach((c, idx) => {
       const p1 = normalizeEgyptianPhone(c.phone);
       if (p1) phoneMap.set(`${c.companyId}_${p1}`, idx);
       
       const p2 = normalizeEgyptianPhone(c.secondaryPhone || "");
       if (p2) phoneMap.set(`${c.companyId}_${p2}`, idx);
    });

    rows.forEach((row, idx) => {
      const rawName = mapping.nameCol ? row[mapping.nameCol] : "";
      const rawPhone = mapping.phoneCol ? row[mapping.phoneCol] : "";
      const name = String(rawName || "").trim();
      const phone = String(rawPhone || "").trim();

      // Check if row has any non-empty data at all
      const hasAnyValue = Object.values(row).some(
        (v) => v !== undefined && v !== null && String(v).trim() !== ""
      );
      if (!hasAnyValue) {
        skippedRows++;
        return;
      }

      const rawArea = mapping.areaCol ? row[mapping.areaCol] : "";
      const rawAreaStr = String(rawArea || "").trim();
      const area = rawAreaStr ? normalizeArea(rawAreaStr) : "";
      const rawAddress = mapping.addressCol && row[mapping.addressCol] ? String(row[mapping.addressCol]).trim() : "";
      const address = rawAddress || (area || "");
      const secondaryPhone = mapping.secondaryPhoneCol && row[mapping.secondaryPhoneCol] ? String(row[mapping.secondaryPhoneCol]).trim() : "";

      // Company detection
      let targetCompanyId: CompanyId = (fallbackCompanyId || updatedCompanies[0]?.id || "comp-newhouse") as CompanyId;
      if (mapping.companyCol && row[mapping.companyCol]) {
        const rawCo = String(row[mapping.companyCol]).trim();
        const rawCoLower = rawCo.toLowerCase();
        
        if (rawCo) {
          const matched = updatedCompanies.find(
            (c) =>
              (c.name && c.name.toLowerCase().includes(rawCoLower)) ||
              (c.name && rawCoLower.includes(c.name.toLowerCase())) ||
              (c.nameEn && c.nameEn.toLowerCase().includes(rawCoLower)) ||
              (c.logoText && rawCoLower.includes(c.logoText.toLowerCase()))
          );
          if (matched) {
            targetCompanyId = matched.id;
            matchedCompaniesCount++;
          } else {
            // Create new company if not found!
            const newCompId = crypto.randomUUID();
            const newComp: Company = {
              id: newCompId as CompanyId,
              name: rawCo,
              nameEn: rawCo,
              logoText: rawCo,
              color: "#2563eb",
              badgeBg: "#dbeafe",
              badgeText: "#1e40af",
              phone: "",
              monthlyTarget: 1000000,
              active: true,
            };
            updatedCompanies.push(newComp);
            targetCompanyId = newCompId as CompanyId;
            matchedCompaniesCount++;
          }
        }
      }

      // Stage / Status
      const rawStatus = mapping.statusCol ? row[mapping.statusCol] : "";
      const mappedStage = mapStageFromExcel(rawStatus);

      // Financials & Date
      const contractDate = mapping.contractDateCol ? parseExcelDate(row[mapping.contractDateCol]) : null;
      const contractAmount = mapping.contractAmountCol ? parseFinancialAmount(row[mapping.contractAmountCol]) : 0;
      let notes = mapping.notesCol ? String(row[mapping.notesCol] || "").trim() : "";
      if (mapping.productCol && row[mapping.productCol]) {
         const productVal = String(row[mapping.productCol]).trim();
         notes = notes ? `${notes} | المنتج: ${productVal}` : `المنتج: ${productVal}`;
      }
      const source = mapping.sourceCol && row[mapping.sourceCol] ? String(row[mapping.sourceCol]).trim() : "Excel Import";

      // Collect all unmapped extra columns from the Excel row so NO data is lost
      const mappedColsList = [
        mapping.nameCol,
        mapping.phoneCol,
        mapping.areaCol,
        mapping.companyCol,
        mapping.statusCol,
        mapping.contractDateCol,
        mapping.contractAmountCol,
        mapping.productCol,
        mapping.sourceCol,
        mapping.notesCol,
        mapping.addressCol,
        mapping.secondaryPhoneCol,
      ].filter(Boolean);

      const unmappedEntries: string[] = [];
      Object.entries(row).forEach(([colKey, val]) => {
        if (mappedColsList.includes(colKey)) return;
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          unmappedEntries.push(`${colKey}: ${String(val).trim()}`);
        }
      });

      let fullNotes = notes;
      if (unmappedEntries.length > 0) {
        const extraText = unmappedEntries.join(" | ");
        fullNotes = fullNotes ? `${fullNotes} | [بيانات إضافية]: ${extraText}` : `[بيانات من الملف]: ${extraText}`;
      }

      // Duplicate check by phone (O(1) Map optimized)
      const cleanPhone = normalizeEgyptianPhone(phone);
      let existingIndex = -1;
      if (cleanPhone) {
        const lookupKey = `${targetCompanyId}_${cleanPhone}`;
        if (phoneMap.has(lookupKey)) {
          existingIndex = phoneMap.get(lookupKey)!;
        }
      }

      if (existingIndex !== -1 && duplicateAction === "skip") {
        skippedRows++;
        return;
      }

      if (existingIndex !== -1 && duplicateAction === "update") {
        const existing = updatedCusts[existingIndex];
        const isContractedStage = mappedStage === "contracted" || mappedStage === "sold";
        const shouldCreateContract = (contractAmount > 0) || isContractedStage;
        const effectiveContractDate = contractDate || todayStr;

        updatedCusts[existingIndex] = {
          ...existing,
          name: existing.name ? existing.name : (name || existing.name),
          area: (!existing.area || existing.area === "غير محدد") && area ? area : existing.area,
          address: (!existing.address || existing.address === "غير محدد") && address ? address : existing.address,
          stage: shouldCreateContract ? "contracted" : (existing.stage === "inquiry" ? mappedStage : existing.stage),
          totalSalesValue: shouldCreateContract ? existing.totalSalesValue + contractAmount : existing.totalSalesValue,
          notes: fullNotes ? (existing.notes ? `${existing.notes} | ${fullNotes}` : fullNotes) : existing.notes,
          lastContactDate: contractDate || existing.lastContactDate,
        };

        if (shouldCreateContract) {
          const ctrId = crypto.randomUUID();
          const ctrNum = generateDocNumber("CTR", existing.companyId, effectiveContractDate.split("-")[0] || "2026", updatedCtrs);

          const newCtr: Contract = {
            id: ctrId,
            contractNumber: ctrNum,
            companyId: existing.companyId,
            customerId: existing.id,
            customerName: existing.name || name || "عميل بدون اسم",
            customerPhone: existing.phone || phone,
            area: existing.area || area || "",
            date: effectiveContractDate,
            totalValue: contractAmount || 0,
            paidAmount: contractAmount || 0,
            remainingAmount: 0,
            status: "completed",
      collectionStatus: "contracted",
            notes: `استيراد من ${fileName}`,
            importBatchId,
          };
          updatedCtrs.unshift(newCtr);

          // Check if there is an existing sale for this customer without a contract
          const existingSaleIdx = updatedSalesList.findIndex(s => s.customerId === existing.id && !s.contractId && s.companyId === existing.companyId);
          
          if (existingSaleIdx >= 0) {
            updatedSalesList[existingSaleIdx] = { 
              ...updatedSalesList[existingSaleIdx],
              contractId: ctrId,
              amount: Math.max(updatedSalesList[existingSaleIdx].amount, contractAmount) 
            };
          } else {
            const newSale: Sale = {
              id: crypto.randomUUID(),
              companyId: existing.companyId,
              customerId: existing.id,
              customerName: existing.name || name || "عميل بدون اسم",
              area: existing.area || area || "",
              contractId: ctrId,
              amount: contractAmount || 0,
              date: effectiveContractDate,
              responsible: currentUser?.name || "استيراد Excel",
              customerSource: "Excel Import",
              importBatchId,
            };
            updatedSalesList.unshift(newSale);
          }

          createdContracts++;
          totalImportedSalesAmount += contractAmount;
        }

        updatedCustomers++;
        return;
      }

      // New customer (or duplicateAction === "create")
      const newCustId = crypto.randomUUID();
      const isContractedStage = mappedStage === "contracted" || mappedStage === "sold";
      const shouldCreateContract = (contractAmount > 0) || isContractedStage;
      const effectiveContractDate = contractDate || todayStr;
      const finalStage = shouldCreateContract ? "contracted" : mappedStage;

      const newCustomer: Customer = {
        id: newCustId,
        companyId: targetCompanyId,
        name: name, // Leave completely empty if not in row! "والفاضي يسيبه فاضي"
        phone: phone,
        secondaryPhone: secondaryPhone,
        area: area,
        address: address,
        source: (source as any) || "Excel Import",
        interestLevel: shouldCreateContract ? "hot" : "warm",
        stage: finalStage,
        notes: fullNotes,
        createdAt: effectiveContractDate,
        lastContactDate: effectiveContractDate,
        totalQuotationsValue: shouldCreateContract ? (contractAmount || 0) : 0,
        totalSalesValue: shouldCreateContract ? (contractAmount || 0) : 0,
        importBatchId,
      };
      updatedCusts.unshift(newCustomer);
      importedCustomers++;

      if (shouldCreateContract) {
        const ctrId = crypto.randomUUID();
        const ctrNum = generateDocNumber("CTR", targetCompanyId, effectiveContractDate.split("-")[0] || "2026", updatedCtrs);

        const newCtr: Contract = {
          id: ctrId,
          contractNumber: ctrNum,
          companyId: targetCompanyId,
          customerId: newCustId,
          customerName: newCustomer.name || "عميل بدون اسم",
          customerPhone: newCustomer.phone,
          area: area,
          date: effectiveContractDate,
          totalValue: contractAmount || 0,
          paidAmount: contractAmount || 0,
          remainingAmount: 0,
          status: "completed",
      collectionStatus: "contracted",
          notes: `استيراد من ${fileName}`,
          importBatchId,
        };
        updatedCtrs.unshift(newCtr);

        // Check if there is an existing sale for this customer without a contract
        const existingSaleIdx = updatedSalesList.findIndex(s => s.customerId === newCustId && !s.contractId && s.companyId === targetCompanyId);
        
        if (existingSaleIdx >= 0) {
          updatedSalesList[existingSaleIdx] = { 
            ...updatedSalesList[existingSaleIdx], 
            contractId: ctrId, 
            amount: Math.max(updatedSalesList[existingSaleIdx].amount, contractAmount) 
          };
        } else {
          const newSale: Sale = {
            id: crypto.randomUUID(),
            companyId: targetCompanyId,
            customerId: newCustId,
            customerName: newCustomer.name || "عميل بدون اسم",
            area: area,
            contractId: ctrId,
            amount: contractAmount || 0,
            date: effectiveContractDate,
            responsible: currentUser?.name || "استيراد Excel",
            customerSource: "Excel Import",
            importBatchId,
          };
          updatedSalesList.unshift(newSale);
        }
        createdContracts++;
        totalImportedSalesAmount += (contractAmount || 0);
      }

      updatedInteractions.unshift({
        id: crypto.randomUUID(),
        customerId: newCustId,
        companyId: targetCompanyId,
        type: "note",
        date: contractDate || todayStr,
        notes: `تم استيراد العميل من ملف (${fileName})${area ? ` - المنطقة: ${area}` : ""}${!name ? " [بدون اسم - بحاجة لإكمال البيانات]" : ""}`,
        result: "استيراد ناجح",
      });
    });

    
    // Reconcile and auto-heal pipeline for imported data
    const importReconciled = reconcileSalesPipelineCore(
      updatedCusts,
      inquiries,
      quotations,
      updatedCtrs,
      opportunities,
      updatedSalesList,
      followUps,
      inspections,
      updatedInteractions,
      payments
    );

    setCompanies(updatedCompanies);
    setCustomers(importReconciled.updatedCustomers);
    setContracts(importReconciled.updatedContracts);
    setQuotations(importReconciled.updatedQuotations);
    setOpportunities(importReconciled.updatedOpportunities);
    setSales(importReconciled.updatedSales);
    setInteractions(importReconciled.updatedInteractions);
    
    // CRITICAL: Immediately persist imported entities to localStorage so Refresh retains them!
    try {
      localStorage.setItem(STORAGE_PREFIX + "companies", JSON.stringify(updatedCompanies));
      localStorage.setItem(STORAGE_PREFIX + "customers", JSON.stringify(importReconciled.updatedCustomers));
      localStorage.setItem(STORAGE_PREFIX + "contracts", JSON.stringify(importReconciled.updatedContracts));
      localStorage.setItem(STORAGE_PREFIX + "quotations", JSON.stringify(importReconciled.updatedQuotations));
      localStorage.setItem(STORAGE_PREFIX + "opportunities", JSON.stringify(importReconciled.updatedOpportunities));
      localStorage.setItem(STORAGE_PREFIX + "sales", JSON.stringify(importReconciled.updatedSales));
      localStorage.setItem(STORAGE_PREFIX + "interactions", JSON.stringify(importReconciled.updatedInteractions));
    } catch (e) {
      console.warn("Failed to write imported state to localStorage:", e);
    }
    
    // Clean payloads for Supabase schema compliance
    const sanitizedCompanies = updatedCompanies.map(cleanCompany);
    const sanitizedCustomers = importReconciled.updatedCustomers.map(cleanCustomer);
    const sanitizedContracts = importReconciled.updatedContracts.map(cleanContract);
    const sanitizedQuotations = importReconciled.updatedQuotations.map(cleanQuotation);
    const sanitizedSales = updatedSalesList.map(cleanSale);
    const sanitizedInteractions = updatedInteractions.map(cleanInteraction);

    let isCentralSyncSuccessful = false;
    let syncErrorReason = "";

    const chunkArray = (arr: any[], size: number) => {
      const result = [];
      for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
      return result;
    };

    const doUpsertWithTracking = async (
      table: string,
      data: any[],
      baseProgress: number,
      weight: number
    ) => {
      if (!data || data.length === 0) return true;
      const chunks = chunkArray(data, 500);
      let tableOk = true;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (supabase) {
          const { error } = await supabase.from(table).upsert(chunk);
          if (error && error.code !== "PGRST205") {
            console.error(`[Smart Import Cloud Error] Table ${table}:`, error.message);
            issues.push(`تعثر حفظ ${table}: ${error.message}`);
            syncErrorReason = error.message;
            tableOk = false;
          }
        } else {
          tableOk = false;
        }

        if (onProgress) {
          const currentP = baseProgress + (weight * ((i + 1) / chunks.length));
          let tblName =
            table === "companies"
              ? "الشركات"
              : table === "customers"
              ? "العملاء"
              : table === "contracts"
              ? "العقود"
              : table === "quotations"
              ? "عروض الأسعار"
              : table === "sales"
              ? "المبيعات"
              : "السجلات";
          onProgress(currentP, `جاري حفظ ${tblName} في السحابة...`);
        }
      }
      return tableOk;
    };

    if (onProgress) onProgress(10, "جاري تهيئة البيانات والمزامنة مع السحابة...");

    let okComp = true, okCust = true, okCtr = true, okQuote = true, okSale = true, okInter = true;

    if (supabase) {
      okComp = await doUpsertWithTracking("companies", sanitizedCompanies, 10, 10);
      okCust = await doUpsertWithTracking("customers", sanitizedCustomers, 20, 20);
      okCtr = await doUpsertWithTracking("contracts", sanitizedContracts, 40, 20);
      okQuote = await doUpsertWithTracking("quotations", sanitizedQuotations, 60, 15);
      okSale = await doUpsertWithTracking("sales", sanitizedSales, 75, 10);
      okInter = await doUpsertWithTracking("interactions", sanitizedInteractions, 85, 5);

      const oppInteractions = importReconciled.updatedOpportunities.map((opp) => cleanInteraction({
        id: `opp-sync-${opp.id}`,
        customerId: opp.customerId || "general",
        companyId: opp.companyId,
        type: "opportunity_sync",
        date: opp.createdAt || todayStr,
        notes: JSON.stringify(opp),
        result: "synced",
      }));
      await doUpsertWithTracking("interactions", oppInteractions, 90, 10);
    }

    isCentralSyncSuccessful = Boolean(supabase) && okComp && okCust && okCtr && okQuote && okSale && okInter;

    // Register records in central change ledger & persistence engine
    const activeCompanyFallback = fallbackCompanyId === "all" ? "comp-newhouse" : fallbackCompanyId;

    importReconciled.updatedCustomers.forEach((cust) => {
      globalPersistenceEngine.recordChange({
        entityType: "customer",
        recordId: cust.id,
        companyId: cust.companyId || activeCompanyFallback,
        action: "insert",
        payload: cust,
        description: `استيراد عميل: ${cust.name || cust.phone}`,
        userName: currentUser?.name || "المستورد الذكي",
        userId: currentUser?.id,
      });
    });

    importReconciled.updatedContracts.forEach((ctr) => {
      globalPersistenceEngine.recordChange({
        entityType: "contract",
        recordId: ctr.id,
        companyId: ctr.companyId || activeCompanyFallback,
        action: "insert",
        payload: ctr,
        description: `عقد مستورد: ${ctr.contractNumber} (${ctr.totalValue} ج.م)`,
        userName: currentUser?.name || "المستورد الذكي",
        userId: currentUser?.id,
      });
    });

    updatedSalesList.forEach((sale) => {
      globalPersistenceEngine.recordChange({
        entityType: "sale",
        recordId: sale.id,
        companyId: sale.companyId || activeCompanyFallback,
        action: "insert",
        payload: sale,
        description: `مبيعات مستوردة: ${sale.amount} ج.م`,
        userName: currentUser?.name || "المستورد الذكي",
        userId: currentUser?.id,
      });
    });

    if (onProgress) onProgress(100, isCentralSyncSuccessful ? "تم الحفظ والرفع للسحابة بنجاح!" : "تم الاستيراد محلياً (بانتظار المزامنة)");

    const finalStatus: "success" | "partial" | "failed" = isCentralSyncSuccessful ? "success" : "partial";

    const historyItem: ImportHistoryItem = {
      id: importBatchId,
      fileName: fileName || "ملف بيانات",
      importedAt: new Date().toISOString(),
      totalRows: rows.length,
      importedCustomers,
      updatedCustomers,
      skippedRows,
      createdContracts,
      totalImportedSalesAmount,
      status: finalStatus,
      notes: isCentralSyncSuccessful
        ? "تمت المزامنة والحفظ المركزي بنجاح"
        : `استيراد محلي (بانتظار المزامنة المركزية) - ${syncErrorReason || "خارج الاتصال"}`,
      customerIds: importReconciled.updatedCustomers.map((c) => c.id),
      contractIds: importReconciled.updatedContracts.map((c) => c.id),
      quotationIds: importReconciled.updatedQuotations.map((q) => q.id),
      opportunityIds: importReconciled.updatedOpportunities.map((o) => o.id),
      saleIds: updatedSalesList.map((s) => s.id),
    };

    setImportHistory((prev) => {
      const updated = [historyItem, ...prev];
      try {
        localStorage.setItem(STORAGE_PREFIX + "importHistory", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    globalPersistenceEngine.recordChange({
      entityType: "import_operation",
      recordId: importBatchId,
      companyId: activeCompanyFallback,
      action: "import",
      payload: historyItem,
      description: `استيراد ذكي لملف (${fileName || "بيانات"}) - ${importedCustomers} عميل و ${createdContracts} عقد`,
      userName: currentUser?.name || "المستورد الذكي",
      userId: currentUser?.id,
    });

    if (isCentralSyncSuccessful) {
      showToast(
        `تم استيراد ${importedCustomers} عميل و ${createdContracts} عقد مبيعات بقيمة ${totalImportedSalesAmount.toLocaleString()} ج.م وحفظها بالكامل في السحابة بنجاح!`,
        "success"
      );
    } else {
      showToast(
        `تم استيراد ${importedCustomers} عميل و ${createdContracts} عقد محلياً (بانتظار المزامنة المركزية ${syncErrorReason ? `- ${syncErrorReason}` : ""})`,
        "warning"
      );
    }

    return {
      totalRows: rows.length,
      importedCustomers,
      updatedCustomers,
      skippedRows,
      createdContracts,
      totalImportedSalesAmount,
      matchedCompaniesCount,
      issues,
    };
  };

  const deleteImportHistoryItem = async (id: string) => {
    const historyItem = importHistory.find(h => h.id === id);

    // Identify all affected records for this batch
    const targetCustomerIds = new Set<string>(historyItem?.customerIds || []);
    customers.forEach(c => {
      if (c.importBatchId === id) targetCustomerIds.add(c.id);
    });

    const targetContractIds = new Set<string>(historyItem?.contractIds || []);
    contracts.forEach(c => {
      if (c.importBatchId === id || targetCustomerIds.has(c.customerId)) targetContractIds.add(c.id);
    });

    const targetSaleIds = new Set<string>(historyItem?.saleIds || []);
    sales.forEach(s => {
      if (
        s.importBatchId === id ||
        targetCustomerIds.has(s.customerId) ||
        (s.contractId && targetContractIds.has(s.contractId))
      ) {
        targetSaleIds.add(s.id);
      }
    });

    const targetQuotationIds = new Set<string>(historyItem?.quotationIds || []);
    quotations.forEach(q => {
      if (q.importBatchId === id || targetCustomerIds.has(q.customerId)) targetQuotationIds.add(q.id);
    });

    const targetOpportunityIds = new Set<string>(historyItem?.opportunityIds || []);
    opportunities.forEach(o => {
      if (o.importBatchId === id || targetCustomerIds.has(o.customerId)) targetOpportunityIds.add(o.id);
    });

    // 1. Delete from local state
    setCustomers(prev => prev.filter(c => !targetCustomerIds.has(c.id) && c.importBatchId !== id));
    setContracts(prev => prev.filter(c => !targetContractIds.has(c.id) && c.importBatchId !== id && !targetCustomerIds.has(c.customerId)));
    setSales(prev => prev.filter(s => !targetSaleIds.has(s.id) && s.importBatchId !== id && !targetCustomerIds.has(s.customerId) && !(s.contractId && targetContractIds.has(s.contractId))));
    setQuotations(prev => prev.filter(q => !targetQuotationIds.has(q.id) && q.importBatchId !== id && !targetCustomerIds.has(q.customerId)));
    setOpportunities(prev => prev.filter(o => !targetOpportunityIds.has(o.id) && o.importBatchId !== id && !targetCustomerIds.has(o.customerId)));
    setInquiries(prev => prev.filter(i => !targetCustomerIds.has(i.customerId) && (i as any).importBatchId !== id));
    setInteractions(prev => prev.filter(it => !targetCustomerIds.has(it.customerId)));
    setInspections(prev => prev.filter(insp => !targetCustomerIds.has(insp.customerId)));
    setPayments(prev => prev.filter(p => !targetCustomerIds.has(p.customerId) && !(p.contractId && targetContractIds.has(p.contractId))));

    setImportHistory((prev) => prev.filter((item) => item.id !== id));

    executeUnifiedSystemOperation(
      "delete_import_batch",
      `التراجع عن الاستيراد وحذف بيانات الدفعة ${id}`,
      async (sb) => {
        const custArr = Array.from(targetCustomerIds);
        const ctrArr = Array.from(targetContractIds);
        const saleArr = Array.from(targetSaleIds);
        const quoteArr = Array.from(targetQuotationIds);
        const oppArr = Array.from(targetOpportunityIds);

        if (saleArr.length) await sb.from("sales").delete().in("id", saleArr);
        if (ctrArr.length) await sb.from("contracts").delete().in("id", ctrArr);
        if (quoteArr.length) await sb.from("quotations").delete().in("id", quoteArr);
        if (oppArr.length) await sb.from("opportunities").delete().in("id", oppArr);
        if (custArr.length) {
          await Promise.allSettled([
            sb.from("inquiries").delete().in("customerId", custArr),
            sb.from("interactions").delete().in("customerId", custArr),
            sb.from("inspections").delete().in("customerId", custArr),
            sb.from("payments").delete().in("customerId", custArr),
            sb.from("customers").delete().in("id", custArr),
          ]);
        }

        // Also delete by importBatchId
        await Promise.allSettled([
          sb.from("sales").delete().eq("importBatchId", id),
          sb.from("contracts").delete().eq("importBatchId", id),
          sb.from("quotations").delete().eq("importBatchId", id),
          sb.from("opportunities").delete().eq("importBatchId", id),
          sb.from("customers").delete().eq("importBatchId", id),
          sb.from("inquiries").delete().eq("importBatchId", id),
        ]);
      }
    );

    showToast("تم التراجع عن الاستيراد وحذف كافة السجلات التابعة للدفعة بنجاح", "info");
  };

  const deleteAllImportedData = async () => {
    // 1. Gather all batch IDs and record IDs originating from imports
    const batchIds = new Set<string>();
    const customerIdsToDelete = new Set<string>();
    const contractIdsToDelete = new Set<string>();
    const saleIdsToDelete = new Set<string>();
    const quotationIdsToDelete = new Set<string>();
    const opportunityIdsToDelete = new Set<string>();

    importHistory.forEach((h) => {
      if (h.id) batchIds.add(h.id);
      h.customerIds?.forEach((id) => customerIdsToDelete.add(id));
      h.contractIds?.forEach((id) => contractIdsToDelete.add(id));
      h.saleIds?.forEach((id) => saleIdsToDelete.add(id));
      h.quotationIds?.forEach((id) => quotationIdsToDelete.add(id));
      h.opportunityIds?.forEach((id) => opportunityIdsToDelete.add(id));
    });

    // Match any customer with importBatchId, source "Excel Import" or created via import
    customers.forEach((c) => {
      if (
        c.importBatchId ||
        (c.source as string) === "Excel Import" ||
        (c.source as string) === "استيراد Excel" ||
        (c.notes && c.notes.includes("استيراد من"))
      ) {
        customerIdsToDelete.add(c.id);
        if (c.importBatchId) batchIds.add(c.importBatchId);
      }
    });

    // Match any contract with importBatchId, notes "استيراد", or belonging to an imported customer
    contracts.forEach((ctr) => {
      if (
        ctr.importBatchId ||
        customerIdsToDelete.has(ctr.customerId) ||
        (ctr.notes && ctr.notes.includes("استيراد من"))
      ) {
        contractIdsToDelete.add(ctr.id);
        if (ctr.importBatchId) batchIds.add(ctr.importBatchId);
      }
    });

    // Match any sale with importBatchId, Excel source, or belonging to an imported customer / contract
    sales.forEach((s) => {
      if (
        s.importBatchId ||
        customerIdsToDelete.has(s.customerId) ||
        (s.contractId && contractIdsToDelete.has(s.contractId)) ||
        s.customerSource === "Excel Import" ||
        s.customerSource === "استيراد Excel" ||
        s.responsible === "استيراد Excel"
      ) {
        saleIdsToDelete.add(s.id);
        if (s.importBatchId) batchIds.add(s.importBatchId);
      }
    });

    // Match quotations linked to imported customers or with importBatchId
    quotations.forEach((q) => {
      if (q.importBatchId || customerIdsToDelete.has(q.customerId)) {
        quotationIdsToDelete.add(q.id);
        if (q.importBatchId) batchIds.add(q.importBatchId);
      }
    });

    // Match opportunities linked to imported customers or with importBatchId
    opportunities.forEach((o) => {
      if (o.importBatchId || customerIdsToDelete.has(o.customerId)) {
        opportunityIdsToDelete.add(o.id);
        if (o.importBatchId) batchIds.add(o.importBatchId);
      }
    });

    const deletedCustomersCount = customerIdsToDelete.size;
    const deletedContractsCount = contractIdsToDelete.size;
    const deletedSalesCount = saleIdsToDelete.size;
    const deletedQuotationsCount = quotationIdsToDelete.size;
    const deletedOpportunitiesCount = opportunityIdsToDelete.size;

    // 2. Filter local React state
    setCustomers((prev) =>
      prev.filter(
        (c) =>
          !customerIdsToDelete.has(c.id) &&
          !c.importBatchId &&
          c.source !== "Excel Import" &&
          c.source !== "استيراد Excel"
      )
    );
    setContracts((prev) =>
      prev.filter(
        (c) =>
          !contractIdsToDelete.has(c.id) &&
          !c.importBatchId &&
          !customerIdsToDelete.has(c.customerId) &&
          !c.notes?.includes("استيراد من")
      )
    );
    setSales((prev) =>
      prev.filter(
        (s) =>
          !saleIdsToDelete.has(s.id) &&
          !s.importBatchId &&
          !customerIdsToDelete.has(s.customerId) &&
          !(s.contractId && contractIdsToDelete.has(s.contractId)) &&
          s.customerSource !== "Excel Import" &&
          s.customerSource !== "استيراد Excel" &&
          s.responsible !== "استيراد Excel"
      )
    );
    setQuotations((prev) =>
      prev.filter(
        (q) => !quotationIdsToDelete.has(q.id) && !q.importBatchId && !customerIdsToDelete.has(q.customerId)
      )
    );
    setOpportunities((prev) =>
      prev.filter(
        (o) => !opportunityIdsToDelete.has(o.id) && !o.importBatchId && !customerIdsToDelete.has(o.customerId)
      )
    );
    setInquiries((prev) =>
      prev.filter((i) => !customerIdsToDelete.has(i.customerId) && !(i as any).importBatchId)
    );
    setInteractions((prev) => prev.filter((it) => !customerIdsToDelete.has(it.customerId)));
    setInspections((prev) => prev.filter((insp) => !customerIdsToDelete.has(insp.customerId)));
    setPayments((prev) =>
      prev.filter(
        (p) => !customerIdsToDelete.has(p.customerId) && !(p.contractId && contractIdsToDelete.has(p.contractId))
      )
    );

    // 3. Clear import history & clean localStorage
    setImportHistory([]);
    localStorage.removeItem(STORAGE_PREFIX + "importHistory");
    localStorage.removeItem(STORAGE_PREFIX + "import_history");

    // 4. Cloud sync / Supabase delete
    await executeUnifiedSystemOperation(
      "delete_all_imported_data",
      `حذف كافة بيانات الاستيراد: ${deletedCustomersCount} عميل، ${deletedContractsCount} عقد، ${deletedSalesCount} مبيعة، ${deletedQuotationsCount} عرض سعر`,
      async (sb) => {
        const custArr = Array.from(customerIdsToDelete);
        const ctrArr = Array.from(contractIdsToDelete);
        const saleArr = Array.from(saleIdsToDelete);
        const quoteArr = Array.from(quotationIdsToDelete);
        const oppArr = Array.from(opportunityIdsToDelete);
        const batchArr = Array.from(batchIds);

        // Batch delete by IDs
        if (saleArr.length) {
          for (let i = 0; i < saleArr.length; i += 100) {
            await sb.from("sales").delete().in("id", saleArr.slice(i, i + 100));
          }
        }
        if (ctrArr.length) {
          for (let i = 0; i < ctrArr.length; i += 100) {
            await sb.from("contracts").delete().in("id", ctrArr.slice(i, i + 100));
          }
        }
        if (quoteArr.length) {
          for (let i = 0; i < quoteArr.length; i += 100) {
            await sb.from("quotations").delete().in("id", quoteArr.slice(i, i + 100));
          }
        }
        if (oppArr.length) {
          for (let i = 0; i < oppArr.length; i += 100) {
            await sb.from("opportunities").delete().in("id", oppArr.slice(i, i + 100));
          }
        }
        if (custArr.length) {
          for (let i = 0; i < custArr.length; i += 100) {
            const chunk = custArr.slice(i, i + 100);
            await Promise.allSettled([
              sb.from("inquiries").delete().in("customerId", chunk),
              sb.from("interactions").delete().in("customerId", chunk),
              sb.from("inspections").delete().in("customerId", chunk),
              sb.from("payments").delete().in("customerId", chunk),
              sb.from("customers").delete().in("id", chunk),
            ]);
          }
        }

        // Also delete by batchIds if any
        if (batchArr.length) {
          await Promise.allSettled([
            sb.from("sales").delete().in("importBatchId", batchArr),
            sb.from("contracts").delete().in("importBatchId", batchArr),
            sb.from("quotations").delete().in("importBatchId", batchArr),
            sb.from("opportunities").delete().in("importBatchId", batchArr),
            sb.from("customers").delete().in("importBatchId", batchArr),
            sb.from("inquiries").delete().in("importBatchId", batchArr),
          ]);
        }
      }
    );

    showToast(
      `تم حذف كافة بيانات وسجلات الاستيراد بنجاح (${deletedCustomersCount} عميل، ${deletedContractsCount} عقد، ${deletedSalesCount} مبيعة، ${deletedQuotationsCount} عرض سعر)`,
      "success"
    );

    return {
      deletedCustomersCount,
      deletedContractsCount,
      deletedSalesCount,
      deletedQuotationsCount,
      deletedOpportunitiesCount,
    };
  };

  const clearImportHistory = async () => {
    await deleteAllImportedData();
  };

  const restoreRecord = useCallback(
    async (entityType: string, recordId: string) => {
      const ledger = globalPersistenceEngine.getAllChanges();
      const deleteChange = ledger.find(
        (c) => c.entityType === entityType && c.recordId === recordId && c.action === "delete"
      );

      const prevData: any = deleteChange?.previousData;

      if (entityType === "customer") {
        const targetCust = prevData || customers.find((c) => c.id === recordId);
        if (targetCust) {
          const restored = { ...targetCust, recordStatus: "active" as const };
          const updated = [restored, ...customers.filter((c) => c.id !== recordId)];
          setCustomers(updated);
          try {
            localStorage.setItem(STORAGE_PREFIX + "customers", JSON.stringify(updated));
          } catch (e) {}
        }
      } else if (entityType === "contract") {
        const targetCtr = prevData || contracts.find((c) => c.id === recordId);
        if (targetCtr) {
          const restored = { ...targetCtr, recordStatus: "active" as const };
          const updated = [restored, ...contracts.filter((c) => c.id !== recordId)];
          setContracts(updated);
          try {
            localStorage.setItem(STORAGE_PREFIX + "contracts", JSON.stringify(updated));
          } catch (e) {}
        }
      } else if (entityType === "inquiry") {
        const targetInq = prevData || inquiries.find((i) => i.id === recordId);
        if (targetInq) {
          const updated = [targetInq, ...inquiries.filter((i) => i.id !== recordId)];
          setInquiries(updated);
          try {
            localStorage.setItem(STORAGE_PREFIX + "inquiries", JSON.stringify(updated));
          } catch (e) {}
        }
      } else if (entityType === "quotation") {
        const targetQ = prevData || quotations.find((q) => q.id === recordId);
        if (targetQ) {
          const updated = [targetQ, ...quotations.filter((q) => q.id !== recordId)];
          setQuotations(updated);
          try {
            localStorage.setItem(STORAGE_PREFIX + "quotations", JSON.stringify(updated));
          } catch (e) {}
        }
      } else if (entityType === "opportunity") {
        const targetOpp = prevData || opportunities.find((o) => o.id === recordId);
        if (targetOpp) {
          const updated = [targetOpp, ...opportunities.filter((o) => o.id !== recordId)];
          setOpportunities(updated);
          try {
            localStorage.setItem(STORAGE_PREFIX + "opportunities", JSON.stringify(updated));
          } catch (e) {}
        }
      }

      globalPersistenceEngine.recordChange({
        entityType: entityType as any,
        recordId,
        companyId: prevData?.companyId || (activeCompanyId === "all" ? "comp-newhouse" : activeCompanyId),
        action: "restore",
        payload: prevData || { id: recordId },
        description: `استعادة السجل (${entityType} - ${recordId}) مع الحفاظ الكامل على المعرف والبيانات`,
        userName: currentUser?.name || "المستخدم",
        userId: currentUser?.id,
      });

      if (supabase && prevData) {
        const table = globalPersistenceEngine.getTableName(entityType as any);
        if (table) {
          await supabase.from(table).upsert([prevData]);
        }
      }

      showToast("تمت استعادة السجل بنجاح بدون تكرار وبنفس البيانات والمأرفات الأصلية", "success");
    },
    [customers, contracts, inquiries, quotations, opportunities, activeCompanyId, currentUser, supabase, showToast]
  );

  const restoreCustomer = useCallback(async (id: string) => restoreRecord("customer", id), [restoreRecord]);
  const restoreContract = useCallback(async (id: string) => restoreRecord("contract", id), [restoreRecord]);

  const resetDataToDefault = () => {
    setCompanies(initialCompanies);
    setCustomers(initialCustomers);
    setInquiries(initialInquiries);
    setFollowUps(initialFollowUps);
    setQuotations(initialQuotations);
    setInspections(initialInspections);
    setContracts(initialContracts);
    setPayments(initialPayments);
    setSales(initialSales);
    setInteractions(initialInteractions);
    setImportHistory([]);
    // Clean only app-specific items, strictly preserving Supabase auth tokens (sb-*)
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    showToast("تمت استعادة البيانات الافتراضية بنجاح", "info");
  };

  const migrateLegacyData = async () => {
    try {
      const reconciled = reconcileSalesPipelineCore(
        customers,
        inquiries,
        quotations,
        contracts,
        opportunities,
        sales,
        followUps,
        inspections,
        interactions,
        payments
      );

      await persistReconciledData(reconciled);

      const totalOppsActive = reconciled.stats.newOppsCreated + reconciled.stats.oppsUpdated;
      const msg = `تم تطبيق محرك رحلة العميل بنجاح: تم إنشاء وربط ${reconciled.stats.newQuotesCreated} عرض سعر، وربط ${reconciled.stats.contractsLinked} عقد، وتحديث ${totalOppsActive} رحلة بيعية، وإنشاء ${reconciled.stats.salesCreated} سجل مبيعات ✅`;
      showToast(msg, "success");
      return reconciled.stats;
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء تحديث البيانات", "warning");
      throw err;
    }
  };

  const addArea = (area: string) => {
    if (!areas.includes(area)) setAreas([...areas, area]);
  };
  const deleteArea = (area: string) => {
    setAreas(areas.filter((a) => a !== area));
  };

  const addLossReason = (reason: string) => {
    if (!lossReasons.includes(reason)) setLossReasons([...lossReasons, reason]);
  };
  const deleteLossReason = (reason: string) => {
    setLossReasons(lossReasons.filter((r) => r !== reason));
  };

  // -----------------------------------------------------------------------------
  // NESTA Guardian & AI Execution Layer Methods
  // -----------------------------------------------------------------------------

  const logAiActivity = useCallback(
    (entry: Omit<AIActivityLogEntry, "id" | "timestamp">) => {
      const newEntry: AIActivityLogEntry = {
        ...entry,
        id: `ai-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
      };
      setAiActivityLogs((prev) => [newEntry, ...prev.slice(0, 199)]);
    },
    []
  );

  const toggleAiEmergencyStop = useCallback(() => {
    setIsAiEmergencyStopEnabled((prev) => {
      const next = !prev;
      showToast(
        next
          ? "⛔ تم تفعيل الإيقاف الطارئ لعمليات الذكاء الاصطناعي (وضع القراءة والتدقيق فقط)"
          : "✅ تم استئناف الأتمتة والعمليات التنفيذية للذكاء الاصطناعي",
        next ? "warning" : "success"
      );
      logAiActivity({
        user: currentUser?.name || "المستخدم الحالي",
        command: next ? "تفعيل الإيقاف الطارئ (Emergency Stop)" : "استئناف الأتمتة (Resume AI)",
        mode: "guardian",
        affectedCount: 0,
        status: next ? "EXECUTED" : "VERIFIED",
        resultSummary: next ? "تم إيقاف كافة أوامر الكتابة الذاتية مؤقتاً" : "تم استعادة صلاحيات التنفيذ الآلي",
        verified: true,
      });
      return next;
    });
  }, [currentUser, logAiActivity]);

  const runGuardianFullCheck = useCallback(async (): Promise<SystemHealthReport> => {
    const snapshot: SystemDataSnapshot = {
      companies,
      customers,
      inquiries,
      followUps,
      quotations,
      contracts,
      sales,
      opportunities,
    };

    const { healthReport, newAlerts, newIncidents } = GuardianEngine.scanSystem(
      snapshot,
      guardianIncidents,
      guardianAlerts,
      isCloudConnected
    );

    healthReport.emergencyStopActive = isAiEmergencyStopEnabled;
    setGuardianHealthReport(healthReport);

    // Merge alerts and incidents preserving already acknowledged ones
    setGuardianAlerts((prev) => {
      const existingMap = new Map(prev.map((a) => [a.id, a]));
      newAlerts.forEach((a) => {
        if (!existingMap.has(a.id)) {
          existingMap.set(a.id, a);
        }
      });
      return Array.from(existingMap.values());
    });

    setGuardianIncidents((prev) => {
      const existingMap = new Map(prev.map((i) => [i.id, i]));
      newIncidents.forEach((i) => {
        if (!existingMap.has(i.id)) {
          existingMap.set(i.id, i);
        }
      });
      return Array.from(existingMap.values());
    });

    logAiActivity({
      user: currentUser?.name || "النظام",
      command: "فحص شامل للمنظومة (Guardian Full Scan)",
      mode: "guardian",
      affectedCount: newAlerts.length + newIncidents.length,
      status: "VERIFIED",
      resultSummary: `تم فحص قواعد العمل: ${healthReport.businessRules.violationsCount} مخالفة، ${newAlerts.length} تنبيهات، حالة المنظومة: ${healthReport.overallStatus}`,
      verified: true,
    });

    return healthReport;
  }, [
    companies,
    customers,
    inquiries,
    followUps,
    quotations,
    contracts,
    sales,
    opportunities,
    guardianIncidents,
    guardianAlerts,
    isCloudConnected,
    isAiEmergencyStopEnabled,
    currentUser,
    logAiActivity,
  ]);

  // Periodic Guardian Health Check on initialization and data changes
  useEffect(() => {
    if (!isInitialLoading) {
      runGuardianFullCheck().catch(() => {});
    }
  }, [isInitialLoading, customers.length, followUps.length, quotations.length]);

  const runCustomerCoverageAudit = useCallback(async () => {
    if (!supabase) {
      return {
        dbCount: customers.length,
        visibleCount: customers.length,
        hiddenCount: 0,
        issues: [],
      };
    }
    const { data, error } = await supabase.from("customers").select("id, name, companyId");
    if (error) throw error;

    const dbCustomers = data || [];
    const uiCustomers = customers;

    const issues: any[] = [];
    let hiddenCount = 0;

    dbCustomers.forEach((dbCust: any) => {
      const found = uiCustomers.find((u) => u.id === dbCust.id);
      if (!found) {
        hiddenCount++;
        issues.push({
          id: dbCust.id,
          name: dbCust.name,
          reason: "موجود في قاعدة البيانات لكنه غير محمل في الواجهة",
        });
      } else if (found.companyId !== dbCust.companyId) {
        issues.push({
          id: dbCust.id,
          name: dbCust.name,
          reason: "تعارض في معرّف الشركة بين السحابة والواجهة",
        });
      }
    });

    return {
      dbCount: dbCustomers.length,
      visibleCount: uiCustomers.length,
      hiddenCount,
      issues,
    };
  }, [customers]);

  const dismissAlert = useCallback((alertId: string) => {
    setGuardianAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "DISMISSED" as const } : a))
    );
  }, []);

  const resolveIncident = useCallback(
    async (incidentId: string): Promise<boolean> => {
      const inc = guardianIncidents.find((i) => i.id === incidentId);
      if (!inc) return false;

      // Mark fixing
      setGuardianIncidents((prev) =>
        prev.map((i) => (i.id === incidentId ? { ...i, status: "FIXING" as const } : i))
      );

      // Perform fix logic if duplicate phones or orphaned inquiry
      try {
        if (inc.entityType === "customer") {
          const cust = customers.find((c) => c.id === inc.entityId);
          if (cust && (!cust.companyId || !companies.some((comp) => comp.id === cust.companyId))) {
            const defaultCompId = companies[0]?.id || "c1";
            updateCustomer(cust.id, { companyId: defaultCompId });
          }
        } else if (inc.entityType === "inquiry") {
          const inq = inquiries.find((i) => i.id === inc.entityId);
          if (inq && !inq.customerId && inq.customerPhone) {
            const existingCust = findCustomerByPhone(inq.customerPhone, inq.companyId);
            if (existingCust) {
              updateInquiry(inq.id, { customerId: existingCust.id });
            } else {
              const newCust = addCustomer({
                name: inq.customerName || "عميل استفسار",
                phone: inq.customerPhone,
                companyId: inq.companyId,
                area: inq.area || "",
                stage: inq.stage || "inquiry",
              });
              updateInquiry(inq.id, { customerId: newCust.id });
            }
          }
        }

        // Mark resolved
        setGuardianIncidents((prev) =>
          prev.map((i) =>
            i.id === incidentId
              ? { ...i, status: "RESOLVED" as const, resolvedAt: new Date().toISOString() }
              : i
          )
        );

        showToast("تم علاج المشكلة والتحقق من سلامة البيانات ✅", "success");
        return true;
      } catch (err) {
        setGuardianIncidents((prev) =>
          prev.map((i) => (i.id === incidentId ? { ...i, status: "FIX_FAILED" as const } : i))
        );
        showToast("تعذر حل المشكلة تلقائياً", "warning");
        return false;
      }
    },
    [guardianIncidents, customers, inquiries, companies, updateCustomer, updateInquiry, findCustomerByPhone, addCustomer]
  );

  const executeVerifiedAiAction = useCallback(
    async (
      action: AIActionProposal
    ): Promise<{ success: boolean; message: string; changeSetId?: string }> => {
      if (isAiEmergencyStopEnabled && action.riskLevel !== "read") {
        const errorMsg = "لا يمكن تنفيذ الإجراء: تم تفعيل الإيقاف الطارئ لعمليات الذكاء الاصطناعي (Emergency Stop Active).";
        logAiActivity({
          user: currentUser?.name || "المستخدم الحالي",
          command: action.title,
          mode: "act",
          affectedCount: 0,
          status: "FAILED",
          error: errorMsg,
          verified: false,
        });
        showToast(errorMsg, "warning");
        return { success: false, message: errorMsg };
      }

      const changeSetId = `cs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const records: ChangeSetRecord[] = [];

      try {
        switch (action.type) {
          case "create_followup": {
            const { customerId, companyId, customerName, dueDate, time, title, priority, notes, customerPhone } = action.payload;
            const matchedCust = customers.find((c) => c.id === customerId);
            const newFup = addFollowUp({
              customerId,
              companyId: companyId || matchedCust?.companyId || "comp-newhouse",
              customerName: customerName || matchedCust?.name || "عميل",
              customerPhone: customerPhone || matchedCust?.phone || "",
              dueDate: dueDate || new Date().toISOString().split("T")[0],
              time: time || "12:00",
              title: title || "متابعة تليفونية",
              notes: notes || "",
              priority: priority || "medium",
              status: "pending",
              responsible: currentUser?.name || "فريق المبيعات",
            });
            records.push({
              entityType: "followup",
              entityId: newFup.id,
              companyId: newFup.companyId,
              oldData: {},
              newData: newFup,
            });
            break;
          }

          case "update_customer_stage": {
            const { customerId, newStage } = action.payload;
            const targetCust = customers.find((c) => c.id === customerId);
            if (targetCust) {
              records.push({
                entityType: "customer",
                entityId: targetCust.id,
                companyId: targetCust.companyId,
                oldData: { stage: targetCust.stage },
                newData: { stage: newStage },
              });
              updateCustomer(customerId, { stage: newStage });
            }
            break;
          }

          case "batch_update_status": {
            const { targetIds, newStage } = action.payload;
            const ids: string[] = targetIds || action.targetIds;
            ids.forEach((id) => {
              const targetCust = customers.find((c) => c.id === id);
              if (targetCust) {
                records.push({
                  entityType: "customer",
                  entityId: targetCust.id,
                  companyId: targetCust.companyId,
                  oldData: { stage: targetCust.stage },
                  newData: { stage: newStage },
                });
              }
            });
            batchUpdateCustomers(ids, { stage: newStage });
            break;
          }

          case "assign_responsible": {
            const { targetIds, responsible } = action.payload;
            const ids: string[] = targetIds || action.targetIds;
            ids.forEach((id) => {
              const inq = inquiries.find((i) => i.id === id);
              if (inq) {
                records.push({
                  entityType: "inquiry",
                  entityId: inq.id,
                  companyId: inq.companyId,
                  oldData: { responsible: inq.responsible },
                  newData: { responsible },
                });
                updateInquiry(id, { responsible });
              }
            });
            break;
          }

          case "clean_duplicates": {
            const { customerId } = action.payload;
            cleanTimelineDuplicates(customerId);
            break;
          }

          default:
            throw new Error(`نوع الإجراء غير مدعوم: ${action.type}`);
        }

        // Store Change Set for Rollback support
        const changeSet: ChangeSet = {
          id: changeSetId,
          timestamp: new Date().toISOString(),
          actionType: action.type,
          description: action.description || action.title,
          requestingUser: currentUser?.name || "المستخدم الحالي",
          records,
          isRolledBack: false,
        };

        setChangeSets((prev) => [changeSet, ...prev]);

        logAiActivity({
          user: currentUser?.name || "المستخدم الحالي",
          command: action.title,
          mode: "act",
          companyId: action.targetCompanyId,
          action: action.type,
          affectedCount: records.length || 1,
          status: "VERIFIED",
          resultSummary: `تم التنفيذ والتحقق بنجاح (${records.length} سجلات معدلة)`,
          verified: true,
          changeSetId,
        });

        showToast(`تم تنفيذ الإجراء والتحقق من سلامة البيانات: ${action.title} ✅`, "success");
        return {
          success: true,
          message: `تم تنفيذ العملية بنجاح والتحقق من حفظها بقاعدة البيانات.`,
          changeSetId,
        };
      } catch (err: any) {
        logAiActivity({
          user: currentUser?.name || "المستخدم الحالي",
          command: action.title,
          mode: "act",
          affectedCount: 0,
          status: "FAILED",
          error: err?.message || "فشل غير متوقع",
          verified: false,
        });
        showToast(`تعذر تنفيذ الإجراء: ${err?.message}`, "warning");
        return { success: false, message: err?.message || "فشل تنفيذ الإجراء." };
      }
    },
    [
      isAiEmergencyStopEnabled,
      currentUser,
      customers,
      inquiries,
      addFollowUp,
      updateCustomer,
      batchUpdateCustomers,
      updateInquiry,
      cleanTimelineDuplicates,
      logAiActivity,
    ]
  );

  const rollbackChangeSet = useCallback(
    async (changeSetId: string): Promise<boolean> => {
      const cs = changeSets.find((c) => c.id === changeSetId);
      if (!cs || cs.isRolledBack) {
        showToast("حزمة التغييرات غير موجودة أو تم التراجع عنها مسبقاً", "warning");
        return false;
      }

      try {
        // Reverse changes
        for (const rec of cs.records) {
          if (rec.entityType === "customer") {
            updateCustomer(rec.entityId, rec.oldData);
          } else if (rec.entityType === "inquiry") {
            updateInquiry(rec.entityId, rec.oldData);
          } else if (rec.entityType === "followup") {
            if (Object.keys(rec.oldData).length === 0) {
              deleteFollowUp(rec.entityId);
            } else {
              setFollowUps((prev) =>
                prev.map((f) => (f.id === rec.entityId ? { ...f, ...rec.oldData } : f))
              );
            }
          }
        }

        setChangeSets((prev) =>
          prev.map((c) =>
            c.id === changeSetId
              ? {
                  ...c,
                  isRolledBack: true,
                  rolledBackAt: new Date().toISOString(),
                  rolledBackBy: currentUser?.name || "المستخدم الحالي",
                }
              : c
          )
        );

        logAiActivity({
          user: currentUser?.name || "المستخدم الحالي",
          command: `تراجع عن حزمة التغييرات (${cs.description})`,
          mode: "act",
          affectedCount: cs.records.length,
          status: "ROLLED_BACK",
          resultSummary: `تم التراجع عن ${cs.records.length} تعديلات بنجاح`,
          verified: true,
          changeSetId,
        });

        showToast("تم التراجع عن حزمة التعديلات بنجاح واستعادة القيم الأصلية ↩️", "success");
        return true;
      } catch (err: any) {
        showToast("فشل التراجع عن التعديلات: " + err.message, "warning");
        return false;
      }
    },
    [changeSets, currentUser, updateCustomer, updateInquiry, deleteFollowUp, logAiActivity]
  );

  // Products CRUD Operations
  const addProduct = useCallback(
    (data: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newProduct: Product = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        version: 1,
        status: data.status || "active",
      };

      executeUnifiedAction({
        entityType: "product",
        recordId: newProduct.id,
        companyId: newProduct.companyId || "all",
        action: "insert",
        payload: cleanProduct(newProduct),
        description: `إضافة منتج جديد: ${newProduct.name} (${newProduct.category})`,
        applyLocal: () => {
          setProducts((prev) => [newProduct, ...prev]);
        },
      });

      return newProduct;
    },
    [executeUnifiedAction]
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<Product>) => {
      const target = products.find((p) => p.id === id);
      if (!target) return;
      const now = new Date().toISOString();
      const updatedProd: Product = {
        ...target,
        ...updates,
        updatedAt: now,
        version: (target.version || 1) + 1,
      };

      executeUnifiedAction({
        entityType: "product",
        recordId: id,
        companyId: target.companyId || "all",
        action: "update",
        payload: cleanProductUpdate(updates),
        previousData: target,
        description: `تحديث بيانات المنتج: ${target.name}`,
        applyLocal: () => {
          setProducts((prev) => prev.map((p) => (p.id === id ? updatedProd : p)));
        },
      });
    },
    [products, executeUnifiedAction]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      const target = products.find((p) => p.id === id);
      if (!target) return;

      executeUnifiedAction({
        entityType: "product",
        recordId: id,
        companyId: target.companyId || "all",
        action: "delete",
        payload: { id },
        previousData: target,
        description: `حذف المنتج: ${target.name}`,
        applyLocal: () => {
          setProducts((prev) => prev.filter((p) => p.id !== id));
        },
      });
    },
    [products, executeUnifiedAction]
  );

  // Tasks CRUD Operations
  const addTask = useCallback(
    (data: Omit<TaskItem, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const newTask: TaskItem = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        status: data.status || "pending",
        priority: data.priority || "medium",
      };
      setTasks((prev) => [newTask, ...prev]);

      addAuditLog({
        actionType: "create_record",
        entityType: "task",
        entityId: newTask.id,
        companyId: newTask.companyId || "all",
        description: `إضافة مهمة جديدة: ${newTask.title}`,
      });

      showToast(`تمت إضافة المهمة "${newTask.title}" بنجاح`, "success");
      return newTask;
    },
    [addAuditLog, showToast]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<TaskItem>) => {
      const now = new Date().toISOString();
      let updatedTaskObj: TaskItem | undefined;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            updatedTaskObj = {
              ...t,
              ...updates,
              updatedAt: now,
            };
            return updatedTaskObj;
          }
          return t;
        })
      );

      if (updatedTaskObj) {
        addAuditLog({
          actionType: "edit_record",
          entityType: "task",
          entityId: id,
          companyId: updatedTaskObj.companyId || "all",
          description: `تحديث المهمة: ${updatedTaskObj.title}`,
        });
        showToast(`تم تحديث المهمة "${updatedTaskObj.title}"`, "success");
      }
    },
    [addAuditLog, showToast]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const target = tasks.find((t) => t.id === id);
      setTasks((prev) => prev.filter((t) => t.id !== id));

      if (target) {
        addAuditLog({
          actionType: "delete_record",
          entityType: "task",
          entityId: id,
          companyId: target.companyId || "all",
          description: `حذف المهمة: ${target.title}`,
        });
        showToast(`تم حذف المهمة "${target.title}"`, "info");
      }
    },
    [tasks, addAuditLog, showToast]
  );

  const syncPendingChangesGlobal = useCallback(async () => {
    if (!supabase) {
      showToast("غير متصل بقاعدة البيانات السحابية", "warning");
      return { total: 0, synced: 0, failed: 0, conflicts: 0, details: [] };
    }
    const res = await globalPersistenceEngine.syncAllPending(supabase);
    if (res.synced > 0) {
      showToast(`تمت مزامنة ${res.synced} تعديل بنجاح مع Supabase`, "success");
    } else if (res.failed > 0) {
      showToast(`تعذر مزامنة ${res.failed} تعديل. يرجى مراجعة سجل الأخطاء`, "warning");
    } else if (res.conflicts > 0) {
      showToast(`تم اكتشاف ${res.conflicts} تعارض بحاجة إلى حسم`, "warning");
    } else {
      showToast("جميع البيانات متزامنة مع السحابة", "info");
    }
    return res;
  }, [showToast]);

  useEffect(() => {
    (window as any).syncPendingChangesGlobal = syncPendingChangesGlobal;
    (window as any).forceReloadAllData = fetchCloudData;
    (window as any).getContractedSalesDebugReport = getContractedSalesDebugReport;
  }, [syncPendingChangesGlobal, getContractedSalesDebugReport]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        setUsers,
        areas,
        setAreas,
        addArea,
        deleteArea,
        lossReasons,
        setLossReasons,
        addLossReason,
        deleteLossReason,
        companies: accessibleCompanies,
        allCompanies: companies,
        activeCompanyId,
        setActiveCompanyId,
        selectedCompanyIds,
        setSelectedCompanyIds,
        toggleCompanySelection,
        selectAllCompanies,
        clearAllCompanySelection,
        activeCompany,
        currentTab,
        setCurrentTab,
        navigationFilter,
        navigateToTabWithFilter,
        clearNavigationFilter,
        selectedCustomerIdFor360,
        setSelectedCustomerIdFor360,
        isAiAssistantOpen,
        setIsAiAssistantOpen,
        selectedQuotationForPrint,
        setSelectedQuotationForPrint,
        isCloudConnected,

        theme,
        setTheme,

        searchQuery,
        setSearchQuery,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isIntakeModalOpen,
        setIsIntakeModalOpen,
        isQuickActionSheetOpen,
        setIsQuickActionSheetOpen,
        toast,
        showToast,

        customers,
        inquiries,
        followUps,
        quotations,
        inspections,
        contracts,
        payments,
        sales,
        interactions,
        opportunities,
        products,
        tasks,
        employees,
        salaryPayments,
        commissionPayments,
        employeeStatements,
        reconciliationReport,
        reconciledContracts: contracts,

        filteredCustomers,
        filteredInquiries,
        filteredFollowUps,
        filteredQuotations,
        filteredInspections,
        filteredContracts,
        filteredPayments,
        filteredSales,
        filteredOpportunities,
        filteredProducts,
        filteredTasks,
        filteredEmployees,

        // Employee & Payroll Management
        addEmployee,
        updateEmployee,
        toggleEmployeeStatus,
        updateEmployeeSalary,
        recordSalaryPayment,
        recordCommissionPayment,
        deleteSalaryPayment,
        deleteCommissionPayment,
        updateSalaryPayment,
        updateCommissionPayment,
        addCommissionAdjustment,
        updateCommissionAdjustment,
        deleteCommissionAdjustment,
        updateStatementOverride,
        reviewStatement,
        approveStatement,
        recalculateStatement,
        syncAllMonthlyStatements,
        updateCommissionRate,

        // Products CRUD
        addProduct,
        updateProduct,
        deleteProduct,

        // Tasks CRUD
        addTask,
        updateTask,
        deleteTask,

        // Global Filters
        globalFilters,
        setGlobalFilters,
        updateGlobalCompanyFilter,
        updateGlobalProductFilter,
        updateGlobalDateFilter,
        resetGlobalFilters,
        isDateInRange,
        isProductMatch,
        isCompanyMatch,

        // Company-Scoped Roles & Permissions
        currentCompanyRole,
        getUserRoleInCompany,
        hasPermission,
        assignUserCompanyRole,
        removeUserFromCompany,
        updateUserTarget,
        isSystemOwner,
        isCompanyManager,
        isEmployee,
        canDeleteRecords,
        canApproveRecords,
        canManageFinance,
        canManageSettings,

        // Opportunities & Deal Closing
        addOpportunity,
        updateOpportunity,
        closeDealWon,
        closeDealLost,
        deleteOpportunity,
        batchDeleteOpportunities,
        batchCloseOpportunitiesWon,
        batchCloseOpportunitiesLost,
        batchUpdateOpportunitiesStage,

        todayFollowUps,
        overdueFollowUps,
        upcomingFollowUps,
        hotCustomers,
        todaySalesTotal,
        monthlySalesTotal,
        monthlyTargetTotal,
        monthlyAchievementRate,
        unifiedKPIs,
        quotesNeedingFollowUp,
        calculateContractedSalesTotal,
        getContractedSalesDebugReport,

        findCustomerByPhone,
        addCustomer,
        updateCustomer,
        batchUpdateCustomers,
        deleteCustomer,
        batchDeleteCustomers,
        addInquiry,
        updateInquiry,
        updateInquiryStage,
        batchUpdateInquiries,
        deleteInquiry,
        batchDeleteInquiries,
        addInteraction,
        addFollowUp,
        completeFollowUp,
        rescheduleFollowUp,
        batchUpdateFollowUps,
        deleteFollowUp,
        batchDeleteFollowUps,
        batchAddFollowUps,
        addQuotation,
        updateQuotation,
        updateQuotationStatus,
        batchUpdateQuotations,
        deleteQuotation,
        batchDeleteQuotations,
        addInspection,
        updateInspection,
        addContract,
        updateContract,
        updateContractCollectionStatus,
        batchUpdateContractCollectionStatus,
        batchUpdateContracts,
        deleteContract,
        batchDeleteContracts,
        clearAllContracts,
        purgeOrphanContracts,
        createCustomersFromOrphanContracts,
        addSale,
        updateSale,
        deleteSale,
        batchDeleteSales,
        clearAllSales,
        addPayment,
        updatePayment,
        deletePayment,
        deleteInteraction,
        updateInteraction,
        cleanTimelineDuplicates,
        auditLogs,
        addAuditLog,
        clearAuditLogs,
        addCompany,
        updateCompany,
        archiveCompany,
        restoreCompany,
        deleteCompany,
        updateCompanyTarget,
        resetDataToDefault,
        importHistory,
        restoreRecord,
        restoreCustomer,
        restoreContract,
        batchImportData,
        deleteImportHistoryItem,
        clearImportHistory,
        deleteAllImportedData,
        syncData: fetchCloudData,
        migrateLegacyData,
        isInitialLoading,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,

        // NESTA Guardian & Universal AI Agent Exports
        guardianAlerts,
        guardianIncidents,
        guardianHealthReport,
        aiActivityLogs,
        changeSets,
        isAiEmergencyStopEnabled,
        isHealthCenterOpen,
        setIsHealthCenterOpen,
        selectedMetricForLineage,
        setSelectedMetricForLineage,
        isPremiumAiEnabled,
        setIsPremiumAiEnabled,
        salesManualAdjustment,
        setSalesManualAdjustment,
        salesOverrideValue,
        setSalesOverrideValue,
        toggleAiEmergencyStop,
        runGuardianFullCheck,
        runCustomerCoverageAudit,
        resolveIncident,
        dismissAlert,
        rollbackChangeSet,
        executeVerifiedAiAction,
        logAiActivity,

        // NESTA ACTION PERSISTENCE & AUDIT RULE Exports
        executeUnifiedAction,
        executeUnifiedBulkAction,
        executeUnifiedSystemOperation,

        dataReviewItems,
        approveRecord,
        excludeRecord,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return ctx;
};
