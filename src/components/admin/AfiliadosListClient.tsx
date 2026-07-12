'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Copy, Check, Search, ExternalLink } from 'lucide-react';
import type { AfiliadoListItem } from '@/app/admin/afiliados/page';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtNumber = (v: number) => v.toLocaleString('pt-BR');

export function AfiliadosListClient({
  items,
  baseUrl,
}: {
  items: AfiliadoListItem[];
  baseUrl: string;
}) {
  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Eventos únicos pra dropdown
  const events = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) {
      map.set(it.event_id, it.event_title);
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (eventFilter !== 'all' && it.event_id !== eventFilter) return false;
      if (statusFilter === 'active' && !it.is_active) return false;
      if (statusFilter === 'inactive' && it.is_active) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = `${it.name} ${it.code} ${it.email ?? ''} ${it.phone ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, eventFilter, statusFilter]);

  const copyLink = async (item: AfiliadoListItem) => {
    const url = `${baseUrl}/evento/${item.event_slug}?ref=${item.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Falha silenciosa — em browsers que não permitem clipboard fora de HTTPS
    }
  };

  // Totais agregados (do filtro atual)
  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, it) => ({
        visits: acc.visits + it.visits,
        sales: acc.sales + it.sales_count,
        revenue: acc.revenue + it.attributed_revenue,
        commission: acc.commission + it.commission_due,
      }),
      { visits: 0, sales: 0, revenue: 0, commission: 0 },
    );
  }, [filtered]);

  return (
    <>
      {/* Filtros */}
      <div className="bg-surface-700 border border-muted-700 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, code, email…"
            className="w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
        </div>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
        >
          <option value="all">Todos os eventos</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400"
        >
          <option value="all">Ativos e inativos</option>
          <option value="active">Somente ativos</option>
          <option value="inactive">Somente inativos</option>
        </select>
      </div>

      {/* Totais do filtro */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-surface-700 border border-muted-700 rounded-lg p-3">
          <p className="text-xs text-cream-400">Visitas</p>
          <p className="text-lg font-bold text-cream-200">{fmtNumber(totals.visits)}</p>
        </div>
        <div className="bg-surface-700 border border-muted-700 rounded-lg p-3">
          <p className="text-xs text-cream-400">Vendas atribuídas</p>
          <p className="text-lg font-bold text-cream-200">{fmtNumber(totals.sales)}</p>
        </div>
        <div className="bg-surface-700 border border-muted-700 rounded-lg p-3">
          <p className="text-xs text-cream-400">Faturamento atribuído</p>
          <p className="text-lg font-bold text-cream-200">{fmtCurrency(totals.revenue)}</p>
        </div>
        <div className="bg-surface-700 border border-muted-700 rounded-lg p-3">
          <p className="text-xs text-cream-400">Comissão devida</p>
          <p className="text-lg font-bold text-accent-400">{fmtCurrency(totals.commission)}</p>
        </div>
      </div>

      {/* Tabela (desktop) */}
      <div className="hidden md:block bg-surface-700 border border-muted-700 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-cream-400 py-8 text-sm">
            {items.length === 0
              ? 'Nenhum afiliado cadastrado ainda. Clique em "Novo afiliado" para começar.'
              : 'Nenhum afiliado bate com os filtros.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-800 text-cream-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Evento</th>
                <th className="text-right px-4 py-3">%</th>
                <th className="text-right px-4 py-3">Visitas</th>
                <th className="text-right px-4 py-3">Vendas</th>
                <th className="text-right px-4 py-3">Faturamento</th>
                <th className="text-right px-4 py-3">Comissão</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id} className="border-t border-muted-700 hover:bg-surface-800/50 transition">
                  <td className="px-4 py-3 text-cream-200 font-medium">{it.name}</td>
                  <td className="px-4 py-3 text-cream-300 font-mono">{it.code}</td>
                  <td className="px-4 py-3 text-cream-400">{it.event_title}</td>
                  <td className="px-4 py-3 text-right text-cream-300">{it.commission_percent}%</td>
                  <td className="px-4 py-3 text-right text-cream-300">{fmtNumber(it.visits)}</td>
                  <td className="px-4 py-3 text-right text-cream-300">{fmtNumber(it.sales_count)}</td>
                  <td className="px-4 py-3 text-right text-cream-300">{fmtCurrency(it.attributed_revenue)}</td>
                  <td className="px-4 py-3 text-right text-accent-400 font-semibold">
                    {fmtCurrency(it.commission_due)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {it.is_active ? (
                      <span className="inline-block bg-emerald-900/40 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-700/50">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-block bg-muted-800/60 text-cream-400 text-xs px-2 py-0.5 rounded-full border border-muted-600">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => copyLink(it)}
                        title="Copiar link de divulgação"
                        className="p-1.5 text-cream-400 hover:text-accent-400 transition"
                      >
                        {copiedId === it.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <Link
                        href={`/admin/afiliados/${it.id}`}
                        title="Editar / detalhes"
                        className="p-1.5 text-cream-400 hover:text-accent-400 transition"
                      >
                        <ExternalLink size={16} />
                      </Link>
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
            {items.length === 0
              ? 'Nenhum afiliado cadastrado ainda.'
              : 'Nenhum afiliado bate com os filtros.'}
          </p>
        ) : (
          filtered.map((it) => (
            <div key={it.id} className="bg-surface-700 border border-muted-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-cream-200 font-semibold">{it.name}</p>
                  <p className="text-cream-400 text-xs font-mono">{it.code}</p>
                </div>
                {it.is_active ? (
                  <span className="bg-emerald-900/40 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-700/50">
                    Ativo
                  </span>
                ) : (
                  <span className="bg-muted-800/60 text-cream-400 text-xs px-2 py-0.5 rounded-full border border-muted-600">
                    Inativo
                  </span>
                )}
              </div>
              <p className="text-xs text-cream-400 mb-3">{it.event_title} · {it.commission_percent}%</p>
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div>
                  <p className="text-cream-400">Visitas</p>
                  <p className="text-cream-200 font-semibold">{fmtNumber(it.visits)}</p>
                </div>
                <div>
                  <p className="text-cream-400">Vendas</p>
                  <p className="text-cream-200 font-semibold">{fmtNumber(it.sales_count)}</p>
                </div>
                <div>
                  <p className="text-cream-400">Comissão</p>
                  <p className="text-accent-400 font-semibold">{fmtCurrency(it.commission_due)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyLink(it)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-surface-800 hover:bg-surface-900 text-cream-200 text-xs py-2 rounded border border-muted-600 transition"
                >
                  {copiedId === it.id ? <Check size={14} /> : <Copy size={14} />}
                  {copiedId === it.id ? 'Copiado' : 'Copiar link'}
                </button>
                <Link
                  href={`/admin/afiliados/${it.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-accent-400 hover:bg-accent-500 text-surface-900 font-semibold text-xs py-2 rounded transition"
                >
                  Detalhes
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
