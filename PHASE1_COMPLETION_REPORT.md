# Phase 1 completion and release-readiness report

Updated 12 November 2026 from the current local worktree. No production or staging connection, database execution, Git mutation, deployment, credential change, or provisioning was performed.

## Decision: NOT READY

The release is not ready because the central certificate migration has not been applied or validated against the owner-reported V1.2 production schema. Required live evidence for the staging incident, production Storage, Vercel Production configuration, Super Admin/MFA readiness, and deployment target is also pending. Certificate API/UI code now uses server checks and a central registry design, but the SQL migration remains unexecuted and no database integration test has run. Thus the certificate completion gate is not cleared.

## Local work and evidence

- The additive `production_certificate_registry_migration.sql` prepares course completion, registry lifecycle, audit events, restricted grants, issuance/revocation/reissue RPCs, and a registry-backed verifier. It was not executed.
- `api/auth.js` has server-side project submission, authenticated student retrieval and issuance, verified Super Admin/TOTP review and lifecycle operations, admin registry listing, rate-limited public lookup, and an owner-authenticated PDF download endpoint. The student portal uses the signed bearer stored in `sessionStorage`; browser lesson progress and payment are not accepted as completion evidence.
- A dedicated central instructor console uses the current signed Super Admin/TOTP session to load server submissions, open HTTPS evidence, record review notes/date, approve/reject through the RPC, and revoke/reissue certificates. Admin registry rows no longer use browser-local certificate data. Old browser-only certificate methods were removed; existing local-storage records were not erased.
- PDF bytes are generated server-side only after owner and completion checks and include a QR matrix pointing to the public registry URL. Public verification displays valid, revoked, reissued, and unverified states. A temporary isolated ZXing 0.21.3 decoder independently decoded the QR vector marks parsed from a generated PDF; payload matched the central verification page and synthetic certificate reference. The live configured production domain remains unverified.
- Existing course completion tracking is browser-local and cannot establish actual completion. The prepared process requires an instructor to review the HTTPS capstone evidence and confirm completion against the existing requirements. That is a new trusted review record, not proof inferred from existing browser checks.
- Previously successful payment, Gate 2E.10, frontend, and syntax checks are retained for their tested snapshot and were not repeated. New targeted `scripts/test_certificate_workflow_local.js` passes for issuance gating, admin MFA authorization, submission review, ownership, registry listing, forged/revoked public references, audit calls, PDF output, QR matrix constraints, and relevant inline-script parsing. `api/auth.js` syntax and `git diff --check` pass after the current edits. Node emits the existing module-type warning. No live-service or database integration test was run.
- `api/register.js` remains excluded from Vercel; active registration submits to `/api/payment`, and the local payment suite checks the active route.

## Release baseline and limitations

Branch `feature/phase1-improvements`, HEAD `0d3548b816be8c282866d143e90accb547203932`; `main` `0250c92530203703eb8e5157e96a21c09f4b9274`; branch is 13 commits ahead, 0 behind. Worktree at current inspection: 32 modified, 5 deleted, 85 untracked, 0 staged; this includes unrelated/unreviewed artifacts, so the release candidate is not frozen. Five tracked deletions include three roster/archive items, which remain in Git history. The current manifest lists 62 included, 5 removed, 102 excluded; SHA-256 `3904AF69AB6EA9B77FEE769A4C4AD6CDC5978B12C1D55837143612C9C81E885E`. The corrected provisional Git plan has 30 deployment and 17 Git-only paths plus five deletion records. `.vercelignore` excludes environment files, SQL, reports, tests/scripts, rosters and `api/register.js`; it cannot erase history or already deployed files.

The owner reports V1.2 production migration complete; no V1.2 execution report was located. The checked-in V1.2 SQL adds order and email-notification structures, not certificate schema; actual production state remains unverified. Do not rerun V1.2. The certificate migration now has a detailed local review and separate SELECT-only schema-inspection SQL, which requires separate owner approval because it is outside the approved Storage query set. Staging incident remediation, production Storage inspection, Vercel inspection, Super Admin/MFA readiness, deployment and post-deployment checks remain owner-dependent.

The local project cleanup inventory counted 1,084 files and 312 directories including `.git`. No whole file was proven safe for deletion. Obsolete browser certificate methods were removed from both active GreachDB mirrors after replacing their callers; historical browser data and audit/recovery files were retained. See the cleanup report.

## Rollback

If a later approved deployment fails, restore the exact last known-good Vercel deployment through the dashboard. If source rollback is required, prepare a normal revert for separate approval; do not rewrite history. Do not rerun or reverse V1.2 routinely. Confirm schema compatibility and migration rollback constraints before release.
