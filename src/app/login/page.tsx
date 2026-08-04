import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Jenosize AI CRM</h1>
        <p className="mt-1 text-sm text-gray-500">Demo login — see README for seeded credentials.</p>
        <LoginForm />
      </div>
    </main>
  );
}
