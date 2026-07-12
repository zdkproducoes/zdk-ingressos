'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { SlidersHorizontal, X, Loader2, Search } from 'lucide-react';

type ManagedCampaign = {
  id: string;
  name: string;
  effectiveStatus: string;
  linked: boolean;
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  IN_PROCESS: 'Processando',
  PENDING_REVIEW: 'Em análise',
  DISAPPROVED: 'Reprovada',
  WITH_ISSUES: 'Com problemas',
  ARCHIVED: 'Arquivada',
  DELETED: 'Excluída',
  CAMPAIGN_PAUSED: 'Pausada',
};

export function GerenciarCampanhasButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [campaigns, setCampaigns] = useState<ManagedCampaign[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [filter, setFilter] = useState('');

  async function openModal() {
    setOpen(true);
    setLoading(true);
    setError(null);
    setChanged(false);
    try {
      const res = await fetch('/api/admin/meta-campaigns');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha ao carregar campanhas.');
        setCampaigns([]);
      } else {
        setEventTitle(data.eventTitle ?? '');
        setCampaigns(data.campaigns ?? []);
      }
    } catch {
      setError('Erro de conexão. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  function close() {
    if (savingId) return; // nao fecha no meio de um salvamento
    setOpen(false);
    setFilter('');
    // Se algo mudou, recarrega a pagina pra refletir o novo filtro nas métricas
    if (changed) window.location.reload();
  }

  async function toggle(campaign: ManagedCampaign) {
    const nextLinked = !campaign.linked;
    setSavingId(campaign.id);
    // otimista
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaign.id ? { ...c, linked: nextLinked } : c)),
    );
    try {
      const res = await fetch('/api/admin/meta-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, linked: nextLinked }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        // reverte
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaign.id ? { ...c, linked: campaign.linked } : c)),
        );
        toast.error(data.error || 'Não foi possível salvar.');
      } else {
        setChanged(true);
      }
    } catch {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, linked: campaign.linked } : c)),
      );
      toast.error('Erro de conexão.');
    } finally {
      setSavingId(null);
    }
  }

  const term = filter.trim().toLowerCase();
  const visible = term
    ? campaigns.filter((c) => c.name.toLowerCase().includes(term))
    : campaigns;
  const linkedCount = campaigns.filter((c) => c.linked).length;

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 text-cream-300 hover:text-cream-100 transition"
      >
        <SlidersHorizontal size={14} />
        Gerenciar campanhas
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            className="bg-surface-700 rounded-lg border border-muted-700 max-w-lg w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-3 p-5 border-b border-muted-700">
              <div>
                <h2 className="text-cream-100 font-bold text-lg flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-accent-400" />
                  Campanhas do evento
                </h2>
                <p className="text-xs text-cream-400 mt-1">
                  Marque as campanhas que aparecem na aba para{' '}
                  <span className="text-cream-200 font-medium">{eventTitle || 'este evento'}</span>.
                  Sem nenhuma marcada, a aba mostra todas as campanhas da conta.
                </p>
              </div>
              <button
                onClick={close}
                disabled={!!savingId}
                className="text-cream-400 hover:text-cream-200 transition disabled:opacity-40 shrink-0"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Busca */}
            {!loading && !error && campaigns.length > 0 && (
              <div className="px-5 pt-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-500" />
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Buscar campanha pelo nome..."
                    className="w-full rounded bg-surface-800 border border-muted-700 text-cream-100 text-sm py-2 pl-9 pr-3 placeholder:text-cream-500 focus:outline-none focus:border-accent-400"
                  />
                </div>
                <p className="text-xs text-cream-500 mt-2">
                  {linkedCount === 0
                    ? 'Nenhuma vinculada — a aba mostra todas.'
                    : `${linkedCount} campanha${linkedCount === 1 ? '' : 's'} vinculada${linkedCount === 1 ? '' : 's'}.`}
                </p>
              </div>
            )}

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-5 pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-cream-400">
                  <Loader2 className="animate-spin mr-2" size={18} /> Carregando campanhas...
                </div>
              ) : error ? (
                <div className="text-sm text-red-300 bg-red-900/30 border border-red-900 rounded p-4">
                  {error}
                </div>
              ) : campaigns.length === 0 ? (
                <p className="text-sm text-cream-400 py-8 text-center">
                  Nenhuma campanha encontrada na conta.
                </p>
              ) : visible.length === 0 ? (
                <p className="text-sm text-cream-400 py-8 text-center">
                  Nenhuma campanha corresponde a &quot;{filter}&quot;.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {visible.map((c) => (
                    <li key={c.id}>
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-muted-700 hover:bg-surface-800/60 transition cursor-pointer">
                        <input
                          type="checkbox"
                          checked={c.linked}
                          disabled={savingId === c.id}
                          onChange={() => toggle(c)}
                          className="w-4 h-4 accent-accent-400 shrink-0"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-cream-200 text-sm truncate" title={c.name}>
                            {c.name}
                          </span>
                          <span className="text-xs text-cream-500">
                            {statusLabel[c.effectiveStatus] ?? c.effectiveStatus}
                          </span>
                        </span>
                        {savingId === c.id && (
                          <Loader2 className="animate-spin text-cream-400 shrink-0" size={14} />
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Rodapé */}
            <div className="p-4 border-t border-muted-700 flex justify-end">
              <button
                onClick={close}
                disabled={!!savingId}
                className="px-4 py-2 rounded text-sm font-medium bg-accent-400 text-surface-800 hover:bg-accent-300 transition disabled:opacity-50"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
