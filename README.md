# Cadence by C0D3AI

Cadence is an MVP client communication system that builds project memory from Gmail threads and project documents, generates concise AI project updates, and sends them through Gmail on a twice-weekly schedule.

## Features

- Project Memory JSON model
- Gmail thread ingestion for the latest client messages
- TXT, PDF, DOCX document parsing
- OpenAI-powered update email generation
- Gmail API sending
- Monday morning and Thursday afternoon cron schedule
- Minimal dashboard with project list, next scheduled send, preview, and Send Now

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
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
GMAIL_CLIENT_ID=your-google-oauth-client-id
GMAIL_CLIENT_SECRET=your-google-oauth-client-secret
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token
GMAIL_SENDER_EMAIL=you@example.com
```

Set `CRON_ENABLED=true` to enable scheduled sends.

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

## Scheduler

The cron job runs:

- Monday at 9:00 AM
- Thursday at 2:00 PM

It loops through active projects, ingests current project data, generates an update, sends it through Gmail, and records the update in project memory.

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
