// app/api/checkout/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mpPreference } from '@/lib/mercadopago/client';
import { checkRateLimit, getClientIp } from '@/lib/turnstile/ratelimit';
import { readAffiliateCodeFromHeader } from '@/lib/affiliate';
import { resolveLoteAtual, restanteReal } from '@/lib/lotes';

export const runtime = 'nodejs';

type Body = { eventId: string; items: Array<{ batchId: string; quantity: number; attendeeName?: string }>; couponCode?: string | null };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`checkout:${ip}`, 20))) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde.' }, { status: 429 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: 'Confirme seu e-mail antes de comprar' }, { status: 403 });

  const body = (await req.json()) as Body;
  if (!body.eventId || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Itens inválidos' }, { status: 400 });
  }

  const { data: event } = await supabaseAdmin.from('events')
    .select('id, title, slug, status, service_fee_percent, max_tickets_per_cpf, event_date, event_time, venue_name')
    .eq('id', body.eventId).single();
  if (!event) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
  if (event.status !== 'active') return NextResponse.json({ error: 'Evento indisponível' }, { status: 400 });

  // Virada de lote: regra única de fila (src/lib/lotes.ts). SÓ o lote atual
  // pode ser comprado — mantém a API em sincronia com a página do evento e o
  // checkout mesmo quando o lote vira no meio da compra (esgotou/expirou/pausou).
  // Também garante janela de datas e visibilidade (antes não eram checadas aqui).
  const { data: eventBatches } = await supabaseAdmin.from('ticket_batches')
    .select('*').eq('event_id', body.eventId).eq('is_visible', true);
  const batchMap = new Map((eventBatches ?? []).map(b => [b.id, b]));
  const { atual } = resolveLoteAtual(eventBatches ?? []);
  if (!atual) {
    return NextResponse.json({ error: 'Nenhum lote à venda no momento' }, { status: 409 });
  }

  let subtotal = 0;
  const expanded: Array<{ batch: any; attendeeName?: string }> = [];
  for (const it of body.items) {
    const batch = batchMap.get(it.batchId);
    if (!batch) return NextResponse.json({ error: 'Lote inválido' }, { status: 400 });
    if (batch.id !== atual.id) {
      // O lote do carrinho virou enquanto o comprador decidia
      return NextResponse.json({
        error: `O lote "${batch.name}" não está mais à venda. O lote atual é "${atual.name}" (R$ ${Number(atual.price).toFixed(2)}) — atualize a página para comprar.`,
      }, { status: 409 });
    }
    if (!Number.isInteger(it.quantity) || it.quantity < 1) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
    }
    if (it.quantity > batch.max_per_order) return NextResponse.json({ error: `Máximo ${batch.max_per_order} por pedido em "${batch.name}"` }, { status: 400 });
    // Pré-checagem amigável (inclui reservas de checkouts em andamento).
    // A garantia real contra oversell é a reserva atômica logo abaixo.
    if (restanteReal(batch) < it.quantity) {
      return NextResponse.json({ error: `Lote "${batch.name}" sem estoque` }, { status: 400 });
    }
    for (let i = 0; i < it.quantity; i++) {
      expanded.push({ batch, attendeeName: it.attendeeName });
      subtotal += Number(batch.price);
    }
  }

  if (event.max_tickets_per_cpf && expanded.length > event.max_tickets_per_cpf) {
    return NextResponse.json({ error: `Máximo ${event.max_tickets_per_cpf} ingressos por CPF` }, { status: 400 });
  }

  let couponId: string | null = null, discount = 0, couponType: string | null = null;
  if (body.couponCode) {
    const { data: cd } = await supabaseAdmin.rpc('validate_coupon', {
      p_event_id: body.eventId, p_code: body.couponCode, p_subtotal: subtotal,
    });
    const row = Array.isArray(cd) ? cd[0] : cd;
    if (row?.coupon_id) { couponId = row.coupon_id; couponType = row.coupon_type; discount = Number(row.discount_amount) || 0; }
  }

  const feePct = Number(event.service_fee_percent) / 100;
  const baseForFee = Math.max(0, subtotal - discount);
  const serviceFee = couponType === 'free_fee' ? 0 : Number((baseForFee * feePct).toFixed(2));
  const total = Number((baseForFee + serviceFee).toFixed(2));
  if (total < 0.50) return NextResponse.json({ error: 'Valor total inválido' }, { status: 400 });

  const { data: profile } = await supabaseAdmin.from('profiles')
    .select('first_name, last_name, email, phone, cpf').eq('id', user.id).single();

  // Le cookie sacode_ref e valida que o afiliado existe, esta ativo e pertence a este evento.
  // Se invalido, ignora silenciosamente (pedido segue sem afiliado, sem quebrar checkout).
  let affiliateCode: string | null = null;
  const cookieRef = readAffiliateCodeFromHeader(req.headers.get('cookie'));
  if (cookieRef) {
    const { data: aff } = await supabaseAdmin
      .from('affiliates')
      .select('code')
      .eq('event_id', body.eventId)
      .eq('code', cookieRef)
      .eq('is_active', true)
      .maybeSingle();
    if (aff?.code) affiliateCode = aff.code;
  }

  // Atribuição Meta: cookies do pixel (_fbp/_fbc), IP e user agent só existem
  // AQUI, no request do comprador. O Purchase da CAPI sai depois (webhook/robô,
  // sem browser), então guarda no pedido pra fulfillment ler na hora de enviar.
  // Tudo opcional: bloqueador de anúncio sem cookie não quebra nada.
  const fbp = req.cookies.get('_fbp')?.value || null;
  const fbc = req.cookies.get('_fbc')?.value || null;
  const userAgent = req.headers.get('user-agent')?.slice(0, 512) || null;
  const clientIp = ip !== 'unknown' ? ip : null; // getClientIp devolve 'unknown' sem header

  const { data: order, error: oErr } = await supabaseAdmin.from('orders').insert({
    event_id: body.eventId, customer_id: user.id, coupon_id: couponId,
    subtotal, service_fee: serviceFee, discount, total,
    affiliate_code: affiliateCode,
    payment_status: 'pending', payment_gateway: 'mercadopago',
    meta_fbp: fbp, meta_fbc: fbc, client_ip: clientIp, client_user_agent: userAgent,
  }).select().single();
  if (oErr || !order) { console.error(oErr); return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 }); }

  const itemsToInsert = expanded.map(it => ({
    order_id: order.id, ticket_batch_id: it.batch.id,
    attendee_name: it.attendeeName || (profile ? `${profile.first_name} ${profile.last_name}` : null),
    unit_price: Number(it.batch.price), status: 'valid',
  }));
  const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(itemsToInsert);
  if (itemsErr) {
    console.error('[checkout] order_items insert', itemsErr);
    await supabaseAdmin.from('orders').update({
      payment_status: 'cancelled', cancellation_reason: 'Falha ao criar itens',
    }).eq('id', order.id);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }

  // Reserva ATÔMICA de estoque (fix do race): a função no Postgres só passa
  // se sold_count + reserved_count + qtd couber no lote — transacional, então
  // dois checkouts simultâneos do último ingresso nunca passam juntos.
  // A reserva é liberada em cancelamento/rejeição/abandono e convertida em
  // venda na aprovação (fulfillment).
  const { error: reserveErr } = await supabaseAdmin.rpc('reserve_order_stock', {
    p_order_id: order.id,
  });
  if (reserveErr) {
    await supabaseAdmin.from('orders').update({
      payment_status: 'cancelled', cancellation_reason: 'Sem estoque na reserva',
      cancelled_at: new Date().toISOString(),
    }).eq('id', order.id);
    // A função sinaliza 'SEM_ESTOQUE:<batch_id>' — traduz pro nome do lote
    const soldOutBatchId = reserveErr.message?.match(/SEM_ESTOQUE:([0-9a-f-]+)/)?.[1];
    const soldOutName = soldOutBatchId ? batchMap.get(soldOutBatchId)?.name : null;
    console.warn('[checkout] reserva falhou', order.id, reserveErr.message);
    return NextResponse.json({
      error: soldOutName
        ? `Ingressos do lote "${soldOutName}" esgotaram agora há pouco 😔`
        : 'Ingressos esgotaram agora há pouco 😔',
    }, { status: 409 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sacode.cantorcaiolacerda.com.br';
  const mpItems: any[] = expanded.map((it, idx) => ({
    id: `${it.batch.id}-${idx}`, title: `${event.title} — ${it.batch.name}`,
    quantity: 1, unit_price: Number(it.batch.price), currency_id: 'BRL',
  }));
  if (serviceFee > 0) mpItems.push({ id: 'service-fee', title: 'Taxa de serviço', quantity: 1, unit_price: serviceFee, currency_id: 'BRL' });
  if (discount > 0) mpItems.push({ id: 'discount', title: `Desconto (cupom ${body.couponCode})`, quantity: 1, unit_price: -Number(discount.toFixed(2)), currency_id: 'BRL' });

  try {
    const pref = await mpPreference.create({
      body: {
        items: mpItems,
        external_reference: order.id,
        statement_descriptor: 'SACODE',
        payer: profile ? {
          name: profile.first_name, surname: profile.last_name,
          email: profile.email || user.email,
          phone: profile.phone ? { area_code: profile.phone.slice(0,2), number: profile.phone.slice(2) } : undefined,
          identification: profile.cpf ? { type: 'CPF', number: profile.cpf } : undefined,
        } : undefined,
        payment_methods: {
          excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
          installments: 1,
        },
        back_urls: {
          success: `${baseUrl}/checkout/sucesso?order=${order.id}`,
          failure: `${baseUrl}/checkout/falha?order=${order.id}`,
          pending: `${baseUrl}/checkout/pendente?order=${order.id}`,
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/checkout/webhook`,
        expires: true,
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    });
    await supabaseAdmin.from('orders').update({
      payment_gateway_id: pref.id,
      payment_gateway_data: { preference_id: pref.id },
    }).eq('id', order.id);
    return NextResponse.json({ ok: true, orderId: order.id, initPoint: pref.init_point });
  } catch (err: any) {
    console.error('MP', err);
    await supabaseAdmin.from('orders').update({ payment_status: 'cancelled', cancellation_reason: 'MP failed' }).eq('id', order.id);
    // Devolve a reserva de estoque (idempotente)
    await supabaseAdmin.rpc('release_order_reservation', { p_order_id: order.id });
    return NextResponse.json({ error: 'Erro ao iniciar pagamento' }, { status: 500 });
  }
}
