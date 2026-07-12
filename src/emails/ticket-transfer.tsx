// emails/ticket-transfer.tsx
// E-mail enviado para QUEM RECEBEU um ingresso por transferência.
// Contém o QR novo (o antigo foi cancelado no ato da transferência).
export function renderTicketTransferEmail(params: {
  recipientFirstName: string; senderName: string;
  eventTitle: string; eventDate: string; eventTime: string;
  venueName: string; venueAddress: string;
  batchName: string; attendeeName: string; qrCodeUrl: string; qrToken: string;
}): string {
  const {
    recipientFirstName, senderName, eventTitle, eventDate, eventTime,
    venueName, venueAddress, batchName, attendeeName, qrCodeUrl, qrToken,
  } = params;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#2D0F2A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#EADBC4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#2D0F2A;padding:40px 20px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#45183F;border-radius:12px;overflow:hidden;">
<tr><td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg,#45183F,#694060);">
<h1 style="margin:0;font-size:28px;font-weight:800;color:#EADBC4;">🎟️ Você recebeu um ingresso!</h1>
</td></tr>
<tr><td style="padding:40px;">
<h2 style="margin:0 0 8px;font-size:22px;color:#EADBC4;">Boa, ${esc(recipientFirstName)}! 🎉</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#D9C2A0;">
<strong style="color:#EADBC4;">${esc(senderName)}</strong> transferiu um ingresso para você.
O QR Code abaixo é o único válido — apresente ele na entrada do evento.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#321131;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:20px;">
<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#BFA279;">Evento</p>
<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#EADBC4;">${esc(eventTitle)}</p>
<p style="margin:0 0 4px;font-size:14px;color:#D9C2A0;">📅 ${esc(eventDate)} às ${esc(eventTime)}</p>
<p style="margin:0 0 4px;font-size:14px;color:#D9C2A0;">📍 ${esc(venueName)}</p>
<p style="margin:0;font-size:13px;color:#BFA279;">${esc(venueAddress)}</p>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#321131;border-radius:12px;border:1px solid #694060;">
<tr><td style="padding:24px;">
<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#BFA279;">${esc(batchName)}</p>
<p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#EADBC4;">${esc(attendeeName)}</p>
<div style="text-align:center;background:#fff;padding:16px;border-radius:8px;">
<img src="${qrCodeUrl}" alt="QR Code" width="200" height="200" style="display:block;margin:0 auto;" />
</div>
<p style="margin:12px 0 0;font-size:11px;color:#BFA279;text-align:center;font-family:monospace;">${esc(qrToken)}</p>
</td></tr></table>
<p style="margin:24px 0 4px;font-size:12px;color:#BFA279;text-align:center;">O ingresso também fica disponível na sua conta</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td style="background:#E4A03F;border-radius:8px;">
<a href="https://www.zdkingressos.com.br/minhas-compras" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#45183F;text-decoration:none;">🎟️ Ver no site</a>
</td></tr></table>
<p style="margin:24px 0 0;padding:16px;background:#321131;border-radius:8px;font-size:13px;color:#BFA279;line-height:1.5;">
⚠️ <strong style="color:#EADBC4;">Importante:</strong> não compartilhe este QR Code — uso único na entrada.
Ingressos recebidos por transferência <strong style="color:#EADBC4;">não podem ser transferidos novamente</strong>.
</p>
</td></tr>
<tr><td style="padding:24px 40px;background:#1F0A1D;text-align:center;border-top:1px solid #694060;">
<p style="margin:0;font-size:12px;color:#BFA279;">© ${new Date().getFullYear()} SACODE</p>
</td></tr></table></td></tr></table></body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
