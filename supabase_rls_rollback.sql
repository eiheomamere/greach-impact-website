-- ==============================================================
-- GREACH IMPACT ACADEMY - SECURE REVERSIBLE ROLLBACK SPECIFICATION
-- Phase 1B Secure Rollback: Safely rolls back schema additions while MAINTAINING SECURE RLS.
--
-- CRITICAL SECURITY REQUIREMENT:
-- NEVER restore insecure baseline policies (e.g. `FOR ALL USING (true)`).
-- Row Level Security (RLS) is MAINTAINED ENABLED across all tables.
-- Public users have READ-ONLY access to genuinely public catalog data.
-- All mutations, student records, access codes, and orders remain strictly protected.
-- ==============================================================

-- 1. COURSE PRICES (Secure Read-Only Rollback)
ALTER TABLE IF EXISTS course_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1B" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1A" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Anon Prices Admin Sync" ON course_prices;
DROP POLICY IF EXISTS "Public Read Course Prices" ON course_prices;

CREATE POLICY "Public Read Course Prices" ON course_prices
  FOR SELECT USING (true);

CREATE POLICY "Secure Admin Manage Course Prices Rollback" ON course_prices
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'))
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'));


-- 2. COURSE SCHEDULES (Secure Read-Only Rollback)
ALTER TABLE IF EXISTS course_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1B" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1A" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Anon Schedules Admin Sync" ON course_schedules;
DROP POLICY IF EXISTS "Public Read Course Schedules" ON course_schedules;

CREATE POLICY "Public Read Course Schedules" ON course_schedules
  FOR SELECT USING (true);

CREATE POLICY "Secure Admin Manage Schedules Rollback" ON course_schedules
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'))
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'));


-- 3. BLOG POSTS (Secure Published-Only Rollback)
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1B" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1A" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Anon Blog Posts Admin Sync" ON blog_posts;
DROP POLICY IF EXISTS "Public Read Blog Posts" ON blog_posts;

CREATE POLICY "Public Read Blog Posts" ON blog_posts
  FOR SELECT USING (status = 'Published' OR coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'));

CREATE POLICY "Secure Admin Manage Blog Posts Rollback" ON blog_posts
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'))
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'));


-- 4. ACCESS CODES & SESSION PASSES (Secure Lock-Down Rollback)
-- Zero public access. No enumeration allowed even during rollback.
ALTER TABLE IF EXISTS access_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1B" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1A" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Public Check Active Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Anon Access Codes Check" ON access_codes;

CREATE POLICY "Secure Admin Manage Access Codes Rollback" ON access_codes
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'))
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'));


-- 5. STUDENTS (Secure Privacy Rollback)
-- Zero anonymous read or insert. Student privacy guaranteed during rollback.
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Students V1B" ON students;
DROP POLICY IF EXISTS "Admin Manage Students V1A" ON students;
DROP POLICY IF EXISTS "Admin Manage Students" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1B" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1A" ON students;
DROP POLICY IF EXISTS "Student Read Own Record" ON students;
DROP POLICY IF EXISTS "Public Student Self Registration" ON students;
DROP POLICY IF EXISTS "Anon Student Roster Operations" ON students;

CREATE POLICY "Secure Student Read Own Record Rollback" ON students
  FOR SELECT TO authenticated
  USING (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin') OR
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Secure Admin Manage Students Rollback" ON students
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'))
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'));


-- 6. ORDERS (Secure Financial Rollback)
-- Payment records strictly restricted to administrators.
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Orders V1B" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1A" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders" ON orders;
DROP POLICY IF EXISTS "Public Order Creation" ON orders;
DROP POLICY IF EXISTS "Anon Orders Operations" ON orders;

CREATE POLICY "Secure Admin Manage Orders Rollback" ON orders
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'))
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'));


-- 7. STUDENT PRESENCE (Secure Activity Rollback)
ALTER TABLE IF EXISTS student_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin View Presence V1B" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1A" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Anon Presence Heartbeat" ON student_presence;

CREATE POLICY "Secure Admin View Presence Rollback" ON student_presence
  FOR SELECT TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'));


-- 8. RATE LIMITS
ALTER TABLE IF EXISTS auth_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Rate Limits V1B" ON auth_rate_limits;
DROP POLICY IF EXISTS "Admin View Rate Limits V1A" ON auth_rate_limits;

CREATE POLICY "Secure Admin Manage Rate Limits Rollback" ON auth_rate_limits
  FOR ALL TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'))
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin'));
