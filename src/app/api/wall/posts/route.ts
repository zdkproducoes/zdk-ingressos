// app/api/wall/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/turnstile/ratelimit';

export const runtime = 'nodejs';

// LISTAR posts (top-level) ou replies (com parentId)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get('eventId');
  const parentId = url.searchParams.get('parentId');
  const cursor = url.searchParams.get('cursor');     // ISO timestamp
  const limit = Math.min(50, Number(url.searchParams.get('limit') || 20));
  if (!eventId) return NextResponse.json({ error: 'eventId obrigatório' }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // Verifica que o usuário comprou ingresso
  const { data: hasTicket } = await supabaseAdmin.rpc('user_has_paid_ticket', {
    p_user_id: user.id, p_event_id: eventId,
  });
  if (!hasTicket) return NextResponse.json({ error: 'Apenas quem comprou ingresso pode ver o mural' }, { status: 403 });

  let q = supabaseAdmin.from('wall_posts')
    .select(`
      id, content, image_url, like_count, reply_count, created_at, parent_id,
      author_id, profiles!wall_posts_author_id_fkey ( first_name, last_name, avatar_url, avatar_url_self )
    `)
    .eq('event_id', eventId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: parentId ? true : false })
    .limit(limit);

  if (parentId) q = q.eq('parent_id', parentId);
  else q = q.is('parent_id', null);
  if (cursor) q = parentId ? q.gt('created_at', cursor) : q.lt('created_at', cursor);

  const { data: posts, error } = await q;
  if (error) { console.error(error); return NextResponse.json({ error: 'Erro ao listar' }, { status: 500 }); }

  // Pega quais posts o usuário curtiu
  const postIds = (posts || []).map(p => p.id);
  let likedSet = new Set<string>();
  if (postIds.length) {
    const { data: likes } = await supabaseAdmin.from('wall_likes')
      .select('post_id').eq('user_id', user.id).in('post_id', postIds);
    likedSet = new Set((likes || []).map(l => l.post_id));
  }

  return NextResponse.json({
    posts: (posts || []).map((p: any) => ({
      id: p.id, content: p.content, imageUrl: p.image_url,
      likeCount: p.like_count, replyCount: p.reply_count,
      createdAt: p.created_at, parentId: p.parent_id,
      isOwn: p.author_id === user.id,
      liked: likedSet.has(p.id),
      author: {
        firstName: p.profiles?.first_name || 'Usuário',
        lastName: p.profiles?.last_name || '',
        avatarUrl: p.profiles?.avatar_url_self || p.profiles?.avatar_url || null,
      },
    })),
    nextCursor: posts && posts.length === limit ? posts[posts.length - 1].created_at : null,
  });
}

// CRIAR post ou reply
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!(await checkRateLimit(`wall-post:${ip}`, 30))) {
    return NextResponse.json({ error: 'Você está postando rápido demais. Aguarde.' }, { status: 429 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { eventId, content, imageUrl, parentId } = await req.json().catch(() => ({}));
  if (!eventId) return NextResponse.json({ error: 'eventId obrigatório' }, { status: 400 });
  const trimmed = (content || '').trim();
  if (!trimmed && !imageUrl) return NextResponse.json({ error: 'Escreva algo ou adicione uma foto' }, { status: 400 });
  if (trimmed.length > 2000) return NextResponse.json({ error: 'Texto muito longo (máx 2000)' }, { status: 400 });

  const { data: hasTicket } = await supabaseAdmin.rpc('user_has_paid_ticket', {
    p_user_id: user.id, p_event_id: eventId,
  });
  if (!hasTicket) return NextResponse.json({ error: 'Apenas quem comprou ingresso pode postar' }, { status: 403 });

  // Se é reply, valida que o parent existe e é desse evento
  if (parentId) {
    const { data: parent } = await supabaseAdmin.from('wall_posts')
      .select('id, event_id, parent_id').eq('id', parentId).maybeSingle();
    if (!parent || parent.event_id !== eventId) return NextResponse.json({ error: 'Post pai inválido' }, { status: 400 });
    // Não permite reply de reply (1 nível só)
    if (parent.parent_id) return NextResponse.json({ error: 'Não é possível responder a uma resposta' }, { status: 400 });
  }

  const { data: post, error } = await supabaseAdmin.from('wall_posts').insert({
    event_id: eventId,
    author_id: user.id,
    parent_id: parentId || null,
    content: trimmed || ' ',
    image_url: imageUrl || null,
  }).select('id, created_at').single();

  if (error) { console.error(error); return NextResponse.json({ error: 'Erro ao publicar' }, { status: 500 }); }
  return NextResponse.json({ ok: true, id: post.id, createdAt: post.created_at });
}

// DELETAR post (próprio autor ou admin)
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { postId } = await req.json().catch(() => ({}));
  if (!postId) return NextResponse.json({ error: 'postId obrigatório' }, { status: 400 });

  const { data: post } = await supabaseAdmin.from('wall_posts').select('author_id').eq('id', postId).maybeSingle();
  if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });

  // Verifica se é o autor OU admin
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'producer';

  if (post.author_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  await supabaseAdmin.from('wall_posts').update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: user.id,
    deletion_reason: isAdmin && post.author_id !== user.id ? 'admin' : 'self',
  }).eq('id', postId);

  return NextResponse.json({ ok: true });
}
