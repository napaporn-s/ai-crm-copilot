# AI CRM Copilot Skill Spec

## 1. Purpose
Provide intelligent analysis, lead qualification, next-best action recommendations, and draft LINE messaging responses for sales agents managing CRM leads.

## 2. Inputs
- Lead Profile (Name, Company, Current Stage, Budget, Scope)
- Conversation History (Inbound/Outbound LINE Messages, Call Notes)
- Activity Logs

## 3. Outputs
- Lead Summary (Max 3 bullet points)
- Qualification Score (0-100) with explicit reasoning
- Next-Best Action (Specific, actionable step for salesperson)
- Draft LINE Reply (Contextual, professional, within 200 characters)

## 4. Allowed Actions & Guardrails
- MUST NOT execute automated database writes directly without human agent approval.
- MUST NOT send outbound LINE messages without explicit salesperson confirmation.
- MUST redact PII, tokens, and credentials from LLM prompt context.

## 5. Failure Behavior & Fallbacks
- If LLM API times out or fails (5xx/429), fallback to Rule-Based Heuristic Engine:
  - Default Score: 50
  - Default Action: "Manual review required due to AI service unavailability."
  - Default Draft Reply: "ขอบคุณที่ติดต่อสอบถามเข้ามาครับ ทางเจ้าหน้าที่จะรีบตรวจสอบและติดต่อกลับโดยเร็วที่สุดครับ"

## 6. Evaluation Cases (5 Test Cases)
1. Happy Path - Complete lead context -> Returns score, summary, action, draft reply.
2. Missing History - New lead with no messages -> Returns low confidence score and asks for qualification call.
3. High Intent - User asks for pricing/quotation -> Scores >80, suggests sending proposal draft.
4. LLM Service Down - API Timeout/500 -> Triggers Fallback Heuristic Engine gracefully.
5. Malformed Input - Invalid JSON/Payload -> Rejects safely with Zod validation error response.
