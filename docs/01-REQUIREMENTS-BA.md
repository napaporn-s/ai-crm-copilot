# 01 — Business Requirements (BA)

**Project:** Jenosize AI CRM MVP — Recruitment Test Assignment (Lead AI Software Engineer)
**Source:** `JD-Assignment-Lead-AI-Software-Engineer-candidate V.2.pdf` (Parts 1–3), `.env.agent-context`
**Status:** Draft for SA/PM handoff — non-negotiable constraints below are quoted from the JD, not invented.

---

## 1. Business Goals & Functional Scope

### 1.1 Problem statement
Jenosize's internal 20-person commercial team manages ~2,000 contacts and ~300 active leads.
Leads arrive from three unreconciled sources — website, manual entry, LINE OA — and follow-ups are
fragmented across chat, spreadsheets, and personal notes. There is no single system of record, no
audit trail for outbound communication, and no reusable way to get a fast read on a lead.

### 1.2 Goal
Deliver a coherent, deployed **vertical slice** (not production-complete) that lets a salesperson:
1. See a lead's profile and full timeline (activities + conversation) in one place.
2. Move a lead through a fixed pipeline: **New → Qualified → Proposal → Won / Lost**.
3. Ask an AI Copilot for a summary, qualification score, and next-best action on demand.
4. Draft or approve a LINE reply without ever losing the audit trail of who did what, when.

### 1.3 In scope (JD Parts 1–3)

| # | Scope item | JD weight |
|---|---|---|
| 1 | Responsive CRM website: auth, Company/Contact/Lead CRUD, pipeline stage updates, search/filter, lead detail page with activity + conversation timeline | Part 1 — 50% |
| 2 | REST API + relational DB (Prisma) for Users, Companies, Contacts, Leads/Deals, Activities, Messages, AuditLogs — schema, migrations, seed data, validation, constraints | Part 1 — 50% |
| 3 | Deployed demo; core flow survives refresh/restart; no in-memory-only state | Part 1 — 50% |
| 4 | `skills/crm-copilot/SKILL.md`: purpose, inputs, outputs, guardrails, fallback, ≥5 eval cases | Part 2 — 30% |
| 5 | AI Copilot: lead summary, qualification score + reasoning, next-best action, draft LINE reply — kept as **drafts** until human approval | Part 2 — 30% |
| 6 | LINE OA webhook: signature verification, inbound capture, LINE-user↔CRM-contact mapping, event persistence, reply/approval flow, retry/idempotency, mock adapter for local tests | Part 2 — 30% |
| 7 | README, architecture/data-flow diagram, API notes, `.env.example`, trade-offs, known limitations, next steps | Part 3 — 20% |
| 8 | Automated tests: 1 core CRM flow, 1 AI skill/fallback, 1 LINE webhook security/idempotency flow; structured logging/monitoring notes | Part 3 — 20% |
| 9 | AI-usage log (sample prompts, what was reviewed/rejected, one meaningful human-driven change) | Part 3 — 20% |

### 1.4 Explicitly out of scope
- Production-grade multi-tenant hosting, billing, or SSO.
- Real client/PII data — **synthetic data only**, own LINE OA **test** account only.
- Fully autonomous AI actions — AI **must never** write to the DB or send a LINE message without a
  human confirming (JD Part 2, `SKILL.md` §4 guardrails).
- Anything beyond the fixed 5-stage pipeline (no custom pipelines/workflows).

### 1.5 Documented assumption
The JD only names "salesperson" and "20-person commercial team" — it does not define a role
hierarchy. Per the JD's own preferred trait ("does not wait for perfect specs... documents
assumptions and moves forward"), BA assumes a minimal 3-role model (Admin / Sales Manager / Sales
Rep) sized for a 20-person team, detailed in §4. This is a BA-derived assumption, not a stated JD
requirement, and should be confirmed with a real stakeholder before this were a paid engagement.

---

## 2. User Stories (Given–When–Then)

### 2.1 Core CRM (Part 1)

