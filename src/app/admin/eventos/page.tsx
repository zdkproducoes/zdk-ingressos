// app/admin/eventos/page.tsx
// Seção de Eventos: lista todos (ativos, rascunhos e arquivados) com números,
// permite arquivar/ativar, criar um novo evento e escolher qual evento o
// painel está gerenciando.
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSelectedEvent } from '@/lib/admin/selected-event';
import { EventosClient } from '@/components/admin/EventosClient';
import { requirePanelContext } from '@/lib/auth/panel';
import { getScopedEventIds } from '@/lib/auth/scope';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Eventos — Painel' };

export type EventListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  event_date: string;
  event_time: string | null;
  venue_name: string;
  venue_address: string;
  venue_neighborhood: string | null;
  venue_city: string;
  venue_state: string;
  venue_zip: string | null;
  service_fee_percent: number;
  max_tickets_per_cpf: number | null;
  orders_count: number;
  tickets_count: number;
  net_revenue: number;
  organization_name: string | null;
};

export default async function EventosPage() {
  const ctx = await requirePanelContext();
  // Escopo: produtor vê só os eventos das organizações dele; superadmin vê tudo
  const scopedIds = await getScopedEventIds(ctx);

  let eventsQuery = supabaseAdmin
    .from('events')
    .select('id, title, slug, status, event_date, event_time, venue_name, venue_address, venue_neighborhood, venue_city, venue_state, venue_zip, service_fee_percent, max_tickets_per_cpf, organizations(name)')
    .order('event_date', { ascending: false });
  if (scopedIds !== null) eventsQuery = eventsQuery.in('id', scopedIds);

  const [eventsRes, ordersRes, itemsRes] = await Promise.all([
    eventsQuery,
    supabaseAdmin
      .from('orders')
      .select('id, event_id, total, service_fee')
      .eq('payment_status', 'approved')
      .range(0, 49999),
    supabaseAdmin
      .from('order_items')
      .select('id, orders!inner(event_id, payment_status)')
      .eq('orders.payment_status', 'approved')
      .range(0, 49999),
  ]);

  // Agrega pedidos e receita por evento
  const orderAgg = new Map<string, { count: number; revenue: number }>();
  for (const o of ordersRes.data ?? []) {
    const agg = orderAgg.get(o.event_id) ?? { count: 0, revenue: 0 };
    agg.count += 1;
    agg.revenue += Number(o.total ?? 0) - Number(o.service_fee ?? 0);
    orderAgg.set(o.event_id, agg);
  }

  // Agrega ingressos por evento
  const ticketAgg = new Map<string, number>();
  for (const it of (itemsRes.data ?? []) as any[]) {
    const rel = Array.isArray(it.orders) ? it.orders[0] : it.orders;
    if (!rel?.event_id) continue;
    ticketAgg.set(rel.event_id, (ticketAgg.get(rel.event_id) ?? 0) + 1);
  }

  const items: EventListItem[] = ((eventsRes.data ?? []) as any[]).map((e) => {
    const agg = orderAgg.get(e.id) ?? { count: 0, revenue: 0 };
    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      status: e.status,
      event_date: e.event_date,
      event_time: e.event_time,
      venue_name: e.venue_name,
      venue_address: e.venue_address,
      venue_neighborhood: e.venue_neighborhood,
      venue_city: e.venue_city,
      venue_state: e.venue_state,
      venue_zip: e.venue_zip,
      service_fee_percent: Number(e.service_fee_percent),
      max_tickets_per_cpf: e.max_tickets_per_cpf,
      orders_count: agg.count,
      tickets_count: ticketAgg.get(e.id) ?? 0,
      net_revenue: agg.revenue,
      organization_name: (Array.isArray(e.organizations) ? e.organizations[0]?.name : e.organizations?.name) ?? null,
    };
  });

  const selected = await getSelectedEvent(ctx);

  return <EventosClient items={items} selectedId={selected?.id ?? null} />;
}
