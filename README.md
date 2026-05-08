# Cadence by C0D3AI

Cadence is an MVP client communication system that builds project memory from Gmail threads and project documents, generates concise AI project updates, and sends them through Gmail on a twice-weekly schedule.

## Features

- Project Memory JSON model
- Gmail thread ingestion for the latest client messages
- TXT, PDF, DOCX document parsing
- OpenAI-powered update email generation
- Gmail API sending
- Monday morning and Thursday afternoon cron schedule
- Protected demo dashboard with project list, detail tabs, email log, settings, preview, and Send Now
- Safe-send controls: confirmation, dry-run mode, and test-recipient override
- Vercel Cron endpoint for hosted twice-weekly sends

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

Without API keys, the app still runs. OpenAI falls back to a deterministic sample email, and Gmail sending becomes a dry run.

## Environment

```bash
PORT=3000
CRON_ENABLED=false
DEMO_MODE=true
DASHBOARD_PASSWORD=change-this-before-sharing
CRON_SECRET=change-this-cron-secret
REQUIRE_SEND_CONFIRMATION=true
TEST_RECIPIENT_EMAIL=you@example.com
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
GMAIL_CLIENT_ID=your-google-oauth-client-id
GMAIL_CLIENT_SECRET=your-google-oauth-client-secret
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token
GMAIL_SENDER_EMAIL=you@example.com
```

Set `CRON_ENABLED=true` to enable scheduled sends.

For a shared demo, set `DASHBOARD_PASSWORD` in Vercel. The browser sends this value as `x-cadence-demo-password` for protected API requests after the user unlocks the dashboard.

`REQUIRE_SEND_CONFIRMATION=true` prevents accidental sends from raw API calls. The dashboard always sends `{ "confirm": true }` after the user presses Send Now. Keep `TEST_RECIPIENT_EMAIL` set while testing so live sends route to your own inbox instead of a client.

## Gmail API Setup

1. Create a Google Cloud project.
2. Enable the Gmail API.
3. Create OAuth credentials for a web application.
4. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI for local MVP testing.
5. In OAuth Playground, authorize Gmail scopes:

```text
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
```

6. Exchange the authorization code for tokens.
7. Put the refresh token and OAuth client values in `.env`.

For production, use your own callback route instead of OAuth Playground and store tokens securely.

## API

- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects/:id/ingest`
- `POST /api/projects/:id/memory`
- `POST /api/email/:projectId/generate-preview`
- `POST /api/email/:projectId/send-now`
- `GET /api/cron/send-updates`

`POST /api/email/:projectId/send-now` accepts:

```json
{
  "confirm": true,
  "dryRun": true,
  "testRecipient": "you@example.com"
}
```

## Scheduler

The cron job runs:

- Monday at 9:00 AM
- Thursday at 2:00 PM

It loops through active projects, ingests current project data, generates an update, sends it through Gmail, and records the update in project memory.

On Vercel, cron is configured in `vercel.json`:

- Monday 16:00 UTC, equivalent to Monday 9:00 AM America/Phoenix outside daylight saving shifts
- Thursday 21:00 UTC, equivalent to Thursday 2:00 PM America/Phoenix outside daylight saving shifts

Set `CRON_SECRET` in Vercel. Vercel Cron includes it as a bearer token when calling `/api/cron/send-updates`.

## Production Notes

For a serious production version, move the JSON stores in `data/` to Postgres, Supabase, Neon, or another persistent database. Serverless file writes are not durable on Vercel, so the current JSON store is suitable for a demo seed workspace and local development only.

Recommended Vercel environment variables:

```bash
DASHBOARD_PASSWORD=your-demo-password
CRON_SECRET=long-random-secret
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_SENDER_EMAIL=updates@yourdomain.com
TEST_RECIPIENT_EMAIL=you@yourdomain.com
REQUIRE_SEND_CONFIRMATION=true
```

To use a custom domain, add it in the Vercel project settings, then create the DNS record Vercel provides. A domain like `cadence.c0d3ai.com` will make the demo feel more credible than the generated Vercel URL.

## Sample Project

The sample project is in `data/projects.json`, with supporting local files in `data/sample-docs`.

## Example Generated Email

Subject:

```text
[Cadence Update] Website Refresh - Status + Next Steps
```

Body:

```text
Hi Jordan,

Quick update on Website Refresh. Recent activity shows steady movement across the current scope, with the clearest progress around Homepage section order is approved.

The project is in an active working state. The main focus right now is keeping the remaining deliverables organized, confirming dependencies, and making sure the next milestone has what it needs before work advances further.

The only open item to keep an eye on is Final approval on services copy. Once that is resolved, the next step is to continue through the current milestone and prepare the next round of review items.

I will keep the update cadence consistent and call out anything that needs a decision before it slows the timeline.

Best,
C0D3AI
```
