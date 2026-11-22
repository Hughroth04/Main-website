# Invite Hugh Feature - Setup Guide

This document explains how to configure email notifications for the "Invite Hugh" form submissions.

## Overview

When someone submits the invite form at `/invite`, the system:
1. Saves the submission to the D1 database (source of truth)
2. Sends an email notification to Hugh (fire-and-forget, non-blocking)
3. Optionally posts to a webhook (fire-and-forget)

Email failures do not affect the form submission - the D1 database is authoritative.

## Required Cloudflare Setup

### 1. Enable Email Routing for Your Domain

1. Go to **Cloudflare Dashboard** → **hughroth.com** → **Email** → **Email Routing**
2. Enable Email Routing if not already enabled
3. This allows Cloudflare to handle email for your domain

### 2. Add Verified Sender Address

The sender address (`INVITE_NOTIFY_FROM`) must be verified:

1. Go to **Email Routing** → **Email Workers** → **Addresses**
2. Under **Email addresses**, click **Create address**
3. Add `invites@hughroth.com` (or your preferred sender)
4. Verify ownership if prompted

### 3. Add Verified Destination Address

The recipient address (`INVITE_NOTIFY_TO`) must be a verified destination:

1. In **Email Routing** → **Destination addresses**
2. Click **Add destination address**
3. Add `bro.roth@hughroth.com`
4. Complete the email verification process (check inbox for verification email)

### 4. Configure the Send Email Binding

For **Cloudflare Pages**:

1. Go to **Workers & Pages** → **hughroth-com** → **Settings** → **Bindings**
2. Click **Add binding** → **Send Email**
3. Set:
   - **Variable name**: `INVITE_EMAIL`
   - **Destination address**: Select `bro.roth@hughroth.com` (or leave "Any email" if using env var)

### 5. Set Environment Variables

In **Workers & Pages** → **hughroth-com** → **Settings** → **Environment variables**:

| Variable | Value | Required |
|----------|-------|----------|
| `INVITE_NOTIFY_FROM` | `invites@hughroth.com` | Yes |
| `INVITE_NOTIFY_TO` | `bro.roth@hughroth.com` | Yes |
| `INVITE_NOTIFY_WEBHOOK` | (your webhook URL) | No |

Set these for both **Production** and **Preview** environments as needed.

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

Each submission triggers an email with:
- **Subject**: `New Invite Hugh request: <reason> from <name>`
- **From**: `Invite Hugh <invites@hughroth.com>`
- **To**: `bro.roth@hughroth.com`
- **Reply-To**: The submitter's email address
- **Body**: Plain text with all form fields and timestamp

Example email body:
```
New invitation request received

Name: John Smith
Email: john@example.com
Phone: (555) 123-4567
Reason: Ministry Presentation
Details: We'd like you to visit our church next month.
Page: invite
Submitted: 2026-11-22T06:15:00.000Z

---
This email was sent automatically from hughroth.com.
Reply directly to this email to respond to John Smith.
```

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

1. Check **Email Routing** → **Activity log** for delivery status
2. Verify both sender and destination addresses are verified
3. Check the Pages function logs for errors
4. Ensure the `INVITE_EMAIL` binding is correctly configured

### Database errors

1. Ensure the D1 database binding `DB` is configured
2. Run the init-db endpoint to create tables
3. Check function logs for SQL errors

### Form submission fails

1. Check browser console for fetch errors
2. Verify the Pages deployment includes the latest functions
3. Check CORS headers if testing from a different origin
