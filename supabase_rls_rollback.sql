-- ==============================================================
-- GREACH IMPACT ACADEMY - COMPREHENSIVE ROLLBACK & RECOVERY SPECIFICATION
--
-- SEPARATION OF PROCEDURES:
-- PROCEDURE 1: SECURE EMERGENCY RECOVERY (Immediate Non-Destructive SQL)
-- PROCEDURE 2: FULL DATABASE RESTORATION FROM VERIFIED BACKUP (Clean Reversal)
--
-- CRITICAL SECURITY & INTEGRITY INVARIANTS:
-- 1. NEITHER procedure restores unrestricted public attendance insertion/update.
-- 2. NEITHER procedure restores stale-JWT or browser-manipulated administrator authorization.
-- 3. Row Level Security (RLS) remains strictly ENABLED across all tables.
-- 4. Public access is restricted strictly to read-only catalog browsing.
-- ==============================================================


-- ==============================================================
-- PROCEDURE 1: SECURE EMERGENCY RECOVERY (Immediate Non-Destructive SQL)
-- Use this script in the event of an operational anomaly to revert
-- policy configurations while maintaining active database defenses and data safety.
--
-- WHAT IS RETAINED DURING EMERGENCY RECOVERY:
-- - Schema columns: access_codes.max_uses, access_codes.times_used, students.user_id
-- - Database CHECK constraints on access_codes
-- - Ledger table: public.access_code_redemptions (preserves student redemption history)
-- - Rate limits table: public.auth_rate_limits (preserves active attacker lockouts)
-- - Live role checking: public.is_super_admin() (prevents demoted admin token replay)
-- ==============================================================

-- --------------------------------------------------------------
-- 1. PRESERVE LIVE SUPER ADMIN VERIFICATION (Security Definer)
-- Defeats stale JWT replay attacks in real time against auth.users
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_live_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT coalesce(raw_app_meta_data->>'role', '') INTO v_live_role
  FROM auth.users
  WHERE id = auth.uid();

  RETURN v_live_role = 'super_admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_live_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT coalesce(raw_app_meta_data->>'role', '') INTO v_live_role
  FROM auth.users
  WHERE id = auth.uid();

  RETURN v_live_role = 'super_admin';
END;
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;


-- --------------------------------------------------------------
-- 2. COURSE PRICES (Secure Read-Only Rollback)
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Course Prices V1Final" ON course_prices;
DROP POLICY IF EXISTS "Super Admin Manage Course Prices V1Final" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1B" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1A" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Anon Prices Admin Sync" ON course_prices;
DROP POLICY IF EXISTS "Public Read Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Secure Admin Manage Course Prices Rollback" ON course_prices;

CREATE POLICY "Public Read Course Prices" ON course_prices
  FOR SELECT USING (true);

CREATE POLICY "Secure Admin Manage Course Prices Rollback" ON course_prices
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 3. COURSE SCHEDULES (Secure Read-Only Rollback)
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Course Schedules V1Final" ON course_schedules;
DROP POLICY IF EXISTS "Super Admin Manage Course Schedules V1Final" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1B" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1A" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Anon Schedules Admin Sync" ON course_schedules;
DROP POLICY IF EXISTS "Public Read Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Secure Admin Manage Schedules Rollback" ON course_schedules;

CREATE POLICY "Public Read Course Schedules" ON course_schedules
  FOR SELECT USING (true);

CREATE POLICY "Secure Admin Manage Schedules Rollback" ON course_schedules
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 4. BLOG POSTS (Secure Published-Only Rollback)
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Blog Posts V1Final" ON blog_posts;
DROP POLICY IF EXISTS "Super Admin Manage Blog Posts V1Final" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1B" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1A" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Anon Blog Posts Admin Sync" ON blog_posts;
DROP POLICY IF EXISTS "Public Read Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Secure Admin Manage Blog Posts Rollback" ON blog_posts;

CREATE POLICY "Public Read Blog Posts" ON blog_posts
  FOR SELECT USING (status = 'Published' OR public.is_super_admin());

