'use client';

// PDV de venda offline:
// 1) busca o cliente por CPF ou e-mail (precisa ter conta na plataforma)
// 2) escolhe o lote e a quantidade
// 3) confirma que recebeu o PIX e registra — o pedido nasce aprovado,
//    o cliente recebe QR por e-mail e tudo aparece nos painéis normais.
// Abaixo, o relatório detalhado das vendas offline do evento.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Search, User } from 'lucide-react';
import type { OfflineBatch, OfflineSale } from '@/app/admin/venda-offline/page';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));

type FoundProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
};

export function VendaOfflineClient({
  eventId,
  eventTitle,
  eventStatus,
  batches,
  sales,
}: {
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  batches: OfflineBatch[];
  sales: OfflineSale[];
}) {
  const router = useRouter();

  // Busca de cliente
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [buyer, setBuyer] = useState<FoundProfile | null>(null);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  // Venda
  const sellableBatches = batches.filter((b) => b.available > 0 && b.name !== 'Cortesia');
  const [batchId, setBatchId] = useState<string>(sellableBatches[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedBatch = sellableBatches.find((b) => b.id === batchId) ?? null;
  const total = selectedBatch ? selectedBatch.price * qty : 0;
  const maxQty = Math.min(10, selectedBatch?.available ?? 1);

  const eventoArquivado = eventStatus === 'finished';

  const handleSearch = async () => {
    setSearchMsg(null);
    setBuyer(null);
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/cortesias/buscar?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (json.found) {
        setBuyer(json.profile);
      } else {
        setSearchMsg(
          json.error ||
          'Cliente não encontrado. Ele precisa ter conta na plataforma — peça para se cadastrar em www.zdkingressos.com.br/cadastro (leva 1 minuto no celular).',
        );
      }
    } catch {
      setSearchMsg('Erro de conexão na busca.');
    } finally {
      setSearching(false);
    }
  };

  const handleSell = async () => {
    setError(null);
    setSuccess(null);
    if (!buyer) return setError('Busque e selecione o cliente primeiro.');
    if (!selectedBatch) return setError('Selecione um lote.');
    if (!pixConfirmed) return setError('Confirme que o pagamento PIX foi recebido.');

    setSaving(true);
    try {
      const res = await fetch('/api/admin/venda-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          customerProfileId: buyer.id,
          batchId: selectedBatch.id,
          quantity: qty,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao registrar venda.');
        setSaving(false);
        return;
      }
      setSuccess(json.message || json.warning || 'Venda registrada!');
      // Limpa o formulário pra próxima venda
      setBuyer(null);
      setQuery('');
      setQty(1);
      setPixConfirmed(false);
      router.refresh();
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400';

  const totalOffline = sales
    .filter((s) => s.payment_status === 'approved')
    .reduce((sum, s) => sum + s.total, 0);
  const ticketsOffline = sales
    .filter((s) => s.payment_status === 'approved')
    .reduce((sum, s) => sum + s.tickets, 0);

  return (
    <div className="space-y-6">
      {eventoArquivado && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/50 text-red-200 text-sm rounded-lg px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>Este evento está arquivado — não aceita novas vendas. O relatório abaixo continua disponível.</span>
        </div>
      )}

      {/* ---- Nova venda ---- */}
      {!eventoArquivado && (
        <div className="bg-surface-700 border border-muted-700 rounded-xl p-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-cream-200 uppercase tracking-wider">
              Nova venda offline
            </h2>
            <p className="text-xs text-cream-400 mt-1">
              {eventTitle} · você recebe o PIX na hora e o sistema entrega o ingresso
              por e-mail, igual a uma compra no site.
            </p>
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

          {/* Passo 1: cliente */}
          <div>
            <label className="block text-sm text-cream-300 mb-1">1. Cliente (CPF ou e-mail) *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="000.000.000-00 ou email@exemplo.com"
                className={inputCls}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="inline-flex items-center gap-1.5 bg-surface-800 hover:bg-surface-900 disabled:opacity-50 text-cream-200 text-sm px-4 py-2 rounded-lg border border-muted-600 transition whitespace-nowrap"
              >
                <Search size={15} /> {searching ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
            {searchMsg && <p className="text-xs text-accent-300 mt-2">{searchMsg}</p>}
            {buyer && (
              <div className="mt-3 flex items-center gap-3 bg-surface-800 border border-emerald-700/40 rounded-lg px-4 py-3">
                <User size={18} className="text-emerald-300 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-cream-200 font-medium">{buyer.name}</p>
                  <p className="text-cream-400 text-xs">
                    {buyer.email}{buyer.cpf && <> · CPF {buyer.cpf}</>}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Passo 2: lote + quantidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-cream-300 mb-1">2. Lote *</label>
              {sellableBatches.length === 0 ? (
                <p className="text-xs text-accent-300 bg-surface-800 border border-muted-600 rounded-lg px-3 py-2.5">
                  Nenhum lote com estoque neste evento — crie na aba Lotes.
                </p>
              ) : (
                <select
                  value={batchId}
                  onChange={(e) => { setBatchId(e.target.value); setQty(1); }}
                  className={inputCls}
                >
                  {sellableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {fmtCurrency(b.price)} ({b.available} disp.)
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm text-cream-300 mb-1">Quantidade *</label>
              <select
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className={inputCls}
              >
                {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Passo 3: confirmação do PIX */}
          <div className="bg-surface-800 border border-muted-600 rounded-lg px-4 py-3.5 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-cream-300">Total a receber</span>
              <span className="text-2xl font-bold text-accent-400">{fmtCurrency(total)}</span>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer text-sm text-cream-200">
              <input
                type="checkbox"
                checked={pixConfirmed}
                onChange={(e) => setPixConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-accent-400"
              />
              <span>
                3. Confirmo que <strong>recebi {fmtCurrency(total)} via PIX</strong> deste cliente.
              </span>
            </label>
          </div>

          <button
            onClick={handleSell}
            disabled={saving || !buyer || !selectedBatch || !pixConfirmed}
            className="w-full md:w-auto bg-accent-400 hover:bg-accent-500 disabled:opacity-40 text-surface-900 font-semibold px-8 py-3 rounded-lg text-sm transition"
          >
            {saving ? 'Registrando…' : 'Registrar venda e enviar ingresso'}
          </button>
          <p className="text-xs text-cream-400">
            A venda fica registrada no seu nome, com data e horário, e aparece no Resumo
            e em Pedidos como venda aprovada (PIX).
          </p>
        </div>
      )}

      {/* ---- Relatório ---- */}
      <div className="bg-surface-700 border border-muted-700 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-sm font-semibold text-cream-200 uppercase tracking-wider">
            Vendas offline deste evento
          </h2>
          <p className="text-sm text-cream-400">
            {ticketsOffline} {ticketsOffline === 1 ? 'ingresso' : 'ingressos'} ·{' '}
            <span className="text-accent-400 font-semibold">{fmtCurrency(totalOffline)}</span>
          </p>
        </div>

        {sales.length === 0 ? (
          <p className="text-center text-cream-400 py-8 text-sm">Nenhuma venda offline ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-cream-400 text-xs uppercase tracking-wider border-b border-muted-700">
                <tr>
                  <th className="text-left py-2 pr-3">Data / hora</th>
                  <th className="text-left py-2 pr-3">Vendedor</th>
                  <th className="text-left py-2 pr-3">Cliente</th>
                  <th className="text-left py-2 pr-3">Lote</th>
                  <th className="text-right py-2 pr-3">Qtd</th>
                  <th className="text-right py-2 pr-3">Valor</th>
                  <th className="text-left py-2">Pedido</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.order_id} className="border-b border-muted-700/50">
                    <td className="py-2.5 pr-3 text-cream-300 whitespace-nowrap">{fmtDateTime(s.paid_at)}</td>
                    <td className="py-2.5 pr-3 text-cream-200">{s.seller_name}</td>
                    <td className="py-2.5 pr-3 text-cream-200">
                      {s.buyer_name}
                      {s.buyer_email && <span className="block text-xs text-cream-400">{s.buyer_email}</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-cream-300">{s.batch_names.join(', ')}</td>
                    <td className="py-2.5 pr-3 text-right text-cream-300">{s.tickets}</td>
                    <td className="py-2.5 pr-3 text-right text-accent-400 font-semibold">
                      {fmtCurrency(s.total)}
                    </td>
                    <td className="py-2.5 text-cream-400">
                      #{s.order_number}
                      {s.payment_status !== 'approved' && (
                        <span className="ml-1.5 text-xs text-red-300">({s.payment_status})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
