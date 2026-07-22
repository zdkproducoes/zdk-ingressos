// Painel financeiro. Acesso: owner da organização (ou superadmin, que vê todas).
// O PRODUTOR vê apenas as próprias vendas (Vendas, pedidos, ingressos) e o que
// recebeu de repasse — NUNCA a taxa da plataforma. A taxa é receita do
// proprietário (superadmin), que vê o detalhamento completo.
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelContext, type PanelContext } from '@/lib/auth/panel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Financeiro — Painel' };

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type OrgSummary = {
  id: string;
  name: string;
  feePercent: number;
  // gross = total pago pelo cliente (ingresso + taxa); revenue = só ingresso
  // (total − taxa), que é o que o produtor recebe.
  events: { id: string; title: string; gross: number; revenue: number; orders: number; tickets: number }[];
  gross: number;
  ticketRevenue: number;
  platformFee: number;
  payouts: {
    id: string;
    period_start: string | null;
    period_end: string | null;
    gross_amount: number;
    platform_fee: number;
    mp_fees: number;
    net_amount: number;
    status: string;
    paid_at: string | null;
    event_title: string | null;
    notes: string | null;
  }[];
  paidOut: number;
  mpFees: number;
};

async function buildOrgSummary(orgId: string, name: string, feePercent: number): Promise<OrgSummary> {
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, title')
    .eq('organization_id', orgId)
    .order('event_date', { ascending: false });

  const eventIds = (events ?? []).map((e) => e.id);

  // Vendas aprovadas (cortesia fora — não é receita)
  let orders: { event_id: string; total: number; service_fee: number }[] = [];
  if (eventIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('event_id, total, service_fee, is_courtesy')
      .in('event_id', eventIds)
      .eq('payment_status', 'approved')
      .eq('is_courtesy', false)
      .range(0, 49999);
    orders = (data ?? []) as { event_id: string; total: number; service_fee: number }[];
  }

  let items: { event_id: string }[] = [];
  if (eventIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('order_items')
      .select('id, orders!inner(event_id, payment_status, is_courtesy)')
      .eq('orders.payment_status', 'approved')
      .eq('orders.is_courtesy', false)
      .in('orders.event_id', eventIds)
      .range(0, 49999);
    items = ((data ?? []) as any[]).map((it) => {
      const rel = Array.isArray(it.orders) ? it.orders[0] : it.orders;
      return { event_id: rel?.event_id };
    });
  }

  const grossByEvent = new Map<string, { gross: number; revenue: number; fee: number; orders: number }>();
  for (const o of orders) {
    const agg = grossByEvent.get(o.event_id) ?? { gross: 0, revenue: 0, fee: 0, orders: 0 };
    const total = Number(o.total ?? 0);
    const fee = Number(o.service_fee ?? 0);
    agg.gross += total;
    agg.revenue += total - fee; // valor dos ingressos (o que o produtor recebe)
    agg.fee += fee;             // taxa da plataforma efetivamente cobrada
    agg.orders += 1;
    grossByEvent.set(o.event_id, agg);
  }
  const ticketsByEvent = new Map<string, number>();
  for (const it of items) {
    if (!it.event_id) continue;
    ticketsByEvent.set(it.event_id, (ticketsByEvent.get(it.event_id) ?? 0) + 1);
  }

  const eventRows = (events ?? []).map((e) => {
    const agg = grossByEvent.get(e.id) ?? { gross: 0, revenue: 0, fee: 0, orders: 0 };
    return {
      id: e.id,
      title: e.title,
      gross: agg.gross,
      revenue: agg.revenue,
      orders: agg.orders,
      tickets: ticketsByEvent.get(e.id) ?? 0,
    };
  });

  const gross = eventRows.reduce((acc, e) => acc + e.gross, 0);
  const ticketRevenue = eventRows.reduce((acc, e) => acc + e.revenue, 0);
  // Taxa real cobrada = total pago − valor dos ingressos. Não usar gross×fee%,
  // que ignora descontos de cupom e o arredondamento aplicado no checkout.
  const platformFee = gross - ticketRevenue;

  const { data: payoutRows } = await supabaseAdmin
    .from('payouts')
    .select('id, period_start, period_end, gross_amount, platform_fee, mp_fees, net_amount, status, paid_at, notes, events(title)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  const payouts = ((payoutRows ?? []) as any[]).map((p) => ({
    id: p.id,
    period_start: p.period_start,
    period_end: p.period_end,
    gross_amount: Number(p.gross_amount ?? 0),
    platform_fee: Number(p.platform_fee ?? 0),
    mp_fees: Number(p.mp_fees ?? 0),
    net_amount: Number(p.net_amount ?? 0),
    status: p.status,
    paid_at: p.paid_at,
    notes: p.notes,
    event_title: (Array.isArray(p.events) ? p.events[0]?.title : p.events?.title) ?? null,
  }));

  const paidOut = payouts.filter((p) => p.status === 'paid').reduce((a, p) => a + p.net_amount, 0);
  const mpFees = payouts.filter((p) => p.status !== 'cancelled').reduce((a, p) => a + p.mp_fees, 0);

  return {
    id: orgId,
    name,
    feePercent,
    events: eventRows,
    gross,
    ticketRevenue,
    platformFee,
    payouts,
    paidOut,
    mpFees,
  };
}

