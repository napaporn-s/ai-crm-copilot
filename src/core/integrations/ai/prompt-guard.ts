import type { AiCopilotContext } from '@/core/integrations/ai/types';

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
  /disregard\s+(the\s+)?(above|previous|prior)/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+(if\s+you\s+are\s+|a\s+)?/gi,
  /new\s+instructions?\s*:/gi,
  /system\s*:/gi,
  /assistant\s*:/gi,
  /^###/gm,
  /reveal\s+(your\s+)?(the\s+)?system\s+prompt/gi,
  /(repeat|print|show)\s+(your\s+|the\s+)?(system\s+)?(instructions?|prompt)/gi,
];

function sanitizeText(text: string): string {
  return INJECTION_PATTERNS.reduce((acc, re) => acc.replace(re, '[FILTERED]'), text);
}

/**
 * Neutralizes common prompt-injection phrasing in customer-supplied free text
 * before it reaches the LLM's user payload (SA security review — untrusted
 * LINE message content). Defense-in-depth only, not an exhaustive classifier.
 */
export function sanitizePromptInjection(context: AiCopilotContext): AiCopilotContext {
  return {
    ...context,
    scopeNotes: context.scopeNotes ? sanitizeText(context.scopeNotes) : null,
    messages: context.messages.map((m) => ({ ...m, content: sanitizeText(m.content) })),
  };
}
