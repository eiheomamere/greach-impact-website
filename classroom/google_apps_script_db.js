/**
 * GOOGLE APPS SCRIPT CLOUD DATABASE BACKEND FOR GREACH IMPACT
 * 
 * Instructions:
 * 1. Open Google Sheets (or upload Student_Login_Credentials_300_Roster.xlsx to Google Drive)
 * 2. Click Extensions > Apps Script
 * 3. Delete existing code and paste this entire file
 * 4. Click Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL (e.g., https://script.google.com/macros/s/.../exec)
 * 6. Paste that URL into your Lead Instructor Settings on the platform!
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'save';
    
    // Header format: Student ID | Full Name | Registered Email | Unique Secret Password | Cohort | Status | Updated At
    var rows = sheet.getDataRange().getValues();
    var foundIndex = -1;
    
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.studentId || (rows[i][2] && rows[i][2].toLowerCase() == data.email.toLowerCase())) {
        foundIndex = i + 1; // 1-based row index
        break;
      }
    }
    
    if (foundIndex > 0) {
      // Update existing student password
      if (data.password) sheet.getRange(foundIndex, 4).setValue(data.password);
      if (data.status) sheet.getRange(foundIndex, 6).setValue(data.status);
      sheet.getRange(foundIndex, 7).setValue(new Date().toISOString());
      return ContentService.createTextOutput(JSON.stringify({ success: true, updated: true, studentId: data.studentId })).setMimeType(ContentService.MimeType.JSON);
    } else {
      // Append new student
      sheet.appendRow([
        data.studentId || ('STU-2026-' + (rows.length)),
        data.name,
        data.email,
        data.password,
        data.cohort || 'Batch 2: 2026 Masterclass',
        data.status || 'Active',
        new Date().toISOString()
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, created: true, studentId: data.studentId })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  var students = [];
  
  for (var i = 1; i < rows.length; i++) {
    students.push({
      id: rows[i][0],
      name: rows[i][1],
      email: rows[i][2],
      password: rows[i][3],
      cohort: rows[i][4],
      status: rows[i][5]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, count: students.length, students: students })).setMimeType(ContentService.MimeType.JSON);
}
