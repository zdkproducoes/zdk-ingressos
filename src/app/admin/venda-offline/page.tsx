// app/admin/venda-offline/page.tsx
// PDV — venda presencial paga via PIX na mão do vendedor.
// A venda entra nos painéis como pedido aprovado normal; aqui fica o
// relatório detalhado (quem vendeu, valor, data e horário).
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelContext } from '@/lib/auth/panel';
import { getSelectedEvent } from '@/lib/admin/selected-event';
import { VendaOfflineClient } from '@/components/admin/VendaOfflineClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Venda offline — Painel' };

export type OfflineBatch = {
  id: string;
  name: string;
  price: number;
  available: number;
};

export type OfflineSale = {
  order_id: string;
  order_number: number;
  total: number;
  paid_at: string;
  payment_status: string;
  buyer_name: string;
  buyer_email: string | null;
  seller_name: string;
  tickets: number;
  batch_names: string[];
};

export default async function VendaOfflinePage() {
  const ctx = await requirePanelContext();
  const event = await getSelectedEvent(ctx);
  if (!event) {
    return (
      <p className="text-cream-400 text-center py-16">
        Nenhum evento cadastrado. Crie um na aba Eventos.
      </p>
    );
  }

  const [batchesRes, salesRes] = await Promise.all([
    supabaseAdmin
      .from('ticket_batches')
      .select('id, name, price, quantity, sold_count')
      .eq('event_id', event.id)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, total, paid_at, created_at, payment_status, payment_gateway_data,
        profiles!orders_customer_id_fkey ( first_name, last_name, email ),
        order_items ( id, ticket_batches ( name ) )
      `)
      .eq('event_id', event.id)
      .eq('payment_gateway', 'offline')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const batches: OfflineBatch[] = (batchesRes.data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    price: Number(b.price),
    available: Math.max(0, b.quantity - b.sold_count),
  }));

  const sales: OfflineSale[] = (salesRes.data ?? []).map((o: any) => {
    const buyer = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    const gwd = o.payment_gateway_data || {};
    const batchNames = Array.from(
      new Set(
        (o.order_items ?? []).map((it: any) => {
          const b = Array.isArray(it.ticket_batches) ? it.ticket_batches[0] : it.ticket_batches;
          return (b?.name as string) || 'Ingresso';
        }),
      ),
    ) as string[];
    return {
      order_id: o.id,
      order_number: o.order_number,
      total: Number(o.total ?? 0),
      paid_at: o.paid_at ?? o.created_at,
      payment_status: o.payment_status,
      buyer_name: buyer ? `${buyer.first_name ?? ''} ${buyer.last_name ?? ''}`.trim() : '—',
      buyer_email: buyer?.email ?? null,
      seller_name: gwd.sold_by_name || '—',
      tickets: (o.order_items ?? []).length,
      batch_names: batchNames,
    };
  });

  return (
    <VendaOfflineClient
      eventId={event.id}
      eventTitle={event.title}
      eventStatus={event.status}
      batches={batches}
      sales={sales}
    />
  );
}
