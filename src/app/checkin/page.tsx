import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function CheckinHomePage() {
  // Data de hoje em SP (formato YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10);

  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, title, slug, event_date, event_time, venue_name')
    .gte('event_date', today)
    .order('event_date', { ascending: true });

  const list = events || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-cream-200 mb-2">Eventos disponíveis</h1>
      <p className="text-cream-300 text-sm mb-6">Selecione o evento para iniciar o check-in.</p>

      {list.length === 0 ? (
        <div className="bg-wine-700 border border-wine-600 rounded-lg p-6 text-center">
          <p className="text-cream-200">Nenhum evento agendado no momento.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((ev) => {
            const dateLabel = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            });
            const timeLabel = (ev.event_time || '').slice(0, 5);
            return (
              <Link
                key={ev.id}
                href={`/checkin/${ev.slug}`}
                className="block bg-wine-700 border border-wine-600 rounded-lg p-5 hover:border-cream-300 transition"
              >
                <h2 className="text-lg font-bold text-cream-200 mb-1">{ev.title}</h2>
                <p className="text-cream-300 text-sm capitalize">{dateLabel}{timeLabel && ` • ${timeLabel}`}</p>
                <p className="text-cream-400 text-sm mt-1">{ev.venue_name}</p>
                <p className="text-cream-300 text-xs mt-3 underline">Iniciar check-in →</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}