// Vercel Serverless API: /api/auth
// Authoritative Supabase Auth & Multi-Role Enterprise Authentication Engine
// Supports Super Admin, Sub-Admin & Student sessions with HMAC-SHA256 tokens, MFA & Rate Limiting

import crypto from 'crypto';

// In-memory rate limiter for brute-force protection (IP-based)
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes lockout

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fkltvxhqizqrbvogodxv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbHR2eGhxaXpxcmJ2b2dvZHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjgwNzIsImV4cCI6MjEwODMwNDA3Mn0.qwinwaYPmLyGAGLm4bXq87wfbS1EtdTUiVv_dEe6xRM';
const AUTH_SECRET = process.env.JWT_SECRET || process.env.ADMIN_SECRET || 'GI-ENTERPRISE-HMAC-SHA256-SECRET-KEY-2026';

const SUPER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'greachimpact@gmail.com').toLowerCase().trim();
const SUPER_ADMIN_USERNAME = (process.env.ADMIN_USER || 'Greachimpact').trim();

// Cryptographically sign session token with HMAC-SHA256
function signToken(payload) {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(dataStr).digest('base64url');
  return `${dataStr}.${signature}`;
}

// Cryptographically verify session token
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(dataStr).digest('base64url');
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

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown-ip';

  try {
    const { action, email, identifier, username, password, token, mfaCode, factorId, challengeId } = req.body || {};

    // ==============================================================
    // ACTION: VERIFY SESSION TOKEN
    // ==============================================================
    if (action === 'verify') {
      const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      const rawToken = token || headerToken;
      const payload = verifyToken(rawToken);

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
          // If network timeout, allow HMAC validation to proceed
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
      const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      const rawToken = token || headerToken;
      const payload = verifyToken(rawToken);

      if (payload && payload.sbToken) {
        try {
          await callSupabaseAuth('logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${payload.sbToken}` }
          });
        } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        message: 'Administrator session revoked successfully.'
      });
    }

    // ==============================================================
    // RATE LIMITING / BRUTE FORCE PROTECTION
    // ==============================================================
    const attemptRecord = failedAttempts.get(clientIp);
    if (attemptRecord && attemptRecord.count >= MAX_ATTEMPTS) {
      const elapsed = Date.now() - attemptRecord.lastAttempt;
      if (elapsed < LOCKOUT_MS) {
        const remainingMin = Math.ceil((LOCKOUT_MS - elapsed) / 60000);
        return res.status(429).json({
          success: false,
          error: `Too many failed attempts. Security lockout active for ${remainingMin} minute(s).`
        });
      } else {
        failedAttempts.delete(clientIp);
      }
    }

    // ==============================================================
    // ACTION: LOGIN VIA SUPABASE AUTH
    // ==============================================================
    if (action === 'login') {
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

        // Determine Role
        const isSuper = userEmail === SUPER_ADMIN_EMAIL ||
                        sbUser.app_metadata?.role === 'super_admin' ||
                        sbUser.user_metadata?.role === 'super_admin';

        const role = isSuper ? 'super_admin' : (sbUser.app_metadata?.role || sbUser.user_metadata?.role || 'sub_admin');
        const displayName = sbUser.user_metadata?.name || (isSuper ? 'Lead Super Administrator' : 'Administrator');
        const displayUser = isSuper ? SUPER_ADMIN_USERNAME : (sbUser.user_metadata?.username || userEmail.split('@')[0]);

        // Check if MFA TOTP is required
        const factors = authData.user?.factors || [];
        const verifiedTotp = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');

        if (verifiedTotp && !mfaCode) {
          // MFA challenge required
          return res.status(200).json({
            success: true,
            mfaRequired: true,
            factorId: verifiedTotp.id,
            tempToken: authData.access_token,
            message: 'MFA verification code required.'
          });
        }

        // Verify MFA code if provided
        if (verifiedTotp && mfaCode) {
          try {
            const challengeRes = await callSupabaseAuth(`factors/${verifiedTotp.id}/challenge`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${authData.access_token}` }
            });
            if (challengeRes.ok) {
              const chal = await challengeRes.json();
              const verifyRes = await callSupabaseAuth(`factors/${verifiedTotp.id}/verify`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authData.access_token}` },
                body: JSON.stringify({ challenge_id: chal.id, code: mfaCode.trim() })
              });
              if (!verifyRes.ok) {
                return res.status(401).json({ success: false, error: 'Invalid MFA verification code.' });
              }
            }
          } catch (e) {
            return res.status(401).json({ success: false, error: 'MFA verification failed: ' + e.message });
          }
        }

        // Clear failed attempts upon successful login
        failedAttempts.delete(clientIp);

        const expTime = Date.now() + 8 * 60 * 60 * 1000; // 8-hour session
        const sessionPayload = {
          sub: sbUser.id,
          user: displayUser,
          email: userEmail,
          name: displayName,
          role: role,
          isSuper: isSuper,
          sbToken: authData.access_token,
          exp: expTime,
          iat: Date.now()
        };

        const serverToken = signToken(sessionPayload);

        return res.status(200).json({
          success: true,
          role: role,
          username: displayUser,
          name: displayName,
          email: userEmail,
          isSuperAdmin: isSuper,
          token: serverToken,
          expiresAt: new Date(expTime).toISOString()
        });
      }

      // If Supabase Auth returned invalid credentials:
      // Track failed attempt
      const current = failedAttempts.get(clientIp) || { count: 0, lastAttempt: Date.now() };
      current.count += 1;
      current.lastAttempt = Date.now();
      failedAttempts.set(clientIp, current);

      const remaining = MAX_ATTEMPTS - current.count;
      const warnMsg = remaining > 0
        ? `Invalid credentials. ${remaining} attempt(s) remaining before security lockout.`
        : 'Invalid credentials. Security lockout initiated for 10 minutes.';

      return res.status(401).json({ success: false, error: warnMsg });
    }

    // ==============================================================
    // ACTION: VERIFY SUPER ADMIN ACTION (In-session re-authentication)
    // ==============================================================
    if (action === 'verify_super_action') {
      const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      const rawToken = token || headerToken;
      const payload = verifyToken(rawToken);

      if (!payload || !payload.isSuper) {
        return res.status(403).json({
          success: false,
          error: 'Super Administrator authorization required.'
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
      const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      const payload = verifyToken(token || headerToken);
      if (!payload || !payload.sbToken) {
        return res.status(401).json({ success: false, error: 'Authenticated session required.' });
      }

      const enrollRes = await callSupabaseAuth('factors', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${payload.sbToken}` },
        body: JSON.stringify({
          factor_type: 'totp',
          friendly_name: `Greach Admin (${payload.user})`
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
      const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      const payload = verifyToken(token || headerToken);
      if (!payload || !payload.sbToken || !factorId || !mfaCode) {
        return res.status(400).json({ success: false, error: 'Missing factorId or code.' });
      }

      const challengeRes = await callSupabaseAuth(`factors/${factorId}/challenge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${payload.sbToken}` }
      });
      if (!challengeRes.ok) {
        return res.status(400).json({ success: false, error: 'Failed to create MFA challenge.' });
      }
      const chal = await challengeRes.json();

      const verifyRes = await callSupabaseAuth(`factors/${factorId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${payload.sbToken}` },
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
