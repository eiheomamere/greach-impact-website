# Phase 1 project cleanup report

Reviewed locally on 12 November 2026. The filesystem inventory traversed **1,084 files and 312 directories**, including `.git` metadata. The inventory included file paths and metadata; source/dependency review used repository-wide reference searches and targeted reads. Secret and backup contents were not opened. No Git history, staging, commit, merge, tag, push, or environment was changed.

## Result

No whole file met the Category A safe-to-delete standard after dependency and recovery checks. No files were deleted in this cleanup pass. Several obsolete local certificate methods were removed from both active GreachDB mirrors after their callers were moved to the central server workflow. Browser-local historical certificate data was not erased.

## Candidate classifications

| Candidate | Category | Evidence and decision |
|---|---|---|
| `api/register.js` | C — retain for audit | `.vercelignore` excludes `/api/register.js`; active registration posts to `/api/payment`; no active page/API references it. Historical `test_security.js` imports it. Keep the old handler/test context as audit evidence and to avoid breaking the historical test; do not deploy it. |
| `api/verify-cert.js` | B — replacement in place; retain as retired shim | It returns a retired endpoint response; public verification now uses `/api/auth` registry RPC. Historical tests/reports reference the shim, and the explicit retired route prevents old links from falsely verifying identifiers. |
| Local certificate methods in `js/greach-db.js` and `classroom/js/greach-db.js` | B — replaced, obsolete methods removed | Methods `claimCertificate`, `getAllCertificates`, `verifyCertificate`, `getCertificateByEmail`, `allowCertificateReissue`, `deleteCertificate`, and their empty-store initialization had no runtime callers outside the admin UI. Admin views now use protected central registry APIs, and both student-facing entry points use central workflows. Old browser storage is retained but is no longer trusted or cleared. |
| Root and classroom GreachDB/Brevo/sync mirrors | D — keep | Each pair has identical SHA-256 at inventory time. Root pages and classroom pages resolve relative assets from different directories; removing either copy would break consumers. |
| Migration SQL, including V1.1 and V1.2 | C — retain | These files document migration history, compatibility, and recovery. V1.2 must not be rerun. The new certificate SQL is a review artifact and remains unexecuted. |
| Gate/Phase reports and execution register | C — retain | They contain historical execution, security, approval, incident, and rollback context. Consolidated Phase 1 documents are updated without deleting prior evidence. |
| `scripts/` tests, migration runners, backup/restore and audit tools | D/C — retain | They are not invoked by a package script (no `package.json` is present), but many support explicit test, incident, migration, backup, or restore procedures. Filenames and modification times do not prove they are unused; broad deletion is unsafe. Live scripts remain excluded from deployment. |
| `backups/`, `.env*`, Supabase config, student/roster data | C — retain/protect | Sensitive operational or recovery material. Contents were not reviewed in this cleanup, not included in the deployment manifest, and not deleted. Do not restore removed student roster/archive files. |
| Similar classroom/course HTML files and workbooks | D — keep | They are directly linked from classroom navigation or represent distinct courses/materials; apparent similarity is not proof of duplication. |

## Dependency checks performed

- Enumerated repository paths and searched HTML, JavaScript, API, scripts, tests, config, and reports for candidate route/method references.
- Confirmed the payment registration flow and the excluded legacy registration route references in the local integration checks.
- Confirmed the identical hashes of the three root/classroom JavaScript mirrors.
- Checked current `vercel.json` routing and `.vercelignore` deployment exclusions.
- Reviewed the certificate vault callers before replacing browser-local reads and actions with the protected registry endpoint and review console.
- Kept migration, backup/recovery, incident, and historical test material when operational or audit dependence remained possible.

## Sensitive history and remaining cleanup

Prior reports identify an exposed staging credential in historical Git content. Deleting the current working copy would not remove that history; history rewriting is not authorized. The five already-removed archive/roster paths remain deleted in the worktree and must not be restored. The `backups/` directory and environment/credential files were not opened, hashed, or altered. No candidate cleanup beyond the changes listed above is proven safe; retain uncertain files until a maintainer confirms ownership and use.