**US-01 — Authenticate**
> Given a demo user account exists,
> When the user submits valid credentials on the login page,
> Then they receive a session and land on the pipeline dashboard.
> Given invalid credentials, Then the login is rejected with a generic error (no user-enumeration).

**US-02 — Create/view Company and Contact**
> Given a logged-in Sales Rep,
> When they create a Company and add a Contact under it with valid fields,
> Then the Contact is persisted, linked to the Company, and visible in search.
> Given a required field is missing/malformed, Then the API rejects with a Zod validation error and
> the form surfaces field-level messages.

**US-03 — Create a Lead from any source**
> Given a Contact exists,
> When a Lead is created manually, imported from "website" seed data, or created from an inbound
> LINE message,
> Then the Lead starts in stage `NEW`, is linked to Contact + Company, and records its `source`.

**US-04 — Move a Lead through the pipeline**
> Given a Lead in stage `NEW`,
> When the Sales Rep transitions it to `QUALIFIED`, `PROPOSAL`, `WON`, or `LOST`,
> Then the stage change is persisted, timestamped, attributed to the acting user, and appended to
> the Lead's Activity timeline — and an AuditLog entry is written (state-changing action).
> Given an attempt to move a `WON` or `LOST` Lead to any other stage,
> Then the API rejects the transition (terminal states are immutable) unless the actor is Admin.

**US-05 — Lead detail page: timeline**
> Given a Lead with prior Activities and Messages,
> When the Sales Rep opens the Lead detail page,
> Then Activities (stage changes, notes, AI actions) and Messages (LINE in/out) render merged in
> chronological order.

**US-06 — Search & filter**
> Given ≥300 seeded leads,
> When the Sales Rep filters by stage, owner, or searches by contact/company name,
> Then results return correctly scoped and paginated, with no full-table client-side dump.

**US-07 — Durability**
> Given the app/server restarts or the browser is refreshed mid-session,
> When the Sales Rep reloads the Lead detail page,
> Then all previously saved data (leads, stages, messages, activities) is still present — nothing lived
> only in server memory or client state.

### 2.2 AI Copilot (Part 2)

**US-08 — Request AI analysis**
> Given a Lead with profile + conversation history + activity log,
> When the Sales Rep clicks "Ask AI Copilot",
> Then the response contains: a ≤3-bullet summary, a 0–100 qualification score with explicit
> reasoning, one specific next-best action, and a draft LINE reply ≤200 characters — all rendered as
> a **draft**, not auto-applied.

**US-09 — Approve or discard an AI suggestion**
> Given an AI-drafted LINE reply,
> When the Sales Rep clicks "Approve & Send",
> Then the message is sent via the LINE adapter, persisted as an outbound Message, and logged in
> AuditLog as a human-approved send.
> Given the Sales Rep clicks "Discard", Then nothing is sent and nothing is written except the fact
> that a suggestion was generated and discarded (for audit completeness).

**US-10 — AI service degraded**
> Given the LLM provider times out or returns 5xx/429,
> When the Sales Rep requests AI analysis,
> Then the system falls back to the rule-based heuristic (score 50, "Manual review required..."
> action, default Thai draft reply per `SKILL.md` §5) and clearly labels the result as a fallback, not
> an AI-generated answer.

**US-11 — Malformed AI request**
> Given a request payload missing required Lead context fields,
> When it hits the AI Copilot endpoint,
> Then it is rejected by Zod validation with a 400 and a structured error — the request never reaches
> the LLM provider.

### 2.3 LINE OA Integration (Part 2)

**US-12 — Inbound LINE message**
> Given a message sent from a real LINE user to the connected test OA,
> When the webhook receives the event,
> Then the system verifies `X-Line-Signature` against the Channel Secret **before** touching the
> payload; on success it maps the LINE `userId` to an existing or newly-created Contact/Lead and
> persists the Message.
> Given the signature is missing or invalid, Then the request is rejected (401/403) and nothing is
> persisted.

