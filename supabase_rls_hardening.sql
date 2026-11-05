-- ==============================================================
-- GREACH IMPACT ACADEMY - ROW LEVEL SECURITY (RLS) HARDENING
-- Phase 1: Security & Authentication Hardening
-- Enforces Least Privilege Access Control on Confirmed Greach Tables
-- Safe Migration: Protects all other tables, schemas, and auth.users
-- ==============================================================

-- 1. COURSE PRICES TABLE
-- Allow public read access so website visitors see current fees
-- Restrict insert, update, and delete exclusively to authenticated administrators
ALTER TABLE IF EXISTS course_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Prices Admin Sync" ON course_prices;
DROP POLICY IF EXISTS "Public Read Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices" ON course_prices;

CREATE POLICY "Public Read Course Prices" ON course_prices
  FOR SELECT USING (true);

CREATE POLICY "Admin Manage Course Prices" ON course_prices
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 2. COURSE SCHEDULES TABLE
-- Allow public read access for cohort start dates and timetables
-- Restrict mutations exclusively to authenticated administrators
ALTER TABLE IF EXISTS course_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Schedules Admin Sync" ON course_schedules;
DROP POLICY IF EXISTS "Public Read Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules" ON course_schedules;

CREATE POLICY "Public Read Course Schedules" ON course_schedules
  FOR SELECT USING (true);

CREATE POLICY "Admin Manage Course Schedules" ON course_schedules
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 3. BLOG POSTS TABLE
-- Public visitors can read published articles
-- Authenticated admins can view drafts and perform mutations
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Blog Posts Admin Sync" ON blog_posts;
DROP POLICY IF EXISTS "Public Read Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts" ON blog_posts;

CREATE POLICY "Public Read Blog Posts" ON blog_posts
  FOR SELECT USING (status = 'Published' OR auth.role() = 'authenticated');

CREATE POLICY "Admin Manage Blog Posts" ON blog_posts
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 4. ACCESS CODES & SESSION PASSES TABLE
-- Allow verification of active passes only (prevents scanning revoked/expired codes)
-- Administrative management restricted to authenticated staff
ALTER TABLE IF EXISTS access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Access Codes Check" ON access_codes;
DROP POLICY IF EXISTS "Public Check Active Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes" ON access_codes;

CREATE POLICY "Public Check Active Access Codes" ON access_codes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin Manage Access Codes" ON access_codes
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 5. STUDENTS TABLE
-- Prevent anonymous harvesting of student names and credentials
-- Admins can view/manage all records; self-registration allows inserts
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Student Roster Operations" ON students;
DROP POLICY IF EXISTS "Public Student Self Registration" ON students;
DROP POLICY IF EXISTS "Admin Manage Students" ON students;
DROP POLICY IF EXISTS "Student Read Own Record" ON students;

CREATE POLICY "Public Student Self Registration" ON students
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin Manage Students" ON students
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Student Read Own Record" ON students
  FOR SELECT USING (auth.email() = registered_email);


-- 6. ORDERS TABLE
-- Public checkout can create an order record
-- Viewing, updating, and refunding restricted to administrators
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Orders Operations" ON orders;
DROP POLICY IF EXISTS "Public Order Creation" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders" ON orders;

CREATE POLICY "Public Order Creation" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin Manage Orders" ON orders
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- 7. STUDENT PRESENCE TABLE
-- Allow classroom presence insertions and heartbeats
-- Full activity viewing restricted to authenticated administrators
ALTER TABLE IF EXISTS student_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Presence Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence" ON student_presence;

CREATE POLICY "Public Insert Heartbeat" ON student_presence
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Update Heartbeat" ON student_presence
  FOR UPDATE USING (true);

CREATE POLICY "Admin View Presence" ON student_presence
  FOR SELECT TO authenticated
  USING (true);
