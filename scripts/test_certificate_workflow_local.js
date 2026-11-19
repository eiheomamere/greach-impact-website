const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const secret = 'local-certificate-workflow-test-secret';
process.env.APP_ENV = 'test';
process.env.AUTH_SECRET = secret;
process.env.CRON_SECRET = 'local-only';
process.env.SUPABASE_URL = 'https://unit-test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'local-anon-placeholder';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-service-placeholder';
process.env.ADMIN_EMAIL = 'greachimpact@gmail.com';
process.env.ADMIN_USER = 'Greachimpact';
process.env.VERCEL_ENV = 'production';
process.env.VERCEL_PROJECT_PRODUCTION_URL = 'greachimpact.com';

const studentId = 'stu-local-1';
const adminId = '123e4567-e89b-12d3-a456-426614174000';
const certId = `GI-${'A'.repeat(32)}`;
const verificationUrl = `https://greachimpact.com/classroom/verify-certificate.html?id=${certId}`;
let activeScenario = '';
let captured = [];

function response(status, value, rawText) {
  return { ok: status >= 200 && status < 300, status, json: async () => value, text: async () => rawText ?? JSON.stringify(value) };
}

global.fetch = async (input, options = {}) => {
  const url = String(input);
  captured.push({ url, options });
  if (url.includes('/auth/v1/admin/users/')) return response(200, { id: adminId, email: process.env.ADMIN_EMAIL, app_metadata: { role: 'super_admin' } });
  if (url.includes('/rest/v1/auth_rate_limits')) return response(200, []);
  if (url.includes('/rest/v1/students?')) return response(200, [{ id: studentId, full_name: 'Local Student', registered_email: 'private@example.test', enrolled_course: 'Microsoft Excel for Beginners', status: 'Active', expires_at: null }]);
  if (url.includes('/rest/v1/access_codes?')) return response(200, [{ code: 'VALID123', course_name: 'Microsoft Excel for Beginners', is_active: true, is_session_pass: false, expires_at: null }]);
  if (url.includes('/rest/v1/course_prices?')) return response(200, [{ course_id: 'excel_beginners', course_name: 'Microsoft Excel for Beginners' }]);
  if (url.includes('/rest/v1/rpc/issue_course_certificate')) {
    if (activeScenario === 'completion_missing') return response(400, {}, 'Instructor-approved course completion is required.');
    if (activeScenario === 'revoked_issue') return response(403, {}, 'This completion has a revoked or replaced certificate.');
    return response(200, [{ certificate_id: certId, student_id: studentId, course_id: 'excel_beginners', course_name: 'Microsoft Excel for Beginners', issued_date: 'November 12, 2026', status: 'valid', verification_url: verificationUrl }]);
  }
  if (url.includes('/rest/v1/rpc/review_course_project')) return response(200, [{ submission_id: '223e4567-e89b-12d3-a456-426614174000', submission_status: 'approved', completion_id: '323e4567-e89b-12d3-a456-426614174000' }]);
  if (url.includes('/rest/v1/rpc/revoke_course_certificate')) return response(200, [{ certificate_id: certId, status: 'revoked' }]);
  if (url.includes('/rest/v1/rpc/reissue_course_certificate')) return response(200, [{ certificate_id: `GI-${'B'.repeat(32)}`, course_name: 'Microsoft Excel for Beginners', issued_date: 'November 12, 2026', status: 'valid', verification_url: `https://greachimpact.com/classroom/verify-certificate.html?id=GI-${'B'.repeat(32)}` }]);
  if (url.includes('/rest/v1/project_submissions?status=eq.pending_review')) return response(200, [{ id: '223e4567-e89b-12d3-a456-426614174000', student_id: studentId, project_url: 'https://evidence.example.test/file', submission_notes: 'Checked against course capstone requirements.' }]);
  if (url.includes('/rest/v1/issued_certificates?select=certificate_id')) return response(200, [{ certificate_id: certId, student_name: 'Local Student', course_name: 'Microsoft Excel for Beginners', issued_date: 'November 12, 2026', verification_url: verificationUrl, status: 'valid', completion_id: '323e4567-e89b-12d3-a456-426614174000' }]);
  if (url.includes('/rest/v1/issued_certificates?')) {
    if (url.includes('student_id=eq.other-student')) return response(200, []);
    if (options.method === 'POST') return response(201, [{ certificate_id: certId }]);
    if (activeScenario === 'list_owned') return response(200, [{ certificate_id: certId, student_id: studentId, course_id: 'excel_beginners', course_name: 'Microsoft Excel for Beginners', issued_date: 'November 12, 2026', verification_url: verificationUrl, status: 'valid', completion_id: '323e4567-e89b-12d3-a456-426614174000' }]);
    if (activeScenario === 'valid_pdf') return response(200, [{ certificate_id: certId, student_id: studentId, student_name: 'Local Student', course_id: 'excel_beginners', course_name: 'Microsoft Excel for Beginners', issued_date: 'November 12, 2026', verification_url: verificationUrl, completion_id: '323e4567-e89b-12d3-a456-426614174000' }]);
    return response(200, []);
  }
  if (url.includes('/rest/v1/course_completion_records?')) return response(200, [{ completion_date: '2026-11-11' }]);
  if (url.includes('/rest/v1/rpc/verify_certificate')) {
    if (activeScenario === 'forged') return response(200, []);
    const status = activeScenario === 'revoked' ? 'revoked' : 'valid';
    return response(200, [{ certificate_id: certId, student_name: 'Local Student', course_name: 'Microsoft Excel for Beginners', issued_date: 'November 12, 2026', course_completion_date: '2026-11-11', certificate_status: status, is_valid: status === 'valid' }]);
  }
  return response(200, []);
};

