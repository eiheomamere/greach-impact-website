// Vercel Serverless API: /api/auth
// Authoritative Supabase Auth & Multi-Role Enterprise Authentication Engine (Phase 1B Hardened)
// Enforces HttpOnly SameSite Cookies, CSRF Double-Submit, Compulsory MFA, Real-Time Role Revocation & Multi-Instance Rate Limiting

import crypto from 'crypto';

// In-memory caches for fast local checking (L1)
const memoryRateLimits = new Map();
const consumedMfaTickets = new Set();
const MAX_ATTEMPTS = 5;
const FAILURE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes failure window
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

// Strict Environment-Driven Supabase Configuration (Zero Staging-to-Production Fallback)
// Detects ambiguous or mixed configurations and enforces fail-closed execution
const hasStagingVars = Object.keys(process.env).some(k => k.startsWith('STAGING_'));
const isExplicitStaging = process.env.APP_ENV === 'staging' || process.env.STAGING === 'true';

if (hasStagingVars && !isExplicitStaging) {
  throw new Error('[CONFIGURATION AMBIGUITY] STAGING_* environment variables are present, but explicit staging mode (APP_ENV=staging or STAGING=true) is not set. Ambiguous environment mode. Fail closed.');
}

if (isExplicitStaging && process.env.APP_ENV && process.env.APP_ENV !== 'staging') {
  throw new Error(`[CONFIGURATION AMBIGUITY] Conflicting environment flags detected: APP_ENV='${process.env.APP_ENV}' combined with STAGING=true. Fail closed.`);
}

let SUPABASE_URL;
let SUPABASE_ANON_KEY;
let SUPABASE_SERVICE_ROLE_KEY;

if (isExplicitStaging) {
  const missingStaging = [];
  if (!process.env.STAGING_SUPABASE_URL || !process.env.STAGING_SUPABASE_URL.trim()) missingStaging.push('STAGING_SUPABASE_URL');
  if (!process.env.STAGING_SUPABASE_ANON_KEY || !process.env.STAGING_SUPABASE_ANON_KEY.trim()) missingStaging.push('STAGING_SUPABASE_ANON_KEY');
  if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || !process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY.trim()) missingStaging.push('STAGING_SUPABASE_SERVICE_ROLE_KEY');

  if (missingStaging.length > 0) {
    throw new Error(`[STAGING CONFIGURATION FAILURE] Missing required staging variables: ${missingStaging.join(', ')}. Fail closed.`);
  }

  // Safety Assertion: Staging URL must never point to production project
  if (process.env.STAGING_SUPABASE_URL.includes('fkltvxhqizqrbvogodxv')) {
    throw new Error('[STAGING CONFIGURATION VIOLATION] STAGING_SUPABASE_URL points to production project fkltvxhqizqrbvogodxv. Execution aborted.');
  }

  SUPABASE_URL = process.env.STAGING_SUPABASE_URL.trim();
  SUPABASE_ANON_KEY = process.env.STAGING_SUPABASE_ANON_KEY.trim();
  SUPABASE_SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY.trim();
} else {
  SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
  SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
  SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

const SUPER_ADMIN_EMAIL = (isExplicitStaging ? process.env.STAGING_ADMIN_EMAIL || '' : process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const SUPER_ADMIN_USERNAME = (isExplicitStaging ? process.env.STAGING_ADMIN_USER || '' : process.env.ADMIN_USER || '').trim();

// Origin Whitelist Validator for CORS & CSRF
function isAllowedOrigin(origin) {
  if (!origin) return true; // Direct same-origin or server-to-server request
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'greachimpact.com' ||
      host.endsWith('.greachimpact.com') ||
      host.endsWith('.vercel.app')
    );
  } catch (e) {
    return false;
  }
}

// Client IP Extraction
// Note on Trust Assumptions:
// - On Vercel Edge: req.headers['x-vercel-ip'] is attached by Vercel edge reverse proxy
//   and strips any client-provided x-vercel-ip. It is authoritative.
// - On Cloudflare: cf-connecting-ip is set by Cloudflare edge.
// - Multi-proxy x-forwarded-for: selects the right-most IP (appended by closest reverse proxy).
// - If no IP headers exist, returns null so rate limiting can key per user/session rather
//   than creating a shared-bucket denial-of-service vulnerability.
function getClientIp(req) {
  const edgeIp = req.headers['cf-connecting-ip'] || req.headers['x-vercel-ip'] || req.headers['x-real-ip'];
  if (edgeIp && typeof edgeIp === 'string') {
    return edgeIp.trim();
  }

  const xForwarded = req.headers['x-forwarded-for'];
  if (xForwarded && typeof xForwarded === 'string') {
    const parts = xForwarded.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return null;
}

// Cookie Parser Helper
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return list;
}

// Cryptographically sign session token with HMAC-SHA256
function signToken(payload, secret) {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
  return `${dataStr}.${signature}`;
}

// Cryptographically verify session token using timing-safe comparison
function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null; // Expired
    return payload;
  } catch (e) {
    return null;
  }
}

// Cryptographically generate and sign a server-issued session ID bound to student (128-bit HMAC)
function generateServerSessionId(studentId, secret) {
  const nonce = crypto.randomBytes(16).toString('hex'); // 128-bit random nonce (32 hex characters)
  const sig = crypto.createHmac('sha256', secret).update(`${studentId}:${nonce}`).digest('hex').substring(0, 32); // 128-bit HMAC signature (32 hex characters)
  return `sess_${nonce}_${sig}`;
}

// Cryptographically verify server-issued session ID using timing-safe comparison
function verifyServerSessionId(sessionId, studentId, secret) {
  if (!sessionId || typeof sessionId !== 'string') return false;
  const match = sessionId.match(/^sess_([a-f0-9]{32})_([a-f0-9]{32})$/);
  if (!match) return false;
  const [_, nonce, sig] = match;
  const expectedSig = crypto.createHmac('sha256', secret).update(`${studentId}:${nonce}`).digest('hex').substring(0, 32);
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

// Helper: Call Supabase Auth endpoint
async function callSupabaseAuth(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/auth/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const signal = options.signal || AbortSignal.timeout(5000);
  return await fetch(url, { ...options, headers, signal });
}

// ==============================================================
// MULTI-INSTANCE PERSISTENT RATE LIMITING (Supabase L2 + Memory L1)
// Enforces 10-minute sliding failure window and 15-minute lockout at 5 failures
// ==============================================================
async function checkRateLimit(key) {
  const now = Date.now();

  // 1. L1 check in local container memory
  const mem = memoryRateLimits.get(key);
  if (mem) {
    if (mem.locked_until && now < mem.locked_until) {
      return { blocked: true, remainingMin: Math.ceil((mem.locked_until - now) / 60000) };
    }
    // Lockout expired: reset
    if (mem.locked_until && now >= mem.locked_until) {
      mem.locked_until = null;
      mem.count = 0;
    }
    // Window expired: reset count
    if (mem.lastAttempt && now - mem.lastAttempt > FAILURE_WINDOW_MS) {
      mem.count = 0;
    }
  }

  // 2. L2 Persistent check across Vercel serverless instances
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits?ip=eq.${encodeURIComponent(key)}&select=*`, {
      headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const records = await res.json();
      if (Array.isArray(records) && records.length > 0) {
        const rec = records[0];
        const lockedUntil = rec.locked_until ? new Date(rec.locked_until).getTime() : null;
        const lastFailedAt = (rec.last_failed_at || rec.updated_at) ? new Date(rec.last_failed_at || rec.updated_at).getTime() : 0;
        const attemptCount = Number(rec.failed_attempts ?? rec.attempts ?? 0);

        if (lockedUntil && now < lockedUntil) {
          memoryRateLimits.set(key, { count: attemptCount, locked_until: lockedUntil, lastAttempt: lastFailedAt });
          return { blocked: true, remainingMin: Math.ceil((lockedUntil - now) / 60000) };
        }
      }
    }
  } catch (e) {
    // Graceful fallback to L1 cache
  }

  return { blocked: false };
}

async function recordFailedAttempt(key) {
  const now = Date.now();
  const mem = memoryRateLimits.get(key) || { count: 0, lastAttempt: now };

  // If previous attempt was outside the sliding window (10 minutes), reset count to 1
  if (mem.lastAttempt && now - mem.lastAttempt > FAILURE_WINDOW_MS) {
    mem.count = 1;
  } else {
    mem.count += 1;
  }
  mem.lastAttempt = now;

  if (mem.count >= MAX_ATTEMPTS) {
    mem.locked_until = now + LOCKOUT_MS;
  }
  memoryRateLimits.set(key, mem);

  // Sync to persistent store in Supabase
  try {
    const lockedUntilIso = mem.count >= MAX_ATTEMPTS ? new Date(now + LOCKOUT_MS).toISOString() : null;
    const nowIso = new Date(now).toISOString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        ip: key,
        attempts: mem.count,
        updated_at: nowIso,
        locked_until: lockedUntilIso
      })
    });
    if (!res.ok) {
      await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          ip: key,
          failed_attempts: mem.count,
          last_failed_at: nowIso,
          locked_until: lockedUntilIso
        })
      });
    }
  } catch (e) {}

  return mem;
}

async function clearRateLimit(key) {
  memoryRateLimits.delete(key);
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits?ip=eq.${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
    });
  } catch (e) {}
}

const CERTIFICATE_COURSE_ALIASES = {
  excel_beginners: ['excel_beginners'],
  excel_advanced: ['excel_advanced'],
  excel_dashboard: ['excel_dashboard', 'dashboard'],
  sql_beginners: ['sql_beginners', 'sql'],
  power_bi: ['power_bi'],
  complete_package: ['complete_package', 'complete_course']
};

function certificateBearer(req) {
  const value = req.headers?.authorization || req.headers?.Authorization || '';
  return /^Bearer\s+/i.test(value) ? value.replace(/^Bearer\s+/i, '').trim() : '';
}

function certificateText(value, maxLength = 1000) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength)
    : '';
}

function serviceRoleHeaders(extra = {}) {
  return {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra
  };
}

async function certificateDb(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: serviceRoleHeaders({ 'Content-Type': 'application/json', ...(options.headers || {}) }),
    signal: options.signal || AbortSignal.timeout(7000)
  });
}

async function findStudentCertificateEntitlement(payload, requestedCourseId) {
  if (!payload || payload.role !== 'student' || !payload.sub ||
      payload.accessType === 'session_pass' || typeof requestedCourseId !== 'string') {
    return { ok: false, status: 403, error: 'An active full-course student session is required.' };
  }
  const courseIds = CERTIFICATE_COURSE_ALIASES[requestedCourseId];
  if (!courseIds) return { ok: false, status: 400, error: 'Unsupported certificate course.' };

  const studentRes = await certificateDb(
    `students?id=eq.${encodeURIComponent(payload.sub)}&select=id,full_name,registered_email,enrolled_course,status,expires_at`
  );
  if (!studentRes.ok) return { ok: false, status: 503, error: 'Student entitlement could not be verified.' };
  const students = await studentRes.json();
  const student = Array.isArray(students) && students.length === 1 ? students[0] : null;
  if (!student || student.status !== 'Active' ||
      (student.expires_at && new Date(student.expires_at).getTime() <= Date.now())) {
    return { ok: false, status: 403, error: 'An active full-course student entitlement is required.' };
  }

  const enrolledName = certificateText(student.enrolled_course, 150).toLowerCase();
  if (!enrolledName || enrolledName !== certificateText(payload.course, 150).toLowerCase()) {
    return { ok: false, status: 403, error: 'The authenticated session does not match the current student course enrollment.' };
  }

  if (payload.accessType === 'access_code') {
    if (!payload.accessCode) return { ok: false, status: 403, error: 'A full-course access code is required.' };
    const codeRes = await certificateDb(
      `access_codes?code=eq.${encodeURIComponent(payload.accessCode)}&student_id=eq.${encodeURIComponent(student.id)}&is_active=eq.true&is_session_pass=eq.false&select=code,course_name,is_active,is_session_pass,expires_at`
    );
    if (!codeRes.ok) return { ok: false, status: 503, error: 'Student course entitlement could not be verified.' };
    const codes = await codeRes.json();
    const code = Array.isArray(codes) && codes.length === 1 ? codes[0] : null;
    if (!code || (code.expires_at && new Date(code.expires_at).getTime() <= Date.now()) ||
        certificateText(code.course_name, 150).toLowerCase() !== enrolledName) {
      return { ok: false, status: 403, error: 'The full-course entitlement is inactive or does not match this course.' };
    }
  } else if (payload.accessType !== 'student_voucher') {
    return { ok: false, status: 403, error: 'This session type cannot claim a course certificate.' };
  }

  const courseRows = [];
  for (const courseId of courseIds) {
    const courseRes = await certificateDb(
      `course_prices?course_id=eq.${encodeURIComponent(courseId)}&select=course_id,course_name`
    );
    if (!courseRes.ok) return { ok: false, status: 503, error: 'The course catalog could not be verified.' };
    const rows = await courseRes.json();
    if (Array.isArray(rows)) courseRows.push(...rows);
  }
  const course = courseRows.find(row => certificateText(row.course_name, 150).toLowerCase() === enrolledName);
  if (!course) return { ok: false, status: 403, error: 'The requested certificate course does not match the active enrollment.' };
  return { ok: true, student, course };
}

async function verifyCertificateAdmin(req, authSecret) {
  const token = certificateBearer(req);
  const payload = verifyToken(token, authSecret);
  if (!payload || payload.role !== 'super_admin' || payload.mfaVerified !== true || !payload.sub) {
    return { ok: false, status: 403, error: 'Verified Super Admin session with TOTP MFA is required.' };
  }
  let userRes;
  try {
    userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(payload.sub)}`, {
      headers: serviceRoleHeaders(),
      signal: AbortSignal.timeout(5000)
    });
  } catch (error) {
    return { ok: false, status: 503, error: 'Super Admin authorization could not be verified.' };
  }
  if (!userRes.ok) return { ok: false, status: 403, error: 'Super Admin authorization is unavailable or revoked.' };
  const user = await userRes.json();
  if (user.app_metadata?.role !== 'super_admin' ||
      (user.email || '').toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return { ok: false, status: 403, error: 'Super Admin authorization is unavailable or revoked.' };
  }
  return { ok: true, payload, user };
}

