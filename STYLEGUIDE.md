# Style Guide & Page Contract

This is the **authoritative contract** for all page agents building `index.html`, `demo.html`, `privacy.html`, and `terms.html`. Copy the boilerplate and canonical HTML verbatim. Do not invent new class names — use only what is defined here and in `css/components.css`.

---

## Head Boilerplate (copy into every page)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- ── Page-specific: edit per page ─────────────────────── -->
  <title>Page Title — [Business Name]</title>
  <meta name="description" content="Page-specific meta description here." />
  <!-- Open Graph -->
  <meta property="og:title"       content="Page Title — [Business Name]" />
  <meta property="og:description" content="Page-specific OG description." />
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="https://yourdomain.com/page.html" />
  <!-- <meta property="og:image" content="assets/og-image.jpg" /> -->
  <!-- ─────────────────────────────────────────────────────── -->

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

  <!-- Favicon (replace with real asset) -->
  <link rel="icon" href="assets/logo.svg" type="image/svg+xml" />

  <!-- Design System CSS (load in this order) -->
  <link rel="stylesheet" href="css/tokens.css" />
  <link rel="stylesheet" href="css/components.css" />
  <link rel="stylesheet" href="css/animations.css" />

  <!-- Page-specific CSS (optional) -->
  <!-- <link rel="stylesheet" href="css/page-name.css" /> -->
</head>
<body>

  <!-- Aurora background (place once, immediately after <body>) -->
  <div class="bg-aurora"></div>

  <!-- ── PAGE CONTENT HERE ─────────────────────────────────── -->

  <!-- Lucide icons (before config + main)
       Pinned to a specific version with Subresource Integrity (SRI).
       To upgrade: run the pin-lucide command in README.md to get a new hash. -->
  <script
    src="https://unpkg.com/lucide@1.17.0/dist/umd/lucide.min.js"
    integrity="sha384-bdZtphetAEBgkGZvhZXOFDWc55tHGLqaSo1f4qZtgvEiolEBqlJ9u6FTk+CoLfj0"
    crossorigin="anonymous"
  ></script>
  <!-- Site config (must load before main.js) -->
  <script src="js/config.js"></script>
  <!-- Main behaviour -->
  <script src="js/main.js"></script>
</body>
</html>
```

**Notes:**
- All `<title>`, meta description, and OG tags are **hardcoded per page** — do NOT use `data-config` for them.
- CSS load order is mandatory: `tokens.css` → `components.css` → `animations.css` → page-specific.
- Scripts go before `</body>`, in order: Lucide CDN → `config.js` → `main.js`.
- The Lucide `<script>` tag is **pinned to version 1.17.0** with an SRI hash. Do not change it to `@latest` — that would remove the integrity guarantee. To upgrade Lucide, see the "Upgrading Lucide" section in README.md.
- On **subpages** (`demo.html`, etc.), adjust CSS/JS paths if needed (they're already relative so `../` is only needed if the file is in a subdirectory).

---

## Canonical Header HTML (copy verbatim)

```html
<header class="site-header" role="banner">
  <div class="container site-header__inner">

    <!-- Brand / Logo -->
    <a href="index.html" class="brand" aria-label="[Business Name] home">
      <img src="assets/logo.svg" alt="" class="brand__logo" width="32" height="32" />
      <span class="brand__name" data-config="brandName">[Business Name]</span>
    </a>

    <!-- Desktop nav links -->
    <!-- NOTE: On index.html use #anchor links. On subpages prefix with index.html#anchor -->
    <nav aria-label="Main navigation">
      <ul class="nav__links">
        <li><a href="index.html">Home</a></li>
        <li><a href="demo.html">Demo</a></li>
        <li><a href="pricing.html">Pricing</a></li>
      </ul>
    </nav>

    <!-- Desktop CTA -->
    <div class="nav__cta">
      <a href="audit.html" class="btn btn--primary btn--sm" data-config-href="auditUrl">
        Request Free Audit
        <i data-lucide="arrow-right"></i>
      </a>
    </div>

    <!-- Mobile hamburger (icon swapped by JS) -->
    <button
      class="nav__toggle"
      aria-label="Open menu"
      aria-expanded="false"
      aria-controls="mobile-menu"
    >
      <i data-lucide="menu"></i>
    </button>

  </div>