**US-13 — Idempotent redelivery**
> Given LINE redelivers the same webhook event (same event/message ID) after a slow/failed ack,
> When the webhook handler processes it again,
> Then the event is recognized as a duplicate and is not persisted twice, and no duplicate outbound
> action is triggered.

**US-14 — Send/approve outbound LINE reply**
> Given an approved draft (US-09) or a manual reply typed by the Sales Rep,
> When it is sent,
> Then it goes through the LINE adapter (real or mock), persists as an outbound Message, and is
> attributed + audit-logged.

**US-15 — LINE service unavailable**
> Given the LINE Messaging API is unreachable or errors,
> When an outbound send is attempted,
> Then the failure is surfaced to the Sales Rep (not silently swallowed), the message is left in a
> `FAILED` or `PENDING_RETRY` state, and no false "sent" confirmation is shown.

### 2.4 Governance / Handover (Part 3)

**US-16 — Audit trail is immutable**
> Given any state-changing API call (POST/PUT/PATCH/DELETE),
> When it completes (success or failure),
> Then an AuditLog row is written recording actor, action, entity, before/after where applicable, and
> timestamp — and AuditLog rows are never updated or deleted by application code.

**US-17 — Secrets hygiene**
> Given the repository is shared/submitted,
> When it is inspected,
> Then no real LINE Channel Secret, API key, or credential exists in git history — only
> `.env.example` with placeholder keys.

---

## 3. Detailed Business Rules & Edge Cases

### 3.1 Pipeline / Lead rules
- Fixed stage set: `NEW, QUALIFIED, PROPOSAL, WON, LOST`. No custom stages (JD does not request a
  configurable pipeline).
- `WON` and `LOST` are terminal. A non-Admin cannot reopen a terminal Lead — this protects reporting
  integrity for a 300-lead active pipeline.
- Every Lead must have exactly one owning Sales Rep (`ownerId`) at all times, defaulting to the
  creator; reassignment is an explicit action, not a side effect.
- A Lead's `source` is one of `WEBSITE, MANUAL, LINE` and is immutable after creation (it is
  provenance, not a workflow field).
- Deleting a Lead/Contact/Company is **soft-delete only** (audit trail requirement, §5) — hard delete
  is not exposed via API.

### 3.2 Contact/Company rules
- A Contact must belong to exactly one Company (MVP simplification; JD scenario implies B2B
  commercial accounts, not individual consumer leads).
- Duplicate Contact detection: same normalized phone or LINE `userId` on create → surfaced as a
  warning with a link to the existing record, not a hard block (avoids losing a real inbound lead over
  a false-positive duplicate).

### 3.3 AI Copilot rules (mirrors `skills/crm-copilot/SKILL.md`, restated for BA traceability)
- AI output is **always** a draft: qualification score, summary, next-best-action, and draft reply are
  stored/rendered as suggestions with a `status: DRAFT` until a human approves.
- AI must never be the actor of record for a DB write or an outbound send — the AuditLog actor is
  always the approving human user, with a `viaAI: true` flag for traceability.
- PII (name, phone, LINE userId) must be redacted/masked in any payload sent to the LLM provider,
  per `.env.agent-context` §2 and `SKILL.md` §4.
- On LLM failure (timeout/5xx/429), fallback to the deterministic heuristic — this is a business
  continuity requirement, not optional polish, because sales activity must not stall on a third-party
  outage.

### 3.4 LINE webhook rules
- Every inbound webhook call is authenticated by HMAC signature check against the Channel Secret
  before any parsing/business logic runs (fail closed).
- Idempotency key = LINE's `webhookEventId` (or message ID where absent); a unique DB constraint
  enforces this rather than relying on best-effort in-memory dedup.
- A first-time LINE `userId` with no matching Contact auto-creates a minimal Contact + Lead
  (`source: LINE`, stage `NEW`) so no inbound lead is silently dropped.
