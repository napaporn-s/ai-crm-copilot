import { z } from 'zod';

export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(120).optional(),
  website: z.string().url().max(300).optional(),
});
export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;

export const ListCompaniesQuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
