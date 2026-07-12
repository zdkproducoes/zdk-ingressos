'use client';

// Gerência das metas semanais dos embaixadores (criar, editar, excluir)
// e visão do resultado agregado de cada semana.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Pencil, Trash2, Target, Trophy } from 'lucide-react';
import type { MetaListItem, EventGoalItem } from '@/app/admin/afiliados/metas/page';

// '2026-07-01' -> '01/07/2026'
const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

// 'YYYY-MM-DD' + n dias (sem depender de timezone)
const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

const STATUS_BADGE: Record<MetaListItem['status'], { label: string; className: string }> = {
  current: {
    label: 'Em andamento',
    className: 'bg-accent-400/15 text-accent-400 border-accent-400/40',
  },
  past: {
    label: 'Encerrada',
    className: 'bg-muted-800/60 text-cream-400 border-muted-600',
  },
  future: {
    label: 'Agendada',
    className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  },
};

const emptyForm = { title: '', week_start: '', week_end: '', target_tickets: '', reward: '' };

// Card da meta do evento (a grande meta — 1 por evento, upsert)
function EventGoalCard({
  eventGoal,
  eventId,
  ambassadors,
  inputClass,
}: {
  eventGoal: EventGoalItem | null;
  eventId: string;
  ambassadors: number;
  inputClass: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState(eventGoal ? String(eventGoal.target_tickets) : '');
  const [reward, setReward] = useState(eventGoal?.reward ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const targetNum = Number(target);
    if (!Number.isInteger(targetNum) || targetNum < 1) {
      return setError('Meta de ingressos deve ser um número inteiro maior que zero.');
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/afiliados/metas/evento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          target_tickets: targetNum,
          reward: reward.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao salvar meta do evento.');
        setSaving(false);
        return;
      }
      setSaving(false);
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    // Primeiro clique arma a confirmação; segundo clique remove
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      setTimeout(() => setConfirmingRemove(false), 3500);
      return;
    }
    setConfirmingRemove(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/afiliados/metas/evento?event_id=${eventId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao remover meta do evento.');
        return;
      }
      setTarget('');
      setReward('');
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  return (
    <div className="bg-surface-700 border border-accent-400/40 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-cream-200 uppercase tracking-wider mb-1 flex items-center gap-2">
        <Trophy size={16} className="text-accent-400" />
        Meta do evento (a grande meta)
      </h3>
      <p className="text-xs text-cream-400 mb-4">
        Total de ingressos que cada embaixador deve vender na campanha inteira.
        As metas semanais quebram essa meta em partes.
      </p>

      {error && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg px-3 py-2 mb-4">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm text-cream-300 mb-1">Meta (ingressos por embaixador) *</label>
          <input
            type="number"
            min="1"
            step="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Ex.: 40"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm text-cream-300 mb-1">Prêmio da campanha</label>
          <input
            type="text"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="opcional — aparece no painel do embaixador"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent-400 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed text-surface-900 font-semibold px-6 py-2.5 rounded-lg text-sm transition"
        >
          {saving ? 'Salvando…' : eventGoal ? 'Salvar grande meta' : 'Definir grande meta'}
        </button>
        {eventGoal && (
          <button
            onClick={handleRemove}
            className={`px-4 py-2.5 rounded-lg text-sm border transition ${
              confirmingRemove
                ? 'bg-red-900/40 text-red-300 border-red-700/50'
                : 'bg-surface-800 text-cream-400 border-muted-600 hover:text-red-300'
            }`}
          >
            {confirmingRemove ? 'Confirmar remoção?' : 'Remover'}
          </button>
        )}
      </div>

      {eventGoal && (
        <div className="grid grid-cols-2 gap-2 text-xs mt-4">
          <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2">
            <p className="text-cream-400">Ingressos no evento (todos)</p>
            <p className="text-cream-200 font-bold text-base">{eventGoal.total_tickets}</p>
          </div>
          <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2">
            <p className="text-cream-400">Bateram a grande meta</p>
            <p className="text-cream-200 font-bold text-base">
              {eventGoal.achievers}
              <span className="text-cream-400 font-normal text-xs"> de {ambassadors}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function MetasSemanaisClient({
  items,
  eventGoal,
  eventId,
  ambassadors,
}: {
  items: MetaListItem[];
  eventGoal: EventGoalItem | null;
  eventId: string;
  ambassadors: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof typeof emptyForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Ao escolher o início, sugere fim = início + 6 dias (semana cheia)
  const onStartChange = (value: string) => {
    setForm((f) => ({
      ...f,
      week_start: value,
      week_end: f.week_end || !value ? f.week_end : addDays(value, 6),
    }));
  };

  const startEdit = (item: MetaListItem) => {
    setEditingId(item.id);
    setError(null);
    setForm({
      title: item.title ?? '',
      week_start: item.week_start,
      week_end: item.week_end,
      target_tickets: String(item.target_tickets),
      reward: item.reward ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.week_start) return setError('Escolha a data de início.');
    if (!form.week_end) return setError('Escolha a data de fim.');
    if (form.week_end < form.week_start) return setError('O fim deve ser igual ou depois do início.');
    const target = Number(form.target_tickets);
    if (!Number.isInteger(target) || target < 1) {
      return setError('Meta de ingressos deve ser um número inteiro maior que zero.');
    }

    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/admin/afiliados/metas/${editingId}`
        : '/api/admin/afiliados/metas';
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          title: form.title.trim() || null,
          week_start: form.week_start,
          week_end: form.week_end,
          target_tickets: target,
          reward: form.reward.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao salvar meta.');
        setSubmitting(false);
        return;
      }
      setForm(emptyForm);
      setEditingId(null);
      setSubmitting(false);
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Primeiro clique arma a confirmação; segundo clique exclui
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId((c) => (c === id ? null : c)), 3500);
      return;
    }
    setConfirmingDeleteId(null);
    try {
      const res = await fetch(`/api/admin/afiliados/metas/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao excluir meta.');
        return;
      }
      if (editingId === id) cancelEdit();
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  const inputClass =
    'w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400';

  return (
    <div className="space-y-6">
      {/* Meta do evento (a grande meta) */}
      <EventGoalCard
        eventGoal={eventGoal}
        eventId={eventId}
        ambassadors={ambassadors}
        inputClass={inputClass}
      />

      {/* Formulário criar/editar meta semanal */}
      <div className="bg-surface-700 border border-muted-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-cream-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target size={16} className="text-accent-400" />
          {editingId ? 'Editar meta semanal' : 'Nova meta semanal'}
        </h3>

        {error && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg px-3 py-2 mb-4">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm text-cream-300 mb-1">Título</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder='opcional — ex.: "Semana 1 — Aquecimento"'
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-cream-300 mb-1">Meta (ingressos por embaixador) *</label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.target_tickets}
              onChange={(e) => setField('target_tickets', e.target.value)}
              placeholder="Ex.: 10"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-cream-300 mb-1">Início *</label>
            <input
              type="date"
              value={form.week_start}
              onChange={(e) => onStartChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-cream-300 mb-1">Fim *</label>
            <input
              type="date"
              value={form.week_end}
              onChange={(e) => setField('week_end', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-cream-300 mb-1">Prêmio da semana</label>
          <input
            type="text"
            value={form.reward}
            onChange={(e) => setField('reward', e.target.value)}
            placeholder='opcional — ex.: "Camisa exclusiva do SACODE" (aparece no painel do embaixador)'
            className={inputClass}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-accent-400 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed text-surface-900 font-semibold px-6 py-2.5 rounded-lg text-sm transition"
          >
            {submitting ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar meta'}
          </button>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="bg-surface-800 hover:bg-surface-900 text-cream-300 border border-muted-600 px-4 py-2.5 rounded-lg text-sm transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Lista de metas */}
      {items.length === 0 ? (
        <p className="text-center text-cream-400 py-8 text-sm">
          Nenhuma meta cadastrada ainda. Crie a primeira acima — ela aparece na hora no
          painel de todos os embaixadores.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const badge = STATUS_BADGE[item.status];
            return (
              <div
                key={item.id}
                className={`bg-surface-700 border rounded-xl p-4 ${
                  item.status === 'current' ? 'border-accent-400/40' : 'border-muted-700'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-cream-200 font-semibold">
                        {item.title || 'Meta semanal'}
                      </p>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-cream-400 mt-0.5">
                      {fmtDate(item.week_start)} a {fmtDate(item.week_end)} · meta de{' '}
                      <strong className="text-cream-300">{item.target_tickets}</strong>{' '}
                      {item.target_tickets === 1 ? 'ingresso' : 'ingressos'} por embaixador
                      {item.reward && <> · 🎁 {item.reward}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(item)}
                      title="Editar"
                      className="p-1.5 text-cream-400 hover:text-accent-400 transition"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Excluir"
                      className={`p-1.5 transition ${
                        confirmingDeleteId === item.id
                          ? 'text-red-400 hover:text-red-300'
                          : 'text-cream-400 hover:text-red-400'
                      }`}
                    >
                      {confirmingDeleteId === item.id ? (
                        <span className="text-xs font-semibold">Confirmar?</span>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Resultado agregado da semana */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2">
                    <p className="text-cream-400">Ingressos na semana (todos)</p>
                    <p className="text-cream-200 font-bold text-base">{item.total_tickets}</p>
                  </div>
                  <div className="bg-surface-800 border border-muted-700 rounded-lg px-3 py-2">
                    <p className="text-cream-400">Bateram a meta</p>
                    <p className="text-cream-200 font-bold text-base">
                      {item.achievers}
                      <span className="text-cream-400 font-normal text-xs"> de {ambassadors}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
