// app/admin/cortesias/page.tsx
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelContext } from '@/lib/auth/panel';
import { getScopedEventIds } from '@/lib/auth/scope';
import { CortesiasClient } from '@/components/admin/CortesiasClient';
import { getSelectedEvent } from '@/lib/admin/selected-event';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cortesias — Painel' };

export default async function CortesiasPage() {
  const ctx = await requirePanelContext();
  // Dropdown com eventos que ainda podem receber cortesia (rascunho/ativo),
  // com o evento selecionado no painel em primeiro (vira o default do client).
  // Escopo: só eventos das organizações do usuário — a API de emissão já
  // valida, mas sem o filtro os títulos de outros produtores apareciam aqui.
  const scopedIds = await getScopedEventIds(ctx);
  let eventsQuery = supabaseAdmin
    .from('events')
    .select('id, title, slug, status')
    .in('status', ['draft', 'active'])
    .order('event_date', { ascending: false });
  if (scopedIds !== null) eventsQuery = eventsQuery.in('id', scopedIds);
  const { data: rawEvents } = await eventsQuery;

  const selectedEvent = await getSelectedEvent(ctx);
  const events = [...(rawEvents ?? [])].sort((a, b) => {
    if (a.id === selectedEvent?.id) return -1;
    if (b.id === selectedEvent?.id) return 1;
    return 0;
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zdkingressos.com.br';

  return (
    <CortesiasClient
      events={events}
      signupUrl={`${baseUrl}/cadastro`}
    />
  );
}
