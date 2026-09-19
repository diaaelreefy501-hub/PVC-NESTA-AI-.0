-- =============================================================================
-- PVC NESTA AI — Production RLS Security Policies (P0 Hardened)
-- Enforces:
-- 1. Total Anonymous Access Lockdown (Zero read/write for unauthenticated users)
-- 2. Multi-Tenant Company Isolation via auth.uid() & "companyId"
-- 3. Owner/Admin Role RBAC Preservation
-- 4. Hardened SECURITY DEFINER functions (SET search_path = public, pg_temp)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper Functions (SECURITY DEFINER with restricted search_path)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT active 
    FROM public.users 
    WHERE id = user_id::text
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT role 
    FROM public.users 
    WHERE id = user_id::text 
      AND active = true
  ), '');
$$;

CREATE OR REPLACE FUNCTION public.has_company_access(user_id uuid, target_company_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id::text
      AND active = true
      AND (
        "allowedCompanyIds" @> '["all"]'::jsonb
        OR "allowedCompanyIds" @> to_jsonb(target_company_id)
      )
  );
$$;

-- Revoke function execution from anon / public (Authenticated & Service Role only)
REVOKE ALL ON FUNCTION public.is_active_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_company_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_company_access(uuid, text) TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 2. Drop Any Existing Permissive / Legacy Policies
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'users', 'companies', 'customers', 'inquiries', 'quotations', 
        'contracts', 'payments', 'sales', 'inspections', 'interactions', 'follow_ups'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- 3. Explicit Table Permission Hardening (Defense-in-Depth)
-- -----------------------------------------------------------------------------

REVOKE ALL ON TABLE 
  public.users,
  public.companies,
  public.customers,
  public.inquiries,
  public.quotations,
  public.contracts,
  public.payments,
  public.sales,
  public.inspections,
  public.interactions,
  public.follow_ups
FROM anon, public;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE 
  public.users,
  public.companies,
  public.customers,
  public.inquiries,
  public.quotations,
  public.contracts,
  public.payments,
  public.sales,
  public.inspections,
  public.interactions,
  public.follow_ups
TO authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 4. Enable and Force RLS on All Sensitive Tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quotations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales FORCE ROW LEVEL SECURITY;
ALTER TABLE public.inspections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.interactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups FORCE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 5. USERS Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users select policy" ON public.users;
CREATE POLICY "Users select policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_active_user(auth.uid()));

DROP POLICY IF EXISTS "Users insert policy" ON public.users;
CREATE POLICY "Users insert policy" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) AND public.get_user_role(auth.uid()) = 'owner'
  );

DROP POLICY IF EXISTS "Users update policy" ON public.users;
CREATE POLICY "Users update policy" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) AND (
      public.get_user_role(auth.uid()) = 'owner'
      OR (public.get_user_role(auth.uid()) = 'admin' AND users.role != 'owner' AND users.id != auth.uid()::text)
      OR (users.id = auth.uid()::text)
    )
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) AND (
      public.get_user_role(auth.uid()) = 'owner'
      OR (public.get_user_role(auth.uid()) = 'admin' AND users.role != 'owner' AND users.id != auth.uid()::text)
      OR (
        users.id = auth.uid()::text 
        AND users.role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid()::text)
        AND users.active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users delete policy" ON public.users;
CREATE POLICY "Users delete policy" ON public.users
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) = 'owner' 
    AND users.id != auth.uid()::text
  );


-- -----------------------------------------------------------------------------
-- 6. COMPANIES Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Companies select policy" ON public.companies;
CREATE POLICY "Companies select policy" ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), id)
  );

DROP POLICY IF EXISTS "Companies insert policy" ON public.companies;
CREATE POLICY "Companies insert policy" ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), id)
  );

DROP POLICY IF EXISTS "Companies update policy" ON public.companies;
CREATE POLICY "Companies update policy" ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), id)
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), id)
  );

DROP POLICY IF EXISTS "Companies delete policy" ON public.companies;
CREATE POLICY "Companies delete policy" ON public.companies
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) = 'owner' 
    AND public.has_company_access(auth.uid(), id)
  );


-- -----------------------------------------------------------------------------
-- 7. CUSTOMERS Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Customers select policy" ON public.customers;
CREATE POLICY "Customers select policy" ON public.customers
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Customers insert policy" ON public.customers;
CREATE POLICY "Customers insert policy" ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Customers update policy" ON public.customers;
CREATE POLICY "Customers update policy" ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Customers delete policy" ON public.customers;
CREATE POLICY "Customers delete policy" ON public.customers
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );


