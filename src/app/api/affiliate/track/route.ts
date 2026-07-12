import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AFFILIATE_COOKIE_NAME, AFFILIATE_COOKIE_MAX_AGE } from '@/lib/affiliate';
import { checkRateLimit, getClientIp } from '@/lib/turnstile/ratelimit';

// POST /api/affiliate/track
// Body: { code: string, event_id: string }
//
// Valida via RPC track_affiliate_visit (atomico: insere visita + incrementa contador).
// Se valido, seta cookie ref_code (30 dias, last-click wins).
// Se invalido, NAO seta cookie e retorna 404 sem erro (silencioso pro client).
export async function POST(request: NextRequest) {
  // Protege o contador de visitas (exibido no painel do embaixador)
  // contra inflacao artificial por script. 30 registros / 1h por IP.
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`aff-track:${ip}`, 30))) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  let body: { code?: unknown; event_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_body' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
  const eventId = typeof body.event_id === 'string' ? body.event_id.trim() : '';

  if (!code || !eventId) {
    return NextResponse.json({ ok: false, reason: 'missing_fields' }, { status: 400 });
  }

  // Validacao basica de formato (mesma regra do CHECK do banco) — falha rapido sem ir ao DB
  if (!/^[a-z0-9-]+$/.test(code)) {
    return NextResponse.json({ ok: false, reason: 'invalid_code_format' }, { status: 400 });
  }

  // Captura IP e metadata pro registro
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null;
  const userAgent = request.headers.get('user-agent');
  const referer = request.headers.get('referer');

  // RPC atomico: valida + insere + incrementa
  const { data: affiliateId, error } = await supabaseAdmin.rpc('track_affiliate_visit', {
    p_code: code,
    p_event_id: eventId,
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
    p_referer: referer,
  });

  if (error) {
    console.error('[affiliate/track] RPC error:', error);
    return NextResponse.json({ ok: false, reason: 'rpc_error' }, { status: 500 });
  }

  // RPC devolve NULL quando o code nao existe pro evento ou esta inativo
  if (!affiliateId) {
    return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 });
  }

  // Valido: seta o cookie (last-click wins)
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AFFILIATE_COOKIE_NAME,
    value: code,
    path: '/',
    maxAge: AFFILIATE_COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: false, // false pq client tambem pode ler (debug, futuro UI "voce esta sendo indicado por X")
  });
  return response;
}