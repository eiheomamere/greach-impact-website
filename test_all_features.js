const fs = require('fs');

// Mock localStorage & DOM
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
global.window = {
  localStorage: global.localStorage,
  location: { pathname: '/index.html', origin: 'https://greachimpact.com' }
};

global.fetch = async () => ({
  ok: true,
  json: async () => ({ success: true, messageId: 'MSG-TEST' })
});

// Load DB
require('./classroom/js/greach-db.js');
const GreachDB = global.window.GreachDB;

// Load Brevo
require('./classroom/js/greach-brevo.js');
const GreachBrevo = global.window.GreachBrevo;

console.log('=== TEST 1: PRICE UPDATE & AUDIT TRAIL LOGGING ===');
GreachDB.updateCoursePrice('dashboard', 4000, 80000, 'Greachimpact');
const prices = GreachDB.getPrices();
const dashPrice = prices.excel_dashboard || prices.dashboard;
console.log('Dashboard price in DB:', dashPrice.current);
console.log('Dashboard discount in DB:', dashPrice.discount);
if (dashPrice.current !== 4000 || !dashPrice.discount.includes('95%')) {
  throw new Error('Price update failed!');
}

const auditLogs = GreachDB.getAuditLogs();
console.log('Audit logs count:', auditLogs.length);
console.log('Latest audit action:', auditLogs[0].action);
console.log('Latest audit user:', auditLogs[0].user);
console.log('Latest audit details:', auditLogs[0].details);
if (!auditLogs[0].details.includes('4,000') || auditLogs[0].user !== 'Greachimpact') {
  throw new Error('Audit logging failed!');
}
console.log('✅ Price updated and audit log recorded with user attribution.');

console.log('\n=== TEST 2: SELF-PACED DELIVERY MODE UPDATE ===');
GreachDB.updateSchedule('dashboard', {
  deliveryMode: 'self_paced',
  cohort: 'Executive Self-Paced Track',
  days: 'Learn At Your Own Pace',
  startTime: '24/7 Access'
}, 'Greachimpact');
const sched = GreachDB.getSchedule('dashboard');
console.log('Dashboard delivery mode:', sched.deliveryMode);
if (sched.deliveryMode !== 'self_paced') {
  throw new Error('Delivery mode update failed!');
}
console.log('✅ Self-paced delivery mode set and persisted.');

console.log('\n=== TEST 3: SUPERUSER TEMPORARY SESSION PASSES & EXPIRY ===');
const pass = GreachDB.createSessionPass({
  label: 'Weekend Live Workshop Session',
  customCode: 'LIVE-EXCEL-TEST',
  durationHours: 2
}, 'Greachimpact');
console.log('Created session pass code:', pass.code);
console.log('Pass isActive:', pass.isActive);

// Verify student login with session pass
const sessionLogin = GreachDB.verifyStudentByCode('LIVE-EXCEL-TEST');
console.log('Session pass login success:', sessionLogin.success);
console.log('Is Session Pass:', sessionLogin.isSessionPass);
if (!sessionLogin.success || !sessionLogin.isSessionPass) {
  throw new Error('Session pass verification failed!');
}

// Expire the pass
GreachDB.expireSessionPass('LIVE-EXCEL-TEST', 'Greachimpact');
const expiredLogin = GreachDB.verifyStudentByCode('LIVE-EXCEL-TEST');
console.log('After expiry login success (should be false):', expiredLogin.success);
console.log('Error message:', expiredLogin.error);
if (expiredLogin.success) {
  throw new Error('Expired session pass should not allow login!');
}
console.log('✅ Temporary session passes and instant expiration fully functional.');

console.log('\n=== TEST 4: PAYMENT VERIFICATION BEFORE SENDING CODE ===');
const student = GreachDB.registerStudent({
  name: 'Kelechi Amadi',
  email: 'kelechi@test.org',
  phone: '+2348030001111',
  course: 'Excel Dashboard for Beginners',
  cohort: 'Executive Self-Paced Track',
  isFree: false
});
console.log('Registered student status:', student.status);
console.log('Is code active:', student.isCodeActive);

// Attempt classroom login BEFORE payment confirmation
const unconfirmedLogin = GreachDB.verifyStudentByCode(student.password);
console.log('Unconfirmed student login success (should be false):', unconfirmedLogin.success);
console.log('Unconfirmed error message:', unconfirmedLogin.error);
if (unconfirmedLogin.success) {
  throw new Error('Student should not be able to log in before payment verification!');
}

