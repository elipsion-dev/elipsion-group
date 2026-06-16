/*
 * ============================================================
 * prospector.js — Internal lead-finder UI
 * ============================================================
 * The password is held only in sessionStorage and sent with each
 * request. Real enforcement happens server-side in the Edge
 * Function — this gate is just convenience.
 * ============================================================
 */
(function () {
  "use strict";

  var ENDPOINT = (window.SITE_CONFIG && window.SITE_CONFIG.prospectorEndpoint) || "";
  var PW_KEY = "prospector_pw";

  var lock = document.getElementById("lock");
  var tool = document.getElementById("tool");
  var lockForm = document.getElementById("lock-form");
  var passwordInput = document.getElementById("password");
  var lockError = document.getElementById("lock-error");
  var lockBtn = document.getElementById("lock-btn");

  var searchForm = document.getElementById("search-form");
  var queryInput = document.getElementById("query");
  var tradeInput = document.getElementById("trade");
  var searchError = document.getElementById("search-error");
  var statusEl = document.getElementById("status");
  var resultsEl = document.getElementById("results");

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function getPw() { return sessionStorage.getItem(PW_KEY) || ""; }

  /* No website = score 0 (biggest opportunity) for filtering/sorting. */
  function webScore(b) { return b.websiteScore == null ? 0 : b.websiteScore; }

  /* Revenue-math assumptions from the form (override server defaults). */
  function getAssumptions() {
    var a = {};
    var job = parseFloat(document.getElementById("avgJobValue").value);
    var calls = parseFloat(document.getElementById("monthlyCalls").value);
    if (!isNaN(job) && job >= 0) a.avgJobValue = job;
    if (!isNaN(calls) && calls >= 0) a.monthlyCalls = calls;
    return a;
  }

  /* POST a JSON payload (password injected) to the function. */
  function call(payload) {
    payload.password = getPw();
    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function unlock() {
    hide(lock);
    show(tool);
    queryInput.focus();
  }

  /* ── Lock screen ─────────────────────────────────────────── */
  lockForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hide(lockError);
    var pw = passwordInput.value;
    if (!pw) return;
    sessionStorage.setItem(PW_KEY, pw);
    // Verify with a cheap, no-op-ish call (empty query → 400, but a
    // wrong password returns 401 first, which is what we check).
    var btn = lockForm.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Checking…";
    call({ action: "auth" }).then(function (r) {
      btn.disabled = false;
      btn.textContent = "Unlock";
      if (r.status === 200 && r.data && r.data.ok) {
        // Only an explicit success unlocks — never "anything but 401".
        unlock();
        return;
      }
      sessionStorage.removeItem(PW_KEY);
      if (r.status === 401) {
        lockError.textContent = "Incorrect password.";
      } else if (r.status === 503) {
        lockError.textContent = "Tool not configured on the server (check Supabase secrets).";
      } else {
        lockError.textContent = (r.data && r.data.error) || "Could not verify. Try again.";
      }
      show(lockError);
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = "Unlock";
      lockError.textContent = "Network error. Try again.";
      show(lockError);
    });
  });

  if (lockBtn) {
    lockBtn.addEventListener("click", function () {
      sessionStorage.removeItem(PW_KEY);
      location.reload();
    });
  }

  /* ── Search ──────────────────────────────────────────────── */
  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hide(searchError);
    resultsEl.innerHTML = "";
    var query = queryInput.value.trim();
    if (!query) return;

    var btn = searchForm.querySelector("button");
    btn.disabled = true;
    show(statusEl);
    statusEl.textContent = "Searching Google and analyzing websites… a large area pulls up to ~60 businesses, so this can take 15–40s.";

    call({ action: "scan", query: query, trade: tradeInput.value.trim() || "HVAC" })
      .then(function (r) {
        btn.disabled = false;
        if (r.status === 401) {
          sessionStorage.removeItem(PW_KEY);
          location.reload();
          return;
        }
        if (!r.ok) {
          hide(statusEl);
          searchError.textContent = (r.data && r.data.error) || "Search failed.";
          show(searchError);
          return;
        }
        var results = (r.data && r.data.results) || [];
        var capReached = !!(r.data && r.data.capReached);
        // Google limits how many results one search will return. When we likely
        // hit that ceiling, nudge the user to narrow the area for full coverage.
        var capNote = capReached
          ? " This search hit Google's result ceiling, so a large city isn't fully covered — search a ZIP or single suburb to surface the rest."
          : "";
        if (results.length === 0) {
          statusEl.textContent = "No businesses found for that search.";
          return;
        }

        // Filter to prospects: weak in profile OR website. A missing
        // website counts as 0 (the biggest opportunity), so it always passes.
        var threshold = parseInt(document.getElementById("maxScore").value, 10);
        if (isNaN(threshold)) threshold = 7;
        var total = results.length;
        var prospects = results.filter(function (b) {
          return b.gbpScore <= threshold || webScore(b) <= threshold;
        });
        // Weakest combined score first = biggest opportunity at the top.
        prospects.sort(function (a, b) {
          return (a.gbpScore + webScore(a)) - (b.gbpScore + webScore(b));
        });

        if (prospects.length === 0) {
          statusEl.textContent = total + " businesses found, but all scored above " +
            threshold + " — they look strong. Try a smaller town or raise the threshold." + capNote;
          return;
        }
        statusEl.textContent = "Showing " + prospects.length + " prospect" +
          (prospects.length === 1 ? "" : "s") + " of " + total + " (hid " +
          (total - prospects.length) + " strong business" +
          (total - prospects.length === 1 ? "" : "es") + " scoring above " + threshold + ")." + capNote;
        prospects.forEach(renderCard);
      })
      .catch(function () {
        btn.disabled = false;
        hide(statusEl);
        searchError.textContent = "Network error.";
        show(searchError);
      });
  });

  /* ── Rendering ───────────────────────────────────────────── */
  function scoreClass(s) {
    if (s == null) return "score--none";
    if (s >= 8) return "score--good";
    if (s >= 5) return "score--mid";
    return "score--bad";
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function bulletList(items) {
    var ul = el("ul", "bullets");
    (items || []).forEach(function (b) { ul.appendChild(el("li", null, b)); });
    return ul;
  }

  function scoreBadge(label, score) {
    var wrap = el("div", "score " + scoreClass(score));
    wrap.appendChild(el("span", "score__num", score == null ? "—" : score + "/10"));
    wrap.appendChild(el("span", "score__label", label));
    return wrap;
  }

  function renderCard(biz) {
    var card = el("article", "lead-card");

    // Header
    var head = el("div", "lead-card__head");
    var titleWrap = el("div");
    titleWrap.appendChild(el("h3", null, biz.name));
    var meta = el("p", "lead-card__meta text-muted text-sm");
    var bits = [];
    if (biz.rating != null) bits.push("★ " + biz.rating + " (" + biz.reviewCount + ")");
    if (biz.phone) bits.push(biz.phone);
    if (biz.address) bits.push(biz.address);
    meta.textContent = bits.join("  ·  ");
    titleWrap.appendChild(meta);
    head.appendChild(titleWrap);

    var scores = el("div", "lead-card__scores");
    scores.appendChild(scoreBadge("Google", biz.gbpScore));
    scores.appendChild(scoreBadge("Website", biz.websiteScore));
    head.appendChild(scores);
    card.appendChild(head);

    // Links
    var links = el("div", "lead-card__links text-sm");
    if (biz.website) {
      var a = el("a", "link-pill", "Website ↗"); a.href = biz.website; a.target = "_blank"; a.rel = "noopener";
      links.appendChild(a);
    }
    if (biz.mapsUrl) {
      var m = el("a", "link-pill", "Google profile ↗"); m.href = biz.mapsUrl; m.target = "_blank"; m.rel = "noopener";
      links.appendChild(m);
    }
    // Contact email scraped from the site — one tap to mail or copy.
    if (biz.email) {
      var mail = el("a", "link-pill link-pill--email", "✉ " + biz.email);
      mail.href = "mailto:" + biz.email;
      mail.title = "Click to email · click the copy icon to copy";
      links.appendChild(mail);
      var copyEmail = el("button", "link-pill link-pill--copy", "Copy");
      copyEmail.type = "button";
      copyEmail.addEventListener("click", function () {
        navigator.clipboard.writeText(biz.email).then(function () {
          copyEmail.textContent = "Copied ✓";
          setTimeout(function () { copyEmail.textContent = "Copy"; }, 1500);
        });
      });
      links.appendChild(copyEmail);
    }
    // Line-type lookup (Telnyx): is this number a cell we can text?
    if (biz.phone) {
      var ltBtn = el("button", "link-pill link-pill--linetype", "📱 Check line type");
      ltBtn.type = "button";
      ltBtn.title = "Look up whether this number is a cell, landline, or VoIP";
      ltBtn.addEventListener("click", function () {
        ltBtn.disabled = true;
        ltBtn.textContent = "Checking…";
        call({ action: "lineType", phone: biz.phone }).then(function (r) {
          if (r.status === 401) { sessionStorage.removeItem(PW_KEY); location.reload(); return; }
          if (!r.ok || !r.data || !r.data.ok) {
            ltBtn.disabled = false;
            ltBtn.textContent = (r.data && r.data.error) || "Lookup failed — retry";
            return;
          }
          ltBtn.replaceWith(lineTypeBadge(r.data));
        }).catch(function () {
          ltBtn.disabled = false;
          ltBtn.textContent = "Network error — retry";
        });
      });
      links.appendChild(ltBtn);
    }
    card.appendChild(links);

    // Two columns of findings
    var cols = el("div", "lead-card__cols");

    var gcol = el("div", "findings");
    gcol.appendChild(el("h4", null, "Google profile — what to fix"));
    gcol.appendChild(bulletList(biz.gbpBullets));
    cols.appendChild(gcol);

    var wcol = el("div", "findings");
    wcol.appendChild(el("h4", null, "Website — what to fix"));
    wcol.appendChild(bulletList(biz.websiteBullets));
    cols.appendChild(wcol);

    card.appendChild(cols);

    // Email generator
    var emailWrap = el("div", "lead-card__email");
    var emailBtn = el("button", "btn btn--primary btn--sm", "✉ Generate outreach email");
    var emailOut = el("div", "email-out hidden");
    emailBtn.addEventListener("click", function () {
      emailBtn.disabled = true;
      emailBtn.textContent = "Writing…";
      call({ action: "email", business: biz, assumptions: getAssumptions() }).then(function (r) {
        emailBtn.disabled = false;
        emailBtn.textContent = "✉ Regenerate email";
        if (!r.ok) {
          emailOut.textContent = (r.data && r.data.error) || "Failed to generate.";
          show(emailOut);
          return;
        }
        emailOut.innerHTML = "";
        var pre = el("pre", "email-text", r.data.email || "");
        emailOut.appendChild(pre);
        var copy = el("button", "btn btn--ghost btn--sm", "Copy");
        copy.addEventListener("click", function () {
          navigator.clipboard.writeText(r.data.email || "").then(function () {
            copy.textContent = "Copied ✓";
            setTimeout(function () { copy.textContent = "Copy"; }, 1500);
          });
        });
        emailOut.appendChild(copy);
        show(emailOut);
      }).catch(function () {
        emailBtn.disabled = false;
        emailBtn.textContent = "✉ Generate outreach email";
        emailOut.textContent = "Network error.";
        show(emailOut);
      });
    });
    emailWrap.appendChild(emailBtn);
    emailWrap.appendChild(emailOut);
    card.appendChild(emailWrap);

    // Preview-site generator: one click builds a personalized demo site
    // (preview.html?p=token) seeded with this business's info. The link
    // self-expires after 14 days. Great for "let me show you what your
    // new site could look like" on a call.
    card.appendChild(renderPreviewBuilder(biz));

    resultsEl.appendChild(card);
  }

  /* ── Line-type badge (from Telnyx lookup) ────────────────── */
  function lineTypeBadge(d) {
    var map = {
      "mobile":                { label: "📱 Cell · textable", cls: "lt--cell" },
      "fixed line or mobile":  { label: "📱 Cell/landline",    cls: "lt--maybe" },
      "fixed line":            { label: "☎ Landline",          cls: "lt--land" },
      "voip":                  { label: "🌐 VoIP",             cls: "lt--voip" },
      "toll free":             { label: "☎ Toll-free",         cls: "lt--land" }
    };
    var info = map[d.type] || { label: "❓ " + (d.type || "unknown"), cls: "lt--unknown" };
    var span = el("span", "lead-linetype " + info.cls, info.label);
    span.title = (d.carrier ? d.carrier + " · " : "") + "line type: " + (d.type || "unknown");
    return span;
  }

  /* ── Preview-site builder (per card) ─────────────────────── */
  function renderPreviewBuilder(biz) {
    var wrap = el("div", "lead-card__preview");
    var btn = el("button", "btn btn--ghost btn--sm", "🌐 Build preview site");
    btn.type = "button";
    var out = el("div", "preview-out hidden");
    wrap.appendChild(btn);
    wrap.appendChild(out);

    btn.addEventListener("click", function () {
      btn.disabled = true;
      btn.textContent = "Building…";
      call({ action: "savePreview", business: biz }).then(function (r) {
        if (r.status === 401) { sessionStorage.removeItem(PW_KEY); location.reload(); return; }
        btn.disabled = false;
        btn.textContent = "🌐 Rebuild preview site";
        if (!r.ok || !r.data || !r.data.token) {
          out.textContent = (r.data && r.data.error) || "Could not build preview.";
          show(out);
          return;
        }
        var url = new URL("preview.html?p=" + encodeURIComponent(r.data.token), location.href).href;
        out.innerHTML = "";

        var field = el("input", "preview-link");
        field.type = "text";
        field.readOnly = true;
        field.value = url;
        field.addEventListener("focus", function () { field.select(); });
        out.appendChild(field);

        var row = el("div", "preview-actions");
        var copy = el("button", "btn btn--primary btn--sm", "Copy link");
        copy.type = "button";
        copy.addEventListener("click", function () {
          navigator.clipboard.writeText(url).then(function () {
            copy.textContent = "Copied ✓";
            setTimeout(function () { copy.textContent = "Copy link"; }, 1500);
          });
        });
        var open = el("a", "btn btn--ghost btn--sm", "Open ↗");
        open.href = url; open.target = "_blank"; open.rel = "noopener";
        var edit = el("a", "btn btn--ghost btn--sm", "✏️ Edit");
        edit.href = url + "&edit=1"; edit.target = "_blank"; edit.rel = "noopener";
        edit.title = "Edit copy / switch industry (e.g. dust collection) before sending";
        row.appendChild(copy);
        row.appendChild(open);
        row.appendChild(edit);
        out.appendChild(row);

        var note = el("p", "preview-note text-xs text-muted", "Link works for 14 days, then expires. Use Edit to change the copy or industry.");
        out.appendChild(note);
        show(out);
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = "🌐 Build preview site";
        out.textContent = "Network error.";
        show(out);
      });
    });

    return wrap;
  }

  /* ── Init: skip lock if password already in this session ─── */
  if (!ENDPOINT) {
    lockError.textContent = "Missing prospectorEndpoint in config.js.";
    show(lockError);
  } else if (getPw()) {
    unlock();
  }
})();
