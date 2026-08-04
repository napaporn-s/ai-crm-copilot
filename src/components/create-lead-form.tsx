'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContactPicker } from '@/components/contact-picker';

export function CreateLeadForm() {
  const router = useRouter();
  const [contact, setContact] = useState<{ id: string; companyId: string; name: string } | null>(null);
  const [source, setSource] = useState('MANUAL');
  const [budget, setBudget] = useState('');
  const [scopeNotes, setScopeNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact) {
      setError('Select a contact first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          companyId: contact.companyId,
          source,
          budget: budget ? Number(budget) : undefined,
          scopeNotes: scopeNotes || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message ?? 'Failed to create lead');
        return;
      }
      router.push(`/leads/${body.data.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Contact</label>
        <div className="mt-1">
          <ContactPicker onSelect={setContact} />
        </div>
      </div>
      <div>
        <label htmlFor="lead-source" className="block text-sm font-medium text-gray-700">Source</label>
        <select id="lead-source" value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="MANUAL">Manual</option>
          <option value="WEBSITE">Website</option>
          <option value="LINE">LINE</option>
        </select>
      </div>
      <div>
        <label htmlFor="lead-budget" className="block text-sm font-medium text-gray-700">Budget (THB, optional)</label>
        <input
          id="lead-budget"
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="lead-notes" className="block text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          id="lead-notes"
          value={scopeNotes}
          onChange={(e) => setScopeNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Create Lead'}
      </button>
    </form>
  );
}
