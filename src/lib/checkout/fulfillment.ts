// lib/checkout/fulfillment.ts
// Entrega de um pedido APROVADO: gera os QRs (se faltarem) e envia o e-mail
// com os ingressos (uma unica vez). Usada pelo webhook do Mercado Pago e pelo
// robo de reconciliacao (cron). Foi extraida do antigo onApproved do webhook.
//
// IDEMPOTENCIA (pode ser chamada varias vezes sem efeito colateral):
//   - QR: so gera para itens que ainda nao tem qr_code_token.
//   - E-mail: so envia se orders.tickets_emailed_at for null; carimba a data
//     apos enviar com sucesso.
//   - Meta CAPI (Purchase): disparado no mesmo bloco do e-mail, logo apos o
//     carimbo tickets_emailed_at -> 1x por pedido (webhook OU robo). Nunca
//     lanca excecao (o helper trata os erros internamente).
//   - Estoque/cupom (increment_batch_sold / increment_coupon_usage): NAO sao
//     idempotentes, entao so rodam quando o chamador passa { incrementStock: true }.
//     O chamador deve passar true APENAS na transicao real para "approved".

import { randomBytes, randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resend, EMAIL_FROM } from '@/lib/email/resend';
import { renderTicketEmail } from '@/emails/ticket';
import { sendPurchaseEvent } from '@/lib/meta/capi';

type FulfillOptions = {
  incrementStock: boolean;
  // Venda offline (PDV) nao dispara Purchase no Meta: a compra nao veio de
  // anuncio e sujaria a atribuicao da campanha. Default true (fluxo online).
  sendCapi?: boolean;
};
type FulfillResult = { ok: boolean; reason?: string };

export async function fulfillOrder(
  orderId: string,
  opts: FulfillOptions = { incrementStock: false },
): Promise<FulfillResult> {
  const { data: order } = await supabaseAdmin.from('orders').select(`
    *, events ( id, title, slug, event_date, event_time, venue_name, venue_address ),
    profiles!orders_customer_id_fkey ( first_name, email, phone )
  `).eq('id', orderId).single();
  if (!order) return { ok: false, reason: 'order-not-found' };

  const { data: items } = await supabaseAdmin.from('order_items')
    .select('*, ticket_batches ( name )').eq('order_id', orderId);
  if (!items?.length) return { ok: false, reason: 'no-items' };

  // Estoque + cupom: SO na transicao real para approved (chamador passa true).
  // Roda ANTES da geracao de QR: se o upload de QR falhar no meio, o estoque
  // ja foi contado e a reserva devolvida — o robo repara a entrega depois.
  const batchCounts = new Map<string, number>();
  for (const it of items) {
    batchCounts.set(it.ticket_batch_id, (batchCounts.get(it.ticket_batch_id) || 0) + 1);
  }
  if (opts.incrementStock) {
    const entries = Array.from(batchCounts.entries());
    for (const [batchId, qty] of entries) {
      await supabaseAdmin.rpc('increment_batch_sold', { p_batch_id: batchId, p_qty: qty });
    }
    if (order.coupon_id) await supabaseAdmin.rpc('increment_coupon_usage', { p_coupon_id: order.coupon_id });
  }
  // Converte a reserva do checkout em venda (idempotente: so age se o pedido
  // ainda segura reserva; depois do increment pra nunca abrir vaga fantasma).
  // Fora do if: tambem cura reservas orfas em passadas de reparo do robo.
  await supabaseAdmin.rpc('release_order_reservation', { p_order_id: orderId });

  const ticketsForEmail: Array<{ batchName: string; attendeeName: string; qrCodeUrl: string; qrToken: string }> = [];

  for (const it of items) {
    let token = it.qr_code_token;
    let qrUrl = it.qr_code_url;
    if (!token) {
      token = `SCD-${randomBytes(12).toString('hex').toUpperCase()}`;
      const qrBuffer = await QRCode.toBuffer(token, { width: 400, margin: 1, errorCorrectionLevel: 'M' });
      const qrBytes = new Uint8Array(qrBuffer);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const filename = `${yyyy}/${mm}/${dd}/${randomUUID()}.png`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('qr-codes')
        .upload(filename, qrBytes, { contentType: 'image/png', upsert: false });
      if (uploadError) throw new Error(`QR upload failed: ${uploadError.message}`);
      const { data: pub } = supabaseAdmin.storage.from('qr-codes').getPublicUrl(filename);
      qrUrl = pub.publicUrl;
      try {
        const { error: updateError } = await supabaseAdmin
          .from('order_items')
          .update({ qr_code_token: token, qr_code_url: qrUrl })
          .eq('id', it.id);
        if (updateError) throw updateError;
      } catch (dbError) {
        await supabaseAdmin.storage.from('qr-codes').remove([filename]).catch(() => {});
        throw new Error(`Failed to save QR URL to database: ${dbError instanceof Error ? dbError.message : 'unknown'}`);
      }
    }
    // Item transferido (owner_id preenchido): o QR atual é de quem recebeu,
    // não entra no e-mail do comprador original.
    if (!it.owner_id) {
      ticketsForEmail.push({
        batchName: it.ticket_batches?.name || 'Ingresso',
        attendeeName: it.attendee_name || order.profiles?.first_name || 'Convidado',
        qrCodeUrl: qrUrl!, qrToken: token!,
      });
    }
  }

  // E-mail: uma unica vez. Carimba tickets_emailed_at so apos enviar com sucesso,
  // para que uma falha de envio seja re-tentada na proxima passada do robo.
  if (!order.tickets_emailed_at && ticketsForEmail.length === 0) {
    // Todos os ingressos foram transferidos antes do e-mail sair: nao ha nada
    // pra entregar ao comprador. Carimba pra o robo nao re-tentar pra sempre.
    await supabaseAdmin.from('orders')
      .update({ tickets_emailed_at: new Date().toISOString() })
      .eq('id', orderId);
  } else if (!order.tickets_emailed_at) {
    const ev = order.events;
    if (ev && order.profiles?.email) {
      const eventDate = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      });
      try {
        await resend.emails.send({
          from: EMAIL_FROM, to: order.profiles.email,
          subject: `Seus ingressos para ${ev.title}`,
          html: renderTicketEmail({
            firstName: order.profiles.first_name || 'Cliente',
            eventTitle: ev.title, eventDate, eventTime: (ev.event_time || '').slice(0, 5),
            venueName: ev.venue_name, venueAddress: ev.venue_address,
            orderNumber: order.order_number, tickets: ticketsForEmail,
          }),
        });
        await supabaseAdmin.from('orders')
          .update({ tickets_emailed_at: new Date().toISOString() })
          .eq('id', orderId);

        // Meta CAPI — Purchase server-side, junto com a entrega bem-sucedida.
        // Fica DENTRO do guard tickets_emailed_at => dispara 1x por pedido.
        // Nunca lanca excecao; no maximo loga e segue.
        if (opts.sendCapi !== false) await sendPurchaseEvent({
          orderId: order.id,
          value: Number(order.total) || 0,
          email: order.profiles.email,
          phone: order.profiles.phone,
          contentName: ev.title,
          eventSourceUrl: ev.slug
            ? `https://sacode.cantorcaiolacerda.com.br/evento/${ev.slug}`
            : undefined,
          // Capturados no checkout (sql/06_meta_atribuicao.sql) — sobem o EMQ.
          fbp: order.meta_fbp,
          fbc: order.meta_fbc,
          clientIp: order.client_ip,
          clientUserAgent: order.client_user_agent,
        });
      } catch (err) {
        console.error('ticket email', err);
      }
    }
  }

  return { ok: true };
}
