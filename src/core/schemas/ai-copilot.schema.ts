import { z } from 'zod';

/** Output contract shared by the real LLM path and the heuristic fallback (SA §7). */
export const AiCopilotResultSchema = z.object({
  summary: z.array(z.string().min(1)).max(3),
  qualificationScore: z.number().int().min(0).max(100),
  scoreReasoning: z.string().min(1).max(1000),
  nextBestAction: z.string().min(1).max(500),
  draftLineReply: z.string().min(1).max(200),
  isFallback: z.boolean(),
});
export type AiCopilotResult = z.infer<typeof AiCopilotResultSchema>;
