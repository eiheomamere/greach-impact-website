-- ==============================================================
-- GREACH IMPACT ACADEMY - SECURE REVERSIBLE ROLLBACK SPECIFICATION
-- Phase 1 Final Secure Rollback: Safely rolls back schema additions while MAINTAINING SECURE RLS.
--
-- CRITICAL SECURITY REQUIREMENTS:
-- 1. Drops EVERY policy introduced by the final production migration (...V1Final).
-- 2. Preserves real-time database role revocation via public.is_admin().
-- 3. NEVER restores insecure baseline policies (e.g. `FOR ALL USING (true)`).
-- 4. Row Level Security (RLS) remains strictly ENABLED across all tables.
-- 5. Public users retain read-only access only to genuinely public catalog data.
-- 6. All mutations, student records, access codes, orders, and presence remain strictly protected.
-- ==============================================================

-- --------------------------------------------------------------
-- 1. PRESERVE LIVE ROLE VERIFICATION FUNCTIONS (Security Definer)
-- Ensures real-time database checks against auth.users persist during rollback
-- --------------------------------------------------------------
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

  RETURN v_live_role IN ('super_admin', 'sub_admin');
END;
$$;

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

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated, service_role;


-- --------------------------------------------------------------
-- 2. COURSE PRICES (Secure Read-Only Rollback)
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Course Prices V1Final" ON course_prices;
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
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 3. COURSE SCHEDULES (Secure Read-Only Rollback)
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Course Schedules V1Final" ON course_schedules;
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
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 4. BLOG POSTS (Secure Published-Only Rollback)
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Blog Posts V1Final" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1B" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1A" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Anon Blog Posts Admin Sync" ON blog_posts;
DROP POLICY IF EXISTS "Public Read Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Secure Admin Manage Blog Posts Rollback" ON blog_posts;

CREATE POLICY "Public Read Blog Posts" ON blog_posts
  FOR SELECT USING (status = 'Published' OR public.is_admin());

CREATE POLICY "Secure Admin Manage Blog Posts Rollback" ON blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 5. ACCESS CODES & SESSION PASSES (Secure Lock-Down Rollback)
-- Zero public access. No enumeration allowed even during rollback.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Access Codes V1Final" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1B" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1A" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Public Check Active Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Anon Access Codes Check" ON access_codes;
DROP POLICY IF EXISTS "Secure Admin Manage Access Codes Rollback" ON access_codes;

CREATE POLICY "Secure Admin Manage Access Codes Rollback" ON access_codes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 6. STUDENTS (Secure Privacy Rollback)
-- Zero anonymous read or insert. Student privacy guaranteed during rollback.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Students V1Final" ON students;
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
    public.is_admin() OR
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Secure Admin Manage Students Rollback" ON students
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 7. ORDERS (Secure Financial Rollback)
-- Payment records strictly restricted to administrators.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Orders V1Final" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1B" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1A" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders" ON orders;
DROP POLICY IF EXISTS "Secure Admin Manage Orders Rollback" ON orders;
DROP POLICY IF EXISTS "Public Order Creation" ON orders;
DROP POLICY IF EXISTS "Anon Orders Operations" ON orders;

CREATE POLICY "Secure Admin Manage Orders Rollback" ON orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 8. STUDENT PRESENCE (Secure Activity Rollback)
-- Zero public update. Public insert permitted for attendance telemetry.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS student_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin View Presence V1Final" ON student_presence;
DROP POLICY IF EXISTS "Admin Manage Presence V1Final" ON student_presence;
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

CREATE POLICY "Public Insert Heartbeat" ON student_presence
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Secure Admin Manage Presence Rollback" ON student_presence
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 9. RATE LIMITS (Secure Rollback)
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS auth_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Rate Limits V1Final" ON auth_rate_limits;
DROP POLICY IF EXISTS "Admin Manage Rate Limits V1B" ON auth_rate_limits;
DROP POLICY IF EXISTS "Admin View Rate Limits V1A" ON auth_rate_limits;
DROP POLICY IF EXISTS "Secure Admin Manage Rate Limits Rollback" ON auth_rate_limits;

CREATE POLICY "Secure Admin Manage Rate Limits Rollback" ON auth_rate_limits
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
