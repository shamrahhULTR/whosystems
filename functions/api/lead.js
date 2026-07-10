/**
 * Whosystems lead intake — Cloudflare Pages Function at POST /api/lead.
 *
 * Pushes leads from the website (AI chat, forms, calculator) into the
 * GoHighLevel sub-account as contacts, with the conversation/message
 * attached as a note. Credentials live ONLY as Cloudflare secrets.
 *
 * Setup (one time, Cloudflare dashboard → Workers & Pages → whosystems →
 * Settings → Variables and Secrets, type "Secret", Production):
 *   GHL_PIT         = pit-...                (Private Integration Token, v2 API)
 *   GHL_LOCATION_ID = <sub-account location id>
 *   GHL_WEBHOOK_URL = https://...            (optional fallback: an Inbound
 *                                             Webhook trigger URL from a GHL
 *                                             workflow — used if GHL_PIT is unset)
 */

const GHL_API = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function clean(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const lead = {
    name: clean(body.name, 120),
    email: clean(body.email, 200),
    phone: clean(body.phone, 40),
    message: clean(body.message, 4000),
    source: clean(body.source, 60) || "website",
  };

  if (!lead.email && !lead.phone) {
    return json({ ok: false, error: "contact_required" }, 400);
  }

  // Preferred path: GHL v2 API with a Private Integration Token.
  if (env.GHL_PIT && env.GHL_LOCATION_ID) {
    try {
      const headers = {
        "content-type": "application/json",
        authorization: "Bearer " + env.GHL_PIT,
        version: GHL_VERSION,
      };

      const nameParts = lead.name.split(/\s+/).filter(Boolean);
      const upsertBody = {
        locationId: env.GHL_LOCATION_ID,
        source: "whosystem.com — " + lead.source,
        tags: ["website", lead.source],
      };
      if (lead.email) upsertBody.email = lead.email;
      if (lead.phone) upsertBody.phone = lead.phone;
      if (nameParts.length) {
        upsertBody.firstName = nameParts[0];
        if (nameParts.length > 1) upsertBody.lastName = nameParts.slice(1).join(" ");
      }

      const up = await fetch(GHL_API + "/contacts/upsert", {
        method: "POST",
        headers,
        body: JSON.stringify(upsertBody),
      });
      if (!up.ok) {
        const detail = await up.text().catch(() => "");
        return json({ ok: false, error: "ghl_upsert", status: up.status, detail: detail.slice(0, 300) }, 502);
      }
      const data = await up.json();
      const contactId = data && data.contact && data.contact.id;

      // Attach the message / chat transcript as a note on the contact.
      if (contactId && lead.message) {
        await fetch(GHL_API + "/contacts/" + contactId + "/notes", {
          method: "POST",
          headers,
          body: JSON.stringify({
            body: "[" + lead.source + "] " + lead.message,
          }),
        }).catch(() => {});
      }

      return json({ ok: true, id: contactId || null });
    } catch (e) {
      return json({ ok: false, error: "ghl_error" }, 502);
    }
  }

  // Fallback path: a GHL Inbound Webhook (workflow trigger) URL.
  if (env.GHL_WEBHOOK_URL) {
    try {
      await fetch(env.GHL_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lead),
      });
      return json({ ok: true });
    } catch {
      return json({ ok: false, error: "webhook_error" }, 502);
    }
  }

  return json({ ok: false, error: "not_configured" }, 503);
}
