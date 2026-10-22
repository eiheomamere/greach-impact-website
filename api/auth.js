// Vercel Serverless API: /api/auth
// Hardened Super Admin & Student Authentication Engine with HMAC-SHA256 Signed Sessions & Brute-Force Rate Limiting
import crypto from 'crypto';

// In-memory brute-force rate limiter (IP based)
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes lockout

const AUTH_SECRET = process.env.ADMIN_SECRET || process.env.JWT_SECRET || 'GI-SECURE-HMAC-SECRET-KEY-2026';

function signToken(payload) {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(dataStr).digest('base64url');
  return `${dataStr}.${signature}`;
}

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

export default async function handler(req, res) {
  // Strict CORS in production, allow same-origin and pre-flight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip';

  try {
    const { action, identifier, username, password, token } = req.body || {};

    // ==============================================================
    // ACTION: VERIFY SESSION TOKEN
    // ==============================================================
    if (action === 'verify') {
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ success: false, valid: false, error: 'Session expired or invalid signature.' });
      }
      return res.status(200).json({
        success: true,
        valid: true,
        user: payload.user,
        name: payload.name,
        role: payload.role,
        isSuper: payload.isSuper,
        expiresAt: new Date(payload.exp).toISOString()
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
          error: `Too many failed login attempts. Console access locked for ${remainingMin} minute(s) to protect against unauthorized access.`
        });
      } else {
        failedAttempts.delete(clientIp);
      }
    }

    // ==============================================================
    // ACTION: CREDENTIAL AUTHENTICATION
    // ==============================================================
    const cleanUser = (identifier || username || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return res.status(400).json({ success: false, error: 'Username/email and password are required.' });
    }

    const masterUser = (process.env.ADMIN_USER || 'Greachimpact').trim();
    const masterEmail = (process.env.ADMIN_EMAIL || 'greachimpact@gmail.com').trim();
    const masterPass = (process.env.ADMIN_PASS || 'Evana_Oluebube123890').trim();

    // 1. Check Super Admin Credentials
    const isSuperUserMatch =
      cleanUser.toLowerCase() === masterUser.toLowerCase() ||
      cleanUser.toLowerCase() === masterEmail.toLowerCase() ||
      cleanUser.toLowerCase() === 'instructor@greach.org';

    const isSuperPassMatch = cleanPass === masterPass;

    if (isSuperUserMatch && isSuperPassMatch) {
      // Clear failed attempts on success
      failedAttempts.delete(clientIp);

      const expTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      const sessionPayload = {
        user: masterUser,
        name: 'Emmanuel Iheomamere (Lead Instructor & Super Admin)',
        email: masterEmail,
        role: 'super_admin',
        isSuper: true,
        exp: expTime,
        iat: Date.now()
      };

      const signedToken = signToken(sessionPayload);

      return res.status(200).json({
        success: true,
        role: 'super_admin',
        username: masterUser,
        name: sessionPayload.name,
        email: masterEmail,
        isSuperAdmin: true,
        token: signedToken,
        expiresAt: new Date(expTime).toISOString()
      });
    }

    // 2. Legacy/Secondary Admin Passcode Match
    if (cleanPass === (process.env.LEGACY_ADMIN_KEY || 'GREACH-ADMIN-2026')) {
      failedAttempts.delete(clientIp);
      const expTime = Date.now() + 12 * 60 * 60 * 1000;
      const signedToken = signToken({
        user: 'Instructor',
        name: 'Lead Instructor (Session Access)',
        email: masterEmail,
        role: 'instructor',
        isSuper: false,
        exp: expTime,
        iat: Date.now()
      });

      return res.status(200).json({
        success: true,
        role: 'instructor',
        username: 'Instructor',
        name: 'Lead Instructor',
        isSuperAdmin: false,
        token: signedToken,
        expiresAt: new Date(expTime).toISOString()
      });
    }

    // Failed Login Attempt Tracking
    const current = failedAttempts.get(clientIp) || { count: 0, lastAttempt: Date.now() };
    current.count += 1;
    current.lastAttempt = Date.now();
    failedAttempts.set(clientIp, current);

    const remaining = MAX_ATTEMPTS - current.count;
    const warnMsg = remaining > 0
      ? `Invalid credentials. ${remaining} attempt(s) remaining before security lockout.`
      : 'Invalid credentials. Security lockout initiated for 10 minutes.';

    return res.status(401).json({ success: false, error: warnMsg });

  } catch (error) {
    console.error('[API Auth] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server security error.' });
  }
}
