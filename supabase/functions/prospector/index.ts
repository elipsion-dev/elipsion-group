/*
 * ============================================================
 * prospector — Lead-finder + Google Profile / Website scorer
 * ============================================================
 * Password-gated internal tool. The static page on GitHub Pages
 * is only a shell; ALL secrets and scoring logic live here, and
 * every request must carry the correct PROSPECTOR_PASSWORD before
 * any paid API (Google Places / OpenAI) is touched.
 *
 * Actions (POST body { action, password, ... }):
 *   "scan"  → { query, trade? } → searches Google for businesses,
 *             scores each Google profile + website, returns results.
 *   "email" → { business } → builds missed-revenue math (code) and
 *             writes an outreach email (gpt-4.1-nano).
 *
 * Secrets (Supabase → Edge Function secrets):
 *   PROSPECTOR_PASSWORD   required — unlocks the tool
 *   GOOGLE_MAPS_API_KEY   required — Places API (New)
 *   OPENAI_API_KEY        required for "email"
 *   ALLOWED_ORIGINS       optional — CSV override of allowed origins
 * ============================================================
 */

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4.1-nano";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.elipsiongroup.com",
  "https://elipsiongroup.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

/* ── Revenue-math assumptions (tunable; overridable per request) ──
   Deliberately conservative so the numbers are defensible on a
   sales call. All can be overridden via body.assumptions.        */
const DEFAULT_ASSUMPTIONS = {
  avgJobValue: 450,          // avg revenue per HVAC service/job ($)
  monthlyCalls: 80,          // est. inbound calls/mo for a local HVAC
  missedCallRate: 0.27,      // share of calls that go unanswered
  missedCallRecovery: 0.45,  // share of missed callers won back by text-back
  closeRate: 0.35,           // share of captured leads that become jobs
  monthlyVisitors: 350,      // est. website visitors/mo
  webLeadLift: 0.04,         // extra visitor→lead rate from form+booking+pricing
};

/* ============================================================
   HTTP plumbing (mirrors submit-audit conventions)
   ============================================================ */
function allowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  return configured
    ? configured.split(",").map((o) => o.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = allowedOrigins();
  const responseOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

/** Constant-time-ish string compare to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clampScore(pointsEarned: number, pointsPossible: number): number {
  if (pointsPossible <= 0) return 1;
  const ten = Math.round((pointsEarned / pointsPossible) * 10);
  return Math.min(10, Math.max(1, ten));
}

/* ============================================================
   Google Business Profile scoring (Places API New fields)
   ============================================================ */
type Place = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: unknown;
  photos?: unknown[];
  businessStatus?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string };
};

function scoreGbp(p: Place): { score: number; bullets: string[] } {
  const bullets: string[] = [];
  let earned = 0;
  const possible = 100;

  // Website link (20)
  if (p.websiteUri) earned += 20;
  else bullets.push("No website linked on the Google profile — visitors have no next step after finding you.");

  // Phone (10)
  if (p.nationalPhoneNumber) earned += 10;
  else bullets.push("No phone number on the profile — callers can't reach you in one tap.");

  // Hours (10)
  if (p.regularOpeningHours) earned += 10;
  else bullets.push("Business hours aren't set — Google deprioritizes profiles with missing hours.");

  // Rating quality (15)
  const rating = p.rating ?? 0;
  if (rating >= 4.7) earned += 15;
  else if (rating >= 4.5) { earned += 12; bullets.push(`Rating is ${rating.toFixed(1)} — strong, but pushing toward 4.7+ lifts ranking and clicks.`); }
  else if (rating >= 4.0) { earned += 8; bullets.push(`Rating is ${rating.toFixed(1)} — below the 4.5 trust threshold most buyers screen for.`); }
  else if (rating > 0) { earned += 4; bullets.push(`Rating is ${rating.toFixed(1)} — a review-generation system is needed to repair this.`); }
  else bullets.push("No rating yet — start requesting reviews immediately.");

  // Review volume (20)
  const reviews = p.userRatingCount ?? 0;
  if (reviews >= 100) earned += 20;
  else if (reviews >= 50) { earned += 16; bullets.push(`${reviews} reviews — good, but 100+ dominates the local pack.`); }
  else if (reviews >= 20) { earned += 12; bullets.push(`Only ${reviews} reviews — competitors with 50+ outrank you.`); }
  else if (reviews >= 5) { earned += 7; bullets.push(`Only ${reviews} reviews — a steady review-request flow is missing.`); }
  else if (reviews >= 1) { earned += 3; bullets.push(`Just ${reviews} review(s) — almost invisible in search; needs an automated ask.`); }
  else bullets.push("Zero reviews — the single biggest fixable ranking gap.");

  // Photos (10)
  const photos = Array.isArray(p.photos) ? p.photos.length : 0;
  if (photos >= 10) earned += 10;
  else if (photos >= 5) { earned += 7; bullets.push(`Only ${photos} photos — profiles with 10+ get more calls and direction requests.`); }
  else if (photos >= 1) { earned += 4; bullets.push(`Only ${photos} photo(s) — add job, team, and truck photos.`); }
  else bullets.push("No photos — profiles with photos get far more engagement.");

  // Description (8)
  if (p.editorialSummary?.text) earned += 8;
  else bullets.push("No business description — a keyword-rich summary helps ranking and conversion.");

  // Category (4)
  if (p.primaryTypeDisplayName?.text) earned += 4;
  else bullets.push("Primary category looks unset or generic — set it to the exact service type.");

  // Operational (3)
  if ((p.businessStatus ?? "OPERATIONAL") === "OPERATIONAL") earned += 3;
  else bullets.push(`Profile status is "${p.businessStatus}" — this suppresses visibility.`);

  return { score: clampScore(earned, possible), bullets };
}

