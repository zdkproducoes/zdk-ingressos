import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

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

// Cria ou atualiza a meta do evento (a "grande meta" — 1 por evento)
export async function POST(req: NextRequest) {
  const { user, response } = await requireAdmin();
  if (!user) return response!;

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

  const { data: eventExists } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('id', event_id)
    .maybeSingle();
  if (!eventExists) {
    return NextResponse.json({ error: 'Evento nao encontrado' }, { status: 400 });
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
  const { user, response } = await requireAdmin();
  if (!user) return response!;

  const event_id = req.nextUrl.searchParams.get('event_id')?.trim() ?? '';
  if (!event_id) return NextResponse.json({ error: 'Evento obrigatorio' }, { status: 400 });

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