function certificateVerificationBaseUrl() {
  const production = process.env.VERCEL_ENV === 'production';
  const configuredHost = production
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_URL;
  if (!configuredHost || typeof configuredHost !== 'string') return '';
  const candidate = configuredHost.startsWith('https://') ? configuredHost : `https://${configuredHost}`;
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const trustedHost = host === 'greachimpact.com' || host.endsWith('.greachimpact.com') ||
      host.endsWith('.vercel.app');
    if (url.protocol !== 'https:' || !trustedHost || url.username || url.password || url.port || url.pathname !== '/') return '';
    const sampleVerificationUrl = `${url.origin}/classroom/verify-certificate.html?id=GI-${'A'.repeat(32)}`;
    if (Buffer.byteLength(sampleVerificationUrl, 'utf8') > 134) return '';
    return url.origin;
  } catch (error) {
    return '';
  }
}

// QR Code Model 2, byte mode, Error Correction Level L:
// Version 5-L (37x37, up to 106 bytes) and Version 6-L (41x41, 107-134 bytes,
// supporting the live greach-impact-website.vercel.app verification URL = 113 bytes).
export function certificateQrMatrix(value) {
  const bytes = Buffer.from(String(value), 'utf8');
  if (bytes.length > 134) throw new Error('Verification URL is too long for the certificate QR code.');
  const useV6 = bytes.length > 106;
  const size = useV6 ? 41 : 37;
  const alignCenter = useV6 ? 34 : 30;
  const totalDataCodewords = useV6 ? 136 : 108;
  const blocks = useV6 ? 2 : 1;
  const dataPerBlock = useV6 ? 68 : 108;
  const ecPerBlock = useV6 ? 18 : 26;

  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const set = (x, y, dark) => { if (x >= 0 && y >= 0 && x < size && y < size) matrix[y][x] = !!dark; };
  const finder = (x, y) => {
    for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
      const xx = x + dx, yy = y + dy;
      const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const dark = inside && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      set(xx, yy, dark);
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  for (let i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  // Alignment pattern center: (30,30) for Version 5, (34,34) for Version 6.
  for (const [cx, cy] of [[alignCenter, alignCenter]]) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 1);
    }
  }
  // Reserve both copies of the format information and the fixed dark module
  // before placing data, so payload bits cannot overwrite function modules.
  for (let i = 0; i <= 5; i++) set(8, i, false);
  set(8, 7, false); set(8, 8, false); set(7, 8, false);
  for (let i = 9; i < 15; i++) set(14 - i, 8, false);
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, false);
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, false);
  set(8, size - 8, true);
  const bits = [];
  const append = (num, width) => { for (let i = width - 1; i >= 0; i--) bits.push((num >>> i) & 1); };
  append(0b0100, 4); append(bytes.length, 8); for (const byte of bytes) append(byte, 8);
  const capacity = totalDataCodewords * 8;
  for (let i = 0; i < Math.min(4, capacity - bits.length); i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((n, b) => (n << 1) | b, 0));
  for (let pad = 0; data.length < totalDataCodewords; pad++) data.push(pad % 2 ? 0x11 : 0xec);

  const gfMul = (x, y) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) { z = ((z << 1) ^ ((z >>> 7) * 0x11d)) & 0xff; if ((y >>> i) & 1) z ^= x; }
    return z;
  };
  let generator = [1], root = 1;
  for (let i = 0; i < ecPerBlock; i++) {
    const next = Array(generator.length + 1).fill(0);
    generator.forEach((coef, j) => { next[j] ^= coef; next[j + 1] ^= gfMul(coef, root); });
    generator = next; root = gfMul(root, 2);
  }
  const dataBlocks = [];
  const ecBlocks = [];
  for (let b = 0; b < blocks; b++) {
    const blockData = data.slice(b * dataPerBlock, (b + 1) * dataPerBlock);
    const remainder = Array(ecPerBlock).fill(0);
    for (const codeword of blockData) {
      const factor = codeword ^ remainder.shift(); remainder.push(0);
      for (let i = 0; i < ecPerBlock; i++) remainder[i] ^= gfMul(generator[i + 1], factor);
    }
    dataBlocks.push(blockData);
    ecBlocks.push(remainder);
  }
  const interleaved = [];
  for (let i = 0; i < dataPerBlock; i++) for (let b = 0; b < blocks; b++) interleaved.push(dataBlocks[b][i]);
  for (let i = 0; i < ecPerBlock; i++) for (let b = 0; b < blocks; b++) interleaved.push(ecBlocks[b][i]);

  const allBits = interleaved.flatMap(byte => Array.from({ length: 8 }, (_, i) => (byte >>> (7 - i)) & 1));
  let bitIndex = 0, upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right--;
    for (let vert = 0; vert < size; vert++) {
      const y = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (matrix[y][x] === null) {
          const bit = bitIndex < allBits.length ? allBits[bitIndex++] : 0;
          set(x, y, bit ^ ((x + y) % 2 === 0 ? 1 : 0));
        }
      }
    }
    upward = !upward;
  }
  // Format bits: error correction L and mask 0, BCH encoded and XOR masked.
  const formatData = 0b01000;
  let rem = formatData;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
  const format = ((formatData << 10) | rem) ^ 0x5412;
  const bit = i => ((format >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true);
  return matrix.map(row => row.map(Boolean));
}

function pdfSafeText(value, limit = 140) {
  return String(value || '').normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '\\$&').slice(0, limit);
}

export function createCertificatePdf(certificate) {
  const matrix = certificateQrMatrix(certificate.verificationUrl);
  const commands = ['0.04 0.10 0.18 rg', 'BT /F1 26 Tf 88 500 Td (GREACH IMPACT ACADEMY) Tj ET', 'BT /F1 22 Tf 88 448 Td (CERTIFICATE OF COMPLETION) Tj ET', '0.70 0.33 0.04 rg', 'BT /F1 13 Tf 88 400 Td (PRESENTED TO) Tj ET', '0.04 0.10 0.18 rg', `BT /F1 24 Tf 88 360 Td (${pdfSafeText(certificate.studentName, 80)}) Tj ET`, `BT /F1 16 Tf 88 318 Td (For successful completion of ${pdfSafeText(certificate.courseName, 70)}) Tj ET`, `BT /F1 12 Tf 88 280 Td (Completion date: ${pdfSafeText(certificate.completionDate, 20)}) Tj ET`, `BT /F1 12 Tf 88 258 Td (Issue date: ${pdfSafeText(certificate.issuedDate, 40)}) Tj ET`, `BT /F1 10 Tf 88 226 Td (Certificate reference: ${pdfSafeText(certificate.certificateId, 50)}) Tj ET`, 'BT /F1 9 Tf 88 202 Td (Scan the QR code or visit the verification URL to confirm registry status.) Tj ET', `BT /F1 8 Tf 88 184 Td (${pdfSafeText(certificate.verificationUrl, 140)}) Tj ET`];
  const module = matrix.length > 37 ? 2.8 : 3, originX = 600, originY = 180, quiet = 4;
  commands.push('0 0 0 rg');
  matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) commands.push(`${originX + (x + quiet) * module} ${originY + (matrix.length - y + quiet) * module} ${module} ${module} re f`); }));
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n%GI-PHASE1\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf, 'ascii')); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}


