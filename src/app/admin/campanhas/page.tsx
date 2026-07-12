import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSelectedEvent } from '@/lib/admin/selected-event';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { GerenciarCampanhasButton } from '@/components/admin/GerenciarCampanhasButton';
import {
  getCampaignInsights,
  PERIOD_PRESETS,
  META_ADS_MANAGER_URL,
  type CampaignRow,
} from '@/lib/meta/insights';
import {
  Megaphone,
  TrendingUp,
  ShoppingCart,
  Target,
  MousePointerClick,
  Eye,
  ExternalLink,
  KeyRound,
  Link2,
  Ticket,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const statusConfig: Record<string, { label: string; classes: string }> = {
  ACTIVE:        { label: 'Ativa',       classes: 'bg-green-900 text-green-300' },
  PAUSED:        { label: 'Pausada',     classes: 'bg-yellow-900 text-yellow-300' },
  IN_PROCESS:    { label: 'Processando', classes: 'bg-yellow-900 text-yellow-300' },
  PENDING_REVIEW:{ label: 'Em análise',  classes: 'bg-yellow-900 text-yellow-300' },
  DISAPPROVED:   { label: 'Reprovada',   classes: 'bg-red-900 text-red-300' },
  WITH_ISSUES:   { label: 'Com problemas', classes: 'bg-red-900 text-red-300' },
  ARCHIVED:      { label: 'Arquivada',   classes: 'bg-muted-700 text-cream-300' },
  DELETED:       { label: 'Excluída',    classes: 'bg-muted-700 text-cream-300' },
  CAMPAIGN_PAUSED:{ label: 'Pausada',    classes: 'bg-yellow-900 text-yellow-300' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, classes: 'bg-muted-700 text-cream-300' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

// Inicio/fim do periodo em horario SP (UTC-3 fixo), para casar com os presets
// do Meta. 'total' = sem filtro. Retorna instantes em ISO para filtrar paid_at.
function periodRangeSP(periodKey: string): { since?: string; until?: string } {
  const spMidnight = (daysAgo: number) => {
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const ymd = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    return new Date(`${ymd}T00:00:00-03:00`).toISOString();
  };
  switch (periodKey) {
    case 'hoje':  return { since: spMidnight(0) };
    case 'ontem': return { since: spMidnight(1), until: spMidnight(0) };
    case '7d':    return { since: spMidnight(6) };
    case '14d':   return { since: spMidnight(13) };
    case '30d':   return { since: spMidnight(29) };
    default:      return {};
  }
}

// Vendas do banco atribuidas aos links de canal de trafego pago (?ref= dos anuncios)
type SiteOrder = {
  id: string;
  orderNumber: number;
  buyerName: string;
  tickets: number;
  total: number;
  paidAt: string | null;
};

type SiteSales = {
  codes: string[];
  visits: number;
  orders: number;
  tickets: number;
  netRevenue: number;
  orderRows: SiteOrder[];
} | null;

async function getSiteSales(periodKey: string): Promise<SiteSales> {
  const selectedEvent = await getSelectedEvent();
  if (!selectedEvent) return null;

  const { data: adsAffiliates } = await supabaseAdmin
    .from('affiliates')
    .select('code, visits')
    .eq('event_id', selectedEvent.id)
    .eq('is_ads', true);
  if (!adsAffiliates || adsAffiliates.length === 0) return null;

  const codes = adsAffiliates.map((a) => a.code);
  const range = periodRangeSP(periodKey);
  const buildQuery = () => {
    let q = supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, total, service_fee, paid_at,
        profiles!orders_customer_id_fkey ( full_name ),
        order_items ( id )
      `)
      .eq('event_id', selectedEvent.id)
      .eq('payment_status', 'approved')
      .in('affiliate_code', codes)
      .order('paid_at', { ascending: false })
      .order('id');
    if (range.since) q = q.gte('paid_at', range.since);
    if (range.until) q = q.lt('paid_at', range.until);
    return q;
  };
  const orders = await fetchAllRows((from, to) => buildQuery().range(from, to));

  type Row = {
    id: string;
    order_number: number;
    total: number | null;
    service_fee: number | null;
    paid_at: string | null;
    profiles: { full_name: string | null } | null;
    order_items: { id: string }[] | null;
  };
  let tickets = 0;
  let netRevenue = 0;
  const orderRows: SiteOrder[] = [];
  for (const o of (orders as unknown as Row[])) {
    const qty = Array.isArray(o.order_items) ? o.order_items.length : 0;
    tickets += qty;
    netRevenue += Number(o.total ?? 0) - Number(o.service_fee ?? 0);
    orderRows.push({
      id: o.id,
      orderNumber: o.order_number,
      buyerName: o.profiles?.full_name?.trim() || '—',
      tickets: qty,
      total: Number(o.total ?? 0),
      paidAt: o.paid_at,
    });
  }
  return {
    codes,
    visits: adsAffiliates.reduce((s, a) => s + (a.visits ?? 0), 0),
    orders: orders.length,
    tickets,
    netRevenue,
    orderRows,
  };
}

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: { periodo?: string };
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin');
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'producer') redirect('/');

  const periodo = searchParams?.periodo && PERIOD_PRESETS[searchParams.periodo]
    ? searchParams.periodo
    : 'total';

  // Campanhas do Meta vinculadas ao evento selecionado (aba mostra so essas).
  // Sem vinculo cadastrado = mostra todas as campanhas da conta (fallback antigo).
  const selectedEvent = await getSelectedEvent();
  let linkedCampaignIds: string[] = [];
  if (selectedEvent) {
    const { data: links } = await supabaseAdmin
      .from('meta_campaigns')
      .select('campaign_id')
      .eq('event_id', selectedEvent.id);
    linkedCampaignIds = (links ?? []).map((l) => l.campaign_id);
  }
  const isFiltered = linkedCampaignIds.length > 0;

  const [result, siteSales] = await Promise.all([
    getCampaignInsights(periodo, linkedCampaignIds),
    getSiteSales(periodo),
  ]);

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtNumber = (v: number) => v.toLocaleString('pt-BR');
  const fmtDateTime = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));

  // -------- token nao configurado: instrucoes de setup --------
  if (!result.ok && result.reason === 'no_token') {
    return (
      <div className="bg-surface-700 rounded-lg border border-muted-700 p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="text-accent-400" size={20} />
          <h2 className="text-cream-200 font-bold">Conectar ao Meta Ads</h2>
        </div>
        <p className="text-cream-300 text-sm mb-4">
          Para acompanhar as campanhas aqui, é preciso um token da Meta com permissão de
          leitura de anúncios (<code className="text-accent-300">ads_read</code>).
          O token da API de Conversões não serve — ele só envia eventos.
        </p>
        <ol className="text-cream-300 text-sm space-y-2 list-decimal list-inside mb-4">
          <li>Acesse o <strong>Business Manager → Configurações do negócio → Usuários → Usuários do sistema</strong></li>
          <li>Crie (ou selecione) um usuário do sistema e clique em <strong>Gerar token</strong></li>
          <li>Marque a permissão <strong>ads_read</strong> e selecione a conta de anúncios do Sacode</li>
          <li>Adicione <code className="text-accent-300">META_ADS_TOKEN=&lt;token&gt;</code> nas variáveis de ambiente (local e Vercel)</li>
        </ol>
        <p className="text-cream-400 text-xs">
          Depois de configurar, recarregue esta página.
        </p>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="bg-surface-700 rounded-lg border border-red-900 p-6 max-w-2xl">
        <h2 className="text-cream-200 font-bold mb-2">Erro ao consultar o Meta Ads</h2>
        <p className="text-cream-300 text-sm mb-3">
          A Graph API retornou um erro. Verifique se o token tem a permissão{' '}
          <code className="text-accent-300">ads_read</code> e acesso à conta de anúncios.
        </p>
        <p className="text-cream-400 text-xs font-mono break-all">{result.message}</p>
      </div>
    );
  }

  const campaigns = result.campaigns;

  // -------- totais do periodo (todas as campanhas listadas) --------
  const totals = campaigns.reduce(
    (acc, c) => {
      acc.spend += c.spend;
      acc.impressions += c.impressions;
      acc.clicks += c.clicks;
      acc.purchases += c.purchases;
      acc.purchaseValue += c.purchaseValue;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, purchases: 0, purchaseValue: 0 },
  );
  const roas = totals.spend > 0 ? totals.purchaseValue / totals.spend : 0;
  const cpa = totals.purchases > 0 ? totals.spend / totals.purchases : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  const stats = [
    { icon: Megaphone,         value: fmtCurrency(totals.spend),         label: 'Investimento' },
    { icon: ShoppingCart,      value: fmtNumber(totals.purchases),       label: 'Compras (Meta)' },
    { icon: TrendingUp,        value: fmtCurrency(totals.purchaseValue), label: 'Valor das compras' },
    { icon: Target,            value: totals.spend > 0 ? `${roas.toFixed(2)}x` : '—', label: 'ROAS' },
    { icon: Target,            value: totals.purchases > 0 ? fmtCurrency(cpa) : '—', label: 'Custo por compra' },
    { icon: Eye,               value: fmtNumber(totals.impressions),     label: 'Impressões' },
    { icon: MousePointerClick, value: fmtNumber(totals.clicks),          label: 'Cliques' },
    { icon: MousePointerClick, value: `${ctr.toFixed(2)}%`,              label: 'CTR' },
  ];

  return (
    <div className="space-y-6">
      {/* Filtro de periodo + link para o Gerenciador */}
      <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-cream-400">Período:</span>
          {Object.entries(PERIOD_PRESETS).map(([key, p]) => (
            key === periodo ? (
              <span key={key} className="px-2.5 py-1 rounded-lg border border-accent-400 bg-accent-400 text-surface-800 font-semibold">
                {p.label}
              </span>
            ) : (
              <Link key={key} href={`/admin/campanhas?periodo=${key}`}
                className="px-2.5 py-1 rounded-lg border border-muted-700 text-cream-200 hover:bg-surface-700 transition">
                {p.label}
              </Link>
            )
          ))}
        </div>
        <div className="flex items-center gap-4">
          <GerenciarCampanhasButton />
          <a
            href={META_ADS_MANAGER_URL()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-accent-400 hover:text-accent-300 transition"
          >
            Abrir no Gerenciador <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Cards de totais do periodo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-surface-700 rounded-lg p-6 border border-muted-700">
              <Icon className="text-accent-400 mb-3" size={24} />
              <p className="text-2xl font-bold text-cream-200">{stat.value}</p>
              <p className="text-sm text-cream-400 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Vendas reais do banco atribuidas ao link dos anuncios (?ref=) */}
      {siteSales && (
        <div className="bg-surface-700 rounded-lg border border-muted-700 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="text-accent-400" size={20} />
            <h2 className="text-cream-200 font-bold">Vendas pelo site (link dos anúncios)</h2>
          </div>
          <p className="text-cream-400 text-xs mb-4">
            Pedidos aprovados no banco atribuídos a{' '}
            <span className="font-mono text-accent-300">
              ?ref={siteSales.codes.join(', ')}
            </span>{' '}
            (cookie de 30 dias, último clique vence). É a contagem real — a coluna
            &quot;Compras&quot; acima segue a atribuição do Meta e pode diferir.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <MousePointerClick className="text-accent-400 mb-2" size={20} />
              <p className="text-2xl font-bold text-cream-200">{fmtNumber(siteSales.visits)}</p>
              <p className="text-sm text-cream-400 mt-0.5">Cliques no link (total)</p>
            </div>
            <div>
              <ShoppingCart className="text-accent-400 mb-2" size={20} />
              <p className="text-2xl font-bold text-cream-200">{fmtNumber(siteSales.orders)}</p>
              <p className="text-sm text-cream-400 mt-0.5">Pedidos no período</p>
            </div>
            <div>
              <Ticket className="text-accent-400 mb-2" size={20} />
              <p className="text-2xl font-bold text-cream-200">{fmtNumber(siteSales.tickets)}</p>
              <p className="text-sm text-cream-400 mt-0.5">Ingressos no período</p>
            </div>
            <div>
              <TrendingUp className="text-accent-400 mb-2" size={20} />
              <p className="text-2xl font-bold text-cream-200">{fmtCurrency(siteSales.netRevenue)}</p>
              <p className="text-sm text-cream-400 mt-0.5">Receita líquida no período</p>
            </div>
          </div>

          {/* Pedidos individuais atribuidos ao link dos anuncios */}
          {siteSales.orderRows.length > 0 && (
            <div className="mt-6 border-t border-muted-700 pt-4">
              <h3 className="text-cream-200 font-semibold text-sm mb-3">
                Pedidos no período ({fmtNumber(siteSales.orders)})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-800 text-cream-300 text-xs uppercase">
                    <tr>
                      <th className="text-left p-3">Pedido</th>
                      <th className="text-left p-3">Comprador</th>
                      <th className="text-left p-3">Pago em</th>
                      <th className="text-right p-3">Ingressos</th>
                      <th className="text-right p-3">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteSales.orderRows.map((o) => (
                      <tr key={o.id} className="border-t border-muted-700 text-cream-200">
                        <td className="p-3 font-mono whitespace-nowrap">#{o.orderNumber}</td>
                        <td className="p-3 max-w-xs">
                          <p className="truncate" title={o.buyerName}>{o.buyerName}</p>
                        </td>
                        <td className="p-3 whitespace-nowrap text-cream-300">
                          {o.paidAt ? fmtDateTime(o.paidAt) : '—'}
                        </td>
                        <td className="p-3 text-right">{fmtNumber(o.tickets)}</td>
                        <td className="p-3 text-right whitespace-nowrap">{fmtCurrency(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabela por campanha */}
      <div className="bg-surface-700 rounded-lg border border-muted-700 overflow-hidden">
        <div className="flex items-center justify-between gap-2 p-6 border-b border-muted-700 flex-wrap">
          <div className="flex items-center gap-2">
            <Megaphone className="text-accent-400" size={20} />
            <h2 className="text-cream-200 font-bold">Campanhas</h2>
          </div>
          {isFiltered ? (
            <span className="text-xs text-cream-400">
              Filtrado por: <span className="text-cream-200 font-medium">{selectedEvent?.title}</span>
            </span>
          ) : (
            <span className="text-xs text-accent-300">
              Mostrando todas as campanhas da conta (evento sem campanha vinculada)
            </span>
          )}
        </div>
        <p className="text-cream-400 text-xs px-6 pt-3">
          Compras e valores conforme atribuição do Meta (pixel + API de Conversões). Podem
          diferir levemente dos números do Resumo, que vêm direto do banco.
        </p>
        {campaigns.length === 0 ? (
          <p className="text-cream-400 text-sm p-6">Nenhuma campanha com entrega no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-800 text-cream-300 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Campanha</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Orçamento/dia</th>
                  <th className="text-right p-3">Investido</th>
                  <th className="text-right p-3">Impressões</th>
                  <th className="text-right p-3">Cliques</th>
                  <th className="text-right p-3">Compras</th>
                  <th className="text-right p-3">Custo/compra</th>
                  <th className="text-right p-3">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: CampaignRow) => {
                  const cRoas = c.spend > 0 ? c.purchaseValue / c.spend : 0;
                  const cCpa = c.purchases > 0 ? c.spend / c.purchases : 0;
                  return (
                    <tr key={c.id} className="border-t border-muted-700 text-cream-200">
                      <td className="p-3 max-w-xs">
                        <p className="truncate" title={c.name}>{c.name}</p>
                      </td>
                      <td className="p-3"><StatusBadge status={c.effectiveStatus} /></td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {c.dailyBudget !== null ? fmtCurrency(c.dailyBudget) : '—'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">{fmtCurrency(c.spend)}</td>
                      <td className="p-3 text-right">{fmtNumber(c.impressions)}</td>
                      <td className="p-3 text-right">{fmtNumber(c.clicks)}</td>
                      <td className="p-3 text-right">{fmtNumber(c.purchases)}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {c.purchases > 0 ? fmtCurrency(cCpa) : '—'}
                      </td>
                      <td className="p-3 text-right">
                        {c.spend > 0 && c.purchaseValue > 0 ? `${cRoas.toFixed(2)}x` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
