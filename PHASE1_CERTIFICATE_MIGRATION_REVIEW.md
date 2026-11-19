# Certificate migration review

Reviewed locally on 12 November 2026. No database was contacted and no SQL was executed.

## V1.2 comparison

The owner reports that V1.2 executed, but its execution report is not present in this workspace. The checked-in `production_manual_payment_currency_migration_v1_2.sql` changes `public.orders` financial snapshot fields and creates/hardens `public.email_notifications`; it does not alter certificate, course, student, access-code, or project-submission tables. This establishes only what the checked-in migration file says, not what is currently in production.

### Historical production report found 12 November 2026

`PHASE_E_GATE2A_PRODUCTION_MIGRATION_EXECUTION_REPORT.md` records a production V1.1-hardened migration on 8 November 2026 for project `fkltvxhqizqrbvogodxv`. It reports `project_submissions` with UUID primary key and student/course relationships, `issued_certificates` with a text primary key and student/course relationships, RLS enabled across 13 listed tables, and a `SECURITY DEFINER` `verify_certificate()` function. This is historical pre-V1.2 evidence, not the actual post-V1.2 schema inspection requested on 12 November. It does not provide the full column/constraint/grant details needed to verify the new migration's foreign keys or API fields.

The checked-in V1.2 migration file's SHA-256 matches the supplied checksum `76B0DA6DF1FB8BC83F96460DC4F42239A0F87C3A1C3D493660E3A8E20C429C65`. The separate V1.2 execution report was not found. Since the checked-in V1.2 SQL does not create the certificate completion or event tables, whether those objects exist in the current database remains unknown.

## Compatibility matrix against the available historical evidence

| Migration dependency or effect | Evidence available | Assessment |
|---|---|---|
| `students`, `course_prices`, `project_submissions`, `issued_certificates` exist | Gate 2A report says the V1.1 production migration instantiated the 13-table schema, including these objects. | **Historically confirmed for 8 Nov only.** Current existence still needs the approved query. |
| `project_submissions.id` is UUID; student/course relationships exist | Gate 2A report describes UUID PK and student/course FKs. | **Historical partial support.** Exact column names/types and `student_id`, `submitted_at`, and `course_id` definitions are not supplied. Migration/API/index compatibility is unconfirmed. |
| `issued_certificates` uses a text primary key and has student/course relationships | Gate 2A report describes text PK, student/course FKs, issue date, and verification hash. | **Historical partial support.** The exact key name/type, existing unique constraints, current rows/statuses and other columns are unknown. |
| `students.id` and `course_prices.course_id` are suitable FK targets | Local candidate assumes `students.id VARCHAR(50)` and `course_prices.course_id VARCHAR(50)` is uniquely constrained. Gate 2A report only mentions `students.user_id UUID REFERENCES auth.users(id)` and does not establish the assumed key types/uniqueness. | **Unverified; migration blocker.** Confirm types and unique/primary keys before applying the candidate. |
| Existing `project_submissions.status` and check constraints | Historical report mentions a review-status field but not its exact name, values, type, or constraints. Candidate adds/uses `status`, may replace the named status check, then classifies older rows `unverified_legacy`. | **Unverified; data-sensitive.** A conflicting status column/check can abort the transaction; owner must review the backfill and legacy classification. |
| `course_completion_records` and `certificate_events` | These are not among the 13 tables enumerated in the 8 Nov report; checked-in V1.2 SQL does not create them. | **Likely candidate additions, not proven absent today.** Verify current existence and shape before applying `CREATE TABLE IF NOT EXISTS` assumptions. |
| `verify_certificate(text)` and dependencies | Gate 2A report says `verify_certificate()` existed as `SECURITY DEFINER` with pinned search path. Candidate drops/recreates the expected signature without `CASCADE`. | **Historical function existence confirmed; exact signature/result and dependents unknown.** A dependency should abort rather than cascade, but inspect current overloads/dependents first. |
| RLS and policies | Gate 2A report says RLS was enabled on all 13 listed tables and reports 20 hardened policies. | **Historical state only.** Candidate revokes direct table grants but keeps existing policies; current grants, owners, policy definitions, and RPC execute grants must be checked. |
| Legacy certificates | Gate 2A reports issued-certificate table was newly instantiated and empty at that time. | **No current row-count inference.** Candidate changes valid certificates without completion links to `unverified_legacy`; current effect and owner acceptance are unknown. |

