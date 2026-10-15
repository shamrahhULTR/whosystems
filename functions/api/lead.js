/**
 * Whosystems lead intake - Cloudflare Pages Function at POST /api/lead.
 *
 * Stores the submission in Supabase first, then sends an optional email
 * alert to LEAD_ALERT_TO, a short confirmation to the lead when email is
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
 *   LEAD_ALERT_FROM    From for alert and confirmation; must stay on
 *                      alerts.whosystem.com
 *                      Default: WhoSystems <leads@alerts.whosystem.com>
 *   GHL_PIT            optional CRM token
 *   GHL_LOCATION_ID    optional CRM location
 *   GHL_WEBHOOK_URL    optional CRM webhook, used only when GHL_PIT is unset
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

function mailFrom(env) {
  return env.LEAD_ALERT_FROM || "WhoSystems <leads@alerts.whosystem.com>";
}

async function sendAlert(env, lead) {
  const to = alertRecipients(env.LEAD_ALERT_TO);
  if (!env.RESEND_API_KEY || !to.length) return;
  const who = (lead.name || lead.email || lead.phone || "website").replace(/[\r\n]+/g, " ").slice(0, 120);
  const source = (lead.source || "website").replace(/[\r\n]+/g, " ").slice(0, 60);
  const text = Object.entries(lead)
    .filter(([, v]) => v)
    .map(([k, v]) => k + ": " + v)
    .join("\n");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: "Bearer " + env.RESEND_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(env),
        to,
        subject: "New lead: " + who + " (" + source + ")",
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("lead_alert_failed", res.status);
    await drain(res);
  } catch (e) {
    console.error("lead_alert_error", e && e.name ? e.name : "error");
  }
}

async function sendConfirmation(env, lead) {
  if (!env.RESEND_API_KEY || !lead.email) return;
  const first = (lead.name || "").split(/\s+/).filter(Boolean)[0] || "";
  const greeting = first ? "Hi " + first + "," : "Hi,";
  const text = [
    greeting,
    "",
    "Thanks for reaching out to WhoSystems. We got your info and someone from our team will follow up shortly.",
    "",
    "If you want to look around while you wait: https://whosystem.com",
    "",
    "WhoSystems",
  ].join("\n");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: "Bearer " + env.RESEND_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(env),
        to: [lead.email],
        reply_to: "rj@whosystem.com",
        subject: "Got your info - WhoSystems",
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("lead_confirm_failed", res.status);
    await drain(res);
  } catch (e) {
    console.error("lead_confirm_error", e && e.name ? e.name : "error");
  }
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
  };

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
