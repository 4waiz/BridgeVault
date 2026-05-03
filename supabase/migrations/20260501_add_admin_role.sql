-- ============================================================
-- BridgeVault — Admin role & analytics views
--
-- IMPORTANT: Before running this migration, sign up the admin
-- user at /auth/sign-up using:
--     email:    admin@edgegroup.ae
--     password: <choose-your-own>
-- THEN run this whole file in the Supabase SQL editor.
-- ============================================================

-- 1. is_admin flag on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Partial index for fast gate-check (only admin rows are indexed)
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON public.profiles (id) WHERE is_admin = true;

-- 3. Promote the admin
UPDATE public.profiles
   SET is_admin = true
 WHERE email = 'admin@edgegroup.ae';

-- 4. Per-user stats view (powers leaderboard + /admin/users table)
CREATE OR REPLACE VIEW public.admin_user_stats AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.created_at AS joined_at,
  p.is_admin,
  COUNT(DISTINCT l.id) FILTER (WHERE l.is_draft = false)            AS leads_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'qualified')        AS qualified_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'contacted')        AS contacted_count,
  COUNT(DISTINCT l.id) FILTER (WHERE l.is_draft = true)             AS drafts_count,
  MAX(la.created_at) FILTER (WHERE la.action IN ('created','draft_promoted')) AS last_scan_at
FROM public.profiles p
LEFT JOIN public.leads l          ON l.user_id = p.id
LEFT JOIN public.lead_activity la ON la.user_id = p.id
GROUP BY p.id;

-- 5. Daily scans trend (last 30 days, all users)
CREATE OR REPLACE VIEW public.admin_daily_scans AS
SELECT
  date_trunc('day', la.created_at)::date AS day,
  COUNT(*) AS scans
FROM public.lead_activity la
WHERE la.action IN ('created','draft_promoted')
  AND la.created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;

-- 6. Verify (run separately to confirm)
-- SELECT id, email, is_admin FROM public.profiles WHERE email = 'admin@edgegroup.ae';
