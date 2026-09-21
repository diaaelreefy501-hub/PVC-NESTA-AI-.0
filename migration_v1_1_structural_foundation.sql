-- =============================================================================
-- PVC NESTA AI — BACKEND STRUCTURAL FOUNDATION (v1.1 MASTER MIGRATION)
-- DB Schema + Relationships + RLS + Data Integrity + Cross-Company Protection
-- 
-- Complies with: PVC NESTA MASTER EXECUTION SPECIFICATION v1.0 — FINAL FROZEN
-- Mode: Additive / Safe / Backward-Compatible / Non-Destructive
-- ZERO DROP TABLE / ZERO TRUNCATE / ZERO DATA LOSS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 0: Ensure Company Archive Support (Soft-Archive, No Cascade Destruction)
-- -----------------------------------------------------------------------------
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS "archivedAt" text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS "archivedBy" text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';

-- -----------------------------------------------------------------------------
-- PART 1: OPPORTUNITIES (P0 First-Class Business Entity)
-- Transforms opportunities from temporary local-storage/interactions into
-- a real, relational, audited table in PostgreSQL.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunities (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "customerId" text REFERENCES public.customers(id) ON DELETE SET NULL,
  "inquiryId" text REFERENCES public.inquiries(id) ON DELETE SET NULL,
  title text NOT NULL,
  stage text DEFAULT 'inquiry',
  status text DEFAULT 'active',
  "lossReason" text,
  "lossNotes" text,
  "expectedValue" numeric DEFAULT 0,
  "productType" text,
  area text,
  source text,
  "assignedTo" text,
  "quotationId" text REFERENCES public.quotations(id) ON DELETE SET NULL,
  "contractId" text REFERENCES public.contracts(id) ON DELETE SET NULL,
  "lastContactDate" text,
  "nextFollowUpDate" text,
  notes text,
  "createdAt" text DEFAULT now()::text,
  "updatedAt" text,
  "closedAt" text
);

-- -----------------------------------------------------------------------------
-- PART 2: EMPLOYEES (Company-Owned Human Capital & Compensation Core)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  name text NOT NULL,
  role text NOT NULL,
  phone text,
  email text,
  "startDate" text,
  active boolean DEFAULT true,
  "monthlySalary" numeric DEFAULT 0 CHECK ("monthlySalary" >= 0),
  "commissionRule" text DEFAULT 'percentage_of_contract',
  "commissionPercentage" numeric DEFAULT 0 CHECK ("commissionPercentage" >= 0),
  "commissionTiming" text DEFAULT 'contract_signing',
  "commissionNotes" text,
  "createdAt" text DEFAULT now()::text,
  "updatedAt" text
);

-- -----------------------------------------------------------------------------
-- PART 3: SALARY HISTORY (Immutable Historical Salary Rate Tracking)
-- Ensures salary alterations do NOT retrospectively alter past financial periods.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salary_history (
  id text PRIMARY KEY,
  "employeeId" text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "salaryAmount" numeric NOT NULL CHECK ("salaryAmount" >= 0),
  "effectiveFrom" text NOT NULL, -- YYYY-MM
  "effectiveTo" text,            -- YYYY-MM (NULL if currently active)
  notes text,
  "createdAt" text DEFAULT now()::text
);

-- -----------------------------------------------------------------------------
-- PART 4: SALARY PAYMENTS (Actual Cash/Bank Outflow Transactions)
-- Strict separation: Salary Due != Salary Paid.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "employeeId" text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  "employeeName" text,
  period text NOT NULL, -- YYYY-MM
  amount numeric NOT NULL CHECK (amount > 0),
  "paymentDate" text NOT NULL, -- YYYY-MM-DD
  "paymentMethod" text DEFAULT 'cash',
  "receiptNumber" text,
  status text DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
  notes text,
  "createdAt" text DEFAULT now()::text,
  "createdBy" text
);

-- -----------------------------------------------------------------------------
-- PART 5: COMMISSION RULES (Configurable Earning Rules per Company / Employee)
-- Supports customizable timing: contract_signing, down_payment, full_collection, custom.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_rules (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
  "ruleType" text DEFAULT 'percentage_of_contract' CHECK ("ruleType" IN ('percentage_of_contract', 'percentage_of_collection', 'fixed_per_contract')),
  rate numeric NOT NULL CHECK (rate >= 0),
  timing text DEFAULT 'contract_signing' CHECK (timing IN ('contract_signing', 'down_payment', 'full_collection', 'custom')),
  "effectiveFrom" text NOT NULL, -- YYYY-MM
  "effectiveTo" text,
  active boolean DEFAULT true,
  notes text,
  "createdAt" text DEFAULT now()::text
);

