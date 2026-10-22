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
      key: 'dashboard',
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
      `;
      document.head.appendChild(style);
    }
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

  let syncRetryCount = 0;
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

  // Execute on load if in browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectTypographyAndBrandColors();
        syncAll();
      });
    } else {
      injectTypographyAndBrandColors();
      syncAll();
    }
  }

  window.GreachSync = {
    refresh: syncAll,
    inject: injectTypographyAndBrandColors
  };
})();
