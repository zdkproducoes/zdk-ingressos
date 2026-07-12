// app/api/admin/eventos/select/route.ts
// Define qual evento o painel admin esta gerenciando (cookie).
import { NextResponse } from 'next/server';
import { ADMIN_EVENT_COOKIE } from '@/lib/admin/selected-event';
import { requirePanelApi } from '@/lib/auth/panel';
import { assertEventInScope } from '@/lib/auth/scope';

export async function POST(request: Request) {
  const auth = await requirePanelApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { event_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const eventId = typeof body.event_id === 'string' ? body.event_id : '';
  if (!eventId) return NextResponse.json({ error: 'event_id é obrigatório.' }, { status: 400 });

  // Escopo: só permite selecionar evento da própria organização
  const event = await assertEventInScope(auth.ctx, eventId);
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