- Outbound send failures are retryable but must not auto-retry indefinitely without limit (bounded
  retry, then `FAILED` state surfaced to the user) — prevents silent message loss and prevents a
  retry storm against LINE's API.

### 3.5 Data integrity edge cases
- Seed data must be sufficient to exercise the ~2,000 contact / ~300 lead scale described in the
  scenario (or a clearly documented representative subset, given the 16-hour timebox) so
  search/filter/pagination are demonstrably real, not trivially fast on 10 rows.
- All monetary/budget fields (if modeled) use integer minor units, never floats, to avoid rounding
  drift in reporting.

---

## 4. Role-Based Access Control (RBAC) Matrix

*BA-derived per the documented assumption in §1.5 — not a literal JD requirement, but necessary to
give the AuditLogger and API contracts a concrete authorization model.*

| Capability | Sales Rep | Sales Manager | Admin |
|---|---|---|---|
| View own Leads/Contacts | ✅ | ✅ | ✅ |
| View all Leads/Contacts (team-wide) | ❌ | ✅ | ✅ |
| Create Company/Contact/Lead | ✅ | ✅ | ✅ |
| Move own Lead through pipeline (non-terminal) | ✅ | ✅ | ✅ |
| Reopen a `WON`/`LOST` Lead | ❌ | ❌ | ✅ |
| Reassign Lead owner | ❌ | ✅ | ✅ |
| Request AI Copilot analysis | ✅ | ✅ | ✅ |
| Approve & send LINE reply | ✅ (own leads) | ✅ (any lead) | ✅ |
| View AuditLog | ❌ | ✅ (team scope) | ✅ (full) |
| Manage Users | ❌ | ❌ | ✅ |
| Soft-delete Company/Contact/Lead | ❌ | ✅ | ✅ |

Enforcement point: middleware/service layer on every API route (see SA doc for layering) — never
trusted from the client.

---

## 5. Data Privacy & Audit Compliance Requirements

Directly sourced from `.env.agent-context` §2 and JD Part 2/3 — restated here as BA-owned
acceptance criteria so SA/DEV/QA can trace back to a single requirement ID.

| ID | Requirement | Source |
|---|---|---|
| DP-01 | All state-changing APIs (POST/PUT/PATCH/DELETE) invoke `AuditLogger.log()` synchronously as part of the request, not fire-and-forget | `.env.agent-context` §2 |
| DP-02 | AuditLog entries are append-only (no UPDATE/DELETE path in application code) | JD Part 3 "audit trail" + US-16 |
| DP-03 | LINE inbound webhook verifies `X-Line-Signature` using the Channel Secret before processing payload | `.env.agent-context` §2, US-12 |
| DP-04 | LINE inbound events are deduplicated by event ID (idempotency) | `.env.agent-context` §2, US-13 |
| DP-05 | PII/secrets are redacted/masked before being logged or sent to any AI provider | `.env.agent-context` §2 |
| DP-06 | No real secrets committed to the repo; `.env.example` uses placeholders only | JD Part 3, US-17 |
| DP-07 | Only synthetic data and the developer's own LINE OA test account are used — no real client data | JD "Assignment Scenario" |
| DP-08 | AI suggestions are separated from confirmed DB writes/outbound sends; human approval is the audited action | JD Part 2, US-09 |

---

## 6. Acceptance Criteria Summary (traceable to PM's matrix in `03-PROJECT-PLAN-PM.md`)

A build is considered "done" for BA purposes when:
1. Every user story in §2 has a corresponding API endpoint and, where listed in §1.3 item 8, a
   passing automated test.
2. Every rule in §3 is enforced server-side (not just UI-hidden).
3. The RBAC matrix in §4 is enforced at the API layer with a documented negative test (unauthorized
   access attempt → rejected).
4. Every requirement in §5 has a visible implementation artifact (code + one passing test or a
   manual verification note in the QA report).

---

*Next: `docs/02-ARCHITECTURE-SA.md` (SA Agent) — layered architecture, ERD, API contracts, security
controls, audit log schema — built on top of this document.*
