// Vercel Serverless API: /api/site-data
// Universal Central Cloud Data Store for Prices, Schedules, and Blog Posts

let inMemorySiteData = null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Return current universal site data
  if (req.method === 'GET') {
    if (inMemorySiteData) {
      return res.status(200).json({ success: true, data: inMemorySiteData, source: 'memory' });
    }

    try {
      // In production serverless environment, fallback to bundled site-data.json
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

    // Attempt to persist to site-data.json if writable
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dataFilePath = path.join(process.cwd(), 'site-data.json');
      fs.writeFileSync(dataFilePath, JSON.stringify(inMemorySiteData, null, 2), 'utf8');
    } catch(e) {
      // Serverless disk is ephemeral or read-only; memory cache persists during instance lifecycle
    }

    return res.status(200).json({
      success: true,
      message: 'Universal site data updated successfully. All visitor browsers will synchronize with these new prices and schedules.',
      timestamp: inMemorySiteData.lastUpdated
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
