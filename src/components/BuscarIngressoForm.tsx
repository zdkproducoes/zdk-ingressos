'use client';

import { useState } from 'react';

type FoundData = {
  order_number: number;
  event: {
    title: string;
    event_date: string;
    event_time: string;
    venue_name: string;
    venue_address: string;
  };
  items: Array<{
    qr_code_url: string | null;
    attendee_name: string;
    batch_name: string;
  }>;
};

function formatCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function BuscarIngressoForm() {
  const [cpf, setCPF] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'error'>('idle');
  const [result, setResult] = useState<FoundData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11 || !orderNumber) return;

    setStatus('loading');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/buscar-ingresso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanCPF, order_number: parseInt(orderNumber, 10) }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setResult(json.data);
        setStatus('found');
      } else {
        setErrorMsg(json.error || 'Pedido não encontrado. Confira os dados informados.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.');
      setStatus('error');
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cpf" className="block text-sm font-medium text-cream-300 mb-1.5">
            CPF
          </label>
          <input
            id="cpf"
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={e => setCPF(formatCPF(e.target.value))}
            maxLength={14}
            required
            className="w-full bg-wine-700 border border-mauve-600 text-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400 placeholder:text-cream-400"
          />
        </div>

        <div>
          <label htmlFor="order_number" className="block text-sm font-medium text-cream-300 mb-1.5">
            Número do pedido
          </label>
          <input
            id="order_number"
            type="text"
            inputMode="numeric"
            placeholder="Ex: 10"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value.replace(/\D/g, ''))}
            required
            className="w-full bg-wine-700 border border-mauve-600 text-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400 placeholder:text-cream-400"
          />
          <p className="mt-1.5 text-xs text-cream-400">
            O número do pedido está no assunto do e-mail (#10, por exemplo) e no rodapé do e-mail.
            Caso não tenha acesso ao e-mail, entre em contato com o suporte.
          </p>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-amber-sacode-400 hover:bg-amber-sacode-500 disabled:opacity-50 text-wine-800 font-semibold py-2.5 rounded-lg transition text-sm"
        >
          {status === 'loading' ? 'Buscando…' : 'Buscar ingresso'}
        </button>
      </form>

      {status === 'error' && (
        <div className="mt-4 rounded-lg bg-red-950 border border-red-800 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      )}

      {status === 'found' && result && (
        <div className="mt-8 space-y-4">
          <div className="rounded-xl bg-wine-700 border border-mauve-700 p-5">
            <h2 className="text-lg font-bold text-cream-200 mb-1">{result.event.title}</h2>
            <p className="text-sm text-cream-300">
              📅{' '}
              {new Date(result.event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              })}{' '}
              às {(result.event.event_time || '').slice(0, 5)}
            </p>
            <p className="text-sm text-cream-300 mt-0.5">📍 {result.event.venue_name}</p>
            <p className="text-xs text-cream-400 mt-0.5">{result.event.venue_address}</p>
            <p className="text-xs text-cream-400 mt-2">Pedido #{result.order_number}</p>
          </div>

          {result.items.map((item, i) => (
            <div key={i} className="rounded-xl bg-wine-700 border border-mauve-600 overflow-hidden">
              <div className="bg-gradient-to-r from-wine-700/40 to-mauve-700/40 px-5 py-3">
                <p className="text-xs uppercase tracking-wide text-cream-400">{item.batch_name}</p>
                <p className="text-cream-200 font-semibold">{item.attendee_name}</p>
              </div>
              <div className="p-6 flex flex-col items-center bg-white">
                {item.qr_code_url ? (
                  <img src={item.qr_code_url} alt="QR Code" className="w-56 h-56" />
                ) : (
                  <div className="w-56 h-56 bg-neutral-200 flex items-center justify-center text-neutral-500 text-sm rounded">
                    QR não disponível
                  </div>
                )}
              </div>
              <div className="bg-amber-sacode-900/20 border-t border-amber-sacode-700/30 px-5 py-3 text-xs text-amber-sacode-200">
                ⚠️ Apresente este QR Code na entrada. Não compartilhe — uso único.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
