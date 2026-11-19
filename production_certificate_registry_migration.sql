-- GREACH IMPACT ACADEMY - CENTRAL CERTIFICATE REGISTRY
-- Additive local review artifact. Do not run in staging or production without separate approval.
-- Preconditions: the V1.1 schema contains students, course_prices, project_submissions,
-- issued_certificates, and auth.users with the columns referenced below.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.students') IS NULL
     OR to_regclass('public.course_prices') IS NULL
     OR to_regclass('public.project_submissions') IS NULL
     OR to_regclass('public.issued_certificates') IS NULL THEN
    RAISE EXCEPTION 'Certificate migration precondition failed: required Phase 1 tables are missing.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_submissions' AND column_name = 'id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'status'
  ) THEN
    RAISE EXCEPTION 'Certificate migration precondition failed: required Phase 1 columns are missing.';
  END IF;
END;
$$;

-- Existing project submissions were not centrally stored by the shipped classroom UI.
-- These fields support authenticated submissions and server-recorded instructor review.
ALTER TABLE public.project_submissions
  ADD COLUMN IF NOT EXISTS course_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS course_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

DO $$
DECLARE
  v_constraint_definition TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_constraint_definition
  FROM pg_constraint
  WHERE conrelid = 'public.project_submissions'::regclass
    AND conname = 'project_submissions_status_check';
  IF v_constraint_definition IS NULL THEN
    ALTER TABLE public.project_submissions
      ADD CONSTRAINT project_submissions_status_check
      CHECK (status IN ('pending_review', 'approved', 'rejected', 'unverified_legacy'));
  ELSIF position('unverified_legacy' IN v_constraint_definition) = 0 THEN
    ALTER TABLE public.project_submissions DROP CONSTRAINT project_submissions_status_check;
    ALTER TABLE public.project_submissions
      ADD CONSTRAINT project_submissions_status_check
      CHECK (status IN ('pending_review', 'approved', 'rejected', 'unverified_legacy'));
  END IF;
END;
$$;

-- Preserve pre-registry submissions for audit, but do not treat historical rows as
-- pending or approved evidence. New server submissions explicitly set pending_review.
UPDATE public.project_submissions
SET status = 'unverified_legacy'
WHERE course_id IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.project_submissions
    WHERE status = 'pending_review' AND course_id IS NOT NULL
    GROUP BY student_id, course_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Certificate migration precondition failed: duplicate pending submissions require manual review.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS one_pending_submission_per_student_course
  ON public.project_submissions(student_id, course_id)
  WHERE status = 'pending_review' AND course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_submissions_pending_course
  ON public.project_submissions(status, course_id, submitted_at DESC);

