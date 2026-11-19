-- Greach Impact Academy production privilege correction.
-- Target must be project fkltvxhqizqrbvogodxv.
-- Removes only TRUNCATE from authenticated on these two tables.
-- No rows or objects are modified. Execute only in the verified target project.

BEGIN;

REVOKE TRUNCATE ON TABLE
  public.issued_certificates,
  public.project_submissions
FROM authenticated;

-- Abort and roll back if an inherited grant still gives authenticated TRUNCATE.
DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.issued_certificates', 'TRUNCATE')
     OR has_table_privilege('authenticated', 'public.project_submissions', 'TRUNCATE') THEN
    RAISE EXCEPTION 'TRUNCATE remains effective for authenticated; transaction rolled back.';
  END IF;
END;
$$;

COMMIT;

-- Expected result: both values are false.
SELECT
  has_table_privilege('authenticated', 'public.issued_certificates', 'TRUNCATE')
    AS authenticated_can_truncate_issued_certificates,
  has_table_privilege('authenticated', 'public.project_submissions', 'TRUNCATE')
    AS authenticated_can_truncate_project_submissions;
