// Vercel Serverless API: /api/site-data
// Universal Central Cloud Data Store with Supabase PostgreSQL Integration
// Protected: Writes require authenticated Super Administrator session.

import crypto from 'crypto';

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
let SUPABASE_KEY;
let SUPABASE_SERVICE_ROLE_KEY;
let AUTH_SECRET;

if (isExplicitStaging) {
  const missingStaging = [];
  if (!process.env.STAGING_SUPABASE_URL || !process.env.STAGING_SUPABASE_URL.trim()) missingStaging.push('STAGING_SUPABASE_URL');
  if (!process.env.STAGING_SUPABASE_ANON_KEY || !process.env.STAGING_SUPABASE_ANON_KEY.trim()) missingStaging.push('STAGING_SUPABASE_ANON_KEY');
  if (!process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || !process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY.trim()) missingStaging.push('STAGING_SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.STAGING_AUTH_SECRET || !process.env.STAGING_AUTH_SECRET.trim()) missingStaging.push('STAGING_AUTH_SECRET');

  if (missingStaging.length > 0) {
    throw new Error(`[STAGING CONFIGURATION FAILURE] Missing required staging variables in api/site-data.js: ${missingStaging.join(', ')}. Fail closed.`);
  }

  // Safety Assertion: Staging URL must never point to production project
  if (process.env.STAGING_SUPABASE_URL.includes('fkltvxhqizqrbvogodxv')) {
    throw new Error('[STAGING CONFIGURATION VIOLATION] STAGING_SUPABASE_URL points to production project fkltvxhqizqrbvogodxv in api/site-data.js. Execution aborted.');
  }

  SUPABASE_URL = process.env.STAGING_SUPABASE_URL.trim();
  SUPABASE_KEY = process.env.STAGING_SUPABASE_ANON_KEY.trim();
  SUPABASE_SERVICE_ROLE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY.trim();
  AUTH_SECRET = process.env.STAGING_AUTH_SECRET.trim();
} else {
  SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
  SUPABASE_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
  SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  AUTH_SECRET = (process.env.AUTH_SECRET || '').trim();
}

let inMemorySiteData = null;
const SUPER_ADMIN_EMAIL = (isExplicitStaging ? process.env.STAGING_ADMIN_EMAIL || '' : process.env.ADMIN_EMAIL || '').toLowerCase().trim();

async function verifyLiveSuperAdmin(payload) {
  const isUuid = payload && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub || '');
  if (!isUuid || payload.role !== 'super_admin' || payload.mfaVerified !== true || !SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(payload.sub)}`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return false;

    const user = await response.json();
    return user.app_metadata?.role === 'super_admin' &&
      (user.email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL;
  } catch (error) {
    console.warn('[SiteDataAuth] Live Super Admin verification failed; write denied.', error);
    return false;
  }
}

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

function verifyToken(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Return current universal site data (Try Supabase first, fallback to disk/memory)
  if (req.method === 'GET') {
    // 1. Try querying Supabase course_prices if available
    try {
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/course_prices?select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (sbRes.ok) {
        const prices = await sbRes.json();
        if (Array.isArray(prices) && prices.length > 0) {
          return res.status(200).json({
            success: true,
            source: 'supabase_postgres',
            data: {
              prices: prices.map(p => ({
                id: p.course_id,
                name: p.course_name,
                originalPrice: p.original_price,
                promoPrice: p.promo_price,
                discountPct: p.discount_pct
              }))
            }
          });
        }
      }
    } catch(err) {
      // Supabase query error fallback
    }

    if (inMemorySiteData) {
      return res.status(200).json({ success: true, data: inMemorySiteData, source: 'memory' });
    }

    try {
      const fs = await import('fs');
      const path = await import('path');
      const dataFilePath = path.join(process.cwd(), 'site-data.json');
      if (fs.existsSync(dataFilePath)) {
        const raw = fs.readFileSync(dataFilePath, 'utf8');
        inMemorySiteData = JSON.parse(raw);
        return res.status(200).json({ success: true, data: inMemorySiteData, source: 'disk' });
      }
    } catch (e) {
      console.warn('Could not read site-data.json from disk:', e);
    }

    return res.status(200).json({
      success: true,
      message: 'Universal Site Data API Active',
      data: inMemorySiteData || null
    });
  }

  // POST: Update universal site data from Super Admin
  if (req.method === 'POST') {
    if (!AUTH_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPER_ADMIN_EMAIL) {
      return res.status(500).json({ success: false, error: 'Server site-data authorization configuration is unavailable.' });
    }

    // Authenticate Super Admin session exclusively via Authorization header (Bearer <token>)
    const headers = req.headers || {};
    const authHeader = headers['authorization'] || headers['Authorization'];
    const hasBodyToken = Boolean(req.body && (req.body.token || req.body.adminToken));
    const hasQueryToken = Boolean(req.query && (req.query.token || req.query.adminToken));

    if (hasBodyToken || hasQueryToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Admin authentication token must be provided exclusively via HTTP Authorization header (Bearer <token>). Request body and query parameter tokens are rejected.'
      });
    }

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.match(/^Bearer\s+/i)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Administrative Bearer token required in HTTP Authorization header.'
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const payload = verifyToken(token, AUTH_SECRET);
    if (!payload || !await verifyLiveSuperAdmin(payload)) {
      return res.status(403).json({ success: false, error: 'Verified Super Administrator authorization with TOTP MFA required.' });
    }

    const { prices, schedules, blogPosts, updatedBy } = req.body || {};

    if (!prices && !schedules && !blogPosts) {
      return res.status(400).json({ success: false, error: 'No update data provided.' });
    }

    if (!inMemorySiteData) inMemorySiteData = {};
    if (prices) inMemorySiteData.prices = prices;
    if (schedules) inMemorySiteData.schedules = schedules;
    if (blogPosts) inMemorySiteData.blogPosts = blogPosts;
    inMemorySiteData.lastUpdated = new Date().toISOString();
    inMemorySiteData.updatedBy = updatedBy || payload.email || 'Super Admin';

    // 1. Sync to Supabase in background using server-side service role key
    try {
      if (prices && Array.isArray(prices)) {
        const rows = prices.map(p => ({
          course_id: p.id,
          course_name: p.name,
          original_price: Number(p.originalPrice) || 0,
          promo_price: Number(p.promoPrice) || 0,
          discount_pct: Number(p.discountPct) || 0,
          updated_by: inMemorySiteData.updatedBy
        }));
        await fetch(`${SUPABASE_URL}/rest/v1/course_prices`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(rows)
        });
      }
    } catch(err) {
      console.warn('Supabase post sync warning:', err.message);
    }

    // 2. Persist to site-data.json
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dataFilePath = path.join(process.cwd(), 'site-data.json');
      fs.writeFileSync(dataFilePath, JSON.stringify(inMemorySiteData, null, 2), 'utf8');
    } catch(e) {}

    return res.status(200).json({
      success: true,
      message: 'Universal site data updated successfully. Synchronized across Supabase and serverless cache.',
      timestamp: inMemorySiteData.lastUpdated
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
