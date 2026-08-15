# Enquiries & ad spend dashboard

A single-page client dashboard for a mobile tyre-fitting business. It reads Google
Analytics 4 and answers one question on a phone screen: how many people got in
touch, what the ads cost, and which campaigns are worth the money.

An **enquiry** is one of two GA4 key events: a visitor tapping the phone number
(`call_click`) or opening the contact form (`form_click`).

## Running it

```bash
npm run dev
```

## Configuration

All of it lives in `.env.local`.

| Variable | Required | What it does |
| --- | --- | --- |
| `DASHBOARD_PASSWORD` | yes | The one password that opens the dashboard. |
| `AUTH_SECRET` | yes | Signs the session cookie. Generate with `openssl rand -base64 32`. |
| `GA4_PROPERTY_ID` | yes | Numeric GA4 property ID. |
| `GA4_SERVICE_ACCOUNT_KEY_JSON` | on deploy | The whole service-account JSON key, pasted as one value. Preferred on Vercel. |
| `GA4_SERVICE_ACCOUNT_KEY_PATH` | local only | Path to the key file, used when the JSON variable is absent. |
| `GA4_PROPERTY_LABEL` | no | Heading shown at the top of the dashboard. |
| `GA4_CALL_EVENT` | no | Event name for a phone tap. Defaults to `call_click`. |
| `GA4_FORM_EVENT` | no | Event name for a form enquiry. Defaults to `form_click`. |
| `GA4_TIMEZONE` | no | The property's timezone, used to decide what "today" means. Defaults to `Europe/London`. A mismatch is logged as `[ga4] GA4_TIMEZONE is … but the property reports …`. |
| `GA4_SAMPLE_FALLBACK` | no | Set to `1` to fall back to invented sample numbers when GA4 is unreachable. Off by default — see below. |

The service account needs **Viewer** on the GA4 property, and the property needs
Google Ads linked for the spend figures to appear.

## How it stays inside the GA4 API quota

A standard GA4 property allows 200,000 core tokens a day, 40,000 an hour, and
**10 concurrent requests**. The concurrency limit is the one that bites first, so:

- **One API call per page load.** Every report the page needs goes out as a single
  `batchRunReports` call (`lib/ga4.ts`). Reports that can answer two questions do:
  the current and prior period are requested as two date ranges rather than two
  reports. Measured cost is **5–30 tokens per load**.
- **One call per range, not per visitor.** Results are cached with
  `unstable_cache`, which persists across server instances and deployments, so a
  second person opening the dashboard costs nothing. Ranges covering today are
  held 5 minutes, ranges ending yesterday 6 hours, and closed ranges 24 hours.
- **Every response logs what it spent**, e.g.
  `[ga4] quota — day: 12 used, 199,488 left · hour: … · concurrent: 0 used, 10 left`.
  Watch that line if anything looks off.
- **Failures back off.** After a failed call the dashboard waits 60 seconds before
  trying again, so an outage cannot burn through the hourly server-error allowance.
- **The refresh button is rationed** to one refetch every 30 seconds.

At the 5-minute floor, a range that someone watches all day costs well under 1% of
the daily budget.

## When Google Analytics can't be reached

In order of preference the dashboard will:

1. serve the **last numbers it successfully fetched**, labelled as such;
2. show a plain **"can't reach Google Analytics right now"** card;
3. only show invented sample numbers if `GA4_SAMPLE_FALLBACK=1` is set.

Sample data is off by default on purpose: a client screenshotting invented enquiry
counts is worse than a client seeing an honest error.

## Things worth knowing before changing the GA4 code

- `advertiserAdCost` will not come back unless `sessionCampaignName` is in the same
  request, and it cannot be broken down by hour at all — which is why single-day
  views have no spend line.
- Cost metrics and `eventName` cannot share a request, so enquiries-per-campaign is
  fetched separately and joined on the campaign name.
- A report with two date ranges comes back with an extra `dateRange` column, **and**
  with cross-product padding: rows carrying a date from one range labelled as the
  other, always with a zero count. `lib/ga4.ts` only fills buckets it seeded for the
  selected range, which drops that padding. Removing that guard silently doubles the
  length of the chart.

## Who can see it

One account, no sign-up, no user list. The name is fixed in `lib/session.ts` and
the password lives in `DASHBOARD_PASSWORD`; there is nothing else to manage.

- **Nothing renders before sign-in.** `proxy.ts` turns anonymous requests away
  before a page is built, so an unauthenticated visitor never costs a GA4 call.
- **The gate is checked twice.** The page, `/api/dashboard` and the refresh
  action each verify the session themselves, so a route added later is protected
  whether or not the proxy's matcher is updated to match.
- **The session is a signed cookie** — HMAC-SHA256 over a name and an expiry, no
  store and no dependency. It is `HttpOnly`, `SameSite=Lax`, and `Secure`
  whenever the request arrived over https.
- **"Remember this device"** is ticked by default and lasts 90 days, renewed on
  use so an active client is never signed out mid-month. Unticked, the cookie
  dies with the browser session and the token expires after 12 hours.
- **Wrong passwords are rationed** to 8 attempts per address per 15 minutes.

Changing `DASHBOARD_PASSWORD` signs nobody out. Changing `AUTH_SECRET` invalidates
every existing session immediately — that is the way to force a sign-out
everywhere, and to do after the password has been shared over something lossy.
