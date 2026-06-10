/*
 * ============================================================
 * demo-supercharged.js — Interactive "Supercharged" demo tab
 * ============================================================
 * Powers the AI chat / online booking / instant estimate
 * mini-demo. Self-contained; uses data-sc-* attributes so it
 * never collides with the generic .tabs / data-panel switcher.
 * ============================================================
 */
(function () {
  "use strict";

  /* ── Feature sub-switcher (chat / schedule / estimate) ──── */
  var scBtns = document.querySelectorAll(".sc-switch__btn");
  scBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-sc-tab");
      var scope = btn.closest(".sc-body") || document;

      scope.querySelectorAll(".sc-switch__btn").forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      scope.querySelectorAll(".sc-view").forEach(function (view) {
        view.classList.toggle("is-active", view.getAttribute("data-sc-view") === value);
      });
    });
  });

  /* ── Chat quick-replies reveal pre-written follow-ups ───── */
  document.querySelectorAll("[data-reveal-btn]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var key = chip.getAttribute("data-reveal-btn");
      document.querySelectorAll('[data-reveal="' + key + '"]').forEach(function (m) {
        m.classList.remove("is-hidden");
      });
      chip.remove();
      var log = document.getElementById("sc-chat-log");
      if (log) log.scrollTop = log.scrollHeight;
    });
  });

  /* ── Booking: day select ────────────────────────────────── */
  document.querySelectorAll(".sc-day").forEach(function (day) {
    day.addEventListener("click", function () {
      day.parentElement.querySelectorAll(".sc-day").forEach(function (d) {
        d.classList.toggle("is-active", d === day);
      });
    });
  });

  /* ── Booking: slot select + confirm ─────────────────────── */
  var confirmBtn = document.getElementById("sc-book-confirm");
  document.querySelectorAll(".sc-slot").forEach(function (slot) {
    if (slot.disabled) return;
    slot.addEventListener("click", function () {
      document.querySelectorAll(".sc-slot").forEach(function (s) {
        s.classList.remove("is-selected");
      });
      slot.classList.add("is-selected");
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm " + slot.textContent.trim();
      }
    });
  });
  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      var done = document.getElementById("sc-book-done");
      if (done) done.classList.remove("is-hidden");
      confirmBtn.classList.add("is-hidden");
    });
  }

  /* ── Instant estimate: live total ───────────────────────── */
  function money(n) {
    return "$" + n.toLocaleString("en-US");
  }
  function recalc() {
    var total = 0;
    var svc = document.querySelector('[data-est-group="service"] .sc-opt.is-active');
    if (svc) total += parseInt(svc.getAttribute("data-price"), 10) || 0;
    document.querySelectorAll('[data-est-group="addons"] .sc-opt.is-active').forEach(function (a) {
      total += parseInt(a.getAttribute("data-price"), 10) || 0;
    });
    var out = document.getElementById("sc-est-total");
    if (out) out.textContent = money(total);
  }
  // Service is single-select (one always chosen).
  document.querySelectorAll('[data-est-group="service"] .sc-opt').forEach(function (opt) {
    opt.addEventListener("click", function () {
      opt.parentElement.querySelectorAll(".sc-opt").forEach(function (o) {
        o.classList.toggle("is-active", o === opt);
      });
      recalc();
    });
  });
  // Add-ons toggle independently.
  document.querySelectorAll('[data-est-group="addons"] .sc-opt').forEach(function (opt) {
    opt.addEventListener("click", function () {
      opt.classList.toggle("is-active");
      recalc();
    });
  });
  recalc();
})();
