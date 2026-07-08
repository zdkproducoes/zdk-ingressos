// app/checkout/sucesso/page.tsx
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  let orderData = null;
  if (orderId) {
    const { data } = await supabaseAdmin.from('orders')
      .select('order_number, total, payment_status, events (title)').eq('id', orderId).single();
    orderData = data;
  }
  return (
    <main className="min-h-screen bg-wine-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl bg-wine-700 border border-emerald-800/50 p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-emerald-100 mb-2">Pagamento confirmado!</h1>
        {orderData && <p className="text-cream-300 text-sm">Pedido <span className="font-mono">#{orderData.order_number}</span></p>}
        <p className="text-cream-400 text-sm leading-relaxed mt-4">Seus ingressos foram enviados por e-mail. Verifique também a aba "Promoções" e a caixa de spam.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/minhas-compras" className="rounded-lg bg-amber-sacode-400 hover:bg-amber-sacode-500 text-wine-800 font-semibold py-2.5 px-6 transition">Ver meus ingressos</Link>
          <Link href="/" className="text-sm text-cream-400 hover:text-cream-200 transition mt-2">← Voltar ao início</Link>
        </div>
      </div>
    </main>
  );
}
