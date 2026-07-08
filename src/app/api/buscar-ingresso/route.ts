import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getClientIp } from '@/lib/turnstile/ratelimit';

export const runtime = 'nodejs';

// Rate limit próprio: 5 tentativas / 15 minutos (janela menor que o helper padrão de 60 min)
async function checkRateLimit15(identifier: string, max: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  supabaseAdmin.from('rate_limits').delete().lt('window_start', windowStart).then();

  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('id, count')
    .eq('identifier', identifier)
    .gte('window_start', windowStart)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return true;
  if (!data) {
    await supabaseAdmin.from('rate_limits').insert({ identifier, count: 1 });
    return true;
  }
  if (data.count >= max) return false;
  await supabaseAdmin.from('rate_limits').update({ count: data.count + 1 }).eq('id', data.id);
  return true;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const allowed = await checkRateLimit15(`buscar:${ip}`, 5);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
      { status: 429 }
    );
  }

  let body: { cpf?: string; order_number?: string | number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 }); }

  const cleanCPF = String(body.cpf ?? '').replace(/\D/g, '');
  const orderNum = parseInt(String(body.order_number ?? ''), 10);

  if (cleanCPF.length !== 11 || isNaN(orderNum) || orderNum < 1) {
    return NextResponse.json(
      { error: 'Preencha o CPF e o número do pedido corretamente.' },
      { status: 400 }
    );
  }

  const { data: raw } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, payment_status,
      profiles!orders_customer_id_fkey ( cpf, first_name ),
      events ( title, slug, event_date, event_time, venue_name, venue_address ),
      order_items ( attendee_name, qr_code_token, qr_code_url, owner_id, ticket_batches ( name ) )
    `)
    .eq('order_number', orderNum)
    .eq('payment_status', 'approved')
    .maybeSingle();

  const order = raw as any;
  const found = order !== null && order.profiles?.cpf === cleanCPF;

  const cpfMasked = cleanCPF.slice(0, 3) + '.*****.' + cleanCPF.slice(9, 11);
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'public_ticket_search',
      actor_id: null,
      target_resource_type: 'order',
      target_resource_id: String(orderNum),
      ip,
      user_agent: req.headers.get('user-agent'),
      metadata: { cpf_masked: cpfMasked, found },
    });
  } catch { /* silencioso */ }

  if (!found) {
    return NextResponse.json(
      { error: 'Pedido não encontrado. Confira os dados informados.' },
      { status: 404 }
    );
  }

  // Ingressos transferidos (owner_id preenchido) ficam de fora: o QR novo
  // pertence a quem recebeu, não pode voltar pro comprador original.
  const items = ((order.order_items as any[]) ?? [])
    .filter((it: any) => !it.owner_id)
    .map((it: any) => ({
      qr_code_url: it.qr_code_url as string | null,
      attendee_name: (it.attendee_name || order.profiles?.first_name || 'Convidado') as string,
      batch_name: (it.ticket_batches?.name || 'Ingresso') as string,
    }));

  return NextResponse.json({
    ok: true,
    data: {
      order_number: order.order_number,
      event: order.events,
      items,
    },
  });
}