-- -----------------------------------------------------------------------------
-- 8. INQUIRIES Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Inquiries select policy" ON public.inquiries;
CREATE POLICY "Inquiries select policy" ON public.inquiries
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Inquiries insert policy" ON public.inquiries;
CREATE POLICY "Inquiries insert policy" ON public.inquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Inquiries update policy" ON public.inquiries;
CREATE POLICY "Inquiries update policy" ON public.inquiries
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Inquiries delete policy" ON public.inquiries;
CREATE POLICY "Inquiries delete policy" ON public.inquiries
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );


-- -----------------------------------------------------------------------------
-- 9. QUOTATIONS Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Quotations select policy" ON public.quotations;
CREATE POLICY "Quotations select policy" ON public.quotations
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Quotations insert policy" ON public.quotations;
CREATE POLICY "Quotations insert policy" ON public.quotations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Quotations update policy" ON public.quotations;
CREATE POLICY "Quotations update policy" ON public.quotations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Quotations delete policy" ON public.quotations;
CREATE POLICY "Quotations delete policy" ON public.quotations
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );


-- -----------------------------------------------------------------------------
-- 10. CONTRACTS Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Contracts select policy" ON public.contracts;
CREATE POLICY "Contracts select policy" ON public.contracts
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Contracts insert policy" ON public.contracts;
CREATE POLICY "Contracts insert policy" ON public.contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Contracts update policy" ON public.contracts;
CREATE POLICY "Contracts update policy" ON public.contracts
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Contracts delete policy" ON public.contracts;
CREATE POLICY "Contracts delete policy" ON public.contracts
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );


-- -----------------------------------------------------------------------------
-- 11. PAYMENTS Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Payments select policy" ON public.payments;
CREATE POLICY "Payments select policy" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Payments insert policy" ON public.payments;
CREATE POLICY "Payments insert policy" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Payments update policy" ON public.payments;
CREATE POLICY "Payments update policy" ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Payments delete policy" ON public.payments;
CREATE POLICY "Payments delete policy" ON public.payments
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );


-- -----------------------------------------------------------------------------
-- 12. SALES Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sales select policy" ON public.sales;
CREATE POLICY "Sales select policy" ON public.sales
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Sales insert policy" ON public.sales;
CREATE POLICY "Sales insert policy" ON public.sales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Sales update policy" ON public.sales;
CREATE POLICY "Sales update policy" ON public.sales
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Sales delete policy" ON public.sales;
CREATE POLICY "Sales delete policy" ON public.sales
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );


-- -----------------------------------------------------------------------------
-- 13. INSPECTIONS Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Inspections select policy" ON public.inspections;
CREATE POLICY "Inspections select policy" ON public.inspections
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Inspections insert policy" ON public.inspections;
CREATE POLICY "Inspections insert policy" ON public.inspections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Inspections update policy" ON public.inspections;
CREATE POLICY "Inspections update policy" ON public.inspections
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Inspections delete policy" ON public.inspections;
CREATE POLICY "Inspections delete policy" ON public.inspections
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );


-- -----------------------------------------------------------------------------
-- 14. INTERACTIONS Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Interactions select policy" ON public.interactions;
CREATE POLICY "Interactions select policy" ON public.interactions
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Interactions insert policy" ON public.interactions;
CREATE POLICY "Interactions insert policy" ON public.interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Interactions update policy" ON public.interactions;
CREATE POLICY "Interactions update policy" ON public.interactions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Interactions delete policy" ON public.interactions;
CREATE POLICY "Interactions delete policy" ON public.interactions
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );


-- -----------------------------------------------------------------------------
-- 15. FOLLOW_UPS Table Policies
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Follow_ups select policy" ON public.follow_ups;
CREATE POLICY "Follow_ups select policy" ON public.follow_ups
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Follow_ups insert policy" ON public.follow_ups;
CREATE POLICY "Follow_ups insert policy" ON public.follow_ups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Follow_ups update policy" ON public.follow_ups;
CREATE POLICY "Follow_ups update policy" ON public.follow_ups
  FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  )
  WITH CHECK (
    public.is_active_user(auth.uid()) 
    AND public.has_company_access(auth.uid(), "companyId")
  );

DROP POLICY IF EXISTS "Follow_ups delete policy" ON public.follow_ups;
CREATE POLICY "Follow_ups delete policy" ON public.follow_ups
  FOR DELETE
  TO authenticated
  USING (
    public.is_active_user(auth.uid()) 
    AND public.get_user_role(auth.uid()) IN ('owner', 'admin') 
    AND public.has_company_access(auth.uid(), "companyId")
  );
