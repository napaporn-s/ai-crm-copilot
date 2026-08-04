# ENTERPRISE PROJECT STRUCTURE BLUEPRINT

```text
JENOSIZE/
├── .github/
│   └── workflows/
│       └── ci-cd-playwright.yml    # Pipeline: Lint -> TypeCheck -> Playwright E2E -> Build
├── docs/                           # Enterprise Compliance & Audit Artifacts
│   ├── 01-REQUIREMENTS-BA.md       # Functional Specs, RBAC Matrix & Edge Cases
│   ├── 02-ARCHITECTURE-SA.md       # Layered Architecture, ERD & Zod Schemas
│   ├── 03-PROJECT-PLAN-PM.md       # 5-Day WBS Execution & Traceability Matrix
│   └── 04-TEST-REPORT-QA.md        # Playwright Automated E2E Execution Report
├── e2e/                            # Playwright E2E Automation Suite
│   ├── auth.spec.ts                # Authentication & Access Control Tests
│   ├── feature.spec.ts             # Core Business Journey Tests
│   └── audit.spec.ts              # Audit Log Recording Assertions
├── src/                            # Production Clean Architecture
│   ├── app/                        # Next.js App Router (BFF & Routing)
│   │   ├── api/                    # Route Handlers (Strict Zod Validated)
│   │   │   ├── health/             # Zero Downtime Health Probe
│   │   │   └── v1/
│   │   └── (dashboard)/            # User Interfaces
│   ├── core/                       # Core Enterprise Infrastructure
│   │   ├── audit/                  # Immutable Audit Logger Engine
│   │   ├── security/               # Middleware, Rate Limiter & CSP Headers
│   │   └── errors/                 # Standardized Exception Classes
│   ├── modules/                    # Domain-Driven Modules
│   │   └── [feature]/
│   │       ├── components/
│   │       ├── services/
│   │       ├── repository/
│   │       └── schemas/
│   └── lib/                        # Database Pool & Redis Client Instances
├── .env.agent-context              # Global Context Constraints for AI
├── AGENT-ROLES.md                  # AI Prompt Governance Suite
├── Dockerfile                      # Multi-stage Docker Build for Zero Downtime
├── docker-compose.yml              # Sandbox Environment Configuration
├── next.config.js                  # Security Headers & Hardening
├── playwright.config.ts            # Playwright Test Runner Config
├── README.md                       # Master Delivery Document
└── STRUCTURE.md                    # Project Architecture Blueprint