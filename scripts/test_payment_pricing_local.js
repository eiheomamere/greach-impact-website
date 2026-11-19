const assert = require('assert');
const fs = require('fs');
const { pathToFileURL } = require('url');

const ROOT = require('path').join(__dirname, '..');
const responses = [];
let submittedOrder = null;
let submittedStudent = null;
let submittedAudit = null;
let createdOrderCount = 0;
const uploadedReceiptMimes = [];

function response(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
}

async function run() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('STAGING_')) delete process.env[key];
  }
  Object.assign(process.env, {
    APP_ENV: 'production',
    SUPABASE_URL: 'https://unit-test.supabase.co',
    SUPABASE_ANON_KEY: 'offline-anon-fixture',
    SUPABASE_SERVICE_ROLE_KEY: 'offline-service-fixture',
    AUTH_SECRET: 'offline-auth-fixture',
    ADMIN_EMAIL: 'admin@example.test',
    VERCEL_ENV: 'production',
    VERCEL_PROJECT_PRODUCTION_URL: 'academy.example.test'
  });

  global.fetch = async (url, options = {}) => {
    const target = String(url);
    const method = options.method || 'GET';
    if (target.includes('/rest/v1/auth_rate_limits')) return response(200, []);
    if (target.includes('/rest/v1/course_prices')) {
      return response(200, [{
        course_id: 'excel_beginners',
        course_name: 'Microsoft Excel for Beginners',
        promo_price: 15000,
        original_price: 25000
      }, {
        course_id: 'sql',
        course_name: 'Legacy SQL Record',
        promo_price: 5000,
        original_price: 9000
      }, {
        course_id: 'sql_beginners',
        course_name: 'SQL for Data Analytics & Databases',
        promo_price: 7000,
        original_price: 12000
      }]);
    }
    if (target.includes('open.er-api.com/v6/latest/NGN')) {
      return response(200, {
        result: 'success',
        time_last_update_unix: Math.floor(Date.now() / 1000),
        rates: { GBP: 0.0005, USD: 0.0007, EUR: 0.0006 }
      });
    }
    if (target.includes('/rest/v1/orders?order_reference=')) return response(200, []);
    if (target.endsWith('/rest/v1/students?registered_email=eq.student%40example.test&select=id')) {
      return response(200, []);
    }
    if (target.includes('/storage/v1/object/payment_receipts/')) {
      uploadedReceiptMimes.push(options.headers?.['Content-Type']);
      return response(200, {});
    }
    if (target.endsWith('/rest/v1/students') && method === 'POST') {
      submittedStudent = JSON.parse(options.body);
      return response(201, [submittedStudent]);
    }
    if (target.endsWith('/rest/v1/orders') && method === 'POST') {
      submittedOrder = JSON.parse(options.body);
      createdOrderCount += 1;
      return response(201, [submittedOrder]);
    }
    if (target.endsWith('/rest/v1/audit_logs') && method === 'POST') {
      submittedAudit = JSON.parse(options.body);
      return response(201, []);
    }
    if (target.endsWith('/api/brevo')) return response(200, { success: true, dispatched: true, trackingId: 'offline-notification' });
    responses.push(`${method} ${target}`);
    return response(500, { error: 'Unexpected mocked request' });
  };

  const moduleUrl = pathToFileURL(require('path').join(ROOT, 'api/payment.js')).href + '?pricing-local-test';
  const handler = (await import(moduleUrl)).default;
  async function submit(body, ip) {
    const req = {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      body
    };
    const res = {
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; },
      end() { return this; },
      setHeader() {}
    };
    await handler(req, res);
    return res;
  }

  const normalRequest = {
      action: 'submit_payment',
      studentName: 'Test Student',
      studentEmail: 'student@example.test',
      studentPhone: '',
      courseName: 'Untrusted client supplied title',
      courseId: 'excel_beginners',
      currency: 'NGN',
      amountPaid: 1,
      transactionReference: 'LOCAL-PRICE-001',
      bankUsed: 'Test Bank',
      paymentDate: '2026-11-12'
  };
  const res = await submit(normalRequest, '198.51.100.44');
  assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
  assert.strictEqual(submittedOrder.amount, 15000, 'NGN order amount must come from the server catalog.');
  assert.strictEqual(submittedOrder.amount_paid, 15000, 'NGN paid snapshot must not trust the browser amount.');
  assert.strictEqual(submittedOrder.original_master_price_ngn, 15000);
  assert.strictEqual(submittedOrder.exchange_rate, 1);
  assert.strictEqual(submittedOrder.rate_provider, 'Master NGN');
  assert.strictEqual(submittedOrder.course_name, 'Microsoft Excel for Beginners');
  assert.strictEqual(submittedStudent.enrolled_course, 'Microsoft Excel for Beginners');
  assert.deepStrictEqual(responses, [], 'No request should escape the local mock.');

  const foreignRequest = {
    ...normalRequest,
    currency: 'GBP',
    amountPaid: 0.01,
    transactionReference: 'LOCAL-PRICE-GBP'
  };
  const foreignRes = await submit(foreignRequest, '198.51.100.47');
  assert.strictEqual(foreignRes.statusCode, 200, JSON.stringify(foreignRes.body));
  assert.strictEqual(submittedOrder.amount, 7.5, 'Foreign amount must be calculated from master NGN price and provider rate.');
  assert.strictEqual(submittedOrder.amount_paid, 7.5);
  assert.strictEqual(submittedOrder.original_master_price_ngn, 15000);
  assert.strictEqual(submittedOrder.exchange_rate, 0.0005);
  assert.match(submittedOrder.rate_provider, /open\.er-api\.com/);
  assert.strictEqual(submittedOrder.provider_updated_at, new Date(Math.floor(Date.now() / 1000) * 1000).toISOString());

  const exactCourseRequest = {
    ...normalRequest,
    courseId: 'sql_beginners',
    courseName: 'SQL for Data Analytics & Databases',
    transactionReference: 'LOCAL-PRICE-SQL'
  };
  const exactCourseRes = await submit(exactCourseRequest, '198.51.100.48');
  assert.strictEqual(exactCourseRes.statusCode, 200, JSON.stringify(exactCourseRes.body));
  assert.strictEqual(submittedOrder.amount, 7000, 'Exact course ID must take priority over an earlier alias row.');
  assert.strictEqual(submittedOrder.course_name, 'SQL for Data Analytics & Databases');

  const validReceipts = [
    ['receipt.jpg', Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'],
    ['receipt.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
    ['receipt.webp', Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]), 'image/webp'],
    ['receipt.pdf', Buffer.from('%PDF-1.7'), 'application/pdf']
  ];
  for (let index = 0; index < validReceipts.length; index += 1) {
    const [evidenceFilename, bytes, expectedMime] = validReceipts[index];
    const receiptRes = await submit({
      ...normalRequest,
      transactionReference: `LOCAL-RECEIPT-${index}`,
      evidenceFilename,
      evidenceBase64: bytes.toString('base64')
    }, `198.51.100.${50 + index}`);
    assert.strictEqual(receiptRes.statusCode, 200, `${evidenceFilename}: ${JSON.stringify(receiptRes.body)}`);
    assert.strictEqual(uploadedReceiptMimes[uploadedReceiptMimes.length - 1], expectedMime);
    assert(submittedAudit.details.receipt_storage_path, `${evidenceFilename} must have a stored private path.`);
    assert.strictEqual(submittedAudit.details.evidence_mime, expectedMime);
  }

  const invalidReceipt = await submit({
    ...normalRequest,
    transactionReference: 'LOCAL-PRICE-002',
    evidenceFilename: 'receipt.jpg',
    evidenceBase64: Buffer.from('not an image').toString('base64')
  }, '198.51.100.45');
  assert.strictEqual(invalidReceipt.statusCode, 400);
  assert.match(invalidReceipt.body.error, /signature/i);

  const oversizedReceipt = await submit({
    ...normalRequest,
    transactionReference: 'LOCAL-RECEIPT-OVERSIZE',
    evidenceFilename: 'oversized.pdf',
    evidenceBase64: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64')
  }, '198.51.100.55');
  assert.strictEqual(oversizedReceipt.statusCode, 400);
  assert.match(oversizedReceipt.body.error, /5MB/i);

  const unknownCourse = await submit({
    ...normalRequest,
    courseId: 'unlisted_course',
    courseName: 'Unlisted Course',
    transactionReference: 'LOCAL-PRICE-003'
  }, '198.51.100.46');
  assert.strictEqual(unknownCourse.statusCode, 503);
  assert.strictEqual(createdOrderCount, 7, 'Invalid receipt or unknown course must not create another order.');
  assert.deepStrictEqual(responses, [], 'All external calls must remain inside the local mock.');

  const currentConfirmation = fs.readFileSync(require('path').join(ROOT, 'registration-confirmation.html'), 'utf8');
  const legacyConfirmation = fs.readFileSync(require('path').join(ROOT, 'registration-confirmation/index.html'), 'utf8');
  assert(currentConfirmation.includes('Payment Confirmation Submitted'));
  assert(legacyConfirmation.includes('Payment Confirmation Submitted'));
  for (const source of [currentConfirmation, legacyConfirmation]) {
    assert(!source.includes('registerStudent('));
    assert(!source.includes('displayStudentPass'));
    assert(!source.includes('classroom/index.html?code='));
  }
  const registrationPage = fs.readFileSync(require('path').join(ROOT, 'registration.html'), 'utf8');
  assert(!registrationPage.includes('GreachDB.registerStudent'));
  assert(registrationPage.includes("fetch('/api/payment'"), 'Public registration submits through the payment API.');
  assert(!registrationPage.includes('/api/register'), 'The public registration page does not depend on the excluded legacy endpoint.');
  const dbCopies = ['js/greach-db.js', 'classroom/js/greach-db.js']
    .map(file => fs.readFileSync(require('path').join(ROOT, file), 'utf8'));
  assert.strictEqual(dbCopies[0], dbCopies[1]);
  assert(!dbCopies[0].includes("fetch('/api/register'"));
  assert(fs.readFileSync(require('path').join(ROOT, '.vercelignore'), 'utf8').includes('/api/register.js'));
  console.log('Offline payment tests passed (NGN and GBP pricing, currency snapshots, all accepted receipt signatures, size limit, unknown-course rejection, and safe confirmation routes).');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
