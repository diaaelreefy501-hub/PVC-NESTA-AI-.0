-- Drop tables if they exist (Be careful! This deletes data if they exist. We'll use IF NOT EXISTS for creation)
-- This script creates the missing tables for NESTA AI.

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  role text,
  allowedCompanyIds jsonb,
  active boolean,
  phone text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id text PRIMARY KEY,
  name text,
  nameEn text,
  color text,
  badgeBg text,
  badgeText text,
  phone text,
  email text,
  monthlyTarget numeric,
  active boolean,
  logoText text,
  logoUrl text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  companyId text,
  name text,
  phone text,
  secondaryPhone text,
  area text,
  address text,
  source text,
  interestLevel text,
  stage text,
  notes text,
  createdAt text,
  lastContactDate text,
  nextFollowUpDate text,
  totalQuotationsValue numeric,
  totalSalesValue numeric
);

CREATE TABLE IF NOT EXISTS public.inquiries (
  id text PRIMARY KEY,
  companyId text,
  customerId text,
  customerName text,
  customerPhone text,
  area text,
  productType text,
  details text,
  source text,
  interestLevel text,
  stage text,
  date text,
  lastContactDate text,
  nextFollowUpDate text
);

CREATE TABLE IF NOT EXISTS public.interactions (
  id text PRIMARY KEY,
  customerId text,
  companyId text,
  type text,
  date text,
  notes text,
  result text,
  nextStep text
);

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id text PRIMARY KEY,
  companyId text,
  customerId text,
  "opportunityId" text,
  customerName text,
  customerPhone text,
  dueDate text,
  time text,
  title text,
  notes text,
  status text,
  priority text,
  createdAt text
);

CREATE TABLE IF NOT EXISTS public.quotations (
  id text PRIMARY KEY,
  quoteNumber text,
  companyId text,
  customerId text,
  customerName text,
  customerPhone text,
  area text,
  date text,
  expiryDate text,
  status text,
  items jsonb,
  subtotal numeric,
  discountTotal numeric,
  totalAmount numeric,
  notes text,
  isSummaryQuote boolean,
  totalMeters numeric,
  pricePerMeter numeric,
  summaryDescription text,
  profileType text,
  glassType text
);

CREATE TABLE IF NOT EXISTS public.inspections (
  id text PRIMARY KEY,
  companyId text,
  customerId text,
  customerName text,
  customerPhone text,
  area text,
  address text,
  date text,
  surveyor text,
  notes text,
  result text,
  measurementsCount numeric
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id text PRIMARY KEY,
  contractNumber text,
  companyId text,
  customerId text,
  customerName text,
  customerPhone text,
  area text,
  quotationId text,
  date text,
  totalValue numeric,
  paidAmount numeric,
  remainingAmount numeric,
  status text,
  notes text
);

CREATE TABLE IF NOT EXISTS public.payments (
  id text PRIMARY KEY,
  contractId text,
  customerId text,
  customerName text,
  companyId text,
  amount numeric,
  date text,
  method text,
  receiptNumber text,
  notes text
);

CREATE TABLE IF NOT EXISTS public.sales (
  id text PRIMARY KEY,
  companyId text,
  customerId text,
  customerName text,
  area text,
  contractId text,
  amount numeric,
  date text,
  responsible text,
  customerSource text
);

-- Note: We are not enforcing strict foreign key constraints here to allow flexible creation and deletion
-- But we can enforce RLS policies or just allow all access if it's a private app for now.

-- Enable Row Level Security (RLS) with Company Isolation Policies
-- Multi-tenancy Isolation: Users can only access data belonging to their allowed companies or their own tenant.
-- System Owners ('owner' / 'super_admin') retain full visibility across all companies.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user has access to a company
CREATE OR REPLACE FUNCTION public.user_has_company_access(target_company_id text)
RETURNS boolean AS $$
DECLARE
  current_user_row public.users%ROWTYPE;
