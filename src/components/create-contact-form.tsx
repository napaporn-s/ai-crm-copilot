'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompanyPicker } from '@/components/company-picker';

export function CreateContactForm() {
  const router = useRouter();
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) {
      setError('Select a company first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id, name, phone: phone || undefined, email: email || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message ?? 'Failed to create contact');
        return;
      }
      if (body.data?.duplicateOf) {
        setWarning(`Possible duplicate of existing contact ${body.data.duplicateOf}`);
      }
      setName('');
      setPhone('');
      setEmail('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-gray-700">Company</label>
        <div className="mt-1"><CompanyPicker onSelect={setCompany} /></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="contact-name" className="block text-xs font-medium text-gray-700">Name</label>
          <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label htmlFor="contact-phone" className="block text-xs font-medium text-gray-700">Phone</label>
          <input id="contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-xs font-medium text-gray-700">Email</label>
          <input id="contact-email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {warning && <p className="text-sm text-amber-600">{warning}</p>}
      <button type="submit" disabled={submitting} className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50">
        {submitting ? 'Creating…' : 'Add contact'}
      </button>
    </form>
  );
}
