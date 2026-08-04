import type { AiCopilotContext } from '@/core/integrations/ai/types';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d[\d\-\s]{6,}\d)/g;

function redactText(text: string): string {
  return text.replace(EMAIL_RE, '[EMAIL]').replace(PHONE_RE, '[PHONE]');
}

/**
 * PII/secret redaction before any payload leaves the process toward an LLM
 * provider (DP-05). Contact name is reduced to first name only; email/phone
 * patterns inside free-text (notes, messages) are masked.
 */
export function redactContextForAi(context: AiCopilotContext): AiCopilotContext {
  const firstName = context.contactName.split(' ')[0] ?? context.contactName;
  return {
    ...context,
    contactName: firstName,
    scopeNotes: context.scopeNotes ? redactText(context.scopeNotes) : null,
    messages: context.messages.map((m) => ({ ...m, content: redactText(m.content) })),
  };
}
