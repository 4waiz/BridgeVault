-- Add draft support and QR metadata columns to leads table
-- Run this migration against your Supabase database.

-- 1. Add is_draft flag with default false (existing rows are not drafts)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- 2. Add QR metadata columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS qr_raw text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS qr_json jsonb;

-- 3. Add 'draft' to the status check constraint if one exists.
--    Supabase may or may not have a check constraint on status.
--    This safely handles both cases.
DO $$
BEGIN
  -- Drop existing check constraint on status if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'leads' AND column_name = 'status'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.leads DROP CONSTRAINT ' || constraint_name
      FROM information_schema.constraint_column_usage
      WHERE table_name = 'leads' AND column_name = 'status'
      LIMIT 1
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if no constraint exists
  NULL;
END $$;

-- Re-add the constraint with 'draft' included
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'reviewed', 'contacted', 'qualified', 'archived', 'draft'));

-- 4. Create index for fast draft lookups
CREATE INDEX IF NOT EXISTS idx_leads_is_draft ON public.leads (user_id, is_draft)
  WHERE is_draft = true;

-- 5. Create index for QR data presence (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_leads_qr ON public.leads (user_id)
  WHERE qr_raw IS NOT NULL;
