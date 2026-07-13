// Envio do código de verificação de celular via Twilio (SMS ou WhatsApp).
// Sem credenciais configuradas: em produção o recurso fica indisponível;
// em desenvolvimento o código volta na resposta para permitir o teste.
//
// Envs: TWILIO_ACCOUNT_SID · TWILIO_AUTH_TOKEN ·
//       TWILIO_SMS_FROM (ex.: +14155550100) ·
//       TWILIO_WHATSAPP_FROM (ex.: whatsapp:+14155550100, opcional)
import { platform } from '@/lib/config';

export type SmsChannel = 'sms' | 'whatsapp';

type SendResult =
  | { sent: true }
  | { sent: false; reason: 'no_provider' | 'provider_error'; detail?: string };

export function smsProviderConfigured(channel: SmsChannel): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = channel === 'whatsapp' ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM;
  return Boolean(sid && token && from);
}

/** phone: só dígitos com DDI (ex.: 5511999990000) */
export async function sendVerificationCode(
  phone: string,
  code: string,
  channel: SmsChannel,
): Promise<SendResult> {
  if (!smsProviderConfigured(channel)) return { sent: false, reason: 'no_provider' };

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = channel === 'whatsapp'
    ? process.env.TWILIO_WHATSAPP_FROM!
    : process.env.TWILIO_SMS_FROM!;
  const to = channel === 'whatsapp' ? `whatsapp:+${phone}` : `+${phone}`;

  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: `${platform.name}: seu código de verificação é ${code}. Ele expira em 10 minutos. Não compartilhe.`,
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[conta/sms] twilio error', res.status, detail.slice(0, 300));
      return { sent: false, reason: 'provider_error', detail: `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('[conta/sms] twilio fetch', err);
    return { sent: false, reason: 'provider_error' };
  }
}
