# Corrected Phase 1 Git commit plan

Status: PROVISIONAL and not approved. No Git changes have been staged or executed.

## Baseline

- Branch: `feature/phase1-improvements` at `0d3548b816be8c282866d143e90accb547203932`.
- `main`: `0250c92530203703eb8e5157e96a21c09f4b9274`; divergence remains 13 ahead / 0 behind.
- Current worktree: 32 modified, 5 deleted, 85 untracked, 0 staged.
- The earlier 42-path plan was invalid: it listed five removed archive/roster paths as additions. This corrected plan separates application paths, engineering/audit artifacts, and deletion records.

## Deployment files proposed

Only changed manifest-Included application paths versus `main`, plus the three new deployment files below. `.vercelignore` excludes Phase 1 and Phase 2 internal documents, tests/scripts, SQL, and sensitive operational material from Vercel deployment.
- `.vercelignore` — **Added**; exclude secrets, Phase 1/2 internal reports, migrations, tests, and rosters from deployment.
- `admin.html` — **Modified**; reviewed Phase 1 application or site content change.
- `api/auth.js` — **Modified**; reviewed Phase 1 application or site content change.
- `api/brevo.js` — **Modified**; server-backed payment, enrollment, or notification release path.
- `api/payment.js` — **Added**; server-backed payment, enrollment, or notification release path.
- `api/site-data.js` — **Modified**; server-backed payment, enrollment, or notification release path.
- `api/students.js` — **Modified**; server-backed payment, enrollment, or notification release path.
- `api/verify-cert.js` — **Modified**; central certificate review, verification, or retrieval workflow.
- `classroom/certificate-review.html` — **Added**; central certificate review, verification, or retrieval workflow.
- `classroom/claim-certificate.html` — **Modified**; central certificate review, verification, or retrieval workflow.
- `classroom/Excel Class.html` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/Excel_Dashboard_Hub.html` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/Excel_Master_Course_Hub.html` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/index.html` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/js/greach-brevo.js` — **Modified**; server-backed payment, enrollment, or notification release path.
- `classroom/js/greach-db.js` — **Modified**; remove browser-side certificate authority and route callers to server workflows.
- `classroom/Master_Excel_Course_Exercises.xlsx` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/Master_Excel_Practice_Workbook.xlsx` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/PowerBI_Master_Course_Hub.html` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/SQL_Master_Course_Hub.html` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/START_HERE.html` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/STUDENT_JOIN_GUIDE.html` — **Modified**; course access, completion messaging, or updated classroom material.
- `classroom/verify-certificate.html` — **Modified**; central certificate review, verification, or retrieval workflow.
- `js/greach-brevo.js` — **Modified**; server-backed payment, enrollment, or notification release path.
- `js/greach-db.js` — **Modified**; remove browser-side certificate authority and route callers to server workflows.
- `portfolio.html` — **Modified**; reviewed Phase 1 application or site content change.
- `registration.html` — **Modified**; server-backed payment, enrollment, or notification release path.
- `registration-confirmation.html` — **Modified**; server-backed payment, enrollment, or notification release path.
- `registration-confirmation/index.html` — **Modified**; server-backed payment, enrollment, or notification release path.
- `site-data.json` — **Modified**; server-backed payment, enrollment, or notification release path.

## Git-only engineering and audit artifacts proposed

These are source/review records only; they are excluded from the Vercel deployment package. The certificate SQL remains unexecuted and is included only as a reviewable migration artifact.
- `production_certificate_registry_migration.sql` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_CERTIFICATE_SCHEMA_INSPECTION.sql` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `scripts/test_payment_pricing_local.js` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `scripts/test_gate2e6_local_auth.js` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `scripts/check_frontend_release.js` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `scripts/test_certificate_workflow_local.js` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `.gitignore` — **Modified**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_COMPLETION_REPORT.md` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_OWNER_EVIDENCE_CHECKLIST.md` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_RELEASE_READINESS_MATRIX.md` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_GIT_COMMIT_PLAN.md` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_EXECUTION_APPROVAL_REGISTER.md` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_RELEASE_MANIFEST.csv` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_CERTIFICATE_MIGRATION_REVIEW.md` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_PROJECT_CLEANUP_REPORT.md` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_VERIFICATION_REGISTER.md` — **Added**; review, verification, migration, or release record; excluded from Vercel.
- `PHASE1_COMPLETION_AND_PHASE2_HANDOVER.md` — **Added**; consolidated Phase 1 evidence and Phase 2 starting plan; excluded from Vercel.

## Deletion records

Git diff shows these five paths as deletions relative to the current checked-out tree. No file contents are to be re-added. If this release includes the approved deletions, Git must record deletion entries for exactly these paths:
- DELETE `classroom/Excel_Masterclass_Complete_300_Student_Pack.zip` — **Deleted**; approved roster/archive or obsolete Google Sheets artifact; no contents re-added.
- DELETE `classroom/google_apps_script_db.js` — **Deleted**; approved roster/archive or obsolete Google Sheets artifact; no contents re-added.
- DELETE `classroom/GOOGLE_SHEETS_DATABASE_SETUP.md` — **Deleted**; approved roster/archive or obsolete Google Sheets artifact; no contents re-added.
- DELETE `classroom/Student_Login_Credentials_300_Roster.csv` — **Deleted**; approved roster/archive or obsolete Google Sheets artifact; no contents re-added.
- DELETE `classroom/Student_Login_Credentials_300_Roster.xlsx` — **Deleted**; approved roster/archive or obsolete Google Sheets artifact; no contents re-added.

The three student archive/roster paths are not additions and their contents must not enter the package. The roster/archive paths remain in historical Git objects; history rewriting is not authorized.

## Explicit exclusions

Do not include `.env.example` or any `.env*` file; `classroom/README.md` (excluded internal document with historical credential context); `api/register.js`; `test_security.js`, `test_all_features.js`, `test_student_presence_and_rbac.js`, or `test_phase1_application_integration.js` until separately reviewed; old production/staging migration runners and backups; `production_combined_migration.sql` and prior V1.1/V1.2 SQL; Gate/Phase historical reports; backup/seed/audit utilities; or any Phase 2 file, including `PHASE2_EXECUTION_ROADMAP.md`, or any other modified/untracked file not listed above. `api/register.js` remains excluded from Vercel and active registration uses `/api/payment`.

## Approval-only commands (do not run now)

For a future approved release, stage only the exact paths above, with deletion records staged using `git add --update -- <five deletion paths>` and non-deletion paths staged explicitly. Review the staged diff against this plan before committing. Proposed commit message: `feat: complete Phase 1 release candidate`. Any merge to `main`, `--no-ff` strategy, tag `v1.2.0-phase1`, push target, and deployment require separate explicit approval. No remote target is confirmed.

## Rollback

Restore the exact last known-good Vercel deployment if post-deployment checks fail. If source rollback is needed, prepare a normal revert for separate approval; do not rewrite history. Do not rerun or reverse V1.2. Verify compatibility against the actual post-V1.2 schema first.
