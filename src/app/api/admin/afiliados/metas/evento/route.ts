import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';

export const runtime = 'nodejs';

// Cria ou atualiza a meta do evento (a "grande meta" — 1 por evento)
export async function POST(req: NextRequest) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const user = auth.ctx.user;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
  }

  const event_id = String(body.event_id ?? '').trim();
  const target_tickets = Number(body.target_tickets);
  const reward = body.reward ? String(body.reward).trim() : null;

  if (!event_id) return NextResponse.json({ error: 'Evento obrigatorio' }, { status: 400 });
  if (!Number.isInteger(target_tickets) || target_tickets < 1) {
    return NextResponse.json({ error: 'Meta de ingressos invalida (minimo 1)' }, { status: 400 });
  }

  // Escopo: o evento precisa pertencer a uma organização do usuário
  const eventInScope = await assertEventInScope(auth.ctx, event_id);
  if (!eventInScope) {
    return NextResponse.json({ error: 'Evento nao encontrado' }, { status: 404 });
  }

  const { data: saved, error: upsertError } = await supabaseAdmin
    .from('affiliate_event_goals')
    .upsert({ event_id, target_tickets, reward }, { onConflict: 'event_id' })
    .select('id')
    .single();

  if (upsertError) {
    console.error('[afiliados/metas/evento] upsert error', upsertError);
    return NextResponse.json({ error: 'Erro ao salvar meta do evento: ' + upsertError.message }, { status: 500 });
  }

  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'affiliate_event_goal_saved',
      actor_id: user.id,
      target_resource_type: 'affiliate_event_goal',
      target_resource_id: saved.id,
      metadata: { event_id, target_tickets, reward },
    });
  } catch { /* silencioso */ }

  revalidatePath('/admin/afiliados/metas');
  return NextResponse.json({ ok: true, id: saved.id });
}

// Remove a meta do evento (?event_id=...)
export async function DELETE(req: NextRequest) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const user = auth.ctx.user;

  const event_id = req.nextUrl.searchParams.get('event_id')?.trim() ?? '';
  if (!event_id) return NextResponse.json({ error: 'Evento obrigatorio' }, { status: 400 });

  // Escopo: só remove meta de evento das organizações do usuário
  if (!(await assertEventInScope(auth.ctx, event_id))) {
    return NextResponse.json({ error: 'Evento nao encontrado' }, { status: 404 });
  }

  const { error: deleteError } = await supabaseAdmin
    .from('affiliate_event_goals')
    .delete()
    .eq('event_id', event_id);

  if (deleteError) {
    console.error('[afiliados/metas/evento] delete error', deleteError);
    return NextResponse.json({ error: 'Erro ao remover: ' + deleteError.message }, { status: 500 });
  }

  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'affiliate_event_goal_deleted',
      actor_id: user.id,
      target_resource_type: 'affiliate_event_goal',
      target_resource_id: event_id,
      metadata: { event_id },
    });
  } catch { /* silencioso */ }

  revalidatePath('/admin/afiliados/metas');
  return NextResponse.json({ ok: true });
}
