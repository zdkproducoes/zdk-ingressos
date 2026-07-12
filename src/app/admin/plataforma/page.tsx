// Tela do superadmin: organizações (criar, taxa, membros), GMV por org e
// registro de repasses. Só profiles.role === 'admin'.
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requirePanelContext } from '@/lib/auth/panel';
import { PlataformaClient, type OrgAdminItem } from '@/components/admin/PlataformaClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plataforma — Painel' };

export default async function PlataformaPage() {
  const ctx = await requirePanelContext();
  if (!ctx.isSuperadmin) redirect('/admin');

  const [{ data: orgs }, { data: members }, { data: events }, { data: orders }, { data: payouts }] =
    await Promise.all([
      supabaseAdmin
        .from('organizations')
        .select('id, name, slug, document, contact_email, platform_fee_percent, is_active, created_at')
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('organization_members')
        .select('id, organization_id, role, profiles(first_name, last_name, email)'),
      supabaseAdmin
        .from('events')
        .select('id, title, organization_id')
        .order('event_date', { ascending: false }),
      supabaseAdmin
        .from('orders')
        .select('event_id, total, is_courtesy, payment_status')
        .eq('payment_status', 'approved')
        .eq('is_courtesy', false)
        .range(0, 49999),
      supabaseAdmin
        .from('payouts')
        .select('id, organization_id, gross_amount, platform_fee, mp_fees, net_amount, status, paid_at, notes, period_start, period_end, events(title)')
        .order('created_at', { ascending: false }),
    ]);

  // GMV por organização (via event → org)
  const orgByEvent = new Map<string, string>();
  for (const e of events ?? []) {
    if (e.organization_id) orgByEvent.set(e.id, e.organization_id);
  }
  const gmvByOrg = new Map<string, number>();
  for (const o of orders ?? []) {
    const orgId = orgByEvent.get(o.event_id);
    if (!orgId) continue;
    gmvByOrg.set(orgId, (gmvByOrg.get(orgId) ?? 0) + Number(o.total ?? 0));
  }

  const items: OrgAdminItem[] = (orgs ?? []).map((org) => {
    const gmv = gmvByOrg.get(org.id) ?? 0;
    const fee = Number(org.platform_fee_percent ?? 0);
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      document: org.document,
      contact_email: org.contact_email,
      platform_fee_percent: fee,
      is_active: org.is_active,
      gmv,
      estimated_fee: gmv * (fee / 100),
      members: ((members ?? []) as any[])
        .filter((m) => m.organization_id === org.id)
        .map((m) => {
          const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return {
            id: m.id,
            role: m.role,
            name: `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || (p?.email ?? '—'),
            email: p?.email ?? '',
          };
        }),
      events: ((events ?? []) as any[])
        .filter((e) => e.organization_id === org.id)
        .map((e) => ({ id: e.id, title: e.title })),
      payouts: ((payouts ?? []) as any[])
        .filter((p) => p.organization_id === org.id)
        .map((p) => ({
          id: p.id,
          gross_amount: Number(p.gross_amount ?? 0),
          platform_fee: Number(p.platform_fee ?? 0),
          mp_fees: Number(p.mp_fees ?? 0),
          net_amount: Number(p.net_amount ?? 0),
          status: p.status,
          paid_at: p.paid_at,
          notes: p.notes,
          period_start: p.period_start,
          period_end: p.period_end,
          event_title: (Array.isArray(p.events) ? p.events[0]?.title : p.events?.title) ?? null,
        })),
    };
  });

  return <PlataformaClient items={items} />;
}
