/**
 * Greach Impact Academy - Automated Supabase Cloud Provisioner & Data Migrator
 * 
 * Usage:
 *   node scripts/migrate_to_supabase.js <SUPABASE_URL> <SUPABASE_KEY>
 * 
 * Or pass via environment variables:
 *   SUPABASE_URL=https://xyz.supabase.co SUPABASE_KEY=eyJ... node scripts/migrate_to_supabase.js
 */

const fs = require('fs');
const path = require('path');

const url = (process.argv[2] || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const key = (process.argv[3] || process.env.SUPABASE_KEY || '').trim();

if (!url || !key) {
  console.error('\n❌ ERROR: Supabase Project URL and API Key are required.');
  console.log('\nUsage:');
  console.log('  node scripts/migrate_to_supabase.js https://your-project.supabase.co your-anon-key\n');
  process.exit(1);
}

console.log('======================================================');
console.log('🚀 GREACH IMPACT - AUTOMATED SUPABASE CLOUD MIGRATOR');
console.log('======================================================');
console.log('Project URL:', url);
console.log('API Key:', key.substring(0, 15) + '...\n');

async function run() {
  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
  };

  // 1. Test Connection
  console.log('1️⃣ Testing connection to Supabase REST endpoint...');
  try {
    const testRes = await fetch(`${url}/rest/v1/course_prices?select=count`, {
      method: 'GET',
      headers
    });
    if (testRes.ok) {
      console.log('   ✅ Successfully connected to Supabase PostgreSQL database!\n');
    } else {
      console.log(`   ⚠️ Table course_prices not ready yet (HTTP ${testRes.status}). Ensure supabase_schema.sql was run in Supabase SQL Editor.\n`);
    }
  } catch(e) {
    console.error('   ❌ Network error connecting to Supabase:', e.message);
    process.exit(1);
  }

  // 2. Load Local Data
  console.log('2️⃣ Reading local Greach Impact records from site-data.json...');
  let siteData = { prices: [], schedules: [], blogPosts: [] };
  const siteDataPath = path.join(__dirname, '..', 'site-data.json');
  if (fs.existsSync(siteDataPath)) {
    siteData = JSON.parse(fs.readFileSync(siteDataPath, 'utf8'));
  }

  // 3. Migrate Course Prices
  if (siteData.prices && siteData.prices.length > 0) {
    console.log(`3️⃣ Uploading ${siteData.prices.length} course prices to Supabase table: course_prices...`);
    const priceRows = siteData.prices.map(p => ({
      course_id: p.id,
      course_name: p.name,
      original_price: Number(p.originalPrice) || 0,
      promo_price: Number(p.promoPrice) || 0,
      discount_pct: Number(p.discountPct) || 0,
      updated_by: 'Greachimpact'
    }));
    const pRes = await fetch(`${url}/rest/v1/course_prices`, {
      method: 'POST',
      headers,
      body: JSON.stringify(priceRows)
    });
    console.log(pRes.ok ? '   ✅ Course prices synced successfully!' : `   ⚠️ Notice: ${pRes.status} ${pRes.statusText}`);
  }

  // 4. Migrate Schedules
  if (siteData.schedules && siteData.schedules.length > 0) {
    console.log(`4️⃣ Uploading ${siteData.schedules.length} schedules to Supabase table: course_schedules...`);
    const schedRows = siteData.schedules.map(s => ({
      course_id: s.id,
      start_date: s.startDate || 'Saturday, 7th March 2026',
      delivery_mode: s.deliveryMode || 'Live Interactive + Recorded Vault',
      is_self_paced: !!s.isSelfPaced,
      updated_by: 'Greachimpact'
    }));
    const sRes = await fetch(`${url}/rest/v1/course_schedules`, {
      method: 'POST',
      headers,
      body: JSON.stringify(schedRows)
    });
    console.log(sRes.ok ? '   ✅ Course schedules synced successfully!' : `   ⚠️ Notice: ${sRes.status} ${sRes.statusText}`);
  }

  // 5. Migrate Blog Posts
  if (siteData.blogPosts && siteData.blogPosts.length > 0) {
    console.log(`5️⃣ Uploading ${siteData.blogPosts.length} blog posts to Supabase table: blog_posts...`);
    const blogRows = siteData.blogPosts.map(b => ({
      id: String(b.id),
      title: b.title,
      category: b.category || 'Excel & Data',
      excerpt: b.excerpt || '',
      content: b.content || b.excerpt || '',
      author: b.author || 'Greach Impact Team',
      read_time: b.readTime || '5 min read',
      publish_date: b.date || 'October 21, 2026',
      status: 'Published'
    }));
    const bRes = await fetch(`${url}/rest/v1/blog_posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(blogRows)
    });
    console.log(bRes.ok ? '   ✅ Blog articles synced successfully!' : `   ⚠️ Notice: ${bRes.status} ${bRes.statusText}`);
  }

  // 6. Save Credentials into admin & client config
  console.log('\n6️⃣ Saving Supabase configuration to local config cache...');
  const cfg = { url, key, configuredAt: new Date().toISOString() };
  fs.writeFileSync(
    path.join(__dirname, '..', 'supabase_config.json'),
    JSON.stringify(cfg, null, 2),
    'utf8'
  );
  console.log('   ✅ Configuration saved to supabase_config.json');

  console.log('\n======================================================');
  console.log('🎉 SUPABASE MIGRATION COMPLETE! YOUR CLOUD DB IS LIVE!');
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
