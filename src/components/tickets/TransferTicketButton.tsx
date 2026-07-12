'use client';

// Botão + modal de transferência de ingresso (aparece em /minhas-compras/[slug]).
// Fluxo: digita o e-mail do destinatário → tela de confirmação com os avisos
// (QR atual cancelado, transferência única, irreversível) → chama a API.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, X } from 'lucide-react';

type Step = 'closed' | 'form' | 'confirm' | 'loading' | 'success';

export function TransferTicketButton({ orderItemId, batchName }: { orderItemId: string; batchName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('closed');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [recipientName, setRecipientName] = useState('');

  function close() {
    if (step === 'loading') return;
    setStep('closed');
    setEmail('');
    setError('');
  }

  function toConfirm() {
    setError('');
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      setError('Digite um e-mail válido.');
      return;
    }
    setStep('confirm');
  }

  async function handleTransfer() {
    setStep('loading');
    setError('');
    try {
      const res = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_item_id: orderItemId, recipient_email: email.trim().toLowerCase() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setRecipientName(json.recipient_name || email.trim());
        setStep('success');
        router.refresh();
      } else {
        setError(json.error || 'Erro ao transferir. Tente novamente.');
        setStep('form');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setStep('form');
    }
  }

  return (
    <>
      <button
        onClick={() => setStep('form')}
        className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-cream-300 hover:text-cream-200 py-2.5 transition"
      >
        <Send size={13} /> Transferir ingresso
      </button>

      {step !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={close}>
          <div
            className="w-full max-w-md rounded-xl bg-surface-700 border border-muted-600 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-cream-200">Transferir ingresso</h3>
              {step !== 'loading' && (
                <button onClick={close} aria-label="Fechar" className="text-cream-400 hover:text-cream-200">
                  <X size={18} />
                </button>
              )}
            </div>

            {step === 'form' && (
              <div>
                <p className="text-sm text-cream-300 mb-1">{batchName}</p>
                <p className="text-sm text-cream-400 mb-4">
                  Digite o e-mail da conta de quem vai receber. A pessoa precisa
                  <strong className="text-cream-300"> já ter cadastro</strong> no site.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-lg bg-surface-800 border border-muted-600 text-cream-200 placeholder-cream-400/50 px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-accent-400"
                />
                {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
                <button
                  onClick={toConfirm}
                  className="w-full rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-2.5 transition"
                >
                  Continuar
                </button>
              </div>
            )}

            {(step === 'confirm' || step === 'loading') && (
              <div>
                <p className="text-sm text-cream-300 mb-3">
                  Transferir este ingresso para <strong className="text-cream-200">{email.trim().toLowerCase()}</strong>?
                </p>
                <ul className="text-xs text-accent-200 bg-accent-900/20 border border-accent-700/40 rounded-lg p-3 mb-4 space-y-1.5 list-disc list-inside">
                  <li>O seu QR Code atual será <strong>cancelado</strong> e deixará de funcionar.</li>
                  <li>Um QR Code novo será gerado no nome de quem receber.</li>
                  <li>Cada ingresso só pode ser transferido <strong>uma única vez</strong>.</li>
                  <li>Essa ação <strong>não pode ser desfeita</strong>.</li>
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('form')}
                    disabled={step === 'loading'}
                    className="flex-1 rounded-lg border border-muted-600 text-cream-300 hover:text-cream-200 font-semibold py-2.5 transition disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={step === 'loading'}
                    className="flex-1 rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-2.5 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {step === 'loading' ? <><Loader2 size={15} className="animate-spin" /> Transferindo…</> : 'Confirmar transferência'}
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-cream-200 font-semibold mb-1">Ingresso transferido!</p>
                <p className="text-sm text-cream-400 mb-4">
                  {recipientName} já pode ver o ingresso em &quot;Minhas compras&quot; e
                  recebeu um e-mail com o QR Code novo.
                </p>
                <button
                  onClick={close}
                  className="w-full rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-2.5 transition"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
