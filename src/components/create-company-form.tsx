'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, industry: industry || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message ?? 'Failed to create company');
        return;
      }
      setName('');
      setIndustry('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-gray-700">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700">Industry</label>
        <input value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50">
        {submitting ? 'Creating…' : 'Add company'}
      </button>
    </form>
  );
}
