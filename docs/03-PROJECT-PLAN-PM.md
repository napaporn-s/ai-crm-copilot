# 03 — Project Plan (PM)

**Builds on:** `docs/01-REQUIREMENTS-BA.md` (US-01…US-17, DP-01…DP-08), `docs/02-ARCHITECTURE-SA.md` (API contracts, known risks §8)
**Constraint (JD, verbatim):** "Timebox: 5 working days; recommended maximum 16 focused hours. If
incomplete, submit the working slice and document priorities/trade-offs." This plan is scoped to 16
focused hours spread across up to 5 calendar days — it is not a 5×8h schedule.

---

## 1. 5-Day WBS Execution Schedule

| Day | Focus | Hours | Exit criteria |
|---|---|---|---|
| **Day 1** | Foundation + BA/SA/PM docs (this pipeline) + build-blocker fixes | 3.5h | `docs/01-03` complete; `tsconfig.json`, `package-lock.json`, `prisma` CLI added; `prisma migrate dev` runs cleanly against local Postgres; `AuditLogger` persists to DB (SA §5) |
| **Day 2** | Core CRM vertical slice | 4h | Auth (demo), Company/Contact/Lead CRUD, pipeline stage transitions with terminal-state guard, seed script producing representative contact/lead volume, lead detail page with merged timeline (US-01…US-07) |
| **Day 3** | AI Copilot skill + fallback | 3h | `skills/crm-copilot/SKILL.md` finalized (already drafted), `AiCopilotService` + `LlmProviderAdapter` + `HeuristicFallbackEngine` behind one interface (SA §7), draft/approve/discard flow wired to Activity + AuditLog (US-08…US-11) |
| **Day 4** | LINE OA integration | 3h | Webhook route with raw-body HMAC verification, idempotent inbound persistence, `MockLineAdapter` for local/CI + real adapter behind env flag, outbound send + failure surfacing (US-12…US-15) |
| **Day 5** | QA, security pass, deploy, handover | 2.5h | 4 Playwright specs (§2 below) green, README + architecture diagram + `.env.example` + AI-usage log + known-limitations section, deployed demo URL, walkthrough video recorded |
| **Total** | | **16h** | |

**Sequencing rule:** each day's exit criteria is a hard gate for the next — e.g., Day 3 does not start
until AuditLog persistence (Day 1) is real, because AI-suggestion Activities and audit rows are
asserted together in QA (Day 5). If a day overruns, the JD's own guidance applies: submit the working
slice and document what was cut, rather than silently descoping without a note.

---

## 2. Requirements Traceability Matrix

Requirement ID → API Endpoint → Playwright Test ID. Every BA requirement (`01-REQUIREMENTS-BA.md`)
must appear here; anything without a row is either UI-only (covered by manual verification, noted) or
a gap to flag before Day 5.

| Req ID | Requirement (short) | API Endpoint(s) | Test ID |
|---|---|---|---|
| US-01 | Login / reject invalid creds | `POST /api/auth/login` | E2E-01 |
| US-02 | Create Company/Contact + validation | `POST /api/companies`, `POST /api/contacts` | E2E-01 |
| US-03 | Create Lead, any source | `POST /api/leads` | E2E-01 |
| US-04 | Stage transition + terminal guard | `PATCH /api/leads/:id/stage` | E2E-01, E2E-04 |
| US-05 | Lead detail merged timeline | `GET /api/leads/:id` | E2E-01 (manual UI check) |
| US-06 | Search & filter, paginated | `GET /api/leads`, `GET /api/contacts` | Manual verification (perf note in QA report) |
| US-07 | Durability across restart | n/a (DB-backed by construction) | E2E-01 (reload assertion) |
| US-08 | AI analysis happy path | `POST /api/leads/:id/ai-copilot` | E2E-02 |
| US-09 | Approve/discard AI draft | `POST .../approve`, `POST .../discard` | E2E-02 |
| US-10 | AI fallback on LLM failure | `POST /api/leads/:id/ai-copilot` (mocked failure) | E2E-02 |
| US-11 | Malformed AI request rejected | `POST /api/leads/:id/ai-copilot` | E2E-02 |
| US-12 | Inbound LINE, signature verified | `POST /api/line/webhook` | E2E-03 |
| US-13 | Idempotent redelivery | `POST /api/line/webhook` | E2E-03 |
| US-14 | Outbound LINE send | `POST .../approve` | E2E-02 (shared flow) |
| US-15 | LINE service unavailable, surfaced | `POST .../approve` (mocked failure) | E2E-03 |
| US-16 | AuditLog written, append-only | all mutating routes | E2E-01, E2E-02, E2E-03 (each asserts a resulting audit row) |
| US-17 | No secrets in repo/history | n/a — repo hygiene | Manual check (QA report, not a Playwright spec) |
| DP-01…DP-08 | Privacy/audit requirements | see BA §5 | Covered across E2E-01/02/03 per row above + E2E-04 for RBAC (DP not separately listed here to avoid duplicate rows — see BA §5 for the canonical table) |
| RBAC §4 | Unauthorized access rejected | `PATCH /api/leads/:id/owner`, terminal reopen, `GET /api/audit-logs` | E2E-04 |

