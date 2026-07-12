// Superadmin: criar e editar organizações (produtores) da plataforma.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requirePanelApi } from '@/lib/auth/panel';

const SLUG_REGEX = /^[a-z0-9-]+$/;

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
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const document = typeof body.document === 'string' ? body.document.trim() || null : null;
  const contactEmail = typeof body.contact_email === 'string' ? body.contact_email.trim() || null : null;
  const fee = Number(body.platform_fee_percent ?? 10);

  if (!name) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
  if (!slug || !SLUG_REGEX.test(slug)) {
    return NextResponse.json({ error: 'Slug inválido (letras minúsculas, números e hífen).' }, { status: 400 });
  }
  if (Number.isNaN(fee) || fee < 0 || fee > 100) {
    return NextResponse.json({ error: 'Taxa deve estar entre 0 e 100.' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('organizations').select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `Já existe uma organização com o slug "${slug}".` }, { status: 409 });
  }

  const { data: created, error } = await supabaseAdmin
    .from('organizations')
    .insert({ name, slug, document, contact_email: contactEmail, platform_fee_percent: fee })
    .select('id')
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Erro ao criar organização.' }, { status: 500 });
  }

  revalidatePath('/admin/plataforma');
  return NextResponse.json({ id: created.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.document === 'string') updates.document = body.document.trim() || null;
  if (typeof body.contact_email === 'string') updates.contact_email = body.contact_email.trim() || null;
  if (body.platform_fee_percent !== undefined) {
    const fee = Number(body.platform_fee_percent);
    if (Number.isNaN(fee) || fee < 0 || fee > 100) {
      return NextResponse.json({ error: 'Taxa deve estar entre 0 e 100.' }, { status: 400 });
    }
    updates.platform_fee_percent = fee;
  }
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
  // brand/payout_info chegam como objeto JSON (textarea validada no client)
  if (body.brand && typeof body.brand === 'object') updates.brand = body.brand;
  if (body.payout_info && typeof body.payout_info === 'object') updates.payout_info = body.payout_info;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin.from('organizations').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/admin/plataforma');
  return NextResponse.json({ ok: true });
}
