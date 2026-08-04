# 04 — Test Report (QA)

**Builds on:** `docs/03-PROJECT-PLAN-PM.md` §2 (Requirements Traceability Matrix), `docs/02-ARCHITECTURE-SA.md`
**Suite:** Playwright, `e2e/*.spec.ts` — run against a real Postgres instance (not mocked) and a
production Next.js build (`npm run build:no-generate && playwright test`, webServer runs `npm run
start`), with `AI_MOCK_MODE=true` / `LINE_MOCK_MODE=true` so the suite is deterministic and needs no
live LLM key or LINE channel.

## 1. Result summary

```
Running 14 tests using 10 workers
  14 passed (9.0s)
```
Reproduced twice consecutively (14/14 both times) to rule out flakiness before sign-off — see §3 for
the flake that *was* found and fixed along the way.

| Spec file | Test IDs | Covers | Result |
|---|---|---|---|
| `e2e/core-crm-flow.spec.ts` | E2E-01 | US-01–US-07, US-16, DP-01, DP-02 | ✅ 1/1 |
| `e2e/ai-copilot-fallback.spec.ts` | E2E-02 | US-08, US-09 (indirectly), US-10, US-11 | ✅ 4/4 |
| `e2e/line-webhook-security.spec.ts` | E2E-03 | US-12, US-13, DP-03, DP-04 | ✅ 4/4 |
| `e2e/rbac-violations.spec.ts` | E2E-04 | RBAC §4, BA §3.1 terminal-stage guard | ✅ 5/5 |

This satisfies the JD's stated minimum ("automated tests for one core CRM flow, one AI skill
behavior/fallback, and one LINE webhook security/idempotency flow") and the additional RBAC-violation
coverage called for in `AGENT-ROLES.md`'s QA directive.

## 2. What each spec actually exercises

### E2E-01 — Core CRM flow (`core-crm-flow.spec.ts`)
Real browser session (Playwright `page`, not just `request`): logs in through the actual login form,
navigates to "New Lead," uses the live contact-search autocomplete (`ContactPicker`, debounced fetch
against `/api/contacts?q=`) to pick a real seeded contact, submits the form, lands on the created
lead's detail page, clicks a pipeline-stage button (`QUALIFIED`), then **reloads the page** and asserts
the stage is still shown as active — proving persistence, not client-only state (US-07). Finally reads
back `/api/audit-logs` and asserts an `UPDATE`/`Lead`/`SUCCESS` row exists for that lead's stage
change, closing the loop on DP-01/DP-02.

### E2E-02 — AI Copilot fallback (`ai-copilot-fallback.spec.ts`)
Four cases, API-level:
1. Happy path — asserts the full response shape (≤3 summary bullets, 0–100 score, ≤200-char draft
   reply) and `isFallback: false`.
2. Forced provider failure via the `x-simulate-ai-failure` test-only header (gated on
   `ALLOW_TEST_HOOKS=true` — see §3 item 5) — asserts the exact fallback values from
   `skills/crm-copilot/SKILL.md` §5 (score 50, the literal Thai default reply).
3. Malformed JSON body — asserts `400 VALIDATION_ERROR`, confirming the request never reaches the
   engine layer (US-11).
4. Unauthenticated request — asserts `401`.

### E2E-03 — LINE webhook security (`line-webhook-security.spec.ts`)
Computes real HMAC-SHA256 signatures in Node (`node:crypto`) against the exact raw request bytes, the
same way the LINE platform would:
1. No signature header → `401`.
2. Invalid signature → `401`.
3. Valid signature, new `webhookEventId` → `200`, `processed: 1`; the **same** event redelivered →
   `200`, `processed: 0, skippedDuplicates: 1` (idempotency, DP-04).
4. Valid signature over a syntactically malformed JSON body → `400`, not `500` — proving the
   signature check runs against raw bytes independently of JSON validity (DP-03 ordering requirement
   in `docs/02-ARCHITECTURE-SA.md` §4.2).

