// src/lib/meta/capi.ts
// Envia eventos server-side para a Conversions API (CAPI) do Meta.
// Roda no servidor (webhook / robo de reconciliacao) — NUNCA no browser.
// Regra de ouro: esta funcao NUNCA lanca excecao. Se algo falhar, apenas loga,
// para jamais quebrar a entrega do pedido (QR + e-mail). Marketing nunca derruba venda.

import { createHash } from 'crypto';

// Versao da Graph API. Se o Meta reclamar de versao antiga no futuro, sobe este numero.
const GRAPH_VERSION = 'v21.0';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// E-mail: minusculo, sem espacos, depois hash.
function hashEmail(email?: string | null): string | undefined {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256(normalized);
}

// Telefone: so digitos, com DDI (Brasil = 55), depois hash.
function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  if (!digits.startsWith('55')) digits = '55' + digits;
  return sha256(digits);
}

export interface PurchaseEventInput {
  orderId: string;            // vira event_id -> deduplica com o pixel do browser
  value: number;              // valor real do pedido (ex.: order.total)
  email?: string | null;      // e-mail do comprador (sera enviado com hash)
  phone?: string | null;      // telefone do comprador (sera enviado com hash)
  contentName?: string | null; // ex.: nome do lote / evento
  eventSourceUrl?: string | null;
  currency?: string;          // default BRL
  // Dados do browser capturados no CHECKOUT (o webhook/robo nao tem browser).
  // Sobem o Event Match Quality; vao SEM hash — e o formato que o Meta exige.
  fbp?: string | null;             // cookie _fbp
  fbc?: string | null;             // cookie _fbc (so existe vindo de anuncio)
  clientIp?: string | null;        // IP do comprador
  clientUserAgent?: string | null; // user agent do comprador
}

export async function sendPurchaseEvent(input: PurchaseEventInput): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;

  if (!pixelId || !token) {
    console.warn('[meta capi] META_PIXEL_ID ou META_CAPI_TOKEN ausente — evento nao enviado');
    return;
  }

  const userData: Record<string, string[] | string> = {};
  const em = hashEmail(input.email);
  const ph = hashPhone(input.phone);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  // fbp/fbc/ip/user agent: strings simples (nao-array, sem hash) na CAPI.
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.orderId,            // deduplicacao (mesmo pedido = 1 conversao)
        action_source: 'website',
        ...(input.eventSourceUrl ? { event_source_url: input.eventSourceUrl } : {}),
        user_data: userData,
        custom_data: {
          currency: input.currency || 'BRL',
          value: Number(input.value) || 0,
          ...(input.contentName ? { content_name: input.contentName } : {}),
          order_id: input.orderId,
        },
      },
    ],
  };

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[meta capi] resposta nao-ok', res.status, text);
      return;
    }
    console.log('[meta capi] Purchase enviado', {
      orderId: input.orderId,
      value: payload.data[0].custom_data.value,
    });
  } catch (err) {
    console.error('[meta capi] falha ao enviar Purchase', err);
  }
}
