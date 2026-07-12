// app/admin/cortesias/page.tsx
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CortesiasClient } from '@/components/admin/CortesiasClient';
import { getSelectedEvent } from '@/lib/admin/selected-event';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cortesias — Admin SACODE' };

export default async function CortesiasPage() {
  // Dropdown com eventos que ainda podem receber cortesia (rascunho/ativo),
  // com o evento selecionado no painel em primeiro (vira o default do client)
  const { data: rawEvents } = await supabaseAdmin
    .from('events')
    .select('id, title, slug, status')
    .in('status', ['draft', 'active'])
    .order('event_date', { ascending: false });

  const selectedEvent = await getSelectedEvent();
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
