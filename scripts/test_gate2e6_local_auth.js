const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const AUTH_SECRET = 'gate2e6-local-test-secret-'.repeat(3);
const ADMIN_ID = '123e4567-e89b-12d3-a456-426614174000';
const ADMIN_EMAIL = 'greachimpact@gmail.com';

function response(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
}

async function loadApi(file) {
  const moduleUrl = pathToFileURL(path.join(ROOT, file)).href + `?gate2e6=${Date.now()}`;
  const loaded = await import(moduleUrl);
  return loaded.default;
}

function signedToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

async function invoke(handler, body, headers = {}) {
  const req = {
    method: 'POST',
    headers: { origin: 'https://greachimpact.com', 'user-agent': 'gate2e6-test', ...headers },
    body,
    query: {},
    socket: { remoteAddress: '127.0.0.1' }
  };
  const result = { headers: {}, statusCode: 200, body: null };
  const res = {
    setHeader(name, value) { result.headers[name] = value; },
    status(code) { result.statusCode = code; return this; },
    json(value) { result.body = value; return this; },
    end() { return this; }
  };
  await handler(req, res);
  return result;
}

function authFetchFactory() {
  let liveRole = 'super_admin';
  let accessCodeActive = true;
  let accessCodeTimesUsed = 0;
  const emailNotifications = [];
  const accessCodeMaxUses = 1;
  const fetchMock = async (url, options = {}) => {
    const target = String(url);
    if (target.includes('/rest/v1/auth_rate_limits')) return response(200, []);
    if (target.includes('/rest/v1/email_notifications')) {
      if (options.method === 'POST') {
        emailNotifications.push(JSON.parse(options.body || '{}'));
        return response(201, emailNotifications.slice(-1));
      }
      if (options.method === 'PATCH') {
        const notificationId = decodeURIComponent(target.match(/id=eq\.([^&]+)/)?.[1] || '');
        const notification = emailNotifications.find(item => item.id === notificationId);
        if (notification) Object.assign(notification, JSON.parse(options.body || '{}'));
        return response(204, null);
      }
      return response(200, emailNotifications);
    }
    if (target.includes('/rest/v1/access_codes?')) {
      if (options.method === 'PATCH') {
        const body = JSON.parse(options.body || '{}');
        if (Object.prototype.hasOwnProperty.call(body, 'is_active')) {
          accessCodeActive = body.is_active === true;
          return response(204, null);
        }
        const currentCountMatches = target.includes(`times_used=eq.${accessCodeTimesUsed}`) ||
          (target.includes('times_used=is.null') && accessCodeTimesUsed === 0);
        const withinLimit = !target.includes('max_uses=gte.') ||
          accessCodeTimesUsed + 1 <= accessCodeMaxUses;
        if (accessCodeActive && currentCountMatches && withinLimit) {
          accessCodeTimesUsed = body.times_used;
          return response(200, [{ code: 'VALID123', times_used: accessCodeTimesUsed }]);
        }
        return response(200, []);
      }

      const codeLookup = target.includes('code=eq.VALID123');
      const studentLookup = target.includes('student_id=eq.stu-local-1');
      const activeOnlyLookup = target.includes('is_active=eq.true');
      return (codeLookup || studentLookup) && (!activeOnlyLookup || accessCodeActive)
        ? response(200, [{
          code: 'VALID123',
          student_id: 'stu-local-1',
          student_email: 'student@example.test',
          label: 'Test Student',
          course_name: 'Microsoft Excel for Beginners',
          is_active: accessCodeActive,
          max_uses: accessCodeMaxUses,
          times_used: accessCodeTimesUsed,
          expires_at: null
        }])
        : response(200, []);
    }
    if (target.includes('/rest/v1/live_session_passes?') || target.includes('/rest/v1/students?')) {
      if (target.includes('/rest/v1/students?id=eq.stu-local-1')) {
        return response(200, [{
          id: 'stu-local-1',
          full_name: 'Test Student',
          registered_email: 'student@example.test',
          enrolled_course: 'Microsoft Excel for Beginners',
          status: 'Active'
        }]);
      }
      if (target.includes('/rest/v1/access_code_redemptions?')) return response(200, []);
      return response(200, []);
    }
    if (target.includes('/rest/v1/course_schedules?') && options.method === 'PATCH') {
      return response(204, null);
    }
    if (target.includes('/rest/v1/orders?')) return response(200, []);
    if (target.includes('/auth/v1/token?grant_type=password')) {
      return response(200, {
        access_token: 'unit-test-supabase-access-token',
        user: {
          id: ADMIN_ID,
          email: ADMIN_EMAIL,
          app_metadata: { role: 'super_admin' },
          user_metadata: { name: 'Test Admin' },
          factors: [{ id: 'totp-factor-1', factor_type: 'totp', status: 'verified' }]
        }
      });
    }
    if (target.includes('/auth/v1/factors/totp-factor-1/challenge')) {
      return response(200, { id: 'totp-challenge-1' });
    }
    if (target.includes('/auth/v1/factors/totp-factor-1/verify')) {
      return response(200, { id: 'totp-factor-1' });
    }
    if (target.includes('/auth/v1/user') || target.includes('/auth/v1/admin/users/')) {
      return response(200, {
        id: ADMIN_ID,
        email: ADMIN_EMAIL,
        app_metadata: { role: liveRole }
      });
    }
    return response(404, {});
  };
  return {
    fetchMock,
    setLiveRole(role) { liveRole = role; },
    getAccessCodeTimesUsed() { return accessCodeTimesUsed; },
    getEmailNotifications() { return emailNotifications; }
  };
}

