// Vercel Serverless API: /api/brevo
// Hardened Direct Brevo (Sendinblue) Transactional Email & Automation Dispatcher with Rate Limiting & Input Sanitization
// Authoritative Bank Details:
// - Nigeria: Guaranty Trust Bank (GTBank), Greach Impact, Acct 0763012051 (NGN)
// - International: Zenith Bank, Emmanuel Iheomamere (GBP: 5061817204, USD: 5076088703, EUR: 5081531366)

import crypto from 'crypto';

// Strict Environment-Driven Supabase Configuration (Zero Staging-to-Production Fallback)
const hasStagingVars = Object.keys(process.env).some(k => k.startsWith('STAGING_'));
const isExplicitStaging = process.env.APP_ENV === 'staging' || process.env.STAGING === 'true';

if (hasStagingVars && !isExplicitStaging) {
  throw new Error('[CONFIGURATION AMBIGUITY] STAGING_* variables are present without explicit staging mode.');
}

if (isExplicitStaging && process.env.APP_ENV && process.env.APP_ENV !== 'staging') {
  throw new Error('[CONFIGURATION AMBIGUITY] Conflicting staging flags are configured.');
}

let SUPABASE_URL;
let SUPABASE_SERVICE_ROLE_KEY;

if (isExplicitStaging) {
  SUPABASE_URL = (process.env.STAGING_SUPABASE_URL || '').trim();
  SUPABASE_SERVICE_ROLE_KEY = (process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || '').trim();
} else {
  SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
  SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

async function callSupabaseDb(endpoint, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { ok: false, status: 500 };
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

// In-memory rate limiter (IP-based)
const emailRateLimit = new Map();
const MAX_EMAILS_PER_MIN = 10;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const record = emailRateLimit.get(ip) || { count: 0, windowStart: now };
  if (now - record.windowStart > RATE_WINDOW_MS) {
    emailRateLimit.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (record.count >= MAX_EMAILS_PER_MIN) {
    return true;
  }
  record.count += 1;
  emailRateLimit.set(ip, record);
  return false;
}

function sanitizeStr(str) {
  if (!str) return '';
  return String(str)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

function escapeHtml(str) {
  return sanitizeStr(str).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function verifySignedToken(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const actualBytes = Buffer.from(signature, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  if (actualBytes.length !== expectedBytes.length || !crypto.timingSafeEqual(actualBytes, expectedBytes)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    return Number.isFinite(payload.exp) && Date.now() <= payload.exp ? payload : null;
  } catch (e) {
    return null;
  }
}

function validateInternalCallbackSignature(req) {
  const headers = req.headers || {};
  const timestamp = headers['x-greach-callback-timestamp'] || headers['X-Greach-Callback-Timestamp'] || '';
  const signature = headers['x-greach-callback-signature'] || headers['X-Greach-Callback-Signature'] || '';
  if (!timestamp && !signature) return null;
  if (!/^\d{13}$/.test(String(timestamp)) || typeof signature !== 'string' || !signature) return false;

  const requestTime = Number(timestamp);
  if (Math.abs(Date.now() - requestTime) > 5 * 60 * 1000) return false;

  const isStaging = process.env.APP_ENV === 'staging' || process.env.STAGING === 'true';
  const secret = (isStaging ? process.env.STAGING_AUTH_SECRET || '' : process.env.AUTH_SECRET || '').trim();
  if (!secret) return false;

  const expected = crypto.createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(req.body || {})}`)
    .digest('base64url');
  const expectedBytes = Buffer.from(expected, 'utf8');
  const actualBytes = Buffer.from(signature, 'utf8');
  return actualBytes.length === expectedBytes.length &&
    crypto.timingSafeEqual(actualBytes, expectedBytes);
}

async function verifySuperAdminSession(req) {
  const body = req.body || {};
  const query = req.query || {};
  if (body.token || body.adminToken || query.token || query.adminToken) return false;

  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!bearerMatch) return false;

  const isStaging = process.env.APP_ENV === 'staging' || process.env.STAGING === 'true';
  const authSecret = (isStaging ? process.env.STAGING_AUTH_SECRET || '' : process.env.AUTH_SECRET || '').trim();
  const supabaseUrl = (isStaging ? process.env.STAGING_SUPABASE_URL || '' : process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (isStaging ? process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || '' : process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const payload = verifySignedToken(bearerMatch[1].trim(), authSecret);

  if (!payload || payload.role !== 'super_admin' || payload.mfaVerified !== true ||
      typeof payload.sub !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub) ||
      !supabaseUrl || !serviceRoleKey) {
    return false;
  }

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(payload.sub)}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    if (!userRes.ok) return false;
    const liveUser = await userRes.json();
    const liveEmail = (liveUser.email || '').toLowerCase().trim();
    const sessionEmail = (payload.email || '').toLowerCase().trim();
    const expectedAdminEmail = (isStaging ? process.env.STAGING_ADMIN_EMAIL || '' : process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    return liveUser.id === payload.sub &&
      liveUser.app_metadata?.role === 'super_admin' &&
      !!liveEmail &&
      liveEmail === sessionEmail &&
      (!expectedAdminEmail || liveEmail === expectedAdminEmail);
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
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

  if (validateInternalCallbackSignature(req) === false) {
    return res.status(401).json({ success: false, error: 'Internal callback authentication failed.' });
  }

  const headers = req.headers || {};
  const clientIp = headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip';

  // Rate Limiting Check
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded: Too many email requests. Please wait a minute before trying again.'
    });
  }

  try {
    const { student, type, amount, currency, reference, reason } = req.body || {};
    const maintenanceActions = new Set(['retry_failed', 'reconcile_pending', 'test_connection']);
    const emailTypes = new Set([
      'registration_ack',
      'payment_pending',
      'payment_confirmed',
      'welcome',
      'payment_rejected',
      'admin_payment_alert'
    ]);

    if (type !== 'test_connection' &&
        !maintenanceActions.has(type) &&
        !maintenanceActions.has(req.body?.action) &&
        !emailTypes.has(type)) {
      return res.status(400).json({ success: false, error: 'A supported server-defined email type is required.' });
    }
    if (req.body?.action && !maintenanceActions.has(req.body.action) && req.body.action !== type) {
      return res.status(400).json({ success: false, error: 'Email action does not match the requested template.' });
    }
    
    // Server-side environment key ONLY
    const brevoApiKey = isExplicitStaging
      ? (process.env.STAGING_BREVO_API_KEY || '').trim()
      : (process.env.BREVO_API_KEY || '').trim();
    const senderObj = {
      name: (process.env.BREVO_SENDER_NAME || 'Greach Impact Academy').trim(),
      email: (process.env.BREVO_SENDER_EMAIL || 'greachimpact@gmail.com').trim()
    };

    const adminOnlyAction = [type, req.body?.action].some(action =>
      maintenanceActions.has(action) || ['payment_confirmed', 'welcome', 'payment_rejected'].includes(action)
    );
    if (adminOnlyAction && !(await verifySuperAdminSession(req))) {
      return res.status(403).json({ success: false, error: 'Super Admin authorization with verified TOTP MFA is required.' });
    }

    if (type === 'test_connection' || req.body?.action === 'test_connection') {
      const testEmail = typeof req.body?.testEmail === 'string' ? req.body.testEmail.trim().toLowerCase() : '';
      if (!isValidEmail(testEmail)) {
        return res.status(400).json({ success: false, error: 'A valid test recipient email is required.' });
      }
      if (!brevoApiKey) {
        return res.status(503).json({ success: false, error: 'Server-side Brevo configuration is unavailable.' });
      }
      const testResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'api-key': brevoApiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: senderObj,
          to: [{ email: testEmail, name: 'Lead Administrator' }],
          subject: 'Greach Impact Academy email service test',
          htmlContent: '<p>The server-configured email service test completed successfully.</p>'
        })
      });
      const testData = await testResponse.json();
      if (!testResponse.ok) {
        return res.status(502).json({ success: false, error: testData.message || 'The email provider rejected the test message.' });
      }
      return res.status(200).json({ success: true, messageId: testData.messageId });
    }

    let finalTo = null;
    let finalSubject = '';
    let finalHtml = '';

    const curr = (currency || 'NGN').toUpperCase();
    const isInternational = ['GBP', 'USD', 'EUR'].includes(curr);

    // Determine correct bank details dynamically
    let bankDisplay = '';
    if (curr === 'GBP') {
      bankDisplay = `
        &bull; Bank Name: <strong>Zenith Bank</strong><br>
        &bull; Account Name: <strong>Emmanuel Iheomamere</strong><br>
        &bull; Account Number: <strong>5061817204</strong><br>
        &bull; Currency: <strong>British Pounds (GBP - £)</strong>
      `;
    } else if (curr === 'USD') {
      bankDisplay = `
        &bull; Bank Name: <strong>Zenith Bank</strong><br>
        &bull; Account Name: <strong>Emmanuel Iheomamere</strong><br>
        &bull; Account Number: <strong>5076088703</strong><br>
        &bull; Currency: <strong>US Dollars (USD - $)</strong>
      `;
    } else if (curr === 'EUR') {
      bankDisplay = `
        &bull; Bank Name: <strong>Zenith Bank</strong><br>
        &bull; Account Name: <strong>Emmanuel Iheomamere</strong><br>
        &bull; Account Number: <strong>5081531366</strong><br>
        &bull; Currency: <strong>Euros (EUR - €)</strong>
      `;
    } else {
      // Default: Nigeria NGN
      bankDisplay = `
        &bull; Bank Name: <strong>Guaranty Trust Bank (GTBank)</strong><br>
        &bull; Account Name: <strong>Greach Impact</strong><br>
        &bull; Account Number: <strong>0763012051</strong><br>
        &bull; Currency: <strong>Nigerian Naira (NGN - ₦)</strong>
      `;
    }

    // =========================================================================
    // ACTION: RETRY FAILED NOTIFICATIONS (Admin Feature)
    // =========================================================================
    if (type === 'retry_failed' || req.body?.action === 'retry_failed') {
      if (!brevoApiKey) {
        return res.status(503).json({ success: false, error: 'Server-side Brevo configuration is unavailable; failed notifications were not changed.' });
      }
      const failedRes = await callSupabaseDb('email_notifications?status=eq.failed&select=*&limit=10');
      if (!failedRes.ok) {
        return res.status(500).json({ success: false, error: 'Could not fetch failed notifications.' });
      }
      const failedList = await failedRes.json();
      let retriedCount = 0;
      let suppressedCount = 0;

      for (const item of failedList) {
        const retryClaim = await callSupabaseDb(
          `email_notifications?id=eq.${encodeURIComponent(item.id)}&status=eq.failed`,
          {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
              status: 'retrying',
              retry_count: (item.retry_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
          }
        );
        if (!retryClaim.ok) {
          console.error('[API Brevo] Could not claim failed notification for retry:', retryClaim.status);
          suppressedCount++;
          continue;
        }
        const claimedRows = await retryClaim.json();
        if (!Array.isArray(claimedRows) || claimedRows.length !== 1) {
          suppressedCount++;
          continue;
        }

        let retryResp;
        let rData;
        try {
          retryResp = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'accept': 'application/json', 'api-key': brevoApiKey, 'content-type': 'application/json' },
            body: JSON.stringify({
              sender: senderObj,
              to: [{ email: item.recipient_email, name: item.recipient_name }],
              subject: `[Notification Retry] Greach Impact Academy Enrollment`,
              htmlContent: `<p>Dear ${item.recipient_name}, this is a re-sent notification regarding your enrollment (${item.order_reference || 'Academy'}).</p>`
            })
          });
          rData = await retryResp.json();
        } catch (retryError) {
          const uncertain = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(item.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'requires_reconciliation',
              error_message: 'Retry provider outcome is unknown; automatic resend is suppressed.',
              updated_at: new Date().toISOString()
            })
          });
          if (!uncertain.ok) {
            console.error('[API Brevo] Retry outcome is unknown and reconciliation state could not be saved:', uncertain.status);
          }
          console.error('[API Brevo] Notification retry outcome is unknown:', retryError.message);
          suppressedCount++;
          continue;
        }

        if (!retryResp.ok) {
          const failedUpdate = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(item.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'failed',
              error_message: rData?.message || 'Brevo API rejected notification retry.',
              provider_response: rData,
              updated_at: new Date().toISOString()
            })
          });
          if (!failedUpdate.ok) {
            console.error('[API Brevo] Provider rejection could not be persisted:', failedUpdate.status);
            suppressedCount++;
          }
          continue;
        }

        if (typeof rData?.messageId !== 'string' || !rData.messageId.trim()) {
          const uncertain = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(item.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'requires_reconciliation',
              provider_response: rData,
              error_message: 'Retry provider response did not include a message identifier.',
              updated_at: new Date().toISOString()
            })
          });
          if (!uncertain.ok) console.error('[API Brevo] Retry without message ID requires reconciliation but could not be persisted.');
          suppressedCount++;
          continue;
        }

        const updateRes = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(item.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'sent',
            provider_message_id: rData.messageId,
            provider_response: rData,
            updated_at: new Date().toISOString(),
            sent_at: new Date().toISOString()
          })
        });
        if (!updateRes.ok) {
          const uncertain = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(item.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'requires_reconciliation',
              provider_message_id: rData.messageId,
              provider_response: rData,
              error_message: 'Provider accepted retry but local delivery state could not be saved.',
              updated_at: new Date().toISOString()
            })
          });
          if (!uncertain.ok) console.error('[API Brevo] Accepted retry and reconciliation state could not be persisted.');
          suppressedCount++;
        } else {
          retriedCount++;
        }
      }

      return res.status(200).json({
        success: true,
        retried: retriedCount,
        suppressed: suppressedCount,
        totalFailedFound: failedList.length
      });
    }

    // =========================================================================
    // ACTION: RECONCILE PENDING NOTIFICATIONS (Safe Interruption Recovery)
    // =========================================================================
    if (type === 'reconcile_pending' || req.body?.action === 'reconcile_pending') {
      const pendingRes = await callSupabaseDb('email_notifications?status=in.(pending,retrying)&select=*&limit=50');
      let reconciledCount = 0;
      let transitionedFailed = 0;
      let alreadyDelivered = 0;
      let transitionedRequiresReconciliation = 0;

      if (pendingRes.ok) {
        const pendingList = await pendingRes.json();
        const now = Date.now();
        const STALE_PENDING_MS = 10 * 60 * 1000; // 10 minutes

        for (const item of pendingList) {
          const itemAge = now - new Date(item.created_at || item.updated_at).getTime();
          if (itemAge > STALE_PENDING_MS) {
            let reconciliationOutcome = null; // 'confirmed_sent' | 'definitely_unaccepted' | 'ambiguous'
            let resolvedMessageId = item.provider_message_id;

            if (brevoApiKey) {
              if (resolvedMessageId) {
                try {
                  const chk = await fetch(`https://api.brevo.com/v3/smtp/emails/${encodeURIComponent(resolvedMessageId)}`, {
                    headers: { 'api-key': brevoApiKey, 'accept': 'application/json' },
                    signal: AbortSignal.timeout(5000)
                  });
                  if (chk.ok) {
                    reconciliationOutcome = 'confirmed_sent';
                  } else if (chk.status === 404) {
                    reconciliationOutcome = 'definitely_unaccepted';
                  } else {
                    reconciliationOutcome = 'ambiguous';
                  }
                } catch (netErr) {
                  reconciliationOutcome = 'ambiguous';
                }
              } else if (item.recipient_email) {
                // No provider_message_id recorded locally. Query Brevo's message events for this recipient
                try {
                  const evRes = await fetch(`https://api.brevo.com/v3/smtp/emails?email=${encodeURIComponent(item.recipient_email)}&limit=5`, {
                    headers: { 'api-key': brevoApiKey, 'accept': 'application/json' },
                    signal: AbortSignal.timeout(5000)
                  });
                  if (evRes.ok) {
                    const evData = await evRes.json();
                    const transactionalEmails = evData.transactionalEmails || [];
                    const itemCreatedMs = new Date(item.created_at).getTime();
                    const matchedMsg = transactionalEmails.find(em => {
                      const emTimeMs = new Date(em.date).getTime();
                      return Math.abs(emTimeMs - itemCreatedMs) < 15 * 60 * 1000;
                    });
                    if (matchedMsg) {
                      resolvedMessageId = matchedMsg.uuid || matchedMsg.messageId;
                      reconciliationOutcome = 'confirmed_sent';
                    } else {
                      reconciliationOutcome = 'definitely_unaccepted';
                    }
                  } else {
                    reconciliationOutcome = 'ambiguous';
                  }
                } catch (evErr) {
                  reconciliationOutcome = 'ambiguous';
                }
              } else {
                reconciliationOutcome = 'definitely_unaccepted';
              }
            } else {
              reconciliationOutcome = 'ambiguous';
            }

            if (reconciliationOutcome === 'confirmed_sent') {
              await callSupabaseDb(`email_notifications?id=eq.${item.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  status: 'sent',
                  provider_message_id: resolvedMessageId || item.provider_message_id || `RECONCILED-${item.id}`,
                  sent_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              });
              alreadyDelivered++;
            } else if (reconciliationOutcome === 'definitely_unaccepted') {
              await callSupabaseDb(`email_notifications?id=eq.${item.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  status: 'failed',
                  error_message: 'Dispatch interrupted before confirmation; verified provider did not receive message. Eligible for safe retry.',
                  updated_at: new Date().toISOString()
                })
              });
              transitionedFailed++;
            } else {
              // 'ambiguous' -> Controlled reconciliation state for administrative review; suppress blind auto-retry
              const patchRes = await callSupabaseDb(`email_notifications?id=eq.${item.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  status: 'requires_reconciliation',
                  error_message: 'Dispatch interrupted and provider status could not be definitively verified. Controlled administrative review required; auto-retry suppressed.',
                  updated_at: new Date().toISOString()
                })
              });
              if (!patchRes.ok) {
                console.error('[API Brevo] PATCH error on requires_reconciliation:', patchRes.status, await patchRes.text());
              }
              transitionedRequiresReconciliation++;
            }
            reconciledCount++;
          }
        }
      }

      return res.status(200).json({
        success: true,
        reconciled: reconciledCount,
        alreadyDelivered,
        transitionedFailed,
        transitionedRequiresReconciliation
      });
    }

    // 0. TEMPLATE: Registration Acknowledgement
    if (type === 'registration_ack' && student) {
      if (!isValidEmail(student.email)) {
        return res.status(400).json({ success: false, error: 'Invalid recipient email format.' });
      }

      const safeName = escapeHtml(student.name);
      const safeCourse = escapeHtml(student.course || 'Masterclass');
      const safeCohort = escapeHtml(student.cohort || 'Batch 2: 2026 Masterclass');

      finalTo = [{ email: student.email.trim().toLowerCase(), name: safeName }];
      finalSubject = `Registration Received – ${safeCourse} (${safeCohort})`;
      finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:20px; }
            .card { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; padding:32px; box-shadow:0 8px 24px rgba(0,0,0,0.06); }
            .header { text-align:center; border-bottom:2px solid #0A0A5E; padding-bottom:20px; margin-bottom:24px; }
            .logo-title { font-size:22px; font-weight:800; color:#0A0A5E; margin:0; }
            .box { background:#f0fdf4; border-left:4px solid #16a34a; border-radius:8px; padding:18px; margin:20px 0; }
            .bank-box { background:#fffbeb; border:1.5px solid #fde68a; border-radius:10px; padding:18px; margin:20px 0; }
            .footer { font-size:12px; color:#94a3b8; text-align:center; margin-top:28px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2 class="logo-title">GREACH IMPACT ACADEMY</h2>
              <p style="color:#64748b; font-size:14px; margin-top:4px;">Executive Workplace Excellence</p>
            </div>
            <h3>Dear ${safeName},</h3>
            <p>Your registration for <strong>${safeCourse}</strong> has been successfully received and recorded in our admissions database.</p>

            <div class="box">
              <h4 style="margin:0 0 8px; color:#166534;">🎓 Registration Details:</h4>
              <p style="margin:4px 0; font-size:14px;"><strong>Student:</strong> ${safeName}</p>
              <p style="margin:4px 0; font-size:14px;"><strong>Course:</strong> ${safeCourse}</p>
              <p style="margin:4px 0; font-size:14px;"><strong>Cohort:</strong> ${safeCohort}</p>
              <p style="margin:4px 0; font-size:14px;"><strong>Amount Payable:</strong> ${curr} ${Number(amount || 0).toLocaleString()}</p>
            </div>

            <div class="bank-box">
              <h4 style="margin:0 0 10px; color:#92400e;">🏛️ Next Step: Complete Bank Transfer</h4>
              <p style="margin:0 0 12px; font-size:14px; color:#78350f;">
                Please transfer the course fee to our official account to activate your classroom credentials:
              </p>
              <div style="background:#ffffff; border:1px solid #fed7aa; border-radius:8px; padding:14px; font-size:14px; color:#1f2937; line-height:1.6;">
                ${bankDisplay}
                &bull; Reference / Description: <strong>${reference || safeName}</strong>
              </div>
            </div>

            <p style="font-size:14px;">After sending your transfer, return to the registration portal to submit your transfer reference and receipt for instant verification.</p>

            <div class="footer">
              Greach Impact Academy &bull; greachimpact@gmail.com
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // 1. TEMPLATE: Payment Pending (Instructions)
    if (type === 'payment_pending' && student) {
      if (!isValidEmail(student.email)) {
        return res.status(400).json({ success: false, error: 'Invalid recipient email format.' });
      }

      const safeName = escapeHtml(student.name);
      const safeCourse = escapeHtml(student.course || 'Masterclass');
      const safeCohort = escapeHtml(student.cohort || 'Batch 2');

      finalTo = [{ email: student.email.trim().toLowerCase(), name: safeName }];
      finalSubject = `Payment Instructions – ${safeCourse} (${curr})`;
      finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:20px; }
            .card { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; padding:32px; box-shadow:0 8px 24px rgba(0,0,0,0.06); }
            .header { text-align:center; border-bottom:2px solid #0A0A5E; padding-bottom:20px; margin-bottom:24px; }
            .logo-title { font-size:22px; font-weight:800; color:#0A0A5E; margin:0; }
            .box { background:#fffbeb; border:1.5px solid #fde68a; border-radius:10px; padding:20px; margin:20px 0; }
            .btn { display:inline-block; background:#107C41; color:#ffffff; font-weight:700; text-decoration:none; padding:14px 28px; border-radius:30px; margin-top:16px; }
            .footer { font-size:12px; color:#94a3b8; text-align:center; margin-top:28px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2 class="logo-title">GREACH IMPACT ACADEMY</h2>
              <p style="color:#64748b; font-size:14px; margin-top:4px;">Learn. Practice. Grow.</p>
            </div>
            <h3>Dear ${safeName},</h3>
            <p>Thank you for registering for the <strong>${safeCourse}</strong> (${safeCohort})! Please find the official manual bank transfer details below:</p>
            
            <div class="box">
              <h4 style="margin:0 0 10px; color:#92400e;">🏛️ OFFICIAL ACADEMY BANK ACCOUNT DETAILS</h4>
              <p style="margin:0 0 12px; font-size:14px; color:#78350f;">
                Please make your transfer using the exact details below:
              </p>
              <div style="font-size:24px; font-weight:800; color:#107C41; margin-bottom:12px;">${curr} ${Number(amount || 0).toLocaleString()}</div>
              <div style="background:#ffffff; border:1px solid #fed7aa; border-radius:8px; padding:14px; font-size:14px; color:#1f2937; line-height:1.6;">
                ${bankDisplay}
                &bull; Payment Reference: <strong>${reference || safeName}</strong>
              </div>
            </div>

            <p style="font-size:14px;">Once your bank transfer is completed, return to the registration portal to submit your payment confirmation and upload your transfer receipt.</p>
            
            <p style="font-size:12px; color:#64748b; margin-top:20px; background:#f1f5f9; padding:10px; border-radius:6px;">
              <strong>Verification Note:</strong> Your official Classroom Access Code will be dispatched to this email address immediately upon review and confirmation by our admissions team.
            </p>

            <div class="footer">
              Greach Impact Academy &bull; greachimpact@gmail.com
            </div>
          </div>
        </body>
        </html>
      `;
    }
    // 2. TEMPLATE: Payment Confirmed (Entitlement Activated)
    else if ((type === 'payment_confirmed' || type === 'welcome') && student) {
      if (!isValidEmail(student.email)) {
        return res.status(400).json({ success: false, error: 'Invalid recipient email format.' });
      }

      const safeName = escapeHtml(student.name);
      const safeCourse = escapeHtml(student.course || 'Microsoft Excel Masterclass');
      const safeId = escapeHtml(student.id || 'STU-2026');
      const safeCode = escapeHtml(student.accessCode || student.password || 'ACCESS-CODE');
      const safeExp = escapeHtml(student.expiresAt || '2 Months Access');

      finalTo = [{ email: student.email.trim().toLowerCase(), name: safeName }];
      finalSubject = `Payment Confirmed – Course Access Activated for ${safeCourse}`;
      finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:20px; }
            .card { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; padding:32px; box-shadow:0 8px 24px rgba(0,0,0,0.06); }
            .header { text-align:center; border-bottom:2px solid #0A0A5E; padding-bottom:20px; margin-bottom:24px; }
            .logo-title { font-size:22px; font-weight:800; color:#0A0A5E; margin:0; }
            .box { background:#f0fdf4; border-left:4px solid #16a34a; border-radius:8px; padding:18px; margin:20px 0; }
            .cred-row { display:flex; justify-content:space-between; margin-bottom:8px; font-size:15px; }
            .btn { display:inline-block; background:#107C41; color:#ffffff; font-weight:700; text-decoration:none; padding:14px 28px; border-radius:30px; margin-top:16px; }
            .footer { font-size:12px; color:#94a3b8; text-align:center; margin-top:28px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2 class="logo-title">GREACH IMPACT ACADEMY</h2>
              <p style="color:#64748b; font-size:14px; margin-top:4px;">Executive Workplace Excellence</p>
            </div>
            <h3>Dear ${safeName},</h3>
            <p>Your bank transfer has been <strong>verified and confirmed</strong> by our admissions team! Your enrollment in <strong>${safeCourse}</strong> is now officially active.</p>
            
            <div class="box">
              <h4 style="margin:0 0 12px; color:#0A0A5E;">🔑 Your Unique Classroom Credentials:</h4>
              <div class="cred-row"><span>Student ID:</span> <strong>${safeId}</strong></div>
              <div class="cred-row"><span>Access Code:</span> <strong style="color:#107C41; font-family:monospace; font-size:18px;">${safeCode}</strong></div>
              <div class="cred-row"><span>Access Validity:</span> <strong>${safeExp}</strong></div>
            </div>

            <p>You can enter the classroom portal immediately with your access code to download exercise workbooks and join live sessions:</p>
            
            <div style="text-align:center;">
              <a href="https://greach-impact-website.vercel.app/classroom/index.html?code=${encodeURIComponent(safeCode)}" class="btn">
                🚀 Enter Classroom Portal
              </a>
            </div>

            <div class="footer">
              Greach Impact Academy &bull; greachimpact@gmail.com
            </div>
          </div>
        </body>
        </html>
      `;
    }
    // 3. TEMPLATE: Payment Rejected
    else if (type === 'payment_rejected' && student) {
      if (!isValidEmail(student.email)) {
        return res.status(400).json({ success: false, error: 'Invalid recipient email format.' });
      }

      const safeName = escapeHtml(student.name);
      const safeCourse = escapeHtml(student.course || 'Masterclass');
      const safeReason = escapeHtml(reason) || 'The submitted transaction reference could not be matched with our bank statement.';

      finalTo = [{ email: student.email.trim().toLowerCase(), name: safeName }];
      finalSubject = `Payment Verification Update – ${safeCourse}`;
      finalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:20px; }
            .card { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e2e8f0; padding:32px; box-shadow:0 8px 24px rgba(0,0,0,0.06); }
            .header { text-align:center; border-bottom:2px solid #dc2626; padding-bottom:20px; margin-bottom:24px; }
            .logo-title { font-size:22px; font-weight:800; color:#0A0A5E; margin:0; }
            .box { background:#fef2f2; border-left:4px solid #dc2626; border-radius:8px; padding:18px; margin:20px 0; }
            .btn { display:inline-block; background:#0A0A5E; color:#ffffff; font-weight:700; text-decoration:none; padding:12px 24px; border-radius:30px; margin-top:16px; }
            .footer { font-size:12px; color:#94a3b8; text-align:center; margin-top:28px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2 class="logo-title">GREACH IMPACT ACADEMY</h2>
              <p style="color:#64748b; font-size:14px; margin-top:4px;">Admissions & Verification Team</p>
            </div>
            <h3>Dear ${safeName},</h3>
            <p>We are writing to provide an update regarding your payment submission for <strong>${safeCourse}</strong>.</p>

            <div class="box">
              <h4 style="margin:0 0 8px; color:#991b1b;">⚠️ Payment Verification Notice:</h4>
              <p style="margin:0; font-size:14px; color:#7f1d1d;">
                ${safeReason}
              </p>
            </div>

            <p style="font-size:14px;">If you have already debited your account, please send your bank payment receipt or proof of payment directly to our support desk on WhatsApp or reply to this email so we can manually trace your transfer with the bank.</p>

            <div style="text-align:center;">
              <a href="https://wa.me/2349072250869?text=Hello%20Greach%20Impact!%20My%20payment%20verification%20needs%20assistance%20(Name:%20${encodeURIComponent(safeName)})" class="btn">
                Contact Admissions Support &rarr;
              </a>
            </div>

            <div class="footer">
              Greach Impact Academy &bull; greachimpact@gmail.com
            </div>
          </div>
        </body>
        </html>
      `;
    }
    // 4. TEMPLATE: Admin Payment Alert
    else if (type === 'admin_payment_alert') {
      finalTo = [{ email: 'greachimpact@gmail.com', name: 'Greach Impact Admissions' }];
      const safeAlertName = escapeHtml(student?.name || 'Student');
      const safeAlertEmail = escapeHtml(student?.email || '');
      const safeAlertCourse = escapeHtml(student?.course || '');
      const safeAlertReference = escapeHtml(reference || '');
      finalSubject = `[Manual Bank Transfer] Verification Required for ${sanitizeStr(student?.name || 'Student')}`;
      finalHtml = `
        <h3>New Manual Bank Transfer Confirmation</h3>
        <p>A student has submitted a manual bank transfer confirmation:</p>
        <ul>
          <li><strong>Student Name:</strong> ${safeAlertName}</li>
          <li><strong>Email:</strong> ${safeAlertEmail}</li>
          <li><strong>Course:</strong> ${safeAlertCourse}</li>
          <li><strong>Amount:</strong> ${curr} ${Number(amount || 0).toLocaleString()}</li>
          <li><strong>Reference:</strong> ${safeAlertReference}</li>
        </ul>
        <p><a href="https://greachimpact.com/admin.html">Open Admin Console to Verify &rarr;</a></p>
      `;
    }

    // -------------------------------------------------------------------------
    // Refined Idempotency Key & Atomic Database Claim in Supabase
    // -------------------------------------------------------------------------
    const recipientEmail = Array.isArray(finalTo) ? finalTo[0]?.email : (typeof finalTo === 'string' ? finalTo : student?.email);
    const recipientName = Array.isArray(finalTo) ? finalTo[0]?.name : (student?.name || 'Student');
    const cleanEmail = sanitizeStr(recipientEmail).toLowerCase();
    const cleanRef = reference ? sanitizeStr(reference) : null;
    const cleanStudentId = student?.id ? sanitizeStr(student.id) : null;
    const cleanCourse = sanitizeStr(student?.course || 'general').toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Refined event-specific idempotency key:
    // Guarantees separate registrations for different courses by the same student are not blocked,
    // while concurrent double-submissions of the same event produce identical keys.
    let idempotencyKey;
    if (cleanRef) {
      idempotencyKey = `${type || 'general'}_${cleanRef}_${cleanEmail}`;
    } else if (cleanStudentId) {
      idempotencyKey = `${type || 'general'}_${cleanStudentId}_${cleanCourse}_${cleanEmail}`;
    } else {
      idempotencyKey = `${type || 'general'}_${cleanCourse}_${cleanEmail}`;
    }

    let trackingId = crypto.randomUUID();

    // Atomic Database Claim:
    // With UNIQUE index on idempotency_key, insert pending record BEFORE invoking Brevo.
    // If two simultaneous requests hit this, database uniqueness guarantees only ONE succeeds.
    const claimRes = await callSupabaseDb('email_notifications', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        id: trackingId,
        notification_type: type || 'general',
        recipient_email: cleanEmail || 'unknown@greachimpact.com',
        recipient_name: sanitizeStr(recipientName),
        order_reference: cleanRef,
        student_id: cleanStudentId,
        status: 'pending',
        idempotency_key: idempotencyKey,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!claimRes.ok) {
      const claimErr = await claimRes.text();
      if (!claimErr.includes('duplicate key') && !claimErr.includes('23505') && !claimErr.includes('idempotency_key')) {
        console.error('[API Brevo] Notification claim failed; provider dispatch was not attempted.');
        return res.status(503).json({ success: false, dispatched: false, error: 'Notification could not be claimed safely.' });
      }

      const existRes = await callSupabaseDb(`email_notifications?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*`);
      if (!existRes.ok) {
        return res.status(503).json({ success: false, dispatched: false, error: 'Existing notification state could not be verified.' });
      }
      const existList = await existRes.json();
      if (!Array.isArray(existList) || existList.length !== 1) {
        return res.status(503).json({ success: false, dispatched: false, error: 'Duplicate notification state could not be verified.' });
      }
      const existingRec = existList[0];
      if (existingRec.status === 'sent') {
        return res.status(200).json({
          success: true,
          dispatched: true,
          alreadySent: true,
          trackingId: existingRec.id,
          messageId: existingRec.provider_message_id,
          idempotencyKey,
          message: `Notification already dispatched with idempotency key '${idempotencyKey}'. Duplicate dispatch prevented.`
        });
      }
      if (existingRec.status === 'requires_reconciliation' || existingRec.status === 'retrying') {
        return res.status(202).json({
          success: false,
          dispatched: false,
          requiresReconciliation: existingRec.status === 'requires_reconciliation',
          suppressed: true,
          trackingId: existingRec.id,
          idempotencyKey,
          message: `Notification with key '${idempotencyKey}' is in '${existingRec.status}' state. Duplicate dispatch suppressed pending reconciliation.`
        });
      }
      if (existingRec.status === 'pending') {
        const pendingAgeMs = Date.now() - new Date(existingRec.created_at || existingRec.updated_at).getTime();
        const stale = pendingAgeMs > 10 * 60 * 1000;
        return res.status(stale ? 202 : 200).json({
          success: !stale,
          dispatched: false,
          pending: true,
          requiresReconciliation: stale,
          suppressed: true,
          trackingId: existingRec.id,
          idempotencyKey,
          message: stale
            ? `Stale pending notification with key '${idempotencyKey}' requires provider reconciliation before any retry.`
            : `Notification dispatch with key '${idempotencyKey}' is already in progress.`
        });
      }
      if (existingRec.status !== 'failed') {
        return res.status(503).json({ success: false, dispatched: false, error: 'Notification state is not eligible for dispatch.' });
      }

      trackingId = existingRec.id;
      const retryClaim = await callSupabaseDb(
        `email_notifications?id=eq.${encodeURIComponent(existingRec.id)}&status=eq.failed`,
        {
          method: 'PATCH',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({
            status: 'retrying',
            retry_count: (existingRec.retry_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
        }
      );
      if (!retryClaim.ok) {
        return res.status(503).json({ success: false, dispatched: false, error: 'Failed notification could not be claimed for safe retry.' });
      }
      const retryRows = await retryClaim.json();
      if (!Array.isArray(retryRows) || retryRows.length !== 1) {
        return res.status(202).json({ success: false, dispatched: false, suppressed: true, trackingId, idempotencyKey });
      }
    }

    // Missing provider configuration must never be reported as a successful send.
    if (!brevoApiKey) {
      const failureUpdate = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(trackingId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Server-side Brevo configuration is unavailable.',
          updated_at: new Date().toISOString()
        })
      });
      if (!failureUpdate.ok) {
        console.error('[API Brevo] Could not mark notification failed because server-side provider configuration is unavailable.');
      }

      return res.status(503).json({
        success: false,
        dispatched: false,
        trackingId,
        idempotencyKey,
        error: 'Server-side Brevo configuration is unavailable.'
      });
    }

    let brevoResp;
    let data;
    try {
      brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: senderObj,
          to: Array.isArray(finalTo) ? finalTo : [{ email: finalTo }],
          subject: finalSubject,
          htmlContent: finalHtml
        }),
        signal: AbortSignal.timeout(10000)
      });
      data = await brevoResp.json();
    } catch (providerError) {
      const reconciliation = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(trackingId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'requires_reconciliation',
          error_message: 'Provider request outcome is unknown; automatic retry is suppressed.',
          updated_at: new Date().toISOString()
        })
      });
      if (!reconciliation.ok) {
        console.error('[API Brevo] Provider outcome is unknown and reconciliation state could not be persisted:', reconciliation.status);
      }
      console.error('[API Brevo] Provider request outcome is unknown; no automatic resend will be attempted.');
      return res.status(202).json({
        success: false,
        dispatched: false,
        requiresReconciliation: true,
        trackingId,
        idempotencyKey,
        error: 'Provider outcome is unknown and requires reconciliation.'
      });
    }

    if (!brevoResp.ok) {
      const failureUpdate = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(trackingId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'failed',
          error_message: data?.message || 'Brevo API error',
          provider_response: data,
          updated_at: new Date().toISOString()
        })
      });
      if (!failureUpdate.ok) {
        console.error('[API Brevo] Provider rejected notification but failure state could not be persisted:', failureUpdate.status);
        return res.status(503).json({
          success: false,
          dispatched: false,
          trackingId,
          idempotencyKey,
          error: 'Provider rejected the notification, but local status needs recovery.'
        });
      }
      return res.status(502).json({
        success: false,
        dispatched: false,
        trackingId,
        idempotencyKey,
        error: data?.message || 'Brevo API error'
      });
    }

    if (typeof data?.messageId !== 'string' || !data.messageId.trim()) {
      const reconciliation = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(trackingId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'requires_reconciliation',
          provider_response: data,
          error_message: 'Provider response did not include a message identifier; delivery state is unconfirmed.',
          updated_at: new Date().toISOString()
        })
      });
      if (!reconciliation.ok) {
        console.error('[API Brevo] Provider accepted without a message ID and reconciliation state could not be persisted:', reconciliation.status);
      }
      return res.status(202).json({
        success: false,
        dispatched: false,
        requiresReconciliation: true,
        trackingId,
        idempotencyKey,
        error: 'Provider delivery state is unconfirmed and requires reconciliation.'
      });
    }

    const sentUpdate = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(trackingId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'sent',
        provider_message_id: data.messageId,
        provider_response: data,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    if (!sentUpdate.ok) {
      const reconciliation = await callSupabaseDb(`email_notifications?id=eq.${encodeURIComponent(trackingId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'requires_reconciliation',
          provider_message_id: data.messageId,
          provider_response: data,
          error_message: 'Provider accepted the notification, but local delivery state could not be saved.',
          updated_at: new Date().toISOString()
        })
      });
      if (!reconciliation.ok) {
        console.error('[API Brevo] Provider accepted notification but local status and reconciliation state both failed to persist.');
      }
      return res.status(202).json({
        success: false,
        dispatched: false,
        providerAccepted: true,
        requiresReconciliation: true,
        trackingId,
        idempotencyKey,
        error: 'Provider accepted the notification, but local status requires reconciliation.'
      });
    }

    return res.status(200).json({
      success: true,
      dispatched: true,
      trackingId,
      messageId: data.messageId,
      data
    });

  } catch (error) {
    console.error('Brevo API execution failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to process email dispatch.' });
  }
}
