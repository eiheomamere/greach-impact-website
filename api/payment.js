// Vercel Serverless API: /api/payment
// Greach Impact Academy - Manual Bank Transfer & Administrative Verification Engine (Phase E Gate 2B.1 Hardened)
// Handles:
// 1. Student payment confirmation submission with secure evidence upload to private storage (pending_verification)
// 2. Persistent distributed rate limiting backed by public.auth_rate_limits (5 submissions per 10-minute window)
// 3. Cryptographic file signature (magic bytes) validation & 5MB server-side restriction (Zero Base64 in database)
// 4. Administrative listing & multi-currency filtering of manual payment orders
// 5. Short-lived signed URL generation for authorized receipt inspection (get_receipt)
// 6. Administrative payment confirmation / rejection with immediate role revocation checks & audit trail
// 7. High-entropy entitlement generation with 128-bit pending tokens

import crypto from 'crypto';

// -----------------------------------------------------------------------------
// 1. Strict Environment-Driven Supabase Configuration
// -----------------------------------------------------------------------------
const hasStagingVars = Object.keys(process.env).some(k => k.startsWith('STAGING_'));
const isExplicitStaging = process.env.APP_ENV === 'staging' || process.env.STAGING === 'true';

if (hasStagingVars && !isExplicitStaging) {
  throw new Error('[CONFIGURATION AMBIGUITY] STAGING_* environment variables are present, but explicit staging mode is not set. Fail closed.');
}

let SUPABASE_URL;
let SUPABASE_ANON_KEY;
let SUPABASE_SERVICE_ROLE_KEY;

if (isExplicitStaging) {
  SUPABASE_URL = (process.env.STAGING_SUPABASE_URL || '').trim();
  SUPABASE_ANON_KEY = (process.env.STAGING_SUPABASE_ANON_KEY || '').trim();
  SUPABASE_SERVICE_ROLE_KEY = (process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || '').trim();
} else {
  SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
  SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
  SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

const SUPER_ADMIN_EMAIL = (isExplicitStaging ? process.env.STAGING_ADMIN_EMAIL || '' : process.env.ADMIN_EMAIL || '').toLowerCase().trim();

const VERCEL_DEPLOYMENT_HOST_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+vercel\.app$/i;
const DNS_HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function getCallbackAuthSecret() {
  return isExplicitStaging
    ? (process.env.STAGING_AUTH_SECRET || '').trim()
    : (process.env.AUTH_SECRET || '').trim();
}

export function resolveBrevoCallbackUrl() {
  const isProductionDeployment = process.env.VERCEL_ENV === 'production';
  const deploymentHost = (isProductionDeployment
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : (process.env.VERCEL_ENV === 'preview' ? process.env.VERCEL_URL : ''))?.trim() || '';
  const validHost = isProductionDeployment
    ? DNS_HOST_PATTERN.test(deploymentHost)
    : VERCEL_DEPLOYMENT_HOST_PATTERN.test(deploymentHost);
  if (!validHost) return null;

  try {
    const url = new URL(`https://${deploymentHost}`);
    if (url.protocol !== 'https:' ||
        url.hostname.toLowerCase() !== deploymentHost.toLowerCase() ||
        url.username || url.password || url.port ||
        url.pathname !== '/' || url.search || url.hash) {
      return null;
    }
    return `${url.origin}/api/brevo`;
  } catch (error) {
    return null;
  }
}

function signInternalCallback(payload, timestamp) {
  const secret = getCallbackAuthSecret();
  if (!secret) return null;
  return crypto.createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('base64url');
}

async function recordCallbackConfigurationFailure(notification, idempotencyKey, errorMessage) {
  const type = notification.type;
  const student = notification.student || {};
  const recipientEmail = type === 'admin_payment_alert'
    ? 'greachimpact@gmail.com'
    : String(student.email || '').trim().toLowerCase();
  const response = await callSupabaseDb('email_notifications', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      notification_type: type,
      recipient_email: recipientEmail || 'unknown@greachimpact.com',
      recipient_name: sanitizeStr(student.name || (type === 'admin_payment_alert' ? 'Greach Impact Admissions' : 'Student')),
      order_reference: notification.reference || null,
      student_id: student.id || null,
      status: 'failed',
      idempotency_key: idempotencyKey,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) {
    console.error('[API Payment] Could not record failed Brevo notification because trusted callback URL is unavailable.');
    return false;
  }
  return true;
}

export async function dispatchBrevoNotification(notification, options = {}) {
  const callbackUrl = resolveBrevoCallbackUrl();
  const studentEmail = String(notification.student?.email || '').trim().toLowerCase();
  const recipientEmail = notification.type === 'admin_payment_alert'
    ? 'greachimpact@gmail.com'
    : studentEmail;
  const reference = notification.reference ? String(notification.reference) : '';
  const idempotencyKey = notification.idempotencyKey ||
    `${notification.type}_${reference}_${recipientEmail}`;
  const payload = { ...notification, idempotencyKey };
  const callbackTimestamp = String(Date.now());
  const callbackSignature = signInternalCallback(payload, callbackTimestamp);
  const callbackConfigurationError = callbackUrl
    ? 'Trusted application callback authentication is unavailable.'
    : 'Trusted application callback URL is unavailable.';

  if (!callbackUrl || !callbackSignature) {
    let recorded = false;
    try {
      recorded = await recordCallbackConfigurationFailure(notification, idempotencyKey, callbackConfigurationError);
    } catch (error) {
      console.error('[API Payment] Could not persist notification failure for missing trusted callback URL:', error.message);
    }
    return {
      success: false,
      status: recorded ? 'failed' : 'unrecorded',
      error: callbackConfigurationError
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Greach-Callback-Timestamp': callbackTimestamp,
    'X-Greach-Callback-Signature': callbackSignature
  };
  if (options.authorization) headers.Authorization = options.authorization;

  try {
    const callbackResponse = await fetch(callbackUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });
    let result = null;
    try {
      result = await callbackResponse.json();
    } catch (error) {
      result = null;
    }

    if (!callbackResponse.ok || result?.success !== true) {
      console.error('[API Payment] Brevo notification callback failed:', {
        type: notification.type,
        status: callbackResponse.status,
        trackingId: result?.trackingId || null
      });
      return {
        success: false,
        status: result?.requiresReconciliation
          ? 'requires_reconciliation'
          : (result?.pending ? 'pending' : (result?.trackingId ? 'failed' : 'unknown')),
        trackingId: result?.trackingId || null,
        error: 'Brevo notification was not confirmed by the application callback.'
      };
    }

    return {
      success: true,
      status: result.dispatched || result.alreadySent ? 'sent' : 'pending',
      trackingId: result.trackingId || null
    };
  } catch (error) {
    console.error('[API Payment] Brevo callback outcome is unknown; notification requires reconciliation:', {
      type: notification.type,
      error: error.message
    });
    return {
      success: false,
      status: 'unknown',
      error: 'Brevo callback outcome is unknown and requires reconciliation.'
    };
  }
}

// -----------------------------------------------------------------------------
// 1B. Live Server-Side Currency Exchange Rate Engine (NGN Master, Fail-Closed)
// -----------------------------------------------------------------------------
let cachedRates = null;
let cachedRatesTimestamp = 0;
const RATES_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache window
const MAX_RATE_STALENESS_MS = 24 * 60 * 60 * 1000; // 24 hours freshness threshold
const MAX_FUTURE_RATE_SKEW_MS = 5 * 60 * 1000; // tolerate small provider clock skew

function isRateTimestampFresh(timestampMs, now) {
  const ageMs = now - timestampMs;
  return Number.isFinite(timestampMs) && timestampMs > 0 &&
    ageMs >= -MAX_FUTURE_RATE_SKEW_MS && ageMs <= MAX_RATE_STALENESS_MS;
}

export async function fetchLiveExchangeRates(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedRates && (now - cachedRatesTimestamp < RATES_CACHE_TTL_MS)) {
    const cachedProvAge = cachedRates.providerUpdatedAt ? (now - new Date(cachedRates.providerUpdatedAt).getTime()) : Infinity;
    if (cachedProvAge >= -MAX_FUTURE_RATE_SKEW_MS && cachedProvAge <= MAX_RATE_STALENESS_MS) {
      return cachedRates;
    }
  }

  // Primary: ExchangeRate-API Open Endpoint (open.er-api.com)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/NGN', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.result === 'success' && data.rates) {
        const gbp = Number(data.rates.GBP);
        const usd = Number(data.rates.USD);
        const eur = Number(data.rates.EUR);
        const rateTimeMs = data.time_last_update_unix
          ? Number(data.time_last_update_unix) * 1000
          : (data.time_last_update_utc ? new Date(data.time_last_update_utc).getTime() : 0);
        const isFresh = isRateTimestampFresh(rateTimeMs, now);

        if (gbp > 0 && usd > 0 && eur > 0 && isFresh) {
          const providerTime = new Date(rateTimeMs).toISOString();
          const retrievedTime = new Date(now).toISOString();
          cachedRates = {
            base: 'NGN',
            provider: 'ExchangeRate-API (open.er-api.com)',
            providerUpdatedAt: providerTime,
            rateRetrievedAt: retrievedTime,
            retrievedAt: retrievedTime,
            timestamp: providerTime, // preserved for backward-compatibility
            rates: { GBP: gbp, USD: usd, EUR: eur }
          };
          cachedRatesTimestamp = now;
          return cachedRates;
        } else if (!isFresh) {
          console.warn('[Exchange Rates] Primary provider returned stale or untimestamped rates (>24h). Falling back.');
        }
      }
    }
  } catch (err) {
    console.warn('[Exchange Rates] Primary provider failed:', err.message);
  }

  // Fallback: api.exchangerate-api.com v4
  try {
    const fbRes = await fetch('https://api.exchangerate-api.com/v4/latest/NGN', { signal: AbortSignal.timeout(5000) });
    if (fbRes.ok) {
      const fbData = await fbRes.json();
      if (fbData && fbData.rates) {
        const gbp = Number(fbData.rates.GBP);
        const usd = Number(fbData.rates.USD);
        const eur = Number(fbData.rates.EUR);
        const fbTimeMs = fbData.time_last_updated
          ? Number(fbData.time_last_updated) * 1000
          : (fbData.date ? new Date(fbData.date).getTime() : 0);
        const isFbFresh = isRateTimestampFresh(fbTimeMs, now);

        if (gbp > 0 && usd > 0 && eur > 0 && isFbFresh) {
          const fbProviderTime = new Date(fbTimeMs).toISOString();
          const fbRetrievedTime = new Date(now).toISOString();
          cachedRates = {
            base: 'NGN',
            provider: 'ExchangeRate-API Fallback (api.exchangerate-api.com/v4)',
            providerUpdatedAt: fbProviderTime,
            rateRetrievedAt: fbRetrievedTime,
            retrievedAt: fbRetrievedTime,
            timestamp: fbProviderTime, // preserved for backward-compatibility
            rates: { GBP: gbp, USD: usd, EUR: eur }
          };
          cachedRatesTimestamp = now;
          return cachedRates;
        } else if (!isFbFresh) {
          console.warn('[Exchange Rates] Fallback provider returned stale or untimestamped rates (>24h). Rejecting.');
        }
      }
    }
  } catch (err) {
    console.warn('[Exchange Rates] Fallback provider failed:', err.message);
  }

  // Fail closed: return previous valid cache ONLY if not forceRefresh and still within 24h freshness window
  if (!forceRefresh && cachedRates && cachedRates.providerUpdatedAt) {
    const providerAgeMs = now - new Date(cachedRates.providerUpdatedAt).getTime();
    if ((now - cachedRatesTimestamp <= MAX_RATE_STALENESS_MS) &&
        providerAgeMs >= -MAX_FUTURE_RATE_SKEW_MS && providerAgeMs <= MAX_RATE_STALENESS_MS) {
      return cachedRates;
    }
  }

  // Completely stale or no rates available: fail closed
  return null;
}

