// src/lib/meta/insights.ts
// Le campanhas e metricas da Marketing API do Meta (Graph API) para a aba Campanhas do admin.
// Exige um token com permissao ads_read (o token da CAPI NAO serve — ele so envia eventos).
// Roda somente no servidor.

const GRAPH_VERSION = 'v21.0';

export const META_ADS_MANAGER_URL = () =>
  `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId()}`;

function adAccountId(): string {
  return process.env.META_ADS_ACCOUNT_ID || '1779584973842';
}

export type CampaignRow = {
  id: string;
  name: string;
  effectiveStatus: string;
  dailyBudget: number | null; // em reais (a Graph API devolve em centavos)
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
};

export type InsightsResult =
  | { ok: true; campaigns: CampaignRow[] }
  | { ok: false; reason: 'no_token' | 'api_error'; message?: string };

type GraphAction = { action_type: string; value: string };

// O Meta reporta a mesma compra sob varios action_types (pixel, omni, consolidado).
// omni_purchase e o consolidado; usamos ele e caimos para os outros se ausente.
const PURCHASE_TYPES = ['omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'purchase'];

function pickPurchase(actions: GraphAction[] | undefined): number {
  if (!actions) return 0;
  for (const type of PURCHASE_TYPES) {
    const hit = actions.find((a) => a.action_type === type);
    if (hit) return Number(hit.value) || 0;
  }
  return 0;
}

async function graphGet(path: string, params: Record<string, string>, token: string) {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}?${qs}`, {
    // Metricas de anuncio nao precisam ser em tempo real; 5 min de cache alivia a Graph API.
    next: { revalidate: 300 },
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Graph API respondeu ${res.status}`);
  }
  return json;
}

// date_preset da Graph API para o periodo pedido na URL (?periodo=)
export const PERIOD_PRESETS: Record<string, { preset: string; label: string }> = {
  hoje: { preset: 'today', label: 'Hoje' },
  ontem: { preset: 'yesterday', label: 'Ontem' },
  '7d': { preset: 'last_7d', label: '7 dias' },
  '14d': { preset: 'last_14d', label: '14 dias' },
  '30d': { preset: 'last_30d', label: '30 dias' },
  total: { preset: 'maximum', label: 'Total' },
};

// allowedCampaignIds: se informado e nao-vazio, mostra APENAS essas campanhas
// (vinculo evento<->campanha em meta_campaigns). Se vazio/undefined, cai no
// comportamento antigo (todas as campanhas ativas ou recentes da conta).
export async function getCampaignInsights(
  periodKey: string,
  allowedCampaignIds?: string[],
): Promise<InsightsResult> {
  const token = process.env.META_ADS_TOKEN;
  if (!token) return { ok: false, reason: 'no_token' };

  const allowSet = allowedCampaignIds && allowedCampaignIds.length > 0
    ? new Set(allowedCampaignIds)
    : null;

  const preset = (PERIOD_PRESETS[periodKey] ?? PERIOD_PRESETS['7d']).preset;

  try {
    const [campaignsRes, insightsRes] = await Promise.all([
      graphGet(`act_${adAccountId()}/campaigns`, {
        fields: 'id,name,effective_status,daily_budget,created_time',
        limit: '100',
      }, token),
      graphGet(`act_${adAccountId()}/insights`, {
        level: 'campaign',
        date_preset: preset,
        fields: 'campaign_id,spend,impressions,clicks,actions,action_values',
        limit: '100',
      }, token),
    ]);

    type InsightRow = {
      campaign_id: string;
      spend?: string;
      impressions?: string;
      clicks?: string;
      actions?: GraphAction[];
      action_values?: GraphAction[];
    };
    const insightsByCampaign = new Map<string, InsightRow>();
    for (const row of (insightsRes.data ?? []) as InsightRow[]) {
      insightsByCampaign.set(row.campaign_id, row);
    }

    // A conta e compartilhada com outras campanhas do BM; mostramos as que tiveram
    // entrega no periodo ou que estao ativas/pausadas recentemente (ultimos 90 dias).
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const campaigns: CampaignRow[] = [];
    for (const c of campaignsRes.data ?? []) {
      // Com vinculo definido, mostra so as campanhas do evento selecionado
      if (allowSet && !allowSet.has(c.id)) continue;
      const ins = insightsByCampaign.get(c.id);
      const recent = c.created_time ? new Date(c.created_time).getTime() >= cutoff : false;
      // O filtro "recente/ativa" so vale no modo fallback (sem vinculo); com
      // vinculo, mostramos a campanha do evento mesmo que esteja pausada/antiga.
      if (!allowSet && !ins && c.effective_status !== 'ACTIVE' && !recent) continue;
      campaigns.push({
        id: c.id,
        name: c.name,
        effectiveStatus: c.effective_status,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        spend: Number(ins?.spend ?? 0),
        impressions: Number(ins?.impressions ?? 0),
        clicks: Number(ins?.clicks ?? 0),
        purchases: pickPurchase(ins?.actions),
        purchaseValue: pickPurchase(ins?.action_values),
      });
    }

    // Ativas primeiro, depois por investimento
    campaigns.sort((a, b) => {
      const aActive = a.effectiveStatus === 'ACTIVE' ? 0 : 1;
      const bActive = b.effectiveStatus === 'ACTIVE' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return b.spend - a.spend;
    });

    return { ok: true, campaigns };
  } catch (err) {
    return { ok: false, reason: 'api_error', message: err instanceof Error ? err.message : String(err) };
  }
}

// -------- listagem simples de TODAS as campanhas (para o gerenciador de vinculos) --------
export type SimpleCampaign = { id: string; name: string; effectiveStatus: string };
export type ListCampaignsResult =
  | { ok: true; campaigns: SimpleCampaign[] }
  | { ok: false; reason: 'no_token' | 'api_error'; message?: string };

export async function listAllCampaigns(): Promise<ListCampaignsResult> {
  const token = process.env.META_ADS_TOKEN;
  if (!token) return { ok: false, reason: 'no_token' };
  try {
    const res = await graphGet(`act_${adAccountId()}/campaigns`, {
      fields: 'id,name,effective_status,created_time',
      limit: '200',
    }, token);
    type Row = { id: string; name: string; effective_status: string; created_time?: string };
    const campaigns: SimpleCampaign[] = ((res.data ?? []) as Row[])
      .map((c) => ({ id: c.id, name: c.name, effectiveStatus: c.effective_status }))
      .sort((a, b) => {
        const aActive = a.effectiveStatus === 'ACTIVE' ? 0 : 1;
        const bActive = b.effectiveStatus === 'ACTIVE' ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    return { ok: true, campaigns };
  } catch (err) {
    return { ok: false, reason: 'api_error', message: err instanceof Error ? err.message : String(err) };
  }
}
