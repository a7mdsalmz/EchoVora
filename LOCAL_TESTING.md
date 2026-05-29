# EchoVora Local Development & Testing

## Prerequisites

- Node.js 22+
- PostgreSQL 15+ (local install or Docker)
- Redis 6+ (local install or Docker)

## Environment Files

Copy the examples and adjust values as needed:

- Root: `.env.example` → `.env`
- Web: `apps/web/.env.example` → `apps/web/.env.local`
- API: `apps/api/.env.example` → `apps/api/.env`
- Worker: `apps/worker/.env.example` → `apps/worker/.env`

The API and worker automatically load their local `.env` files on startup.

### Encryption key (required for dashboard-managed secrets)

If you want to configure provider credentials (Twilio/Telnyx/Plivo/ElevenLabs) from the dashboard, set a 32-byte base64 key in:

- `apps/api/.env`: `CONFIG_ENCRYPTION_KEY`
- `apps/worker/.env`: `CONFIG_ENCRYPTION_KEY`

The platform stores provider secrets encrypted-at-rest in the database using this key.

Recommended local-only telephony mode:

- In `apps/worker/.env`, set `SIMULATE_TELEPHONY="true"`

## Database Setup

1. Start Postgres and Redis.

If you have Docker installed, you can use the repo compose file:

```bash
npm run deps:up
```

2. Run Prisma migrations (creates tables):

```bash
npm run db:migrate
```

3. Seed baseline data + optional super admin:

```bash
npm run prisma:seed -w apps/api
```

To seed a super admin, set these env vars when running seed:

- `SEED_SUPERADMIN_EMAIL`
- `SEED_SUPERADMIN_PASSWORD`

## Run The Platform Locally

Run all services:

```bash
npm run dev
```

Default local URLs:

- Web: `http://localhost:3000/en` and `http://localhost:3000/ar`
- API: `http://localhost:4000/api/health`

## Local Telephony Simulation (No Provider Credentials)

With `SIMULATE_TELEPHONY="true"` in the worker:

- Outbound calls (order confirmation and test calls) create synthetic telephony events
- The existing `telephony-events` worker processes events normally (status reduction, transcript ingestion, conversation progression)
- No Twilio/Telnyx/Plivo credentials are required for local workflow validation

## Running Tests

Unit tests:

```bash
npm test
```

Integration tests (requires running Postgres + Redis and a writable database):

```bash
npm run test:integration
```

E2E UI tests (Playwright):

```bash
npm run e2e:install
npm run test:e2e
```

Build verification:

```bash
npm run build
```

## Real-World Telephony + ElevenLabs Testing

### Secure credential handling

- Do not commit keys to git (the repo ignores `.env*` files).
- Prefer storing secrets in your OS secret store and injecting them as environment variables into the process.
- If you do use `.env` files locally, keep them outside of version control and restrict file access permissions.

### ElevenLabs (real API)

1. Set these values (locally):
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_MODEL_ID` (optional)
   - `ELEVENLABS_VOICE_ID` (for benchmarking script)
2. Run a benchmark to validate latency/format:

```bash
npm run bench:elevenlabs
```

Outputs:
- `elevenlabs-sample.mp3`
- `elevenlabs-bench.json` (avg + p95 latency)

### Telephony (real provider)

Important: any real provider webhooks + audio playback must reach your API from the public internet.

1. Use a tunnel (ngrok/cloudflared) to expose the API port `4000`.
2. Set `PUBLIC_API_BASE_URL` in `apps/api/.env` to your public tunnel URL.
3. Disable simulation:
   - In `apps/worker/.env`: set `SIMULATE_TELEPHONY="false"`
4. Configure providers and phone numbers in the UI:
   - Web: `http://localhost:3000/en/telephony`
   - Add provider credentials + webhook secret (stored masked in UI, saved in DB)
   - Add at least one outbound-enabled phone number (E.164)
5. Add ElevenLabs config to the API (so the answer webhook can play ElevenLabs audio):
   - In `apps/api/.env`: set `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_EN`, `ELEVENLABS_VOICE_ID_AR`
6. Place a real test call:
   - Use the Telephony page “Test call” action.
   - The answer flow plays an ElevenLabs-generated MP3 via `/api/telephony/tts` and then hangs up.

## Troubleshooting

- If `docker` is not available on your machine, run Postgres/Redis as local services instead of Docker Compose.
- If `http://localhost:3000/ar` fails with chunk/module errors, delete `apps/web/.next` and restart the web dev server.
- If seed fails due to missing env vars, ensure `DATABASE_URL`, `REDIS_URL`, and `JWT_SECRET` are set for the API process running the seed.
