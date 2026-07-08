// api/tickets/transfer/route.ts
// Transferência de ingresso entre contas.
// Regras:
//   - Só o COMPRADOR do pedido transfere (ingresso recebido não re-transfere).
//   - Só 1 transferência por ingresso (transferred_at preenchido = travado;
//     reforçado por UPDATE condicional + UNIQUE em ticket_transfers).
//   - Quem recebe PRECISA já ter conta (busca por e-mail em profiles).
//   - O QR antigo é cancelado: o token é substituído por um novo, então o
//     validador de check-in passa a responder "não encontrado" pro antigo.
//   - Bloqueia: pedido não aprovado, item usado/cancelado, check-in feito,
//     evento já realizado, transferir pra si mesmo.

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resend, EMAIL_FROM } from '@/lib/email/resend';
import { renderTicketTransferEmail } from '@/emails/ticket-transfer';
import { checkRateLimit } from '@/lib/turnstile/ratelimit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // 1. Autenticação
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // 2. Rate limit: 10 transferências/hora por usuário
  const allowed = await checkRateLimit(`transfer:${user.id}`, 10);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas transferências em pouco tempo. Tente novamente mais tarde.' },
      { status: 429 }
    );
  }

  // 3. Payload
  let body: { order_item_id?: string; recipient_email?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }

  const orderItemId = String(body.order_item_id ?? '').trim();
  const recipientEmail = String(body.recipient_email ?? '').trim().toLowerCase();

  if (!orderItemId || !recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
    return NextResponse.json({ error: 'Informe o ingresso e um e-mail válido.' }, { status: 400 });
  }

  // 4. Carrega o ingresso + pedido + evento
  const { data: rawItem } = await supabaseAdmin
    .from('order_items')
    .select(`
      id, status, attendee_name, qr_code_token, qr_code_url, owner_id, transferred_at, checked_in_at,
      orders!inner (
        id, order_number, customer_id, payment_status,
        events ( id, title, slug, event_date, event_time, venue_name, venue_address )
      ),
      ticket_batches ( name )
    `)
    .eq('id', orderItemId)
    .maybeSingle();

  const item = rawItem as any;
  if (!item) {
    return NextResponse.json({ error: 'Ingresso não encontrado.' }, { status: 404 });
  }

  const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
  const ev = order?.events ? (Array.isArray(order.events) ? order.events[0] : order.events) : null;
  const batch = Array.isArray(item.ticket_batches) ? item.ticket_batches[0] : item.ticket_batches;

  // 5. Validações de negócio (ordem importa: mensagens mais específicas primeiro)
  if (item.owner_id === user.id) {
    return NextResponse.json(
      { error: 'Ingressos recebidos por transferência não podem ser transferidos novamente.' },
      { status: 400 }
    );
  }
  if (order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Este ingresso não pertence a você.' }, { status: 403 });
  }
  if (order.payment_status !== 'approved') {
    return NextResponse.json({ error: 'Só ingressos de pedidos aprovados podem ser transferidos.' }, { status: 400 });
  }
  if (item.transferred_at) {
    return NextResponse.json({ error: 'Este ingresso já foi transferido uma vez e não pode ser transferido de novo.' }, { status: 400 });
  }
  if (item.checked_in_at) {
    return NextResponse.json({ error: 'Este ingresso já fez check-in no evento.' }, { status: 400 });
  }
  if (item.status !== 'valid') {
    return NextResponse.json({ error: 'Este ingresso não está mais válido.' }, { status: 400 });
  }
  if (ev?.event_date) {
    const isPast = new Date(ev.event_date + 'T00:00:00') < new Date(new Date().toDateString());
    if (isPast) {
      return NextResponse.json({ error: 'Este evento já foi realizado.' }, { status: 400 });
    }
  }

  // 6. Destinatário: precisa já ter conta
  const { data: recipient } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, full_name, email')
    .ilike('email', recipientEmail)
    .limit(1)
    .maybeSingle();

  if (!recipient) {
    return NextResponse.json(
      { error: 'Não encontramos uma conta com esse e-mail. Peça para a pessoa se cadastrar em sacode.cantorcaiolacerda.com.br primeiro.' },
      { status: 404 }
    );
  }
  if (recipient.id === user.id) {
    return NextResponse.json({ error: 'Você não pode transferir um ingresso para você mesmo.' }, { status: 400 });
  }

  const recipientName = (recipient.full_name
    || `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
    || recipient.email) as string;

  // 7. Gera o QR NOVO (mesmo padrão do fulfillment)
  const oldToken = item.qr_code_token as string | null;
  const oldUrl = item.qr_code_url as string | null;
  const newToken = `SCD-${randomBytes(12).toString('hex').toUpperCase()}`;
  const qrBuffer = await QRCode.toBuffer(newToken, { width: 400, margin: 1, errorCorrectionLevel: 'M' });
  const qrBytes = new Uint8Array(qrBuffer);
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const filename = `${yyyy}/${mm}/${dd}/${randomUUID()}.png`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from('qr-codes')
    .upload(filename, qrBytes, { contentType: 'image/png', upsert: false });
  if (uploadError) {
    console.error('[tickets/transfer] QR upload', uploadError);
    return NextResponse.json({ error: 'Erro ao gerar o novo QR Code. Tente novamente.' }, { status: 500 });
  }
  const { data: pub } = supabaseAdmin.storage.from('qr-codes').getPublicUrl(filename);
  const newUrl = pub.publicUrl;

  // 8. Troca de dono + cancelamento do QR antigo — UPDATE condicional:
  //    só passa se o ingresso AINDA não foi transferido e o token não mudou
  //    (previne duplo clique / duas sessões ao mesmo tempo).
  const nowIso = new Date().toISOString();
  let updateQuery = supabaseAdmin
    .from('order_items')
    .update({
      owner_id: recipient.id,
      attendee_name: recipientName,
      qr_code_token: newToken,
      qr_code_url: newUrl,
      transferred_at: nowIso,
    })
    .eq('id', item.id)
    .is('transferred_at', null);
  updateQuery = oldToken ? updateQuery.eq('qr_code_token', oldToken) : updateQuery.is('qr_code_token', null);
  const { data: updated, error: updateError } = await updateQuery.select('id').maybeSingle();

  if (updateError || !updated) {
    // Não travou a linha: outra transferência passou na frente. Limpa o PNG órfão.
    await supabaseAdmin.storage.from('qr-codes').remove([filename]).catch(() => {});
    if (updateError) console.error('[tickets/transfer] update', updateError);
    return NextResponse.json(
      { error: 'Não foi possível transferir — o ingresso já foi transferido ou alterado. Recarregue a página.' },
      { status: 409 }
    );
  }

  // 9. Auditoria (o UNIQUE em order_item_id é a segunda trava da regra "1x só")
  const { error: transferLogError } = await supabaseAdmin.from('ticket_transfers').insert({
    order_item_id: item.id,
    from_user_id: user.id,
    to_user_id: recipient.id,
    old_qr_token: oldToken || '',
    new_qr_token: newToken,
  });
  if (transferLogError) console.error('[tickets/transfer] ticket_transfers insert', transferLogError);

  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'ticket_transferred',
      actor_id: user.id,
      target_resource_type: 'order_item',
      target_resource_id: item.id,
      metadata: {
        order_number: order.order_number,
        to_user_id: recipient.id,
        to_email: recipientEmail,
        old_qr_token: oldToken,
        new_qr_token: newToken,
      },
    });
  } catch { /* silencioso */ }

  // 10. Apaga o PNG do QR antigo do storage (best-effort; o token já morreu no banco)
  if (oldUrl) {
    const oldPath = oldUrl.split('/qr-codes/')[1];
    if (oldPath) await supabaseAdmin.storage.from('qr-codes').remove([oldPath]).catch(() => {});
  }

  // 11. E-mail pro recebedor com o QR novo (best-effort: se falhar, o
  //     ingresso já está na conta dele em /minhas-compras)
  try {
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, full_name')
      .eq('id', user.id)
      .maybeSingle();
    const senderName = senderProfile?.full_name || senderProfile?.first_name || 'Um amigo';

    if (ev && recipient.email) {
      const eventDate = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      });
      await resend.emails.send({
        from: EMAIL_FROM,
        to: recipient.email,
        subject: `Você recebeu um ingresso para ${ev.title}`,
        html: renderTicketTransferEmail({
          recipientFirstName: recipient.first_name || 'Cliente',
          senderName,
          eventTitle: ev.title,
          eventDate,
          eventTime: (ev.event_time || '').slice(0, 5),
          venueName: ev.venue_name,
          venueAddress: ev.venue_address,
          batchName: batch?.name || 'Ingresso',
          attendeeName: recipientName,
          qrCodeUrl: newUrl,
          qrToken: newToken,
        }),
      });
    }
  } catch (err) {
    console.error('[tickets/transfer] email', err);
  }

  return NextResponse.json({ ok: true, recipient_name: recipientName });
}
