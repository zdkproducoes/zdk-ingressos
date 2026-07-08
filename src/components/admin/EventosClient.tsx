'use client';

// Seção Eventos do admin: cards por evento com status, números e ações
// (gerenciar, publicar, arquivar) + modal de criação de novo evento.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Plus, X } from 'lucide-react';
import type { EventListItem } from '@/app/admin/eventos/page';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (isoDate: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(isoDate + 'T00:00:00'));

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active:   { label: 'Ativo',     classes: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50' },
  draft:    { label: 'Rascunho',  classes: 'bg-wine-800 text-cream-400 border-mauve-600' },
  finished: { label: 'Arquivado', classes: 'bg-mauve-800/60 text-cream-300 border-mauve-600' },
};

const SLUG_REGEX = /^[a-z0-9-]+$/;

type FormState = {
  title: string;
  slug: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  venue_neighborhood: string;
  venue_city: string;
  venue_state: string;
  venue_zip: string;
  description: string;
  service_fee_percent: string;
  max_tickets_per_cpf: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function EventosClient({
  items,
  selectedId,
}: {
  items: EventListItem[];
  selectedId: string | null;
}) {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pré-preenche o local com os dados do evento mais recente (mesma casa, novo evento)
  const last = items[0];
  const emptyForm: FormState = {
    title: '',
    slug: '',
    event_date: '',
    event_time: '12:00',
    venue_name: last?.venue_name ?? '',
    venue_address: last?.venue_address ?? '',
    venue_neighborhood: last?.venue_neighborhood ?? '',
    venue_city: last?.venue_city ?? '',
    venue_state: last?.venue_state ?? 'SP',
    venue_zip: last?.venue_zip ?? '',
    description: '',
    service_fee_percent: String(last?.service_fee_percent ?? 10),
    max_tickets_per_cpf: String(last?.max_tickets_per_cpf ?? 5),
  };
  const [form, setForm] = useState<FormState>(emptyForm);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSelect = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/eventos/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: id }),
      });
      const json = await res.json();
      if (!res.ok) return setError(json.error || 'Erro ao selecionar evento.');
      router.push('/admin/resumo');
      router.refresh();
    } catch {
      setError('Erro de conexão.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSetStatus = async (item: EventListItem, status: 'draft' | 'active' | 'finished') => {
    setError(null);
    const messages: Record<string, string> = {
      active: `Publicar "${item.title}"? Ele fica visível ao público e com vendas abertas (lotes ativos).`,
      finished: `Arquivar "${item.title}"? A página pública sai do ar e as vendas param. Os dados (pedidos, compradores, ingressos) ficam guardados e você continua vendo tudo aqui no admin.`,
      draft: `Voltar "${item.title}" para rascunho? A página pública sai do ar.`,
    };
    if (!confirm(messages[status])) return;

    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/eventos/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_status', status }),
      });
      const json = await res.json();
      if (!res.ok) return setError(json.error || 'Erro ao alterar status.');
      flash(
        status === 'finished'
          ? 'Evento arquivado.'
          : status === 'active'
            ? 'Evento publicado.'
            : 'Evento voltou para rascunho.',
      );
      router.refresh();
    } catch {
      setError('Erro de conexão.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!form.title.trim()) return setFormError('Título é obrigatório.');
    if (!SLUG_REGEX.test(form.slug)) return setFormError('Slug inválido (letras minúsculas, números e hífen).');
    if (!form.event_date) return setFormError('Data do evento é obrigatória.');
    if (!form.venue_name.trim()) return setFormError('Nome do local é obrigatório.');
    if (!form.venue_address.trim()) return setFormError('Endereço é obrigatório.');
    if (!form.venue_city.trim()) return setFormError('Cidade é obrigatória.');

    setSaving(true);
    try {
      const res = await fetch('/api/admin/eventos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Erro ao criar evento.');
        setSaving(false);
        return;
      }
      setModalOpen(false);
      setForm(emptyForm);
      flash('Evento criado como rascunho. Agora crie os lotes dele na aba Lotes e publique quando estiver pronto.');
      router.refresh();
    } catch {
      setFormError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-wine-800 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400';
  const labelCls = 'block text-sm text-cream-300 mb-1';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream-400">
          {items.length} {items.length === 1 ? 'evento' : 'eventos'}
        </p>
        <button
          onClick={() => { setForm(emptyForm); setFormError(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 bg-amber-sacode-400 hover:bg-amber-sacode-500 text-wine-900 font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          <Plus size={16} /> Novo evento
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-emerald-900/30 border border-emerald-700/50 text-emerald-200 text-sm rounded-lg px-3 py-2">
          <Check size={16} className="mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-center text-cream-400 py-16">Nenhum evento cadastrado.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const badge = STATUS_BADGE[item.status] ?? {
              label: item.status,
              classes: 'bg-mauve-800/60 text-cream-300 border-mauve-600',
            };
            const isSelected = item.id === selectedId;
            const busy = busyId === item.id;
            return (
              <div
                key={item.id}
                className={`bg-wine-700 border rounded-xl p-5 ${
                  isSelected ? 'border-amber-sacode-400/60' : 'border-mauve-700'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-cream-200">{item.title}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${badge.classes}`}>
                        {badge.label}
                      </span>
                      {isSelected && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full border border-amber-sacode-400/50 bg-amber-sacode-400/10 text-amber-sacode-300">
                          Gerenciando
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-cream-400 mt-1">
                      {fmtDate(item.event_date)}
                      {item.event_time && <> às {item.event_time.slice(0, 5)}</>}
                      {' · '}{item.venue_name} · <span className="font-mono text-xs">/{item.slug}</span>
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!isSelected && (
                      <button
                        onClick={() => handleSelect(item.id)}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-sacode-400 hover:bg-amber-sacode-500 disabled:opacity-50 text-wine-900 font-semibold transition"
                      >
                        Gerenciar este evento
                      </button>
                    )}
                    {item.status !== 'active' && (
                      <button
                        onClick={() => handleSetStatus(item, 'active')}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/40 hover:bg-emerald-900/60 disabled:opacity-50 text-emerald-300 transition"
                      >
                        Publicar
                      </button>
                    )}
                    {item.status === 'active' && (
                      <button
                        onClick={() => handleSetStatus(item, 'finished')}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-lg border border-mauve-600 bg-wine-800 hover:bg-wine-900 disabled:opacity-50 text-cream-300 transition"
                      >
                        Arquivar
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-wine-800 border border-mauve-700 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-cream-400">Pedidos pagos</p>
                    <p className="text-lg font-bold text-cream-200">{item.orders_count}</p>
                  </div>
                  <div className="bg-wine-800 border border-mauve-700 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-cream-400">Ingressos</p>
                    <p className="text-lg font-bold text-cream-200">{item.tickets_count}</p>
                  </div>
                  <div className="bg-wine-800 border border-mauve-700 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-cream-400">Faturamento líquido</p>
                    <p className="text-lg font-bold text-amber-sacode-400">{fmtCurrency(item.net_revenue)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de novo evento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
          <div className="bg-wine-700 border border-mauve-700 rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-cream-200">Novo evento</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-cream-400 hover:text-cream-200 transition"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-cream-400">
              O evento nasce como <strong className="text-cream-300">rascunho</strong> (invisível ao público)
              e com os dados zerados — pedidos, compradores e lotes são separados por evento.
            </p>

            {formError && (
              <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg px-3 py-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className={labelCls}>Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({ ...f, title, slug: slugify(title) }));
                }}
                placeholder="Sacode do Lacerda - 16ª Edição"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Slug (endereço da página) *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                placeholder="sacode-16-edicao"
                className={`${inputCls} font-mono`}
              />
              <p className="text-xs text-cream-400 mt-1">
                A página será /evento/{form.slug || 'seu-slug'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data *</label>
                <input type="date" value={form.event_date} onChange={set('event_date')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Horário</label>
                <input type="time" value={form.event_time} onChange={set('event_time')} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Local *</label>
              <input type="text" value={form.venue_name} onChange={set('venue_name')} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Endereço *</label>
              <input type="text" value={form.venue_address} onChange={set('venue_address')} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Bairro</label>
                <input type="text" value={form.venue_neighborhood} onChange={set('venue_neighborhood')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>CEP</label>
                <input type="text" value={form.venue_zip} onChange={set('venue_zip')} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div>
                <label className={labelCls}>Cidade *</label>
                <input type="text" value={form.venue_city} onChange={set('venue_city')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>UF *</label>
                <input type="text" maxLength={2} value={form.venue_state} onChange={set('venue_state')} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Taxa de serviço (%)</label>
                <input type="number" min="0" max="100" step="0.5" value={form.service_fee_percent} onChange={set('service_fee_percent')} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Máx. ingressos por CPF</label>
                <input type="number" min="1" max="100" value={form.max_tickets_per_cpf} onChange={set('max_tickets_per_cpf')} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Descrição</label>
              <textarea rows={3} value={form.description} onChange={set('description')} className={inputCls} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-mauve-600 text-cream-300 hover:bg-wine-800 text-sm transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-amber-sacode-400 hover:bg-amber-sacode-500 disabled:opacity-50 text-wine-900 font-semibold text-sm transition"
              >
                {saving ? 'Criando…' : 'Criar evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
