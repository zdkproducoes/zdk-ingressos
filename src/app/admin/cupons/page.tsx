// app/admin/cupons/page.tsx
// Gestão de cupons do evento selecionado. Escopo por organização vem do
// getSelectedEvent (resolve só eventos das orgs do usuário / superadmin vê tudo).
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CuponsClient } from '@/components/admin/CuponsClient';
import { getSelectedEvent } from '@/lib/admin/selected-event';
import { requirePanelContext } from '@/lib/auth/panel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cupons — Painel' };

export type CupomListItem = {
  id: string;
  code: string;
  coupon_type: 'discount_percent' | 'discount_fixed' | 'free_fee';
  discount_value: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  // Desempenho (pedidos aprovados)
  orders_count: number;
  discount_total: number; // desconto concedido (R$) — p/ free_fee é a taxa isenta estimada
  revenue_total: number; // faturamento dos pedidos que usaram o cupom
  pending_count: number; // pedidos pendentes com o cupom (ainda não contam no used_count)
};

export default async function CuponsPage() {
  const ctx = await requirePanelContext();
  const selectedEvent = await getSelectedEvent(ctx);
  if (!selectedEvent) {
    return (
      <p className="text-cream-400 text-center py-16">
        Nenhum evento cadastrado. Crie um na aba Eventos.
      </p>
    );
  }

  // service_fee_percent p/ estimar o benefício dos cupons free_fee
  const { data: eventRow } = await supabaseAdmin
    .from('events')
    .select('service_fee_percent')
    .eq('id', selectedEvent.id)
    .single();
  const feePct = Number(eventRow?.service_fee_percent ?? 0) / 100;

  // 1) Cupons do evento selecionado
  const { data: coupons } = await supabaseAdmin
    .from('coupons')
    .select('id, code, coupon_type, discount_value, max_uses, used_count, valid_from, valid_until, is_active, created_at')
    .eq('event_id', selectedEvent.id)
    .order('created_at', { ascending: false });

  // 2) Pedidos do evento que usaram cupom (agrega em memória, igual à aba Afiliados)
  const { data: couponOrders } = await supabaseAdmin
    .from('orders')
    .select('coupon_id, payment_status, subtotal, discount, total')
    .eq('event_id', selectedEvent.id)
    .not('coupon_id', 'is', null);

  const statsByCoupon = new Map<
    string,
    { orders: number; discount: number; revenue: number; pending: number }
  >();
  for (const order of couponOrders ?? []) {
    if (!order.coupon_id) continue;
    const current =
      statsByCoupon.get(order.coupon_id) ?? { orders: 0, discount: 0, revenue: 0, pending: 0 };
    if (order.payment_status === 'approved') {
      current.orders += 1;
      current.discount += Number(order.discount ?? 0);
      current.revenue += Number(order.total ?? 0);
    } else if (order.payment_status === 'pending') {
      current.pending += 1;
    }
    statsByCoupon.set(order.coupon_id, current);
  }

  const items: CupomListItem[] = (coupons ?? []).map((c) => {
    const stats = statsByCoupon.get(c.id) ?? { orders: 0, discount: 0, revenue: 0, pending: 0 };

    // free_fee não gera "discount" no pedido; o benefício é a taxa que deixou de
    // ser cobrada. Estima a partir do faturamento (que nesses pedidos = subtotal).
    const discountTotal =
      c.coupon_type === 'free_fee' ? stats.revenue * feePct : stats.discount;

    return {
      id: c.id,
      code: c.code,
      coupon_type: c.coupon_type,
      discount_value: c.discount_value === null ? null : Number(c.discount_value),
      max_uses: c.max_uses,
      used_count: c.used_count ?? 0,
      valid_from: c.valid_from,
      valid_until: c.valid_until,
      is_active: c.is_active,
      created_at: c.created_at,
      orders_count: stats.orders,
      discount_total: discountTotal,
      revenue_total: stats.revenue,
      pending_count: stats.pending,
    };
  });

  return <CuponsClient items={items} eventId={selectedEvent.id} eventTitle={selectedEvent.title} />;
}
