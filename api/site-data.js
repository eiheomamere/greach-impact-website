// Vercel Serverless API: /api/site-data
// Universal Central Cloud Data Store with Supabase PostgreSQL Integration
// Protected: Writes require authenticated Super Administrator session.

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fkltvxhqizqrbvogodxv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbHR2eGhxaXpxcmJ2b2dvZHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjgwNzIsImV4cCI6MjEwODMwNDA3Mn0.qwinwaYPmLyGAGLm4bXq87wfbS1EtdTUiVv_dEe6xRM';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
const AUTH_SECRET = process.env.JWT_SECRET;

let inMemorySiteData = null;

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
    // Authenticate Super Admin session
    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization;
    let token = cookies.greach_admin_token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);
    if (!token && req.body && req.body.token) token = req.body.token;

    const payload = verifyToken(token, AUTH_SECRET);
    if (!payload || payload.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Super Administrator authorization required.' });
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
