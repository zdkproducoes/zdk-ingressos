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
  description: string | null;
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
  banner_url: string | null;
  og_image_url: string | null;
  category: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  content: import('@/lib/supabase').EventContent;
  /** posição no carrossel de destaques da home (1..5); null = não destacado */
  featured_order: number | null;
};

export default async function EventosPage() {
  const ctx = await requirePanelContext();
  // Escopo: produtor vê só os eventos das organizações dele; superadmin vê tudo
  const scopedIds = await getScopedEventIds(ctx);

  let eventsQuery = supabaseAdmin
    .from('events')
    .select('id, title, slug, status, description, event_date, event_time, venue_name, venue_address, venue_neighborhood, venue_city, venue_state, venue_zip, service_fee_percent, max_tickets_per_cpf, banner_url, og_image_url, venue_lat, venue_lng, content, category, organizations(name)')
    .order('event_date', { ascending: false });
  if (scopedIds !== null) eventsQuery = eventsQuery.in('id', scopedIds);

  // Destaques da home em query separada e tolerante: se a coluna
  // featured_order ainda não existir no banco, o painel segue funcionando.
  const featuredByEvent = new Map<string, number>();
  {
    const { data: feat } = await supabaseAdmin
      .from('events')
      .select('id, featured_order')
      .not('featured_order', 'is', null);
    for (const f of (feat ?? []) as { id: string; featured_order: number }[]) {
      featuredByEvent.set(f.id, f.featured_order);
    }
  }

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
      description: e.description ?? null,
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
      banner_url: e.banner_url ?? null,
      og_image_url: e.og_image_url ?? null,
      category: e.category ?? null,
      venue_lat: e.venue_lat != null ? Number(e.venue_lat) : null,
      venue_lng: e.venue_lng != null ? Number(e.venue_lng) : null,
      content: e.content ?? {},
      featured_order: featuredByEvent.get(e.id) ?? null,
    };
  });

  const selected = await getSelectedEvent(ctx);

  // Organizações onde o usuário pode criar evento (para o seletor do modal):
  // superadmin vê todas as ativas; produtor vê aquelas em que é owner/admin.
  let orgs: { id: string; name: string }[];
  if (ctx.isSuperadmin) {
    const { data } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });
    orgs = data ?? [];
  } else {
    orgs = ctx.memberships
      .filter((m) => m.role === 'owner' || m.role === 'admin')
      .map((m) => ({ id: m.organization_id, name: m.organization.name }));
  }

  return (
    <EventosClient
      items={items}
      selectedId={selected?.id ?? null}
      isSuperadmin={ctx.isSuperadmin}
      orgs={orgs}
    />
  );
}
