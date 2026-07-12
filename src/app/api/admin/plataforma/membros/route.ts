// Superadmin: gerenciar membros das organizações.
// POST adiciona (busca profile por e-mail; promove 'customer' → 'producer').
// DELETE remove o vínculo.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requirePanelApi } from '@/lib/auth/panel';

const ORG_ROLES = ['owner', 'admin', 'staff', 'checkin'];

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
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' ? body.role : 'admin';

  if (!organizationId || !email) {
    return NextResponse.json({ error: 'organization_id e email são obrigatórios.' }, { status: 400 });
  }
  if (!ORG_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Papel inválido.' }, { status: 400 });
  }

  const { data: org } = await supabaseAdmin
    .from('organizations').select('id, name').eq('id', organizationId).maybeSingle();
  if (!org) return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, first_name, last_name, email')
    .ilike('email', email)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json(
      { error: 'Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar na plataforma primeiro.' },
      { status: 404 },
    );
  }

  const { error: insertError } = await supabaseAdmin
    .from('organization_members')
    .insert({ organization_id: organizationId, user_id: profile.id, role });
  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Essa pessoa já é membro desta organização.' }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Comprador vira producer para poder entrar no painel (superadmin/checkin ficam como estão)
  if (profile.role === 'customer') {
    await supabaseAdmin.from('profiles').update({ role: 'producer' }).eq('id', profile.id);
  }

  revalidatePath('/admin/plataforma');
  return NextResponse.json({
    ok: true,
    member: { name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(), email: profile.email, role },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const memberId = req.nextUrl.searchParams.get('id') ?? '';
  if (!memberId) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });

  const { error } = await supabaseAdmin.from('organization_members').delete().eq('id', memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/admin/plataforma');
  return NextResponse.json({ ok: true });
}
