# Phase 1 release-readiness matrix

| Area | Status | Evidence / remaining gate |
|---|---|---|
| Registration and payment | PASS locally | Active registration uses `/api/payment`; local pricing/receipt tests pass. No production payment was created. |
| Currency and immutable order pricing | PASS locally | NGN master price, foreign-currency freshness/fail-closed paths and snapshots covered by local suite. |
| Authentication and entitlements | PASS locally, live pending | Gate 2E.10 local security suite passes; production role/MFA and environment remain unverified. |
| Certificate central registry | NOT READY | Local workflow and additive SQL are implemented. Owner-supplied read-only schema results confirm the base key columns, legacy schema fields, and no current completion/audit tables; counts show zero existing submissions/certificates. Migration remains unexecuted and no database integration test has run. Authenticated has TRUNCATE on certificate/submission tables; separate privilege remediation is pending. |
| Instructor review | IMPLEMENTED LOCALLY; LIVE PENDING | New signed Super Admin/TOTP review console calls server review RPC, records notes/date/reviewer, and rejects student authorization. Actual DB workflow awaits migration and schema validation. |
| Certificate QR/PDF | IMPLEMENTED; QR INTEROP VERIFIED LOCALLY; LIVE DOMAIN PENDING | Server generates PDF with an embedded Version 5-L QR after owner/completion checks. Isolated ZXing 0.21.3 decoded QR vector marks from the PDF to the expected central verification URL; production Vercel domain is not confirmed. |
| Staging incident | PENDING OWNER | Auth/database rotations, session invalidation, and narrow log review not evidenced. |
| Production Storage | PENDING OWNER | Approved read-only inspection not evidenced; no SQL run by Codex. |
| Vercel Production configuration | PENDING OWNER | Project, domain, variable scopes, Supabase association, callbacks not independently verified. |
| V1.2 migration | OWNER-REPORTED COMPLETE | No execution report located; do not rerun. Current live schema unverified. |
| Project cleanup | COMPLETE CONSERVATIVELY | 1,084 files and 312 directories inventoried. No whole file met safe-delete evidence threshold; obsolete browser certificate methods were removed. Historical, backup, migration, and uncertain files retained. |
| Release manifest / Git candidate | NOT FROZEN | Refreshed manifest: 62 included, 5 removed, 102 excluded; SHA-256 `3904AF69AB6EA9B77FEE769A4C4AD6CDC5978B12C1D55837143612C9C81E885E`. Corrected provisional plan separates 30 deployment paths, 17 Git-only paths, and five deletion records; owner review remains. No Git mutation performed. |
| Deployment and post-deployment checks | NOT AUTHORIZED / PENDING | Separate explicit approval required after all blockers and evidence are resolved. |

**Overall status: NOT READY.** Critical certificate database dependency and owner-run evidence gates remain open.

## 13 November 2026 schema evidence update

Owner-supplied read-only catalog and aggregate results now confirm the certificate migration's referenced primary keys and show no existing completion/audit tables. The current dataset has six course rows (maximum ID length 15), zero submissions, and zero issued certificates, so the candidate's legacy data updates affect no current rows. The migration and database integration remain unverified. The separate `authenticated` TRUNCATE grant finding remains unresolved and requires separately authorized remediation. Overall release status remains NOT READY.

## Privilege remediation result (13 November 2026)

Owner-provided verification shows `authenticated` no longer has effective TRUNCATE on `issued_certificates` or `project_submissions`. This closes that specific grant finding. Other table grants and certificate migration execution remain outstanding; overall status remains NOT READY.

## Certificate migration status update (13 November 2026)

Owner reports the production certificate registry migration completed successfully. Post-migration catalog verification and database integration checks remain pending, so the certificate workflow is not yet marked verified or release-ready. No previously passed local application test has been rerun.

## Post-migration verification update (13 November 2026)

Owner-supplied read-only verification confirms expected tables/columns/indexes, enabled RLS, and service-role-only certificate RPC execution. No PUBLIC, anon, or authenticated table grants appear. Database integration tests remain pending. Effective service_role table grants are broader than the migration's explicit grants and need a least-privilege review; overall release status remains NOT READY.
