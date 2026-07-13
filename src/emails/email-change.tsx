// E-mail de confirmação de TROCA de e-mail (enviado para o endereço NOVO).
import { platform } from '@/lib/config';

export function renderEmailChangeEmail(params: { firstName: string; confirmUrl: string }): string {
  const { firstName, confirmUrl } = params;
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Confirme seu novo e-mail — ${escape(platform.name)}</title></head>
<body style="margin:0;padding:0;background:#0D0E12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F4F4F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0D0E12;padding:40px 20px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#16181F;border-radius:12px;overflow:hidden;">
<tr><td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg,#16181F,#2A2F3B);">
<h1 style="margin:0;font-size:28px;font-weight:800;color:#F4F4F2;letter-spacing:-0.5px;">${escape(platform.name)}</h1>
</td></tr>
<tr><td style="padding:40px;">
<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#F4F4F2;">Olá, ${escape(firstName)}! 👋</h2>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#C9CBCE;">Recebemos um pedido para trocar o e-mail da sua conta para <strong style="color:#F4F4F2;">este endereço</strong>. Para confirmar a troca, clique no botão abaixo:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td style="background:#D9A63F;border-radius:8px;">
<a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#17130A;text-decoration:none;">Confirmar novo e-mail</a>
</td></tr></table>
<p style="margin:32px 0 8px;font-size:14px;color:#A6A8AB;">Ou copie e cole este link:</p>
<p style="margin:0 0 24px;font-size:13px;color:#A6A8AB;word-break:break-all;">${escape(confirmUrl)}</p>
<p style="margin:24px 0 0;padding:16px;background:#1D2029;border-radius:8px;font-size:14px;color:#A6A8AB;">⏱️ Este link expira em <strong style="color:#F4F4F2;">24 horas</strong>. Se você não pediu essa troca, ignore este e-mail — nada muda na sua conta.</p>
</td></tr>
<tr><td style="padding:24px 40px;background:#08090C;text-align:center;border-top:1px solid #2A2F3B;">
<p style="margin:0;font-size:12px;color:#A6A8AB;">© ${new Date().getFullYear()} ${escape(platform.name)} — Plataforma de Ingressos</p>
</td></tr></table></td></tr></table></body></html>`;
}

function escape(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
