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
const isStaging = process.env.APP_ENV === 'staging' || process.env.STAGING === 'true';

let SUPABASE_URL;
let SUPABASE_ANON_KEY;
let SUPABASE_SERVICE_ROLE_KEY;

if (isStaging) {
  const missingStaging = [];
  if (!process.env.STAGING_SUPABASE_URL) missingStaging.push('STAGING_SUPABASE_URL');
  if (!process.env.STAGING_SUPABASE_ANON_KEY) missingStaging.push('STAGING_SUPABASE_ANON_KEY');
  if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY) missingStaging.push('STAGING_SUPABASE_SERVICE_ROLE_KEY');

  if (missingStaging.length > 0) {
    throw new Error(`[STAGING CONFIGURATION FAILURE] Missing required staging variables: ${missingStaging.join(', ')}. Fail closed.`);
  }

  // Safety Assertion: Staging URL must never point to production project
  if (process.env.STAGING_SUPABASE_URL.includes('fkltvxhqizqrbvogodxv')) {
    throw new Error('[STAGING CONFIGURATION VIOLATION] STAGING_SUPABASE_URL points to production project fkltvxhqizqrbvogodxv. Execution aborted.');
  }

  SUPABASE_URL = process.env.STAGING_SUPABASE_URL;
  SUPABASE_ANON_KEY = process.env.STAGING_SUPABASE_ANON_KEY;
  SUPABASE_SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
} else {
  SUPABASE_URL = process.env.SUPABASE_URL || 'https://fkltvxhqizqrbvogodxv.supabase.co';
  SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbHR2eGhxaXpxcmJ2b2dvZHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjgwNzIsImV4cCI6MjEwODMwNDA3Mn0.qwinwaYPmLyGAGLm4bXq87wfbS1EtdTUiVv_dEe6xRM';
  SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
}

const SUPER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'greachimpact@gmail.com').toLowerCase().trim();
const SUPER_ADMIN_USERNAME = (process.env.ADMIN_USER || 'Greachimpact').trim();

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
        const lastFailedAt = rec.last_failed_at ? new Date(rec.last_failed_at).getTime() : 0;

        if (lockedUntil && now < lockedUntil) {
          memoryRateLimits.set(key, { count: rec.failed_attempts, locked_until: lockedUntil, lastAttempt: lastFailedAt });
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
        last_failed_at: new Date(now).toISOString(),
        locked_until: lockedUntilIso
      })
    });
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


// ==============================================================
// MAIN API HANDLER
// ==============================================================
export default async function handler(req, res) {
  // 1. FAIL SECURELY WHEN REQUIRED SECRET IS MISSING (Zero Staging-to-Production Fallback)
  let AUTH_SECRET;
  let CRON_SECRET;

  if (isStaging) {
    if (!process.env.STAGING_AUTH_SECRET) {
      console.error('[API Auth Staging Failure] Mandatory STAGING_AUTH_SECRET environment variable is missing.');
      return res.status(500).json({ success: false, error: 'Staging configuration error. STAGING_AUTH_SECRET missing.' });
    }
    if (!process.env.STAGING_CRON_SECRET) {
      console.error('[API Auth Staging Failure] Mandatory STAGING_CRON_SECRET environment variable is missing.');
      return res.status(500).json({ success: false, error: 'Staging configuration error. STAGING_CRON_SECRET missing.' });
    }
    AUTH_SECRET = process.env.STAGING_AUTH_SECRET;
    CRON_SECRET = process.env.STAGING_CRON_SECRET;
  } else {
    AUTH_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET;
    CRON_SECRET = process.env.CRON_SECRET;
    if (!AUTH_SECRET) {
      console.error('[API Auth Security Failure] Mandatory AUTH_SECRET or JWT_SECRET environment variable is missing.');
      return res.status(500).json({
        success: false,
        error: 'Server security configuration error. Service unavailable.'
      });
    }
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
    if (isCookieAuth && ['verify_super_action', 'logout', 'mfa_enroll', 'mfa_activate'].includes(action)) {
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
      const payload = verifyToken(activeToken, AUTH_SECRET);

      if (!payload) {
        return res.status(401).json({
          success: false,
          valid: false,
          error: 'Session expired or invalid signature. Please log in again.'
        });
      }

      // Check live state in Supabase Auth to detect immediate role revocation or account bans
      if (payload.sbToken) {
        try {
          const userRes = await callSupabaseAuth('user', {
            headers: { 'Authorization': `Bearer ${payload.sbToken}` }
          });
          if (!userRes.ok) {
            return res.status(401).json({
              success: false,
              valid: false,
              error: 'Supabase session has been revoked or expired.'
            });
          }

          const liveUser = await userRes.json();
          const liveAppRole = liveUser.app_metadata?.role;
          const isSuperAdminEmail = (liveUser.email || '').toLowerCase() === SUPER_ADMIN_EMAIL;

          // Check if administrator privileges were removed or altered in Supabase
          const liveIsSuper = isSuperAdminEmail || liveAppRole === 'super_admin';
          const liveRole = liveIsSuper ? 'super_admin' : (liveAppRole === 'sub_admin' ? 'sub_admin' : 'student');

          if (liveRole !== payload.role && !isSuperAdminEmail) {
            return res.status(403).json({
              success: false,
              valid: false,
              error: 'Administrator role has changed or privileges were revoked. Session terminated.'
            });
          }
        } catch (e) {
          // Fall back to cryptographic HMAC check if Supabase is temporarily unreachable
        }
      }

      return res.status(200).json({
        success: true,
        valid: true,
        user: payload.user,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        isSuper: !!payload.isSuper,
        csrfToken: payload.csrf || '',
        expiresAt: new Date(payload.exp).toISOString()
      });
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
        const appRole = sbUser.app_metadata?.role;
        const isSuperAdminEmail = userEmail === SUPER_ADMIN_EMAIL;

        let role = 'student';
        let isSuper = false;

        if (isSuperAdminEmail || appRole === 'super_admin') {
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
          // Check ticket replay
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
      const payload = verifyToken(activeToken, AUTH_SECRET);

      if (!payload || !payload.isSuper || payload.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Super Administrator authorization required. Sub-admin privileges insufficient.'
        });
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

      const enrollRes = await callSupabaseAuth('factors', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sbTokenToUse}` },
        body: JSON.stringify({
          factor_type: 'totp',
          friendly_name: `Greach Impact Admin`
        })
      });

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
      const payload = verifyToken(activeToken, AUTH_SECRET);
      if (!payload || !payload.sub) {
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
          if (liveRole === 'super_admin' || liveEmail === SUPER_ADMIN_EMAIL) {
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
      if (!csrfHeader || (csrfCookie && csrfHeader !== csrfCookie)) {
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
          const cRes = await fetch(`${SUPABASE_URL}/rest/v1/access_codes`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code: data.code.trim().toUpperCase(),
              label: data.label || 'Access Pass',
              course_name: data.course_name,
              max_uses: Number(data.max_uses) || 1,
              times_used: 0,
              is_session_pass: !!data.is_session_pass,
              is_active: true
            })
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
              if (liveRole === 'super_admin' || liveEmail === SUPER_ADMIN_EMAIL) {
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
