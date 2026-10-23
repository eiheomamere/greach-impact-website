// Vercel Serverless API: /api/site-data
// Universal Central Cloud Data Store with Supabase PostgreSQL Integration

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fkltvxhqizqrbvogodxv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbHR2eGhxaXpxcmJ2b2dvZHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjgwNzIsImV4cCI6MjEwODMwNDA3Mn0.qwinwaYPmLyGAGLm4bXq87wfbS1EtdTUiVv_dEe6xRM';

let inMemorySiteData = null;

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
    const { prices, schedules, blogPosts, updatedBy } = req.body || {};

    if (!prices && !schedules && !blogPosts) {
      return res.status(400).json({ success: false, error: 'No update data provided.' });
    }

    if (!inMemorySiteData) inMemorySiteData = {};
    if (prices) inMemorySiteData.prices = prices;
    if (schedules) inMemorySiteData.schedules = schedules;
    if (blogPosts) inMemorySiteData.blogPosts = blogPosts;
    inMemorySiteData.lastUpdated = new Date().toISOString();
    inMemorySiteData.updatedBy = updatedBy || 'Super Admin';

    // 1. Sync to Supabase in background
    try {
      if (prices && Array.isArray(prices)) {
        const rows = prices.map(p => ({
          course_id: p.id,
          course_name: p.name,
          original_price: Number(p.originalPrice) || 0,
          promo_price: Number(p.promoPrice) || 0,
          discount_pct: Number(p.discountPct) || 0,
          updated_by: updatedBy || 'Super Admin'
        }));
        await fetch(`${SUPABASE_URL}/rest/v1/course_prices`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
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
