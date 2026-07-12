// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resend, EMAIL_FROM } from '@/lib/email/resend';
import { renderConfirmationEmail } from '@/emails/confirmation';
import { verifyTurnstile } from '@/lib/turnstile/verify';
import { checkRateLimit, getClientIp } from '@/lib/turnstile/ratelimit';

export const runtime = 'nodejs';

type Body = {
  firstName: string; lastName: string; email: string; phone: string; cpf: string;
  birthDate: string; gender: string; city: string; neighborhood?: string;
  state: string; referralSource: string; password: string;
  marketingConsent: boolean; turnstileToken: string;
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Rate limit: 5 cadastros / hora / IP
  const rlOk = await checkRateLimit(`signup:${ip}`, 5);
  if (!rlOk) return NextResponse.json({ error: 'Muitas tentativas. Aguarde 1 hora e tente novamente.' }, { status: 429 });

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  // Valida Turnstile
  const turnstileOk = await verifyTurnstile(body.turnstileToken, ip);
  if (!turnstileOk) return NextResponse.json({ error: 'Verificação anti-robô falhou. Recarregue e tente novamente.' }, { status: 400 });

  // Validação dos campos
  const required = ['firstName','lastName','email','phone','cpf','birthDate','gender','city','state','referralSource','password'] as const;
  for (const f of required) {
    if (!body[f] || String(body[f]).trim() === '') return NextResponse.json({ error: `Campo obrigatório: ${f}` }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
  if (body.cpf.length !== 11) return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
  if (body.password.length < 8) return NextResponse.json({ error: 'Senha deve ter ao menos 8 caracteres' }, { status: 400 });

  // CPF duplicado
  const { data: existingCpf } = await supabaseAdmin.from('profiles').select('id').eq('cpf', body.cpf).maybeSingle();
  if (existingCpf) {
    return NextResponse.json({
      error: 'Já existe uma conta com este CPF. Se você já confirmou seu cadastro, faça login ou use "Esqueci minha senha". Se não recebeu o e-mail de confirmação ou digitou o e-mail errado no cadastro, fale com a gente em suporte@zdkproducoes.com.br que ajudamos você.',
    }, { status: 409 });
  }

  const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`;

  // Cria usuário — passa TUDO no user_metadata pra trigger handle_new_user usar
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: false,
    user_metadata: {
      full_name: fullName,
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      cpf: body.cpf,
      phone: body.phone,
      role: 'customer',
    },
  });
  if (authErr || !authData?.user) {
    if (authErr?.message?.toLowerCase().includes('already')) return NextResponse.json({ error: 'Já existe uma conta com este e-mail. Faça login ou use "Esqueci minha senha". Em caso de dúvida, fale com a gente em suporte@zdkproducoes.com.br.' }, { status: 409 });
    console.error('createUser', authErr);
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
  const userId = authData.user.id;

  // A trigger 'handle_new_user' já criou o profile com id, full_name, cpf, phone, email, role.
  // Agora só fazemos UPDATE complementar com os campos extras (data nascimento, cidade, etc.)
  const { error: profileErr } = await supabaseAdmin.from('profiles').update({
    first_name: body.firstName.trim(),
    last_name: body.lastName.trim(),
    birth_date: body.birthDate,
    gender: body.gender,
    city: body.city.trim(),
    neighborhood: body.neighborhood?.trim() || null,
    state: body.state,
    referral_source: body.referralSource,
    marketing_consent: !!body.marketingConsent,
  }).eq('id', userId);

  if (profileErr) {
    console.error('profile update', profileErr);
    // Não desfazemos o auth.user pois o profile básico já foi criado pela trigger; só logamos
    return NextResponse.json({ error: 'Erro ao salvar dados adicionais do perfil' }, { status: 500 });
  }

  // Envia e-mail de confirmação
  await sendConfirmation(userId, body.email, body.firstName);

  return NextResponse.json({ ok: true, userId });
}

async function sendConfirmation(userId: string, email: string, firstName: string) {
  const token = randomBytes(32).toString('hex');
  await supabaseAdmin.from('email_confirmations').insert({ user_id: userId, email, token });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zdkingressos.com.br';
  const confirmUrl = `${baseUrl}/auth/confirmar?token=${token}`;
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Confirme seu cadastro',
      html: renderConfirmationEmail({ firstName, confirmUrl }),
    });
  } catch (err) { console.error('resend', err); }
}