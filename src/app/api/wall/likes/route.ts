// app/api/wall/likes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { postId, action } = await req.json().catch(() => ({}));
  if (!postId || !['like','unlike'].includes(action)) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  // Verifica permissão (que comprou ingresso pro evento desse post)
  const { data: post } = await supabaseAdmin.from('wall_posts').select('event_id').eq('id', postId).maybeSingle();
  if (!post) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
  const { data: hasTicket } = await supabaseAdmin.rpc('user_has_paid_ticket', {
    p_user_id: user.id, p_event_id: post.event_id,
  });
  if (!hasTicket) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  if (action === 'like') {
    // upsert para evitar duplicata
    await supabaseAdmin.from('wall_likes').upsert({ post_id: postId, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
  } else {
    await supabaseAdmin.from('wall_likes').delete().eq('post_id', postId).eq('user_id', user.id);
  }

  // Retorna contagem atualizada
  const { data: updated } = await supabaseAdmin.from('wall_posts').select('like_count').eq('id', postId).single();
  return NextResponse.json({ ok: true, likeCount: updated?.like_count ?? 0 });
}
