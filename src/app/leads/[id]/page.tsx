import { getSession } from '@/core/auth/get-session';
import { formatDateThai } from '@/lib/format-date';
import { leadService } from '@/core/services/lead.service';
import { NavBar } from '@/components/nav-bar';
import { StageControl } from '@/components/stage-control';
import { AiCopilotPanel } from '@/components/ai-copilot-panel';
import { ReassignOwnerControl } from '@/components/reassign-owner-control';
import { NotFoundError, ForbiddenError } from '@/core/errors/app-errors';

interface AiSuggestionPayload {
  status: 'DRAFT' | 'APPROVED' | 'DISCARDED';
  summary: string[];
  qualificationScore: number;
  nextBestAction: string;
  draftLineReply: string;
  isFallback: boolean;
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return null;

  let lead;
  try {
    lead = await leadService.getDetail(params.id, { actorId: session.sub, actorRole: session.role });
  } catch (err) {
    const message = err instanceof NotFoundError ? 'Lead not found.' : err instanceof ForbiddenError ? 'You do not have access to this lead.' : 'Something went wrong.';
    return (
      <div>
        <NavBar userName={session.name} userRole={session.role} />
        <main className="mx-auto max-w-3xl px-6 py-8"><p className="text-sm text-red-600">{message}</p></main>
      </div>
    );
  }

  type TimelineEntry =
    | { kind: 'activity'; id: string; createdAt: Date; type: string; actor: string; payload: unknown }
    | { kind: 'message'; id: string; createdAt: Date; direction: string; content: string; status: string };

  const timeline: TimelineEntry[] = [
    ...lead.activities.map((a) => ({
      kind: 'activity' as const,
      id: a.id,
      createdAt: a.createdAt,
      type: a.type,
      actor: a.actor.name,
      payload: a.payload,
    })),
    ...lead.messages.map((m) => ({
      kind: 'message' as const,
      id: m.id,
      createdAt: m.createdAt,
      direction: m.direction,
      content: m.content,
      status: m.status,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const canReassign = session.role === 'SALES_MANAGER' || session.role === 'ADMIN';

  return (
    <div>
      <NavBar userName={session.name} userRole={session.role} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold">{lead.contact.name}</h1>
              <p className="text-sm text-gray-500">{lead.company.name} · source {lead.source}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Owner: {lead.owner.name}</p>
              {lead.aiScore !== null && <p>AI score: {lead.aiScore}/100</p>}
            </div>
          </div>
          <div className="mt-4">
            <StageControl leadId={lead.id} currentStage={lead.stage} />
          </div>
          {canReassign && (
            <div className="mt-3">
              <ReassignOwnerControl leadId={lead.id} currentOwnerId={lead.ownerId} />
            </div>
          )}
          {lead.budget !== null && <p className="mt-3 text-sm text-gray-600">Budget: ฿{lead.budget.toLocaleString()}</p>}
          {lead.scopeNotes && <p className="mt-1 text-sm text-gray-600">{lead.scopeNotes}</p>}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AiCopilotPanel leadId={lead.id} />

          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
            <ol className="space-y-3">
              {timeline.map((entry) => (
                <li key={entry.id} className="border-l-2 border-gray-200 pl-3 text-sm">
                  <p className="text-xs text-gray-400">{formatDateThai(entry.createdAt)}</p>
                  {entry.kind === 'activity' ? (
                    <ActivityLine type={entry.type} actor={entry.actor} payload={entry.payload} />
                  ) : (
                    <p>
                      <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${entry.direction === 'INBOUND' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {entry.direction === 'INBOUND' ? 'LINE in' : 'LINE out'}
                      </span>
                      {entry.content}
                      {entry.status === 'FAILED' && <span className="ml-2 text-xs text-red-600">(failed to send)</span>}
                    </p>
                  )}
                </li>
              ))}
              {timeline.length === 0 && <p className="text-sm text-gray-400">No activity yet.</p>}
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}

function ActivityLine({ type, actor, payload }: { type: string; actor: string; payload: unknown }) {
  if (type === 'STAGE_CHANGE') {
    const p = payload as { fromStage: string; toStage: string };
    return <p><strong>{actor}</strong> moved stage {p.fromStage} → {p.toStage}</p>;
  }
  if (type === 'AI_SUGGESTION') {
    const p = payload as AiSuggestionPayload;
    return (
      <p>
        <strong>AI Copilot</strong> suggested (score {p.qualificationScore}, {p.status.toLowerCase()}
        {p.isFallback ? ', fallback' : ''}): {p.nextBestAction}
      </p>
    );
  }
  const p = payload as { note?: string };
  return <p><strong>{actor}</strong> {p.note ?? type}</p>;
}