/* ============================================================
   Website fetch + feature detection (pure code, no AI)
   ============================================================ */
type WebFeatures = {
  reachable: boolean;
  ssl: boolean;
  mobileViewport: boolean;
  hasTitle: boolean;
  hasMetaDescription: boolean;
  hasH1: boolean;
  hasSchema: boolean;
  clickToCall: boolean;
  quoteForm: boolean;
  strongCta: boolean;
  aiChat: boolean;
  onlineBooking: boolean;
  instantPricing: boolean;
  reviews: boolean;
  faq: boolean;
  emergency: boolean;
};

function has(re: RegExp, s: string): boolean {
  return re.test(s);
}

function detectFeatures(rawHtml: string, finalUrl: string): WebFeatures {
  const html = rawHtml.slice(0, 800_000);
  const lower = html.toLowerCase();

  // Chat widgets — script-tag/domain signatures survive JS rendering.
  const chatSig = /(tawk\.to|intercom|drift\.com|driftt|tidio|crisp\.chat|livechatinc|olark|zendesk|hubspot.*(conversations|messages)|podium|birdeye|customerchat|fb-customerchat|gorgias|smartsupp|chatbot|chat-?widget|"chat")/i;

  // Booking / scheduling platforms.
  const bookingSig = /(calendly|acuityscheduling|housecallpro|servicetitan|getjobber|jobber|setmore|squareup\.com\/appointments|schedulicity|book(?:ing)?[-_ ]?(now|online|appointment)|schedule[-_ ]?(now|online|service|appointment)|request[-_ ]?appointment)/i;

  // Self-serve / instant pricing.
  const pricingSig = /(instant[-_ ]?(quote|estimate|price)|price[-_ ]?(calculator|estimate)|cost[-_ ]?calculator|get[-_ ]?(a[-_ ]?)?(quote|pricing|estimate)|see[-_ ]?pricing|view[-_ ]?pricing|our[-_ ]?pricing|href=["'][^"']*pricing)/i;

  // Strong call-to-action language.
  const ctaSig = /(request[-_ ]?(a[-_ ]?)?quote|free[-_ ]?estimate|request[-_ ]?service|schedule[-_ ]?service|book[-_ ]?now|get[-_ ]?started|contact[-_ ]?us|call[-_ ]?(now|today))/i;

  // A real lead form: a <form> that contains an input/textarea.
  const hasForm = /<form[\s>]/i.test(html) && /<(input|textarea)[\s>]/i.test(html);

  return {
    reachable: true,
    ssl: finalUrl.startsWith("https://"),
    mobileViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    hasTitle: /<title[^>]*>\s*\S/i.test(html),
    hasMetaDescription: /<meta[^>]+name=["']description["'][^>]*content=["']\s*\S/i.test(html),
    hasH1: /<h1[\s>]/i.test(html),
    hasSchema: lower.includes("application/ld+json") &&
      /(localbusiness|hvacbusiness|"@type"\s*:\s*"[^"]*(business|service)[^"]*")/i.test(html),
    clickToCall: /href=["']tel:/i.test(html),
    quoteForm: hasForm,
    strongCta: has(ctaSig, lower),
    aiChat: has(chatSig, lower),
    onlineBooking: has(bookingSig, lower),
    instantPricing: has(pricingSig, lower),
    reviews: /(testimonial|reviews|what our (customers|clients)|google reviews|★)/i.test(lower),
    faq: /(faq|frequently asked)/i.test(lower),
    emergency: /(24\/7|24-7|24 hour|emergency service|same[-_ ]?day)/i.test(lower),
  };
}

function unreachableFeatures(): WebFeatures {
  return {
    reachable: false, ssl: false, mobileViewport: false, hasTitle: false,
    hasMetaDescription: false, hasH1: false, hasSchema: false, clickToCall: false,
    quoteForm: false, strongCta: false, aiChat: false, onlineBooking: false,
    instantPricing: false, reviews: false, faq: false, emergency: false,
  };
}

// weight, and the bullet shown when the feature is MISSING.
const WEB_RUBRIC: { key: keyof WebFeatures; weight: number; missing: string }[] = [
  { key: "quoteForm",       weight: 15, missing: "No quote/contact form — visitors must pick up the phone, so after-hours interest is lost." },
  { key: "instantPricing",  weight: 12, missing: "No instant pricing/quote tool — customers can't self-estimate, the #1 thing that converts comparison shoppers." },
  { key: "onlineBooking",   weight: 12, missing: "No online scheduling — customers can't book a visit themselves; every job requires a phone tag." },
  { key: "aiChat",          weight: 10, missing: "No live/AI chat — questions go unanswered, especially nights and weekends." },
  { key: "strongCta",       weight: 10, missing: "Weak or missing call-to-action — nothing clearly tells visitors to request service." },
  { key: "clickToCall",     weight:  8, missing: "No click-to-call phone link — mobile visitors can't tap to call." },
  { key: "ssl",             weight:  8, missing: "No HTTPS/SSL — browsers flag the site 'Not secure', killing trust." },
  { key: "mobileViewport",  weight:  8, missing: "Not mobile-optimized — most HVAC searches are on phones." },
  { key: "hasSchema",       weight:  8, missing: "No LocalBusiness structured data — missing SEO signal Google uses for local ranking." },
  { key: "hasMetaDescription", weight: 5, missing: "Missing meta description — weaker click-through from search results." },
  { key: "hasTitle",        weight:  4, missing: "Missing or empty page title — hurts SEO and the search snippet." },
  { key: "reviews",         weight:  4, missing: "No reviews/testimonials shown — social proof is missing from the page." },
  { key: "hasH1",           weight:  3, missing: "No clear H1 headline — weaker SEO and messaging." },
  { key: "faq",             weight:  3, missing: "No FAQ section — misses an easy SEO + objection-handling win." },
  { key: "emergency",       weight:  3, missing: "No emergency / same-day messaging — HVAC buyers in a hurry look for this." },
];

function scoreWebsite(f: WebFeatures): { score: number; bullets: string[] } {
  const bullets: string[] = [];
  let earned = 0;
  let possible = 0;
  for (const item of WEB_RUBRIC) {
    possible += item.weight;
    if (f[item.key]) earned += item.weight;
    else bullets.push(item.missing);
  }
  return { score: clampScore(earned, possible), bullets };
}

async function analyzeWebsite(url: string): Promise<{ features: WebFeatures; score: number; bullets: string[] }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some hosts block non-browser agents; present a normal UA.
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    }).finally(() => clearTimeout(timer));

    const ctype = res.headers.get("content-type") || "";
    if (!res.ok || !ctype.includes("text/html")) {
      const f = unreachableFeatures();
      return { features: f, score: 1, bullets: ["Website didn't return a readable page (it may be down, blocking bots, or not built yet)."] };
    }
    const html = await res.text();
    const features = detectFeatures(html, res.url || url);
    const { score, bullets } = scoreWebsite(features);
    return { features, score, bullets };
  } catch (_e) {
    const f = unreachableFeatures();
    return { features: f, score: 1, bullets: ["Couldn't load the website (timed out or refused the connection)."] };
  }
}

