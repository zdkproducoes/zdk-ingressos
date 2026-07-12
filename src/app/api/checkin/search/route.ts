import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';

export const runtime = 'nodejs';

interface Hit {
  order_item_id: string;
  qr_code_token: string;
  attendee_name: string;
  batch_name: string;
  order_number: number;
  checked_in_at: string | null;
  checked_in_by_name: string | null;
}

const SELECT_FIELDS = `
  id, qr_code_token, attendee_name, attendee_cpf, checked_in_at, checked_in_by,
  ticket_batches ( name ),
  orders!inner ( order_number, event_id, payment_status, customer_id )
`;

export async function POST(req: NextRequest) {
  // 1. Autenticação central (aceita papel de check-in)
  const auth = await requirePanelApi({ allowCheckinRole: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // 2. Payload
  let body: { query?: string; event_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const raw = String(body.query ?? '').trim();
  const eventId = String(body.event_id ?? '').trim();

  if (raw.length < 3 || !eventId) {
    return NextResponse.json({ results: [] });
  }

  // Escopo: só busca em eventos das organizações do operador
  if (!(await assertEventInScope(auth.ctx, eventId))) {
    return NextResponse.json({ results: [] });
  }

  // 3. Detecta CPF (só dígitos depois de remover pontuação) ou nome
  const onlyDigits = raw.replace(/\D/g, '');
  const looksLikeCpf = onlyDigits.length >= 6 && raw.replace(/[.\-\s]/g, '').length === onlyDigits.length;

  // Map para deduplicar entre as buscas
  const itemsById = new Map<string, any>();

  if (looksLikeCpf) {
    // CPF — busca 1: attendee_cpf do próprio ingresso
    const { data: q1 } = await supabaseAdmin
      .from('order_items')
      .select(SELECT_FIELDS)
      .eq('orders.event_id', eventId)
      .eq('orders.payment_status', 'approved')
      .eq('status', 'valid')
      .like('attendee_cpf', `%${onlyDigits}%`)
      .limit(20);
    for (const r of q1 || []) itemsById.set(r.id, r);

    // CPF — busca 2: profiles do comprador
    const { data: profs } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .like('cpf', `%${onlyDigits}%`)
      .limit(50);
    const profileIds = (profs || []).map((p) => p.id);
    if (profileIds.length > 0) {
      const { data: q2 } = await supabaseAdmin
        .from('order_items')
        .select(SELECT_FIELDS)
        .eq('orders.event_id', eventId)
        .eq('orders.payment_status', 'approved')
        .eq('status', 'valid')
        .in('orders.customer_id', profileIds)
        .limit(20);
      for (const r of q2 || []) if (!itemsById.has(r.id)) itemsById.set(r.id, r);
    }
  } else {
    // NOME — busca 1: attendee_name do próprio ingresso (ILIKE direto, sem .or())
    const { data: q1 } = await supabaseAdmin
      .from('order_items')
      .select(SELECT_FIELDS)
      .eq('orders.event_id', eventId)
      .eq('orders.payment_status', 'approved')
      .eq('status', 'valid')
      .ilike('attendee_name', `%${raw}%`)
      .limit(20);
    for (const r of q1 || []) itemsById.set(r.id, r);

    // NOME — busca 2: 3 queries separadas em profiles (full_name, first_name, last_name)
    // Evita o .or() do PostgREST que tem syntax frágil
    const profileIdSet = new Set<string>();

    const [byFull, byFirst, byLast] = await Promise.all([
      supabaseAdmin.from('profiles').select('id').ilike('full_name', `%${raw}%`).limit(30),
      supabaseAdmin.from('profiles').select('id').ilike('first_name', `%${raw}%`).limit(30),
      supabaseAdmin.from('profiles').select('id').ilike('last_name', `%${raw}%`).limit(30),
    ]);
    for (const r of byFull.data || []) profileIdSet.add(r.id);
    for (const r of byFirst.data || []) profileIdSet.add(r.id);
    for (const r of byLast.data || []) profileIdSet.add(r.id);

    const profileIds = Array.from(profileIdSet);
    if (profileIds.length > 0) {
      const { data: q2 } = await supabaseAdmin
        .from('order_items')
        .select(SELECT_FIELDS)
        .eq('orders.event_id', eventId)
        .eq('orders.payment_status', 'approved')
        .eq('status', 'valid')
        .in('orders.customer_id', profileIds)
        .limit(20);
      for (const r of q2 || []) if (!itemsById.has(r.id)) itemsById.set(r.id, r);
    }
  }

  const items = Array.from(itemsById.values()).slice(0, 20);

  // 4. Resolve nomes de quem validou (em batch)
  const validatorIds = Array.from(new Set(items.map((it) => it.checked_in_by).filter(Boolean))) as string[];
  const validatorNameMap = new Map<string, string>();
  if (validatorIds.length > 0) {
    const { data: validators } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', validatorIds);
    for (const v of validators || []) {
      validatorNameMap.set(v.id, v.full_name || v.email || '');
    }
  }

  // 5. Formata resposta
  const results: Hit[] = items.map((it) => {
    const order = Array.isArray(it.orders) ? it.orders[0] : it.orders;
    const batch = Array.isArray(it.ticket_batches) ? it.ticket_batches[0] : it.ticket_batches;
    return {
      order_item_id: it.id,
      qr_code_token: it.qr_code_token,
      attendee_name: it.attendee_name || '',
      batch_name: batch?.name || 'Ingresso',
      order_number: order?.order_number ?? 0,
      checked_in_at: it.checked_in_at,
      checked_in_by_name: it.checked_in_by ? validatorNameMap.get(it.checked_in_by) || null : null,
    };
  });

  return NextResponse.json({ results });
}