-- =============================================================================
-- GREACH IMPACT ACADEMY - CERTIFICATE REGISTRY LEAST-PRIVILEGE HARDENING PROPOSAL
-- Status: PREPARED FOR OWNER REVIEW ONLY (NOT EXECUTED)
-- Target Project: fkltvxhqizqrbvogodxv (Confirm before execution)
-- Scope: Revoke unused destructive/DDL table privileges from service_role on the
--        four certificate-registry tables while preserving all runtime privileges
--        required by api/auth.js and the five SECURITY DEFINER certificate RPCs.
--        Does NOT alter RLS, policies, table data, schema, or client-role revocations.
-- =============================================================================

BEGIN;

-- 1. Enforce exact least-privilege set on certificate tables for service_role
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.issued_certificates,
           public.project_submissions,
           public.course_completion_records
  FROM service_role;

-- certificate_events is an append-only audit log: service_role needs SELECT + INSERT only
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.certificate_events
  FROM service_role;

-- 2. Re-assert required runtime privileges (idempotent)
GRANT SELECT, INSERT, UPDATE ON TABLE public.issued_certificates TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.project_submissions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.course_completion_records TO service_role;
GRANT SELECT, INSERT ON TABLE public.certificate_events TO service_role;

-- 3. Verify resulting effective privileges for service_role inside the transaction
SELECT
  t.table_name,
  has_table_privilege('service_role', 'public.' || t.table_name, 'SELECT')     AS can_select,
  has_table_privilege('service_role', 'public.' || t.table_name, 'INSERT')     AS can_insert,
  has_table_privilege('service_role', 'public.' || t.table_name, 'UPDATE')     AS can_update,
  has_table_privilege('service_role', 'public.' || t.table_name, 'DELETE')     AS can_delete,
  has_table_privilege('service_role', 'public.' || t.table_name, 'TRUNCATE')   AS can_truncate,
  has_table_privilege('service_role', 'public.' || t.table_name, 'REFERENCES') AS can_references,
  has_table_privilege('service_role', 'public.' || t.table_name, 'TRIGGER')    AS can_trigger
FROM (VALUES
  ('issued_certificates'),
  ('project_submissions'),
  ('course_completion_records'),
  ('certificate_events')
) AS t(table_name)
ORDER BY t.table_name;

COMMIT;

-- =============================================================================
-- ROLLBACK (Only if separately authorized to restore previous broader grants):
-- BEGIN;
-- GRANT ALL PRIVILEGES ON TABLE
--   public.issued_certificates,
--   public.project_submissions,
--   public.course_completion_records,
--   public.certificate_events
-- TO service_role;
-- COMMIT;
-- =============================================================================
