-- ==============================================================
-- GREACH IMPACT ACADEMY - PHASE 1B FINAL ROW LEVEL SECURITY HARDENING
-- Non-Destructive, Least-Privilege Database Authorization Specification
--
-- CORE PRINCIPLES:
-- 1. Authenticated users do NOT automatically receive administrator privileges.
-- 2. Authorization binds exclusively to server-controlled `app_metadata.role`.
--    User-editable `user_metadata` is STRICTLY IGNORED.
-- 3. Public access is restricted exclusively to genuinely public read-only catalog data.
-- 4. Access codes cannot be publicly enumerated; redemption is concurrency-safe via secure RPC.
-- 5. Student records and payment orders are strictly private with zero client privilege escalation.
-- 6. Rate limits are protected from client tampering and lockouts persist across serverless instances.
-- 7. All other applications, schemas, and auth.users globally remain completely untouched.
-- ==============================================================

-- --------------------------------------------------------------
-- HELPER FUNCTIONS: Server-Controlled Role Verification
-- Fixed search_path eliminates search-path hijacking attacks
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Reads strictly from server-controlled app_metadata in JWT.
  -- user_metadata can be edited by users via client SDK and is NEVER trusted.
  RETURN coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('super_admin', 'sub_admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin';
END;
$$;


-- --------------------------------------------------------------
-- 1. COURSE PRICES TABLE
-- Public can view course fees. Only verified admins can insert, update, or delete.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Prices Admin Sync" ON course_prices;
DROP POLICY IF EXISTS "Public Read Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1A" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1B" ON course_prices;

CREATE POLICY "Public Read Course Prices" ON course_prices
  FOR SELECT USING (true);

CREATE POLICY "Admin Manage Course Prices V1B" ON course_prices
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 2. COURSE SCHEDULES TABLE
-- Public can view cohort timetables. Only verified admins can modify.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Schedules Admin Sync" ON course_schedules;
DROP POLICY IF EXISTS "Public Read Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1A" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1B" ON course_schedules;

CREATE POLICY "Public Read Course Schedules" ON course_schedules
  FOR SELECT USING (true);

CREATE POLICY "Admin Manage Course Schedules V1B" ON course_schedules
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
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1B" ON blog_posts;

CREATE POLICY "Public Read Blog Posts" ON blog_posts
  FOR SELECT USING (status = 'Published' OR public.is_admin());

CREATE POLICY "Admin Manage Blog Posts V1B" ON blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 4. ACCESS CODES & SESSION PASSES TABLE
-- PREVENT ENUMERATION: No public SELECT policy allowed.
-- Redemption and validation occur exclusively via secure RPC function.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS access_codes ADD COLUMN IF NOT EXISTS max_uses integer DEFAULT 1;
ALTER TABLE IF EXISTS access_codes ADD COLUMN IF NOT EXISTS times_used integer DEFAULT 0;
ALTER TABLE IF EXISTS access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Access Codes Check" ON access_codes;
DROP POLICY IF EXISTS "Public Check Active Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1A" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1B" ON access_codes;

-- Administrative management restricted exclusively to verified administrators
CREATE POLICY "Admin Manage Access Codes V1B" ON access_codes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Secure, Concurrency-Safe RPC Verification & Redemption Function
CREATE OR REPLACE FUNCTION public.verify_access_code(
  p_code text,
  p_redeem boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec record;
  v_now timestamptz := clock_timestamp();
  v_clean_code text := trim(p_code);
BEGIN
  -- Input length validation to prevent abuse/dos
  IF v_clean_code IS NULL OR length(v_clean_code) < 4 OR length(v_clean_code) > 100 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid code format.');
  END IF;

  -- Concurrency-safe lookup with row locking if redeeming
  IF p_redeem THEN
    SELECT code, is_active, expires_at, max_uses, times_used, course_name
    INTO v_rec
    FROM public.access_codes
    WHERE code = v_clean_code
    FOR UPDATE;
  ELSE
    SELECT code, is_active, expires_at, max_uses, times_used, course_name
    INTO v_rec
    FROM public.access_codes
    WHERE code = v_clean_code;
  END IF;

  -- Validate existence
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Access pass not found.');
  END IF;

  -- Validate active status
  IF NOT coalesce(v_rec.is_active, true) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This access pass has been deactivated.');
  END IF;

  -- Validate expiration date
  IF v_rec.expires_at IS NOT NULL AND v_rec.expires_at < v_now THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This access pass has expired.');
  END IF;

  -- Validate redemption limits
  IF v_rec.max_uses IS NOT NULL AND v_rec.times_used >= v_rec.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Maximum redemption limit reached.');
  END IF;

  -- Atomic redemption execution
  IF p_redeem THEN
    UPDATE public.access_codes
    SET times_used = times_used + 1,
        is_active = CASE WHEN max_uses IS NOT NULL AND times_used + 1 >= max_uses THEN false ELSE is_active END
    WHERE code = v_clean_code;
  END IF;

  -- Return safe verification object (zero sensitive database columns exposed)
  RETURN jsonb_build_object(
    'valid', true,
    'course_name', v_rec.course_name
  );
END;
$$;

-- Restrict execution privileges
REVOKE ALL ON FUNCTION public.verify_access_code(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_access_code(text, boolean) TO anon, authenticated, service_role;


-- --------------------------------------------------------------
-- 5. STUDENTS TABLE
-- Student registration must be handled through a trusted backend operation.
-- Students cannot self-insert, elevate status, or alter course access.
-- Student ownership enforced by Supabase Auth UUID (user_id).
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS students ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Student Roster Operations" ON students;
DROP POLICY IF EXISTS "Public Student Self Registration" ON students;
DROP POLICY IF EXISTS "Student Verified Self Registration V1A" ON students;
DROP POLICY IF EXISTS "Admin Manage Students" ON students;
DROP POLICY IF EXISTS "Student Read Own Record" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1A" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1B" ON students;
DROP POLICY IF EXISTS "Admin Manage Students V1B" ON students;

-- Students can read only their own profile verified by Supabase Auth UUID (user_id)
CREATE POLICY "Student Read Own Record V1B" ON students
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

-- Administrative management: full privileges restricted to verified administrators
CREATE POLICY "Admin Manage Students V1B" ON students
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Note: NO public/student INSERT policy exists.
-- Student enrollment is mediated exclusively via trusted backend operations using service_role.


-- --------------------------------------------------------------
-- 6. ORDERS TABLE
-- Payment information is strictly restricted. Zero anonymous access.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Orders Operations" ON orders;
DROP POLICY IF EXISTS "Public Order Creation" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1A" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1B" ON orders;

CREATE POLICY "Admin Manage Orders V1B" ON orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 7. STUDENT PRESENCE TABLE
-- Activity logs and telemetry restricted to staff.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS student_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Presence Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1A" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1B" ON student_presence;

CREATE POLICY "Admin View Presence V1B" ON student_presence
  FOR SELECT TO authenticated
  USING (public.is_admin());


-- --------------------------------------------------------------
-- 8. AUTH RATE LIMITS PERSISTENCE TABLE (Vercel Multi-Instance)
-- Protected from client manipulation; lockouts cannot be cleared from browser.
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
DROP POLICY IF EXISTS "Admin Manage Rate Limits V1B" ON public.auth_rate_limits;

-- Deny all access to anonymous and unprivileged users
REVOKE ALL ON public.auth_rate_limits FROM anon;
REVOKE ALL ON public.auth_rate_limits FROM authenticated;
GRANT ALL ON public.auth_rate_limits TO service_role;

CREATE POLICY "Admin Manage Rate Limits V1B" ON public.auth_rate_limits
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Automated cleanup function for expired lockouts
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.auth_rate_limits
  WHERE (locked_until IS NOT NULL AND locked_until < now() - INTERVAL '1 hour')
     OR (last_failed_at < now() - INTERVAL '24 hours');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
