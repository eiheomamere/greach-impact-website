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
    dashboard: {
      courseKey: 'dashboard',
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
    dashboard: { current: 40000, regular: 80000, discount: '50% OFF', label: 'Excel Dashboard for Beginners' },
    sql: { current: 5000, regular: 25000, discount: '80% OFF', label: 'SQL for Beginners' },
    power_bi: { current: 22500, regular: 45000, discount: '50% OFF', label: 'Power BI for Beginners' },
    complete_course: { current: 10000, regular: 60000, discount: '83% OFF', label: 'Complete Analytics Suite (Excel + SQL + Power BI)' }
  };

  // 3. Pre-seeded Student Roster (Open Enrollment) (Upgraded with Expiry & Certificate Tracking)
  const SEED_ROSTER = [
  {
    "id": "STU-2026-001",
    "name": "Adaeze Balogun",
    "email": "adaeze.balogun1@greach.academy",
    "password": "GRX-2951-HY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-001&key=GRX-2951-HY",
    "startLink": "START_HERE.html?id=STU-2026-001&key=GRX-2951-HY"
  },
  {
    "id": "STU-2026-002",
    "name": "Babatunde Ajayi",
    "email": "babatunde.ajayi2@greach.academy",
    "password": "GRX-2681-XX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-002&key=GRX-2681-XX",
    "startLink": "START_HERE.html?id=STU-2026-002&key=GRX-2681-XX"
  },
  {
    "id": "STU-2026-003",
    "name": "Chinedu Olawale",
    "email": "chinedu.olawale3@greach.academy",
    "password": "GRX-7891-UP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-003&key=GRX-7891-UP",
    "startLink": "START_HERE.html?id=STU-2026-003&key=GRX-7891-UP"
  },
  {
    "id": "STU-2026-004",
    "name": "Damilola Mohammed",
    "email": "damilola.mohammed4@greach.academy",
    "password": "GRX-9042-UQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-004&key=GRX-9042-UQ",
    "startLink": "START_HERE.html?id=STU-2026-004&key=GRX-9042-UQ"
  },
  {
    "id": "STU-2026-005",
    "name": "Emeka Bassey",
    "email": "emeka.bassey5@greach.academy",
    "password": "GRX-4931-AB",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-005&key=GRX-4931-AB",
    "startLink": "START_HERE.html?id=STU-2026-005&key=GRX-4931-AB"
  },
  {
    "id": "STU-2026-006",
    "name": "Fatima Soyinka",
    "email": "fatima.soyinka6@greach.academy",
    "password": "GRX-5706-VL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-006&key=GRX-5706-VL",
    "startLink": "START_HERE.html?id=STU-2026-006&key=GRX-5706-VL"
  },
  {
    "id": "STU-2026-007",
    "name": "Gbenga Onuorah",
    "email": "gbenga.onuorah7@greach.academy",
    "password": "GRX-9032-SF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-007&key=GRX-9032-SF",
    "startLink": "START_HERE.html?id=STU-2026-007&key=GRX-9032-SF"
  },
  {
    "id": "STU-2026-008",
    "name": "Halima Haruna",
    "email": "halima.haruna8@greach.academy",
    "password": "GRX-5120-JZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-008&key=GRX-5120-JZ",
    "startLink": "START_HERE.html?id=STU-2026-008&key=GRX-5120-JZ"
  },
  {
    "id": "STU-2026-009",
    "name": "Ibrahim Lawal",
    "email": "ibrahim.lawal9@greach.academy",
    "password": "GRX-6843-VZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-009&key=GRX-6843-VZ",
    "startLink": "START_HERE.html?id=STU-2026-009&key=GRX-6843-VZ"
  },
  {
    "id": "STU-2026-010",
    "name": "Jumoke Suleiman",
    "email": "jumoke.suleiman10@greach.academy",
    "password": "GRX-9414-RT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-010&key=GRX-9414-RT",
    "startLink": "START_HERE.html?id=STU-2026-010&key=GRX-9414-RT"
  },
  {
    "id": "STU-2026-011",
    "name": "Kelechi Yusuf",
    "email": "kelechi.yusuf11@greach.academy",
    "password": "GRX-2469-PH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-011&key=GRX-2469-PH",
    "startLink": "START_HERE.html?id=STU-2026-011&key=GRX-2469-PH"
  },
  {
    "id": "STU-2026-012",
    "name": "Lateef Salami",
    "email": "lateef.salami12@greach.academy",
    "password": "GRX-8494-DR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-012&key=GRX-8494-DR",
    "startLink": "START_HERE.html?id=STU-2026-012&key=GRX-8494-DR"
  },
  {
    "id": "STU-2026-013",
    "name": "Maryam Nnamdi",
    "email": "maryam.nnamdi13@greach.academy",
    "password": "GRX-6062-AT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-013&key=GRX-6062-AT",
    "startLink": "START_HERE.html?id=STU-2026-013&key=GRX-6062-AT"
  },
  {
    "id": "STU-2026-014",
    "name": "Ngozi Eze",
    "email": "ngozi.eze14@greach.academy",
    "password": "GRX-6956-MC",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-014&key=GRX-6956-MC",
    "startLink": "START_HERE.html?id=STU-2026-014&key=GRX-6956-MC"
  },
  {
    "id": "STU-2026-015",
    "name": "Olumide Bello",
    "email": "olumide.bello15@greach.academy",
    "password": "GRX-9166-WL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-015&key=GRX-9166-WL",
    "startLink": "START_HERE.html?id=STU-2026-015&key=GRX-9166-WL"
  },
  {
    "id": "STU-2026-016",
    "name": "Praise Abubakar",
    "email": "praise.abubakar16@greach.academy",
    "password": "GRX-9045-KN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-016&key=GRX-9045-KN",
    "startLink": "START_HERE.html?id=STU-2026-016&key=GRX-9045-KN"
  },
  {
    "id": "STU-2026-017",
    "name": "Queen Sanusi",
    "email": "queen.sanusi17@greach.academy",
    "password": "GRX-7880-PZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-017&key=GRX-7880-PZ",
    "startLink": "START_HERE.html?id=STU-2026-017&key=GRX-7880-PZ"
  },
  {
    "id": "STU-2026-018",
    "name": "Rotimi Ogunleye",
    "email": "rotimi.ogunleye18@greach.academy",
    "password": "GRX-9404-NA",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-018&key=GRX-9404-NA",
    "startLink": "START_HERE.html?id=STU-2026-018&key=GRX-9404-NA"
  },
  {
    "id": "STU-2026-019",
    "name": "Sade Akinyemi",
    "email": "sade.akinyemi19@greach.academy",
    "password": "GRX-4678-UV",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-019&key=GRX-4678-UV",
    "startLink": "START_HERE.html?id=STU-2026-019&key=GRX-4678-UV"
  },
  {
    "id": "STU-2026-020",
    "name": "Tunde Alabi",
    "email": "tunde.alabi20@greach.academy",
    "password": "GRX-9572-XC",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-020&key=GRX-9572-XC",
    "startLink": "START_HERE.html?id=STU-2026-020&key=GRX-9572-XC"
  },
  {
    "id": "STU-2026-021",
    "name": "Uche Ojo",
    "email": "uche.ojo21@greach.academy",
    "password": "GRX-8035-MM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-021&key=GRX-8035-MM",
    "startLink": "START_HERE.html?id=STU-2026-021&key=GRX-8035-MM"
  },
  {
    "id": "STU-2026-022",
    "name": "Victor Igwe",
    "email": "victor.igwe22@greach.academy",
    "password": "GRX-4750-WC",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-022&key=GRX-4750-WC",
    "startLink": "START_HERE.html?id=STU-2026-022&key=GRX-4750-WC"
  },
  {
    "id": "STU-2026-023",
    "name": "Wale Ogundele",
    "email": "wale.ogundele23@greach.academy",
    "password": "GRX-8484-ST",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-023&key=GRX-8484-ST",
    "startLink": "START_HERE.html?id=STU-2026-023&key=GRX-8484-ST"
  },
  {
    "id": "STU-2026-024",
    "name": "Yemi Ugwu",
    "email": "yemi.ugwu24@greach.academy",
    "password": "GRX-9939-GK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-024&key=GRX-9939-GK",
    "startLink": "START_HERE.html?id=STU-2026-024&key=GRX-9939-GK"
  },
  {
    "id": "STU-2026-025",
    "name": "Zainab Dada",
    "email": "zainab.dada25@greach.academy",
    "password": "GRX-6040-PR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-025&key=GRX-6040-PR",
    "startLink": "START_HERE.html?id=STU-2026-025&key=GRX-6040-PR"
  },
  {
    "id": "STU-2026-026",
    "name": "Amara Oladipo",
    "email": "amara.oladipo26@greach.academy",
    "password": "GRX-8846-VK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-026&key=GRX-8846-VK",
    "startLink": "START_HERE.html?id=STU-2026-026&key=GRX-8846-VK"
  },
  {
    "id": "STU-2026-027",
    "name": "Blessing Adeleke",
    "email": "blessing.adeleke27@greach.academy",
    "password": "GRX-4318-HG",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-027&key=GRX-4318-HG",
    "startLink": "START_HERE.html?id=STU-2026-027&key=GRX-4318-HG"
  },
  {
    "id": "STU-2026-028",
    "name": "Chidera Okafor",
    "email": "chidera.okafor28@greach.academy",
    "password": "GRX-1542-DX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-028&key=GRX-1542-DX",
    "startLink": "START_HERE.html?id=STU-2026-028&key=GRX-1542-DX"
  },
  {
    "id": "STU-2026-029",
    "name": "David Danladi",
    "email": "david.danladi29@greach.academy",
    "password": "GRX-8507-VY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-029&key=GRX-8507-VY",
    "startLink": "START_HERE.html?id=STU-2026-029&key=GRX-8507-VY"
  },
  {
    "id": "STU-2026-030",
    "name": "Efe Nwosu",
    "email": "efe.nwosu30@greach.academy",
    "password": "GRX-6897-YG",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-030&key=GRX-6897-YG",
    "startLink": "START_HERE.html?id=STU-2026-030&key=GRX-6897-YG"
  },
  {
    "id": "STU-2026-031",
    "name": "Funke Obi",
    "email": "funke.obi31@greach.academy",
    "password": "GRX-8955-MU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-031&key=GRX-8955-MU",
    "startLink": "START_HERE.html?id=STU-2026-031&key=GRX-8955-MU"
  },
  {
    "id": "STU-2026-032",
    "name": "Godwin Ezekiel",
    "email": "godwin.ezekiel32@greach.academy",
    "password": "GRX-9145-VP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-032&key=GRX-9145-VP",
    "startLink": "START_HERE.html?id=STU-2026-032&key=GRX-9145-VP"
  },
  {
    "id": "STU-2026-033",
    "name": "Hassan Bakare",
    "email": "hassan.bakare33@greach.academy",
    "password": "GRX-1550-VH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-033&key=GRX-1550-VH",
    "startLink": "START_HERE.html?id=STU-2026-033&key=GRX-1550-VH"
  },
  {
    "id": "STU-2026-034",
    "name": "Ifeanyi Fashola",
    "email": "ifeanyi.fashola34@greach.academy",
    "password": "GRX-2611-LT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-034&key=GRX-2611-LT",
    "startLink": "START_HERE.html?id=STU-2026-034&key=GRX-2611-LT"
  },
  {
    "id": "STU-2026-035",
    "name": "Joy Chukwu",
    "email": "joy.chukwu35@greach.academy",
    "password": "GRX-9440-GY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-035&key=GRX-9440-GY",
    "startLink": "START_HERE.html?id=STU-2026-035&key=GRX-9440-GY"
  },
  {
    "id": "STU-2026-036",
    "name": "Kunle Musa",
    "email": "kunle.musa36@greach.academy",
    "password": "GRX-3999-ZW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-036&key=GRX-3999-ZW",
    "startLink": "START_HERE.html?id=STU-2026-036&key=GRX-3999-ZW"
  },
  {
    "id": "STU-2026-037",
    "name": "Loveth Taiwo",
    "email": "loveth.taiwo37@greach.academy",
    "password": "GRX-8850-YR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-037&key=GRX-8850-YR",
    "startLink": "START_HERE.html?id=STU-2026-037&key=GRX-8850-YR"
  },
  {
    "id": "STU-2026-038",
    "name": "Michael Momoh",
    "email": "michael.momoh38@greach.academy",
    "password": "GRX-9166-JE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-038&key=GRX-9166-JE",
    "startLink": "START_HERE.html?id=STU-2026-038&key=GRX-9166-JE"
  },
  {
    "id": "STU-2026-039",
    "name": "Nneka Adewale",
    "email": "nneka.adewale39@greach.academy",
    "password": "GRX-7738-DX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-039&key=GRX-7738-DX",
    "startLink": "START_HERE.html?id=STU-2026-039&key=GRX-7738-DX"
  },
  {
    "id": "STU-2026-040",
    "name": "Olamide Okonkwo",
    "email": "olamide.okonkwo40@greach.academy",
    "password": "GRX-2510-AP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-040&key=GRX-2510-AP",
    "startLink": "START_HERE.html?id=STU-2026-040&key=GRX-2510-AP"
  },
  {
    "id": "STU-2026-041",
    "name": "Peter Balogun",
    "email": "peter.balogun41@greach.academy",
    "password": "GRX-2360-QE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-041&key=GRX-2360-QE",
    "startLink": "START_HERE.html?id=STU-2026-041&key=GRX-2360-QE"
  },
  {
    "id": "STU-2026-042",
    "name": "Ruth Ajayi",
    "email": "ruth.ajayi42@greach.academy",
    "password": "GRX-2979-QU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-042&key=GRX-2979-QU",
    "startLink": "START_HERE.html?id=STU-2026-042&key=GRX-2979-QU"
  },
  {
    "id": "STU-2026-043",
    "name": "Samuel Olawale",
    "email": "samuel.olawale43@greach.academy",
    "password": "GRX-5399-SR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-043&key=GRX-5399-SR",
    "startLink": "START_HERE.html?id=STU-2026-043&key=GRX-5399-SR"
  },
  {
    "id": "STU-2026-044",
    "name": "Tolani Mohammed",
    "email": "tolani.mohammed44@greach.academy",
    "password": "GRX-3535-AR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-044&key=GRX-3535-AR",
    "startLink": "START_HERE.html?id=STU-2026-044&key=GRX-3535-AR"
  },
  {
    "id": "STU-2026-045",
    "name": "Ugochukwu Bassey",
    "email": "ugochukwu.bassey45@greach.academy",
    "password": "GRX-9060-SY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-045&key=GRX-9060-SY",
    "startLink": "START_HERE.html?id=STU-2026-045&key=GRX-9060-SY"
  },
  {
    "id": "STU-2026-046",
    "name": "Vivian Soyinka",
    "email": "vivian.soyinka46@greach.academy",
    "password": "GRX-9942-FQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-046&key=GRX-9942-FQ",
    "startLink": "START_HERE.html?id=STU-2026-046&key=GRX-9942-FQ"
  },
  {
    "id": "STU-2026-047",
    "name": "Wisdom Onuorah",
    "email": "wisdom.onuorah47@greach.academy",
    "password": "GRX-9269-GL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-047&key=GRX-9269-GL",
    "startLink": "START_HERE.html?id=STU-2026-047&key=GRX-9269-GL"
  },
  {
    "id": "STU-2026-048",
    "name": "Yetunde Haruna",
    "email": "yetunde.haruna48@greach.academy",
    "password": "GRX-3623-YU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-048&key=GRX-3623-YU",
    "startLink": "START_HERE.html?id=STU-2026-048&key=GRX-3623-YU"
  },
  {
    "id": "STU-2026-049",
    "name": "Zubair Lawal",
    "email": "zubair.lawal49@greach.academy",
    "password": "GRX-6013-NK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-049&key=GRX-6013-NK",
    "startLink": "START_HERE.html?id=STU-2026-049&key=GRX-6013-NK"
  },
  {
    "id": "STU-2026-050",
    "name": "Aisha Suleiman",
    "email": "aisha.suleiman50@greach.academy",
    "password": "GRX-3433-NE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-050&key=GRX-3433-NE",
    "startLink": "START_HERE.html?id=STU-2026-050&key=GRX-3433-NE"
  },
  {
    "id": "STU-2026-051",
    "name": "Bolaji Yusuf",
    "email": "bolaji.yusuf51@greach.academy",
    "password": "GRX-1231-ZK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-051&key=GRX-1231-ZK",
    "startLink": "START_HERE.html?id=STU-2026-051&key=GRX-1231-ZK"
  },
  {
    "id": "STU-2026-052",
    "name": "Chinonso Salami",
    "email": "chinonso.salami52@greach.academy",
    "password": "GRX-2203-BJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-052&key=GRX-2203-BJ",
    "startLink": "START_HERE.html?id=STU-2026-052&key=GRX-2203-BJ"
  },
  {
    "id": "STU-2026-053",
    "name": "Daniel Nnamdi",
    "email": "daniel.nnamdi53@greach.academy",
    "password": "GRX-6790-YY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-053&key=GRX-6790-YY",
    "startLink": "START_HERE.html?id=STU-2026-053&key=GRX-6790-YY"
  },
  {
    "id": "STU-2026-054",
    "name": "Eniola Eze",
    "email": "eniola.eze54@greach.academy",
    "password": "GRX-1419-NH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-054&key=GRX-1419-NH",
    "startLink": "START_HERE.html?id=STU-2026-054&key=GRX-1419-NH"
  },
  {
    "id": "STU-2026-055",
    "name": "Femi Bello",
    "email": "femi.bello55@greach.academy",
    "password": "GRX-5975-LX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-055&key=GRX-5975-LX",
    "startLink": "START_HERE.html?id=STU-2026-055&key=GRX-5975-LX"
  },
  {
    "id": "STU-2026-056",
    "name": "Grace Abubakar",
    "email": "grace.abubakar56@greach.academy",
    "password": "GRX-9152-YP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-056&key=GRX-9152-YP",
    "startLink": "START_HERE.html?id=STU-2026-056&key=GRX-9152-YP"
  },
  {
    "id": "STU-2026-057",
    "name": "Hauwa Mohammed",
    "email": "hauwa.mohammed57@greach.academy",
    "password": "GRX-3797-DN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-057&key=GRX-3797-DN",
    "startLink": "START_HERE.html?id=STU-2026-057&key=GRX-3797-DN"
  },
  {
    "id": "STU-2026-058",
    "name": "Adaeze Bassey",
    "email": "adaeze.bassey58@greach.academy",
    "password": "GRX-8104-QM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-058&key=GRX-8104-QM",
    "startLink": "START_HERE.html?id=STU-2026-058&key=GRX-8104-QM"
  },
  {
    "id": "STU-2026-059",
    "name": "Babatunde Soyinka",
    "email": "babatunde.soyinka59@greach.academy",
    "password": "GRX-4822-SB",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-059&key=GRX-4822-SB",
    "startLink": "START_HERE.html?id=STU-2026-059&key=GRX-4822-SB"
  },
  {
    "id": "STU-2026-060",
    "name": "Chinedu Onuorah",
    "email": "chinedu.onuorah60@greach.academy",
    "password": "GRX-7539-AR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-060&key=GRX-7539-AR",
    "startLink": "START_HERE.html?id=STU-2026-060&key=GRX-7539-AR"
  },
  {
    "id": "STU-2026-061",
    "name": "Damilola Haruna",
    "email": "damilola.haruna61@greach.academy",
    "password": "GRX-3840-BP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-061&key=GRX-3840-BP",
    "startLink": "START_HERE.html?id=STU-2026-061&key=GRX-3840-BP"
  },
  {
    "id": "STU-2026-062",
    "name": "Emeka Lawal",
    "email": "emeka.lawal62@greach.academy",
    "password": "GRX-1789-LU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-062&key=GRX-1789-LU",
    "startLink": "START_HERE.html?id=STU-2026-062&key=GRX-1789-LU"
  },
  {
    "id": "STU-2026-063",
    "name": "Fatima Suleiman",
    "email": "fatima.suleiman63@greach.academy",
    "password": "GRX-4088-MS",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-063&key=GRX-4088-MS",
    "startLink": "START_HERE.html?id=STU-2026-063&key=GRX-4088-MS"
  },
  {
    "id": "STU-2026-064",
    "name": "Gbenga Yusuf",
    "email": "gbenga.yusuf64@greach.academy",
    "password": "GRX-1335-DN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-064&key=GRX-1335-DN",
    "startLink": "START_HERE.html?id=STU-2026-064&key=GRX-1335-DN"
  },
  {
    "id": "STU-2026-065",
    "name": "Halima Salami",
    "email": "halima.salami65@greach.academy",
    "password": "GRX-9468-XD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-065&key=GRX-9468-XD",
    "startLink": "START_HERE.html?id=STU-2026-065&key=GRX-9468-XD"
  },
  {
    "id": "STU-2026-066",
    "name": "Ibrahim Nnamdi",
    "email": "ibrahim.nnamdi66@greach.academy",
    "password": "GRX-4047-KL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-066&key=GRX-4047-KL",
    "startLink": "START_HERE.html?id=STU-2026-066&key=GRX-4047-KL"
  },
  {
    "id": "STU-2026-067",
    "name": "Jumoke Eze",
    "email": "jumoke.eze67@greach.academy",
    "password": "GRX-7784-WK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-067&key=GRX-7784-WK",
    "startLink": "START_HERE.html?id=STU-2026-067&key=GRX-7784-WK"
  },
  {
    "id": "STU-2026-068",
    "name": "Kelechi Bello",
    "email": "kelechi.bello68@greach.academy",
    "password": "GRX-4067-JG",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-068&key=GRX-4067-JG",
    "startLink": "START_HERE.html?id=STU-2026-068&key=GRX-4067-JG"
  },
  {
    "id": "STU-2026-069",
    "name": "Lateef Abubakar",
    "email": "lateef.abubakar69@greach.academy",
    "password": "GRX-9152-ZV",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-069&key=GRX-9152-ZV",
    "startLink": "START_HERE.html?id=STU-2026-069&key=GRX-9152-ZV"
  },
  {
    "id": "STU-2026-070",
    "name": "Maryam Sanusi",
    "email": "maryam.sanusi70@greach.academy",
    "password": "GRX-5713-MH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-070&key=GRX-5713-MH",
    "startLink": "START_HERE.html?id=STU-2026-070&key=GRX-5713-MH"
  },
  {
    "id": "STU-2026-071",
    "name": "Ngozi Ogunleye",
    "email": "ngozi.ogunleye71@greach.academy",
    "password": "GRX-8897-LN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-071&key=GRX-8897-LN",
    "startLink": "START_HERE.html?id=STU-2026-071&key=GRX-8897-LN"
  },
  {
    "id": "STU-2026-072",
    "name": "Olumide Akinyemi",
    "email": "olumide.akinyemi72@greach.academy",
    "password": "GRX-9596-VV",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-072&key=GRX-9596-VV",
    "startLink": "START_HERE.html?id=STU-2026-072&key=GRX-9596-VV"
  },
  {
    "id": "STU-2026-073",
    "name": "Praise Alabi",
    "email": "praise.alabi73@greach.academy",
    "password": "GRX-4511-FY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-073&key=GRX-4511-FY",
    "startLink": "START_HERE.html?id=STU-2026-073&key=GRX-4511-FY"
  },
  {
    "id": "STU-2026-074",
    "name": "Queen Ojo",
    "email": "queen.ojo74@greach.academy",
    "password": "GRX-8440-RK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-074&key=GRX-8440-RK",
    "startLink": "START_HERE.html?id=STU-2026-074&key=GRX-8440-RK"
  },
  {
    "id": "STU-2026-075",
    "name": "Rotimi Igwe",
    "email": "rotimi.igwe75@greach.academy",
    "password": "GRX-3989-ZJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-075&key=GRX-3989-ZJ",
    "startLink": "START_HERE.html?id=STU-2026-075&key=GRX-3989-ZJ"
  },
  {
    "id": "STU-2026-076",
    "name": "Sade Ogundele",
    "email": "sade.ogundele76@greach.academy",
    "password": "GRX-3568-JS",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-076&key=GRX-3568-JS",
    "startLink": "START_HERE.html?id=STU-2026-076&key=GRX-3568-JS"
  },
  {
    "id": "STU-2026-077",
    "name": "Tunde Ugwu",
    "email": "tunde.ugwu77@greach.academy",
    "password": "GRX-9820-FQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-077&key=GRX-9820-FQ",
    "startLink": "START_HERE.html?id=STU-2026-077&key=GRX-9820-FQ"
  },
  {
    "id": "STU-2026-078",
    "name": "Uche Dada",
    "email": "uche.dada78@greach.academy",
    "password": "GRX-5595-PP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-078&key=GRX-5595-PP",
    "startLink": "START_HERE.html?id=STU-2026-078&key=GRX-5595-PP"
  },
  {
    "id": "STU-2026-079",
    "name": "Victor Oladipo",
    "email": "victor.oladipo79@greach.academy",
    "password": "GRX-4513-PP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-079&key=GRX-4513-PP",
    "startLink": "START_HERE.html?id=STU-2026-079&key=GRX-4513-PP"
  },
  {
    "id": "STU-2026-080",
    "name": "Wale Adeleke",
    "email": "wale.adeleke80@greach.academy",
    "password": "GRX-3172-CG",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-080&key=GRX-3172-CG",
    "startLink": "START_HERE.html?id=STU-2026-080&key=GRX-3172-CG"
  },
  {
    "id": "STU-2026-081",
    "name": "Yemi Okafor",
    "email": "yemi.okafor81@greach.academy",
    "password": "GRX-8144-ES",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-081&key=GRX-8144-ES",
    "startLink": "START_HERE.html?id=STU-2026-081&key=GRX-8144-ES"
  },
  {
    "id": "STU-2026-082",
    "name": "Zainab Danladi",
    "email": "zainab.danladi82@greach.academy",
    "password": "GRX-6836-TE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-082&key=GRX-6836-TE",
    "startLink": "START_HERE.html?id=STU-2026-082&key=GRX-6836-TE"
  },
  {
    "id": "STU-2026-083",
    "name": "Amara Nwosu",
    "email": "amara.nwosu83@greach.academy",
    "password": "GRX-2741-NG",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-083&key=GRX-2741-NG",
    "startLink": "START_HERE.html?id=STU-2026-083&key=GRX-2741-NG"
  },
  {
    "id": "STU-2026-084",
    "name": "Blessing Obi",
    "email": "blessing.obi84@greach.academy",
    "password": "GRX-2047-GH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-084&key=GRX-2047-GH",
    "startLink": "START_HERE.html?id=STU-2026-084&key=GRX-2047-GH"
  },
  {
    "id": "STU-2026-085",
    "name": "Chidera Ezekiel",
    "email": "chidera.ezekiel85@greach.academy",
    "password": "GRX-5273-GA",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-085&key=GRX-5273-GA",
    "startLink": "START_HERE.html?id=STU-2026-085&key=GRX-5273-GA"
  },
  {
    "id": "STU-2026-086",
    "name": "David Bakare",
    "email": "david.bakare86@greach.academy",
    "password": "GRX-5211-KA",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-086&key=GRX-5211-KA",
    "startLink": "START_HERE.html?id=STU-2026-086&key=GRX-5211-KA"
  },
  {
    "id": "STU-2026-087",
    "name": "Efe Fashola",
    "email": "efe.fashola87@greach.academy",
    "password": "GRX-2580-FH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-087&key=GRX-2580-FH",
    "startLink": "START_HERE.html?id=STU-2026-087&key=GRX-2580-FH"
  },
  {
    "id": "STU-2026-088",
    "name": "Funke Chukwu",
    "email": "funke.chukwu88@greach.academy",
    "password": "GRX-2537-SP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-088&key=GRX-2537-SP",
    "startLink": "START_HERE.html?id=STU-2026-088&key=GRX-2537-SP"
  },
  {
    "id": "STU-2026-089",
    "name": "Godwin Musa",
    "email": "godwin.musa89@greach.academy",
    "password": "GRX-6739-HL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-089&key=GRX-6739-HL",
    "startLink": "START_HERE.html?id=STU-2026-089&key=GRX-6739-HL"
  },
  {
    "id": "STU-2026-090",
    "name": "Hassan Taiwo",
    "email": "hassan.taiwo90@greach.academy",
    "password": "GRX-1622-YH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-090&key=GRX-1622-YH",
    "startLink": "START_HERE.html?id=STU-2026-090&key=GRX-1622-YH"
  },
  {
    "id": "STU-2026-091",
    "name": "Ifeanyi Momoh",
    "email": "ifeanyi.momoh91@greach.academy",
    "password": "GRX-4532-QL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-091&key=GRX-4532-QL",
    "startLink": "START_HERE.html?id=STU-2026-091&key=GRX-4532-QL"
  },
  {
    "id": "STU-2026-092",
    "name": "Joy Adewale",
    "email": "joy.adewale92@greach.academy",
    "password": "GRX-2956-SW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-092&key=GRX-2956-SW",
    "startLink": "START_HERE.html?id=STU-2026-092&key=GRX-2956-SW"
  },
  {
    "id": "STU-2026-093",
    "name": "Kunle Okonkwo",
    "email": "kunle.okonkwo93@greach.academy",
    "password": "GRX-5121-KY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-093&key=GRX-5121-KY",
    "startLink": "START_HERE.html?id=STU-2026-093&key=GRX-5121-KY"
  },
  {
    "id": "STU-2026-094",
    "name": "Loveth Balogun",
    "email": "loveth.balogun94@greach.academy",
    "password": "GRX-6837-BT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-094&key=GRX-6837-BT",
    "startLink": "START_HERE.html?id=STU-2026-094&key=GRX-6837-BT"
  },
  {
    "id": "STU-2026-095",
    "name": "Michael Ajayi",
    "email": "michael.ajayi95@greach.academy",
    "password": "GRX-1387-GH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-095&key=GRX-1387-GH",
    "startLink": "START_HERE.html?id=STU-2026-095&key=GRX-1387-GH"
  },
  {
    "id": "STU-2026-096",
    "name": "Nneka Olawale",
    "email": "nneka.olawale96@greach.academy",
    "password": "GRX-3004-HK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-096&key=GRX-3004-HK",
    "startLink": "START_HERE.html?id=STU-2026-096&key=GRX-3004-HK"
  },
  {
    "id": "STU-2026-097",
    "name": "Olamide Mohammed",
    "email": "olamide.mohammed97@greach.academy",
    "password": "GRX-1332-PJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-097&key=GRX-1332-PJ",
    "startLink": "START_HERE.html?id=STU-2026-097&key=GRX-1332-PJ"
  },
  {
    "id": "STU-2026-098",
    "name": "Peter Bassey",
    "email": "peter.bassey98@greach.academy",
    "password": "GRX-1919-TC",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-098&key=GRX-1919-TC",
    "startLink": "START_HERE.html?id=STU-2026-098&key=GRX-1919-TC"
  },
  {
    "id": "STU-2026-099",
    "name": "Ruth Soyinka",
    "email": "ruth.soyinka99@greach.academy",
    "password": "GRX-3010-CD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-099&key=GRX-3010-CD",
    "startLink": "START_HERE.html?id=STU-2026-099&key=GRX-3010-CD"
  },
  {
    "id": "STU-2026-100",
    "name": "Samuel Onuorah",
    "email": "samuel.onuorah100@greach.academy",
    "password": "GRX-6800-QZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-100&key=GRX-6800-QZ",
    "startLink": "START_HERE.html?id=STU-2026-100&key=GRX-6800-QZ"
  },
  {
    "id": "STU-2026-101",
    "name": "Tolani Haruna",
    "email": "tolani.haruna101@greach.academy",
    "password": "GRX-5951-AP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-101&key=GRX-5951-AP",
    "startLink": "START_HERE.html?id=STU-2026-101&key=GRX-5951-AP"
  },
  {
    "id": "STU-2026-102",
    "name": "Ugochukwu Lawal",
    "email": "ugochukwu.lawal102@greach.academy",
    "password": "GRX-6832-KK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-102&key=GRX-6832-KK",
    "startLink": "START_HERE.html?id=STU-2026-102&key=GRX-6832-KK"
  },
  {
    "id": "STU-2026-103",
    "name": "Vivian Suleiman",
    "email": "vivian.suleiman103@greach.academy",
    "password": "GRX-7897-RU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-103&key=GRX-7897-RU",
    "startLink": "START_HERE.html?id=STU-2026-103&key=GRX-7897-RU"
  },
  {
    "id": "STU-2026-104",
    "name": "Wisdom Yusuf",
    "email": "wisdom.yusuf104@greach.academy",
    "password": "GRX-4005-PR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-104&key=GRX-4005-PR",
    "startLink": "START_HERE.html?id=STU-2026-104&key=GRX-4005-PR"
  },
  {
    "id": "STU-2026-105",
    "name": "Yetunde Salami",
    "email": "yetunde.salami105@greach.academy",
    "password": "GRX-9869-SK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-105&key=GRX-9869-SK",
    "startLink": "START_HERE.html?id=STU-2026-105&key=GRX-9869-SK"
  },
  {
    "id": "STU-2026-106",
    "name": "Zubair Nnamdi",
    "email": "zubair.nnamdi106@greach.academy",
    "password": "GRX-5177-UF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-106&key=GRX-5177-UF",
    "startLink": "START_HERE.html?id=STU-2026-106&key=GRX-5177-UF"
  },
  {
    "id": "STU-2026-107",
    "name": "Aisha Eze",
    "email": "aisha.eze107@greach.academy",
    "password": "GRX-1271-GM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-107&key=GRX-1271-GM",
    "startLink": "START_HERE.html?id=STU-2026-107&key=GRX-1271-GM"
  },
  {
    "id": "STU-2026-108",
    "name": "Bolaji Bello",
    "email": "bolaji.bello108@greach.academy",
    "password": "GRX-5322-ZD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-108&key=GRX-5322-ZD",
    "startLink": "START_HERE.html?id=STU-2026-108&key=GRX-5322-ZD"
  },
  {
    "id": "STU-2026-109",
    "name": "Chinonso Abubakar",
    "email": "chinonso.abubakar109@greach.academy",
    "password": "GRX-2465-WP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-109&key=GRX-2465-WP",
    "startLink": "START_HERE.html?id=STU-2026-109&key=GRX-2465-WP"
  },
  {
    "id": "STU-2026-110",
    "name": "Daniel Sanusi",
    "email": "daniel.sanusi110@greach.academy",
    "password": "GRX-9422-VJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-110&key=GRX-9422-VJ",
    "startLink": "START_HERE.html?id=STU-2026-110&key=GRX-9422-VJ"
  },
  {
    "id": "STU-2026-111",
    "name": "Eniola Ogunleye",
    "email": "eniola.ogunleye111@greach.academy",
    "password": "GRX-9527-UH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-111&key=GRX-9527-UH",
    "startLink": "START_HERE.html?id=STU-2026-111&key=GRX-9527-UH"
  },
  {
    "id": "STU-2026-112",
    "name": "Femi Akinyemi",
    "email": "femi.akinyemi112@greach.academy",
    "password": "GRX-1186-RF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-112&key=GRX-1186-RF",
    "startLink": "START_HERE.html?id=STU-2026-112&key=GRX-1186-RF"
  },
  {
    "id": "STU-2026-113",
    "name": "Grace Alabi",
    "email": "grace.alabi113@greach.academy",
    "password": "GRX-1955-ZS",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-113&key=GRX-1955-ZS",
    "startLink": "START_HERE.html?id=STU-2026-113&key=GRX-1955-ZS"
  },
  {
    "id": "STU-2026-114",
    "name": "Hauwa Haruna",
    "email": "hauwa.haruna114@greach.academy",
    "password": "GRX-3471-YX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-114&key=GRX-3471-YX",
    "startLink": "START_HERE.html?id=STU-2026-114&key=GRX-3471-YX"
  },
  {
    "id": "STU-2026-115",
    "name": "Adaeze Lawal",
    "email": "adaeze.lawal115@greach.academy",
    "password": "GRX-7538-SJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-115&key=GRX-7538-SJ",
    "startLink": "START_HERE.html?id=STU-2026-115&key=GRX-7538-SJ"
  },
  {
    "id": "STU-2026-116",
    "name": "Babatunde Suleiman",
    "email": "babatunde.suleiman116@greach.academy",
    "password": "GRX-4809-PG",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-116&key=GRX-4809-PG",
    "startLink": "START_HERE.html?id=STU-2026-116&key=GRX-4809-PG"
  },
  {
    "id": "STU-2026-117",
    "name": "Chinedu Yusuf",
    "email": "chinedu.yusuf117@greach.academy",
    "password": "GRX-4292-JM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-117&key=GRX-4292-JM",
    "startLink": "START_HERE.html?id=STU-2026-117&key=GRX-4292-JM"
  },
  {
    "id": "STU-2026-118",
    "name": "Damilola Salami",
    "email": "damilola.salami118@greach.academy",
    "password": "GRX-8496-PM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-118&key=GRX-8496-PM",
    "startLink": "START_HERE.html?id=STU-2026-118&key=GRX-8496-PM"
  },
  {
    "id": "STU-2026-119",
    "name": "Emeka Nnamdi",
    "email": "emeka.nnamdi119@greach.academy",
    "password": "GRX-6114-ER",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-119&key=GRX-6114-ER",
    "startLink": "START_HERE.html?id=STU-2026-119&key=GRX-6114-ER"
  },
  {
    "id": "STU-2026-120",
    "name": "Fatima Eze",
    "email": "fatima.eze120@greach.academy",
    "password": "GRX-3519-MA",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-120&key=GRX-3519-MA",
    "startLink": "START_HERE.html?id=STU-2026-120&key=GRX-3519-MA"
  },
  {
    "id": "STU-2026-121",
    "name": "Gbenga Bello",
    "email": "gbenga.bello121@greach.academy",
    "password": "GRX-6807-VW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-121&key=GRX-6807-VW",
    "startLink": "START_HERE.html?id=STU-2026-121&key=GRX-6807-VW"
  },
  {
    "id": "STU-2026-122",
    "name": "Halima Abubakar",
    "email": "halima.abubakar122@greach.academy",
    "password": "GRX-7690-VR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-122&key=GRX-7690-VR",
    "startLink": "START_HERE.html?id=STU-2026-122&key=GRX-7690-VR"
  },
  {
    "id": "STU-2026-123",
    "name": "Ibrahim Sanusi",
    "email": "ibrahim.sanusi123@greach.academy",
    "password": "GRX-2379-HP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-123&key=GRX-2379-HP",
    "startLink": "START_HERE.html?id=STU-2026-123&key=GRX-2379-HP"
  },
  {
    "id": "STU-2026-124",
    "name": "Jumoke Ogunleye",
    "email": "jumoke.ogunleye124@greach.academy",
    "password": "GRX-5342-DT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-124&key=GRX-5342-DT",
    "startLink": "START_HERE.html?id=STU-2026-124&key=GRX-5342-DT"
  },
  {
    "id": "STU-2026-125",
    "name": "Kelechi Akinyemi",
    "email": "kelechi.akinyemi125@greach.academy",
    "password": "GRX-1300-NW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-125&key=GRX-1300-NW",
    "startLink": "START_HERE.html?id=STU-2026-125&key=GRX-1300-NW"
  },
  {
    "id": "STU-2026-126",
    "name": "Lateef Alabi",
    "email": "lateef.alabi126@greach.academy",
    "password": "GRX-6025-PY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-126&key=GRX-6025-PY",
    "startLink": "START_HERE.html?id=STU-2026-126&key=GRX-6025-PY"
  },
  {
    "id": "STU-2026-127",
    "name": "Maryam Ojo",
    "email": "maryam.ojo127@greach.academy",
    "password": "GRX-7235-NZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-127&key=GRX-7235-NZ",
    "startLink": "START_HERE.html?id=STU-2026-127&key=GRX-7235-NZ"
  },
  {
    "id": "STU-2026-128",
    "name": "Ngozi Igwe",
    "email": "ngozi.igwe128@greach.academy",
    "password": "GRX-3589-ZC",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-128&key=GRX-3589-ZC",
    "startLink": "START_HERE.html?id=STU-2026-128&key=GRX-3589-ZC"
  },
  {
    "id": "STU-2026-129",
    "name": "Olumide Ogundele",
    "email": "olumide.ogundele129@greach.academy",
    "password": "GRX-3324-TJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-129&key=GRX-3324-TJ",
    "startLink": "START_HERE.html?id=STU-2026-129&key=GRX-3324-TJ"
  },
  {
    "id": "STU-2026-130",
    "name": "Praise Ugwu",
    "email": "praise.ugwu130@greach.academy",
    "password": "GRX-5283-HT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-130&key=GRX-5283-HT",
    "startLink": "START_HERE.html?id=STU-2026-130&key=GRX-5283-HT"
  },
  {
    "id": "STU-2026-131",
    "name": "Queen Dada",
    "email": "queen.dada131@greach.academy",
    "password": "GRX-4109-DH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-131&key=GRX-4109-DH",
    "startLink": "START_HERE.html?id=STU-2026-131&key=GRX-4109-DH"
  },
  {
    "id": "STU-2026-132",
    "name": "Rotimi Oladipo",
    "email": "rotimi.oladipo132@greach.academy",
    "password": "GRX-9866-GD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-132&key=GRX-9866-GD",
    "startLink": "START_HERE.html?id=STU-2026-132&key=GRX-9866-GD"
  },
  {
    "id": "STU-2026-133",
    "name": "Sade Adeleke",
    "email": "sade.adeleke133@greach.academy",
    "password": "GRX-7367-ET",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-133&key=GRX-7367-ET",
    "startLink": "START_HERE.html?id=STU-2026-133&key=GRX-7367-ET"
  },
  {
    "id": "STU-2026-134",
    "name": "Tunde Okafor",
    "email": "tunde.okafor134@greach.academy",
    "password": "GRX-1154-WR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-134&key=GRX-1154-WR",
    "startLink": "START_HERE.html?id=STU-2026-134&key=GRX-1154-WR"
  },
  {
    "id": "STU-2026-135",
    "name": "Uche Danladi",
    "email": "uche.danladi135@greach.academy",
    "password": "GRX-7924-JU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-135&key=GRX-7924-JU",
    "startLink": "START_HERE.html?id=STU-2026-135&key=GRX-7924-JU"
  },
  {
    "id": "STU-2026-136",
    "name": "Victor Nwosu",
    "email": "victor.nwosu136@greach.academy",
    "password": "GRX-9804-EN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-136&key=GRX-9804-EN",
    "startLink": "START_HERE.html?id=STU-2026-136&key=GRX-9804-EN"
  },
  {
    "id": "STU-2026-137",
    "name": "Wale Obi",
    "email": "wale.obi137@greach.academy",
    "password": "GRX-3942-HD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-137&key=GRX-3942-HD",
    "startLink": "START_HERE.html?id=STU-2026-137&key=GRX-3942-HD"
  },
  {
    "id": "STU-2026-138",
    "name": "Yemi Ezekiel",
    "email": "yemi.ezekiel138@greach.academy",
    "password": "GRX-1465-XN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-138&key=GRX-1465-XN",
    "startLink": "START_HERE.html?id=STU-2026-138&key=GRX-1465-XN"
  },
  {
    "id": "STU-2026-139",
    "name": "Zainab Bakare",
    "email": "zainab.bakare139@greach.academy",
    "password": "GRX-1032-WB",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-139&key=GRX-1032-WB",
    "startLink": "START_HERE.html?id=STU-2026-139&key=GRX-1032-WB"
  },
  {
    "id": "STU-2026-140",
    "name": "Amara Fashola",
    "email": "amara.fashola140@greach.academy",
    "password": "GRX-5958-FD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-140&key=GRX-5958-FD",
    "startLink": "START_HERE.html?id=STU-2026-140&key=GRX-5958-FD"
  },
  {
    "id": "STU-2026-141",
    "name": "Blessing Chukwu",
    "email": "blessing.chukwu141@greach.academy",
    "password": "GRX-5065-DZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-141&key=GRX-5065-DZ",
    "startLink": "START_HERE.html?id=STU-2026-141&key=GRX-5065-DZ"
  },
  {
    "id": "STU-2026-142",
    "name": "Chidera Musa",
    "email": "chidera.musa142@greach.academy",
    "password": "GRX-8939-CW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-142&key=GRX-8939-CW",
    "startLink": "START_HERE.html?id=STU-2026-142&key=GRX-8939-CW"
  },
  {
    "id": "STU-2026-143",
    "name": "David Taiwo",
    "email": "david.taiwo143@greach.academy",
    "password": "GRX-2198-KQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-143&key=GRX-2198-KQ",
    "startLink": "START_HERE.html?id=STU-2026-143&key=GRX-2198-KQ"
  },
  {
    "id": "STU-2026-144",
    "name": "Efe Momoh",
    "email": "efe.momoh144@greach.academy",
    "password": "GRX-2925-JX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-144&key=GRX-2925-JX",
    "startLink": "START_HERE.html?id=STU-2026-144&key=GRX-2925-JX"
  },
  {
    "id": "STU-2026-145",
    "name": "Funke Adewale",
    "email": "funke.adewale145@greach.academy",
    "password": "GRX-2981-PF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-145&key=GRX-2981-PF",
    "startLink": "START_HERE.html?id=STU-2026-145&key=GRX-2981-PF"
  },
  {
    "id": "STU-2026-146",
    "name": "Godwin Okonkwo",
    "email": "godwin.okonkwo146@greach.academy",
    "password": "GRX-6876-SL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-146&key=GRX-6876-SL",
    "startLink": "START_HERE.html?id=STU-2026-146&key=GRX-6876-SL"
  },
  {
    "id": "STU-2026-147",
    "name": "Hassan Balogun",
    "email": "hassan.balogun147@greach.academy",
    "password": "GRX-6654-BU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-147&key=GRX-6654-BU",
    "startLink": "START_HERE.html?id=STU-2026-147&key=GRX-6654-BU"
  },
  {
    "id": "STU-2026-148",
    "name": "Ifeanyi Ajayi",
    "email": "ifeanyi.ajayi148@greach.academy",
    "password": "GRX-2439-VU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-148&key=GRX-2439-VU",
    "startLink": "START_HERE.html?id=STU-2026-148&key=GRX-2439-VU"
  },
  {
    "id": "STU-2026-149",
    "name": "Joy Olawale",
    "email": "joy.olawale149@greach.academy",
    "password": "GRX-5346-UF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-149&key=GRX-5346-UF",
    "startLink": "START_HERE.html?id=STU-2026-149&key=GRX-5346-UF"
  },
  {
    "id": "STU-2026-150",
    "name": "Kunle Mohammed",
    "email": "kunle.mohammed150@greach.academy",
    "password": "GRX-6324-LP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-150&key=GRX-6324-LP",
    "startLink": "START_HERE.html?id=STU-2026-150&key=GRX-6324-LP"
  },
  {
    "id": "STU-2026-151",
    "name": "Loveth Bassey",
    "email": "loveth.bassey151@greach.academy",
    "password": "GRX-6287-XT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-151&key=GRX-6287-XT",
    "startLink": "START_HERE.html?id=STU-2026-151&key=GRX-6287-XT"
  },
  {
    "id": "STU-2026-152",
    "name": "Michael Soyinka",
    "email": "michael.soyinka152@greach.academy",
    "password": "GRX-9080-KE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-152&key=GRX-9080-KE",
    "startLink": "START_HERE.html?id=STU-2026-152&key=GRX-9080-KE"
  },
  {
    "id": "STU-2026-153",
    "name": "Nneka Onuorah",
    "email": "nneka.onuorah153@greach.academy",
    "password": "GRX-8585-FS",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-153&key=GRX-8585-FS",
    "startLink": "START_HERE.html?id=STU-2026-153&key=GRX-8585-FS"
  },
  {
    "id": "STU-2026-154",
    "name": "Olamide Haruna",
    "email": "olamide.haruna154@greach.academy",
    "password": "GRX-6710-UJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-154&key=GRX-6710-UJ",
    "startLink": "START_HERE.html?id=STU-2026-154&key=GRX-6710-UJ"
  },
  {
    "id": "STU-2026-155",
    "name": "Peter Lawal",
    "email": "peter.lawal155@greach.academy",
    "password": "GRX-7252-FL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-155&key=GRX-7252-FL",
    "startLink": "START_HERE.html?id=STU-2026-155&key=GRX-7252-FL"
  },
  {
    "id": "STU-2026-156",
    "name": "Ruth Suleiman",
    "email": "ruth.suleiman156@greach.academy",
    "password": "GRX-3090-LH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-156&key=GRX-3090-LH",
    "startLink": "START_HERE.html?id=STU-2026-156&key=GRX-3090-LH"
  },
  {
    "id": "STU-2026-157",
    "name": "Samuel Yusuf",
    "email": "samuel.yusuf157@greach.academy",
    "password": "GRX-2930-HW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-157&key=GRX-2930-HW",
    "startLink": "START_HERE.html?id=STU-2026-157&key=GRX-2930-HW"
  },
  {
    "id": "STU-2026-158",
    "name": "Tolani Salami",
    "email": "tolani.salami158@greach.academy",
    "password": "GRX-8281-GP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-158&key=GRX-8281-GP",
    "startLink": "START_HERE.html?id=STU-2026-158&key=GRX-8281-GP"
  },
  {
    "id": "STU-2026-159",
    "name": "Ugochukwu Nnamdi",
    "email": "ugochukwu.nnamdi159@greach.academy",
    "password": "GRX-5393-FZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-159&key=GRX-5393-FZ",
    "startLink": "START_HERE.html?id=STU-2026-159&key=GRX-5393-FZ"
  },
  {
    "id": "STU-2026-160",
    "name": "Vivian Eze",
    "email": "vivian.eze160@greach.academy",
    "password": "GRX-3019-GP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-160&key=GRX-3019-GP",
    "startLink": "START_HERE.html?id=STU-2026-160&key=GRX-3019-GP"
  },
  {
    "id": "STU-2026-161",
    "name": "Wisdom Bello",
    "email": "wisdom.bello161@greach.academy",
    "password": "GRX-7573-KP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-161&key=GRX-7573-KP",
    "startLink": "START_HERE.html?id=STU-2026-161&key=GRX-7573-KP"
  },
  {
    "id": "STU-2026-162",
    "name": "Yetunde Abubakar",
    "email": "yetunde.abubakar162@greach.academy",
    "password": "GRX-6393-SJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-162&key=GRX-6393-SJ",
    "startLink": "START_HERE.html?id=STU-2026-162&key=GRX-6393-SJ"
  },
  {
    "id": "STU-2026-163",
    "name": "Zubair Sanusi",
    "email": "zubair.sanusi163@greach.academy",
    "password": "GRX-9104-XW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-163&key=GRX-9104-XW",
    "startLink": "START_HERE.html?id=STU-2026-163&key=GRX-9104-XW"
  },
  {
    "id": "STU-2026-164",
    "name": "Aisha Ogunleye",
    "email": "aisha.ogunleye164@greach.academy",
    "password": "GRX-9952-NL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-164&key=GRX-9952-NL",
    "startLink": "START_HERE.html?id=STU-2026-164&key=GRX-9952-NL"
  },
  {
    "id": "STU-2026-165",
    "name": "Bolaji Akinyemi",
    "email": "bolaji.akinyemi165@greach.academy",
    "password": "GRX-6414-BK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-165&key=GRX-6414-BK",
    "startLink": "START_HERE.html?id=STU-2026-165&key=GRX-6414-BK"
  },
  {
    "id": "STU-2026-166",
    "name": "Chinonso Alabi",
    "email": "chinonso.alabi166@greach.academy",
    "password": "GRX-3833-AP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-166&key=GRX-3833-AP",
    "startLink": "START_HERE.html?id=STU-2026-166&key=GRX-3833-AP"
  },
  {
    "id": "STU-2026-167",
    "name": "Daniel Ojo",
    "email": "daniel.ojo167@greach.academy",
    "password": "GRX-5131-DP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-167&key=GRX-5131-DP",
    "startLink": "START_HERE.html?id=STU-2026-167&key=GRX-5131-DP"
  },
  {
    "id": "STU-2026-168",
    "name": "Eniola Igwe",
    "email": "eniola.igwe168@greach.academy",
    "password": "GRX-7793-VV",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-168&key=GRX-7793-VV",
    "startLink": "START_HERE.html?id=STU-2026-168&key=GRX-7793-VV"
  },
  {
    "id": "STU-2026-169",
    "name": "Femi Ogundele",
    "email": "femi.ogundele169@greach.academy",
    "password": "GRX-8912-JA",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-169&key=GRX-8912-JA",
    "startLink": "START_HERE.html?id=STU-2026-169&key=GRX-8912-JA"
  },
  {
    "id": "STU-2026-170",
    "name": "Grace Ugwu",
    "email": "grace.ugwu170@greach.academy",
    "password": "GRX-4602-RR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-170&key=GRX-4602-RR",
    "startLink": "START_HERE.html?id=STU-2026-170&key=GRX-4602-RR"
  },
  {
    "id": "STU-2026-171",
    "name": "Hauwa Salami",
    "email": "hauwa.salami171@greach.academy",
    "password": "GRX-5401-HU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-171&key=GRX-5401-HU",
    "startLink": "START_HERE.html?id=STU-2026-171&key=GRX-5401-HU"
  },
  {
    "id": "STU-2026-172",
    "name": "Adaeze Nnamdi",
    "email": "adaeze.nnamdi172@greach.academy",
    "password": "GRX-8489-NQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-172&key=GRX-8489-NQ",
    "startLink": "START_HERE.html?id=STU-2026-172&key=GRX-8489-NQ"
  },
  {
    "id": "STU-2026-173",
    "name": "Babatunde Eze",
    "email": "babatunde.eze173@greach.academy",
    "password": "GRX-7052-BS",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-173&key=GRX-7052-BS",
    "startLink": "START_HERE.html?id=STU-2026-173&key=GRX-7052-BS"
  },
  {
    "id": "STU-2026-174",
    "name": "Chinedu Bello",
    "email": "chinedu.bello174@greach.academy",
    "password": "GRX-9830-UZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-174&key=GRX-9830-UZ",
    "startLink": "START_HERE.html?id=STU-2026-174&key=GRX-9830-UZ"
  },
  {
    "id": "STU-2026-175",
    "name": "Damilola Abubakar",
    "email": "damilola.abubakar175@greach.academy",
    "password": "GRX-3553-HF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-175&key=GRX-3553-HF",
    "startLink": "START_HERE.html?id=STU-2026-175&key=GRX-3553-HF"
  },
  {
    "id": "STU-2026-176",
    "name": "Emeka Sanusi",
    "email": "emeka.sanusi176@greach.academy",
    "password": "GRX-8593-ES",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-176&key=GRX-8593-ES",
    "startLink": "START_HERE.html?id=STU-2026-176&key=GRX-8593-ES"
  },
  {
    "id": "STU-2026-177",
    "name": "Fatima Ogunleye",
    "email": "fatima.ogunleye177@greach.academy",
    "password": "GRX-6069-CL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-177&key=GRX-6069-CL",
    "startLink": "START_HERE.html?id=STU-2026-177&key=GRX-6069-CL"
  },
  {
    "id": "STU-2026-178",
    "name": "Gbenga Akinyemi",
    "email": "gbenga.akinyemi178@greach.academy",
    "password": "GRX-9549-SP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-178&key=GRX-9549-SP",
    "startLink": "START_HERE.html?id=STU-2026-178&key=GRX-9549-SP"
  },
  {
    "id": "STU-2026-179",
    "name": "Halima Alabi",
    "email": "halima.alabi179@greach.academy",
    "password": "GRX-2770-AY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-179&key=GRX-2770-AY",
    "startLink": "START_HERE.html?id=STU-2026-179&key=GRX-2770-AY"
  },
  {
    "id": "STU-2026-180",
    "name": "Ibrahim Ojo",
    "email": "ibrahim.ojo180@greach.academy",
    "password": "GRX-1728-ET",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-180&key=GRX-1728-ET",
    "startLink": "START_HERE.html?id=STU-2026-180&key=GRX-1728-ET"
  },
  {
    "id": "STU-2026-181",
    "name": "Jumoke Igwe",
    "email": "jumoke.igwe181@greach.academy",
    "password": "GRX-4790-ZX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-181&key=GRX-4790-ZX",
    "startLink": "START_HERE.html?id=STU-2026-181&key=GRX-4790-ZX"
  },
  {
    "id": "STU-2026-182",
    "name": "Kelechi Ogundele",
    "email": "kelechi.ogundele182@greach.academy",
    "password": "GRX-6591-JH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-182&key=GRX-6591-JH",
    "startLink": "START_HERE.html?id=STU-2026-182&key=GRX-6591-JH"
  },
  {
    "id": "STU-2026-183",
    "name": "Lateef Ugwu",
    "email": "lateef.ugwu183@greach.academy",
    "password": "GRX-8859-GX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-183&key=GRX-8859-GX",
    "startLink": "START_HERE.html?id=STU-2026-183&key=GRX-8859-GX"
  },
  {
    "id": "STU-2026-184",
    "name": "Maryam Dada",
    "email": "maryam.dada184@greach.academy",
    "password": "GRX-5097-AM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-184&key=GRX-5097-AM",
    "startLink": "START_HERE.html?id=STU-2026-184&key=GRX-5097-AM"
  },
  {
    "id": "STU-2026-185",
    "name": "Ngozi Oladipo",
    "email": "ngozi.oladipo185@greach.academy",
    "password": "GRX-1356-MJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-185&key=GRX-1356-MJ",
    "startLink": "START_HERE.html?id=STU-2026-185&key=GRX-1356-MJ"
  },
  {
    "id": "STU-2026-186",
    "name": "Olumide Adeleke",
    "email": "olumide.adeleke186@greach.academy",
    "password": "GRX-8636-EG",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-186&key=GRX-8636-EG",
    "startLink": "START_HERE.html?id=STU-2026-186&key=GRX-8636-EG"
  },
  {
    "id": "STU-2026-187",
    "name": "Praise Okafor",
    "email": "praise.okafor187@greach.academy",
    "password": "GRX-7552-HP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-187&key=GRX-7552-HP",
    "startLink": "START_HERE.html?id=STU-2026-187&key=GRX-7552-HP"
  },
  {
    "id": "STU-2026-188",
    "name": "Queen Danladi",
    "email": "queen.danladi188@greach.academy",
    "password": "GRX-7731-WT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-188&key=GRX-7731-WT",
    "startLink": "START_HERE.html?id=STU-2026-188&key=GRX-7731-WT"
  },
  {
    "id": "STU-2026-189",
    "name": "Rotimi Nwosu",
    "email": "rotimi.nwosu189@greach.academy",
    "password": "GRX-9338-SU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-189&key=GRX-9338-SU",
    "startLink": "START_HERE.html?id=STU-2026-189&key=GRX-9338-SU"
  },
  {
    "id": "STU-2026-190",
    "name": "Sade Obi",
    "email": "sade.obi190@greach.academy",
    "password": "GRX-5892-ZQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-190&key=GRX-5892-ZQ",
    "startLink": "START_HERE.html?id=STU-2026-190&key=GRX-5892-ZQ"
  },
  {
    "id": "STU-2026-191",
    "name": "Tunde Ezekiel",
    "email": "tunde.ezekiel191@greach.academy",
    "password": "GRX-9349-ZQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-191&key=GRX-9349-ZQ",
    "startLink": "START_HERE.html?id=STU-2026-191&key=GRX-9349-ZQ"
  },
  {
    "id": "STU-2026-192",
    "name": "Uche Bakare",
    "email": "uche.bakare192@greach.academy",
    "password": "GRX-9015-HJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-192&key=GRX-9015-HJ",
    "startLink": "START_HERE.html?id=STU-2026-192&key=GRX-9015-HJ"
  },
  {
    "id": "STU-2026-193",
    "name": "Victor Fashola",
    "email": "victor.fashola193@greach.academy",
    "password": "GRX-3968-BP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-193&key=GRX-3968-BP",
    "startLink": "START_HERE.html?id=STU-2026-193&key=GRX-3968-BP"
  },
  {
    "id": "STU-2026-194",
    "name": "Wale Chukwu",
    "email": "wale.chukwu194@greach.academy",
    "password": "GRX-3856-UZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-194&key=GRX-3856-UZ",
    "startLink": "START_HERE.html?id=STU-2026-194&key=GRX-3856-UZ"
  },
  {
    "id": "STU-2026-195",
    "name": "Yemi Musa",
    "email": "yemi.musa195@greach.academy",
    "password": "GRX-9650-NK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-195&key=GRX-9650-NK",
    "startLink": "START_HERE.html?id=STU-2026-195&key=GRX-9650-NK"
  },
  {
    "id": "STU-2026-196",
    "name": "Zainab Taiwo",
    "email": "zainab.taiwo196@greach.academy",
    "password": "GRX-2742-YZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-196&key=GRX-2742-YZ",
    "startLink": "START_HERE.html?id=STU-2026-196&key=GRX-2742-YZ"
  },
  {
    "id": "STU-2026-197",
    "name": "Amara Momoh",
    "email": "amara.momoh197@greach.academy",
    "password": "GRX-1473-MF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-197&key=GRX-1473-MF",
    "startLink": "START_HERE.html?id=STU-2026-197&key=GRX-1473-MF"
  },
  {
    "id": "STU-2026-198",
    "name": "Blessing Adewale",
    "email": "blessing.adewale198@greach.academy",
    "password": "GRX-9323-WD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-198&key=GRX-9323-WD",
    "startLink": "START_HERE.html?id=STU-2026-198&key=GRX-9323-WD"
  },
  {
    "id": "STU-2026-199",
    "name": "Chidera Okonkwo",
    "email": "chidera.okonkwo199@greach.academy",
    "password": "GRX-4461-VG",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-199&key=GRX-4461-VG",
    "startLink": "START_HERE.html?id=STU-2026-199&key=GRX-4461-VG"
  },
  {
    "id": "STU-2026-200",
    "name": "David Balogun",
    "email": "david.balogun200@greach.academy",
    "password": "GRX-9004-DS",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-200&key=GRX-9004-DS",
    "startLink": "START_HERE.html?id=STU-2026-200&key=GRX-9004-DS"
  },
  {
    "id": "STU-2026-201",
    "name": "Efe Ajayi",
    "email": "efe.ajayi201@greach.academy",
    "password": "GRX-6337-JR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-201&key=GRX-6337-JR",
    "startLink": "START_HERE.html?id=STU-2026-201&key=GRX-6337-JR"
  },
  {
    "id": "STU-2026-202",
    "name": "Funke Olawale",
    "email": "funke.olawale202@greach.academy",
    "password": "GRX-9727-QN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-202&key=GRX-9727-QN",
    "startLink": "START_HERE.html?id=STU-2026-202&key=GRX-9727-QN"
  },
  {
    "id": "STU-2026-203",
    "name": "Godwin Mohammed",
    "email": "godwin.mohammed203@greach.academy",
    "password": "GRX-3490-QS",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-203&key=GRX-3490-QS",
    "startLink": "START_HERE.html?id=STU-2026-203&key=GRX-3490-QS"
  },
  {
    "id": "STU-2026-204",
    "name": "Hassan Bassey",
    "email": "hassan.bassey204@greach.academy",
    "password": "GRX-3508-TD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-204&key=GRX-3508-TD",
    "startLink": "START_HERE.html?id=STU-2026-204&key=GRX-3508-TD"
  },
  {
    "id": "STU-2026-205",
    "name": "Ifeanyi Soyinka",
    "email": "ifeanyi.soyinka205@greach.academy",
    "password": "GRX-2000-VW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-205&key=GRX-2000-VW",
    "startLink": "START_HERE.html?id=STU-2026-205&key=GRX-2000-VW"
  },
  {
    "id": "STU-2026-206",
    "name": "Joy Onuorah",
    "email": "joy.onuorah206@greach.academy",
    "password": "GRX-5593-UY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-206&key=GRX-5593-UY",
    "startLink": "START_HERE.html?id=STU-2026-206&key=GRX-5593-UY"
  },
  {
    "id": "STU-2026-207",
    "name": "Kunle Haruna",
    "email": "kunle.haruna207@greach.academy",
    "password": "GRX-3932-DZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-207&key=GRX-3932-DZ",
    "startLink": "START_HERE.html?id=STU-2026-207&key=GRX-3932-DZ"
  },
  {
    "id": "STU-2026-208",
    "name": "Loveth Lawal",
    "email": "loveth.lawal208@greach.academy",
    "password": "GRX-6843-DE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-208&key=GRX-6843-DE",
    "startLink": "START_HERE.html?id=STU-2026-208&key=GRX-6843-DE"
  },
  {
    "id": "STU-2026-209",
    "name": "Michael Suleiman",
    "email": "michael.suleiman209@greach.academy",
    "password": "GRX-1878-US",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-209&key=GRX-1878-US",
    "startLink": "START_HERE.html?id=STU-2026-209&key=GRX-1878-US"
  },
  {
    "id": "STU-2026-210",
    "name": "Nneka Yusuf",
    "email": "nneka.yusuf210@greach.academy",
    "password": "GRX-7781-RM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-210&key=GRX-7781-RM",
    "startLink": "START_HERE.html?id=STU-2026-210&key=GRX-7781-RM"
  },
  {
    "id": "STU-2026-211",
    "name": "Olamide Salami",
    "email": "olamide.salami211@greach.academy",
    "password": "GRX-9946-YH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-211&key=GRX-9946-YH",
    "startLink": "START_HERE.html?id=STU-2026-211&key=GRX-9946-YH"
  },
  {
    "id": "STU-2026-212",
    "name": "Peter Nnamdi",
    "email": "peter.nnamdi212@greach.academy",
    "password": "GRX-9430-JP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-212&key=GRX-9430-JP",
    "startLink": "START_HERE.html?id=STU-2026-212&key=GRX-9430-JP"
  },
  {
    "id": "STU-2026-213",
    "name": "Ruth Eze",
    "email": "ruth.eze213@greach.academy",
    "password": "GRX-8629-SK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-213&key=GRX-8629-SK",
    "startLink": "START_HERE.html?id=STU-2026-213&key=GRX-8629-SK"
  },
  {
    "id": "STU-2026-214",
    "name": "Samuel Bello",
    "email": "samuel.bello214@greach.academy",
    "password": "GRX-6316-DN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-214&key=GRX-6316-DN",
    "startLink": "START_HERE.html?id=STU-2026-214&key=GRX-6316-DN"
  },
  {
    "id": "STU-2026-215",
    "name": "Tolani Abubakar",
    "email": "tolani.abubakar215@greach.academy",
    "password": "GRX-8714-AC",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-215&key=GRX-8714-AC",
    "startLink": "START_HERE.html?id=STU-2026-215&key=GRX-8714-AC"
  },
  {
    "id": "STU-2026-216",
    "name": "Ugochukwu Sanusi",
    "email": "ugochukwu.sanusi216@greach.academy",
    "password": "GRX-5214-HA",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-216&key=GRX-5214-HA",
    "startLink": "START_HERE.html?id=STU-2026-216&key=GRX-5214-HA"
  },
  {
    "id": "STU-2026-217",
    "name": "Vivian Ogunleye",
    "email": "vivian.ogunleye217@greach.academy",
    "password": "GRX-9245-EV",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-217&key=GRX-9245-EV",
    "startLink": "START_HERE.html?id=STU-2026-217&key=GRX-9245-EV"
  },
  {
    "id": "STU-2026-218",
    "name": "Wisdom Akinyemi",
    "email": "wisdom.akinyemi218@greach.academy",
    "password": "GRX-7927-RE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-218&key=GRX-7927-RE",
    "startLink": "START_HERE.html?id=STU-2026-218&key=GRX-7927-RE"
  },
  {
    "id": "STU-2026-219",
    "name": "Yetunde Alabi",
    "email": "yetunde.alabi219@greach.academy",
    "password": "GRX-3796-FR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-219&key=GRX-3796-FR",
    "startLink": "START_HERE.html?id=STU-2026-219&key=GRX-3796-FR"
  },
  {
    "id": "STU-2026-220",
    "name": "Zubair Ojo",
    "email": "zubair.ojo220@greach.academy",
    "password": "GRX-9102-FD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-220&key=GRX-9102-FD",
    "startLink": "START_HERE.html?id=STU-2026-220&key=GRX-9102-FD"
  },
  {
    "id": "STU-2026-221",
    "name": "Aisha Igwe",
    "email": "aisha.igwe221@greach.academy",
    "password": "GRX-7913-TM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-221&key=GRX-7913-TM",
    "startLink": "START_HERE.html?id=STU-2026-221&key=GRX-7913-TM"
  },
  {
    "id": "STU-2026-222",
    "name": "Bolaji Ogundele",
    "email": "bolaji.ogundele222@greach.academy",
    "password": "GRX-6950-SZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-222&key=GRX-6950-SZ",
    "startLink": "START_HERE.html?id=STU-2026-222&key=GRX-6950-SZ"
  },
  {
    "id": "STU-2026-223",
    "name": "Chinonso Ugwu",
    "email": "chinonso.ugwu223@greach.academy",
    "password": "GRX-8216-YP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-223&key=GRX-8216-YP",
    "startLink": "START_HERE.html?id=STU-2026-223&key=GRX-8216-YP"
  },
  {
    "id": "STU-2026-224",
    "name": "Daniel Dada",
    "email": "daniel.dada224@greach.academy",
    "password": "GRX-8893-CX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-224&key=GRX-8893-CX",
    "startLink": "START_HERE.html?id=STU-2026-224&key=GRX-8893-CX"
  },
  {
    "id": "STU-2026-225",
    "name": "Eniola Oladipo",
    "email": "eniola.oladipo225@greach.academy",
    "password": "GRX-4202-CB",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-225&key=GRX-4202-CB",
    "startLink": "START_HERE.html?id=STU-2026-225&key=GRX-4202-CB"
  },
  {
    "id": "STU-2026-226",
    "name": "Femi Adeleke",
    "email": "femi.adeleke226@greach.academy",
    "password": "GRX-3589-CE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-226&key=GRX-3589-CE",
    "startLink": "START_HERE.html?id=STU-2026-226&key=GRX-3589-CE"
  },
  {
    "id": "STU-2026-227",
    "name": "Grace Okafor",
    "email": "grace.okafor227@greach.academy",
    "password": "GRX-8103-EY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-227&key=GRX-8103-EY",
    "startLink": "START_HERE.html?id=STU-2026-227&key=GRX-8103-EY"
  },
  {
    "id": "STU-2026-228",
    "name": "Hauwa Abubakar",
    "email": "hauwa.abubakar228@greach.academy",
    "password": "GRX-8010-AZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-228&key=GRX-8010-AZ",
    "startLink": "START_HERE.html?id=STU-2026-228&key=GRX-8010-AZ"
  },
  {
    "id": "STU-2026-229",
    "name": "Adaeze Sanusi",
    "email": "adaeze.sanusi229@greach.academy",
    "password": "GRX-5402-GJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-229&key=GRX-5402-GJ",
    "startLink": "START_HERE.html?id=STU-2026-229&key=GRX-5402-GJ"
  },
  {
    "id": "STU-2026-230",
    "name": "Babatunde Ogunleye",
    "email": "babatunde.ogunleye230@greach.academy",
    "password": "GRX-1156-MM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-230&key=GRX-1156-MM",
    "startLink": "START_HERE.html?id=STU-2026-230&key=GRX-1156-MM"
  },
  {
    "id": "STU-2026-231",
    "name": "Chinedu Akinyemi",
    "email": "chinedu.akinyemi231@greach.academy",
    "password": "GRX-5474-WM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-231&key=GRX-5474-WM",
    "startLink": "START_HERE.html?id=STU-2026-231&key=GRX-5474-WM"
  },
  {
    "id": "STU-2026-232",
    "name": "Damilola Alabi",
    "email": "damilola.alabi232@greach.academy",
    "password": "GRX-3260-CD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-232&key=GRX-3260-CD",
    "startLink": "START_HERE.html?id=STU-2026-232&key=GRX-3260-CD"
  },
  {
    "id": "STU-2026-233",
    "name": "Emeka Ojo",
    "email": "emeka.ojo233@greach.academy",
    "password": "GRX-4646-ZL",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-233&key=GRX-4646-ZL",
    "startLink": "START_HERE.html?id=STU-2026-233&key=GRX-4646-ZL"
  },
  {
    "id": "STU-2026-234",
    "name": "Fatima Igwe",
    "email": "fatima.igwe234@greach.academy",
    "password": "GRX-1790-YS",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-234&key=GRX-1790-YS",
    "startLink": "START_HERE.html?id=STU-2026-234&key=GRX-1790-YS"
  },
  {
    "id": "STU-2026-235",
    "name": "Gbenga Ogundele",
    "email": "gbenga.ogundele235@greach.academy",
    "password": "GRX-6345-UZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-235&key=GRX-6345-UZ",
    "startLink": "START_HERE.html?id=STU-2026-235&key=GRX-6345-UZ"
  },
  {
    "id": "STU-2026-236",
    "name": "Halima Ugwu",
    "email": "halima.ugwu236@greach.academy",
    "password": "GRX-2291-MJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-236&key=GRX-2291-MJ",
    "startLink": "START_HERE.html?id=STU-2026-236&key=GRX-2291-MJ"
  },
  {
    "id": "STU-2026-237",
    "name": "Ibrahim Dada",
    "email": "ibrahim.dada237@greach.academy",
    "password": "GRX-9608-VY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-237&key=GRX-9608-VY",
    "startLink": "START_HERE.html?id=STU-2026-237&key=GRX-9608-VY"
  },
  {
    "id": "STU-2026-238",
    "name": "Jumoke Oladipo",
    "email": "jumoke.oladipo238@greach.academy",
    "password": "GRX-5523-HB",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-238&key=GRX-5523-HB",
    "startLink": "START_HERE.html?id=STU-2026-238&key=GRX-5523-HB"
  },
  {
    "id": "STU-2026-239",
    "name": "Kelechi Adeleke",
    "email": "kelechi.adeleke239@greach.academy",
    "password": "GRX-1686-BY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-239&key=GRX-1686-BY",
    "startLink": "START_HERE.html?id=STU-2026-239&key=GRX-1686-BY"
  },
  {
    "id": "STU-2026-240",
    "name": "Lateef Okafor",
    "email": "lateef.okafor240@greach.academy",
    "password": "GRX-2782-KR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-240&key=GRX-2782-KR",
    "startLink": "START_HERE.html?id=STU-2026-240&key=GRX-2782-KR"
  },
  {
    "id": "STU-2026-241",
    "name": "Maryam Danladi",
    "email": "maryam.danladi241@greach.academy",
    "password": "GRX-8486-QN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-241&key=GRX-8486-QN",
    "startLink": "START_HERE.html?id=STU-2026-241&key=GRX-8486-QN"
  },
  {
    "id": "STU-2026-242",
    "name": "Ngozi Nwosu",
    "email": "ngozi.nwosu242@greach.academy",
    "password": "GRX-3508-XD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-242&key=GRX-3508-XD",
    "startLink": "START_HERE.html?id=STU-2026-242&key=GRX-3508-XD"
  },
  {
    "id": "STU-2026-243",
    "name": "Olumide Obi",
    "email": "olumide.obi243@greach.academy",
    "password": "GRX-2722-KE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-243&key=GRX-2722-KE",
    "startLink": "START_HERE.html?id=STU-2026-243&key=GRX-2722-KE"
  },
  {
    "id": "STU-2026-244",
    "name": "Praise Ezekiel",
    "email": "praise.ezekiel244@greach.academy",
    "password": "GRX-5177-AB",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-244&key=GRX-5177-AB",
    "startLink": "START_HERE.html?id=STU-2026-244&key=GRX-5177-AB"
  },
  {
    "id": "STU-2026-245",
    "name": "Queen Bakare",
    "email": "queen.bakare245@greach.academy",
    "password": "GRX-2165-UN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-245&key=GRX-2165-UN",
    "startLink": "START_HERE.html?id=STU-2026-245&key=GRX-2165-UN"
  },
  {
    "id": "STU-2026-246",
    "name": "Rotimi Fashola",
    "email": "rotimi.fashola246@greach.academy",
    "password": "GRX-6487-TH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-246&key=GRX-6487-TH",
    "startLink": "START_HERE.html?id=STU-2026-246&key=GRX-6487-TH"
  },
  {
    "id": "STU-2026-247",
    "name": "Sade Chukwu",
    "email": "sade.chukwu247@greach.academy",
    "password": "GRX-8713-FT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-247&key=GRX-8713-FT",
    "startLink": "START_HERE.html?id=STU-2026-247&key=GRX-8713-FT"
  },
  {
    "id": "STU-2026-248",
    "name": "Tunde Musa",
    "email": "tunde.musa248@greach.academy",
    "password": "GRX-8678-SK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-248&key=GRX-8678-SK",
    "startLink": "START_HERE.html?id=STU-2026-248&key=GRX-8678-SK"
  },
  {
    "id": "STU-2026-249",
    "name": "Uche Taiwo",
    "email": "uche.taiwo249@greach.academy",
    "password": "GRX-9422-WH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-249&key=GRX-9422-WH",
    "startLink": "START_HERE.html?id=STU-2026-249&key=GRX-9422-WH"
  },
  {
    "id": "STU-2026-250",
    "name": "Victor Momoh",
    "email": "victor.momoh250@greach.academy",
    "password": "GRX-1676-MQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-250&key=GRX-1676-MQ",
    "startLink": "START_HERE.html?id=STU-2026-250&key=GRX-1676-MQ"
  },
  {
    "id": "STU-2026-251",
    "name": "Wale Adewale",
    "email": "wale.adewale251@greach.academy",
    "password": "GRX-8184-EC",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-251&key=GRX-8184-EC",
    "startLink": "START_HERE.html?id=STU-2026-251&key=GRX-8184-EC"
  },
  {
    "id": "STU-2026-252",
    "name": "Yemi Okonkwo",
    "email": "yemi.okonkwo252@greach.academy",
    "password": "GRX-8803-QM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-252&key=GRX-8803-QM",
    "startLink": "START_HERE.html?id=STU-2026-252&key=GRX-8803-QM"
  },
  {
    "id": "STU-2026-253",
    "name": "Zainab Balogun",
    "email": "zainab.balogun253@greach.academy",
    "password": "GRX-1267-MF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-253&key=GRX-1267-MF",
    "startLink": "START_HERE.html?id=STU-2026-253&key=GRX-1267-MF"
  },
  {
    "id": "STU-2026-254",
    "name": "Amara Ajayi",
    "email": "amara.ajayi254@greach.academy",
    "password": "GRX-1557-NU",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-254&key=GRX-1557-NU",
    "startLink": "START_HERE.html?id=STU-2026-254&key=GRX-1557-NU"
  },
  {
    "id": "STU-2026-255",
    "name": "Blessing Olawale",
    "email": "blessing.olawale255@greach.academy",
    "password": "GRX-5827-FN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-255&key=GRX-5827-FN",
    "startLink": "START_HERE.html?id=STU-2026-255&key=GRX-5827-FN"
  },
  {
    "id": "STU-2026-256",
    "name": "Chidera Mohammed",
    "email": "chidera.mohammed256@greach.academy",
    "password": "GRX-5379-UW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-256&key=GRX-5379-UW",
    "startLink": "START_HERE.html?id=STU-2026-256&key=GRX-5379-UW"
  },
  {
    "id": "STU-2026-257",
    "name": "David Bassey",
    "email": "david.bassey257@greach.academy",
    "password": "GRX-1430-JW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-257&key=GRX-1430-JW",
    "startLink": "START_HERE.html?id=STU-2026-257&key=GRX-1430-JW"
  },
  {
    "id": "STU-2026-258",
    "name": "Efe Soyinka",
    "email": "efe.soyinka258@greach.academy",
    "password": "GRX-3725-YC",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-258&key=GRX-3725-YC",
    "startLink": "START_HERE.html?id=STU-2026-258&key=GRX-3725-YC"
  },
  {
    "id": "STU-2026-259",
    "name": "Funke Onuorah",
    "email": "funke.onuorah259@greach.academy",
    "password": "GRX-7037-VQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-259&key=GRX-7037-VQ",
    "startLink": "START_HERE.html?id=STU-2026-259&key=GRX-7037-VQ"
  },
  {
    "id": "STU-2026-260",
    "name": "Godwin Haruna",
    "email": "godwin.haruna260@greach.academy",
    "password": "GRX-3786-LV",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-260&key=GRX-3786-LV",
    "startLink": "START_HERE.html?id=STU-2026-260&key=GRX-3786-LV"
  },
  {
    "id": "STU-2026-261",
    "name": "Hassan Lawal",
    "email": "hassan.lawal261@greach.academy",
    "password": "GRX-2731-VK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-261&key=GRX-2731-VK",
    "startLink": "START_HERE.html?id=STU-2026-261&key=GRX-2731-VK"
  },
  {
    "id": "STU-2026-262",
    "name": "Ifeanyi Suleiman",
    "email": "ifeanyi.suleiman262@greach.academy",
    "password": "GRX-1094-FB",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-262&key=GRX-1094-FB",
    "startLink": "START_HERE.html?id=STU-2026-262&key=GRX-1094-FB"
  },
  {
    "id": "STU-2026-263",
    "name": "Joy Yusuf",
    "email": "joy.yusuf263@greach.academy",
    "password": "GRX-3768-NX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-263&key=GRX-3768-NX",
    "startLink": "START_HERE.html?id=STU-2026-263&key=GRX-3768-NX"
  },
  {
    "id": "STU-2026-264",
    "name": "Kunle Salami",
    "email": "kunle.salami264@greach.academy",
    "password": "GRX-2385-GY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-264&key=GRX-2385-GY",
    "startLink": "START_HERE.html?id=STU-2026-264&key=GRX-2385-GY"
  },
  {
    "id": "STU-2026-265",
    "name": "Loveth Nnamdi",
    "email": "loveth.nnamdi265@greach.academy",
    "password": "GRX-1595-FW",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-265&key=GRX-1595-FW",
    "startLink": "START_HERE.html?id=STU-2026-265&key=GRX-1595-FW"
  },
  {
    "id": "STU-2026-266",
    "name": "Michael Eze",
    "email": "michael.eze266@greach.academy",
    "password": "GRX-2895-XP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-266&key=GRX-2895-XP",
    "startLink": "START_HERE.html?id=STU-2026-266&key=GRX-2895-XP"
  },
  {
    "id": "STU-2026-267",
    "name": "Nneka Bello",
    "email": "nneka.bello267@greach.academy",
    "password": "GRX-1582-JX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-267&key=GRX-1582-JX",
    "startLink": "START_HERE.html?id=STU-2026-267&key=GRX-1582-JX"
  },
  {
    "id": "STU-2026-268",
    "name": "Olamide Abubakar",
    "email": "olamide.abubakar268@greach.academy",
    "password": "GRX-8650-WN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-268&key=GRX-8650-WN",
    "startLink": "START_HERE.html?id=STU-2026-268&key=GRX-8650-WN"
  },
  {
    "id": "STU-2026-269",
    "name": "Peter Sanusi",
    "email": "peter.sanusi269@greach.academy",
    "password": "GRX-1567-YX",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-269&key=GRX-1567-YX",
    "startLink": "START_HERE.html?id=STU-2026-269&key=GRX-1567-YX"
  },
  {
    "id": "STU-2026-270",
    "name": "Ruth Ogunleye",
    "email": "ruth.ogunleye270@greach.academy",
    "password": "GRX-4113-RZ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-270&key=GRX-4113-RZ",
    "startLink": "START_HERE.html?id=STU-2026-270&key=GRX-4113-RZ"
  },
  {
    "id": "STU-2026-271",
    "name": "Samuel Akinyemi",
    "email": "samuel.akinyemi271@greach.academy",
    "password": "GRX-1770-GE",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-271&key=GRX-1770-GE",
    "startLink": "START_HERE.html?id=STU-2026-271&key=GRX-1770-GE"
  },
  {
    "id": "STU-2026-272",
    "name": "Tolani Alabi",
    "email": "tolani.alabi272@greach.academy",
    "password": "GRX-2073-GA",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-272&key=GRX-2073-GA",
    "startLink": "START_HERE.html?id=STU-2026-272&key=GRX-2073-GA"
  },
  {
    "id": "STU-2026-273",
    "name": "Ugochukwu Ojo",
    "email": "ugochukwu.ojo273@greach.academy",
    "password": "GRX-1714-MG",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-273&key=GRX-1714-MG",
    "startLink": "START_HERE.html?id=STU-2026-273&key=GRX-1714-MG"
  },
  {
    "id": "STU-2026-274",
    "name": "Vivian Igwe",
    "email": "vivian.igwe274@greach.academy",
    "password": "GRX-9954-ER",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-274&key=GRX-9954-ER",
    "startLink": "START_HERE.html?id=STU-2026-274&key=GRX-9954-ER"
  },
  {
    "id": "STU-2026-275",
    "name": "Wisdom Ogundele",
    "email": "wisdom.ogundele275@greach.academy",
    "password": "GRX-9850-FV",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-275&key=GRX-9850-FV",
    "startLink": "START_HERE.html?id=STU-2026-275&key=GRX-9850-FV"
  },
  {
    "id": "STU-2026-276",
    "name": "Yetunde Ugwu",
    "email": "yetunde.ugwu276@greach.academy",
    "password": "GRX-9874-JN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-276&key=GRX-9874-JN",
    "startLink": "START_HERE.html?id=STU-2026-276&key=GRX-9874-JN"
  },
  {
    "id": "STU-2026-277",
    "name": "Zubair Dada",
    "email": "zubair.dada277@greach.academy",
    "password": "GRX-8602-CA",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-277&key=GRX-8602-CA",
    "startLink": "START_HERE.html?id=STU-2026-277&key=GRX-8602-CA"
  },
  {
    "id": "STU-2026-278",
    "name": "Aisha Oladipo",
    "email": "aisha.oladipo278@greach.academy",
    "password": "GRX-7774-KC",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-278&key=GRX-7774-KC",
    "startLink": "START_HERE.html?id=STU-2026-278&key=GRX-7774-KC"
  },
  {
    "id": "STU-2026-279",
    "name": "Bolaji Adeleke",
    "email": "bolaji.adeleke279@greach.academy",
    "password": "GRX-3924-ED",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-279&key=GRX-3924-ED",
    "startLink": "START_HERE.html?id=STU-2026-279&key=GRX-3924-ED"
  },
  {
    "id": "STU-2026-280",
    "name": "Chinonso Okafor",
    "email": "chinonso.okafor280@greach.academy",
    "password": "GRX-4266-NJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-280&key=GRX-4266-NJ",
    "startLink": "START_HERE.html?id=STU-2026-280&key=GRX-4266-NJ"
  },
  {
    "id": "STU-2026-281",
    "name": "Daniel Danladi",
    "email": "daniel.danladi281@greach.academy",
    "password": "GRX-5569-ZR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-281&key=GRX-5569-ZR",
    "startLink": "START_HERE.html?id=STU-2026-281&key=GRX-5569-ZR"
  },
  {
    "id": "STU-2026-282",
    "name": "Eniola Nwosu",
    "email": "eniola.nwosu282@greach.academy",
    "password": "GRX-8669-CJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-282&key=GRX-8669-CJ",
    "startLink": "START_HERE.html?id=STU-2026-282&key=GRX-8669-CJ"
  },
  {
    "id": "STU-2026-283",
    "name": "Femi Obi",
    "email": "femi.obi283@greach.academy",
    "password": "GRX-3134-ZP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-283&key=GRX-3134-ZP",
    "startLink": "START_HERE.html?id=STU-2026-283&key=GRX-3134-ZP"
  },
  {
    "id": "STU-2026-284",
    "name": "Grace Ezekiel",
    "email": "grace.ezekiel284@greach.academy",
    "password": "GRX-9467-UV",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-284&key=GRX-9467-UV",
    "startLink": "START_HERE.html?id=STU-2026-284&key=GRX-9467-UV"
  },
  {
    "id": "STU-2026-285",
    "name": "Hauwa Alabi",
    "email": "hauwa.alabi285@greach.academy",
    "password": "GRX-8771-WD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-285&key=GRX-8771-WD",
    "startLink": "START_HERE.html?id=STU-2026-285&key=GRX-8771-WD"
  },
  {
    "id": "STU-2026-286",
    "name": "Adaeze Ojo",
    "email": "adaeze.ojo286@greach.academy",
    "password": "GRX-6282-EP",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-286&key=GRX-6282-EP",
    "startLink": "START_HERE.html?id=STU-2026-286&key=GRX-6282-EP"
  },
  {
    "id": "STU-2026-287",
    "name": "Babatunde Igwe",
    "email": "babatunde.igwe287@greach.academy",
    "password": "GRX-3272-AK",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-287&key=GRX-3272-AK",
    "startLink": "START_HERE.html?id=STU-2026-287&key=GRX-3272-AK"
  },
  {
    "id": "STU-2026-288",
    "name": "Chinedu Ogundele",
    "email": "chinedu.ogundele288@greach.academy",
    "password": "GRX-9159-RS",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-288&key=GRX-9159-RS",
    "startLink": "START_HERE.html?id=STU-2026-288&key=GRX-9159-RS"
  },
  {
    "id": "STU-2026-289",
    "name": "Damilola Ugwu",
    "email": "damilola.ugwu289@greach.academy",
    "password": "GRX-6547-NJ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-289&key=GRX-6547-NJ",
    "startLink": "START_HERE.html?id=STU-2026-289&key=GRX-6547-NJ"
  },
  {
    "id": "STU-2026-290",
    "name": "Emeka Dada",
    "email": "emeka.dada290@greach.academy",
    "password": "GRX-1344-RF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-290&key=GRX-1344-RF",
    "startLink": "START_HERE.html?id=STU-2026-290&key=GRX-1344-RF"
  },
  {
    "id": "STU-2026-291",
    "name": "Fatima Oladipo",
    "email": "fatima.oladipo291@greach.academy",
    "password": "GRX-7180-XY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-291&key=GRX-7180-XY",
    "startLink": "START_HERE.html?id=STU-2026-291&key=GRX-7180-XY"
  },
  {
    "id": "STU-2026-292",
    "name": "Gbenga Adeleke",
    "email": "gbenga.adeleke292@greach.academy",
    "password": "GRX-3943-HN",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-292&key=GRX-3943-HN",
    "startLink": "START_HERE.html?id=STU-2026-292&key=GRX-3943-HN"
  },
  {
    "id": "STU-2026-293",
    "name": "Halima Okafor",
    "email": "halima.okafor293@greach.academy",
    "password": "GRX-1467-JT",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-293&key=GRX-1467-JT",
    "startLink": "START_HERE.html?id=STU-2026-293&key=GRX-1467-JT"
  },
  {
    "id": "STU-2026-294",
    "name": "Ibrahim Danladi",
    "email": "ibrahim.danladi294@greach.academy",
    "password": "GRX-8506-QF",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-294&key=GRX-8506-QF",
    "startLink": "START_HERE.html?id=STU-2026-294&key=GRX-8506-QF"
  },
  {
    "id": "STU-2026-295",
    "name": "Jumoke Nwosu",
    "email": "jumoke.nwosu295@greach.academy",
    "password": "GRX-8724-UD",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-295&key=GRX-8724-UD",
    "startLink": "START_HERE.html?id=STU-2026-295&key=GRX-8724-UD"
  },
  {
    "id": "STU-2026-296",
    "name": "Kelechi Obi",
    "email": "kelechi.obi296@greach.academy",
    "password": "GRX-9234-YM",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-296&key=GRX-9234-YM",
    "startLink": "START_HERE.html?id=STU-2026-296&key=GRX-9234-YM"
  },
  {
    "id": "STU-2026-297",
    "name": "Lateef Ezekiel",
    "email": "lateef.ezekiel297@greach.academy",
    "password": "GRX-2106-DQ",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-297&key=GRX-2106-DQ",
    "startLink": "START_HERE.html?id=STU-2026-297&key=GRX-2106-DQ"
  },
  {
    "id": "STU-2026-298",
    "name": "Maryam Bakare",
    "email": "maryam.bakare298@greach.academy",
    "password": "GRX-6096-DY",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-298&key=GRX-6096-DY",
    "startLink": "START_HERE.html?id=STU-2026-298&key=GRX-6096-DY"
  },
  {
    "id": "STU-2026-299",
    "name": "Ngozi Fashola",
    "email": "ngozi.fashola299@greach.academy",
    "password": "GRX-1332-LH",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-299&key=GRX-1332-LH",
    "startLink": "START_HERE.html?id=STU-2026-299&key=GRX-1332-LH"
  },
  {
    "id": "STU-2026-300",
    "name": "Olumide Chukwu",
    "email": "olumide.chukwu300@greach.academy",
    "password": "GRX-3466-KR",
    "cohort": "Batch 2: 2026 Masterclass",
    "status": "Active",
    "classEndDate": "2026-06-30",
    "expiresAt": "2026-07-31",
    "accessType": "paid",
    "certificateClaimed": false,
    "certificateId": null,
    "hubLink": "Excel_Master_Course_Hub.html?id=STU-2026-300&key=GRX-3466-KR",
    "startLink": "START_HERE.html?id=STU-2026-300&key=GRX-3466-KR"
  }
];

  const GreachDB = {
    superAdmin: SUPER_ADMIN,

    // Initialize all tables in persistent storage
    init: function() {
      // Initialize Student Roster
      if (!localStorage.getItem(ROSTER_DB_KEY)) {
        localStorage.setItem(ROSTER_DB_KEY, JSON.stringify(SEED_ROSTER));
        console.log('[GreachDB] Initialized student roster in database.');
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
      if (cleanPass === 'GREACH-ADMIN-2026') {
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

      let expiresAt = null;
      if (data.durationHours && Number(data.durationHours) > 0) {
        const d = new Date();
        d.setMinutes(d.getMinutes() + Math.round(Number(data.durationHours) * 60));
        expiresAt = d.toISOString();
      }

      const pass = {
        code: code,
        label: data.label || 'Live Class Session Pass',
        cohort: data.cohort || 'Batch 2: 2026 Masterclass',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt,
        isActive: true,
        createdBy: adminUser || 'Super Admin'
      };

      passes.unshift(pass);
      localStorage.setItem(SESSION_PASSES_KEY, JSON.stringify(passes));
      this.logAudit(adminUser || 'Super Admin', 'Session Pass Created', `Created temporary code ${code} (Expires: ${expiresAt || 'Manual Revoke'})`);
      return pass;
    },

    expireSessionPass: function(code, adminUser) {
      const passes = this.getAllSessionPasses();
      const match = passes.find(p => p.code.toUpperCase() === code.trim().toUpperCase());
      if (match) {
        match.isActive = false;
        match.expiredAt = new Date().toISOString();
        localStorage.setItem(SESSION_PASSES_KEY, JSON.stringify(passes));
        this.logAudit(adminUser || 'Super Admin', 'Session Pass Expired', `Revoked session pass ${code}`);
        return { success: true, pass: match };
      }
      return { success: false, error: 'Pass code not found.' };
    },

    deleteSessionPass: function(code, adminUser) {
      let passes = this.getAllSessionPasses();
      passes = passes.filter(p => p.code.toUpperCase() !== code.trim().toUpperCase());
      localStorage.setItem(SESSION_PASSES_KEY, JSON.stringify(passes));
      this.logAudit(adminUser || 'Super Admin', 'Session Pass Deleted', `Deleted session pass ${code}`);
      return { success: true };
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
      return { success: true, post: posts[idx] };
    },

    deleteBlogPost: function(id, adminUser) {
      let posts = this.getBlogPosts();
      const match = posts.find(p => String(p.id) === String(id));
      if (!match) return { success: false, error: 'Article not found.' };

      posts = posts.filter(p => String(p.id) !== String(id));
      this.saveBlogPosts(posts);
      this.logAudit(adminUser || 'Super Admin', 'Blog Post Deleted', `Deleted article #${id}: "${match.title}"`);
      return { success: true };
    },


    getPrices: function() {
      try {
        const stored = localStorage.getItem(PRICES_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_PRICES;
      } catch(e) {
        return DEFAULT_PRICES;
      }
    },

    updateCoursePrice: function(rawKey, newCurrent, newRegular, updatedBy) {
      const prices = this.getPrices();
      const courseKey = this.normalizeCourseKey ? this.normalizeCourseKey(rawKey) : rawKey;
      if (prices[courseKey]) {
        const oldVal = prices[courseKey].current;
        prices[courseKey].current = Number(newCurrent);
        if (newRegular) prices[courseKey].regular = Number(newRegular);
        const discountPct = Math.round((1 - (prices[courseKey].current / prices[courseKey].regular)) * 100);
        prices[courseKey].discount = `${discountPct}% OFF`;
        localStorage.setItem(PRICES_KEY, JSON.stringify(prices));

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

    // ==============================================================
    // COURSE SCHEDULES & CLASS TIMINGS (Start/End Date, Start/End Time)
    // ==============================================================
    getSchedules: function() {
      try {
        const stored = localStorage.getItem(SCHEDULES_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_SCHEDULES;
      } catch(e) {
        return DEFAULT_SCHEDULES;
      }
    },

    getSchedule: function(courseKey) {
      const list = this.getSchedules();
      return list[courseKey] || DEFAULT_SCHEDULES[courseKey] || null;
    },

    updateSchedule: function(rawKey, data, updatedBy) {
      const schedules = this.getSchedules();
      const courseKey = this.normalizeCourseKey ? this.normalizeCourseKey(rawKey) : rawKey;
      if (!schedules[courseKey]) {
        schedules[courseKey] = { courseKey: courseKey, label: data.label || courseKey };
      }
      if (data.startDate) schedules[courseKey].startDate = data.startDate;
      if (data.endDate) schedules[courseKey].endDate = data.endDate;
      if (data.startTime) schedules[courseKey].startTime = data.startTime;
      if (data.endTime) schedules[courseKey].endTime = data.endTime;
      if (data.days) schedules[courseKey].days = data.days;
      if (data.cohort) schedules[courseKey].cohort = data.cohort;
      if (data.deliveryMode) schedules[courseKey].deliveryMode = data.deliveryMode;
      if (data.mode) schedules[courseKey].mode = data.mode;

      localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));

      if (this.logAudit) {
        this.logAudit(
          updatedBy || 'Super Admin',
          'Schedule & Delivery Mode Update',
          `Updated ${schedules[courseKey].label}: Delivery: ${schedules[courseKey].deliveryMode || 'live'}, Dates: ${schedules[courseKey].startDate || ''} to ${schedules[courseKey].endDate || ''}, Time: ${schedules[courseKey].startTime || ''}`
        );
      }

      if (typeof window !== 'undefined' && window.GreachSync && window.GreachSync.refresh) {
        window.GreachSync.refresh();
      }
      return { success: true, schedule: schedules[courseKey] };
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
        clean === 'Evana_Oluebube123890' || clean === 'GREACH-ADMIN-2026' || (this.sha256 && (this.sha256(clean) === 'b036f9964cc4420226fe774325139d0bc4e9c35ab7457dd864456c128d954309' || this.sha256(clean) === 'b01497f26d38c53d0473b866a445b2eb73419218b603e171cc387da5f2d9eb93'))
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

      // Check general batch tokens
      if (clean.toUpperCase() === 'GREACH-2026' || clean.toUpperCase() === 'B2-EXCEL') {
        const batchStudent = {
          id: 'STU-BATCH2-GUEST',
          name: 'Batch 2 Verified Student',
          email: 'student.batch2@greach.academy',
          cohort: 'Batch 2: 2026 Masterclass',
          accessType: 'batch_token',
          expiresAt: null
        };
        return {
          success: true,
          student: batchStudent,
          expiry: { isExpired: false, message: 'Batch Token Verified - Active Access' }
        };
      }

      // Find student by password/code OR Student ID OR Email
      const roster = this.getAllStudents();
      const match = roster.find(s => 
        (s.password && s.password.toUpperCase() === clean.toUpperCase()) ||
        (s.id && s.id.toUpperCase() === clean.toUpperCase()) ||
        (s.email && s.email.toLowerCase() === clean.toLowerCase())
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
    }
  };

  // Initialize immediately
  GreachDB.init();
  window.GreachDB = GreachDB;

  // Trigger real-time card synchronization across pages
  if (typeof window !== 'undefined' && window.GreachSync && typeof window.GreachSync.refresh === 'function') {
    window.GreachSync.refresh();
  }
})();
