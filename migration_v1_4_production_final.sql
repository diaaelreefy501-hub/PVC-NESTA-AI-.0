-- ============================================================================
-- PVC NESTA — FINAL PRODUCTION AUDIT & VERIFICATION MIGRATION (v1.4)
-- Idempotent script: Safe to run multiple times in Supabase SQL Editor
-- ============================================================================

-- 1. Ensure `products` table exists
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

-- Enable RLS and create policy for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_authenticated_all'
  ) THEN
    CREATE POLICY products_authenticated_all ON public.products
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Ensure `opportunities` table exists and has proper columns
CREATE TABLE IF NOT EXISTS public.opportunities (
  id text PRIMARY KEY,
  "companyId" text NOT NULL,
  "customerId" text,
  "inquiryId" text,
  title text NOT NULL DEFAULT 'فرصة جديدة',
  stage text NOT NULL DEFAULT 'inquiry',
  status text NOT NULL DEFAULT 'active',
  "lossReason" text,
  "lossNotes" text,
  "expectedValue" numeric DEFAULT 0,
  "productType" text DEFAULT '',
  area text DEFAULT '',
  source text DEFAULT '',
  "assignedTo" text,
  "quotationId" text,
  "contractId" text,
  "lastContactDate" text,
  "nextFollowUpDate" text,
  notes text DEFAULT '',
  "createdAt" text DEFAULT now()::text,
  "updatedAt" text,
  "closedAt" text
);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'opportunities' AND policyname = 'opportunities_authenticated_all'
  ) THEN
    CREATE POLICY opportunities_authenticated_all ON public.opportunities
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Ensure `users` table RLS allows authenticated users with admin/owner to manage rows
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_authenticated_select'
  ) THEN
    CREATE POLICY users_authenticated_select ON public.users
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_admin_manage'
  ) THEN
    CREATE POLICY users_admin_manage ON public.users
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. RPC Function: create_system_user
-- Securely creates user in auth.users and syncs to public.users with confirmed email
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_system_user(
  new_name text,
  new_email text,
  new_password text,
  new_role text,
  new_allowed_companies jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  norm_email text := lower(trim(new_email));
  encrypted_pw text;
BEGIN
  -- Verify caller is admin or owner (if an auth session exists)
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
        AND active = true 
        AND role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'غير مصرح: يتطلب صلاحية مدير أو مالك النظام';
    END IF;
  END IF;

  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- Check if user already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = norm_email) THEN
    SELECT id INTO new_user_id FROM auth.users WHERE email = norm_email LIMIT 1;
    
    -- Update password and confirm email
    UPDATE auth.users 
    SET encrypted_password = encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object('name', new_name),
        banned_until = NULL
    WHERE id = new_user_id;

    -- Upsert profile in public.users
    INSERT INTO public.users (id, name, email, role, "allowedCompanyIds", active, created_at)
    VALUES (new_user_id, new_name, norm_email, new_role, new_allowed_companies, true, now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      "allowedCompanyIds" = EXCLUDED."allowedCompanyIds",
      active = true;

    RETURN jsonb_build_object(
      'id', new_user_id,
      'name', new_name,
      'email', norm_email,
      'role', new_role,
      'allowedCompanyIds', new_allowed_companies,
      'active', true
    );
  END IF;

  -- Insert into auth.users with confirmed email
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    norm_email,
    encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', new_name),
    now(),
    now(),
    'authenticated',
    'authenticated'
  );

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', norm_email),
    'email',
    norm_email,
    now(),
    now(),
    now()
  );

  -- Insert into public.users
  INSERT INTO public.users (
    id,
    name,
    email,
    role,
    "allowedCompanyIds",
    active,
    created_at
  ) VALUES (
    new_user_id,
    new_name,
    norm_email,
    new_role,
    new_allowed_companies,
    true,
    now()
  );

  RETURN jsonb_build_object(
    'id', new_user_id,
    'name', new_name,
    'email', norm_email,
    'role', new_role,
    'allowedCompanyIds', new_allowed_companies,
    'active', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_system_user TO authenticated, service_role;

-- 5. RPC Function: toggle_user_active
CREATE OR REPLACE FUNCTION public.toggle_user_active(target_user_id uuid, target_active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify caller is admin or owner
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
        AND active = true 
        AND role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'غير مصرح: يتطلب صلاحية مدير أو مالك النظام';
    END IF;
  END IF;

  -- Update public.users
  UPDATE public.users SET active = target_active WHERE id = target_user_id;

  -- If deactivated, ban in auth.users
  IF target_active = false THEN
    UPDATE auth.users SET banned_until = '2100-01-01 00:00:00+00' WHERE id = target_user_id;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = target_user_id;
  END IF;

  RETURN target_active;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_user_active TO authenticated, service_role;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';

