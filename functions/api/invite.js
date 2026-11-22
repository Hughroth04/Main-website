const MAX_FIELD_LENGTH = 500;
const MAX_TOTAL_SIZE = 4000;
const VALID_REASONS = ['Ministry Presentation', 'Evangelism Training', 'Organize an Outreach', 'Other'];

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://hughroth.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, MAX_FIELD_LENGTH);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// The email alert is sent from the visitor's browser (scripts/invite-form.js):
// FormSubmit rate-limits (HTTP 429) server-side calls from Cloudflare's shared IPs.
// Optional server-side alert only if INVITE_FORMSUBMIT_URL is set.
async function sendEmailNotification(env, data) {
  if (!env.INVITE_FORMSUBMIT_URL) return;
  try {
    const res = await fetch(env.INVITE_FORMSUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://hughroth.com',
        Referer: 'https://hughroth.com/invite',
      },
      body: JSON.stringify({
        _subject: `New Invite Hugh request: ${data.reason} from ${data.name}`,
        _template: 'table',
        _captcha: 'false',
        _replyto: data.email,
        Name: data.name,
        Email: data.email,
        Phone: data.phone || '(not provided)',
        Reason: data.reason,
        Details: data.details || '(none)',
        Page: data.page,
        Submitted: new Date().toISOString(),
      }),
    });
    const text = await res.text();
    console.log('FormSubmit notification:', res.status, text.slice(0, 200));
  } catch (error) {
    console.error('Email notification failed (non-fatal):', error);
  }
}

async function sendWebhookNotification(env, data) {
  if (!env.INVITE_NOTIFY_WEBHOOK) return;

  try {
    await fetch(env.INVITE_NOTIFY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone || '(not provided)',
        reason: data.reason,
        details: data.details || '(none)',
        page: data.page,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Fire and forget - don't fail the submission
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body;
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const text = await request.text();
      if (text.length > MAX_TOTAL_SIZE) {
        return new Response(JSON.stringify({ error: 'Request too large' }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      body = JSON.parse(text);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported content type' }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (body.website) {
    return new Response(JSON.stringify({ error: 'Invalid submission' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const name = sanitize(body.name);
  const phone = sanitize(body.phone);
  const email = sanitize(body.email);
  const reason = sanitize(body.reason);
  const details = sanitize(body.details);
  const page = sanitize(body.page) || 'invite';

  if (!name) {
    return new Response(JSON.stringify({ error: 'Name is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Valid email is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!reason || !VALID_REASONS.includes(reason)) {
    return new Response(JSON.stringify({ error: 'Valid reason is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    await env.DB.prepare(`
      INSERT INTO invite_requests (name, phone, email, reason, details, page)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(name, phone, email, reason, details, page).run();

    const notifyData = { name, phone, email, reason, details, page };
    context.waitUntil(sendEmailNotification(env, notifyData));
    context.waitUntil(sendWebhookNotification(env, notifyData));

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Invite submission error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save submission' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
