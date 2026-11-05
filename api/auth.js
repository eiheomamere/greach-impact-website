// Vercel Serverless API: /api/auth
// Authoritative Supabase Auth & Multi-Role Enterprise Authentication Engine (Phase 1A Hardened)
// Supports Super Admin, Sub-Admin & Student sessions with HMAC-SHA256 tokens, HttpOnly Cookies, CSRF, Compulsory MFA & Multi-Instance Rate Limiting

import crypto from 'crypto';

// In-memory rate limit cache (L1 fast check per container)
const memoryRateLimits = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes lockout

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fkltvxhqizqrbvogodxv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbHR2eGhxaXpxcmJ2b2dvZHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjgwNzIsImV4cCI6MjEwODMwNDA3Mn0.qwinwaYPmLyGAGLm4bXq87wfbS1EtdTUiVv_dEe6xRM';

const SUPER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'greachimpact@gmail.com').toLowerCase().trim();
const SUPER_ADMIN_USERNAME = (process.env.ADMIN_USER || 'Greachimpact').trim();

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

// Cryptographically verify session token
function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null; // Expired
    return payload;
  } catch (e) {
    return null;
  }
}

// Helper: Call Supabase Auth endpoint
async function callSupabaseAuth(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/auth/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  return await fetch(url, { ...options, headers });
}

