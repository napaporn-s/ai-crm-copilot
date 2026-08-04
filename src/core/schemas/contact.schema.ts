import { z } from 'zod';

export const CreateContactSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(6).max(30).optional(),
  lineUserId: z.string().max(64).optional(),
});
export type CreateContactInput = z.infer<typeof CreateContactSchema>;

export const ListContactsQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
