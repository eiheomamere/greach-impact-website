# 📊 Google Sheets Cloud Database Setup for Greach Impact Academy
**Connect your Excel/Google Sheet as a 100% Free, Real-Time Cloud Database**

This setup links your **student Database** directly to a live Google Sheet in Google Drive. When a student registers, changes their password, or submits a project, the password and record are saved directly into your Google Sheet!

---

## ⚡ 2-Minute Quick Setup Guide

### Step 1: Open Your Roster Spreadsheet in Google Sheets
1. Go to [Google Drive](https://drive.google.com).
2. Upload `Student_Login_Credentials_300_Roster.xlsx` (found in this folder) to Google Drive.
3. Right-click the uploaded file and select **Open with > Google Sheets**.

### Step 2: Open Google Apps Script
1. In Google Sheets, click the top menu: **Extensions > Apps Script**.
2. Delete any default code inside the editor.
3. Open the file [`google_apps_script_db.js`](file:///c:/Users/EIheoma/Desktop/greach-impact-complete-registration-deploy/classroom/google_apps_script_db.js) from this folder, copy its full contents, and paste it into the Apps Script editor.
4. Click the **Save (floppy disk icon)** button.

### Step 3: Deploy as Web App
1. Click the blue **Deploy** button at the top right > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure the settings:
   * **Description**: `Greach Impact Student Database API`
   * **Execute as**: `Me (your email)`
   * **Who has access**: `Anyone` *(Note: This allows the website to securely save and retrieve passwords via HTTPS).*
4. Click **Deploy**.
5. Click **Authorize access** and sign in with your Google account.
6. Copy the generated **Web App URL** (it will look like `https://script.google.com/macros/s/AKfycbx.../exec`).

### Step 4: Link to Your Classroom Platform
1. Open [Excel_Master_Course_Hub.html](file:///c:/Users/EIheoma/Desktop/greach-impact-complete-registration-deploy/classroom/Excel_Master_Course_Hub.html) in your browser as Lead Instructor.
2. Click **⚙️ Settings** on the green Admin Bar.
3. Paste your Web App URL into the **Cloud Database API Endpoint** field.
4. Click **Save Settings**.

---

## 🔒 Security & Data Flow
* **Automatic Password Sync**: Every time an automated password is generated or a student registers, the system executes an encrypted background `POST` request to your Google Sheet.
* **Direct Inspection**: You can view, search, or edit any student's password directly in Google Sheets from your phone or laptop.
* **Zero Monthly Cost**: 100% free forever with zero server maintenance.
