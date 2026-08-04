'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const;

export function StageControl({ leadId, currentStage }: { leadId: string; currentStage: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function moveTo(stage: string) {
    setPending(stage);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: stage }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message ?? 'Could not update stage');
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STAGES.map((stage) => (
          <button
            key={stage}
            type="button"
            disabled={stage === currentStage || pending !== null}
            onClick={() => moveTo(stage)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              stage === currentStage
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            {pending === stage ? '…' : stage}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
