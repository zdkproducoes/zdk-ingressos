import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resend } from '@/lib/email/resend';
import { renderTicketEmail } from '@/emails/ticket';
import { requirePanelApi } from '@/lib/auth/panel';
import { orgPublicName, emailFromFor, type OrgForBrand } from '@/lib/brand';
import { assertEventInScope } from '@/lib/auth/scope';

export const runtime = 'nodejs';

type ItemRow = {
  attendee_name: string | null;
  qr_code_token: string | null;
  qr_code_url: string | null;
  owner_id: string | null;
  ticket_batches: { name: string } | null;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePanelApi({ minOrgRole: 'staff' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const user = auth.ctx.user;

  const orderId = params.id;

  const { data: rawOrder } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, payment_status, event_id,
      profiles!orders_customer_id_fkey ( first_name, email ),
      events ( title, event_date, event_time, venue_name, venue_address, organizations ( name, brand ) )
    `)
    .eq('id', orderId)
    .single();

  const order = rawOrder as any;
  // Escopo: o pedido precisa ser de um evento das organizações do usuário
  if (!order || !(await assertEventInScope(auth.ctx, order.event_id))) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }
  if (order.payment_status !== 'approved') {
    return NextResponse.json({ error: 'Pedido não está aprovado' }, { status: 400 });
  }

  const { data: rawItems } = await supabaseAdmin
    .from('order_items')
    .select('attendee_name, qr_code_token, qr_code_url, owner_id, ticket_batches ( name )')
    .eq('order_id', orderId);

  // Itens transferidos ficam de fora: o QR novo é de quem recebeu,
  // não pode ser reenviado pro comprador original.
  const items = ((rawItems as unknown as ItemRow[]) ?? []).filter(it => !it.owner_id);
  if (!items.length) {
    return NextResponse.json(
      { error: 'Sem itens no pedido (ou todos os ingressos foram transferidos)' },
      { status: 400 }
    );
  }

  const ev = order.events;
  const profile = order.profiles;
  if (!ev || !profile?.email) {
    return NextResponse.json({ error: 'Dados insuficientes para envio' }, { status: 400 });
  }

  const ticketsForEmail = items.map(it => ({
    batchName: it.ticket_batches?.name || 'Ingresso',
    attendeeName: it.attendee_name || profile.first_name || 'Convidado',
    qrCodeUrl: it.qr_code_url || '',
    qrToken: it.qr_code_token || '',
  }));

  const eventDate = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const userAgent = req.headers.get('user-agent');

  let emailSuccess = false;
  try {
    const org = (Array.isArray(ev.organizations) ? ev.organizations[0] : ev.organizations) as OrgForBrand;
    await resend.emails.send({
      from: emailFromFor(org),
      to: profile.email,
      subject: `[Reenvio] Seus ingressos para ${ev.title}`,
      html: renderTicketEmail({
        firstName: profile.first_name || 'Cliente',
        eventTitle: ev.title,
        eventDate,
        eventTime: (ev.event_time || '').slice(0, 5),
        venueName: ev.venue_name,
        venueAddress: ev.venue_address,
        orderNumber: order.order_number,
        tickets: ticketsForEmail,
        organizerName: orgPublicName(org),
      }),
    });
    emailSuccess = true;
  } catch (err) {
    console.error('resend email admin', err);
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'admin_resend_email',
        actor_id: user.id,
        target_resource_type: 'order',
        target_resource_id: orderId,
        ip,
        user_agent: userAgent,
        metadata: { sent_to: profile.email, success: false },
      });
    } catch { /* silencioso */ }
    return NextResponse.json({ error: 'Falha ao enviar e-mail' }, { status: 500 });
  }

  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'admin_resend_email',
      actor_id: user.id,
      target_resource_type: 'order',
      target_resource_id: orderId,
      ip,
      user_agent: userAgent,
      metadata: { sent_to: profile.email, success: emailSuccess },
    });
  } catch { /* silencioso */ }

  return NextResponse.json({ ok: true, sent_to: profile.email });
}
