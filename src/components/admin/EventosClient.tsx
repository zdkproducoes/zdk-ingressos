'use client';

// Seção Eventos do admin: cards por evento com status, números e ações
// (gerenciar, publicar, arquivar) + modal de criação de novo evento.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Plus, Star, X } from 'lucide-react';
import type { EventListItem } from '@/app/admin/eventos/page';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (isoDate: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(isoDate + 'T00:00:00'));

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active:   { label: 'Ativo',     classes: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50' },
  draft:    { label: 'Rascunho',  classes: 'bg-surface-800 text-cream-400 border-muted-600' },
  finished: { label: 'Arquivado', classes: 'bg-muted-800/60 text-cream-300 border-muted-600' },
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
  category: string;
  service_fee_percent: string;
  max_tickets_per_cpf: string;
  banner_url: string;
  og_image_url: string;
  venue_lat: string;
  venue_lng: string;
  subtitle: string;
  opening_notice: string;
  lineup_text: string;
};

import { lineupToText } from '@/lib/admin/event-content';
import { EVENT_CATEGORIES } from '@/lib/categories';

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
  isSuperadmin = false,
}: {
  items: EventListItem[];
  selectedId: string | null;
  isSuperadmin?: boolean;
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
    category: '',
    service_fee_percent: String(last?.service_fee_percent ?? 10),
    max_tickets_per_cpf: String(last?.max_tickets_per_cpf ?? 5),
    banner_url: '',
    og_image_url: '',
    venue_lat: '',
    venue_lng: '',
    subtitle: '',
    opening_notice: '',
    lineup_text: '',
  };
  const [form, setForm] = useState<FormState>(emptyForm);
  // Modal "Editar página": null = fechado; senão, o evento em edição
  const [contentTarget, setContentTarget] = useState<EventListItem | null>(null);
  const [contentForm, setContentForm] = useState({
    banner_url: '', og_image_url: '', venue_lat: '', venue_lng: '',
    subtitle: '', opening_notice: '', lineup_text: '', category: '',
  });
  const setC = (field: keyof typeof contentForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setContentForm((f) => ({ ...f, [field]: e.target.value }));

  const openContentModal = (item: EventListItem) => {
    setFormError(null);
    setContentForm({
      banner_url: item.banner_url ?? '',
      og_image_url: item.og_image_url ?? '',
      venue_lat: item.venue_lat != null ? String(item.venue_lat) : '',
      venue_lng: item.venue_lng != null ? String(item.venue_lng) : '',
      subtitle: item.content?.subtitle ?? '',
      opening_notice: item.content?.opening_notice ?? '',
      lineup_text: lineupToText(item.content?.lineup),
      category: item.category ?? '',
    });
    setContentTarget(item);
  };

  const handleSaveContent = async () => {
    if (!contentTarget) return;
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/eventos/${contentTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_content', ...contentForm }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Erro ao salvar conteúdo.');
        setSaving(false);
        return;
      }
      setContentTarget(null);
      flash('Página do evento atualizada.');
      router.refresh();
    } catch {
      setFormError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

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

  // Destaque no carrossel da home (1..5) — controle exclusivo do superadmin
  const handleSetFeatured = async (item: EventListItem, value: string) => {
    setError(null);
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/eventos/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_featured',
          featured_order: value === '' ? null : Number(value),
        }),
      });
      const json = await res.json();
      if (!res.ok) return setError(json.error || 'Erro ao definir destaque.');
      flash(
        value === ''
          ? 'Evento removido dos destaques da home.'
          : `Evento fixado na posição ${value} do carrossel da home.`,
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
    'w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400';
  const labelCls = 'block text-sm text-cream-300 mb-1';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-cream-400">
          {items.length} {items.length === 1 ? 'evento' : 'eventos'}
        </p>
        <button
          onClick={() => { setForm(emptyForm); setFormError(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-surface-900 font-semibold px-4 py-2 rounded-lg text-sm transition"
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
              classes: 'bg-muted-800/60 text-cream-300 border-muted-600',
            };
            const isSelected = item.id === selectedId;
            const busy = busyId === item.id;
            return (
              <div
                key={item.id}
                className={`bg-surface-700 border rounded-xl p-5 ${
                  isSelected ? 'border-accent-400/60' : 'border-muted-700'
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
                        <span className="text-xs px-2.5 py-0.5 rounded-full border border-accent-400/50 bg-accent-400/10 text-accent-300">
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

                  <div className="flex gap-2 flex-wrap items-center">
                    {isSuperadmin && item.status === 'active' && (
                      <label
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg
                                   border border-accent-400/40 bg-accent-400/10 text-accent-300"
                        title="Posição paga no carrossel de destaques da home (1 a 5)"
                      >
                        <Star size={13} className={item.featured_order ? 'fill-accent-400 stroke-accent-400' : ''} />
                        Destaque
                        <select
                          value={item.featured_order ?? ''}
                          onChange={(e) => handleSetFeatured(item, e.target.value)}
                          disabled={busy}
                          className="bg-surface-800 border border-muted-600 rounded px-1 py-0.5 text-xs text-cream-200"
                        >
                          <option value="">—</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}º</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {!isSelected && (
                      <button
                        onClick={() => handleSelect(item.id)}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-surface-900 font-semibold transition"
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
                    <button
                      onClick={() => openContentModal(item)}
                      disabled={busy}
                      className="text-xs px-3 py-1.5 rounded-lg border border-muted-600 bg-surface-800 hover:bg-surface-900 disabled:opacity-50 text-cream-300 transition"
                    >
                      Editar página
                    </button>
                    {item.status === 'active' && (
                      <button
                        onClick={() => handleSetStatus(item, 'finished')}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-lg border border-muted-600 bg-surface-800 hover:bg-surface-900 disabled:opacity-50 text-cream-300 transition"
                      >
                        Arquivar
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-cream-400">Pedidos pagos</p>
                    <p className="text-lg font-bold text-cream-200">{item.orders_count}</p>
                  </div>
                  <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-cream-400">Ingressos</p>
                    <p className="text-lg font-bold text-cream-200">{item.tickets_count}</p>
                  </div>
                  <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-cream-400">Faturamento líquido</p>
                    <p className="text-lg font-bold text-accent-400">{fmtCurrency(item.net_revenue)}</p>
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
          <div className="bg-surface-700 border border-muted-700 rounded-xl w-full max-w-lg p-6 space-y-4">
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
                placeholder="Nome do Evento - 1ª Edição"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Slug (endereço da página) *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
                placeholder="nome-do-evento-1-edicao"
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

            <div>
              <label className={labelCls}>Tipo de evento</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                <option value="">— Selecionar —</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
                ))}
              </select>
              <p className="text-xs text-cream-400 mt-1">Usado nos filtros da página inicial.</p>
            </div>

            {/* ---- Página do evento (opcional) ---- */}
            <div className="border-t border-muted-700 pt-4">
              <p className="text-sm font-semibold text-cream-200 mb-1">Página do evento (opcional)</p>
              <p className="text-xs text-cream-400 mb-3">
                Tudo aqui pode ser preenchido depois pelo botão &quot;Editar página&quot;.
              </p>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>URL do banner (arte principal)</label>
                  <input type="url" value={form.banner_url} onChange={set('banner_url')} placeholder="https://..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>URL da imagem de compartilhamento (OG)</label>
                  <input type="url" value={form.og_image_url} onChange={set('og_image_url')} placeholder="https://... (1200x600)" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Latitude</label>
                    <input type="text" value={form.venue_lat} onChange={set('venue_lat')} placeholder="-23.6500" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Longitude</label>
                    <input type="text" value={form.venue_lng} onChange={set('venue_lng')} placeholder="-46.5833" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Subtítulo (aparece sob o título)</label>
                  <input type="text" value={form.subtitle} onChange={set('subtitle')} placeholder="Super Edição" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Aviso de abertura das vendas</label>
                  <input type="text" value={form.opening_notice} onChange={set('opening_notice')} placeholder="08/07 às 18h" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Lineup (1 artista por linha: Nome | gênero | tipo)</label>
                  <textarea rows={4} value={form.lineup_text} onChange={set('lineup_text')} placeholder="Artista Principal | Pagode | principal" className={`${inputCls} font-mono text-xs`} />
                  <p className="text-xs text-cream-400 mt-1">tipo: principal · anfitriao · dj · (vazio = normal)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-muted-600 text-cream-300 hover:bg-surface-800 text-sm transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-surface-900 font-semibold text-sm transition"
              >
                {saving ? 'Criando…' : 'Criar evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Editar página" (conteúdo público do evento) */}
      {contentTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
          <div className="bg-surface-700 border border-muted-700 rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-cream-200">Página: {contentTarget.title}</h3>
              <button
                onClick={() => setContentTarget(null)}
                className="text-cream-400 hover:text-cream-200 transition"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg px-3 py-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className={labelCls}>URL do banner (arte principal)</label>
              <input type="url" value={contentForm.banner_url} onChange={setC('banner_url')} placeholder="https://..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>URL da imagem de compartilhamento (OG)</label>
              <input type="url" value={contentForm.og_image_url} onChange={setC('og_image_url')} placeholder="https://... (1200x600)" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Latitude</label>
                <input type="text" value={contentForm.venue_lat} onChange={setC('venue_lat')} placeholder="-23.6500" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Longitude</label>
                <input type="text" value={contentForm.venue_lng} onChange={setC('venue_lng')} placeholder="-46.5833" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Tipo de evento</label>
              <select value={contentForm.category} onChange={(e) => setContentForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                <option value="">— Selecionar —</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Subtítulo</label>
              <input type="text" value={contentForm.subtitle} onChange={setC('subtitle')} placeholder="Super Edição" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Aviso de abertura das vendas</label>
              <input type="text" value={contentForm.opening_notice} onChange={setC('opening_notice')} placeholder="08/07 às 18h" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Lineup (1 artista por linha: Nome | gênero | tipo)</label>
              <textarea rows={5} value={contentForm.lineup_text} onChange={setC('lineup_text')} className={`${inputCls} font-mono text-xs`} />
              <p className="text-xs text-cream-400 mt-1">tipo: principal · anfitriao · dj · (vazio = normal)</p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setContentTarget(null)}
                className="px-4 py-2 rounded-lg border border-muted-600 text-cream-300 hover:bg-surface-800 text-sm transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveContent}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-surface-900 font-semibold text-sm transition"
              >
                {saving ? 'Salvando…' : 'Salvar página'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
