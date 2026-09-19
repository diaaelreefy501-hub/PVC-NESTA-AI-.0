-- We must RECREATE the tables with double quotes for camelCase, otherwise the React app breaks!
DROP TABLE IF EXISTS public.users;
CREATE TABLE public.users (
  id text PRIMARY KEY,
  name text,
  email text,
  role text,
  "allowedCompanyIds" jsonb,
  active boolean,
  phone text,
  created_at timestamp with time zone DEFAULT now()
);

DROP TABLE IF EXISTS public.companies;
CREATE TABLE public.companies (
  id text PRIMARY KEY,
  name text,
  "nameEn" text,
  color text,
  "badgeBg" text,
  "badgeText" text,
  phone text,
  email text,
  "monthlyTarget" numeric,
  active boolean,
  "logoText" text,
  "logoUrl" text,
  created_at timestamp with time zone DEFAULT now()
);

DROP TABLE IF EXISTS public.customers;
CREATE TABLE public.customers (
  id text PRIMARY KEY,
  "companyId" text,
  name text,
  phone text,
  "secondaryPhone" text,
  area text,
  address text,
  source text,
  "interestLevel" text,
  stage text,
  notes text,
  "createdAt" text,
  "lastContactDate" text,
  "nextFollowUpDate" text,
  "totalQuotationsValue" numeric,
  "totalSalesValue" numeric
);

DROP TABLE IF EXISTS public.inquiries;
CREATE TABLE public.inquiries (
  id text PRIMARY KEY,
  "companyId" text,
  "customerId" text,
  "customerName" text,
  "customerPhone" text,
  area text,
  "productType" text,
  details text,
  source text,
  "interestLevel" text,
  stage text,
  date text,
  "lastContactDate" text,
  "nextFollowUpDate" text
);

DROP TABLE IF EXISTS public.interactions;
CREATE TABLE public.interactions (
  id text PRIMARY KEY,
  "customerId" text,
  "companyId" text,
  type text,
  date text,
  notes text,
  result text,
  "nextStep" text
);

DROP TABLE IF EXISTS public.follow_ups;
CREATE TABLE public.follow_ups (
  id text PRIMARY KEY,
  "companyId" text,
  "customerId" text,
  "customerName" text,
  "customerPhone" text,
  "dueDate" text,
  time text,
  title text,
  notes text,
  status text,
  priority text,
  "createdAt" text
);

DROP TABLE IF EXISTS public.quotations;
CREATE TABLE public.quotations (
  id text PRIMARY KEY,
  "quoteNumber" text,
  "companyId" text,
  "customerId" text,
  "customerName" text,
  "customerPhone" text,
  area text,
  date text,
  "expiryDate" text,
  status text,
  items jsonb,
  subtotal numeric,
  "discountTotal" numeric,
  "totalAmount" numeric,
  notes text,
  "isSummaryQuote" boolean,
  "totalMeters" numeric,
  "pricePerMeter" numeric,
  "summaryDescription" text,
  "profileType" text,
  "glassType" text
);

DROP TABLE IF EXISTS public.inspections;
CREATE TABLE public.inspections (
  id text PRIMARY KEY,
  "companyId" text,
  "customerId" text,
  "customerName" text,
  "customerPhone" text,
  area text,
  address text,
  date text,
  surveyor text,
  notes text,
  result text,
  "measurementsCount" numeric
);

DROP TABLE IF EXISTS public.contracts;
CREATE TABLE public.contracts (
  id text PRIMARY KEY,
  "contractNumber" text,
  "companyId" text,
  "customerId" text,
  "customerName" text,
  "customerPhone" text,
  area text,
  "quotationId" text,
  date text,
  "totalValue" numeric,
  "paidAmount" numeric,
  "remainingAmount" numeric,
  status text,
  notes text
);

DROP TABLE IF EXISTS public.payments;
CREATE TABLE public.payments (
  id text PRIMARY KEY,
  "contractId" text,
  "customerId" text,
  "customerName" text,
  "companyId" text,
  amount numeric,
  date text,
  method text,
  "receiptNumber" text,
  notes text
);

DROP TABLE IF EXISTS public.sales;
CREATE TABLE public.sales (
  id text PRIMARY KEY,
  "companyId" text,
  "customerId" text,
  "customerName" text,
  area text,
  "contractId" text,
  amount numeric,
  date text,
  responsible text,
  "customerSource" text
);

-- Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL users" ON public.users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL inquiries" ON public.inquiries FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL interactions" ON public.interactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL follow_ups" ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL quotations" ON public.quotations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL inspections" ON public.inspections FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow ALL sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, reload_schema;
