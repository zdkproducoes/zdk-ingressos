'use client';

import { useEffect, useMemo, useState } from 'react';

type EventOption = { id: string; title: string; slug: string };

type GuestProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
};

type Cortesia = {
  id: string;
  order_number: number;
  created_at: string;
  events: { title: string } | null;
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null;
  issuer: { first_name: string | null; last_name: string | null } | null;
  order_items: Array<{ id: string; attendee_name: string | null; ticket_batches: { name: string } | null }>;
};

const MAX_QUANTITY = 10;

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function CortesiasClient({ events, signupUrl }: { events: EventOption[]; signupUrl: string }) {
  const [eventId, setEventId] = useState(events[0]?.id || '');
  const [searchInput, setSearchInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ found: boolean; profile?: GuestProfile; error?: string } | null>(null);
  const [attendeeName, setAttendeeName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [cortesias, setCortesias] = useState<Cortesia[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const isLikelyCpf = useMemo(() => {
    const cleaned = searchInput.replace(/\D/g, '');
    return cleaned.length > 0 && !searchInput.includes('@');
  }, [searchInput]);

  const handleSearchChange = (val: string) => {
    if (val.includes('@') || /[a-zA-Z]/.test(val)) {
      setSearchInput(val);
    } else {
      setSearchInput(formatCpf(val));
    }
    setSearchResult(null);
    setAttendeeName('');
    setQuantity(1);
    setFeedback(null);
  };

  const loadCortesias = async () => {
    if (!eventId) return;
    setLoadingList(true);
    try {
      const res = await fetch(`/api/admin/cortesias?eventId=${eventId}`);
      const data = await res.json();
      setCortesias(data.cortesias || []);
    } catch {
      setCortesias([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadCortesias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`/api/admin/cortesias/buscar?q=${encodeURIComponent(searchInput.trim())}`);
      const data = await res.json();
      setSearchResult(data);
      if (data.found && data.profile) {
        setAttendeeName(data.profile.name || '');
        setQuantity(1);
      }
    } catch {
      setSearchResult({ found: false, error: 'Erro ao buscar' });
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!searchResult?.found || !searchResult.profile || !eventId) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/cortesias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          guestProfileId: searchResult.profile.id,
          attendeeName: attendeeName.trim(),
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ kind: 'error', msg: data.error || 'Erro ao enviar cortesia' });
      } else {
        setFeedback({
          kind: 'success',
          msg: data.warning || data.message || 'Cortesia enviada com sucesso!',
        });
        setSearchInput('');
        setSearchResult(null);
        setAttendeeName('');
        setQuantity(1);
        loadCortesias();
      }
    } catch {
      setFeedback({ kind: 'error', msg: 'Erro de conexão' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(signupUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      window.prompt('Copie o link:', signupUrl);
    }
  };

  return (
    <div className="space-y-8">
      {/* Seletor de evento */}
      {events.length > 1 && (
        <div>
          <label className="block text-sm text-cream-300 mb-1">Evento</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="bg-wine-700 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400"
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Card de busca + emissão */}
      <div className="bg-wine-700 border border-mauve-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-cream-200 mb-4">Enviar nova cortesia</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-cream-300 mb-1">
              Buscar convidado por CPF ou e-mail
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="000.000.000-00 ou email@exemplo.com"
                className="flex-1 bg-wine-800 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400 placeholder:text-cream-500"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchInput.trim()}
                className="rounded-lg bg-amber-sacode-400 hover:bg-amber-sacode-500 disabled:bg-mauve-600 disabled:cursor-not-allowed text-wine-800 font-semibold px-4 py-2 text-sm transition"
              >
                {searching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            <p className="text-xs text-cream-400 mt-1">
              {isLikelyCpf ? 'Detectado: CPF' : searchInput.includes('@') ? 'Detectado: e-mail' : ''}
            </p>
          </div>

          {/* Resultado: convidado encontrado */}
          {searchResult && searchResult.found && searchResult.profile && (
            <div className="bg-wine-800 border border-amber-sacode-400/40 rounded-lg p-4">
              <p className="text-sm text-cream-400 mb-1">Convidado encontrado:</p>
              <p className="text-cream-200 font-medium">{searchResult.profile.name}</p>
              <p className="text-cream-400 text-sm">{searchResult.profile.email}</p>
              {searchResult.profile.cpf && (
                <p className="text-cream-400 text-sm">CPF: {formatCpf(searchResult.profile.cpf)}</p>
              )}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                <div>
                  <label className="block text-sm text-cream-300 mb-1">
                    Nome no ingresso (editável)
                  </label>
                  <input
                    type="text"
                    value={attendeeName}
                    onChange={(e) => setAttendeeName(e.target.value)}
                    maxLength={200}
                    className="w-full bg-wine-700 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cream-300 mb-1">
                    Quantidade
                  </label>
                  <div className="flex items-stretch border border-mauve-600 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="px-3 bg-wine-700 hover:bg-wine-600 disabled:opacity-40 disabled:cursor-not-allowed text-cream-200 text-lg font-bold"
                      aria-label="Diminuir"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={MAX_QUANTITY}
                      value={quantity}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isNaN(v)) return setQuantity(1);
                        setQuantity(Math.max(1, Math.min(MAX_QUANTITY, v)));
                      }}
                      className="flex-1 bg-wine-700 text-cream-200 text-center text-sm focus:outline-none focus:bg-wine-600 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.min(MAX_QUANTITY, q + 1))}
                      disabled={quantity >= MAX_QUANTITY}
                      className="px-3 bg-wine-700 hover:bg-wine-600 disabled:opacity-40 disabled:cursor-not-allowed text-cream-200 text-lg font-bold"
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-cream-400 mt-1">Máximo {MAX_QUANTITY}</p>
                </div>
              </div>

              <p className="text-xs text-cream-400 mt-3">
                {quantity === 1
                  ? '1 ingresso será enviado por e-mail.'
                  : `${quantity} ingressos serão enviados em um único e-mail, todos no mesmo nome.`}
              </p>

              <button
                onClick={handleSubmit}
                disabled={submitting || !attendeeName.trim()}
                className="mt-4 w-full sm:w-auto rounded-lg bg-amber-sacode-400 hover:bg-amber-sacode-500 disabled:bg-mauve-600 disabled:cursor-not-allowed text-wine-800 font-semibold px-6 py-2.5 text-sm transition"
              >
                {submitting
                  ? 'Enviando...'
                  : quantity === 1
                    ? '🎁 Enviar cortesia'
                    : `🎁 Enviar ${quantity} cortesias`}
              </button>
            </div>
          )}

          {/* Resultado: convidado não encontrado */}
          {searchResult && !searchResult.found && (
            <div className="bg-wine-800 border border-mauve-600 rounded-lg p-4">
              <p className="text-cream-300 text-sm mb-3">
                {searchResult.error || 'Convidado não encontrado.'}
              </p>
              <p className="text-cream-400 text-xs mb-3">
                O convidado precisa criar uma conta antes de receber cortesia. Copie o link abaixo
                e envie a ele por WhatsApp ou e-mail. Quando ele se cadastrar, busque novamente aqui.
              </p>
              <div className="flex gap-2 items-center">
                <input
                  readOnly
                  value={signupUrl}
                  className="flex-1 bg-wine-700 text-cream-300 border border-mauve-600 rounded-lg px-3 py-2 text-xs"
                />
                <button
                  onClick={handleCopyLink}
                  className="rounded-lg bg-mauve-600 hover:bg-mauve-500 text-cream-200 font-medium px-4 py-2 text-sm transition whitespace-nowrap"
                >
                  {linkCopied ? '✓ Copiado' : 'Copiar link'}
                </button>
              </div>
            </div>
          )}

          {feedback && (
            <div className={`rounded-lg p-3 text-sm ${
              feedback.kind === 'success'
                ? 'bg-green-950 border border-green-800 text-green-100'
                : 'bg-red-950 border border-red-800 text-red-100'
            }`}>
              {feedback.msg}
            </div>
          )}
        </div>
      </div>

      {/* Lista de cortesias enviadas */}
      <div className="bg-wine-700 border border-mauve-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-cream-200 mb-4">
          Cortesias já enviadas {cortesias.length > 0 && (
            <span className="text-cream-400 text-sm font-normal">({cortesias.length})</span>
          )}
        </h2>

        {loadingList ? (
          <p className="text-cream-400 text-sm">Carregando...</p>
        ) : cortesias.length === 0 ? (
          <p className="text-cream-400 text-sm">Nenhuma cortesia enviada ainda.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-cream-400 border-b border-mauve-700">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Convidado</th>
                  <th className="py-2 pr-4">Nome no ingresso</th>
                  <th className="py-2 pr-4">Qtd</th>
                  <th className="py-2 pr-4">Emitido por</th>
                </tr>
              </thead>
              <tbody>
                {cortesias.map((c) => {
                  const guestName = `${c.profiles?.first_name || ''} ${c.profiles?.last_name || ''}`.trim();
                  const issuerName = c.issuer
                    ? `${c.issuer.first_name || ''} ${c.issuer.last_name || ''}`.trim()
                    : '—';
                  const ticketsCount = c.order_items.length;
                  const firstAttendee = c.order_items[0]?.attendee_name || '—';
                  return (
                    <tr key={c.id} className="border-b border-mauve-800 text-cream-200">
                      <td className="py-2 pr-4 text-cream-400">#{c.order_number}</td>
                      <td className="py-2 pr-4 text-cream-300 whitespace-nowrap">{formatDateTime(c.created_at)}</td>
                      <td className="py-2 pr-4">
                        <div>{guestName || '—'}</div>
                        <div className="text-cream-400 text-xs">{c.profiles?.email}</div>
                      </td>
                      <td className="py-2 pr-4 text-cream-300">{firstAttendee}</td>
                      <td className="py-2 pr-4 text-cream-300 text-center">
                        {ticketsCount > 1 ? (
                          <span className="inline-block bg-amber-sacode-400/20 text-amber-sacode-300 px-2 py-0.5 rounded text-xs font-semibold">
                            {ticketsCount}
                          </span>
                        ) : (
                          <span className="text-cream-400">{ticketsCount}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-cream-300">{issuerName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
