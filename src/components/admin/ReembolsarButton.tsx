'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Ban } from 'lucide-react';

export function ReembolsarButton({
  orderId,
  orderNumber,
  isCourtesy = false,
}: {
  orderId: string;
  orderNumber: number;
  isCourtesy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const canConfirm = reason.trim().length >= 3 && !loading;

  // Textos variam conforme seja cortesia (sem estorno) ou pedido pago (com estorno)
  const buttonLabel = isCourtesy ? 'Cancelar cortesia' : 'Cancelar/Reembolsar';
  const modalTitle = isCourtesy
    ? `Cancelar cortesia #${orderNumber}`
    : `Cancelar e reembolsar pedido #${orderNumber}`;
  const confirmLabel = isCourtesy ? 'Confirmar cancelamento' : 'Confirmar reembolso';
  const processingLabel = 'Processando...';

  async function handleConfirm() {
    if (!canConfirm) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/reembolsar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.message || 'Falha na operacao.');
        setLoading(false);
        return;
      }
      toast.success(data.message || 'Pedido cancelado.');
      // Recarrega pra refletir o novo status
      window.location.reload();
    } catch {
      toast.error('Erro de conexao. Tente de novo.');
      setLoading(false);
    }
  }

  function close() {
    if (loading) return; // nao deixa fechar no meio do processamento
    setOpen(false);
    setReason('');
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-red-900/60 text-red-200 hover:bg-red-900 transition"
      >
        <Ban size={14} />
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            className="bg-wine-700 rounded-lg border border-mauve-700 max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Ban className="text-red-300" size={20} />
              <h2 className="text-cream-100 font-bold text-lg">{modalTitle}</h2>
            </div>

            <div className="text-sm text-cream-300 space-y-2">
              {isCourtesy ? (
                <p>
                  Esta ação é <strong className="text-red-300">irreversível</strong>. A cortesia
                  será cancelada, os ingressos serão <strong>invalidados</strong> (o QR Code deixa
                  de funcionar na portaria) e a vaga volta para o lote.
                </p>
              ) : (
                <p>
                  Esta ação é <strong className="text-red-300">irreversível</strong>. O valor será
                  estornado ao cliente, os ingressos serão <strong>invalidados</strong> (o QR Code
                  deixa de funcionar na portaria) e a vaga volta para o lote.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-cream-300 mb-1">
                Motivo do cancelamento <span className="text-red-300">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={loading}
                placeholder="Descreva o motivo (ex.: solicitacao do cliente, pagamento duplicado...)"
                className="w-full rounded bg-wine-800 border border-mauve-700 text-cream-100 text-sm p-2 placeholder:text-cream-500 focus:outline-none focus:border-amber-sacode-400 disabled:opacity-60"
              />
              <p className="text-xs text-cream-500 mt-1">Minimo 3 caracteres. Ficara registrado.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={close}
                disabled={loading}
                className="px-4 py-2 rounded text-sm text-cream-300 hover:bg-wine-800 transition disabled:opacity-60"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="px-4 py-2 rounded text-sm font-medium bg-red-700 text-white hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? processingLabel : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
