import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mpPaymentRefund } from '@/lib/mercadopago/client';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const orderId = params.id;

  // 1. Autenticacao (somente admin/producer podem reembolsar)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Nao autenticado' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'producer') {
    return NextResponse.json({ ok: false, message: 'Sem permissao' }, { status: 403 });
  }

  // 2. Motivo obrigatorio
  let body: { reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Dados invalidos' }, { status: 400 });
  }
  const reason = String(body.reason ?? '').trim();
  if (reason.length < 3) {
    return NextResponse.json(
      { ok: false, message: 'Informe o motivo do cancelamento (minimo 3 caracteres).' },
      { status: 400 },
    );
  }

  // 3. Busca o pedido
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, payment_status, payment_method, payment_gateway, payment_gateway_data, is_courtesy')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ ok: false, message: 'Pedido nao encontrado' }, { status: 404 });
  }

  // 4. Idempotencia: nunca reembolsar duas vezes
  if (order.payment_status === 'refunded' || order.payment_status === 'cancelled') {
    return NextResponse.json(
      { ok: false, message: `Pedido ja esta ${order.payment_status}.` },
      { status: 409 },
    );
  }
  if (order.payment_status !== 'approved') {
    return NextResponse.json(
      { ok: false, message: `So e possivel reembolsar pedidos aprovados (status atual: ${order.payment_status}).` },
      { status: 409 },
    );
  }

  // 5. Recupera o payment_id real do Mercado Pago (numero puro), nao o payment_gateway_id (preference)
  const gw = (order.payment_gateway_data ?? {}) as Record<string, unknown>;
  const paymentId = gw.payment_id ? String(gw.payment_id) : '';
  const isCourtesy = order.is_courtesy === true;
  const isOffline = order.payment_gateway === 'offline';
  const shouldRefund = Boolean(paymentId); // so estorna se houver pagamento de verdade no MP

  // Cortesia e venda offline nao tem o que estornar no MP: cancela so o QR + libera vaga.
  // (Na venda offline o dinheiro esta com o vendedor — devolucao do PIX e feita por fora.)
  // Mas se NAO for nenhum desses e faltar payment_id, bloqueia.
  if (!shouldRefund && !isCourtesy && !isOffline) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Este pedido nao tem payment_id do Mercado Pago e nao e cortesia. Cancele manualmente, sem estorno automatico.',
      },
      { status: 422 },
    );
  }

  // 6. Estorno TOTAL no Mercado Pago (somente quando ha pagamento real).
  //    OBS: chamada da lib mercadopago v2 (PaymentRefund). Sem 'amount' = reembolso integral.
  if (shouldRefund) {
    try {
      await mpPaymentRefund.create({
        payment_id: Number(paymentId),
        body: {},
      });
    } catch (err) {
      console.error('[reembolsar] erro no refund MP', err);
      return NextResponse.json(
        {
          ok: false,
          message:
            'Falha ao processar o estorno no Mercado Pago. O pedido NAO foi alterado. Verifique e tente de novo.',
        },
        { status: 502 },
      );
    }
  }

  // 7. So altera o banco DEPOIS do estorno ter dado certo (ou direto, no caso de cortesia).
  const nowIso = new Date().toISOString();
  // refund = teve estorno; cancelled = cortesia/sem pagamento (nada a devolver)
  const novoStatus = shouldRefund ? 'refunded' : 'cancelled';

  const { error: updOrderErr } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: novoStatus,
      cancelled_at: nowIso,
      cancellation_reason: reason,
      updated_at: nowIso,
    })
    .eq('id', orderId);

  // Anula os QRs E libera a vaga: status='cancelled' satisfaz check-in (!= 'valid') e batch_availability (!= 'cancelled')
  const { error: updItemsErr } = await supabaseAdmin
    .from('order_items')
    .update({ status: 'cancelled' })
    .eq('order_id', orderId);

  if (updOrderErr || updItemsErr) {
    // Estorno ja foi feito no MP, mas o banco falhou em parte. Avisa pra correcao manual.
    console.error('[reembolsar] estorno OK no MP mas erro ao atualizar banco', {
      updOrderErr,
      updItemsErr,
    });
    return NextResponse.json(
      {
        ok: false,
        message:
          'A operacao foi processada, mas houve erro ao atualizar o pedido no banco. Corrija manualmente e avise o suporte.',
      },
      { status: 500 },
    );
  }

  // 8. Log de auditoria (best-effort)
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: shouldRefund ? 'order_refunded' : 'courtesy_cancelled',
      actor_id: user.id,
      target_resource_type: 'order',
      target_resource_id: orderId,
      metadata: {
        order_number: order.order_number,
        payment_id: paymentId || null,
        is_courtesy: isCourtesy,
        reason,
      },
    });
  } catch {
    /* silencioso */
  }

  return NextResponse.json({
    ok: true,
    message: shouldRefund
      ? `Pedido #${order.order_number} cancelado e reembolsado.`
      : `Cortesia #${order.order_number} cancelada.`,
  });
}
