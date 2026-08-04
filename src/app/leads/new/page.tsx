import { getSession } from '@/core/auth/get-session';
import { NavBar } from '@/components/nav-bar';
import { CreateLeadForm } from '@/components/create-lead-form';

export default async function NewLeadPage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div>
      <NavBar userName={session.name} userRole={session.role} />
      <main className="mx-auto max-w-xl px-6 py-8">
        <h1 className="mb-6 text-lg font-semibold">New Lead</h1>
        <CreateLeadForm />
      </main>
    </div>
  );
}
