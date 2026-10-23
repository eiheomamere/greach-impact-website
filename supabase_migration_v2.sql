-- ==============================================================
-- GREACH IMPACT ACADEMY - SUPABASE ENTERPRISE MIGRATION V2
-- Splits Quick Live Session Passes into a Dedicated Table
-- Implements Universal Entity ID Mapping & Cleans Duplicates
-- Paste and Run in Supabase SQL Editor
-- ==============================================================

-- 1. DEDICATED QUICK LIVE SESSION PASSES TABLE
CREATE TABLE IF NOT EXISTS live_session_passes (
  id VARCHAR(50) PRIMARY KEY,                  -- e.g. PAS-SESS-9451
  pass_code VARCHAR(100) UNIQUE NOT NULL,      -- e.g. LIVE-SESS-945
  session_label VARCHAR(255) NOT NULL,         -- e.g. Live Excel Masterclass Session
  course_id VARCHAR(100) DEFAULT 'CRS-EXC-BEG',
  course_name VARCHAR(255) DEFAULT 'Microsoft Excel for Beginners',
  cohort VARCHAR(100) DEFAULT 'Batch 2: 2026 Masterclass',
  duration_hours NUMERIC DEFAULT 2,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(100) DEFAULT 'Super Admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CAPSTONE PROJECT SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS project_submissions (
  submission_id VARCHAR(50) PRIMARY KEY,       -- e.g. PRJ-2026-8491
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

-- 3. ISSUED CERTIFICATES REGISTRY TABLE
CREATE TABLE IF NOT EXISTS issued_certificates (
  serial_id VARCHAR(100) PRIMARY KEY,          -- e.g. CRT-EXC-2026-X892
  student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255),
  course_name VARCHAR(255) NOT NULL,
  issue_date VARCHAR(100) NOT NULL,
  lead_instructor VARCHAR(255) DEFAULT 'Emmanuel Iheomamere',
  status VARCHAR(50) DEFAULT 'Verified & Accredited',
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SUB-ADMINISTRATORS TABLE
CREATE TABLE IF NOT EXISTS sub_admins (
  username VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(100) DEFAULT 'Sub-Admin',
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  performed_by VARCHAR(100) NOT NULL,
  target VARCHAR(100),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ENABLE ROW LEVEL SECURITY (RLS) FOR ALL NEW TABLES
ALTER TABLE live_session_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issued_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR LIVE_SESSION_PASSES
DROP POLICY IF EXISTS "Public read live passes" ON live_session_passes;
CREATE POLICY "Public read live passes" ON live_session_passes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert live passes" ON live_session_passes;
CREATE POLICY "Public insert live passes" ON live_session_passes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update live passes" ON live_session_passes;
CREATE POLICY "Public update live passes" ON live_session_passes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete live passes" ON live_session_passes;
CREATE POLICY "Public delete live passes" ON live_session_passes FOR DELETE USING (true);

-- 8. RLS POLICIES FOR CERTIFICATES & SUBMISSIONS
DROP POLICY IF EXISTS "Public read certs" ON issued_certificates;
CREATE POLICY "Public read certs" ON issued_certificates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert certs" ON issued_certificates;
CREATE POLICY "Public insert certs" ON issued_certificates FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read submissions" ON project_submissions;
CREATE POLICY "Public read submissions" ON project_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert submissions" ON project_submissions;
CREATE POLICY "Public insert submissions" ON project_submissions FOR INSERT WITH CHECK (true);

-- 9. DEDUPLICATE COURSE REGISTRY (Removes duplicate dashboard and aliases)
DELETE FROM course_prices WHERE course_id IN ('dashboard', 'sql_beginners', 'complete_package');
DELETE FROM course_schedules WHERE course_id = 'dashboard';

-- 10. INSERT INITIAL LIVE SESSION PASS (LIVE-SESS-945)
INSERT INTO live_session_passes (id, pass_code, session_label, course_id, course_name, cohort, duration_hours, is_active)
VALUES ('PAS-SESS-945', 'LIVE-SESS-945', 'Live Class Session Pass', 'CRS-EXC-BEG', 'Microsoft Excel for Beginners', 'Batch 2: 2026 Masterclass', 2, true)
ON CONFLICT (pass_code) DO NOTHING;
