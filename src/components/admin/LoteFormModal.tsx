'use client';

import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import type { BatchRow, SelectedEventOption } from '@/app/admin/lotes/page';

interface Props {
  batch: BatchRow | null; // null = criar; preenchido = editar
  // Evento sendo gerenciado no admin (cookie). Lote novo nasce SEMPRE nele;
  // na edicao o evento do lote nao muda.
  selectedEvent: SelectedEventOption;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  event_id: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
  sort_order: string;
  status: string;
  is_visible: boolean;
  min_per_order: string;
  max_per_order: string;
  starts_at: string; // datetime-local format 'YYYY-MM-DDTHH:MM' (sem timezone)
  ends_at: string;
}

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Ativo (em vendas)' },
  { value: 'paused',    label: 'Pausado (manual)' },
  { value: 'scheduled', label: 'Agendado (futuro)' },
  { value: 'ended',     label: 'Encerrado' },
  { value: 'sold_out',  label: 'Esgotado' },
];

// Converte ISO UTC ('2026-06-07T22:00:00.000Z') -> 'YYYY-MM-DDTHH:MM' local pro input
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  // Subtrai o offset pra mostrar em local time no input
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// Converte 'YYYY-MM-DDTHH:MM' local -> ISO UTC pra mandar pra API
function localInputToISO(local: string): string | null {
  if (!local) return null;
  // new Date('2026-06-07T22:00') interpreta como local time; toISOString vira UTC
  return new Date(local).toISOString();
}

