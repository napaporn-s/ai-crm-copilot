import { z } from 'zod';

export const LineWebhookEventSchema = z.object({
  destination: z.string(),
  events: z.array(
    z.object({
      type: z.string(),
      webhookEventId: z.string().min(1),
      source: z.object({
        userId: z.string().min(1),
        type: z.literal('user'),
      }),
      message: z
        .object({
          id: z.string(),
          type: z.literal('text'),
          text: z.string(),
        })
        .optional(),
      replyToken: z.string().optional(),
      timestamp: z.number(),
    })
  ),
});
export type LineWebhookEvent = z.infer<typeof LineWebhookEventSchema>;
