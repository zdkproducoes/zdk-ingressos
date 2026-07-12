// components/checkout/CheckoutClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CouponInput } from './CouponInput';

type Batch = { id: string; name: string; price: number; max_per_order: number; min_per_order: number; paid_count: number; quantity: number; status: string; starts_at: string | null; ends_at: string | null };
type Props = {
  eventId: string; eventTitle: string; eventDate: string; eventTime: string;
  venueName: string; serviceFeePercent: number; batches: Batch[];
  isLoggedIn: boolean; emailConfirmed: boolean;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function CheckoutClient(props: Props) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [coupon, setCoupon] = useState<{ code: string; discount: number; type: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cart');
      if (!saved) return;

      const items = JSON.parse(saved) as Array<{
        loteId: string;
        quantity: number;
        price: number;
        name: string;
        addedAt?: string;
      }>;

      if (!Array.isArray(items) || items.length === 0) return;

      const firstItem = items[0];
      if (firstItem.addedAt) {
        const ageMs = Date.now() - new Date(firstItem.addedAt).getTime();
        if (ageMs > TWO_HOURS_MS) {
          localStorage.removeItem('cart');
          return;
        }
      }

      const activeBatchById = new Map(props.batches.map(b => [b.id, b]));
      const initial: Record<string, number> = {};
      let hasInvalidReference = false;

      items.forEach(item => {
        const batch = activeBatchById.get(item.loteId);
        if (!batch) {
          hasInvalidReference = true;
          return;
        }
        const min = batch.min_per_order ?? 1;
        const max = batch.max_per_order ?? 99;
        const clamped = Math.max(min, Math.min(max, item.quantity));
        initial[item.loteId] = clamped;
      });

      if (hasInvalidReference) {
        localStorage.removeItem('cart');
        return;
      }

      setQty(initial);
    } catch (err) {
      console.warn('Falha ao restaurar carrinho:', err);
      localStorage.removeItem('cart');
    }
  }, [props.batches]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(() => {
    return props.batches.reduce((sum, b) => sum + (Number(b.price) * (qty[b.id] || 0)), 0);
  }, [qty, props.batches]);

  const totalQty = useMemo(() => Object.values(qty).reduce((a,b) => a + b, 0), [qty]);

  const discount = coupon?.discount || 0;
  const baseForFee = Math.max(0, subtotal - discount);
  const serviceFee = coupon?.type === 'free_fee' ? 0 : baseForFee * (props.serviceFeePercent / 100);
  const total = baseForFee + serviceFee;

  function inc(batchId: string, batchMax: number, available: number) {
    setQty(p => {
      const cur = p[batchId] || 0;
      const max = Math.min(batchMax, available);
      return { ...p, [batchId]: Math.min(cur + 1, max) };
    });
  }
  function dec(batchId: string) {
    setQty(p => ({ ...p, [batchId]: Math.max((p[batchId] || 0) - 1, 0) }));
  }

  async function pay() {
    setError(null);
    if (totalQty === 0) { setError('Selecione pelo menos 1 ingresso'); return; }

    if (!props.isLoggedIn) { router.push(`/login?redirect=/checkout`); return; }
    if (!props.emailConfirmed) { setError('Confirme seu e-mail antes de comprar. Verifique sua caixa de entrada.'); return; }

    setLoading(true);
    try {
      const items = Object.entries(qty)
        .filter(([_, q]) => q > 0)
        .map(([batchId, q]) => ({ batchId, quantity: q }));
      const res = await fetch('/api/checkout/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: props.eventId, items, couponCode: coupon?.code || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.initPoint) { setError(data.error || 'Erro ao iniciar pagamento'); setLoading(false); return; }
      window.location.href = data.initPoint;
    } catch { setError('Erro de conexão'); setLoading(false); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna esquerda: lotes */}
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-lg font-semibold text-cream-200 mb-2">Escolha seus ingressos</h2>
        {props.batches.map(b => {
          const available = b.quantity - b.paid_count;
          const sold = available <= 0 || b.status === 'sold_out';
          const cur = qty[b.id] || 0;
          return (
            <div key={b.id} className={`rounded-xl border p-4 ${sold ? 'bg-surface-600/50 border-muted-700 opacity-60' : 'bg-surface-600 border-muted-600'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-cream-200">{b.name}</h3>
                  <p className="text-sm text-cream-400">
                    R$ {Number(b.price).toFixed(2).replace('.', ',')}
                    {!sold && available <= 10 && <span className="ml-2 text-accent-400">— últimas {available}!</span>}
                  </p>
                </div>
                {sold ? (
                  <span className="text-sm font-semibold text-red-400">Esgotado</span>
                ) : (
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => dec(b.id)} disabled={cur === 0}
                      className="w-9 h-9 rounded-lg bg-surface-700 hover:bg-surface-500 disabled:opacity-30 text-cream-200 font-bold">−</button>
                    <span className="w-6 text-center text-cream-200 font-semibold">{cur}</span>
                    <button type="button" onClick={() => inc(b.id, b.max_per_order, available)}
                      disabled={cur >= Math.min(b.max_per_order, available)}
                      className="w-9 h-9 rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-30 text-surface-800 font-bold">+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Coluna direita: resumo */}
      <div className="lg:col-span-1">
        <div className="rounded-xl bg-surface-600 border border-muted-600 p-5 sticky top-4 space-y-4">
          <h3 className="font-semibold text-cream-200">Resumo</h3>

          <div className="text-sm text-cream-300">
            <p className="font-medium text-cream-200">{props.eventTitle}</p>
            <p className="text-xs text-cream-400 mt-1">{props.eventDate} • {props.eventTime}</p>
            <p className="text-xs text-cream-400">{props.venueName}</p>
          </div>

          <div className="border-t border-muted-700 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-cream-300">
              <span>Subtotal ({totalQty} {totalQty === 1 ? 'ingresso' : 'ingressos'})</span>
              <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Desconto</span>
                <span>−R$ {discount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between text-cream-300">
              <span>Taxa de serviço</span>
              <span>R$ {serviceFee.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-cream-200 font-bold text-lg pt-2 border-t border-muted-700">
              <span>Total</span>
              <span>R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          {totalQty > 0 && <CouponInput eventId={props.eventId} subtotal={subtotal} onApply={setCoupon} />}

          {error && <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-xs text-red-200">{error}</div>}

          <button type="button" onClick={pay} disabled={loading || totalQty === 0}
            className="w-full rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed text-surface-800 font-semibold py-3 transition">
            {loading ? 'Processando…' : !props.isLoggedIn ? 'Entrar para comprar' : 'Ir para pagamento'}
          </button>

          <p className="text-xs text-cream-400 text-center">
            Pagamento processado pelo Mercado Pago<br />Cartão, débito ou Pix
          </p>
        </div>
      </div>
    </div>
  );
}
