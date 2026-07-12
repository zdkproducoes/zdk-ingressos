'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Power, PowerOff } from 'lucide-react';
import { LoteFormModal } from './LoteFormModal';
import type { BatchRow, SelectedEventOption } from '@/app/admin/lotes/page';

interface Props {
  batches: BatchRow[];
  selectedEvent: SelectedEventOption;
}

export function LotesAdminClient({ batches, selectedEvent }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const openNew = useCallback(() => {
    setEditingBatch(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((batch: BatchRow) => {
    setEditingBatch(batch);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingBatch(null);
  }, []);

  const handleSaveSuccess = useCallback(() => {
    closeModal();
    router.refresh();
  }, [closeModal, router]);

  const handleToggle = useCallback(async (batch: BatchRow) => {
    if (togglingId) return;
    const newStatus = batch.status === 'active' ? 'paused' : 'active';
    const verb = newStatus === 'active' ? 'ativar' : 'desativar';
    if (!confirm(`Confirma ${verb} o lote "${batch.name}"?`)) return;

    setTogglingId(batch.id);
    try {
      const res = await fetch(`/api/admin/lotes/${batch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao alterar status');
        return;
      }
      router.refresh();
    } catch (err: any) {
      alert('Erro de rede: ' + (err?.message || err));
    } finally {
      setTogglingId(null);
    }
  }, [togglingId, router]);

  const fmtCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Formata data ISO em dd/mm/aa (pt-BR); retorna travessao quando nao ha data.
  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      : '—';

  return (
    <div className="mt-6 space-y-4">
      {/* Header com botao Novo */}
      <div className="flex items-center justify-between">
        <p className="text-cream-300 text-sm">
          {batches.length} {batches.length === 1 ? 'lote' : 'lotes'} cadastrado{batches.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-accent-400 text-surface-900 font-bold px-4 py-2 rounded-lg hover:bg-accent-300 transition"
        >
          <Plus size={18} />
          Novo lote
        </button>
      </div>

      {batches.length === 0 ? (
        <p className="text-cream-400 text-center py-16">Nenhum lote cadastrado. Clique em &quot;Novo lote&quot;.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-muted-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-muted-700 bg-surface-800">
                {['Lote', 'Evento', 'Preco', 'Periodo', 'Vendidos', 'Cortesias', 'Progresso', 'Status', 'Acoes'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-cream-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const isCourtesyBatch = Number(batch.price) === 0;
                const issuedTotal = batch.real_sold + batch.real_courtesies;
                const displayedSold = isCourtesyBatch ? issuedTotal : batch.real_sold;
                const pct =
                  batch.quantity > 0
                    ? Math.min(Math.round((issuedTotal / batch.quantity) * 100), 100)
                    : 0;
                const esgotado = pct >= 100 || batch.status === 'sold_out';
                const isActive = batch.status === 'active';

                return (
                  <tr key={batch.id} className="border-b border-muted-700 last:border-0 hover:bg-surface-800/50">
                    <td className="px-4 py-3 text-cream-200 font-medium">
                      {batch.name}
                      {!batch.is_visible && (
                        <span className="ml-2 text-xs text-cream-400">(oculto)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cream-300">{batch.event_title ?? '-'}</td>
                    <td className="px-4 py-3 text-cream-300">{fmtCurrency.format(batch.price)}</td>
                    <td className="px-4 py-3 text-cream-300 whitespace-nowrap">
                      <div className="text-xs">
                        <span className="text-cream-400">Início</span> {fmtDate(batch.starts_at)}
                      </div>
                      <div className="text-xs">
                        <span className="text-cream-400">Fim</span> {fmtDate(batch.ends_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-cream-300">
                      {displayedSold} / {batch.quantity}
                    </td>
                    <td className="px-4 py-3 text-cream-300">{batch.real_courtesies}</td>
                    <td className="px-4 py-3 w-40">
                      <div className="w-full bg-muted-700 rounded-full h-2">
                        <div
                          className="bg-accent-400 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-cream-400 mt-1 inline-block">{pct}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={batch.status} esgotado={esgotado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(batch)}
                          className="flex items-center gap-1 bg-muted-700 hover:bg-muted-600 text-cream-200 text-xs font-medium px-3 py-1.5 rounded transition"
                          title="Editar lote"
                        >
                          <Edit2 size={14} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggle(batch)}
                          disabled={togglingId === batch.id}
                          className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded transition disabled:opacity-50 ${
                            isActive
                              ? 'bg-red-900/40 hover:bg-red-900/60 text-red-300'
                              : 'bg-green-900/40 hover:bg-green-900/60 text-green-300'
                          }`}
                          title={isActive ? 'Desativar' : 'Ativar'}
                        >
                          {isActive ? <PowerOff size={14} /> : <Power size={14} />}
                          {isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <LoteFormModal
          batch={editingBatch}
          selectedEvent={selectedEvent}
          onClose={closeModal}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}

function StatusBadge({ status, esgotado }: { status: string; esgotado: boolean }) {
  if (esgotado) {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-900 text-red-300">
        ESGOTADO
      </span>
    );
  }
  const map: Record<string, { label: string; className: string }> = {
    active:    { label: 'Ativo',     className: 'bg-green-900 text-green-300' },
    paused:    { label: 'Pausado',   className: 'bg-yellow-900 text-yellow-300' },
    scheduled: { label: 'Agendado',  className: 'bg-blue-900 text-blue-300' },
    ended:     { label: 'Encerrado', className: 'bg-muted-700 text-cream-400' },
    sold_out:  { label: 'Esgotado',  className: 'bg-red-900 text-red-300' },
  };
  const cfg = map[status] || { label: status, className: 'bg-muted-700 text-cream-400' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