CREATE POLICY "Secure Admin Manage Blog Posts Rollback" ON blog_posts
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 5. ACCESS CODES & SESSION PASSES (Secure Lock-Down Rollback)
-- Zero public access. Zero enumeration allowed during rollback.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Access Codes V1Final" ON access_codes;
DROP POLICY IF EXISTS "Super Admin Manage Access Codes V1Final" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1B" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1A" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Public Check Active Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Anon Access Codes Check" ON access_codes;
DROP POLICY IF EXISTS "Secure Admin Manage Access Codes Rollback" ON access_codes;

CREATE POLICY "Secure Admin Manage Access Codes Rollback" ON access_codes
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 5B. ACCESS CODE REDEMPTIONS (Secure Rollback)
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS public.access_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students View Own Redemptions V1Final" ON public.access_code_redemptions;
DROP POLICY IF EXISTS "Super Admin Manage Redemptions V1Final" ON public.access_code_redemptions;
DROP POLICY IF EXISTS "Secure Students View Own Redemptions Rollback" ON public.access_code_redemptions;
DROP POLICY IF EXISTS "Secure Super Admin Manage Redemptions Rollback" ON public.access_code_redemptions;

CREATE POLICY "Secure Students View Own Redemptions Rollback" ON public.access_code_redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Secure Super Admin Manage Redemptions Rollback" ON public.access_code_redemptions
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 6. STUDENTS (Secure Privacy Rollback)
-- Zero anonymous read or insert. Student privacy guaranteed during rollback.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Students V1Final" ON students;
DROP POLICY IF EXISTS "Super Admin Manage Students V1Final" ON students;
DROP POLICY IF EXISTS "Admin Manage Students V1B" ON students;
DROP POLICY IF EXISTS "Admin Manage Students V1A" ON students;
DROP POLICY IF EXISTS "Admin Manage Students" ON students;
DROP POLICY IF EXISTS "Secure Admin Manage Students Rollback" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1Final" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1B" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1A" ON students;
DROP POLICY IF EXISTS "Student Read Own Record" ON students;
DROP POLICY IF EXISTS "Secure Student Read Own Record Rollback" ON students;
DROP POLICY IF EXISTS "Public Student Self Registration" ON students;
DROP POLICY IF EXISTS "Anon Student Roster Operations" ON students;
DROP POLICY IF EXISTS "Student Verified Self Registration V1A" ON students;

CREATE POLICY "Secure Student Read Own Record Rollback" ON students
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin() OR
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Secure Admin Manage Students Rollback" ON students
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 7. ORDERS (Secure Financial Rollback)
-- Payment records strictly restricted to verified Super Admins.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Orders V1Final" ON orders;
DROP POLICY IF EXISTS "Super Admin Manage Orders V1Final" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1B" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1A" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders" ON orders;
DROP POLICY IF EXISTS "Secure Admin Manage Orders Rollback" ON orders;
DROP POLICY IF EXISTS "Public Order Creation" ON orders;
DROP POLICY IF EXISTS "Anon Orders Operations" ON orders;

CREATE POLICY "Secure Admin Manage Orders Rollback" ON orders
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 8. STUDENT PRESENCE (Secure Activity Rollback)
-- Zero public update or insert. Super Admin manage only.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS student_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin View Presence V1Final" ON student_presence;
DROP POLICY IF EXISTS "Admin Manage Presence V1Final" ON student_presence;
DROP POLICY IF EXISTS "Super Admin Manage Presence V1Final" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat V1Final" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat V1Final" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1B" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1A" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence" ON student_presence;
DROP POLICY IF EXISTS "Secure Admin View Presence Rollback" ON student_presence;
DROP POLICY IF EXISTS "Secure Admin Manage Presence Rollback" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Anon Presence Heartbeat" ON student_presence;

REVOKE ALL ON public.student_presence FROM anon;