### E2E-04 — RBAC violations (`rbac-violations.spec.ts`)
1. Sales Rep → `PATCH /api/leads/:id/owner` → `403` (Manager/Admin only).
2. Sales Rep → `GET /api/audit-logs` → `403` (Manager/Admin only).
3. Sales Rep A's lead, accessed by Sales Rep B in an isolated browser context (separate cookie jar) →
   `GET` → `403`, `PATCH .../stage` → `403`.
4. Sales Rep B explicitly requests `?ownerId=<repA's id>` on the leads list — asserts the response
   never contains Rep A's lead, proving the service-layer scoping in `lead.service.ts#list` cannot be
   overridden by a client-supplied query param.
5. **Terminal-stage guard (BA §3.1):** a Sales Rep moves their own lead to `WON`, then cannot move it
   again (`409 CONFLICT`) — but an Admin can. Closes the DoD gap noted in the previous draft of this
   report (§6).

## 3. Bugs and infrastructure issues found and fixed during QA

Writing and running these tests against the real implementation (not mocks) surfaced defects that a
docs-only review would have missed:

| # | Issue | Where | Fix |
|---|---|---|---|
| 1 | `GET /api/leads` and lead detail responses leaked `owner.passwordHash` / `actor.passwordHash` in the JSON body | `lead.repository.ts` used `include: { owner: true }` (full row) instead of a safe `select` | Added `SAFE_USER_SELECT` (id/name/email/role only) and applied it to every `owner`/`actor` include |
| 2 | `GET /api/leads` did not scope results to the caller's own leads for `SALES_REP` — a rep could pass `?ownerId=<anyone>` and read team-wide data | `lead.service.ts#list` had no actor-based scoping | `list()` now takes the actor and force-overrides `ownerId` to the caller's own id when role is `SALES_REP` |
| 3 | `next.config.js` header route pattern `'/:(.*)'` is invalid path-to-regexp syntax and broke the production build entirely (`next build` failed with "Invalid header found") | `next.config.js` | Corrected to `'/:path*'` |
| 4 | Login form's `<label>` elements had no `htmlFor`/`id` association (same pattern in the company/contact/lead create forms) — invisible to screen readers and to `getByLabel`-style automation | `login-form.tsx` + 3 other form components | Added matching `id`/`htmlFor` pairs across all form fields |
| 5 | The AI-fallback test hook (`x-simulate-ai-failure`) was gated on `NODE_ENV !== 'production'`. Once the suite was switched to run against a production build (fix #6) for stability, the hook could never fire, and E2E-02's fallback case failed | `src/app/api/leads/[id]/ai-copilot/route.ts` | Replaced the `NODE_ENV` check with an explicit `ALLOW_TEST_HOOKS=true` env flag, documented in `.env.example` as **must stay false/unset in any real deployment** |
| 6 | Running E2E against `next dev` (the original config) was flaky under `fullyParallel: true`: many routes JIT-compiling concurrently for the first time under 10-worker load produced multi-second stalls, occasionally causing the browser-driven login flow to time out waiting for a route it hadn't hit before | `playwright.config.ts` | webServer now runs `npm run start` (a prebuilt app) instead of `npm run dev`; `npm run test:e2e` builds once first (`build:no-generate`, skipping a redundant `prisma generate`) |
| 7 | Login form: a click landing before React hydration attaches its `onSubmit` handler fell through to a native (unhandled) form submit, occasionally leaving the browser-driven test stuck on `/login` | `e2e/core-crm-flow.spec.ts` | Added `page.waitForLoadState('networkidle')` after navigating to `/login`, and asserted on the actual `POST /api/auth/login` network response before checking the post-login URL |

Defect 1 is a real security finding (credential-adjacent PII exposure, OWASP A02) caught by manually
curling the API during DEV verification — before any E2E test ran — and is called out here because it
is exactly the class of bug this test suite (and the SA-level `SAFE_USER_SELECT` pattern it now
encodes) exists to keep from regressing. Defects 6–7 are test-infrastructure fixes, not app defects,
but are recorded here because they materially affect whether "tests pass" claims can be trusted.

## 4. Coverage not automated (manual verification / documented gap)

| Item | Why not automated | How it was verified |
|---|---|---|
| US-06 search/filter at seeded scale (2,000 contacts / 300 leads) | Perf/UX check, not a pass/fail assertion suited to Playwright's default assertions | Manually confirmed via the running app: `/leads?q=...&stage=...` returns correctly scoped, paginated results against the full seeded dataset (see §5) |
| US-17 no secrets in git history | Repo-hygiene check, not a runtime behavior | Manual check: `.env` (real values) is git-ignored; only `.env.example` (placeholders) is tracked |
| Approve → LINE send → outbound `Message` persisted with audit row | Covered manually during DEV verification (curl walkthrough) rather than a dedicated spec, to avoid duplicating E2E-01's audit-log assertion pattern | Manually verified: `POST .../approve` → `Message(status: SENT)` created via `MockLineAdapter`, `AuditLog` row with `resource: Message` confirmed via `GET /api/audit-logs` |

## 5. End-to-end manual verification (Part 3 evidence)

Beyond the automated suite, the full stack was verified running for real, not just compiled:

- `prisma migrate dev` applied cleanly against a live PostgreSQL 16 instance.
- `prisma/seed.ts` produced the JD's exact scenario scale: 20 users, 60 companies, **2,000 contacts**,
  **300 leads**, 300 activities, 80 LINE messages.
- Full auth → CRM → AI Copilot → LINE webhook → audit-log flow exercised via `curl` against the live
  dev server (login success/failure, RBAC-scoped list, lead detail with no password leak, AI happy
  path, AI forced-fallback, approve/discard with `409` on double-approve, RBAC `403`s, LINE webhook
  signature accept/reject/idempotency, malformed-body `400`).
- Same flow re-verified through an actual Chrome browser session: login form → pipeline list →
  lead detail → "Ask AI Copilot" → live-rendered draft with context-aware scoring (score changed
  from 20 to 55 once real conversation history existed on the lead, proving the response is
  genuinely context-driven, not a static fixture).
- `npm run lint`, `tsc --noEmit`, and `next build` all pass clean.
- `docker build` produces a working standalone image; the container boots and serves `/api/health`
  successfully against the same Postgres instance.

## 6. Definition of Done — status against `docs/03-PROJECT-PLAN-PM.md` §4

| Item | Status |
|---|---|
| Type-check strict, zero `any` | ✅ |
| Lint clean | ✅ |
| Build succeeds | ✅ |
| `prisma migrate dev` clean from fresh schema | ✅ |
| Every mutating route Zod-validated | ✅ |
| Every mutating route audit-logged (persisted, not just console) | ✅ |
| Terminal stage guard server-enforced | ✅ (E2E-04, case 5) |
| LINE signature/idempotency enforced | ✅ (E2E-03) |
| No secrets in git history | ✅ (manual check, §4) |
| E2E-01/02/03 pass (JD minimum) | ✅ |
| E2E-04 passes (RBAC, beyond JD minimum) | ✅ |
| README/handover docs | ✅ see `README.md` |

## 7. Known local-environment note (not a repo defect)

During this session's verification, a stray `next dev` process from an earlier debugging run remained
bound to port 3020 on the development machine and could not be terminated from the automation
session (`taskkill`/`Stop-Process` both returned "Access is denied"). Because it shared this project's
default `.next` build directory, it intermittently corrupted concurrent `next build`/`next start` runs
until the project was moved off port 3020 entirely (`package.json`/`playwright.config.ts` now default
to port 3021). This is specific to that one dev machine's process state, not a code or config defect —
noted here for transparency and so a future session on that machine knows to check for and kill any
stray process still holding port 3020 if similar symptoms (ENOENT on `.next/prerender-manifest.json`,
`<Html> should not be imported outside of pages/_document` during build) reappear.
