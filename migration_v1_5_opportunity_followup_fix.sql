-- ============================================================================
-- PVC NESTA — OPPORTUNITY FOLLOW-UP INTEGRITY FIX MIGRATION (v1.5)
-- Idempotent script: Safe to run multiple times in Supabase SQL Editor
-- ============================================================================

-- 1. Ensure "opportunityId" column exists in public.follow_ups table
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS "opportunityId" text;

-- 2. Ensure the foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'follow_ups' AND constraint_name = 'fk_follow_ups_opportunity'
  ) THEN
    ALTER TABLE public.follow_ups 
      ADD CONSTRAINT fk_follow_ups_opportunity 
      FOREIGN KEY ("opportunityId") REFERENCES public.opportunities(id) ON DELETE SET NULL;
  END IF;
END $$;
