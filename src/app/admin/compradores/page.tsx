import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ExportCSVButton, type BuyerData } from '@/components/admin/ExportCSVButton';
import { getSelectedEvent } from '@/lib/admin/selected-event';

type OrderForAgg = {
  customer_id: string;
  total: number;
  created_at: string;
  profiles: { full_name: string; email: string; phone: string; cpf: string } | null;
  order_items: { id: string }[];
};

export default async function CompradoresPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin');
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'producer') redirect('/');

  const selectedEvent = await getSelectedEvent();
  if (!selectedEvent) {
    return (
      <p className="text-cream-400 text-center py-16">
        Nenhum evento cadastrado. Crie um na aba Eventos.
      </p>
    );
  }

  const { data: raw } = await supabaseAdmin
    .from('orders')
    .select(`
      customer_id, total, created_at,
      profiles!orders_customer_id_fkey ( full_name, email, phone, cpf ),
      order_items ( id )
    `)
    .eq('event_id', selectedEvent.id)
    .eq('payment_status', 'approved')
    .order('created_at', { ascending: true });

  const orders = (raw as unknown as OrderForAgg[]) ?? [];

  // Agrupa por comprador
  const map = new Map<string, BuyerData & { customer_id: string }>();
  for (const order of orders) {
    if (!order.profiles) continue;
    const existing = map.get(order.customer_id);
    if (existing) {
      existing.total_ingressos += order.order_items.length;
      existing.total_gasto += Number(order.total);
      if (order.created_at < existing.primeira_compra) {
        existing.primeira_compra = order.created_at;
      }
    } else {
      map.set(order.customer_id, {
        customer_id: order.customer_id,
        full_name: order.profiles.full_name ?? '',
        email: order.profiles.email ?? '',
        phone: order.profiles.phone ?? '',
        cpf: order.profiles.cpf ?? '',
        total_ingressos: order.order_items.length,
        total_gasto: Number(order.total),
        primeira_compra: order.created_at,
      });
    }
  }

  const buyers: BuyerData[] = Array.from(map.values())
    .sort((a, b) => b.total_gasto - a.total_gasto);

  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-cream-400 text-sm">{buyers.length} comprador(es) com ingresso aprovado</p>
        <ExportCSVButton buyers={buyers} />
      </div>

      {buyers.length === 0 ? (
        <p className="text-cream-400 text-center py-16">Nenhum comprador ainda.</p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-muted-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-muted-700">
                  {['Nome', 'E-mail', 'Telefone', 'CPF', 'Ingressos', 'Total gasto', 'Primeira compra'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-cream-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buyers.map((b, i) => (
                  <tr key={i} className="border-b border-muted-700 last:border-0 hover:bg-surface-700/50 transition">
                    <td className="px-4 py-3 text-cream-200 font-medium">{b.full_name}</td>
                    <td className="px-4 py-3 text-cream-300">{b.email}</td>
                    <td className="px-4 py-3 text-cream-300">{b.phone}</td>
                    <td className="px-4 py-3 text-cream-400 font-mono text-xs">{b.cpf}</td>
                    <td className="px-4 py-3 text-cream-300 text-center">{b.total_ingressos}</td>
                    <td className="px-4 py-3 text-cream-200 font-medium">{fmt.format(b.total_gasto)}</td>
                    <td className="px-4 py-3 text-cream-400">
                      {new Date(b.primeira_compra).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-4">
            {buyers.map((b, i) => (
              <div key={i} className="bg-surface-700 rounded-lg p-4 border border-muted-700 space-y-1">
                <p className="text-cream-200 font-medium">{b.full_name}</p>
                <p className="text-sm text-cream-400">{b.email}</p>
                <p className="text-sm text-cream-400">{b.phone}</p>
                <p className="text-xs text-cream-400 font-mono">{b.cpf}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-cream-400">{b.total_ingressos} ingresso(s)</span>
                  <span className="text-cream-200 font-semibold">{fmt.format(b.total_gasto)}</span>
                </div>
                <p className="text-xs text-cream-400">
                  Desde {new Date(b.primeira_compra).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
