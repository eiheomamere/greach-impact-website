-- Read-only production schema fact collection for certificate migration review.
-- Separately approved for read-only inspection on 2026-11-12.
-- Execute only after confirming the active project and read-only connection role.
-- Contains SELECT statements only. Do not return secrets or row-level student data.

SELECT current_database() AS database_name,
       current_setting('supabase.project_id', true) AS supabase_project_id;

SELECT table_name, column_name, data_type, character_maximum_length,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'students', 'access_codes', 'course_prices', 'project_submissions',
    'issued_certificates', 'course_completion_records', 'certificate_events',
    'orders', 'email_notifications'
  )
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'students', 'access_codes', 'course_prices', 'project_submissions',
    'issued_certificates', 'course_completion_records', 'certificate_events'
  )
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('project_submissions', 'issued_certificates',
                    'course_completion_records', 'certificate_events')
ORDER BY tablename, policyname;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('project_submissions', 'issued_certificates',
                     'course_completion_records', 'certificate_events')
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

SELECT conrelid::regclass AS table_name, conname,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
  to_regclass('public.project_submissions'),
  to_regclass('public.issued_certificates'),
  to_regclass('public.course_completion_records'),
  to_regclass('public.certificate_events')
)
ORDER BY conrelid::regclass::text, conname;

SELECT p.oid::regprocedure AS function_signature,
       p.prosecdef AS security_definer,
       pg_get_function_result(p.oid) AS return_type,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('verify_certificate', 'is_super_admin',
                    'review_course_project', 'issue_course_certificate',
                    'revoke_course_certificate', 'reissue_course_certificate')
ORDER BY p.proname, p.oid::regprocedure::text;

SELECT pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent_object,
       referenced_ns.nspname AS referenced_schema,
       referenced.proname AS referenced_function
FROM pg_depend d
JOIN pg_proc referenced ON referenced.oid = d.refobjid
JOIN pg_namespace referenced_ns ON referenced_ns.oid = referenced.pronamespace
WHERE referenced_ns.nspname = 'public'
  AND referenced.proname = 'verify_certificate'
ORDER BY dependent_object;

SELECT to_regclass('supabase_migrations.schema_migrations') AS migration_history_table,
       to_regclass('public.course_completion_records') AS completion_table,
       to_regclass('public.certificate_events') AS certificate_audit_table;
