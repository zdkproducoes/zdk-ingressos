// app/checkout/falha/page.tsx
import Link from 'next/link';
export default function FailurePage() {
  return (
    <main className="min-h-screen bg-surface-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl bg-surface-700 border border-red-800/50 p-8 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-red-100 mb-2">Pagamento não concluído</h1>
        <p className="text-cream-300 text-sm leading-relaxed">Houve um problema com seu pagamento. Os ingressos não foram reservados.</p>
        <Link href="/" className="block mt-6 rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-2.5 px-6 transition">Tentar novamente</Link>
      </div>
    </main>
  );
}