// Brevo sends payment pending instructions
(async () => {
  await GreachBrevo.triggerRegistrationAutomation(student, {
    amount: 4000,
    courseKey: 'dashboard',
    courseName: 'Excel Dashboard for Beginners',
    paymentMethod: 'Direct Bank Transfer',
    paymentStatus: 'Pending Verification'
  });

  const logs = GreachBrevo.getDispatchLogs();
  console.log('Brevo initial email dispatched type:', logs[1].type); // payment_pending
  if (logs[1].type !== 'payment_pending') {
    throw new Error('Expected initial email to be payment_pending!');
  }

  // Admin marks Verified & Paid
  const orders = GreachBrevo.getAllOrders();
  const order = orders[0];
  console.log('Order ID:', order.orderId);

  // Activate student in DB roster (Simulating Admin click "Verify & Mark Paid")
  const allStus = GreachDB.getAllStudents();
  const sMatch = allStus.find(s => s.id === student.id);
  sMatch.isCodeActive = true;
  sMatch.status = 'Active';
  sMatch.paymentStatus = 'Verified & Paid';
  GreachDB.saveAllStudents(allStus);

  // Brevo sends official welcome with active code
  await GreachBrevo.sendEmail({
    type: 'welcome',
    student: student
  });

  const verifiedLogin = GreachDB.verifyStudentByCode(student.password);
  console.log('After payment verification login success:', verifiedLogin.success);
  if (!verifiedLogin.success) {
    throw new Error('Student should now be able to log in!');
  }
  console.log('✅ Access code securely locked until payment confirmed!');

  console.log('\n=== TEST 5: ALUMNI STUDENT BANK & SUPERUSER DELETE ===');
  const past = GreachDB.addPastStudent({
    name: 'Chidiogo Nwosu',
    email: 'chidiogo.nwosu@alumni.org',
    phone: '+2348099998888',
    course: 'Microsoft Excel for Beginners',
    year: '2025'
  }, 'Greachimpact');
  console.log('Added alumni student:', past.student.name, past.student.id);

  const foundAlumni = GreachDB.findStudent('chidiogo.nwosu@alumni.org');
  if (!foundAlumni || !foundAlumni.isPastStudent) {
    throw new Error('Alumni student not found in roster!');
  }
  console.log('✅ Past student saved in Alumni Student Bank.');

  // Superuser Delete Student
  const delRes = GreachDB.deleteStudent(past.student.id, 'Greachimpact');
  console.log('Superuser delete success:', delRes.success);
  const reCheck = GreachDB.findStudent('chidiogo.nwosu@alumni.org');
  if (reCheck) {
    throw new Error('Student was not deleted!');
  }
  console.log('✅ Superuser deletion verified.');

  console.log('\n=== TEST 6: BLOG POST PUBLISHING & AUDIT LOGGING ===');
  const newPostRes = GreachDB.createBlogPost({
    title: 'Top 5 Practical Excel Dashboard Tips for Business Reporting',
    category: 'Excel & Data',
    summary: 'Essential design tips for clean, executive-ready Excel reports.',
    content: '<p>Dashboards should tell a clear story...</p>',
    author: 'Greach Impact Team'
  }, 'Greachimpact');

  console.log('Created blog post ID:', newPostRes.post.id);
  console.log('Created blog post title:', newPostRes.post.title);
  if (!newPostRes.success || newPostRes.post.title !== 'Top 5 Practical Excel Dashboard Tips for Business Reporting') {
    throw new Error('Blog post creation failed!');
  }

  // Update blog post
  const updPostRes = GreachDB.updateBlogPost(newPostRes.post.id, {
    title: 'Top 5 Executive Excel Dashboard Tips for Business Reporting (Updated)'
  }, 'Greachimpact');
  console.log('Updated blog post title:', updPostRes.post.title);
  if (!updPostRes.success || !updPostRes.post.title.includes('(Updated)')) {
    throw new Error('Blog post update failed!');
  }

  // Verify in list
  const allPosts = GreachDB.getBlogPosts();
  console.log('Total blog posts in DB:', allPosts.length);
  const foundPost = allPosts.find(p => p.id === newPostRes.post.id);
  if (!foundPost || !foundPost.title.includes('(Updated)')) {
    throw new Error('Blog post not found in getBlogPosts!');
  }

  // Delete blog post
  const delPostRes = GreachDB.deleteBlogPost(newPostRes.post.id, 'Greachimpact');
  console.log('Blog post deletion success:', delPostRes.success);
  if (!delPostRes.success) {
    throw new Error('Blog post deletion failed!');
  }
  console.log('✅ Blog publishing, updating, and deleting verified 100%.');

  console.log('\n=== TEST 7: SUPERUSER 6-CLASSROOM LIVE COMMAND CENTER ===');
  const allClassrooms = GreachDB.getAllClassrooms();
  console.log('Total dedicated classrooms:', allClassrooms.length);
  if (allClassrooms.length !== 6) {
    throw new Error('Expected 6 dedicated classrooms!');
  }
  // Stop SQL classroom as Superuser
  GreachDB.stopClassroom('sql_beginners', 'Greachimpact', 'Paused for instructor Q&A');
  if (GreachDB.isClassroomOpen('sql_beginners') !== false) {
    throw new Error('SQL classroom should be stopped!');
  }
  console.log('SQL Classroom open state after stop:', GreachDB.isClassroomOpen('sql_beginners'));
  // Start SQL classroom back ON
  GreachDB.startClassroom('sql_beginners', 'Greachimpact', 'SQL Live Class is now ON');
  if (GreachDB.isClassroomOpen('sql_beginners') !== true) {
    throw new Error('SQL classroom should be ON!');
  }
  console.log('SQL Classroom open state after start:', GreachDB.isClassroomOpen('sql_beginners'));
  console.log('✅ All 6 classrooms & Superuser ON/STOP controls verified 100%.');

  console.log('\n=============================================');
  console.log('🎉 ALL COMPREHENSIVE SYSTEM TESTS PASSED 100%!');
  console.log('=============================================');
})();