function paymentFetchFactory(orderReference) {
  const order = {
    order_reference: orderReference,
    status: 'pending_verification',
    customer_name: 'Test Student',
    customer_email: 'student@example.test',
    student_id: `student-${orderReference}`,
    course_name: 'Microsoft Excel for Beginners',
    amount_paid: 1000,
    currency: 'NGN'
  };
  const accessCodes = [];
  const notifications = [];
  const callbackCalls = [];
  const callbackKeys = new Set();
  let accessCodeInsertCount = 0;
  const fetchMock = async (url, options = {}) => {
    const target = String(url);
    if (target.includes('/auth/v1/admin/users/')) {
      return response(200, {
        id: ADMIN_ID,
        email: ADMIN_EMAIL,
        app_metadata: { role: 'super_admin' }
      });
    }
    if (target.includes('/api/brevo')) {
      callbackCalls.push({ url: target, options });
      const callbackBody = JSON.parse(options.body || '{}');
      if (callbackKeys.has(callbackBody.idempotencyKey)) {
        return response(200, {
          success: true,
          dispatched: true,
          alreadySent: true,
          trackingId: `notification-${orderReference}`
        });
      }
      callbackKeys.add(callbackBody.idempotencyKey);
      return response(200, {
        success: true,
        dispatched: true,
        trackingId: `notification-${orderReference}`
      });
    }
    if (target.includes('/rest/v1/orders?')) {
      if (options.method === 'PATCH') {
        const body = JSON.parse(options.body || '{}');
        if (target.includes('status=eq.pending_verification') && order.status === 'pending_verification') {
          Object.assign(order, body);
          return response(200, [{ ...order }]);
        }
        if (target.includes('status=eq.confirmation_in_progress') &&
            order.status === 'confirmation_in_progress' &&
            target.includes(`access_code=eq.${encodeURIComponent(order.access_code)}`)) {
          Object.assign(order, body);
          return response(200, [{ ...order }]);
        }
        return response(200, []);
      }
      return response(200, [{ ...order }]);
    }
    if (target.includes('/rest/v1/access_codes')) {
      if (options.method === 'POST') {
        accessCodeInsertCount += 1;
        const record = JSON.parse(options.body || '{}');
        accessCodes.push(record);
        return response(201, [{ ...record }]);
      }
      const codeMatch = target.match(/code=eq\.([^&]+)/);
      const requestedCode = codeMatch ? decodeURIComponent(codeMatch[1]) : '';
      return response(200, accessCodes.filter(code => code.code === requestedCode).map(code => ({ ...code })));
    }
    if (target.includes('/rest/v1/email_notifications')) {
      if (options.method === 'POST') {
        const record = JSON.parse(options.body || '{}');
        notifications.push(record);
        return response(201, [{ ...record }]);
      }
      return response(200, notifications);
    }
    if (target.includes('/rest/v1/students?') || target.includes('/rest/v1/audit_logs')) {
      return response(204, null);
    }
    return response(404, {});
  };
  return {
    fetchMock,
    order,
    accessCodes,
    notifications,
    callbackCalls,
    getAccessCodeInsertCount() { return accessCodeInsertCount; }
  };
}

function createStorage(seed = {}) {
  const entries = new Map(Object.entries(seed));
  return {
    entries,
    getItem(key) { return entries.has(key) ? entries.get(key) : null; },
    setItem(key, value) { entries.set(key, String(value)); },
    removeItem(key) { entries.delete(key); }
  };
}

