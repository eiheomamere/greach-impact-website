/**
 * GREACH IMPACT ACADEMY - BREVO (SENDINBLUE) & ORDER AUTOMATION ENGINE
 * Complete Transactional Email, Live Class Reminders, Welcome Sequences & Order Management
 */

(function() {
  const BREVO_CONFIG_KEY = 'greach_brevo_config_v2';
  const DISPATCH_LOG_KEY = 'greach_email_dispatch_log_v2';
  const ORDERS_DB_KEY = 'greach_course_orders_v2';

  const DEFAULT_CONFIG = {
    senderName: 'Emmanuel from Greach Impact Academy',
    senderEmail: 'greachimpact@gmail.com',
    adminEmail: 'greachimpact@gmail.com',
    autoSendWelcome: true,
    autoSendAdminAlert: true,
    autoSendReminders: true
  };

  const GreachBrevo = {
    // 1. Configuration
    getConfig: function() {
      try {
        const stored = localStorage.getItem(BREVO_CONFIG_KEY);
        if (!stored) return DEFAULT_CONFIG;
        const parsed = JSON.parse(stored);
        if (Object.prototype.hasOwnProperty.call(parsed, 'apiKey')) {
          delete parsed.apiKey;
          localStorage.setItem(BREVO_CONFIG_KEY, JSON.stringify(parsed));
        }
        return { ...DEFAULT_CONFIG, ...parsed };
      } catch(e) {
        return DEFAULT_CONFIG;
      }
    },

    saveConfig: function(cfg) {
      const current = this.getConfig();
      const { senderName, senderEmail, adminEmail, autoSendWelcome, autoSendAdminAlert, autoSendReminders } = cfg || {};
      const updated = {
        ...current,
        ...(senderName !== undefined ? { senderName } : {}),
        ...(senderEmail !== undefined ? { senderEmail } : {}),
        ...(adminEmail !== undefined ? { adminEmail } : {}),
        ...(autoSendWelcome !== undefined ? { autoSendWelcome } : {}),
        ...(autoSendAdminAlert !== undefined ? { autoSendAdminAlert } : {}),
        ...(autoSendReminders !== undefined ? { autoSendReminders } : {}),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(BREVO_CONFIG_KEY, JSON.stringify(updated));
      return updated;
    },

    getDispatchLogs: function() {
      try {
        const stored = localStorage.getItem(DISPATCH_LOG_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch(e) {
        return [];
      }
    },

    logDispatch: function(entry) {
      const logs = this.getDispatchLogs();
      logs.unshift({
        id: 'LOG-' + Date.now(),
        timestamp: new Date().toISOString(),
        ...entry
      });
      // Keep last 150 logs
      if (logs.length > 150) logs.length = 150;
      localStorage.setItem(DISPATCH_LOG_KEY, JSON.stringify(logs));
    },

    // 2. Orders Management
    getAllOrders: function() {
      try {
        const stored = localStorage.getItem(ORDERS_DB_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch(e) {
        return [];
      }
    },

    saveOrder: function(orderData) {
      const orders = this.getAllOrders();
      const newOrder = {
        orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        timestamp: new Date().toISOString(),
        studentName: (orderData.name || '').trim(),
        studentEmail: (orderData.email || '').trim().toLowerCase(),
        studentPhone: orderData.phone || '',
        courseKey: orderData.courseKey || 'excel_beginners',
        courseName: orderData.courseName || 'Microsoft Excel Masterclass',
        amount: orderData.amount || 3000,
        paymentStatus: orderData.paymentStatus || 'Pending Verification',
        paymentMethod: orderData.paymentMethod || 'Bank Transfer',
        accessCode: orderData.password || orderData.accessCode || '',
        studentId: orderData.id || orderData.studentId || '',
        cohort: orderData.cohort || 'Batch 2: 2026 Masterclass',
        notes: orderData.notes || ''
      };

      orders.unshift(newOrder);
      localStorage.setItem(ORDERS_DB_KEY, JSON.stringify(orders));
      console.log('[GreachBrevo] New order recorded:', newOrder.orderId, newOrder.studentName, 'Amount: ₦' + newOrder.amount);
      return newOrder;
    },

    updateOrderStatus: function(orderId, status) {
      const orders = this.getAllOrders();
      const match = orders.find(o => o.orderId === orderId);
      if (match) {
        match.paymentStatus = status;
        match.updatedAt = new Date().toISOString();
        localStorage.setItem(ORDERS_DB_KEY, JSON.stringify(orders));
        return match;
      }
      return null;
    },

    // 3. Core Dispatcher (Brevo API v3 with Serverless Fallback)
    sendEmail: async function(options) {
      const cfg = this.getConfig();

      const payload = {
        sender: {
          name: cfg.senderName || 'Greach Impact Academy',
          email: cfg.senderEmail || 'greachimpact@gmail.com'
        },
        type: options.type,
        student: options.student,
        to: options.to,
        subject: options.subject,
        htmlContent: options.htmlContent
      };
      // Serverless Endpoint Fallback (with fast 2200ms timeout)
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 2200) : null;
        const resp = await fetch('/api/brevo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          ...(controller ? { signal: controller.signal } : {})
        });
        if (timer) clearTimeout(timer);
        const result = await resp.json();

        this.logDispatch({
          type: options.type || 'serverless_brevo',
          recipient: options.student ? options.student.email : (options.to ? (Array.isArray(options.to) ? options.to[0].email : options.to) : 'admin'),
          subject: options.subject || (options.type === 'welcome' ? 'Welcome & Access Code' : 'Notification'),
          status: result.dispatched ? 'Sent via Brevo Serverless' : 'Prepared / Ready',
          details: result
        });

        return result;
      } catch(err) {
        console.warn('[GreachBrevo] Automated dispatcher fallback:', err.message);
        return { success: false, error: err.message };
      }
    },

    // 4. Automated Triggers
    triggerRegistrationAutomation: async function(student, orderInfo = {}) {
      console.log('[GreachBrevo] Triggering Registration & Order Automation for:', student.name, student.email);

      const isPaid = (student.paymentStatus === 'Verified & Paid') || (student.isFree === true) || (orderInfo.paymentStatus === 'Verified & Paid');

      // Record in Orders Database
      this.saveOrder({
        ...student,
        amount: orderInfo.amount || 3000,
        courseKey: orderInfo.courseKey || 'excel_beginners',
        courseName: student.course || orderInfo.courseName || 'Microsoft Excel Masterclass',
        paymentStatus: isPaid ? 'Verified & Paid' : 'Pending Verification',
        paymentMethod: orderInfo.paymentMethod || 'Direct Bank Transfer'
      });

      const stuPromise = isPaid
        ? this.sendEmail({ type: 'welcome', student: student })
        : this.sendEmail({ type: 'payment_pending', student: student, amount: orderInfo.amount || 3000 });

      const adminPromise = this.sendEmail({
        type: 'admin_alert',
        student: student
      });

      // Dispatch both emails in PARALLEL so registration completes twice as fast
      const [stuRes, adminRes] = await Promise.allSettled([stuPromise, adminPromise]);

      return {
        success: true,
        studentEmail: stuRes.status === 'fulfilled' ? stuRes.value : null,
        adminAlert: adminRes.status === 'fulfilled' ? adminRes.value : null
      };
    },

    sendClassReminder: async function(student, liveStreamUrl, liveSchedule) {
      const cfg = this.getConfig();
      const url = liveStreamUrl || 'https://greach-impact-website.vercel.app/classroom/index.html?code=' + encodeURIComponent(student.password);
      const schedule = liveSchedule || 'Saturday at 10:00 AM West Africa Time (WAT)';

      return await this.sendEmail({
        to: [{ email: student.email, name: student.name }],
        subject: `⏰ Reminder: Microsoft Excel Live Class starts ${schedule}`,
        htmlContent: `
          <div style="font-family:'Segoe UI',Arial,sans-serif; background:#f8fafc; padding:20px; color:#1e293b;">
            <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; padding:28px; border:1px solid #e2e8f0;">
              <h2 style="color:#0A0A5E; margin-top:0;">📢 Microsoft Excel Live Class Reminder</h2>
              <p>Dear <strong>${student.name}</strong>,</p>
              <p>This is a reminder that your live session for the <strong>Microsoft Excel Masterclass</strong> starts <strong>${schedule}</strong>.</p>
              
              <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:16px; margin:20px 0;">
                <h4 style="margin:0 0 8px; color:#0369a1;">Live Session Checklist:</h4>
                <ul style="margin:0; padding-left:20px; font-size:14px; color:#334155;">
                  <li>Open your practice workbook: <code>Master_Excel_Course_Exercises.xlsx</code></li>
                  <li>Split screen: [Win + Left Arrow] for Stream, [Win + Right Arrow] for Excel</li>
                  <li>Your Access Code: <strong>${student.password}</strong></li>
                </ul>
              </div>

              <div style="text-align:center; margin:24px 0;">
                <a href="${url}" style="background:#dc2626; color:white; padding:14px 28px; border-radius:30px; text-decoration:none; font-weight:bold; font-size:16px; display:inline-block;">
                  🔴 Click Here to Join Live Class
                </a>
              </div>

              <p style="font-size:13px; color:#64748b;">See you in class!<br>Emmanuel Iheomamere &bull; Lead Instructor</p>
            </div>
          </div>
        `
      });
    },

    sendProjectReminder: async function(student) {
      return await this.sendEmail({
        to: [{ email: student.email, name: student.name }],
        subject: `📊 Capstone Project Due & Certificate Eligibility Reminder`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif; background:#f8fafc; padding:20px;">
            <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; padding:24px; border:1px solid #e2e8f0;">
              <h2 style="color:#0A0A5E; margin-top:0;">🏆 Final Capstone Project Reminder</h2>
              <p>Dear <strong>${student.name}</strong>,</p>
              <p>You have made fantastic progress through the 64 masterclass lessons! Remember to submit your final Capstone Project from inside the classroom hub to be certified.</p>
              <p>Once approved, your accredited <strong>Certificate of Excellence</strong> will be issued to you.</p>
              <div style="text-align:center; margin:20px 0;">
                <a href="https://greach-impact-website.vercel.app/classroom/Excel_Master_Course_Hub.html?code=${encodeURIComponent(student.password)}" style="background:#107C41; color:white; padding:12px 24px; border-radius:24px; text-decoration:none; font-weight:bold;">
                  Open Project Submission Hub &rarr;
                </a>
              </div>
            </div>
          </div>
        `
      });
    },

    testConnection: async function(testEmail, adminToken) {
      if (!adminToken) return { success: false, error: 'A verified Super Admin session is required.' };
      try {
        const resp = await fetch('/api/brevo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ type: 'test_connection', testEmail })
        });
        const data = await resp.json();
        return resp.ok
          ? { success: true, messageId: data.messageId }
          : { success: false, error: data.error || 'Server-side Brevo test failed.' };
      } catch(e) {
        return { success: false, error: e.message || 'Network error reaching the serverless email service.' };
      }
    }
  };

  window.GreachBrevo = GreachBrevo;
})();
