'use client';

import { useState } from 'react';
import { Mail, Loader2, Check } from 'lucide-react';

type State = 'idle' | 'loading' | 'success' | 'error';

export function ResendEmailButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<State>('idle');

  async function handleClick() {
    if (state !== 'idle') return;
    setState('loading');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/resend-email`, { method: 'POST' });
      if (res.ok) {
        setState('success');
        setTimeout(() => setState('idle'), 3000);
      } else {
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  if (state === 'success') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400 whitespace-nowrap">
        <Check size={13} /> Enviado
      </span>
    );
  }

  if (state === 'error') {
    return <span className="text-xs text-red-400">Erro</span>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      aria-label="Reenviar e-mail do ingresso"
      className="flex items-center gap-1.5 text-xs text-cream-400 hover:text-cream-200 transition disabled:opacity-50 whitespace-nowrap"
    >
      {state === 'loading'
        ? <Loader2 size={13} className="animate-spin" />
        : <Mail size={13} />
      }
      Reenviar
    </button>
  );
}
