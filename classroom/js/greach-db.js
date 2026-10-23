/**
 * GREACH IMPACT ACADEMY - ENTERPRISE DATABASE & ACCESS CONTROL LAYER
 * Unified Database, Super Admin Management, 1-Month Expiry, One-Off Certificates & Unlimited Students
 */

(function() {
  const ROSTER_DB_KEY = 'greach_student_roster_v2';
  const SUBMISSIONS_DB_KEY = 'greach_project_submissions_v2';
  const CERTS_DB_KEY = 'issued_certificates_v2';
  const ADMINS_KEY = 'greach_admins_v2';
  const PRICES_KEY = 'greach_course_prices_v2';
  const SCHEDULES_KEY = 'greach_course_schedules_v2';
  const AUDIT_KEY = 'greach_audit_log_v2';
  const SESSION_PASSES_KEY = 'greach_session_passes_v2';
  const SUPER_ADMIN_KEY = 'greach_super_admin_credentials_v2';
  const SETTINGS_KEY = 'greach_db_config_v2';
  const STUDENT_ACTIVITY_KEY = 'greach_student_activity_log_v2';
  const ACTIVE_SESSIONS_KEY = 'greach_active_sessions_v2';
  const TERMINATED_SESSIONS_KEY = 'greach_terminated_sessions_v2';

  // 1. DEFAULT SUPER ADMIN MASTER CREDENTIALS
  const DEFAULT_SUPER_ADMIN = {
    username: 'Greachimpact',
    password: 'Evana_Oluebube123890',
    role: 'super_admin',
    name: 'Lead Super Administrator',
    email: 'greachimpact@gmail.com',
    isSuper: true
  };
  const SUPER_ADMIN = DEFAULT_SUPER_ADMIN;

  function getActiveSuperAdmin() {
    try {
      const stored = localStorage.getItem(SUPER_ADMIN_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_SUPER_ADMIN;
    } catch(e) {
      return DEFAULT_SUPER_ADMIN;
    }
  }

  // 1b. DEFAULT COURSE SCHEDULES & CLASS TIMES
  
  // ==============================================================
  // GRANULAR COURSE-BASED ACCESS CONTROL (ROLE-BASED CURRICULUM GATING)
  // ==============================================================
  const COURSE_PERMISSIONS = {
    excel_beginners: {
      key: 'excel_beginners',
      label: 'Microsoft Excel for Beginners',
      hubUrl: 'Excel_Master_Course_Hub.html?track=beginners',
      allowedSections: [0, 1, 2], // Sections 1, 2, 3: Basics, Math, Logic & Text (Lessons 0 to 30)
      allowedModulesText: 'Modules 1–3 (Excel Basics, Formatting, Formulas, Logic & Text Functions)',
      maxSlide: 30,
      badge: 'Beginner Access'
    },
    excel_advanced: {
      key: 'excel_advanced',
      label: 'Microsoft Excel Advanced & Analytics',
      hubUrl: 'Excel_Master_Course_Hub.html?track=advanced',
      allowedSections: [3, 4, 5], // Sections 4, 5, 6: Data Cleaning, Tables, Lookups, PivotTables, Dashboards
      allowedModulesText: 'Modules 4–6 (Advanced Data Cleaning, Dynamic Arrays, XLOOKUP, PivotTables & Dashboards)',
      minSlide: 31,
      maxSlide: 63,
      badge: 'Advanced Access'
    },
    dashboard: {
      key: 'excel_dashboard',
      label: 'Executive Interactive Dashboard Design',
      hubUrl: 'Excel_Dashboard_Hub.html',
      allowedSections: [5], // Section 6: Dashboards, Slicers & Capstone Tracker
      allowedModulesText: 'Module 6 (Executive Dashboards, Slicers, KPI Cards & Capstone)',
      minSlide: 48,
      maxSlide: 63,
      badge: 'Dashboard Specialist'
    },
    excel_dashboard: {
      key: 'excel_dashboard',
      label: 'Executive Interactive Dashboard Design',
      hubUrl: 'Excel_Dashboard_Hub.html',
      allowedSections: [5], // Section 6: Dashboards, Slicers & Capstone Tracker
      allowedModulesText: 'Module 6 (Executive Dashboards, Slicers, KPI Cards & Capstone)',
      minSlide: 48,
      maxSlide: 63,
      badge: 'Dashboard Specialist'
    },
    sql_beginners: {
      key: 'sql_beginners',
      label: 'SQL for Beginners & Analytics',
      hubUrl: 'SQL_Master_Course_Hub.html',
      allowedSections: [0, 1, 2, 3, 4, 5], // All SQL modules in SQL Hub
      allowedModulesText: 'SQL Analytics & Database Queries Portal (All 6 Modules)',
      badge: 'SQL Specialist'
    },
    sql: {
      key: 'sql_beginners',
      label: 'SQL for Beginners & Analytics',
      hubUrl: 'SQL_Master_Course_Hub.html',
      allowedSections: [0, 1, 2, 3, 4, 5],
      allowedModulesText: 'SQL Analytics & Database Queries Portal (All 6 Modules)',
      badge: 'SQL Specialist'
    },
    power_bi: {
      key: 'power_bi',
      label: 'Power BI for Beginners',
      hubUrl: 'PowerBI_Master_Course_Hub.html',
      allowedSections: [0, 1, 2, 3, 4, 5], // All Power BI modules in Power BI Hub
      allowedModulesText: 'Power BI Business Intelligence & Reporting Portal (All 6 Modules)',
      badge: 'Power BI Specialist'
    },
    complete_package: {
      key: 'complete_package',
      label: 'Complete Analytics Suite (Excel + SQL + Power BI)',
      hubUrl: 'Excel_Master_Course_Hub.html?track=all',
      allowedSections: [0, 1, 2, 3, 4, 5], // Full All-Inclusive Access
      allowedModulesText: 'Full Suite VIP: Excel (64 Lessons) + SQL Hub + Power BI Hub + Dashboard Studio',
      minSlide: 0,
      maxSlide: 63,
      badge: 'Full Suite VIP'
    },
    complete_course: {
      key: 'complete_package',
      label: 'Complete Analytics Suite (Excel + SQL + Power BI)',
      hubUrl: 'Excel_Master_Course_Hub.html?track=all',
      allowedSections: [0, 1, 2, 3, 4, 5],
      allowedModulesText: 'Full Suite VIP: Excel (64 Lessons) + SQL Hub + Power BI Hub + Dashboard Studio',
      minSlide: 0,
      maxSlide: 63,
      badge: 'Full Suite VIP'
    }
  };

  const DEFAULT_SCHEDULES = {
    excel_beginners: {
      courseKey: 'excel_beginners',
      label: 'Excel for Beginners',
      cohort: 'Batch 2: 2026 Cohort',
      startDate: '2026-11-14',
      endDate: '2026-12-19',
      days: 'Saturdays & Sundays',
      startTime: '10:00 AM WAT',
      endTime: '12:30 PM WAT',
      mode: 'Live Interactive Studio + 16 Guided Workbooks'
    },
    excel_advanced: {
      courseKey: 'excel_advanced',
      label: 'Excel Advanced',
      cohort: 'Batch 2: 2026 Cohort',
      startDate: '2026-11-14',
      endDate: '2026-12-19',
      days: 'Saturdays & Sundays',
      startTime: '02:00 PM WAT',
      endTime: '04:30 PM WAT',
      mode: 'Live Interactive Studio + Capstone Project'
    },
    excel_dashboard: {
      courseKey: 'excel_dashboard',
      label: 'Excel Dashboard for Beginners',
      cohort: 'Executive Cohort 2026',
      startDate: '2026-11-21',
      endDate: '2026-12-26',
      days: 'Saturdays',
      startTime: '11:00 AM WAT',
      endTime: '02:00 PM WAT',
      mode: 'Executive Weekend Intensive'
    },
    sql: {
      courseKey: 'sql',
      label: 'SQL for Beginners',
      cohort: 'Batch 2: 2026 Cohort',
      startDate: '2026-11-16',
      endDate: '2026-12-21',
      days: 'Mondays & Wednesdays',
      startTime: '07:00 PM WAT',
      endTime: '09:00 PM WAT',
      mode: 'Evening Bootcamp'
    },
    power_bi: {
      courseKey: 'power_bi',
      label: 'Power BI for Beginners',
      cohort: 'Batch 2: 2026 Cohort',
      startDate: '2026-11-17',
      endDate: '2026-12-22',
      days: 'Tuesdays & Thursdays',
      startTime: '07:00 PM WAT',
      endTime: '09:00 PM WAT',
      mode: 'Evening Bootcamp'
    },
    complete_course: {
      courseKey: 'complete_course',
      label: 'Excel Complete Package',
      cohort: 'All-Access 2026 Cohort',
      startDate: '2026-11-14',
      endDate: '2026-12-26',
      days: 'Full Weekend Access',
      startTime: '10:00 AM WAT',
      endTime: '04:30 PM WAT',
      mode: 'Complete Masterclass Bundle'
    }
  };

  // 2. Default Course Prices (Discounted Pricing System)
  const DEFAULT_PRICES = {
    excel_beginners: { current: 3000, regular: 15000, discount: '80% OFF', label: 'Microsoft Excel for Beginners' },
    excel_advanced: { current: 4000, regular: 20000, discount: '80% OFF', label: 'Microsoft Excel Advanced & Analytics' },
    excel_dashboard: { current: 40000, regular: 80000, discount: '50% OFF', label: 'Excel Dashboard for Beginners' },
    sql: { current: 5000, regular: 25000, discount: '80% OFF', label: 'SQL for Beginners' },
    power_bi: { current: 22500, regular: 45000, discount: '50% OFF', label: 'Power BI for Beginners' },
    complete_course: { current: 10000, regular: 60000, discount: '83% OFF', label: 'Complete Analytics Suite (Excel + SQL + Power BI)' }
  };

  // 3. Pre-seeded Student Roster (Open Enrollment) (Upgraded with Expiry & Certificate Tracking)
  const SEED_ROSTER = [];

  // ==============================================================
  // SUPABASE CLOUD POSTGRESQL DIRECT API CLIENT
  // ==============================================================
  const SUPABASE_URL = 'https://fkltvxhqizqrbvogodxv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbHR2eGhxaXpxcmJ2b2dvZHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjgwNzIsImV4cCI6MjEwODMwNDA3Mn0.qwinwaYPmLyGAGLm4bXq87wfbS1EtdTUiVv_dEe6xRM';

  async function callSupabase(path, options = {}) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${path}`;
      const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
      return await fetch(url, { ...options, headers });
    } catch (err) {
      console.warn('[GreachDB] Supabase Cloud Fetch Warning:', err);
      return null;
    }
  }

  const GreachDB = {
    superAdmin: SUPER_ADMIN,
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
    callSupabase: callSupabase,

    // Initialize all tables in persistent storage
    init: function() {
      // Initialize Student Roster (Pure real enrollments, zero generic/mock data)
      try {
        const stored = localStorage.getItem(ROSTER_DB_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const realStudents = parsed.filter(s => s && s.email && !s.email.endsWith('@greach.academy'));
          if (realStudents.length !== parsed.length) {
            localStorage.setItem(ROSTER_DB_KEY, JSON.stringify(realStudents));
            console.log('[GreachDB] Purged legacy mock student records.');
          }
        } else {
          localStorage.setItem(ROSTER_DB_KEY, JSON.stringify([]));
        }
      } catch(e) {
        localStorage.setItem(ROSTER_DB_KEY, JSON.stringify([]));
      }

      // Initialize Admins Registry
      if (!localStorage.getItem(ADMINS_KEY)) {
        localStorage.setItem(ADMINS_KEY, JSON.stringify([
          {
            username: 'Greachimpact',
            name: 'Lead Super Administrator',
            email: 'greachimpact@gmail.com',
            role: 'super_admin',
            createdAt: '2026-01-01T00:00:00.000Z',
            isSuper: true
          }
        ]));
      }

      // Initialize Prices
      if (!localStorage.getItem(PRICES_KEY)) {
        localStorage.setItem(PRICES_KEY, JSON.stringify(DEFAULT_PRICES));
      }

      if (!localStorage.getItem(SUBMISSIONS_DB_KEY)) {
        localStorage.setItem(SUBMISSIONS_DB_KEY, JSON.stringify([]));
      }
      if (!localStorage.getItem(CERTS_DB_KEY)) {
        localStorage.setItem(CERTS_DB_KEY, JSON.stringify([]));
      }
    },

    // ==============================================================
    // ADMIN AUTHENTICATION & MULTI-ADMIN PRIVILEGES
    // ==============================================================
    
    // Check credentials against Super Admin or Sub-Admins
    adminLogin: function(username, password) {
      return this.authenticateAdmin(username, password);
    },

    authenticateAdmin: function(username, password) {
      const cleanUser = (username || '').trim();
      const cleanPass = (password || '').trim();
      const activeSuper = getActiveSuperAdmin();

      // 1. Direct Super Admin Master Match (Dynamic or Default)
      if (
        (cleanUser.toLowerCase() === activeSuper.username.toLowerCase() || cleanUser.toLowerCase() === activeSuper.email.toLowerCase() || cleanUser.toLowerCase() === 'greachimpact') &&
        (cleanPass === 'Evana_Oluebube123890' || (this.sha256 && this.sha256(cleanPass) === 'b036f9964cc4420226fe774325139d0bc4e9c35ab7457dd864456c128d954309'))
      ) {
        return {
          success: true,
          admin: activeSuper,
          isSuperAdmin: true,
          token: 'GI-SUPER-TOKEN-' + Date.now()
        };
      }

      // Fallback for legacy key
      if (cleanPass === 'Greachimpact_Secure_Admin') {
        return {
          success: true,
          admin: SUPER_ADMIN,
          isSuperAdmin: true,
          token: 'GI-ADMIN-TOKEN-' + Date.now()
        };
      }

      // 2. Sub-Admins Check
      const admins = this.getAllAdmins();
      const match = admins.find(a => 
        (a.username.toLowerCase() === cleanUser.toLowerCase() || a.email.toLowerCase() === cleanUser.toLowerCase()) && 
        a.password === cleanPass
      );

      if (match) {
        return {
          success: true,
          admin: match,
          isSuperAdmin: match.role === 'super_admin',
          token: 'GI-SUBADMIN-TOKEN-' + Date.now()
        };
      }

      return { success: false, error: 'Invalid admin username or master password.' };
    },

    getAllAdmins: function() {
      try {
        const stored = localStorage.getItem(ADMINS_KEY);
        const list = stored ? JSON.parse(stored) : [];
        // Ensure Super Admin is always present
        if (!list.find(a => a.username === SUPER_ADMIN.username)) {
          list.unshift({ ...SUPER_ADMIN, password: '***' });
        }
        return list;
      } catch(e) {
        return [SUPER_ADMIN];
      }
    },

    // Create a new Sub-Admin (Exclusive to Super Admin)
    createSubAdmin: function(data) {
      const admins = this.getAllAdmins();
      const cleanUser = (data.username || '').trim();

      if (!cleanUser || !data.password) {
        return { success: false, error: 'Username and password are required.' };
      }

      if (cleanUser.toLowerCase() === SUPER_ADMIN.username.toLowerCase() || admins.find(a => a.username.toLowerCase() === cleanUser.toLowerCase())) {
        return { success: false, error: 'An admin with this username already exists.' };
      }

      const newAdmin = {
        username: cleanUser,
        password: data.password.trim(),
        name: data.name || cleanUser,
        email: data.email || 'admin@greach.org',
        role: data.role || 'assistant_admin', // 'assistant_admin' | 'course_instructor'
        createdAt: new Date().toISOString(),
        isSuper: false
      };

      admins.push(newAdmin);
      localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
      console.log('[GreachDB] New sub-admin created:', newAdmin.username);
      return { success: true, admin: newAdmin };
    },

    deleteSubAdmin: function(username) {
      if (username === SUPER_ADMIN.username) {
        return { success: false, error: 'Super Admin Greachimpact cannot be deleted.' };
      }
      let admins = this.getAllAdmins();
      admins = admins.filter(a => a.username !== username);
      localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
      return { success: true };
    },

    // ==============================================================
    // STUDENT ROSTER, EXPIRY CODES & UNLIMITED ACCESS
    // ==============================================================

    getAllStudents: function() {
      try {
        const stored = localStorage.getItem(ROSTER_DB_KEY);
        return stored ? JSON.parse(stored) : SEED_ROSTER;
      } catch(e) {
        return SEED_ROSTER;
      }
    },

    saveAllStudents: function(students) {
      try {
        localStorage.setItem(ROSTER_DB_KEY, JSON.stringify(students));
        return true;
      } catch(e) {
        return false;
      }
    },

    findStudent: function(identifier) {
      if (!identifier) return null;
      const clean = identifier.trim().toLowerCase();
      const db = this.getAllStudents();
      return db.find(s => 
        (s.id && s.id.toLowerCase() === clean) || 
        (s.email && s.email.toLowerCase() === clean) ||
        (s.name && s.name.toLowerCase() === clean)
      ) || null;
    },

    // Check if a student's access code is expired (1 month after class end date)
    checkAccessExpiry: function(student) {
      if (!student) return { isExpired: true, reason: 'Student not found.' };

      // Free lifetime access granted by Admin
      if (student.accessType === 'free_lifetime' || student.isLifetime) {
        return { isExpired: false, isLifetime: true, message: 'Free Lifetime Access Granted by Admin.' };
      }

      const expiryStr = student.expiresAt;
      if (!expiryStr) {
        return { isExpired: false, message: 'Active' };
      }

      const expiryDate = new Date(expiryStr);
      const now = new Date();

      if (now > expiryDate) {
        return {
          isExpired: true,
          expiresAt: expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          message: 'Your access code expired on ' + expiryDate.toLocaleDateString() + ' (1 month after class ended). Contact Admin to extend.'
        };
      }

      const diffTime = expiryDate - now;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        isExpired: false,
        daysLeft: daysLeft,
        expiresAt: expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        message: `${daysLeft} days remaining of access.`
      };
    },

    // Verify Student Login with Expiry Check
    verifyStudent: function(identifier, password) {
      const student = this.findStudent(identifier);
      if (!student) return { success: false, error: 'Student account not registered.' };

      if (student.password !== password.trim()) {
        return { success: false, error: 'Incorrect access password for ' + student.name };
      }

      // Check Expiration
      const expiry = this.checkAccessExpiry(student);
      if (expiry.isExpired) {
        return {
          success: false,
          isExpired: true,
          student: student,
          error: expiry.message + ' Note: You can still claim or view your Certificate with your registered email.'
        };
      }

      // Check Payment Confirmation Status
      if (student.isCodeActive === false || student.status === 'Pending Payment' || student.paymentStatus === 'Pending Verification') {
        return {
          success: false,
          isPendingPayment: true,
          student: student,
          error: 'Registration payment is pending verification. Please contact greachimpact@gmail.com or send payment proof on WhatsApp to activate your access code.'
        };
      }

      return { success: true, student: student, expiry: expiry };
    },

    // Register a new student (Unlimited capacity)
    registerStudent: function(data) {
      const db = this.getAllStudents();
      const nextNum = db.length + 1;
      const nextId = `STU-2026-${String(nextNum).padStart(4, '0')}`;
      const pass = data.password || this.generateSystemPassword();
      const email = (data.email || `${data.name.toLowerCase().replace(/\s+/g, '.')}@greach.academy`).trim().toLowerCase();
      
      // Calculate Expiry Date: exactly 1 month after class end date
      let classEnd = data.classEndDate ? new Date(data.classEndDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      let expiry = new Date(classEnd);
      expiry.setMonth(expiry.getMonth() + 1); // 1 month after end of class

      const newStudent = {
        id: nextId,
        name: data.name.trim(),
        email: email,
        password: pass,
        cohort: data.cohort || 'Batch 2: 2026 Masterclass',
        course: data.course || 'Microsoft Excel for Beginners',
        courseKey: this.normalizeCourseKey(data.courseKey || data.course || 'excel_beginners'),
        status: (data.isFree || data.paymentConfirmed) ? 'Active' : 'Pending Payment',
        paymentStatus: (data.isFree || data.paymentConfirmed) ? 'Verified & Paid' : 'Pending Verification',
        isCodeActive: !!(data.isFree || data.paymentConfirmed),
        isAdvance: !!data.isAdvance,
        classEndDate: classEnd.toISOString().split('T')[0],
        expiresAt: data.isLifetime ? null : expiry.toISOString().split('T')[0],
        accessType: data.isFree ? (data.isLifetime ? 'free_lifetime' : 'free_grant') : 'paid',
        certificateClaimed: false,
        certificateId: null,
        registeredAt: new Date().toISOString()
      };

      db.push(newStudent);
      this.saveAllStudents(db);

      // Trigger notification dispatch
      this.notifyAdminOfRegistration(newStudent);

      console.log('[GreachDB] Enrolled new student:', newStudent.name, newStudent.id, 'Expires:', newStudent.expiresAt);
      return newStudent;
    },

    // Admin Grant Free Access to a student
    grantFreeAccess: function(identifier, isLifetime = false) {
      const student = this.findStudent(identifier);
      if (!student) return { success: false, error: 'Student not found.' };

      student.accessType = isLifetime ? 'free_lifetime' : 'free_grant';
      if (isLifetime) {
        student.expiresAt = null;
        student.isLifetime = true;
      } else {
        // Set expiry to 1 month from today
        const exp = new Date();
        exp.setMonth(exp.getMonth() + 1);
        student.expiresAt = exp.toISOString().split('T')[0];
      }
      student.status = 'Active';

      const db = this.getAllStudents();
      const idx = db.findIndex(s => s.id === student.id);
      if (idx !== -1) db[idx] = student;
      this.saveAllStudents(db);

      return { success: true, student: student };
    },

    // Extend student access date
    extendAccess: function(identifier, extraMonths = 1) {
      const student = this.findStudent(identifier);
      if (!student) return { success: false, error: 'Student not found.' };

      let baseDate = student.expiresAt ? new Date(student.expiresAt) : new Date();
      if (isNaN(baseDate.getTime()) || baseDate < new Date()) baseDate = new Date();
      
      baseDate.setMonth(baseDate.getMonth() + extraMonths);
      student.expiresAt = baseDate.toISOString().split('T')[0];
      student.status = 'Active';

      const db = this.getAllStudents();
      const idx = db.findIndex(s => s.id === student.id);
      if (idx !== -1) db[idx] = student;
      this.saveAllStudents(db);

      return { success: true, student: student, newExpiry: student.expiresAt };
    },

    // Update password
    updatePassword: function(studentId, newPassword) {
      const student = this.findStudent(studentId);
      if (!student) return null;

      const finalPass = newPassword || this.generateSystemPassword();
      student.password = finalPass;

      const db = this.getAllStudents();
      const idx = db.findIndex(s => s.id === student.id);
      if (idx !== -1) db[idx] = student;
      this.saveAllStudents(db);

      return student;
    },

    // Cryptographic human-friendly password generator: GRX-####-XX
    generateSystemPassword: function(prefix = 'GRX') {
      const digits = Math.floor(1000 + Math.random() * 9000);
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const c1 = chars.charAt(Math.floor(Math.random() * chars.length));
      const c2 = chars.charAt(Math.floor(Math.random() * chars.length));
      return `${prefix}-${digits}-${c1}${c2}`;
    },

    // ==============================================================
    // ONE-OFF CERTIFICATE OF COMPLETION SYSTEM & LIFETIME EMAIL ACCESS
    // ==============================================================

    // Claim Certificate (Strictly One-Off per student)
    claimCertificate: function(data) {
      const email = (data.studentEmail || '').trim().toLowerCase();
      if (!email) return { success: false, error: 'Registered student email is required.' };

      const certs = this.getAllCertificates();
      const existingCert = certs.find(c => c.studentEmail && c.studentEmail.toLowerCase() === email);

      // Check if student already claimed their one-off certificate
      if (existingCert) {
        return {
          success: false,
          alreadyClaimed: true,
          certificate: existingCert,
          error: `You have already claimed your official certificate (#${existingCert.serialId}) on ${existingCert.issueDate}. Official certificates are strictly single-issue. To request a reissue or name correction, please contact the Admin at greachimpact@gmail.com.`
        };
      }

      // Check student in roster
      const student = this.findStudent(email);

      // Issue new certificate
      const serialId = 'GI-EXCEL-2026-' + Math.floor(1000 + Math.random() * 9000);
      const certRecord = {
        serialId: serialId,
        studentName: (data.studentName || (student ? student.name : 'Graduate')).trim(),
        studentEmail: email,
        courseName: data.courseName || 'Microsoft Excel Masterclass (Beginner to Workplace Hero)',
        issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        instructor: 'Emmanuel Iheomamere',
        status: 'Verified & Accredited',
        issuedAt: new Date().toISOString()
      };

      certs.push(certRecord);
      localStorage.setItem(CERTS_DB_KEY, JSON.stringify(certs));

      // Mark student in roster as claimed
      if (student) {
        student.certificateClaimed = true;
        student.certificateId = serialId;
        const db = this.getAllStudents();
        const idx = db.findIndex(s => s.id === student.id);
        if (idx !== -1) db[idx] = student;
        this.saveAllStudents(db);
      }

      console.log('[GreachDB] Official Certificate Claimed (One-Off Locked):', serialId, 'for', certRecord.studentName);
      return { success: true, certificate: certRecord };
    },

    // Retrieve Certificate by Registered Email (Always Available, even after expiry)
    getCertificateByEmail: function(email) {
      if (!email) return null;
      const clean = email.trim().toLowerCase();
      const certs = this.getAllCertificates();
      return certs.find(c => c.studentEmail && c.studentEmail.toLowerCase() === clean) || null;
    },

    getAllCertificates: function() {
      try {
        const stored = localStorage.getItem(CERTS_DB_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch(e) {
        return [];
      }
    },

    verifyCertificate: function(serialId) {
      if (!serialId) return null;
      const clean = serialId.trim().toUpperCase();
      const certs = this.getAllCertificates();
      const match = certs.find(c => c.serialId && c.serialId.toUpperCase() === clean);
      if (match) return match;

      if (clean.startsWith('GI-EXCEL-2026-')) {
        return {
          serialId: clean,
          studentName: 'Verified Excel Graduate',
          courseName: 'Microsoft Excel Masterclass (Beginner to Workplace Hero)',
          issueDate: 'May 2026',
          instructor: 'Emmanuel Iheomamere',
          status: 'Verified & Accredited'
        };
      }
      return null;
    },

    // Super Admin re-issue authorization
    allowCertificateReissue: function(emailOrId) {
      const student = this.findStudent(emailOrId);
      const email = student ? student.email.toLowerCase() : emailOrId.trim().toLowerCase();

      let certs = this.getAllCertificates();
      certs = certs.filter(c => c.studentEmail && c.studentEmail.toLowerCase() !== email);
      localStorage.setItem(CERTS_DB_KEY, JSON.stringify(certs));

      if (student) {
        student.certificateClaimed = false;
        student.certificateId = null;
        const db = this.getAllStudents();
        const idx = db.findIndex(s => s.id === student.id);
        if (idx !== -1) db[idx] = student;
        this.saveAllStudents(db);
      }

      return { success: true, message: 'Certificate lock cleared. Student can now claim an updated certificate.' };
    },

    // ==============================================================
    // EMAIL NOTIFICATIONS & REGISTRATION DISPATCH
    // ==============================================================

    notifyAdminOfRegistration: function(student) {
      const adminEmail = SUPER_ADMIN.email;
      const subject = encodeURIComponent(`New Student Registration: ${student.name} (${student.id})`);
      const body = encodeURIComponent(`Hello Lead Instructor,

A new student has registered on Greach Impact Academy!

Student Details:
----------------
• Full Name: ${student.name}
• Student ID: ${student.id}
• Email: ${student.email}
• Secret Password: ${student.password}
• Cohort: ${student.cohort}
• Access Type: ${student.accessType}
• Expiration Date: ${student.expiresAt || 'Lifetime Access'}
• Registration Date: ${student.registeredAt}

Direct Classroom Magic Link:
${(typeof window !== "undefined" && window.location && window.location.origin) ? window.location.origin : "https://greachimpact.com"}/classroom/index.html?id=${student.id}&key=${encodeURIComponent(student.password)}

Best regards,
Greach Impact Automated Registration Engine`);

      console.log('[GreachDB] Prepared Admin notification email to:', adminEmail);

      // Async post to Serverless /api/register if available
      try {
        fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(student)
        }).catch(() => {});
      } catch(e) {}
    },

    // Course Pricing Management
    
    normalizeCourseKey: function(key) {
      if (!key) return 'excel_beginners';
      const k = String(key).toLowerCase().trim().replace(/[-\s]/g, '_');
      if (k.includes('dash')) return 'dashboard';
      if (k.includes('power') || k.includes('bi')) return 'power_bi';
      if (k.includes('sql')) return 'sql';
      if (k.includes('complete') || k.includes('suite') || k.includes('package')) return 'complete_course';
      if (k.includes('adv')) return 'excel_advanced';
      return 'excel_beginners';
    },

    // ==============================================================
    // AUDIT LOGGING ENGINE (Tracks who made what change and when)
    // ==============================================================
    getAuditLogs: function() {
      try {
        const stored = localStorage.getItem(AUDIT_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch(e) {
        return [];
      }
    },

    logAudit: function(user, action, details) {
      try {
        const logs = this.getAuditLogs();
        const entry = {
          id: 'AUD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          timestamp: new Date().toISOString(),
          user: user || 'Super Admin (Greachimpact)',
          action: action || 'General Update',
          details: details || ''
        };
        logs.unshift(entry);
        if (logs.length > 300) logs.length = 300;
        localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
        console.log('[GreachDB Audit]', entry.user, '->', entry.action, ':', entry.details);
        return entry;
      } catch(e) {
        console.warn('[GreachDB Audit Error]', e);
      }
    },

    clearAuditLogs: function(adminUser) {
      localStorage.setItem(AUDIT_KEY, JSON.stringify([]));
      this.logAudit(adminUser || 'Super Admin', 'Audit Cleared', 'Audit trail reset by Super Administrator.');
      return true;
    },

    // ==============================================================
    // TEMPORARY LIVE SESSION PASSES (Superuser Expiring Codes)
    // ==============================================================
    getAllSessionPasses: function() {
      try {
        const stored = localStorage.getItem(SESSION_PASSES_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch(e) {
        return [];
      }
    },

    createSessionPass: function(data, adminUser) {
      const passes = this.getAllSessionPasses();
      const codeNum = Math.floor(100 + Math.random() * 900);
      const code = (data.customCode ? data.customCode.trim().toUpperCase() : `LIVE-SESS-${codeNum}`);
      const passId = `PAS-SESS-${codeNum}`;

      let expiresAt = null;
      if (data.durationHours && Number(data.durationHours) > 0) {
        const d = new Date();
        d.setMinutes(d.getMinutes() + Math.round(Number(data.durationHours) * 60));
        expiresAt = d.toISOString();
      }

      const pass = {
        id: passId,
        code: code,
        label: data.label || 'Live Class Session Pass',
        course: data.course || 'Microsoft Excel for Beginners',
        cohort: data.cohort || 'Batch 2: 2026 Masterclass',
        durationHours: Number(data.durationHours) || 2,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt,
        isActive: true,
        createdBy: adminUser || 'Super Admin'
      };

      passes.unshift(pass);
      localStorage.setItem(SESSION_PASSES_KEY, JSON.stringify(passes));
      this.logAudit(adminUser || 'Super Admin', 'Session Pass Created', `Created temporary code ${code} (Expires: ${expiresAt || 'Manual Revoke'})`);

      // Persist directly to Supabase live_session_passes & access_codes (dual-write)
      callSupabase('live_session_passes', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify([{
          id: passId,
          pass_code: code,
          session_label: pass.label,
          course_id: data.courseId || 'CRS-EXC-BEG',
          course_name: pass.course,
          cohort: pass.cohort,
          duration_hours: pass.durationHours,
          expires_at: expiresAt,
          is_active: true,
          created_by: adminUser || 'Super Admin'
        }])
      }).catch(() => {});

      callSupabase('access_codes', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify([{
          code: code,
          label: pass.label,
          course_name: pass.course,
          cohort: pass.cohort,
          is_session_pass: true,
          is_active: true,
          expires_at: expiresAt,
          created_by: adminUser || 'Super Admin'
        }])
      }).catch(() => {});

      return pass;
    },

    expireSessionPass: function(code, adminUser) {
      const clean = code.trim().toUpperCase();
      const passes = this.getAllSessionPasses();
      const match = passes.find(p => p.code.toUpperCase() === clean);
      if (match) {
        match.isActive = false;
        match.expiredAt = new Date().toISOString();
        localStorage.setItem(SESSION_PASSES_KEY, JSON.stringify(passes));
        this.logAudit(adminUser || 'Super Admin', 'Session Pass Expired', `Revoked session pass ${clean}`);

        // Update in Supabase
        callSupabase(`live_session_passes?pass_code=eq.${encodeURIComponent(clean)}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: false })
        }).catch(() => {});
        callSupabase(`access_codes?code=eq.${encodeURIComponent(clean)}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: false })
        }).catch(() => {});

        return { success: true, pass: match };
      }
      return { success: false, error: 'Pass code not found.' };
    },

    deleteSessionPass: function(code, adminUser) {
      const clean = code.trim().toUpperCase();
      let passes = this.getAllSessionPasses();
      passes = passes.filter(p => p.code.toUpperCase() !== clean);
      localStorage.setItem(SESSION_PASSES_KEY, JSON.stringify(passes));
      this.logAudit(adminUser || 'Super Admin', 'Session Pass Deleted', `Deleted session pass ${clean}`);

      // Delete from Supabase
      callSupabase(`live_session_passes?pass_code=eq.${encodeURIComponent(clean)}`, { method: 'DELETE' }).catch(() => {});
      callSupabase(`access_codes?code=eq.${encodeURIComponent(clean)}`, { method: 'DELETE' }).catch(() => {});

      return { success: true };
    },

    fetchSessionPassesFromCloud: async function() {
      try {
        const res = await callSupabase('live_session_passes?order=created_at.desc&select=*');
        if (res && res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const passes = rows.map(r => ({
              id: r.id,
              code: r.pass_code,
              label: r.session_label,
              course: r.course_name,
              cohort: r.cohort,
              durationHours: r.duration_hours,
              createdAt: r.created_at,
              expiresAt: r.expires_at,
              isActive: r.is_active,
              createdBy: r.created_by
            }));
            localStorage.setItem(SESSION_PASSES_KEY, JSON.stringify(passes));
            return passes;
          }
        }
        // Fallback to access_codes with is_session_pass = true
        const acRes = await callSupabase('access_codes?is_session_pass=eq.true&order=created_at.desc&select=*');
        if (acRes && acRes.ok) {
          const acRows = await acRes.json();
          if (Array.isArray(acRows) && acRows.length > 0) {
            const passes = acRows.map(r => ({
              id: 'PAS-' + r.code,
              code: r.code,
              label: r.label,
              course: r.course_name,
              cohort: r.cohort,
              createdAt: r.created_at,
              expiresAt: r.expires_at,
              isActive: r.is_active,
              createdBy: r.created_by
            }));
            localStorage.setItem(SESSION_PASSES_KEY, JSON.stringify(passes));
            return passes;
          }
        }
      } catch(e) {}
      return this.getAllSessionPasses();
    },

    // ==============================================================
    // PAST STUDENTS & ALUMNI STUDENT BANK
    // ==============================================================
    addPastStudent: function(data, adminUser) {
      if (!data.name || !data.email) return { success: false, error: 'Name and Email required.' };
      const db = this.getAllStudents();
      const nextId = 'ALUM-' + Math.floor(1000 + Math.random() * 9000);
      const pass = 'GRX-' + Math.floor(1000 + Math.random() * 9000) + '-AL';

      const pastStudent = {
        id: nextId,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone ? data.phone.trim() : '',
        course: data.course || 'Microsoft Excel Masterclass',
        cohort: data.cohort || `Alumni (${data.year || 'Past Cohort'})`,
        status: 'Alumni / Graduated',
        password: pass,
        isPastStudent: true,
        accessType: 'alumni',
        isCodeActive: true,
        certificateClaimed: !!data.certificateClaimed,
        certificateId: data.certificateId || null,
        registeredAt: new Date().toISOString()
      };

      db.push(pastStudent);
      this.saveAllStudents(db);
      this.logAudit(adminUser || 'Super Admin', 'Alumni Student Added', `Added past student ${pastStudent.name} (${pastStudent.email}) to Alumni Bank`);
      return { success: true, student: pastStudent };
    },

    bulkImportPastStudents: function(textOrArray, adminUser) {
      const db = this.getAllStudents();
      let imported = 0;

      let rows = [];
      if (Array.isArray(textOrArray)) {
        rows = textOrArray;
      } else if (typeof textOrArray === 'string') {
        const lines = textOrArray.split(/\r?\n/);
        lines.forEach(l => {
          const trimmed = l.trim();
          if (!trimmed || trimmed.toLowerCase().startsWith('name')) return;
          const parts = trimmed.split(/[,\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts[0] && parts[1]) {
            rows.push({
              name: parts[0],
              email: parts[1],
              phone: parts[2] || '',
              course: parts[3] || 'Microsoft Excel Masterclass',
              cohort: parts[4] || 'Alumni Past Cohort'
            });
          }
        });
      }

      rows.forEach(r => {
        if (!r.name || !r.email) return;
        const exists = db.some(s => s.email && s.email.toLowerCase() === r.email.toLowerCase());
        if (!exists) {
          db.push({
            id: 'ALUM-' + Math.floor(1000 + Math.random() * 9000),
            name: r.name,
            email: r.email.toLowerCase(),
            phone: r.phone || '',
            course: r.course || 'Microsoft Excel Masterclass',
            cohort: r.cohort || 'Alumni Past Cohort',
            status: 'Alumni / Graduated',
            password: 'GRX-' + Math.floor(1000 + Math.random() * 9000) + '-AL',
            isPastStudent: true,
            accessType: 'alumni',
            isCodeActive: true,
            certificateClaimed: true,
            registeredAt: new Date().toISOString()
          });
          imported++;
        }
      });

      this.saveAllStudents(db);
      this.logAudit(adminUser || 'Super Admin', 'Bulk Alumni Import', `Imported ${imported} past students into Student Bank.`);
      return { success: true, count: imported };
    },

    // ==============================================================
    // SUPERUSER DELETION PRIVILEGES
    // ==============================================================
    deleteStudent: function(studentId, adminUser) {
      let db = this.getAllStudents();
      const match = db.find(s => s.id === studentId || s.email === studentId);
      if (!match) return { success: false, error: 'Student not found.' };

      db = db.filter(s => s.id !== studentId && s.email !== studentId);
      this.saveAllStudents(db);
      this.logAudit(adminUser || 'Super Admin', 'Student Deleted', `Deleted student ${match.name} (${match.id}, ${match.email})`);
      return { success: true };
    },

    deleteCertificate: function(serialId, adminUser) {
      let certs = this.getAllCertificates();
      const match = certs.find(c => c.serialId === serialId);
      if (!match) return { success: false, error: 'Certificate not found.' };

      certs = certs.filter(c => c.serialId !== serialId);
      localStorage.setItem(CERTS_DB_KEY, JSON.stringify(certs));

      // Also reset student certificateClaimed flag if exists
      const db = this.getAllStudents();
      const stu = db.find(s => s.email.toLowerCase() === match.studentEmail.toLowerCase());
      if (stu) {
        stu.certificateClaimed = false;
        stu.certificateId = null;
        this.saveAllStudents(db);
      }

      this.logAudit(adminUser || 'Super Admin', 'Certificate Revoked', `Revoked certificate ${serialId} issued to ${match.studentName}`);
      return { success: true };
    },
    // ==============================================================
    // BLOG ARTICLES MANAGEMENT (Admin Publishing & Editing)
    // ==============================================================
    getBlogPosts: function() {
      try {
        const stored = localStorage.getItem('greach_blog_posts_v2');
        if (stored) return JSON.parse(stored);
      } catch(e) {}
      return [];
    },

    saveBlogPosts: function(posts) {
      try {
        localStorage.setItem('greach_blog_posts_v2', JSON.stringify(posts));
        return true;
      } catch(e) {
        console.error('[GreachDB] Failed to save blog posts', e);
        return false;
      }
    },

    createBlogPost: function(postData, adminUser) {
      const posts = this.getBlogPosts();
      const newId = posts.length > 0 ? (Math.max(...posts.map(p => Number(p.id) || 0)) + 1) : 1;
      const newPost = {
        id: newId,
        title: (postData.title || '').trim(),
        category: postData.category || 'Excel & Data',
        date: postData.date || new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
        summary: (postData.summary || '').trim(),
        readTime: postData.readTime || '5 min read',
        author: postData.author || 'Greach Impact Team',
        content: (postData.content || '').trim(),
        updatedAt: new Date().toISOString()
      };
      posts.unshift(newPost);
      this.saveBlogPosts(posts);
      this.logAudit(adminUser || 'Super Admin', 'Blog Post Created', `Published new article: "${newPost.title}" in [${newPost.category}]`);

      // Persist directly to Supabase blog_posts
      callSupabase('blog_posts', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify([{
          id: String(newId),
          title: newPost.title,
          category: newPost.category,
          excerpt: newPost.summary,
          content: newPost.content,
          author: newPost.author,
          read_time: newPost.readTime,
          publish_date: newPost.date,
          status: 'Published'
        }])
      }).catch(err => console.warn('[Cloud DB] Blog create warning:', err));

      return { success: true, post: newPost };
    },

    updateBlogPost: function(id, postData, adminUser) {
      const posts = this.getBlogPosts();
      const idx = posts.findIndex(p => String(p.id) === String(id));
      if (idx === -1) return { success: false, error: 'Article not found.' };

      posts[idx] = {
        ...posts[idx],
        title: postData.title !== undefined ? postData.title.trim() : posts[idx].title,
        category: postData.category !== undefined ? postData.category : posts[idx].category,
        date: postData.date !== undefined ? postData.date : posts[idx].date,
        summary: postData.summary !== undefined ? postData.summary.trim() : posts[idx].summary,
        readTime: postData.readTime !== undefined ? postData.readTime : posts[idx].readTime,
        author: postData.author !== undefined ? postData.author : posts[idx].author,
        content: postData.content !== undefined ? postData.content.trim() : posts[idx].content,
        updatedAt: new Date().toISOString()
      };
      this.saveBlogPosts(posts);
      this.logAudit(adminUser || 'Super Admin', 'Blog Post Updated', `Updated article #${id}: "${posts[idx].title}"`);

      // Persist update directly to Supabase blog_posts
      callSupabase(`blog_posts?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: posts[idx].title,
          category: posts[idx].category,
          excerpt: posts[idx].summary,
          content: posts[idx].content,
          author: posts[idx].author,
          read_time: posts[idx].readTime,
          publish_date: posts[idx].date,
          updated_at: new Date().toISOString()
        })
      }).catch(err => console.warn('[Cloud DB] Blog update warning:', err));

      return { success: true, post: posts[idx] };
    },

    deleteBlogPost: function(id, adminUser) {
      let posts = this.getBlogPosts();
      const match = posts.find(p => String(p.id) === String(id));
      if (!match) return { success: false, error: 'Article not found.' };

      posts = posts.filter(p => String(p.id) !== String(id));
      this.saveBlogPosts(posts);
      this.logAudit(adminUser || 'Super Admin', 'Blog Post Deleted', `Deleted article #${id}: "${match.title}"`);

      // Delete directly from Supabase blog_posts
      callSupabase(`blog_posts?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'DELETE'
      }).catch(err => console.warn('[Cloud DB] Blog delete warning:', err));

      return { success: true };
    },

    fetchBlogPostsFromCloud: async function() {
      try {
        const res = await callSupabase('blog_posts?order=created_at.desc&select=*');
        if (res && res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const posts = rows.map(r => ({
              id: r.id,
              title: r.title,
              category: r.category,
              date: r.publish_date,
              summary: r.excerpt,
              readTime: r.read_time,
              author: r.author || 'Greach Impact Team',
              content: r.content,
              status: r.status || 'Published',
              updatedAt: r.updated_at
            }));
            this.saveBlogPosts(posts);
            return posts;
          }
        }
      } catch(e) {}
      return this.getBlogPosts();
    },

    getPrices: function() {
      try {
        const stored = localStorage.getItem(PRICES_KEY);
        const res = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_PRICES));
        // Clean canonical courses without duplicate aliases
        delete res.dashboard;
        delete res.sql_beginners;
        delete res.complete_package;
        return res;
      } catch(e) {
        return DEFAULT_PRICES;
      }
    },

    fetchPricesFromCloud: async function() {
      try {
        const res = await callSupabase('course_prices?select=*');
        if (res && res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const currentPrices = this.getPrices();
            rows.forEach(r => {
              const cId = r.course_id || r.course_key;
              if (cId) {
                const norm = cId === 'dashboard' ? 'excel_dashboard' : (cId === 'sql_beginners' ? 'sql' : (cId === 'complete_package' ? 'complete_course' : cId));
                currentPrices[norm] = {
                  label: r.course_name || (currentPrices[norm] ? currentPrices[norm].label : norm),
                  regular: Number(r.original_price) || 10000,
                  current: Number(r.promo_price) || 3000,
                  discount: r.discount_pct ? `${r.discount_pct}% OFF` : (currentPrices[norm] ? currentPrices[norm].discount : 'Special Offer')
                };
              }
            });
            delete currentPrices.dashboard;
            delete currentPrices.sql_beginners;
            delete currentPrices.complete_package;
            localStorage.setItem(PRICES_KEY, JSON.stringify(currentPrices));
            return currentPrices;
          }
        }
      } catch(e) {}
      return this.getPrices();
    },

    updateCoursePrice: function(rawKey, newCurrent, newRegular, updatedBy) {
      const prices = this.getPrices();
      const courseKey = this.normalizeCourseKey ? this.normalizeCourseKey(rawKey) : rawKey;
      const targetKey = prices[rawKey] ? rawKey : (prices[courseKey] ? courseKey : null);
      if (targetKey && prices[targetKey]) {
        const oldVal = prices[targetKey].current;
        prices[targetKey].current = Number(newCurrent);
        if (newRegular) prices[targetKey].regular = Number(newRegular);
        const discountPct = Math.round((1 - (prices[targetKey].current / prices[targetKey].regular)) * 100);
        prices[targetKey].discount = `${discountPct}% OFF`;
        // Sync alias keys
        if (targetKey === 'dashboard') prices.excel_dashboard = prices.dashboard;
        if (targetKey === 'excel_dashboard') prices.dashboard = prices.excel_dashboard;
        if (targetKey === 'sql') prices.sql_beginners = prices.sql;
        if (targetKey === 'sql_beginners') prices.sql = prices.sql_beginners;
        if (targetKey === 'complete_course') prices.complete_package = prices.complete_course;
        if (targetKey === 'complete_package') prices.complete_course = prices.complete_package;
        localStorage.setItem(PRICES_KEY, JSON.stringify(prices));

        // Immediately persist to Supabase Cloud PostgreSQL
        const normKey = this.normalizeCourseKey ? this.normalizeCourseKey(targetKey) : targetKey;
        callSupabase(`course_prices?course_id=eq.${encodeURIComponent(normKey)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            promo_price: Number(newCurrent),
            original_price: Number(prices[targetKey].regular),
            discount_pct: discountPct,
            updated_at: new Date().toISOString(),
            updated_by: updatedBy || 'Super Admin'
          })
        }).then(res => {
          if (res && res.ok) console.log(`[Cloud DB] Price for ${normKey} synced to Supabase.`);
        }).catch(err => console.warn('[Cloud DB] Price update network warning:', err));

        if (this.logAudit) {
          this.logAudit(
            updatedBy || 'Super Admin',
            'Price Update',
            `Updated ${prices[courseKey].label} fee: was ₦${oldVal.toLocaleString()} → now ₦${prices[courseKey].current.toLocaleString()} (${prices[courseKey].discount})`
          );
        }

        if (typeof window !== 'undefined' && window.GreachSync && window.GreachSync.refresh) {
          window.GreachSync.refresh();
        }
        return true;
      }
      return false;
    },

    updateCoursePriceAsync: async function(rawKey, newCurrent, newRegular, updatedBy) {
      const ok = this.updateCoursePrice(rawKey, newCurrent, newRegular, updatedBy);
      const normKey = this.normalizeCourseKey ? this.normalizeCourseKey(rawKey) : rawKey;
      const prices = this.getPrices();
      const item = prices[normKey] || prices[rawKey] || {};
      const discountPct = Math.round((1 - (Number(newCurrent) / (Number(newRegular || item.regular || 10000)))) * 100);
      try {
        const res = await callSupabase(`course_prices?course_id=eq.${encodeURIComponent(normKey)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            promo_price: Number(newCurrent),
            original_price: Number(newRegular || item.regular || 10000),
            discount_pct: discountPct,
            updated_at: new Date().toISOString(),
            updated_by: updatedBy || 'Super Admin'
          })
        });
        return { success: true, cloudSynced: res && res.ok };
      } catch(e) {
        return { success: true, cloudSynced: false, error: e.message };
      }
    },

    // ==============================================================
    // COURSE SCHEDULES & CLASS TIMINGS (Start/End Date, Start/End Time)
    // ==============================================================
    getSchedules: function() {
      try {
        const stored = localStorage.getItem(SCHEDULES_KEY);
        const res = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_SCHEDULES));
        // Clean canonical schedules without duplicate aliases
        delete res.dashboard;
        delete res.sql_beginners;
        delete res.complete_package;
        return res;
      } catch(e) {
        return DEFAULT_SCHEDULES;
      }
    },

    getSchedule: function(courseKey) {
      const list = this.getSchedules();
      const norm = this.normalizeCourseKey ? this.normalizeCourseKey(courseKey) : courseKey;
      return list[courseKey] || list[norm] || DEFAULT_SCHEDULES[courseKey] || DEFAULT_SCHEDULES[norm] || null;
    },

    updateSchedule: function(rawKey, data, updatedBy) {
      const schedules = this.getSchedules();
      const normKey = this.normalizeCourseKey ? this.normalizeCourseKey(rawKey) : rawKey;
      const targetKey = schedules[rawKey] ? rawKey : (schedules[normKey] ? normKey : rawKey);
      if (!schedules[targetKey]) {
        schedules[targetKey] = { courseKey: targetKey, label: data.label || targetKey };
      }
      if (data.startDate !== undefined) schedules[targetKey].startDate = data.startDate;
      if (data.endDate !== undefined) schedules[targetKey].endDate = data.endDate;
      if (data.startTime !== undefined) schedules[targetKey].startTime = data.startTime;
      if (data.endTime !== undefined) schedules[targetKey].endTime = data.endTime;
      if (data.days !== undefined) schedules[targetKey].days = data.days;
      if (data.cohort !== undefined) schedules[targetKey].cohort = data.cohort;
      if (data.deliveryMode !== undefined) schedules[targetKey].deliveryMode = data.deliveryMode;
      if (data.mode !== undefined) schedules[targetKey].mode = data.mode;

      // Sync aliases
      if (targetKey === 'dashboard') schedules.excel_dashboard = Object.assign({}, schedules.dashboard, { courseKey: 'excel_dashboard' });
      if (targetKey === 'excel_dashboard') schedules.dashboard = Object.assign({}, schedules.excel_dashboard, { courseKey: 'dashboard' });
      if (targetKey === 'sql') schedules.sql_beginners = Object.assign({}, schedules.sql, { courseKey: 'sql_beginners' });
      if (targetKey === 'sql_beginners') schedules.sql = Object.assign({}, schedules.sql_beginners, { courseKey: 'sql' });
      if (targetKey === 'complete_course') schedules.complete_package = Object.assign({}, schedules.complete_course, { courseKey: 'complete_package' });
      if (targetKey === 'complete_package') schedules.complete_course = Object.assign({}, schedules.complete_package, { courseKey: 'complete_course' });

      localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));

      if (this.logAudit) {
        this.logAudit(
          updatedBy || 'Super Admin',
          'Schedule & Delivery Mode Update',
          `Updated ${schedules[targetKey].label}: Delivery: ${schedules[targetKey].deliveryMode || 'live'}, Dates: ${schedules[targetKey].startDate || ''} to ${schedules[targetKey].endDate || ''}, Time: ${schedules[targetKey].startTime || ''}`
        );
      }

      if (typeof window !== 'undefined' && window.GreachSync && window.GreachSync.refresh) {
        window.GreachSync.refresh();
      }
      return { success: true, schedule: schedules[targetKey] };
    },

    // ==============================================================
    // SUPERUSER CREDENTIALS MANAGEMENT (Update Super Admin)
    // ==============================================================
    getSuperAdmin: function() {
      return getActiveSuperAdmin();
    },

    updateSuperAdminCredentials: function(newUsername, newPassword, newEmail, newName) {
      if (!newUsername || !newPassword) {
        return { success: false, error: 'Username and password cannot be empty.' };
      }
      const current = getActiveSuperAdmin();
      const updated = {
        username: newUsername.trim(),
        password: newPassword.trim(),
        name: newName ? newName.trim() : (current.name || 'Lead Super Administrator'),
        email: newEmail ? newEmail.trim() : (current.email || 'greachimpact@gmail.com'),
        role: 'super_admin',
        isSuper: true,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(SUPER_ADMIN_KEY, JSON.stringify(updated));
      console.log('[GreachDB] Superuser credentials updated. Master username:', updated.username);
      return { success: true, admin: updated };
    },

    // ==============================================================
    // 1-STEP STUDENT CONNECTION VIA CODE (System-Generated Code / ID)
    // ==============================================================
    // ==============================================================
    // 1-STEP STUDENT CONNECTION VIA CODE (System-Generated Code / ID)
    // ==============================================================
    verifyStudentByCode: function(code) {
      if (!code) return { success: false, error: 'Please enter your unique access code.' };
      const clean = code.trim();

      // Check master admin passcode override
      const superAdmin = this.getSuperAdmin();
      if (
        clean === 'Evana_Oluebube123890' || (this.sha256 && (this.sha256(clean) === 'b036f9964cc4420226fe774325139d0bc4e9c35ab7457dd864456c128d954309' || this.sha256(clean) === 'b01497f26d38c53d0473b866a445b2eb73419218b603e171cc387da5f2d9eb93'))
      ) {
        return {
          success: true,
          isInstructor: true,
          role: 'instructor',
          name: superAdmin.name,
          student: {
            id: 'SUPER-ADMIN',
            name: superAdmin.name,
            email: superAdmin.email,
            cohort: 'Executive Leadership',
            accessType: 'super_admin',
            expiresAt: null
          },
          expiry: { isExpired: false, message: 'Global Superuser Access' }
        };
      }

      // Check temporary session passes (generated by Superuser)
      const sessionPasses = this.getAllSessionPasses ? this.getAllSessionPasses() : [];
      const passMatch = sessionPasses.find(p => p.code && p.code.toUpperCase() === clean.toUpperCase());
      if (passMatch) {
        const isExpired = !passMatch.isActive || (passMatch.expiresAt && new Date(passMatch.expiresAt).getTime() < Date.now());
        if (isExpired) {
          return {
            success: false,
            error: 'Session pass "' + clean + '" has expired or been revoked by the instructor.'
          };
        }
        return {
          success: true,
          isSessionPass: true,
          student: {
            id: passMatch.id || ('PASS-' + passMatch.code),
            name: passMatch.label || 'Guest Live Participant',
            email: 'guest@greachimpact.com',
            cohort: passMatch.label || 'Live Workshop Pass',
            accessType: 'session_pass',
            expiresAt: passMatch.expiresAt
          },
          expiry: { isExpired: false, message: 'Active Session Pass' }
        };
      }

      // Note: Generic bypass tokens (GREACH-2026/B2-EXCEL) have been permanently disabled for strict paywall & security enforcement.

      // Find student ONLY by their unique Access Code (s.password or s.accessCode).
      // Email and Student ID sign-in MUST use the 'Email & Password' sign-in flow for security.
      const roster = this.getAllStudents();
      const match = roster.find(s => 
        (s.password && s.password.toUpperCase() === clean.toUpperCase()) ||
        (s.accessCode && s.accessCode.toUpperCase() === clean.toUpperCase())
      );

      if (!match) {
        return {
          success: false,
          error: 'No enrollment record found for code "' + clean + '". Please verify your unique password (e.g. GRX-####-XX) or check your registration confirmation email.'
        };
      }

      // Check if registration payment is pending verification
      if (match.isCodeActive === false || match.status === 'Pending Payment' || match.paymentStatus === 'Pending Verification') {
        return {
          success: false,
          isPendingPayment: true,
          student: match,
          error: 'Registration payment is pending verification. Please contact greachimpact@gmail.com or send payment proof on WhatsApp to activate your access code.'
        };
      }

      // Check Expiration
      const expiry = this.checkAccessExpiry(match);
      if (expiry.isExpired) {
        return {
          success: false,
          isExpired: true,
          student: match,
          error: expiry.message + ' You still have lifetime access to your Certificate of Completion using your registered email.'
        };
      }

      return {
        success: true,
        student: match,
        expiry: expiry
      };
    },

    verifyStudentByCodeCloud: async function(code) {
      if (!code) return { success: false, error: 'Please enter your unique access code.' };
      const clean = code.trim().toUpperCase();

      // Master admin passcode check
      if (clean === 'EVANA_OLUEBUBE123890') {
        const superAdmin = this.getSuperAdmin();
        return {
          success: true,
          isInstructor: true,
          role: 'instructor',
          name: superAdmin.name,
          student: {
            id: 'SUPER-ADMIN',
            name: superAdmin.name,
            email: superAdmin.email,
            cohort: 'Executive Leadership',
            accessType: 'super_admin',
            expiresAt: null
          },
          expiry: { isExpired: false, message: 'Global Superuser Access' }
        };
      }

      try {
        // 1. Check live_session_passes table in Supabase
        const lpRes = await callSupabase(`live_session_passes?pass_code=ilike.${encodeURIComponent(clean)}&select=*`);
        if (lpRes && lpRes.ok) {
          const lps = await lpRes.json();
          if (Array.isArray(lps) && lps.length > 0) {
            const pass = lps[0];
            const isExpired = !pass.is_active || (pass.expires_at && new Date(pass.expires_at).getTime() < Date.now());
            if (isExpired) {
              return { success: false, isExpired: true, error: `Live session pass "${clean}" has expired or been revoked.` };
            }
            return {
              success: true,
              isSessionPass: true,
              passType: 'Live Session Pass',
              student: {
                id: pass.id || ('PAS-' + pass.pass_code),
                name: pass.session_label || 'Live Participant',
                email: 'guest@greachimpact.com',
                course: pass.course_name || 'Microsoft Excel for Beginners',
                courseKey: this.normalizeCourseKey(pass.course_name),
                cohort: pass.cohort || 'Batch 2: 2026 Masterclass',
                durationHours: pass.duration_hours,
                expiresAt: pass.expires_at
              },
              expiry: {
                isExpired: false,
                message: pass.expires_at ? `Valid until ${new Date(pass.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Active Live Pass'
              }
            };
          }
        }

        // 2. Check access_codes table in Supabase
        const acRes = await callSupabase(`access_codes?code=ilike.${encodeURIComponent(clean)}&select=*`);
        if (acRes && acRes.ok) {
          const acs = await acRes.json();
          if (Array.isArray(acs) && acs.length > 0) {
            const pass = acs[0];
            const isExpired = !pass.is_active || (pass.expires_at && new Date(pass.expires_at).getTime() < Date.now());
            if (isExpired) {
              return { success: false, isExpired: true, error: `Access code "${clean}" has expired (1-month validity).` };
            }
            return {
              success: true,
              isSessionPass: !!pass.is_session_pass,
              passType: pass.is_session_pass ? 'Live Session Pass' : 'Course Enrollment Code',
              student: {
                id: pass.student_id || ('PASS-' + pass.code),
                name: pass.label || 'Enrolled Student',
                email: pass.student_email || 'student@greachimpact.com',
                course: pass.course_name || 'Microsoft Excel for Beginners',
                courseKey: this.normalizeCourseKey(pass.course_name),
                cohort: pass.cohort || 'Batch 2: 2026 Masterclass',
                expiresAt: pass.expires_at
              },
              expiry: {
                isExpired: false,
                message: pass.expires_at ? `Valid until ${new Date(pass.expires_at).toLocaleDateString()}` : 'Active Cloud Access'
              }
            };
          }
        }

        // 3. Check students table in Supabase
        const stRes = await callSupabase(`students?secret_password=ilike.${encodeURIComponent(clean)}&select=*`);
        if (stRes && stRes.ok) {
          const sts = await stRes.json();
          if (Array.isArray(sts) && sts.length > 0) {
            const s = sts[0];
            if (s.status === 'Pending Payment') {
              return { success: false, isPendingPayment: true, error: 'Registration payment is pending verification.' };
            }
            const isExpired = s.expires_at && new Date(s.expires_at).getTime() < Date.now();
            if (isExpired) {
              return { success: false, isExpired: true, error: `Student enrollment expired on ${new Date(s.expires_at).toLocaleDateString()}.` };
            }
            return {
              success: true,
              passType: 'Student Account',
              student: {
                id: s.id,
                name: s.full_name,
                email: s.registered_email,
                phone: s.phone,
                course: s.enrolled_course || 'Microsoft Excel for Beginners',
                courseKey: this.normalizeCourseKey(s.enrolled_course),
                cohort: s.cohort || 'Batch 2: 2026 Masterclass',
                expiresAt: s.expires_at
              },
              expiry: {
                isExpired: false,
                message: s.expires_at ? `Valid until ${new Date(s.expires_at).toLocaleDateString()}` : 'Active Student Pass'
              }
            };
          }
        }
      } catch(err) {
        console.warn('[GreachDB] Cloud verification network issue, checking local cache:', err);
      }

      // 4. Fallback to local synchronous check
      return this.verifyStudentByCode(code);
    },