// Helper to look up master NGN course price from public.course_prices
async function getMasterCoursePriceNgn(courseId, courseName) {
  const cleanId = (courseId || '').toLowerCase().trim();
  const cleanName = (courseName || '').toLowerCase().trim();
  const aliases = {
    sql_beginners: ['sql_beginners', 'sql'],
    complete_package: ['complete_package', 'complete_course'],
    excel_dashboard: ['excel_dashboard', 'dashboard']
  };
  const acceptedIds = aliases[cleanId] || [cleanId];

  try {
    const cpRes = await callSupabaseDb('course_prices?select=*');
    if (!cpRes.ok) {
      console.error('[API Payment] Course price catalog is unavailable.');
      return { masterNgn: null, canonicalName: null };
    }

    const prices = await cpRes.json();
    if (!Array.isArray(prices)) return { masterNgn: null, canonicalName: null };
    const matchedById = prices.find(p => String(p.course_id || '').toLowerCase() === cleanId) ||
      prices.find(p => acceptedIds.slice(1).includes(String(p.course_id || '').toLowerCase()));
    const matched = matchedById || (!cleanId && cleanName
      ? prices.find(p => String(p.course_name || '').toLowerCase().trim() === cleanName)
      : null);
    if (!matched) return { masterNgn: null, canonicalName: null };

    const promoPrice = Number(matched.promo_price);
    const originalPrice = Number(matched.original_price);
    const masterNgn = Number.isFinite(promoPrice) && promoPrice > 0
      ? promoPrice
      : (Number.isFinite(originalPrice) && originalPrice > 0 ? originalPrice : null);
    if (!masterNgn) return { masterNgn: null, canonicalName: null };
    return { masterNgn, canonicalName: matched.course_name || null };
  } catch (e) {
    console.warn('[API Payment] Failed to fetch master price from Supabase:', e.message);
  }

  return { masterNgn: null, canonicalName: null };
}

// -----------------------------------------------------------------------------
// 2. Persistent Distributed Rate Limiting (Backed by public.auth_rate_limits)
// -----------------------------------------------------------------------------
const paymentMemoryRateLimits = new Map();
const MAX_PAYMENT_SUBMISSIONS = 5;
const PAYMENT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

async function checkPaymentRateLimit(clientIp) {
  const key = `pay:${clientIp}`;
  const now = Date.now();

  // Tier 1: In-memory cache
  const mem = paymentMemoryRateLimits.get(key);
  if (mem) {
    if (mem.locked_until && now < mem.locked_until) {
      return { blocked: true, remainingMinutes: Math.ceil((mem.locked_until - now) / 60000) };
    }
    if (mem.locked_until && now >= mem.locked_until) {
      mem.locked_until = null;
      mem.count = 0;
    }
    if (mem.lastAttempt && now - mem.lastAttempt > PAYMENT_WINDOW_MS) {
      mem.count = 0;
    }
  }

  // Tier 2: Persistent check against public.auth_rate_limits
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits?ip=eq.${encodeURIComponent(key)}&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const records = await res.json();
      if (Array.isArray(records) && records.length > 0) {
        const rec = records[0];
        const lockedUntil = rec.locked_until ? new Date(rec.locked_until).getTime() : null;
        const lastAttempt = (rec.last_failed_at || rec.updated_at) ? new Date(rec.last_failed_at || rec.updated_at).getTime() : 0;
        const attemptsCount = rec.failed_attempts ?? rec.attempts ?? 0;

        if (lockedUntil && now < lockedUntil) {
          paymentMemoryRateLimits.set(key, { count: attemptsCount, locked_until: lockedUntil, lastAttempt });
          return { blocked: true, remainingMinutes: Math.ceil((lockedUntil - now) / 60000) };
        }
        if (now - lastAttempt > PAYMENT_WINDOW_MS) {
          paymentMemoryRateLimits.set(key, { count: 0, locked_until: null, lastAttempt: now });
        } else {
          paymentMemoryRateLimits.set(key, { count: attemptsCount, locked_until: lockedUntil, lastAttempt });
        }
      }
    }
  } catch (e) {
    // Graceful fallback to memory limiter
  }

  return { blocked: false };
}

