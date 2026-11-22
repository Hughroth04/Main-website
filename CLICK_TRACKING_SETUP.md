# Click Tracking Setup Guide

This document explains how to complete the setup for anonymous click tracking on hughroth.com.

## What's Being Tracked

The tracking script counts clicks on these links (anonymously - no cookies, no IP storage, no personal data):

1. **give** - "Giving" nav link and "Give Now" buttons (alvinmbc.com/give/obp)
2. **newsletter_signup** - Mailchimp newsletter form submissions
3. **newsletter_pdf** - Newsletter PDF view links (mailchi.mp/...)
4. **events** - OBP events links (theobp.com/events)

## How It Works

- A small JavaScript file (`scripts/track.js`) listens for clicks on tracked links
- When clicked, it sends a fire-and-forget request to `/api/track` using `navigator.sendBeacon`
- The endpoint records only: link type, page name, and date (nothing identifiable)
- Counts are aggregated per day in a Cloudflare D1 (SQLite) database

## Manual Cloudflare Dashboard Setup Required

### Step 1: Create the D1 Database

1. Log in to your Cloudflare Dashboard
2. Navigate to **Workers & Pages** → **D1**
3. Click **Create database**
4. Name it: `hughroth-clicks`
5. Click **Create**
6. Copy the **Database ID** shown (you'll need this)

### Step 2: Bind D1 to Your Pages Project

1. Go to **Workers & Pages** → **hughroth-com** project
2. Navigate to **Settings** → **Functions**
3. Under **D1 database bindings**, click **Add binding**
4. Variable name: `DB`
5. D1 database: select `hughroth-clicks`
6. Click **Save**

### Step 3: Set the Stats Token (Required)

1. In the same **Settings** → **Functions** area
2. Under **Environment variables**, click **Add variable**
3. Variable name: `STATS_TOKEN`
4. Value: choose a secret string (e.g., generate one with `openssl rand -base64 32`)
5. Click **Save**

**Important:** The stats and init endpoints will return 503 if this is not set.

### Step 4: Initialize the Database

After deployment, visit this URL once to create the database table:

```
https://hughroth.com/api/init-db?token=YOUR_TOKEN
```

You should see: `{"ok":true,"message":"Database initialized"}`

## How to View Click Statistics

Visit the stats endpoint with your token:

```
https://hughroth.com/api/stats?token=YOUR_TOKEN
```

### Query Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `token`   | Your STATS_TOKEN (required) | - |
| `days`    | Number of days to include | 30 |
| `by`      | Group results: `type`, `page`, or `day` | `type` |

### Examples

**Summary by link type (last 30 days):**
```
/api/stats?token=YOUR_TOKEN
```

**Breakdown by page:**
```
/api/stats?token=YOUR_TOKEN&by=page
```

**Daily breakdown (last 7 days):**
```
/api/stats?token=YOUR_TOKEN&by=day&days=7
```

### Sample Response

```json
{
  "period": "last 30 days",
  "cutoff": "2024-10-14",
  "data": [
    { "link_type": "give", "total": 45 },
    { "link_type": "newsletter_signup", "total": 23 },
    { "link_type": "events", "total": 18 },
    { "link_type": "newsletter_pdf", "total": 12 }
  ],
  "allTime": [
    { "link_type": "give", "total": 156 },
    { "link_type": "newsletter_signup", "total": 89 }
  ]
}
```

## Free Tier Limits

Cloudflare D1 free tier includes:
- 5 million read operations/day
- 100,000 write operations/day
- 5 GB storage

This is far more than a personal ministry site would ever need.

## Privacy Notes

This tracking system:
- ✅ Does NOT use cookies
- ✅ Does NOT store IP addresses
- ✅ Does NOT collect any personal information
- ✅ Does NOT use third-party tracking services
- ✅ Only counts: which link type was clicked, on which page, on which date

The data stored is completely anonymous aggregate counts.
