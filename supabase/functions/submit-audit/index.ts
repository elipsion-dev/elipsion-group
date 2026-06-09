const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.elipsiongroup.com",
  "https://elipsiongroup.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

type AuditRequest = {
  name?: unknown;
  business?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  gbp_url?: unknown;
  trade?: unknown;
  city?: unknown;
  help?: unknown;
  contact_method?: unknown;
  company_website?: unknown;
};

function allowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  return configured
    ? configured.split(",").map((origin) => origin.trim()).filter(Boolean)
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

function json(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin),
  });
}

function text(value: unknown, maxLength = 500): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function field(label: string, value: string): string {
  if (!value) return "";
  return `<tr>
    <td style="padding:8px 12px;color:#64748b;vertical-align:top;width:180px;">${escapeHtml(label)}</td>
    <td style="padding:8px 12px;color:#0f172a;">${escapeHtml(value).replaceAll("\n", "<br>")}</td>
  </tr>`;
}

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

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 20_000) {
    return json({ error: "Request is too large." }, 413, origin);
  }

  let body: AuditRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400, origin);
  }

  // Bots commonly fill fields hidden from human visitors. Return a normal
  // success response so they do not learn how the filter works.
  if (text(body.company_website, 200)) {
    return json({ ok: true }, 200, origin);
  }

  const submission = {
    name: text(body.name, 120),
    business: text(body.business, 160),
    phone: text(body.phone, 60),
    email: text(body.email, 254).toLowerCase(),
    website: text(body.website, 500),
    googleProfile: text(body.gbp_url, 500),
    trade: text(body.trade, 120),
    city: text(body.city, 160),
    help: text(body.help, 2_000),
    contactMethod: text(body.contact_method, 40),
  };

  if (
    !submission.name ||
    !submission.business ||
    !submission.phone ||
    !submission.email
  ) {
    return json({ error: "Please complete all required fields." }, 400, origin);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email)) {
    return json({ error: "Please enter a valid email address." }, 400, origin);
  }

  const apiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "ElipsionAI";
  const recipientEmail = Deno.env.get("LEAD_RECIPIENT_EMAIL");

  if (!apiKey || !senderEmail || !recipientEmail) {
    console.error("Missing Brevo or recipient configuration.");
    return json(
      { error: "The form is temporarily unavailable. Please call or email us." },
      503,
      origin,
    );
  }

  const rows = [
    field("Name", submission.name),
    field("Business", submission.business),
    field("Phone", submission.phone),
    field("Email", submission.email),
    field("Website", submission.website),
    field("Google profile", submission.googleProfile),
    field("Trade", submission.trade),
    field("City / service area", submission.city),
    field("Preferred contact", submission.contactMethod),
    field("What they need help with", submission.help),
  ].join("");

  const emailText = [
    "New website inquiry",
    "",
    `Name: ${submission.name}`,
    `Business: ${submission.business}`,
    `Phone: ${submission.phone}`,
    `Email: ${submission.email}`,
    submission.website ? `Website: ${submission.website}` : "",
    submission.googleProfile
      ? `Google profile: ${submission.googleProfile}`
      : "",
    submission.trade ? `Trade: ${submission.trade}` : "",
    submission.city ? `City / service area: ${submission.city}` : "",
    submission.contactMethod
      ? `Preferred contact: ${submission.contactMethod}`
      : "",
    submission.help ? `Message:\n${submission.help}` : "",
  ].filter(Boolean).join("\n");

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#0f172a;">
      <h1 style="font-size:24px;margin-bottom:8px;">New website inquiry</h1>
      <p style="margin-top:0;color:#475569;">
        A visitor submitted the ElipsionAI website form.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;">
        ${rows}
      </table>
    </div>`;

  try {
    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ name: "Jacob Briggs", email: recipientEmail }],
        replyTo: { name: submission.name, email: submission.email },
        subject: `New website inquiry - ${submission.business}`,
        htmlContent: emailHtml,
        textContent: emailText,
      }),
    });

    if (!brevoResponse.ok) {
      const details = await brevoResponse.text();
      console.error("Brevo rejected the message:", brevoResponse.status, details);
      return json(
        { error: "Your request could not be sent. Please call or email us." },
        502,
        origin,
      );
    }

    return json({ ok: true }, 200, origin);
  } catch (error) {
    console.error("Audit submission failed:", error);
    return json(
      { error: "Your request could not be sent. Please call or email us." },
      502,
      origin,
    );
  }
});
