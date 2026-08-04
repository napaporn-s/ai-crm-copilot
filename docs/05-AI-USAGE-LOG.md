# 05 — AI Usage Log

Per JD Part 3: "a short AI-usage log — sample tasks/prompts, what you reviewed/rejected, and one
meaningful change after human inspection."

## Context

This repository's `AGENT-ROLES.md` and `.env.agent-context` define a 5-agent pipeline (BA → SA → PM →
DEV → QA) intended to be executed by an AI coding agent under human review, with explicit guardrails
("zero assumptions," strict typing, Zod on every boundary, audit logging on every mutation). This
session ran that pipeline end-to-end with Claude Code as the agent, producing the docs, code, and
tests in this repository. The entries below are the real prompts/decisions from that session, not a
reconstructed or idealized version of it.

## Sample tasks / prompts actually used

1. *"Trigger BA Agent: Generate docs/01-REQUIREMENTS-BA.md covering all Part 1, Part 2, and Part 3
   requirements from the JD assignment."* — before writing anything, the agent read the actual JD PDF,
   `AGENT-ROLES.md`, `.env.agent-context`, and the pre-existing `skills/crm-copilot/SKILL.md` rather
   than inventing scope from the prompt alone.
2. Sequential SA/PM prompts building strictly on the prior doc ("Based on docs/01-REQUIREMENTS-BA.md,
   write the complete technical design...").
3. DEV instructions were the SA doc itself (ERD, API contracts, layering) — the agent implemented
   against that design rather than free-styling architecture at code time.
4. QA instructions: write Playwright specs for the JD's three minimum flows plus RBAC coverage, then
   **actually run them against a real Postgres instance**, not just author files that assert nothing
   was ever executed.

## What was reviewed and what was rejected/changed

- **Rejected: trusting "it compiles" as "it works."** After the DEV pass, the agent didn't stop at
  `tsc`/`next build` passing — it stood up a throwaway Postgres container, ran real migrations, seeded
  data at the JD's actual scale (2,000 contacts / 300 leads), and drove the API with `curl` and the UI
  with a real Chrome session before calling anything done.
- **Rejected: the first `lead.repository.ts` implementation.** Manual `curl` testing (not a written
  test — a human-style "let me actually look at the response") surfaced that `owner`/`actor` includes
  were returning full `User` rows, including `passwordHash`, in JSON responses. This was fixed before
  any E2E spec was written, specifically because it's the kind of bug a green test suite can hide if
  no test happens to assert on response *shape* completeness.
- **Rejected: `GET /api/leads` with no RBAC scoping.** While writing the RBAC E2E spec, the agent
  noticed the list endpoint only checked "is there a session," not "does this role scope to their own
  leads" — a Sales Rep could pass `?ownerId=<anyone>` and read team-wide data. Fixed in
  `lead.service.ts#list` before the spec was allowed to pass.
- **Rejected: gating a test-only header on `NODE_ENV !== 'production'`.** This seemed reasonable
  until the E2E setup was changed to run against a production build for stability — at which point the
  hook could never fire, silently disabling the AI-fallback test. Caught by the test actually failing
  (not by inspection), and fixed by switching to an explicit `ALLOW_TEST_HOOKS` flag instead of
  overloading build mode as a proxy for "is this a test run."

## One meaningful change after inspection

The single most consequential catch was the **`passwordHash` leak** above. It shipped in the first
version of every lead-related API response (list, detail) because `include: { owner: true }` is the
natural-looking Prisma call and nothing in the type system flags "this row has a secret field." It was
only caught because the agent chose to manually inspect a raw API response body during verification
instead of trusting the 200 status code — the exact discipline the JD asks for ("verify AI-generated
code before merge, especially around security, data privacy"). The fix (`SAFE_USER_SELECT`, applied
everywhere a `User` relation is included) is now the enforced pattern across the repository, and
`docs/04-TEST-REPORT-QA.md` §3 records it explicitly so it isn't quietly lost.

## What was *not* second-guessed

Business-rule decisions explicitly flagged as BA assumptions (the 3-role RBAC model, the placeholder
"unassigned" company for orphan LINE leads, the scaled representative seed size) were made once,
documented as assumptions in the relevant doc, and not re-litigated — per the JD's own stated
preference for documenting assumptions and moving forward over stalling on ambiguity.
