// app/api/admin/cupons/[id]/route.ts
// Edita / ativa / exclui um cupom. Exige 'admin' na org (ou superadmin) E que o
// evento do cupom esteja no escopo do usuário (assertEventInScope).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requirePanelApi, type PanelContext } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';

const CODE_REGEX = /^[A-Z0-9-]{2,32}$/;
const COUPON_TYPES = ['discount_percent', 'discount_fixed', 'free_fee'] as const;

// Busca o cupom e garante que o evento dele pertence ao usuário logado.
async function loadCouponInScope(ctx: PanelContext, id: string) {
  const { data: coupon } = await supabaseAdmin
    .from('coupons')
    .select('id, event_id, code, used_count')
    .eq('id', id)
    .maybeSingle();
  if (!coupon) return null;
  if (!(await assertEventInScope(ctx, coupon.event_id))) return null;
  return coupon;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const existing = await loadCouponInScope(auth.ctx, id);
  if (!existing) {
    return NextResponse.json({ error: 'Cupom não encontrado.' }, { status: 404 });
  }

  const action = body.action;

  // -------- ACTION: toggle_active --------
  if (action === 'toggle_active') {
    const newStatus = Boolean(body.is_active);
    const { error: updateError } = await supabaseAdmin
      .from('coupons')
      .update({ is_active: newStatus })
      .eq('id', id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    revalidatePath('/admin/cupons');
    return NextResponse.json({ ok: true, is_active: newStatus });
  }

  // -------- ACTION: update --------
  if (action === 'update') {
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const couponType = body.coupon_type as (typeof COUPON_TYPES)[number];

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
      if (maxUses < existing.used_count) {
        return NextResponse.json(
          { error: `Limite não pode ser menor que os ${existing.used_count} usos já feitos.` },
          { status: 400 },
        );
      }
    }

    const validFrom = typeof body.valid_from === 'string' && body.valid_from ? body.valid_from : null;
    const validUntil = typeof body.valid_until === 'string' && body.valid_until ? body.valid_until : null;
    if (validFrom && validUntil && new Date(validFrom) >= new Date(validUntil)) {
      return NextResponse.json({ error: 'Início da validade deve ser antes do fim.' }, { status: 400 });
    }

    // Se o code mudou, confere duplicidade no mesmo evento (case-insensitive)
    if (code !== existing.code.toUpperCase()) {
      const { data: dup } = await supabaseAdmin
        .from('coupons')
        .select('id')
        .eq('event_id', existing.event_id)
        .ilike('code', code)
        .neq('id', id)
        .maybeSingle();
      if (dup) {
        return NextResponse.json(
          { error: `Já existe outro cupom "${code}" neste evento.` },
          { status: 409 },
        );
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('coupons')
      .update({
        code,
        coupon_type: couponType,
        discount_value: discountValue,
        max_uses: maxUses,
        valid_from: validFrom,
        valid_until: validUntil,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    revalidatePath('/admin/cupons');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  const existing = await loadCouponInScope(auth.ctx, id);
  if (!existing) {
    return NextResponse.json({ error: 'Cupom não encontrado.' }, { status: 404 });
  }

  // Só permite excluir cupom que nunca entrou em pedido (qualquer status).
  // Se já foi usado, o certo é desativar — preserva o histórico dos pedidos.
  const { count } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `O cupom "${existing.code}" já foi usado em ${count} pedido(s). Desative-o em vez de excluir.` },
      { status: 409 },
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from('coupons')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  revalidatePath('/admin/cupons');
  return NextResponse.json({ ok: true });
}
