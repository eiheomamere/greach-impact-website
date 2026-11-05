-- ==============================================================
-- GREACH IMPACT ACADEMY - REVERSIBLE ROLLBACK MIGRATION
-- Safely restores the previous database policies that existed before Phase 1 / Phase 1A
--
-- CRITICAL REQUIREMENT:
-- Row Level Security (RLS) is KEPT ENABLED on all tables.
-- RLS is NEVER disabled during or after rollback.
-- ==============================================================

-- 1. COURSE PRICES
ALTER TABLE IF EXISTS course_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1A" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Public Read Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Anon Prices Admin Sync" ON course_prices;

CREATE POLICY "Public Read Course Prices" ON course_prices
  FOR SELECT USING (true);

CREATE POLICY "Anon Prices Admin Sync" ON course_prices
  FOR ALL USING (true) WITH CHECK (true);


-- 2. COURSE SCHEDULES
ALTER TABLE IF EXISTS course_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1A" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Public Read Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Anon Schedules Admin Sync" ON course_schedules;

CREATE POLICY "Public Read Course Schedules" ON course_schedules
  FOR SELECT USING (true);

CREATE POLICY "Anon Schedules Admin Sync" ON course_schedules
  FOR ALL USING (true) WITH CHECK (true);


-- 3. BLOG POSTS
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1A" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Public Read Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Anon Blog Posts Admin Sync" ON blog_posts;

CREATE POLICY "Public Read Blog Posts" ON blog_posts
  FOR SELECT USING (status = 'Published');

CREATE POLICY "Anon Blog Posts Admin Sync" ON blog_posts
  FOR ALL USING (true) WITH CHECK (true);


-- 4. ACCESS CODES & SESSION PASSES
ALTER TABLE IF EXISTS access_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1A" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Public Check Active Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Anon Access Codes Check" ON access_codes;

CREATE POLICY "Anon Access Codes Check" ON access_codes
  FOR ALL USING (true) WITH CHECK (true);


-- 5. STUDENTS
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Students V1A" ON students;
DROP POLICY IF EXISTS "Admin Manage Students" ON students;
DROP POLICY IF EXISTS "Student Verified Self Registration V1A" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1A" ON students;
DROP POLICY IF EXISTS "Student Read Own Record" ON students;
DROP POLICY IF EXISTS "Public Student Self Registration" ON students;
DROP POLICY IF EXISTS "Anon Student Roster Operations" ON students;

CREATE POLICY "Anon Student Roster Operations" ON students
  FOR ALL USING (true) WITH CHECK (true);


-- 6. ORDERS
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Manage Orders V1A" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders" ON orders;
DROP POLICY IF EXISTS "Public Order Creation" ON orders;
DROP POLICY IF EXISTS "Anon Orders Operations" ON orders;

CREATE POLICY "Anon Orders Operations" ON orders
  FOR ALL USING (true) WITH CHECK (true);


-- 7. STUDENT PRESENCE
ALTER TABLE IF EXISTS student_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin View Presence V1A" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Anon Presence Heartbeat" ON student_presence;

CREATE POLICY "Anon Presence Heartbeat" ON student_presence
  FOR ALL USING (true) WITH CHECK (true);


-- 8. CLEANUP HELPER FUNCTIONS
DROP FUNCTION IF EXISTS public.verify_access_code(text);
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_admin();