async function recordPaymentSubmissionAttempt(clientIp) {
  const key = `pay:${clientIp}`;
  const now = Date.now();
  const mem = paymentMemoryRateLimits.get(key) || { count: 0, lastAttempt: now };

  if (mem.lastAttempt && now - mem.lastAttempt > PAYMENT_WINDOW_MS) {
    mem.count = 1;
  } else {
    mem.count += 1;
  }
  mem.lastAttempt = now;

  let lockedUntilIso = null;
  if (mem.count >= MAX_PAYMENT_SUBMISSIONS) {
    const lockTime = now + PAYMENT_WINDOW_MS;
    mem.locked_until = lockTime;
    lockedUntilIso = new Date(lockTime).toISOString();
  }
  paymentMemoryRateLimits.set(key, mem);

  // Sync to public.auth_rate_limits (supports Production V1.2 schema and Staging schema)
  try {
    const nowIso = new Date(now).toISOString();
    const primaryRatePayload = isExplicitStaging
      ? { ip: key, failed_attempts: mem.count, last_failed_at: nowIso, locked_until: lockedUntilIso }
      : { ip: key, attempts: mem.count, updated_at: nowIso, locked_until: lockedUntilIso };
    const rlRes = await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(primaryRatePayload),
      signal: AbortSignal.timeout(3000)
    });
    if (!rlRes.ok) {
      const fallbackRatePayload = isExplicitStaging
        ? { ip: key, attempts: mem.count, updated_at: nowIso, locked_until: lockedUntilIso }
        : { ip: key, failed_attempts: mem.count, last_failed_at: nowIso, locked_until: lockedUntilIso };
      await fetch(`${SUPABASE_URL}/rest/v1/auth_rate_limits`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(fallbackRatePayload),
        signal: AbortSignal.timeout(3000)
      });
    }
  } catch (e) {}
}

// -----------------------------------------------------------------------------
// 3. Receipt File & Magic Bytes Validation
// -----------------------------------------------------------------------------
const ALLOWED_RECEIPT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_RECEIPT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function validateReceiptEvidence(filename, base64Data) {
  if (!filename && !base64Data) {
    return { valid: true, buffer: null, mimeType: null, ext: null };
  }

  if (!filename || !base64Data) {
    return { valid: false, error: 'Both receipt filename and file data are required when providing payment evidence.' };
  }

  // 1. Validate extension
  const cleanName = sanitizeStr(filename).toLowerCase();
  const ext = ALLOWED_RECEIPT_EXTENSIONS.find(e => cleanName.endsWith(e));
  if (!ext) {
    return {
      valid: false,
      error: 'Invalid receipt file extension. Allowed formats are: .jpg, .jpeg, .png, .webp, .pdf.'
    };
  }

  // 2. Extract Data URL components
  let rawBase64 = base64Data;
  const match = String(base64Data).match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    rawBase64 = match[2];
  }

  // 3. Decode base64 to buffer
  let buffer;
  try {
    buffer = Buffer.from(rawBase64, 'base64');
  } catch (e) {
    return { valid: false, error: 'Malformed base64 receipt encoding.' };
  }

  // 4. Validate file size (<= 5MB)
  if (buffer.length === 0) {
    return { valid: false, error: 'Empty receipt file submitted.' };
  }
  if (buffer.length > MAX_RECEIPT_FILE_SIZE) {
    return { valid: false, error: `Receipt file exceeds the 5MB size limit (Submitted: ${(buffer.length / 1024 / 1024).toFixed(2)} MB).` };
  }

  // 5. Validate magic bytes signature
  let detectedMime = null;
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    detectedMime = 'image/jpeg';
  } else if (buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
    detectedMime = 'image/png';
  } else if (buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    detectedMime = 'image/webp';
  } else if (buffer.length >= 4 &&
    buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    detectedMime = 'application/pdf';
  }

  if (!detectedMime) {
    return {
      valid: false,
      error: 'Receipt file signature does not match any allowed format (JPEG, PNG, WEBP, PDF).'
    };
  }

  // Verify extension matches magic bytes
  const isJpg = (ext === '.jpg' || ext === '.jpeg') && detectedMime === 'image/jpeg';
  const isPng = ext === '.png' && detectedMime === 'image/png';
  const isWebp = ext === '.webp' && detectedMime === 'image/webp';
  const isPdf = ext === '.pdf' && detectedMime === 'application/pdf';

  if (!isJpg && !isPng && !isWebp && !isPdf) {
    return {
      valid: false,
      error: `File signature (${detectedMime}) does not match file extension (${ext}).`
    };
  }

  return { valid: true, buffer, mimeType: detectedMime, ext, size: buffer.length };
}

// Upload buffer directly to private Supabase Storage bucket
async function uploadReceiptToStorage(storagePath, buffer, mimeType) {
  const url = `${SUPABASE_URL}/storage/v1/object/payment_receipts/${storagePath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': mimeType
    },
    body: buffer
  });
  return res;
}

// Generate a short-lived signed URL (15 minutes) for private storage object
async function getSignedReceiptUrl(storagePath, expiresIn = 900) {
  const url = `${SUPABASE_URL}/storage/v1/object/sign/payment_receipts/${storagePath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiresIn })
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.signedURL) return null;
  return `${SUPABASE_URL}/storage/v1${data.signedURL}`;
}

// Delete object from private storage bucket (used for atomicity rollback on partial DB failure)
async function deleteReceiptFromStorage(storagePath) {
  if (!storagePath) return;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/payment_receipts/${storagePath}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
  } catch (e) {
    console.error('[API Payment] Failed to clean up orphaned receipt:', e);
  }
}

