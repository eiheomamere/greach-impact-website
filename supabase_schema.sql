-- ==============================================================
-- GREACH IMPACT ACADEMY - ENTERPRISE SUPABASE / POSTGRESQL SCHEMA
-- Scalable Production Cloud Database Schema
-- Compatible with Supabase Free & Pro tiers (PostgreSQL 15+)
-- ==============================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STUDENTS TABLE (Official Student Roster & Bank)
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(50) PRIMARY KEY,                 -- e.g. STU-2026-0001
  full_name VARCHAR(255) NOT NULL,
  registered_email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  secret_password VARCHAR(100) NOT NULL,      -- Unique access pass code
  enrolled_course VARCHAR(255) DEFAULT 'Microsoft Excel for Beginners',
  cohort VARCHAR(100) DEFAULT 'Batch 2: 2026 Masterclass',
  class_end_date VARCHAR(100),
  expires_at TIMESTAMP WITH TIME ZONE,        -- 1 month post-class expiration
  access_type VARCHAR(50) DEFAULT 'Full Course',
  certificate_claimed BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ACCESS CODES & SESSION PASSES TABLE
CREATE TABLE IF NOT EXISTS access_codes (
  code VARCHAR(100) PRIMARY KEY,             -- e.g. GRC-BEG-8912 or LIVE-SESS-491
  label VARCHAR(255) NOT NULL,
  course_name VARCHAR(255) DEFAULT 'Microsoft Excel for Beginners',
  cohort VARCHAR(100) DEFAULT 'Batch 2: 2026 Masterclass',
  student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
  student_email VARCHAR(255),
  is_session_pass BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(100) DEFAULT 'Super Admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. COURSE PRICING & DISCOUNTS TABLE
CREATE TABLE IF NOT EXISTS course_prices (
  course_id VARCHAR(100) PRIMARY KEY,        -- e.g. excel-beginners, excel-advanced
  course_name VARCHAR(255) NOT NULL,
  original_price NUMERIC NOT NULL,
  promo_price NUMERIC NOT NULL,
  discount_pct INTEGER DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'NGN',
  updated_by VARCHAR(100) DEFAULT 'Greachimpact',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. COURSE SCHEDULES & DELIVERY MODES TABLE
CREATE TABLE IF NOT EXISTS course_schedules (
  course_id VARCHAR(100) PRIMARY KEY,
  start_date VARCHAR(100) NOT NULL,
  delivery_mode VARCHAR(100) DEFAULT 'Live Interactive + Recorded Vault',
  time_slot VARCHAR(100),
  is_self_paced BOOLEAN DEFAULT FALSE,
  updated_by VARCHAR(100) DEFAULT 'Greachimpact',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. BLOG ARTICLES & CONTENT TABLE
CREATE TABLE IF NOT EXISTS blog_posts (
  id VARCHAR(100) PRIMARY KEY,               -- e.g. post-1, post-2
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(100) DEFAULT 'Greach Impact Team',
  read_time VARCHAR(50) DEFAULT '5 min read',
  image_url VARCHAR(500),
  publish_date VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Published',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ORDERS & PAYMENT PIPELINE TABLE
CREATE TABLE IF NOT EXISTS orders (
  order_id VARCHAR(100) PRIMARY KEY,         -- e.g. ORD-2026-9281
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  course_id VARCHAR(100),
  course_name VARCHAR(255) NOT NULL,
  amount NUMERIC NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'Verified & Paid',
  payment_reference VARCHAR(100),
  access_code_issued VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. LIVE STUDENT PRESENCE & LOGINS TABLE
CREATE TABLE IF NOT EXISTS student_presence (
  session_id VARCHAR(100) PRIMARY KEY,       -- e.g. SESS-1792699955-abc
  student_id VARCHAR(100) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255),
  course_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'online',       -- 'online' or 'terminated'
  device_info VARCHAR(255),
  login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. CAPSTONE PROJECT SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS project_submissions (
  submission_id VARCHAR(50) PRIMARY KEY,     -- e.g. PRJ-2026-8491
  student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  project_title VARCHAR(255) NOT NULL,
  executive_summary TEXT,
  workbook_file VARCHAR(255),
  formulas_verified TEXT[],
  status VARCHAR(50) DEFAULT 'Pending Review',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ISSUED CERTIFICATES REGISTRY
CREATE TABLE IF NOT EXISTS issued_certificates (
  serial_id VARCHAR(100) PRIMARY KEY,        -- e.g. GI-EXCEL-2026-X892
  student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255),
  course_name VARCHAR(255) NOT NULL,
  issue_date VARCHAR(100) NOT NULL,
  lead_instructor VARCHAR(255) DEFAULT 'Emmanuel Iheomamere',
  status VARCHAR(50) DEFAULT 'Verified & Accredited',
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. SUB-ADMINISTRATORS TABLE
CREATE TABLE IF NOT EXISTS sub_admins (
  username VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(100) DEFAULT 'Sub-Admin',
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. DATABASE AUDIT TRAIL TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  performed_by VARCHAR(100) NOT NULL,
  target VARCHAR(100),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- INDEXES FOR HIGH-THROUGHPUT PERFORMANCE
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_students_email ON students(registered_email);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(secret_password);
CREATE INDEX IF NOT EXISTS idx_codes_active ON access_codes(code, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_presence_status ON student_presence(status, last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_blog_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_certs_serial ON issued_certificates(serial_id);

-- ==============================================================
-- ROW LEVEL SECURITY (RLS) & PUBLIC READ ACCESS
-- ==============================================================
ALTER TABLE course_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE issued_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_presence ENABLE ROW LEVEL SECURITY;

-- 1. Public can read prices, schedules, published blogs, and verify certificates
DROP POLICY IF EXISTS "Public Read Course Prices" ON course_prices;
CREATE POLICY "Public Read Course Prices" ON course_prices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Course Schedules" ON course_schedules;
CREATE POLICY "Public Read Course Schedules" ON course_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Blog Posts" ON blog_posts;
CREATE POLICY "Public Read Blog Posts" ON blog_posts FOR SELECT USING (status = 'Published');

DROP POLICY IF EXISTS "Public Read Issued Certificates" ON issued_certificates;
CREATE POLICY "Public Read Issued Certificates" ON issued_certificates FOR SELECT USING (true);

-- 2. Anon API Key full read/write for Academy app (protected by Admin HMAC & Code Validation)
DROP POLICY IF EXISTS "Anon Access Codes Check" ON access_codes;
CREATE POLICY "Anon Access Codes Check" ON access_codes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Student Roster Operations" ON students;
CREATE POLICY "Anon Student Roster Operations" ON students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Orders Operations" ON orders;
CREATE POLICY "Anon Orders Operations" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Presence Heartbeat" ON student_presence;
CREATE POLICY "Anon Presence Heartbeat" ON student_presence FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Prices Admin Sync" ON course_prices;
CREATE POLICY "Anon Prices Admin Sync" ON course_prices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Schedules Admin Sync" ON course_schedules;
CREATE POLICY "Anon Schedules Admin Sync" ON course_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Blog Posts Admin Sync" ON blog_posts;
CREATE POLICY "Anon Blog Posts Admin Sync" ON blog_posts FOR ALL USING (true) WITH CHECK (true);
