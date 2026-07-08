import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
 
export const runtime = 'nodejs';
 
export async function POST(req: NextRequest) {
  // 1. Autenticacao
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ kind: 'error', message: 'Nao autenticado' }, { status: 401 });
  }
 
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();
 
  const allowed = profile?.role === 'admin' || profile?.role === 'producer' || profile?.role === 'checkin';
  if (!allowed) {
    return NextResponse.json({ kind: 'error', message: 'Sem permissao' }, { status: 403 });
  }
 
  // 2. Validacao do payload
  let body: { qr_code_token?: string; event_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ kind: 'error', message: 'Dados invalidos' }, { status: 400 });
  }
 
  const token = String(body.qr_code_token ?? '').trim();
  const eventId = String(body.event_id ?? '').trim();
 
  if (!token || !eventId) {
    return NextResponse.json({ kind: 'error', message: 'Token ou evento ausente' }, { status: 400 });
  }
 
  // 3. Busca o ingresso (com join no pedido para validar evento + status do pagamento)
  const { data: item } = await supabaseAdmin
    .from('order_items')
    .select(`
      id,
      status,
      attendee_name,
      checked_in_at,
      checked_in_by,
      orders!inner ( id, order_number, event_id, payment_status, events ( title ) ),
      ticket_batches ( name )
    `)
    .eq('qr_code_token', token)
    .maybeSingle();
 
  if (!item) {
    return NextResponse.json({ kind: 'not_found' });
  }
 
  const order = Array.isArray(item.orders) ? item.orders[0] : (item.orders as any);
  const batch = Array.isArray(item.ticket_batches) ? item.ticket_batches[0] : (item.ticket_batches as any);
  const eventRel = order?.events ? (Array.isArray(order.events) ? order.events[0] : order.events) : null;
 
  // 4. Validacoes de negocio
  if (order.event_id !== eventId) {
    return NextResponse.json({
      kind: 'wrong_event',
      expectedEvent: eventRel?.title || 'outro evento',
    });
  }
 
  if (order.payment_status !== 'approved') {
    return NextResponse.json({
      kind: 'invalid_status',
      status: `pedido com status ${order.payment_status}`,
    });
  }
 
  if (item.status !== 'valid') {
    return NextResponse.json({
      kind: 'invalid_status',
      status: item.status,
    });
  }
 
  const attendeeName = item.attendee_name || 'Convidado';
  const batchName = batch?.name || 'Ingresso';
  const orderNumber = order.order_number;
 
  // 5. Ja validado?
  if (item.checked_in_at) {
    let checkedInByName = '';
    if (item.checked_in_by) {
      const { data: validator } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', item.checked_in_by)
        .maybeSingle();
      checkedInByName = validator?.full_name || validator?.email || '';
    }
    return NextResponse.json({
      kind: 'already',
      attendeeName,
      batchName,
      orderNumber,
      checkedInAt: item.checked_in_at,
      checkedInBy: checkedInByName,
    });
  }
 
  // 6. Faz o check-in (UPDATE condicional pra prevenir race condition)
  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('order_items')
    .update({
      checked_in_at: nowIso,
      checked_in_by: user.id,
    })
    .eq('id', item.id)
    .is('checked_in_at', null)
    .select('id')
    .maybeSingle();
 
  if (updateError) {
    console.error('[checkin/validate] update error', updateError);
    return NextResponse.json({ kind: 'error', message: 'Erro ao salvar check-in' }, { status: 500 });
  }
 
  // Se updated for null, alguem validou no meio do caminho - retorna "already"
  if (!updated) {
    const { data: refetch } = await supabaseAdmin
      .from('order_items')
      .select('checked_in_at, checked_in_by')
      .eq('id', item.id)
      .maybeSingle();
    let checkedInByName = '';
    if (refetch?.checked_in_by) {
      const { data: validator } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', refetch.checked_in_by)
        .maybeSingle();
      checkedInByName = validator?.full_name || validator?.email || '';
    }
    return NextResponse.json({
      kind: 'already',
      attendeeName,
      batchName,
      orderNumber,
      checkedInAt: refetch?.checked_in_at || nowIso,
      checkedInBy: checkedInByName,
    });
  }
 
  // 7. Log de auditoria (best-effort, nao bloqueia)
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'checkin_validated',
      actor_id: user.id,
      target_resource_type: 'order_item',
      target_resource_id: item.id,
      metadata: {
        order_number: orderNumber,
        attendee_name: attendeeName,
        event_id: eventId,
      },
    });
  } catch { /* silencioso */ }
 
  return NextResponse.json({
    kind: 'success',
    attendeeName,
    batchName,
    orderNumber,
  });
}