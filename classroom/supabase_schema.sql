-- ==============================================================
-- GREACH IMPACT ACADEMY - SUPABASE / POSTGRESQL CLOUD DATABASE SCHEMA
-- ==============================================================

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(50) PRIMARY KEY, -- e.g. STU-2026-001
  full_name VARCHAR(255) NOT NULL,
  registered_email VARCHAR(255) UNIQUE NOT NULL,
  secret_password VARCHAR(100) NOT NULL, -- e.g. GRX-2951-HY
  cohort VARCHAR(100) DEFAULT 'Batch 2: 2026 Masterclass',
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Capstone Submissions Table
CREATE TABLE IF NOT EXISTS project_submissions (
  submission_id VARCHAR(50) PRIMARY KEY, -- e.g. PRJ-2026-8491
  student_id VARCHAR(50) REFERENCES students(id),
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  project_title VARCHAR(255) NOT NULL,
  executive_summary TEXT,
  workbook_file VARCHAR(255),
  formulas_verified TEXT[],
  status VARCHAR(50) DEFAULT 'Pending Review',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Issued Certificates Registry
CREATE TABLE IF NOT EXISTS issued_certificates (
  serial_id VARCHAR(100) PRIMARY KEY, -- e.g. GI-EXCEL-2026-X892
  student_id VARCHAR(50) REFERENCES students(id),
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255),
  course_name VARCHAR(255) NOT NULL,
  issue_date VARCHAR(100) NOT NULL,
  lead_instructor VARCHAR(255) DEFAULT 'Emmanuel Iheomamere',
  status VARCHAR(50) DEFAULT 'Verified & Accredited',
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_students_email ON students(registered_email);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON project_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_certs_serial ON issued_certificates(serial_id);