// -----------------------------------------------------------------------------
// 4. Utility Functions & Token Verification
// -----------------------------------------------------------------------------
function sanitizeStr(str) {
  if (!str) return '';
  return String(str)
    .replace(/[<>]/g, '')
    .trim();
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Real-time verification of Super Admin role against Supabase Auth (Immediate Role Revocation)
async function verifyLiveAdminPrivilege(session) {
  if (!session) return false;
  if (session.role !== 'super_admin' && session.role !== 'sub_admin') return false;
  if (session.role === 'super_admin' && session.mfaVerified !== true) return false;

  // If token has a real Supabase User UUID (sub), verify against auth.users in real time
  const isUuid = session.sub && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.sub);
  if (isUuid) {
    try {
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(session.sub)}`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      if (!userRes.ok) return false;
      const liveUser = await userRes.json();
      const liveRole = liveUser.app_metadata?.role;
      const liveEmail = (liveUser.email || '').toLowerCase().trim();

      if (session.role === 'super_admin') {
        return (liveRole === 'super_admin') && (liveEmail === SUPER_ADMIN_EMAIL);
      }
      if (session.role === 'sub_admin') {
        return liveRole === 'sub_admin';
      }
    } catch (e) {
      return false; // Fail closed on verification error
    }
  }

  return false;
}

// Admin Token Authorization Boundary:
// Admin tokens must be accepted EXCLUSIVELY through HTTP Authorization header (Bearer <token>).
// Any request containing administrative token values in the body or query parameters must be rejected,
// even when a valid Authorization header is also supplied.
function getAdminBearerToken(req) {
  const headers = req.headers || {};
  const authHeader = headers['authorization'] || headers['Authorization'];

  const hasBodyToken = Boolean(req.body && (req.body.token || req.body.adminToken));
  const hasQueryToken = Boolean(req.query && (req.query.token || req.query.adminToken));
  const hasFallbackAttempt = hasBodyToken || hasQueryToken;

  if (hasFallbackAttempt) {
    return { token: null, hasFallbackAttempt: true, rejectedReason: 'tokens_in_body_or_query_prohibited' };
  }

  if (!authHeader || typeof authHeader !== 'string') {
    return { token: null, hasFallbackAttempt: false, rejectedReason: 'missing_auth_header' };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { token: null, hasFallbackAttempt: false, rejectedReason: 'malformed_auth_header' };
  }

  return { token: match[1].trim(), hasFallbackAttempt: false, rejectedReason: null };
}

// Student session extractor (supports Bearer tokens in Authorization header)
function getStudentAuthToken(req) {
  const headers = req.headers || {};
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function getClientIp(req) {
  const headers = req.headers || {};
  const edgeIp = headers['cf-connecting-ip'] || headers['CF-Connecting-IP'] || headers['x-vercel-ip'] || headers['x-real-ip'];
  if (edgeIp && typeof edgeIp === 'string') return edgeIp.trim();
  const xForwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
  if (xForwarded && typeof xForwarded === 'string') {
    const parts = xForwarded.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.socket?.remoteAddress || 'unknown-ip';
}

async function callSupabaseDb(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}

// Schema-adaptive audit_logs helper (Production uses 'target'; Staging uses 'target_id')
async function insertAuditLogRecord({ action, performed_by, targetRef, details, ip_address, created_at }) {
  const basePayload = {
    action,
    performed_by,
    details,
    ip_address,
    created_at: created_at || new Date().toISOString()
  };
  const primaryPayload = isExplicitStaging
    ? { ...basePayload, target_id: targetRef }
    : { ...basePayload, target: targetRef };
  const res = await callSupabaseDb('audit_logs', {
    method: 'POST',
    body: JSON.stringify(primaryPayload)
  });
  if (!res.ok) {
    const fallbackPayload = isExplicitStaging
      ? { ...basePayload, target: targetRef }
      : { ...basePayload, target_id: targetRef };
    return callSupabaseDb('audit_logs', {
      method: 'POST',
      body: JSON.stringify(fallbackPayload)
    });
  }
  return res;
}

async function fetchPaymentSubmissionAuditLog(orderReference) {
  const encodedRef = encodeURIComponent(orderReference);
  const primaryCol = isExplicitStaging ? 'target_id' : 'target';
  const fallbackCol = isExplicitStaging ? 'target' : 'target_id';

  let res = await callSupabaseDb(
    `audit_logs?action=eq.payment_submitted&${primaryCol}=eq.${encodedRef}&order=created_at.desc&limit=1`
  );
  if (!res.ok) {
    res = await callSupabaseDb(
      `audit_logs?action=eq.payment_submitted&${fallbackCol}=eq.${encodedRef}&order=created_at.desc&limit=1`
    );
  }
  return res;
}

// High-entropy Access Code Generator (CSPRNG via crypto.randomInt)
function generateAccessCode(courseKey) {
  let prefix = 'EXCE';
  const c = (courseKey || '').toLowerCase();
  if (c.includes('excel')) prefix = 'EXCE';
  else if (c.includes('sql')) prefix = 'SQL';
  else if (c.includes('power') || c.includes('bi')) prefix = 'PBIA';
  else if (c.includes('complete') || c.includes('suite') || c.includes('analytics')) prefix = 'SUIT';
  else prefix = (courseKey || 'EXCEL').replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase() || 'EXCE';

  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `GI-${prefix}-${rand}`;
}

// -----------------------------------------------------------------------------
// 5. Main Request Handler
// -----------------------------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = getClientIp(req);
  const authSecret = isExplicitStaging
    ? (process.env.STAGING_AUTH_SECRET || '').trim()
    : (process.env.AUTH_SECRET || '').trim();

  try {
    const { action } = req.body || req.query || {};

    if (!action) {
      return res.status(400).json({ success: false, error: 'Action parameter is required.' });
    }
    if (!authSecret || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ success: false, error: 'Server payment configuration is unavailable.' });
    }

    // =========================================================================
    // ACTION: GET LIVE EXCHANGE RATES (Public & Admin Utility)
    // =========================================================================
    if (action === 'get_rates') {
      const forceRefresh = req.query?.force === 'true' || req.body?.force === true;
      const rateData = await fetchLiveExchangeRates(forceRefresh);
      if (!rateData) {
        return res.status(503).json({
          success: false,
          error: 'Live exchange rates are currently unavailable. Fail-closed protection active.'
        });
      }
      return res.status(200).json({
        success: true,
        base: rateData.base,
        provider: rateData.provider,
        providerUpdatedAt: rateData.providerUpdatedAt || rateData.timestamp,
        rateRetrievedAt: rateData.rateRetrievedAt || rateData.retrievedAt || new Date().toISOString(),
        retrievedAt: rateData.retrievedAt || new Date().toISOString(),
        timestamp: rateData.timestamp,
        rates: rateData.rates
      });
    }

    // =========================================================================
    // ACTION: CALCULATE QUOTE (Server-Authoritative Dynamic Price Conversion)
    // =========================================================================
    if (action === 'calculate_quote') {
      const { courseName, currency } = req.body || req.query || {};
      const courseId = (req.body || req.query || {}).courseId || 'excel_beginners';
      const cleanCurrency = sanitizeStr(currency).toUpperCase() || 'NGN';
      const allowedCurrencies = ['NGN', 'GBP', 'USD', 'EUR'];

      if (!allowedCurrencies.includes(cleanCurrency)) {
        return res.status(400).json({
          success: false,
          error: `Invalid currency '${currency}'. Supported currencies are NGN, GBP, USD, and EUR.`
        });
      }

      const { masterNgn, canonicalName } = await getMasterCoursePriceNgn(courseId, courseName);
      if (!masterNgn || !canonicalName) {
        return res.status(503).json({ success: false, error: 'Course pricing is temporarily unavailable. Please try again shortly.' });
      }

      if (cleanCurrency === 'NGN') {
        return res.status(200).json({
          success: true,
          courseId: courseId || 'excel_beginners',
          courseName: canonicalName,
          masterPriceNgn: masterNgn,
          currency: 'NGN',
          convertedAmount: masterNgn,
          exchangeRate: 1.0,
          provider: 'Master NGN',
          providerUpdatedAt: null,
          rateRetrievedAt: null,
          retrievedAt: null,
          timestamp: null
        });
      }

      const forceRefresh = req.query?.force === 'true' || req.body?.force === true;
      const rateData = await fetchLiveExchangeRates(forceRefresh);
      if (!rateData || !rateData.rates || !rateData.rates[cleanCurrency]) {
        return res.status(503).json({
          success: false,
          error: `Live exchange rates for ${cleanCurrency} are currently unavailable.`
        });
      }

      const rate = rateData.rates[cleanCurrency];
      const converted = Math.round(masterNgn * rate * 100) / 100;
      const provTime = rateData.providerUpdatedAt || rateData.timestamp;
      const retTime = rateData.rateRetrievedAt || rateData.retrievedAt || new Date().toISOString();

      return res.status(200).json({
        success: true,
        courseId: courseId || 'excel_beginners',
        courseName: canonicalName,
        masterPriceNgn: masterNgn,
        currency: cleanCurrency,
        convertedAmount: converted,
        exchangeRate: rate,
        provider: rateData.provider,
        providerUpdatedAt: provTime,
        rateRetrievedAt: retTime,
        retrievedAt: retTime,
        timestamp: provTime
      });
    }

    // =========================================================================
    // ACTION 1: SUBMIT PAYMENT CONFIRMATION (Student Action)
    // =========================================================================
    if (action === 'submit_payment') {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
      }

      // 1. Distributed Persistent Rate Limiting
      const rateLimitCheck = await checkPaymentRateLimit(clientIp);
      if (rateLimitCheck.blocked) {
        return res.status(429).json({
          success: false,
          error: `Too many payment submissions from this connection. Please wait ${rateLimitCheck.remainingMinutes || 10} minutes before submitting again.`
        });
      }

      // Record this submission attempt immediately against the client IP
      await recordPaymentSubmissionAttempt(clientIp);

      const {
        studentName,
        studentEmail,
        studentPhone,
        courseName,
        courseId,
        paymentCategory, // 'nigeria' | 'international'
        currency,        // 'NGN' | 'GBP' | 'USD' | 'EUR'
        amountPaid,
        bankUsed,
        transactionReference,
        paymentDate,
        evidenceFilename,
        evidenceBase64,
        b_company_ref,   // Bot honeypot
        _gotcha          // Bot honeypot
      } = req.body || {};

      // Bot honeypot check
      if (b_company_ref || _gotcha) {
        console.warn(`[Security Honeypot] Bot trapped in payment submission from IP: ${clientIp}`);
        return res.status(200).json({
          success: true,
          status: 'pending_verification',
          message: 'Your payment confirmation has been submitted successfully. Your payment is awaiting verification. You will receive confirmation once our team has reviewed it.'
        });
      }

      // Mandatory fields validation
      if (!studentName || !studentEmail || !courseName || !amountPaid || !transactionReference) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: Name, Email, Course, Amount, and Transaction Reference are mandatory.'
        });
      }

      const cleanEmail = sanitizeStr(studentEmail).toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      }

      const cleanName = sanitizeStr(studentName);
      const cleanPhone = sanitizeStr(studentPhone);
      const cleanCourse = sanitizeStr(courseName);
      const cleanCourseId = sanitizeStr(courseId) || 'excel_beginners';
      const cleanBankUsed = sanitizeStr(bankUsed) || 'Bank Transfer';
      const cleanRef = sanitizeStr(transactionReference).toUpperCase();
      const cleanDate = sanitizeStr(paymentDate) || new Date().toISOString().split('T')[0];

      // Validate currency: Must be exactly one of the supported currencies
      const allowedCurrencies = ['NGN', 'GBP', 'USD', 'EUR'];
      const cleanCurrency = sanitizeStr(currency).toUpperCase();
      if (!allowedCurrencies.includes(cleanCurrency)) {
        return res.status(400).json({
          success: false,
          error: `Invalid currency '${currency}'. Supported currencies are NGN, GBP, USD, and EUR.`
        });
      }

      // Validate amount is positive numeric
      const numAmount = Number(amountPaid);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Please enter a valid transfer amount greater than 0.' });
      }

      // Validate transaction reference length
      if (cleanRef.length < 4 || cleanRef.length > 100) {
        return res.status(400).json({ success: false, error: 'Transaction reference must be between 4 and 100 characters.' });
      }

      // 2. Idempotency Check: Verify transaction reference does not already exist BEFORE file upload
      const existingRes = await callSupabaseDb(`orders?order_reference=eq.${encodeURIComponent(cleanRef)}&select=order_reference,status`);
      if (existingRes.ok) {
        const existing = await existingRes.json();
        if (Array.isArray(existing) && existing.length > 0) {
          return res.status(409).json({
            success: false,
            error: `Transaction reference '${cleanRef}' has already been submitted (Current status: ${existing[0].status}). Duplicate submissions are not permitted.`
          });
        }
      }

      // 3. Receipt Evidence Validation (Magic Bytes, Size <= 5MB, Extension)
      let receiptStoragePath = null;
      let receiptMime = null;
      let receiptSizeBytes = 0;

      if (evidenceBase64 || evidenceFilename) {
        const valRes = validateReceiptEvidence(evidenceFilename, evidenceBase64);
        if (!valRes.valid) {
          // FAIL CLOSED: Do not insert order, do not insert student
          return res.status(400).json({ success: false, error: valRes.error });
        }

        if (valRes.buffer) {
          const fileExt = valRes.ext.replace(/^\./, '');
          const storageFileName = `${cleanRef.replace(/[^A-Z0-9_-]/g, '_')}_${Date.now()}.${fileExt}`;
          receiptStoragePath = `receipts/${storageFileName}`;
          receiptMime = valRes.mimeType;
          receiptSizeBytes = valRes.size;

          const uploadRes = await uploadReceiptToStorage(receiptStoragePath, valRes.buffer, valRes.mimeType);
          if (!uploadRes.ok) {
            const upErr = await uploadRes.text();
            console.error('[API Payment] Failed to upload receipt to private storage:', upErr);
            // FAIL CLOSED: Abort immediately without creating database records
            return res.status(500).json({
              success: false,
              error: 'Failed to securely store payment receipt evidence. Payment confirmation has not been processed. Please try again.'
            });
          }
        }
      }

      // 4. Server-Authoritative Price Calculation & Exchange Rate Snapshot Locking
      const { masterNgn, canonicalName } = await getMasterCoursePriceNgn(cleanCourseId, cleanCourse);
      if (!masterNgn || !canonicalName) {
        if (receiptStoragePath) await deleteReceiptFromStorage(receiptStoragePath);
        return res.status(503).json({ success: false, error: 'Course pricing is temporarily unavailable. Payment confirmation has not been recorded. Please try again shortly.' });
      }
      let exchangeRate = 1.0;
      let rateProvider = 'Master NGN';
      let providerUpdatedAt = null;
      let rateRetrievedAt = null;
      let authoritativeAmount = numAmount;

      if (cleanCurrency !== 'NGN') {
        const forceRefresh = req.query?.force === 'true' || req.body?.force === true;
      const rateData = await fetchLiveExchangeRates(forceRefresh);
        if (!rateData || !rateData.rates || !rateData.rates[cleanCurrency]) {
          return res.status(503).json({
            success: false,
            error: `Live exchange rates for ${cleanCurrency} are currently unavailable. Fail-closed: cannot record unverified international currency order. Please complete your registration in Nigerian Naira (NGN) or try again shortly.`
          });
        }
        exchangeRate = rateData.rates[cleanCurrency];
        rateProvider = rateData.provider;
        providerUpdatedAt = rateData.providerUpdatedAt;
        rateRetrievedAt = rateData.rateRetrievedAt;
        // Server-authoritative dynamic conversion rounded to 2 decimal places
        authoritativeAmount = Math.round(masterNgn * exchangeRate * 100) / 100;
      } else {
        exchangeRate = 1.0;
        rateProvider = 'Master NGN';
        providerUpdatedAt = null;
        rateRetrievedAt = null;
        // NGN is the catalog master price. Never trust the amount submitted by the browser.
        authoritativeAmount = masterNgn;
      }

      // 5. Associate or create student record in public.students table (UUID-based with collision retry)
      let studentId = null;
      const stuRes = await callSupabaseDb(`students?registered_email=eq.${encodeURIComponent(cleanEmail)}&select=id`);
      if (stuRes.ok) {
        const stuList = await stuRes.json();
        if (Array.isArray(stuList) && stuList.length > 0) {
          studentId = stuList[0].id;
        }
      }

      if (!studentId) {
        let studentCreated = false;
        let attempts = 0;
        while (!studentCreated && attempts < 3) {
          attempts++;
          studentId = `STU-2026-${crypto.randomUUID().toUpperCase()}`;
          const highEntropyPendingToken = `PENDING-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

          const stuInsertRes = await callSupabaseDb('students', {
            method: 'POST',
            body: JSON.stringify({
              id: studentId,
              full_name: cleanName,
              registered_email: cleanEmail,
              phone: cleanPhone,
              secret_password: highEntropyPendingToken,
              enrolled_course: canonicalName,
              cohort: sanitizeStr(req.body?.cohort) || 'Batch 2: 2026 Masterclass',
              status: 'Pending Payment',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          });

          if (stuInsertRes.ok) {
            studentCreated = true;
          } else {
            const errText = await stuInsertRes.text();
            if (errText.includes('23505') || errText.includes('students_pkey') || errText.includes('duplicate key')) {
              console.warn(`[API Payment] Student ID collision on attempt ${attempts}: ${studentId}. Retrying with new UUID...`);
              continue;
            }
            console.error('[API Payment] Failed to insert student:', errText);
            if (receiptStoragePath) await deleteReceiptFromStorage(receiptStoragePath);
            return res.status(500).json({ success: false, error: 'Failed to record student profile in database.' });
          }
        }
      }

      // Determine verified bank payment channel string (character varying(50) limit)
      let channelStr = '';
      if (cleanCurrency === 'NGN') {
        channelStr = 'GTBank - 0763012051';
      } else if (cleanCurrency === 'GBP') {
        channelStr = 'Zenith Bank - GBP - 5061817204';
      } else if (cleanCurrency === 'USD') {
        channelStr = 'Zenith Bank - USD - 5076088703';
      } else if (cleanCurrency === 'EUR') {
        channelStr = 'Zenith Bank - EUR - 5081531366';
      }

      // 6. Insert Order Record with status 'pending_verification' & locked exchange rate snapshot
      // Exact Production V1.2 schema (fkltvxhqizqrbvogodxv) includes legacy NOT NULL columns
      // (order_id, student_name, student_email, course_name, amount) alongside V1.1 & V1.2 columns
      // (order_reference, customer_name, customer_email, amount_paid, original_master_price_ngn,
      // exchange_rate, rate_provider, provider_updated_at, rate_retrieved_at, requires_manual_review).
      const nowIso = new Date().toISOString();

      const prodV12OrderPayload = {
        order_id: cleanRef,
        order_reference: cleanRef,
        student_id: studentId,
        student_name: cleanName,
        customer_name: cleanName,
        student_email: cleanEmail,
        customer_email: cleanEmail,
        phone: cleanPhone,
        customer_phone: cleanPhone,
        course_id: cleanCourseId,
        course_name: canonicalName,
        amount: authoritativeAmount,
        amount_paid: authoritativeAmount,
        currency: cleanCurrency,
        original_master_price_ngn: masterNgn,
        exchange_rate: exchangeRate,
        rate_provider: rateProvider,
        provider_updated_at: providerUpdatedAt,
        rate_retrieved_at: rateRetrievedAt,
        requires_manual_review: false,
        payment_channel: channelStr,
        payment_status: 'Pending Verification',
        payment_reference: cleanRef,
        status: 'pending_verification',
        created_at: nowIso
      };

      const stagingOrderPayload = {
        order_reference: cleanRef,
        student_id: studentId,
        customer_name: cleanName,
        customer_email: cleanEmail,
        customer_phone: cleanPhone,
        course_id: cleanCourseId,
        course_name: canonicalName,
        amount_paid: authoritativeAmount,
        currency: cleanCurrency,
        original_master_price_ngn: masterNgn,
        exchange_rate: exchangeRate,
        rate_provider: rateProvider,
        provider_updated_at: providerUpdatedAt,
        rate_retrieved_at: rateRetrievedAt,
        payment_channel: channelStr,
        status: 'pending_verification',
        created_at: nowIso
      };

      const primaryOrderPayload = isExplicitStaging ? stagingOrderPayload : prodV12OrderPayload;
      const fallbackOrderPayload = isExplicitStaging ? prodV12OrderPayload : stagingOrderPayload;

      let orderInsertRes = await callSupabaseDb('orders', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(primaryOrderPayload)
      });

      if (!orderInsertRes.ok) {
        orderInsertRes = await callSupabaseDb('orders', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(fallbackOrderPayload)
        });
      }

      if (!orderInsertRes.ok) {
        const errText = await orderInsertRes.text();
        console.error('[API Payment] Failed to insert order:', errText);
        if (receiptStoragePath) await deleteReceiptFromStorage(receiptStoragePath);
        return res.status(500).json({ success: false, error: 'Failed to record payment confirmation in database.' });
      }

      // 7. Record in audit_logs with receipt storage reference & exchange rate snapshot
      await insertAuditLogRecord({
        action: 'payment_submitted',
        performed_by: cleanEmail,
        targetRef: cleanRef,
        details: {
          student_id: studentId,
          student_name: cleanName,
          student_email: cleanEmail,
          amount_paid: authoritativeAmount,
          currency: cleanCurrency,
          original_master_price_ngn: masterNgn,
          exchange_rate: exchangeRate,
          rate_provider: rateProvider,
          provider_updated_at: providerUpdatedAt,
          rate_retrieved_at: rateRetrievedAt,
          bank_used: cleanBankUsed,
          payment_date: cleanDate,
          receipt_storage_path: receiptStoragePath,
          evidence_filename: evidenceFilename ? sanitizeStr(evidenceFilename) : null,
          evidence_mime: receiptMime,
          receipt_size_bytes: receiptSizeBytes,
          submitted_from_ip: clientIp,
          status: 'pending_verification'
        },
        ip_address: clientIp,
        created_at: nowIso
      });

      const notificationResults = await Promise.all([
        dispatchBrevoNotification({
          type: 'payment_pending',
          student: { name: cleanName, email: cleanEmail, course: canonicalName, id: studentId },
          amount: authoritativeAmount,
          currency: cleanCurrency,
          reference: cleanRef
        }),
        dispatchBrevoNotification({
          type: 'admin_payment_alert',
          student: { name: cleanName, email: cleanEmail, course: canonicalName, id: studentId },
          amount: authoritativeAmount,
          currency: cleanCurrency,
          reference: cleanRef
        })
      ]);

      // 8. Return strictly the mandatory confirmation message
      return res.status(200).json({
        success: true,
        orderReference: cleanRef,
        status: 'pending_verification',
        notificationStatus: notificationResults.map(result => ({
          success: result.success,
          status: result.status
        })),
        message: 'Your payment confirmation has been submitted successfully. Your payment is awaiting verification. You will receive confirmation once our team has reviewed it.'
      });
    }

    // =========================================================================
    // ACTION 2: GET RECEIPT (Secure Short-Lived Signed URL)
    // Authorized Administrators and Student Owners ONLY
    // =========================================================================
    if (action === 'get_receipt') {
      const { token: adminToken, hasFallbackAttempt } = getAdminBearerToken(req);
      if (hasFallbackAttempt) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Admin authentication token must be provided exclusively via HTTP Authorization header (Bearer <token>). Request body and query parameter tokens are rejected.'
        });
      }

      let isLiveAdmin = false;
      let callerSession = null;

      if (adminToken) {
        callerSession = verifyToken(adminToken, authSecret);
        isLiveAdmin = callerSession?.role === 'super_admin' &&
          callerSession.mfaVerified === true &&
          await verifyLiveAdminPrivilege(callerSession);
      } else {
        const studentToken = getStudentAuthToken(req);
        if (studentToken) {
          callerSession = verifyToken(studentToken, authSecret);
        }
      }

      const { orderReference } = req.body || req.query || {};
      if (!orderReference) {
        return res.status(400).json({ success: false, error: 'orderReference parameter is required.' });
      }

      // If caller is NOT a live administrator, check if they are the verified student owner
      if (!isLiveAdmin) {
        if (!callerSession || callerSession.role !== 'student' || !callerSession.email) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized: Valid administrative or student session required to inspect payment receipts.'
          });
        }

        // Verify order ownership in orders table
        const orderRes = await callSupabaseDb(
          `orders?order_reference=eq.${encodeURIComponent(orderReference)}&select=order_reference,customer_email,student_id`
        );
        if (!orderRes.ok) {
          return res.status(500).json({ success: false, error: 'Failed to verify order ownership.' });
        }
        const orderList = await orderRes.json();
        if (!Array.isArray(orderList) || orderList.length === 0) {
          return res.status(404).json({ success: false, error: `No order record found for reference '${orderReference}'.` });
        }

        const ownerEmail = (orderList[0].customer_email || '').toLowerCase().trim();
        const studentEmail = (callerSession.email || '').toLowerCase().trim();
        if (ownerEmail !== studentEmail) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You do not have permission to inspect another student\'s payment evidence.'
          });
        }
      }

      // Query audit_logs for the submission record (supports Production 'target' and Staging 'target_id')
      const auditRes = await fetchPaymentSubmissionAuditLog(orderReference);

      if (!auditRes.ok) {
        return res.status(500).json({ success: false, error: 'Failed to query audit logs for receipt evidence.' });
      }

      const auditList = await auditRes.json();
      if (!Array.isArray(auditList) || auditList.length === 0) {
        return res.status(404).json({ success: false, error: `No submission record found for order '${orderReference}'.` });
      }

      const details = auditList[0].details || {};
      const storagePath = details.receipt_storage_path;

      if (!storagePath) {
        return res.status(200).json({
          success: true,
          orderReference,
          hasReceipt: false,
          signedUrl: null,
          message: 'No receipt file was attached to this payment confirmation.'
        });
      }

      // Generate a 15-minute signed URL from Supabase Storage
      const signedUrl = await getSignedReceiptUrl(storagePath, 900);
      if (!signedUrl) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate signed download URL for receipt.'
        });
      }

      return res.status(200).json({
        success: true,
        orderReference,
        hasReceipt: true,
        signedUrl,
        storagePath,
        filename: details.evidence_filename || 'payment_receipt',
        mimeType: details.evidence_mime || 'image/jpeg',
        expiresInSeconds: 900
      });
    }

    // =========================================================================
    // ACTION 3: LIST PAYMENTS (Administrative Review Only)
    // =========================================================================
    if (action === 'list_payments') {
      const { token: adminToken, hasFallbackAttempt } = getAdminBearerToken(req);
      if (hasFallbackAttempt) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Admin authentication token must be provided exclusively via HTTP Authorization header (Bearer <token>). Request body and query parameter tokens are rejected.'
        });
      }
      if (!adminToken) {
        return res.status(403).json({ success: false, error: 'Unauthorized: Administrative privilege required.' });
      }

      const adminSession = verifyToken(adminToken, authSecret);
      const isLiveAdmin = await verifyLiveAdminPrivilege(adminSession);
      if (!isLiveAdmin) {
        return res.status(403).json({ success: false, error: 'Unauthorized: Administrative privilege required.' });
      }

      const { status, currency, course, search } = req.body || req.query || {};

      let endpoint = 'orders?select=*&order=created_at.desc';
      if (status && status !== 'all') {
        endpoint += `&status=eq.${encodeURIComponent(status)}`;
      }
      if (currency && currency !== 'all') {
        endpoint += `&currency=eq.${encodeURIComponent(currency)}`;
      }

      const ordersRes = await callSupabaseDb(endpoint);
      if (!ordersRes.ok) {
        return res.status(500).json({ success: false, error: 'Failed to retrieve orders from database.' });
      }

      let orders = await ordersRes.json();

      // Normalize Production V1.2 and Staging order fields so callers and UI receive consistent records
      orders = (Array.isArray(orders) ? orders : []).map(o => {
        const normRate = o.exchange_rate ?? o.exchange_rate_used ?? null;
        return {
          ...o,
          order_reference: o.order_reference || o.order_id,
          customer_name: o.customer_name || o.student_name,
          customer_email: o.customer_email || o.student_email,
          customer_phone: o.customer_phone || o.phone,
          amount_paid: o.amount_paid ?? o.amount,
          exchange_rate: normRate,
          provider_updated_at: o.provider_updated_at ?? o.rate_timestamp ?? null,
          rate_retrieved_at: o.rate_retrieved_at ?? o.rate_timestamp ?? null
        };
      });

      if (search) {
        const q = search.toLowerCase().trim();
        orders = orders.filter(o =>
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
          (o.order_reference && o.order_reference.toLowerCase().includes(q)) ||
          (o.student_id && o.student_id.toLowerCase().includes(q))
        );
      }

      if (course && course !== 'all') {
        const c = course.toLowerCase().trim();
        orders = orders.filter(o => o.course_name && o.course_name.toLowerCase().includes(c));
      }

      // Compute multi-currency revenue pools and consolidated NGN total
      const revenuePools = { NGN: 0, GBP: 0, USD: 0, EUR: 0 };
      let consolidatedNgnRevenue = 0;

      orders.forEach(o => {
        const curr = (o.currency || 'NGN').toUpperCase();
        const amt = Number(o.amount_paid) || 0;
        if (revenuePools[curr] !== undefined) {
          revenuePools[curr] += amt;
        }

        // Consolidated NGN total using each order's locked snapshot
        const rateUsed = Number(o.exchange_rate_used ?? o.exchange_rate) || 0;
        if (curr === 'NGN') {
          consolidatedNgnRevenue += amt;
        } else if (amt > 0 && o.original_master_price_ngn) {
          consolidatedNgnRevenue += Number(o.original_master_price_ngn) || 0;
        } else if (amt > 0 && rateUsed > 0) {
          consolidatedNgnRevenue += Math.round(amt / rateUsed);
        }
      });

      return res.status(200).json({
        success: true,
        total: orders.length,
        revenuePools,
        consolidatedNgnRevenue,
        orders
      });
    }

    // =========================================================================
    // ACTION 4: VERIFY PAYMENT (Confirm or Reject by Administrator)
    // =========================================================================
    if (action === 'verify_payment') {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
      }

      const { token: adminToken, hasFallbackAttempt } = getAdminBearerToken(req);
      if (hasFallbackAttempt) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Admin authentication token must be provided exclusively via HTTP Authorization header (Bearer <token>). Request body and query parameter tokens are rejected.'
        });
      }
      if (!adminToken) {
        return res.status(403).json({ success: false, error: 'Unauthorized: Administrative privilege required.' });
      }

      const adminSession = verifyToken(adminToken, authSecret);
      const isLiveAdmin = await verifyLiveAdminPrivilege(adminSession);
      if (!isLiveAdmin) {
        return res.status(403).json({ success: false, error: 'Unauthorized: Administrative privilege required.' });
      }

      const { orderReference, decision, notes, rejectionReason } = req.body || {};

      if (!orderReference || !decision) {
        return res.status(400).json({ success: false, error: 'orderReference and decision (confirmed | rejected) are required.' });
      }

      if (!['confirmed', 'rejected'].includes(decision)) {
        return res.status(400).json({ success: false, error: "Decision must be 'confirmed' or 'rejected'." });
      }

      if (decision === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
        return res.status(400).json({ success: false, error: 'A specific rejection reason is required when rejecting a payment.' });
      }

      // 1. Fetch current order state
      const orderRes = await callSupabaseDb(`orders?order_reference=eq.${encodeURIComponent(orderReference)}&select=*`);
      if (!orderRes.ok) {
        return res.status(500).json({ success: false, error: 'Failed to look up order.' });
      }

      const orders = await orderRes.json();
      if (!Array.isArray(orders) || orders.length === 0) {
        return res.status(404).json({ success: false, error: `Order '${orderReference}' not found.` });
      }

      const order = orders[0];
      const previousStatus = order.status;

      // Prevent duplicate entitlement if already confirmed
      if (decision === 'confirmed' && previousStatus === 'confirmed') {
        const existingCode = order.access_code || order.access_code_issued;
        if (!existingCode) {
          console.error('[API Payment] Confirmed order has no recorded access code; duplicate issuance was suppressed.');
          return res.status(503).json({ success: false, error: 'Confirmed order requires entitlement recovery.' });
        }
        let studentProfileUpdated = true;
        if (order.student_id) {
          const studentRes = await callSupabaseDb(`students?id=eq.${encodeURIComponent(order.student_id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'Active',
              secret_password: existingCode,
              updated_at: new Date().toISOString()
            })
          });
          studentProfileUpdated = studentRes.ok;
          if (!studentProfileUpdated) {
            console.error('[API Payment] Duplicate confirmation could not repair the student profile:', studentRes.status);
          }
        }
        const notificationResult = await dispatchBrevoNotification({
          type: 'payment_confirmed',
          student: {
            name: order.customer_name || order.student_name,
            email: order.customer_email || order.student_email,
            course: order.course_name,
            id: order.student_id,
            accessCode: existingCode
          },
          amount: order.amount_paid ?? order.amount,
          currency: order.currency,
          reference: orderReference
        }, { authorization: `Bearer ${adminToken}` });
        return res.status(200).json({
          success: true,
          status: 'confirmed',
          alreadyConfirmed: true,
          accessCode: existingCode,
          studentProfileUpdated,
          notificationStatus: notificationResult.status,
          notificationSuccess: notificationResult.success,
          message: 'Order is already confirmed. No duplicate entitlement generated.'
        });
      }
      if (decision === 'rejected' && previousStatus === 'rejected') {
        return res.status(200).json({ success: true, status: 'rejected', alreadyRejected: true });
      }

      let generatedCode = null;
      let isRecoveryAttempt = false;

      if (decision === 'confirmed') {
        if (previousStatus === 'pending_verification') {
          generatedCode = generateAccessCode(order.course_name);
          const claimRes = await callSupabaseDb(
            `orders?order_reference=eq.${encodeURIComponent(orderReference)}&status=eq.pending_verification`,
            {
              method: 'PATCH',
              headers: { 'Prefer': 'return=representation' },
              body: JSON.stringify({
                status: 'confirmation_in_progress',
                access_code: generatedCode
              })
            }
          );
          if (!claimRes.ok) {
            console.error('[API Payment] Could not claim order for confirmation:', claimRes.status);
            return res.status(503).json({ success: false, error: 'Payment confirmation could not be claimed safely. No access code was issued.' });
          }
          const claimedOrders = await claimRes.json();
          if (!Array.isArray(claimedOrders) || claimedOrders.length !== 1) {
            return res.status(409).json({ success: false, error: 'Payment order changed during confirmation. Refresh the order before retrying.' });
          }
        } else if (previousStatus === 'confirmation_in_progress' && order.access_code) {
          generatedCode = order.access_code;
          isRecoveryAttempt = true;
        } else {
          return res.status(409).json({
            success: false,
            error: `Order cannot be confirmed from status '${sanitizeStr(previousStatus || 'unknown')}'.`
          });
        }

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 2);
        const accessCodeEndpoint = `access_codes?code=eq.${encodeURIComponent(generatedCode)}&select=code,is_active,student_id,student_email,expires_at`;
        let accessCodeRes = await callSupabaseDb(accessCodeEndpoint);
        if (!accessCodeRes.ok) {
          console.error('[API Payment] Could not verify the claimed access code:', accessCodeRes.status);
          return res.status(503).json({ success: false, error: 'Payment confirmation is pending recovery. No access code was returned.' });
        }
        let matchingCodes = await accessCodeRes.json();

        if (!Array.isArray(matchingCodes) || matchingCodes.length === 0) {
          const insertRes = await callSupabaseDb('access_codes', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
              code: generatedCode,
              label: order.customer_name || order.student_name || 'Enrolled Student',
              course_name: order.course_name || 'Microsoft Excel Masterclass',
              student_id: order.student_id || null,
              student_email: order.customer_email || order.student_email || null,
              max_uses: 1,
              times_used: 0,
              is_active: true,
              is_session_pass: false,
              expires_at: expiryDate.toISOString(),
              created_at: new Date().toISOString()
            })
          });
          if (insertRes.ok) {
            matchingCodes = await insertRes.json();
          } else {
            accessCodeRes = await callSupabaseDb(accessCodeEndpoint);
            matchingCodes = accessCodeRes.ok ? await accessCodeRes.json() : [];
          }
        }

        const codeRecord = Array.isArray(matchingCodes) && matchingCodes.length === 1
          ? matchingCodes[0]
          : null;
        const expectedEmail = (order.customer_email || order.student_email || '').toLowerCase();
        if (!codeRecord || codeRecord.code !== generatedCode || codeRecord.is_active !== true ||
            (order.student_id && codeRecord.student_id !== order.student_id) ||
            (expectedEmail && (codeRecord.student_email || '').toLowerCase() !== expectedEmail)) {
          console.error('[API Payment] Claimed access code is not safely verifiable; order requires recovery.');
          return res.status(503).json({ success: false, error: 'Payment confirmation is pending recovery. No access code was returned.' });
        }

        const finalizeRes = await callSupabaseDb(
          `orders?order_reference=eq.${encodeURIComponent(orderReference)}&status=eq.confirmation_in_progress&access_code=eq.${encodeURIComponent(generatedCode)}`,
          {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
              status: 'confirmed',
              ...(isExplicitStaging ? {} : { payment_status: 'Verified & Paid', access_code_issued: generatedCode })
            })
          }
        );
        let finalizedOrders = finalizeRes.ok ? await finalizeRes.json() : [];
        if (!Array.isArray(finalizedOrders) || finalizedOrders.length !== 1) {
          const verifyRes = await callSupabaseDb(
            `orders?order_reference=eq.${encodeURIComponent(orderReference)}&select=status,access_code`
          );
          const verifyOrders = verifyRes.ok ? await verifyRes.json() : [];
          if (!Array.isArray(verifyOrders) || verifyOrders.length !== 1 ||
              verifyOrders[0].status !== 'confirmed' || verifyOrders[0].access_code !== generatedCode) {
            console.error('[API Payment] Order finalization is uncertain; confirmation remains recoverable.');
            return res.status(503).json({ success: false, error: 'Payment confirmation is pending recovery. No access code was returned.' });
          }
        }

        let studentProfileUpdated = true;
        if (order.student_id) {
          const studentRes = await callSupabaseDb(`students?id=eq.${encodeURIComponent(order.student_id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'Active',
              secret_password: generatedCode,
              expires_at: codeRecord.expires_at || expiryDate.toISOString(),
              updated_at: new Date().toISOString()
            })
          });
          studentProfileUpdated = studentRes.ok;
          if (!studentProfileUpdated) {
            console.error('[API Payment] Order confirmed but student profile activation needs recovery:', studentRes.status);
          }
        }

        // 5. Audit Log Entry
        await insertAuditLogRecord({
          action: 'payment_confirmed',
          performed_by: adminSession.email || adminSession.user || 'admin',
          targetRef: orderReference,
          details: {
            previous_status: previousStatus,
            status: 'confirmed',
            access_code: generatedCode,
            notes: sanitizeStr(notes) || null,
            confirmed_by: adminSession.email || adminSession.user
          },
          ip_address: clientIp,
          created_at: new Date().toISOString()
        });

        const notificationResult = await dispatchBrevoNotification({
          type: 'payment_confirmed',
          student: {
            name: order.customer_name || order.student_name,
            email: order.customer_email || order.student_email,
            course: order.course_name,
            id: order.student_id,
            accessCode: generatedCode
          },
          amount: order.amount_paid ?? order.amount,
          currency: order.currency,
          reference: orderReference
        }, { authorization: `Bearer ${adminToken}` });

        return res.status(200).json({
          success: true,
          status: 'confirmed',
          accessCode: generatedCode,
          studentProfileUpdated,
          notificationStatus: notificationResult.status,
          notificationSuccess: notificationResult.success,
          ...(isRecoveryAttempt ? { recovered: true } : {}),
          message: `Payment confirmed successfully. Student entitlement activated with access code ${generatedCode}.`
        });

      } else {
        // Decision: REJECTED
        if (previousStatus !== 'pending_verification') {
          return res.status(409).json({
            success: false,
            error: `Order cannot be rejected from status '${sanitizeStr(previousStatus || 'unknown')}'.`
          });
        }

        const rejectionClaim = await callSupabaseDb(
          `orders?order_reference=eq.${encodeURIComponent(orderReference)}&status=eq.pending_verification`,
          {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
            status: 'rejected',
            ...(isExplicitStaging ? {} : { payment_status: 'Rejected' })
            })
          }
        );
        if (!rejectionClaim.ok) {
          console.error('[API Payment] Could not claim order for rejection:', rejectionClaim.status);
          return res.status(503).json({ success: false, error: 'Payment rejection could not be recorded safely.' });
        }
        const rejectedOrders = await rejectionClaim.json();
        if (!Array.isArray(rejectedOrders) || rejectedOrders.length !== 1) {
          return res.status(409).json({ success: false, error: 'Payment order changed during review. Refresh the order before retrying.' });
        }

        // 2. Update Student status if exists
        if (order.student_id) {
          await callSupabaseDb(`students?id=eq.${encodeURIComponent(order.student_id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'Payment Rejected',
              updated_at: new Date().toISOString()
            })
          });
        }

        // 3. Audit Log Entry
        await insertAuditLogRecord({
          action: 'payment_rejected',
          performed_by: adminSession.email || adminSession.user || 'admin',
          targetRef: orderReference,
          details: {
            previous_status: previousStatus,
            status: 'rejected',
            rejection_reason: sanitizeStr(rejectionReason),
            notes: sanitizeStr(notes) || null,
            rejected_by: adminSession.email || adminSession.user
          },
          ip_address: clientIp,
          created_at: new Date().toISOString()
        });

        const notificationResult = await dispatchBrevoNotification({
          type: 'payment_rejected',
          student: {
            name: order.customer_name || order.student_name,
            email: order.customer_email || order.student_email,
            course: order.course_name,
            id: order.student_id
          },
          amount: order.amount_paid ?? order.amount,
          currency: order.currency,
          reference: orderReference,
          reason: sanitizeStr(rejectionReason)
        }, { authorization: `Bearer ${adminToken}` });

        return res.status(200).json({
          success: true,
          status: 'rejected',
          notificationStatus: notificationResult.status,
          notificationSuccess: notificationResult.success,
          message: `Payment rejected. Reason recorded in audit log.`
        });
      }
    }

    // Fallback for unknown action
    return res.status(400).json({ success: false, error: `Unrecognized action: ${action}` });

  } catch (error) {
    console.error('[API Payment] Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal payment service error.' });
  }
}