### Migration decision from available evidence

The historical report provides useful evidence that the base certificate tables and an older verifier existed before V1.2. It does **not** establish compatibility with the present production database. No migration correction is safe to make from the missing facts alone. Keep the migration unexecuted. First obtain the approved schema query results, then compare every FK target, column type, check/unique constraint, verifier overload/dependency, grant and legacy row effect. Any correction must preserve all existing certificate and audit rows and be separately reviewed before execution.

## Checked-in base schema compatibility

`production_combined_migration.sql` and the V1.1 reconciliation SQL define the base objects assumed by the certificate migration:

- `students.id` is `varchar(50)`; the table contains full name, registered email, secret password, enrolled course, status, and expiry.
- `access_codes.student_id` is `varchar(50)`; course name, active/session-pass flags, and expiry support the full-course entitlement check.
- `course_prices.course_id` is `varchar(50)` and its course name is present.
- `project_submissions.id` is UUID; the base schema contains student identity, project URL/title/notes and submit time.
- `issued_certificates.certificate_id` is `varchar(100)` primary key and it has student/course name, issue date, verification URL, optional `pdf_url`, and creation time.
- Existing `verify_certificate(text)` has a five-column result and returns a fixed “verified” status for any matching old row. The candidate intentionally replaces this registry behavior with status and completion fields.
- Existing RLS and `public.is_super_admin()` policies are defined by V1.1. The candidate keeps that function untouched, enables RLS, revokes direct public/authenticated table privileges on certificate/submission tables, and gives only `service_role` the needed table and RPC access. HTTP actions perform the existing signed-token, live Auth role/email, and TOTP checks before service-role operations.

## Review findings and required corrections

- The certificate migration adds columns/tables and new constraints/indexes; V1.2 as checked in does not directly conflict. Actual production schema still needs the owner’s report and read-only fact collection.
- Pre-registry project submissions are moved to `unverified_legacy` so they are not mistaken for pending work or trusted completion evidence. This is an intentional data update and needs explicit owner review. A unique partial index prevents simultaneous duplicate pending submissions; the migration stops on existing duplicates instead of choosing one silently.
- Student self-service issuance returns an existing valid record idempotently and refuses to mint a replacement when a completion has a revoked or reissued record. The administrator reissue RPC is the only replacement path and preserves both references and audit events.
- Pre-existing `issued_certificates` rows with no completion link are retained but changed to `unverified_legacy`. These records will no longer publicly verify as authentic. Owner must accept this effect and decide how any legacy certificate is independently substantiated.
- `verify_certificate(text)` must be dropped and recreated because PostgreSQL cannot change its result-table shape with `CREATE OR REPLACE`. The candidate uses plain `DROP FUNCTION` without `CASCADE`, so a dependent view/object should stop the transaction safely. Run the prepared dependency query and inspect all overloads before authorizing migration. The function’s execution grants are re-established for `service_role` only.
- Existing policies are not dropped. Revoking table privileges prevents public/authenticated direct access; RLS remains enabled. Verify actual grants, policies, table owners, and function definitions because V1.2 execution is not independently evidenced.
- The migration assumes `auth.users.id` UUID references, `students.expires_at`, `students.secret_password`, and `students.enrolled_course`; all match the checked-in base schema, but live facts remain unverified.
- Review and issuance depend on the owner’s existing `ADMIN_EMAIL` being the current designated Super Admin. Admin user lookup confirms live `app_metadata.role='super_admin'`, exact email, signed token, and TOTP. No Super Admin provisioning is included.
- The database RPCs are service-role-only. Their reviewer/issuer UUID parameters are trusted only because calls pass through the checked API boundary; the service-role key must remain server-only.
- The migration is transactional and idempotent for the stated schema: columns use `IF NOT EXISTS`; tables/indexes/functions are created/replaced; constraint checks are scoped to the correct relation. Existing status checks are amended only to permit the legacy marker. It is not a rollback script: reverting after certificate issuance would risk dropping linked records and audit history. Use forward fixes and preserve evidence.

## Approved inspection status and owner verification still required

