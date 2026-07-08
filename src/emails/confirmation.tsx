// emails/confirmation.tsx
export function renderConfirmationEmail(params: { firstName: string; confirmUrl: string }): string {
  const { firstName, confirmUrl } = params;
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Confirme seu cadastro — SACODE</title></head>
<body style="margin:0;padding:0;background:#2D0F2A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#EADBC4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#2D0F2A;padding:40px 20px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#45183F;border-radius:12px;overflow:hidden;">
<tr><td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg,#45183F,#694060);">
<h1 style="margin:0;font-size:28px;font-weight:800;color:#EADBC4;letter-spacing:-0.5px;">SACODE</h1>
</td></tr>
<tr><td style="padding:40px;">
<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#EADBC4;">Olá, ${escape(firstName)}! 👋</h2>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#D9C2A0;">Recebemos seu cadastro na plataforma SACODE. Para concluir, confirme seu e-mail clicando no botão abaixo:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td style="background:#E4A03F;border-radius:8px;">
<a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#45183F;text-decoration:none;">Confirmar meu e-mail</a>
</td></tr></table>
<p style="margin:32px 0 8px;font-size:14px;color:#BFA279;">Ou copie e cole este link:</p>
<p style="margin:0 0 24px;font-size:13px;color:#BFA279;word-break:break-all;">${escape(confirmUrl)}</p>
<p style="margin:24px 0 0;padding:16px;background:#321131;border-radius:8px;font-size:14px;color:#BFA279;">⏱️ Este link expira em <strong style="color:#EADBC4;">24 horas</strong>. Se não foi você, pode ignorar.</p>
</td></tr>
<tr><td style="padding:24px 40px;background:#1F0A1D;text-align:center;border-top:1px solid #694060;">
<p style="margin:0;font-size:12px;color:#BFA279;">© ${new Date().getFullYear()} SACODE — Plataforma de Ingressos</p>
</td></tr></table></td></tr></table></body></html>`;
}

function escape(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
