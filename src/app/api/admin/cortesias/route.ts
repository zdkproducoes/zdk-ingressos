// app/api/admin/cortesias/route.ts
// Lista e emite cortesias (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope, getScopedEventIds } from '@/lib/auth/scope';
import { resend } from '@/lib/email/resend';
import { renderTicketEmail } from '@/emails/ticket';
import { platform } from '@/lib/config';
import { orgPublicName, emailFromFor, type OrgForBrand } from '@/lib/brand';

export const runtime = 'nodejs';

const COURTESY_BATCH_NAME = 'Cortesia';
const MAX_PER_REQUEST = 10;

// GET → lista cortesias já emitidas
export async function GET(req: NextRequest) {
  const auth = await requirePanelApi({ minOrgRole: 'staff' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const eventId = url.searchParams.get('eventId');

  // Escopo: sem eventId, filtra pela lista de eventos das orgs do usuário
  const scopedIds = await getScopedEventIds(auth.ctx);
  if (eventId && !(await assertEventInScope(auth.ctx, eventId))) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
  }

  let query = supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, created_at, courtesy_issued_by,
      events ( title ),
      profiles!orders_customer_id_fkey ( first_name, last_name, email ),
      issuer:profiles!orders_courtesy_issued_by_fkey ( first_name, last_name ),
      order_items ( id, attendee_name, ticket_batches ( name ) )
    `)
    .eq('is_courtesy', true)
    .order('created_at', { ascending: false })
    .limit(100);

  if (eventId) query = query.eq('event_id', eventId);
  else if (scopedIds !== null) query = query.in('event_id', scopedIds);

  const { data, error } = await query;
  if (error) {
    console.error('[cortesias GET]', error);
    return NextResponse.json({ error: 'Erro ao listar cortesias' }, { status: 500 });
  }

  return NextResponse.json({ cortesias: data || [] });
}

// POST → emite uma cortesia (com 1 ou mais ingressos)
export async function POST(req: NextRequest) {
  const auth = await requirePanelApi({ minOrgRole: 'staff' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const { eventId, guestProfileId, attendeeName, quantity } = body as {
    eventId?: string;
    guestProfileId?: string;
    attendeeName?: string;
    quantity?: number;
  };

  if (!eventId || !guestProfileId) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
  }

  // Valida quantidade
  const qty = Number.isFinite(quantity) ? Math.floor(Number(quantity)) : 1;
  if (qty < 1 || qty > MAX_PER_REQUEST) {
    return NextResponse.json(
      { error: `Quantidade deve estar entre 1 e ${MAX_PER_REQUEST}` },
      { status: 400 }
    );
  }

  // 1. Validar evento (existência + escopo da organização)
  if (!(await assertEventInScope(auth.ctx, eventId))) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
  }
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title, slug, event_date, event_time, venue_name, venue_address, status, organizations ( name, brand )')
    .eq('id', eventId)
    .single();
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });

  // 2. Validar convidado
  const { data: guest } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, email, cpf')
    .eq('id', guestProfileId)
    .single();
  if (!guest) return NextResponse.json({ error: 'Convidado não encontrado' }, { status: 404 });
  if (!guest.email) return NextResponse.json({ error: 'Convidado sem e-mail cadastrado' }, { status: 400 });

  // 3. Buscar lote "Cortesia" do evento
  const { data: batch } = await supabaseAdmin
    .from('ticket_batches')
    .select('*')
    .eq('event_id', eventId)
    .eq('name', COURTESY_BATCH_NAME)
    .single();
  if (!batch) {
    return NextResponse.json({ error: 'Lote de cortesia não configurado para este evento' }, { status: 500 });
  }
  if (batch.sold_count + qty > batch.quantity) {
    return NextResponse.json(
      { error: `Limite de cortesias insuficiente (disponível: ${batch.quantity - batch.sold_count})` },
      { status: 400 }
    );
  }

  // 4. Criar order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      event_id: eventId,
      customer_id: guest.id,
      subtotal: 0,
      service_fee: 0,
      discount: 0,
      total: 0,
      payment_status: 'approved',
      payment_method: 'courtesy',
      payment_gateway: 'courtesy',
      paid_at: new Date().toISOString(),
      is_courtesy: true,
      courtesy_issued_by: auth.ctx.user.id,
    })
    .select()
    .single();
  if (orderErr || !order) {
    console.error('[cortesias POST] orderErr', orderErr);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }

  // 5. Criar N order_items (1 por ingresso)
  const finalAttendeeName = (attendeeName || `${guest.first_name} ${guest.last_name}`.trim()).slice(0, 200);

  const itemsToInsert = Array.from({ length: qty }, () => ({
    order_id: order.id,
    ticket_batch_id: batch.id,
    attendee_name: finalAttendeeName,
    attendee_cpf: guest.cpf || null,
    unit_price: 0,
    status: 'valid',
    is_courtesy: true,
  }));

  const { data: items, error: itemErr } = await supabaseAdmin
    .from('order_items')
    .insert(itemsToInsert)
    .select();
  if (itemErr || !items || items.length !== qty) {
    console.error('[cortesias POST] itemErr', itemErr);
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'Erro ao criar ingressos' }, { status: 500 });
  }

  // 6. Gerar QR Code pra cada item, fazer upload e atualizar
  const ticketsForEmail: Array<{
    batchName: string;
    attendeeName: string;
    qrCodeUrl: string;
    qrToken: string;
  }> = [];
  const uploadedFilenames: string[] = [];

  try {
    for (const item of items) {
      const qrToken = `${platform.qrPrefix}${randomBytes(12).toString('hex').toUpperCase()}`;
      const qrBuffer = await QRCode.toBuffer(qrToken, { width: 400, margin: 1, errorCorrectionLevel: 'M' });
      const qrBytes = new Uint8Array(qrBuffer);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const filename = `${yyyy}/${mm}/${dd}/${randomUUID()}.png`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from('qr-codes')
        .upload(filename, qrBytes, { contentType: 'image/png', upsert: false });
      if (uploadErr) throw new Error(`QR upload failed: ${uploadErr.message}`);
      uploadedFilenames.push(filename);

      const { data: pub } = supabaseAdmin.storage.from('qr-codes').getPublicUrl(filename);
      const qrUrl = pub.publicUrl;

      const { error: updateErr } = await supabaseAdmin
        .from('order_items')
        .update({ qr_code_token: qrToken, qr_code_url: qrUrl })
        .eq('id', item.id);
      if (updateErr) throw updateErr;

      ticketsForEmail.push({
        batchName: COURTESY_BATCH_NAME,
        attendeeName: finalAttendeeName,
        qrCodeUrl: qrUrl,
        qrToken,
      });
    }
  } catch (err) {
    console.error('[cortesias POST] QR error', err);
    // rollback completo: deleta storage uploads, items e order
    if (uploadedFilenames.length > 0) {
      await supabaseAdmin.storage.from('qr-codes').remove(uploadedFilenames).catch(() => {});
    }
    await supabaseAdmin.from('order_items').delete().eq('order_id', order.id);
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: 'Erro ao gerar QR Codes' }, { status: 500 });
  }

  // 7. Incrementar sold_count do lote cortesia (qty de uma vez)
  await supabaseAdmin.rpc('increment_batch_sold', { p_batch_id: batch.id, p_qty: qty });

  // 8. Enviar e-mail único com todos os ingressos
  try {
    const eventDate = new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
    const subjectSuffix = qty === 1 ? 'uma cortesia' : `${qty} cortesias`;
    const org = (Array.isArray(event.organizations) ? event.organizations[0] : event.organizations) as OrgForBrand;
    await resend.emails.send({
      from: emailFromFor(org),
      to: guest.email,
      subject: `🎁 Você recebeu ${subjectSuffix} para ${event.title}`,
      html: renderTicketEmail({
        firstName: guest.first_name || 'Convidado',
        eventTitle: event.title,
        eventDate,
        eventTime: (event.event_time || '').slice(0, 5),
        venueName: event.venue_name,
        venueAddress: event.venue_address,
        orderNumber: order.order_number,
        tickets: ticketsForEmail,
        organizerName: orgPublicName(org),
      }),
    });
  } catch (err) {
    console.error('[cortesias POST] email error', err);
    return NextResponse.json({
      ok: true,
      warning: `${qty} ingresso${qty > 1 ? 's gerados' : ' gerado'}, mas houve erro no envio do e-mail. Reenvie manualmente.`,
      orderId: order.id,
      quantity: qty,
    });
  }

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    quantity: qty,
    message: qty === 1
      ? `Cortesia enviada para ${guest.email}`
      : `${qty} cortesias enviadas para ${guest.email} em um único e-mail`,
  });
}
