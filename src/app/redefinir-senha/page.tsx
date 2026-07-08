// app/redefinir-senha/page.tsx
import Link from 'next/link';
import { RedefinirSenhaForm } from '@/components/auth/RedefinirSenhaForm';

export const metadata = { title: 'Redefinir senha — SACODE' };

export default function Page() {
  return (
    <main className="min-h-screen bg-wine-800 py-12 px-4 flex items-center">
      <div className="max-w-md w-full mx-auto">
        <Link href="/login" className="text-sm text-cream-400 hover:text-cream-200 mb-6 inline-block">← Voltar</Link>
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-cream-200 mb-2">Redefinir senha</h1>
        </header>
        <div className="rounded-xl bg-wine-600/50 border border-mauve-700 p-6 md:p-8">
          <RedefinirSenhaForm />
        </div>
      </div>
    </main>
  );
}
