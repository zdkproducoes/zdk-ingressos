import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Logout server-side: apaga os cookies HttpOnly da sessao (o client-side nao consegue)
// e faz um redirect 303 pra home, forcando recarregamento real da pagina.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), 303);
}