// ==============================================================
// MAIN API HANDLER
// ==============================================================
export default async function handler(req, res) {
  // 1. FAIL SECURELY WHEN REQUIRED SECRET IS MISSING (Zero Staging-to-Production Fallback)
  let AUTH_SECRET;
  let CRON_SECRET;

  if (isExplicitStaging) {
    if (!process.env.STAGING_AUTH_SECRET || !process.env.STAGING_AUTH_SECRET.trim()) {
      console.error('[API Auth Staging Failure] Mandatory STAGING_AUTH_SECRET environment variable is missing.');
      return res.status(500).json({ success: false, error: 'Staging configuration error. STAGING_AUTH_SECRET missing.' });
    }
    if (!process.env.STAGING_CRON_SECRET || !process.env.STAGING_CRON_SECRET.trim()) {
      console.error('[API Auth Staging Failure] Mandatory STAGING_CRON_SECRET environment variable is missing.');
      return res.status(500).json({ success: false, error: 'Staging configuration error. STAGING_CRON_SECRET missing.' });
    }
    AUTH_SECRET = process.env.STAGING_AUTH_SECRET.trim();
    CRON_SECRET = process.env.STAGING_CRON_SECRET.trim();
  } else {
    AUTH_SECRET = (process.env.AUTH_SECRET || '').trim();
    CRON_SECRET = process.env.CRON_SECRET;
    if (!AUTH_SECRET) {
      console.error('[API Auth Security Failure] Mandatory AUTH_SECRET environment variable is missing.');
      return res.status(500).json({
        success: false,
        error: 'Server security configuration error. Service unavailable.'
      });
    }
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY ||
      !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_USERNAME) {
    console.error('[API Auth Security Failure] Required Supabase or administrator configuration is missing.');
    return res.status(500).json({
      success: false,
      error: 'Server security configuration error. Service unavailable.'
    });
  }

  // 2. CORS & ORIGIN SECURITY
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Untrusted origin: reject
    return res.status(403).json({ success: false, error: 'Cross-origin request rejected.' });
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const clientIp = getClientIp(req);
  const cookies = parseCookies(req.headers.cookie);
  const cookieSession = cookies['gi_session'];
  const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const bodyToken = req.body?.token;

  const activeToken = cookieSession || bearerToken || bodyToken;
  const isCookieAuth = Boolean(cookieSession && !bearerToken && !bodyToken);

  try {
    const { action, email, identifier, username, password, mfaCode, factorId, ticket } = req.body || {};

    if (!action) {
      return res.status(400).json({ success: false, error: 'Action parameter is required.' });
    }

    // 3. CSRF PROTECTION FOR COOKIE-BASED AUTHENTICATION
    const usesMfaTicket = Boolean(ticket && (action === 'mfa_enroll' || action === 'mfa_activate'));
    if (isCookieAuth && !usesMfaTicket && ['verify_super_action', 'logout', 'mfa_enroll', 'mfa_activate', 'change_password'].includes(action)) {
      const clientCsrf = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
      const cookieCsrf = cookies['gi_csrf'];

      if (!clientCsrf || !cookieCsrf || clientCsrf !== cookieCsrf) {
        return res.status(403).json({
          success: false,
          error: 'CSRF validation failed. Missing or invalid X-CSRF-Token.'
        });
      }
    }

    // ==============================================================
    // ACTION: VERIFY SESSION TOKEN & ENFORCE REAL-TIME ROLE REVOCATION
    // ==============================================================
    if (action === 'verify') {
      const headers = req.headers || {};
      const authHeader = headers['authorization'] || headers['Authorization'];
      const hasBearer = Boolean(authHeader && /^Bearer\s+/i.test(authHeader));
      const hasBodyOrQueryToken = Boolean(bodyToken || req.query?.token || req.body?.adminToken || req.query?.adminToken);

      // Check candidate token from header or body/query
      const candidateToken = (hasBearer ? authHeader.replace(/^Bearer\s+/i, '').trim() : null) || bodyToken || req.query?.token;
      const candidatePayload = verifyToken(candidateToken, AUTH_SECRET);

      // Admin Token Authorization Boundary:
      // If verifying an admin session, tokens in body or query are strictly rejected,
      // even if a valid Authorization header is also supplied.
      if (candidatePayload && (candidatePayload.role === 'super_admin' || candidatePayload.role === 'sub_admin')) {
        if (hasBodyOrQueryToken) {
          return res.status(401).json({
            success: false,
            valid: false,
            error: 'Unauthorized: Admin authentication token must be provided exclusively via HTTP Authorization header (Bearer <token>). Request body and query parameter tokens are rejected.'
          });
        }
        if (!hasBearer && !cookieSession) {
          return res.status(401).json({
            success: false,
            valid: false,
            error: 'Unauthorized: Administrative Bearer token required in Authorization header.'
          });
        }
      }

      const payload = verifyToken(activeToken, AUTH_SECRET);

      if (!payload) {
        return res.status(401).json({
          success: false,
          valid: false,
          error: 'Session expired or invalid signature. Please log in again.'
        });
      }

      if (payload.role === 'student' && ['access_code', 'session_pass'].includes(payload.accessType)) {
        let entitlementRows = [];
        let entitlementEndpoint = '';

        try {
          if (payload.accessCode) {
            entitlementEndpoint = `access_codes?code=eq.${encodeURIComponent(payload.accessCode)}&select=code,is_active,expires_at`;
          } else if (payload.sessionPassCode) {
            entitlementEndpoint = `live_session_passes?pass_code=eq.${encodeURIComponent(payload.sessionPassCode)}&select=pass_code,is_active,expires_at`;
          } else {
            const subject = typeof payload.sub === 'string' ? payload.sub : '';
            if (subject.startsWith('PASS-')) {
              entitlementEndpoint = `access_codes?code=eq.${encodeURIComponent(subject.slice(5))}&select=code,is_active,expires_at`;
            } else if (subject.startsWith('PAS-')) {
              entitlementEndpoint = `live_session_passes?pass_code=eq.${encodeURIComponent(subject.slice(4))}&select=pass_code,is_active,expires_at`;
            } else if (subject) {
              const accessCodeRes = await fetch(
                `${SUPABASE_URL}/rest/v1/access_codes?student_id=eq.${encodeURIComponent(subject)}&select=code,is_active,expires_at`,
                { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
              );
              const livePassRes = payload.accessType === 'session_pass'
                ? await fetch(
                  `${SUPABASE_URL}/rest/v1/live_session_passes?id=eq.${encodeURIComponent(subject)}&select=pass_code,is_active,expires_at`,
                  { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
                )
                : null;

              if (!accessCodeRes.ok || (livePassRes && !livePassRes.ok)) {
                return res.status(503).json({
                  success: false,
                  valid: false,
                  error: 'Student entitlement could not be verified. Access denied.'
                });
              }

              const accessCodeRows = await accessCodeRes.json();
              const livePassRows = livePassRes ? await livePassRes.json() : [];
              const matches = [
                ...(Array.isArray(accessCodeRows) ? accessCodeRows.map(row => ({ ...row, source: 'access_codes' })) : []),
                ...(Array.isArray(livePassRows) ? livePassRows.map(row => ({ ...row, source: 'live_session_passes' })) : [])
              ];

              if (matches.length !== 1) {
                return res.status(401).json({
                  success: false,
                  valid: false,
                  error: 'Student entitlement is no longer valid. Please verify your access code again.'
                });
              }

              const entitlement = matches[0];
              if (!entitlement.is_active || (entitlement.expires_at && new Date(entitlement.expires_at).getTime() < Date.now())) {
                return res.status(401).json({
                  success: false,
                  valid: false,
                  error: 'Student entitlement is no longer valid. Please verify your access code again.'
                });
              }
            }
          }

          if (entitlementEndpoint) {
            const entitlementRes = await fetch(
              `${SUPABASE_URL}/rest/v1/${entitlementEndpoint}`,
              { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
            );
            if (!entitlementRes.ok) {
              return res.status(503).json({
                success: false,
                valid: false,
                error: 'Student entitlement could not be verified. Access denied.'
              });
            }
            entitlementRows = await entitlementRes.json();
            const entitlement = Array.isArray(entitlementRows) ? entitlementRows[0] : null;
            if (!entitlement || !entitlement.is_active ||
                (entitlement.expires_at && new Date(entitlement.expires_at).getTime() < Date.now())) {
              return res.status(401).json({
                success: false,
                valid: false,
                error: 'Student entitlement is no longer valid. Please verify your access code again.'
              });
            }
          } else if (!payload.accessCode && !payload.sessionPassCode) {
            return res.status(401).json({
              success: false,
              valid: false,
              error: 'Student entitlement is no longer valid. Please verify your access code again.'
            });
          }
        } catch (e) {
          return res.status(503).json({
            success: false,
            valid: false,
            error: 'Student entitlement could not be verified. Access denied.'
          });
        }
      }

      if (payload.role === 'super_admin' && payload.mfaVerified !== true) {
        return res.status(403).json({
          success: false,
          valid: false,
          error: 'Super Administrator session requires verified TOTP MFA.'
        });
      }

      // Require subject identifier for Super Admin tokens
      if (payload.role === 'super_admin' && !payload.sub && !payload.sbToken) {
        return res.status(403).json({
          success: false,
          valid: false,
          error: 'Administrator session invalid: missing subject identifier.'
        });
      }

      // Check live state in Supabase Auth to detect immediate role revocation or account bans
      if (payload.sbToken || (payload.role === 'super_admin' && payload.sub)) {
        try {
          let userRes = null;
          if (payload.sbToken) {
            userRes = await callSupabaseAuth('user', {
              headers: { 'Authorization': `Bearer ${payload.sbToken}` }
            });
            if (!userRes.ok) {
              return res.status(401).json({
                success: false,
                valid: false,
                error: 'Supabase session has been revoked or expired.'
              });
            }
          }
          if ((!userRes || !userRes.ok) && payload.sub) {
            userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(payload.sub)}`, {
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
              }
            });
          }

          if (userRes && userRes.ok) {
            const liveUser = await userRes.json();
            const liveAppRole = liveUser.app_metadata?.role;
            const isSuperAdminEmail = (liveUser.email || '').toLowerCase() === SUPER_ADMIN_EMAIL;

            // Check if administrator privileges were removed or altered in Supabase
            // Hardened RBAC: An email match alone NEVER grants privileges; live role in app_metadata MUST be 'super_admin'
            const liveIsSuper = (liveAppRole === 'super_admin') && isSuperAdminEmail;
            const liveRole = liveIsSuper ? 'super_admin' : (liveAppRole === 'sub_admin' ? 'sub_admin' : 'student');

            if (payload.role === 'super_admin' && !liveIsSuper) {
              return res.status(403).json({
                success: false,
                valid: false,
                error: 'Administrator role has changed or privileges were revoked. Session terminated.'
              });
            }
            if (liveRole !== payload.role) {
              return res.status(403).json({
                success: false,
                valid: false,
                error: 'User role has changed or privileges were revoked. Session terminated.'
              });
            }
          } else if (userRes && (userRes.status === 404 || userRes.status === 401)) {
            if (payload.role === 'super_admin') {
              return res.status(403).json({
                success: false,
                valid: false,
                error: 'Administrator account not found or access revoked. Session terminated.'
              });
            }
          } else if (payload.role === 'super_admin' || payload.role === 'sub_admin') {
            return res.status(503).json({
              success: false,
              valid: false,
              error: 'Administrator role could not be verified. Access denied.'
            });
          }
        } catch (e) {
          if (payload.role === 'super_admin' || payload.role === 'sub_admin') {
            return res.status(503).json({
              success: false,
              valid: false,
              error: 'Administrator role could not be verified. Access denied.'
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        valid: true,
        user: payload.user,
        email: payload.email,
        name: payload.name,
        sub: payload.sub,
        course: payload.course,
        cohort: payload.cohort,
        accessType: payload.accessType,
        role: payload.role,
        isSuper: !!payload.isSuper,
        mfaVerified: payload.mfaVerified === true,
        csrfToken: payload.csrf || '',
        expiresAt: new Date(payload.exp).toISOString()
      });
    }

    // ==============================================================
    // ACTION: SECURE VOUCHER & ACCESS CODE VERIFICATION
    // Mediates legacy student pass codes & modern access codes via service_role.
    // Completely protects students table from public scraping, prevents enumeration,
    // enforces rate limiting, and issues cryptographically signed student sessions.
    // ==============================================================
    if (action === 'verify_voucher' || action === 'verify_code') {
      const rawCode = (req.body?.code || req.body?.voucherCode || req.body?.key || '').trim().toUpperCase();
      const studentIdParam = (req.body?.studentId || '').trim();

      if (!rawCode || rawCode.length < 3 || rawCode.length > 100) {
        return res.status(400).json({
          success: false,
          valid: false,
          error: 'Please enter a valid unique access code or voucher.'
        });
      }

      // 1. IP-Based Rate Limiting to Prevent Brute-Force Code Enumeration
      const rateLimitKey = clientIp ? `voucher:${clientIp}` : `voucher:anon:${crypto.createHash('sha256').update(req.headers['user-agent'] || 'ua').digest('hex').substring(0, 16)}`;
      const rateLimitStatus = await checkRateLimit(rateLimitKey);
      if (rateLimitStatus.blocked) {
        return res.status(429).json({
          success: false,
          valid: false,
          error: `Too many failed access code attempts. Security lockout active for ${rateLimitStatus.remainingMin} minute(s).`
        });
      }

      try {
        let matchedResult = null;

        // 2. Lookup 1: access_codes table
        const acRes = await fetch(
          `${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(rawCode)}&is_active=eq.true&select=*`,
          { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
        );
        if (acRes.ok) {
          const acs = await acRes.json();
          if (Array.isArray(acs) && acs.length > 0) {
            const pass = acs[0];
            const expiresAt = pass.expires_at ? new Date(pass.expires_at).getTime() : null;
            const isExpired = expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt < Date.now());
            const timesUsed = Number(pass.times_used) || 0;
            const maxUses = Number(pass.max_uses);
            const usageExhausted = Number.isFinite(maxUses) && maxUses > 0 && timesUsed >= maxUses;

            if (isExpired) {
              return res.status(400).json({ success: false, valid: false, isExpired: true, error: 'Access code has expired.' });
            }
            if (usageExhausted) {
              return res.status(400).json({ success: false, valid: false, error: 'Access code usage limit reached.' });
            }

            const redemptionFilters = [
              `code=eq.${encodeURIComponent(rawCode)}`,
              'is_active=eq.true',
              pass.times_used == null ? 'times_used=is.null' : `times_used=eq.${timesUsed}`
            ];
            if (Number.isFinite(maxUses) && maxUses > 0) {
              redemptionFilters.push(`max_uses=gte.${timesUsed + 1}`);
            }
            if (pass.expires_at) {
              redemptionFilters.push(`expires_at=gte.${encodeURIComponent(new Date().toISOString())}`);
            } else {
              redemptionFilters.push('expires_at=is.null');
            }

            const redeemRes = await fetch(`${SUPABASE_URL}/rest/v1/access_codes?${redemptionFilters.join('&')}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({ times_used: timesUsed + 1 })
            });
            if (!redeemRes.ok) {
              return res.status(503).json({
                success: false,
                valid: false,
                error: 'Access code redemption could not be completed. Please try again.'
              });
            }
            const redeemedRows = await redeemRes.json();
            if (!Array.isArray(redeemedRows) || redeemedRows.length !== 1) {
              return res.status(400).json({
                success: false,
                valid: false,
                error: 'Access code usage limit reached or the code was revoked.'
              });
            }

            const isSess = !!(pass.is_session_pass || rawCode.startsWith('LIVE-') || rawCode.startsWith('PAS-'));
            matchedResult = {
              valid: true,
              isSessionPass: isSess,
              accessCode: rawCode,
              role: 'student',
              passType: isSess ? 'Live Session Pass' : 'Course Enrollment Code',
              student: {
                id: pass.student_id || ('PASS-' + pass.code),
                name: pass.label || 'Enrolled Student',
                email: pass.student_email || 'student@greachimpact.com',
                course: pass.course_name || 'Microsoft Excel for Beginners',
                cohort: pass.cohort || 'Batch 2: 2026 Masterclass',
                accessType: isSess ? 'session_pass' : 'access_code',
                expiresAt: pass.expires_at
              },
              expiry: {
                isExpired: false,
                message: pass.expires_at ? `Valid until ${new Date(pass.expires_at).toLocaleDateString()}` : 'Active Cloud Access'
              }
            };
          }
        }

        // 3. Lookup 2: live_session_passes table (if not matched yet)
        if (!matchedResult) {
          const lpRes = await fetch(
            `${SUPABASE_URL}/rest/v1/live_session_passes?pass_code=eq.${encodeURIComponent(rawCode)}&is_active=eq.true&select=*`,
            { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
          );
          if (lpRes.ok) {
            const lps = await lpRes.json();
            if (Array.isArray(lps) && lps.length > 0) {
              const pass = lps[0];
              const isExpired = pass.expires_at && new Date(pass.expires_at).getTime() < Date.now();
              if (isExpired) {
                return res.status(400).json({ success: false, valid: false, isExpired: true, error: 'Live session pass has expired.' });
              }
              matchedResult = {
                valid: true,
                isSessionPass: true,
                sessionPassCode: rawCode,
                role: 'student',
                passType: 'Live Session Pass',
                student: {
                  id: pass.id || ('PAS-' + pass.pass_code),
                  name: pass.session_label || 'Live Participant',
                  email: 'guest@greachimpact.com',
                  course: pass.course_name || 'Microsoft Excel for Beginners',
                  cohort: pass.cohort || 'Batch 2: 2026 Masterclass',
                  accessType: 'session_pass',
                  expiresAt: pass.expires_at
                },
                expiry: {
                  isExpired: false,
                  message: pass.expires_at ? `Valid until ${new Date(pass.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Active Live Pass'
                }
              };
            }
          }
        }

        // 4. Lookup 3: students table via secret_password (legacy access voucher code)
        if (!matchedResult) {
          let studentFilter = `secret_password=eq.${encodeURIComponent(rawCode)}`;
          if (studentIdParam) {
            studentFilter += `&id=eq.${encodeURIComponent(studentIdParam)}`;
          }
          const stRes = await fetch(
            `${SUPABASE_URL}/rest/v1/students?${studentFilter}&select=*`,
            { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
          );
          if (stRes.ok) {
            const sts = await stRes.json();
            if (Array.isArray(sts) && sts.length > 0) {
              const s = sts[0];
              if (s.status === 'Pending Payment') {
                return res.status(402).json({ success: false, valid: false, isPendingPayment: true, error: 'Registration payment is pending verification.' });
              }
              const isExpired = s.expires_at && new Date(s.expires_at).getTime() < Date.now();
              if (isExpired) {
                return res.status(403).json({ success: false, valid: false, isExpired: true, error: `Student enrollment expired on ${new Date(s.expires_at).toLocaleDateString()}.` });
              }
              matchedResult = {
                valid: true,
                isSessionPass: false,
                role: 'student',
                passType: 'Student Account',
                student: {
                  id: s.id,
                  name: s.full_name,
                  email: s.registered_email,
                  course: s.enrolled_course || 'Microsoft Excel for Beginners',
                  cohort: s.cohort || 'Batch 2: 2026 Masterclass',
                  accessType: 'student_voucher',
                  expiresAt: s.expires_at
                },
                expiry: {
                  isExpired: false,
                  message: s.expires_at ? `Valid until ${new Date(s.expires_at).toLocaleDateString()}` : 'Active Student Access'
                }
              };
            }
          }
        }

        // If no match found across any table, record rate limit failure & return generic error
        if (!matchedResult) {
          await recordFailedAttempt(rateLimitKey);
          return res.status(400).json({
            success: false,
            valid: false,
            error: 'Invalid, expired, or unrecognized access code.'
          });
        }

        // Reset rate limit failure count on successful code entry
        await clearRateLimit(rateLimitKey);

        // 5. Issue Cryptographically Signed Student Session Token & Session ID
        const studentObj = matchedResult.student;
        const sessionToken = signToken({
          sub: studentObj.id,
          user: studentObj.name,
          email: studentObj.email,
          role: 'student',
          course: studentObj.course,
          cohort: studentObj.cohort,
          accessType: studentObj.accessType,
          accessCode: matchedResult.accessCode,
          sessionPassCode: matchedResult.sessionPassCode,
          exp: Date.now() + 24 * 60 * 60 * 1000 // 24-hour classroom token
        }, AUTH_SECRET);

        const serverSessionId = generateServerSessionId(studentObj.id, AUTH_SECRET);

        return res.status(200).json({
          success: true,
          valid: true,
          isSessionPass: !!matchedResult.isSessionPass,
          passType: matchedResult.passType,
          student: studentObj,
          expiry: matchedResult.expiry,
          sessionToken,
          sessionId: serverSessionId
        });

      } catch (err) {
        console.error('[API Auth] Voucher verification error:', err);
        return res.status(500).json({ success: false, error: 'Access code verification service error.' });
      }
    }

    if (action === 'submit_course_project') {
      const token = certificateBearer(req);
      const payload = verifyToken(token, AUTH_SECRET);
      const courseId = certificateText(req.body?.courseId, 50);
      const projectTitle = certificateText(req.body?.projectTitle, 150);
      const projectUrl = certificateText(req.body?.projectUrl, 2048);
      const submissionNotes = certificateText(req.body?.submissionNotes, 3000);
      let parsedProjectUrl;
      try { parsedProjectUrl = new URL(projectUrl); } catch (error) { parsedProjectUrl = null; }
      if (!payload || !projectTitle || !parsedProjectUrl || parsedProjectUrl.protocol !== 'https:' ||
          parsedProjectUrl.username || parsedProjectUrl.password || !submissionNotes) {
        return res.status(400).json({ success: false, error: 'A signed student session, project title, HTTPS evidence link, and completion summary are required.' });
      }
      const entitlement = await findStudentCertificateEntitlement(payload, courseId);
      if (!entitlement.ok) return res.status(entitlement.status).json({ success: false, error: entitlement.error });

      const pendingRes = await certificateDb(
        `project_submissions?student_id=eq.${encodeURIComponent(entitlement.student.id)}&course_id=eq.${encodeURIComponent(entitlement.course.course_id)}&status=eq.pending_review&select=id&limit=1`
      );
      if (!pendingRes.ok) return res.status(503).json({ success: false, error: 'Submission status could not be checked.' });
      if ((await pendingRes.json()).length) return res.status(409).json({ success: false, error: 'A course completion submission is already awaiting review.' });

      const insertRes = await certificateDb('project_submissions', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          student_id: entitlement.student.id,
          student_name: entitlement.student.full_name,
          student_email: entitlement.student.registered_email,
          course_id: entitlement.course.course_id,
          course_name: entitlement.course.course_name,
          project_title: projectTitle,
          project_url: parsedProjectUrl.toString(),
          submission_notes: submissionNotes,
          status: 'pending_review',
          submitted_at: new Date().toISOString()
        })
      });
      if (!insertRes.ok) return res.status(503).json({ success: false, error: 'The course evidence could not be recorded.' });
      const inserted = await insertRes.json();
      if (!Array.isArray(inserted) || inserted.length !== 1) return res.status(503).json({ success: false, error: 'The course evidence was not confirmed by the registry.' });
      return res.status(201).json({ success: true, submission: { id: inserted[0].id, status: inserted[0].status } });
    }

    if (action === 'list_certificate_registry') {
      const admin = await verifyCertificateAdmin(req, AUTH_SECRET);
      if (!admin.ok) return res.status(admin.status).json({ success: false, error: admin.error });
      const registryRes = await certificateDb(
        'issued_certificates?select=certificate_id,student_name,course_name,issued_date,verification_url,status,completion_id&order=created_at.desc&limit=200'
      );
      if (!registryRes.ok) return res.status(503).json({ success: false, error: 'The certificate registry could not be loaded.' });
      const records = await registryRes.json();
      return res.status(200).json({ success: true, certificates: (Array.isArray(records) ? records : []).map(row => ({
        certificateId: row.certificate_id, studentName: row.student_name, courseName: row.course_name,
        issuedDate: row.issued_date, verificationUrl: row.verification_url,
        status: row.status, hasCompletion: !!row.completion_id
      })) });
    }

    if (action === 'list_course_submissions') {
      const admin = await verifyCertificateAdmin(req, AUTH_SECRET);
      if (!admin.ok) return res.status(admin.status).json({ success: false, error: admin.error });
      const submissionsRes = await certificateDb(
        'project_submissions?status=eq.pending_review&select=id,student_id,student_name,student_email,course_id,course_name,project_title,project_url,submission_notes,submitted_at,status&order=submitted_at.asc'
      );
      if (!submissionsRes.ok) return res.status(503).json({ success: false, error: 'Course submissions could not be loaded.' });
      return res.status(200).json({ success: true, submissions: await submissionsRes.json() });
    }

    if (action === 'review_course_submission') {
      const admin = await verifyCertificateAdmin(req, AUTH_SECRET);
      if (!admin.ok) return res.status(admin.status).json({ success: false, error: admin.error });
      const submissionId = certificateText(req.body?.submissionId, 36);
      const decision = req.body?.decision;
      const reviewNotes = certificateText(req.body?.reviewNotes, 2000);
      const completionDate = certificateText(req.body?.completionDate, 10);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId) ||
          !['approved', 'rejected'].includes(decision) || reviewNotes.length < 10 ||
          (decision === 'approved' && (req.body?.completionConfirmed !== true || !/^\d{4}-\d{2}-\d{2}$/.test(completionDate) || completionDate > new Date().toISOString().slice(0, 10)))) {
        return res.status(400).json({ success: false, error: 'Review decision, substantive notes, verified completion checklist, and a non-future completion date are required.' });
      }
      const reviewRes = await certificateDb('rpc/review_course_project', {
        method: 'POST',
        body: JSON.stringify({
          p_submission_id: submissionId,
          p_reviewer_id: admin.user.id,
          p_decision: decision,
          p_completion_date: decision === 'approved' ? completionDate : null,
          p_review_notes: reviewNotes
        })
      });
      if (!reviewRes.ok) {
        const errorBody = await reviewRes.text();
        const status = /23505|unique/i.test(errorBody) ? 409 : (/42501|entitlement/i.test(errorBody) ? 403 : 409);
        return res.status(status).json({ success: false, error: 'The submission could not be reviewed in its current state.' });
      }
      const rows = await reviewRes.json();
      if (!Array.isArray(rows) || rows.length !== 1) return res.status(503).json({ success: false, error: 'The review result was not confirmed by the registry.' });
      return res.status(200).json({ success: true, submission: { id: rows[0].submission_id, status: rows[0].submission_status }, completionId: rows[0].completion_id || null });
    }

    if (action === 'issue_certificate') {
      const payload = verifyToken(certificateBearer(req), AUTH_SECRET);
      const courseId = certificateText(req.body?.courseId, 50);
      const entitlement = await findStudentCertificateEntitlement(payload, courseId);
      if (!entitlement.ok) return res.status(entitlement.status).json({ success: false, error: entitlement.error });
      const verificationBase = certificateVerificationBaseUrl();
      if (!verificationBase) return res.status(503).json({ success: false, error: 'The deployment verification domain is not configured.' });
      const certificateId = `GI-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
      const verificationUrl = `${verificationBase}/classroom/verify-certificate.html?id=${certificateId}`;
      const issueRes = await certificateDb('rpc/issue_course_certificate', {
        method: 'POST',
        body: JSON.stringify({
          p_student_id: entitlement.student.id,
          p_course_id: entitlement.course.course_id,
          p_certificate_id: certificateId,
          p_verification_url: verificationUrl,
          p_issuer_type: 'student_self_service',
          p_issued_by: entitlement.student.id
        })
      });
      if (!issueRes.ok) {
        const errorBody = await issueRes.text();
        const status = /completion/i.test(errorBody) ? 409 : (/entitlement/i.test(errorBody) ? 403 : 503);
        const message = /revoked|replaced/i.test(errorBody)
          ? 'This completion has a revoked or replaced certificate. Contact an administrator for the authorized lifecycle process.'
          : status === 409 ? 'An instructor-approved course completion is required before certificate issuance.'
            : 'Certificate issuance could not be confirmed by the registry.';
        return res.status(status).json({ success: false, error: message });
      }
      const issuedRows = await issueRes.json();
      const certificate = Array.isArray(issuedRows) && issuedRows.length === 1 ? issuedRows[0] : null;
      if (!certificate || certificate.student_id !== entitlement.student.id || certificate.status !== 'valid') {
        return res.status(503).json({ success: false, error: 'The issued certificate could not be confirmed.' });
      }
      return res.status(200).json({ success: true, certificate: {
        certificateId: certificate.certificate_id,
        courseId: certificate.course_id,
        courseName: certificate.course_name,
        issuedDate: certificate.issued_date,
        status: certificate.status,
        verificationUrl: certificate.verification_url
      } });
    }

    if (action === 'list_my_certificates') {
      const payload = verifyToken(certificateBearer(req), AUTH_SECRET);
      if (!payload || payload.role !== 'student' || !payload.sub || payload.sub.startsWith('PASS-') || payload.sub.startsWith('PAS-')) {
        return res.status(401).json({ success: false, error: 'A signed individual student session is required.' });
      }
      const certRes = await certificateDb(
        `issued_certificates?student_id=eq.${encodeURIComponent(payload.sub)}&select=certificate_id,course_id,course_name,issued_date,verification_url,status,completion_id&order=created_at.desc`
      );
      if (!certRes.ok) return res.status(503).json({ success: false, error: 'Your certificate records could not be retrieved.' });
      const rows = await certRes.json();
      const completionIds = [...new Set((Array.isArray(rows) ? rows : []).map(row => row.completion_id).filter(Boolean))];
      let completions = [];
      if (completionIds.length) {
        const completionRes = await certificateDb(`course_completion_records?id=in.(${completionIds.join(',')})&student_id=eq.${encodeURIComponent(payload.sub)}&select=id,completion_date`);
        if (!completionRes.ok) return res.status(503).json({ success: false, error: 'Certificate completion records could not be retrieved.' });
        completions = await completionRes.json();
      }
      const completionDates = new Map(completions.map(row => [row.id, row.completion_date]));
      const certificates = (Array.isArray(rows) ? rows : []).map(row => ({
        certificateId: row.certificate_id,
        courseId: row.course_id,
        courseName: row.course_name,
        issuedDate: row.issued_date,
        completionDate: completionDates.get(row.completion_id) || null,
        status: row.status,
        verificationUrl: row.verification_url
      }));
      for (const row of rows) {
        const eventRes = await certificateDb('certificate_events', {
          method: 'POST',
          body: JSON.stringify({ certificate_id: row.certificate_id, event_type: 'retrieved', actor_type: 'student', actor_id: payload.sub })
        });
        if (!eventRes.ok) return res.status(503).json({ success: false, error: 'Certificate retrieval could not be recorded for audit.' });
      }
      return res.status(200).json({ success: true, certificates });
    }

    if (action === 'download_certificate_pdf') {
      const payload = verifyToken(certificateBearer(req), AUTH_SECRET);
      const certificateId = certificateText(req.body?.certificateId, 100).toUpperCase();
      if (!payload || payload.role !== 'student' || !payload.sub ||
          payload.sub.startsWith('PASS-') || payload.sub.startsWith('PAS-') ||
          !/^GI-[A-F0-9]{32}$/.test(certificateId)) {
        return res.status(401).json({ success: false, error: 'A signed individual student session and valid certificate reference are required.' });
      }
      const certRes = await certificateDb(
        `issued_certificates?certificate_id=eq.${encodeURIComponent(certificateId)}&student_id=eq.${encodeURIComponent(payload.sub)}&status=eq.valid&select=certificate_id,student_id,student_name,course_id,course_name,issued_date,verification_url,completion_id`
      );
      if (!certRes.ok) return res.status(503).json({ success: false, error: 'Certificate record could not be verified.' });
      const certRows = await certRes.json();
      const cert = Array.isArray(certRows) && certRows.length === 1 ? certRows[0] : null;
      if (!cert || !cert.completion_id) return res.status(404).json({ success: false, error: 'No valid certificate owned by this student session was found.' });
      const completionRes = await certificateDb(
        `course_completion_records?id=eq.${encodeURIComponent(cert.completion_id)}&student_id=eq.${encodeURIComponent(payload.sub)}&status=eq.approved&select=completion_date`
      );
      if (!completionRes.ok) return res.status(503).json({ success: false, error: 'Course completion status could not be verified.' });
      const completionRows = await completionRes.json();
      if (!Array.isArray(completionRows) || completionRows.length !== 1) return res.status(404).json({ success: false, error: 'The course completion is not currently approved.' });
      const auditRes = await certificateDb('certificate_events', {
        method: 'POST', body: JSON.stringify({ certificate_id: cert.certificate_id, event_type: 'retrieved', actor_type: 'student', actor_id: payload.sub, details: { format: 'pdf' } })
      });
      if (!auditRes.ok) return res.status(503).json({ success: false, error: 'Certificate retrieval could not be recorded.' });
      const pdf = createCertificatePdf({
        certificateId: cert.certificate_id, studentName: cert.student_name, courseName: cert.course_name,
        issuedDate: cert.issued_date, completionDate: completionRows[0].completion_date,
        verificationUrl: cert.verification_url
      });
      res.status(200);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${cert.certificate_id}.pdf"`);
      res.setHeader('Content-Length', String(pdf.length));
      res.setHeader('Cache-Control', 'private, no-store');
      return res.end(pdf);
    }

    if (action === 'revoke_certificate' || action === 'reissue_certificate') {
      const admin = await verifyCertificateAdmin(req, AUTH_SECRET);
      if (!admin.ok) return res.status(admin.status).json({ success: false, error: admin.error });
      const certificateId = certificateText(req.body?.certificateId, 100).toUpperCase();
      const reason = certificateText(req.body?.reason, 1000);
      if (!/^GI-[A-F0-9]{32}$/.test(certificateId) || reason.length < 10) {
        return res.status(400).json({ success: false, error: 'A valid certificate reference and reason of at least 10 characters are required.' });
      }
      if (action === 'revoke_certificate') {
        const revokeRes = await certificateDb('rpc/revoke_course_certificate', {
          method: 'POST', body: JSON.stringify({ p_certificate_id: certificateId, p_admin_id: admin.user.id, p_reason: reason })
        });
        if (!revokeRes.ok) return res.status(409).json({ success: false, error: 'Certificate is missing or is not currently valid.' });
        const rows = await revokeRes.json();
        if (!Array.isArray(rows) || rows.length !== 1) return res.status(503).json({ success: false, error: 'The revocation was not confirmed.' });
        return res.status(200).json({ success: true, certificateId, status: 'revoked' });
      }
      const verificationBase = certificateVerificationBaseUrl();
      if (!verificationBase) return res.status(503).json({ success: false, error: 'The deployment verification domain is not configured.' });
      const replacementId = `GI-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
      const reissueRes = await certificateDb('rpc/reissue_course_certificate', {
        method: 'POST', body: JSON.stringify({
          p_old_certificate_id: certificateId,
          p_new_certificate_id: replacementId,
          p_verification_url: `${verificationBase}/classroom/verify-certificate.html?id=${replacementId}`,
          p_admin_id: admin.user.id,
          p_reason: reason
        })
      });
      if (!reissueRes.ok) return res.status(409).json({ success: false, error: 'Certificate could not be reissued in its current state.' });
      const rows = await reissueRes.json();
      if (!Array.isArray(rows) || rows.length !== 1) return res.status(503).json({ success: false, error: 'The reissue was not confirmed.' });
      return res.status(200).json({ success: true, certificate: {
        certificateId: rows[0].certificate_id,
        courseName: rows[0].course_name,
        issuedDate: rows[0].issued_date,
        status: rows[0].status,
        verificationUrl: rows[0].verification_url
      } });
    }

    // ==============================================================
    // ACTION: SECURE PUBLIC CERTIFICATE VERIFICATION
    // Exposes strictly the minimum public verification fields.
    // Completely shields student_id, created_at, verification_url, and pdf_url.
    // Protected by IP-based rate limiting to defeat bulk scraping / enumeration.
    // ==============================================================
    if (action === 'verify_certificate') {
      const rawCertId = (req.body?.certificateId || req.body?.certId || req.body?.serialId || '').trim().toUpperCase();

      if (!rawCertId || rawCertId.length < 5 || rawCertId.length > 50) {
        return res.status(400).json({
          success: false,
          valid: false,
          error: 'Please enter a valid certificate serial identifier.'
        });
      }

      // 1. IP-Based Rate Limiting to Prevent Certificate Scraping / Enumeration
      const rateLimitKey = clientIp ? `cert:${clientIp}` : `cert:anon:${crypto.createHash('sha256').update(req.headers['user-agent'] || 'ua').digest('hex').substring(0, 16)}`;
      const rateLimitStatus = await checkRateLimit(rateLimitKey);
      if (rateLimitStatus.blocked) {
        return res.status(429).json({
          success: false,
          valid: false,
          error: `Too many certificate lookup attempts. Security lockout active for ${rateLimitStatus.remainingMin} minute(s).`
        });
      }

      try {
        // Securely invoke database RPC public.verify_certificate via service_role credentials
        const certRes = await fetch(
          `${SUPABASE_URL}/rest/v1/rpc/verify_certificate`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_certificate_id: rawCertId })
          }
        );

        if (!certRes.ok) {
          await recordFailedAttempt(rateLimitKey);
          return res.status(503).json({
            success: false,
            valid: false,
            error: 'Certificate verification is temporarily unavailable.'
          });
        }

        const rows = await certRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const cert = rows[0];
          await clearRateLimit(rateLimitKey);
          return res.status(200).json({
            success: true,
            valid: cert.is_valid === true,
            certificate: {
              certificateId: cert.certificate_id,
              studentName: cert.student_name,
              courseName: cert.course_name,
              issuedDate: cert.issued_date,
              completionDate: cert.course_completion_date,
              status: cert.certificate_status || 'unverified',
              verificationStatus: cert.is_valid === true ? 'Verified & Accredited' :
                (cert.certificate_status === 'revoked' ? 'Revoked' :
                  (cert.certificate_status === 'reissued' ? 'Reissued; use the replacement reference' : 'Not verified'))
            }
          });
        }

        await recordFailedAttempt(rateLimitKey);
        return res.status(404).json({
          success: false,
          valid: false,
          error: 'Certificate not found or unrecognized serial identifier.'
        });

      } catch (err) {
        console.error('[API Auth] Certificate verification error:', err);
        return res.status(500).json({ success: false, error: 'Certificate verification service error.' });
      }
    }

    // ==============================================================
    // ACTION: LOGOUT / REVOKE SESSION
    // ==============================================================
    if (action === 'logout') {
      const payload = verifyToken(activeToken, AUTH_SECRET);

      if (payload && payload.sbToken) {
        try {
          await callSupabaseAuth('logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${payload.sbToken}` }
          });
        } catch (e) {}
      }

      // Clear cookies with Max-Age=0
      res.setHeader('Set-Cookie', [
        'gi_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
        'gi_csrf=; Path=/; Max-Age=0; SameSite=Lax'
      ]);

      return res.status(200).json({
        success: true,
        message: 'Administrator session revoked successfully.'
      });
    }

    // ==============================================================
    // ACTION: LOGIN VIA SUPABASE AUTH
    // ==============================================================
    if (action === 'login') {
      const rawUser = (email || identifier || username || '').trim();
      const rawPass = (password || '').trim();

      // Resolve Rate Limit Key:
      // Uses verified proxy IP when present. When IP is unavailable, keys by normalized
      // user identifier or session nonce, eliminating the shared-bucket denial-of-service risk.
      const rateLimitKey = clientIp || (rawUser ? `user:${rawUser.toLowerCase()}` : `sess:${req.headers['user-agent'] ? crypto.createHash('sha256').update(req.headers['user-agent']).digest('hex').substring(0, 16) : 'anonymous'}`);

      // Rate limit check before credential inspection
      const rateLimitStatus = await checkRateLimit(rateLimitKey);
      if (rateLimitStatus.blocked) {
        return res.status(429).json({
          success: false,
          error: `Too many failed attempts. Security lockout active for ${rateLimitStatus.remainingMin} minute(s).`
        });
      }

      // Check MFA Challenge Ticket Replay & Validity if provided
      if (ticket) {
        const parsedTicket = verifyToken(ticket, AUTH_SECRET);
        if (!parsedTicket || parsedTicket.purpose !== 'mfa_challenge') {
          return res.status(401).json({ success: false, error: 'Invalid or expired MFA challenge ticket.' });
        }
        if (consumedMfaTickets.has(parsedTicket.jti)) {
          return res.status(401).json({ success: false, error: 'MFA challenge ticket has already been used. Please log in again.' });
        }
        consumedMfaTickets.add(parsedTicket.jti);
      }

      if (!rawUser || !rawPass) {
        return res.status(400).json({
          success: false,
          error: 'Email (or username) and password are required.'
        });
      }

      let targetEmail = rawUser;
      if (rawUser.toLowerCase() === SUPER_ADMIN_USERNAME.toLowerCase() || rawUser.toLowerCase() === 'admin') {
        targetEmail = SUPER_ADMIN_EMAIL;
      }

      let sbRes;
      try {
        sbRes = await callSupabaseAuth('token?grant_type=password', {
          method: 'POST',
          body: JSON.stringify({ email: targetEmail, password: rawPass })
        });
      } catch (err) {
        return res.status(503).json({
          success: false,
          error: 'Supabase authentication service unavailable: ' + err.message
        });
      }

      if (sbRes.ok) {
        const authData = await sbRes.json();
        const sbUser = authData.user || {};
        const userEmail = (sbUser.email || targetEmail).toLowerCase();

        // 4. ROLE VERIFICATION - USER_METADATA STRICTLY IGNORED
        // Hardened RBAC: An email match alone NEVER grants Super Admin privileges.
        // The live account MUST have app_metadata.role === 'super_admin'.
        const appRole = sbUser.app_metadata?.role;
        const isSuperAdminEmail = userEmail === SUPER_ADMIN_EMAIL;

        let role = 'student';
        let isSuper = false;

        if (appRole === 'super_admin' && isSuperAdminEmail) {
          role = 'super_admin';
          isSuper = true;
        } else if (appRole === 'sub_admin') {
          role = 'sub_admin';
          isSuper = false;
        } else {
          role = 'student';
          isSuper = false;
        }

        const displayName = sbUser.user_metadata?.name || (isSuper ? 'Lead Super Administrator' : (role === 'sub_admin' ? 'Administrator' : 'Student'));
        const displayUser = isSuper ? SUPER_ADMIN_USERNAME : (userEmail.split('@')[0]);

        // 5. COMPULSORY MFA FOR SUPER ADMIN
        const factors = authData.user?.factors || [];
        const verifiedTotp = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');

        if (isSuper && !verifiedTotp) {
          // Super Admin must set up MFA before session can be granted
          const setupTicket = signToken({
            sub: sbUser.id,
            email: userEmail,
            sbToken: authData.access_token,
            purpose: 'mfa_compulsory_setup',
            jti: crypto.randomBytes(16).toString('hex'),
            exp: Date.now() + 15 * 60 * 1000
          }, AUTH_SECRET);

          return res.status(403).json({
            success: false,
            mfaSetupRequired: true,
            ticket: setupTicket,
            error: 'Compulsory Multi-Factor Authentication (MFA) required for Super Administrator. Setup must be activated before access is granted.'
          });
        }

        if (verifiedTotp && !mfaCode) {
          // Generate non-replayable MFA Challenge Ticket
          const ticketJti = crypto.randomBytes(16).toString('hex');
          const challengeTicket = signToken({
            sub: sbUser.id,
            factorId: verifiedTotp.id,
            email: userEmail,
            sbToken: authData.access_token,
            purpose: 'mfa_challenge',
            jti: ticketJti,
            exp: Date.now() + 5 * 60 * 1000
          }, AUTH_SECRET);

          return res.status(200).json({
            success: true,
            mfaRequired: true,
            factorId: verifiedTotp.id,
            ticket: challengeTicket,
            message: 'MFA TOTP verification code required.'
          });
        }

        if (verifiedTotp && mfaCode) {
          try {
            const challengeRes = await callSupabaseAuth(`factors/${verifiedTotp.id}/challenge`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${authData.access_token}` }
            });
            if (!challengeRes.ok) {
              return res.status(401).json({ success: false, error: 'Failed to initiate MFA challenge.' });
            }
            const chal = await challengeRes.json();
            const verifyRes = await callSupabaseAuth(`factors/${verifiedTotp.id}/verify`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${authData.access_token}` },
              body: JSON.stringify({ challenge_id: chal.id, code: mfaCode.trim() })
            });
            if (!verifyRes.ok) {
              return res.status(401).json({ success: false, error: 'Invalid MFA verification code.' });
            }
          } catch (e) {
            return res.status(401).json({ success: false, error: 'MFA verification failed: ' + e.message });
          }
        }

        // Authentication succeeded: clear rate limits
        await clearRateLimit(rateLimitKey);

        const expTime = Date.now() + 8 * 60 * 60 * 1000;
        const csrfToken = crypto.randomBytes(24).toString('hex');

        const sessionPayload = {
          sub: sbUser.id,
          user: displayUser,
          email: userEmail,
          name: displayName,
          role: role,
          isSuper: isSuper,
          mfaVerified: isSuper && Boolean(verifiedTotp && mfaCode),
          sbToken: authData.access_token,
          csrf: csrfToken,
          exp: expTime,
          iat: Date.now()
        };

        const serverToken = signToken(sessionPayload, AUTH_SECRET);

        // 6. ISSUE HTTPONLY, SECURE, SAMESITE COOKIES
        const isHttps = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
        const sessionCookie = `gi_session=${serverToken}; HttpOnly; Path=/; Max-Age=${8 * 3600}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
        const csrfCookie = `gi_csrf=${csrfToken}; Path=/; Max-Age=${8 * 3600}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
        res.setHeader('Set-Cookie', [sessionCookie, csrfCookie]);

        return res.status(200).json({
          success: true,
          role: role,
          username: displayUser,
          name: displayName,
          email: userEmail,
          isSuperAdmin: isSuper,
          csrfToken: csrfToken,
          token: serverToken,
          expiresAt: new Date(expTime).toISOString()
        });
      }

      // Record failed attempt
      const memRecord = await recordFailedAttempt(rateLimitKey);
      const remaining = MAX_ATTEMPTS - memRecord.count;
      const warnMsg = remaining > 0
        ? `Invalid credentials. ${remaining} attempt(s) remaining before security lockout.`
        : 'Invalid credentials. Security lockout initiated for 15 minutes.';

      return res.status(401).json({ success: false, error: warnMsg });
    }

    // ==============================================================
    // ACTION: VERIFY SUPER ADMIN ACTION (In-session re-authentication)
    // ==============================================================
    if (action === 'verify_super_action') {
      const headers = req.headers || {};
      const authHeader = headers['authorization'] || headers['Authorization'];
      const hasBearer = Boolean(authHeader && /^Bearer\s+/i.test(authHeader));
      const hasBodyOrQueryToken = Boolean(bodyToken || req.query?.token || req.body?.adminToken || req.query?.adminToken);

      if (hasBodyOrQueryToken) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Admin authentication token must be provided exclusively via HTTP Authorization header (Bearer <token>). Request body and query parameter tokens are rejected.'
        });
      }

      if (!hasBearer && !cookieSession) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Administrative Bearer token required in HTTP Authorization header.'
        });
      }

      const activeTokenToUse = hasBearer ? authHeader.replace(/^Bearer\s+/i, '').trim() : cookieSession;
      const payload = verifyToken(activeTokenToUse, AUTH_SECRET);

      if (!payload || !payload.isSuper || payload.role !== 'super_admin' || payload.mfaVerified !== true) {
        return res.status(403).json({
          success: false,
          error: 'Verified Super Administrator authorization with TOTP MFA required.'
        });
      }
      if (!payload.sub) {
        return res.status(403).json({ success: false, error: 'Super Administrator account verification is unavailable.' });
      }

      let liveUserRes;
      try {
        liveUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(payload.sub)}`, {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
          },
          signal: AbortSignal.timeout(5000)
        });
      } catch (error) {
        console.error('[API Auth] Live Super Admin verification failed.');
        return res.status(503).json({ success: false, error: 'Super Administrator authorization could not be verified.' });
      }
      if (!liveUserRes.ok) {
        return res.status(403).json({ success: false, error: 'Super Administrator privileges are unavailable or have been revoked.' });
      }
      const liveUser = await liveUserRes.json();
      if (liveUser.app_metadata?.role !== 'super_admin' ||
          (liveUser.email || '').toLowerCase() !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ success: false, error: 'Super Administrator privileges are unavailable or have been revoked.' });
      }

      const pass = (password || '').trim();
      if (!pass) {
        return res.status(400).json({ success: false, error: 'Password confirmation required.' });
      }

      try {
        const verifyRes = await callSupabaseAuth('token?grant_type=password', {
          method: 'POST',
          body: JSON.stringify({ email: payload.email, password: pass })
        });
        if (verifyRes.ok) {
          return res.status(200).json({ success: true, verified: true });
        }
      } catch (e) {}

      return res.status(401).json({ success: false, error: 'Incorrect Super Administrator password.' });
    }

    // ==============================================================
    // ACTION: MFA SETUP / ENROLL TOTP FACTOR
    // ==============================================================
    if (action === 'mfa_enroll') {
      let sbTokenToUse = null;

      if (ticket) {
        const ticketPayload = verifyToken(ticket, AUTH_SECRET);
        if (ticketPayload && ticketPayload.sbToken && ticketPayload.purpose === 'mfa_compulsory_setup') {
          sbTokenToUse = ticketPayload.sbToken;
        }
      }

      if (!sbTokenToUse) {
        const payload = verifyToken(activeToken, AUTH_SECRET);
        if (payload && payload.sbToken) {
          sbTokenToUse = payload.sbToken;
        }
      }

      if (!sbTokenToUse) {
        return res.status(401).json({ success: false, error: 'Authenticated session or setup ticket required.' });
      }

      let enrollRes = await callSupabaseAuth('factors', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sbTokenToUse}` },
        body: JSON.stringify({
          factor_type: 'totp',
          friendly_name: `Greach Impact Admin`
        })
      });

      if (!enrollRes.ok && enrollRes.status === 422) {
        enrollRes = await callSupabaseAuth('factors', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sbTokenToUse}` },
          body: JSON.stringify({
            factor_type: 'totp',
            friendly_name: `Greach Impact Admin ${Date.now().toString(36)}`
          })
        });
      }

      if (!enrollRes.ok) {
        const err = await enrollRes.json();
        return res.status(enrollRes.status).json({ success: false, error: err.msg || 'MFA enrollment failed.' });
      }

      const factor = await enrollRes.json();
      return res.status(200).json({
        success: true,
        factorId: factor.id,
        totp: factor.totp
      });
    }

    // ==============================================================
    // ACTION: MFA VERIFY & ACTIVATE FACTOR
    // ==============================================================
    if (action === 'mfa_activate') {
      let sbTokenToUse = null;

      if (ticket) {
        const ticketPayload = verifyToken(ticket, AUTH_SECRET);
        if (ticketPayload && ticketPayload.sbToken) {
          sbTokenToUse = ticketPayload.sbToken;
        }
      }

      if (!sbTokenToUse) {
        const payload = verifyToken(activeToken, AUTH_SECRET);
        if (payload && payload.sbToken) {
          sbTokenToUse = payload.sbToken;
        }
      }

      if (!sbTokenToUse || !factorId || !mfaCode) {
        return res.status(400).json({ success: false, error: 'Missing factorId, code, or session ticket.' });
      }

      const challengeRes = await callSupabaseAuth(`factors/${factorId}/challenge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sbTokenToUse}` }
      });
      if (!challengeRes.ok) {
        return res.status(400).json({ success: false, error: 'Failed to create MFA challenge.' });
      }
      const chal = await challengeRes.json();

      const verifyRes = await callSupabaseAuth(`factors/${factorId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sbTokenToUse}` },
        body: JSON.stringify({ challenge_id: chal.id, code: mfaCode.trim() })
      });

      if (!verifyRes.ok) {
        return res.status(401).json({ success: false, error: 'Invalid MFA verification code.' });
      }

      return res.status(200).json({ success: true, message: 'MFA activated successfully.' });
    }

    // ==============================================================
    // ACTION: PASSWORD RESET REQUEST (Supabase Auth Recovery Email)
    // ==============================================================
    if (action === 'request_password_reset') {
      const rawId = (email || identifier || username || '').trim();
      if (!rawId) {
        return res.status(400).json({ success: false, error: 'Please enter your administrator email or username.' });
      }
      const resetRateKey = `pwdreset:${clientIp || rawId.toLowerCase()}`;
      const resetLimit = await checkRateLimit(resetRateKey);
      if (resetLimit.blocked) {
        return res.status(429).json({
          success: false,
          error: `Too many password reset requests. Please try again in ${resetLimit.remainingMin} minute(s).`
        });
      }
      await recordFailedAttempt(resetRateKey);

      let targetEmail = rawId.toLowerCase();
      if (targetEmail === SUPER_ADMIN_USERNAME.toLowerCase() || targetEmail === 'admin') {
        targetEmail = SUPER_ADMIN_EMAIL;
      }

      if (targetEmail === SUPER_ADMIN_EMAIL) {
        const redirectBase = certificateVerificationBaseUrl() || 'https://greach-impact-website.vercel.app';
        try {
          await callSupabaseAuth('recover', {
            method: 'POST',
            body: JSON.stringify({
              email: targetEmail,
              redirect_to: `${redirectBase}/admin.html`
            })
          });
        } catch (e) {
          console.error('[API Auth] Password recovery dispatch error:', e.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'If an administrator account matches that email, a password reset link has been sent. Check your inbox.'
      });
    }

    // ==============================================================
    // ACTION: COMPLETE PASSWORD RECOVERY (From Supabase Email Link)
    // ==============================================================
    if (action === 'complete_password_recovery') {
      const recoveryToken = typeof req.body?.recoveryToken === 'string' ? req.body.recoveryToken.trim() : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      const strongPw = newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
      if (!recoveryToken || !strongPw) {
        return res.status(400).json({
          success: false,
          error: 'A valid recovery link and a strong password (12+ characters with uppercase, lowercase, number, and symbol) are required.'
        });
      }

      const userRes = await callSupabaseAuth('user', {
        headers: { 'Authorization': `Bearer ${recoveryToken}` }
      });
      if (!userRes.ok) {
        return res.status(401).json({ success: false, error: 'Password recovery link is invalid or expired. Request a new link.' });
      }
      const sbUser = await userRes.json();
      if (sbUser.app_metadata?.role !== 'super_admin' || (sbUser.email || '').toLowerCase() !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ success: false, error: 'Recovery token does not belong to an authorized administrator.' });
      }

      const updateRes = await callSupabaseAuth('user', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${recoveryToken}` },
        body: JSON.stringify({ password: newPassword })
      });
      if (!updateRes.ok) {
        return res.status(400).json({ success: false, error: 'Could not update password. Request a fresh recovery link and try again.' });
      }

      try {
        await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
          method: 'POST',
          headers: serviceRoleHeaders(),
          body: JSON.stringify({
            action: 'admin_password_recovery_completed',
            performed_by: sbUser.email,
            target: sbUser.id,
            details: { method: 'email_recovery' },
            ip_address: clientIp || 'unknown'
          })
        });
      } catch (e) {}

      return res.status(200).json({ success: true, message: 'Password updated successfully. You can now sign in with your new password.' });
    }

    // ==============================================================
    // ACTION: CHANGE PASSWORD (Authenticated & TOTP-Verified Super Admin)
    // ==============================================================
    if (action === 'change_password') {
      const admin = await verifyCertificateAdmin(req, AUTH_SECRET);
      if (!admin.ok) return res.status(admin.status).json({ success: false, error: admin.error });

      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      const strongPw = newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /\d/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);

      if (!currentPassword || !strongPw || newPassword === currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and a different strong new password (12+ characters with uppercase, lowercase, number, and symbol) are required.'
        });
      }

      const verifyCurrRes = await callSupabaseAuth('token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email: admin.user.email, password: currentPassword })
      });
      if (!verifyCurrRes.ok) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
      }

      const updRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(admin.user.id)}`, {
        method: 'PUT',
        headers: serviceRoleHeaders(),
        body: JSON.stringify({ password: newPassword })
      });
      if (!updRes.ok) {
        return res.status(503).json({ success: false, error: 'Password update failed. Please try again.' });
      }

      try {
        await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
          method: 'POST',
          headers: serviceRoleHeaders(),
          body: JSON.stringify({
            action: 'admin_password_changed',
            performed_by: admin.user.email,
            target: admin.user.id,
            details: { method: 'authenticated_totp_session' },
            ip_address: clientIp || 'unknown'
          })
        });
      } catch (e) {}

      return res.status(200).json({ success: true, message: 'Administrator password changed successfully.' });
    }

    // ==============================================================
    // ACTION: TRUSTED ATTENDANCE HEARTBEAT (Classroom Telemetry)
    // Validates: 1) Authenticated session, 2) Student profile ownership,
    // 3) Active course or session pass entitlement, 4) Administrative termination kill-switch,
    // 5) Anti-takeover single-student ownership, 6) Secure session ID generation, 7) Frequency throttling.
    // ==============================================================
    if (action === 'heartbeat') {
      const payload = verifyToken(activeToken, AUTH_SECRET);
      if (!payload || !payload.sub) {
        return res.status(401).json({ success: false, error: 'Authentication required for attendance heartbeat.' });
      }

      const { sessionId, courseName, deviceInfo } = req.body || {};
      const cleanCourse = (courseName || '').trim();

      if (!cleanCourse) {
        return res.status(400).json({ success: false, error: 'Course name required for attendance.' });
      }

      // 1. Validate Student Profile Ownership
      let student = null;
      try {
        const stuRes = await fetch(`${SUPABASE_URL}/rest/v1/students?user_id=eq.${encodeURIComponent(payload.sub)}&select=*`, {
          headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
        });
        if (stuRes.ok) {
          const rows = await stuRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            student = rows[0];
          }
        }
        // Fallback for legacy voucher students where payload.sub is student.id (pre-Supabase Auth accounts)
        if (!student) {
          const stuIdRes = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${encodeURIComponent(payload.sub)}&select=*`, {
            headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
          });
          if (stuIdRes.ok) {
            const idRows = await stuIdRes.json();
            if (Array.isArray(idRows) && idRows.length > 0) {
              student = idRows[0];
            }
          }
        }
      } catch (e) {}

      if (!student) {
        return res.status(403).json({ success: false, error: 'Student profile not found.' });
      }

      // Secure Server-Issued Session ID Enforcement:
      // Cryptographically verify server-issued signature bound to this student profile.
      // - Generate a session ID only when the client has not supplied one.
      // - Reject an invalid client-supplied session ID instead of silently replacing it.
      let finalSessionId = (sessionId || '').trim();
      if (finalSessionId) {
        if (!verifyServerSessionId(finalSessionId, student.id, AUTH_SECRET)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid, forged, or unauthenticated session identifier.'
          });
        }
      } else {
        finalSessionId = generateServerSessionId(student.id, AUTH_SECRET);
      }

      // 2. Validate Active Account Status
      const isStudentActive = (student.status || 'Active') === 'Active';
      const isCourseExpired = student.expires_at && new Date(student.expires_at).getTime() < Date.now();
      if (!isStudentActive || isCourseExpired) {
        return res.status(403).json({ success: false, error: 'Active course enrollment required for attendance.' });
      }

      // 3. Validate Course or Live-Session Entitlement
      let hasEntitlement = false;
      if (student.enrolled_course && cleanCourse.toLowerCase() === student.enrolled_course.trim().toLowerCase()) {
        hasEntitlement = true;
      } else {
        // Check for active unexpired 24-hour live session pass
        try {
          const passRes = await fetch(
            `${SUPABASE_URL}/rest/v1/access_code_redemptions?student_id=eq.${encodeURIComponent(student.id)}&select=code,redeemed_at,access_codes(is_session_pass,course_name)`,
            { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
          );
          if (passRes.ok) {
            const redemptions = await passRes.json();
            const now = Date.now();
            hasEntitlement = redemptions.some(r => {
              const codeInfo = r.access_codes;
              if (!codeInfo || !codeInfo.is_session_pass) return false;
              if ((codeInfo.course_name || '').trim().toLowerCase() !== cleanCourse.toLowerCase()) return false;
              const redeemedTime = new Date(r.redeemed_at).getTime();
              return (now - redeemedTime) < 24 * 60 * 60 * 1000;
            });
          } else if (userRes && (userRes.status === 404 || userRes.status === 401)) {
            if (payload.role === 'super_admin') {
              return res.status(403).json({
                success: false,
                valid: false,
                error: 'Administrator account not found or access revoked. Session terminated.'
              });
            }
          }
        } catch (e) {}
      }

      if (!hasEntitlement) {
        return res.status(403).json({ success: false, error: 'Active course enrollment or valid session pass required for this course.' });
      }

      // 4. Administrative Termination Check (Anti-Bypass Lockout)
      // If administrator terminated any session for this student within the last 1 hour, reject
      try {
        const termRes = await fetch(
          `${SUPABASE_URL}/rest/v1/student_presence?student_id=eq.${encodeURIComponent(student.id)}&status=eq.terminated&select=session_id,last_heartbeat,terminated_at&order=last_heartbeat.desc&limit=1`,
          { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
        );
        if (termRes.ok) {
          const termRows = await termRes.json();
          if (Array.isArray(termRows) && termRows.length > 0) {
            const termTime = new Date(termRows[0].terminated_at || termRows[0].last_heartbeat).getTime();
            if (Date.now() - termTime < 60 * 60 * 1000) {
              return res.status(403).json({
                success: false,
                terminated: true,
                error: 'Session has been terminated by administrator.'
              });
            }
          }
        }
      } catch (e) {}

      // 5. Existing Session Check (Anti-Takeover & Frequency Throttle)
      try {
        const presRes = await fetch(`${SUPABASE_URL}/rest/v1/student_presence?session_id=eq.${encodeURIComponent(finalSessionId)}&select=*`, {
          headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
        });
        if (presRes.ok) {
          const presRows = await presRes.json();
          if (Array.isArray(presRows) && presRows.length > 0) {
            const existingPres = presRows[0];

            // Single-Student Ownership Enforcement: A student cannot take over or keep alive another student's session
            if (existingPres.student_id !== student.id) {
              return res.status(403).json({ success: false, error: 'Session belongs to another student profile.' });
            }

            if (existingPres.status === 'terminated') {
              return res.status(403).json({
                success: false,
                terminated: true,
                error: 'Session has been terminated by administrator.'
              });
            }

            // Frequency Limiting & Replay Protection (minimum 10 seconds between updates)
            const lastBeat = existingPres.last_heartbeat ? new Date(existingPres.last_heartbeat).getTime() : 0;
            if (Date.now() - lastBeat < 10000) {
              return res.status(200).json({
                success: true,
                status: 'throttled',
                sessionId: finalSessionId,
                message: 'Heartbeat acknowledged (frequency throttle active).'
              });
            }

            // Update existing presence
            await fetch(`${SUPABASE_URL}/rest/v1/student_presence?session_id=eq.${encodeURIComponent(finalSessionId)}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                last_heartbeat: new Date().toISOString(),
                status: 'online',
                device_info: deviceInfo || existingPres.device_info
              })
            });

            return res.status(200).json({ success: true, status: 'online', sessionId: finalSessionId });
          }
        }

        // 6. Concurrency-Safe Insert (resolution=merge-duplicates prevents duplicate sessions)
        await fetch(`${SUPABASE_URL}/rest/v1/student_presence`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            session_id: finalSessionId,
            student_id: student.id,
            student_name: student.full_name,
            student_email: student.registered_email,
            course_name: cleanCourse,
            status: 'online',
            last_heartbeat: new Date().toISOString(),
            device_info: deviceInfo || 'Web Browser'
          })
        });

        return res.status(200).json({ success: true, status: 'online', sessionId: finalSessionId });
      } catch (e) {
        return res.status(500).json({ success: false, error: 'Failed to record attendance heartbeat: ' + e.message });
      }
    }

    // ==============================================================
    // ACTION: ADMIN OPERATION PROXY (Server-Side Isolation)
    // Mediates all Admin Console database mutations via service_role
    // Only verified Super Administrators are authorized.
    // ==============================================================
    if (action === 'admin_operation') {
      const headers = req.headers || {};
      const authHeader = headers['authorization'] || headers['Authorization'];
      const hasBearer = Boolean(authHeader && /^Bearer\s+/i.test(authHeader));
      const hasBodyOrQueryToken = Boolean(bodyToken || req.query?.token || req.body?.adminToken || req.query?.adminToken);

      if (hasBodyOrQueryToken) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Admin authentication token must be provided exclusively via HTTP Authorization header (Bearer <token>). Request body and query parameter tokens are rejected.'
        });
      }

      if (!hasBearer && !cookieSession) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Administrative Bearer token required in HTTP Authorization header.'
        });
      }

      const activeTokenToUse = hasBearer ? authHeader.replace(/^Bearer\s+/i, '').trim() : cookieSession;
      const payload = verifyToken(activeTokenToUse, AUTH_SECRET);
      if (!payload || !payload.sub || payload.role !== 'super_admin' || payload.mfaVerified !== true) {
        return res.status(401).json({ success: false, error: 'Authentication required for administrative operations.' });
      }

      // Live Role Verification against auth.users (Never trust unverified payload/request body)
      let isSuper = false;
      try {
        let uRes = null;
        if (payload.sbToken) {
          uRes = await callSupabaseAuth('user', {
            headers: { 'Authorization': `Bearer ${payload.sbToken}` }
          });
        }
        if (!uRes || !uRes.ok) {
          uRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(payload.sub)}`, {
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
        }
        if (uRes && uRes.ok) {
          const uData = await uRes.json();
          const liveRole = uData.app_metadata?.role;
          const liveEmail = (uData.email || '').toLowerCase();
          // Hardened RBAC: Role in app_metadata is mandatory; email match alone cannot authorize admin operations
          if (liveRole === 'super_admin' && liveEmail === SUPER_ADMIN_EMAIL) {
            isSuper = true;
          }
        }
      } catch (e) {}

      if (!isSuper) {
        return res.status(403).json({
          success: false,
          error: 'Super Administrator authorization required. Access denied.'
        });
      }

      // CSRF Protection Validation
      const csrfHeader = req.headers['x-csrf-token'];
      const cookies = parseCookies(req.headers.cookie);
      const csrfCookie = cookies.greach_csrf;
      if (!csrfHeader || csrfHeader !== payload.csrf || (csrfCookie && csrfHeader !== csrfCookie)) {
        return res.status(403).json({ success: false, error: 'CSRF token validation failed.' });
      }

      const { operation, data } = req.body || {};

      // Server-Side Operation Allowlist
      const ALLOWED_ADMIN_OPS = new Set([
        'update_price',
        'update_schedule',
        'create_access_pass',
        'revoke_access_pass',
        'delete_access_pass',
        'terminate_presence'
      ]);

      if (!operation || !ALLOWED_ADMIN_OPS.has(operation)) {
        return res.status(400).json({ success: false, error: 'Unauthorized or invalid administrative operation.' });
      }

      try {
        // OP 1: Update Course Price
        if (operation === 'update_price') {
          const { courseId, promoPrice, originalPrice, discountPct } = data || {};
          if (!courseId || typeof courseId !== 'string' || isNaN(promoPrice) || isNaN(originalPrice) || Number(promoPrice) < 0 || Number(originalPrice) < 0) {
            return res.status(400).json({ success: false, error: 'Invalid course pricing parameters.' });
          }
          const pRes = await fetch(`${SUPABASE_URL}/rest/v1/course_prices?course_id=eq.${encodeURIComponent(courseId)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              promo_price: Number(promoPrice),
              original_price: Number(originalPrice),
              discount_pct: Number(discountPct) || 0,
              updated_by: payload.email || 'Super Admin'
            })
          });
          return res.status(pRes.ok ? 200 : pRes.status).json({ success: pRes.ok });
        }

        // OP 2: Update Course Schedule
        if (operation === 'update_schedule') {
          const { courseId, startDate, deliveryMode, timeSlot, isSelfPaced } = data || {};
          if (!courseId || typeof courseId !== 'string' || !startDate) {
            return res.status(400).json({ success: false, error: 'Invalid course schedule parameters.' });
          }
          const sRes = await fetch(`${SUPABASE_URL}/rest/v1/course_schedules?course_id=eq.${encodeURIComponent(courseId)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              start_date: startDate,
              delivery_mode: deliveryMode,
              time_slot: timeSlot,
              is_self_paced: !!isSelfPaced,
              updated_by: payload.email || 'Super Admin'
            })
          });
          return res.status(sRes.ok ? 200 : sRes.status).json({ success: sRes.ok });
        }

        // OP 3: Create Access Pass
        if (operation === 'create_access_pass') {
          if (!data || !data.code || typeof data.code !== 'string' || data.code.length < 4 || (data.max_uses && Number(data.max_uses) < 1)) {
            return res.status(400).json({ success: false, error: 'Invalid access pass parameters.' });
          }
          const isSessPass = !!data.is_session_pass;
          const insertRecord = {
            code: data.code.trim().toUpperCase(),
            label: data.label || 'Access Pass',
            course_name: data.course_name,
            max_uses: Number(data.max_uses) || (isSessPass ? 500 : 1),
            times_used: 0,
            is_session_pass: isSessPass,
            is_active: true
          };
          if (data.cohort && typeof data.cohort === 'string') {
            insertRecord.cohort = data.cohort.trim();
          }
          if (data.student_email && typeof data.student_email === 'string') {
            insertRecord.student_email = data.student_email.trim().toLowerCase();
          }
          if (data.student_id && typeof data.student_id === 'string') {
            insertRecord.student_id = data.student_id.trim();
          }
          if (data.expires_at && typeof data.expires_at === 'string') {
            insertRecord.expires_at = data.expires_at;
          }
          const cRes = await fetch(`${SUPABASE_URL}/rest/v1/access_codes`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(insertRecord)
          });
          return res.status(cRes.ok ? 200 : cRes.status).json({ success: cRes.ok });
        }

        // OP 4: Revoke Access Pass
        if (operation === 'revoke_access_pass') {
          const { code } = data || {};
          if (!code || typeof code !== 'string' || code.length < 4) {
            return res.status(400).json({ success: false, error: 'Invalid access pass code.' });
          }
          const rRes = await fetch(`${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(code)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: false })
          });
          return res.status(rRes.ok ? 200 : rRes.status).json({ success: rRes.ok });
        }

        // OP 5: Delete Access Pass
        if (operation === 'delete_access_pass') {
          const { code } = data || {};
          if (!code || typeof code !== 'string' || code.length < 4) {
            return res.status(400).json({ success: false, error: 'Invalid access pass code.' });
          }
          const dRes = await fetch(`${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(code)}`, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
          });
          return res.status(dRes.ok ? 200 : dRes.status).json({ success: dRes.ok });
        }

        // OP 6: Terminate Attendance Session (Reliable Timestamp Setting)
        if (operation === 'terminate_presence') {
          const { sessionId } = data || {};
          if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8) {
            return res.status(400).json({ success: false, error: 'Invalid session identifier.' });
          }
          const tRes = await fetch(`${SUPABASE_URL}/rest/v1/student_presence?session_id=eq.${encodeURIComponent(sessionId)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'terminated',
              terminated_at: new Date().toISOString()
            })
          });
          return res.status(tRes.ok ? 200 : tRes.status).json({ success: tRes.ok });
        }

        return res.status(400).json({ success: false, error: 'Unknown admin operation requested.' });
      } catch (err) {
        return res.status(500).json({ success: false, error: 'Admin operation failed: ' + err.message });
      }
    }

    // ==============================================================
    // ACTION: RATE LIMIT SCHEDULED CLEANUP (Cron / Service Role)
    // Can be invoked by Vercel Cron (CRON_SECRET) or verified Super Admin session
    // ==============================================================
    if (action === 'cleanup_rate_limits') {
      const authHeader = req.headers['authorization'] || '';
      const cronSecret = CRON_SECRET;
      let authorized = false;

      if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        authorized = true;
      } else {
        const payload = verifyToken(activeToken, AUTH_SECRET);
        if (payload && payload.sub) {
          try {
            let uRes = null;
            if (payload.sbToken) {
              uRes = await callSupabaseAuth('user', {
                headers: { 'Authorization': `Bearer ${payload.sbToken}` }
              });
            }
            if (!uRes || !uRes.ok) {
              uRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(payload.sub)}`, {
                headers: {
                  'apikey': SUPABASE_SERVICE_ROLE_KEY,
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                }
              });
            }
            if (uRes && uRes.ok) {
              const uData = await uRes.json();
              const liveRole = uData.app_metadata?.role;
              const liveEmail = (uData.email || '').toLowerCase();
              // Hardened RBAC: Role in app_metadata is mandatory; email match alone cannot authorize maintenance operations
              if (liveRole === 'super_admin' && liveEmail === SUPER_ADMIN_EMAIL) {
                authorized = true;
              }
            }
          } catch (e) {}
        }
      }

      if (!authorized) {
        return res.status(401).json({ success: false, error: 'Unauthorized cleanup request.' });
      }

      try {
        const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/cleanup_expired_rate_limits`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        if (rpcRes.ok) {
          const purgedCount = await rpcRes.json();
          return res.status(200).json({ success: true, purged: purgedCount });
        }
        return res.status(rpcRes.status).json({ success: false, error: 'RPC execution failed' });
      } catch (e) {
        return res.status(500).json({ success: false, error: 'Cleanup error: ' + e.message });
      }
    }

    return res.status(400).json({ success: false, error: 'Unknown action requested.' });

  } catch (error) {
    console.error('[API Auth] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server security error.' });
  }
}
