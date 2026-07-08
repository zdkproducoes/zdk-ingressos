// app/api/admin/eventos/[id]/route.ts
// Muda o status de um evento (ciclo: draft -> active -> finished).
// 'finished' = arquivado: sai do ar (página pública e checkout só aceitam 'active'),
// mas todos os dados (pedidos, compradores, lotes) continuam no banco.
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const ALLOWED_STATUS = ['draft', 'active', 'finished'] as const;

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado.', status: 401 as const };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'producer') {
    return { error: 'Sem permissão.', status: 403 as const };
  }
  return { ok: true as const };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  let body: { action?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('events')
    .select('id, status, title')
    .eq('id', id)
    .maybeSingle();
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

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}