-- -----------------------------------------------------------------------------
-- PART 6: COMMISSION PAYMENTS (Independent Commission Cash Settlement Records)
-- Strict separation: Commission Earned != Commission Paid.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "employeeId" text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  "employeeName" text,
  "contractId" text REFERENCES public.contracts(id) ON DELETE SET NULL,
  "contractNumber" text,
  "opportunityId" text REFERENCES public.opportunities(id) ON DELETE SET NULL,
  "customerName" text,
  period text NOT NULL, -- YYYY-MM
  "contractValue" numeric,
  "commissionRate" numeric,
  "calculatedEarnedAmount" numeric NOT NULL DEFAULT 0 CHECK ("calculatedEarnedAmount" >= 0),
  amount numeric NOT NULL CHECK (amount > 0),
  "paymentDate" text NOT NULL, -- YYYY-MM-DD
  status text DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
  "paymentMethod" text DEFAULT 'bank_transfer',
  "receiptNumber" text,
  notes text,
  "createdAt" text DEFAULT now()::text,
  "createdBy" text
);

-- -----------------------------------------------------------------------------
-- PART 7: ADVERTISING BUDGETS (Monthly Marketing Allocations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advertising_budgets (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  period text NOT NULL, -- YYYY-MM
  "budgetAmount" numeric NOT NULL CHECK ("budgetAmount" >= 0),
  notes text,
  "createdAt" text DEFAULT now()::text,
  "updatedAt" text,
  CONSTRAINT uq_company_budget_period UNIQUE ("companyId", period)
);

-- -----------------------------------------------------------------------------
-- PART 8: AD SPEND (Actual Marketing Outflows by Channel / Campaign)
-- Strict separation: Budget != Actual Spend.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ad_spend (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  date text NOT NULL, -- YYYY-MM-DD
  amount numeric NOT NULL CHECK (amount > 0),
  channel text NOT NULL,
  campaign text,
  notes text,
  "createdAt" text DEFAULT now()::text,
  "createdBy" text
);

-- -----------------------------------------------------------------------------
-- PART 9: OWNER FINANCIAL RULES (Owner Remuneration & Profit Distribution Agreement)
-- Strict separation: Owner Money != Company Profit.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_financial_rules (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "ruleType" text NOT NULL CHECK ("ruleType" IN ('fixed_monthly', 'percentage_of_revenue', 'profit_share', 'manual_due')),
  value numeric NOT NULL CHECK (value >= 0),
  "effectiveFrom" text NOT NULL, -- YYYY-MM
  "effectiveTo" text,
  active boolean DEFAULT true,
  notes text,
  "createdAt" text DEFAULT now()::text
);

-- -----------------------------------------------------------------------------
-- PART 10: OWNER PAYMENTS (Actual Capital Distributions & Owner Draws)
-- Strict calculation: Owner Outstanding = Owner Due - SUM(Owner Paid).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_payments (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  period text NOT NULL, -- YYYY-MM
  "dueAmount" numeric NOT NULL DEFAULT 0,
  "paidAmount" numeric NOT NULL CHECK ("paidAmount" > 0),
  "paymentDate" text NOT NULL, -- YYYY-MM-DD
  "paymentMethod" text DEFAULT 'bank_transfer',
  status text DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
  notes text,
  "createdAt" text DEFAULT now()::text,
  "createdBy" text
);

-- -----------------------------------------------------------------------------
-- PART 11: CROSS-COMPANY INTEGRITY VALIDATION FUNCTIONS & TRIGGERS
-- Prevents cross-company contamination between parent and child records.
-- -----------------------------------------------------------------------------

-- Trigger for Opportunity: Verify companyId matches customer & inquiry companyId
CREATE OR REPLACE FUNCTION public.check_opportunity_company_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  parent_company text;
BEGIN
  IF NEW."customerId" IS NOT NULL THEN
    SELECT "companyId" INTO parent_company FROM public.customers WHERE id = NEW."customerId";
    IF parent_company IS NOT NULL AND parent_company <> NEW."companyId" THEN
      RAISE EXCEPTION 'Cross-company violation: Opportunity companyId (%) does not match Customer companyId (%)', NEW."companyId", parent_company;
    END IF;
  END IF;

  IF NEW."inquiryId" IS NOT NULL THEN
    SELECT "companyId" INTO parent_company FROM public.inquiries WHERE id = NEW."inquiryId";
    IF parent_company IS NOT NULL AND parent_company <> NEW."companyId" THEN
      RAISE EXCEPTION 'Cross-company violation: Opportunity companyId (%) does not match Inquiry companyId (%)', NEW."companyId", parent_company;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunity_company_integrity ON public.opportunities;
CREATE TRIGGER trg_opportunity_company_integrity
BEFORE INSERT OR UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.check_opportunity_company_integrity();

-- Trigger for Salary Payment: Verify employee belongs to the same company
CREATE OR REPLACE FUNCTION public.check_salary_payment_company_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  emp_company text;
BEGIN
  SELECT "companyId" INTO emp_company FROM public.employees WHERE id = NEW."employeeId";
  IF emp_company IS NOT NULL AND emp_company <> NEW."companyId" THEN
    RAISE EXCEPTION 'Cross-company violation: SalaryPayment companyId (%) does not match Employee companyId (%)', NEW."companyId", emp_company;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_salary_payment_company_integrity ON public.salary_payments;
CREATE TRIGGER trg_salary_payment_company_integrity
BEFORE INSERT OR UPDATE ON public.salary_payments
FOR EACH ROW EXECUTE FUNCTION public.check_salary_payment_company_integrity();

-- -----------------------------------------------------------------------------
-- PART 12: HIGH-EFFICIENCY INDEXES FOR RELATIONAL QUERIES & FILTERS
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_opportunities_company_stage ON public.opportunities ("companyId", stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON public.opportunities ("customerId");
CREATE INDEX IF NOT EXISTS idx_opportunities_inquiry_id ON public.opportunities ("inquiryId");
CREATE INDEX IF NOT EXISTS idx_opportunities_contract_id ON public.opportunities ("contractId");

CREATE INDEX IF NOT EXISTS idx_employees_company_active ON public.employees ("companyId", active);
CREATE INDEX IF NOT EXISTS idx_salary_history_employee_date ON public.salary_history ("employeeId", "effectiveFrom");
CREATE INDEX IF NOT EXISTS idx_salary_payments_company_period ON public.salary_payments ("companyId", period);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_date ON public.salary_payments ("employeeId", "paymentDate");

CREATE INDEX IF NOT EXISTS idx_commission_rules_company_emp ON public.commission_rules ("companyId", "employeeId", active);
CREATE INDEX IF NOT EXISTS idx_commission_payments_company_period ON public.commission_payments ("companyId", period);
CREATE INDEX IF NOT EXISTS idx_commission_payments_employee_date ON public.commission_payments ("employeeId", "paymentDate");
CREATE INDEX IF NOT EXISTS idx_commission_payments_contract_id ON public.commission_payments ("contractId");

CREATE INDEX IF NOT EXISTS idx_ad_budgets_company_period ON public.advertising_budgets ("companyId", period);
CREATE INDEX IF NOT EXISTS idx_ad_spend_company_date ON public.ad_spend ("companyId", date);

CREATE INDEX IF NOT EXISTS idx_owner_rules_company_active ON public.owner_financial_rules ("companyId", active);
CREATE INDEX IF NOT EXISTS idx_owner_payments_company_period ON public.owner_payments ("companyId", period);

-- -----------------------------------------------------------------------------
-- PART 13: TABLE PERMISSIONS & DEFENSE-IN-DEPTH HARDENING
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE 
  public.opportunities,
  public.employees,
  public.salary_history,
  public.salary_payments,
  public.commission_rules,
  public.commission_payments,
  public.advertising_budgets,
  public.ad_spend,
  public.owner_financial_rules,
  public.owner_payments
FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE 
  public.opportunities,
  public.employees,
  public.salary_history,
  public.salary_payments,
  public.commission_rules,
  public.commission_payments,
  public.advertising_budgets,
  public.ad_spend,
  public.owner_financial_rules,
  public.owner_payments
TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- PART 14: ROW LEVEL SECURITY (RLS) POLICIES FOR ALL 10 NEW TABLES
-- -----------------------------------------------------------------------------

-- 1. OPPORTUNITIES
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Opportunities select policy" ON public.opportunities;
CREATE POLICY "Opportunities select policy" ON public.opportunities
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Opportunities insert policy" ON public.opportunities;
CREATE POLICY "Opportunities insert policy" ON public.opportunities
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Opportunities update policy" ON public.opportunities;
CREATE POLICY "Opportunities update policy" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Opportunities delete policy" ON public.opportunities;
CREATE POLICY "Opportunities delete policy" ON public.opportunities
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- 2. EMPLOYEES
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees select policy" ON public.employees;
CREATE POLICY "Employees select policy" ON public.employees
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Employees insert policy" ON public.employees;
CREATE POLICY "Employees insert policy" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin', 'manager')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Employees update policy" ON public.employees;
CREATE POLICY "Employees update policy" ON public.employees
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin', 'manager')
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Employees delete policy" ON public.employees;
CREATE POLICY "Employees delete policy" ON public.employees
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- 3. SALARY HISTORY
ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salary_history select policy" ON public.salary_history;
CREATE POLICY "Salary_history select policy" ON public.salary_history
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Salary_history insert policy" ON public.salary_history;
CREATE POLICY "Salary_history insert policy" ON public.salary_history
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Salary_history update policy" ON public.salary_history;
CREATE POLICY "Salary_history update policy" ON public.salary_history
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Salary_history delete policy" ON public.salary_history;
CREATE POLICY "Salary_history delete policy" ON public.salary_history
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- 4. SALARY PAYMENTS
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salary_payments select policy" ON public.salary_payments;
CREATE POLICY "Salary_payments select policy" ON public.salary_payments
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Salary_payments insert policy" ON public.salary_payments;
CREATE POLICY "Salary_payments insert policy" ON public.salary_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Salary_payments update policy" ON public.salary_payments;
CREATE POLICY "Salary_payments update policy" ON public.salary_payments
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Salary_payments delete policy" ON public.salary_payments;
CREATE POLICY "Salary_payments delete policy" ON public.salary_payments
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- 5. COMMISSION RULES
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Commission_rules select policy" ON public.commission_rules;
CREATE POLICY "Commission_rules select policy" ON public.commission_rules
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Commission_rules insert policy" ON public.commission_rules;
CREATE POLICY "Commission_rules insert policy" ON public.commission_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Commission_rules update policy" ON public.commission_rules;
CREATE POLICY "Commission_rules update policy" ON public.commission_rules
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Commission_rules delete policy" ON public.commission_rules;
CREATE POLICY "Commission_rules delete policy" ON public.commission_rules
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- 6. COMMISSION PAYMENTS
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Commission_payments select policy" ON public.commission_payments;
CREATE POLICY "Commission_payments select policy" ON public.commission_payments
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Commission_payments insert policy" ON public.commission_payments;
CREATE POLICY "Commission_payments insert policy" ON public.commission_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Commission_payments update policy" ON public.commission_payments;
CREATE POLICY "Commission_payments update policy" ON public.commission_payments
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Commission_payments delete policy" ON public.commission_payments;
CREATE POLICY "Commission_payments delete policy" ON public.commission_payments
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- 7. ADVERTISING BUDGETS
ALTER TABLE public.advertising_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ad_budgets select policy" ON public.advertising_budgets;
CREATE POLICY "Ad_budgets select policy" ON public.advertising_budgets
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Ad_budgets insert policy" ON public.advertising_budgets;
CREATE POLICY "Ad_budgets insert policy" ON public.advertising_budgets
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Ad_budgets update policy" ON public.advertising_budgets;
CREATE POLICY "Ad_budgets update policy" ON public.advertising_budgets
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Ad_budgets delete policy" ON public.advertising_budgets;
CREATE POLICY "Ad_budgets delete policy" ON public.advertising_budgets
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- 8. AD SPEND
ALTER TABLE public.ad_spend ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ad_spend select policy" ON public.ad_spend;
CREATE POLICY "Ad_spend select policy" ON public.ad_spend
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Ad_spend insert policy" ON public.ad_spend;
CREATE POLICY "Ad_spend insert policy" ON public.ad_spend
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin', 'manager')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Ad_spend update policy" ON public.ad_spend;
CREATE POLICY "Ad_spend update policy" ON public.ad_spend
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Ad_spend delete policy" ON public.ad_spend;
CREATE POLICY "Ad_spend delete policy" ON public.ad_spend
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- 9. OWNER FINANCIAL RULES
ALTER TABLE public.owner_financial_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner_rules select policy" ON public.owner_financial_rules;
CREATE POLICY "Owner_rules select policy" ON public.owner_financial_rules
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Owner_rules insert policy" ON public.owner_financial_rules;
CREATE POLICY "Owner_rules insert policy" ON public.owner_financial_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) = 'owner'
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Owner_rules update policy" ON public.owner_financial_rules;
CREATE POLICY "Owner_rules update policy" ON public.owner_financial_rules
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) = 'owner'
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Owner_rules delete policy" ON public.owner_financial_rules;
CREATE POLICY "Owner_rules delete policy" ON public.owner_financial_rules
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) = 'owner'
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- 10. OWNER PAYMENTS
ALTER TABLE public.owner_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner_payments select policy" ON public.owner_payments;
CREATE POLICY "Owner_payments select policy" ON public.owner_payments
  FOR SELECT TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin')
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Owner_payments insert policy" ON public.owner_payments;
CREATE POLICY "Owner_payments insert policy" ON public.owner_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) = 'owner'
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Owner_payments update policy" ON public.owner_payments;
CREATE POLICY "Owner_payments update policy" ON public.owner_payments
  FOR UPDATE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) = 'owner'
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Owner_payments delete policy" ON public.owner_payments;
CREATE POLICY "Owner_payments delete policy" ON public.owner_payments
  FOR DELETE TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) = 'owner'
    AND public.has_company_access(auth.uid(), "companyId")
  );

-- =============================================================================
-- END OF MIGRATION SCRIPT
-- =============================================================================
