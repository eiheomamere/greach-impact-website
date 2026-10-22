# 🚀 Greach Impact Academy - Supabase Cloud Database Setup Guide

This guide walks you through setting up **Supabase** (PostgreSQL) to scale Greach Impact into an enterprise-grade cloud database.

---

## Why Supabase?
- **Universal Instant Updates:** Any price, schedule, blog post, or student added in the Admin Portal syncs immediately to all devices worldwide.
- **PostgreSQL Power:** Real database relations, transactions, and automated backups.
- **Generous Free Tier:** 500 MB database, 50,000 monthly active users, unlimited API requests.
- **Zero Server Maintenance:** No servers to provision or patch.

---

## 5-Minute Setup Steps

### Step 1: Create Your Free Supabase Project
1. Go to **[supabase.com](https://supabase.com)** and sign in (or click "Sign Up" using GitHub or Email).
2. Click **"New Project"**.
3. Fill in:
   - **Name:** `Greach Impact Academy`
   - **Database Password:** Choose a secure database password (save this in your password manager).
   - **Region:** Select the region closest to your students (e.g., `West Europe (London)` or `East US`).
   - **Pricing Plan:** Free ($0/month).
4. Click **"Create new project"** and wait ~60 seconds for the database to provision.

---

### Step 2: Run the Database Schema (1-Click)
1. In your Supabase project dashboard, click **"SQL Editor"** on the left navigation bar (icon looks like `>_` or SQL terminal).
2. Click **"New Query"**.
3. Open the file [`supabase_schema.sql`](file:///C:/Users/EIheoma/Desktop/greach-impact-complete-registration-deploy/supabase_schema.sql) in this repository, copy its entire contents, and paste them into the SQL Editor.
4. Click the green **"Run"** button in the bottom right.
5. You will see:
   ```text
   Success. No rows returned.
   ```
   All 11 tables (`students`, `access_codes`, `course_prices`, `course_schedules`, `blog_posts`, `orders`, `student_presence`, `issued_certificates`, `project_submissions`, `sub_admins`, `audit_logs`) and performance indexes are now active!

---

### Step 3: Copy Your API Keys
1. In the Supabase left navigation bar, click the **Settings** (gear icon) -> **API** (or **Project Settings** -> **Data API**).
2. Copy the two values:
   - **Project URL:** Looks like `https://xyzabcdefghijklm.supabase.co`
   - **Project API Keys (`anon` `public`):** Looks like `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### Step 4: Connect Supabase in Greach Impact Admin Portal
1. Open [`admin.html`](file:///C:/Users/EIheoma/Desktop/greach-impact-complete-registration-deploy/admin.html) in your browser.
2. In the top navigation tabs, click **"⚡ Supabase Cloud DB"**.
3. Paste:
   - **Supabase Project URL**
   - **Supabase Anon API Key**
4. Click **"🔌 Test Connection"** — you will see a green badge: `Connection Verified!`.
5. Click **"💾 Save Configuration"**.
6. Click **"🚀 1-Click Sync All Data to Supabase"** — this uploads all existing local students, pricing, schedules, and blog posts to your live PostgreSQL database!

---

## How It Works in Daily Operations
- **When You Update Course Prices:** Saved directly to `course_prices` table.
- **When You Publish a Blog Article:** Inserted into `blog_posts` table; instantly viewable on `blog.html`.
- **When You Generate an Access Code:** Saved in `access_codes` table; student can log in from any phone or computer immediately.
- **When a Student Logs in:** Session tracked in `student_presence` table.