The owner separately approved `PHASE1_CERTIFICATE_SCHEMA_INSPECTION.sql` on 12 November. Preflight confirmed its nine executable statements are SELECT-only; SHA-256 is `F2FC1F809EE624DD308884BCA4B5BD82D905608FFB717C96E3384F993D8A55FE`. It has not been run because this workspace has no verified production connection or read-only role. An authorized operator must run it against the correctly identified project and provide redacted findings plus the V1.2 execution report. Do not rerun V1.2. The certificate migration remains unexecuted and still requires separate approval after the actual schema is reviewed.

## Local schema-review supplement (13 November 2026)

Static review found the approved inspection file does not return the unique constraints/indexes on `students` and `course_prices`, although the candidate certificate migration uses both as foreign-key targets. It also does not report the execution ACLs for the certificate RPCs. The approved file and its recorded checksum were left unchanged. A separate catalog-only SELECT file, `PHASE1_CERTIFICATE_SCHEMA_INSPECTION_SUPPLEMENT.sql`, now collects those facts. It has not been run and needs separate approval before execution. The live schema blocker remains open until redacted results are reviewed; no migration is authorized.

## Owner-supplied production catalog findings (13 November 2026)

The owner supplied the single-row JSON result from the read-only inspection. The dashboard URL they supplied identifies project `fkltvxhqizqrbvogodxv`; `current_setting('supabase.project_id', true)` returned NULL, so that SQL setting did not independently identify the target. The database name returned was `postgres`.

**Confirmed base-schema facts:** `students.id` is `varchar(50)` and primary key; `course_prices.course_id` is `varchar(100)` and primary key; `project_submissions.id` is UUID primary key; `issued_certificates.certificate_id` is `varchar(100)` primary key. Existing `project_submissions.submitted_at` is `timestamptz`. The candidate's referenced key columns therefore exist and are unique. The live tables do not yet contain the candidate's `course_id`, review status/metadata, certificate status/completion, or reissue/revocation columns. `course_completion_records` and `certificate_events` are absent. The `supabase_migrations.schema_migrations` relation is also absent; this does not prove that no migrations have ever run.

The current `project_submissions` table has `grade`, `feedback`, and `graded_by` fields. The candidate adds new review fields and classifies rows with null `course_id`, `reviewed_by`, and `reviewed_at` as `unverified_legacy`. Because these new fields are absent now and added nullable, that update would classify every existing submission as legacy, including rows that may have historical grading data. No row counts or values were included. Preserve these old fields and do not infer that a grade is equivalent to an approved certificate completion. Obtain aggregate counts and owner review of the legacy effect before approving migration execution.

**Existing verification function:** `verify_certificate(text)` is `SECURITY DEFINER`, returns the old five-column result including `verification_status`, and has no recorded dependent objects in the supplied output. Its execute grant is only to `service_role`. The registry migration's drop/recreate has no dependency conflict shown by this inspection.

