import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelContext } from '@/lib/auth/panel';
import { LotesAdminClient } from '@/components/admin/LotesAdminClient';
import { getSelectedEvent } from '@/lib/admin/selected-event';

export const dynamic = 'force-dynamic';

export type BatchRow = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  sold_count: number;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  is_visible: boolean;
  min_per_order: number;
  max_per_order: number;
  // Campos derivados (calculados na pagina)
  real_sold: number;       // count real de order_items aprovados (nao-cortesia)
  real_courtesies: number; // count real de cortesias aprovadas
  event_title: string | null;
};

// Evento sendo gerenciado no admin — lotes novos nascem sempre nele
export type SelectedEventOption = {
  id: string;
  title: string;
};

export default async function LotesPage() {
  const ctx = await requirePanelContext();

  const selectedEvent = await getSelectedEvent(ctx);
  if (!selectedEvent) {
    return (
      <p className="text-cream-400 text-center py-16">
        Nenhum evento cadastrado. Crie um na aba Eventos.
      </p>
    );
  }

  // Lotes do evento selecionado + itens emitidos (aprovados) em paralelo
  const [batchesRes, issuedRes] = await Promise.all([
    supabaseAdmin
      .from('ticket_batches')
      .select(`
        id, event_id, name, description, price, quantity, sold_count, sort_order,
        starts_at, ends_at, status, is_visible, min_per_order, max_per_order,
        events ( title )
      `)
      .eq('event_id', selectedEvent.id)
      .order('sort_order', { ascending: true }),
    supabaseAdmin
      .from('order_items')
      .select('ticket_batch_id, is_courtesy, orders!inner(payment_status, event_id)')
      .eq('orders.payment_status', 'approved')
      .eq('orders.event_id', selectedEvent.id),
  ]);

  const issuedByBatch = new Map<string, { total: number; courtesies: number }>();
  for (const item of (issuedRes.data ?? []) as any[]) {
    const current = issuedByBatch.get(item.ticket_batch_id) ?? { total: 0, courtesies: 0 };
    current.total += 1;
    if (item.is_courtesy) current.courtesies += 1;
    issuedByBatch.set(item.ticket_batch_id, current);
  }

  const batches: BatchRow[] = ((batchesRes.data ?? []) as any[]).map((b) => {
    const stats = issuedByBatch.get(b.id) ?? { total: 0, courtesies: 0 };
    const eventRel = Array.isArray(b.events) ? b.events[0] : b.events;
    return {
      id: b.id,
      event_id: b.event_id,
      name: b.name,
      description: b.description,
      price: Number(b.price),
      quantity: b.quantity,
      sold_count: b.sold_count,
      sort_order: b.sort_order,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      status: b.status,
      is_visible: b.is_visible,
      min_per_order: b.min_per_order,
      max_per_order: b.max_per_order,
      real_sold: stats.total - stats.courtesies,
      real_courtesies: stats.courtesies,
      event_title: eventRel?.title ?? null,
    };
  });

  return (
    <LotesAdminClient
      batches={batches}
      selectedEvent={{ id: selectedEvent.id, title: selectedEvent.title }}
    />
  );
}