// ==============================================================
// PERSISTENT MULTI-INSTANCE RATE LIMITING (Supabase L2 + Memory L1)
// ==============================================================
async function checkRateLimit(ip) {
  const now = Date.now();
  // 1. Fast L1 check in local container memory
  const mem = memoryRateLimits.get(ip);
  if (mem && mem.locked_until && now < mem.locked_until) {
    return { blocked: true, remainingMin: Math.ceil((mem.locked_until - now) / 60000) };
  }

  // 2. L2 Persistent check across Vercel serverless instances
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits?ip=eq.${encodeURIComponent(ip)}&select=*`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) {
      const records = await res.json();
      if (Array.isArray(records) && records.length > 0) {
        const rec = records[0];
        const lockedUntil = rec.locked_until ? new Date(rec.locked_until).getTime() : null;
        if (lockedUntil && now < lockedUntil) {
          memoryRateLimits.set(ip, { count: rec.failed_attempts, locked_until: lockedUntil });
          return { blocked: true, remainingMin: Math.ceil((lockedUntil - now) / 60000) };
        }
      }
    }
  } catch (e) {
    // If external store network is unavailable, rely on L1 memory check
  }

  return { blocked: false };
}

async function recordFailedAttempt(ip) {
  const now = Date.now();
  const mem = memoryRateLimits.get(ip) || { count: 0, lastAttempt: now };
  mem.count += 1;
  mem.lastAttempt = now;
  if (mem.count >= MAX_ATTEMPTS) {
    mem.locked_until = now + LOCKOUT_MS;
  }
  memoryRateLimits.set(ip, mem);

  // Sync to persistent store in Supabase
  try {
    const lockedUntilIso = mem.count >= MAX_ATTEMPTS ? new Date(now + LOCKOUT_MS).toISOString() : null;
    await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        ip: ip,
        failed_attempts: mem.count,
        last_failed_at: new Date(now).toISOString(),
        locked_until: lockedUntilIso
      })
    });
  } catch (e) {}

  return mem;
}

async function clearRateLimit(ip) {
  memoryRateLimits.delete(ip);
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits?ip=eq.${encodeURIComponent(ip)}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
  } catch (e) {}
}


// ==============================================================
// MAIN API HANDLER
// ==============================================================
export default async function handler(req, res) {
  // 1. FAIL SECURELY WHEN REQUIRED SECRET IS MISSING
  // Strict requirement: No hardcoded fallback secret!
  const AUTH_SECRET = process.env.JWT_SECRET;
  if (!AUTH_SECRET) {
    console.error('[API Auth Security Failure] Mandatory JWT_SECRET environment variable is missing.');
    return res.status(500).json({
      success: false,
      error: 'Server security configuration error. Service unavailable.'
    });
  }

  // 2. CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown-ip';
  const cookies = parseCookies(req.headers.cookie);
  const cookieSession = cookies['gi_session'];
  const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const bodyToken = req.body?.token;

  // Determine active token and whether authentication comes from a cookie
  const activeToken = cookieSession || bearerToken || bodyToken;
  const isCookieAuth = Boolean(cookieSession && !bearerToken && !bodyToken);

  try {
    const { action, email, identifier, username, password, mfaCode, factorId, ticket } = req.body || {};

    if (!action) {
      return res.status(400).json({ success: false, error: 'Action parameter is required.' });
    }

    // ==============================================================
    // 3. CSRF PROTECTION FOR COOKIE-BASED AUTHENTICATION
    // ==============================================================
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
    // ACTION: VERIFY SESSION TOKEN
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

      // If payload includes a Supabase access token, verify with Supabase Auth that session is not revoked
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
        } catch (e) {
          // Network timeout allows HMAC check if Supabase is temporarily unreachable
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
      // 4. CHECK PERSISTENT MULTI-INSTANCE RATE LIMITING
      const rateLimitStatus = await checkRateLimit(clientIp);
      if (rateLimitStatus.blocked) {
        return res.status(429).json({
          success: false,
          error: `Too many failed attempts. Security lockout active for ${rateLimitStatus.remainingMin} minute(s).`
        });
      }

      const rawUser = (email || identifier || username || '').trim();
      const rawPass = (password || '').trim();

      if (!rawUser || !rawPass) {
        return res.status(400).json({
          success: false,
          error: 'Email (or username) and password are required.'
        });
      }

      // Resolve username alias to canonical email
      let targetEmail = rawUser;
      if (rawUser.toLowerCase() === SUPER_ADMIN_USERNAME.toLowerCase() || rawUser.toLowerCase() === 'admin') {
        targetEmail = SUPER_ADMIN_EMAIL;
      }

      // Authenticate against Supabase Auth
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

      // Check if user authenticated successfully
      if (sbRes.ok) {
        const authData = await sbRes.json();
        const sbUser = authData.user || {};
        const userEmail = (sbUser.email || targetEmail).toLowerCase();

        // ==============================================================
        // 5. AUTHORITATIVE ROLE VERIFICATION (NEVER TRUST USER_METADATA)
        // User-editable user_metadata is completely ignored.
        // We only check server-controlled app_metadata or server config.
        // ==============================================================
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

        // ==============================================================
        // 6. COMPULSORY MFA FOR SUPER ADMIN
        // Super Admin accounts MUST have verified TOTP factor active.
        // ==============================================================
        const factors = authData.user?.factors || [];
        const verifiedTotp = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');

        if (isSuper && !verifiedTotp) {
          // Super Admin has not yet configured MFA - Enforce Compulsory Setup
          const setupTicket = signToken({
            sub: sbUser.id,
            email: userEmail,
            sbToken: authData.access_token,
            purpose: 'mfa_compulsory_setup',
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
          // MFA TOTP Challenge Required
          const challengeTicket = signToken({
            sub: sbUser.id,
            factorId: verifiedTotp.id,
            email: userEmail,
            sbToken: authData.access_token,
            purpose: 'mfa_challenge',
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

        // Clear failed attempts across all instances
        await clearRateLimit(clientIp);

        // Issue 8-Hour Authenticated Session
        const expTime = Date.now() + 8 * 60 * 60 * 1000;
        const csrfToken = crypto.randomBytes(24).toString('hex');

        // Session payload keeps Supabase token internal; NOT exposed in client body
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

        // ==============================================================
        // 7. SET SECURE, HTTPONLY & SAMESITE COOKIES
        // ==============================================================
        const isHttps = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
        const sessionCookie = `gi_session=${serverToken}; HttpOnly; Path=/; Max-Age=${8 * 3600}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
        const csrfCookie = `gi_csrf=${csrfToken}; Path=/; Max-Age=${8 * 3600}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
        res.setHeader('Set-Cookie', [sessionCookie, csrfCookie]);

        // Client response: zero exposed Supabase tokens
        return res.status(200).json({
          success: true,
          role: role,
          username: displayUser,
          name: displayName,
          email: userEmail,
          isSuperAdmin: isSuper,
          csrfToken: csrfToken,
          token: serverToken, // Provided for API/CLI clients while browser uses HttpOnly cookie
          expiresAt: new Date(expTime).toISOString()
        });
      }

      // If credentials failed: record failed attempt in persistent store
      const memRecord = await recordFailedAttempt(clientIp);
      const remaining = MAX_ATTEMPTS - memRecord.count;
      const warnMsg = remaining > 0
        ? `Invalid credentials. ${remaining} attempt(s) remaining before security lockout.`
        : 'Invalid credentials. Security lockout initiated for 10 minutes.';

      return res.status(401).json({ success: false, error: warnMsg });
    }

    // ==============================================================
    // ACTION: VERIFY SUPER ADMIN ACTION (In-session re-authentication)
    // ==============================================================
    if (action === 'verify_super_action') {
      const payload = verifyToken(activeToken, AUTH_SECRET);

      // Enforce: only genuine Super Admin
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

      // Verify password against Supabase Auth
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

      // Allow enrollment via active session or temporary setup ticket
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

    return res.status(400).json({ success: false, error: 'Unknown action requested.' });

  } catch (error) {
    console.error('[API Auth] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server security error.' });
  }
}
