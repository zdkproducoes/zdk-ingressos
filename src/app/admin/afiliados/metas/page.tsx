// app/admin/afiliados/metas/page.tsx
// Metas semanais dos embaixadores (gamificação). A meta é por evento e vale
// para todos os embaixadores; cada um acompanha o próprio progresso no painel.
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSelectedEvent } from '@/lib/admin/selected-event';
import { MetasSemanaisClient } from '@/components/admin/MetasSemanaisClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Metas semanais — Admin SACODE' };

export type MetaListItem = {
  id: string;
  title: string | null;
  week_start: string; // 'YYYY-MM-DD'
  week_end: string;
  target_tickets: number;
  reward: string | null;
  status: 'past' | 'current' | 'future';
  total_tickets: number; // ingressos de todos os embaixadores na janela
  achievers: number; // quantos embaixadores bateram a meta
};

export type EventGoalItem = {
  target_tickets: number;
  reward: string | null;
  total_tickets: number; // ingressos de todos os embaixadores no evento
  achievers: number; // quantos embaixadores já bateram a grande meta
};

// timestamptz -> 'YYYY-MM-DD' no fuso do evento (America/Sao_Paulo)
const spDateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const toSaoPauloDate = (iso: string) => spDateFmt.format(new Date(iso));

export default async function MetasSemanaisPage() {
  const selectedEvent = await getSelectedEvent();
  if (!selectedEvent) {
    return (
      <p className="text-cream-400 text-center py-16">
        Nenhum evento cadastrado. Crie um na aba Eventos.
      </p>
    );
  }

  const [
    { data: goals },
    { data: affiliates },
    { data: attributedOrders },
    { data: eventGoalRow },
  ] = await Promise.all([
    supabaseAdmin
      .from('affiliate_weekly_goals')
      .select('id, title, week_start, week_end, target_tickets, reward')
      .eq('event_id', selectedEvent.id)
      .order('week_start', { ascending: true }),
    supabaseAdmin
      .from('affiliates')
      .select('code, is_staff')
      .eq('event_id', selectedEvent.id),
    supabaseAdmin
      .from('orders')
      .select('affiliate_code, created_at, order_items(id)')
      .eq('event_id', selectedEvent.id)
      .eq('payment_status', 'approved')
      .not('affiliate_code', 'is', null),
    supabaseAdmin
      .from('affiliate_event_goals')
      .select('target_tickets, reward')
      .eq('event_id', selectedEvent.id)
      .maybeSingle(),
  ]);

  // Links da organização (is_staff) ficam fora do pódio e das metas
  const staffCodes = new Set((affiliates ?? []).filter((a) => a.is_staff).map((a) => a.code));
  const ambassadors = (affiliates ?? []).filter((a) => !a.is_staff).length;

  // Vendas atribuídas achatadas em (embaixador, data, ingressos), sem organização
  const entries = (attributedOrders ?? [])
    .filter((o) => !staffCodes.has(String(o.affiliate_code)))
    .map((o) => ({
      code: String(o.affiliate_code),
      date: toSaoPauloDate(o.created_at),
      tickets: Array.isArray(o.order_items) ? o.order_items.length : 0,
    }));

  const today = toSaoPauloDate(new Date().toISOString());

  // Meta do evento (a grande meta): agregado da campanha inteira
  let eventGoal: EventGoalItem | null = null;
  if (eventGoalRow) {
    const byCode = new Map<string, number>();
    let total = 0;
    for (const e of entries) {
      total += e.tickets;
      byCode.set(e.code, (byCode.get(e.code) ?? 0) + e.tickets);
    }
    let achievers = 0;
    byCode.forEach((v) => {
      if (v >= eventGoalRow.target_tickets) achievers++;
    });
    eventGoal = {
      target_tickets: Number(eventGoalRow.target_tickets),
      reward: eventGoalRow.reward,
      total_tickets: total,
      achievers,
    };
  }

  const items: MetaListItem[] = (goals ?? []).map((g) => {
    const weekStart = String(g.week_start);
    const weekEnd = String(g.week_end);

    // Progresso agregado da janela: total geral + quem bateu a meta
    const byCode = new Map<string, number>();
    let total = 0;
    for (const e of entries) {
      if (e.date < weekStart || e.date > weekEnd) continue;
      total += e.tickets;
      byCode.set(e.code, (byCode.get(e.code) ?? 0) + e.tickets);
    }
    let achievers = 0;
    byCode.forEach((v) => {
      if (v >= g.target_tickets) achievers++;
    });

    const status: 'past' | 'current' | 'future' =
      today < weekStart ? 'future' : today > weekEnd ? 'past' : 'current';

    return {
      id: g.id,
      title: g.title,
      week_start: weekStart,
      week_end: weekEnd,
      target_tickets: Number(g.target_tickets),
      reward: g.reward,
      status,
      total_tickets: total,
      achievers,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/afiliados"
            className="inline-flex items-center gap-1.5 text-sm text-cream-400 hover:text-cream-200 transition mb-1"
          >
            <ArrowLeft size={14} />
            Voltar para afiliados
          </Link>
          <h2 className="text-xl font-bold text-cream-200">Metas dos embaixadores</h2>
          <p className="text-sm text-cream-400 mt-1">
            As metas valem para <strong>todos</strong> os embaixadores do evento, medidas em
            ingressos vendidos. As semanais quebram a meta do evento em partes. Links da
            organização (marcados como &quot;organização&quot; no cadastro) ficam de fora.
          </p>
        </div>
      </div>

      <MetasSemanaisClient
        items={items}
        eventGoal={eventGoal}
        eventId={selectedEvent.id}
        ambassadors={ambassadors}
      />
    </div>
  );
}
