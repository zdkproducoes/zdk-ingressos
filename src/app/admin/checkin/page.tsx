import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSelectedEvent } from '@/lib/admin/selected-event';

export const dynamic = 'force-dynamic';

type CheckinRow = {
  id: string;
  attendee_name: string | null;
  checked_in_at: string;
  checked_in_by: string | null;
  order_number: number;
  batch_name: string;
  validator_name: string | null;
};

const BUCKET_MINUTES = 30;

export default async function AdminCheckinPage() {
  // Usa o evento selecionado no painel (cookie; fallback = ativo mais recente)
  const event = await getSelectedEvent();

  if (!event) {
    return (
      <div className="mt-6 bg-wine-700 border border-wine-600 rounded-lg p-6 text-center">
        <p className="text-cream-200">Nenhum evento cadastrado.</p>
      </div>
    );
  }

  // Busca todos os checkins desse evento
  const { data: rawCheckins } = await supabaseAdmin
    .from('order_items')
    .select(`
      id, attendee_name, checked_in_at, checked_in_by,
      orders!inner ( order_number, event_id, payment_status ),
      ticket_batches ( name )
    `)
    .eq('orders.event_id', event.id)
    .not('checked_in_at', 'is', null)
    .order('checked_in_at', { ascending: true });

  // Resolve nomes dos validadores em batch
  const validatorIds = Array.from(new Set(
    (rawCheckins || [])
      .map((c: any) => c.checked_in_by)
      .filter(Boolean)
  )) as string[];
  const validatorMap = new Map<string, string>();
  if (validatorIds.length > 0) {
    const { data: validators } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', validatorIds);
    for (const v of validators || []) {
      validatorMap.set(v.id, v.full_name || v.email || '');
    }
  }

  // Total de ingressos vendidos (aprovados)
  const { count: totalSold } = await supabaseAdmin
    .from('order_items')
    .select('id, orders!inner(event_id, payment_status)', { count: 'exact', head: true })
    .eq('orders.event_id', event.id)
    .eq('orders.payment_status', 'approved');

  const checkins: CheckinRow[] = (rawCheckins || []).map((row: any) => {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    const batch = Array.isArray(row.ticket_batches) ? row.ticket_batches[0] : row.ticket_batches;
    return {
      id: row.id,
      attendee_name: row.attendee_name,
      checked_in_at: row.checked_in_at,
      checked_in_by: row.checked_in_by,
      order_number: order?.order_number ?? 0,
      batch_name: batch?.name || 'Ingresso',
      validator_name: row.checked_in_by ? validatorMap.get(row.checked_in_by) || null : null,
    };
  });

  // Histograma por bucket de 30min em horario SP
  const buckets = new Map<string, number>();
  for (const c of checkins) {
    const bucket = floorToBucketSP(c.checked_in_at, BUCKET_MINUTES);
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  }

  // Preenche buckets vazios entre o primeiro e o ultimo (pra mostrar gaps no grafico)
  const bucketEntriesRaw = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  const bucketEntries = fillEmptyBuckets(bucketEntriesRaw, BUCKET_MINUTES);
  const maxCount = Math.max(1, ...bucketEntries.map(([, c]) => c));

  return (
    <div className="mt-6 space-y-6">
      {/* Header do evento */}
      <div>
        <p className="text-cream-300 text-sm font-medium">{event.title}</p>
        <p className="text-cream-400 text-xs capitalize">{formatEventDate(event.event_date)}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Vendidos" value={totalSold ?? 0} />
        <StatBox label="Validados" value={checkins.length} />
        <StatBox label="Pendentes" value={(totalSold ?? 0) - checkins.length} />
      </div>

      {/* Grafico */}
      <div className="bg-wine-700 border border-wine-600 rounded-lg p-4">
        <h2 className="text-cream-200 font-bold mb-1">Check-ins por horario</h2>
        <p className="text-cream-400 text-xs mb-4">Agrupado a cada {BUCKET_MINUTES} minutos (horario de Sao Paulo)</p>
        {bucketEntries.length === 0 ? (
          <p className="text-cream-400 text-sm">Nenhum check-in registrado ainda.</p>
        ) : (
          <BarChart data={bucketEntries} maxCount={maxCount} />
        )}
      </div>

      {/* Tabela */}
      <div className="bg-wine-700 border border-wine-600 rounded-lg overflow-hidden">
        <h2 className="text-cream-200 font-bold p-4 border-b border-wine-600">
          Pessoas que entraram ({checkins.length})
        </h2>
        {checkins.length === 0 ? (
          <p className="text-cream-400 text-sm p-4">Nenhum check-in registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-wine-800 text-cream-300 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Horario</th>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Pedido</th>
                  <th className="text-left p-3">Lote</th>
                  <th className="text-left p-3">Validado por</th>
                </tr>
              </thead>
              <tbody>
                {/* Mais recentes primeiro */}
                {checkins.slice().reverse().map((c) => (
                  <tr key={c.id} className="border-t border-wine-600 text-cream-200">
                    <td className="p-3 whitespace-nowrap font-mono text-xs">{formatTimeSP(c.checked_in_at)}</td>
                    <td className="p-3">{c.attendee_name || '-'}</td>
                    <td className="p-3 whitespace-nowrap">#{c.order_number}</td>
                    <td className="p-3">{c.batch_name}</td>
                    <td className="p-3">{c.validator_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-wine-700 border border-wine-600 rounded-lg p-4">
      <p className="text-cream-400 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-cream-200 text-2xl font-bold">{value}</p>
    </div>
  );
}

function BarChart({ data, maxCount }: { data: [string, number][]; maxCount: number }) {
  const barWidth = 28;
  const barGap = 6;
  const chartHeight = 180;
  const labelHeight = 60;
  const padX = 10;
  const width = padX * 2 + data.length * (barWidth + barGap);
  const height = chartHeight + labelHeight;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} style={{ minWidth: '100%' }}>
        {data.map(([bucket, count], i) => {
          const x = padX + i * (barWidth + barGap);
          const h = count === 0 ? 2 : (count / maxCount) * (chartHeight - 25);
          const y = chartHeight - h;
          // bucket format: 'YYYY-MM-DD HH:MM'
          const label = bucket.split(' ')[1] || bucket;
          return (
            <g key={bucket}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={3}
                fill={count === 0 ? '#4a2a3a' : '#f0e3d0'}
              />
              {count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  fontSize="11"
                  fontWeight="bold"
                  fill="#f0e3d0"
                  textAnchor="middle"
                >
                  {count}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 18}
                fontSize="10"
                fill="#c4a99a"
                textAnchor="middle"
                transform={`rotate(-45 ${x + barWidth / 2} ${chartHeight + 18})`}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Converte um ISO date UTC para o bucket de N minutos em horario SP.
// Retorna string no formato 'YYYY-MM-DD HH:MM' (horario SP).
function floorToBucketSP(isoDate: string, bucketMinutes: number): string {
  const d = new Date(isoDate);
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const flooredMinute = String(Math.floor(parseInt(minute, 10) / bucketMinutes) * bucketMinutes).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${flooredMinute}`;
}

// Preenche buckets vazios entre o primeiro e o ultimo para mostrar gaps no grafico
function fillEmptyBuckets(entries: [string, number][], bucketMinutes: number): [string, number][] {
  if (entries.length < 2) return entries;
  const result: [string, number][] = [];
  const counts = new Map(entries);

  // Parse string 'YYYY-MM-DD HH:MM' assumindo horario SP -> retorna Date object
  // Tratamos como local time, o que ja basta pra calcular gaps em minutos
  const parse = (s: string): Date => {
    const [datePart, timePart] = s.split(' ');
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, mi] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, h, mi);
  };
  const fmt = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${mi}`;
  };

  const start = parse(entries[0][0]);
  const end = parse(entries[entries.length - 1][0]);
  const stepMs = bucketMinutes * 60 * 1000;

  for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
    const key = fmt(new Date(t));
    result.push([key, counts.get(key) || 0]);
  }
  return result;
}

function formatTimeSP(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
