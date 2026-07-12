import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';

export const runtime = 'nodejs';

const VALID_STATUSES = ['active', 'paused', 'scheduled', 'ended', 'sold_out'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auth central do painel (admin da organização ou superadmin)
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { ctx } = auth;
  const user = ctx.user;

  // Verifica que o lote existe E pertence a um evento no escopo do usuário
  const { data: batch } = await supabaseAdmin
    .from('ticket_batches')
    .select('id, name, status, event_id')
    .eq('id', id)
    .maybeSingle();
  if (!batch || !(await assertEventInScope(ctx, batch.event_id))) {
    return NextResponse.json({ error: 'Lote nao encontrado' }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
  }

  const action = String(body.action ?? '');

  // -------- ACTION: toggle_status --------
  if (action === 'toggle_status') {
    const newStatus = batch.status === 'active' ? 'paused' : 'active';
    const { error: updateError } = await supabaseAdmin
      .from('ticket_batches')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      return NextResponse.json({ error: 'Erro ao alterar status: ' + updateError.message }, { status: 500 });
    }

    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'ticket_batch_toggle_status',
        actor_id: user.id,
        target_resource_type: 'ticket_batch',
        target_resource_id: id,
        metadata: { from: batch.status, to: newStatus, name: batch.name },
      });
    } catch { /* silencioso */ }

    revalidatePath('/admin/lotes');
    return NextResponse.json({ ok: true, status: newStatus });
  }

  // -------- ACTION: update --------
  if (action === 'update') {
    // event_id do body e IGNORADO de proposito: lote nao muda de evento
    // (moveria ingressos ja vendidos junto).
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

    if (!name) return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 });
    if (isNaN(price) || price < 0) return NextResponse.json({ error: 'Preco invalido' }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 1) return NextResponse.json({ error: 'Quantidade invalida' }, { status: 400 });
    if (!Number.isInteger(min_per_order) || min_per_order < 1) return NextResponse.json({ error: 'Min por pedido invalido' }, { status: 400 });
    if (!Number.isInteger(max_per_order) || max_per_order < min_per_order) return NextResponse.json({ error: 'Max por pedido deve ser >= Min' }, { status: 400 });
    if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Status invalido' }, { status: 400 });

    // ----- Validacao critica: nao permitir reduzir quantidade abaixo do JA vendido -----
    // Conta itens REAIS do lote (aprovados, incluindo cortesias - todos contam pra capacidade)
    const { count: realIssued } = await supabaseAdmin
      .from('order_items')
      .select('id, orders!inner(payment_status)', { count: 'exact', head: true })
      .eq('ticket_batch_id', id)
      .eq('orders.payment_status', 'approved');
    const realIssuedNum = realIssued ?? 0;

    if (quantity < realIssuedNum) {
      return NextResponse.json({
        error: `Quantidade nao pode ser menor que ${realIssuedNum} (ja vendidos/emitidos). Reduza para no minimo ${realIssuedNum}.`,
      }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('ticket_batches')
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('[lotes/update] error', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar: ' + updateError.message }, { status: 500 });
    }

    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'ticket_batch_updated',
        actor_id: user.id,
        target_resource_type: 'ticket_batch',
        target_resource_id: id,
        metadata: { name, price, quantity, status },
      });
    } catch { /* silencioso */ }

    revalidatePath('/admin/lotes');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action desconhecida' }, { status: 400 });
}