**Access-control finding requiring owner attention:** RLS is enabled but not forced on `project_submissions` and `issued_certificates`. The `authenticated` role has table privileges including `TRUNCATE` on both. PostgreSQL documents that `TRUNCATE` is not subject to row-level security, so the current row policies do not constrain that privilege ([PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [TRUNCATE](https://www.postgresql.org/docs/current/sql-truncate.html)). This inspection did not establish whether the application exposes a path for an untrusted user to issue SQL as `authenticated`; it does establish that the grant is broader than the row policies suggest. The certificate migration locally proposes revoking direct privileges from `authenticated`, but it has not been executed and is not authorized for execution. Treat grant remediation as a separate owner-approved action.

The candidate uses `varchar(50)` for its course ID columns and RPC argument, while the live `course_prices.course_id` allows `varchar(100)`; the current API also validates certificate course IDs at 50 characters. The catalog output did not include course-ID values or lengths. Before finalizing that limit, collect aggregate counts for course IDs longer than 50 characters and counts of existing project-submission/certificate rows affected by legacy classification. No migration was run and no database settings or records were changed.

## Inspection status correction (13 November 2026)

The owner ran the consolidated single-SELECT JSON inspection supplied in this conversation and provided its result. It returned the catalog sections needed for the base tables, columns, RLS, policies, grants, constraints, unique indexes, certificate function definitions/ACLs, and verifier dependencies. The result also covers the supplemental key/index and function-ACL facts, so the separate local supplement file need not be run just to obtain those same facts. The original approved multi-SELECT file and its checksum remain unchanged; it was not run verbatim. The consolidated result did not include row counts, historical grade-evidence counts, or course-ID lengths. No migration or database modification was performed.

## Aggregate impact counts received (13 November 2026)

The owner supplied aggregate-only results: `course_prices` has 6 rows and maximum course ID length 15, with 0 IDs longer than 50; `project_submissions` has 0 rows and 0 rows with grade, feedback, or grader metadata; `issued_certificates` has 0 rows. This removes the observed course-ID length mismatch and means the candidate's legacy reclassification/update affects no current submission or certificate rows. It does not validate behavior for future records or replace a database integration check. The migration remains unexecuted. The `authenticated` TRUNCATE grants remain unremediated and require separate authorization.

## Targeted privilege remediation prepared (13 November 2026)

`production_revoke_authenticated_truncate.sql` is a local, transaction-wrapped script to remove only the `TRUNCATE` privilege from `authenticated` on certificate and submission tables and verify the effective grant is gone. It has not been executed. Its scope is limited to table privileges; it does not alter data, policies, or schema. Run only after confirming project `fkltvxhqizqrbvogodxv` in the Dashboard. A successful result should show both privilege checks as `false`.

## TRUNCATE remediation completed by owner (13 November 2026)

The owner ran the prepared transaction in the confirmed production project and supplied a result showing `authenticated_can_truncate_issued_certificates = false` and `authenticated_can_truncate_project_submissions = false`. This verifies the effective TRUNCATE privilege is removed for `authenticated` on these two tables. No rows or schema objects were changed by the remediation. Other table grants were not changed by this narrow fix; the certificate migration's broader `REVOKE ALL` remains pending separate approval. The next release gate is review/authorization of the certificate registry migration and its production execution; no migration has been run.

## Owner approval and static migration review (13 November 2026)

The owner approved proceeding with the production certificate registry migration. Static review was performed against the owner-supplied schema and aggregate results. Reviewed file SHA-256: `B6B14DAEBC85D8CC54F9B7CFC5D5A007BC6DFDC45082CF69810D9E6E1B1A7EB2`. The file is transaction-bounded (`BEGIN`/`COMMIT`); it adds certificate workflow columns/tables/indexes, updates legacy status fields (zero affected current rows), revokes direct grants from `PUBLIC`, `anon`, and `authenticated`, grants needed table/RPC access to `service_role`, and replaces `verify_certificate(text)` after the inspection found no dependents. Static scan found no `DROP TABLE`, `TRUNCATE`, or `DELETE FROM` statement. It does drop/recreate the verifier and may drop/recreate a project-submissions status constraint where required. The migration was not executed in this session because browser control is blocked; the owner must run the exact file in the confirmed production project. No test evidence is added by static review.

## Certificate migration execution reported (13 November 2026)

The owner reports that `production_certificate_registry_migration.sql` completed successfully in the confirmed production project; the SQL Editor showed “Success. No rows returned.” This is owner-reported execution evidence, not an independent post-migration verification. No data rows were expected from the DDL/function statements. Run a focused read-only post-migration check of table/column presence, RLS, direct grants, verifier signature/ACL, and function dependencies before integration testing. Do not repeat the already-passed local application suites.

## Owner-supplied post-migration verification (13 November 2026)

The owner ran the focused read-only post-migration query and supplied its JSON output. All four expected relations exist; no expected columns are missing; all four tables have RLS enabled; all four checked indexes are present; the new verifier returns the registry status/completion fields; all five certificate functions are SECURITY DEFINER and executable by `service_role` only (false for `anon` and `authenticated`); and no `verify_certificate` dependents were reported. The filtered table-grant output contains no `PUBLIC`, `anon`, or `authenticated` grants, confirming the client-access revocation.

**Follow-up hardening:** the same result shows `service_role` has DELETE, TRUNCATE, REFERENCES, and TRIGGER as well as SELECT/INSERT/UPDATE on all four tables. The migration's explicit GRANT statements are narrower, so these additional effective privileges likely come from existing/default ACLs; the result does not identify their grant source. `service_role` is the server-only privileged role, and no client role has table grants. Review whether to revoke the unused privileges as a separate least-privilege change; do not change them without approval. Database integration behavior has not been exercised, and no previously passing local tests were repeated.
