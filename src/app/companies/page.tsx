import { getSession } from '@/core/auth/get-session';
import { companyService } from '@/core/services/company.service';
import { NavBar } from '@/components/nav-bar';
import { CreateCompanyForm } from '@/components/create-company-form';

export default async function CompaniesPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const session = await getSession();
  if (!session) return null;

  const page = Number(searchParams.page ?? '1') || 1;
  const [items, total] = await companyService.list({ q: searchParams.q, page, pageSize: 25 });

  return (
    <div>
      <NavBar userName={session.name} userRole={session.role} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-4 text-lg font-semibold">Companies ({total})</h1>
        <div className="mb-6"><CreateCompanyForm /></div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Industry</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => (
                <tr key={c.id}><td className="px-4 py-3">{c.name}</td><td className="px-4 py-3 text-gray-600">{c.industry ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
