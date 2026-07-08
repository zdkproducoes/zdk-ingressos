# 🔔 Como validar o webhook do Mercado Pago em produção

Este documento explica como **testar e monitorar** o webhook do MP, garantindo que ele está recebendo notificações e processando corretamente.

---

## ⚙️ Como funciona o webhook do SACODE

Quando alguém paga um ingresso, o Mercado Pago envia um **POST** para:

```
https://sacode.cantorcaiolacerda.com.br/api/checkout/webhook
```

O nosso código:

1. **Valida a assinatura HMAC** do MP (usando `MP_WEBHOOK_SECRET`)
2. **Busca o pagamento** completo no MP pela API
3. Se aprovado:
   - **Gera os QR codes** (um por ingresso)
   - **Salva no banco** com tokens únicos
   - **Incrementa o estoque vendido** do lote
   - **Marca cupom como usado** (se houver)
   - **Envia o e-mail** com os QR codes
4. Retorna `{ ok: true }` para o MP

⚡ É **idempotente**: se o MP mandar a mesma notificação 2x (e mandam, é normal), a segunda vez é ignorada.

---

## 🧪 Teste 1 — Simulação manual no painel do MP

Esta é a forma mais rápida de saber se o webhook está respondendo.

1. Acesse https://www.mercadopago.com.br/developers/panel
2. Vá em **Suas integrações** → seu app SACODE
3. Menu **Webhooks** → **Configurar notificações**
4. Role até o final da página — vai ter um botão **"Simular notificação"** ou **"Testar"**
5. Em **Tipo de evento**, selecione **payment**
6. Em **ID**, coloque qualquer número (ex: `123456789`)
7. Clique em **Enviar teste**

### Resultado esperado:

✅ **HTTP 200** com body `{"ok":true}` — webhook respondeu

❌ **HTTP 4xx/5xx** — algo está errado, vá nos logs (Teste 2)

> 💡 Como o ID `123456789` não é um pagamento real, o código vai logar um erro mas ainda assim retornar 200. Isso é proposital — sempre retornar 200 evita que o MP fique reenviando.

---

## 🧪 Teste 2 — Ver logs em tempo real na Vercel

1. Vá em https://vercel.com/dashboard
2. Clique no projeto **SACODE**
3. Aba **Logs** (no topo, ao lado de "Deployments")
4. No campo de filtro, digite: `/api/checkout/webhook`
5. Em **Time Range**, deixe **Last 1 hour**

Cada vez que o MP chamar o webhook, vai aparecer uma linha aqui. Clique para ver detalhes:

- **Request body** — o que o MP enviou
- **Response status** — geralmente 200
- **Console output** — qualquer `console.log` ou `console.error` do código

### O que procurar:

| Você verá no log | Significa |
|---|---|
| `[MP webhook] signature mismatch` | A `MP_WEBHOOK_SECRET` está errada — confirme que copiou certo |
| Nada — webhook nunca foi chamado | O MP pode estar configurado pra outro ambiente. Confira na PARTE 6 do README |
| Erros de `mpPayment.get(...)` | `MP_ACCESS_TOKEN` errado ou expirado |
| `ticket email` failed | Erro no Resend — verifique `RESEND_API_KEY` e domínio verificado |

---

## 🧪 Teste 3 — Compra real com cartão de teste

A melhor forma de validar end-to-end:

1. Use o **cartão de teste** do MP:
   - **Mastercard:** `5031 4332 1540 6351` — CVV `123` — qualquer validade futura
   - **Nome:** `APRO` (aprova automaticamente)
   - **CPF:** `12345678909`
2. Compre 1 ingresso em produção
3. **Acompanhe os logs em paralelo** (Teste 2)
4. Você verá:
   - 1 chamada ao webhook quase imediata
   - Possivelmente uma 2ª chamada minutos depois (MP confirma de novo — normal)
5. Verifique no banco (Supabase Table Editor):
   - `orders` → seu pedido com `payment_status = 'approved'` e `paid_at` preenchido
   - `order_items` → linhas com `qr_code_token` e `qr_code_url` preenchidos
6. Verifique seu e-mail — deve ter chegado com os QR codes

> 🗑️ **Para limpar depois do teste:** apague essas linhas no Table Editor (orders + order_items) e reduza `sold_count` no `ticket_batches` correspondente.

---

## 🔍 Teste 4 — Idempotência

O MP pode mandar a mesma notificação 2 ou 3 vezes (é estratégia "at-least-once"). Nosso código aguenta isso. Para confirmar:

1. No painel do MP, simule a mesma notificação 3x seguidas
2. Confira no banco: nada deve ter sido duplicado
3. O e-mail deve ter sido enviado **uma única vez**

Se você notar e-mails duplicados ou QRs duplicados, **me avise** — significa que a idempotência quebrou.

---

## 🔐 Teste 5 — Validação da assinatura HMAC

Este é o que protege contra **falsos webhooks** (alguém tentando fingir ser o MP).

1. Tente chamar manualmente, sem assinatura, no terminal:
   ```bash
   curl -X POST https://sacode.cantorcaiolacerda.com.br/api/checkout/webhook \
     -H "Content-Type: application/json" \
     -d '{"type":"payment","data":{"id":"999"}}'
   ```
2. Se você tem `MP_WEBHOOK_SECRET` configurada, esta requisição **será ignorada silenciosamente** (retorna 200 mas não processa nada)
3. ✅ Esse comportamento está correto — sempre retornar 200 evita que atacantes saibam que a assinatura é validada

---

## 📊 Monitoramento contínuo

Recomendo **fixar uma aba** com os logs da Vercel filtrados em `/api/checkout/webhook` durante os primeiros dias após o lançamento. Assim você vê em tempo real cada compra.

Para monitoramento mais sério (alertas por e-mail/Slack quando algo falhar), você pode plugar:

- **Sentry** (gratuito até 5k erros/mês) — pega exceptions automaticamente
- **Better Stack / Logflare** — alertas baseados em padrões de log

Mas pra começar, a aba de logs da Vercel já é suficiente.

---

## 🆘 Problemas comuns

### "Webhook chama, mas o pedido fica em 'pending'"
- Olhe o log: o MP retornou status `in_process` ou `pending`?
- Se for cartão recusado, vai ficar `rejected` — comportamento esperado
- Se for Pix, fica pendente até a pessoa pagar (até 30 min)

### "E-mail não chega depois da compra"
1. Confirme `RESEND_API_KEY` na Vercel
2. Confirme domínio verificado em https://resend.com/domains
3. Veja em https://resend.com/emails se o envio aparece lá
4. Verifique caixa de spam do destinatário

### "QR code não foi gerado"
- Olhe o log do webhook procurando `await QRCode.toDataURL`
- Se der erro, pode ser pacote `qrcode` não instalado — rode `npm install qrcode @types/qrcode`

### "Webhook chama com sucesso, mas nada acontece no banco"
- Confirme que `SUPABASE_SERVICE_ROLE_KEY` está correta na Vercel
- Lembre-se: o webhook usa `service_role`, não a `anon` key

---

Se algo der errado e você não conseguir resolver pelos logs, me mande:
1. Screenshot dos logs da Vercel
2. ID do pagamento no MP
3. ID da order no Supabase
