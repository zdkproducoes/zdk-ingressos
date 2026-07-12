// app/api/admin/meta-campaigns/route.ts
// Gerencia o vinculo entre campanhas do Meta Ads e o evento selecionado no admin.
// GET  -> lista todas as campanhas da conta + marca quais estao vinculadas ao evento
// POST -> alterna um vinculo { campaignId, linked }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSelectedEvent } from '@/lib/admin/selected-event';
import { listAllCampaigns } from '@/lib/meta/insights';
import { requirePanelApi } from '@/lib/auth/panel';

export const runtime = 'nodejs';

// GET → { eventTitle, campaigns: [{ id, name, effectiveStatus, linked }] }
export async function GET() {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // getSelectedEvent(ctx) já garante que o evento está no escopo do usuário
  const selectedEvent = await getSelectedEvent(auth.ctx);
  if (!selectedEvent) {
    return NextResponse.json({ error: 'Nenhum evento selecionado' }, { status: 400 });
  }

  const list = await listAllCampaigns();
  if (!list.ok) {
    return NextResponse.json(
      { error: list.reason === 'no_token' ? 'Token do Meta não configurado' : (list.message ?? 'Erro na API do Meta') },
      { status: list.reason === 'no_token' ? 400 : 502 },
    );
  }

  const { data: links } = await supabaseAdmin
    .from('meta_campaigns')
    .select('campaign_id')
    .eq('event_id', selectedEvent.id);
  const linkedSet = new Set((links ?? []).map((l) => l.campaign_id));

  return NextResponse.json({
    eventTitle: selectedEvent.title,
    campaigns: list.campaigns.map((c) => ({ ...c, linked: linkedSet.has(c.id) })),
  });
}

// POST → { campaignId: string, linked: boolean }
export async function POST(req: NextRequest) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // getSelectedEvent(ctx) já garante que o evento está no escopo do usuário
  const selectedEvent = await getSelectedEvent(auth.ctx);
  if (!selectedEvent) {
    return NextResponse.json({ error: 'Nenhum evento selecionado' }, { status: 400 });
  }

  let body: { campaignId?: unknown; linked?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : '';
  const linked = body.linked === true;
  if (!campaignId || !/^\d+$/.test(campaignId)) {
    return NextResponse.json({ error: 'campaignId inválido' }, { status: 400 });
  }

  if (linked) {
    // vincula (idempotente): ignora se ja existir
    const { error } = await supabaseAdmin
      .from('meta_campaigns')
      .upsert({ campaign_id: campaignId, event_id: selectedEvent.id }, { onConflict: 'campaign_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from('meta_campaigns')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('event_id', selectedEvent.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campaignId, linked });
}
