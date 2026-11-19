# Greach Impact Academy — Phase 1 Security, Least-Privilege, and Incident Closure Report

**Updated:** 19 November 2026  
**Production Supabase Project:** `fkltvxhqizqrbvogodxv` (`https://fkltvxhqizqrbvogodxv.supabase.co`)  
**Staging Supabase Project:** `vtardudnbbyktkdjxwdc` (`https://vtardudnbbyktkdjxwdc.supabase.co`)  
**Secret Handling:** Zero credentials, API keys, passwords, tokens, or MFA codes are recorded in this document.

---

## 1. Gate 1 — Production Storage Security Inspection (`fkltvxhqizqrbvogodxv`)

- **Local Preflight Status:** `COMPLETE AND VERIFIED` (19 November 2026, direct local verification)
  - File located: `GATE_2E_7_storage_inspection.sql`
  - Recalculated SHA-256: `A1AD0D2DA3872F34F7FC70C67686BBC061E985556A4FC076A12D3FEE0BAFCC1E` — **exact match** to approved checksum.
  - Statement inspection: Confirmed **exactly 4 read-only `SELECT` statements** (`storage.buckets`, `pg_class`/`pg_namespace` RLS flags on `storage.objects`, `pg_policies` on `storage.objects`, and `pg_get_functiondef` for zero-argument `public.is_super_admin()`). Zero DDL/DML statements.
- **Live Read-Only Inspection Status:** `COMPLETE AND VERIFIED` (19 November 2026, `12:41:06Z`–`12:43:36Z`, directly executed via authenticated Supabase Dashboard SQL Editor on verified Production project `fkltvxhqizqrbvogodxv`, zero DDL/DML)
  - **Query 1 (`storage.buckets` where `id = 'payment_receipts'`):** `0 rows` — `payment_receipts` bucket **does not exist** in Production.
  - **Query 2 (`storage.objects` RLS flags):** `1 row` — `schema_name = 'storage'`, `table_name = 'objects'`, **`rls_enabled = true`**, `rls_forced = false`.
  - **Query 3 (`pg_policies` on `storage.objects`):** `0 rows` — **no** storage policies exist on `storage.objects` (zero conflicting permissive policies, zero duplicate policy names).
  - **Query 4 (`public.is_super_admin()`):** `1 row` — confirmed `SECURITY DEFINER`, `SET search_path TO 'public', 'auth', 'pg_temp'`, checking `EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'super_admin')`.
- **Creation-Only Proposal Execution & Verification Status:** `COMPLETE AND VERIFIED` (19 November 2026, `12:49Z`–`12:53Z`, executed on confirmed Production project `fkltvxhqizqrbvogodxv` after explicit owner approval)
  - File executed: `GATE_2E_7_storage_create_only.sql` (SHA-256 `2A6BE8055E32C77A61C742B2B6589BEED7FAB1E8479C433F32544C7CE8A65E9E`). Result: `Success. No rows returned`.
  - **Post-Creation Verification (`storage.buckets`):** `1 row` — `id = 'payment_receipts'`, `name = 'payment_receipts'`, `public = false`, `file_size_limit = 5242880` (5 MiB), `allowed_mime_types = ["image/jpeg","image/png","image/webp","application/pdf"]`.
  - **Post-Creation Verification (`pg_policies` on `storage.objects`):** `2 rows`:
    1. `payment_receipts_restrict_non_admin` (`RESTRICTIVE`, `{public}`, `ALL`, `((bucket_id <> 'payment_receipts'::text) OR (is_super_admin() AND ((auth.jwt() ->> 'aal'::text) = 'aal2'::text)))`).
    2. `payment_receipts_super_admin_only` (`PERMISSIVE`, `{authenticated}`, `ALL`, `((bucket_id = 'payment_receipts'::text) AND is_super_admin() AND ((auth.jwt() ->> 'aal'::text) = 'aal2'::text))`).
  - **Rollback Consideration:** Reversible prior to live receipt uploads by dropping the two named policies and deleting the empty `payment_receipts` bucket; once receipts are uploaded, preserve objects and apply forward-only policy fixes.

---

