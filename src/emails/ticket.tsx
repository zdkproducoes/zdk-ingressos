// emails/ticket.tsx
import { platform } from '@/lib/config';

export function renderTicketEmail(params: {
  firstName: string; eventTitle: string; eventDate: string; eventTime: string;
  venueName: string; venueAddress: string; orderNumber: number;
  tickets: Array<{ batchName: string; attendeeName: string; qrCodeUrl: string; qrToken: string }>;
  /** Nome público do organizador (organização); default = plataforma */
  organizerName?: string;
}): string {
  const { firstName, eventTitle, eventDate, eventTime, venueName, venueAddress, orderNumber, tickets } = params;
  const organizer = params.organizerName || platform.name;
  const ticketsHtml = tickets.map(t => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#1D2029;border-radius:12px;border:1px solid #2A2F3B;">
<tr><td style="padding:24px;">
<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#A6A8AB;">${esc(t.batchName)}</p>
<p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#F4F4F2;">${esc(t.attendeeName)}</p>
<div style="text-align:center;background:#fff;padding:16px;border-radius:8px;">
<img src="${t.qrCodeUrl}" alt="QR Code" width="200" height="200" style="display:block;margin:0 auto;" />
</div>
<p style="margin:12px 0 0;font-size:11px;color:#A6A8AB;text-align:center;font-family:monospace;">${esc(t.qrToken)}</p>
</td></tr></table>`).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0D0E12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F4F4F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0D0E12;padding:40px 20px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#16181F;border-radius:12px;overflow:hidden;">
<tr><td style="padding:32px 40px;text-align:center;background:linear-gradient(135deg,#16181F,#2A2F3B);">
<h1 style="margin:0;font-size:28px;font-weight:800;color:#F4F4F2;">🎟️ Seus Ingressos</h1>
<p style="margin:8px 0 0;font-size:14px;color:#C9CBCE;">Pedido #${orderNumber}</p>
</td></tr>
<tr><td style="padding:40px;">
<h2 style="margin:0 0 8px;font-size:22px;color:#F4F4F2;">Tudo certo, ${esc(firstName)}! 🎉</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#C9CBCE;">Seu pagamento foi aprovado. Apresente o QR Code na entrada do evento.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1D2029;border:1px solid #2A2F3B;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:12px 16px;">
<p style="margin:0;font-size:13px;color:#A6A8AB;">📧 Nº do pedido: <strong style="color:#F4F4F2;">#${orderNumber}</strong> — guarde este número para localizar seus ingressos depois.</p>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1D2029;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:20px;">
<p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;color:#A6A8AB;">Evento</p>
<p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#F4F4F2;">${esc(eventTitle)}</p>
<p style="margin:0 0 4px;font-size:14px;color:#C9CBCE;">📅 ${esc(eventDate)} às ${esc(eventTime)}</p>
<p style="margin:0 0 4px;font-size:14px;color:#C9CBCE;">📍 ${esc(venueName)}</p>
<p style="margin:0;font-size:13px;color:#A6A8AB;">${esc(venueAddress)}</p>
</td></tr></table>
${ticketsHtml}
<p style="margin:24px 0 4px;font-size:12px;color:#A6A8AB;text-align:center;">Caso não consiga visualizar os QR Codes acima</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr><td style="background:#D9A63F;border-radius:8px;">
<a href="${platform.baseUrl}/minhas-compras" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#17130A;text-decoration:none;">🎟️ Ver no site</a>
</td></tr></table>
<p style="margin:24px 0 0;padding:16px;background:#1D2029;border-radius:8px;font-size:13px;color:#A6A8AB;line-height:1.5;">
⚠️ <strong style="color:#F4F4F2;">Importante:</strong> Não compartilhe estes QR codes. Cada um só pode ser usado uma vez.
</p>
<p style="margin:16px 0 0;font-size:13px;color:#A6A8AB;line-height:1.6;">
Caso precise localizar seu ingresso novamente, acesse
<a href="${platform.baseUrl}/buscar-ingresso" style="color:#D9A63F;text-decoration:none;">${platform.baseUrl.replace('https://', '')}/buscar-ingresso</a>
com seu CPF e o nº do pedido (<strong style="color:#F4F4F2;">#${orderNumber}</strong>).
</p>
</td></tr>
<tr><td style="padding:24px 40px;background:#08090C;text-align:center;border-top:1px solid #2A2F3B;">
<p style="margin:0;font-size:12px;color:#A6A8AB;">© ${new Date().getFullYear()} ${esc(organizer)} — vendas por ${esc(platform.name)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
