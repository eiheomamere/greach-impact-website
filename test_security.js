// Automated Security Test Suite
import authHandler from './api/auth.js';
import registerHandler from './api/register.js';
import brevoHandler from './api/brevo.js';

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    setHeader: (k, v) => { res.headers[k] = v; },
    status: (code) => { res.statusCode = code; return res; },
    json: (data) => { res.data = data; return res; },
    end: () => res
  };
  return res;
}

console.log('=== RUNNING AUTOMATED SECURITY SUITE ===\n');

(async () => {
  // TEST 1: AUTHENTICATION WITH CORRECT CREDENTIALS (HMAC Token Generation)
  console.log('TEST 1: Valid Login & Cryptographic Token Generation...');
  const req1 = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: { identifier: 'Greachimpact', password: 'Evana_Oluebube123890' }
  };
  const res1 = mockRes();
  await authHandler(req1, res1);
  if (res1.statusCode !== 200 || !res1.data.token || !res1.data.isSuperAdmin) {
    throw new Error('Valid login failed: ' + JSON.stringify(res1.data));
  }
  console.log('✅ Generated signed token:', res1.data.token.substring(0, 30) + '...');

  // TEST 2: TOKEN VERIFICATION ENDPOINT
  console.log('\nTEST 2: Verifying Cryptographic HMAC Session Token...');
  const req2 = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: { action: 'verify', token: res1.data.token }
  };
  const res2 = mockRes();
  await authHandler(req2, res2);
  if (res2.statusCode !== 200 || !res2.data.valid) {
    throw new Error('Token verification failed: ' + JSON.stringify(res2.data));
  }
  console.log('✅ Token signature verified as authentic for:', res2.data.user);

  // TEST 3: REJECT FORGED / TAMPERED TOKEN
  console.log('\nTEST 3: Rejecting Tampered/Forged Token...');
  const forgedToken = res1.data.token.slice(0, -6) + 'FAKE00';
  const req3 = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    body: { action: 'verify', token: forgedToken }
  };
  const res3 = mockRes();
  await authHandler(req3, res3);
  if (res3.statusCode === 200) {
    throw new Error('Forged token should have been rejected!');
  }
  console.log('✅ Forged token successfully rejected (401 Unauthorized)');

  // TEST 4: BOT HONEYPOT PROTECTION ON REGISTRATION
  console.log('\nTEST 4: Bot Honeypot Trapping on /api/register...');
  const req4 = {
    method: 'POST',
    headers: { 'x-forwarded-for': '192.168.1.100' },
    body: {
      name: 'Spam Bot 3000',
      email: 'spambot@hacker.net',
      b_company_ref: 'Spam Corporation Automated Value' // Honeypot filled by bot
    }
  };
  const res4 = mockRes();
  await registerHandler(req4, res4);
  if (res4.data.student) {
    throw new Error('Bot should have been trapped without creating student!');
  }
  console.log('✅ Automated spam bot trapped cleanly by honeypot.');

  // TEST 5: INPUT SANITIZATION AGAINST XSS
  console.log('\nTEST 5: XSS Payload Sanitization...');
  const req5 = {
    method: 'POST',
    headers: { 'x-forwarded-for': '192.168.1.105' },
    body: {
      name: '<script>alert("XSS")</script>Kelechi Okonkwo',
      email: 'kelechi.clean@gmail.com',
      course: '<img src=x onerror=alert(1)>Excel Beginners'
    }
  };
  const res5 = mockRes();
  await registerHandler(req5, res5);
  const student = res5.data.student;
  if (student.name.includes('<script>') || student.course.includes('<img')) {
    throw new Error('XSS payload was not stripped!');
  }
  console.log('✅ Cleaned student name:', student.name);
  console.log('✅ Cleaned course name:', student.course);

  // TEST 6: RATE LIMITING ON BREVO EMAIL DISPATCH
  console.log('\nTEST 6: Rate Limiting Abuse Protection on /api/brevo...');
  const testIp = '10.0.0.99';
  let blocked = false;
  for (let i = 0; i < 12; i++) {
    const resB = mockRes();
    await brevoHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': testIp },
      body: { type: 'payment_pending', student: { email: 'rate@test.com', name: 'Rate Tester' } }
    }, resB);
    if (resB.statusCode === 429) {
      blocked = true;
      break;
    }
  }
  if (!blocked) {
    throw new Error('Rate limiter should have blocked excessive email calls!');
  }
  console.log('✅ Rate limiter triggered: Spammer blocked with HTTP 429.');

  console.log('\n======================================================');
  console.log('🛡️ ALL 6 COMPREHENSIVE SECURITY CHECKS PASSED 100%!');
  console.log('======================================================');
})();