### 2.1 Test spec inventory (`e2e/`, QA Agent Step 5)
| Test ID | File | Covers |
|---|---|---|
| E2E-01 | `e2e/core-crm-flow.spec.ts` | Login → create company/contact/lead → move stage → reload → audit row exists |
| E2E-02 | `e2e/ai-copilot-fallback.spec.ts` | Happy-path AI request, malformed request (400), mocked LLM failure → heuristic fallback response + `isFallback: true` |
| E2E-03 | `e2e/line-webhook-security.spec.ts` | Missing/invalid signature → 401; valid signature → 200 + persisted; duplicate `webhookEventId` → no duplicate row |
| E2E-04 | `e2e/rbac-violations.spec.ts` | Sales Rep blocked from owner-reassign and terminal-stage reopen; Sales Rep blocked from `/api/audit-logs` |

This satisfies the JD's minimum ("one core CRM flow, one AI skill/fallback, one LINE webhook
security/idempotency flow") with E2E-01/02/03, plus E2E-04 to make the RBAC matrix (BA §4) and the
"Unauthorized Access Attempt Assertions" directive in `AGENT-ROLES.md` verifiable rather than just
documented.

---

## 3. Risk Register & Mitigation Strategies

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | 16h budget overrun given 5 sequential domains (CRM, AI, LINE, security, QA) | High | Schedule slip | Day-gated WBS above; if a day overruns, cut scope inside that day first (e.g., skip owner-reassign UI, keep API+test), never skip the audit/security controls |
| R2 | LINE webhook needs a public HTTPS URL to receive real events during dev | Medium | Blocks manual verification of US-12 | Use a tunnel (matches existing personal infra pattern) only for manual demo; automated tests (E2E-03) hit the route handler directly/mocked, so CI never depends on a live tunnel |
| R3 | Real LLM provider adds cost, latency, and nondeterminism to tests | Medium | Flaky/slow CI | `AiCopilotEngine` interface (SA §7) lets E2E-02 inject a mock/deterministic engine; real provider only exercised manually for the walkthrough video |
| R4 | AuditLog write failure could either silently lose an audit row or block a legitimate business write | Medium | Compliance gap or availability loss | Documented trade-off already made in SA §5 (write proceeds, failure logged) — flagged as a known limitation, not silently accepted |
| R5 | Committing a real LINE Channel Secret or DB URL by accident | Low likelihood, high impact | Credential leak | `.env.example` only in git; `.gitignore` covers `.env*` except `.env.example`; QA report includes an explicit repo-secret-scan check before submission |
| R6 | RBAC role model (BA §1.5) is a documented assumption, not JD-confirmed | Medium | Reviewer disagrees with role split | Explicitly flagged as an assumption in BA doc and this plan — cheap to simplify to a single role later since it's isolated to the Service-layer guard functions |
| R7 | Seed data volume (~2,000 contacts / ~300 leads) takes real time to generate realistically | Low | Search/filter demo looks trivial on tiny dataset | Seed script uses a deterministic faker-style generator seeded once; documented in README if scaled down for time |

---

## 4. Definition of Done (DoD) — Quality Checklist

A day/task is not "done" until all applicable items below are true:

**Build & type safety**
- [ ] `npm run type-check` passes with strict mode, zero `any`
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `prisma migrate dev` / `prisma generate` run cleanly from a fresh clone

**Correctness**
- [ ] Every mutating API route validates input/output with Zod (`.env.agent-context` §1)
- [ ] Every mutating API route calls `AuditLogger.log()` and the row is verifiable in the DB (not just console)
- [ ] Terminal Lead stages (`WON`/`LOST`) cannot be reopened by a non-Admin (server-enforced)
- [ ] LINE webhook rejects any request with a missing/invalid `X-Line-Signature`
- [ ] Duplicate LINE `webhookEventId` never produces a duplicate `Message` row

**Security**
- [ ] No secret values (LINE Channel Secret, DB URL, AI API key) present anywhere in git history
- [ ] Passwords hashed, never logged in plaintext
- [ ] PII redacted before any payload leaves the process toward an LLM provider or a log line

**Testing**
- [ ] E2E-01, E2E-02, E2E-03 pass locally (JD minimum)
- [ ] E2E-04 passes (RBAC coverage beyond JD minimum, per `AGENT-ROLES.md` QA directive)

**Handover (Part 3)**
- [ ] README: setup, run, deploy, demo credentials
- [ ] Architecture + data-flow diagram present (this doc + SA doc's mermaid diagrams satisfy this)
- [ ] `.env.example` complete and secret-free
- [ ] Known limitations + production next-steps section written
- [ ] AI-usage log written: sample prompts, what was reviewed/rejected, one concrete human-driven change
- [ ] Deployed URL + demo credentials + LINE OA test instructions/QR recorded
- [ ] 3–5 minute walkthrough video recorded

---

*Next: `docs/04-TEST-REPORT-QA.md` + `e2e/` (QA Agent) — implemented after DEV Agent (Step 4) delivers
the code this plan and the SA doc describe.*