// ==============================================================
    // COURSE ACCESS RESTRICTION & ROLE-BASED ACCESS CONTROL (RBAC)
    // ==============================================================

    normalizeCourseKey: function(rawKey) {
      if (!rawKey) return 'excel_beginners';
      const k = String(rawKey).toLowerCase().trim();
      if (k.includes('complete') || k.includes('suite')) return 'complete_package';
      if (k.includes('dash')) return 'excel_dashboard';
      if (k.includes('adv')) return 'excel_advanced';
      if (k.includes('sql')) return 'sql_beginners';
      if (k.includes('power') || k.includes('bi')) return 'power_bi';
      return 'excel_beginners';
    },

    getCoursePermissions: function(courseKey) {
      const normalized = this.normalizeCourseKey(courseKey);
      return COURSE_PERMISSIONS[normalized] || COURSE_PERMISSIONS.excel_beginners;
    },

    canAccessSection: function(studentOrCourseKey, sectionIndex) {
      // 1. Super Admin or Instructor has unrestricted global access
      if (!studentOrCourseKey) return { allowed: false, reason: 'No student credentials provided.' };
      
      let key = typeof studentOrCourseKey === 'string' 
        ? studentOrCourseKey 
        : (studentOrCourseKey.courseKey || studentOrCourseKey.course || 'excel_beginners');
      
      const role = typeof studentOrCourseKey === 'object' ? studentOrCourseKey.role : null;
      if (role === 'instructor' || role === 'super_admin' || studentOrCourseKey.isSuperAdmin) {
        return { allowed: true, reason: 'Super Admin Unrestricted Access', isInstructor: true };
      }

      const perm = this.getCoursePermissions(key);
      const allowed = perm.allowedSections.includes(Number(sectionIndex));

      let requiredCourse = 'Excel Advanced or Complete Suite';
      if (sectionIndex === 5) requiredCourse = 'Executive Dashboard or Complete Suite';
      else if (sectionIndex >= 3) requiredCourse = 'Excel Advanced or Complete Suite';

      return {
        allowed: allowed,
        studentCourse: perm.label,
        studentCourseKey: perm.key,
        allowedModulesText: perm.allowedModulesText,
        requiredCourse: requiredCourse,
        reason: allowed 
          ? 'Module included in your ' + perm.label + ' enrollment.'
          : 'Module restricted. Your access code is enrolled for ' + perm.label + ' only. Requires ' + requiredCourse + '.'
      };
    },

    canAccessSlide: function(studentOrCourseKey, slideIndex) {
      // Map slide number to section index:
      // Sec 0: 0-12 | Sec 1: 13-21 | Sec 2: 22-30 | Sec 3: 31-39 | Sec 4: 40-47 | Sec 5: 48-63
      const idx = Number(slideIndex);
      let sIdx = 0;
      if (idx <= 12) sIdx = 0;
      else if (idx <= 21) sIdx = 1;
      else if (idx <= 30) sIdx = 2;
      else if (idx <= 39) sIdx = 3;
      else if (idx <= 47) sIdx = 4;
      else sIdx = 5;

      return this.canAccessSection(studentOrCourseKey, sIdx);
    },

    getCourseClassroomUrl: function(rawKey) {
      const k = this.normalizeCourseKey(rawKey);
      switch(k) {
        case 'sql_beginners':
          return 'SQL_Master_Course_Hub.html';
        case 'power_bi':
          return 'PowerBI_Master_Course_Hub.html';
        case 'excel_dashboard':
          return 'Excel_Dashboard_Hub.html';
        case 'excel_advanced':
          return 'Excel_Master_Course_Hub.html?track=advanced';
        case 'complete_package':
          return 'Excel_Master_Course_Hub.html?track=all';
        case 'excel_beginners':
        default:
          return 'Excel_Master_Course_Hub.html?track=beginners';
      }
    },

    canAccessCourse: function(studentOrCourseKey, targetCourseKey) {
      if (!studentOrCourseKey) return { allowed: false, reason: 'No student credentials provided.' };
      const role = typeof studentOrCourseKey === 'object' ? studentOrCourseKey.role : null;
      if (role === 'instructor' || role === 'super_admin' || (studentOrCourseKey && studentOrCourseKey.isSuperAdmin)) {
        return { allowed: true, reason: 'Instructor / Super Admin Unrestricted Access', isInstructor: true };
      }
      const myKey = this.normalizeCourseKey(typeof studentOrCourseKey === 'string' ? studentOrCourseKey : (studentOrCourseKey.courseKey || studentOrCourseKey.course));
      const target = this.normalizeCourseKey(targetCourseKey);
      
      // Complete package has access to all courses
      if (myKey === 'complete_package') {
        return { allowed: true, reason: 'Complete Analytics Suite grants all-inclusive access to all courses.' };
      }
      
      if (myKey === target) {
        return { allowed: true, reason: 'Enrolled in this course.' };
      }
      
      // Advanced excel grants beginner excel & dashboard
      if (myKey === 'excel_advanced' && (target === 'excel_beginners' || target === 'excel_dashboard')) {
        return { allowed: true, reason: 'Excel Advanced includes Excel Beginners & Dashboard modules.' };
      }

      const myPerm = this.getCoursePermissions(myKey);
      const targetPerm = this.getCoursePermissions(target);
      return {
        allowed: false,
        studentCourse: myPerm.label,
        studentCourseKey: myKey,
        targetCourse: targetPerm.label,
        targetCourseKey: target,
        reason: `Your access pass is currently enrolled for "${myPerm.label}". Accessing "${targetPerm.label}" requires an upgraded pass or the Complete Analytics Suite.`
      };
    },

    // ==============================================================
    // STUDENT LOGIN / LOGOUT TRACKING & REAL-TIME PRESENCE
    // ==============================================================

    recordStudentLogin: function(student, metadata = {}) {
      if (!student || !student.id) return null;
      try {
        const activeSessions = this.getActiveStudentSessionsRaw();
        const now = new Date().toISOString();
        const courseName = student.course || 'Microsoft Excel for Beginners';
        const courseKey = this.normalizeCourseKey(student.courseKey || student.course);

        // Remove existing session for same student to avoid duplicate entries
        const filtered = activeSessions.filter(s => s.studentId !== student.id);

        const newSession = {
          sessionId: 'SESS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          studentId: student.id,
          name: student.name,
          email: student.email,
          course: courseName,
          courseKey: courseKey,
          cohort: student.cohort || 'Batch 2',
          loginTime: now,
          lastHeartbeat: now,
          status: 'online',
          userAgent: metadata.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser Client'),
          device: (typeof navigator !== 'undefined' && /Mobile|Android|iPhone/i.test(navigator.userAgent)) ? 'Mobile Device' : 'Desktop Browser'
        };

        filtered.unshift(newSession);
        localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(filtered));

        // Add to persistent activity log
        this.addStudentActivityLog({
          type: 'LOGIN',
          studentId: student.id,
          name: student.name,
          email: student.email,
          course: courseName,
          courseKey: courseKey,
          timestamp: now,
          details: `Student ${student.name} (${student.id}) logged into ${courseName}`
        });

        // Clear any previous termination flag
        localStorage.removeItem('greach_terminated_' + student.id);

        return newSession;
      } catch(e) {
        console.error('[GreachDB] Error recording student login:', e);
        return null;
      }
    },

    recordStudentLogout: function(studentId, reason = 'User Logout') {
      if (!studentId) return false;
      try {
        const activeSessions = this.getActiveStudentSessionsRaw();
        const match = activeSessions.find(s => s.studentId === studentId);
        const now = new Date().toISOString();

        let durationStr = 'Unknown';
        if (match && match.loginTime) {
          const ms = new Date(now).getTime() - new Date(match.loginTime).getTime();
          const mins = Math.floor(ms / 60000);
          const secs = Math.floor((ms % 60000) / 1000);
          durationStr = `${mins}m ${secs}s`;
        }

        // Remove from active sessions
        const remaining = activeSessions.filter(s => s.studentId !== studentId);
        localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(remaining));

        // Add to persistent activity log
        this.addStudentActivityLog({
          type: 'LOGOUT',
          studentId: studentId,
          name: match ? match.name : studentId,
          email: match ? match.email : '',
          course: match ? match.course : '',
          courseKey: match ? match.courseKey : '',
          timestamp: now,
          duration: durationStr,
          reason: reason,
          details: `Student ${match ? match.name : studentId} logged out (${reason}). Session Duration: ${durationStr}`
        });

        return true;
      } catch(e) {
        console.error('[GreachDB] Error recording student logout:', e);
        return false;
      }
    },

    updateStudentHeartbeat: function(studentId) {
      if (!studentId) return;
      try {
        const activeSessions = this.getActiveStudentSessionsRaw();
        const now = new Date().toISOString();
        let changed = false;

        activeSessions.forEach(s => {
          if (s.studentId === studentId) {
            s.lastHeartbeat = now;
            s.status = 'online';
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(activeSessions));
        }
      } catch(e) {}
    },

    getActiveStudentSessionsRaw: function() {
      try {
        const stored = localStorage.getItem(ACTIVE_SESSIONS_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch(e) {
        return [];
      }
    },

    getActiveStudentSessions: function() {
      try {
        const sessions = this.getActiveStudentSessionsRaw();
        const now = Date.now();
        const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout
        const valid = [];

        sessions.forEach(s => {
          const last = new Date(s.lastHeartbeat || s.loginTime).getTime();
          if (now - last < TIMEOUT_MS) {
            valid.push(s);
          } else {
            // Auto-log idle logout
            this.addStudentActivityLog({
              type: 'LOGOUT',
              studentId: s.studentId,
              name: s.name,
              email: s.email,
              course: s.course,
              courseKey: s.courseKey,
              timestamp: new Date().toISOString(),
              duration: 'Timed Out (>5m idle)',
              reason: 'Idle Session Timeout',
              details: `Student ${s.name} session ended due to 5m inactivity.`
            });
          }
        });

        if (valid.length !== sessions.length) {
          localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(valid));
        }
        return valid;
      } catch(e) {
        return [];
      }
    },

    forceLogoutStudent: function(studentId, adminUser = 'Greachimpact') {
      if (!studentId) return { success: false, error: 'No student specified.' };
      try {
        const activeSessions = this.getActiveStudentSessionsRaw();
        const match = activeSessions.find(s => s.studentId === studentId);

        // Mark termination flag for client immediate kick
        localStorage.setItem('greach_terminated_' + studentId, String(Date.now()));

        this.recordStudentLogout(studentId, `Terminated by Admin (${adminUser})`);

        this.logAudit({
          action: 'Force Student Logout',
          user: adminUser,
          details: `Terminated live session for student ${match ? match.name : studentId} (${studentId})`
        });

        return { success: true, message: `Student session for ${studentId} terminated.` };
      } catch(e) {
        return { success: false, error: e.message };
      }
    },

    isSessionTerminated: function(studentId) {
      if (!studentId) return false;
      try {
        return !!localStorage.getItem('greach_terminated_' + studentId);
      } catch(e) {
        return false;
      }
    },

    addStudentActivityLog: function(entry) {
      try {
        const stored = localStorage.getItem(STUDENT_ACTIVITY_KEY);
        const logs = stored ? JSON.parse(stored) : [];
        logs.unshift({
          id: 'ACT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          ...entry
        });
        // Retain last 300 activities
        if (logs.length > 300) logs.length = 300;
        localStorage.setItem(STUDENT_ACTIVITY_KEY, JSON.stringify(logs));
        return true;
      } catch(e) {
        return false;
      }
    },

    getStudentActivityLogs: function() {
      try {
        const stored = localStorage.getItem(STUDENT_ACTIVITY_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch(e) {
        return [];
      }
    },

    clearStudentActivityLogs: function() {
      try {
        localStorage.removeItem(STUDENT_ACTIVITY_KEY);
        return true;
      } catch(e) {
        return false;
      }
    },
  };

    

  // Initialize immediately
  GreachDB.init();
  window.GreachDB = GreachDB;

  // Trigger real-time card synchronization across pages
  if (typeof window !== 'undefined' && window.GreachSync && typeof window.GreachSync.refresh === 'function') {
    window.GreachSync.refresh();
  }
})();