/** Run async tasks with a concurrency cap so 20 site fetches don't blow the time budget. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/* ============================================================
   Revenue math (code) — feeds the email; never let AI invent it
   ============================================================ */
function revenueMath(features: WebFeatures, gbpScore: number, a: typeof DEFAULT_ASSUMPTIONS) {
  // Calls missed for lack of after-hours / missed-call capture.
  const missedCalls = a.monthlyCalls * a.missedCallRate;
  const recoverableCallJobs = missedCalls * a.missedCallRecovery * a.closeRate;
  const missedCallRevenue = recoverableCallJobs * a.avgJobValue;

  // Web leads lost for missing form / booking / instant pricing.
  const hasCapture = features.quoteForm || features.onlineBooking || features.instantPricing;
  const lostWebJobs = hasCapture ? 0 : a.monthlyVisitors * a.webLeadLift * a.closeRate;
  const lostWebRevenue = lostWebJobs * a.avgJobValue;

  // A weak Google profile suppresses call volume; scale a modest penalty.
  const profileDrag = ((10 - gbpScore) / 10) * 0.15; // up to 15% fewer calls
  const profileLostJobs = a.monthlyCalls * profileDrag * a.closeRate;
  const profileLostRevenue = profileLostJobs * a.avgJobValue;

  const totalMonthly = missedCallRevenue + lostWebRevenue + profileLostRevenue;

  const round = (n: number) => Math.round(n);
  return {
    avgJobValue: a.avgJobValue,
    monthlyCalls: a.monthlyCalls,
    missedCallsPerMonth: round(missedCalls),
    recoverableCallJobs: Math.round(recoverableCallJobs * 10) / 10,
    missedCallRevenue: round(missedCallRevenue),
    lostWebRevenue: round(lostWebRevenue),
    profileLostRevenue: round(profileLostRevenue),
    totalMonthly: round(totalMonthly),
    totalAnnual: round(totalMonthly * 12),
  };
}