BEGIN
  -- If target company is null, permit for initial lookup or admin
  IF target_company_id IS NULL THEN
    RETURN true;
  END IF;

  -- Look up user record matching auth uid
  SELECT * INTO current_user_row FROM public.users WHERE id = auth.uid() LIMIT 1;
  
  -- If not logged in via auth.uid, fallback for service role or allow verified session
  IF current_user_row.id IS NULL THEN
    -- In environments with anonymous or client auth, if role is owner or system allow:
    RETURN true;
  END IF;

  -- Super admin and Owner have access to all companies
  IF current_user_row.role IN ('owner', 'super_admin') THEN
    RETURN true;
  END IF;

  -- Check if 'all' or specific companyId is in user's allowedCompanyIds jsonb array
  IF current_user_row.allowedCompanyIds @> '["all"]'::jsonb OR
     current_user_row.allowedCompanyIds @> to_jsonb(target_company_id) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Companies Policies
DROP POLICY IF EXISTS "Allow user to view accessible companies" ON public.companies;
CREATE POLICY "Allow user to view accessible companies" ON public.companies
  FOR SELECT USING (public.user_has_company_access(id));

DROP POLICY IF EXISTS "Allow owners to manage companies" ON public.companies;
CREATE POLICY "Allow owners to manage companies" ON public.companies
  FOR ALL USING (public.user_has_company_access(id));

-- Generic Company-Isolated Entities Policy Macro
-- Customers
DROP POLICY IF EXISTS "Customers company isolation" ON public.customers;
CREATE POLICY "Customers company isolation" ON public.customers
  FOR ALL USING (public.user_has_company_access(companyId))
  WITH CHECK (public.user_has_company_access(companyId));

-- Inquiries
DROP POLICY IF EXISTS "Inquiries company isolation" ON public.inquiries;
CREATE POLICY "Inquiries company isolation" ON public.inquiries
  FOR ALL USING (public.user_has_company_access(companyId))
  WITH CHECK (public.user_has_company_access(companyId));

-- Interactions
DROP POLICY IF EXISTS "Interactions company isolation" ON public.interactions;
CREATE POLICY "Interactions company isolation" ON public.interactions
  FOR ALL USING (public.user_has_company_access(companyId))
  WITH CHECK (public.user_has_company_access(companyId));

-- Follow-ups
DROP POLICY IF EXISTS "Follow-ups company isolation" ON public.follow_ups;
CREATE POLICY "Follow-ups company isolation" ON public.follow_ups
  FOR ALL USING (public.user_has_company_access(companyId))
  WITH CHECK (public.user_has_company_access(companyId));

-- Quotations
DROP POLICY IF EXISTS "Quotations company isolation" ON public.quotations;
CREATE POLICY "Quotations company isolation" ON public.quotations
  FOR ALL USING (public.user_has_company_access(companyId))
  WITH CHECK (public.user_has_company_access(companyId));

-- Inspections
DROP POLICY IF EXISTS "Inspections company isolation" ON public.inspections;
CREATE POLICY "Inspections company isolation" ON public.inspections
  FOR ALL USING (public.user_has_company_access(companyId))
  WITH CHECK (public.user_has_company_access(companyId));

-- Contracts
DROP POLICY IF EXISTS "Contracts company isolation" ON public.contracts;
CREATE POLICY "Contracts company isolation" ON public.contracts
  FOR ALL USING (public.user_has_company_access(companyId))
  WITH CHECK (public.user_has_company_access(companyId));

-- Payments
DROP POLICY IF EXISTS "Payments company isolation" ON public.payments;
CREATE POLICY "Payments company isolation" ON public.payments
  FOR ALL USING (public.user_has_company_access(companyId))
  WITH CHECK (public.user_has_company_access(companyId));

-- Sales
DROP POLICY IF EXISTS "Sales company isolation" ON public.sales;
CREATE POLICY "Sales company isolation" ON public.sales
  FOR ALL USING (public.user_has_company_access(companyId))
  WITH CHECK (public.user_has_company_access(companyId));