export function LoteFormModal({ batch, selectedEvent, onClose, onSuccess }: Props) {
  const isEdit = batch !== null;

  const [form, setForm] = useState<FormState>(() => ({
    event_id: batch?.event_id ?? selectedEvent.id,
    name: batch?.name ?? '',
    description: batch?.description ?? '',
    price: batch ? String(batch.price) : '',
    quantity: batch ? String(batch.quantity) : '',
    sort_order: batch ? String(batch.sort_order) : '0',
    status: batch?.status ?? 'active',
    is_visible: batch?.is_visible ?? true,
    min_per_order: batch ? String(batch.min_per_order) : '1',
    max_per_order: batch ? String(batch.max_per_order) : '10',
    starts_at: isoToLocalInput(batch?.starts_at ?? null),
    ends_at: isoToLocalInput(batch?.ends_at ?? null),
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fecha com Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, saving]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = useCallback(async () => {
    setError(null);

    // Validacoes basicas client
    if (!form.event_id) { setError('Selecione um evento.'); return; }
    if (!form.name.trim()) { setError('Nome obrigatorio.'); return; }
    const priceNum = parseFloat(form.price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) { setError('Preco invalido.'); return; }
    const qtyNum = parseInt(form.quantity, 10);
    if (isNaN(qtyNum) || qtyNum < 1) { setError('Quantidade invalida.'); return; }
    const minNum = parseInt(form.min_per_order, 10);
    const maxNum = parseInt(form.max_per_order, 10);
    if (isNaN(minNum) || minNum < 1) { setError('Min por pedido invalido.'); return; }
    if (isNaN(maxNum) || maxNum < minNum) { setError('Max por pedido deve ser >= Min.'); return; }
    const sortNum = parseInt(form.sort_order, 10);
    if (isNaN(sortNum)) { setError('Ordem invalida.'); return; }
    // Validacao de datas
    if (form.starts_at && form.ends_at) {
      const sa = new Date(form.starts_at).getTime();
      const ea = new Date(form.ends_at).getTime();
      if (ea < sa) { setError('Data de fim deve ser depois da data de inicio.'); return; }
    }

    const payload = {
      event_id: form.event_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: priceNum,
      quantity: qtyNum,
      sort_order: sortNum,
      status: form.status,
      is_visible: form.is_visible,
      min_per_order: minNum,
      max_per_order: maxNum,
      starts_at: localInputToISO(form.starts_at),
      ends_at: localInputToISO(form.ends_at),
    };

    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/lotes/${batch.id}` : '/api/admin/lotes/create';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit ? { action: 'update', ...payload } : payload;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar.');
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError('Erro de rede: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, batch, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-surface-800 border border-muted-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-muted-700">
          <h2 className="text-cream-200 font-bold text-lg">
            {isEdit ? `Editar lote: ${batch.name}` : 'Novo lote'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-cream-400 hover:text-cream-200 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {isEdit && batch && batch.real_sold > 0 && (
            <div className="bg-blue-900/30 border border-blue-700 rounded p-3 text-blue-200 text-xs">
              Este lote ja vendeu <strong>{batch.real_sold}</strong> ingresso{batch.real_sold === 1 ? '' : 's'} pago{batch.real_sold === 1 ? '' : 's'}.
              Quantidade nao pode ser reduzida abaixo desse valor.
            </div>
          )}

          {/* Evento: fixo no evento gerenciado (novo lote) ou no evento do lote (edicao).
              Nao ha dropdown de proposito — evita criar lote no evento errado. */}
          <Field label="Evento">
            <div className="w-full bg-surface-900/60 border border-muted-700 text-cream-300 rounded px-3 py-2">
              {isEdit ? (batch?.event_title ?? 'Evento do lote') : selectedEvent.title}
            </div>
            {!isEdit && (
              <p className="text-cream-400 text-xs mt-1">
                O lote será criado no evento selecionado no topo do painel. Para outro evento, troque a seleção primeiro.
              </p>
            )}
          </Field>

          {/* Nome */}
          <Field label="Nome do lote *">
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Ex: Ingresso Promocional"
              className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
            />
          </Field>

          {/* Descricao */}
          <Field label="Descricao (opcional)">
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Ex: Lote limitado, valido ate 30/06"
              rows={2}
              className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
            />
          </Field>

          {/* Preco + Quantidade */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preco (R$) *">
              <input
                type="text"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                placeholder="15.00"
                className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
              />
              <p className="text-cream-400 text-xs mt-1">Use ponto como separador (15.00). Cortesias = 0.</p>
            </Field>
            <Field label="Quantidade total *">
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => update('quantity', e.target.value)}
                className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
              />
            </Field>
          </div>

          {/* Min/Max por pedido */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min por pedido">
              <input
                type="number"
                min={1}
                value={form.min_per_order}
                onChange={(e) => update('min_per_order', e.target.value)}
                className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
              />
            </Field>
            <Field label="Max por pedido">
              <input
                type="number"
                min={1}
                value={form.max_per_order}
                onChange={(e) => update('max_per_order', e.target.value)}
                className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
              />
            </Field>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio das vendas (opcional)">
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => update('starts_at', e.target.value)}
                className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
              />
            </Field>
            <Field label="Fim das vendas (opcional)">
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => update('ends_at', e.target.value)}
                className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
              />
            </Field>
          </div>

          {/* Status + Visibilidade + Ordem */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status *">
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Ordem de exibicao">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => update('sort_order', e.target.value)}
                className="w-full bg-surface-900 border border-muted-700 text-cream-200 rounded px-3 py-2"
              />
              <p className="text-cream-400 text-xs mt-1">Menor = aparece primeiro</p>
            </Field>
          </div>

          {/* Visibilidade */}
          <label className="flex items-center gap-2 text-cream-200 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_visible}
              onChange={(e) => update('is_visible', e.target.checked)}
              className="w-4 h-4"
            />
            <span>Visivel publicamente (aparece na pagina do evento)</span>
          </label>
          <p className="text-cream-400 text-xs -mt-3">
            Desmarque para lotes ocultos como cortesias.
          </p>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded p-3 text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-muted-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="bg-muted-700 hover:bg-muted-600 text-cream-200 font-medium px-4 py-2 rounded transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-accent-400 hover:bg-accent-300 text-surface-900 font-bold px-4 py-2 rounded transition disabled:opacity-50"
          >
            {saving ? 'Salvando...' : (isEdit ? 'Salvar alteracoes' : 'Criar lote')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-cream-300 text-xs font-semibold mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}
