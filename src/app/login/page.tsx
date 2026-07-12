// app/login/page.tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Entrar — SACODE' };

export default function Page() {
  return (
    <main className="min-h-screen bg-surface-800 py-12 px-4 flex items-center">
      <div className="max-w-md w-full mx-auto">
        <Link href="/" className="text-sm text-cream-400 hover:text-cream-200 mb-6 inline-block">← Voltar</Link>
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-cream-200 mb-2">Entrar</h1>
          <p className="text-cream-400">Acesse sua conta SACODE</p>
        </header>
        <div className="rounded-xl bg-surface-600/50 border border-muted-700 p-6 md:p-8">
          <Suspense fallback={<div className="text-cream-400">Carregando…</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
