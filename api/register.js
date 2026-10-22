// Vercel Serverless API: /api/register
// Hardened Registration Endpoint with Bot Honeypot, Rate Limiting, Input Sanitization & Expiry Calculation

const registrationRateLimit = new Map();
const MAX_REGS_PER_WINDOW = 10;
const REG_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isRateLimited(ip) {
  const now = Date.now();
  const record = registrationRateLimit.get(ip) || { count: 0, windowStart: now };
  if (now - record.windowStart > REG_WINDOW_MS) {
    registrationRateLimit.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (record.count >= MAX_REGS_PER_WINDOW) {
    return true;
  }
  record.count += 1;
  registrationRateLimit.set(ip, record);
  return false;
}

function sanitizeStr(str) {
  if (!str) return '';
  return String(str)
    .replace(/[<>]/g, '')
    .trim();
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip';

  // 1. Rate Limiting Check
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      error: 'Too many registration requests from your connection. Please wait a few moments before trying again.'
    });
  }

  try {
    const { name, email, phone, course, cohort, classEndDate, isFree, password, b_company_ref, _gotcha } = req.body || {};

    // 2. Bot Honeypot Check (If hidden field is filled, silently discard without notifying spam bot)
    if (b_company_ref || _gotcha) {
      console.warn(`[Security Alert] Bot trapped in registration honeypot from IP: ${clientIp}`);
      return res.status(200).json({
        success: true,
        message: 'Registration received successfully.'
      });
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Full name and valid email address are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }

    const cleanName = sanitizeStr(name);
    const cleanPhone = sanitizeStr(phone);
    const cleanCourse = sanitizeStr(course) || 'Microsoft Excel Masterclass';
    const cleanCohort = sanitizeStr(cohort) || 'Batch 2: 2026 Masterclass';

    // Generate unique Student ID
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const studentId = `STU-2026-${randomNum}`;

    // Generate secure human-friendly password if not provided
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const c1 = chars.charAt(Math.floor(Math.random() * chars.length));
    const c2 = chars.charAt(Math.floor(Math.random() * chars.length));
    const finalPassword = password || `GRX-${Math.floor(1000 + Math.random() * 9000)}-${c1}${c2}`;

    // Calculate Access Expiry: 1 month after class end date
    const end = classEndDate ? new Date(classEndDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiry = new Date(end);
    expiry.setMonth(expiry.getMonth() + 1);

    const studentRecord = {
      id: studentId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      course: cleanCourse,
      cohort: cleanCohort,
      password: finalPassword,
      status: isFree ? 'Active' : 'Pending Payment',
      paymentStatus: isFree ? 'Verified & Paid' : 'Pending Verification',
      isCodeActive: !!isFree,
      classEndDate: end.toISOString().split('T')[0],
      expiresAt: expiry.toISOString().split('T')[0],
      accessType: isFree ? 'free_grant' : 'paid',
      certificateClaimed: false,
      certificateId: null,
      registeredAt: new Date().toISOString()
    };

    // Format Admin Notification Email
    const adminNotification = {
      recipient: 'greachimpact@gmail.com',
      subject: `[New Registration] ${studentRecord.name} enrolled in ${studentRecord.course}`,
      body: `Hello Super Admin Greachimpact,

A new student has registered for a masterclass:

Student Details:
----------------
• Full Name: ${studentRecord.name}
• Student ID: ${studentRecord.id}
• Email: ${studentRecord.email}
• Phone: ${studentRecord.phone}
• Course: ${studentRecord.course}
• Cohort: ${studentRecord.cohort}
• Unique Access Password: ${studentRecord.password}
• Payment Status: ${studentRecord.paymentStatus}
• Class End Date: ${studentRecord.classEndDate}
• Access Code Expiry: ${studentRecord.expiresAt} (1 month after end of class)
• Access Type: ${studentRecord.accessType}
• Registered At: ${studentRecord.registeredAt}

Direct Admin Console:
https://greachimpact.com/admin.html

Greach Impact Automated Registration Engine`
    };

    return res.status(200).json({
      success: true,
      student: studentRecord,
      adminNotification: adminNotification
    });

  } catch (error) {
    console.error('[API Register] Error:', error);
    return res.status(500).json({ success: false, error: 'Registration processing failed.' });
  }
}
