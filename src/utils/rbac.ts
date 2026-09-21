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
 * Determines whether a user has permission to view and open a specific navigation tab.
 */
export const canAccessTab = (
  tab: NavigationTab | string,
  user: AppUser | null,
  companyRole?: CompanyRole
): boolean => {
  if (!user) return false;
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
