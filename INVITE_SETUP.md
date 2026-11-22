# Invite Hugh Feature - Setup Guide

This document explains how "Invite Hugh" form submissions are stored and how email alerts are sent.

## Overview

When someone submits the invite form at `/invite`, the Pages Function `functions/api/invite.js`:
1. Saves the submission to the D1 database (source of truth)
2. Returns `{ok:true}`; the visitor's browser then sends an email alert to `bro.roth@hughroth.com` through [FormSubmit](https://formsubmit.co)
3. Optionally posts to a webhook if `INVITE_NOTIFY_WEBHOOK` is set

Email failures never affect the form submission - the D1 database is authoritative.

## Email Alerts (FormSubmit)

No Cloudflare email setup is needed. **Do not enable Email Routing or change MX records** - hughroth.com mail is handled by Google Workspace.

After `/api/invite` saves the request, the visitor's browser (`scripts/invite-form.js`) POSTs
JSON to `https://formsubmit.co/ajax/bro.roth@hughroth.com`. It is sent from the browser, not the
Pages Function, because FormSubmit answers server-side calls from Cloudflare's shared IPs with
HTTP 429 (rate limit). FormSubmit is already activated for this address (the old contact form
used it), so no confirmation step is needed.

Optional environment variables:

| Variable | Purpose |
|----------|---------|
| `INVITE_FORMSUBMIT_URL` | If set, the Pages Function also POSTs the alert server-side to this URL (off by default) |
| `INVITE_NOTIFY_WEBHOOK` | Extra webhook that receives the submission as JSON |

## Database Initialization

After deploying, initialize the database to create the `invite_requests` table:

```bash
curl "https://hughroth.com/api/init-db?token=YOUR_STATS_TOKEN"
```

This creates both the `clicks` table and the `invite_requests` table.

## Viewing Submissions

Retrieve recent invite requests via the protected API:

```bash
curl "https://hughroth.com/api/invites?token=YOUR_STATS_TOKEN"
```

Optional query parameters:
- `limit` - Number of records (default: 50, max: 200)
- `offset` - Pagination offset (default: 0)

## Email Format

Each submission triggers a FormSubmit email (table template) to `bro.roth@hughroth.com`:
- **Subject**: `New Invite Hugh request: <reason> from <name>`
- **From**: FormSubmit `<submissions@formsubmit.co>`
- **Reply-To**: The submitter's email address
- **Fields**: Name, Email, Phone, Reason, Details, Page, Submitted (ISO timestamp)

## Optional Webhook

If `INVITE_NOTIFY_WEBHOOK` is set, the system also POSTs JSON to that URL:

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "reason": "Ministry Presentation",
  "details": "We'd like you to visit our church next month.",
  "page": "invite",
  "timestamp": "2026-11-22T06:15:00.000Z"
}
```

This is fire-and-forget and does not affect form submission success.

## Troubleshooting

### Emails not arriving

1. Check the spam folder for mail from `submissions@formsubmit.co`
2. In the browser dev tools Network tab, check the POST to `formsubmit.co/ajax/...` after submitting
3. Submissions are still saved - view them with `/api/invites?token=...`

### Database errors

1. Ensure the D1 database binding `DB` is configured
2. Run the init-db endpoint to create tables
3. Check function logs for SQL errors

### Form submission fails

1. Check browser console for fetch errors
2. Verify the Pages deployment includes the latest functions
3. Check CORS headers if testing from a different origin
