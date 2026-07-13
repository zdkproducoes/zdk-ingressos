// POST /api/conta/email/solicitar — inicia a troca de e-mail.
// Exige a senha atual; envia o link de confirmação para o e-mail NOVO
// (a troca só acontece quando o novo endereço for validado).
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resend, EMAIL_FROM } from '@/lib/email/resend';
import { renderEmailChangeEmail } from '@/emails/email-change';
import { verifyCurrentPassword } from '@/lib/conta/verify-password';
import { createChangeToken, newEmailToken } from '@/lib/conta/tokens';
import { checkRateLimit } from '@/lib/turnstile/ratelimit';
import { platform } from '@/lib/config';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const allowed = await checkRateLimit(`email-change:${user.id}`, 3);
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas solicitações. Aguarde alguns minutos.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const newEmail = typeof body.new_email === 'string' ? body.new_email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!EMAIL_RE.test(newEmail)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  if (newEmail === user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Esse já é o seu e-mail atual.' }, { status: 400 });
  }
  if (!(await verifyCurrentPassword(user.email, password))) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 403 });
  }

  // Novo e-mail não pode pertencer a outra conta
  const { data: taken } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('email', newEmail)
    .neq('id', user.id)
    .maybeSingle();
  if (taken) {
    return NextResponse.json({ error: 'Este e-mail já está em uso em outra conta.' }, { status: 409 });
  }

  const token = newEmailToken();
  const created = await createChangeToken(user.id, 'email', newEmail, token);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 500 });

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('first_name').eq('id', user.id).single();

  const confirmUrl = `${platform.baseUrl}/api/conta/email/confirmar?token=${token}`;
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: newEmail,
      subject: `Confirme seu novo e-mail — ${platform.name}`,
      html: renderEmailChangeEmail({ firstName: profile?.first_name || 'Cliente', confirmUrl }),
    });
  } catch (err) {
    console.error('[conta/email] resend', err);
    return NextResponse.json({ error: 'Falha ao enviar o e-mail de confirmação. Tente de novo.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sent_to: newEmail });
}
