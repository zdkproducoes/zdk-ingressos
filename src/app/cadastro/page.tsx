// app/cadastro/page.tsx
import Link from 'next/link';
import { SignupForm } from '@/components/auth/SignupForm';

export const metadata = { title: 'Criar conta' };

export default function Page() {
  return (
    <main className="min-h-screen bg-surface-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-cream-400 hover:text-cream-200 mb-6 inline-block">← Voltar</Link>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-cream-200 mb-2">Criar minha conta</h1>
          <p className="text-cream-400">Para comprar ingressos, criar uma conta leva menos de 1 minuto.</p>
        </header>
        <div className="rounded-xl bg-surface-600/50 border border-muted-700 p-6 md:p-8">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
