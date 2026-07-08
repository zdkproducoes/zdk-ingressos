// app/api/admin/eventos/select/route.ts
// Define qual evento o painel admin esta gerenciando (cookie).
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ADMIN_EVENT_COOKIE } from '@/lib/admin/selected-event';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin' && profile?.role !== 'producer') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  let body: { event_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const eventId = typeof body.event_id === 'string' ? body.event_id : '';
  if (!eventId) return NextResponse.json({ error: 'event_id é obrigatório.' }, { status: 400 });

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });

  const response = NextResponse.json({ ok: true, title: event.title });
  response.cookies.set({
    name: ADMIN_EVENT_COOKIE,
    value: event.id,
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    sameSite: 'lax',
    httpOnly: true,
  });
  return response;
}
