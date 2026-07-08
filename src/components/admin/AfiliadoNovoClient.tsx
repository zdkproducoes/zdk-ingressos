'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

type EventOption = { id: string; title: string };

// Converte "João da Silva" em "joao-da-silva"
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')    // só letras, números, espaço, hífen
    .trim()
    .replace(/\s+/g, '-')             // espaços viram hífen
    .replace(/-+/g, '-')              // colapsa hífens repetidos
    .replace(/^-|-$/g, '');           // tira hífens das pontas
}

const CODE_REGEX = /^[a-z0-9-]+$/;

export function AfiliadoNovoClient({ events }: { events: EventOption[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false); // se usuário editou manualmente, não sobrescreve
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commission, setCommission] = useState('10');
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-sugere code a partir do nome enquanto user não editou code manualmente
  useEffect(() => {
    if (!codeTouched) {
      setCode(slugifyName(name));
    }
  }, [name, codeTouched]);

  const codeValid = code.length === 0 || CODE_REGEX.test(code);

  const handleSubmit = async () => {
    setError(null);

    // Validações client-side antes de bater na API
    if (!name.trim()) return setError('Nome é obrigatório.');
    if (!code.trim()) return setError('Code é obrigatório.');
    if (!CODE_REGEX.test(code)) return setError('Code deve conter apenas letras minúsculas, números e hífen.');
    if (!eventId) return setError('Selecione o evento.');
    const commissionNum = Number(commission);
    if (Number.isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      return setError('Comissão deve ser um número entre 0 e 100.');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/afiliados/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          commission_percent: commissionNum,
          event_id: eventId,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao criar afiliado.');
        setSubmitting(false);
        return;
      }
      // Sucesso → vai pra página de detalhes do afiliado recém-criado
      router.push(`/admin/afiliados/${json.id}`);
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm text-cream-300 mb-1">Nome *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: João da Silva"
          className="w-full bg-wine-800 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400"
        />
      </div>

      <div>
        <label className="block text-sm text-cream-300 mb-1">
          Code * <span className="text-cream-400 font-normal">(usado no link <span className="font-mono">?ref=</span>)</span>
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toLowerCase());
            setCodeTouched(true);
          }}
          placeholder="joao-da-silva"
          className={`w-full bg-wine-800 text-cream-200 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 ${
            codeValid ? 'border-mauve-600 focus:ring-amber-sacode-400' : 'border-red-600 focus:ring-red-500'
          }`}
        />
        {!codeValid && (
          <p className="text-xs text-red-300 mt-1">
            Apenas letras minúsculas, números e hífen.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm text-cream-300 mb-1">Evento *</label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full bg-wine-800 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400"
        >
          {events.length === 0 ? (
            <option value="">Nenhum evento ativo</option>
          ) : (
            events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))
          )}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-cream-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="opcional"
            className="w-full bg-wine-800 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400"
          />
        </div>
        <div>
          <label className="block text-sm text-cream-300 mb-1">Telefone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="opcional"
            className="w-full bg-wine-800 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-cream-300 mb-1">Comissão (%) *</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          className="w-full bg-wine-800 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400"
        />
      </div>

      <div>
        <label className="block text-sm text-cream-300 mb-1">Notas internas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="opcional — visível só pro admin"
          className="w-full bg-wine-800 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || events.length === 0}
        className="w-full md:w-auto bg-amber-sacode-400 hover:bg-amber-sacode-500 disabled:opacity-50 disabled:cursor-not-allowed text-wine-900 font-semibold px-6 py-2.5 rounded-lg text-sm transition"
      >
        {submitting ? 'Criando…' : 'Criar afiliado'}
      </button>
    </div>
  );
}
