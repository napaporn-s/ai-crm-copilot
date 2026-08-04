import { getSession } from '@/core/auth/get-session';
import { contactService } from '@/core/services/contact.service';
import { NavBar } from '@/components/nav-bar';
import { CreateContactForm } from '@/components/create-contact-form';

export default async function ContactsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const session = await getSession();
  if (!session) return null;

  const page = Number(searchParams.page ?? '1') || 1;
  const [items, total] = await contactService.list({ q: searchParams.q, page, pageSize: 25 });

  return (
    <div>
      <NavBar userName={session.name} userRole={session.role} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-4 text-lg font-semibold">Contacts ({total})</h1>
        <div className="mb-6"><CreateContactForm /></div>
        <form className="mb-4" method="get">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search contact name…"
            className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </form>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
