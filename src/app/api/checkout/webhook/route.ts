// app/api/checkout/webhook/route.ts
// Recebe notificacoes do Mercado Pago e dispara a entrega do pedido.
// A geracao de QR + envio de e-mail foi extraida para src/lib/checkout/fulfillment.ts
// (compartilhada com o robo de reconciliacao).
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mpPayment } from '@/lib/mercadopago/client';
import { fulfillOrder } from '@/lib/checkout/fulfillment';

export const runtime = 'nodejs';

function validateSignature(req: NextRequest, paymentId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[MP webhook] MP_WEBHOOK_SECRET not set');
    return false;
  }

  const signatureHeader = req.headers.get('x-signature');
  const requestId = req.headers.get('x-request-id');
  if (!signatureHeader || !requestId) {
    console.warn('[MP webhook] missing signature headers');
    return false;
  }

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.trim().split('=').map((s) => s.trim()))
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) {
    console.warn('[MP webhook] malformed signature header');
    return false;
  }

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  if (expected !== v1) {
    console.warn('[MP webhook] signature mismatch');
    return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = body?.type || body?.topic;
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('data.id') || url.searchParams.get('id') || body?.data?.id || body?.id;

    console.log('[MP webhook] received', { paymentId, type, live_mode: body?.live_mode });

    if (type !== 'payment' || !paymentId) return NextResponse.json({ ok: true });

      // Detecta formato da notificacao:
      // - Webhook v2: query string tem o parametro data.id e exige HMAC
      // - IPN legacy: query string tem topic=payment, sem HMAC, valida via mpPayment.get
      const dataIdKey = 'data' + '.' + 'id';
      const hasDataId = url.searchParams.get(dataIdKey);
      const isLegacyIpn = !hasDataId && url.searchParams.get('topic') === 'payment';

      if (!isLegacyIpn) {
        // Formato v2 — exige HMAC
        if (!validateSignature(req, String(paymentId))) {
          return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 });
        }
      }

    let payment: any;
    try {
      payment = await mpPayment.get({ id: String(paymentId) });
    } catch (err) {
      // Falha transitoria ao consultar o pagamento no MP (blip de rede, etc).
      // Respondemos 500 para o MP RE-TENTAR a notificacao — nesse ponto o pedido
      // ainda nao foi tocado, entao a retentativa roda do zero sem efeito colateral.
      console.error('[MP webhook] mpPayment.get falhou', err);
      return NextResponse.json({ ok: false, error: 'mp get failed' }, { status: 500 });
    }

    const orderId = payment.external_reference;
    if (!orderId) return NextResponse.json({ ok: true });

    const statusMap: Record<string, string> = {
      approved: 'approved', pending: 'pending', in_process: 'in_process', authorized: 'in_process',
      rejected: 'rejected', cancelled: 'cancelled', refunded: 'refunded', charged_back: 'refunded',
    };
    const newStatus = statusMap[payment.status || ''] || 'pending';

    const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single();
    if (!order) return NextResponse.json({ ok: true });
    if (order.payment_status === 'approved' && newStatus === 'approved') return NextResponse.json({ ok: true });

    const gatewayData = {
      ...(order.payment_gateway_data || {}),
      payment_id: payment.id, status: payment.status, status_detail: payment.status_detail,
    };
    const paymentMethod = payment.payment_method_id === 'pix'
      ? 'pix'
      : (payment.payment_type_id === 'credit_card' ? 'credit_card' : order.payment_method);

    if (newStatus === 'approved') {
      // Transicao ATOMICA pending->approved: o MP manda a notificacao em 2 formatos
      // (webhook v2 + IPN legado) e repete, e as chamadas rodam em paralelo. O UPDATE
      // condicional garante que so UMA vire o status; so ela chama a entrega. Sem
      // isso, chamadas concorrentes enviavam e-mail/QR e contavam estoque em dobro.
      const { data: claimed } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'approved',
          payment_method: paymentMethod,
          payment_gateway_data: gatewayData,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .neq('payment_status', 'approved')
        .select('id');
      if (claimed && claimed.length > 0) {
        await fulfillOrder(orderId, { incrementStock: true });
      }
      return NextResponse.json({ ok: true });
    }

    // Demais status (pending, in_process, cancelled, rejected, refunded)
    const updates: any = {
      payment_status: newStatus,
      payment_method: paymentMethod,
      payment_gateway_data: gatewayData,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'cancelled' || newStatus === 'rejected') {
      updates.cancelled_at = new Date().toISOString();
      updates.cancellation_reason = payment.status_detail;
    }
    await supabaseAdmin.from('orders').update(updates).eq('id', orderId);
    // Pagamento nao vai acontecer: devolve a reserva de estoque (idempotente)
    if (newStatus === 'cancelled' || newStatus === 'rejected') {
      await supabaseAdmin.rpc('release_order_reservation', { p_order_id: orderId });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Catch geral intencionalmente responde ok:true: se a entrega falhar no meio,
    // o pedido fica approved com tickets_emailed_at null e o robo de reconciliacao
    // (Passo 2) reenvia em ate 1h. Evita retentativas inuteis do MP que esbarrariam
    // na trava de "ja aprovado".
    console.error('webhook', err);
    return NextResponse.json({ ok: true });
  }
}

// Permite GET pra healthcheck do MP (eles testam com GET)
export async function GET() {
  return NextResponse.json({ ok: true, service: 'zdk-webhook' });
}