async function run() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('STAGING_') || ['APP_ENV', 'STAGING', 'AUTH_SECRET', 'JWT_SECRET', 'CRON_SECRET'].includes(key)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, {
    AUTH_SECRET,
    SUPABASE_URL: 'https://unit-test.supabase.co',
    SUPABASE_ANON_KEY: 'unit-test-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'unit-test-service-role',
    ADMIN_EMAIL,
    ADMIN_USER: 'Greachimpact',
    BREVO_API_KEY: ''
  });
  delete process.env.STAGING_BREVO_API_KEY;

  const authMock = authFetchFactory();
  global.fetch = authMock.fetchMock;
  const authHandler = await loadApi('api/auth.js');
  const validCode = await invoke(authHandler, { action: 'verify_voucher', code: 'VALID123' });
  assert.strictEqual(validCode.statusCode, 200);
  assert.strictEqual(validCode.body.student.id, 'stu-local-1');
  assert.strictEqual(validCode.body.role, undefined);
  assert.strictEqual(validCode.body.valid, true);
  assert.strictEqual(authMock.getAccessCodeTimesUsed(), 1);
  const secondUseOfSingleUseCode = await invoke(authHandler, { action: 'verify_voucher', code: 'VALID123' });
  assert.strictEqual(secondUseOfSingleUseCode.statusCode, 400);
  assert.strictEqual(authMock.getAccessCodeTimesUsed(), 1);
  const verifiedStudentSession = await invoke(authHandler, { action: 'verify' }, {
    authorization: `Bearer ${validCode.body.sessionToken}`
  });
  assert.strictEqual(verifiedStudentSession.statusCode, 200);
  assert.strictEqual(verifiedStudentSession.body.valid, true);
  assert.strictEqual(verifiedStudentSession.body.role, 'student');
  assert.strictEqual(verifiedStudentSession.body.isSuper, false);

  const invalidCode = await invoke(authHandler, { action: 'verify_voucher', code: 'INVALID' });
  assert.strictEqual(invalidCode.statusCode, 400);
  assert.strictEqual(invalidCode.body.valid, false);

  const noAuthAdminCall = await invoke(authHandler, { action: 'admin_operation', operation: 'update_schedule' });
  assert.strictEqual(noAuthAdminCall.statusCode, 401);
  const bodyTokenAdminCall = await invoke(authHandler, {
    action: 'admin_operation',
    token: 'forged-admin-token',
    operation: 'update_schedule'
  });
  assert.strictEqual(bodyTokenAdminCall.statusCode, 401);

  const studentAdminCall = await invoke(authHandler, { action: 'admin_operation', operation: 'update_schedule' }, {
    authorization: `Bearer ${validCode.body.sessionToken}`
  });
  assert.strictEqual(studentAdminCall.statusCode, 401);
  const instructorToken = signedToken({
    sub: 'instructor-test-id',
    role: 'instructor',
    mfaVerified: true,
    exp: Date.now() + 60000
  });
  const instructorAdminCall = await invoke(authHandler, { action: 'admin_operation', operation: 'update_schedule' }, {
    authorization: `Bearer ${instructorToken}`
  });
  assert.strictEqual(instructorAdminCall.statusCode, 401);

  const mfaChallenge = await invoke(authHandler, {
    action: 'login',
    identifier: 'Greachimpact',
    password: 'unit-test-password'
  });
  assert.strictEqual(mfaChallenge.statusCode, 200);
  assert.strictEqual(mfaChallenge.body.mfaRequired, true);

  const mfaLogin = await invoke(authHandler, {
    action: 'login',
    identifier: 'Greachimpact',
    password: 'unit-test-password',
    ticket: mfaChallenge.body.ticket,
    mfaCode: '123456'
  });
  assert.strictEqual(mfaLogin.statusCode, 200);
  assert.strictEqual(mfaLogin.body.isSuperAdmin, true);
  const verifiedMfaSession = await invoke(authHandler, { action: 'verify' }, {
    authorization: `Bearer ${mfaLogin.body.token}`
  });
  assert.strictEqual(verifiedMfaSession.statusCode, 200);
  assert.strictEqual(verifiedMfaSession.body.mfaVerified, true);
  const authorizedAdminOperation = await invoke(authHandler, {
    action: 'admin_operation',
    operation: 'update_schedule',
    data: { courseId: 'CRS-TEST', startDate: '2026-01-01' }
  }, {
    authorization: `Bearer ${mfaLogin.body.token}`,
    'x-csrf-token': mfaLogin.body.csrfToken
  });
  assert.strictEqual(authorizedAdminOperation.statusCode, 200);
  assert.strictEqual(authorizedAdminOperation.body.success, true);

  const crossCourseHeartbeat = await invoke(authHandler, {
    action: 'heartbeat',
    courseName: 'Microsoft SQL for Beginners'
  }, { authorization: `Bearer ${validCode.body.sessionToken}` });
  assert.strictEqual(crossCourseHeartbeat.statusCode, 403);
  const revokedAccessCode = await invoke(authHandler, {
    action: 'admin_operation',
    operation: 'revoke_access_pass',
    data: { code: 'VALID123' }
  }, {
    authorization: `Bearer ${mfaLogin.body.token}`,
    'x-csrf-token': mfaLogin.body.csrfToken
  });
  assert.strictEqual(revokedAccessCode.statusCode, 200);
  const revokedStudentSession = await invoke(authHandler, { action: 'verify' }, {
    authorization: `Bearer ${validCode.body.sessionToken}`
  });
  assert.strictEqual(revokedStudentSession.statusCode, 401);

  const noMfaToken = signedToken({
    sub: ADMIN_ID,
    email: ADMIN_EMAIL,
    role: 'super_admin',
    isSuper: true,
    mfaVerified: false,
    csrf: 'csrf-test',
    exp: Date.now() + 60000
  });
  const noMfaVerify = await invoke(authHandler, { action: 'verify' }, { authorization: `Bearer ${noMfaToken}` });
  assert.strictEqual(noMfaVerify.statusCode, 403);
  const noMfaAdminCall = await invoke(authHandler, { action: 'admin_operation', operation: 'update_schedule' }, {
    authorization: `Bearer ${noMfaToken}`,
    'x-csrf-token': 'csrf-test'
  });
  assert.strictEqual(noMfaAdminCall.statusCode, 401);

  const revokedToken = signedToken({
    sub: ADMIN_ID,
    email: ADMIN_EMAIL,
    role: 'super_admin',
    isSuper: true,
    mfaVerified: true,
    sbToken: 'unit-test-supabase-access-token',
    csrf: 'csrf-test',
    exp: Date.now() + 60000
  });
  authMock.setLiveRole('student');
  const revokedVerify = await invoke(authHandler, { action: 'verify' }, { authorization: `Bearer ${revokedToken}` });
  assert.strictEqual(revokedVerify.statusCode, 403);
  const revokedReauth = await invoke(authHandler, { action: 'verify_super_action', password: 'unit-test-password' }, {
    authorization: `Bearer ${revokedToken}`,
    'x-csrf-token': 'csrf-test'
  });
  assert.strictEqual(revokedReauth.statusCode, 403);

  const paymentHandler = await loadApi('api/payment.js');
  const unauthPayment = await invoke(paymentHandler, { action: 'list_payments' });
  assert.strictEqual(unauthPayment.statusCode, 403);
  const studentPayment = await invoke(paymentHandler, { action: 'list_payments' }, {
    authorization: `Bearer ${validCode.body.sessionToken}`
  });
  assert.strictEqual(studentPayment.statusCode, 403);
  const noMfaPayment = await invoke(paymentHandler, { action: 'list_payments' }, {
    authorization: `Bearer ${noMfaToken}`
  });
  assert.strictEqual(noMfaPayment.statusCode, 403);
  authMock.setLiveRole('super_admin');
  const authorizedPaymentList = await invoke(paymentHandler, { action: 'list_payments' }, {
    authorization: `Bearer ${mfaLogin.body.token}`
  });
  assert.strictEqual(authorizedPaymentList.statusCode, 200);
  assert.strictEqual(authorizedPaymentList.body.success, true);
  authMock.setLiveRole('student');
  const revokedPayment = await invoke(paymentHandler, { action: 'list_payments' }, {
    authorization: `Bearer ${revokedToken}`
  });
  assert.strictEqual(revokedPayment.statusCode, 403);

  const subAdminToken = signedToken({
    sub: ADMIN_ID,
    email: ADMIN_EMAIL,
    role: 'sub_admin',
    mfaVerified: true,
    exp: Date.now() + 60000
  });
  authMock.setLiveRole('super_admin');
  const noMfaReceipt = await invoke(paymentHandler, {
    action: 'get_receipt',
    orderReference: 'ORDER-TEST'
  }, { authorization: `Bearer ${noMfaToken}` });
  assert.strictEqual(noMfaReceipt.statusCode, 403);
  authMock.setLiveRole('sub_admin');
  const subAdminReceipt = await invoke(paymentHandler, {
    action: 'get_receipt',
    orderReference: 'ORDER-TEST'
  }, { authorization: `Bearer ${subAdminToken}` });
  assert.strictEqual(subAdminReceipt.statusCode, 403);

  const priorVercelUrl = process.env.VERCEL_URL;
  const priorVercelEnv = process.env.VERCEL_ENV;
  const priorProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const paymentModule = await import(pathToFileURL(path.join(ROOT, 'api', 'payment.js')).href + `?gate2e9=${Date.now()}`);
  const freshRateTimestamp = Math.floor(Date.now() / 1000);
  global.fetch = async url => {
    assert(String(url).includes('open.er-api.com/v6/latest/NGN'));
    return response(200, {
      result: 'success',
      rates: { GBP: 0.0005, USD: 0.0007, EUR: 0.0006 },
      time_last_update_unix: freshRateTimestamp
    });
  };
  const freshRates = await paymentModule.fetchLiveExchangeRates(true);
  assert.strictEqual(freshRates.base, 'NGN');
  assert.strictEqual(freshRates.rates.GBP, 0.0005);
  global.fetch = async url => {
    if (String(url).includes('open.er-api.com')) {
      return response(200, {
        result: 'success',
        rates: { GBP: 0.0005, USD: 0.0007, EUR: 0.0006 },
        time_last_update_unix: Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60)
      });
    }
    return response(200, {
      rates: { GBP: 0.0005, USD: 0.0007, EUR: 0.0006 },
      time_last_updated: Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60)
    });
  };
  const staleRates = await paymentModule.fetchLiveExchangeRates(true);
  assert.strictEqual(staleRates, null);

  const futureRateUnix = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);
  global.fetch = async url => {
    if (String(url).includes('open.er-api.com')) {
      return response(200, {
        result: 'success',
        time_last_update_unix: futureRateUnix,
        rates: { GBP: 0.0005, USD: 0.0007, EUR: 0.0006 }
      });
    }
    return response(200, {
      time_last_updated: futureRateUnix,
      rates: { GBP: 0.0005, USD: 0.0007, EUR: 0.0006 }
    });
  };
  const futureRates = await paymentModule.fetchLiveExchangeRates(true);
  assert.strictEqual(futureRates, null, 'Provider timestamps far in the future must fail closed.');

  process.env.VERCEL_ENV = 'production';
  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'greachimpact.com';
  process.env.VERCEL_URL = 'greachimpact-git-preview-123.vercel.app';
  assert.strictEqual(
    paymentModule.resolveBrevoCallbackUrl(),
    'https://greachimpact.com/api/brevo'
  );
  const validOriginMock = paymentFetchFactory('ORDER-VALID-ORIGIN');
  global.fetch = validOriginMock.fetchMock;
  authMock.setLiveRole('super_admin');
  const validOriginConfirmation = await invoke(paymentHandler, {
    action: 'verify_payment',
    orderReference: 'ORDER-VALID-ORIGIN',
    decision: 'confirmed'
  }, { authorization: `Bearer ${mfaLogin.body.token}`, origin: 'https://greachimpact.com' });
  assert.strictEqual(validOriginConfirmation.statusCode, 200);
  assert.strictEqual(validOriginConfirmation.body.status, 'confirmed');
  assert.strictEqual(validOriginMock.getAccessCodeInsertCount(), 1);
  assert.strictEqual(validOriginMock.callbackCalls.length, 1);
  assert.strictEqual(
    validOriginMock.callbackCalls[0].url,
    'https://greachimpact.com/api/brevo'
  );
  assert.strictEqual(validOriginMock.callbackCalls[0].options.headers.origin, undefined);
  const callbackBody = JSON.parse(validOriginMock.callbackCalls[0].options.body);
  const callbackTimestamp = validOriginMock.callbackCalls[0].options.headers['X-Greach-Callback-Timestamp'];
  const expectedCallbackSignature = crypto.createHmac('sha256', AUTH_SECRET)
    .update(`${callbackTimestamp}.${JSON.stringify(callbackBody)}`)
    .digest('base64url');
  assert.strictEqual(
    validOriginMock.callbackCalls[0].options.headers['X-Greach-Callback-Signature'],
    expectedCallbackSignature
  );
  assert.match(validOriginMock.callbackCalls[0].options.headers.Authorization, /^Bearer /);
  const duplicateConfirmation = await invoke(paymentHandler, {
    action: 'verify_payment',
    orderReference: 'ORDER-VALID-ORIGIN',
    decision: 'confirmed'
  }, { authorization: `Bearer ${mfaLogin.body.token}`, origin: 'https://greachimpact.com' });
  assert.strictEqual(duplicateConfirmation.statusCode, 200);
  assert.strictEqual(duplicateConfirmation.body.alreadyConfirmed, true);
  assert.strictEqual(validOriginMock.getAccessCodeInsertCount(), 1);
  assert.strictEqual(validOriginMock.callbackCalls.length, 2);

  const maliciousOriginMock = paymentFetchFactory('ORDER-MALICIOUS-ORIGIN');
  global.fetch = maliciousOriginMock.fetchMock;
  const maliciousOriginConfirmation = await invoke(paymentHandler, {
    action: 'verify_payment',
    orderReference: 'ORDER-MALICIOUS-ORIGIN',
    decision: 'confirmed'
  }, { authorization: `Bearer ${mfaLogin.body.token}`, origin: 'https://attacker.example' });
  assert.strictEqual(maliciousOriginConfirmation.statusCode, 200);
  assert.strictEqual(maliciousOriginMock.callbackCalls.length, 1);
  assert.strictEqual(
    maliciousOriginMock.callbackCalls[0].url,
    'https://greachimpact.com/api/brevo'
  );

  process.env.VERCEL_ENV = 'preview';
  assert.strictEqual(
    paymentModule.resolveBrevoCallbackUrl(),
    'https://greachimpact-git-preview-123.vercel.app/api/brevo'
  );
  process.env.VERCEL_ENV = 'production';

  const concurrentMock = paymentFetchFactory('ORDER-CONCURRENT-CONFIRM');
  global.fetch = concurrentMock.fetchMock;
  const concurrentConfirmations = await Promise.all([
    invoke(paymentHandler, {
      action: 'verify_payment',
      orderReference: 'ORDER-CONCURRENT-CONFIRM',
      decision: 'confirmed'
    }, { authorization: `Bearer ${mfaLogin.body.token}`, origin: 'https://greachimpact.com' }),
    invoke(paymentHandler, {
      action: 'verify_payment',
      orderReference: 'ORDER-CONCURRENT-CONFIRM',
      decision: 'confirmed'
    }, { authorization: `Bearer ${mfaLogin.body.token}`, origin: 'https://greachimpact.com' })
  ]);
  assert.deepStrictEqual(concurrentConfirmations.map(result => result.statusCode).sort(), [200, 409]);
  assert.strictEqual(concurrentMock.getAccessCodeInsertCount(), 1);

  delete process.env.VERCEL_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  assert.strictEqual(paymentModule.resolveBrevoCallbackUrl(), null);
  const missingCallbackMock = paymentFetchFactory('ORDER-MISSING-CALLBACK');
  global.fetch = missingCallbackMock.fetchMock;
  const missingCallbackConfirmation = await invoke(paymentHandler, {
    action: 'verify_payment',
    orderReference: 'ORDER-MISSING-CALLBACK',
    decision: 'confirmed'
  }, { authorization: `Bearer ${mfaLogin.body.token}`, origin: 'https://attacker.example' });
  assert.strictEqual(missingCallbackConfirmation.statusCode, 200);
  assert.strictEqual(missingCallbackConfirmation.body.notificationStatus, 'failed');
  assert.strictEqual(missingCallbackMock.callbackCalls.length, 0);
  assert.strictEqual(missingCallbackMock.notifications.length, 1);
  assert.strictEqual(missingCallbackMock.notifications[0].status, 'failed');
  assert.strictEqual(missingCallbackMock.getAccessCodeInsertCount(), 1);

  process.env.VERCEL_URL = 'https://attacker.example';
  assert.strictEqual(paymentModule.resolveBrevoCallbackUrl(), null);
  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'https://attacker.example/path';
  assert.strictEqual(paymentModule.resolveBrevoCallbackUrl(), null);
  if (priorVercelUrl === undefined) delete process.env.VERCEL_URL;
  else process.env.VERCEL_URL = priorVercelUrl;
  if (priorVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = priorVercelEnv;
  if (priorProductionUrl === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  else process.env.VERCEL_PROJECT_PRODUCTION_URL = priorProductionUrl;
  global.fetch = authMock.fetchMock;

  const brevoHandler = await loadApi('api/brevo.js');
  const signedCallbackBody = {
    type: 'payment_pending',
    student: { name: 'Test Student', email: 'student@example.test', course: 'Microsoft Excel for Beginners' }
  };
  const invalidSignedCallback = await invoke(brevoHandler, signedCallbackBody, {
    'x-greach-callback-timestamp': String(Date.now()),
    'x-greach-callback-signature': 'invalid-signature'
  });
  assert.strictEqual(invalidSignedCallback.statusCode, 401);
  const signedCallbackTimestamp = String(Date.now());
  const signedCallbackSignature = crypto.createHmac('sha256', AUTH_SECRET)
    .update(`${signedCallbackTimestamp}.${JSON.stringify(signedCallbackBody)}`)
    .digest('base64url');
  const validSignedCallback = await invoke(brevoHandler, signedCallbackBody, {
    'x-greach-callback-timestamp': signedCallbackTimestamp,
    'x-greach-callback-signature': signedCallbackSignature
  });
  assert.strictEqual(validSignedCallback.statusCode, 503);
  assert.strictEqual(validSignedCallback.body.dispatched, false);
  const expiredCallbackTimestamp = String(Date.now() - 6 * 60 * 1000);
  const expiredCallbackSignature = crypto.createHmac('sha256', AUTH_SECRET)
    .update(`${expiredCallbackTimestamp}.${JSON.stringify(signedCallbackBody)}`)
    .digest('base64url');
  const expiredSignedCallback = await invoke(brevoHandler, signedCallbackBody, {
    'x-greach-callback-timestamp': expiredCallbackTimestamp,
    'x-greach-callback-signature': expiredCallbackSignature
  });
  assert.strictEqual(expiredSignedCallback.statusCode, 401);

  const unauthenticatedRetry = await invoke(brevoHandler, { action: 'retry_failed' });
  assert.strictEqual(unauthenticatedRetry.statusCode, 403);
  const unauthenticatedReconcile = await invoke(brevoHandler, { action: 'reconcile_pending' });
  assert.strictEqual(unauthenticatedReconcile.statusCode, 403);
  const mixedActionRetry = await invoke(brevoHandler, {
    type: 'registration_ack',
    action: 'retry_failed'
  });
  assert.strictEqual(mixedActionRetry.statusCode, 403);
  const studentRetry = await invoke(brevoHandler, { action: 'retry_failed' }, {
    authorization: `Bearer ${validCode.body.sessionToken}`
  });
  assert.strictEqual(studentRetry.statusCode, 403);
  const noMfaRetry = await invoke(brevoHandler, { action: 'retry_failed' }, {
    authorization: `Bearer ${noMfaToken}`
  });
  assert.strictEqual(noMfaRetry.statusCode, 403);
  const bodyTokenRetry = await invoke(brevoHandler, {
    action: 'retry_failed',
    adminToken: mfaLogin.body.token
  });
  assert.strictEqual(bodyTokenRetry.statusCode, 403);
  authMock.setLiveRole('student');
  const revokedRoleRetry = await invoke(brevoHandler, { action: 'retry_failed' }, {
    authorization: `Bearer ${mfaLogin.body.token}`
  });
  assert.strictEqual(revokedRoleRetry.statusCode, 403);
  authMock.setLiveRole('super_admin');
  const missingServerKeyRetry = await invoke(brevoHandler, { action: 'retry_failed' }, {
    authorization: `Bearer ${mfaLogin.body.token}`
  });
  assert.strictEqual(missingServerKeyRetry.statusCode, 503);
  const missingServerKeyTest = await invoke(brevoHandler, {
    type: 'test_connection',
    testEmail: 'admin@example.test'
  }, { authorization: `Bearer ${mfaLogin.body.token}` });
  assert.strictEqual(missingServerKeyTest.statusCode, 503);
  const arbitraryBrevoDispatch = await invoke(brevoHandler, {
    to: 'attacker@example.test',
    subject: 'Untrusted subject',
    htmlContent: '<p>Untrusted content</p>'
  }, { 'x-forwarded-for': '10.0.0.21' });
  assert.strictEqual(arbitraryBrevoDispatch.statusCode, 400);
  const unauthenticatedPaymentConfirmationEmail = await invoke(brevoHandler, {
    type: 'payment_confirmed',
    student: { email: 'student@example.test', accessCode: 'FORGED-CODE' }
  }, { 'x-forwarded-for': '10.0.0.22' });
  assert.strictEqual(unauthenticatedPaymentConfirmationEmail.statusCode, 403);
  const missingServerKeyDispatch = await invoke(brevoHandler, {
    type: 'payment_pending',
    student: { name: 'Test Student', email: 'student@example.test', course: 'Microsoft Excel for Beginners' },
    amount: 1000,
    currency: 'NGN',
    reference: 'GATE2E8-TEST-ORDER'
  }, { 'x-forwarded-for': '10.0.0.23' });
  assert.strictEqual(missingServerKeyDispatch.statusCode, 503);
  assert.strictEqual(missingServerKeyDispatch.body.success, false);
  assert.strictEqual(missingServerKeyDispatch.body.dispatched, false);
  assert.strictEqual(missingServerKeyDispatch.body.simulated, undefined);
  assert.strictEqual(missingServerKeyDispatch.body.error, 'Server-side Brevo configuration is unavailable.');
  const failedNotification = authMock.getEmailNotifications().find(
    notification => notification.id === missingServerKeyDispatch.body.trackingId
  );
  assert.strictEqual(failedNotification.status, 'failed');
  assert.strictEqual(failedNotification.provider_message_id, undefined);

  const originalBrevoApiKey = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = 'unit-test-brevo-key';
  const recoveryRecords = [];
  let providerSendCount = 0;
  let providerPayload = null;
  const recoveryFetch = async (url, options = {}) => {
    const target = String(url);
    if (target.includes('api.brevo.com/v3/smtp/email')) {
      providerSendCount += 1;
      providerPayload = JSON.parse(options.body || '{}');
      return response(201, { messageId: 'provider-accepted-test-id' });
    }
    if (target.endsWith('/rest/v1/email_notifications')) {
      const record = JSON.parse(options.body || '{}');
      if (recoveryRecords.some(item => item.idempotency_key === record.idempotency_key)) {
        return response(409, { message: 'duplicate key violates unique constraint idempotency_key' });
      }
      recoveryRecords.push(record);
      return response(201, [{ ...record }]);
    }
    if (target.includes('/rest/v1/email_notifications?id=eq.')) {
      const notificationId = decodeURIComponent(target.match(/id=eq\.([^&]+)/)?.[1] || '');
      const record = recoveryRecords.find(item => item.id === notificationId);
      const patch = JSON.parse(options.body || '{}');
      if (patch.status === 'sent') return response(500, { message: 'simulated local persistence failure' });
      if (record) Object.assign(record, patch);
      return response(204, null);
    }
    if (target.includes('/rest/v1/email_notifications?idempotency_key=eq.')) {
      const key = decodeURIComponent(target.match(/idempotency_key=eq\.([^&]+)/)?.[1] || '');
      return response(200, recoveryRecords.filter(item => item.idempotency_key === key).map(item => ({ ...item })));
    }
    return response(404, {});
  };
  global.fetch = recoveryFetch;
  const acceptedButUnpersisted = await invoke(brevoHandler, {
    type: 'registration_ack',
    student: { name: '<img src=x onerror=alert(1)>', email: 'student@example.test', course: 'Microsoft Excel for Beginners' },
    to: 'attacker@example.test',
    subject: 'Untrusted subject',
    htmlContent: '<script>untrusted()</script>'
  }, { 'x-forwarded-for': '10.0.0.24' });
  assert.strictEqual(acceptedButUnpersisted.statusCode, 202);
  assert.strictEqual(acceptedButUnpersisted.body.providerAccepted, true);
  assert.strictEqual(acceptedButUnpersisted.body.requiresReconciliation, true);
  assert.strictEqual(recoveryRecords[0].status, 'requires_reconciliation');
  assert.strictEqual(providerSendCount, 1);
  assert.strictEqual(providerPayload.to[0].email, 'student@example.test');
  assert.strictEqual(providerPayload.subject.includes('Untrusted subject'), false);
  assert.strictEqual(providerPayload.htmlContent.includes('<script>'), false);
  assert.strictEqual(providerPayload.htmlContent.includes('&lt;img'), true);
  const suppressedAfterAmbiguousAcceptance = await invoke(brevoHandler, {
    type: 'registration_ack',
    student: { name: 'Test Student', email: 'student@example.test', course: 'Microsoft Excel for Beginners' }
  }, { 'x-forwarded-for': '10.0.0.24' });
  assert.strictEqual(suppressedAfterAmbiguousAcceptance.statusCode, 202);
  assert.strictEqual(suppressedAfterAmbiguousAcceptance.body.requiresReconciliation, true);
  assert.strictEqual(providerSendCount, 1);
  process.env.BREVO_API_KEY = originalBrevoApiKey;
  global.fetch = authMock.fetchMock;

  const forgedStorage = createStorage({
    greach_admin_auth_v2: JSON.stringify({ token: 'forged-token', role: 'super_admin', mfaVerified: true }),
    greach_instructor_login: 'true',
    excel_instructor_session_active_v1: 'true',
    greach_student_session: JSON.stringify({ role: 'instructor', isAdmin: true, isSuperAdmin: true }),
    greach_student_token: 'forged-student-token',
    greach_server_session_id: 'forged-session-id'
  });
  const browserFetchCalls = [];
  const browser = {
    location: { hostname: 'greachimpact.com', origin: 'https://greachimpact.com', search: '?admin=true' },
    history: { replaceState() {} },
    GreachSync: null
  };
  const greachDbSource = fs.readFileSync(path.join(ROOT, 'js', 'greach-db.js'), 'utf8');
  new Function('window', 'document', 'process', 'localStorage', 'sessionStorage', 'fetch', 'console', greachDbSource)(
    browser,
    { querySelector() { return null; }, querySelectorAll() { return []; } },
    undefined,
    forgedStorage,
    forgedStorage,
    async (...args) => {
      browserFetchCalls.push(args);
      return response(401, { valid: false });
    },
    { log() {}, warn() {}, error() {} }
  );
  const greachDb = browser.GreachDB;
  assert.strictEqual(greachDb.isAdminClassroomAuthenticated(), false);
  assert.strictEqual(await greachDb.getVerifiedAdminClassroomSession(), null);
  assert.strictEqual(await greachDb.getVerifiedStudentClassroomSession(), null);
  assert.strictEqual(greachDb.verifyStudentByCode('VALID123').valid, false);
  assert.strictEqual(greachDb.verifyStudent('student@example.test', 'forged-password').success, false);
  assert.strictEqual(browserFetchCalls.length > 0, true);
  assert.strictEqual(greachDb.canAccessSection({
    courseKey: 'excel_beginners',
    role: 'instructor',
    isAdmin: true,
    isSuperAdmin: true
  }, 5).allowed, false);
  assert.strictEqual(greachDb.canAccessCourse({
    courseKey: 'excel_beginners',
    role: 'super_admin',
    isAdmin: true,
    isSuperAdmin: true
  }, 'sql_beginners').allowed, false);
  const priorClassroomState = forgedStorage.getItem('greach_classroom_states_v2');
  const forgedStateChange = await greachDb.setClassroomState('excel_beginners', 'force_on');
  assert.strictEqual(forgedStateChange.success, false);
  assert.strictEqual(forgedStorage.getItem('greach_classroom_states_v2'), priorClassroomState);

  const rootDb = fs.readFileSync(path.join(ROOT, 'js', 'greach-db.js'), 'utf8');
  const classroomDb = fs.readFileSync(path.join(ROOT, 'classroom', 'js', 'greach-db.js'), 'utf8');
  assert.strictEqual(rootDb, classroomDb, 'The two GreachDB copies must stay identical.');
  assert(!rootDb.includes('greach_super_admin_credentials_v2'));
  assert(!rootDb.includes('greach_admins_v2'));
  assert(rootDb.includes('getVerifiedStudentClassroomSession: async function()'));
  assert(rootDb.includes('Offline access-code verification is disabled.'));
  const adminProxy = rootDb.slice(rootDb.indexOf('callAdminApi:'), rootDb.indexOf('// Initialize all tables'));
  assert(adminProxy.includes('greach_admin_auth_v2'));
  assert(/Authorization.*token/.test(adminProxy));
  assert(!/action:\s*'admin_operation',\s*token/.test(adminProxy));
  const migration = fs.readFileSync(path.join(ROOT, 'scripts', 'execute_gate2c_v1_2_production_migration.js'), 'utf8');
  assert(migration.includes('const prodDbPassword = process.env.PROD_DB_PASSWORD;'));
  assert(migration.includes('const stagingDbPassword = process.env.STAGING_DB_PASSWORD || env.STAGING_DB_PASSWORD;'));
  assert(!/PROD_DB_PASSWORD\s*\|\|[^;\n]*STAGING_DB_PASSWORD/.test(migration));
  assert(migration.includes("const RERUN_AUTHORIZATION_ARG = '--authorize-completed-v1-2-production-rerun';"));
  assert(migration.includes('process.argv.includes(RERUN_AUTHORIZATION_ARG)'));
  assert(migration.includes("const RERUN_AUTHORIZATION_ENV = 'GATE2C_V1_2_RERUN_APPROVAL';"));
  assert(migration.includes('process.env[RERUN_AUTHORIZATION_ENV] === RERUN_AUTHORIZATION_VALUE'));
  assert(migration.indexOf('if (!hasSeparateRerunAuthorization)') < migration.indexOf('await createPgClient('));
  assert(migration.indexOf('configuredProdRef !== PROD_PROJECT_REF') < migration.indexOf('await createPgClient('));
  const postMigrationVerifier = fs.readFileSync(path.join(ROOT, 'scripts', 'verify_production_post_migration.js'), 'utf8');
  assert(postMigrationVerifier.includes('process.env.STAGING_DB_PASSWORD'));
  assert(!postMigrationVerifier.includes('PROD_DB_PASSWORD'));

  const vercelIgnore = fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8');
  for (const requiredPattern of ['.env*', '*.sql', 'scripts/', 'test_*.js', 'backups/', 'Student_Login_Credentials', 'classroom/Excel_Masterclass_Complete_300_Student_Pack.zip', 'classroom/README.md']) {
    assert(vercelIgnore.includes(requiredPattern), `.vercelignore must contain ${requiredPattern}`);
  }
  assert(!/^api\/?$/m.test(vercelIgnore), '.vercelignore must not exclude required API functions.');
  assert(!/^classroom\/?$/m.test(vercelIgnore), '.vercelignore must not exclude course materials.');

  const protectedPages = [
    'classroom/index.html',
    'classroom/START_HERE.html',
    'classroom/Excel Class.html',
    'classroom/Excel_Master_Course_Hub.html',
    'classroom/SQL_Master_Course_Hub.html',
    'classroom/PowerBI_Master_Course_Hub.html',
    'classroom/Excel_Dashboard_Hub.html'
  ];
  for (const file of protectedPages) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert(!source.includes('getStudentDatabase'), `${file} must not authenticate against a browser roster.`);
    assert(!source.includes('autoRetrieveStudentAccess'), `${file} must not auto-login from browser credentials.`);
    assert(!source.includes('Student_Login_Credentials_300_Roster'), `${file} must not link to credential rosters.`);
    assert(source.includes('getVerifiedStudentClassroomSession'), `${file} must restore student access from a signed server session.`);
  }
  for (const file of ['classroom/Excel Class.html', 'classroom/Excel_Master_Course_Hub.html']) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert(!source.includes('Excel_Masterclass_Complete_300_Student_Pack.zip'));
    assert(!source.includes('downloadAll300MagicLinksCSV'));
    assert(!source.includes('verifyStudentByCode('));
  }
  for (const file of [
    'classroom/Student_Login_Credentials_300_Roster.csv',
    'classroom/Student_Login_Credentials_300_Roster.xlsx',
    'classroom/Excel_Masterclass_Complete_300_Student_Pack.zip',
    'classroom/google_apps_script_db.js'
  ]) {
    assert(!fs.existsSync(path.join(ROOT, file)), `${file} must not be in the local release tree.`);
  }

  const storageInspect = fs.readFileSync(path.join(ROOT, 'GATE_2E_7_storage_inspection.sql'), 'utf8');
  assert(!/\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b/i.test(storageInspect));
  assert(storageInspect.includes('FROM pg_policies'));
  assert(storageInspect.includes('relrowsecurity'));
  const storageCreate = fs.readFileSync(path.join(ROOT, 'GATE_2E_7_storage_create_only.sql'), 'utf8');
  assert(!/\bDROP\s+(POLICY|BUCKET)\b/i.test(storageCreate));
  assert(storageCreate.includes('RAISE EXCEPTION'));
  assert(storageCreate.includes('relrowsecurity'));
  assert(storageCreate.includes('FALSE'));
  assert(storageCreate.includes('5242880'));
  assert(storageCreate.includes("'image/jpeg', 'image/png', 'image/webp', 'application/pdf'"));
  assert(storageCreate.includes('public.is_super_admin()'));
  assert(storageCreate.includes("(auth.jwt() ->> 'aal') = 'aal2'"));
  assert(storageCreate.includes('AS RESTRICTIVE'));
  assert(storageCreate.includes('TO public'));

  const rootBrevo = fs.readFileSync(path.join(ROOT, 'js', 'greach-brevo.js'), 'utf8');
  const classroomBrevo = fs.readFileSync(path.join(ROOT, 'classroom', 'js', 'greach-brevo.js'), 'utf8');
  assert.strictEqual(rootBrevo, classroomBrevo, 'The two GreachBrevo copies must stay identical.');
  assert(!rootBrevo.includes('api.brevo.com'));
  assert(!rootBrevo.includes('api-key'));
  assert(!rootBrevo.includes('cfg.apiKey'));
  const legacyBrevoStorage = createStorage({
    greach_brevo_config_v2: JSON.stringify({ apiKey: 'legacy-browser-key-fixture' })
  });
  const brevoFetchCalls = [];
  const brevoBrowser = {};
  new Function('window', 'localStorage', 'fetch', 'console', rootBrevo)(
    brevoBrowser,
    legacyBrevoStorage,
    async (url, options) => {
      brevoFetchCalls.push({ url, options });
      return response(200, { success: true, messageId: 'offline-test-message' });
    },
    { log() {}, warn() {}, error() {} }
  );
  const safeBrevoConfig = brevoBrowser.GreachBrevo.getConfig();
  assert(!Object.prototype.hasOwnProperty.call(safeBrevoConfig, 'apiKey'));
  assert(!Object.prototype.hasOwnProperty.call(JSON.parse(legacyBrevoStorage.getItem('greach_brevo_config_v2')), 'apiKey'));
  const serverBrevoTest = await brevoBrowser.GreachBrevo.testConnection('admin@example.test', 'signed-test-token');
  assert.strictEqual(serverBrevoTest.success, true);
  assert.strictEqual(brevoFetchCalls[0].url, '/api/brevo');
  assert.strictEqual(brevoFetchCalls[0].options.headers.Authorization, 'Bearer signed-test-token');
  assert(!Object.prototype.hasOwnProperty.call(JSON.parse(brevoFetchCalls[0].options.body), 'apiKey'));

  const authSource = fs.readFileSync(path.join(ROOT, 'api', 'auth.js'), 'utf8');
  assert(!authSource.includes("const isLegacy = /^GI-EXCEL-2026-\\d{4}$/"), 'Certificate-shaped IDs must not bypass the database registry.');
  assert(!authSource.includes("studentName: 'Verified Excel Graduate'"), 'Certificate verification must not fabricate graduate records.');
  global.fetch = async url => {
    const target = String(url);
    if (target.includes('/rest/v1/auth_rate_limits')) return response(200, []);
    if (target.includes('/rest/v1/rpc/verify_certificate')) return response(200, []);
    return response(404, {});
  };
  const formattedButUnregistered = await invoke(authHandler, {
    action: 'verify_certificate', certificateId: 'GI-EXCEL-2026-1234'
  });
  assert.strictEqual(formattedButUnregistered.statusCode, 404, 'Certificate syntax alone must not prove issuance.');
  assert.strictEqual(formattedButUnregistered.body.valid, false);
  global.fetch = authMock.fetchMock;
  const legacyCertificateHandler = await loadApi('api/verify-cert.js');
  const retiredCertificateRoute = await invoke(legacyCertificateHandler, {}, { host: 'greachimpact.com' });
  assert.strictEqual(retiredCertificateRoute.statusCode, 410);
  const publicCertificatePage = fs.readFileSync(path.join(ROOT, 'classroom', 'verify-certificate.html'), 'utf8');
  assert(publicCertificatePage.includes("fetch('/api/auth'"), 'Public verification must use the server registry.');
  assert(!publicCertificatePage.includes('GreachDB.verifyCertificate('), 'Browser storage cannot establish public certificate validity.');
  const certificateClaimPage = fs.readFileSync(path.join(ROOT, 'classroom', 'claim-certificate.html'), 'utf8');
  assert(!certificateClaimPage.includes('GreachDB.claimCertificate('), 'Browser-only certificate issuance must be disabled.');
  const rootStudentDb = fs.readFileSync(path.join(ROOT, 'js', 'greach-db.js'), 'utf8');
  const classroomStudentDb = fs.readFileSync(path.join(ROOT, 'classroom', 'js', 'greach-db.js'), 'utf8');
  assert.strictEqual(rootStudentDb, classroomStudentDb, 'The root and classroom GreachDB copies must stay identical.');
  assert(!rootStudentDb.includes("studentName: 'Verified Excel Graduate'"), 'Unregistered formats must not verify in browser storage.');
  for (const coursePage of ['classroom/Excel Class.html', 'classroom/Excel_Master_Course_Hub.html']) {
    const source = fs.readFileSync(path.join(ROOT, coursePage), 'utf8');
    assert(!source.includes('GreachDB.claimCertificate('), 'Course completion must not issue a browser-only official certificate.');
    assert(source.includes('Certificate issuance is temporarily unavailable'), 'The paused issuance path must explain its status.');
  }

  console.log('Gate 2E.10 local security tests passed (callback routing/authentication, payment idempotency, authorization, currency fail-closed behavior, notification reconciliation, browser safeguards, and certificate registry enforcement).');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
