// app/api/admin/eventos/[id]/route.ts
// Muda o status de um evento (ciclo: draft -> active -> finished).
// 'finished' = arquivado: sai do ar (página pública e checkout só aceitam 'active'),
// mas todos os dados (pedidos, compradores, lotes) continuam no banco.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';
import { parseContentFields, type ContentFormFields } from '@/lib/admin/event-content';
import { sanitizeEventHtml, htmlToPlainText } from '@/lib/admin/sanitize-html';
import { CATEGORY_SLUGS } from '@/lib/categories';

// Ciclo: draft -> pending (produtor envia p/ aprovação) -> active (superadmin publica) -> finished.
// Publicar ('active') é exclusivo do superadmin; o produtor só chega até 'pending'.
const ALLOWED_STATUS = ['draft', 'pending', 'active', 'finished'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePanelApi({ minOrgRole: 'admin' });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  let body: { action?: unknown; status?: unknown; category?: unknown; featured_order?: unknown } & ContentFormFields;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  // Escopo: o evento precisa pertencer a uma organização do usuário
  const existing = await assertEventInScope(auth.ctx, id);
  if (!existing) {
    return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
  }

  if (body.action === 'set_status') {
    const newStatus = typeof body.status === 'string' ? body.status : '';
    if (!ALLOWED_STATUS.includes(newStatus as (typeof ALLOWED_STATUS)[number])) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    // Só o superadmin da plataforma publica um evento (deixa 'active').
    // O produtor cria/edita e envia para aprovação ('pending'); a publicação
    // fica a cargo do superadmin.
    if (newStatus === 'active' && !auth.ctx.isSuperadmin) {
      return NextResponse.json(
        { error: 'Apenas o superadmin da plataforma publica eventos. Envie para aprovação.' },
        { status: 403 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'active' && existing.status !== 'active'
          ? { published_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    revalidatePath('/admin/eventos');
    revalidatePath('/');
    return NextResponse.json({ ok: true, status: newStatus });
  }

  // Destaque no carrossel da home (espaço pago) — só o superadmin da plataforma
  if (body.action === 'set_featured') {
    if (!auth.ctx.isSuperadmin) {
      return NextResponse.json(
        { error: 'Apenas o superadmin da plataforma define destaques da home.' },
        { status: 403 },
      );
    }

    const raw = body.featured_order;
    const featured = raw === null || raw === '' || raw === undefined ? null : Number(raw);
    if (featured !== null && (!Number.isInteger(featured) || featured < 1 || featured > 5)) {
      return NextResponse.json({ error: 'Posição de destaque inválida (1 a 5).' }, { status: 400 });
    }

    // Posição única: libera o evento que estiver ocupando a mesma vaga
    if (featured !== null) {
      const { error: clearError } = await supabaseAdmin
        .from('events')
        .update({ featured_order: null })
        .eq('featured_order', featured)
        .neq('id', id);
      if (clearError) {
        return NextResponse.json({ error: clearError.message }, { status: 500 });
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({ featured_order: featured, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    revalidatePath('/admin/eventos');
    revalidatePath('/');
    return NextResponse.json({ ok: true, featured_order: featured });
  }

  // Atualiza o conteúdo da página pública do evento
  if (body.action === 'update_content') {
    const parsed = parseContentFields(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const rawCategory = body.category;
    const category = typeof rawCategory === 'string' && rawCategory.trim() ? rawCategory.trim() : null;
    if (category && !CATEGORY_SLUGS.includes(category)) {
      return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });
    }

    // Preserva os campos de content que o formulário não edita (ex.: seo_keywords),
    // já que parseContentFields monta um content novo só com os campos do form.
    const { data: cur } = await supabaseAdmin.from('events').select('content').eq('id', id).single();
    const curContent = (cur?.content ?? {}) as Record<string, unknown>;
    const content: Record<string, unknown> = { ...parsed.columns.content };
    if (Array.isArray(curContent.seo_keywords) && curContent.seo_keywords.length) {
      content.seo_keywords = curContent.seo_keywords;
    }

    // Sanitiza a copy rica (renderizada na página pública) e deriva a
    // description (meta/SEO) do texto limpo.
    let description: string | undefined;
    if (typeof content.about_html === 'string' && content.about_html.trim()) {
      const clean = sanitizeEventHtml(content.about_html);
      if (clean) {
        content.about_html = clean;
        description = htmlToPlainText(clean);
      } else {
        delete content.about_html;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        ...parsed.columns,
        content,
        category,
        ...(description !== undefined ? { description } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    revalidatePath('/admin/eventos');
    revalidatePath(`/evento/${existing.slug}`);
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
}
