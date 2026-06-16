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
    hide($("#gate"));
    show($("#site"));
    show($("#chat"));
    document.body.setAttribute("data-state", "ready");
    initFeatures();
    scheduleChatNudge();
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

    document.title = name + " — Heating & Cooling";
    setText("title", name + " — Heating & Cooling");
    setText("name", name);
    setText("firstName", shortName(name));
    setText("initials", initials(name));

    // City appears in several spots with slightly different copy.
    setText("cityArea", cityOr);
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
      opt.addEventListener("click", function () { opt.classList.toggle("is-active"); recalc(); });
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
    book: "Awesome — I can get you on the schedule. We have openings as early as tomorrow morning. Just scroll up to \"Online Booking\" to pick a time, or call us and we'll handle it for you! 📅",
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
    setTimeout(function () {
      if (!chatOpened) show($("#chat-bubble"));
    }, 4500);
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
