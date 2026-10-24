/**
 * GREACH IMPACT ACADEMY - UNIVERSAL ENTERPRISE BRAND & DATA SYNC ENGINE
 * Synchronizes real-time prices, schedules, and delivery formats (Live vs Self-Paced Recorded)
 * across all cards on index.html, training.html, registration.html, and course detail pages.
 */

(function() {
  const COURSE_DEFS = [
    {
      key: 'excel_beginners',
      aliases: ['excel for beginners', 'excel beginners', 'excel beginner', 'microsoft excel for beginners', 'excel_beginners'],
      pageUrl: 'excel-beginners.html',
      cardId: 'excel-beginners'
    },
    {
      key: 'excel_advanced',
      aliases: ['excel advanced', 'advanced excel', 'microsoft excel advanced', 'excel_advanced'],
      pageUrl: 'excel-advanced.html',
      cardId: 'excel-advanced'
    },
    {
      key: 'excel_dashboard',
      aliases: ['excel dashboard for beginners', 'excel dashboard', 'executive dashboard', 'dashboard beginners', 'dashboard', 'excel_dashboard'],
      pageUrl: 'excel-dashboard-beginners.html',
      cardId: 'excel-dashboard'
    },
    {
      key: 'sql',
      aliases: ['sql for beginners', 'sql', 'sql beginners', 'sql_beginners', 'sql data analytics'],
      pageUrl: 'sql-beginners.html',
      cardId: 'sql-beginners'
    },
    {
      key: 'power_bi',
      aliases: ['power bi for beginners', 'power bi', 'power-bi', 'power_bi'],
      pageUrl: 'power-bi-beginners.html',
      cardId: 'power-bi'
    },
    {
      key: 'complete_course',
      aliases: ['excel complete package', 'complete course', 'complete analytics suite', 'complete_course', 'complete_package'],
      pageUrl: '',
      cardId: 'complete-package'
    }
  ];

  function injectTypographyAndBrandColors() {
    if (!document.getElementById('greach-typography-link')) {
      const link = document.createElement('link');
      link.id = 'greach-typography-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Outfit:wght@500;600;700;800;900&display=swap';
      document.head.appendChild(link);
    }

    if (!document.getElementById('greach-brand-styles')) {
      const style = document.createElement('style');
      style.id = 'greach-brand-styles';
      style.textContent = `
        :root {
          --navy-primary: #0A0A5E !important;
          --navy: #0A0A5E !important;
          --navy-deep: #071224 !important;
          --navy-900: #0a192f !important;
          --navy-800: #112641 !important;
          --teal: #64C7D4 !important;
          --teal-accent: #64C7D4 !important;
          --teal-dark: #0d9488 !important;
          --gold: #D97706 !important;
          --gold-500: #D97706 !important;
          --gold-400: #F59E0B !important;
          --excel-green: #107C41 !important;
          --excel-dark: #0b5e31 !important;
        }
        body, input, button, select, textarea, p, span, li, a, label {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          letter-spacing: -0.01em;
        }
        h1, h2, h3, h4, h5, h6, .brand-title, .hero-title, .platform-brand-text h1, .cert-main-title {
          font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif !important;
          letter-spacing: -0.025em;
        }

        /* Complex Layout Containment for Snappy INP Responsiveness */
        .admin-card, .dl-card, .course-card, .program-card, .table-responsive {
          content-visibility: auto;
          contain-intrinsic-size: auto 320px;
        }
        @supports not (content-visibility: auto) {
          .admin-card, .dl-card, .course-card, .program-card, .table-responsive {
            contain: layout style paint;
          }
        }

        /* =========================================================
           GREACH IMPACT SIGNATURE ANIMATED LOADING EXPERIENCE
           ========================================================= */
        .greach-loader-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2147483640;
          background: radial-gradient(circle at center, rgba(10, 10, 94, 0.88) 0%, rgba(7, 18, 36, 0.96) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: none;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          opacity: 0;
          transition: opacity 0.25s ease, display 0.25s ease allow-discrete;
        }
        .greach-loader-backdrop.active {
          display: flex;
          opacity: 1;
        }
        @starting-style {
          .greach-loader-backdrop.active {
            opacity: 0;
          }
        }
        .greach-loader-card {
          background: linear-gradient(145deg, rgba(17, 38, 65, 0.95), rgba(10, 10, 94, 0.92));
          border: 1.5px solid rgba(100, 199, 212, 0.35);
          border-radius: 24px;
          padding: 2.4rem 2.8rem;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.55), 0 0 40px rgba(16, 124, 65, 0.25);
          position: relative;
          overflow: hidden;
          transform: translateY(0) scale(1);
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .greach-loader-orb-wrap {
          position: relative;
          width: 86px;
          height: 86px;
          margin: 0 auto 1.35rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .greach-loader-ring-outer {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #64C7D4;
          border-right-color: #107C41;
          animation: greachOrbitSpin 1.15s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
          @media (prefers-reduced-motion: reduce) {
            animation: none;
            border-color: #64C7D4;
            opacity: 0.7;
          }
        }
        .greach-loader-ring-inner {
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          border: 3px solid transparent;
          border-bottom-color: #F59E0B;
          border-left-color: #38bdf8;
          animation: greachOrbitSpinReverse 1.5s linear infinite;
          @media (prefers-reduced-motion: reduce) {
            animation: none;
            border-color: #F59E0B;
            opacity: 0.5;
          }
        }
        .greach-loader-core {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #107C41, #0A0A5E);
          border: 1.5px solid rgba(245, 158, 11, 0.7);
          color: #ffffff;
          font-family: 'Outfit', sans-serif !important;
          font-weight: 900;
          font-size: 1.15rem;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(100, 199, 212, 0.4);
          animation: greachCorePulse 1.6s ease-in-out infinite;
          @media (prefers-reduced-motion: reduce) {
            animation: none;
          }
        }
        .greach-loader-wordmark {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2px;
          flex-wrap: nowrap;
          margin-bottom: 0.55rem;
          font-family: 'Outfit', sans-serif !important;
          font-size: 1.55rem;
          font-weight: 900;
          letter-spacing: 0.12em;
        }
        .greach-loader-char {
          display: inline-block;
          background: linear-gradient(135deg, #ffffff 0%, #64C7D4 50%, #F59E0B 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: greachWaveChar 1.4s ease-in-out infinite;
          animation-delay: calc(var(--char-idx, 0) * 0.06s);
          @media (prefers-reduced-motion: reduce) {
            animation: none;
          }
        }
        .greach-loader-char.space {
          width: 0.45rem;
        }
        .greach-loader-sub {
          color: #cbd5e1;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 1.1rem;
          min-height: 1.35em;
        }
        .greach-loader-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }
        .greach-loader-bar-fill {
          width: 45%;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #107C41, #64C7D4, #F59E0B);
          animation: greachProgressSlide 1.25s ease-in-out infinite;
          @media (prefers-reduced-motion: reduce) {
            animation-duration: 8s;
          }
        }
        .greach-btn-inline-wave {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }
        .greach-btn-inline-wave .gi-badge-spin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-right-color: #64C7D4;
          animation: greachOrbitSpin 0.8s linear infinite;
        }
        @keyframes greachOrbitSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes greachOrbitSpinReverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes greachCorePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes greachWaveChar {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.92; }
          40% { transform: translateY(-5px) scale(1.08); opacity: 1; }
        }
        @keyframes greachProgressSlide {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(240%); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Global Animated GREACH IMPACT Loader Controller
  const GreachLoader = {
    _el: null,
    _hideTimer: null,
    _ensureDOM: function() {
      if (typeof document === 'undefined' || !document.body) return null;
      let el = document.getElementById('greachGlobalLoaderOverlay');
      if (!el) {
        injectTypographyAndBrandColors();
        el = document.createElement('div');
        el.id = 'greachGlobalLoaderOverlay';
        el.className = 'greach-loader-backdrop';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        const text = 'GREACH IMPACT';
        const charsHtml = text.split('').map((ch, idx) =>
          ch === ' '
            ? `<span class="greach-loader-char space" style="--char-idx:${idx}">&nbsp;</span>`
            : `<span class="greach-loader-char" style="--char-idx:${idx}">${ch}</span>`
        ).join('');
        el.innerHTML = `
          <div class="greach-loader-card">
            <div class="greach-loader-orb-wrap">
              <div class="greach-loader-ring-outer"></div>
              <div class="greach-loader-ring-inner"></div>
              <div class="greach-loader-core">GI</div>
            </div>
            <div class="greach-loader-wordmark" aria-label="Greach Impact">${charsHtml}</div>
            <div class="greach-loader-sub" id="greachGlobalLoaderSub">Processing your request...</div>
            <div class="greach-loader-bar-track">
              <div class="greach-loader-bar-fill"></div>
            </div>
          </div>
        `;
        document.body.appendChild(el);
      }
      this._el = el;
      return el;
    },
    show: function(message = 'Processing your request...', autoHideMs = 8000) {
      const el = this._ensureDOM();
      if (!el) return;
      if (this._hideTimer) clearTimeout(this._hideTimer);
      const sub = document.getElementById('greachGlobalLoaderSub');
      if (sub) sub.textContent = message;
      el.classList.add('active');
      if (autoHideMs > 0) {
        this._hideTimer = setTimeout(() => this.hide(), autoHideMs);
      }
    },
    hide: function() {
      if (this._hideTimer) {
        clearTimeout(this._hideTimer);
        this._hideTimer = null;
      }
      const el = document.getElementById('greachGlobalLoaderOverlay');
      if (el) el.classList.remove('active');
    },
    wrap: async function(promiseOrFn, message = 'Processing your request...', minDisplayMs = 320) {
      const start = Date.now();
      this.show(message, 10000);
      try {
        const res = typeof promiseOrFn === 'function' ? await promiseOrFn() : await promiseOrFn;
        const elapsed = Date.now() - start;
        if (elapsed < minDisplayMs) {
          await new Promise(r => setTimeout(r, minDisplayMs - elapsed));
        }
        return res;
      } finally {
        this.hide();
      }
    },
    setButton: function(btn, isLoading, text = 'GREACH IMPACT...') {
      if (!btn) return;
      if (isLoading) {
        if (!btn.dataset.prevHtml) btn.dataset.prevHtml = btn.innerHTML;
        btn.disabled = true;
        btn.style.opacity = '0.9';
        btn.style.cursor = 'wait';
        btn.innerHTML = `<span class="greach-btn-inline-wave"><span class="gi-badge-spin"></span> <span>GREACH IMPACT • ${text}</span></span>`;
      } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        if (btn.dataset.prevHtml) {
          btn.innerHTML = btn.dataset.prevHtml;
          delete btn.dataset.prevHtml;
        }
      }
    }
  };
  if (typeof window !== 'undefined') {
    window.GreachLoader = GreachLoader;
  }

  function formatRange(startStr, endStr) {
    if (!startStr) return '';
    const s = new Date(startStr);
    const e = endStr ? new Date(endStr) : null;
    if (isNaN(s.getTime())) return startStr;

    const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
    const sDay = s.getDate();
    const sYear = s.getFullYear();

    if (!e || isNaN(e.getTime())) return `${sMonth} ${sDay}, ${sYear}`;

    const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
    const eDay = e.getDate();
    const eYear = e.getFullYear();

    if (sMonth === eMonth && sYear === eYear) {
      return `${sMonth} ${sDay} – ${eDay}, ${sYear}`;
    } else if (sYear === eYear) {
      return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${sYear}`;
    } else {
      return `${sMonth} ${sDay}, ${sYear} – ${eMonth} ${eDay}, ${eYear}`;
    }
  }

  function fetchWithTimeout(url, options = {}, timeoutMs = 2200) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  let syncRetryCount = 0;
  async function hydrateFromCloud() {
    try {
      const SUPABASE_URL = 'https://fkltvxhqizqrbvogodxv.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrbHR2eGhxaXpxcmJ2b2dvZHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MjgwNzIsImV4cCI6MjEwODMwNDA3Mn0.qwinwaYPmLyGAGLm4bXq87wfbS1EtdTUiVv_dEe6xRM';

      // 0. Proactively hydrate live prices from Supabase Cloud PostgreSQL with fast timeout
      try {
        const prRes = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/course_prices?select=*`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        }, 2200);
        if (prRes.ok) {
          const rows = await prRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const currentPrices = (window.GreachDB && window.GreachDB.getPrices) ? window.GreachDB.getPrices() : {};
            rows.forEach(r => {
              const cKey = r.course_id || r.course_key;
              if (cKey) {
                const normKey = cKey === 'dashboard' ? 'excel_dashboard' : (cKey === 'sql_beginners' ? 'sql' : (cKey === 'complete_package' ? 'complete_course' : cKey));
                const item = {
                  label: r.course_name || r.course_label || (currentPrices[normKey] ? currentPrices[normKey].label : normKey),
                  regular: Number(r.original_price) || 10000,
                  current: Number(r.promo_price) || 3000,
                  discount: r.discount_label || (r.discount_pct ? `${r.discount_pct}% OFF` : 'Special Offer')
                };
                currentPrices[normKey] = item;
              }
            });
            localStorage.setItem('greach_course_prices_v2', JSON.stringify(currentPrices));
            syncAll();
          }
        }
      } catch(e) {}

      let res = null;
      try {
        res = await fetchWithTimeout('site-data.json', {}, 1500);
      } catch (e) {
        try {
          res = await fetchWithTimeout('../site-data.json', {}, 1500);
        } catch (e2) {}
      }

      if (res && res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data.prices) {
          localStorage.setItem('greach_course_prices_v2', JSON.stringify(data.prices));
        }
        if (data.schedules) {
          localStorage.setItem('greach_course_schedules_v2', JSON.stringify(data.schedules));
        }
        if (data.blogPosts && Array.isArray(data.blogPosts)) {
          localStorage.setItem('greach_blog_posts_v2', JSON.stringify(data.blogPosts));
        }
        syncAll();
      }
    } catch (err) {
      console.warn('[GreachSync] Cloud hydration fallback to local defaults:', err);
    }
  }

function syncAll() {
    let prices = null;
    let schedules = null;

    if (window.GreachDB && typeof window.GreachDB.getPrices === 'function') {
      prices = window.GreachDB.getPrices();
      schedules = window.GreachDB.getSchedules();
    } else {
      // Fallback: direct localStorage read if GreachDB has not finished loading yet
      try {
        const rawP = localStorage.getItem('greach_course_prices_v2');
        if (rawP) prices = JSON.parse(rawP);
        const rawS = localStorage.getItem('greach_course_schedules_v2');
        if (rawS) schedules = JSON.parse(rawS);
      } catch (e) {}

      // Schedule retry so when GreachDB initializes it re-syncs
      if (syncRetryCount < 30) {
        syncRetryCount++;
        setTimeout(syncAll, 50);
      }
    }

    if (!prices) return;
    if (!schedules) schedules = {};

    // 1. Synchronize Course Cards (on index.html & training.html)
    const cards = document.querySelectorAll('.course-card, .program-card');
    cards.forEach(card => {
      // Determine which course this card represents
      const cardText = (card.innerText || card.textContent || '').toLowerCase();
      const cardLinks = Array.from(card.querySelectorAll('a')).map(a => a.getAttribute('href') || '').join(' ').toLowerCase();

      let matchedDef = null;
      for (const def of COURSE_DEFS) {
        if (card.id && (card.id === def.cardId || card.id.includes(def.key))) {
          matchedDef = def;
          break;
        }
        if (def.pageUrl && cardLinks.includes(def.pageUrl.toLowerCase())) {
          matchedDef = def;
          break;
        }
        for (const alias of def.aliases) {
          const h = card.querySelector('h3, h4');
          if (h && h.textContent.toLowerCase().includes(alias)) {
            matchedDef = def;
            break;
          }
        }
        if (matchedDef) break;
      }

      if (!matchedDef) return;

      const pr = prices[matchedDef.key];
      const sch = schedules[matchedDef.key] || {};

      // A. Update Pricing in Card
      if (pr) {
        // Price container (both .course-price and .price-section)
        const priceBox = card.querySelector('.course-price, .price-section');
        if (priceBox) {
          const formattedCur = Number(pr.current).toLocaleString();
          const formattedReg = Number(pr.regular).toLocaleString();

          // Full price display
          const priceFullEl = priceBox.querySelector('.price-full');
          if (priceFullEl) {
            priceFullEl.innerHTML = `<del style="color:#94a3b8; font-size:1rem; text-decoration:line-through;">₦${formattedReg}</del> <span style="color:#107c41; font-weight:800; font-size:1.4rem;">₦${formattedCur}</span> <span style="background:#ea580c; color:white; font-size:0.72rem; padding:2px 8px; border-radius:20px;">${pr.discount}</span>`;
          } else {
            // In index.html format
            priceBox.innerHTML = `
              <del style="color:#94a3b8; font-size:1rem; text-decoration:line-through;">₦${formattedReg}</del>
              <span style="color:#107c41; font-weight:800; font-size:1.5rem;">₦${formattedCur}</span>
              <span style="background:#ea580c; color:white; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:20px; vertical-align:middle;">${pr.discount}</span>
              <span class="early-price" style="color:#107c41; font-weight:700; display:block; margin-top:4px;">Special Offer: ₦${formattedCur}</span>
            `;
          }

          // Early price sublabel if present separately
          const earlyEl = priceBox.querySelector('.early-price, .price-early');
          if (earlyEl) {
            earlyEl.innerHTML = `Special Offer: ₦${formattedCur}`;
          }
        }
      }

      // B. Update Schedule & Delivery Mode in Card
      const metaBox = card.querySelector('.course-meta, .program-meta');
      if (metaBox && sch) {
        if (sch.deliveryMode === 'self_paced') {
          metaBox.innerHTML = `
            <span><i class="fas fa-play-circle" style="color:#0284c7;"></i> Self-Paced (Recorded)</span>
            <span><i class="fas fa-clock" style="color:#107c41;"></i> 24/7 On-Demand Access</span>
          `;
        } else {
          metaBox.innerHTML = `
            <span><i class="fas fa-calendar-alt"></i> ${sch.startDate ? formatRange(sch.startDate, sch.endDate) : '4 Weeks'}</span>
            <span><i class="fas fa-video"></i> ${sch.days || 'Saturdays & Sundays'}</span>
            <span style="font-size:0.78rem; color:#64748b;"><i class="fas fa-clock"></i> ${sch.startTime || '10:00 AM WAT'}</span>
          `;
        }
      }
    });

    // 2. Synchronize Individual Course Detail Pages (e.g. excel-dashboard-beginners.html)
    const currentPath = window.location.pathname.toLowerCase();
    let currentCourseDef = null;

    for (const def of COURSE_DEFS) {
      if (def.pageUrl && currentPath.endsWith(def.pageUrl.toLowerCase())) {
        currentCourseDef = def;
        break;
      }
    }

    if (currentCourseDef) {
      const pr = prices[currentCourseDef.key];
      const sch = schedules[currentCourseDef.key];

      if (pr) {
        const formattedCur = Number(pr.current).toLocaleString();
        const formattedReg = Number(pr.regular).toLocaleString();

        // Update hero price tag
        const priceTag = document.querySelector('.course-hero .price-tag, .price-tag');
        if (priceTag) {
          priceTag.innerHTML = `
            <del style="color:#94a3b8; font-size:1.2rem; text-decoration:line-through;">₦${formattedReg}</del>
            <span style="color:#107c41; font-weight:900; font-size:2.2rem;">₦${formattedCur}</span>
            <span class="early" style="background:#ea580c; color:white; font-size:0.85rem; padding:4px 14px; border-radius:50px;">${pr.discount} · Special Offer</span>
          `;
        }

        // Update enrollment CTA buttons mentioning fee
        document.querySelectorAll('a.btn-enroll, a.btn-primary').forEach(btn => {
          if (btn.textContent.includes('Register Now') || btn.textContent.includes('₦')) {
            btn.innerHTML = `<i class="fas fa-user-plus"></i> Register Now – ₦${formattedCur} Special Offer`;
          }
        });
      }

      if (sch) {
        // Update Start Date section
        const startDateTitle = Array.from(document.querySelectorAll('h4')).find(h => h.textContent.trim().toLowerCase() === 'start date');
        if (startDateTitle && startDateTitle.nextElementSibling) {
          if (sch.deliveryMode === 'self_paced') {
            startDateTitle.nextElementSibling.innerHTML = `<strong>Immediate Access (Recorded Modules)</strong>`;
          } else if (sch.startDate) {
            startDateTitle.nextElementSibling.innerHTML = `<strong>${formatRange(sch.startDate, sch.endDate)}</strong>`;
          }
        }

        // Update Schedule section
        const scheduleTitle = Array.from(document.querySelectorAll('h4')).find(h => h.textContent.trim().toLowerCase() === 'schedule');
        if (scheduleTitle && scheduleTitle.nextElementSibling) {
          if (sch.deliveryMode === 'self_paced') {
            scheduleTitle.nextElementSibling.innerHTML = `<strong>Learn At Your Own Pace</strong><br>24/7 Lifetime Access to all recorded videos & exercises`;
          } else {
            scheduleTitle.nextElementSibling.innerHTML = `<strong>${sch.days || 'Saturdays & Sundays'}</strong><br>${sch.startTime || '10:00 AM WAT'} – ${sch.endTime || '12:30 PM WAT'}`;
          }
        }
      }
    }

    // 3. Synchronize Registration Page Course Selector (registration.html)
    const regCards = document.querySelectorAll('.course-card-option');
    regCards.forEach(rc => {
      const radio = rc.querySelector('input[type="radio"]');
      if (!radio) return;
      const val = radio.value;
      const matchedKey = window.GreachDB.normalizeCourseKey(val);
      const pr = prices[matchedKey];
      if (pr) {
        const actualEl = rc.querySelector('.price-actual');
        const slashedEl = rc.querySelector('.price-slashed');
        const tagEl = rc.querySelector('.course-card-tag');
        if (actualEl) actualEl.textContent = '₦' + Number(pr.current).toLocaleString();
        if (slashedEl) slashedEl.textContent = '₦' + Number(pr.regular).toLocaleString();
        if (tagEl) tagEl.textContent = pr.discount + ' SPECIAL';

        // Update onclick attribute
        rc.setAttribute('onclick', `selectCourseCard('${matchedKey}', ${pr.current}, ${pr.regular}, '${pr.label}')`);
      }
    });

    console.log('[GreachSync] Universal cards, prices, and schedules synchronized successfully.');
  }

  function bindGlobalNavigationLoader() {
    if (typeof document === 'undefined' || window.__greachNavLoaderBound) return;
    window.__greachNavLoaderBound = true;

    window.addEventListener('pageshow', () => {
      if (window.GreachLoader) window.GreachLoader.hide();
    });

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = link.getAttribute('href') || '';
      const target = link.getAttribute('target') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || link.hasAttribute('download') || target === '_blank') {
        return;
      }
      if (href.includes('.html') || href.startsWith('/')) {
        let label = 'Loading Greach Impact Portal...';
        const lower = href.toLowerCase();
        if (lower.includes('sql_master')) label = 'Launching SQL Analytics Classroom...';
        else if (lower.includes('powerbi_master')) label = 'Launching Power BI Classroom...';
        else if (lower.includes('excel_dashboard')) label = 'Launching Executive Dashboard Classroom...';
        else if (lower.includes('excel_master') && lower.includes('advanced')) label = 'Launching Excel Advanced Classroom...';
        else if (lower.includes('excel_master') && lower.includes('all')) label = 'Launching Complete Suite VIP Classroom...';
        else if (lower.includes('excel_master')) label = 'Launching Excel Masterclass Classroom...';
        else if (lower.includes('classroom')) label = 'Opening Greach Impact Classroom Hub...';
        else if (lower.includes('admin')) label = 'Opening Super Admin Control Center...';
        else if (lower.includes('registration')) label = 'Opening Course Registration...';
        if (window.GreachLoader) window.GreachLoader.show(label, 5000);
      }
    });
  }

  // Execute on load if in browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectTypographyAndBrandColors();
        bindGlobalNavigationLoader();
        syncAll();
        if (typeof hydrateFromCloud === "function") hydrateFromCloud();
      });
    } else {
      injectTypographyAndBrandColors();
      bindGlobalNavigationLoader();
      syncAll();
      if (typeof hydrateFromCloud === "function") hydrateFromCloud();
    }
  }

  window.GreachSync = {
    refresh: syncAll,
    hydrate: hydrateFromCloud,
    inject: injectTypographyAndBrandColors,
    loader: GreachLoader
  };
})();
