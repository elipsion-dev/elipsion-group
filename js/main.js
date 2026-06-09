/* ============================================================
   main.js — Site-wide Behaviour
   Lead-Capture-Site — vanilla HTML/CSS/JS
   Load order: config.js → main.js (both before </body>)
   ============================================================

   Sections:
   1. Config data-attribute binding
   2. Header scroll state
   3. Mobile menu toggle
   4. Scroll reveal (IntersectionObserver)
   5. FAQ accordion
   6. Before/After tab switcher
   7. Audit form handler
   8. Lucide icons init
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ----------------------------------------------------------
     1. CONFIG BINDING
     Binds SITE_CONFIG values to elements using:
       data-config="key"        → sets element.textContent
       data-config-href="key"   → sets element.href

     Supports dot-path notation, e.g. data-config="pricing.starter"
     resolves SITE_CONFIG.pricing.starter.
  ---------------------------------------------------------- */
  function getConfigValue(path) {
    if (!window.SITE_CONFIG) return null;
    return path.split('.').reduce(function (obj, key) {
      return obj && obj[key] !== undefined ? obj[key] : null;
    }, window.SITE_CONFIG);
  }

  function bindConfigValues() {
    // Text content bindings
    document.querySelectorAll('[data-config]').forEach(function (el) {
      var key   = el.getAttribute('data-config');
      var value = getConfigValue(key);
      if (value !== null) {
        el.textContent = value;
      }
    });

    // Href bindings
    document.querySelectorAll('[data-config-href]').forEach(function (el) {
      var key   = el.getAttribute('data-config-href');
      var value = getConfigValue(key);
      if (value !== null) {
        el.href = value;
      }
    });
  }

  bindConfigValues();


  /* ----------------------------------------------------------
     2. HEADER SCROLL STATE
     Adds/removes .is-scrolled on .site-header after 20px scroll.
     Uses requestAnimationFrame to throttle scroll events.
  ---------------------------------------------------------- */
  var header        = document.querySelector('.site-header');
  var ticking       = false;
  var SCROLL_THRESH = 20;

  function updateHeader() {
    if (!header) return;
    if (window.scrollY > SCROLL_THRESH) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
    ticking = false;
  }

  if (header) {
    // Set initial state
    updateHeader();

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  }


  /* ----------------------------------------------------------
     3. MOBILE MENU
     Toggles .is-open on .mobile-menu and swaps the
     hamburger / X Lucide icon in .nav__toggle.
     Locks body scroll when menu is open.
  ---------------------------------------------------------- */
  var mobileMenu   = document.querySelector('.mobile-menu');
  var navToggle    = document.querySelector('.nav__toggle');
  var menuIsOpen   = false;

  function openMobileMenu() {
    if (!mobileMenu || !navToggle) return;
    menuIsOpen = true;
    mobileMenu.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';

    // Swap icon: menu → x (use DOM methods, never innerHTML with variable content)
    setNavToggleIcon(navToggle, 'x');
  }

  function closeMobileMenu() {
    if (!mobileMenu || !navToggle) return;
    menuIsOpen = false;
    mobileMenu.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = ''; // restore scroll

    // Swap icon: x → menu
    setNavToggleIcon(navToggle, 'menu');
  }

  /**
   * Safely swaps the Lucide icon inside the nav toggle button.
   * Uses DOM createElement/setAttribute — no innerHTML — to avoid
   * any risk of XSS if this helper is ever called with dynamic input.
   * @param {HTMLElement} btn  - the toggle button element
   * @param {string}      name - a hardcoded Lucide icon name ('menu' or 'x')
   */
  function setNavToggleIcon(btn, name) {
    var icon = document.createElement('i');
    icon.setAttribute('data-lucide', name);
    while (btn.firstChild) {
      btn.removeChild(btn.firstChild);
    }
    btn.appendChild(icon);
    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ nodes: [btn] });
    }
  }

  function toggleMobileMenu() {
    if (menuIsOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', toggleMobileMenu);
  }

  // Close on any link click inside mobile menu
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuIsOpen) {
      closeMobileMenu();
    }
  });


  /* ----------------------------------------------------------
     4. SCROLL REVEAL
     Watches .reveal elements. Adds .is-visible once they
     enter the viewport (threshold 15%, rootMargin -10% bottom).
     If user prefers reduced motion, immediately mark all visible.
  ---------------------------------------------------------- */
  var revealElements = document.querySelectorAll('.reveal');

  var prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    // Immediately show all reveal elements without animation
    revealElements.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target); // fire once
          }
        });
      },
      {
        threshold:  0.15,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Fallback: no IntersectionObserver support — show all
    revealElements.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }


  /* ----------------------------------------------------------
     5. FAQ ACCORDION
     Clicking [data-faq-toggle] toggles .is-open on the
     parent .faq-item. Max-height is set inline for smooth
     animation. Multiple items can be open simultaneously.
  ---------------------------------------------------------- */
  document.querySelectorAll('[data-faq-toggle]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var item = trigger.closest('.faq-item');
      if (!item) return;

      var isOpen = item.classList.contains('is-open');
      var body   = item.querySelector('.faq-item__body');
      var content = body ? body.querySelector('.faq-item__content') : null;

      if (isOpen) {
        // Close
        item.classList.remove('is-open');
        if (body) body.style.maxHeight = '0';
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        // Open — set max-height to scrollHeight for precise animation
        item.classList.add('is-open');
        if (body && content) {
          body.style.maxHeight = content.scrollHeight + 'px';
        }
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });


  /* ----------------------------------------------------------
     6. BEFORE / AFTER TAB SWITCHER
     [data-tab="value"] buttons activate [data-panel="value"].
     Toggles .is-active on both button and panel.
     Multiple independent tab groups are supported — each
     .tabs wrapper is independent of others.
  ---------------------------------------------------------- */
  document.querySelectorAll('.tabs').forEach(function (tabGroup) {
    var buttons = tabGroup.querySelectorAll('[data-tab]');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-tab');

        // Find the nearest .tab-panels sibling (next sibling or parent's child)
        var panelContainer = tabGroup.nextElementSibling;
        if (!panelContainer || !panelContainer.classList.contains('tab-panels')) {
          panelContainer = tabGroup.closest('[data-tabs-parent]');
        }

        // Deactivate all buttons in this group
        buttons.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });

        // Activate clicked button
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');

        // Switch panels
        if (panelContainer) {
          panelContainer.querySelectorAll('[data-panel]').forEach(function (panel) {
            if (panel.getAttribute('data-panel') === value) {
              panel.classList.add('is-active');
            } else {
              panel.classList.remove('is-active');
            }
          });
        }
      });
    });

    // Activate first tab by default if none is active
    if (buttons.length > 0 && !tabGroup.querySelector('[data-tab].is-active')) {
      buttons[0].click();
    }
  });


  /* ----------------------------------------------------------
     7. AUDIT FORM HANDLER
     Selector: [data-audit-form]
     On submit:
       - Prevents default
       - Validates required fields
       - Hides form
       - Shows [data-form-success] element

     TODO: POST to backend ─────────────────────────────────
     Replace the placeholder below with your real endpoint.

     Example with Formspree:
       const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
         method: 'POST',
         headers: { 'Accept': 'application/json' },
         body: new FormData(form)
       });
       const data = await res.json();

     Example with Tally embed: replace the form with an
     <iframe> from tally.so and remove this handler.

     Example with Supabase:
       const { error } = await supabase
         .from('leads')
         .insert({ name, email, phone, business });

     ─────────────────────────────────────────────────────── */
  var auditForm = document.querySelector('[data-audit-form]');

  if (auditForm) {
    auditForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      var isValid = true;
      var errorEl = document.querySelector('[data-form-error]');
      var submitButton = auditForm.querySelector('button[type="submit"]');
      var submitLabel = auditForm.querySelector('[data-submit-label]');

      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = '';
      }

      // Required fields plus native email/URL format validation.
      auditForm.querySelectorAll('[required]').forEach(function (field) {
        var wrapper = field.closest('.field');
        if (!field.value.trim() || !field.checkValidity()) {
          isValid = false;
          if (wrapper) wrapper.classList.add('has-error');
        } else {
          if (wrapper) wrapper.classList.remove('has-error');
        }
      });

      if (!isValid) return;

      var endpoint = window.SITE_CONFIG && window.SITE_CONFIG.auditEndpoint;
      if (!endpoint) {
        if (errorEl) {
          errorEl.textContent = 'The form is temporarily unavailable. Please call or email us.';
          errorEl.hidden = false;
        }
        return;
      }

      if (submitButton) submitButton.disabled = true;
      if (submitLabel) submitLabel.textContent = 'Sending...';

      try {
        var payload = Object.fromEntries(new FormData(auditForm).entries());
        var response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var result = await response.json().catch(function () { return {}; });

        if (!response.ok) {
          throw new Error(result.error || 'Your request could not be sent. Please call or email us.');
        }

        var successEl = document.querySelector('[data-form-success]');
        auditForm.style.display = 'none';
        if (successEl) {
          successEl.classList.add('is-visible');
        }
      } catch (error) {
        if (errorEl) {
          errorEl.textContent = error.message || 'Your request could not be sent. Please call or email us.';
          errorEl.hidden = false;
        }
      } finally {
        if (submitButton) submitButton.disabled = false;
        if (submitLabel) submitLabel.textContent = 'Send My Free Audit Request';
      }
    });

    // Live-clear error state on input
    auditForm.querySelectorAll('[required]').forEach(function (field) {
      field.addEventListener('input', function () {
        var wrapper = field.closest('.field');
        if (wrapper) wrapper.classList.remove('has-error');
      });
    });
  }


  /* ----------------------------------------------------------
     8. LUCIDE ICONS INIT
     Called at the end so all data-lucide attributes are
     rendered. Also called after mobile menu icon swaps.
  ---------------------------------------------------------- */
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  } else {
    // Lucide may load slightly after DOMContentLoaded if CDN is slow.
    // Wait for it gracefully.
    window.addEventListener('load', function () {
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
  }

}); // end DOMContentLoaded
