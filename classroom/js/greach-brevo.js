/**
 * GREACH IMPACT ACADEMY - BREVO (SENDINBLUE) & ORDER AUTOMATION ENGINE
 * Complete Transactional Email, Live Class Reminders, Welcome Sequences & Order Management
 */

(function() {
  const BREVO_CONFIG_KEY = 'greach_brevo_config_v2';
  const DISPATCH_LOG_KEY = 'greach_email_dispatch_log_v2';
  const ORDERS_DB_KEY = 'greach_course_orders_v2';

  const DEFAULT_CONFIG = {
    apiKey: '',
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
        return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
      } catch(e) {
        return DEFAULT_CONFIG;
      }
    },

    saveConfig: function(cfg) {
      const current = this.getConfig();
      const updated = { ...current, ...cfg, updatedAt: new Date().toISOString() };
      localStorage.setItem(BREVO_CONFIG_KEY, JSON.stringify(updated));
      console.log('[GreachBrevo] Configuration saved. API Key active:', !!updated.apiKey);
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
      const apiKey = cfg.apiKey ? cfg.apiKey.trim() : '';

      const payload = {
        apiKey: apiKey,
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

      // If client has Brevo API key, try direct Brevo v3 call
      if (apiKey) {
        try {
          let directPayload = null;
          if (options.type === 'payment_pending' && options.student) {
            const s = options.student;
            const amt = options.amount || (options.student ? options.student.amount : null) || 3000;
            directPayload = {
              sender: payload.sender,
              to: [{ email: s.email, name: s.name }],
              subject: `Registration Received – Complete Payment to Activate Your Access to ${s.course || 'Masterclass'}`,
              htmlContent: `
                <div style="font-family:'Segoe UI',Arial,sans-serif; background:#f8fafc; padding:24px; color:#1e293b;">
                  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; border:1px solid #e2e8f0; padding:32px; box-shadow:0 8px 24px rgba(0,0,0,0.05);">
                    <div style="text-align:center; border-bottom:2px solid #0A0A5E; padding-bottom:18px; margin-bottom:24px;">
                      <h2 style="color:#0A0A5E; margin:0; font-size:24px;">GREACH IMPACT ACADEMY</h2>
                      <p style="color:#64748b; font-size:14px; margin:4px 0 0;">Official Registration Confirmation • Learn. Practice. Grow.</p>
                    </div>
                    <p style="font-size:16px;">Dear <strong>${s.name}</strong>,</p>
                    <p>Thank you for registering for the <strong>${s.course || 'Masterclass'}</strong> (${s.cohort || 'Upcoming Batch'})! Your registration details have been securely recorded.</p>
                    
                    <div style="background:#fffbeb; border:1.5px solid #fde68a; border-radius:10px; padding:18px; margin:20px 0;">
                      <h4 style="color:#92400e; margin:0 0 10px; font-size:16px;">⏳ NEXT STEP: COMPLETE YOUR PAYMENT</h4>
                      <p style="margin:0 0 12px; font-size:14px; color:#78350f;">
                        To activate your unique Classroom Access Code and unlock the interactive workbooks and live class studio, please make a bank transfer for:
                      </p>
                      <div style="font-size:24px; font-weight:800; color:#107C41; margin-bottom:14px;">₦${Number(amt).toLocaleString()}</div>
                      <div style="background:#ffffff; border:1px solid #fed7aa; border-radius:8px; padding:14px; font-size:14px; color:#1f2937;">
                        &bull; Bank Name: <strong>Zenith Bank PLC / OPay</strong><br>
                        &bull; Account Number: <strong>1023456789</strong><br>
                        &bull; Account Name: <strong>Greach Impact Academy</strong><br>
                        &bull; Narration / Reference: <strong>${s.name}</strong>
                      </div>
                    </div>

                    <p style="font-size:14px; line-height:1.6;">Once your transfer is completed, send your payment receipt directly to our WhatsApp support team or reply to this email:</p>
                    
                    <div style="text-align:center; margin:24px 0;">
                      <a href="https://wa.me/2349072250869?text=Hello%20Greach%20Impact!%20I%20have%20completed%20payment%20for%20my%20registration%20(Name:%20${encodeURIComponent(s.name)},%20Course:%20${encodeURIComponent(s.course || 'Masterclass')})" 
                         style="background:#25D366; color:#ffffff; padding:14px 28px; border-radius:30px; text-decoration:none; font-weight:bold; font-size:15px; display:inline-block; box-shadow:0 4px 15px rgba(37,211,102,0.35);">
                        <i class="fab fa-whatsapp"></i> Send Payment Receipt on WhatsApp &rarr;
                      </a>
                    </div>

                    <p style="font-size:13px; color:#64748b; background:#f1f5f9; padding:12px; border-radius:8px;">
                      <strong>Note:</strong> Your official Classroom Access Code will be dispatched to this email immediately upon verification by the administrator.
                    </p>

                    <div style="font-size:12px; color:#94a3b8; text-align:center; margin-top:28px; border-top:1px solid #f1f5f9; padding-top:16px;">
                      Emmanuel Iheomamere • Lead Instructor & Founder<br>
                      Greach Impact Academy • greachimpact@gmail.com
                    </div>
                  </div>
                </div>
              `
            };
          } else if (options.type === 'welcome' && options.student) {
            const s = options.student;
            directPayload = {
              sender: payload.sender,
              to: [{ email: s.email, name: s.name }],
              subject: `Welcome to ${s.course || 'Masterclass'} – Your Access Code: ${s.password}`,
              htmlContent: `
                <div style="font-family:'Segoe UI',Arial,sans-serif; background:#f8fafc; padding:24px; color:#1e293b;">
                  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; border:1px solid #e2e8f0; padding:32px; box-shadow:0 8px 24px rgba(0,0,0,0.05);">
                    <div style="text-align:center; border-bottom:2px solid #0A0A5E; padding-bottom:18px; margin-bottom:24px;">
                      <h2 style="color:#0A0A5E; margin:0; font-size:24px;">GREACH IMPACT ACADEMY</h2>
                      <p style="color:#64748b; font-size:14px; margin:4px 0 0;">Official Enrollment Confirmation &bull; Learn. Practice. Grow.</p>
                    </div>
                    <p style="font-size:16px;">Dear <strong>${s.name}</strong>,</p>
                    <p>Congratulations on joining the <strong>${s.course || 'Microsoft Excel Masterclass'}</strong>!</p>
                    
                    <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:10px; padding:18px; margin:20px 0;">
                      <h4 style="color:#166534; margin:0 0 10px; font-size:16px;">🔑 YOUR CLASSROOM ACCESS CODE:</h4>
                      <div style="font-size:26px; font-weight:800; color:#107C41; font-family:monospace; letter-spacing:1.5px;">${s.password}</div>
                      <div style="margin-top:8px; font-size:14px; color:#374151;">
                        &bull; Student ID: <strong>${s.id}</strong><br>
                        &bull; Registered Email: <strong>${s.email}</strong><br>
                        &bull; Cohort: <strong>${s.cohort || 'Batch 2: 2026 Masterclass'}</strong><br>
                        &bull; Access Code Valid Until: <strong style="color:#b91c1c;">${s.expiresAt || '1 Month After Class'}</strong> (1 month after class ends)
                      </div>
                    </div>

                    <p>You can connect to the interactive classroom, download your guided exercises, and join the live studio stream immediately:</p>
                    
                    <div style="text-align:center; margin:26px 0;">
                      <a href="https://greachimpact.com/classroom/index.html?code=${encodeURIComponent(s.password)}&id=${encodeURIComponent(s.id)}" 
                         style="background:#107C41; color:#ffffff; padding:14px 32px; border-radius:30px; text-decoration:none; font-weight:bold; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(16,124,65,0.35);">
                        🚀 Connect to Classroom with 1-Click &rarr;
                      </a>
                    </div>

                    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px; margin-top:20px; font-size:13px; color:#1e40af;">
                      <strong>🎓 Lifetime Certificate Access:</strong> Even after your 1-month classroom access code expires, you have permanent lifetime access to retrieve, view, and download your official Certificate of Completion using your registered email at <strong>greachimpact.com/classroom/claim-certificate.html</strong>.
                    </div>

                    <div style="font-size:12px; color:#94a3b8; text-align:center; margin-top:28px; border-top:1px solid #f1f5f9; padding-top:16px;">
                      Emmanuel Iheomamere &bull; Lead Instructor & Founder<br>
                      Greach Impact Academy &bull; greachimpact@gmail.com
                    </div>
                  </div>
                </div>
              `
            };
          } else if (options.to && options.subject && options.htmlContent) {
            directPayload = {
              sender: payload.sender,
              to: Array.isArray(options.to) ? options.to : [{ email: options.to }],
              subject: options.subject,
              htmlContent: options.htmlContent
            };
          }

          if (directPayload) {
            const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
              },
              body: JSON.stringify(directPayload)
            });

            const data = await resp.json();
            if (resp.ok) {
              console.log('[GreachBrevo] Dispatched via Brevo API successfully:', data.messageId);
              this.logDispatch({
                type: options.type || 'direct_brevo',
                recipient: directPayload.to[0].email,
                subject: directPayload.subject,
                status: 'Sent via Brevo API',
                messageId: data.messageId
              });
              return { success: true, method: 'brevo_direct', messageId: data.messageId };
            }
          }
        } catch(e) {
          console.warn('[GreachBrevo] Client-side Brevo API fetch error, falling back to /api/brevo:', e);
        }
      }

      // Serverless Endpoint Fallback
      try {
        const resp = await fetch('/api/brevo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
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
        console.error('[GreachBrevo] All automated dispatchers failed:', err);
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

      let stuResult = null;
      if (isPaid) {
        // Send Active Access Code
        stuResult = await this.sendEmail({
          type: 'welcome',
          student: student
        });
      } else {
        // Send Payment Pending Instructions (do NOT send access code until payment is confirmed)
        stuResult = await this.sendEmail({
          type: 'payment_pending',
          student: student,
          amount: orderInfo.amount || 3000
        });
      }

      // Send New Order / Registration Alert to Admin
      const adminResult = await this.sendEmail({
        type: 'admin_alert',
        student: student
      });

      return {
        success: true,
        studentEmail: stuResult,
        adminAlert: adminResult
      };
    },

    sendClassReminder: async function(student, liveStreamUrl, liveSchedule) {
      const cfg = this.getConfig();
      const url = liveStreamUrl || 'https://greachimpact.com/classroom/index.html?code=' + encodeURIComponent(student.password);
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
                <a href="https://greachimpact.com/classroom/Excel_Master_Course_Hub.html?code=${encodeURIComponent(student.password)}" style="background:#107C41; color:white; padding:12px 24px; border-radius:24px; text-decoration:none; font-weight:bold;">
                  Open Project Submission Hub &rarr;
                </a>
              </div>
            </div>
          </div>
        `
      });
    },

    testConnection: async function(testKey, testEmail) {
      const apiKey = testKey || this.getConfig().apiKey;
      if (!apiKey) return { success: false, error: 'Please enter a Brevo API key.' };

      try {
        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': apiKey.trim(),
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'Greach Impact Academy', email: 'greachimpact@gmail.com' },
            to: [{ email: testEmail || 'greachimpact@gmail.com', name: 'Lead Administrator' }],
            subject: '✅ Brevo Email Automation Connected Successfully!',
            htmlContent: `
              <div style="font-family:sans-serif; padding:20px; background:#ecfdf5; border-radius:10px; border:1.5px solid #a7f3d0;">
                <h3 style="color:#065f46; margin-top:0;">🎉 Brevo API Connection Operational</h3>
                <p>Your Brevo API key has been authenticated successfully. Automated student welcome emails, order alerts, and live class reminders are now active.</p>
                <p style="font-size:12px; color:#6b7280;">Timestamp: ${new Date().toLocaleString()}</p>
              </div>
            `
          })
        });

        const data = await resp.json();
        if (resp.ok) {
          return { success: true, messageId: data.messageId };
        } else {
          return { success: false, error: data.message || 'Brevo API authentication error.' };
        }
      } catch(e) {
        return { success: false, error: e.message || 'Network error reaching Brevo API.' };
      }
    }
  };

  window.GreachBrevo = GreachBrevo;
})();
