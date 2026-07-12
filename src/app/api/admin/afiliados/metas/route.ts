import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';

export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  // Auth central do painel (admin da organização ou superadmin)
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const user = auth.ctx.user;

  // Payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
  }

  // Validacoes
  const event_id = String(body.event_id ?? '').trim();
  const title = body.title ? String(body.title).trim() : null;
  const week_start = String(body.week_start ?? '').trim();
  const week_end = String(body.week_end ?? '').trim();
  const target_tickets = Number(body.target_tickets);
  const reward = body.reward ? String(body.reward).trim() : null;

  if (!event_id) return NextResponse.json({ error: 'Evento obrigatorio' }, { status: 400 });
  if (!DATE_RE.test(week_start)) return NextResponse.json({ error: 'Data de inicio invalida' }, { status: 400 });
  if (!DATE_RE.test(week_end)) return NextResponse.json({ error: 'Data de fim invalida' }, { status: 400 });
  if (week_end < week_start) return NextResponse.json({ error: 'Fim deve ser igual ou depois do inicio' }, { status: 400 });
  if (!Number.isInteger(target_tickets) || target_tickets < 1) {
    return NextResponse.json({ error: 'Meta de ingressos invalida (minimo 1)' }, { status: 400 });
  }

  // Escopo: o evento precisa pertencer a uma organização do usuário
  const eventInScope = await assertEventInScope(auth.ctx, event_id);
  if (!eventInScope) {
    return NextResponse.json({ error: 'Evento nao encontrado' }, { status: 404 });
  }

  // Semanas nao podem se sobrepor: o progresso e a "meta da semana atual"
  // ficariam ambiguos no painel do embaixador
  const { data: overlapping } = await supabaseAdmin
    .from('affiliate_weekly_goals')
    .select('id, week_start, week_end')
    .eq('event_id', event_id)
    .lte('week_start', week_end)
    .gte('week_end', week_start)
    .limit(1);
  if (overlapping && overlapping.length > 0) {
    return NextResponse.json({
      error: `Ja existe uma meta cobrindo esse periodo (${overlapping[0].week_start} a ${overlapping[0].week_end}).`,
    }, { status: 400 });
  }

  // Insert
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('affiliate_weekly_goals')
    .insert({ event_id, title, week_start, week_end, target_tickets, reward })
    .select('id')
    .single();

  if (insertError) {
    console.error('[afiliados/metas] insert error', insertError);
    return NextResponse.json({ error: 'Erro ao criar meta: ' + insertError.message }, { status: 500 });
  }

  // Log auditoria (best-effort)
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'affiliate_goal_created',
      actor_id: user.id,
      target_resource_type: 'affiliate_weekly_goal',
      target_resource_id: inserted.id,
      metadata: { event_id, week_start, week_end, target_tickets, title },
    });
  } catch { /* silencioso */ }

  revalidatePath('/admin/afiliados/metas');
  return NextResponse.json({ ok: true, id: inserted.id });
}
