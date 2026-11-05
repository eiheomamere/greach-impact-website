-- ==============================================================
-- GREACH IMPACT ACADEMY - PHASE 1A ROW LEVEL SECURITY HARDENING
-- Safe, Non-Destructive Database Authorization Specification
--
-- CORE PRINCIPLES:
-- 1. Authenticated users do NOT automatically receive admin access.
-- 2. Authorization is bound to server-controlled `app_metadata.role`.
--    User-editable `user_metadata` is STRICTLY IGNORED.
-- 3. Public access is restricted exclusively to public data (prices, schedules, published blogs).
-- 4. Access codes cannot be publicly enumerated.
-- 5. Student and payment records are fully private and protected.
-- 6. Unrestricted public INSERT policies are removed.
-- 7. All other applications, schemas, and auth.users globally are PROTECTED.
-- ==============================================================

-- --------------------------------------------------------------
-- HELPER FUNCTIONS: Server-Controlled Role Verification
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Reads strictly from server-controlled app_metadata in JWT.
  -- user_metadata can be edited by users via client SDK and is NEVER trusted.
  RETURN coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- --------------------------------------------------------------
-- 1. COURSE PRICES TABLE
-- Public can view course fees. Only verified admins can modify.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Prices Admin Sync" ON course_prices;
DROP POLICY IF EXISTS "Public Read Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1A" ON course_prices;

CREATE POLICY "Public Read Course Prices" ON course_prices
  FOR SELECT USING (true);

CREATE POLICY "Admin Manage Course Prices V1A" ON course_prices
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 2. COURSE SCHEDULES TABLE
-- Public can view cohort schedules. Only verified admins can modify.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Schedules Admin Sync" ON course_schedules;
DROP POLICY IF EXISTS "Public Read Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1A" ON course_schedules;

CREATE POLICY "Public Read Course Schedules" ON course_schedules
  FOR SELECT USING (true);

CREATE POLICY "Admin Manage Course Schedules V1A" ON course_schedules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 3. BLOG POSTS TABLE
-- Public can only read Published posts. Drafts & mutations need admin.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Blog Posts Admin Sync" ON blog_posts;
DROP POLICY IF EXISTS "Public Read Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1A" ON blog_posts;

CREATE POLICY "Public Read Blog Posts" ON blog_posts
  FOR SELECT USING (status = 'Published' OR public.is_admin());

CREATE POLICY "Admin Manage Blog Posts V1A" ON blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 4. ACCESS CODES & SESSION PASSES TABLE
-- PREVENT ENUMERATION: No public SELECT policy allowed.
-- Public clients cannot dump or harvest active codes.
-- Admins have full access. Code redemption is via secure RPC.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Access Codes Check" ON access_codes;
DROP POLICY IF EXISTS "Public Check Active Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1A" ON access_codes;

-- Admin full management
CREATE POLICY "Admin Manage Access Codes V1A" ON access_codes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Secure RPC function: validates code without exposing the table or other rows
CREATE OR REPLACE FUNCTION public.verify_access_code(p_code text)
RETURNS boolean AS $$
DECLARE
  v_valid boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM access_codes
    WHERE code = trim(p_code) AND is_active = true
  ) INTO v_valid;
  RETURN coalesce(v_valid, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- --------------------------------------------------------------
-- 5. STUDENTS TABLE
-- Remove unrestricted public INSERT.
-- Protect student privacy: No anonymous read/write.
-- Self-registration requires valid authenticated user matching email.
-- Admins can manage all records.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Student Roster Operations" ON students;
DROP POLICY IF EXISTS "Public Student Self Registration" ON students;
DROP POLICY IF EXISTS "Admin Manage Students" ON students;
DROP POLICY IF EXISTS "Student Read Own Record" ON students;
DROP POLICY IF EXISTS "Student Verified Self Registration V1A" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1A" ON students;
DROP POLICY IF EXISTS "Admin Manage Students V1A" ON students;

-- Authenticated students can create their own profile matching their verified auth email
CREATE POLICY "Student Verified Self Registration V1A" ON students
  FOR INSERT TO authenticated
  WITH CHECK (auth.email() IS NOT NULL AND auth.email() = registered_email);

-- Students can read only their own record
CREATE POLICY "Student Read Own Record V1A" ON students
  FOR SELECT TO authenticated
  USING (public.is_admin() OR auth.email() = registered_email);

-- Admin management
CREATE POLICY "Admin Manage Students V1A" ON students
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 6. ORDERS TABLE
-- Payment information is strictly restricted. No public read.
-- Insertion through trusted server-side API or authenticated user.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Orders Operations" ON orders;
DROP POLICY IF EXISTS "Public Order Creation" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1A" ON orders;

CREATE POLICY "Admin Manage Orders V1A" ON orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 7. STUDENT PRESENCE TABLE
-- Activity logs and telemetry restricted to admins.
-- Heartbeat update allowed for registered student presence.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS student_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Presence Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1A" ON student_presence;

CREATE POLICY "Admin View Presence V1A" ON student_presence
  FOR SELECT TO authenticated
  USING (public.is_admin());


-- --------------------------------------------------------------
-- 8. AUTH RATE LIMITS PERSISTENCE TABLE (Vercel Multi-Instance)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  ip text PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 1,
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  last_failed_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);

ALTER TABLE IF EXISTS public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin View Rate Limits V1A" ON public.auth_rate_limits;
CREATE POLICY "Admin View Rate Limits V1A" ON public.auth_rate_limits
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
