// app/afiliado/[code]/page.tsx
// Painel público do embaixador (Etapa C do sistema de afiliados).
// Acessado pelo link mágico gerado no admin: /afiliado/<code>?token=<panel_token>
// Sem login: o token de 48 chars é a credencial. Dados de compradores são
// mascarados no servidor — nome parcial, sem e-mail/telefone (LGPD).
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AfiliadoPanelClient, type PanelData } from '@/components/afiliado/AfiliadoPanelClient';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Painel do Embaixador — SACODE',
  robots: { index: false, follow: false },
};

// Meta de check-in: % dos ingressos vendidos pelo embaixador que precisam
// entrar no evento. Liberada apenas a partir do horário de início do evento.
const CHECKIN_TARGET_PCT = 75;

// timestamptz -> 'YYYY-MM-DD' no fuso do evento (America/Sao_Paulo),
// para casar as vendas com as janelas de meta (colunas date).
const spDateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const toSaoPauloDate = (iso: string) => spDateFmt.format(new Date(iso));

// "Maria Aparecida Silva" -> "Maria S."  |  "João" -> "João"
function maskBuyerName(fullName: string | null): string {
  if (!fullName?.trim()) return 'Comprador(a)';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function InvalidLink() {
  return (
    <main className="min-h-screen bg-wine-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-wine-700 border border-mauve-700 rounded-xl p-8 text-center">
        <AlertCircle size={40} className="mx-auto text-amber-sacode-400 mb-4" />
        <h1 className="text-xl font-bold text-cream-200 mb-2">Link inválido ou expirado</h1>
        <p className="text-sm text-cream-400">
          Este link do painel não é válido. Se você é embaixador(a) do evento,
          peça um novo link à produção — o link pode ter sido regenerado.
        </p>
      </div>
    </main>
  );
}

export default async function AfiliadoPanelPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { code: rawCode } = await params;
  const { token } = await searchParams;

  const code = decodeURIComponent(rawCode).trim().toLowerCase();
  // Valida formato antes de ir ao banco (mesma regra do CHECK da tabela)
  if (!token || !/^[a-z0-9-]+$/.test(code) || !/^[a-f0-9]{48}$/.test(token)) {
    return <InvalidLink />;
  }

  // code + panel_token juntos são a credencial (token é único e imprevisível)
  const { data: aff } = await supabaseAdmin
    .from('affiliates')
    .select('id, code, name, commission_percent, is_active, is_staff, visits, event_id, events!inner(title, slug, event_date, event_time, venue_name)')
    .eq('code', code)
    .eq('panel_token', token)
    .maybeSingle();

  if (!aff) return <InvalidLink />;

  const eventRel = Array.isArray(aff.events) ? aff.events[0] : aff.events;

  // O evento já começou? (libera check-in, meta e pódio de check-in)
  // Comparação no fuso do evento: America/Sao_Paulo = UTC-3 fixo.
  const eventStarted = (() => {
    if (!eventRel?.event_date) return false;
    const time = eventRel.event_time ? String(eventRel.event_time).slice(0, 8) : '00:00:00';
    return Date.now() >= new Date(`${eventRel.event_date}T${time}-03:00`).getTime();
  })();

  // Vendas aprovadas atribuídas a este embaixador neste evento.
  // Nome/telefone do comprador vêm do perfil (orders não tem essas colunas);
  // check-in por ingresso vem de order_items.checked_in_at.
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, total, service_fee, created_at, profiles:customer_id(full_name, phone), order_items(id, attendee_name, checked_in_at)')
    .eq('payment_status', 'approved')
    .eq('affiliate_code', aff.code)
    .eq('event_id', aff.event_id)
    .order('created_at', { ascending: false });

  const approved = orders ?? [];

  // ---- Gamificação: pódio, meta do evento e metas semanais ----
  // Pedidos aprovados de TODOS os embaixadores do evento, com contagem de
  // itens (ingressos) e data — base do pódio e do progresso das metas.
  const [
    { data: teammates },
    { data: attributedOrders },
    { data: goalRows },
    { data: eventGoalRow },
  ] = await Promise.all([
    supabaseAdmin
      .from('affiliates')
      .select('code, name, is_staff')
      .eq('event_id', aff.event_id),
    supabaseAdmin
      .from('orders')
      .select('affiliate_code, created_at, order_items(id, checked_in_at)')
      .eq('event_id', aff.event_id)
      .eq('payment_status', 'approved')
      .not('affiliate_code', 'is', null),
    supabaseAdmin
      .from('affiliate_weekly_goals')
      .select('id, title, week_start, week_end, target_tickets, reward')
      .eq('event_id', aff.event_id)
      .order('week_start', { ascending: true }),
    supabaseAdmin
      .from('affiliate_event_goals')
      .select('target_tickets, reward')
      .eq('event_id', aff.event_id)
      .maybeSingle(),
  ]);

  // Ingressos e check-ins por embaixador, e vendas datadas do próprio (para as metas)
  const ticketsByCode = new Map<string, number>();
  const checkedByCode = new Map<string, number>();
  const myDatedSales: Array<{ date: string; tickets: number }> = [];
  for (const o of attributedOrders ?? []) {
    const affCode = String(o.affiliate_code);
    const items = Array.isArray(o.order_items) ? o.order_items : [];
    const checked = items.filter((i) => i.checked_in_at).length;
    ticketsByCode.set(affCode, (ticketsByCode.get(affCode) ?? 0) + items.length);
    checkedByCode.set(affCode, (checkedByCode.get(affCode) ?? 0) + checked);
    if (affCode === aff.code) {
      myDatedSales.push({ date: toSaoPauloDate(o.created_at), tickets: items.length });
    }
  }
  const ticketsCount = ticketsByCode.get(aff.code) ?? 0;

  // Links da organização (is_staff) ficam fora do pódio e das metas.
  // Se ESTE painel é de um link da organização, esconde a gamificação toda.
  const isStaff = Boolean(aff.is_staff);

  // Ranking completo (inclui quem ainda não vendeu), ordenado por ingressos
  const ranking = isStaff
    ? []
    : (teammates ?? [])
        .filter((t) => !t.is_staff)
        .map((t) => ({
          name: t.name,
          tickets: ticketsByCode.get(t.code) ?? 0,
          isMe: t.code === aff.code,
        }))
        .sort((a, b) => b.tickets - a.tickets || a.name.localeCompare(b.name, 'pt-BR'));
  // Posição estilo competição: empatados dividem a mesma posição
  const myRank = ranking.filter((r) => r.tickets > ticketsCount).length + 1;

  // Check-in (só a partir do início do evento): meta de 75% + pódio em %.
  // No pódio de check-in entram só embaixadores com pelo menos 1 ingresso vendido.
  const checkin =
    eventStarted && !isStaff
      ? {
          target: CHECKIN_TARGET_PCT,
          myTickets: ticketsCount,
          myCheckedIn: checkedByCode.get(aff.code) ?? 0,
          podium: (teammates ?? [])
            .filter((t) => !t.is_staff)
            .map((t) => {
              const sold = ticketsByCode.get(t.code) ?? 0;
              const done = checkedByCode.get(t.code) ?? 0;
              return {
                name: t.name,
                sold,
                pct: sold > 0 ? (done / sold) * 100 : 0,
                isMe: t.code === aff.code,
              };
            })
            .filter((t) => t.sold > 0)
            .sort(
              (a, b) =>
                b.pct - a.pct || b.sold - a.sold || a.name.localeCompare(b.name, 'pt-BR'),
            )
            .map(({ name, pct, isMe }) => ({ name, pct, isMe })),
        }
      : null;

  // Meta do evento (a grande meta): total do embaixador na campanha inteira
  const eventGoal =
    !isStaff && eventGoalRow
      ? {
          target: Number(eventGoalRow.target_tickets),
          reward: eventGoalRow.reward,
          myTickets: ticketsCount,
        }
      : null;

  // Metas semanais: progresso do próprio embaixador na janela de cada meta
  const today = toSaoPauloDate(new Date().toISOString());
  const goals = (isStaff ? [] : goalRows ?? []).map((g) => {
    const weekStart = String(g.week_start);
    const weekEnd = String(g.week_end);
    const mine = myDatedSales
      .filter((s) => s.date >= weekStart && s.date <= weekEnd)
      .reduce((sum, s) => sum + s.tickets, 0);
    const status: 'past' | 'current' | 'future' =
      today < weekStart ? 'future' : today > weekEnd ? 'past' : 'current';
    return {
      id: g.id,
      title: g.title,
      weekStart,
      weekEnd,
      target: Number(g.target_tickets),
      reward: g.reward,
      myTickets: mine,
      status,
    };
  });

  const commissionPercent = Number(aff.commission_percent);
  const netRevenue = approved.reduce(
    (sum, o) => sum + (Number(o.total ?? 0) - Number(o.service_fee ?? 0)),
    0,
  );
  const commission = netRevenue * (commissionPercent / 100);
  const visits = aff.visits ?? 0;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sacode.cantorcaiolacerda.com.br';
  const shareUrl = `${baseUrl}/evento/${eventRel?.slug ?? ''}?ref=${aff.code}`;

  const data: PanelData = {
    name: aff.name,
    code: aff.code,
    isActive: aff.is_active,
    commissionPercent,
    eventTitle: eventRel?.title ?? 'Evento',
    eventDate: eventRel?.event_date ?? null,
    eventTime: eventRel?.event_time ? String(eventRel.event_time).slice(0, 5) : null,
    venueName: eventRel?.venue_name ?? null,
    shareUrl,
    stats: {
      visits,
      salesCount: approved.length,
      ticketsCount,
      netRevenue,
      commission,
      conversion: visits > 0 ? (approved.length / visits) * 100 : null,
    },
    // Mascarado no servidor: nome parcial, sem e-mail. Últimas 30.
    sales: approved.slice(0, 30).map((o) => {
      const prof = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
      const items = Array.isArray(o.order_items) ? o.order_items : [];
      const checkedItems = items.filter((i) => i.checked_in_at);
      const lastCheckin = checkedItems.reduce<string | null>(
        (max, i) => (!max || i.checked_in_at > max ? i.checked_in_at : max),
        null,
      );
      const allIn = items.length > 0 && checkedItems.length === items.length;
      return {
        buyer: maskBuyerName(prof?.full_name ?? items[0]?.attendee_name ?? null),
        net: Number(o.total ?? 0) - Number(o.service_fee ?? 0),
        createdAt: o.created_at,
        tickets: items.length,
        checkedIn: checkedItems.length,
        checkinAt: lastCheckin,
        // Telefone só vai ao cliente durante o evento e enquanto falta gente
        // entrar — é o mínimo necessário pro botão de chamar no WhatsApp (LGPD)
        phone: eventStarted && !allIn && prof?.phone ? String(prof.phone) : null,
      };
    }),
    podium: ranking,
    myRank,
    eventGoal,
    goals,
    eventStarted,
    checkin,
  };

  return <AfiliadoPanelClient data={data} />;
}
