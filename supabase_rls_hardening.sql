-- ==============================================================
-- GREACH IMPACT ACADEMY - PHASE 1 PRODUCTION RLS HARDENING
-- Non-Destructive, Least-Privilege Database Authorization Specification
-- (Phase 1 Release Validation Edition)
--
-- CORE PRINCIPLES:
-- 1. Real-time Role Verification: Inspects live auth.users in real time.
--    Until granular sub-admin architecture is approved, broad privileges
--    are restricted strictly to Super Admin (is_super_admin()).
-- 2. Concurrency-Safe Access Codes: Supports single-use, assigned, and shared
--    multi-use codes via atomic row locking (FOR UPDATE) and access_code_redemptions ledger.
-- 3. Anonymous Enumeration Elimination: verify_access_code() requires authentication.
-- 4. Safe Rate Limiting: 10-minute sliding window, 15-minute lockout at 5 failures,
--    keyed by IP with per-user fallback (eliminates shared-bucket DoS).
-- 5. Trusted Attendance Heartbeat: Direct public INSERT/UPDATE completely removed.
--    Attendance mediated via record_student_presence_heartbeat() with entitlement,
--    session termination, and frequency replay checks.
-- 6. Database Constraints: NOT NULL and CHECK constraints on access_codes.
-- 7. All historical and open policies purged across all tables.
-- ==============================================================

-- --------------------------------------------------------------
-- CLEANUP PREVIOUS RPC SIGNATURES & OVERLOADS
-- --------------------------------------------------------------
DROP FUNCTION IF EXISTS public.verify_access_code(text);
DROP FUNCTION IF EXISTS public.verify_access_code(text, boolean);
DROP FUNCTION IF EXISTS public.verify_access_code(text, boolean, text);
DROP FUNCTION IF EXISTS public.record_student_presence_heartbeat(text, text);
DROP FUNCTION IF EXISTS public.record_student_presence_heartbeat(text, text, text);


-- --------------------------------------------------------------
-- 1. REAL-TIME ROLE VERIFICATION FUNCTIONS (Security Definer)
-- Inspects live auth.users table in real time to enforce instant role revocation
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

  -- Real-time database check: defeats stale unexpired JWTs after role changes
  SELECT coalesce(raw_app_meta_data->>'role', '') INTO v_live_role
  FROM auth.users
  WHERE id = auth.uid();

  -- Until granular Sub-Admin permissions receive separate approval,
  -- broad administrator privileges are restricted strictly to Super Admin.
  RETURN v_live_role = 'super_admin';
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;


-- --------------------------------------------------------------
-- 2. COURSE PRICES TABLE
-- Public read-only catalog; mutations restricted to verified Super Admins
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Prices Admin Sync" ON course_prices;
DROP POLICY IF EXISTS "Public Read Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1A" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1B" ON course_prices;
DROP POLICY IF EXISTS "Admin Manage Course Prices V1Final" ON course_prices;
DROP POLICY IF EXISTS "Super Admin Manage Course Prices V1Final" ON course_prices;
DROP POLICY IF EXISTS "Secure Admin Manage Course Prices Rollback" ON course_prices;

CREATE POLICY "Public Read Course Prices" ON course_prices
  FOR SELECT USING (true);

CREATE POLICY "Super Admin Manage Course Prices V1Final" ON course_prices
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 3. COURSE SCHEDULES TABLE
-- Public read-only timetables; mutations restricted to verified Super Admins
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS course_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Schedules Admin Sync" ON course_schedules;
DROP POLICY IF EXISTS "Public Read Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1A" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1B" ON course_schedules;
DROP POLICY IF EXISTS "Admin Manage Course Schedules V1Final" ON course_schedules;
DROP POLICY IF EXISTS "Super Admin Manage Course Schedules V1Final" ON course_schedules;
DROP POLICY IF EXISTS "Secure Admin Manage Schedules Rollback" ON course_schedules;

CREATE POLICY "Public Read Course Schedules" ON course_schedules
  FOR SELECT USING (true);

CREATE POLICY "Super Admin Manage Course Schedules V1Final" ON course_schedules
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 4. BLOG POSTS TABLE
-- Public reads Published; Super Admins view drafts and manage articles
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Blog Posts Admin Sync" ON blog_posts;
DROP POLICY IF EXISTS "Public Read Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1A" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1B" ON blog_posts;
DROP POLICY IF EXISTS "Admin Manage Blog Posts V1Final" ON blog_posts;
DROP POLICY IF EXISTS "Super Admin Manage Blog Posts V1Final" ON blog_posts;
DROP POLICY IF EXISTS "Secure Admin Manage Blog Posts Rollback" ON blog_posts;

CREATE POLICY "Public Read Blog Posts" ON blog_posts
  FOR SELECT USING (status = 'Published' OR public.is_super_admin());

