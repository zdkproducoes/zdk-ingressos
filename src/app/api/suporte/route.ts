// app/api/suporte/route.ts
// Recebe o formulário "Precisa de ajuda?" (botão flutuante) e envia a
// solicitação por e-mail para a caixa de suporte da plataforma.
import { NextRequest, NextResponse } from 'next/server';
import { resend, EMAIL_FROM } from '@/lib/email/resend';
import { platform } from '@/lib/config';
import { checkRateLimit, getClientIp } from '@/lib/turnstile/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  nome?: string;
  cpf?: string;
  celular?: string;
  mensagem?: string;
  // honeypot anti-bot: deve chegar sempre vazio
  website?: string;
};

// Escapa texto do usuário antes de interpolar no HTML do e-mail.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Até 5 solicitações por hora por IP.
  if (!(await checkRateLimit(`suporte:${ip}`, 5))) {
    return NextResponse.json(
      { error: 'Você enviou muitas solicitações. Aguarde um pouco e tente de novo.' },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  // Honeypot: se preenchido, é bot — finge sucesso e ignora.
  if (body.website && body.website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const nome = (body.nome ?? '').trim().slice(0, 120);
  const cpf = (body.cpf ?? '').replace(/\D/g, '').slice(0, 11);
  const celular = (body.celular ?? '').trim().slice(0, 20);
  const celularDigits = celular.replace(/\D/g, '');
  const mensagem = (body.mensagem ?? '').trim().slice(0, 2000);

  if (!nome) return NextResponse.json({ error: 'Informe seu nome.' }, { status: 400 });
  if (celularDigits.length < 10) return NextResponse.json({ error: 'Informe um celular válido com DDD.' }, { status: 400 });
  if (mensagem.length < 5) return NextResponse.json({ error: 'Escreva sua mensagem.' }, { status: 400 });

  const cpfFmt = cpf.length === 11
    ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : (cpf || '—');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.6">
      <h2 style="margin:0 0 12px">Nova solicitação de suporte — ${esc(platform.name)}</h2>
      <p style="margin:0 0 4px"><strong>Nome:</strong> ${esc(nome)}</p>
      <p style="margin:0 0 4px"><strong>CPF:</strong> ${esc(cpfFmt)}</p>
      <p style="margin:0 0 4px"><strong>Celular:</strong> ${esc(celular)}</p>
      <p style="margin:12px 0 4px"><strong>Mensagem:</strong></p>
      <div style="white-space:pre-wrap;padding:12px;background:#f5f5f5;border-radius:8px">${esc(mensagem)}</div>
      <hr style="margin:16px 0;border:none;border-top:1px solid #ddd" />
      <p style="margin:0;color:#888;font-size:12px">Enviado pelo formulário "Precisa de ajuda?" · IP ${esc(ip)}</p>
    </div>
  `;

  const waLink = `https://wa.me/${celularDigits.length >= 12 ? celularDigits : `55${celularDigits}`}`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: platform.supportInbox,
      subject: `[Suporte] ${nome} — ${platform.name}`,
      html: html + `<p style="font-family:Arial,sans-serif;font-size:12px"><a href="${waLink}">Responder no WhatsApp</a></p>`,
    });
  } catch (err) {
    console.error('[suporte] resend', err);
    return NextResponse.json(
      { error: 'Não foi possível enviar agora. Tente novamente em instantes.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
