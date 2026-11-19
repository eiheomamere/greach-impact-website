# Greach Impact Academy — Final Phase 1 Git Release Plan

**Updated:** 19 November 2026  
**Status:** `READY FOR OWNER APPROVAL` (Provisional Freeze — **NOT staged, committed, merged, tagged, or pushed**)  
**Authorization Boundary:** Zero Git mutations were executed during preparation. Every command below requires explicit owner approval after Gates 1–4 and Gate 6 clear.

---

## 1. Verified Git Baseline (19 November 2026)

- **Repository:** `C:/Users/EIheoma/Desktop/greach-impact-complete-registration-deploy`
- **Remote `origin`:** `https://github.com/eiheomamere/greach-impact-website.git`
- **Current Branch:** `feature/phase1-improvements`
- **Current `HEAD`:** `0d3548b816be8c282866d143e90accb547203932`
- **Current `main`:** `0250c92530203703eb8e5157e96a21c09f4b9274` (13 commits ahead, 0 behind)
- **Existing Git Tags:** `(none)`
- **Staged Index Count:** `0`
- **Target Release Strategy:** Non-fast-forward merge (`git merge --no-ff`) into `main`, annotated tag `v1.2.0-phase1`

---

## 2. Local Defect Corrected Prior to Freeze (19 November 2026)

- **Finding:** Uncatalogued root file `debug.log` (264-byte Windows Chrome Crashpad error log from 12 Nov 2026) was not matched by `.vercelignore`.
- **Correction Applied:** Added `*.log`, `**/*.log`, and explicit `images/raw_backup/` to `.vercelignore`.
- **Updated `.vercelignore` SHA-256:** `43CDD6511ECF76FEE06D27978FF059C342E95FAD988354764CD124D87F732209` (replaces prior `B4AFBC87...` recorded on 12 Nov 2026).
- **Verified Safety:** `0` of the 62 Included deployment files are accidentally matched by `.vercelignore`, and `0` excluded files (SQL, scripts, tests, logs, rosters, backups, internal Phase 1/2 reports, `api/register.js`) are exposed to Vercel.

---

## 3. Frozen Release Candidate Scope

*(Full `62` Included deployment files with live SHA-256 hashes, `5` Removed paths, and `115` Excluded paths = `182` total entries with `0` unexcluded leaks are catalogued in `PHASE1_FINAL_RELEASE_MANIFEST.csv`, SHA-256 `A188C064A5246EB8466700AA427FFC467A848C4237917568982A190CCC95EC8D`.)*

### 3.1 Deployment Paths to Stage (30 Changed/Added Paths vs. `main`)
1. `.vercelignore` (**Added** — SHA-256 `43CDD6511ECF76FEE06D27978FF059C342E95FAD988354764CD124D87F732209`)
2. `admin.html` (**Modified**)
3. `api/auth.js` (**Modified**)
4. `api/brevo.js` (**Modified**)
5. `api/payment.js` (**Added**)
6. `api/site-data.js` (**Modified**)
7. `api/students.js` (**Modified**)
8. `api/verify-cert.js` (**Modified**)
9. `classroom/certificate-review.html` (**Added**)
10. `classroom/claim-certificate.html` (**Modified**)
11. `classroom/Excel Class.html` (**Modified**)
12. `classroom/Excel_Dashboard_Hub.html` (**Modified**)
13. `classroom/Excel_Master_Course_Hub.html` (**Modified**)
14. `classroom/index.html` (**Modified**)
15. `classroom/js/greach-brevo.js` (**Modified**)
16. `classroom/js/greach-db.js` (**Modified**)
17. `classroom/Master_Excel_Course_Exercises.xlsx` (**Modified**)
18. `classroom/Master_Excel_Practice_Workbook.xlsx` (**Modified**)
19. `classroom/PowerBI_Master_Course_Hub.html` (**Modified**)
20. `classroom/SQL_Master_Course_Hub.html` (**Modified**)
21. `classroom/START_HERE.html` (**Modified**)
22. `classroom/STUDENT_JOIN_GUIDE.html` (**Modified**)
23. `classroom/verify-certificate.html` (**Modified**)
24. `js/greach-brevo.js` (**Modified**)
25. `js/greach-db.js` (**Modified**)
26. `portfolio.html` (**Modified**)
27. `registration.html` (**Modified**)
28. `registration-confirmation.html` (**Modified**)
29. `registration-confirmation/index.html` (**Modified**)
30. `site-data.json` (**Modified**)

