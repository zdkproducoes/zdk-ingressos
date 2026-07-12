// components/checkout/CouponInput.tsx
'use client';

import { useState } from 'react';

type Props = {
  eventId: string; subtotal: number;
  onApply: (result: { code: string; discount: number; type: string } | null) => void;
};

export function CouponInput({ eventId, subtotal, onApply }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<{ code: string; discount: number; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    if (!code.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, code: code.trim().toUpperCase(), subtotal }),
      });
      const data = await res.json();
      if (!data.valid) { setError(data.message || 'Cupom inválido'); setApplied(null); onApply(null); }
      else {
        const result = { code: code.trim().toUpperCase(), discount: data.discountAmount, type: data.couponType };
        setApplied(result); onApply(result);
      }
    } catch { setError('Erro ao validar cupom'); }
    finally { setLoading(false); }
  }

  function remove() { setApplied(null); setCode(''); setError(null); onApply(null); }

  if (applied) {
    return (
      <div className="rounded-lg bg-emerald-950 border border-emerald-800 p-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-mono font-bold text-emerald-200">{applied.code}</span>
          <span className="text-emerald-300/80 ml-2">
            {applied.type === 'free_fee' ? '— sem taxa' : `— -R$ ${applied.discount.toFixed(2).replace('.', ',')}`}
          </span>
        </div>
        <button type="button" onClick={remove} className="text-xs text-emerald-300 hover:text-emerald-100 underline">remover</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="CUPOM DE DESCONTO"
          className="flex-1 rounded-lg bg-surface-700 border border-muted-600 px-3 py-2 text-cream-200 placeholder:text-cream-400 focus:outline-none focus:border-accent-400 uppercase"
          disabled={loading} />
        <button type="button" onClick={apply} disabled={loading || !code.trim()}
          className="rounded-lg bg-surface-700 hover:bg-surface-500 disabled:opacity-50 text-cream-200 text-sm font-semibold px-4 transition">
          {loading ? '…' : 'Aplicar'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
