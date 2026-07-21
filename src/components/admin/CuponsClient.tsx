'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Pencil, Trash2, Power, X } from 'lucide-react';
import type { CupomListItem } from '@/app/admin/cupons/page';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtNumber = (v: number) => v.toLocaleString('pt-BR');

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

const TYPE_LABEL: Record<CupomListItem['coupon_type'], string> = {
  discount_percent: '% de desconto',
  discount_fixed: 'R$ de desconto',
  free_fee: 'Isenta a taxa',
};

// Valor do benefício, formatado pro contexto do tipo
function benefitLabel(c: Pick<CupomListItem, 'coupon_type' | 'discount_value'>) {
  if (c.coupon_type === 'discount_percent') return `${Number(c.discount_value)}% off`;
  if (c.coupon_type === 'discount_fixed') return `${fmtCurrency(Number(c.discount_value))} off`;
  return 'Sem taxa';
}

// Situação real do cupom (além do is_active)
function statusInfo(c: CupomListItem): { label: string; tone: 'ok' | 'muted' | 'warn' } {
  if (!c.is_active) return { label: 'Inativo', tone: 'muted' };
  const now = Date.now();
  if (c.valid_from && new Date(c.valid_from).getTime() > now) return { label: 'Agendado', tone: 'warn' };
  if (c.valid_until && new Date(c.valid_until).getTime() < now) return { label: 'Expirado', tone: 'muted' };
  if (c.max_uses !== null && c.used_count >= c.max_uses) return { label: 'Esgotado', tone: 'warn' };
  return { label: 'Ativo', tone: 'ok' };
}

function StatusBadge({ c }: { c: CupomListItem }) {
  const { label, tone } = statusInfo(c);
  const cls =
    tone === 'ok'
      ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50'
      : tone === 'warn'
        ? 'bg-amber-900/30 text-amber-300 border-amber-700/50'
        : 'bg-surface-800/60 text-cream-400 border-muted-600';
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
  );
}

// datetime-local trabalha em horário local; o banco em ISO/UTC
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FormState = {
  code: string;
  coupon_type: CupomListItem['coupon_type'];
  discount_value: string;
  max_uses: string;
  valid_from: string;
  valid_until: string;
};

const EMPTY_FORM: FormState = {
  code: '',
  coupon_type: 'discount_percent',
  discount_value: '',
  max_uses: '',
  valid_from: '',
  valid_until: '',
};

