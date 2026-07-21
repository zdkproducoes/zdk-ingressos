// app/api/admin/cupons/route.ts
// Cria um cupom. Exige papel 'admin' na organização (ou superadmin) E que o
// evento pertença a uma organização do usuário (assertEventInScope) — sem isso
// um produtor criaria cupom no evento de outro (service_role ignora RLS).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';

// validate_coupon compara com upper(), então o code é salvo em MAIÚSCULAS
const CODE_REGEX = /^[A-Z0-9-]{2,32}$/;
const COUPON_TYPES = ['discount_percent', 'discount_fixed', 'free_fee'] as const;

export async function POST(request: Request) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    event_id?: string;
    code?: string;
    coupon_type?: string;
    discount_value?: number | null;
    max_uses?: number | null;
    valid_from?: string | null;
    valid_until?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const eventId = body.event_id;
  const code = (body.code ?? '').trim().toUpperCase();
  const couponType = body.coupon_type as (typeof COUPON_TYPES)[number];

  if (!eventId) return NextResponse.json({ error: 'Evento é obrigatório.' }, { status: 400 });
  if (!code) return NextResponse.json({ error: 'Código é obrigatório.' }, { status: 400 });
  if (!CODE_REGEX.test(code)) {
    return NextResponse.json(
      { error: 'Código deve ter 2–32 caracteres: letras, números e hífen.' },
      { status: 400 },
    );
  }
  if (!COUPON_TYPES.includes(couponType)) {
    return NextResponse.json({ error: 'Tipo de cupom inválido.' }, { status: 400 });
  }

  let discountValue: number | null = null;
  if (couponType === 'discount_percent') {
    discountValue = Number(body.discount_value);
    if (Number.isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
      return NextResponse.json({ error: 'Desconto percentual deve estar entre 1 e 100.' }, { status: 400 });
    }
  } else if (couponType === 'discount_fixed') {
    discountValue = Number(body.discount_value);
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'Desconto fixo deve ser maior que zero.' }, { status: 400 });
    }
  }

  let maxUses: number | null = null;
  if (body.max_uses !== null && body.max_uses !== undefined && body.max_uses !== 0) {
    maxUses = Math.floor(Number(body.max_uses));
    if (Number.isNaN(maxUses) || maxUses < 1) {
      return NextResponse.json({ error: 'Limite de usos deve ser 1 ou mais (ou vazio = ilimitado).' }, { status: 400 });
    }
  }

  const validFrom = body.valid_from || null;
  const validUntil = body.valid_until || null;
  if (validFrom && validUntil && new Date(validFrom) >= new Date(validUntil)) {
    return NextResponse.json({ error: 'Início da validade deve ser antes do fim.' }, { status: 400 });
  }

  // Escopo: o evento precisa pertencer a uma organização do usuário (ou superadmin).
  if (!(await assertEventInScope(auth.ctx, eventId))) {
    return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
  }

  // Code duplicado neste evento (case-insensitive, igual ao validate_coupon)
  const { data: existing } = await supabaseAdmin
    .from('coupons')
    .select('id')
    .eq('event_id', eventId)
    .ilike('code', code)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `Já existe um cupom "${code}" neste evento.` },
      { status: 409 },
    );
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from('coupons')
    .insert({
      event_id: eventId,
      code,
      coupon_type: couponType,
      discount_value: discountValue,
      max_uses: maxUses,
      valid_from: validFrom,
      valid_until: validUntil,
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError || !created) {
    return NextResponse.json(
      { error: insertError?.message || 'Erro ao criar cupom.' },
      { status: 500 },
    );
  }

  revalidatePath('/admin/cupons');
  return NextResponse.json({ id: created.id }, { status: 201 });
}