## 2. Gate 2 — Vercel Production Configuration Review

- **Read-Only Live Inspection Status:** `COMPLETE AND VERIFIED` (19 November 2026, `13:01Z`–`13:06Z`, directly inspected on `https://vercel.com` with zero edits, zero redeploys, and zero secret values revealed)
  - **Project / Account:** `greach-impact-website` (`eiheomamere-2074s-projects`, Hobby plan)
  - **Connected Git Repository & Production Branch:** `eiheomamere/greach-impact-website` -> `main` (`Branch Tracking: main`)
  - **Configured Production Domain:** `greach-impact-website.vercel.app` (`Valid Configuration`, no custom domain attached)
  - **Last Known-Good Production Deployment (Confirmed Rollback Target):** Deployment ID `2eatqEussFBzxweSGvnbNCMUw5GH`, Commit `0250c92530203703eb8e5157e96a21c09f4b9274`, Status `Ready`, Timestamp `2026-11-04T11:43:33Z`
  - **System Environment Variables (`VERCEL_ENV`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`):** `Enable access to System Environment Variables` = **Checked/Enabled**, with **0** manual overrides.
  - **`STAGING_*` / `STAGING` variables scoped to Production:** **None (`0`)**.
- **CRITICAL RELEASE BLOCKER DISCOVERED (`BLOCKED` — Action Required Before Deployment):**
  - **0 of 11 required Production environment variables are configured in Vercel** (`Project`: 0 variables, `Shared`: 0 linked variables). All 11 are missing: `APP_ENV`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, `CRON_SECRET`, `ADMIN_EMAIL`, `ADMIN_USER`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`.
  - Deploying Phase 1 before configuring these 11 Production-scoped variables in Vercel (pointing `SUPABASE_URL` to `https://fkltvxhqizqrbvogodxv.supabase.co` and `APP_ENV=production`) will cause serverless APIs to fail closed with HTTP 500.
- **Confirmed Local Production-Domain Defect Caught & Fixed (19 November 2026):**
  - Because the live Vercel Production domain is `greach-impact-website.vercel.app` (no shorter custom domain attached), the full certificate verification URL is **113 bytes**, which exceeded the previous 106-byte QR Version 5-L cap in `api/auth.js` (`certificateVerificationBaseUrl()` would have returned `''` -> HTTP 503 on every issuance, and `pdfSafeText(..., 100)` would have truncated the printed URL).
  - Fixed in `api/auth.js` (SHA-256 `18715588EBCD994F4F6137BA6FC4EA79C6DFA220A7D081FBEB77970F0C78B12A`): upgraded `certificateQrMatrix` to support QR Model 2 Version 5-L (<=106 bytes) and Version 6-L (107–134 bytes, 2 interleaved Reed-Solomon blocks of 68 data + 18 EC), raised `certificateVerificationBaseUrl()` cap to 134 bytes and PDF URL print cap to 140 chars. Re-verified via `node --check api/auth.js`, `scripts/test_certificate_workflow_local.js`, `scripts/test_gate2e6_local_auth.js`, and independent PDF vector extraction + 36-syndrome Reed-Solomon decode confirming exact 113-byte payload recovery.

---

## 3. Gate 3 — Staging Security Incident Closure Record (`vtardudnbbyktkdjxwdc`)

- **Incident Status:** `BLOCKED` (Open — awaiting authenticated Supabase/Vercel staging dashboard execution and log review)
- **Potentially Exposed Credential Classes:**
  1. **Staging Supabase Auth Administrator Password** (historical commit `7a8790455582e663d06fd244ae80a638c161da3b` in `test_security.js`; retired legacy password also present in Git history `classroom/README.md`).
  2. **`STAGING_DB_PASSWORD`** (potential credential reuse across staging Auth and staging PostgreSQL).
- **Local Verification & Guard Hardening Completed (19 November 2026, direct local execution):**
  - Identified 3 guard weaknesses in legacy `test_security.js`: (1) static ES `import` statements hoisted above the staging guard, (2) hostname check inspected only the first DNS label instead of exact `https://vtardudnbbyktkdjxwdc.supabase.co`, and (3) missing `APP_ENV === 'staging'` check plus unredacted `JSON.stringify(res1.data)` error logging.
  - Hardened `test_security.js` locally (excluded from Vercel & Git release candidate): moved API imports to dynamic `await import(...)` strictly AFTER the guard, enforced exact `https://vtardudnbbyktkdjxwdc.supabase.co` + `APP_ENV === 'staging'` + full staging variable list, and redacted failure error output. Verified `node test_security.js` immediately exits with code `1` (`[BLOCKED]`) before importing any API module.
  - Read-only Staging check (`2026-11-19T13:45Z`, zero secrets printed): confirmed `.env.staging` last modified `2026-11-06T15:34:21Z` (not rotated yet); Staging REST/Auth returned HTTP `500` (`/auth/v1/admin/users`) and HTTP `400` (`/rest/v1/*`) — consistent with Supabase Free-Tier auto-pause after >7 days idle — and `db.vtardudnbbyktkdjxwdc.supabase.co` returned `ENOTFOUND` (IPv6-only direct host; pooler required for IPv4).
  - Local log check: The only `.log` file present in the repository is `debug.log` (264 bytes, 12 Nov 2026 12:37:29Z), which contains only two Windows Chrome Crashpad `Access is denied (0x5)` lines and **zero credentials or tokens**. Added `*.log` and `**/*.log` to `.vercelignore` on 19 Nov 2026 to guarantee it cannot deploy to Vercel.
  - Local PSReadLine history previously reviewed (12 Nov 2026): last modified 26 Oct 2026 (prior to the incident window), with no per-command timestamps or matching security-test invocations.
  - **Explicit Limitation:** An earlier failed authentication attempt does **not** prove the incident was harmless, does not prove `STAGING_DB_PASSWORD` was unused, and does not substitute for rotation and log review.

### Redacted Incident Closure Record (To Be Completed Upon Dashboard Execution)

| Field | Current Status / Recorded Evidence |
| :--- | :--- |
| Target Environment | Staging only (`vtardudnbbyktkdjxwdc`, `Greach-Impact-Academy-Staging`); Production (`fkltvxhqizqrbvogodxv`) untouched |
| Credential Class 1 — Staging Auth Admin Password | **`PASSED – VERIFIED` (`2026-11-19T16:09:16Z`):** Confirmed only 3 synthetic Nov 7 test `super_admin` accounts exist in Staging `auth.users` (all `last_sign_in_at = null`; zero owner account in Staging). Rotated `encrypted_password` of all 3 accounts in-DB via `extensions.crypt(gen_random_uuid()..., gen_salt('bf'))` (zero passwords exposed) and verified `rotated_users_count = 3`. |
| Auth Rotation Timestamp | `2026-11-19T16:09:16Z` (directly verified on `vtardudnbbyktkdjxwdc`) |
| Session Revocation Result | **`PASSED – VERIFIED` (`2026-11-19T16:09:16Z`):** Executed `UPDATE auth.refresh_tokens SET revoked = true` & `DELETE FROM auth.sessions`; verified `active_sessions = 0`, `active_refresh_tokens = 0`. |
| Credential Class 2 — `STAGING_DB_PASSWORD` | **PENDING (`IN PROGRESS`):** Staging Database Settings (`vtardudnbbyktkdjxwdc/database/settings`) opened for owner to click **Reset database password** and update local untracked `.env.staging` (last modified `2026-11-06T15:34:21Z`), followed by staging-only connectivity check. |
| DB Password Rotation Timestamp | *(Pending owner click on Reset database password)* |
| Configuration Locations Updated | Local `test_security.js` guard hardened & verified fail-closed (`13:49Z`); local `.env.staging` pending `STAGING_DB_PASSWORD` update |
| Narrow Log Review Window & Sources | **COMPLETED (`2026-11-19T15:52Z–16:06Z`):** Inspected Staging `auth.users`, `auth.sessions`, `auth.refresh_tokens`, `public.auth_rate_limits` (latest entry `2026-11-10T10:36:39Z`), `public.audit_logs` (latest entry `2026-11-10T10:36:43Z`), plus Dashboard Auth Logs (`1` event — our own `13:45Z` diagnostic probe), Postgres Logs (`17` events — routine checkpoints + our `13:45Z`/`15:56Z` queries), and Edge Logs (`17` events — health checks + our `13:45Z` probe). |
| Findings & Unauthorized Access Assessment | **Zero evidence of unauthorized access.** Zero active sessions/refresh tokens, zero `last_sign_in_at` on Staging Auth users, zero `audit_logs` or `auth_rate_limits` entries after `2026-11-10T10:36Z`. |
| Outstanding Uncertainty | (1) Supabase Free Tier Dashboard Logs retention is capped at **24 hours** (older Nov 6–10 dashboard logs unavailable); (2) historical Git object `7a879045...` remains in Git history (history rewrite not authorized); (3) `STAGING_DB_PASSWORD` rotation still pending. |
| Incident Owner Closure Confirmation | *(Ready for closure immediately after `STAGING_DB_PASSWORD` rotation & staging connectivity check)* |

---

## 4. Gate 4 — Certificate Schema Reconciliation & `service_role` Least-Privilege Review

### 4.1 Schema vs. Application Reconciliation (`COMPLETE AND VERIFIED` locally; Live DB Integration `BLOCKED`)
- **Production Migration State (`COMPLETE — OWNER EVIDENCE RECORDED`):** On 13 November 2026, the owner reported successful execution of `production_certificate_registry_migration.sql` (SHA-256 `B6B14DAEBC85D8CC54F9B7CFC5D5A007BC6DFDC45082CF69810D9E6E1B1A7EB2`) and supplied read-only post-migration catalog JSON confirming all 4 tables (`project_submissions`, `course_completion_records`, `issued_certificates`, `certificate_events`), required columns/indexes, enabled RLS, updated `verify_certificate(text)` signature, `SECURITY DEFINER` execution restricted exclusively to `service_role`, and zero `PUBLIC`/`anon`/`authenticated` table grants. **Migration was NOT re-executed.**
- **All 10 Required Certificate Workflows Verified Against Migrated Schema & Code (`api/auth.js`, `api/verify-cert.js`, `classroom/claim-certificate.html`, `classroom/certificate-review.html`, `classroom/verify-certificate.html`):**
  1. Eligible student submits capstone evidence (`submit_course_project` -> `INSERT` into `project_submissions` with `status = 'pending_review'`, HTTPS URL validation, partial unique index blocking duplicate pending submissions).
  2. Server verifies active student entitlement (`findStudentCertificateEntitlement` checking `students`, `access_codes`, `course_prices`) and instructor-reviewed `course_completion_records` (`status = 'approved'`). Payment alone is never accepted as completion.
  3. Authorized server workflow issues certificate via `rpc/issue_course_certificate` (`SECURITY DEFINER`, `service_role` only).
  4. Certificate stored in central `public.issued_certificates` linked via `completion_id` FK (`ON DELETE RESTRICT`).
  5. Cryptographically random non-sequential 128-bit reference (`GI-<32 uppercase hex>` via `crypto.randomBytes(16)`).
  6. Student retrieves only own records (`list_my_certificates` and `download_certificate_pdf` filter strictly by signed session `student_id = payload.sub` and log `retrieved` events in `certificate_events`).
  7. Public verification (`action=verify_certificate`) calls `rpc/verify_certificate`, rate-limited by IP/fallback key (`auth_rate_limits`), returning **only** `{certificateId, studentName, courseName, issuedDate, completionDate, status, verificationStatus}` — zero phone numbers, emails, `student_id`, or private fields.
  8. Invalid, forged, revoked, reissued, or unverified legacy certificates are rejected (`valid: false` or HTTP 404).
  9. Authorized revocation (`revoke_certificate` -> `rpc/revoke_course_certificate`, Super Admin + TOTP MFA + live role check) updates status to `revoked` with timestamp/admin UUID/reason and appends a `revoked` row to `certificate_events`.
  10. Authorized reissue (`reissue_certificate` -> `rpc/reissue_course_certificate`) marks the prior valid record `reissued` (never deleting it), inserts the new record with `reissue_of` FK, and appends both `reissued` and `issued` rows to `certificate_events`.
- **Remaining Limitation:** Offline mocked tests (`scripts/test_certificate_workflow_local.js`) passed on 12–13 Nov 2026; **live database integration tests have NOT yet been executed** against a migrated database instance.

### 4.2 Privilege-by-Privilege `service_role` Least-Privilege Recommendation (Prepared SQL — NOT Executed)

Owner-supplied 13 Nov 2026 catalog output showed `service_role` holds `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` on all four certificate tables (broader than the migration's explicit `GRANT` statements due to default PostgreSQL/Supabase grants).

| Table | Existing Privilege | Required Application Operation | Necessary? | Risk if Retained | Proposed Action | Expected Impact | Rollback |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `issued_certificates` | `SELECT`, `INSERT`, `UPDATE` | Registry listing, student lookup, PDF check, issuance, revocation, reissue (`api/auth.js` + RPCs) | **Yes** | Necessary runtime scope | **Retain** | None | N/A |
| `issued_certificates` | `DELETE`, `TRUNCATE` | None (certificates are immutable/status-transitioned only) | **No** | Accidental/compromised backend wipe of official credentials | **Revoke** | Zero runtime impact | Single `GRANT` transaction |
| `issued_certificates` | `REFERENCES`, `TRIGGER` | None (DDL only; performed by `postgres` owner) | **No** | Unnecessary schema-mutation surface for runtime role | **Revoke** | Zero runtime impact | Single `GRANT` transaction |
| `project_submissions` | `SELECT`, `INSERT`, `UPDATE` | Duplicate check, submission insert, pending queue read, instructor review update | **Yes** | Necessary runtime scope | **Retain** | None | N/A |
| `project_submissions` | `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` | None (submissions are preserved for audit) | **No** | Destructive deletion/wipe or DDL abuse via runtime role | **Revoke** | Zero runtime impact | Single `GRANT` transaction |
| `course_completion_records` | `SELECT`, `INSERT`, `UPDATE` | Completion verification, instructor approval insert, completion revocation lifecycle | **Yes** | Necessary runtime scope | **Retain** | None | N/A |
| `course_completion_records` | `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` | None (completions are FK-referenced `ON DELETE RESTRICT` & audited) | **No** | Destructive wipe or DDL abuse via runtime role | **Revoke** | Zero runtime impact | Single `GRANT` transaction |
| `certificate_events` | `SELECT`, `INSERT` | Audit log reads & append-only event inserts (`issued`, `retrieved`, `revoked`, `reissued`) | **Yes** | Necessary runtime scope | **Retain** | None | N/A |
| `certificate_events` | `UPDATE` | None (`certificate_events` is an append-only audit ledger; migration explicitly omitted `UPDATE`) | **No** | Tampering with historical certificate audit trail | **Revoke** | Zero runtime impact | Single `GRANT` transaction |
| `certificate_events` | `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` | None (audit records must never be deleted or truncated) | **No** | Erasure of compliance/revocation audit trail | **Revoke** | Zero runtime impact | Single `GRANT` transaction |

- **Executed Approval-Only SQL:** `production_certificate_least_privilege_service_role.sql`
- **SHA-256:** `02D7EEC82EFE595A6AD8C1379F8C1EB7303FFAE80E19498E447DF043A4FBBE11`
- **Status:** `COMPLETE AND VERIFIED` (19 November 2026, `12:51Z`–`12:53Z`, executed on confirmed Production project `fkltvxhqizqrbvogodxv` after explicit owner approval).
- **Directly Verified Post-Execution `has_table_privilege('service_role', ...)` Matrix:**
  - `certificate_events`: `SELECT=true`, `INSERT=true`, `UPDATE=false`, `DELETE=false`, `TRUNCATE=false`, `REFERENCES=false`, `TRIGGER=false`
  - `course_completion_records`: `SELECT=true`, `INSERT=true`, `UPDATE=true`, `DELETE=false`, `TRUNCATE=false`, `REFERENCES=false`, `TRIGGER=false`
  - `issued_certificates`: `SELECT=true`, `INSERT=true`, `UPDATE=true`, `DELETE=false`, `TRUNCATE=false`, `REFERENCES=false`, `TRIGGER=false`
  - `project_submissions`: `SELECT=true`, `INSERT=true`, `UPDATE=true`, `DELETE=false`, `TRUNCATE=false`, `REFERENCES=false`, `TRIGGER=false`

---

## 5. Gate 6 — Super Admin & Mandatory TOTP MFA Provisioning Procedure

- **Architecture Verification (`COMPLETE AND VERIFIED` locally, 19 November 2026):**
  - Trusted role source: `auth.users.raw_app_meta_data.role = 'super_admin'` (paired with `ADMIN_EMAIL` match in `api/auth.js` lines 1580–1588 and `verifyCertificateAdmin` lines 403–406). `user_metadata` is strictly ignored; zero references to `public.admin_users` or `public.profiles`.
  - Database authorization function: `public.is_super_admin()` in `supabase_rls_hardening.sql` queries live `auth.users.raw_app_meta_data->>'role' = 'super_admin'`.
  - Compulsory TOTP MFA: `api/auth.js` lines 1600–1666 block Super Admin login with HTTP 403 (`mfaSetupRequired: true`) if no verified `totp` factor exists, issue a single-use non-replayable `mfa_challenge` ticket (`jti` tracked in `consumedMfaTickets`), verify the TOTP code via Supabase `/auth/v1/factors/:id/verify`, and set `mfaVerified: true` in the signed HMAC session token (`AUTH_SECRET`).
  - Live role revocation: Every privileged endpoint (`verify`, `admin_operation`, `cleanup_rate_limits`, `verifyCertificateAdmin`, `api/payment.js` admin actions) checks `/auth/v1/admin/users/:id` or `/auth/v1/user` in real time.
  - Non-blocking technical note: `api/auth.js` line 1682 stores the initial `authData.access_token` (`aal1`) in `sessionPayload.sbToken` rather than the upgraded `aal2` token returned by `/factors/:id/verify`. This is safe under the current architecture because all server-side database and storage mutations execute via `SUPABASE_SERVICE_ROLE_KEY` after verifying `payload.mfaVerified === true`, and `sbToken` is used only for `/auth/v1/user` and `/auth/v1/logout`. If any future code passes `sbToken` directly to an `aal2`-gated RLS policy, upgrade `sbToken` to `verifyData.access_token`.
- **Production Provisioning Status:** `READY FOR OWNER APPROVAL` (NOT executed).

### Controlled Owner Provisioning & Verification Procedure (Execute Only After Explicit Approval)
1. **Confirm Administrator Identity:** Owner explicitly approves the exact Production Super Admin email (expected: `greachimpact@gmail.com` matching Vercel `ADMIN_EMAIL`).
2. **Create Auth User (No Passwords in Chat):** Create the user directly in Production Supabase Dashboard (`fkltvxhqizqrbvogodxv` -> Authentication -> Users) with a unique, high-entropy password generated directly in the owner's password manager.
3. **Assign Trusted Server-Controlled Role:** Set `raw_app_meta_data = '{"role": "super_admin"}'` on that user via Supabase Admin API or SQL Editor (never via `user_metadata`).
4. **Complete Compulsory TOTP Enrollment:** Owner signs in personally at `/admin.html`, receives the mandatory MFA setup prompt, scans the TOTP QR into an authenticator app, enters the 6-digit code personally, and stores recovery/backup access securely.
5. **Verify Enforcement:** Confirm (a) sign-in without TOTP is rejected, (b) sign-in with valid TOTP issues a verified `super_admin` session, (c) unauthenticated or non-super-admin callers receive HTTP 401/403 on admin/certificate/payment endpoints, and (d) temporarily demoting or testing a revoked role immediately blocks privileged API calls on the next request.
6. **Recovery Procedure:** If the TOTP device is lost, the verified project owner uses the Supabase Dashboard (`fkltvxhqizqrbvogodxv` -> Authentication -> Users) to unenroll the lost TOTP factor and immediately re-enrolls a new TOTP factor upon next login (forced automatically by `mfaSetupRequired: true`).
