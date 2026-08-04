'use client';

import { useEffect, useState } from 'react';

interface CompanyOption {
  id: string;
  name: string;
}

export function CompanyPicker({ onSelect }: { onSelect: (company: CompanyOption) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [selected, setSelected] = useState<CompanyOption | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query || selected) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/companies?q=${encodeURIComponent(query)}&pageSize=10`);
      const body = await res.json();
      setResults(body.data?.items ?? []);
      setOpen(true);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, selected]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-gray-300 px-3 py-2 text-sm">
        <span>{selected.name}</span>
        <button type="button" className="text-xs text-gray-500 underline" onClick={() => { setSelected(null); setQuery(''); }}>
          change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search company by name…"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => { setSelected(c); setOpen(false); onSelect(c); }}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
