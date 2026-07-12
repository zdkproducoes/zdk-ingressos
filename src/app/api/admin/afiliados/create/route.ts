// app/api/admin/afiliados/create/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';

const CODE_REGEX = /^[a-z0-9-]+$/;

export async function POST(request: Request) {
  // 1) Auth central do painel (admin da organização ou superadmin)
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // 2) Body
  let body: {
    name?: string;
    code?: string;
    email?: string | null;
    phone?: string | null;
    commission_percent?: number;
    event_id?: string;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const code = (body.code ?? '').trim().toLowerCase();
  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;
  const commission = Number(body.commission_percent);
  const eventId = body.event_id;
  const notes = body.notes?.trim() || null;

  // 3) Validações
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
  if (!code) return NextResponse.json({ error: 'Code é obrigatório.' }, { status: 400 });
  if (!CODE_REGEX.test(code)) {
    return NextResponse.json(
      { error: 'Code deve conter apenas letras minúsculas, números e hífen.' },
      { status: 400 },
    );
  }
  if (!eventId) return NextResponse.json({ error: 'Evento é obrigatório.' }, { status: 400 });
  if (Number.isNaN(commission) || commission < 0 || commission > 100) {
    return NextResponse.json({ error: 'Comissão deve estar entre 0 e 100.' }, { status: 400 });
  }

  // 4) Escopo: o evento precisa pertencer a uma organização do usuário
  const event = await assertEventInScope(auth.ctx, eventId);
  if (!event) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });

  // 5) Confere code duplicado neste evento (mensagem clara antes de bater na constraint)
  const { data: existing } = await supabaseAdmin
    .from('affiliates')
    .select('id')
    .eq('event_id', eventId)
    .eq('code', code)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `Já existe um afiliado com o code "${code}" neste evento.` },
      { status: 409 },
    );
  }

  // 6) Insere — panel_token e visits têm default no banco
  const { data: created, error: insertError } = await supabaseAdmin
    .from('affiliates')
    .insert({
      name,
      code,
      email,
      phone,
      commission_percent: commission,
      event_id: eventId,
      notes,
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError || !created) {
    return NextResponse.json(
      { error: insertError?.message || 'Erro ao criar afiliado.' },
      { status: 500 },
    );
  }

  revalidatePath('/admin/afiliados');
  return NextResponse.json({ id: created.id }, { status: 201 });
}
