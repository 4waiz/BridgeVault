-- Remove 'new' status, add 'rejected' status
-- Existing leads with status='new' are migrated to 'reviewed'.

BEGIN;

-- 1. Migrate any existing 'new' leads to 'reviewed'
UPDATE public.leads SET status = 'reviewed' WHERE status = 'new';

-- 2. Drop existing check constraint on status (if any)
DO $$
BEGIN
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
END $$;

-- 3. Re-add constraint without 'new', with 'rejected'
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('reviewed', 'contacted', 'qualified', 'rejected', 'archived', 'draft'));

-- 4. Update column default so future rows land as 'reviewed'
ALTER TABLE public.leads ALTER COLUMN status SET DEFAULT 'reviewed';

COMMIT;
