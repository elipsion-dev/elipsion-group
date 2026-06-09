# Lead-Capture-Site

A premium dark-mode marketing website selling a done-for-you lead-capture system to local HVAC contractors. Built in vanilla HTML/CSS/JS — no framework, no build step. Open any `.html` file through a local server and it just works.

---

## Run Locally

Serve the folder over HTTP (do **not** open as `file://` — relative paths and any future fetch() calls require a server):

```bash
cd /Users/jdbriggs_mac/Lead-Capture-Site
python3 -m http.server 8000
```

Then open: [http://localhost:8000](http://localhost:8000)

Any static server works. Alternatives:

```bash
# Node (npx, no install needed)
npx serve .

# PHP
php -S localhost:8000

# VS Code: install "Live Server" extension, right-click index.html → Open with Live Server
```

---

## Deploy

It's pure static files — drag the whole folder to any static host:

| Host | How |
|---|---|
| **Netlify** | Drag-drop the folder at [app.netlify.com/drop](https://app.netlify.com/drop) |
| **Vercel** | `npx vercel` in the project root (select "Other" framework) |
| **Cloudflare Pages** | Connect GitHub repo or upload folder in the dashboard |
| **GitHub Pages** | Push to a repo, enable Pages from Settings → Pages |
| **Any web host** | FTP/SFTP the folder to `public_html/` |

No build step. No `npm install`. No config file needed for any of the above.

---

## What You Can Edit

| What | Where | Notes |
|---|---|---|
| Brand name | `js/config.js` → `brandName` | Updates everywhere via `data-config` |
| Email address | `js/config.js` → `email` | Also update `href="mailto:..."` in footer HTML |
| Phone number | `js/config.js` → `phone` | Also update `href="tel:..."` in footer HTML |
| Prices | `js/config.js` → `pricing.*` | Starter, Full, Maintenance |
| CTA button link | `js/config.js` → `auditUrl` | Change to a Typeform/Calendly/Tally URL when ready |
| Colors | `css/tokens.css` → `:root` | Change `--accent`, `--accent-2`, `--warn`, etc. |
| Section copy | `index.html`, `demo.html` | Look for `<!-- EDIT: ... -->` HTML comments |
| Pages | `index.html`, `demo.html`, `privacy.html`, `terms.html` | Self-contained HTML files |
| Logo | `assets/logo.svg` | Replace with your own SVG; keep it ~32×32 |

After editing `config.js`, hard-refresh the browser (`Cmd/Ctrl + Shift + R`).

---

## Contact Form

The audit form (`[data-audit-form]`) is **front-end only** — it validates fields and shows a success message but does not actually send data anywhere.

To wire it to a real backend, open `js/main.js` and find the comment block:

```
// ── TODO: POST to backend ───────────────────────────
```

That block shows example `fetch()` calls for Formspree, Supabase, and a generic endpoint. Replace the commented code with your chosen integration.

**Quickest no-code option:** Replace the `<form>` with a [Formspree](https://formspree.io) embed or [Tally.so](https://tally.so) iframe — no code needed.

---

## File Structure

```
Lead-Capture-Site/
├── index.html              ← Homepage (built by page agent)
├── demo.html               ← Demo page
├── privacy.html            ← Privacy policy
├── terms.html              ← Terms of service
├── _foundation_test.html   ← Design system smoke-test (safe to delete)
│
├── css/
│   ├── tokens.css          ← Design tokens, reset, layout utilities
│   ├── components.css      ← All shared UI components
│   └── animations.css      ← Keyframes, scroll-reveal, reduced-motion
│
├── js/
│   ├── config.js           ← ★ Edit this for brand/contact/prices
│   └── main.js             ← Nav, mobile menu, reveal, FAQ, forms, Lucide
│
├── assets/
│   └── logo.svg            ← Logo mark (cyan hexagon/spark)
│
├── STYLEGUIDE.md           ← Component contract for page agents
└── README.md               ← This file
```

---

## Upgrading Lucide

The Lucide CDN script is pinned to a specific version with a Subresource Integrity (SRI) hash to prevent CDN-compromise attacks. To upgrade to a newer version:

1. Find the new version number at [unpkg.com/lucide](https://unpkg.com/lucide/)
2. Compute the SHA-384 hash:
   ```bash
   curl -sL "https://unpkg.com/lucide@NEW_VERSION/dist/umd/lucide.min.js" \
     | openssl dgst -sha384 -binary | openssl base64 -A
   ```
3. Update every `<script>` tag that loads Lucide (all `.html` files) with:
   ```html
   <script
     src="https://unpkg.com/lucide@NEW_VERSION/dist/umd/lucide.min.js"
     integrity="sha384-NEW_HASH_HERE"
     crossorigin="anonymous"
   ></script>
   ```
4. The current pinned version and hash are documented in `STYLEGUIDE.md`.

**Current pin:** `lucide@1.17.0`
**Current SRI:** `sha384-bdZtphetAEBgkGZvhZXOFDWc55tHGLqaSo1f4qZtgvEiolEBqlJ9u6FTk+CoLfj0`
