import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CheckinScannerClient } from '@/components/checkin/CheckinScannerClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ event_slug: string }>;
}

export default async function CheckinEventPage({ params }: PageProps) {
  const { event_slug } = await params;

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title, slug, event_date, event_time, venue_name')
    .eq('slug', event_slug)
    .maybeSingle();

  if (!event) notFound();

  // Estatísticas: total de ingressos válidos vs já validados
  const { count: totalTickets } = await supabaseAdmin
    .from('order_items')
    .select('id, orders!inner(event_id, payment_status)', { count: 'exact', head: true })
    .eq('orders.event_id', event.id)
    .eq('orders.payment_status', 'approved');

  const { count: checkedIn } = await supabaseAdmin
    .from('order_items')
    .select('id, orders!inner(event_id, payment_status)', { count: 'exact', head: true })
    .eq('orders.event_id', event.id)
    .eq('orders.payment_status', 'approved')
    .not('checked_in_at', 'is', null);

  const dateLabel = new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  });
  const timeLabel = (event.event_time || '').slice(0, 5);

  return (
    <div>
      <div className="mb-4">
        <Link href="/checkin" className="text-cream-300 text-sm hover:underline">
          ← Voltar para eventos
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-cream-200 mb-1">{event.title}</h1>
        <p className="text-cream-300 text-sm capitalize">
          {dateLabel}{timeLabel && ` • ${timeLabel}`} • {event.venue_name}
        </p>
      </div>

      {/* Caixinhas de stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-wine-700 border border-wine-600 rounded-lg p-4">
          <p className="text-cream-400 text-xs uppercase tracking-wider">Vendidos</p>
          <p className="text-cream-200 text-2xl font-bold">{totalTickets ?? 0}</p>
        </div>
        <div className="bg-wine-700 border border-wine-600 rounded-lg p-4">
          <p className="text-cream-400 text-xs uppercase tracking-wider">Validados</p>
          <p className="text-cream-200 text-2xl font-bold">{checkedIn ?? 0}</p>
        </div>
        <div className="bg-wine-700 border border-wine-600 rounded-lg p-4">
          <p className="text-cream-400 text-xs uppercase tracking-wider">Pendentes</p>
          <p className="text-cream-200 text-2xl font-bold">{(totalTickets ?? 0) - (checkedIn ?? 0)}</p>
        </div>
      </div>

      <CheckinScannerClient eventId={event.id} eventSlug={event.slug} />
    </div>
  );
}