// app/recuperar-senha/page.tsx
import Link from 'next/link';
import { Suspense } from 'react';
import { RecuperarSenhaForm } from '@/components/auth/RecuperarSenhaForm';

export const metadata = { title: 'Recuperar senha — SACODE' };

export default function Page() {
  return (
    <main className="min-h-screen bg-surface-800 py-12 px-4 flex items-center">
      <div className="max-w-md w-full mx-auto">
        <Link href="/login" className="text-sm text-cream-400 hover:text-cream-200 mb-6 inline-block">← Voltar</Link>
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-cream-200 mb-2">Recuperar senha</h1>
          <p className="text-cream-400">Digite o e-mail da sua conta. Enviaremos um link para você redefinir sua senha.</p>
        </header>
        <div className="rounded-xl bg-surface-600/50 border border-muted-700 p-6 md:p-8">
          <Suspense fallback={<div className="text-cream-400">Carregando…</div>}>
            <RecuperarSenhaForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
