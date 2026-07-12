import { platform } from '@/lib/config';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ResendEmailButton } from '@/components/admin/ResendEmailButton';
import { ReembolsarButton } from '@/components/admin/ReembolsarButton';
import { getSelectedEvent } from '@/lib/admin/selected-event';

type OrderRow = {
  id: string;
  order_number: number;
  total: number;
  payment_status: string;
  payment_gateway: string | null;
  created_at: string;
  is_courtesy: boolean;
  profiles: { full_name: string; email: string; phone: string | null; first_name: string | null } | null;
  events: { title: string } | null;
  order_items: { id: string }[];
};

const ALLOWED_PER_PAGE = [10, 30, 50, 100, 200];
const DEFAULT_PER_PAGE = 50;

const ALLOWED_STATUS = ['all', 'approved', 'pending', 'cancelled', 'refunded', 'rejected', 'abandoned'];
const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all',       label: 'Todos' },
  { value: 'approved',  label: 'Aprovados' },
  { value: 'pending',   label: 'Pendentes' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'refunded',  label: 'Reembolsados' },
  { value: 'rejected',  label: 'Rejeitados' },
  { value: 'abandoned', label: 'Não finalizados' },
];

const statusConfig: Record<string, { label: string; classes: string }> = {
  approved:   { label: 'Aprovado',   classes: 'bg-green-900 text-green-300' },
  pending:    { label: 'Pendente',   classes: 'bg-yellow-900 text-yellow-300' },
  in_process: { label: 'Em análise', classes: 'bg-yellow-900 text-yellow-300' },
  rejected:   { label: 'Rejeitado',  classes: 'bg-red-900 text-red-300' },
  cancelled:  { label: 'Cancelado',  classes: 'bg-red-900 text-red-300' },
  refunded:   { label: 'Reembolsado',classes: 'bg-muted-700 text-cream-300' },
  abandoned:  { label: 'Não finalizado', classes: 'bg-surface-800 text-cream-400' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, classes: 'bg-muted-700 text-cream-300' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

// Monta o link do WhatsApp (wa.me) com o número do cliente + mensagem pronta.
// Retorna null se não houver telefone utilizável.
function waHref(order: OrderRow): string | null {
  const digits = (order.profiles?.phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  // Brasil: DDD + número = 10 ou 11 dígitos. Com código do país = 12 ou 13.
  // Só prefixa 55 se ainda não tiver código de país (evita duplicar e trata DDD 55).
  const intl = digits.length >= 12 ? digits : `55${digits}`;

  const nome = order.profiles?.first_name?.trim()
    || order.profiles?.full_name?.trim().split(' ')[0]
    || '';
  const ola = nome ? `Olá ${nome}!` : 'Olá!';
  const evento = order.events?.title ?? 'nosso evento';

  const msg = order.payment_status === 'pending'
    ? `${ola} Aqui é da equipe do ${platform.name}. Vi que o seu pedido #${order.order_number} para "${evento}" ficou com o pagamento pendente. Posso te ajudar a finalizar a compra?`
    : `${ola} Aqui é da equipe do ${platform.name} sobre o seu pedido #${order.order_number}.`;

  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

// Lista de páginas a exibir: sempre 1 e a última, mais a atual e suas vizinhas,
// com reticências nos buracos. Ex.: [1, '…', 4, 5, 6, '…', 20].
function pageList(current: number, totalPages: number): (number | '…')[] {
  const wanted = new Set<number>();
  wanted.add(1);
  wanted.add(totalPages);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= totalPages) wanted.add(p);
  }
  const sorted = Array.from(wanted).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: { page?: string; perPage?: string; status?: string };
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin');
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'producer') redirect('/');

  // Filtro de status (?status=)
  const statusParam = searchParams?.status ?? 'all';
  const status = ALLOWED_STATUS.includes(statusParam) ? statusParam : 'all';

  // Itens por página (?perPage=), validado contra a lista permitida
  const ppParsed = parseInt(searchParams?.perPage ?? '', 10);
  const perPage = ALLOWED_PER_PAGE.includes(ppParsed) ? ppParsed : DEFAULT_PER_PAGE;

  // Página atual (?page=N), nunca menor que 1
  const parsed = parseInt(searchParams?.page ?? '1', 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const selectedEvent = await getSelectedEvent();
  if (!selectedEvent) {
    return (
      <p className="text-cream-400 text-center py-16">
        Nenhum evento cadastrado. Crie um na aba Eventos.
      </p>
    );
  }

  let query = supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, total, payment_status, payment_gateway, created_at, is_courtesy,
      profiles!orders_customer_id_fkey ( full_name, email, phone, first_name ),
      events ( title ),
      order_items ( id )
    `, { count: 'exact' })
    .eq('event_id', selectedEvent.id)
    .order('created_at', { ascending: false });

  if (status !== 'all') query = query.eq('payment_status', status);

  const { data: raw, count } = await query.range(from, to);

  const orders = (raw as unknown as OrderRow[]) ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const start = orders.length > 0 ? from + 1 : 0;
  const end = orders.length > 0 ? from + orders.length : 0;

  // Monta um link preservando os três parâmetros (status, perPage, page)
  const buildHref = (params: { status?: string; perPage?: number; page?: number }) => {
    const s = params.status ?? status;
    const pp = params.perPage ?? perPage;
    const pg = params.page ?? page;
    return `/admin/pedidos?status=${s}&perPage=${pp}&page=${pg}`;
  };
  const pages = pageList(page, totalPages);

  const navBtn = 'min-w-[2.25rem] text-center px-3 py-1.5 rounded-lg border border-muted-700 text-cream-200 hover:bg-surface-700 transition';
  const navOff = 'min-w-[2.25rem] text-center px-3 py-1.5 rounded-lg border border-muted-700 text-cream-400 opacity-40 cursor-not-allowed';
  const waBtn = 'inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-green-700 hover:bg-green-600 text-white transition';

  return (
    <div>
      {/* Filtro por status */}
      <div className="mb-4 flex items-center gap-2 flex-wrap text-sm">
        <span className="text-cream-400">Status:</span>
        {STATUS_TABS.map(t => (
          t.value === status ? (
            <span key={t.value} className="px-2.5 py-1 rounded-lg border border-accent-400 bg-accent-400 text-surface-800 font-semibold">
              {t.label}
            </span>
          ) : (
            <Link key={t.value} href={buildHref({ status: t.value, page: 1 })}
              className="px-2.5 py-1 rounded-lg border border-muted-700 text-cream-200 hover:bg-surface-700 transition">
              {t.label}
            </Link>
          )
        ))}
      </div>

      {total === 0 ? (
        <p className="text-cream-400 text-center py-16">
          {status === 'all' ? 'Nenhum pedido ainda.' : 'Nenhum pedido com esse status.'}
        </p>
      ) : (
        <>
          {orders.length === 0 ? (
            <p className="text-cream-400 text-center py-16">
              Nenhum pedido nesta página.{' '}
              <Link href={buildHref({ page: 1 })} className="text-accent-400 underline hover:text-accent-300">
                Voltar ao início
              </Link>
            </p>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-muted-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-muted-700">
                      {['#Pedido', 'Comprador', 'Evento', 'Ingressos', 'Total', 'Status', 'Data', 'Ações'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-cream-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const wa = waHref(order);
                      return (
                        <tr key={order.id} className="border-b border-muted-700 hover:bg-surface-700/50 transition">
                          <td className="px-4 py-3 text-cream-300 font-mono">#{order.order_number}</td>
                          <td className="px-4 py-3">
                            <p className="text-cream-200">{order.profiles?.full_name ?? '—'}</p>
                            <p className="text-xs text-cream-400">{order.profiles?.email ?? ''}</p>
                          </td>
                          <td className="px-4 py-3 text-cream-300">{order.events?.title ?? '—'}</td>
                          <td className="px-4 py-3 text-cream-300 text-center">{order.order_items.length}</td>
                          <td className="px-4 py-3 text-cream-200 font-medium">{fmt.format(order.total)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={order.payment_status} />
                            {order.payment_gateway === 'offline' && (
                              <span className="ml-1.5 inline-block px-2 py-0.5 rounded text-xs font-medium bg-accent-400/20 text-accent-300 border border-accent-400/40">
                                Offline
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-cream-400">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1.5 items-start">
                              {order.payment_status === 'approved' && (
                                <>
                                  <ResendEmailButton orderId={order.id} />
                                  <ReembolsarButton orderId={order.id} orderNumber={order.order_number} isCourtesy={order.is_courtesy} />
                                </>
                              )}
                              {wa && (
                                <a href={wa} target="_blank" rel="noopener noreferrer" className={waBtn}>WhatsApp</a>
                              )}
                              {order.payment_status !== 'approved' && !wa && (
                                <span className="text-cream-400">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden space-y-4">
                {orders.map(order => {
                  const wa = waHref(order);
                  return (
                    <div key={order.id} className="bg-surface-700 rounded-lg p-4 border border-muted-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-cream-300 text-sm">#{order.order_number}</span>
                        <span className="flex items-center gap-1.5">
                          {order.payment_gateway === 'offline' && (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-accent-400/20 text-accent-300 border border-accent-400/40">
                              Offline
                            </span>
                          )}
                          <StatusBadge status={order.payment_status} />
                        </span>
                      </div>
                      <p className="text-cream-200 font-medium">{order.profiles?.full_name ?? '—'}</p>
                      <p className="text-xs text-cream-400">{order.profiles?.email ?? ''}</p>
                      <p className="text-sm text-cream-300">{order.events?.title ?? '—'}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm text-cream-400">{order.order_items.length} ingresso(s)</span>
                        <span className="text-cream-200 font-semibold">{fmt.format(order.total)}</span>
                      </div>
                      <p className="text-xs text-cream-400">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      {(order.payment_status === 'approved' || wa) && (
                        <div className="pt-1 flex flex-col gap-2 items-start">
                          {order.payment_status === 'approved' && (
                            <>
                              <ResendEmailButton orderId={order.id} />
                              <ReembolsarButton orderId={order.id} orderNumber={order.order_number} isCourtesy={order.is_courtesy} />
                            </>
                          )}
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer" className={waBtn}>WhatsApp</a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Rodapé: itens por página + contador */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-cream-400">Itens por página:</span>
                {ALLOWED_PER_PAGE.map(pp => (
                  pp === perPage ? (
                    <span key={pp} className="px-2.5 py-1 rounded-lg border border-accent-400 bg-accent-400 text-surface-800 font-semibold">
                      {pp}
                    </span>
                  ) : (
                    <Link key={pp} href={buildHref({ perPage: pp, page: 1 })}
                      className="px-2.5 py-1 rounded-lg border border-muted-700 text-cream-200 hover:bg-surface-700 transition">
                      {pp}
                    </Link>
                  )
                ))}
              </div>
              <p className="text-cream-400">
                Mostrando {start}–{end} de {total} pedido{total === 1 ? '' : 's'}
              </p>
            </div>

            {/* Navegação por páginas */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 flex-wrap text-sm">
                {page > 1 ? (
                  <Link href={buildHref({ page: 1 })} aria-label="Primeira página" title="Primeira página" className={navBtn}>«</Link>
                ) : (
                  <span aria-label="Primeira página" className={navOff}>«</span>
                )}
                {page > 1 ? (
                  <Link href={buildHref({ page: page - 1 })} aria-label="Página anterior" title="Página anterior" className={navBtn}>‹</Link>
                ) : (
                  <span aria-label="Página anterior" className={navOff}>‹</span>
                )}

                {pages.map((p, i) =>
                  p === '…' ? (
                    <span key={`gap-${i}`} className="px-2 text-cream-400">…</span>
                  ) : p === page ? (
                    <span key={p} className="min-w-[2.25rem] text-center px-3 py-1.5 rounded-lg border border-accent-400 bg-accent-400 text-surface-800 font-semibold">
                      {p}
                    </span>
                  ) : (
                    <Link key={p} href={buildHref({ page: p })} className={navBtn}>{p}</Link>
                  )
                )}

                {page < totalPages ? (
                  <Link href={buildHref({ page: page + 1 })} aria-label="Próxima página" title="Próxima página" className={navBtn}>›</Link>
                ) : (
                  <span aria-label="Próxima página" className={navOff}>›</span>
                )}
                {page < totalPages ? (
                  <Link href={buildHref({ page: totalPages })} aria-label="Última página" title="Última página" className={navBtn}>»</Link>
                ) : (
                  <span aria-label="Última página" className={navOff}>»</span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
