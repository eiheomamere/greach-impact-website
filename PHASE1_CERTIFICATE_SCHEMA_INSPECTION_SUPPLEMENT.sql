-- Local review supplement to PHASE1_CERTIFICATE_SCHEMA_INSPECTION.sql.
-- Read-only catalog queries only. Not included in the previously approved file/checksum.
-- Requires separate approval before any execution against a database.

-- Confirm that the migration's referenced student and course keys are unique,
-- and capture their exact constraint definitions and backing indexes.
SELECT c.conrelid::regclass AS table_name,
       c.conname,
       c.contype,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid IN (
  to_regclass('public.students'),
  to_regclass('public.course_prices')
)
ORDER BY c.conrelid::regclass::text, c.conname;

SELECT schemaname,
       tablename,
       indexname,
       indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('students', 'course_prices')
  AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
ORDER BY tablename, indexname;

-- Confirm who can execute certificate RPCs without reading application data.
SELECT p.oid::regprocedure AS function_signature,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE r.rolname END AS grantee,
       a.privilege_type,
       a.is_grantable
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(
  COALESCE(p.proacl, acldefault('f', p.proowner))
) AS a
LEFT JOIN pg_roles r ON r.oid = a.grantee
WHERE n.nspname = 'public'
  AND p.proname IN (
    'verify_certificate', 'review_course_project', 'issue_course_certificate',
    'revoke_course_certificate', 'reissue_course_certificate'
  )
  AND (a.grantee = 0 OR r.rolname IN ('anon', 'authenticated', 'service_role'))
ORDER BY p.proname, p.oid::regprocedure::text, grantee, a.privilege_type;
