// POST /api/conta/telefone/solicitar — inicia a troca de celular.
// Envia um código de 6 dígitos por SMS ou WhatsApp para o número NOVO.
// Sem provedor configurado (Twilio): em produção retorna indisponível;
// em desenvolvimento devolve o código na resposta para teste.
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createChangeToken, newPhoneCode } from '@/lib/conta/tokens';
import { sendVerificationCode, smsProviderConfigured, type SmsChannel } from '@/lib/conta/sms';
import { checkRateLimit } from '@/lib/turnstile/ratelimit';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const allowed = await checkRateLimit(`phone-change:${user.id}`, 3);
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas solicitações. Aguarde alguns minutos.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const channel: SmsChannel = body.channel === 'whatsapp' ? 'whatsapp' : 'sms';
  const rawPhone = typeof body.new_phone === 'string' ? body.new_phone : '';
  const digits = rawPhone.replace(/\D/g, '');

  // Aceita com ou sem DDI; normaliza para 55DDDNÚMERO
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!/^55\d{10,11}$/.test(phone)) {
    return NextResponse.json(
      { error: 'Celular inválido. Use DDD + número (ex.: 11 91234-5678).' },
      { status: 400 },
    );
  }

  const code = newPhoneCode();
  const created = await createChangeToken(user.id, 'phone', phone, code);
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 500 });

  if (!smsProviderConfigured(channel)) {
    if (process.env.NODE_ENV !== 'production') {
      // Modo dev sem Twilio: devolve o código pra permitir testar o fluxo
      return NextResponse.json({ ok: true, dev_code: code, channel });
    }
    return NextResponse.json(
      { error: 'Verificação por celular temporariamente indisponível. Tente mais tarde.' },
      { status: 503 },
    );
  }

  const sent = await sendVerificationCode(phone, code, channel);
  if (!sent.sent) {
    return NextResponse.json(
      { error: 'Não conseguimos enviar o código agora. Tente novamente em instantes.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, channel });
}
