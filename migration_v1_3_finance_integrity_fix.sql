-- =============================================================================
-- PVC NESTA AI — FINANCE & REALTIME SYNC INTEGRITY (v1.3 MIGRATION)
-- 
-- Fixes: Missing tables, schema mismatches, and missing RLS policies
-- required for Finance & Monthly Statements Central Sync.
-- =============================================================================

-- 1. Monthly Statements Table
CREATE TABLE IF NOT EXISTS public.monthly_statements (
  id text PRIMARY KEY, -- Standard Format: stmt-{employeeId}-{period}
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "employeeName" text,
  period text NOT NULL, -- YYYY-MM
  "startDate" text,
  "endDate" text,
  "salaryDue" numeric DEFAULT 0,
  "salaryPaid" numeric DEFAULT 0,
  "eligibleContractsCount" integer DEFAULT 0,
  "eligibleContractsTotal" numeric DEFAULT 0,
  "commissionRateUsed" numeric DEFAULT 0,
  "commissionEarned" numeric DEFAULT 0,
  bonuses numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  adjustments numeric DEFAULT 0,
  "totalDue" numeric DEFAULT 0,
  "totalPaid" numeric DEFAULT 0,
  "paidCommission" numeric DEFAULT 0,
  "paidSalary" numeric DEFAULT 0,
  remaining numeric DEFAULT 0,
  status text DEFAULT 'calculated',
  "calculatedAt" text DEFAULT now()::text,
  "reviewedAt" text,
  "reviewedBy" text,
  "approvedAt" text,
  "approvedBy" text,
  "paidAt" text,
  "paidBy" text,
  "recalculatedAt" text,
  notes text,
  "contractDetails" jsonb DEFAULT '[]'::jsonb,
  "updatedAt" text DEFAULT now()::text
);

-- 2. Commission Adjustments Table
CREATE TABLE IF NOT EXISTS public.commission_adjustments (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  "employeeId" text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period text NOT NULL,
  amount numeric NOT NULL,
  reason text,
  type text DEFAULT 'adjustment', -- adjustment, bonus, deduction
  "contractId" text REFERENCES public.contracts(id) ON DELETE SET NULL,
  "createdAt" text DEFAULT now()::text,
  "createdBy" text
);

-- 3. Audit Logs Table (Centralized logging for all financial changes)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY,
  timestamp text DEFAULT now()::text,
  "userId" text,
  "userName" text,
  "userRole" text,
  "actionType" text,
  "entityType" text,
  "entityId" text,
  "companyId" text,
  description text,
  "previousValue" jsonb,
  "newValue" jsonb,
  status text DEFAULT 'success'
);

-- 4. Extend Employees Table (Fix Schema Mismatch with Code)
-- The code currently sends salaryHistory and commissionHistory as JSONB fields
-- during employee updates. We must add these columns to prevent mutation failure.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS "salaryHistory" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS "commissionHistory" jsonb DEFAULT '[]'::jsonb;

-- 5. Add Missing Indexes
CREATE INDEX IF NOT EXISTS idx_monthly_statements_employee_period ON public.monthly_statements ("employeeId", period);
CREATE INDEX IF NOT EXISTS idx_monthly_statements_company ON public.monthly_statements ("companyId");
CREATE INDEX IF NOT EXISTS idx_comm_adjustments_employee ON public.commission_adjustments ("employeeId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);

-- 6. Row Level Security (RLS) Policies
ALTER TABLE public.monthly_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 6.1. Monthly Statements Policies
DROP POLICY IF EXISTS "Monthly_statements select policy" ON public.monthly_statements;
CREATE POLICY "Monthly_statements select policy" ON public.monthly_statements
  FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()) AND public.has_company_access(auth.uid(), "companyId"));

DROP POLICY IF EXISTS "Monthly_statements insert policy" ON public.monthly_statements;
CREATE POLICY "Monthly_statements insert policy" ON public.monthly_statements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user(auth.uid()) AND public.has_company_access(auth.uid(), "companyId"));

DROP POLICY IF EXISTS "Monthly_statements update policy" ON public.monthly_statements;
CREATE POLICY "Monthly_statements update policy" ON public.monthly_statements
  FOR UPDATE TO authenticated
  USING (public.is_active_user(auth.uid()) AND public.has_company_access(auth.uid(), "companyId"));

-- 6.2. Commission Adjustments Policies
DROP POLICY IF EXISTS "Comm_adjustments select policy" ON public.commission_adjustments;
CREATE POLICY "Comm_adjustments select policy" ON public.commission_adjustments
  FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()) AND public.has_company_access(auth.uid(), "companyId"));

DROP POLICY IF EXISTS "Comm_adjustments insert policy" ON public.commission_adjustments;
CREATE POLICY "Comm_adjustments insert policy" ON public.commission_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user(auth.uid()) AND public.has_company_access(auth.uid(), "companyId"));

-- 6.3. Audit Logs Policies
DROP POLICY IF EXISTS "Audit_logs select policy" ON public.audit_logs;
CREATE POLICY "Audit_logs select policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()) AND (public.get_user_role(auth.uid()) IN ('owner', 'admin') OR "userId" = auth.uid()::text));

DROP POLICY IF EXISTS "Audit_logs insert policy" ON public.audit_logs;
CREATE POLICY "Audit_logs insert policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user(auth.uid()));

-- 7. Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE 
  public.monthly_statements,
  public.commission_adjustments,
  public.audit_logs
TO authenticated, service_role;