async function resolveOrgs(ctx: PanelContext): Promise<{ id: string; name: string; fee: number }[]> {
  if (!ctx.isSuperadmin) {
    // owner das organizações onde tem papel de owner
    return ctx.memberships
      .filter((m) => m.role === 'owner')
      .map((m) => ({
        id: m.organization_id,
        name: m.organization?.name ?? 'Organização',
        fee: Number(m.organization?.platform_fee_percent ?? 0),
      }));
  }
  const { data } = await supabaseAdmin
    .from('organizations')
    .select('id, name, platform_fee_percent')
    .order('name');
  return (data ?? []).map((o) => ({ id: o.id, name: o.name, fee: Number(o.platform_fee_percent ?? 0) }));
}

const PAYOUT_STATUS: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'Pendente',  classes: 'bg-yellow-900 text-yellow-300' },
  paid:      { label: 'Pago',      classes: 'bg-green-900 text-green-300' },
  cancelled: { label: 'Cancelado', classes: 'bg-red-900 text-red-300' },
};

export default async function FinanceiroPage() {
  const ctx = await requirePanelContext({ minOrgRole: 'owner' });

  const orgs = await resolveOrgs(ctx);
  if (orgs.length === 0) {
    return (
      <p className="text-cream-400 text-center py-16">
        O financeiro é visível apenas para o dono (owner) da organização.
      </p>
    );
  }

  const summaries = await Promise.all(orgs.map((o) => buildOrgSummary(o.id, o.name, o.fee)));

  // A taxa da plataforma é receita do proprietário (superadmin). O produtor
  // vê apenas as próprias vendas — nunca a taxa, em lugar nenhum.
  const isSuperadmin = ctx.isSuperadmin;

  return (
    <div className="space-y-10">
      {summaries.map((org) => {
        const estimated = org.gross - org.platformFee - org.mpFees - org.paidOut;
        const totalOrders = org.events.reduce((a, e) => a + e.orders, 0);
        const totalTickets = org.events.reduce((a, e) => a + e.tickets, 0);
        return (
          <section key={org.id}>
            {summaries.length > 1 && (
              <h2 className="text-xl font-bold text-cream-200 mb-4">{org.name}</h2>
            )}

            {/* Cartões de resumo */}
            {isSuperadmin ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="bg-surface-700 border border-muted-700 rounded-lg px-4 py-3">
                    <p className="text-xs text-cream-400">Vendas brutas</p>
                    <p className="text-xl font-bold text-cream-200">{fmtBRL(org.gross)}</p>
                  </div>
                  <div className="bg-surface-700 border border-muted-700 rounded-lg px-4 py-3">
                    <p className="text-xs text-cream-400">Taxa da plataforma ({org.feePercent}%)</p>
                    <p className="text-xl font-bold text-cream-200">− {fmtBRL(org.platformFee)}</p>
                  </div>
                  <div className="bg-surface-700 border border-muted-700 rounded-lg px-4 py-3">
                    <p className="text-xs text-cream-400">Já repassado</p>
                    <p className="text-xl font-bold text-cream-200">{fmtBRL(org.paidOut)}</p>
                  </div>
                  <div className="bg-surface-700 border border-accent-400/50 rounded-lg px-4 py-3">
                    <p className="text-xs text-cream-400">Saldo estimado a receber</p>
                    <p className="text-xl font-bold text-accent-400">{fmtBRL(Math.max(0, estimated))}</p>
                  </div>
                </div>
                <p className="text-xs text-cream-400 mb-6">
                  Saldo estimado = vendas brutas − taxa da plataforma − tarifas do Mercado Pago
                  registradas ({fmtBRL(org.mpFees)}) − repasses já pagos. Valores finais são
                  confirmados a cada repasse.
                </p>
              </>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                <div className="bg-surface-700 border border-accent-400/50 rounded-lg px-4 py-3">
                  <p className="text-xs text-cream-400">Vendas</p>
                  <p className="text-xl font-bold text-accent-400">{fmtBRL(org.ticketRevenue)}</p>
                </div>
                <div className="bg-surface-700 border border-muted-700 rounded-lg px-4 py-3">
                  <p className="text-xs text-cream-400">Pedidos pagos</p>
                  <p className="text-xl font-bold text-cream-200">{totalOrders}</p>
                </div>
                <div className="bg-surface-700 border border-muted-700 rounded-lg px-4 py-3">
                  <p className="text-xs text-cream-400">Ingressos vendidos</p>
                  <p className="text-xl font-bold text-cream-200">{totalTickets}</p>
                </div>
              </div>
            )}

            {/* Vendas por evento */}
            <h3 className="text-sm font-semibold text-cream-300 uppercase tracking-wider mb-2">
              Vendas por evento
            </h3>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-cream-400 border-b border-muted-700">
                    <th className="py-2 pr-4">Evento</th>
                    <th className="py-2 pr-4 text-right">Pedidos</th>
                    <th className="py-2 pr-4 text-right">Ingressos</th>
                    <th className="py-2 text-right">{isSuperadmin ? 'Bruto' : 'Vendas'}</th>
                  </tr>
                </thead>
                <tbody>
                  {org.events.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-center text-cream-400">Nenhum evento.</td></tr>
                  ) : org.events.map((e) => (
                    <tr key={e.id} className="border-b border-muted-700/50 text-cream-200">
                      <td className="py-2.5 pr-4">{e.title}</td>
                      <td className="py-2.5 pr-4 text-right">{e.orders}</td>
                      <td className="py-2.5 pr-4 text-right">{e.tickets}</td>
                      <td className="py-2.5 text-right font-medium">{fmtBRL(isSuperadmin ? e.gross : e.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Repasses */}
            <h3 className="text-sm font-semibold text-cream-300 uppercase tracking-wider mb-2">
              Repasses
            </h3>
            {org.payouts.length === 0 ? (
              <p className="text-sm text-cream-400 py-4">
                Nenhum repasse registrado ainda.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-cream-400 border-b border-muted-700">
                      <th className="py-2 pr-4">Período / evento</th>
                      {isSuperadmin && <th className="py-2 pr-4 text-right">Bruto</th>}
                      {isSuperadmin && <th className="py-2 pr-4 text-right">Taxa</th>}
                      {isSuperadmin && <th className="py-2 pr-4 text-right">Tarifas MP</th>}
                      <th className="py-2 pr-4 text-right">{isSuperadmin ? 'Líquido' : 'Recebido'}</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {org.payouts.map((p) => {
                      const badge = PAYOUT_STATUS[p.status] ?? { label: p.status, classes: 'bg-muted-700 text-cream-300' };
                      const period = p.event_title
                        ? p.event_title
                        : [p.period_start, p.period_end].filter(Boolean).join(' a ') || '—';
                      return (
                        <tr key={p.id} className="border-b border-muted-700/50 text-cream-200">
                          <td className="py-2.5 pr-4">
                            {period}
                            {p.notes && <span className="block text-xs text-cream-400">{p.notes}</span>}
                          </td>
                          {isSuperadmin && <td className="py-2.5 pr-4 text-right">{fmtBRL(p.gross_amount)}</td>}
                          {isSuperadmin && <td className="py-2.5 pr-4 text-right">− {fmtBRL(p.platform_fee)}</td>}
                          {isSuperadmin && <td className="py-2.5 pr-4 text-right">− {fmtBRL(p.mp_fees)}</td>}
                          <td className="py-2.5 pr-4 text-right font-medium text-accent-400">{fmtBRL(p.net_amount)}</td>
                          <td className="py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.classes}`}>
                              {badge.label}
                            </span>
                            {p.paid_at && (
                              <span className="block text-xs text-cream-400 mt-0.5">
                                {new Date(p.paid_at).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
