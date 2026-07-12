// Superadmin: registrar repasses (payouts) aos produtores e marcar como pagos.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requirePanelApi } from '@/lib/auth/panel';

async function requireSuperadmin() {
  const auth = await requirePanelApi();
  if (!auth.ok) return auth;
  if (!auth.ctx.isSuperadmin) {
    return { ok: false as const, error: 'Sem permissão.', status: 403 as const };
  }
  return auth;
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const organizationId = typeof body.organization_id === 'string' ? body.organization_id : '';
  const eventId = typeof body.event_id === 'string' && body.event_id ? body.event_id : null;
  const gross = Number(body.gross_amount);
  const fee = Number(body.platform_fee);
  const mpFees = Number(body.mp_fees ?? 0);
  const net = Number(body.net_amount);
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
  const periodStart = typeof body.period_start === 'string' && body.period_start ? body.period_start : null;
  const periodEnd = typeof body.period_end === 'string' && body.period_end ? body.period_end : null;

  if (!organizationId) return NextResponse.json({ error: 'organization_id é obrigatório.' }, { status: 400 });
  for (const [label, v] of [['Bruto', gross], ['Taxa', fee], ['Tarifas MP', mpFees], ['Líquido', net]] as const) {
    if (Number.isNaN(v) || v < 0) {
      return NextResponse.json({ error: `${label} inválido.` }, { status: 400 });
    }
  }

  const { data: org } = await supabaseAdmin
    .from('organizations').select('id').eq('id', organizationId).maybeSingle();
  if (!org) return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });

  if (eventId) {
    const { data: ev } = await supabaseAdmin
      .from('events').select('id, organization_id').eq('id', eventId).maybeSingle();
    if (!ev || ev.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Evento não pertence a esta organização.' }, { status: 400 });
    }
  }

  const { data: created, error } = await supabaseAdmin
    .from('payouts')
    .insert({
      organization_id: organizationId,
      event_id: eventId,
      period_start: periodStart,
      period_end: periodEnd,
      gross_amount: gross,
      platform_fee: fee,
      mp_fees: mpFees,
      net_amount: net,
      notes,
      created_by: auth.ctx.user.id,
    })
    .select('id')
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Erro ao registrar repasse.' }, { status: 500 });
  }

  revalidatePath('/admin/plataforma');
  revalidatePath('/admin/financeiro');
  return NextResponse.json({ id: created.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const action = typeof body.action === 'string' ? body.action : '';
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });

  if (action === 'mark_paid') {
    const receiptUrl = typeof body.receipt_url === 'string' ? body.receipt_url.trim() || null : null;
    const { error } = await supabaseAdmin
      .from('payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString(), receipt_url: receiptUrl })
      .eq('id', id)
      .eq('status', 'pending');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === 'cancel') {
    const { error } = await supabaseAdmin
      .from('payouts')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
  }

  revalidatePath('/admin/plataforma');
  revalidatePath('/admin/financeiro');
  return NextResponse.json({ ok: true });
}
