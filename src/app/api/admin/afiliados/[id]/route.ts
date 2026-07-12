// app/api/admin/afiliados/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';
 
const CODE_REGEX = /^[a-z0-9-]+$/;
 
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
 
  const { id } = await params;
 
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }
 
  const action = body.action;
 
  // Confere se o afiliado existe
  const { data: existing } = await supabaseAdmin
    .from('affiliates')
    .select('id, event_id, code')
    .eq('id', id)
    .maybeSingle();
  if (!existing || !(await assertEventInScope(auth.ctx, existing.event_id))) {
    return NextResponse.json({ error: 'Afiliado não encontrado.' }, { status: 404 });
  }
 
  // -------- ACTION: update --------
  if (action === 'update') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
    const email = body.email === null ? null : typeof body.email === 'string' ? body.email.trim() || null : null;
    const phone = body.phone === null ? null : typeof body.phone === 'string' ? body.phone.trim() || null : null;
    const commission = Number(body.commission_percent);
    const notes = body.notes === null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : null;
    const isStaff = Boolean(body.is_staff);
 
    if (!name) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    if (!code) return NextResponse.json({ error: 'Code é obrigatório.' }, { status: 400 });
    if (!CODE_REGEX.test(code)) {
      return NextResponse.json(
        { error: 'Code deve conter apenas letras minúsculas, números e hífen.' },
        { status: 400 },
      );
    }
    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
      return NextResponse.json({ error: 'Comissão deve estar entre 0 e 100.' }, { status: 400 });
    }
 
    // Se o code mudou, confere duplicidade no mesmo evento
    if (code !== existing.code) {
      const { data: dup } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('event_id', existing.event_id)
        .eq('code', code)
        .neq('id', id)
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          { error: `Já existe outro afiliado com o code "${code}" neste evento.` },
          { status: 409 },
        );
      }
    }
 
    const { error: updateError } = await supabaseAdmin
      .from('affiliates')
      .update({ name, code, email, phone, commission_percent: commission, notes, is_staff: isStaff })
      .eq('id', id);
 
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    revalidatePath('/admin/afiliados');
    revalidatePath(`/admin/afiliados/${id}`);
    return NextResponse.json({ ok: true });
  }
 
  // -------- ACTION: toggle_active --------
  if (action === 'toggle_active') {
    const newStatus = Boolean(body.is_active);
    const { error: updateError } = await supabaseAdmin
      .from('affiliates')
      .update({ is_active: newStatus })
      .eq('id', id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    revalidatePath('/admin/afiliados');
    revalidatePath(`/admin/afiliados/${id}`);
    return NextResponse.json({ ok: true, is_active: newStatus });
  }
 
  // -------- ACTION: regenerate_token --------
  if (action === 'regenerate_token') {
    // 48 chars hex (mesmo padrão do default do banco via pgcrypto)
    const newToken = randomBytes(24).toString('hex');
    const { error: updateError } = await supabaseAdmin
      .from('affiliates')
      .update({ panel_token: newToken })
      .eq('id', id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, panel_token: newToken });
  }
 
  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}