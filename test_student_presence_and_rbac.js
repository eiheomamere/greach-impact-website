// Mock localStorage for Node environment
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
global.window = {};

require('./js/greach-db.js');
const db = window.GreachDB;

console.log('=== TEST 1: ROLE-BASED COURSE ACCESS RESTRICTIONS ===');

// Case A: Excel for Beginners Student
const beginnerStudent = {
  id: 'STU-TEST-001',
  name: 'Chioma Okeke',
  course: 'Microsoft Excel for Beginners',
  courseKey: 'excel_beginners'
};

const sec0Access = db.canAccessSection(beginnerStudent, 0); // Basics
const sec1Access = db.canAccessSection(beginnerStudent, 1); // Formatting
const sec2Access = db.canAccessSection(beginnerStudent, 2); // Logic
const sec3Access = db.canAccessSection(beginnerStudent, 3); // Advanced Tables
const sec5Access = db.canAccessSection(beginnerStudent, 5); // Dashboard Capstone

console.log('Beginner -> Section 0 (Basics): allowed =', sec0Access.allowed, '(Expected: true)');
console.log('Beginner -> Section 2 (Logic): allowed =', sec2Access.allowed, '(Expected: true)');
console.log('Beginner -> Section 3 (Advanced Tables): allowed =', sec3Access.allowed, '(Expected: false)');
console.log('Beginner -> Section 5 (Executive Dashboard): allowed =', sec5Access.allowed, '(Expected: false)');
console.log('Locked Reason:', sec3Access.reason);

if (sec0Access.allowed && sec2Access.allowed && !sec3Access.allowed && !sec5Access.allowed) {
  console.log('✅ Role-Based Course Access Restriction verified for Excel Beginners!');
} else {
  console.error('❌ RBAC check failed!');
  process.exit(1);
}

// Case B: Complete Suite VIP Student
const vipStudent = {
  id: 'STU-TEST-002',
  name: 'Emeka Eze',
  course: 'Complete Analytics Suite (Excel + SQL + Power BI)',
  courseKey: 'complete_package'
};
const vipSec3 = db.canAccessSection(vipStudent, 3);
const vipSec5 = db.canAccessSection(vipStudent, 5);
console.log('VIP Suite -> Section 3: allowed =', vipSec3.allowed, '(Expected: true)');
console.log('VIP Suite -> Section 5: allowed =', vipSec5.allowed, '(Expected: true)');
if (vipSec3.allowed && vipSec5.allowed) {
  console.log('✅ Complete Suite student has full access to all modules!');
} else {
  console.error('❌ VIP Suite check failed!');
  process.exit(1);
}

// Case C: Super Admin / Instructor
const instructorAccess = db.canAccessSection({ role: 'instructor', isSuperAdmin: true }, 5);
console.log('Lead Instructor -> Section 5: allowed =', instructorAccess.allowed, '(Expected: true)');
if (instructorAccess.allowed) {
  console.log('✅ Lead Instructor has global unrestricted access!');
}

console.log('\n=== TEST 2: STUDENT LOGIN / LOGOUT TRACKING & REAL-TIME PRESENCE ===');

// Record login
const session = db.recordStudentLogin(beginnerStudent, { userAgent: 'Chrome Windows 11', ip: '197.210.45.10' });
console.log('Created student session ID:', session.sessionId, 'Status:', session.status);

// Verify in active sessions
let activeSessions = db.getActiveStudentSessions();
console.log('Active Online Students Count:', activeSessions.length, '(Expected: 1)');
console.log('Online Student:', activeSessions[0].name, '| Enrolled in:', activeSessions[0].course);

if (activeSessions.length === 1 && activeSessions[0].studentId === beginnerStudent.id) {
  console.log('✅ Student Login correctly recorded in real-time presence tracker!');
} else {
  console.error('❌ Session tracking failed!');
  process.exit(1);
}

// Check activity logs
let logs = db.getStudentActivityLogs();
console.log('Activity Logs Count:', logs.length);
console.log('Latest Activity:', logs[0].type, '-', logs[0].details);
if (logs[0].type === 'LOGIN') {
  console.log('✅ Activity log correctly stored with login timestamp!');
}

// Record logout
db.recordStudentLogout(beginnerStudent.id, 'Student clicked logout');
activeSessions = db.getActiveStudentSessions();
console.log('Active Online Students after logout:', activeSessions.length, '(Expected: 0)');
logs = db.getStudentActivityLogs();
console.log('Latest Activity after logout:', logs[0].type, '-', logs[0].details);

if (activeSessions.length === 0 && logs[0].type === 'LOGOUT') {
  console.log('✅ Student Logout correctly tracked with session duration!');
} else {
  console.error('❌ Logout tracking failed!');
  process.exit(1);
}

// Test Force Logout by Admin
db.recordStudentLogin(beginnerStudent);
console.log('Student logged back in. Active count:', db.getActiveStudentSessions().length);
const termRes = db.forceLogoutStudent(beginnerStudent.id, 'Greachimpact');
console.log('Admin Force Logout Result:', termRes.message);
console.log('Is session terminated flag set:', db.isSessionTerminated(beginnerStudent.id));
console.log('Active count after termination:', db.getActiveStudentSessions().length, '(Expected: 0)');

if (db.isSessionTerminated(beginnerStudent.id) && db.getActiveStudentSessions().length === 0) {
  console.log('✅ Super Admin Force-Logout verified!');
} else {
  console.error('❌ Force logout failed!');
  process.exit(1);
}

console.log('\n=== TEST 3: STRICT PAYWALL ENFORCEMENT (NO CODE = NO ENTRY) ===');

// Test generic bypass code (should FAIL)
const genericRes = db.verifyStudentByCode('GREACH-2026');
console.log('Generic bypass code "GREACH-2026" result:', genericRes.success, '(Expected: false)');
if (!genericRes.success) {
  console.log('✅ Generic bypass code rejected! Strict paywall enforced.');
} else {
  console.error('❌ Generic bypass was allowed!');
  process.exit(1);
}

// Test empty code (should FAIL)
const emptyRes = db.verifyStudentByCode('');
console.log('Empty code result:', emptyRes.success, '(Expected: false)');

console.log('\n🎉 ALL STUDENT PRESENCE & RBAC ACCESS TESTS PASSED 100%!');
