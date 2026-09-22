import { AppUser, CompanyRole, NavigationTab, PermissionName } from "../types";

/**
 * Checks if the current user is a System Owner (مالك النظام)
 */
export const isSystemOwner = (user: AppUser | null): boolean => {
  if (!user) return false;
  return user.role === "owner" || user.role === "super_admin";
};

/**
 * Checks if the current user is a Manager (مدير شركة أو مدير عام)
 */
export const isCompanyManager = (user: AppUser | null, companyRole?: CompanyRole): boolean => {
  if (!user) return false;
  if (isSystemOwner(user)) return true;
  if (user.role === "admin" || user.role === "manager") return true;
  if (companyRole === "admin" || companyRole === "manager") return true;
  return false;
};

/**
 * Checks if the user is a standard operational employee (موظف / مبيعات)
 */
export const isEmployee = (user: AppUser | null, companyRole?: CompanyRole): boolean => {
  return !isCompanyManager(user, companyRole);
};

/**
 * Deletions and Archives: strictly restricted to System Owner & Manager
 * Employees are not allowed to delete or archive operational data.
 */
export const canDeleteRecord = (user: AppUser | null, companyRole?: CompanyRole): boolean => {
  return isCompanyManager(user, companyRole);
};

/**
 * Data Approvals: strictly restricted to System Owner & Manager
 */
export const canApproveRecord = (user: AppUser | null, companyRole?: CompanyRole): boolean => {
  return isCompanyManager(user, companyRole);
};

/**
 * Finance & Salary / Commission Management: strictly restricted to System Owner & Manager
 */
export const canManageFinance = (user: AppUser | null, companyRole?: CompanyRole): boolean => {
  return isCompanyManager(user, companyRole);
};

/**
 * System Settings: restricted to System Owner & Manager
 */
export const canManageSettings = (user: AppUser | null, companyRole?: CompanyRole): boolean => {
  return isCompanyManager(user, companyRole);
};

/**
 * Checks if the user has access to Data Review & Approval (مراجعة واعتماد البيانات)
 * Owner-Only default: System Owner has access by default.
 * All other roles require explicit permission: user.permissions?.data_review_approval === true
 */
export const canAccessDataReview = (user: AppUser | null, _companyRole?: CompanyRole): boolean => {
  if (!user) return false;
  if (isSystemOwner(user)) return true;
  return Boolean(user.permissions?.data_review_approval);
};

/**
 * Validates sensitive review actions (Approve, Reject, Delete, Edit, Bulk) against:
 * 1. Auth & Explicit Permission (data_review_approval)
 * 2. User Allowed Company Scope
 * 3. Currently Active Company Scope
 */
export const canPerformReviewAction = (
  user: AppUser | null,
  recordCompanyId?: string,
  activeCompanyScope?: string[],
  companyRole?: CompanyRole
): { allowed: boolean; reason?: string } => {
  if (!user) {
    return { allowed: false, reason: "عفواً، يلزم تسجيل الدخول لتنفيذ هذا الإجراء" };
  }

  if (!canAccessDataReview(user, companyRole)) {
    return { allowed: false, reason: "غير مصرح: لا تملك صلاحية مراجعة واعتماد البيانات (data_review_approval)" };
  }

  // Check user allowed companies
  if (!isSystemOwner(user) && !user.allowedCompanyIds.includes("all")) {
    if (recordCompanyId && !user.allowedCompanyIds.includes(recordCompanyId)) {
      return { allowed: false, reason: "حظر أمني: السجل يتبع لشركة خارج نطاق الشركات المصرح لك بها" };
    }
  }

  // Check current active company scope
  if (activeCompanyScope && activeCompanyScope.length > 0 && !activeCompanyScope.includes("all")) {
    if (recordCompanyId && !activeCompanyScope.includes(recordCompanyId)) {
      return { allowed: false, reason: "حظر أمني: لا يمكنك التعديل أو الاعتماد على شركة غير محددة في النطاق الحالي" };
    }
  }

  return { allowed: true };
};

/**
 * Determines whether a user has permission to view and open a specific navigation tab.
 */
export const canAccessTab = (
  tab: NavigationTab | string,
  user: AppUser | null,
  companyRole?: CompanyRole
): boolean => {
  if (!user) return false;

  // Strict Owner-Only + Explicit Permission check for "review" tab
  if (tab === "review") {
    return canAccessDataReview(user, companyRole);
  }

  if (isSystemOwner(user)) return true;

  if (isCompanyManager(user, companyRole)) {
    return true;
  }

  // Employee (sales, viewer, employee) allowed pages:
  const employeeAllowedTabs: string[] = [
    "dashboard",
    "today",
    "inquiries",
    "followups",
    "tasks",
    "customers",
    "opportunities",
    "quotations",
    "contracts",
    "products",
    "inspections",
    "reports",
    "intake",
    "sales",
  ];

  return employeeAllowedTabs.includes(tab);
};
