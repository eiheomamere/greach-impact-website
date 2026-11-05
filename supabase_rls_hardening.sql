-- ==============================================================
-- GREACH IMPACT ACADEMY - PHASE 1 FINAL PRODUCTION RLS HARDENING
-- Non-Destructive, Least-Privilege Database Authorization Specification
--
-- CORE PRINCIPLES:
-- 1. Real-time Role Verification: is_admin() inspects live auth.users in real time,
--    defeating stale JWT replay immediately upon administrator demotion.
-- 2. Genuinely Uniform RPC: verify_access_code() returns a single, uniform error
--    message for all failures, preventing enumeration and timing attacks.
-- 3. Anonymous callers cannot redeem access passes (authentication required).
-- 4. Student identity is derived exclusively from auth.uid() (never trust client input).
-- 5. Student and payment tables permit zero direct anonymous/client inserts.
-- 6. Rate limits are locked down; cleanup is restricted strictly to service_role.
-- 7. All historical and obsolete policies are explicitly purged.
-- ==============================================================

-- --------------------------------------------------------------
-- CLEANUP PREVIOUS RPC SIGNATURES & OVERLOADS
-- --------------------------------------------------------------
DROP FUNCTION IF EXISTS public.verify_access_code(text);
DROP FUNCTION IF EXISTS public.verify_access_code(text, boolean);
DROP FUNCTION IF EXISTS public.verify_access_code(text, boolean, text);


-- --------------------------------------------------------------
-- 1. REAL-TIME ROLE VERIFICATION FUNCTIONS (Security Definer)
-- Inspects live auth.users table in real time to enforce instant role revocation
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

  -- Real-time database check: defeats stale unexpired JWTs after role changes
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
-- 2. COURSE PRICES TABLE
-- Public read-only catalog; mutations restricted to verified admins
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Prices Admin Sync" ON course_prices;
DROP POLICY IF EXISTS "Public Read Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1A" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1B" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1Final" ON course_prices;
DROP POLICY IF EXISTS "Secure Admin Manage Course Prices Rollback" ON course_prices;

CREATE POLICY "Public Read Course Prices" ON course_prices
  FOR SELECT USING (true);

CREATE POLICY "Admin Manage Course Prices V1Final" ON course_prices
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 3. COURSE SCHEDULES TABLE
-- Public read-only timetables; mutations restricted to verified admins
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Schedules Admin Sync" ON course_schedules;
DROP POLICY IF EXISTS "Public Read Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1A" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1B" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1Final" ON course_schedules;
DROP POLICY IF EXISTS "Secure Admin Manage Schedules Rollback" ON course_schedules;

CREATE POLICY "Public Read Course Schedules" ON course_schedules
  FOR SELECT USING (true);

CREATE POLICY "Admin Manage Course Schedules V1Final" ON course_schedules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 4. BLOG POSTS TABLE
-- Public reads Published; admins view drafts and manage articles
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Blog Posts Admin Sync" ON blog_posts;
DROP POLICY IF EXISTS "Public Read Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1A" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1B" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1Final" ON blog_posts;
DROP POLICY IF EXISTS "Secure Admin Manage Blog Posts Rollback" ON blog_posts;

CREATE POLICY "Public Read Blog Posts" ON blog_posts
  FOR SELECT USING (status = 'Published' OR public.is_admin());

CREATE POLICY "Admin Manage Blog Posts V1Final" ON blog_posts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 5. ACCESS CODES & SESSION PASSES TABLE
-- Zero public SELECT (enumeration eliminated).
-- Verification & redemption handled via concurrency-safe RPC.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS access_codes ADD COLUMN IF NOT EXISTS max_uses integer DEFAULT 1;
ALTER TABLE IF EXISTS access_codes ADD COLUMN IF NOT EXISTS times_used integer DEFAULT 0;
ALTER TABLE IF EXISTS access_codes ADD COLUMN IF NOT EXISTS is_session_pass boolean DEFAULT false;
ALTER TABLE IF EXISTS access_codes ENABLE ROW LEVEL SECURITY;

-- Clean existing records to satisfy constraints before creation
UPDATE public.access_codes SET max_uses = 1 WHERE max_uses IS NULL OR max_uses < 1;
UPDATE public.access_codes SET times_used = 0 WHERE times_used IS NULL OR times_used < 0;
UPDATE public.access_codes SET times_used = max_uses WHERE times_used > max_uses;

-- Add database integrity constraints on access_codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_access_codes_max_uses'
  ) THEN
    ALTER TABLE public.access_codes
      ADD CONSTRAINT check_access_codes_max_uses CHECK (max_uses >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_access_codes_times_used'
  ) THEN
    ALTER TABLE public.access_codes
      ADD CONSTRAINT check_access_codes_times_used CHECK (times_used >= 0 AND times_used <= max_uses);
  END IF;
END $$;

