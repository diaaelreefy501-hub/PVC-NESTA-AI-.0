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

-- Enable Row Level Security (RLS) but allow ALL for now, to fix the issues immediately
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
