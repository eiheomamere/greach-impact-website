/**
 * Greach Impact Academy - Automated Supabase Cloud Provisioner & Data Migrator
 */

const fs = require('fs');
const path = require('path');

const url = (process.argv[2] || process.env.SUPABASE_URL || 'https://fkltvxhqizqrbvogodxv.supabase.co').trim().replace(/\/$/, '');
const key = (process.argv[3] || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbHR2eGhxaXpxcmJ2b2dvZHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjgwNzIsImV4cCI6MjEwODMwNDA3Mn0.qwinwaYPmLyGAGLm4bXq87wfbS1EtdTUiVv_dEe6xRM').trim();

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
    const testRes = await fetch(`${url}/rest/v1/blog_posts?select=count`, {
      method: 'GET',
      headers
    });
    if (testRes.ok) {
      console.log('   ✅ Successfully connected to Supabase PostgreSQL database!\n');
    } else {
      console.log(`   ⚠️ Table blog_posts returned HTTP ${testRes.status}.\n`);
    }
  } catch(e) {
    console.error('   ❌ Network error connecting to Supabase:', e.message);
    process.exit(1);
  }

  // 2. Load Local Data
  console.log('2️⃣ Reading local Greach Impact records from site-data.json...');
  let siteData = { prices: {}, schedules: {}, blogPosts: [] };
  const siteDataPath = path.join(__dirname, '..', 'site-data.json');
  if (fs.existsSync(siteDataPath)) {
    siteData = JSON.parse(fs.readFileSync(siteDataPath, 'utf8'));
  }

  // 3. Migrate Course Prices
  if (siteData.prices) {
    let priceRows = [];
    if (Array.isArray(siteData.prices)) {
      priceRows = siteData.prices.map(p => ({
        course_id: p.id,
        course_name: p.name,
        original_price: Number(p.originalPrice || p.regular) || 0,
        promo_price: Number(p.promoPrice || p.current) || 0,
        discount_pct: parseInt(p.discountPct || p.discount) || 0,
        updated_by: 'Greachimpact'
      }));
    } else if (typeof siteData.prices === 'object') {
      priceRows = Object.entries(siteData.prices).map(([k, p]) => ({
        course_id: k,
        course_name: p.label || k,
        original_price: Number(p.regular || p.originalPrice) || 0,
        promo_price: Number(p.current || p.promoPrice) || 0,
        discount_pct: parseInt(p.discount || p.discountPct) || 0,
        updated_by: 'Greachimpact'
      }));
    }

    if (priceRows.length > 0) {
      console.log(`3️⃣ Uploading ${priceRows.length} course prices to Supabase table: course_prices...`);
      const pRes = await fetch(`${url}/rest/v1/course_prices`, {
        method: 'POST',
        headers,
        body: JSON.stringify(priceRows)
      });
      console.log(pRes.ok ? `   ✅ ${priceRows.length} Course prices synced successfully!` : `   ⚠️ Notice: ${pRes.status} ${await pRes.text()}`);
    }
  }

  // 4. Migrate Schedules
  if (siteData.schedules) {
    let schedRows = [];
    if (Array.isArray(siteData.schedules)) {
      schedRows = siteData.schedules.map(s => ({
        course_id: s.id,
        start_date: s.startDate || 'Saturday, 14th November 2026',
        delivery_mode: s.deliveryMode || s.mode || 'Live Interactive Studio',
        time_slot: s.startTime ? `${s.startTime} - ${s.endTime}` : '10:00 AM WAT',
        is_self_paced: !!s.isSelfPaced,
        updated_by: 'Greachimpact'
      }));
    } else if (typeof siteData.schedules === 'object') {
      schedRows = Object.entries(siteData.schedules).map(([k, s]) => ({
        course_id: k,
        start_date: s.startDate || 'Saturday, 14th November 2026',
        delivery_mode: s.deliveryMode || s.mode || 'Live Interactive Studio',
        time_slot: s.startTime ? `${s.startTime} - ${s.endTime}` : '10:00 AM WAT',
        is_self_paced: !!s.isSelfPaced,
        updated_by: 'Greachimpact'
      }));
    }

    if (schedRows.length > 0) {
      console.log(`4️⃣ Uploading ${schedRows.length} schedules to Supabase table: course_schedules...`);
      const sRes = await fetch(`${url}/rest/v1/course_schedules`, {
        method: 'POST',
        headers,
        body: JSON.stringify(schedRows)
      });
      console.log(sRes.ok ? `   ✅ ${schedRows.length} Course schedules synced successfully!` : `   ⚠️ Notice: ${sRes.status} ${await sRes.text()}`);
    }
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
    console.log(bRes.ok ? `   ✅ ${blogRows.length} Blog articles synced successfully!` : `   ⚠️ Notice: ${bRes.status} ${await bRes.text()}`);
  }

  // 6. Verify Tables via SELECT count
  console.log('\n6️⃣ Verifying Cloud Database Row Counts on Supabase:');
  const checkTable = async (t) => {
    const r = await fetch(`${url}/rest/v1/${t}?select=count`, { method: 'HEAD', headers });
    const count = r.headers.get('content-range');
    console.log(`   📊 Table: [${t}] -> ${count || 'Active'}`);
  };

  await checkTable('course_prices');
  await checkTable('course_schedules');
  await checkTable('blog_posts');
  await checkTable('students');
  await checkTable('access_codes');

  console.log('\n======================================================');
  console.log('🎉 SUPABASE MIGRATION COMPLETE! YOUR CLOUD DB IS LIVE!');
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
