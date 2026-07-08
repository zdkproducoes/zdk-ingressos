// app/api/coupons/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { eventId, code, subtotal } = await req.json().catch(() => ({}));
  if (!eventId || !code || typeof subtotal !== 'number') {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc('validate_coupon', {
    p_event_id: eventId, p_code: code, p_subtotal: subtotal,
  });
  if (error) { console.error(error); return NextResponse.json({ error: 'Erro ao validar' }, { status: 500 }); }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.coupon_id) return NextResponse.json({ valid: false, message: row?.message || 'Cupom inválido' });
  return NextResponse.json({
    valid: true,
    couponId: row.coupon_id,
    couponType: row.coupon_type,
    discountAmount: Number(row.discount_amount),
  });
}