CREATE POLICY "Super Admin Manage Blog Posts V1Final" ON blog_posts
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 5. ACCESS CODES & SESSION PASSES TABLE
-- Zero public SELECT (enumeration eliminated).
-- Verification & redemption handled via concurrency-safe RPC.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS access_codes ADD COLUMN IF NOT EXISTS max_uses integer DEFAULT 1;
ALTER TABLE IF EXISTS access_codes ADD COLUMN IF NOT EXISTS times_used integer DEFAULT 0;
ALTER TABLE IF EXISTS access_codes ADD COLUMN IF NOT EXISTS is_session_pass boolean DEFAULT false;
ALTER TABLE IF EXISTS access_codes ENABLE ROW LEVEL SECURITY;

-- Pre-constraint data normalization: ensure existing rows satisfy constraints
UPDATE public.access_codes SET max_uses = 1 WHERE max_uses IS NULL OR max_uses < 1;
UPDATE public.access_codes SET times_used = 0 WHERE times_used IS NULL OR times_used < 0;
UPDATE public.access_codes SET times_used = max_uses WHERE times_used > max_uses;

-- Enforce NOT NULL constraints
ALTER TABLE public.access_codes ALTER COLUMN max_uses SET NOT NULL;
ALTER TABLE public.access_codes ALTER COLUMN times_used SET NOT NULL;

-- Enforce database CHECK constraints on access_codes
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
DROP POLICY IF EXISTS "Super Admin Manage Access Codes V1Final" ON access_codes;
DROP POLICY IF EXISTS "Secure Admin Manage Access Codes Rollback" ON access_codes;

CREATE POLICY "Super Admin Manage Access Codes V1Final" ON access_codes
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 5B. ACCESS CODE REDEMPTIONS LEDGER TABLE
-- Tracks redemptions per code and student, preventing double-redemption
-- and ensuring shared multi-use codes remain usable by different students.
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(100) NOT NULL REFERENCES public.access_codes(code) ON DELETE CASCADE,
  student_id varchar(50) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, student_id)
);

ALTER TABLE public.access_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students View Own Redemptions V1Final" ON public.access_code_redemptions;
DROP POLICY IF EXISTS "Super Admin Manage Redemptions V1Final" ON public.access_code_redemptions;

CREATE POLICY "Students View Own Redemptions V1Final" ON public.access_code_redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super Admin Manage Redemptions V1Final" ON public.access_code_redemptions
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

REVOKE ALL ON public.access_code_redemptions FROM anon;
GRANT SELECT ON public.access_code_redemptions TO authenticated;


-- --------------------------------------------------------------
-- 5C. SECURE ACCESS CODE VERIFICATION & REDEMPTION RPC
-- Handles single-use, assigned, and shared multi-use codes.
-- Concurrency safe (FOR UPDATE row lock). Sliding-window rate limited.
-- --------------------------------------------------------------
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
  v_rate_key text;
  v_locked_until timestamptz;
  v_auth_student_id varchar(50);
  v_current_course varchar(255);
  v_current_expires_at timestamptz;
