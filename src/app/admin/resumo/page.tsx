import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSelectedEvent } from '@/lib/admin/selected-event';
import {
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Ticket,
  Gift,
  Calculator,
  PieChart,
  CalendarDays,
  CreditCard,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ResumoPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin' && profile?.role !== 'producer') redirect('/');

  // Todos os numeros abaixo sao do evento selecionado (cookie; fallback = ativo)
  const selectedEvent = await getSelectedEvent();
  if (!selectedEvent) {
    return (
      <p className="text-cream-400 text-center py-16">
        Nenhum evento cadastrado. Crie um na aba Eventos.
      </p>
    );
  }
  const eventId = selectedEvent.id;

  // -------- contadores gerais de pedidos --------
  const [{ count: totalOrders }, { count: approvedOrders }] = await Promise.all([
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true })
      .eq('event_id', eventId),
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('payment_status', 'approved'),
  ]);

  // -------- itens de pedidos pagos (vendas + cortesias) --------
  const { data: paidItems } = await supabaseAdmin
    .from('order_items')
    .select('unit_price, is_courtesy, orders!inner(payment_status, event_id)')
    .eq('orders.payment_status', 'approved')
    .eq('orders.event_id', eventId)
    .range(0, 49999);

  const soldItems = (paidItems ?? []).filter((i) => !i.is_courtesy);
  const courtesyItems = (paidItems ?? []).filter((i) => i.is_courtesy);
  const ticketsSold = soldItems.length;
  const courtesiesIssued = courtesyItems.length;
  const ticketsRevenue = soldItems.reduce(
    (sum, i) => sum + Number(i.unit_price ?? 0),
    0,
  );

  // -------- taxa e faturamento total dos pedidos pagos --------
  const { data: paidOrders } = await supabaseAdmin
    .from('orders')
    .select('id, total, service_fee, paid_at, customer_id, payment_method, payment_gateway')
    .eq('event_id', eventId)
    .eq('payment_status', 'approved')
    .range(0, 49999);

  const totalRevenue = (paidOrders ?? []).reduce(
    (sum, o) => sum + Number(o.total ?? 0),
    0,
  );
  const totalFees = (paidOrders ?? []).reduce(
    (sum, o) => sum + Number(o.service_fee ?? 0),
    0,
  );
  const totalRevenueNet = totalRevenue - totalFees;
  const averageTicket = ticketsSold > 0 ? ticketsRevenue / ticketsSold : 0;

  // -------- itens com order_id e customer_id para agregacoes --------
  // Buscamos novamente os order_items pagos, agora com order_id para cruzar com paidOrders
  const { data: paidItemsWithOrder } = await supabaseAdmin
    .from('order_items')
    .select('order_id, is_courtesy, unit_price, orders!inner(customer_id, paid_at, payment_status, event_id)')
    .eq('orders.payment_status', 'approved')
    .eq('orders.event_id', eventId)
    .range(0, 49999);

  // -------- faturamento por forma de pagamento (pedidos pagos, exclui cortesia) --------
  const methodLabels: Record<string, string> = {
    pix: 'PIX',
    credit_card: 'Cartao de credito',
    offline_pix: 'PIX (venda offline)',
  };
  type MethodRow = { method: string; label: string; orders: number; revenue: number };
  const methodMap = new Map<string, MethodRow>();
  for (const o of paidOrders ?? []) {
    if (o.payment_method === 'courtesy') continue; // cortesia nao e faturamento
    // Venda offline (PDV) aparece separada do PIX online
    const key = o.payment_gateway === 'offline' ? 'offline_pix' : (o.payment_method ?? 'outro');
    const label = methodLabels[key] ?? 'Outro';
    const existing = methodMap.get(key) ?? { method: key, label, orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += Number(o.total ?? 0) - Number(o.service_fee ?? 0);
    methodMap.set(key, existing);
  }
  const methodRows = Array.from(methodMap.values()).sort((a, b) => b.revenue - a.revenue);
  const methodTotalRevenue = methodRows.reduce((s, r) => s + r.revenue, 0);

  // -------- gender dos customers que compraram (peso = quantidade de itens) --------
  // Indexa orders por id -> customer_id para evitar dependencia da forma do join
  const orderToCustomer = new Map<string, string | null>();
  for (const o of paidOrders ?? []) {
    orderToCustomer.set(o.id, o.customer_id ?? null);
  }
  const customerIds = Array.from(new Set(
    (paidOrders ?? [])
      .map((o) => o.customer_id)
      .filter((id): id is string => Boolean(id))
  ));
  const customerGenderMap = new Map<string, string | null>();
  if (customerIds.length > 0) {
    const { data: customerProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, gender')
      .in('id', customerIds);
    for (const p of customerProfiles ?? []) {
      customerGenderMap.set(p.id, p.gender);
    }
  }

  // Conta tickets (nao-cortesia) por bucket de genero
  let countFeminino = 0;
  let countMasculino = 0;
  let countOutros = 0;
  for (const it of paidItemsWithOrder ?? []) {
    const customerId = orderToCustomer.get(it.order_id) ?? null;
    const gender = customerId ? customerGenderMap.get(customerId) ?? null : null;
    if (gender === 'feminino') countFeminino++;
    else if (gender === 'masculino') countMasculino++;
    else countOutros++; // nao_binario, prefiro_nao_dizer, outro, null
  }
  const pieData = [
    { label: 'Mulheres', value: countFeminino, color: '#ec4899' }, // pink-500
    { label: 'Homens',   value: countMasculino, color: '#3b82f6' }, // blue-500
    { label: 'Outros',   value: countOutros,    color: '#9ca3af' }, // gray-400
  ];
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  // -------- vendas por dia (paid_at em horario SP) --------
  type DailyRow = { date: string; orders: number; tickets: number; revenue: number };
  const dailyMap = new Map<string, DailyRow>();

  // Conta tickets por order_id
  const ticketsByOrder = new Map<string, number>();
  for (const it of paidItemsWithOrder ?? []) {
    ticketsByOrder.set(it.order_id, (ticketsByOrder.get(it.order_id) ?? 0) + 1);
  }

  for (const o of paidOrders ?? []) {
    if (!o.paid_at) continue;
    const dateKey = formatDateSP(o.paid_at); // 'YYYY-MM-DD' em SP
    const existing = dailyMap.get(dateKey) ?? { date: dateKey, orders: 0, tickets: 0, revenue: 0 };
    existing.orders += 1;
    existing.tickets += ticketsByOrder.get(o.id) ?? 0;
    existing.revenue += Number(o.total ?? 0) - Number(o.service_fee ?? 0);
    dailyMap.set(dateKey, existing);
  }

  // Mais recentes primeiro
  const dailyRows = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtNumber = (v: number) => v.toLocaleString('pt-BR');

  const stats = [
    { icon: ClipboardList, value: fmtNumber(totalOrders ?? 0),    label: 'Total de pedidos' },
    { icon: CheckCircle2,  value: fmtNumber(approvedOrders ?? 0), label: 'Pedidos aprovados' },
    { icon: TrendingUp,    value: fmtCurrency(totalRevenueNet),   label: 'Faturamento total' },
    { icon: Ticket,        value: fmtNumber(ticketsSold),         label: 'Ingressos vendidos' },
    { icon: Gift,          value: fmtNumber(courtesiesIssued),    label: 'Cortesias geradas' },
    { icon: TrendingUp,    value: fmtCurrency(ticketsRevenue),    label: 'Valor de ingressos vendidos' },
    { icon: Calculator,    value: fmtCurrency(averageTicket),     label: 'Ticket medio' },
  ];

  return (
    <div className="space-y-6">
      {/* Grid principal de stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-wine-700 rounded-lg p-6 border border-mauve-700"
            >
              <Icon className="text-amber-sacode-400 mb-3" size={24} />
              <p className="text-3xl font-bold text-cream-200">{stat.value}</p>
              <p className="text-sm text-cream-400 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Faturamento por forma de pagamento */}
      <div className="bg-wine-700 rounded-lg border border-mauve-700 overflow-hidden">
        <div className="flex items-center gap-2 p-6 border-b border-mauve-700">
          <CreditCard className="text-amber-sacode-400" size={20} />
          <h2 className="text-cream-200 font-bold">Faturamento por forma de pagamento</h2>
        </div>
        <p className="text-cream-400 text-xs px-6 pt-3">
          Pedidos pagos, cortesias excluidas.
        </p>
        {methodRows.length === 0 ? (
          <p className="text-cream-400 text-sm p-6">Nenhum pagamento registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-wine-800 text-cream-300 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Forma</th>
                  <th className="text-right p-3">Pedidos</th>
                  <th className="text-right p-3">Faturamento</th>
                  <th className="text-right p-3">% do total</th>
                </tr>
              </thead>
              <tbody>
                {methodRows.map((row) => {
                  const pct = methodTotalRevenue > 0
                    ? ((row.revenue / methodTotalRevenue) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr key={row.method} className="border-t border-mauve-700 text-cream-200">
                      <td className="p-3 whitespace-nowrap">{row.label}</td>
                      <td className="p-3 text-right">{fmtNumber(row.orders)}</td>
                      <td className="p-3 text-right">{fmtCurrency(row.revenue)}</td>
                      <td className="p-3 text-right">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-wine-800 text-cream-200 font-bold">
                <tr>
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right">{fmtNumber(methodRows.reduce((s, r) => s + r.orders, 0))}</td>
                  <td className="p-3 text-right">{fmtCurrency(methodTotalRevenue)}</td>
                  <td className="p-3 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Grafico de pizza: ingressos pagos por genero */}
      <div className="bg-wine-700 rounded-lg p-6 border border-mauve-700">
        <div className="flex items-center gap-2 mb-1">
          <PieChart className="text-amber-sacode-400" size={20} />
          <h2 className="text-cream-200 font-bold">Ingressos por genero</h2>
        </div>
        <p className="text-cream-400 text-xs mb-4">Inclui ingressos pagos e cortesias</p>
        {pieTotal === 0 ? (
          <p className="text-cream-400 text-sm">Nenhum ingresso pago ainda.</p>
        ) : (
          <PieChartSVG data={pieData} total={pieTotal} />
        )}
      </div>

      {/* Tabela: Vendas por dia */}
      <div className="bg-wine-700 rounded-lg border border-mauve-700 overflow-hidden">
        <div className="flex items-center gap-2 p-6 border-b border-mauve-700">
          <CalendarDays className="text-amber-sacode-400" size={20} />
          <h2 className="text-cream-200 font-bold">Vendas por dia</h2>
        </div>
        {dailyRows.length === 0 ? (
          <p className="text-cream-400 text-sm p-6">Nenhuma venda registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-wine-800 text-cream-300 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Data</th>
                  <th className="text-right p-3">Pedidos</th>
                  <th className="text-right p-3">Ingressos</th>
                  <th className="text-right p-3">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((row) => (
                  <tr key={row.date} className="border-t border-mauve-700 text-cream-200">
                    <td className="p-3 whitespace-nowrap">{formatDateDisplay(row.date)}</td>
                    <td className="p-3 text-right">{fmtNumber(row.orders)}</td>
                    <td className="p-3 text-right">{fmtNumber(row.tickets)}</td>
                    <td className="p-3 text-right">{fmtCurrency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-wine-800 text-cream-200 font-bold">
                <tr>
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right">{fmtNumber(dailyRows.reduce((s, r) => s + r.orders, 0))}</td>
                  <td className="p-3 text-right">{fmtNumber(dailyRows.reduce((s, r) => s + r.tickets, 0))}</td>
                  <td className="p-3 text-right">{fmtCurrency(dailyRows.reduce((s, r) => s + r.revenue, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// -------- componentes auxiliares --------

function PieChartSVG({
  data,
  total,
}: {
  data: { label: string; value: number; color: string }[];
  total: number;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;

  // Gera os paths de cada fatia (so para fatias com value > 0)
  let cumulativeAngle = -Math.PI / 2; // comeca em cima
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const fraction = d.value / total;
      const angle = fraction * Math.PI * 2;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;

      // Caso especial: uma unica fatia (100%) - desenha um circulo completo
      if (fraction === 1) {
        return { ...d, path: '', fullCircle: true };
      }

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return { ...d, path, fullCircle: false };
    });

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice) =>
          slice.fullCircle ? (
            <circle key={slice.label} cx={cx} cy={cy} r={r} fill={slice.color} />
          ) : (
            <path key={slice.label} d={slice.path} fill={slice.color} stroke="#3a1f2f" strokeWidth={2} />
          )
        )}
      </svg>
      <div className="flex-1 w-full space-y-2">
        {data.map((d) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={d.label} className="flex items-center gap-3">
              <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: d.color }} />
              <span className="text-cream-200 font-medium flex-1">{d.label}</span>
              <span className="text-cream-300 text-sm tabular-nums">
                {d.value} ({pct}%)
              </span>
            </div>
          );
        })}
        <div className="pt-2 mt-2 border-t border-mauve-700 flex items-center gap-3">
          <span className="inline-block w-4 h-4" />
          <span className="text-cream-200 font-bold flex-1">Total</span>
          <span className="text-cream-200 font-bold text-sm tabular-nums">{total}</span>
        </div>
      </div>
    </div>
  );
}

// -------- helpers de data em horario SP --------

// 'YYYY-MM-DD' para um ISO timestamp em horario SP
function formatDateSP(isoDate: string): string {
  const d = new Date(isoDate);
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// 'YYYY-MM-DD' -> 'DD/MM/YYYY (dia da semana)'
function formatDateDisplay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  // Cria a data como local (sem timezone shift)
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
  const ddmm = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${ddmm} (${weekday.replace('.', '')})`;
}