CREATE POLICY "Secure Admin Manage Presence Rollback" ON student_presence
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 9. RATE LIMITS (Secure Rollback)
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS auth_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Rate Limits V1Final" ON auth_rate_limits;
DROP POLICY IF EXISTS "Super Admin Manage Rate Limits V1Final" ON auth_rate_limits;
DROP POLICY IF EXISTS "Admin Manage Rate Limits V1B" ON auth_rate_limits;
DROP POLICY IF EXISTS "Admin View Rate Limits V1A" ON auth_rate_limits;
DROP POLICY IF EXISTS "Secure Admin Manage Rate Limits Rollback" ON auth_rate_limits;

CREATE POLICY "Secure Admin Manage Rate Limits Rollback" ON auth_rate_limits
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());



-- ==============================================================
-- PROCEDURE 2: FULL DATABASE RESTORATION & COMPLETE REVERSAL (RUNBOOK & DDL)
--
-- USE CASE:
-- Use this procedure ONLY if a catastrophic failure necessitates completely
-- rolling back the database to the exact pre-Phase-1 baseline state, removing
-- all Phase 1 schema extensions and restoring from verified pre-Phase-1 dumps.
--
-- DISTINCTION FROM PROCEDURE 1:
-- - Procedure 1 (Emergency Recovery) is immediate and non-destructive: it preserves
--   new tables, columns, constraints, rate limits, and audit history while resetting
--   policies to a secure read-only state.
-- - Procedure 2 (Full Restoration) is destructive to Phase 1 structures: it drops all
--   added tables, columns, constraints, triggers, scheduled jobs and functions, and
--   re-applies the pre-Phase-1 schema and data backup dump.
-- ==============================================================

-- --------------------------------------------------------------
-- STEP 1: UNSCHEDULE AUTOMATED JOBS (pg_cron)
-- --------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-expired-rate-limits-hourly');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- --------------------------------------------------------------
-- STEP 2: DROP ALL ADDED PROCEDURES & SECURITY DEFINER FUNCTIONS
-- --------------------------------------------------------------
DROP FUNCTION IF EXISTS public.record_student_presence_heartbeat(text, text, text);
DROP FUNCTION IF EXISTS public.record_student_presence_heartbeat(text, text);
DROP FUNCTION IF EXISTS public.cleanup_expired_rate_limits();
DROP FUNCTION IF EXISTS public.verify_access_code(text, boolean);
DROP FUNCTION IF EXISTS public.verify_access_code(text, boolean, text);
DROP FUNCTION IF EXISTS public.verify_access_code(text);
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_admin();

-- --------------------------------------------------------------
-- STEP 3: DROP CHECK & UNIQUE CONSTRAINTS ADDED IN PHASE 1
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS public.access_codes DROP CONSTRAINT IF EXISTS check_access_codes_times_used;
ALTER TABLE IF EXISTS public.access_codes DROP CONSTRAINT IF EXISTS check_access_codes_max_uses;
ALTER TABLE IF EXISTS public.student_presence DROP CONSTRAINT IF EXISTS student_presence_session_id_key;

-- --------------------------------------------------------------
-- STEP 4: DROP NEW TABLES CREATED IN PHASE 1
-- --------------------------------------------------------------
DROP TABLE IF EXISTS public.access_code_redemptions CASCADE;
DROP TABLE IF EXISTS public.auth_rate_limits CASCADE;

-- --------------------------------------------------------------
-- STEP 5: DROP NEW COLUMNS ADDED TO EXISTING TABLES
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS public.access_codes DROP COLUMN IF EXISTS max_uses;
ALTER TABLE IF EXISTS public.access_codes DROP COLUMN IF EXISTS times_used;
ALTER TABLE IF EXISTS public.access_codes DROP COLUMN IF EXISTS is_session_pass;
ALTER TABLE IF EXISTS public.students DROP COLUMN IF EXISTS user_id;
ALTER TABLE IF EXISTS public.student_presence DROP COLUMN IF EXISTS terminated_at;

-- --------------------------------------------------------------
-- STEP 6: RESTORE ORIGINAL BASELINE DATA & POLICIES FROM DUMP
-- Execute via psql from the verified backup directory:
-- psql -h <staging_host> -U postgres -d postgres -f backup_pre_phase1_schema.sql
-- psql -h <staging_host> -U postgres -d postgres -f backup_pre_phase1_data.sql
-- --------------------------------------------------------------
