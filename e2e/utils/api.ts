import type { APIRequestContext } from '@playwright/test';

export const DEMO_PASSWORD = 'Passw0rd!';

export async function login(request: APIRequestContext, email: string, password = DEMO_PASSWORD) {
  const res = await request.post('/api/auth/login', { data: { email, password } });
  return res;
}

export async function createCompany(request: APIRequestContext, name: string) {
  const res = await request.post('/api/companies', { data: { name, industry: 'Technology' } });
  const body = await res.json();
  return body.data as { id: string; name: string };
}

export async function createContact(request: APIRequestContext, companyId: string, name: string) {
  const res = await request.post('/api/contacts', { data: { companyId, name } });
  const body = await res.json();
  return body.data.contact as { id: string; name: string; companyId: string };
}

export async function createLead(
  request: APIRequestContext,
  params: { contactId: string; companyId: string; source?: 'MANUAL' | 'WEBSITE' | 'LINE' }
) {
  const res = await request.post('/api/leads', {
    data: { contactId: params.contactId, companyId: params.companyId, source: params.source ?? 'MANUAL' },
  });
  const body = await res.json();
  return body.data as { id: string; ownerId: string; stage: string };
}
