// app/api/admin/venda-offline/route.ts
// PDV: registra uma venda feita presencialmente (pagamento recebido via PIX
// na mao do vendedor). O pedido nasce APROVADO e entra em todos os paineis
// como uma venda normal (payment_method 'pix'); o que o diferencia e:
//   - payment_gateway = 'offline'
//   - payment_gateway_data = { offline: true, sold_by, sold_by_name, ... }
//   - registro em audit_logs (action 'offline_sale')
// A entrega (QR + e-mail) reusa fulfillOrder — com sendCapi: false para nao
// sujar a atribuicao dos anuncios do Meta.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fulfillOrder } from '@/lib/checkout/fulfillment';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';

export const runtime = 'nodejs';

const MAX_PER_SALE = 10;

// GET ?eventId= → lista as vendas offline do evento (relatório detalhado)
export async function GET(req: NextRequest) {
  const auth = await requirePanelApi({ minOrgRole: 'staff' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const eventId = url.searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'eventId é obrigatório' }, { status: 400 });

  // Escopo: o evento precisa pertencer a uma organização do usuário
  if (!(await assertEventInScope(auth.ctx, eventId))) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, total, paid_at, created_at, payment_status, payment_gateway_data,
      profiles!orders_customer_id_fkey ( first_name, last_name, email ),
      order_items ( id, ticket_batches ( name ) )
    `)
    .eq('event_id', eventId)
    .eq('payment_gateway', 'offline')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[venda-offline GET]', error);
    return NextResponse.json({ error: 'Erro ao listar vendas offline' }, { status: 500 });
  }

  const sales = (data ?? []).map((o: any) => {
    const buyer = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    const gwd = o.payment_gateway_data || {};
    const batchNames = Array.from(
      new Set((o.order_items ?? []).map((it: any) => {
        const b = Array.isArray(it.ticket_batches) ? it.ticket_batches[0] : it.ticket_batches;
        return b?.name || 'Ingresso';
      })),
    );
    return {
      order_id: o.id,
      order_number: o.order_number,
      total: Number(o.total ?? 0),
      paid_at: o.paid_at ?? o.created_at,
      payment_status: o.payment_status,
      buyer_name: buyer ? `${buyer.first_name ?? ''} ${buyer.last_name ?? ''}`.trim() : '—',
      buyer_email: buyer?.email ?? null,
      seller_name: gwd.sold_by_name ?? '—',
      tickets: (o.order_items ?? []).length,
      batch_names: batchNames,
    };
  });

  return NextResponse.json({ sales });
}

// POST → registra a venda offline
export async function POST(req: NextRequest) {
  const auth = await requirePanelApi({ minOrgRole: 'staff' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const { eventId, customerProfileId, batchId, quantity } = body as {
    eventId?: string;
    customerProfileId?: string;
    batchId?: string;
    quantity?: number;
  };

  if (!eventId || !customerProfileId || !batchId) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }

  const qty = Number.isFinite(quantity) ? Math.floor(Number(quantity)) : 1;
  if (qty < 1 || qty > MAX_PER_SALE) {
    return NextResponse.json(
      { error: `Quantidade deve estar entre 1 e ${MAX_PER_SALE}` },
      { status: 400 },
    );
  }

  // 1. Evento (venda offline vale pra rascunho e ativo; arquivado não)
  //    + escopo: precisa pertencer a uma organização do usuário
  const event = await assertEventInScope(auth.ctx, eventId);
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
  if (event.status === 'finished') {
    return NextResponse.json({ error: 'Evento arquivado não aceita novas vendas.' }, { status: 400 });
  }

  // 2. Comprador (precisa ter conta — o ingresso vai por e-mail e aparece em Minhas compras)
  const { data: buyer } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, email, cpf')
    .eq('id', customerProfileId)
    .single();
  if (!buyer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  if (!buyer.email) return NextResponse.json({ error: 'Cliente sem e-mail cadastrado' }, { status: 400 });

  // 3. Lote + estoque
  const { data: batch } = await supabaseAdmin
    .from('ticket_batches')
    .select('id, event_id, name, price, quantity, sold_count')
    .eq('id', batchId)
    .eq('event_id', eventId)
    .single();
  if (!batch) return NextResponse.json({ error: 'Lote não encontrado neste evento' }, { status: 404 });
  if (batch.sold_count + qty > batch.quantity) {
    return NextResponse.json(
      { error: `Estoque insuficiente no lote "${batch.name}" (disponível: ${batch.quantity - batch.sold_count})` },
      { status: 400 },
    );
  }

  const unitPrice = Number(batch.price);
  const total = Number((unitPrice * qty).toFixed(2));
  const sellerName = `${auth.ctx.profile.first_name ?? ''} ${auth.ctx.profile.last_name ?? ''}`.trim();

  // 4. Cria o pedido já aprovado (dinheiro entrou via PIX na hora)
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      event_id: eventId,
      customer_id: buyer.id,
      subtotal: total,
      service_fee: 0,
      discount: 0,
      total,
      payment_status: 'approved',
      payment_method: 'pix',
      payment_gateway: 'offline',
      paid_at: new Date().toISOString(),
      payment_gateway_data: {
        offline: true,
        sold_by: auth.ctx.user.id,
        sold_by_name: sellerName,
        sold_by_email: auth.ctx.profile.email ?? null,
        batch_name: batch.name,
      },
    })
    .select('id, order_number')
    .single();
  if (orderErr || !order) {
    console.error('[venda-offline POST] orderErr', orderErr);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }

  // 5. Itens (1 por ingresso)
  const attendeeName = `${buyer.first_name ?? ''} ${buyer.last_name ?? ''}`.trim() || 'Convidado';
  const itemsToInsert = Array.from({ length: qty }, () => ({
    order_id: order.id,
    ticket_batch_id: batch.id,
    attendee_name: attendeeName,
    attendee_cpf: buyer.cpf || null,
    unit_price: unitPrice,
    status: 'valid',
  }));
  const { error: itemErr } = await supabaseAdmin.from('order_items').insert(itemsToInsert);
  if (itemErr) {
    console.error('[venda-offline POST] itemErr', itemErr);
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'Erro ao criar ingressos' }, { status: 500 });
  }

  // 6. Auditoria — quem vendeu, pra quem, quanto, quando
  const { error: auditErr } = await supabaseAdmin.from('audit_logs').insert({
    action: 'offline_sale',
    actor_id: auth.ctx.user.id,
    target_resource_type: 'order',
    target_resource_id: order.id,
    metadata: {
      order_number: order.order_number,
      event_id: eventId,
      batch_name: batch.name,
      quantity: qty,
      total,
      buyer_email: buyer.email,
      seller_name: sellerName,
    },
  });
  if (auditErr) console.error('[venda-offline] audit', auditErr);

  // 7. Entrega: QR + e-mail + estoque (sem CAPI — venda não veio de anúncio)
  try {
    await fulfillOrder(order.id, { incrementStock: true, sendCapi: false });
  } catch (err) {
    console.error('[venda-offline POST] fulfill', err);
    return NextResponse.json({
      ok: true,
      warning: 'Venda registrada, mas a entrega do e-mail falhou — o robô de reconciliação vai retentar em até 1h (ou reenvie pelo painel Pedidos).',
      orderId: order.id,
      orderNumber: order.order_number,
    });
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
    message: `Venda registrada! Pedido #${order.order_number} — ${qty} ingresso${qty > 1 ? 's' : ''} enviado${qty > 1 ? 's' : ''} para ${buyer.email}.`,
  });
}