-- A completion is a server-recorded result of an instructor's review of the submitted
-- capstone and course completion requirements. Browser progress and payment alone are
-- not accepted as completion evidence.
CREATE TABLE IF NOT EXISTS public.course_completion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id VARCHAR(50) NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  course_id VARCHAR(50) NOT NULL REFERENCES public.course_prices(course_id) ON DELETE RESTRICT,
  project_submission_id UUID NOT NULL UNIQUE REFERENCES public.project_submissions(id) ON DELETE RESTRICT,
  completion_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'approved',
  criteria_version VARCHAR(100) NOT NULL,
  approved_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  revocation_reason TEXT,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT course_completion_status_check CHECK (status IN ('approved', 'revoked')),
  CONSTRAINT course_completion_date_check CHECK (completion_date <= CURRENT_DATE),
  CONSTRAINT course_completion_revocation_check CHECK (
    (status = 'approved' AND revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revocation_reason IS NOT NULL AND length(trim(revocation_reason)) > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS one_approved_completion_per_student_course
  ON public.course_completion_records(student_id, course_id)
  WHERE status = 'approved';

ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS course_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS completion_id UUID REFERENCES public.course_completion_records(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'unverified_legacy',
  ADD COLUMN IF NOT EXISTS issuer_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS issued_by TEXT,
  ADD COLUMN IF NOT EXISTS reissue_of VARCHAR(100) REFERENCES public.issued_certificates(certificate_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.issued_certificates'::regclass AND conname = 'issued_certificates_status_check'
  ) THEN
    ALTER TABLE public.issued_certificates
      ADD CONSTRAINT issued_certificates_status_check
      CHECK (status IN ('valid', 'revoked', 'reissued', 'unverified_legacy'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.issued_certificates'::regclass AND conname = 'issued_certificates_issuer_check'
  ) THEN
    ALTER TABLE public.issued_certificates
      ADD CONSTRAINT issued_certificates_issuer_check
      CHECK (issuer_type IS NULL OR issuer_type IN ('student_self_service', 'super_admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.issued_certificates'::regclass AND conname = 'issued_certificates_revocation_check'
  ) THEN
    ALTER TABLE public.issued_certificates
      ADD CONSTRAINT issued_certificates_revocation_check
      CHECK (
        (status <> 'revoked' AND revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
        OR (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revocation_reason IS NOT NULL AND length(trim(revocation_reason)) > 0)
      );
  END IF;
END;
$$;

-- Existing rows are kept for audit, but cannot verify as authentic until connected to
-- an approved completion record by a separately authorized review process.
UPDATE public.issued_certificates
SET status = 'unverified_legacy'
WHERE completion_id IS NULL AND status = 'valid';

CREATE UNIQUE INDEX IF NOT EXISTS one_valid_certificate_per_completion
  ON public.issued_certificates(completion_id)
  WHERE completion_id IS NOT NULL AND status = 'valid';
CREATE INDEX IF NOT EXISTS idx_issued_certificates_student_course
  ON public.issued_certificates(student_id, course_id, issued_date DESC);

CREATE TABLE IF NOT EXISTS public.certificate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id VARCHAR(100) NOT NULL REFERENCES public.issued_certificates(certificate_id) ON DELETE RESTRICT,
  event_type VARCHAR(20) NOT NULL,
  actor_type VARCHAR(20) NOT NULL,
  actor_id TEXT NOT NULL,
  reason TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT certificate_events_type_check CHECK (event_type IN ('issued', 'retrieved', 'revoked', 'reissued')),
  CONSTRAINT certificate_events_actor_check CHECK (actor_type IN ('student', 'super_admin', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_certificate_events_certificate
  ON public.certificate_events(certificate_id, created_at DESC);

ALTER TABLE public.course_completion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

-- All writes and private reads go through the server after signed-session and live
-- Super Admin/TOTP checks. The public uses only the narrowly scoped verification RPC.
REVOKE ALL ON public.course_completion_records FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.certificate_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.issued_certificates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.project_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.course_completion_records TO service_role;
GRANT SELECT, INSERT ON public.certificate_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.issued_certificates TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.project_submissions TO service_role;

CREATE OR REPLACE FUNCTION public.review_course_project(
  p_submission_id UUID,
  p_reviewer_id UUID,
  p_decision TEXT,
  p_completion_date DATE DEFAULT NULL,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS TABLE (submission_id UUID, submission_status TEXT, completion_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_submission public.project_submissions%ROWTYPE;
  v_student public.students%ROWTYPE;
  v_completion_id UUID;
BEGIN
  IF p_reviewer_id IS NULL OR p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid reviewer or review decision.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_submission
  FROM public.project_submissions ps
  WHERE ps.id = p_submission_id
  FOR UPDATE;
  IF NOT FOUND OR v_submission.status <> 'pending_review' THEN
    RAISE EXCEPTION 'Submission is missing or no longer pending review.' USING ERRCODE = 'P0002';
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.project_submissions ps
    SET status = 'rejected', reviewed_by = p_reviewer_id, reviewed_at = NOW(),
        review_notes = left(trim(coalesce(p_review_notes, '')), 2000)
    WHERE ps.id = p_submission_id;
    RETURN QUERY SELECT p_submission_id, 'rejected'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_completion_date IS NULL OR p_completion_date > CURRENT_DATE OR
     v_submission.student_id IS NULL OR v_submission.course_id IS NULL OR v_submission.course_name IS NULL THEN
    RAISE EXCEPTION 'Approved completion date and course submission details are required.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_student FROM public.students s WHERE s.id = v_submission.student_id FOR SHARE;
  IF NOT FOUND OR v_student.status <> 'Active' OR
     (v_student.expires_at IS NOT NULL AND v_student.expires_at <= NOW()) OR
     lower(trim(v_student.enrolled_course)) <> lower(trim(v_submission.course_name)) OR
     NOT EXISTS (
       SELECT 1 FROM public.course_prices cp
       WHERE cp.course_id = v_submission.course_id
         AND lower(trim(cp.course_name)) = lower(trim(v_submission.course_name))
     ) OR NOT (
       EXISTS (
         SELECT 1 FROM public.access_codes ac
         WHERE ac.student_id = v_student.id
           AND ac.is_active = TRUE
           AND coalesce(ac.is_session_pass, FALSE) = FALSE
           AND lower(trim(ac.course_name)) = lower(trim(v_submission.course_name))
           AND (ac.expires_at IS NULL OR ac.expires_at > NOW())
       ) OR (v_student.secret_password IS NOT NULL AND v_student.secret_password NOT LIKE 'PENDING-%')
     ) THEN
    RAISE EXCEPTION 'Student course entitlement is not active for this completion.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.course_completion_records (
    student_id, course_id, project_submission_id, completion_date,
    status, criteria_version, approved_by, approved_at, review_notes
  ) VALUES (
    v_student.id, v_submission.course_id, v_submission.id, p_completion_date,
    'approved', 'instructor-reviewed-course-completion-v1', p_reviewer_id, NOW(),
    left(trim(coalesce(p_review_notes, '')), 2000)
  ) RETURNING id INTO v_completion_id;

  UPDATE public.project_submissions ps
  SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = NOW(),
      review_notes = left(trim(coalesce(p_review_notes, '')), 2000)
  WHERE ps.id = p_submission_id;

  RETURN QUERY SELECT p_submission_id, 'approved'::TEXT, v_completion_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_course_certificate(
  p_student_id VARCHAR(50),
  p_course_id VARCHAR(50),
  p_certificate_id VARCHAR(100),
  p_verification_url TEXT,
  p_issuer_type TEXT,
  p_issued_by TEXT
)
RETURNS SETOF public.issued_certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_completion public.course_completion_records%ROWTYPE;
  v_course public.course_prices%ROWTYPE;
  v_certificate public.issued_certificates%ROWTYPE;
BEGIN
  IF p_student_id IS NULL OR p_course_id IS NULL OR p_issuer_type IS NULL OR p_issuer_type NOT IN ('student_self_service', 'super_admin') OR
     p_issued_by IS NULL OR length(trim(p_issued_by)) = 0 OR
     p_certificate_id !~ '^GI-[A-F0-9]{32}$' OR
     p_verification_url !~ '^https://[A-Za-z0-9.-]+/classroom/verify-certificate\.html\?id=GI-[A-F0-9]{32}$' THEN
    RAISE EXCEPTION 'Invalid certificate issuance parameters.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_student FROM public.students s WHERE s.id = p_student_id FOR SHARE;
  IF NOT FOUND OR v_student.status <> 'Active' OR
     (v_student.expires_at IS NOT NULL AND v_student.expires_at <= NOW()) OR
     NOT (
       EXISTS (
         SELECT 1 FROM public.access_codes ac
         WHERE ac.student_id = v_student.id
           AND ac.is_active = TRUE
           AND coalesce(ac.is_session_pass, FALSE) = FALSE
           AND lower(trim(ac.course_name)) = lower(trim(v_student.enrolled_course))
           AND (ac.expires_at IS NULL OR ac.expires_at > NOW())
       ) OR (v_student.secret_password IS NOT NULL AND v_student.secret_password NOT LIKE 'PENDING-%')
     ) THEN
    RAISE EXCEPTION 'Active full-course student entitlement is required for issuance.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_course FROM public.course_prices cp WHERE cp.course_id = p_course_id;
  IF NOT FOUND OR lower(trim(v_course.course_name)) <> lower(trim(v_student.enrolled_course)) THEN
    RAISE EXCEPTION 'Certificate course does not match the active student entitlement.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_completion
  FROM public.course_completion_records cc
  WHERE cc.student_id = p_student_id AND cc.course_id = p_course_id AND cc.status = 'approved'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Instructor-approved course completion is required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_certificate FROM public.issued_certificates ic
  WHERE ic.completion_id = v_completion.id AND ic.status = 'valid';
  IF FOUND THEN
    RETURN NEXT v_certificate;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.issued_certificates ic
    WHERE ic.completion_id = v_completion.id
      AND ic.status IN ('revoked', 'reissued')
  ) THEN
    RAISE EXCEPTION 'This completion has a revoked or replaced certificate; an administrator must authorize any replacement.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.issued_certificates (
    certificate_id, student_id, student_name, course_name, issued_date,
    verification_url, pdf_url, course_id, completion_id, status,
    issuer_type, issued_by
  ) VALUES (
    p_certificate_id, v_student.id, v_student.full_name, v_course.course_name,
    to_char(CURRENT_DATE, 'FMMonth DD, YYYY'), p_verification_url, NULL,
    v_course.course_id, v_completion.id, 'valid', p_issuer_type, p_issued_by
  ) RETURNING * INTO v_certificate;

  INSERT INTO public.certificate_events(certificate_id, event_type, actor_type, actor_id, details)
  VALUES (v_certificate.certificate_id, 'issued', CASE WHEN p_issuer_type = 'student_self_service' THEN 'student' ELSE 'super_admin' END, p_issued_by,
          jsonb_build_object('completion_id', v_completion.id, 'course_id', p_course_id));

  RETURN NEXT v_certificate;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_course_certificate(
  p_certificate_id VARCHAR(100),
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS SETOF public.issued_certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_certificate public.issued_certificates%ROWTYPE;
BEGIN
  IF p_admin_id IS NULL OR length(trim(coalesce(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'A verified administrator and a meaningful revocation reason are required.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.issued_certificates ic
  SET status = 'revoked', revoked_at = NOW(), revoked_by = p_admin_id,
      revocation_reason = left(trim(p_reason), 1000)
  WHERE ic.certificate_id = p_certificate_id AND ic.status = 'valid'
  RETURNING * INTO v_certificate;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate is missing or is not currently valid.' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.certificate_events(certificate_id, event_type, actor_type, actor_id, reason)
  VALUES (v_certificate.certificate_id, 'revoked', 'super_admin', p_admin_id::TEXT, left(trim(p_reason), 1000));
  RETURN NEXT v_certificate;
END;
$$;

CREATE OR REPLACE FUNCTION public.reissue_course_certificate(
  p_old_certificate_id VARCHAR(100),
  p_new_certificate_id VARCHAR(100),
  p_verification_url TEXT,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS SETOF public.issued_certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_old public.issued_certificates%ROWTYPE;
  v_new public.issued_certificates%ROWTYPE;
BEGIN
  IF p_admin_id IS NULL OR p_new_certificate_id IS NULL OR p_verification_url IS NULL OR length(trim(coalesce(p_reason, ''))) < 10 OR
     p_new_certificate_id !~ '^GI-[A-F0-9]{32}$' OR
     p_verification_url !~ '^https://[A-Za-z0-9.-]+/classroom/verify-certificate\.html\?id=GI-[A-F0-9]{32}$' THEN
    RAISE EXCEPTION 'A verified administrator, reason, and valid new certificate reference are required.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_old FROM public.issued_certificates ic
  WHERE ic.certificate_id = p_old_certificate_id
    AND ic.status IN ('valid', 'revoked')
    AND ic.completion_id IS NOT NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate cannot be reissued.' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.issued_certificates ic
    WHERE ic.completion_id = v_old.completion_id AND ic.status = 'valid'
      AND ic.certificate_id <> v_old.certificate_id
  ) THEN
    RAISE EXCEPTION 'Another valid certificate already exists for this completion.' USING ERRCODE = '23505';
  END IF;

  IF v_old.status = 'valid' THEN
    UPDATE public.issued_certificates SET status = 'reissued' WHERE certificate_id = v_old.certificate_id;
  END IF;
  INSERT INTO public.issued_certificates (
    certificate_id, student_id, student_name, course_name, issued_date,
    verification_url, pdf_url, course_id, completion_id, status,
    issuer_type, issued_by, reissue_of
  ) VALUES (
    p_new_certificate_id, v_old.student_id, v_old.student_name, v_old.course_name,
    to_char(CURRENT_DATE, 'FMMonth DD, YYYY'), p_verification_url, NULL,
    v_old.course_id, v_old.completion_id, 'valid', 'super_admin', p_admin_id::TEXT,
    v_old.certificate_id
  ) RETURNING * INTO v_new;

  INSERT INTO public.certificate_events(certificate_id, event_type, actor_type, actor_id, reason, details)
  VALUES (v_old.certificate_id, 'reissued', 'super_admin', p_admin_id::TEXT, left(trim(p_reason), 1000),
          jsonb_build_object('replacement_certificate_id', v_new.certificate_id));
  INSERT INTO public.certificate_events(certificate_id, event_type, actor_type, actor_id, reason, details)
  VALUES (v_new.certificate_id, 'issued', 'super_admin', p_admin_id::TEXT, left(trim(p_reason), 1000),
          jsonb_build_object('reissue_of', v_old.certificate_id));
  RETURN NEXT v_new;
END;
$$;

-- Replace the old format-based/always-valid verifier with a registry-backed function.
DROP FUNCTION IF EXISTS public.verify_certificate(TEXT);
CREATE FUNCTION public.verify_certificate(p_certificate_id TEXT)
RETURNS TABLE (
  certificate_id VARCHAR(100),
  student_name VARCHAR(150),
  course_name VARCHAR(150),
  issued_date VARCHAR(50),
  course_completion_date DATE,
  certificate_status TEXT,
  is_valid BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ic.certificate_id,
         ic.student_name,
         ic.course_name,
         ic.issued_date,
         cc.completion_date,
         CASE
           WHEN ic.status = 'revoked' OR cc.status = 'revoked' THEN 'revoked'
           WHEN ic.status = 'valid' AND cc.status = 'approved' THEN 'valid'
           WHEN ic.status = 'reissued' THEN 'reissued'
           ELSE 'unverified'
         END::TEXT,
         (ic.status = 'valid' AND cc.status = 'approved')
  FROM public.issued_certificates ic
  LEFT JOIN public.course_completion_records cc ON cc.id = ic.completion_id
  WHERE ic.certificate_id = upper(trim(p_certificate_id));
$$;

REVOKE ALL ON FUNCTION public.review_course_project(UUID, UUID, TEXT, DATE, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_course_certificate(VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_course_certificate(VARCHAR, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reissue_course_certificate(VARCHAR, VARCHAR, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_certificate(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_course_project(UUID, UUID, TEXT, DATE, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_course_certificate(VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_course_certificate(VARCHAR, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reissue_course_certificate(VARCHAR, VARCHAR, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO service_role;

COMMIT;
