// lib/admin/selected-event.ts
// "Evento selecionado" do painel. Cada tela do admin mostra os dados de UM
// evento por vez (pedidos, lotes, compradores etc. nascem separados por
// event_id no banco). A seleção vive num cookie; sem cookie (ou cookie
// apontando pra evento fora do escopo), cai no evento mais recente DENTRO
// do escopo do usuário — nunca em evento de outra organização.
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { PanelContext } from '@/lib/auth/panel';
import { assertEventInScope, getScopedEventIds, type ScopedEvent } from '@/lib/auth/scope';

export const ADMIN_EVENT_COOKIE = 'panel_selected_event';

export type SelectedEvent = ScopedEvent;

const EVENT_FIELDS = 'id, title, slug, status, event_date, event_time, organization_id';

export async function getSelectedEvent(ctx: PanelContext): Promise<SelectedEvent | null> {
  const store = cookies();
  const cookieId = store.get(ADMIN_EVENT_COOKIE)?.value;

  // 1) Cookie aponta pra um evento válido E dentro do escopo
  if (cookieId) {
    const event = await assertEventInScope(ctx, cookieId);
    if (event) return event;
  }

  // 2) Sem cookie (ou fora do escopo): evento ativo mais recente do escopo
  const scopedIds = await getScopedEventIds(ctx);
  if (scopedIds !== null && scopedIds.length === 0) return null;

  let activeQuery = supabaseAdmin
    .from('events')
    .select(EVENT_FIELDS)
    .eq('status', 'active')
    .order('event_date', { ascending: false })
    .limit(1);
  if (scopedIds !== null) activeQuery = activeQuery.in('id', scopedIds);
  const { data: active } = await activeQuery.maybeSingle();
  if (active) return active as SelectedEvent;

  // 3) Nenhum ativo: o mais recente do escopo, de qualquer status
  let latestQuery = supabaseAdmin
    .from('events')
    .select(EVENT_FIELDS)
    .order('event_date', { ascending: false })
    .limit(1);
  if (scopedIds !== null) latestQuery = latestQuery.in('id', scopedIds);
  const { data: latest } = await latestQuery.maybeSingle();
  return (latest as SelectedEvent) ?? null;
}
