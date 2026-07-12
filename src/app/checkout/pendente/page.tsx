// app/checkout/pendente/page.tsx
import Link from 'next/link';
export default function PendingPage() {
  return (
    <main className="min-h-screen bg-surface-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl bg-surface-700 border border-accent-800/50 p-8 text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-accent-200 mb-2">Aguardando pagamento</h1>
        <p className="text-cream-300 text-sm leading-relaxed">Seu pagamento está sendo processado. Assim que aprovado, enviaremos os ingressos por e-mail.</p>
        <p className="text-cream-400 text-xs leading-relaxed mt-4">Para Pix: você tem até <strong>30 minutos</strong>.</p>
        <Link href="/minhas-compras" className="block mt-6 rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-2.5 px-6 transition">Ver meus pedidos</Link>
      </div>
    </main>
  );
}
