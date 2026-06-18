/*
 * ============================================================
 * preview.js — Personalized prospect demo site
 * ------------------------------------------------------------
 * 1. Reads ?p=<token> from the URL.
 * 2. Fetches the saved company payload via the prospector
 *    Edge Function (public "getPreview" action).
 * 3. Populates the page and runs the simulated "supercharged"
 *    features (instant estimate, booking, quote form, chatbot).
 *
 * No token? Falls back to sample data so the page is viewable
 * directly (handy for design review). ?name=&city=&phone= etc.
 * query params also override, for quick manual previews.
 * ============================================================
 */
(function () {
  "use strict";

  var ENDPOINT = (window.SITE_CONFIG && window.SITE_CONFIG.prospectorEndpoint) || "";
  var EDIT_PW_KEY = "prospector_pw";       // shared with the prospector tool
  var TOKEN = null;                         // current preview token (edit/save)
  var EDITING = false;                      // true while the inline editor is on
  var RESOLVED = { name: "our team", city: "your area" }; // for {name}/{city}

  /* ── Editable copy: HVAC defaults ────────────────────────────
     Every [data-edit] key on the page has a default here. A saved
     preview's `content` overrides these; presets replace them all.
     {city}/{name} are substituted at render. *Price keys are stored
     as numbers and rendered as "from $N".                         */
  var DEFAULTS = {
    heroHeadline: "{city}'s trusted name for fast, reliable heating & cooling.",
    heroSub: "Same-day service, upfront pricing, and friendly local technicians. Book online in 60 seconds or get an instant estimate — no phone tag required.",
    heroEyebrow: "Serving the {city} area",
    servicesHead: "Complete heating & cooling, done right",
    servicesSub: "From a quick repair to a full system install, {name} keeps your home comfortable year-round.",
    svc1Icon: "❄️", svc1Title: "AC Repair", svc1Desc: "Fast diagnostics and lasting fixes to get your cool air back the same day.",
    svc2Icon: "🔥", svc2Title: "Heating & Furnace", svc2Desc: "Repairs, tune-ups, and installs to keep your home warm all winter.",
    svc3Icon: "🛠️", svc3Title: "New System Install", svc3Desc: "Right-sized, energy-efficient systems with honest, upfront quotes.",
    svc4Icon: "🧰", svc4Title: "Maintenance Plans", svc4Desc: "Seasonal tune-ups that prevent breakdowns and extend system life.",
    svc5Icon: "💨", svc5Title: "Indoor Air Quality", svc5Desc: "Filtration, humidifiers, and duct care for cleaner, healthier air.",
    svc6Icon: "🚨", svc6Title: "24/7 Emergency", svc6Desc: "No heat or no cool? We answer after hours — call anytime.",
    estimateHead: "Ballpark your project in seconds",
    estimateSub: "Pick what you need and see an estimated range right away — then book a firm quote with one tap. No waiting on a callback.",
    est1Label: "AC Repair", est1Price: 129,
    est2Label: "Furnace Tune-Up", est2Price: 89,
    est3Label: "New AC Install", est3Price: 4500,
    est4Label: "New Furnace", est4Price: 3200,
    est5Label: "Duct Cleaning", est5Price: 199,
    est6Label: "Air Quality", est6Price: 149,
    areaHead: "Serving {city} & surrounding areas",
    areaSub: "We're your neighbors. When you call {name}, you get a local technician who knows the area — not a faraway call center.",
    reviewsHead: "Trusted by homeowners across {city}",
    rev1Quote: "\"Showed up the same day and had our AC running in under an hour. Honest pricing and super friendly. Highly recommend!\"", rev1Author: "— Sarah M.",
    rev2Quote: "\"Booked online at 9pm and had a tech out the next morning. The whole process was so easy. These are my go-to people now.\"", rev2Author: "— James T.",
    rev3Quote: "\"New furnace install was smooth from quote to finish. No pressure, just clear options. Couldn't be happier.\"", rev3Author: "— Linda R.",
    footerTagline: "Fast, friendly, local heating & cooling for {city} and surrounding areas.",
    ctaHead: "Need service today? We're ready to help.",
    ctaSub: "Call now or book online — comfort is one tap away."
  };

  /* ── Industry presets (each a COMPLETE content object) ─────── */
  var PRESETS = {
    "Dust Collection": {
      heroHeadline: "{city}'s experts in industrial dust & fume collection.",
      heroSub: "Cleaner air, safer shops, and NFPA-compliant systems. Get a fast on-site assessment and a clear quote — no runaround.",
      servicesHead: "Complete dust collection, engineered right",
      servicesSub: "From a single downdraft table to a full ducted system, {name} keeps your facility clean, safe, and compliant.",
      svc1Icon: "🌀", svc1Title: "System Design", svc1Desc: "Custom-engineered collection systems sized to your equipment and airflow.",
      svc2Icon: "🔧", svc2Title: "Installation", svc2Desc: "Turnkey installs of cyclones, baghouses, and ductwork — done to code.",
      svc3Icon: "🧰", svc3Title: "Maintenance & Service", svc3Desc: "Filter changes, leak checks, and tune-ups that keep suction strong.",
      svc4Icon: "🛡️", svc4Title: "NFPA Compliance", svc4Desc: "Combustible-dust assessments and explosion-protection upgrades.",
      svc5Icon: "🏭", svc5Title: "Ductwork & Fittings", svc5Desc: "Custom duct runs, blast gates, and fittings for efficient capture.",
      svc6Icon: "🚨", svc6Title: "Emergency Repairs", svc6Desc: "Down system? We get your collection back online fast.",
      estimateHead: "Ballpark your system in seconds",
      estimateSub: "Pick what you need and see an estimated range right away — then book a firm quote with an on-site assessment.",
      est1Label: "Filter Replacement", est1Price: 350,
      est2Label: "System Inspection", est2Price: 250,
      est3Label: "New Cyclone System", est3Price: 8500,
      est4Label: "Baghouse Install", est4Price: 12000,
      est5Label: "Ductwork Run", est5Price: 1500,
      est6Label: "NFPA Assessment", est6Price: 950,
      areaHead: "Serving {city} & surrounding industry",
      areaSub: "We're local. When you call {name}, you get an experienced technician who knows your equipment — not a faraway call center.",
      reviewsHead: "Trusted by shops & facilities across {city}",
      rev1Quote: "\"Designed and installed a cyclone system for our woodshop — the air quality difference is night and day. Professional crew.\"", rev1Author: "— Mike D., Cabinet Shop",
      rev2Quote: "\"They got our baghouse back online same-day when we were down. Saved us a full shift of production.\"", rev2Author: "— Dana R., Plant Manager",
      rev3Quote: "\"Handled our NFPA compliance assessment start to finish. Clear report, fair price, no upselling.\"", rev3Author: "— Tony L., Operations",
      footerTagline: "Industrial dust & fume collection for shops and facilities in {city} and surrounding areas.",
      ctaHead: "Ready to clean up your shop's air?",
      ctaSub: "Call now or request a quote — a cleaner, safer facility is one step away."
    },
    "Plumbing": {
      heroHeadline: "{city}'s trusted plumbers — fast, clean, done right.",
      heroSub: "Same-day service, upfront pricing, and friendly local plumbers. Book online in 60 seconds or get an instant estimate — no phone tag required.",
      servicesHead: "Complete plumbing, done right",
      servicesSub: "From a dripping faucet to a full repipe, {name} keeps your water flowing and your home dry.",
      svc1Icon: "🚿", svc1Title: "Drain Cleaning", svc1Desc: "Fast clearing of clogged drains and sewer lines — no mess left behind.",
      svc2Icon: "🔧", svc2Title: "Leak Repair", svc2Desc: "Find-and-fix on hidden leaks before they damage your home.",
      svc3Icon: "🚽", svc3Title: "Water Heaters", svc3Desc: "Repair, replacement, and tankless upgrades with honest quotes.",
      svc4Icon: "🛠️", svc4Title: "Repiping", svc4Desc: "Whole-home repipes that end low pressure and rusty water for good.",
      svc5Icon: "🚰", svc5Title: "Fixtures & Faucets", svc5Desc: "Sinks, toilets, and fixtures installed clean and leak-free.",
      svc6Icon: "🚨", svc6Title: "24/7 Emergency", svc6Desc: "Burst pipe or no water? We answer after hours — call anytime.",
      estimateHead: "Ballpark your project in seconds",
      estimateSub: "Pick what you need and see an estimated range right away — then book a firm quote with one tap. No waiting on a callback.",
      est1Label: "Drain Cleaning", est1Price: 149,
      est2Label: "Leak Repair", est2Price: 199,
      est3Label: "Water Heater Install", est3Price: 1800,
      est4Label: "Whole-Home Repipe", est4Price: 4500,
      est5Label: "Faucet / Fixture", est5Price: 175,
      est6Label: "Sump Pump", est6Price: 650,
      areaHead: "Serving {city} & surrounding areas",
      areaSub: "We're your neighbors. When you call {name}, you get a local plumber who knows the area — not a faraway call center.",
      reviewsHead: "Trusted by homeowners across {city}",
      rev1Quote: "\"Cleared a nasty main-line clog same day and left the place spotless. Fair price, great guys.\"", rev1Author: "— Sarah M.",
      rev2Quote: "\"New water heater installed the next morning after I booked online. So easy.\"", rev2Author: "— James T.",
      rev3Quote: "\"Repiped our whole house with zero drama. Honest options, no pressure.\"", rev3Author: "— Linda R.",
      footerTagline: "Fast, friendly, local plumbing for {city} and surrounding areas.",
      ctaHead: "Got a plumbing problem? We're ready to help.",
      ctaSub: "Call now or book online — peace of mind is one tap away."
    },
    "Electrical": {
      heroHeadline: "{city}'s trusted electricians — safe, fast, code-compliant.",
      heroSub: "Same-day service, upfront pricing, and licensed local electricians. Book online in 60 seconds or get an instant estimate — no phone tag required.",
      servicesHead: "Complete electrical, done safely",
      servicesSub: "From a flickering light to a full panel upgrade, {name} keeps your home powered and safe.",
      svc1Icon: "⚡", svc1Title: "Panel Upgrades", svc1Desc: "Modern, code-compliant panels that end tripped breakers.",
      svc2Icon: "🔌", svc2Title: "Wiring & Rewires", svc2Desc: "Safe new wiring and whole-home rewires done right.",
      svc3Icon: "💡", svc3Title: "Lighting & Fixtures", svc3Desc: "Recessed lighting, fans, and fixtures installed clean.",
      svc4Icon: "🔋", svc4Title: "EV Chargers", svc4Desc: "Level 2 home charger installs sized for your vehicle.",
      svc5Icon: "🛡️", svc5Title: "Safety Inspections", svc5Desc: "Thorough inspections to catch hazards before they start.",
      svc6Icon: "🚨", svc6Title: "24/7 Emergency", svc6Desc: "Sparks or no power? We answer after hours — call anytime.",
      estimateHead: "Ballpark your project in seconds",
      estimateSub: "Pick what you need and see an estimated range right away — then book a firm quote with one tap. No waiting on a callback.",
      est1Label: "Outlet / Switch", est1Price: 145,
      est2Label: "Lighting Install", est2Price: 225,
      est3Label: "Panel Upgrade", est3Price: 2200,
      est4Label: "EV Charger", est4Price: 1200,
      est5Label: "Whole-Home Rewire", est5Price: 6500,
      est6Label: "Safety Inspection", est6Price: 195,
      areaHead: "Serving {city} & surrounding areas",
      areaSub: "We're your neighbors. When you call {name}, you get a licensed local electrician who knows the area — not a faraway call center.",
      reviewsHead: "Trusted by homeowners across {city}",
      rev1Quote: "\"Upgraded our panel in a day and explained everything. No more tripped breakers.\"", rev1Author: "— Sarah M.",
      rev2Quote: "\"Installed our EV charger clean and fast. Booked it online the night before.\"", rev2Author: "— James T.",
      rev3Quote: "\"Rewired our older home safely with zero surprises on the bill.\"", rev3Author: "— Linda R.",
      footerTagline: "Safe, licensed, local electrical for {city} and surrounding areas.",
      ctaHead: "Need an electrician today? We're ready to help.",
      ctaSub: "Call now or book online — safe power is one tap away."
    },
    "General Contractor": {
      heroHeadline: "{city}'s trusted name for quality home improvement.",
      heroSub: "Upfront pricing, clean job sites, and craftsmanship you can count on. Book a consult online or get an instant estimate — no phone tag.",
      servicesHead: "Complete home improvement, done right",
      servicesSub: "From a single room to a full remodel, {name} brings your project to life on time and on budget.",
      svc1Icon: "🏠", svc1Title: "Remodeling", svc1Desc: "Kitchens, baths, and whole-home remodels done to spec.",
      svc2Icon: "🔨", svc2Title: "Additions", svc2Desc: "Room additions and expansions that match your home.",
      svc3Icon: "🪵", svc3Title: "Decks & Patios", svc3Desc: "Outdoor living spaces built to last.",
      svc4Icon: "🚪", svc4Title: "Doors & Windows", svc4Desc: "Energy-efficient installs that look and seal great.",
      svc5Icon: "🎨", svc5Title: "Interior Finishes", svc5Desc: "Drywall, trim, flooring, and paint with a clean finish.",
      svc6Icon: "🚨", svc6Title: "Repairs & Punch Lists", svc6Desc: "The fixes other contractors won't come back for.",
      estimateHead: "Ballpark your project in seconds",
      estimateSub: "Pick what you need and see an estimated range right away — then book a firm quote with one tap. No waiting on a callback.",
      est1Label: "Handyman Visit", est1Price: 250,
      est2Label: "Bathroom Remodel", est2Price: 9500,
      est3Label: "Kitchen Remodel", est3Price: 22000,
      est4Label: "Deck Build", est4Price: 6500,
      est5Label: "Room Addition", est5Price: 35000,
      est6Label: "Flooring", est6Price: 3500,
      areaHead: "Serving {city} & surrounding areas",
      areaSub: "We're your neighbors. When you hire {name}, you get a local crew that treats your home like their own.",
      reviewsHead: "Trusted by homeowners across {city}",
      rev1Quote: "\"Remodeled our kitchen on time and on budget. Crew was clean and respectful.\"", rev1Author: "— Sarah M.",
      rev2Quote: "\"Built us a beautiful deck — booked the consult online and it was painless.\"", rev2Author: "— James T.",
      rev3Quote: "\"Handled our addition start to finish with clear communication throughout.\"", rev3Author: "— Linda R.",
      footerTagline: "Quality home improvement and remodeling for {city} and surrounding areas.",
      ctaHead: "Ready to start your project? Let's talk.",
      ctaSub: "Call now or book a consult online — your dream space is one step away."
    }
  };

  /* ── Tiny DOM helpers ────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function setText(key, value) { all('[data-biz="' + key + '"]').forEach(function (n) { n.textContent = value; }); }
  function show(el) { if (el) el.classList.remove("hidden"); }
  function hide(el) { if (el) el.classList.add("hidden"); }

  /* ── Gate (loading / expired / error / site) ─────────────── */
  function gate(state) {
    all("#gate .gate__card").forEach(function (c) {
      c.classList.toggle("hidden", c.getAttribute("data-gate") !== state);
    });
  }
  function fail(state) { gate(state); }
  function ready(data) {
    populate(data);
    applyContent(data && data.content);
    hide($("#gate"));
    show($("#site"));
    show($("#chat"));
    document.body.setAttribute("data-state", "ready");
    initFeatures();
    initNav();
    initRouter();
    if (TOKEN && new URLSearchParams(location.search).get("edit")) initEditor();
    scheduleChatNudge();
  }

  /* ════════════════════════════════════════════════════════
     Multi-view router — one page, several [data-view] panels.
     Nav links use #/<view> hashes; the ?p=token/?edit query
     string is untouched, so the preview payload and edit mode
     keep working exactly as before.
     ════════════════════════════════════════════════════════ */
  function viewFromHash() {
    var h = (location.hash || "").replace(/^#\/?/, "").trim();
    return h || "home";
  }
  function initRouter() {
    var views = all("[data-view]");
    if (!views.length) return;
    var links = all("[data-nav]");
    function go(name) {
      var exists = views.some(function (v) { return v.getAttribute("data-view") === name; });
      if (!exists) name = "home";
      views.forEach(function (v) { v.classList.toggle("hidden", v.getAttribute("data-view") !== name); });
      links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("data-nav") === name); });
      closeNav();
      // Don't yank the scroll position while someone is mid-edit.
      if (!EDITING) window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", function () { go(viewFromHash()); });
    go(viewFromHash());
  }

  /* ── Mobile nav toggle ───────────────────────────────────── */
  function closeNav() {
    var nav = $("#t-nav");
    var btn = $("#nav-toggle");
    if (nav) nav.classList.remove("is-open");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }
  function initNav() {
    var nav = $("#t-nav");
    var btn = $("#nav-toggle");
    if (btn && nav) {
      btn.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  /* ── Derivations ─────────────────────────────────────────── */
  function initials(name) {
    var words = (name || "").replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "HV";
    var a = words[0][0] || "";
    var b = words.length > 1 ? (words[1][0] || "") : (words[0][1] || "");
    return (a + b).toUpperCase();
  }
  function shortName(name) {
    var words = (name || "").trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).join(" ") || name;
  }
  function telHref(phone) {
    var digits = (phone || "").replace(/[^\d+]/g, "");
    if (!digits) return "";
    if (digits[0] !== "+" && digits.length === 10) digits = "+1" + digits;
    return "tel:" + digits;
  }

  /* ── Populate the page from the company payload ──────────── */
  function populate(d) {
    d = d || {};
    var name = (d.name || "Your HVAC Company").trim();
    var city = (d.city || "").trim();
    var cityOr = city || "your area";

    // Resolved values used to substitute {name}/{city} in editable copy.
    RESOLVED.name = name;
    RESOLVED.city = cityOr;

    document.title = name + " — Heating & Cooling";
    setText("title", name + " — Heating & Cooling");
    setText("name", name);
    setText("firstName", shortName(name));
    setText("initials", initials(name));

    // City appears in several spots with slightly different copy.
    setText("cityArea", cityOr);
    setText("heroEyebrow", city ? "Serving the " + city + " area" : "Serving your area");
    setText("city2", city || "Your area");
    setText("city3", city || "Your area");
    setText("city4", city || "your community");
    setText("city5", city || "town");
    setText("city6", city || "your community");

    // Phone → click-to-call everywhere; degrade to "Get a Quote".
    var tel = telHref(d.phone);
    if (tel) {
      setText("phone", d.phone);
      all("[data-tel]").forEach(function (a) { a.setAttribute("href", tel); });
    } else {
      setText("phone", "Get a Quote");
      all("[data-tel]").forEach(function (a) { a.setAttribute("href", "#quote"); });
      toggleShow("phone", false);
    }

    // Email (footer) — only if we scraped one.
    if (d.email) {
      setText("email", d.email);
      all("[data-mail]").forEach(function (a) { a.setAttribute("href", "mailto:" + d.email); });
    } else {
      toggleShow("email", false);
    }

    // Address — only if present.
    if (d.address) setText("address", d.address);
    else toggleShow("address", false);

    // Rating / reviews — hide everything if we have no rating.
    var hasRating = typeof d.rating === "number" && d.rating > 0;
    if (hasRating) {
      setText("rating", d.rating.toFixed(1));
      var rc = typeof d.reviewCount === "number" ? d.reviewCount : 0;
      setText("reviewCount", rc.toLocaleString("en-US"));
    } else {
      toggleShow("rating", false);
    }
  }

  /* Show/hide every element flagged for a given field. */
  function toggleShow(key, on) {
    all('[data-show="' + key + '"]').forEach(function (n) { n.classList.toggle("hidden", !on); });
  }

  /* ── Editable copy: apply content to the page ────────────── */
  function tmpl(str) {
    return String(str == null ? "" : str)
      .replace(/\{city\}/g, RESOLVED.city)
      .replace(/\{name\}/g, RESOLVED.name);
  }
  /* DEFAULTS overlaid with the saved/preset content, then written
     to each [data-edit] node as plain text (never innerHTML). */
  function applyContent(content) {
    var c = {};
    Object.keys(DEFAULTS).forEach(function (k) { c[k] = DEFAULTS[k]; });
    if (content && typeof content === "object") {
      Object.keys(content).forEach(function (k) {
        if (content[k] != null && content[k] !== "") c[k] = content[k];
      });
    }
    Object.keys(c).forEach(function (key) {
      all('[data-edit="' + key + '"]').forEach(function (node) {
        if (/Price$/.test(key)) {
          var n = parseInt(c[key], 10) || 0;
          node.textContent = "from $" + n.toLocaleString("en-US");
          var btn = node.closest(".est-opt");
          if (btn) btn.setAttribute("data-price", String(n));
        } else {
          node.textContent = tmpl(c[key]);
        }
      });
    });
    syncQuoteOptions(c);
  }
  /* The quote form's "What do you need?" mirrors the service titles. */
  function syncQuoteOptions(c) {
    var sel = document.querySelector('#quote-form select[name="service"]');
    if (!sel) return;
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    var titles = [];
    for (var i = 1; i <= 6; i++) { if (c["svc" + i + "Title"]) titles.push(tmpl(c["svc" + i + "Title"])); }
    titles.push("Other");
    titles.forEach(function (t) {
      var o = document.createElement("option");
      o.textContent = t;
      sel.appendChild(o);
    });
  }

  /* ════════════════════════════════════════════════════════
     Simulated "supercharged" features
     ════════════════════════════════════════════════════════ */
  function initFeatures() {
    initEstimate();
    initBooking();
    initQuote();
    initChat();
    var yr = $("#t-year");
    if (yr) yr.textContent = new Date().getFullYear();
  }

  /* ── Instant estimate ────────────────────────────────────── */
  function initEstimate() {
    var out = $("#est-total");
    function recalc() {
      var total = 0;
      all('[data-est-group="services"] .est-opt.is-active').forEach(function (o) {
        total += parseInt(o.getAttribute("data-price"), 10) || 0;
      });
      if (out) out.textContent = "$" + total.toLocaleString("en-US");
    }
    all('[data-est-group="services"] .est-opt').forEach(function (opt) {
      opt.addEventListener("click", function () {
        if (EDITING) return; // in edit mode, clicks place the text cursor
        opt.classList.toggle("is-active"); recalc();
      });
    });
    var go = $("[data-goto-quote]");
    if (go) go.addEventListener("click", function () {
      var q = $("#quote"); if (q) q.scrollIntoView({ behavior: "smooth" });
    });
    recalc();
  }

  /* ── Booking: build the next 5 days, wire slots + confirm ── */
  function initBooking() {
    var daysWrap = $("#book-days");
    if (daysWrap) {
      var names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      var today = new Date();
      for (var i = 1; i <= 5; i++) {
        var dt = new Date(today.getTime() + i * 86400000);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "book__day" + (i === 1 ? " is-active" : "");
        btn.innerHTML = "<b>" + dt.getDate() + "</b><span>" + names[dt.getDay()] + "</span>";
        btn.addEventListener("click", function () {
          all(".book__day", daysWrap).forEach(function (d) { d.classList.remove("is-active"); });
          this.classList.add("is-active");
        });
        daysWrap.appendChild(btn);
      }
    }
    var confirm = $("#book-confirm");
    all(".book__slot").forEach(function (slot) {
      if (slot.disabled) return;
      slot.addEventListener("click", function () {
        all(".book__slot").forEach(function (s) { s.classList.remove("is-selected"); });
        slot.classList.add("is-selected");
        if (confirm) { confirm.disabled = false; confirm.textContent = "Confirm " + slot.textContent.trim(); }
      });
    });
    if (confirm) confirm.addEventListener("click", function () {
      show($("#book-done"));
      confirm.classList.add("hidden");
    });
  }

  /* ── Quote form: fake submit + success state ─────────────── */
  function initQuote() {
    var form = $("#quote-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      show($("#quote-done"));
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Request sent ✓"; }
    });
  }

  /* ── Chatbot (simulation) ────────────────────────────────── */
  var CHAT_REPLIES = {
    price: "Great question! Most AC repairs start at $129, and we always give you the price upfront before any work begins — no surprises. Want me to book a technician to take a look? 🔧",
    book: "Awesome — I can get you on the schedule. We have openings as early as tomorrow morning. Head to the \"Instant Quote\" page to pick a time, or call us and we'll handle it for you! 📅",
    emergency: "I'm so sorry — let's get help moving fast. We offer 24/7 emergency service. Please tap the call button at the top to reach our on-call team right now, and we'll get someone out to you ASAP. 🚨"
  };
  var chatOpened = false;
  function initChat() {
    var launch = $("#chat-launch");
    var panel = $("#chat-panel");
    var bubble = $("#chat-bubble");
    var close = $("#chat-close");
    function open() {
      chatOpened = true;
      show(panel); hide(bubble);
    }
    if (launch) launch.addEventListener("click", function () {
      if (panel.classList.contains("hidden")) open(); else hide(panel);
    });
    if (close) close.addEventListener("click", function () { hide(panel); });
    if (bubble) bubble.addEventListener("click", open);

    all(".chat__chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var key = chip.getAttribute("data-reply");
        sendUser(chip.textContent.trim());
        chip.parentElement.style.display = "none";
        botTyping(CHAT_REPLIES[key] || "Thanks! One of our team will be right with you. 👍");
      });
    });
  }
  function appendMsg(cls, text) {
    var log = $("#chat-log");
    if (!log) return null;
    var msg = document.createElement("div");
    msg.className = "chat__msg " + cls;
    msg.textContent = text;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
  }
  function sendUser(text) { appendMsg("chat__msg--user", text); }
  function botTyping(text) {
    var log = $("#chat-log");
    var t = document.createElement("div");
    t.className = "chat__typing";
    t.textContent = "typing…";
    log.appendChild(t);
    log.scrollTop = log.scrollHeight;
    setTimeout(function () {
      t.remove();
      appendMsg("chat__msg--bot", text);
    }, 1100);
  }
  function scheduleChatNudge() {
    if (EDITING) return; // don't distract while editing
    setTimeout(function () {
      if (!chatOpened) show($("#chat-bubble"));
    }, 4500);
  }

  /* ════════════════════════════════════════════════════════
     Inline editor (?edit=1) — click-to-edit + presets + save
     ════════════════════════════════════════════════════════ */
  function setEditStatus(msg) {
    var s = $("#editbar-status");
    if (s) s.textContent = msg || "";
  }
  function getEditPw() {
    var pw = sessionStorage.getItem(EDIT_PW_KEY);
    if (!pw) {
      pw = window.prompt("Enter the prospector password to save changes:");
      if (pw) sessionStorage.setItem(EDIT_PW_KEY, pw);
    }
    return pw || "";
  }
  /* Read every editable node as PLAIN TEXT (never innerHTML). */
  function collectContent() {
    var c = {};
    all("[data-edit]").forEach(function (node) {
      var key = node.getAttribute("data-edit");
      if (/Price$/.test(key)) {
        var digits = (node.textContent || "").replace(/[^\d]/g, "");
        c[key] = parseInt(digits, 10) || 0;
      } else {
        c[key] = (node.textContent || "").trim();
      }
    });
    return c;
  }
  function initEditor() {
    EDITING = true;
    document.body.classList.add("is-editing");
    show($("#editbar"));

    all("[data-edit]").forEach(function (node) {
      node.setAttribute("contenteditable", "true");
      node.classList.add("is-editable");
    });

    var presetSel = $("#editbar-preset");
    Object.keys(PRESETS).forEach(function (n) {
      var o = document.createElement("option");
      o.value = n; o.textContent = n;
      presetSel.appendChild(o);
    });
    presetSel.addEventListener("change", function () {
      var name = presetSel.value;
      presetSel.value = "";
      if (!name || !PRESETS[name]) return;
      if (!window.confirm('Apply the "' + name + '" preset? This replaces all page text with ' +
        name + ' copy. You can still edit and Save after.')) return;
      applyContent(PRESETS[name]);
      setEditStatus("Applied " + name + " — review, then Save.");
    });

    var viewLink = $("#editbar-view");
    if (viewLink) {
      var u = new URL(location.href);
      u.searchParams.delete("edit");
      viewLink.href = u.href;
    }

    var saveBtn = $("#editbar-save");
    saveBtn.addEventListener("click", function () {
      var pw = getEditPw();
      if (!pw) { setEditStatus("Password needed to save."); return; }
      saveBtn.disabled = true;
      setEditStatus("Saving…");
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updatePreview", token: TOKEN, content: collectContent(), password: pw })
      }).then(function (res) {
        return res.json().then(function (b) { return { status: res.status, body: b }; });
      }).then(function (r) {
        saveBtn.disabled = false;
        if (r.status === 401) {
          sessionStorage.removeItem(EDIT_PW_KEY);
          setEditStatus("Wrong password — click Save changes to retry.");
          return;
        }
        if (r.status === 200 && r.body && r.body.ok) {
          setEditStatus("Saved ✓ — the link now shows your edits.");
          return;
        }
        setEditStatus((r.body && r.body.error) || "Save failed.");
      }).catch(function () {
        saveBtn.disabled = false;
        setEditStatus("Network error — try again.");
      });
    });
  }

  /* ════════════════════════════════════════════════════════
     Boot: load the preview payload
     ════════════════════════════════════════════════════════ */
  function queryOverrides() {
    var p = new URLSearchParams(location.search);
    var keys = ["name", "phone", "address", "city", "email"];
    var d = {}, found = false;
    keys.forEach(function (k) { if (p.has(k)) { d[k] = p.get(k); found = true; } });
    if (p.has("rating")) { d.rating = parseFloat(p.get("rating")); found = true; }
    if (p.has("reviewCount")) { d.reviewCount = parseInt(p.get("reviewCount"), 10); found = true; }
    return found ? d : null;
  }

  var SAMPLE = {
    name: "Comfort Pro Heating & Air",
    phone: "(812) 555-0123",
    address: "1420 Commerce Dr, Evansville, IN 47715, USA",
    city: "Evansville",
    email: "office@comfortpro-example.com",
    rating: 4.8,
    reviewCount: 137
  };

  function boot() {
    var token = new URLSearchParams(location.search).get("p");
    TOKEN = token;

    // No token: show sample/override data immediately (design preview).
    if (!token) {
      ready(queryOverrides() || SAMPLE);
      return;
    }
    if (!ENDPOINT) { fail("error"); return; }

    gate("loading");
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getPreview", token: token })
    }).then(function (res) {
      return res.json().then(function (body) { return { status: res.status, body: body }; });
    }).then(function (r) {
      if (r.status === 200 && r.body && r.body.ok) { ready(r.body.data); return; }
      if (r.status === 410) { fail("expired"); return; }
      fail("error");
    }).catch(function () { fail("error"); });
  }

  boot();
})();