function token(payload) {
  const part = Buffer.from(JSON.stringify({ exp: Date.now() + 3600 * 1000, ...payload })).toString('base64url');
  return `${part}.${crypto.createHmac('sha256', secret).update(part).digest('base64url')}`;
}
const studentToken = token({ role: 'student', sub: studentId, accessType: 'access_code', accessCode: 'VALID123', course: 'Microsoft Excel for Beginners' });
const adminToken = token({ role: 'super_admin', sub: adminId, email: process.env.ADMIN_EMAIL, mfaVerified: true });

async function call(handler, body, bearer = '') {
  const result = { status: 200, headers: {}, body: null, raw: null };
  const req = { method: 'POST', headers: { origin: 'https://greachimpact.com', 'user-agent': 'local-certificate-test', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) }, body, query: {}, socket: { remoteAddress: '127.0.0.1' } };
  const res = { setHeader(k, v) { result.headers[k] = v; }, status(s) { result.status = s; return this; }, json(v) { result.body = v; return this; }, end(v) { result.raw = v; return this; } };
  await handler(req, res);
  return result;
}

(async () => {
  const { default: handler, certificateQrMatrix, createCertificatePdf } = await import('../api/auth.js');
  const matrix = certificateQrMatrix(verificationUrl);
  assert.equal(matrix.length, 37, '97-byte QR payload must produce QR Model 2 Version 5');
  assert(matrix.every(row => row.length === 37 && row.every(bit => typeof bit === 'boolean')), 'QR modules must be a complete boolean matrix');
  assert.equal(matrix[3][3], true, 'QR finder pattern must be encoded');
  const vercelProdUrl = `https://greach-impact-website.vercel.app/classroom/verify-certificate.html?id=${certId}`;
  assert.equal(Buffer.byteLength(vercelProdUrl, 'utf8'), 113, 'live Vercel production verification URL is 113 bytes');
  const matrixV6 = certificateQrMatrix(vercelProdUrl);
  assert.equal(matrixV6.length, 41, '113-byte Vercel production URL must produce QR Model 2 Version 6');
  assert(matrixV6.every(row => row.length === 41 && row.every(bit => typeof bit === 'boolean')), 'Version 6 QR modules must be a complete boolean matrix');
  assert.equal(matrixV6[34][34], true, 'Version 6 alignment pattern center must be encoded');
  assert.throws(() => certificateQrMatrix('x'.repeat(135)), /too long/, 'oversized QR payload (>134 bytes) must fail closed');
  const pdf = createCertificatePdf({ certificateId: certId, studentName: 'Local Student', courseName: 'Microsoft Excel for Beginners', issuedDate: 'November 12, 2026', completionDate: '2026-11-11', verificationUrl });
  assert(pdf.subarray(0, 8).toString('ascii').startsWith('%PDF-1.4'), 'server artifact must be a PDF');
  assert(pdf.toString('ascii').includes(certId) && pdf.toString('ascii').includes(verificationUrl), 'PDF must carry registry reference and verification URL');
  assert(pdf.toString('ascii').includes(' re f'), 'PDF must render QR modules as vector marks');
  assert(!pdf.toString('ascii').includes('private@example.test'), 'PDF must not contain student email');
  const pdfText=pdf.toString('ascii'),startxref=Number(pdfText.match(/startxref\n(\d+)/)?.[1]);
  assert(Number.isInteger(startxref)&&pdfText.slice(startxref,startxref+4)==='xref', 'PDF cross-reference offset must point to the xref table');
  const pdfVercel = createCertificatePdf({ certificateId: certId, studentName: 'Local Student', courseName: 'Microsoft Excel for Beginners', issuedDate: 'November 12, 2026', completionDate: '2026-11-11', verificationUrl: vercelProdUrl });
  assert(pdfVercel.toString('ascii').includes(vercelProdUrl), 'PDF must render full 113-byte greach-impact-website.vercel.app verification URL without truncation');

  captured = [];
  let out = await call(handler, { action: 'review_course_submission', submissionId: '223e4567-e89b-12d3-a456-426614174000', decision: 'approved', completionConfirmed: true, completionDate: '2026-11-11', reviewNotes: 'Verified capstone checklist.' }, studentToken);
  assert.equal(out.status, 403, 'student cannot approve a completion');
  assert.equal(captured.length, 0, 'unauthorized review must not reach the database');

  activeScenario = 'completion_missing';
  out = await call(handler, { action: 'issue_certificate', courseId: 'excel_beginners' }, studentToken);
  assert.equal(out.status, 409, 'no completion record means no issuance');
  activeScenario = 'revoked_issue';
  out = await call(handler, { action: 'issue_certificate', courseId: 'excel_beginners' }, studentToken);
  assert.equal(out.status, 409, 'revoked credentials cannot be regenerated through student self-service');
  assert.match(out.body.error, /administrator/i);

  activeScenario = '';
  out = await call(handler, { action: 'issue_certificate', courseId: 'excel_beginners' }, studentToken);
  assert.equal(out.status, 200);
  assert.equal(out.body.certificate.verificationUrl, verificationUrl);
  assert(!JSON.stringify(out.body).includes('private@example.test'), 'issuance response must not disclose student email');

  // Verify live configured Vercel production domain (113-byte URL -> QR Version 6-L) does not fail closed with 503
  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'greach-impact-website.vercel.app';
  captured = [];
  out = await call(handler, { action: 'issue_certificate', courseId: 'excel_beginners' }, studentToken);
  assert.equal(out.status, 200, 'issue_certificate must succeed on live greach-impact-website.vercel.app domain');
  const issueRpcCall = captured.findLast(item => item.url.includes('/rpc/issue_course_certificate'));
  assert(JSON.parse(issueRpcCall.options.body).p_verification_url.startsWith('https://greach-impact-website.vercel.app/classroom/verify-certificate.html?id=GI-'), 'RPC must receive full greach-impact-website.vercel.app verification URL');
  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'greachimpact.com';

  activeScenario = 'list_owned';
  captured = [];
  out = await call(handler, { action: 'list_my_certificates' }, studentToken);
  assert.equal(out.status, 200);
  assert.equal(out.body.certificates[0].certificateId, certId);
  assert(!JSON.stringify(out.body).includes('private@example.test'), 'student retrieval response must omit email');
  assert(captured.some(item => item.url.includes(`student_id=eq.${studentId}`)), 'certificate list query must be constrained to the signed subject');
  assert(captured.some(item => item.url.includes('/rest/v1/certificate_events') && item.options.method === 'POST'), 'student retrieval must create an audit event');

  activeScenario = '';
  out = await call(handler, { action: 'download_certificate_pdf', certificateId: certId }, studentToken);
  assert.equal(out.status, 404, 'certificate owned by another student must not be retrieved');
  assert(captured.some(item => item.url.includes(`student_id=eq.${studentId}`)), 'retrieval query must be constrained to the signed subject');

  activeScenario = 'valid_pdf';
  out = await call(handler, { action: 'download_certificate_pdf', certificateId: certId }, studentToken);
  assert.equal(out.status, 200);
  assert.equal(out.headers['Content-Type'], 'application/pdf');
  assert(Buffer.isBuffer(out.raw) && out.raw.toString('ascii').startsWith('%PDF-1.4'));
  assert(captured.some(item => item.url.includes('/rest/v1/certificate_events') && item.options.method === 'POST'), 'PDF retrieval must be audited');

  out = await call(handler, { action: 'list_course_submissions' }, studentToken);
  assert.equal(out.status, 403, 'student cannot access instructor review queue');
  out = await call(handler, { action: 'list_course_submissions' }, adminToken);
  assert.equal(out.status, 200, 'TOTP-verified live Super Admin can load review queue');
  out = await call(handler, { action: 'list_certificate_registry' }, studentToken);
  assert.equal(out.status, 403, 'student cannot list the private certificate registry');
  out = await call(handler, { action: 'list_certificate_registry' }, adminToken);
  assert.equal(out.status, 200, 'verified administrator can list central registry records');
  assert(!JSON.stringify(out.body).includes('private@example.test'), 'administrator listing omits student email');
  const noMfaToken = token({ role: 'super_admin', sub: adminId, email: process.env.ADMIN_EMAIL, mfaVerified: false });
  out = await call(handler, { action: 'list_certificate_registry' }, noMfaToken);
  assert.equal(out.status, 403, 'administrator actions require TOTP-verified session');
  out = await call(handler, { action: 'review_course_submission', submissionId: '223e4567-e89b-12d3-a456-426614174000', decision: 'approved', completionConfirmed: true, completionDate: '2026-11-11', reviewNotes: 'Verified capstone checklist.' }, adminToken);
  assert.equal(out.status, 200, 'trusted reviewer may record completion decision');
  const reviewCall = captured.findLast(item => item.url.includes('/rpc/review_course_project'));
  assert.equal(JSON.parse(reviewCall.options.body).p_reviewer_id, adminId, 'server binds review actor to verified Auth user');

  activeScenario = 'valid';
  out = await call(handler, { action: 'verify_certificate', certificateId: certId });
  assert.equal(out.status, 200);
  assert.equal(out.body.certificate.status, 'valid');
  assert(!JSON.stringify(out.body).includes('private@example.test'), 'public lookup must not reveal student email');
  activeScenario = 'revoked';
  out = await call(handler, { action: 'verify_certificate', certificateId: certId });
  assert.equal(out.body.certificate.status, 'revoked');
  assert.equal(out.body.valid, false, 'revoked certificate must not verify as valid');
  activeScenario = 'forged';
  out = await call(handler, { action: 'verify_certificate', certificateId: `GI-${'F'.repeat(32)}` });
  assert.equal(out.status, 404, 'a correctly shaped but unregistered reference must fail');

  activeScenario = '';
  out = await call(handler, { action: 'revoke_certificate', certificateId: certId, reason: 'Duplicate was reported.' }, adminToken);
  assert.equal(out.status, 200, 'authorized administrator can revoke through RPC');
  out = await call(handler, { action: 'reissue_certificate', certificateId: certId, reason: 'Replacement requested.' }, adminToken);
  assert.equal(out.status, 200, 'authorized administrator can reissue through RPC');

  const reviewPage = require('node:fs').readFileSync(require('node:path').join(__dirname, '../classroom/certificate-review.html'), 'utf8');
  assert(reviewPage.includes("'greach_admin_auth_v2'") && reviewPage.includes("api('review_course_submission'"), 'instructor page must use signed Super Admin session and central review endpoint');
  assert(reviewPage.includes('textContent'), 'submission content must be rendered without HTML injection');
  const fs = require('node:fs'), path = require('node:path');
  for (const file of ['../admin.html', '../classroom/claim-certificate.html', '../classroom/certificate-review.html']) {
    const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
      if (!match[1].trim()) continue;
      try { new Function(match[1]); } catch (error) { throw new Error(`Inline script parse failed in ${file}: ${error.message}`); }
    }
  }
  const studentPage = fs.readFileSync(path.join(__dirname, '../classroom/claim-certificate.html'), 'utf8');
  assert(!studentPage.includes('window.print') && studentPage.includes('download_certificate_pdf'), 'student download must use the server PDF route, not browser printing');
  assert(!fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8').includes('GreachDB.getAllCertificates'), 'admin certificate views must not use browser-local records');
  for (const file of ['../js/greach-db.js', '../classroom/js/greach-db.js']) {
    const db = fs.readFileSync(path.join(__dirname, file), 'utf8');
    assert(!db.includes('claimCertificate: function') && !db.includes('verifyCertificate: function'), 'browser library must not expose local certificate issuance or verification');
  }
  const migration = fs.readFileSync(path.join(__dirname, '../production_certificate_registry_migration.sql'), 'utf8');
  for (const invariant of ['one_pending_submission_per_student_course','one_valid_certificate_per_completion','unverified_legacy','review_course_project','issue_course_certificate','revoke_course_certificate','reissue_course_certificate','GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO service_role']) assert(migration.includes(invariant), `migration must preserve invariant: ${invariant}`);
  assert(!/DROP\s+TABLE|CASCADE/i.test(migration), 'candidate migration must not drop tables or cascade dependencies');
  const inspectSql = fs.readFileSync(path.join(__dirname, '../PHASE1_CERTIFICATE_SCHEMA_INSPECTION.sql'), 'utf8');
  const statements = inspectSql.split(';').map(s => s.replace(/--[^\n]*/g, '').trim()).filter(Boolean);
  assert(statements.length >= 8 && statements.every(s => /^SELECT\b/i.test(s)), 'schema fact collection must contain SELECT statements only');
  console.log('Focused local certificate workflow checks passed (QR/PDF artifact, server issuance gate, student ownership, trusted review, admin registry, public status and audit).');
})().catch(error => { console.error(error); process.exitCode = 1; });
