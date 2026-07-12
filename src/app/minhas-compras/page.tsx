// app/minhas-compras/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas compras' };

export default async function MyPurchasesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/minhas-compras');

  // Busca todos os pedidos aprovados do usuário, agrupados por evento
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, total, payment_status, paid_at, created_at,
      events ( id, slug, title, event_date, event_time, venue_name, venue_city, banner_url ),
      order_items ( id, owner_id )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  // Ingressos RECEBIDOS por transferência (pedido de outra pessoa, owner_id = eu)
  const { data: receivedRaw } = await supabaseAdmin
    .from('order_items')
    .select(`
      id,
      orders!inner (
        payment_status,
        events ( id, slug, title, event_date, event_time, venue_name, venue_city, banner_url )
      )
    `)
    .eq('owner_id', user.id)
    .eq('orders.payment_status', 'approved');

  // Agrupa por evento
  type EventGroup = {
    eventId: string; eventSlug: string; eventTitle: string; eventDate: string;
    eventTime: string; venueName: string; venueCity: string; bannerUrl: string | null;
    totalTickets: number; orders: any[];
  };
  const grouped = new Map<string, EventGroup>();
  for (const o of orders || []) {
    const e: any = o.events;
    if (!e) continue;
    const key = e.id as string;
    if (!grouped.has(key)) {
      grouped.set(key, {
        eventId: e.id, eventSlug: e.slug, eventTitle: e.title, eventDate: e.event_date,
        eventTime: e.event_time, venueName: e.venue_name, venueCity: e.venue_city,
        bannerUrl: e.banner_url, totalTickets: 0, orders: [],
      });
    }
    const g = grouped.get(key)!;
    g.orders.push(o);
    // Conta só os ingressos que AINDA são meus (owner_id null = não transferido)
    if (o.payment_status === 'approved') {
      g.totalTickets += (o.order_items || []).filter((it: any) => !it.owner_id).length;
    }
  }

  // Soma os recebidos por transferência (cria o grupo do evento se eu nunca comprei nele)
  for (const r of (receivedRaw as any[]) || []) {
    const o: any = Array.isArray(r.orders) ? r.orders[0] : r.orders;
    const e: any = o?.events ? (Array.isArray(o.events) ? o.events[0] : o.events) : null;
    if (!e) continue;
    const key = e.id as string;
    if (!grouped.has(key)) {
      grouped.set(key, {
        eventId: e.id, eventSlug: e.slug, eventTitle: e.title, eventDate: e.event_date,
        eventTime: e.event_time, venueName: e.venue_name, venueCity: e.venue_city,
        bannerUrl: e.banner_url, totalTickets: 0, orders: [],
      });
    }
    grouped.get(key)!.totalTickets += 1;
  }
  const events = Array.from(grouped.values());

  return (
    <main className="min-h-screen bg-surface-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm text-cream-400 hover:text-cream-200 mb-6 inline-block">← Voltar</Link>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-cream-200 mb-2">Minhas compras</h1>
          <p className="text-cream-400">Acesse seus ingressos e o mural de cada evento</p>
        </header>

        {events.length === 0 ? (
          <div className="rounded-xl bg-surface-700 border border-muted-700 p-12 text-center">
            <div className="text-5xl mb-4">🎟️</div>
            <h2 className="text-xl font-semibold text-cream-200 mb-2">Nenhuma compra ainda</h2>
            <p className="text-cream-400 mb-6">Você ainda não comprou ingressos para nenhum evento.</p>
            <Link href="/" className="rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-2.5 px-6 inline-block transition">Ver eventos disponíveis</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(ev => {
              const eventDate = new Date(ev.eventDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              });
              const isPast = new Date(ev.eventDate + 'T00:00:00') < new Date(new Date().toDateString());
              return (
                <Link key={ev.eventId} href={`/minhas-compras/${ev.eventSlug}`}
                  className="block rounded-xl bg-surface-700 border border-muted-700 hover:border-muted-600 hover:bg-surface-700/80 transition overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {ev.bannerUrl && (
                      <div className="md:w-48 h-32 md:h-auto bg-surface-700 shrink-0">
                        <img src={ev.bannerUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {isPast && <span className="text-xs bg-muted-700 text-cream-400 px-2 py-0.5 rounded">Realizado</span>}
                          {!isPast && ev.totalTickets > 0 && <span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded">Confirmado</span>}
                        </div>
                        <h3 className="text-lg font-semibold text-cream-200">{ev.eventTitle}</h3>
                        <p className="text-sm text-cream-400 mt-1">📅 {eventDate} • {(ev.eventTime || '').slice(0,5)}</p>
                        <p className="text-sm text-cream-400">📍 {ev.venueName} — {ev.venueCity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-cream-200">{ev.totalTickets}</p>
                        <p className="text-xs text-cream-400">{ev.totalTickets === 1 ? 'ingresso' : 'ingressos'}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