BEGIN
  -- 1. Input Validation
  IF v_clean_code IS NULL OR length(v_clean_code) < 4 OR length(v_clean_code) > 100 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 2. Authentication Enforcement:
  -- Anonymous callers cannot verify or redeem access codes (defeats enumeration & course discovery)
  IF auth.role() NOT IN ('authenticated') OR auth.uid() IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 3. Rate Limiting Keying & Sliding-Window Abuse Protection:
  -- Extract caller IP from trusted proxy headers; fallback to caller user ID
  -- (Eliminates shared-bucket denial-of-service risk)
  BEGIN
    v_client_ip := coalesce(
      nullif(trim(current_setting('request.headers', true)::json->>'cf-connecting-ip'), ''),
      nullif(trim(split_part(current_setting('request.headers', true)::json->>'x-real-ip', ',', 1)), ''),
      nullif(trim(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', -1)), '')
    );
  EXCEPTION WHEN OTHERS THEN
    v_client_ip := NULL;
  END;

  v_rate_key := coalesce(v_client_ip, 'user:' || auth.uid()::text);

  -- Check if caller is currently locked out in auth_rate_limits
  SELECT locked_until INTO v_locked_until
  FROM public.auth_rate_limits
  WHERE ip = v_rate_key;

  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 4. Student Profile Verification:
  -- Authenticated caller MUST have a valid registered profile in public.students
  SELECT id, enrolled_course, expires_at
  INTO v_auth_student_id, v_current_course, v_current_expires_at
  FROM public.students
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_auth_student_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 5. Concurrency-Safe Lookup with Row Locking (FOR UPDATE)
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

  -- 6. Existence, Active Status & Usage Limit Verification
  IF NOT FOUND OR NOT coalesce(v_rec.is_active, true) OR (v_rec.expires_at IS NOT NULL AND v_rec.expires_at < v_now) OR (v_rec.times_used >= v_rec.max_uses) THEN
    -- Increment failure count with 10-minute sliding window and 15-minute lockout at 5 failures
    INSERT INTO public.auth_rate_limits (ip, failed_attempts, first_failed_at, last_failed_at, locked_until)
    VALUES (v_rate_key, 1, v_now, v_now, NULL)
    ON CONFLICT (ip) DO UPDATE
    SET failed_attempts = CASE
          WHEN auth_rate_limits.last_failed_at < v_now - INTERVAL '10 minutes' THEN 1
          ELSE auth_rate_limits.failed_attempts + 1
        END,
        first_failed_at = CASE
          WHEN auth_rate_limits.last_failed_at < v_now - INTERVAL '10 minutes' THEN v_now
          ELSE auth_rate_limits.first_failed_at
        END,
        last_failed_at = v_now,
        locked_until = CASE
          WHEN (CASE WHEN auth_rate_limits.last_failed_at < v_now - INTERVAL '10 minutes' THEN 1 ELSE auth_rate_limits.failed_attempts + 1 END) >= 5
          THEN v_now + INTERVAL '15 minutes'
          ELSE NULL
        END;

    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 7. Assigned Code Binding Check:
  -- If code is pre-assigned to a specific student, ensure caller matches
  IF v_rec.student_id IS NOT NULL AND v_rec.student_id != v_auth_student_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
  END IF;

  -- 8. Duplicate Redemption Check:
  -- Prevent the same student from redeeming the same code multiple times
  IF p_redeem THEN
    IF EXISTS (
      SELECT 1 FROM public.access_code_redemptions
      WHERE code = v_clean_code AND student_id = v_auth_student_id
    ) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
    END IF;

    -- 9. Course Entitlement Protection:
    -- If pass is for a full course (not a temporary live session pass)
    IF coalesce(v_rec.is_session_pass, false) = false AND v_rec.course_name IS NOT NULL THEN
      -- If student is already actively enrolled in a DIFFERENT course that has not expired
      IF v_current_course IS NOT NULL AND v_current_course != '' AND v_current_course != v_rec.course_name AND (v_current_expires_at IS NULL OR v_current_expires_at > v_now) THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired access pass.');
      END IF;
    END IF;

    -- 10. Atomic Redemption Execution:
    -- Increment usage counter. Single-use codes bind student_id. Multi-use codes preserve NULL.
    UPDATE public.access_codes
    SET times_used = times_used + 1,
        student_id = CASE WHEN max_uses = 1 THEN coalesce(v_rec.student_id, v_auth_student_id) ELSE v_rec.student_id END,
        is_active = CASE WHEN times_used + 1 >= max_uses THEN false ELSE is_active END
    WHERE code = v_clean_code;

    -- Record in access_code_redemptions ledger
    INSERT INTO public.access_code_redemptions (code, student_id, user_id, redeemed_at)
    VALUES (v_clean_code, v_auth_student_id, auth.uid(), v_now);

    -- Update student course access ONLY if it is a full course pass (session passes never overwrite course enrollment)
    IF coalesce(v_rec.is_session_pass, false) = false AND v_rec.course_name IS NOT NULL THEN
      UPDATE public.students
      SET enrolled_course = v_rec.course_name,
          updated_at = v_now
      WHERE id = v_auth_student_id;
    END IF;
  END IF;

  -- 11. Return Safe Minimal Payload
  RETURN jsonb_build_object(
    'valid', true,
    'course_name', v_rec.course_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_access_code(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_access_code(text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_access_code(text, boolean) TO authenticated;


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
DROP POLICY IF EXISTS "Super Admin Manage Students V1Final" ON students;
DROP POLICY IF EXISTS "Secure Admin Manage Students Rollback" ON students;
DROP POLICY IF EXISTS "Student Read Own Record" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1A" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1B" ON students;
DROP POLICY IF EXISTS "Student Read Own Record V1Final" ON students;
DROP POLICY IF EXISTS "Secure Student Read Own Record Rollback" ON students;

-- Students read only their own record via Supabase Auth UUID; Super Admins read all
CREATE POLICY "Student Read Own Record V1Final" ON students
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin() OR
    (user_id IS NOT NULL AND auth.uid() = user_id)
  );

-- Administrative management: full privileges restricted to verified Super Admins
CREATE POLICY "Super Admin Manage Students V1Final" ON students
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


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
DROP POLICY IF EXISTS "Super Admin Manage Orders V1Final" ON orders;
DROP POLICY IF EXISTS "Secure Admin Manage Orders Rollback" ON orders;

CREATE POLICY "Super Admin Manage Orders V1Final" ON orders
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- --------------------------------------------------------------
-- 8. STUDENT PRESENCE & ATTENDANCE TABLE
-- Direct public INSERT and UPDATE completely removed.
-- Attendance is mediated via record_student_presence_heartbeat() RPC.
-- --------------------------------------------------------------
ALTER TABLE IF EXISTS student_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Presence Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat" ON student_presence;
DROP POLICY IF EXISTS "Public Insert Heartbeat V1Final" ON student_presence;
DROP POLICY IF EXISTS "Public Update Heartbeat V1Final" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1A" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1B" ON student_presence;
DROP POLICY IF EXISTS "Admin View Presence V1Final" ON student_presence;
DROP POLICY IF EXISTS "Admin Manage Presence V1Final" ON student_presence;
DROP POLICY IF EXISTS "Super Admin Manage Presence V1Final" ON student_presence;
DROP POLICY IF EXISTS "Secure Admin View Presence Rollback" ON student_presence;
DROP POLICY IF EXISTS "Secure Admin Manage Presence Rollback" ON student_presence;

REVOKE ALL ON public.student_presence FROM anon;

-- Authenticated Super Admins have full management access (viewing live telemetry, session termination)
CREATE POLICY "Super Admin Manage Presence V1Final" ON student_presence
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Trusted Student Presence Heartbeat Operation (Security Definer)
-- Validates: 1) Authenticated identity, 2) Student profile ownership,
-- 3) Active course entitlement, 4) Session termination check, 5) Frequency limiting & replay protection
CREATE OR REPLACE FUNCTION public.record_student_presence_heartbeat(
  p_session_id text,
  p_course_name text,
  p_device_info text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student record;
  v_existing record;
  v_now timestamptz := clock_timestamp();
  v_clean_session text := trim(p_session_id);
BEGIN
  -- 1. Validate Authenticated Context
  IF auth.uid() IS NULL OR auth.role() != 'authenticated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- 2. Validate Session Identifier
  IF v_clean_session IS NULL OR length(v_clean_session) < 5 OR length(v_clean_session) > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid session identifier.');
  END IF;

  -- 3. Validate Student Profile Ownership
  SELECT id, full_name, registered_email, enrolled_course, expires_at, status
  INTO v_student
  FROM public.students
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student profile not found.');
  END IF;

  -- 4. Validate Active Course Entitlement
  IF coalesce(v_student.status, 'Active') != 'Active' OR (v_student.expires_at IS NOT NULL AND v_student.expires_at < v_now) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active course enrollment required.');
  END IF;

  -- Validate requested course matches student entitlement
  IF p_course_name IS NOT NULL AND trim(p_course_name) != '' AND lower(trim(p_course_name)) != lower(trim(v_student.enrolled_course)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enrolled in the specified course.');
  END IF;

  -- 5. Session Termination Check (Administrative Kill-Switch)
  SELECT session_id, status, last_heartbeat
  INTO v_existing
  FROM public.student_presence
  WHERE session_id = v_clean_session;

  IF FOUND AND v_existing.status = 'terminated' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session has been terminated by administrator.', 'terminated', true);
  END IF;

  -- 6. Frequency Limiting & Replay Protection (minimum 10 seconds between heartbeats)
  IF FOUND AND v_existing.last_heartbeat > v_now - INTERVAL '10 seconds' THEN
    RETURN jsonb_build_object('success', true, 'status', 'throttled', 'message', 'Heartbeat acknowledged (frequency throttle active).');
  END IF;

  -- 7. Upsert Presence Record
  IF FOUND THEN
    UPDATE public.student_presence
    SET last_heartbeat = v_now,
        status = 'online',
        device_info = coalesce(p_device_info, device_info)
    WHERE session_id = v_clean_session;
  ELSE
    INSERT INTO public.student_presence (
      session_id, student_id, student_name, student_email, course_name, status, last_heartbeat, device_info
    ) VALUES (
      v_clean_session, v_student.id, v_student.full_name, v_student.registered_email,
      v_student.enrolled_course, 'online', v_now, p_device_info
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'online', 'recorded_at', v_now);
END;
$$;

REVOKE ALL ON FUNCTION public.record_student_presence_heartbeat(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_student_presence_heartbeat(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_student_presence_heartbeat(text, text, text) TO authenticated;


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
DROP POLICY IF EXISTS "Super Admin Manage Rate Limits V1Final" ON public.auth_rate_limits;
DROP POLICY IF EXISTS "Secure Admin Manage Rate Limits Rollback" ON public.auth_rate_limits;

REVOKE ALL ON public.auth_rate_limits FROM anon;
REVOKE ALL ON public.auth_rate_limits FROM authenticated;
GRANT ALL ON public.auth_rate_limits TO service_role;

CREATE POLICY "Super Admin Manage Rate Limits V1Final" ON public.auth_rate_limits
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

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
