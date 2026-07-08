// app/checkout/pendente/page.tsx
import Link from 'next/link';
export default function PendingPage() {
  return (
    <main className="min-h-screen bg-wine-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl bg-wine-700 border border-amber-sacode-800/50 p-8 text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-amber-sacode-200 mb-2">Aguardando pagamento</h1>
        <p className="text-cream-300 text-sm leading-relaxed">Seu pagamento está sendo processado. Assim que aprovado, enviaremos os ingressos por e-mail.</p>
        <p className="text-cream-400 text-xs leading-relaxed mt-4">Para Pix: você tem até <strong>30 minutos</strong>.</p>
        <Link href="/minhas-compras" className="block mt-6 rounded-lg bg-amber-sacode-400 hover:bg-amber-sacode-500 text-wine-800 font-semibold py-2.5 px-6 transition">Ver meus pedidos</Link>
      </div>
    </main>
  );
}
