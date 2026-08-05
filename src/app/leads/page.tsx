import Link from 'next/link';
import { getSession } from '@/core/auth/get-session';
import { formatDateThai } from '@/lib/format-date';
import { leadService } from '@/core/services/lead.service';
import { NavBar } from '@/components/nav-bar';
import type { LeadStage } from '@prisma/client';

const STAGES: LeadStage[] = ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

const STAGE_COLORS: Record<LeadStage, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  QUALIFIED: 'bg-amber-100 text-amber-800',
  PROPOSAL: 'bg-purple-100 text-purple-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-gray-200 text-gray-600',
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { stage?: string; q?: string; page?: string };
}) {
  const session = await getSession();
  if (!session) return null; // middleware already redirects; defensive fallback

  const page = Number(searchParams.page ?? '1') || 1;
  const stage = STAGES.includes(searchParams.stage as LeadStage) ? (searchParams.stage as LeadStage) : undefined;

  const [items, total] = await leadService.list(
    { stage, q: searchParams.q, page, pageSize: 25 },
    { actorId: session.sub, actorRole: session.role }
  );

  return (
    <div>
      <NavBar userName={session.name} userRole={session.role} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            Pipeline {session.role === 'SALES_REP' ? '— my leads' : '— team'} ({total})
          </h1>
          <Link href="/leads/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">
            + New Lead
          </Link>
        </div>

        <form className="mb-4 flex gap-3" method="get">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search contact or company…"
            className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select name="stage" defaultValue={searchParams.stage ?? ''} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm">Filter</button>
        </form>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:underline">
                      {lead.contact.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.company.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>{lead.stage}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.owner.name}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.source}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDateThai(lead.updatedAt)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No leads match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={`/leads?page=${page - 1}`} className="rounded-md border border-gray-300 px-3 py-1">Previous</Link>
          )}
          <span className="px-3 py-1 text-gray-500">Page {page}</span>
          {page * 25 < total && (
            <Link href={`/leads?page=${page + 1}`} className="rounded-md border border-gray-300 px-3 py-1">Next</Link>
          )}
        </div>
      </main>
    </div>
  );
}
