/*
 * ============================================================
 * config.js — Central Site Configuration
 * ============================================================
 * EDIT THIS FILE to change brand name, contact info,
 * prices, and CTA link. Everything referencing these values
 * throughout the site reads from this single object.
 *
 * After editing, hard-refresh the browser (Ctrl/Cmd + Shift + R).
 * ============================================================
 */

window.SITE_CONFIG = {

  /* ── Brand ─────────────────────────────────────────────── */
  brandName: "ElipsionAI",
  ownerName: "Jacob",

  /* ── Contact ────────────────────────────────────────────── */
  email: "Jacob.Briggs@ElipsionGroup.com",
  phone: "(812) 489-8057",

  /* ── CTA / Links ─────────────────────────────────────────
     auditUrl: where the "Request Free Audit" CTA button links.
     Default is the on-page anchor. Change to a Typeform/
     Calendly/Tally link once your intake form is live.
  ─────────────────────────────────────────────────────────── */
  auditUrl:  "audit.html",
  auditEndpoint: "https://dcspbdqkkbeyyvwgazbb.supabase.co/functions/v1/submit-audit",
  ctaText:   "Request Free Audit",

  /* ── Pricing ─────────────────────────────────────────────
     Used in nav bar, hero, pricing section, and footer.
     Change the strings here to update everywhere.
  ─────────────────────────────────────────────────────────── */
  pricing: {
    starter:     "$499",
    full:        "$799",
    maintenance: "$99/mo"
  }

};
