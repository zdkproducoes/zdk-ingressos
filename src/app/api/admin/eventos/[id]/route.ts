// app/api/admin/eventos/[id]/route.ts
// Muda o status de um evento (ciclo: draft -> active -> finished).
// 'finished' = arquivado: sai do ar (página pública e checkout só aceitam 'active'),
// mas todos os dados (pedidos, compradores, lotes) continuam no banco.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';
import { parseContentFields, type ContentFormFields } from '@/lib/admin/event-content';

const ALLOWED_STATUS = ['draft', 'active', 'finished'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  let body: { action?: unknown; status?: unknown } & ContentFormFields;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  // Escopo: o evento precisa pertencer a uma organização do usuário
  const existing = await assertEventInScope(auth.ctx, id);
  if (!existing) {
    return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
  }

  if (body.action === 'set_status') {
    const newStatus = typeof body.status === 'string' ? body.status : '';
    if (!ALLOWED_STATUS.includes(newStatus as (typeof ALLOWED_STATUS)[number])) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'active' && existing.status !== 'active'
          ? { published_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    revalidatePath('/admin/eventos');
    revalidatePath('/');
    return NextResponse.json({ ok: true, status: newStatus });
  }

  // Atualiza o conteúdo da página pública do evento
  if (body.action === 'update_content') {
    const parsed = parseContentFields(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({ ...parsed.columns, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    revalidatePath('/admin/eventos');
    revalidatePath(`/evento/${existing.slug}`);
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}
