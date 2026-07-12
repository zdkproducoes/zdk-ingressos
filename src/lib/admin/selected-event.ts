// lib/admin/selected-event.ts
// "Evento selecionado" do painel admin. Cada tela do admin mostra os dados
// de UM evento por vez (pedidos, lotes, compradores etc. nascem separados
// por event_id no banco). A selecao vive num cookie; sem cookie, cai no
// evento ativo mais recente.
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const ADMIN_EVENT_COOKIE = 'panel_selected_event';

export type SelectedEvent = {
  id: string;
  title: string;
  slug: string;
  status: string;
  event_date: string;
  event_time: string | null;
};

const EVENT_FIELDS = 'id, title, slug, status, event_date, event_time';

export async function getSelectedEvent(): Promise<SelectedEvent | null> {
  const store = cookies();
  const cookieId = store.get(ADMIN_EVENT_COOKIE)?.value;

  // 1) Cookie aponta pra um evento valido
  if (cookieId) {
    const { data } = await supabaseAdmin
      .from('events')
      .select(EVENT_FIELDS)
      .eq('id', cookieId)
      .maybeSingle();
    if (data) return data as SelectedEvent;
  }

  // 2) Sem cookie (ou evento apagado): evento ativo mais recente
  const { data: active } = await supabaseAdmin
    .from('events')
    .select(EVENT_FIELDS)
    .eq('status', 'active')
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active) return active as SelectedEvent;

  // 3) Nenhum ativo: o mais recente de qualquer status
  const { data: latest } = await supabaseAdmin
    .from('events')
    .select(EVENT_FIELDS)
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (latest as SelectedEvent) ?? null;
}