### 3.2 Git-Only Engineering, SQL & Release Audit Artifacts (26 Paths — All Excluded From Vercel by `.vercelignore`)
1. `.gitignore` (**Modified**)
2. `production_certificate_registry_migration.sql` (**Added** — executed & catalog-verified 13 Nov 2026)
3. `production_revoke_authenticated_truncate.sql` (**Added** — executed & verified 13 Nov 2026)
4. `production_certificate_least_privilege_service_role.sql` (**Added** — prepared for owner approval, NOT executed)
5. `PHASE1_CERTIFICATE_SCHEMA_INSPECTION.sql` (**Added**)
6. `PHASE1_CERTIFICATE_SCHEMA_INSPECTION_SUPPLEMENT.sql` (**Added**)
7. `GATE_2E_7_storage_inspection.sql` (**Added** — approved read-only Storage SQL)
8. `GATE_2E_7_storage_create_only.sql` (**Added** — approval-only creation proposal)
9. `scripts/test_payment_pricing_local.js` (**Added**)
10. `scripts/test_gate2e6_local_auth.js` (**Added**)
11. `scripts/check_frontend_release.js` (**Added**)
12. `scripts/test_certificate_workflow_local.js` (**Added**)
13. `PHASE1_COMPLETION_REPORT.md` (**Added**)
14. `PHASE1_FINAL_COMPLETION_REPORT.md` (**Added**)
15. `PHASE1_OWNER_EVIDENCE_CHECKLIST.md` (**Added**)
16. `PHASE1_RELEASE_READINESS_MATRIX.md` (**Added**)
17. `PHASE1_FINAL_RELEASE_READINESS_MATRIX.md` (**Added**)
18. `PHASE1_GIT_COMMIT_PLAN.md` (**Added**)
19. `PHASE1_FINAL_GIT_RELEASE_PLAN.md` (**Added**)
20. `PHASE1_EXECUTION_APPROVAL_REGISTER.md` (**Added**)
21. `PHASE1_RELEASE_MANIFEST.csv` (**Added**)
22. `PHASE1_FINAL_RELEASE_MANIFEST.csv` (**Added**)
23. `PHASE1_SECURITY_AND_INCIDENT_CLOSURE_REPORT.md` (**Added**)
24. `PHASE1_CERTIFICATE_MIGRATION_REVIEW.md` (**Added**)
25. `PHASE1_PROJECT_CLEANUP_REPORT.md` (**Added**)
26. `PHASE1_VERIFICATION_REGISTER.md` (**Added**)
27. `PHASE1_COMPLETION_AND_PHASE2_HANDOVER.md` (**Added**)

*(Note: 27 Git-only paths total when counting all listed audit/SQL records above; every single path is verified excluded by `.vercelignore`.)*

### 3.3 Approved Deletion Records (5 Paths — Zero Contents Re-Added)
1. `DELETE classroom/Excel_Masterclass_Complete_300_Student_Pack.zip`
2. `DELETE classroom/google_apps_script_db.js`
3. `DELETE classroom/GOOGLE_SHEETS_DATABASE_SETUP.md`
4. `DELETE classroom/Student_Login_Credentials_300_Roster.csv`
5. `DELETE classroom/Student_Login_Credentials_300_Roster.xlsx`

*(Historical Git objects remain untouched; history rewriting is NOT authorized.)*

### 3.4 Explicit Exclusions (Must NOT Be Staged or Deployed)
- `.env*` (including `.env.staging` and `.env.example`)
- `debug.log`
- `backups/` and `images/raw_backup/`
- `classroom/README.md` (historical credential context)
- `api/register.js` (retired legacy route; excluded from Vercel; active registration posts to `/api/payment`)
- `test_security.js`, `test_all_features.js`, `test_student_presence_and_rbac.js`, `test_phase1_application_integration.js`
- `PHASE2_EXECUTION_ROADMAP.md` and `PHASE2_READINESS_SUMMARY.md` (isolated Phase 2 planning)
- Historical `GATE_2E_*.md`, `PHASE_E_*.md`, prior V1.1/V1.2/combined SQL files, and legacy staging test/backup runners not explicitly listed in Section 3.2.

---

## 4. Exact Approval-Gated Git Commands (DO NOT RUN WITHOUT EXPLICIT OWNER APPROVAL)

```powershell
Set-Location "C:/Users/EIheoma/Desktop/greach-impact-complete-registration-deploy"

# 1. Verify branch and clean staging index
git checkout feature/phase1-improvements
git status --short

# 2. Stage the 30 deployment paths explicitly
git add -- `
  .vercelignore admin.html api/auth.js api/brevo.js api/payment.js api/site-data.js `
  api/students.js api/verify-cert.js classroom/certificate-review.html `
  classroom/claim-certificate.html "classroom/Excel Class.html" `
  classroom/Excel_Dashboard_Hub.html classroom/Excel_Master_Course_Hub.html `
  classroom/index.html classroom/js/greach-brevo.js classroom/js/greach-db.js `
  classroom/Master_Excel_Course_Exercises.xlsx classroom/Master_Excel_Practice_Workbook.xlsx `
  classroom/PowerBI_Master_Course_Hub.html classroom/SQL_Master_Course_Hub.html `
  classroom/START_HERE.html classroom/STUDENT_JOIN_GUIDE.html `
  classroom/verify-certificate.html js/greach-brevo.js js/greach-db.js `
  portfolio.html registration.html registration-confirmation.html `
  registration-confirmation/index.html site-data.json

