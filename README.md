# Jenosize AI CRM — Recruitment Test Assignment

A working AI CRM MVP built for the Jenosize "Lead AI Software Engineer" recruitment test assignment:
a responsive CRM (companies/contacts/leads/pipeline), a persistent Postgres database, a reusable AI
CRM Copilot skill, and a LINE Official Account integration, with an audit trail on every mutation.

See `JD-Assignment-Lead-AI-Software-Engineer-candidate V.2.pdf` for the original brief and
`docs/01-REQUIREMENTS-BA.md` → `docs/04-TEST-REPORT-QA.md` for the full BA → SA → PM → QA trail this
was built from.

## 1. Governance / delivery artifacts

| Role | Artifact |
|---|---|
| BA | `docs/01-REQUIREMENTS-BA.md` — goals, user stories, business rules, RBAC matrix, privacy/audit requirements |
| SA | `docs/02-ARCHITECTURE-SA.md` — layered architecture, ERD, API contracts, security controls, LINE + AI Copilot sequence/flow diagrams |
| PM | `docs/03-PROJECT-PLAN-PM.md` — WBS, requirements traceability matrix, risk register, Definition of Done |
| DEV | `src/` |
| QA | `e2e/`, `docs/04-TEST-REPORT-QA.md` |
| AI Copilot skill spec | `skills/crm-copilot/SKILL.md` |
| AI usage log | `docs/05-AI-USAGE-LOG.md` |

## 2. Stack and key trade-offs

- **Next.js 14 App Router, TypeScript strict, Zod on every API boundary, Prisma/PostgreSQL.**
- Auth: demo email/password, signed HS256 session cookie (`jose`), `bcryptjs` password hashing. Not
  SSO/OAuth — out of scope for a 16-hour MVP, called out explicitly rather than left unstated.
- AI Copilot: pluggable `AiCopilotEngine` interface with two implementations — `LlmProviderAdapter`
  (real provider call, or a deterministic simulated response when `AI_MOCK_MODE=true`, no API key
  needed to demo) and `HeuristicFallbackEngine` (used on any provider failure). Same response shape
  either way, so the Service layer and UI never branch on which one answered.
- LINE: `LineAdapter` interface with a `MockLineAdapter` (default, `LINE_MOCK_MODE=true`) and a
  `RealLineAdapter` for an actual Messaging API push.
- AuditLog is append-only Postgres, not just console output — see `src/core/audit/audit-logger.ts`.

## 3. Local setup

Requires Node 20+, Docker (for Postgres), and `git`.

```bash
npm install
cp .env.example .env      # then fill in real values (see §3.1)

# Start Postgres (or point DATABASE_URL at your own instance)
docker compose up -d postgres

npx prisma migrate dev    # creates schema
npm run prisma:seed       # seeds 20 users, 60 companies, 2,000 contacts, 300 leads

npm run dev                # http://localhost:3021
```

Demo login (any seeded user, same password): `admin@jenosize.demo` / `manager1@jenosize.demo` /
`rep1@jenosize.demo` … `rep17@jenosize.demo`, password **`Passw0rd!`**. Roles: 1 Admin, 2 Sales
Managers, 17 Sales Reps (`docs/01-REQUIREMENTS-BA.md` §1.5).

### 3.1 `.env` values that matter locally
- `DATABASE_URL` — must match your local Postgres (docker-compose exposes it on `localhost:5433`).
- `SESSION_SECRET` — any long random string for local dev.
- `AI_MOCK_MODE=true` / `LINE_MOCK_MODE=true` — keep both `true` unless you have a real LLM key and a
  real LINE OA test channel (see §5).
- `ALLOW_TEST_HOOKS` — leave `false` unless running the E2E suite; **never `true` in a real deployment**
  (see `docs/04-TEST-REPORT-QA.md` §3 item 5 for why this exists).

## 4. Testing

```bash
npm run type-check   # tsc --noEmit, strict
npm run lint
npm run test:e2e     # builds once, then runs the Playwright suite (see docs/04-TEST-REPORT-QA.md)
npm run ship         # lint + type-check + build — the pre-push gate
```

E2E runs against a production build (`next start`), not `next dev` — see
`docs/04-TEST-REPORT-QA.md` §3 for why. `ALLOW_TEST_HOOKS=true` must be set for the AI-fallback spec
to be able to force the fallback path deterministically; `npm run test:e2e` expects it in `.env`.

## 5. Connecting a real LINE OA test channel (optional — mock mode works without this)

