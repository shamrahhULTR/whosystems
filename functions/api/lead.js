/**
 * Whosystems lead intake - Cloudflare Pages Function at POST /api/lead.
 *
 * Stores the submission in Supabase first, then sends an optional email
 * alert to LEAD_ALERT_TO, a branded confirmation to the lead when email is
 * present, then forwards to the CRM. The visitor gets a success response
 * once the row is stored. A CRM or email failure does not fail capture.
 *
 * Set these in the Cloudflare Pages project (Production). Never commit them.
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY     required for alert and confirmation mail
 *   LEAD_ALERT_TO      alert recipient(s); comma-separated for dual delivery
 *                      e.g. rj@whosystem.com,reakwonjones@outlook.com
 *                      Default when unset: rj@whosystem.com
 *   LEAD_ALERT_FROM    From for the internal alert to RJ
 *                      Default: WhoSystems Leads <leads@alerts.whosystem.com>
 *   LEAD_CONFIRM_FROM  optional From for the confirmation to the lead; must be
 *                      on a Resend-verified domain (whosystem.com or
 *                      alerts.whosystem.com). Reply-To is always rj@whosystem.com.
 *                      Default: RJ Jones <rj@whosystem.com>
 *
 * Both emails are branded HTML with a plain-text alternative. Logo is served
 * from /assets/brand/whosystems-lockup@3x.png on whosystem.com.
 *   GHL_PIT            optional CRM token
 *   GHL_LOCATION_ID    optional CRM location
 *   GHL_WEBHOOK_URL    optional CRM webhook, used only when GHL_PIT is unset
 *
 * SMS consent (A2P 10DLC, Oct 22 2026): the forms send sms_consent_care and
 * sms_consent_marketing booleans. Checked boxes become GHL tags
 * sms-consent-care / sms-consent-marketing (added with POST /contacts/{id}/tags,
 * so existing tags are never replaced) plus a consent note with time, page,
 * IP and wording version. Unchecked boxes add nothing. Supabase row unchanged.
 */

const CRM_API = "https://services.leadconnectorhq.com";
const CRM_VERSION = "2021-07-28";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function clean(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function blankToNull(v) {
  return v ? v : null;
}

async function drain(res) {
  try {
    await res.text();
  } catch {
    /* ignore unread bodies */
  }
}

function leadsEndpoint(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const path = url.pathname.replace(/\/+$/, "");
  if (!path) url.pathname = "/rest/v1/leads";
  else if (path.endsWith("/rest/v1/leads")) url.pathname = path;
  else if (path.endsWith("/rest/v1")) url.pathname = path + "/leads";
  else url.pathname = path + "/rest/v1/leads";
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function saveLead(env, lead) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const endpoint = leadsEndpoint(env.SUPABASE_URL);
  if (!endpoint) {
    console.error("supabase_url_invalid");
    return false;
  }
  const row = {
    email: blankToNull(lead.email),
    name: blankToNull(lead.name),
    phone: blankToNull(lead.phone),
    company: blankToNull(lead.company),
    message: blankToNull(lead.message),
    source: lead.source || "website",
    page: blankToNull(lead.page),
    utm_source: blankToNull(lead.utm_source),
    utm_medium: blankToNull(lead.utm_medium),
    utm_campaign: blankToNull(lead.utm_campaign),
    utm_term: blankToNull(lead.utm_term),
    utm_content: blankToNull(lead.utm_content),
  };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      await drain(res);
      console.error("supabase_insert_failed", res.status);
      return false;
    }
    await drain(res);
    return true;
  } catch (e) {
    console.error("supabase_insert_error", e && e.name ? e.name : "error");
    return false;
  }
}

function alertRecipients(raw) {
  const value = typeof raw === "string" && raw.trim() ? raw : "rj@whosystem.com";
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
}

/* ------------------------------------------------------------------
 * Branded lead emails (Oct 22 2026). HTML + plain-text alternative.
 * Brand: Ink #0C0E0D, Paper #F5F5F3, Green #9BE15D (sparingly),
 * Green deep #5CA92E on light. Real logo hosted on whosystem.com.
 * ------------------------------------------------------------------ */