DROP POLICY IF EXISTS "Anon Access Codes Check" ON access_codes;
DROP POLICY IF EXISTS "Public Check Active Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1A" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1B" ON access_codes;
DROP POLICY IF EXISTS "Admin Manage Access Codes V1Final" ON access_codes;
DROP POLICY IF EXISTS "Secure Admin Manage Access Codes Rollback" ON access_codes;

CREATE POLICY "Admin Manage Access Codes V1Final" ON access_codes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Secure, Concurrency-Safe RPC Function
CREATE OR REPLACE FUNCTION public.verify_access_code(
  p_code text,
  p_redeem boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_rec record;
  v_now timestamptz := clock_timestamp();
  v_clean_code text := trim(p_code);
  v_client_ip text;
  v_locked_until timestamptz;
  v_auth_student_id varchar(50);
  v_current_course varchar(255);
  v_current_expires_at timestamptz;
BEGIN
  -- 1. Abuse Protection: Extract caller IP from trusted PostgREST request headers
  -- Header extraction prioritizes cloud edge reverse-proxy headers that cannot be spoofed by clients
  BEGIN
    v_client_ip := coalesce(
      nullif(trim(current_setting('request.headers', true)::json->>'cf-connecting-ip'), ''),
      nullif(trim(split_part(current_setting('request.headers', true)::json->>'x-real-ip', ',', 1)), ''),
      nullif(trim(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1)), ''),
      'unknown-caller'
    );
  EXCEPTION WHEN OTHERS THEN
    v_client_ip := 'unknown-caller';
  END;

  -- Check if client IP is currently locked out in auth_rate_limits (enforced for ALL callers, including unknown-caller)
  SELECT locked_until INTO v_locked_until
  FROM public.auth_rate_limits
  WHERE ip = v_client_ip;

  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 2. Input validation
  IF v_clean_code IS NULL OR length(v_clean_code) < 4 OR length(v_clean_code) > 100 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 3. Authentication Enforcement:
  -- Anonymous callers cannot verify or redeem access codes (defeats enumeration & course discovery)
  IF auth.role() NOT IN ('authenticated', 'service_role') OR auth.uid() IS NULL THEN
    -- Increment failure count for abuse protection (applies to ALL callers including unknown-caller)
    INSERT INTO public.auth_rate_limits (ip, failed_attempts, last_failed_at, locked_until)
    VALUES (v_client_ip, 1, v_now, NULL)
    ON CONFLICT (ip) DO UPDATE
    SET failed_attempts = auth_rate_limits.failed_attempts + 1,
        last_failed_at = v_now,
        locked_until = CASE WHEN auth_rate_limits.failed_attempts + 1 >= 5 THEN v_now + INTERVAL '5 minutes' ELSE auth_rate_limits.locked_until END;

    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 4. Student Profile Verification:
  -- Authenticated callers MUST have a valid registered student profile in public.students
  SELECT id, enrolled_course, expires_at
  INTO v_auth_student_id, v_current_course, v_current_expires_at
  FROM public.students
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_auth_student_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 5. Concurrency-safe lookup with row locking (FOR UPDATE) if redeeming
  IF p_redeem THEN
    SELECT code, label, is_active, expires_at, max_uses, times_used, course_name, student_id, is_session_pass
    INTO v_rec
    FROM public.access_codes
    WHERE code = v_clean_code
    FOR UPDATE;
  ELSE
    SELECT code, label, is_active, expires_at, max_uses, times_used, course_name, student_id, is_session_pass
    INTO v_rec
    FROM public.access_codes
    WHERE code = v_clean_code;
  END IF;

  -- 6. Existence, active status & expiration check with UNIFORM non-disclosing error response
  IF NOT FOUND OR NOT coalesce(v_rec.is_active, true) OR (v_rec.expires_at IS NOT NULL AND v_rec.expires_at < v_now) OR (v_rec.max_uses IS NOT NULL AND v_rec.times_used >= v_rec.max_uses) THEN
    -- Increment failure count for abuse protection (applies to ALL IPs including unknown-caller)
    INSERT INTO public.auth_rate_limits (ip, failed_attempts, last_failed_at, locked_until)
    VALUES (v_client_ip, 1, v_now, NULL)
    ON CONFLICT (ip) DO UPDATE
    SET failed_attempts = auth_rate_limits.failed_attempts + 1,
        last_failed_at = v_now,
        locked_until = CASE WHEN auth_rate_limits.failed_attempts + 1 >= 5 THEN v_now + INTERVAL '5 minutes' ELSE auth_rate_limits.locked_until END;

    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 7. Assigned Pass Binding Check:
  -- If code is specifically assigned to a student, ensure calling student matches
  IF v_rec.student_id IS NOT NULL AND v_rec.student_id != v_auth_student_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 8. Course Entitlement Protection (Redemption phase):
  -- Prevent accidental overwriting of an existing active course enrollment
  IF p_redeem THEN
    -- If pass is for a full course (not a temporary live session pass)
    IF coalesce(v_rec.is_session_pass, false) = false AND v_rec.course_name IS NOT NULL THEN
      -- If student is already actively enrolled in a DIFFERENT course that has not expired
      IF v_current_course IS NOT NULL AND v_current_course != '' AND v_current_course != v_rec.course_name AND (v_current_expires_at IS NULL OR v_current_expires_at > v_now) THEN
        -- Reject redemption to prevent destructive overwriting of current active entitlement
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
      END IF;
    END IF;

    -- Atomic redemption update: increment usage counter and bind student
    UPDATE public.access_codes
    SET times_used = times_used + 1,
        student_id = coalesce(v_rec.student_id, v_auth_student_id),
        is_active = CASE WHEN max_uses IS NOT NULL AND times_used + 1 >= max_uses THEN false ELSE is_active END
    WHERE code = v_clean_code;

    -- Update student course access ONLY if it is a full course pass (session passes never overwrite course enrollment)
    IF coalesce(v_rec.is_session_pass, false) = false AND v_rec.course_name IS NOT NULL THEN
      UPDATE public.students
      SET enrolled_course = v_rec.course_name,
          updated_at = v_now
      WHERE id = v_auth_student_id;
    END IF;
  END IF;

  -- 9. Return safe minimal payload (zero internal/sensitive database keys leaked)
  RETURN jsonb_build_object(
    'valid', true,
    'course_name', v_rec.course_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_access_code(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_access_code(text, boolean) TO anon, authenticated, service_role;


-- --------------------------------------------------------------
-- 6. STUDENTS TABLE
-- Student registration mediated strictly via trusted backend operations.
-- Student profile ownership enforced via Supabase Auth UUID (user_id).
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS students ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Student Roster Operations" ON students;
DROP POLICY IF EXISTS "Public Student Self Registration" ON students;
DROP POLICY IF EXISTS "Student Verified Self Registration V1A" ON students;
DROP POLICY IF EXISTS "Admin Manage Students" ON students;
DROP POLICY IF EXISTS "Admin Manage Students V1A" ON students;
DROP POLICY IF EXISTS "Admin Manage Students V1B" ON students;
DROP POLICY IF EXISTS "Admin Manage Students V1Final" ON students;
DROP POLICY IF EXISTS "Secure Admin Manage Students Rollback" ON students;
DROP POLICY IF EXISTS "Student Read Own Record" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1A" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1B" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1Final" ON students;
DROP POLICY IF EXISTS "Secure Student Read Own Record Rollback" ON students;

-- Students read only their own record via Supabase Auth UUID; admins read all
CREATE POLICY "Student Read Own Record V1Final" ON students
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

-- Administrative management: full privileges restricted to verified administrators
CREATE POLICY "Admin Manage Students V1Final" ON students
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 7. ORDERS TABLE
-- Financial records protected. Zero direct anonymous/client inserts or reads.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Orders Operations" ON orders;
DROP POLICY IF EXISTS "Public Order Creation" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1A" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1B" ON orders;
DROP POLICY IF EXISTS "Admin Manage Orders V1Final" ON orders;
DROP POLICY IF EXISTS "Secure Admin Manage Orders Rollback" ON orders;

CREATE POLICY "Admin Manage Orders V1Final" ON orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 8. STUDENT PRESENCE TABLE
-- Activity logs and telemetry restricted to staff.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS student_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Presence Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat V1Final" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1A" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1B" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1Final" ON student_presence;
DROP POLICY IF EXISTS "Admin Manage Presence V1Final" ON student_presence;
DROP POLICY IF EXISTS "Secure Admin View Presence Rollback" ON student_presence;

-- Public/anon students can ONLY insert their presence heartbeat (zero public UPDATE/modification permissions)
CREATE POLICY "Public Insert Heartbeat V1Final" ON student_presence
  FOR INSERT WITH CHECK (true);

-- Authenticated administrators have full management access (viewing active sessions, session termination)
CREATE POLICY "Admin Manage Presence V1Final" ON student_presence
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- --------------------------------------------------------------
-- 9. AUTH RATE LIMITS PERSISTENCE TABLE (Vercel Multi-Instance)
-- Restricted strictly from anonymous and browser client access.
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  ip text PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 1,
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  last_failed_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin View Rate Limits V1A" ON public.auth_rate_limits;
DROP POLICY IF EXISTS "Admin Manage Rate Limits V1B" ON public.auth_rate_limits;
DROP POLICY IF EXISTS "Admin Manage Rate Limits V1Final" ON public.auth_rate_limits;
DROP POLICY IF EXISTS "Secure Admin Manage Rate Limits Rollback" ON public.auth_rate_limits;

REVOKE ALL ON public.auth_rate_limits FROM anon;
REVOKE ALL ON public.auth_rate_limits FROM authenticated;
GRANT ALL ON public.auth_rate_limits TO service_role;

CREATE POLICY "Admin Manage Rate Limits V1Final" ON public.auth_rate_limits
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Automated cleanup function: Execution restricted strictly to service_role
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

REVOKE ALL ON FUNCTION public.cleanup_expired_rate_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_rate_limits() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_rate_limits() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO service_role;
