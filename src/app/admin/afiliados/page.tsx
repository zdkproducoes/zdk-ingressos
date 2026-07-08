// app/admin/afiliados/page.tsx
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AfiliadosListClient } from '@/components/admin/AfiliadosListClient';
import { getSelectedEvent } from '@/lib/admin/selected-event';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Afiliados — Admin SACODE' };

export type AfiliadoListItem = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_percent: number;
  is_active: boolean;
  visits: number;
  event_id: string;
  event_title: string;
  event_slug: string;
  sales_count: number;
  attributed_revenue: number;
  commission_due: number;
};

export default async function AfiliadosPage() {
  const selectedEvent = await getSelectedEvent();
  if (!selectedEvent) {
    return (
      <p className="text-cream-400 text-center py-16">
        Nenhum evento cadastrado. Crie um na aba Eventos.
      </p>
    );
  }

  // 1) Busca os afiliados do evento selecionado
  const { data: affiliates } = await supabaseAdmin
    .from('affiliates')
    .select('id, code, name, email, phone, commission_percent, is_active, visits, event_id, events!inner(title, slug)')
    .eq('event_id', selectedEvent.id)
    .order('created_at', { ascending: false });

  // 2) Busca os pedidos aprovados do evento que tenham affiliate_code
  //    (uma vez só, e agrega em memória — é eficiente pra escala desta plataforma)
  const { data: paidOrders } = await supabaseAdmin
    .from('orders')
    .select('id, total, service_fee, affiliate_code, event_id')
    .eq('event_id', selectedEvent.id)
    .eq('payment_status', 'approved')
    .not('affiliate_code', 'is', null);

  // 3) Indexa pedidos por (event_id::code) pra atribuir ao afiliado correto
  //    (mesmo code pode existir em eventos diferentes)
  const salesByAffiliate = new Map<string, { count: number; revenue: number }>();
  for (const order of paidOrders ?? []) {
    if (!order.affiliate_code || !order.event_id) continue;
    const key = `${order.event_id}::${order.affiliate_code}`;
    const current = salesByAffiliate.get(key) ?? { count: 0, revenue: 0 };
    // Receita atribuída = total - taxa de serviço (faturamento líquido de plataforma)
    const net = Number(order.total ?? 0) - Number(order.service_fee ?? 0);
    current.count += 1;
    current.revenue += net;
    salesByAffiliate.set(key, current);
  }

  // 4) Monta o resultado final
  const items: AfiliadoListItem[] = (affiliates ?? []).map((a) => {
    // O Supabase tipa events como array quando é relação; pegamos o primeiro.
    const eventRel = Array.isArray(a.events) ? a.events[0] : a.events;
    const key = `${a.event_id}::${a.code}`;
    const sales = salesByAffiliate.get(key) ?? { count: 0, revenue: 0 };
    const commissionDue = sales.revenue * (Number(a.commission_percent) / 100);

    return {
      id: a.id,
      code: a.code,
      name: a.name,
      email: a.email,
      phone: a.phone,
      commission_percent: Number(a.commission_percent),
      is_active: a.is_active,
      visits: a.visits ?? 0,
      event_id: a.event_id,
      event_title: eventRel?.title ?? '—',
      event_slug: eventRel?.slug ?? '',
      sales_count: sales.count,
      attributed_revenue: sales.revenue,
      commission_due: commissionDue,
    };
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sacode.cantorcaiolacerda.com.br';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-cream-400">
          {items.length} {items.length === 1 ? 'afiliado cadastrado' : 'afiliados cadastrados'}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/afiliados/metas"
            className="inline-flex items-center gap-2 bg-wine-700 hover:bg-wine-900 text-cream-200 border border-mauve-600 font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            🎯 Metas semanais
          </Link>
          <Link
            href="/admin/afiliados/novo"
            className="inline-flex items-center gap-2 bg-amber-sacode-400 hover:bg-amber-sacode-500 text-wine-900 font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            + Novo afiliado
          </Link>
        </div>
      </div>

      <AfiliadosListClient items={items} baseUrl={baseUrl} />
    </div>
  );
}