const SITE_URL = "https://whosystem.com";
const LOGO_URL = SITE_URL + "/assets/brand/whosystems-lockup@3x.png";
// Booking link already used by the site (assets/js/main.js CAL_URL).
const BOOK_URL = "https://cal.com/rjonesshamrahh/15min";
const PHONE_DISPLAY = "(757) 705-5468";
const PHONE_TEL = "+17577055468";
const RJ_EMAIL = "rj@whosystem.com";
const LEGAL_LINE = "MAMIM Holdings LLC dba WhoSystems";
const ADDRESS_LINE = "900 Commonwealth Pl, Suite 200, Virginia Beach, VA 23464";
const FONT = "'Instrument Sans',Helvetica,Arial,sans-serif";

function alertFrom(env) {
  return env.LEAD_ALERT_FROM || "WhoSystems Leads <leads@alerts.whosystem.com>";
}

// Confirmation goes out from a real person on the verified root domain.
// Override with LEAD_CONFIRM_FROM (must be on a Resend-verified domain).
function confirmFrom(env) {
  return env.LEAD_CONFIRM_FROM || "RJ Jones <rj@whosystem.com>";
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function oneLine(s, max) {
  return String(s || "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max || 120);
}

// "rj" / "Rj" -> "RJ", "mary-kate" -> "Mary-Kate", "o'neil" -> "O'Neil",
// "r.j." -> "R.J.". Deliberate mixed case such as "DeShawn" is kept.
export function properFirstName(raw) {
  const token = String(raw || "").trim().split(/\s+/)[0] || "";
  const word = token.replace(/^[^A-Za-z\u00C0-\u024F]+|[^A-Za-z\u00C0-\u024F.]+$/g, "");
  if (!word) return "";
  const lower = word.toLowerCase();
  if (/^([a-z]\.)+[a-z]?\.?$/.test(lower)) return word.toUpperCase();
  const isTitle = word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase();
  const normal = word === lower || word === word.toUpperCase() || isTitle;
  if (!normal) return word;
  const letters = lower.replace(/[^a-z\u00E0-\u024F]/g, "");
  if (letters.length >= 2 && letters.length <= 3 && !/[aeiouy\u00E0-\u00FF]/.test(letters)) return word.toUpperCase();
  return lower.replace(/(^|[-'\u2019])([a-z\u00E0-\u00FF])/g, (m, p, c) => p + c.toUpperCase());
}

function shell({ title, preheader, body, footer, logoUrl }) {
  return `<!doctype html><html lang="en" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%}
@media (max-width:620px){.wscard{padding:28px 20px!important}.wsouter{padding:0 10px!important}.wsh1{font-size:24px!important}.wsbtn a{display:block!important}}
@media (prefers-color-scheme:dark){
 .wsbg{background:#0C0E0D!important}.wscard{background:#161917!important;border-color:#262A27!important}
 .wstext{color:#F5F5F3!important}.wsmute{color:#A7ACA8!important}.wsbox{background:#1F2320!important;border-left-color:#9BE15D!important}
 .wslink{color:#9BE15D!important;text-decoration-color:#9BE15D!important}.wsfoot,.wsfoot a{color:#8C918D!important}.wsfoothd{color:#F5F5F3!important}
 .wslogo{background:#F5F5F3!important}.wsbtn td{background:#9BE15D!important}.wsbtn a{color:#0C0E0D!important;background:#9BE15D!important}
}
[data-ogsc] .wstext{color:#F5F5F3!important}[data-ogsc] .wslink{color:#9BE15D!important}
</style></head>
<body class="wsbg" style="margin:0;padding:0;background:#F5F5F3">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(preheader)}&#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>
<table role="presentation" class="wsbg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F5F3" style="background:#F5F5F3"><tr><td align="center" class="wsouter" style="padding:0 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td style="padding:28px 0 16px" align="left"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="wslogo" bgcolor="#F5F5F3" style="background:#F5F5F3;padding:6px 8px;border-radius:10px"><a href="${SITE_URL}" style="text-decoration:none"><img src="${esc(logoUrl || LOGO_URL)}" width="167" height="36" alt="WhoSystems" style="display:block;border:0;outline:none;width:167px;height:36px"></a></td></tr></table></td></tr>
<tr><td height="3" bgcolor="#9BE15D" style="height:3px;line-height:3px;font-size:0;background:#9BE15D;border-radius:3px 3px 0 0">&nbsp;</td></tr>
<tr><td class="wscard" bgcolor="#FFFFFF" style="background:#FFFFFF;padding:34px 38px;border:1px solid #E3E4E1;border-top:0;border-radius:0 0 14px 14px">
${body}
</td></tr>
<tr><td class="wsfoot" style="padding:22px 6px 40px;font-family:${FONT};font-size:12px;line-height:1.6;color:#5D625F" align="left">
${footer}
</td></tr>
</table></td></tr></table></body></html>`;
}

const P = (html, extra) =>
  `<p class="wstext" style="margin:0 0 14px;font-family:${FONT};font-size:17px;line-height:1.55;color:#0C0E0D${extra || ""}">${html}</p>`;
const LINK = "color:#0C0E0D;text-decoration:underline;text-decoration-color:#5CA92E;text-decoration-thickness:2px";

function button(href, label) {
  return `<table role="presentation" class="wsbtn" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 16px"><tr><td bgcolor="#0C0E0D" style="background:#0C0E0D;border-radius:999px"><a href="${esc(href)}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:17px;font-weight:700;line-height:1.2;color:#F5F5F3;text-decoration:none;border-radius:999px;background:#0C0E0D">${esc(label)}</a></td></tr></table>`;
}

export function buildConfirmationEmail(lead, opts) {
  const o = opts || {};
  const first = properFirstName(lead.name);
  const subject = (o.subjectPrefix || "") + (first ? first + ", got it. Here's what happens next" : "Got it. Here's what happens next");
  const preheader = "I review it personally and reach out within 1 business day.";
  const telHref = "tel:" + PHONE_TEL;

  const recap = [
    ["Name", oneLine(lead.name, 120)],
    ["Email", oneLine(lead.email, 200)],
    ["Phone", oneLine(lead.phone, 40)],
    ["Note", oneLine(lead.message, 300)],
  ].filter(([, v]) => v);

  const body = [
    P(esc(first ? "Hey " + first + "," : "Hey there,")),
    `<p class="wstext wsh1" style="margin:0 0 16px;font-family:${FONT};font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#0C0E0D">Got your request. I'm on it.</p>`,
    P("Here's what happens next:"),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px"><tr><td class="wsbox" style="border-left:3px solid #5CA92E;background:#F5F5F3;padding:14px 16px;border-radius:0 10px 10px 0">
<p class="wstext" style="margin:0 0 6px;font-family:${FONT};font-size:16px;line-height:1.5;color:#0C0E0D"><b>1.</b> I personally review what you sent.</p>
<p class="wstext" style="margin:0;font-family:${FONT};font-size:16px;line-height:1.5;color:#0C0E0D"><b>2.</b> I reach out within 1 business day.</p>
</td></tr></table>`,
    P("<b>Rather not wait?</b> Grab a time on my calendar.", ";margin-bottom:12px"),
    button(BOOK_URL, "Book a 15-minute call"),
    P(`Or call or text me: <a class="wslink" href="${telHref}" style="${LINK};white-space:nowrap;font-weight:700">${PHONE_DISPLAY}</a>`),
    `<p class="wsmute" style="margin:18px 0 18px;font-family:${FONT};font-size:15px;line-height:1.55;color:#5D625F"><b class="wstext" style="color:#0C0E0D">Why me?</b> I'm a salesperson first, not a software company. I've sold in roofing, cars, finance and telecom, and trained sales teams and managers across the country. I build what I'd want running my own pipeline.</p>`,
    P("Talk soon,<br><b>RJ Jones</b><br>WhoSystems"),
    recap.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;border-top:1px solid #E3E4E1"><tr><td style="padding:14px 0 0">
<p class="wsmute" style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.5;letter-spacing:.06em;text-transform:uppercase;color:#5D625F">What you sent</p>
${recap.map(([k, v]) => `<p class="wsmute" style="margin:0 0 2px;font-family:${FONT};font-size:14px;line-height:1.5;color:#5D625F"><b>${esc(k)}:</b> ${esc(v)}</p>`).join("\n")}
</td></tr></table>`
      : "",
  ].join("\n");

  const footer = `<p class="wsfoothd" style="margin:0;font-weight:700;font-size:13px;color:#0C0E0D">RJ Jones, WhoSystems</p>
<p class="wsfoot" style="margin:2px 0 0;color:#5D625F">${LEGAL_LINE}<br>${ADDRESS_LINE}<br><a href="${telHref}" style="color:#5D625F;text-decoration:none">${PHONE_DISPLAY}</a> &middot; <a href="${SITE_URL}" style="color:#5D625F;text-decoration:none">whosystem.com</a></p>
<p class="wsfoot" style="margin:12px 0 0;color:#5D625F">You're getting this because you asked for a call at whosystem.com. Questions? Just reply.</p>`;

  const text = [
    first ? "Hey " + first + "," : "Hey there,",
    "",
    "Got your request. I'm on it.",
    "",
    "Here's what happens next:",
    "1. I personally review what you sent.",
    "2. I reach out within 1 business day.",
    "",
    "Rather not wait? Grab a time on my calendar:",
    BOOK_URL,
    "",
    "Or call or text me: " + PHONE_DISPLAY,
    "",
    "Why me? I'm a salesperson first, not a software company. I've sold in roofing, cars, finance and telecom, and trained sales teams and managers across the country. I build what I'd want running my own pipeline.",
    "",
    "Talk soon,",
    "RJ Jones",
    "WhoSystems",
    "",
    recap.length ? "What you sent:\n" + recap.map(([k, v]) => k + ": " + v).join("\n") + "\n" : "",
    "--",
    LEGAL_LINE,
    ADDRESS_LINE,
    PHONE_DISPLAY + " | whosystem.com",
    "You're getting this because you asked for a call at whosystem.com. Questions? Just reply.",
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");

  const html = shell({ title: subject, preheader, body, footer, logoUrl: o.logoUrl });
  return { subject, html, text };
}

const ALERT_LABELS = [
  ["name", "Name"], ["email", "Email"], ["phone", "Phone"], ["company", "Company"],
  ["message", "Message"], ["source", "Form"], ["page", "Page"],
  ["utm_source", "utm_source"], ["utm_medium", "utm_medium"], ["utm_campaign", "utm_campaign"],
  ["utm_term", "utm_term"], ["utm_content", "utm_content"],
];

export function buildAlertEmail(lead, opts) {
  const o = opts || {};
  const who = oneLine(lead.name || lead.email || lead.phone || "website", 120);
  const source = oneLine(lead.source || "website", 60);
  const first = properFirstName(lead.name) || "them";
  const subject = (o.subjectPrefix || "") + "New lead: " + who + " (" + source + ")";
  const rows = ALERT_LABELS.filter(([k]) => lead[k]).map(([k, label]) => [label, String(lead[k])]);
  const sms = [];
  if (lead.sms_consent_care) sms.push("non-marketing");
  if (lead.sms_consent_marketing) sms.push("marketing");
  rows.push(["SMS consent", sms.length ? sms.join(" + ") : "none"]);

  const fmt = (label, v) => {
    if (label === "Email") return `<a class="wslink" href="mailto:${esc(v)}" style="${LINK}">${esc(v)}</a>`;
    if (label === "Phone") return `<a class="wslink" href="tel:${esc(v.replace(/[^\d+]/g, ""))}" style="${LINK};white-space:nowrap">${esc(v)}</a>`;
    if (label === "Page" && /^https:\/\//.test(v)) return `<a class="wslink" href="${esc(v)}" style="${LINK};word-break:break-all">${esc(v)}</a>`;
    return esc(v).replace(/\n/g, "<br>");
  };
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td class="wsmute" valign="top" style="padding:8px 12px 8px 0;border-bottom:1px solid #E3E4E1;font-family:${FONT};font-size:13px;line-height:1.4;color:#5D625F;white-space:nowrap;width:110px">${esc(k)}</td><td class="wstext" style="padding:8px 0;border-bottom:1px solid #E3E4E1;font-family:${FONT};font-size:15px;line-height:1.45;color:#0C0E0D;word-break:break-word">${fmt(k, v)}</td></tr>`).join("\n")}
</table>`;

  const actions = [];
  if (lead.phone) actions.push(button("tel:" + lead.phone.replace(/[^\d+]/g, ""), "Call " + first + " now"));
  else if (lead.email) actions.push(button("mailto:" + lead.email, "Email " + first));

  const body = [
    `<p class="wsmute" style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.5;letter-spacing:.08em;text-transform:uppercase;color:#5CA92E;font-weight:700">New lead &middot; ${esc(source)}</p>`,
    `<p class="wstext wsh1" style="margin:0 0 6px;font-family:${FONT};font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:#0C0E0D">${esc(who)}</p>`,
    P((lead.email ? "They got your confirmation email. " : "") + "Promise made: you reach out within 1 business day. Fastest reply wins.", ";font-size:15px;color:#5D625F"),
    actions.join(""),
    table,
    lead.email ? P("Reply to this email to answer them directly.", ";font-size:14px;color:#5D625F") : "",
  ].join("\n");

  const footer = `<p class="wsfoot" style="margin:0;color:#5D625F">Internal lead alert from whosystem.com &middot; ${LEGAL_LINE}</p>`;
  const text = [
    "NEW LEAD (" + source + "): " + who,
    "",
    ...rows.map(([k, v]) => k + ": " + v),
    "",
    "Promise made in their confirmation: you reach out within 1 business day.",
    lead.email ? "Reply to this email to answer them directly." : "",
  ].join("\n");
  const html = shell({ title: subject, preheader: "New lead: " + who + " (" + source + ")", body, footer, logoUrl: o.logoUrl });
  return { subject, html, text };
}

function validEmail(e) {
  return /^[^\s@<>,"]+@[^\s@<>,"]+\.[^\s@<>,"]+$/.test(String(e || ""));
}

async function resendSend(env, payload, tag) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: "Bearer " + env.RESEND_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(tag + "_failed", res.status);
    await drain(res);
  } catch (e) {
    console.error(tag + "_error", e && e.name ? e.name : "error");
  }
}

async function sendAlert(env, lead) {
  const to = alertRecipients(env.LEAD_ALERT_TO);
  if (!env.RESEND_API_KEY || !to.length) return;
  const { subject, html, text } = buildAlertEmail(lead);
  const payload = { from: alertFrom(env), to, subject, html, text };
  if (validEmail(lead.email)) payload.reply_to = lead.email;
  await resendSend(env, payload, "lead_alert");
}

async function sendConfirmation(env, lead) {
  if (!env.RESEND_API_KEY || !validEmail(lead.email)) return;
  const { subject, html, text } = buildConfirmationEmail(lead);
  await resendSend(
    env,
    { from: confirmFrom(env), to: [lead.email], reply_to: RJ_EMAIL, subject, html, text },
    "lead_confirm",
  );
}

function consentTags(lead) {
  const tags = [];
  if (lead.sms_consent_care) tags.push("sms-consent-care");
  if (lead.sms_consent_marketing) tags.push("sms-consent-marketing");
  return tags;
}

function consentNote(lead) {
  const parts = [];
  if (lead.sms_consent_care) parts.push("non-marketing (inquiry, appointments, support)");
  if (lead.sms_consent_marketing) parts.push("marketing (offers, discounts, service updates)");
  if (!parts.length) return "";
  return [
    "SMS consent given via web form checkbox: " + parts.join(" + "),
    "Time (UTC): " + lead.consent_at,
    "Page: " + (lead.page || "unknown"),
    "Form source: " + lead.source,
    "IP: " + (lead.consent_ip || "unknown"),
    "Wording version: " + (lead.consent_version || "unknown"),
  ].join("\n");
}

function attributionNote(lead) {
  const lines = [];
  if (lead.message) lines.push("[" + lead.source + "] " + lead.message);
  if (lead.company) lines.push("Company: " + lead.company);
  if (lead.page) lines.push("Page: " + lead.page);
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
    if (lead[k]) lines.push(k + ": " + lead[k]);
  });
  return lines.join("\n").slice(0, 4000);
}

async function forwardToCrm(env, lead) {
  if (env.GHL_PIT && env.GHL_LOCATION_ID) {
    const headers = {
      "content-type": "application/json",
      authorization: "Bearer " + env.GHL_PIT,
      version: CRM_VERSION,
    };
    const nameParts = lead.name.split(/\s+/).filter(Boolean);
    const upsertBody = {
      locationId: env.GHL_LOCATION_ID,
      source: "whosystem.com — " + lead.source,
      tags: ["website", lead.source],
    };
    if (lead.email) upsertBody.email = lead.email;
    if (lead.phone) upsertBody.phone = lead.phone;
    if (lead.company) upsertBody.companyName = lead.company;
    if (nameParts.length) {
      upsertBody.firstName = nameParts[0];
      if (nameParts.length > 1) upsertBody.lastName = nameParts.slice(1).join(" ");
    }

    const up = await fetch(CRM_API + "/contacts/upsert", {
      method: "POST",
      headers,
      body: JSON.stringify(upsertBody),
      signal: AbortSignal.timeout(8000),
    });
    if (!up.ok) {
      await drain(up);
      console.error("crm_upsert_failed", up.status);
      return false;
    }

    let contactId = null;
    try {
      const data = await up.json();
      contactId = data && data.contact && data.contact.id;
    } catch {
      contactId = null;
    }

    const note = attributionNote(lead);
    if (contactId && note) {
      try {
        const noteRes = await fetch(CRM_API + "/contacts/" + contactId + "/notes", {
          method: "POST",
          headers,
          body: JSON.stringify({ body: note }),
          signal: AbortSignal.timeout(8000),
        });
        if (!noteRes.ok) console.error("crm_note_failed", noteRes.status);
        await drain(noteRes);
      } catch (e) {
        console.error("crm_note_error", e && e.name ? e.name : "error");
      }
    }

    const cTags = consentTags(lead);
    if (contactId && cTags.length) {
      try {
        const tagRes = await fetch(CRM_API + "/contacts/" + contactId + "/tags", {
          method: "POST",
          headers,
          body: JSON.stringify({ tags: cTags }),
          signal: AbortSignal.timeout(8000),
        });
        if (!tagRes.ok) console.error("crm_consent_tags_failed", tagRes.status);
        await drain(tagRes);
      } catch (e) {
        console.error("crm_consent_tags_error", e && e.name ? e.name : "error");
      }
      const cNote = consentNote(lead);
      if (cNote) {
        try {
          const cRes = await fetch(CRM_API + "/contacts/" + contactId + "/notes", {
            method: "POST",
            headers,
            body: JSON.stringify({ body: cNote }),
            signal: AbortSignal.timeout(8000),
          });
          if (!cRes.ok) console.error("crm_consent_note_failed", cRes.status);
          await drain(cRes);
        } catch (e) {
          console.error("crm_consent_note_error", e && e.name ? e.name : "error");
        }
      }
    }
    return true;
  }

  if (env.GHL_WEBHOOK_URL) {
    const res = await fetch(env.GHL_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      await drain(res);
      console.error("crm_webhook_failed", res.status);
      return false;
    }
    await drain(res);
    return true;
  }

  return false;
}

export async function onRequestPost({ request, env }) {
  env = env || {};
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const lead = {
    name: clean(body.name, 120),
    email: clean(body.email, 200),
    phone: clean(body.phone, 40),
    message: clean(body.message, 4000),
    source: clean(body.source, 60) || "website",
    company: clean(body.company, 160),
    page: clean(body.page, 500),
    utm_source: clean(body.utm_source, 120),
    utm_medium: clean(body.utm_medium, 120),
    utm_campaign: clean(body.utm_campaign, 120),
    utm_term: clean(body.utm_term, 120),
    utm_content: clean(body.utm_content, 120),
    sms_consent_care: body.sms_consent_care === true,
    sms_consent_marketing: body.sms_consent_marketing === true,
  };
  if (lead.sms_consent_care || lead.sms_consent_marketing) {
    lead.consent_version = clean(body.consent_version, 40);
    lead.consent_at = new Date().toISOString();
    lead.consent_ip = clean(request.headers.get("cf-connecting-ip") || "", 64);
  }

  if (!lead.email && !lead.phone) {
    return json({ ok: false, error: "contact_required" }, 400);
  }

  const saved = await saveLead(env, lead);
  await sendAlert(env, lead);
  await sendConfirmation(env, lead);

  let forwarded = false;
  try {
    forwarded = await forwardToCrm(env, lead);
  } catch (e) {
    console.error("crm_forward_error", e && e.name ? e.name : "error");
    forwarded = false;
  }

  // Stored lead is a success even when the CRM forward fails.
  if (saved || forwarded) return json({ ok: true });

  const supabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  const crmConfigured = Boolean((env.GHL_PIT && env.GHL_LOCATION_ID) || env.GHL_WEBHOOK_URL);
  if (!supabaseConfigured && !crmConfigured) {
    return json({ ok: false, error: "not_configured" }, 503);
  }
  return json({ ok: false, error: "send_failed" }, 502);
}
