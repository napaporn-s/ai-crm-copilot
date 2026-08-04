'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReassignOwnerControl({ leadId, currentOwnerId }: { leadId: string; currentOwnerId: string }) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState(currentOwnerId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/owner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message ?? 'Could not reassign owner');
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 text-xs">
      <input
        value={ownerId}
        onChange={(e) => setOwnerId(e.target.value)}
        placeholder="New owner user ID"
        className="rounded-md border border-gray-300 px-2 py-1"
      />
      <button type="submit" disabled={submitting} className="rounded-md border border-gray-300 px-2 py-1 disabled:opacity-50">
        Reassign
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </form>
  );
}