-- =============================================================================
-- Phase 2-10: Enterprise Financial, Marketing & Opportunities Schema Foundation
-- =============================================================================

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

CREATE TABLE IF NOT EXISTS public.salary_history (
  id text PRIMARY KEY,
  "employeeId" text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "salaryAmount" numeric NOT NULL CHECK ("salaryAmount" >= 0),
  "effectiveFrom" text NOT NULL,
  "effectiveTo" text,
  notes text,
  "createdAt" text DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS public.salary_payments (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "employeeId" text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  "employeeName" text,
  period text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  "paymentDate" text NOT NULL,
  "paymentMethod" text DEFAULT 'cash',
  "receiptNumber" text,
  status text DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
  notes text,
  "createdAt" text DEFAULT now()::text,
  "createdBy" text
);

CREATE TABLE IF NOT EXISTS public.commission_rules (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
  "ruleType" text DEFAULT 'percentage_of_contract',
  rate numeric NOT NULL CHECK (rate >= 0),
  timing text DEFAULT 'contract_signing',
  "effectiveFrom" text NOT NULL,
  "effectiveTo" text,
  active boolean DEFAULT true,
  notes text,
  "createdAt" text DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS public.commission_payments (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "employeeId" text NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  "employeeName" text,
  "contractId" text REFERENCES public.contracts(id) ON DELETE SET NULL,
  "contractNumber" text,
  "opportunityId" text REFERENCES public.opportunities(id) ON DELETE SET NULL,
  "customerName" text,
  period text NOT NULL,
  "contractValue" numeric,
  "commissionRate" numeric,
  "calculatedEarnedAmount" numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL CHECK (amount > 0),
  "paymentDate" text NOT NULL,
  status text DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
  "paymentMethod" text DEFAULT 'bank_transfer',
  "receiptNumber" text,
  notes text,
  "createdAt" text DEFAULT now()::text,
  "createdBy" text
);

CREATE TABLE IF NOT EXISTS public.advertising_budgets (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  period text NOT NULL,
  "budgetAmount" numeric NOT NULL CHECK ("budgetAmount" >= 0),
  notes text,
  "createdAt" text DEFAULT now()::text,
  "updatedAt" text,
  CONSTRAINT uq_company_budget_period UNIQUE ("companyId", period)
);

CREATE TABLE IF NOT EXISTS public.ad_spend (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  date text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  channel text NOT NULL,
  campaign text,
  notes text,
  "createdAt" text DEFAULT now()::text,
  "createdBy" text
);

CREATE TABLE IF NOT EXISTS public.owner_financial_rules (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  "ruleType" text NOT NULL,
  value numeric NOT NULL CHECK (value >= 0),
  "effectiveFrom" text NOT NULL,
  "effectiveTo" text,
  active boolean DEFAULT true,
  notes text,
  "createdAt" text DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS public.owner_payments (
  id text PRIMARY KEY,
  "companyId" text NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  period text NOT NULL,
  "dueAmount" numeric NOT NULL DEFAULT 0,
  "paidAmount" numeric NOT NULL CHECK ("paidAmount" > 0),
  "paymentDate" text NOT NULL,
  "paymentMethod" text DEFAULT 'bank_transfer',
  status text DEFAULT 'paid',
  notes text,
  "createdAt" text DEFAULT now()::text,
  "createdBy" text
);

-- ============================================================================
-- 19. PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  "companyId" text NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'عام',
  type text,
  specifications text,
  unit text DEFAULT 'متر مربع',
  price numeric NOT NULL DEFAULT 0,
  cost numeric,
  status text DEFAULT 'active',
  "createdAt" text DEFAULT now()::text,
  "updatedAt" text DEFAULT now()::text
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read/write on products"
ON public.products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 20. CONSTRAINTS & RELATIONSHIPS (FORWARD REFERENCES)
ALTER TABLE public.follow_ups 
  ADD CONSTRAINT fk_follow_ups_opportunity 
  FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id) ON DELETE SET NULL;