/* ============================================================
   Handler
   ============================================================ */
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigins();

  if (origin && !allowed.includes(origin)) {
    return json({ error: "Origin not allowed." }, 403, origin);
  }
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400, origin);
  }

  // ── Password gate: nothing paid happens before this passes. ──
  const expected = Deno.env.get("PROSPECTOR_PASSWORD");
  if (!expected) {
    console.error("PROSPECTOR_PASSWORD not configured.");
    return json({ error: "Tool not configured." }, 503, origin);
  }
  const provided = typeof body.password === "string" ? body.password : "";
  if (!safeEqual(provided, expected)) {
    return json({ error: "Incorrect password." }, 401, origin);
  }

  const action = typeof body.action === "string" ? body.action : "scan";

  /* ── AUTH: password already verified above; just confirm. ── */
  if (action === "auth") {
    return json({ ok: true }, 200, origin);
  }

  /* ── SCAN ───────────────────────────────────────────────── */
  if (action === "scan") {
    const query = (typeof body.query === "string" ? body.query : "").trim().slice(0, 120);
    const trade = (typeof body.trade === "string" && body.trade.trim() ? body.trade.trim() : "HVAC").slice(0, 60);
    if (!query) return json({ error: "Enter a city or ZIP code." }, 400, origin);

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY not configured.");
      return json({ error: "Search is not configured." }, 503, origin);
    }

    // Text Search (New) returns up to 20 places per call plus a
    // `nextPageToken`. We follow that token to pull every page Google will
    // give us, stopping when no token comes back — i.e. "scan until there's
    // nothing left to scan". Google is understood to cap Text Search around
    // ~60 results (3 pages) per query, after which it stops issuing a token;
    // MAX_PAGES is only a SAFETY BOUND so a runaway can't rack up cost/time.
    // It is intentionally set ABOVE the assumed cap: if Google really stops at
    // 3 pages the loop ends on its own at no extra cost, but if it hands out
    // more we don't silently truncate. Covering a large metro past the ceiling
    // would require splitting the area into sub-queries (ZIP/grid) + de-dupe —
    // not done here; the UI nudges the user to narrow the area instead.
    //
    // NOTE: paginated Text Search requires `nextPageToken` in the field mask.
    // If Google rejects this mask the FIRST call 400s and every scan breaks —
    // confirm with a live scan after deploy.
    //
    // Field mask is kept to the Pro SKU (no `reviews`) to stay cheap. (To show
    // review recency, add "places.reviews" here — but that bumps every page to
    // the priciest Enterprise+Atmosphere SKU.)
    const MAX_PAGES = 6;
    const fieldMask = [
      "places.id", "places.displayName", "places.formattedAddress",
      "places.nationalPhoneNumber", "places.websiteUri", "places.rating",
      "places.userRatingCount", "places.regularOpeningHours", "places.photos",
      "places.businessStatus", "places.googleMapsUri",
      "places.primaryTypeDisplayName", "places.editorialSummary",
      // Required for pagination: the token lives at the top level, not under places.*
      "nextPageToken",
    ].join(",");

    let places: Place[] = [];
    let pagesFetched = 0;
    let pageToken: string | undefined;
    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const reqBody: Record<string, unknown> = {
          textQuery: `${trade} in ${query}`,
          pageSize: 20,
          languageCode: "en",
        };
        // On follow-up pages the New API only needs the token (the original
        // query params are remembered server-side, but we send them anyway).
        if (pageToken) reqBody.pageToken = pageToken;

        const gRes = await fetch(PLACES_SEARCH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fieldMask,
          },
          body: JSON.stringify(reqBody),
        });
        if (!gRes.ok) {
          const detail = await gRes.text();
          console.error("Places API error:", gRes.status, detail);
          // If earlier pages already returned businesses, keep them rather
          // than failing the whole scan on a later page.
          if (places.length > 0) break;
          return json({ error: "Google search failed. Check the API key, billing, and that Places API (New) is enabled." }, 502, origin);
        }
        const data = await gRes.json();
        const batch: Place[] = Array.isArray(data.places) ? data.places : [];
        places.push(...batch);
        pagesFetched++;
        pageToken = typeof data.nextPageToken === "string" && data.nextPageToken
          ? data.nextPageToken
          : undefined;
        // Stop when Google offers no more pages (cap reached or list exhausted).
        if (!pageToken || batch.length === 0) break;
      }
    } catch (e) {
      console.error("Places fetch failed:", e);
      if (places.length === 0) {
        return json({ error: "Google search failed (network)." }, 502, origin);
      }
    }

    // De-dupe across pages by place id (pages can occasionally overlap).
    const seen = new Set<string>();
    places = places.filter((p) => {
      const key = p.id ?? `${p.displayName?.text}|${p.formattedAddress}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Did we likely stop short of the full market? True if Google still had a
    // token to give (we stopped on our own safety bound) OR we came back with a
    // ceiling-like haul (~3 full pages), which is the documented Text Search cap.
    const capReached = !!pageToken || places.length >= 58;

    if (places.length === 0) {
      return json({ results: [], query, trade, totalFound: 0, pagesFetched, capReached: false }, 200, origin);
    }

    // Analyze each business's website in parallel (capped). Concurrency is a
    // touch higher than before because a full scan can now be up to ~60 sites.
    const results = await mapLimit(places, 8, async (p) => {
      const gbp = scoreGbp(p);
      let website = null as null | { score: number; bullets: string[]; features: WebFeatures };
      if (p.websiteUri) {
        const w = await analyzeWebsite(p.websiteUri);
        website = { score: w.score, bullets: w.bullets, features: w.features };
      }
      return {
        id: p.id,
        name: p.displayName?.text ?? "(unnamed)",
        address: p.formattedAddress ?? "",
        phone: p.nationalPhoneNumber ?? "",
        website: p.websiteUri ?? "",
        mapsUrl: p.googleMapsUri ?? "",
        rating: p.rating ?? null,
        reviewCount: p.userRatingCount ?? 0,
        category: p.primaryTypeDisplayName?.text ?? "",
        gbpScore: gbp.score,
        gbpBullets: gbp.bullets,
        websiteScore: website?.score ?? null,
        websiteBullets: website?.bullets ?? ["No website found on the Google profile — a major missed opportunity."],
        websiteFeatures: website?.features ?? null,
      };
    });

    return json({ results, query, trade, totalFound: places.length, pagesFetched, capReached }, 200, origin);
  }

  /* ── EMAIL ──────────────────────────────────────────────── */
  if (action === "email") {
    const biz = (body.business ?? {}) as Record<string, unknown>;
    const name = typeof biz.name === "string" ? biz.name : "the business";
    if (!biz || !name) return json({ error: "Missing business data." }, 400, origin);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.error("OPENAI_API_KEY not configured.");
      return json({ error: "Email generation is not configured." }, 503, origin);
    }

    const features = (biz.websiteFeatures as WebFeatures) ?? unreachableFeatures();
    const gbpScore = typeof biz.gbpScore === "number" ? biz.gbpScore : 5;
    const overrides = (body.assumptions ?? {}) as Partial<typeof DEFAULT_ASSUMPTIONS>;
    const assumptions = { ...DEFAULT_ASSUMPTIONS, ...overrides };
    // Revenue math is still computed and returned for reference, but it is
    // deliberately NOT fed into the email — the email stays warm and number-free.
    const math = revenueMath(features, gbpScore, assumptions);

    const gbpBullets = Array.isArray(biz.gbpBullets) ? biz.gbpBullets as string[] : [];
    const webBullets = Array.isArray(biz.websiteBullets) ? biz.websiteBullets as string[] : [];

    // Real stats from the clicked business — used to make the email specific.
    const rating = typeof biz.rating === "number" ? biz.rating : null;
    const reviewCount = typeof biz.reviewCount === "number" ? biz.reviewCount : 0;
    const category = typeof biz.category === "string" && biz.category.trim() ? biz.category.trim() : "";
    const industry = category || "local service";
    const goodRating = rating != null && rating >= 4.0;

    const senderName = "Jacob";
    const senderCompany = "Elipsion AI";

    const prompt = [
      `You write warm, friendly, low-pressure cold outreach emails for ${senderCompany}, run by ${senderName}, a software engineer who helps local service businesses improve the systems around their websites and Google profiles.`,
      ``,
      `Write a short outreach email to "${name}". It must read like a genuinely helpful person reaching out — complimentary and humble, NOT a sales pitch and NEVER critical.`,
      ``,
      `Follow THIS template's tone, flow, and length closely (adapt the wording, don't copy verbatim):`,
      `---`,
      `Hi,`,
      ``,
      `I came across ${name} while researching ${industry} companies and noticed you've built a solid reputation with your customers.${goodRating ? ` A ${rating!.toFixed(1)}-star rating is something most businesses would love to have.` : ``}`,
      ``,
      `I'm a software engineer, and I spend a lot of time helping local service businesses improve the systems around their websites and Google profiles. While looking through your online presence, I noticed a few opportunities that could make it easier for customers to contact you and book services online.`,
      ``,
      `Nothing major—just a handful of improvements that could help convert more of the traffic you're already getting.`,
      ``,
      `I put together a quick analysis and would be happy to share it with you. Most of the fixes are straightforward and can usually be implemented quickly without a full website rebuild.`,
      ``,
      `If you'd like me to send over the findings, just let me know.`,
      ``,
      `Thanks,`,
      `${senderName}`,
      `${senderCompany}`,
      `---`,
      ``,
      `Real details about THIS business:`,
      rating != null
        ? `- Google rating: ${rating.toFixed(1)} stars from ${reviewCount} review(s)`
        : `- No Google rating yet`,
      category ? `- Category: ${category}` : ``,
      ``,
      `Private context (areas you found that COULD be improved — for YOUR understanding only):`,
      ...gbpBullets.map((b) => `- ${b}`),
      ...webBullets.map((b) => `- ${b}`),
      ``,
      `STRICT rules:`,
      `- Open with a sincere, specific compliment. ${goodRating
        ? `Their rating is strong (${rating!.toFixed(1)}★) — mention it warmly like the template.`
        : `Their rating is weak or missing — do NOT mention the rating number at all; instead compliment their experience, longevity, or reputation generally.`}`,
      `- Keep any mention of improvements VAGUE and positive ("a few opportunities", "a handful of improvements"). NEVER list the specific problems above, never use bullet points, never sound critical or alarmed.`,
      `- Do NOT include ANY numbers, dollar amounts, percentages, or statistics other than the star rating in the opening.`,
      `- Use the private context only to softly steer toward 1–2 themes (e.g. "easier to contact you", "book online") — never to call out flaws.`,
      `- Offer to share a quick analysis / the findings, and reassure that fixes are straightforward and usually don't need a full website rebuild.`,
      `- End with a soft, no-pressure ask like "if you'd like me to send over the findings, just let me know."`,
      `- Under ~170 words. Plain text. Sign exactly as "${senderName}" then "${senderCompany}" on the next line.`,
      `- Start with a short, friendly subject line as "Subject: ..." (low-key, not salesy — e.g. "A quick note about ${name}'s online presence").`,
      `- Output ONLY the email.`,
    ].join("\n");

    try {
      const aiRes = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      if (!aiRes.ok) {
        const detail = await aiRes.text();
        console.error("OpenAI error:", aiRes.status, detail);
        return json({ error: "Email generation failed." }, 502, origin);
      }
      const data = await aiRes.json();
      const email = data?.choices?.[0]?.message?.content ?? "";
      return json({ email, math }, 200, origin);
    } catch (e) {
      console.error("OpenAI fetch failed:", e);
      return json({ error: "Email generation failed (network)." }, 502, origin);
    }
  }

  return json({ error: "Unknown action." }, 400, origin);
});
