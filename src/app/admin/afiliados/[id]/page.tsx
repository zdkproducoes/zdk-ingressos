// app/admin/afiliados/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AfiliadoEditClient } from '@/components/admin/AfiliadoEditClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Afiliado — Admin SACODE' };

export type AfiliadoDetail = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  commission_percent: number;
  is_active: boolean;
  is_staff: boolean;
  visits: number;
  notes: string | null;
  panel_token: string;
  event_id: string;
  event_title: string;
  event_slug: string;
  created_at: string;
};

export type AfiliadoSale = {
  order_id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  total: number;
  service_fee: number;
  created_at: string;
};

export default async function AfiliadoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1) Afiliado + evento
  const { data: aff } = await supabaseAdmin
    .from('affiliates')
    .select('id, code, name, email, phone, commission_percent, is_active, is_staff, visits, notes, panel_token, event_id, created_at, events!inner(title, slug)')
    .eq('id', id)
    .maybeSingle();

  if (!aff) notFound();

  const eventRel = Array.isArray(aff.events) ? aff.events[0] : aff.events;

  const afiliado: AfiliadoDetail = {
    id: aff.id,
    code: aff.code,
    name: aff.name,
    email: aff.email,
    phone: aff.phone,
    commission_percent: Number(aff.commission_percent),
    is_active: aff.is_active,
    is_staff: Boolean(aff.is_staff),
    visits: aff.visits ?? 0,
    notes: aff.notes,
    panel_token: aff.panel_token,
    event_id: aff.event_id,
    event_title: eventRel?.title ?? '—',
    event_slug: eventRel?.slug ?? '',
    created_at: aff.created_at,
  };

  // 2) Últimas vendas (pedidos aprovados deste afiliado neste evento).
  // Nome/e-mail do comprador vêm do perfil — orders não tem essas colunas.
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, total, service_fee, created_at, profiles:customer_id(full_name, email)')
    .eq('payment_status', 'approved')
    .eq('affiliate_code', afiliado.code)
    .eq('event_id', afiliado.event_id)
    .order('created_at', { ascending: false })
    .limit(50);

  const sales: AfiliadoSale[] = (orders ?? []).map((o) => {
    const prof = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    return {
      order_id: o.id,
      buyer_name: prof?.full_name ?? null,
      buyer_email: prof?.email ?? null,
      total: Number(o.total ?? 0),
      service_fee: Number(o.service_fee ?? 0),
      created_at: o.created_at,
    };
  });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sacode.cantorcaiolacerda.com.br';

  return (
    <div>
      <Link
        href="/admin/afiliados"
        className="inline-flex items-center gap-1.5 text-sm text-cream-400 hover:text-cream-200 transition mb-4"
      >
        <ArrowLeft size={16} /> Voltar para a lista
      </Link>

      <AfiliadoEditClient afiliado={afiliado} sales={sales} baseUrl={baseUrl} />
    </div>
  );
}