export function CuponsClient({
  items,
  eventId,
  eventTitle,
}: {
  items: CupomListItem[];
  eventId: string;
  eventTitle: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal de criar/editar: null = fechado, 'new' = criando, senão id do cupom
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter === 'active' && !it.is_active) return false;
      if (statusFilter === 'inactive' && it.is_active) return false;
      if (query.trim() && !it.code.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [items, query, statusFilter]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, it) => ({
          uses: acc.uses + it.orders_count,
          discount: acc.discount + it.discount_total,
          revenue: acc.revenue + it.revenue_total,
        }),
        { uses: 0, discount: 0, revenue: 0 },
      ),
    [filtered],
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing('new');
  }

  function openEdit(c: CupomListItem) {
    setForm({
      code: c.code,
      coupon_type: c.coupon_type,
      discount_value: c.discount_value !== null ? String(c.discount_value) : '',
      max_uses: c.max_uses !== null ? String(c.max_uses) : '',
      valid_from: isoToLocalInput(c.valid_from),
      valid_until: isoToLocalInput(c.valid_until),
    });
    setFormError(null);
    setEditing(c.id);
  }

  async function save() {
    setSaving(true);
    setFormError(null);

    const payload = {
      code: form.code.trim().toUpperCase(),
      coupon_type: form.coupon_type,
      discount_value:
        form.coupon_type === 'free_fee' ? null : Number(form.discount_value.replace(',', '.')),
      max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
      valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
    };

    try {
      const res =
        editing === 'new'
          ? await fetch('/api/admin/cupons', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...payload, event_id: eventId }),
            })
          : await fetch(`/api/admin/cupons/${editing}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'update', ...payload }),
            });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || 'Erro ao salvar cupom.');
        return;
      }
      setEditing(null);
      router.refresh();
    } catch {
      setFormError('Erro de rede ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: CupomListItem) {
    setBusyId(c.id);
    try {
      await fetch(`/api/admin/cupons/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active', is_active: !c.is_active }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: CupomListItem) {
    if (!window.confirm(`Excluir o cupom "${c.code}"? Essa ação não pode ser desfeita.`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/cupons/${c.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(data.error || 'Erro ao excluir cupom.');
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const inputCls =
    'w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400';

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-cream-400">
          {items.length} {items.length === 1 ? 'cupom' : 'cupons'} · {eventTitle}
        </p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-surface-900 font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          + Novo cupom
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-surface-700 border border-muted-700 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className={inputCls}
        >
          <option value="all">Ativos e inativos</option>
          <option value="active">Somente ativos</option>
          <option value="inactive">Somente inativos</option>
        </select>
      </div>

      {/* Totais do filtro */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surface-700 border border-muted-700 rounded-lg p-3">
          <p className="text-xs text-cream-400">Usos (pedidos pagos)</p>
          <p className="text-lg font-bold text-cream-200">{fmtNumber(totals.uses)}</p>
        </div>
        <div className="bg-surface-700 border border-muted-700 rounded-lg p-3">
          <p className="text-xs text-cream-400">Desconto concedido</p>
          <p className="text-lg font-bold text-cream-200">{fmtCurrency(totals.discount)}</p>
        </div>
        <div className="bg-surface-700 border border-muted-700 rounded-lg p-3">
          <p className="text-xs text-cream-400">Faturamento com cupom</p>
          <p className="text-lg font-bold text-accent-400">{fmtCurrency(totals.revenue)}</p>
        </div>
      </div>

      {/* Tabela (desktop) */}
      <div className="hidden md:block bg-surface-700 border border-muted-700 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-cream-400 py-8 text-sm">
            {items.length === 0
              ? 'Nenhum cupom neste evento ainda. Clique em "Novo cupom" para começar.'
              : 'Nenhum cupom bate com os filtros.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-800 text-cream-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Benefício</th>
                <th className="text-left px-4 py-3">Validade</th>
                <th className="text-right px-4 py-3">Usos</th>
                <th className="text-right px-4 py-3">Desconto dado</th>
                <th className="text-right px-4 py-3">Faturamento</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-muted-700 hover:bg-surface-800/50 transition">
                  <td className="px-4 py-3 text-cream-200 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3 text-cream-300">{benefitLabel(c)}</td>
                  <td className="px-4 py-3 text-cream-400 text-xs">
                    {c.valid_from || c.valid_until ? (
                      <>
                        {fmtDateTime(c.valid_from) ?? 'Imediato'}
                        {' → '}
                        {fmtDateTime(c.valid_until) ?? 'Sem fim'}
                      </>
                    ) : (
                      'Sempre válido'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-cream-300">
                    {fmtNumber(c.used_count)}
                    {c.max_uses !== null && <span className="text-cream-400">/{fmtNumber(c.max_uses)}</span>}
                    {c.pending_count > 0 && (
                      <span className="block text-[11px] text-amber-300/80">+{c.pending_count} pendente(s)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-cream-300">{fmtCurrency(c.discount_total)}</td>
                  <td className="px-4 py-3 text-right text-cream-300">{fmtCurrency(c.revenue_total)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge c={c} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        title="Editar"
                        className="p-1.5 text-cream-400 hover:text-accent-400 transition"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => toggleActive(c)}
                        disabled={busyId === c.id}
                        title={c.is_active ? 'Desativar' : 'Ativar'}
                        className={`p-1.5 transition disabled:opacity-50 ${
                          c.is_active
                            ? 'text-emerald-300 hover:text-cream-400'
                            : 'text-cream-400 hover:text-emerald-300'
                        }`}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        onClick={() => remove(c)}
                        disabled={busyId === c.id}
                        title="Excluir (só se nunca usado)"
                        className="p-1.5 text-cream-400 hover:text-red-400 transition disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-cream-400 py-8 text-sm">
            {items.length === 0 ? 'Nenhum cupom neste evento ainda.' : 'Nenhum cupom bate com os filtros.'}
          </p>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="bg-surface-700 border border-muted-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-cream-200 font-mono font-bold">{c.code}</p>
                  <p className="text-cream-400 text-xs">{benefitLabel(c)}</p>
                </div>
                <StatusBadge c={c} />
              </div>
              <p className="text-xs text-cream-400 mb-3">
                {c.valid_from || c.valid_until
                  ? `${fmtDateTime(c.valid_from) ?? 'Imediato'} → ${fmtDateTime(c.valid_until) ?? 'Sem fim'}`
                  : 'Sempre válido'}
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div>
                  <p className="text-cream-400">Usos</p>
                  <p className="text-cream-200 font-semibold">
                    {fmtNumber(c.used_count)}
                    {c.max_uses !== null && `/${fmtNumber(c.max_uses)}`}
                  </p>
                </div>
                <div>
                  <p className="text-cream-400">Desconto</p>
                  <p className="text-cream-200 font-semibold">{fmtCurrency(c.discount_total)}</p>
                </div>
                <div>
                  <p className="text-cream-400">Faturamento</p>
                  <p className="text-accent-400 font-semibold">{fmtCurrency(c.revenue_total)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(c)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-surface-800 hover:bg-surface-900 text-cream-200 text-xs py-2 rounded border border-muted-600 transition"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  onClick={() => toggleActive(c)}
                  disabled={busyId === c.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-surface-800 hover:bg-surface-900 text-cream-200 text-xs py-2 rounded border border-muted-600 transition disabled:opacity-50"
                >
                  <Power size={14} /> {c.is_active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => remove(c)}
                  disabled={busyId === c.id}
                  className="inline-flex items-center justify-center px-3 bg-surface-800 hover:bg-red-950 text-red-400 text-xs py-2 rounded border border-muted-600 transition disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal criar/editar */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-700 border border-muted-600 rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-cream-200">
                {editing === 'new' ? 'Novo cupom' : 'Editar cupom'}
              </h2>
              <button onClick={() => setEditing(null)} className="text-cream-400 hover:text-cream-200 transition">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-cream-400 mb-1">Código *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="EX: GORDINHO10"
                  maxLength={32}
                  className={`${inputCls} font-mono uppercase`}
                />
                <p className="text-[11px] text-cream-400 mt-1">Letras, números e hífen. O comprador digita esse código no checkout.</p>
              </div>

              <div>
                <label className="block text-xs text-cream-400 mb-1">Tipo *</label>
                <select
                  value={form.coupon_type}
                  onChange={(e) =>
                    setForm({ ...form, coupon_type: e.target.value as FormState['coupon_type'] })
                  }
                  className={inputCls}
                >
                  {Object.entries(TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {form.coupon_type !== 'free_fee' && (
                <div>
                  <label className="block text-xs text-cream-400 mb-1">
                    {form.coupon_type === 'discount_percent' ? 'Desconto (%) *' : 'Desconto (R$) *'}
                  </label>
                  <input
                    type="number"
                    min={form.coupon_type === 'discount_percent' ? 1 : 0.01}
                    max={form.coupon_type === 'discount_percent' ? 100 : undefined}
                    step={form.coupon_type === 'discount_percent' ? 1 : 0.01}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    placeholder={form.coupon_type === 'discount_percent' ? '10' : '20,00'}
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-cream-400 mb-1">Limite de usos</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Vazio = ilimitado"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-cream-400 mb-1">Válido de</label>
                  <input
                    type="datetime-local"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-cream-400 mb-1">Válido até</label>
                  <input
                    type="datetime-local"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="text-[11px] text-cream-400 -mt-1">Vazio = sem restrição de período.</p>

              {formError && (
                <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditing(null)}
                  disabled={saving}
                  className="flex-1 bg-surface-800 hover:bg-surface-900 text-cream-200 border border-muted-600 font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving || !form.code.trim() || (form.coupon_type !== 'free_fee' && !form.discount_value)}
                  className="flex-1 bg-accent-400 hover:bg-accent-500 text-surface-900 font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : editing === 'new' ? 'Criar cupom' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
