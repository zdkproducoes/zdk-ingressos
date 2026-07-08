import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Nao autenticado' }, { status: 401 }) };
  }
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const allowed = profile?.role === 'admin' || profile?.role === 'producer';
  if (!allowed) {
    return { user: null, response: NextResponse.json({ error: 'Sem permissao' }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { user, response } = await requireAdmin();
  if (!user) return response!;

  // Verifica que a meta existe
  const { data: goal } = await supabaseAdmin
    .from('affiliate_weekly_goals')
    .select('id, event_id')
    .eq('id', id)
    .maybeSingle();
  if (!goal) {
    return NextResponse.json({ error: 'Meta nao encontrada' }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
  }

  const title = body.title ? String(body.title).trim() : null;
  const week_start = String(body.week_start ?? '').trim();
  const week_end = String(body.week_end ?? '').trim();
  const target_tickets = Number(body.target_tickets);
  const reward = body.reward ? String(body.reward).trim() : null;

  if (!DATE_RE.test(week_start)) return NextResponse.json({ error: 'Data de inicio invalida' }, { status: 400 });
  if (!DATE_RE.test(week_end)) return NextResponse.json({ error: 'Data de fim invalida' }, { status: 400 });
  if (week_end < week_start) return NextResponse.json({ error: 'Fim deve ser igual ou depois do inicio' }, { status: 400 });
  if (!Number.isInteger(target_tickets) || target_tickets < 1) {
    return NextResponse.json({ error: 'Meta de ingressos invalida (minimo 1)' }, { status: 400 });
  }

  // Semanas nao podem se sobrepor (excluindo a propria meta sendo editada)
  const { data: overlapping } = await supabaseAdmin
    .from('affiliate_weekly_goals')
    .select('id, week_start, week_end')
    .eq('event_id', goal.event_id)
    .neq('id', id)
    .lte('week_start', week_end)
    .gte('week_end', week_start)
    .limit(1);
  if (overlapping && overlapping.length > 0) {
    return NextResponse.json({
      error: `Ja existe outra meta cobrindo esse periodo (${overlapping[0].week_start} a ${overlapping[0].week_end}).`,
    }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('affiliate_weekly_goals')
    .update({ title, week_start, week_end, target_tickets, reward })
    .eq('id', id);

  if (updateError) {
    console.error('[afiliados/metas/update] error', updateError);
    return NextResponse.json({ error: 'Erro ao atualizar: ' + updateError.message }, { status: 500 });
  }

  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'affiliate_goal_updated',
      actor_id: user.id,
      target_resource_type: 'affiliate_weekly_goal',
      target_resource_id: id,
      metadata: { week_start, week_end, target_tickets, title },
    });
  } catch { /* silencioso */ }

  revalidatePath('/admin/afiliados/metas');
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { user, response } = await requireAdmin();
  if (!user) return response!;

  const { data: goal } = await supabaseAdmin
    .from('affiliate_weekly_goals')
    .select('id, event_id, week_start, week_end')
    .eq('id', id)
    .maybeSingle();
  if (!goal) {
    return NextResponse.json({ error: 'Meta nao encontrada' }, { status: 404 });
  }

  const { error: deleteError } = await supabaseAdmin
    .from('affiliate_weekly_goals')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[afiliados/metas/delete] error', deleteError);
    return NextResponse.json({ error: 'Erro ao excluir: ' + deleteError.message }, { status: 500 });
  }

  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'affiliate_goal_deleted',
      actor_id: user.id,
      target_resource_type: 'affiliate_weekly_goal',
      target_resource_id: id,
      metadata: { event_id: goal.event_id, week_start: goal.week_start, week_end: goal.week_end },
    });
  } catch { /* silencioso */ }

  revalidatePath('/admin/afiliados/metas');
  return NextResponse.json({ ok: true });
}
