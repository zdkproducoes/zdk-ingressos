// app/minhas-compras/[slug]/page.tsx
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { TransferTicketButton } from '@/components/tickets/TransferTicketButton';

export const dynamic = 'force-dynamic';

export default async function EventTicketsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/minhas-compras/${slug}`);

  const { data: event } = await supabaseAdmin.from('events')
    .select('id, slug, title, event_date, event_time, venue_name, venue_address, venue_city, banner_url, doors_open_time')
    .eq('slug', slug).maybeSingle();
  if (!event) notFound();

  // Pega todos pedidos APROVADOS do usuário neste evento + os ingressos
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, paid_at, payment_status, total,
      order_items (
        id, attendee_name, qr_code_token, qr_code_url, status, checked_in_at, owner_id, transferred_at,
        ticket_batches ( name )
      )
    `)
    .eq('customer_id', user.id)
    .eq('event_id', event.id)
    .order('created_at', { ascending: false });

  // Ingressos RECEBIDOS por transferência (o pedido é de outra pessoa,
  // mas o owner_id aponta pra mim)
  const { data: receivedRaw } = await supabaseAdmin
    .from('order_items')
    .select(`
      id, attendee_name, qr_code_token, qr_code_url, status, checked_in_at, transferred_at,
      ticket_batches ( name ),
      orders!inner ( order_number, paid_at, payment_status, event_id )
    `)
    .eq('owner_id', user.id)
    .eq('orders.event_id', event.id)
    .eq('orders.payment_status', 'approved');

  const approvedOrders = (orders || []).filter(o => o.payment_status === 'approved');
  const boughtItems = approvedOrders.flatMap(o => (o.order_items || []).map((it: any) => ({ ...it, orderNumber: o.order_number, paidAt: o.paid_at })));

  // Meus (comprados e ainda comigo) x transferidos pra outra pessoa
  const ownItems = boughtItems.filter((it: any) => !it.owner_id);
  const transferredAway = boughtItems.filter((it: any) => it.owner_id);
  const receivedItems = ((receivedRaw as any[]) || []).map((it: any) => {
    const o = Array.isArray(it.orders) ? it.orders[0] : it.orders;
    return { ...it, orderNumber: o?.order_number, paidAt: o?.paid_at, received: true };
  });

  // Ingressos que EU posso usar na porta (QR na minha mão)
  const usableItems = [...ownItems, ...receivedItems];
  const hasUsable = usableItems.length > 0;
  const hasAnything = hasUsable || transferredAway.length > 0;

  const eventDate = new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  // Evento já realizado: some o QR (não tem mais uso e evita print circulando),
  // fica só o resumo dos pedidos (nº, quantidade e valor)
  const isPast = new Date(event.event_date + 'T00:00:00') < new Date(new Date().toDateString());

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <main className="min-h-screen bg-wine-800 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/minhas-compras" className="text-sm text-cream-400 hover:text-cream-200 mb-6 inline-block">← Minhas compras</Link>

        <header className="rounded-xl bg-wine-700 border border-mauve-700 overflow-hidden mb-6">
          {event.banner_url && (
            <div className="h-40 md:h-56 bg-wine-700">
              <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-cream-200 mb-2">{event.title}</h1>
            <p className="text-sm text-cream-300">📅 {eventDate} • {(event.event_time || '').slice(0,5)}</p>
            {event.doors_open_time && <p className="text-xs text-cream-400">🚪 Abertura dos portões: {event.doors_open_time.slice(0,5)}</p>}
            <p className="text-sm text-cream-300 mt-1">📍 {event.venue_name}</p>
            <p className="text-xs text-cream-400">{event.venue_address}, {event.venue_city}</p>
          </div>
        </header>

        {hasUsable && (
          <div className="mb-4">
            <Link href={`/evento/${event.slug}/mural`}
              className="block w-full rounded-xl bg-gradient-to-r from-wine-600 to-mauve-600 hover:from-wine-500 hover:to-mauve-500 p-4 text-cream-200 font-semibold text-center transition">
              💬 Entrar no mural do evento
              <span className="block text-xs font-normal opacity-80 mt-0.5">Converse com outros participantes</span>
            </Link>
          </div>
        )}

        <h2 className="text-lg font-semibold text-cream-200 mb-3">
          {usableItems.length} {usableItems.length === 1 ? 'ingresso' : 'ingressos'}
        </h2>

        {!hasAnything ? (
          <div className="rounded-xl bg-amber-sacode-900/20 border border-amber-sacode-700/40 p-6 text-center">
            <p className="text-amber-sacode-200">Você ainda não tem ingressos confirmados para este evento.</p>
          </div>
        ) : isPast ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-wine-700 border border-mauve-700 p-4 text-sm text-cream-300">
              ✅ Este evento já foi realizado. Os QR Codes não são mais exibidos —
              fica aqui o resumo das suas compras.
            </div>
            {approvedOrders.map((o: any) => (
              <div key={o.id} className="rounded-xl bg-wine-700 border border-mauve-600 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-cream-200 font-semibold">Pedido #{o.order_number}</p>
                  <p className="text-sm text-cream-400 mt-0.5">
                    {(o.order_items || []).length} {(o.order_items || []).length === 1 ? 'ingresso' : 'ingressos'}
                    {o.paid_at && (
                      <> · pago em {new Date(o.paid_at).toLocaleDateString('pt-BR')}</>
                    )}
                  </p>
                </div>
                <p className="text-lg font-bold text-amber-sacode-400 whitespace-nowrap">
                  {fmtCurrency(Number(o.total ?? 0))}
                </p>
              </div>
            ))}
            {receivedItems.length > 0 && (
              <div className="rounded-xl bg-wine-700 border border-mauve-600 p-5">
                <p className="text-cream-200 font-semibold">
                  {receivedItems.length} {receivedItems.length === 1 ? 'ingresso recebido' : 'ingressos recebidos'} por transferência
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {usableItems.map((it: any) => {
              const canTransfer = !it.received && it.status === 'valid' && !it.checked_in_at && !it.transferred_at;
              return (
                <div key={it.id} className="rounded-xl bg-wine-700 border border-mauve-600 overflow-hidden">
                  <div className="bg-gradient-to-r from-wine-700/40 to-mauve-700/40 px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-cream-300">{it.ticket_batches?.name}</p>
                      <p className="text-cream-200 font-semibold">{it.attendee_name || 'Sem nome'}</p>
                      {it.received && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-mauve-700 text-cream-300 text-xs rounded">↪ Recebido por transferência</span>
                      )}
                    </div>
                    <div className="text-right">
                      {it.status === 'used' ? (
                        <span className="inline-block px-2 py-1 bg-emerald-900/60 text-emerald-200 text-xs font-semibold rounded">✓ Utilizado</span>
                      ) : it.status === 'cancelled' ? (
                        <span className="inline-block px-2 py-1 bg-red-900/60 text-red-200 text-xs font-semibold rounded">Cancelado</span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-emerald-900/60 text-emerald-200 text-xs font-semibold rounded">Válido</span>
                      )}
                      <p className="text-xs text-cream-400 mt-1">Pedido #{it.orderNumber}</p>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col items-center bg-white">
                    {it.qr_code_url ? (
                      <img src={it.qr_code_url} alt="QR Code" className="w-56 h-56" />
                    ) : (
                      <div className="w-56 h-56 bg-neutral-200 flex items-center justify-center text-neutral-500 text-sm">
                        QR sendo gerado…
                      </div>
                    )}
                    <p className="mt-3 text-xs font-mono text-neutral-600 break-all text-center">{it.qr_code_token}</p>
                  </div>
                  {it.status === 'valid' && (
                    <div className="bg-amber-sacode-900/20 border-t border-amber-sacode-700/30 px-5 py-3 text-xs text-amber-sacode-200">
                      ⚠️ Apresente este QR Code na entrada. Não compartilhe — uso único.
                      {it.received && <> Ingressos recebidos não podem ser transferidos novamente.</>}
                    </div>
                  )}
                  {canTransfer && (
                    <div className="border-t border-mauve-700">
                      <TransferTicketButton orderItemId={it.id} batchName={it.ticket_batches?.name || 'Ingresso'} />
                    </div>
                  )}
                </div>
              );
            })}

            {transferredAway.map((it: any) => (
              <div key={it.id} className="rounded-xl bg-wine-700/60 border border-mauve-700 overflow-hidden opacity-80">
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-cream-400">{it.ticket_batches?.name}</p>
                    <p className="text-cream-300 font-semibold">↗ Transferido para {it.attendee_name || 'outra pessoa'}</p>
                    <p className="text-xs text-cream-400 mt-1">
                      Pedido #{it.orderNumber}
                      {it.transferred_at && <> · em {new Date(it.transferred_at).toLocaleDateString('pt-BR')}</>}
                    </p>
                  </div>
                  <span className="inline-block px-2 py-1 bg-mauve-700 text-cream-300 text-xs font-semibold rounded whitespace-nowrap">Transferido</span>
                </div>
                <div className="bg-wine-800/60 border-t border-mauve-700 px-5 py-3 text-xs text-cream-400">
                  O QR Code deste ingresso foi cancelado e um novo foi emitido para quem recebeu.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
