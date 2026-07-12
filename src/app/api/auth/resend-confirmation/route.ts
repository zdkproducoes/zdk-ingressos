// app/api/auth/resend-confirmation/route.ts
// Reenvia e-mail de confirmação. Cooldown de 60 segundos por usuário.
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resend, EMAIL_FROM } from '@/lib/email/resend';
import { renderConfirmationEmail } from '@/emails/confirmation';
import { checkRateLimit, getClientIp } from '@/lib/turnstile/ratelimit';

export const runtime = 'nodejs';

const COOLDOWN_SECONDS = 60;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Rate limit duro por IP: 10/hora
  const rlOk = await checkRateLimit(`resend-conf:${ip}`, 10);
  if (!rlOk) return NextResponse.json({ error: 'Muitas tentativas. Aguarde.' }, { status: 429 });

  const { email } = await req.json().catch(() => ({}));
  if (!email || typeof email !== 'string') return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 });

  // Acha o usuário
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, email, email_confirmed_at')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  // Sempre retorna OK pra não revelar se o e-mail existe (proteção contra enumeration)
  if (!profile) return NextResponse.json({ ok: true, cooldown: COOLDOWN_SECONDS });
  if (profile.email_confirmed_at) {
    return NextResponse.json({ ok: true, alreadyConfirmed: true, cooldown: 0 });
  }

  // Verifica cooldown: vê se já mandou nos últimos 60s
  const { data: recent } = await supabaseAdmin
    .from('email_confirmations')
    .select('id, last_sent_at, token, confirmed_at')
    .eq('user_id', profile.id)
    .order('last_sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent && recent.last_sent_at) {
    const elapsed = (Date.now() - new Date(recent.last_sent_at).getTime()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      return NextResponse.json({
        ok: false,
        error: `Aguarde ${Math.ceil(COOLDOWN_SECONDS - elapsed)} segundos para reenviar.`,
        cooldown: Math.ceil(COOLDOWN_SECONDS - elapsed),
      }, { status: 429 });
    }
  }

  // Reusa o token mais recente se ainda válido e não confirmado, ou cria novo
  let token: string;
  if (!recent || !recent.token || recent.confirmed_at) {
    token = randomBytes(32).toString('hex');
    await supabaseAdmin.from('email_confirmations').insert({
      user_id: profile.id,
      email: profile.email,
      token,
    });
  } else {
    token = recent.token;
    // Atualiza last_sent_at
    await supabaseAdmin.from('email_confirmations')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', recent.id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zdkingressos.com.br';
  const confirmUrl = `${baseUrl}/auth/confirmar?token=${token}`;
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: profile.email!,
      subject: 'Confirme seu cadastro',
      html: renderConfirmationEmail({ firstName: profile.first_name || 'Cliente', confirmUrl }),
    });
  } catch (err) {
    console.error('resend', err);
    return NextResponse.json({ error: 'Falha ao enviar e-mail' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cooldown: COOLDOWN_SECONDS });
}