</header>
```

---

## Canonical Mobile Menu HTML (copy verbatim, place after header)

```html
<nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation">
  <ul class="mobile-menu__links">
    <li><a href="index.html">Home</a></li>
    <li><a href="demo.html">Demo</a></li>
    <li><a href="pricing.html">Pricing</a></li>
  </ul>
  <div class="mobile-menu__cta">
    <a href="audit.html" class="btn btn--primary" data-config-href="auditUrl">
      Request Free Audit
      <i data-lucide="arrow-right"></i>
    </a>
  </div>
</nav>
```

---

## Canonical Footer HTML (copy verbatim)

```html
<footer class="site-footer" role="contentinfo">
  <div class="container">
    <div class="site-footer__grid">

      <!-- Column 1: Brand + description -->
      <div class="site-footer__brand">
        <a href="index.html" class="brand">
          <img src="assets/logo.svg" alt="" class="brand__logo" width="28" height="28" />
          <span class="brand__name" data-config="brandName">[Business Name]</span>
        </a>
        <p class="site-footer__desc">
          A done-for-you lead-capture system built specifically for HVAC contractors
          who are tired of missing calls and losing jobs to competitors.
        </p>
      </div>

      <!-- Column 2: Quick links -->
      <div class="site-footer__col">
        <h4>Quick Links</h4>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="demo.html">Demo</a></li>
          <li><a href="pricing.html">Pricing</a></li>
          <li><a href="index.html#faq">FAQ</a></li>
          <li><a href="audit.html">Free Audit</a></li>
        </ul>
      </div>

      <!-- Column 3: Contact -->
      <!-- ⚠️ data-config updates the link TEXT but NOT the href.
           If you change email/phone in config.js, also update the
           href="mailto:..." and href="tel:..." values below. -->
      <div class="site-footer__col site-footer__contact">
        <h4>Contact</h4>
        <p>
          <i data-lucide="mail"></i>
          <a href="mailto:hello@yourbusiness.com" data-config="email">hello@yourbusiness.com</a>
        </p>
        <p>
          <i data-lucide="phone"></i>
          <a href="tel:+18125550100" data-config="phone">(812) 555-0100</a>
        </p>
      </div>

    </div><!-- /.site-footer__grid -->

    <!-- Bottom bar (no extra .container — it's already inside one) -->
    <div class="site-footer__bottom">
      <p class="site-footer__disclaimer">
        This service improves lead-capture systems but does not guarantee specific
        rankings, leads, sales, or revenue.
      </p>
      <p class="site-footer__copy">
        &copy; <span id="footer-year"></span>
        <span data-config="brandName">[Business Name]</span>. All rights reserved.
      </p>
    </div>

  </div><!-- /.container -->
</footer>

<!-- Auto-update copyright year -->
<script>
  var el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
</script>
```

---

## data-config Reference

Use `data-config="key"` on any element to bind its `textContent` from `SITE_CONFIG`. Use `data-config-href="key"` to bind `href`. Dot-path notation supported.

| Attribute value         | Resolves to                    | Example use               |
|-------------------------|-------------------------------|---------------------------|
| `brandName`             | `[Business Name]`             | Logo text, footer name    |
| `ownerName`             | `Jacob`                       | First-person copy         |
| `email`                 | `hello@yourbusiness.com`      | Footer contact            |
| `phone`                 | `(812) 555-0100`              | Footer contact            |
| `auditUrl`              | `audit.html`                  | CTA button `href`         |
| `ctaText`               | `Request Free Audit`          | **Not bound via data-config** — CTA buttons hardcode this text alongside a Lucide `<i>` icon child; binding textContent would erase the icon. Edit CTA button text directly in HTML. |
| `pricing.starter`       | `$499`                        | Pricing card price        |
| `pricing.full`          | `$799`                        | Pricing card price        |
| `pricing.maintenance`   | `$99/mo`                      | Pricing card price        |

**Important:** Do NOT use `data-config` for page `<title>`, meta tags, or OG tags — those stay hardcoded in each page's `<head>`.

---

## JS State Classes & DOM Hooks

These classes are toggled by `main.js`. CSS must style them (already done in `components.css`).

| Class / Attribute            | Applied to              | Meaning                              |
|------------------------------|-------------------------|--------------------------------------|
| `.is-scrolled`               | `.site-header`          | User scrolled past 20px              |
| `.is-open`                   | `.mobile-menu`          | Mobile menu is visible               |
| `.is-visible`                | `.reveal`               | Element has entered the viewport     |
| `.is-active`                 | `[data-tab]`, `[data-panel]` | Active tab / panel               |
| `.is-open`                   | `.faq-item`             | FAQ answer is expanded               |
| `.is-visible`                | `[data-form-success]`   | Form success state shown             |
| `.has-error`                 | `.field`                | Field failed validation              |

**Form hook:** The audit form must have `data-audit-form` on the `<form>` element and `data-form-success` on the success message container.

```html
<form data-audit-form>
  <!-- fields -->
  <button type="submit" class="btn btn--primary">Submit</button>
</form>
<div data-form-success>
  <div class="success-icon"><i data-lucide="check"></i></div>
  <h3>Got it! I'll be in touch shortly.</h3>
  <p class="text-muted">Usually within one business day.</p>
</div>
```

---

## Color Tokens — When to Use Each

| Token          | Hex / Value      | Use for                                              |
|----------------|------------------|------------------------------------------------------|
| `--accent`     | `#38bdf8` cyan   | Primary CTAs, links, focus rings, active states, system elements |
| `--accent-2`   | `#22c55e` green  | Leads, money, success states, "after" comparisons, check icons |
| `--warn`       | `#f97316` orange | Lost leads, missed calls, "before" states, urgency   |
| `--text`       | `#f8fafc`        | All body copy, headings                              |
| `--muted`      | `#94a3b8`        | Supporting text, labels, placeholders, footer links  |
| `--bg`         | `#07111f`        | Primary page background                             |
| `--bg-2`       | `#0a1626`        | Alternating section background (`.section--alt`)    |
| `--border`     | rgba white 12%   | Default card/input borders                          |
| `--border-strong` | rgba white 18% | Hovered/focused borders                            |

---

## Component Class Reference

### Buttons

```html
<!-- Primary (cyan gradient, dark text) -->
<a href="audit.html" class="btn btn--primary">
  Request Free Audit <i data-lucide="arrow-right"></i>
</a>

<!-- Primary large -->
<a href="audit.html" class="btn btn--primary btn--lg">
  Get Started <i data-lucide="arrow-right"></i>
</a>

<!-- Secondary (bordered) -->
<button class="btn btn--secondary">Learn More</button>

<!-- Green (for lead/success emphasis) -->
<button class="btn btn--green">See Your Leads</button>

<!-- Ghost (subtle) -->
<button class="btn btn--ghost">Skip for now</button>

<!-- Full-width (e.g. inside cards) -->
<a href="#" class="btn btn--primary btn--full">Get Started</a>
```

Trailing `<i data-lucide="...">` icons nudge right on hover automatically.

---

### Cards

```html
<!-- Basic card -->
<div class="card">
  <p>Card content</p>
</div>

<!-- Hover card (lifts on hover) -->
<div class="card card--hover">
  <p>Hoverable card</p>
</div>

<!-- Glass card (stronger blur + sheen) -->
<div class="card card--glass">
  <p>Glass surface</p>
</div>

<!-- Featured card (cyan top border) -->
<div class="card card--featured card--hover">
  <p>Most popular plan</p>
</div>
```

---

### Icon Chips

```html
<!-- Cyan (primary/system) -->
<div class="icon-chip icon-chip--cyan">
  <i data-lucide="zap"></i>
</div>

<!-- Green (leads/success) -->
<div class="icon-chip icon-chip--green">
  <i data-lucide="trending-up"></i>
</div>

<!-- Orange (before/lost leads) -->
<div class="icon-chip icon-chip--orange">
  <i data-lucide="phone-missed"></i>
</div>

<!-- Amber -->
<div class="icon-chip icon-chip--amber">
  <i data-lucide="star"></i>
</div>

<!-- Violet -->
<div class="icon-chip icon-chip--violet">
  <i data-lucide="cpu"></i>
</div>

<!-- Large variant -->
<div class="icon-chip icon-chip--cyan icon-chip--lg">
  <i data-lucide="shield-check"></i>
</div>
```

---

### Pills / Badges

```html
<!-- Cyan accent pill (eyebrow labels) -->
<div class="pill pill--accent">
  <span class="eyebrow">What I Fix</span>
</div>

<!-- Green pill -->
<div class="pill pill--green">
  <i data-lucide="check-circle"></i> Active
</div>

<!-- Orange/warning pill -->
<div class="pill pill--warn">Before</div>

<!-- "Most Popular" badge -->
<div class="pill pill--popular">Most Popular</div>

<!-- Neutral pill -->
<div class="pill pill--muted">Optional</div>
```

---

### Section Heading Block

```html
<!-- Centered (standard) -->
<div class="section-head center reveal">
  <div class="pill pill--accent">
    <span class="eyebrow">Section Label</span>
  </div>
  <h2>What most HVAC sites get wrong</h2>
  <p class="text-muted">
    Supporting subhead text explaining the section in one or two sentences.
    Keep it under 20 words.
  </p>
</div>

<!-- Left-aligned -->
<div class="section-head reveal">
  <div class="pill pill--accent">
    <span class="eyebrow">The Problem</span>
  </div>
  <h2>You're losing leads every day</h2>
  <p class="text-muted">Here's why, and how I fix it.</p>
</div>
```

---

### Scroll Reveal

```html
<!-- Basic reveal (fade up) -->
<div class="reveal">...</div>

<!-- With delay (stagger children) -->
<div class="reveal" style="--reveal-delay: 100ms">...</div>
<div class="reveal" style="--reveal-delay: 200ms">...</div>
<div class="reveal" style="--reveal-delay: 300ms">...</div>

<!-- Direction variants -->
<div class="reveal reveal--left">...</div>
<div class="reveal reveal--right">...</div>
<div class="reveal reveal--scale">...</div>
```

`main.js` observes all `.reveal` elements and adds `.is-visible` once they enter the viewport. Each fires only once. Respects `prefers-reduced-motion`.

---

### Grid System

```html
<!-- 3-column (collapses to 2 at 900px, 1 at 760px) -->
<div class="grid grid-3">
  <div class="card card--hover">...</div>
  <div class="card card--hover">...</div>
  <div class="card card--hover">...</div>
</div>

<!-- 2-column (collapses to 1 at 760px) -->
<div class="grid grid-2">
  <div>Left</div>
  <div>Right</div>
</div>

<!-- 4-column grid -->
<div class="grid grid-4">...</div>
```

---

### Form Fields

```html
<form data-audit-form>
  <div class="form-group">

    <div class="field">
      <label for="name">Your Name <span class="required-star">*</span></label>
      <input type="text" id="name" name="name" placeholder="John Smith" required />
    </div>

    <div class="field--row">
      <div class="field">
        <label for="email">Email <span class="required-star">*</span></label>
        <input type="email" id="email" name="email" placeholder="john@example.com" required />
      </div>
      <div class="field">
        <label for="phone">Phone</label>
        <input type="tel" id="phone" name="phone" placeholder="(555) 000-0000" />
      </div>
    </div>

    <div class="field">
      <label for="business">Business Name <span class="required-star">*</span></label>
      <input type="text" id="business" name="business" placeholder="Smith HVAC" required />
    </div>

    <div class="field">
      <label for="problem">What's your biggest issue?</label>
      <select id="problem" name="problem">
        <option value="" disabled selected>Select one…</option>
        <option value="no-leads">Not getting enough leads online</option>
        <option value="slow-site">Site loads slowly</option>
        <option value="no-reviews">No review system</option>
        <option value="other">Something else</option>
      </select>
    </div>

    <div class="field">
      <label for="notes">Anything else?</label>
      <textarea id="notes" name="notes" placeholder="Optional details…"></textarea>
    </div>

    <label class="checkbox">
      <input type="checkbox" name="consent" required />
      I agree to be contacted about my free audit.
    </label>

  </div>

  <button type="submit" class="btn btn--primary btn--lg btn--full" style="margin-top:24px;">
    Send My Audit Request <i data-lucide="arrow-right"></i>
  </button>
</form>

<!-- Success message (hidden until form submitted) -->
<div data-form-success>
  <div class="success-icon">
    <i data-lucide="check"></i>
  </div>
  <h3>Got it — I'll be in touch soon.</h3>
  <p class="text-muted">Usually within one business day.</p>
</div>
```

---

### FAQ Accordion

```html
<div class="faq-list">

  <div class="faq-item">
    <button class="faq-item__trigger" data-faq-toggle aria-expanded="false">
      How long does setup take?
      <i data-lucide="chevron-down" class="faq-item__icon"></i>
    </button>
    <div class="faq-item__body">
      <div class="faq-item__content">
        <p>Most builds are complete within 5–7 business days after I receive your
        info and access credentials.</p>
      </div>
    </div>
  </div>

  <div class="faq-item">
    <button class="faq-item__trigger" data-faq-toggle aria-expanded="false">
      Do I need to know anything technical?
      <i data-lucide="chevron-down" class="faq-item__icon"></i>
    </button>
    <div class="faq-item__body">
      <div class="faq-item__content">
        <p>No. I handle everything. You just provide login credentials for your
        existing accounts and I take it from there.</p>
      </div>
    </div>
  </div>

</div>
```

---

### Before/After Tab Switcher

```html
<div data-tabs-parent>

  <div class="tabs">
    <button data-tab="before">Before</button>
    <button data-tab="after">After</button>
  </div>

  <div class="tab-panels" style="margin-top: 24px;">
    <div data-panel="before">
      <!-- "before" content here -->
      <div class="pill pill--warn">Before</div>
      <p>Slow site, no reviews, missed calls…</p>
    </div>
    <div data-panel="after">
      <!-- "after" content here -->
      <div class="pill pill--green">After</div>
      <p>Fast, leads captured, reviews flowing…</p>
    </div>
  </div>

</div>
```

JS auto-activates the first tab. Add `data-tabs-parent` to the wrapper so the tab buttons can find their panels.

---

## Typography Scale

| Element        | Font             | Size (clamp)                     | Weight |
|----------------|------------------|----------------------------------|--------|
| `h1`           | Space Grotesk    | clamp(2.2rem, 5.5vw, 3.75rem)   | 700    |
| `h2`           | Space Grotesk    | clamp(1.8rem, 4vw, 3rem)        | 700    |
| `h3`           | Space Grotesk    | clamp(1.25rem, 2.5vw, 1.75rem)  | 700    |
| `h4`           | Space Grotesk    | clamp(1.1rem, 2vw, 1.35rem)     | 700    |
| Body           | Inter            | 1rem                            | 400    |
| `.text-lg`     | Inter            | 1.125rem                        | 400    |
| `.eyebrow`     | Inter            | 0.75rem, uppercase, 600         | 600    |
| `.text-muted`  | Inter            | inherit                         | inherit |

All headings: `letter-spacing: -0.02em`, `line-height: 1.1`.

---

## Section Structure Pattern

```html
<section id="section-id" class="section [section--alt]">
  <div class="container">

    <!-- Heading block -->
    <div class="section-head center reveal">
      <div class="pill pill--accent"><span class="eyebrow">Label</span></div>
      <h2>Section heading</h2>
      <p class="text-muted">Subhead.</p>
    </div>

    <!-- Content grid -->
    <div class="grid grid-3">
      <div class="card card--hover reveal" style="--reveal-delay: 0ms">...</div>
      <div class="card card--hover reveal" style="--reveal-delay: 100ms">...</div>
      <div class="card card--hover reveal" style="--reveal-delay: 200ms">...</div>
    </div>

  </div>
</section>
```

Use `.section--alt` on every other section to alternate background color. The primary navigation links to `index.html`, `demo.html`, and `pricing.html`; the free audit lives at `audit.html`. Homepage section IDs such as `#what-i-fix` and `#faq` remain useful for contextual footer and in-page links.

---

## Accessibility Notes

- All interactive elements have `:focus-visible` outlines (cyan, 2px offset).
- Mobile menu sets `aria-expanded` on the toggle button.
- FAQ triggers set `aria-expanded` per item.
- `prefers-reduced-motion` disables all animations (CSS + JS).
- Use semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`.
- Icon-only buttons must have `aria-label`.
- Decorative images use `alt=""`.
