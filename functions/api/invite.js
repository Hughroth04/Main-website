import { EmailMessage } from 'cloudflare:email';

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

function encodeRfc2047(str) {
  if (/^[\x20-\x7E]*$/.test(str)) return str;
  return '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(str))) + '?=';
}

function buildRawEmail(from, to, replyTo, subject, bodyText) {
  const boundary = '----=_Part_' + Date.now().toString(36);
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeRfc2047(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    bodyText,
  ];
  return lines.join('\r\n');
}

async function sendEmailNotification(env, data) {
  if (!env.INVITE_EMAIL || !env.INVITE_NOTIFY_TO || !env.INVITE_NOTIFY_FROM) {
    console.log('Email notification skipped: missing INVITE_EMAIL binding or env vars');
    return;
  }

  try {
    const timestamp = new Date().toISOString();
    const subject = `New Invite Hugh request: ${data.reason} from ${data.name}`;

    const bodyText = `New invitation request received

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || '(not provided)'}
Reason: ${data.reason}
Details: ${data.details || '(none)'}
Page: ${data.page}
Submitted: ${timestamp}

---
This email was sent automatically from hughroth.com.
Reply directly to this email to respond to ${data.name}.`;

    const fromHeader = `Invite Hugh <${env.INVITE_NOTIFY_FROM}>`;
    const rawEmail = buildRawEmail(
      fromHeader,
      env.INVITE_NOTIFY_TO,
      data.email,
      subject,
      bodyText
    );

    const message = new EmailMessage(
      env.INVITE_NOTIFY_FROM,
      env.INVITE_NOTIFY_TO,
      new TextEncoder().encode(rawEmail)
    );

    await env.INVITE_EMAIL.send(message);
    console.log('Email notification sent successfully');
  } catch (error) {
    console.error('Email notification failed (non-fatal):', error);
  }
}

async function sendWebhookNotification(env, data) {
  if (!env.INVITE_NOTIFY_WEBHOOK) return;

  try {
    fetch(env.INVITE_NOTIFY_WEBHOOK, {
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
    }).catch(() => {});
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

    sendEmailNotification(env, { name, phone, email, reason, details, page });
    sendWebhookNotification(env, { name, phone, email, reason, details, page });

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