# 3. Stage the 27 Git-only engineering/SQL/audit artifacts explicitly
git add -- `
  .gitignore production_certificate_registry_migration.sql `
  production_revoke_authenticated_truncate.sql `
  production_certificate_least_privilege_service_role.sql `
  PHASE1_CERTIFICATE_SCHEMA_INSPECTION.sql PHASE1_CERTIFICATE_SCHEMA_INSPECTION_SUPPLEMENT.sql `
  GATE_2E_7_storage_inspection.sql GATE_2E_7_storage_create_only.sql `
  scripts/test_payment_pricing_local.js scripts/test_gate2e6_local_auth.js `
  scripts/check_frontend_release.js scripts/test_certificate_workflow_local.js `
  PHASE1_COMPLETION_REPORT.md PHASE1_FINAL_COMPLETION_REPORT.md `
  PHASE1_OWNER_EVIDENCE_CHECKLIST.md PHASE1_RELEASE_READINESS_MATRIX.md `
  PHASE1_FINAL_RELEASE_READINESS_MATRIX.md PHASE1_GIT_COMMIT_PLAN.md `
  PHASE1_FINAL_GIT_RELEASE_PLAN.md PHASE1_EXECUTION_APPROVAL_REGISTER.md `
  PHASE1_RELEASE_MANIFEST.csv PHASE1_FINAL_RELEASE_MANIFEST.csv `
  PHASE1_SECURITY_AND_INCIDENT_CLOSURE_REPORT.md PHASE1_CERTIFICATE_MIGRATION_REVIEW.md `
  PHASE1_PROJECT_CLEANUP_REPORT.md PHASE1_VERIFICATION_REGISTER.md `
  PHASE1_COMPLETION_AND_PHASE2_HANDOVER.md

# 4. Stage ONLY the 5 approved deletion records
git add --update -- `
  classroom/Excel_Masterclass_Complete_300_Student_Pack.zip `
  classroom/google_apps_script_db.js `
  classroom/GOOGLE_SHEETS_DATABASE_SETUP.md `
  classroom/Student_Login_Credentials_300_Roster.csv `
  classroom/Student_Login_Credentials_300_Roster.xlsx

# 5. Inspect staged diff before committing (confirm 0 secrets, exact path set)
git diff --cached --name-status
node scripts/scan_secrets.js

# 6. Commit on feature branch
git commit -m "feat: complete Phase 1 release candidate"

# 7. Merge into main (--no-ff), tag v1.2.0-phase1, and push ONLY after separate approval
git checkout main
git merge --no-ff feature/phase1-improvements -m "Release v1.2.0-phase1: Greach Impact Academy Phase 1 Production Release"
git tag -a v1.2.0-phase1 -m "Greach Impact Academy Phase 1 Production Release (V1.2 + Certificate Registry)"
git push origin feature/phase1-improvements
git push origin main --follow-tags
```

*(Before step 7 `git checkout main`, ensure any remaining unstaged modifications in excluded files such as `test_security.js` or `classroom/README.md` are safely preserved via `git stash push -m "preserve-excluded-local-edits"` and restored afterward without overwriting anything.)*

---

## 5. Rollback Procedure & Schema Compatibility Assessment (Verified 19 November 2026)

- **Critical Compatibility Finding Against Legacy Deployment `2eatqEussFBzxweSGvnbNCMUw5GH` (`main` `0250c925`):**
  - Direct inspection of `main` (`0250c925`) confirms it is **NOT schema-compatible** with the hardened Production database (`fkltvxhqizqrbvogodxv`) and would introduce security regressions if rolled back to blindly:
    1. `main:api/payment.js` **does not exist** (manual bank transfer checkout would return HTTP 404).
    2. `main:api/site-data.js` attempts `anon`-key writes, which are **blocked by hardened RLS**.
    3. `main` does not support the central certificate registry RPCs (`verify_certificate` is `service_role`-only and `anon`/`authenticated` have zero table grants on `issued_certificates`/`project_submissions`).
    4. `main` has **no `.vercelignore`**, so rolling back to `0250c925` would **re-expose** legacy static files (`test_security.js`, `Student_Login_Credentials_300_Roster.csv`, SQL files).
- **Recommended Safe Rollback / Recovery Strategy:**
  1. **Primary Recovery (Forward Fix):** If a post-deployment defect occurs after Phase 1 goes live, deploy a targeted forward fix on `main` (preserving `.vercelignore` and hardened schema compatibility) rather than blindly promoting legacy `0250c925`.
  2. **Emergency Static-Only Fallback (Last Resort Only):** Promote `2eatqEussFBzxweSGvnbNCMUw5GH` **only** if a total site outage requires static marketing pages immediately, while acknowledging dynamic payment/certificate/admin APIs will fail and legacy static exposure must be immediately mitigated by a forward deployment.
  3. **Source Rollback (Once Post-Phase-1 Commits Exist):** Use a normal `git revert -m 1 <commit-sha>` after explicit owner approval; never rewrite Git history (`git push --force` is forbidden).
  4. **Database Boundary:** Never rerun or reverse V1.2 (`production_manual_payment_currency_migration_v1_2.sql`) or `production_certificate_registry_migration.sql` as a rollback method. Use forward-only SQL fixes after schema/data review.
