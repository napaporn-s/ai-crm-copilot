'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function NavBar({ userName, userRole }: { userName: string; userRole: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="font-semibold">Jenosize AI CRM</span>
        <Link href="/leads" className="text-sm text-gray-600 hover:text-gray-900">Leads</Link>
        <Link href="/companies" className="text-sm text-gray-600 hover:text-gray-900">Companies</Link>
        <Link href="/contacts" className="text-sm text-gray-600 hover:text-gray-900">Contacts</Link>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>{userName} · {userRole}</span>
        <button onClick={handleLogout} className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-50">
          Log out
        </button>
      </div>
    </nav>
  );
}
