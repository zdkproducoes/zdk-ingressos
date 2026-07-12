// Isolamento por organização — o coração da segurança multi-produtor.
//
// Como as rotas do painel usam service_role (RLS bypassada), TODA leitura
// ou escrita disparada pelo painel precisa passar por um destes helpers:
//   - assertEventInScope:    o event_id pertence a uma org do usuário?
//   - assertResourceInScope: o recurso (lote/afiliado/pedido/meta) pende de
//                            um evento no escopo?
//   - getScopedEventIds:     lista p/ filtros .in('event_id', ...) em listagens
//
// Convenção: falha de escopo responde 404 (não 403) para não revelar a
// existência de recursos de outras organizações.
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PanelContext } from '@/lib/auth/panel';

export type ScopedEvent = {
  id: string;
  title: string;
  slug: string;
  status: string;
  event_date: string;
  event_time: string | null;
  organization_id: string | null;
};

const EVENT_FIELDS = 'id, title, slug, status, event_date, event_time, organization_id';

function eventVisible(ctx: PanelContext, event: ScopedEvent): boolean {
  if (ctx.isSuperadmin) return true;
  if (!event.organization_id) return false; // evento sem dono: só superadmin
  return (ctx.orgIds ?? []).includes(event.organization_id);
}

/**
 * Busca o evento e valida que está no escopo do usuário.
 * null = não existe OU fora do escopo (o caller responde 404).
 */
export async function assertEventInScope(
  ctx: PanelContext,
  eventId: string | null | undefined,
): Promise<ScopedEvent | null> {
  if (!eventId) return null;
  const { data } = await supabaseAdmin
    .from('events')
    .select(EVENT_FIELDS)
    .eq('id', eventId)
    .maybeSingle();
  if (!data) return null;
  const event = data as ScopedEvent;
  return eventVisible(ctx, event) ? event : null;
}

/** Igual a assertEventInScope, mas resolvendo por slug (app de check-in). */
export async function assertEventSlugInScope(
  ctx: PanelContext,
  slug: string | null | undefined,
): Promise<ScopedEvent | null> {
  if (!slug) return null;
  const { data } = await supabaseAdmin
    .from('events')
    .select(EVENT_FIELDS)
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  const event = data as ScopedEvent;
  return eventVisible(ctx, event) ? event : null;
}

type ScopedTable =
  | 'ticket_batches'
  | 'affiliates'
  | 'orders'
  | 'affiliate_weekly_goals'
  | 'affiliate_event_goals'
  | 'order_items';

/**
 * Valida a propriedade de um recurso identificado pelo próprio id:
 * resolve o event_id do recurso e delega a assertEventInScope.
 * null = não existe OU fora do escopo (o caller responde 404).
 */
export async function assertResourceInScope(
  ctx: PanelContext,
  table: ScopedTable,
  resourceId: string | null | undefined,
): Promise<{ resource: { id: string; event_id: string }; event: ScopedEvent } | null> {
  if (!resourceId) return null;

  // order_items não tem event_id direto — resolve via order
  if (table === 'order_items') {
    const { data: item } = await supabaseAdmin
      .from('order_items')
      .select('id, order_id, orders(event_id)')
      .eq('id', resourceId)
      .maybeSingle();
    if (!item) return null;
    const orders = (item as { orders: { event_id: string } | { event_id: string }[] }).orders;
    const eventId = Array.isArray(orders) ? orders[0]?.event_id : orders?.event_id;
    const event = await assertEventInScope(ctx, eventId);
    if (!event) return null;
    return { resource: { id: resourceId, event_id: eventId }, event };
  }

  const { data } = await supabaseAdmin
    .from(table)
    .select('id, event_id')
    .eq('id', resourceId)
    .maybeSingle();
  if (!data) return null;
  const resource = data as { id: string; event_id: string };
  const event = await assertEventInScope(ctx, resource.event_id);
  if (!event) return null;
  return { resource, event };
}

/**
 * Ids de eventos visíveis ao usuário, para filtros de listagem.
 * null = superadmin (não filtrar). Array vazio = produtor sem eventos.
 */
export async function getScopedEventIds(ctx: PanelContext): Promise<string[] | null> {
  if (ctx.isSuperadmin) return null;
  if (!ctx.orgIds || ctx.orgIds.length === 0) return [];
  const { data } = await supabaseAdmin
    .from('events')
    .select('id')
    .in('organization_id', ctx.orgIds);
  return (data ?? []).map((e) => e.id);
}
