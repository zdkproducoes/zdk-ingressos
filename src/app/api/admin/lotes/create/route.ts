import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSelectedEvent } from '@/lib/admin/selected-event';

export const runtime = 'nodejs';

const VALID_STATUSES = ['active', 'paused', 'scheduled', 'ended', 'sold_out'];

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const allowed = profile?.role === 'admin' || profile?.role === 'producer';
  if (!allowed) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 403 });
  }

  // Payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
  }

  // Validacoes
  const event_id = String(body.event_id ?? '').trim();
  const name = String(body.name ?? '').trim();
  const description = body.description ? String(body.description).trim() : null;
  const price = Number(body.price);
  const quantity = Number(body.quantity);
  const sort_order = Number(body.sort_order ?? 0);
  const status = String(body.status ?? 'active');
  const is_visible = body.is_visible !== false;
  const min_per_order = Number(body.min_per_order ?? 1);
  const max_per_order = Number(body.max_per_order ?? 10);
  const starts_at = body.starts_at || null;
  const ends_at = body.ends_at || null;

  if (!event_id) return NextResponse.json({ error: 'Evento obrigatorio' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 });
  if (isNaN(price) || price < 0) return NextResponse.json({ error: 'Preco invalido' }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 1) return NextResponse.json({ error: 'Quantidade invalida' }, { status: 400 });
  if (!Number.isInteger(min_per_order) || min_per_order < 1) return NextResponse.json({ error: 'Min por pedido invalido' }, { status: 400 });
  if (!Number.isInteger(max_per_order) || max_per_order < min_per_order) return NextResponse.json({ error: 'Max por pedido deve ser >= Min' }, { status: 400 });
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Status invalido' }, { status: 400 });

  // Trava: lote novo SO nasce no evento que esta sendo gerenciado no painel
  // (cookie de selecao). Evita criar lote no evento errado — ex.: dropdown
  // antigo que vinha pre-selecionado na edicao passada.
  const selectedEvent = await getSelectedEvent();
  if (!selectedEvent) {
    return NextResponse.json({ error: 'Nenhum evento selecionado no painel' }, { status: 400 });
  }
  if (event_id !== selectedEvent.id) {
    return NextResponse.json(
      { error: `Lotes so podem ser criados no evento selecionado no painel (${selectedEvent.title}). Troque a selecao de evento e tente de novo.` },
      { status: 400 }
    );
  }

  // Insert
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('ticket_batches')
    .insert({
      event_id,
      name,
      description,
      price,
      quantity,
      sort_order,
      status,
      is_visible,
      min_per_order,
      max_per_order,
      starts_at,
      ends_at,
    })
    .select('id, name')
    .single();

  if (insertError) {
    console.error('[lotes/create] insert error', insertError);
    return NextResponse.json({ error: 'Erro ao criar lote: ' + insertError.message }, { status: 500 });
  }

  // Log auditoria (best-effort)
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'ticket_batch_created',
      actor_id: user.id,
      target_resource_type: 'ticket_batch',
      target_resource_id: inserted.id,
      metadata: { name: inserted.name, event_id, price, quantity },
    });
  } catch { /* silencioso */ }

  revalidatePath('/admin/lotes');
  return NextResponse.json({ ok: true, id: inserted.id });
}
