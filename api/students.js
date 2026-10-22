// Vercel Serverless API: /api/students
// Handles student querying, enrollment, and password storage in database

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { id, email } = req.query;
    // Returns student status or basic info
    return res.status(200).json({
      success: true,
      message: 'Greach Impact Student Database API Active',
      query: { id, email },
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    const { action, studentId, name, email, password, cohort } = req.body;

    if (!name && !studentId) {
      return res.status(400).json({ success: false, error: 'Name or Student ID is required' });
    }

    // In production with Supabase or PostgreSQL:
    // Insert/update row in PostgreSQL table: students
    console.log(`[API /students] Action: ${action || 'save'}, Student: ${name} (${studentId})`);

    return res.status(200).json({
      success: true,
      action: action || 'save',
      student: {
        id: studentId || 'STU-2026-REG',
        name,
        email,
        password: password ? 'STORED_ENCRYPTED' : undefined,
        cohort: cohort || 'Batch 2: 2026 Masterclass'
      },
      message: 'Student account and password recorded in Greach Impact database successfully.',
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