1. Create a LINE Official Account + Messaging API channel in the [LINE Developers Console](https://developers.line.biz/) (use a **test** channel, never a production one).
2. Copy the Channel Secret and Channel Access Token into `.env` (`LINE_CHANNEL_SECRET`,
   `LINE_CHANNEL_ACCESS_TOKEN`), set `LINE_MOCK_MODE=false`.
3. Expose your local server publicly (e.g. a tunnel tool of your choice) and set the webhook URL in
   the LINE console to `https://<your-tunnel-host>/api/line/webhook`.
4. Add the OA as a friend from a LINE app (scan the QR code in the console) and send it a message —
   it should appear as a new Lead (or a Message on an existing one) within a few seconds.

## 6. Deploying

**Live demo:** https://jenosize-crm-ai.vercel.app
Demo login: `admin@jenosize.demo` / `manager1@jenosize.demo` / `rep1@jenosize.demo` … `rep17@jenosize.demo`,
password `Passw0rd!` (same set as local — see §3). Database is a managed Postgres (Neon), migrated
and seeded with the same synthetic dataset described in §3 (2,000 contacts / 300 leads).

Deployed on Vercel, connected to `napaporn-s/jenosize-crm-ai-system` on `main` — pushing to `main`
triggers a new build automatically. `LINE_MOCK_MODE=false` in production: the LINE OA integration is
live (real webhook signature verification, real outbound sends via the Messaging API), not mocked.

- **Docker (self-host alternative):** `docker compose up --build` builds and runs the full stack
  (Postgres + app) — see `docker-compose.yml` and `Dockerfile` (multi-stage, `output: standalone`,
  non-root user).
- Any platform that can run a Node 20 container + a Postgres database works (Fly.io, Railway, Render,
  a VPS). Set the `.env.example` variables as real secrets in that platform's config, never in the
  image.

## 7. Known limitations / production next steps

(Full list with rationale in `docs/02-ARCHITECTURE-SA.md` §8 and `docs/03-PROJECT-PLAN-PM.md` §3.)

- AuditLog write failures don't roll back the business mutation they're logging (documented
  availability-over-strict-consistency trade-off) — a production version would use a transaction or
  outbox pattern.
- In-memory rate limiting on the AI Copilot and LINE webhook routes doesn't survive a multi-instance
  deployment — would need Redis or a platform-level rate limiter.
- Auto-created LINE leads with no matching contact are parked under a placeholder "LINE Inbound
  (Unassigned)" company and assigned to the first ADMIN user as a triage owner, then manually
  reassigned — a real deployment would want a proper intake/triage queue instead.
- RBAC is a 3-role model (Admin / Sales Manager / Sales Rep) that BA derived from the JD's brief
  ("20-person commercial team") since the JD itself didn't specify a role hierarchy — flagged
  explicitly as an assumption in `docs/01-REQUIREMENTS-BA.md` §1.5, not a literal requirement.
- No SSO, no password reset flow, no rate limiting on login — all reasonable for a demo/MVP, not for
  production.
- DB connection pooling: serverless functions on Vercel can each open a new Postgres connection on
  cold start, which can exceed Neon's `max_connections` without a limit. `.env.example` now documents
  Neon's pooled (`-pooler`) endpoint for `DATABASE_URL` plus a direct endpoint for `DIRECT_URL`
  (required by Prisma Migrate) — confirm the live Vercel project's env vars actually use the pooled
  endpoint, not just the direct one.
- LINE webhook processing is synchronous: signature verification, lead/contact lookup, message +
  activity + audit-log writes all happen inline in the same request before responding to LINE. Fine at
  demo volume; a production version handling real traffic bursts would ack the webhook immediately
  (after signature check) and hand the DB writes to a background queue/worker, both to stay well under
  LINE's webhook response-time expectations and to isolate a slow/failed write from the delivery ack.
- CSP `script-src` in `next.config.js` still includes `'unsafe-inline' 'unsafe-eval'`, which weakens
  its XSS mitigation. Nothing in `src/` actually calls `eval`/`Function`/`dangerouslySetInnerHTML`, so
  it's very likely droppable — left as-is here rather than editing production security headers
  unverified this close to submission; a nonce-based strict CSP is the recommended next step.

## 8. API notes

Full contract table in `docs/02-ARCHITECTURE-SA.md` §3. All responses use the envelope in
`src/core/errors/api-response.ts` (`{ success, code, message, data?, errors?, timestampUtc }`).
Every mutating route (`POST`/`PATCH`) is Zod-validated and writes an `AuditLog` row.

## 9. Structured logging & monitoring notes

- **Structured logs:** every audit event is emitted as a single-line JSON `console.log` tagged
  `[AUDIT_TRAIL]` (`src/core/audit/audit-logger.ts`) — actor, role, action, resource, status,
  sanitized before/after diff, timestamp — in addition to being persisted to the `AuditLog` table.
  Route-level failures are logged via `console.error` with a `[UNHANDLED_ROUTE_ERROR]` /
  `[AUDIT_TRAIL_PERSIST_FAILED]` tag (`src/core/errors/handle-route-error.ts`). On Vercel this is
  queryable as-is under Observability → Logs, filterable by that tag prefix; self-hosted, pipe stdout
  into any log aggregator (e.g. Loki, CloudWatch, Datadog) — the JSON-per-line shape needs no
  transformation to be ingested.
- **What's *not* wired up (documented gap, not silently missing):** no APM/error-tracking SDK (e.g.
  Sentry), no uptime/latency dashboard, no alerting. For this MVP, `GET /api/health` (checks DB
  connectivity) is the only health signal, and the `AuditLog` table itself is the durable record —
  query it directly for "who did what, when" during an incident. A production deployment should add:
  an error-tracking SDK on the Route Handler layer, an uptime check against `/api/health`, and an
  alert on repeated `[AUDIT_TRAIL_PERSIST_FAILED]` lines (that specific failure mode is a documented
  trade-off — see `docs/02-ARCHITECTURE-SA.md` §5 — and is the one thing in this codebase that fails
  silently by design, so it's the one thing worth alerting on externally).
