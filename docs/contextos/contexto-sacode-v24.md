# Contexto SACODE — v24

> Continuação do `contexto-sacode-v23.md`. Sessão de 27/06/2026.
> Plataforma de ingressos própria da ZDK Produções (Fernando Zedeque), construída para os eventos do Caio Lacerda, com objetivo de virar SaaS white-label multi-produtor.

---

## 0. Como trabalhamos (reforço — seguir sempre)

- **Fluxo manual mantido:** Claude gera o arquivo completo (artefato p/ download) → Fernando baixa → `Move-Item` na janela GIT → checa balanço de chaves → para o DEV → `npm run build` → testa → commita → reinicia DEV. Fernando prioriza **entender** cada mudança.
- Sempre: instruções **numeradas, passo a passo**; indicar a janela (**DEV** / **GIT** / **CLAUDE**); **próximo passo + condição** ("se X, faça Y; se aparecer algo estranho, cole aqui").
- Arquivos com acento → artefato pra download → `Move-Item` (janela GIT). Downloads: `C:\Users\fzede\Downloads`.
- **SELECT antes de qualquer UPDATE destrutivo.** Dev e prod compartilham o mesmo banco Supabase.
- Validar **balanço de chaves** antes de cada build. Commits em português minúsculo, agrupados por tema.

---

## 1. Stack & coordenadas

- **Stack:** Next.js 14.2.21 (App Router, `src/`), Supabase (Auth/DB/Storage), Tailwind, TypeScript, Mercado Pago (SDK `mercadopago` v2.12.0), Resend, Cloudflare Turnstile, Vercel (plano **Hobby/free**), GitHub (`zdkproducoes/sacode-ingressos`, branch `main`).
- **Local:** `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`
- **Produção:** `https://sacode.cantorcaiolacerda.com.br`
- **Event ID:** `6539575d-7a71-4c50-8f62-955bc5a96947` | **slug:** `sacode-15-edicao`
- **HostGator:** plano pago (cPanel) — usado **apenas como agendador externo** (cron) que cutuca a Vercel. App continua 100% na Vercel.

---

## 2. O QUE ESTA SESSÃO (v24) ENTREGOU — TUDO EM PRODUÇÃO

Fechamos todo o bloco `abandoned`/reconciliação que estava aberto do v23 (Passos 4, 3, 7) **com escopo completo, incluindo a blindagem extra ("Escopo A")**.

### 2.1. Passo 4 (v23) — resumo financeiro do admin conferido — SEM MUDANÇA
- Lido `src/app/admin/resumo/page.tsx`. **Todas** as queries de venda/receita filtram estritamente `payment_status = 'approved'` → `abandoned` e `refunded` ficam de fora sozinhos. Único card sem filtro é "Total de pedidos" (contagem bruta proposital).
- `src/app/admin/page.tsx` é só `redirect('/admin/resumo')` (sem somar nada). Resumo é a única tela financeira.
- Confirmado por SELECT que **não existe** item `cancelled` dentro de pedido `approved` (reembolso cancela o pedido inteiro). Logo, nenhum risco de venda fantasma. **Passo 4 fechado sem código.**

### 2.2. Reconciliação automática (Passo 3 do v23) — CONSTRUÍDA E NO AR
Robô que torna o sistema **ativo** (deixa de depender 100% do webhook do MP). Resolve dois casos:
- **PIX abandonado** (comum): cliente gerou QR e nunca pagou → robô confirma no MP e marca `abandoned`. Acaba com a limpeza manual (que no v23 custou 19 pedidos na mão).
- **"Pagou mas o webhook sumiu"** (raro/perigoso): cliente pagou, webhook se perdeu, pedido travou em `pending` sem ingresso → robô acha o pagamento aprovado no MP, corrige e **entrega QR + e-mail**.

**Arquivos:**
1. **`src/lib/checkout/fulfillment.ts` (NOVO)** — `fulfillOrder(orderId, { incrementStock })`. Extraído do antigo `onApproved` do webhook. Idempotente: gera QR só pra itens sem `qr_code_token`; envia e-mail só se `tickets_emailed_at` for null (carimba após enviar); incrementa estoque/cupom **apenas** quando `incrementStock: true` (transição real → approved). Fonte única usada por webhook **e** robô.
2. **`src/app/api/checkout/webhook/route.ts` (MODIFICADO)** — agora importa `fulfillOrder` (não tem mais `onApproved` local). **Endurecimento:** o `catch` do `mpPayment.get` passou de `ok:true` → **500** (faz o MP re-tentar; nesse ponto o pedido ainda não foi tocado → seguro). O `catch` GERAL continua `ok:true` de propósito — a rede de segurança agora é o Passo 2 do robô.
3. **`src/app/api/cron/reconciliar/route.ts` (NOVO)** — protegido por `CRON_SECRET` (header `Authorization: Bearer`). 
   - **Passo 1:** pega `pending` criados há **> 1h** → `mpPayment.search({ options: { external_reference: order.id } })` → se achar `approved`, marca approved + `fulfillOrder(…, { incrementStock: true })`; senão marca `abandoned`. **Erro de API do MP → NÃO abandona** (evita falso positivo), tenta na próxima hora.
   - **Passo 2 (Escopo A):** pega `approved` com `tickets_emailed_at IS NULL` (entrega nunca concluída) → `fulfillOrder(…, { incrementStock: false })`. Cobre o ponto cego "approved sem QR/e-mail" que o Passo 1 não pega.

### 2.3. Banco — coluna nova `tickets_emailed_at`
- `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tickets_emailed_at timestamptz;` (aditiva, sem risco).
- **Backfill:** os 74 pedidos `approved` do evento (já entregues) foram carimbados com `COALESCE(paid_at, updated_at, created_at, now())` — pra o robô NÃO reenviar e-mail pra eles. SELECT confirmou 74 antes; UPDATE retornou 74. ✅

### 2.4. Agendador — cron na HostGator (não na Vercel)
- Vercel Hobby só permite cron **1x/dia** → insuficiente. Em vez de pagar Pro (US$20/mês), usamos o **Cron Jobs do cPanel da HostGator** (que Fernando já paga) como agendador externo.
- **`vercel.json` NÃO foi criado** (não usamos o cron embutido da Vercel). A rota é uma API route normal, protegida pelo segredo.
- Cron criado: `0 * * * *` (de hora em hora), comando:
  `curl -s --max-time 120 -H "Authorization: Bearer <CRON_SECRET>" "https://sacode.cantorcaiolacerda.com.br/api/cron/reconciliar" >/dev/null 2>&1`
- `CRON_SECRET` cadastrado na **Vercel (Production)** e no `.env.local`.

### 2.5. Testes feitos
- `curl.exe` SEM segredo → **401** (blindado). ✅
- `curl.exe` COM segredo → `{"ok":true,"resumo":{verificadosPending:0,aprovados:0,abandonados:0,reparados:0,erros:0}}` (rodou em vazio, 0 pendentes, sem tocar em nada). ✅
- **Segredo rotacionado** ao fim da sessão (o original tinha sido colado no chat): novo gerado → atualizado na Vercel → **redeploy** → atualizado na HostGator → testado (novo funciona, antigo dá 401). ✅

### 2.6. Commit
- `reconciliacao: robo de pendentes + lib de entrega compartilhada` (os 3 arquivos). Push + deploy Vercel OK.

---

## 3. PRÓXIMOS PASSOS / PENDÊNCIAS

### Pendências geradas nesta sessão
- **Verificar a 1ª execução automática do cron da HostGator** na virada de uma hora (confirmar que rodou sozinho — o curl manual já provou a rota; falta só ver o relógio da HostGator disparar). Como a saída está silenciada (`>/dev/null`), conferir pelos logs de função da Vercel (retêm só 1h no Hobby) ou pelo efeito no banco.
- **Reclassificar os 19 `cancelled` → `abandoned` (Passo 7 do v23, ainda PENDENTE).** Eram os PIX da limpeza pós-evento. SELECT antes; UPDATE travado por `order_number IN (65,72,76,77,78,80,86,93,105,111,116,123,127,133,134,139,144,145,146)` E/OU `cancellation_reason = 'Limpeza pos-evento: PIX pendente nao pago (abandono/interno)'`. Não tocar em cancelamentos legítimos/reembolso.
- **Caixas de e-mail @zdkproducoes / @cantorcaiolacerda:** se hospedadas na HostGator, vão precisar migrar (Zoho Mail grátis / Google Workspace) quando Fernando cancelar a HostGator no próximo ciclo. **Envio (Resend) é independente, não muda.** Receber é o que pode quebrar.
- **Criar a caixa `suporte@zdkproducoes.com.br`** (pendência herdada do v23 — as mensagens de erro do cadastro já apontam pra lá).

### Plano de saída da HostGator (decidido nesta sessão)
- Fernando vai **cancelar a HostGator no próximo ciclo de renovação** e levar tudo pra Vercel. Quando isso acontecer, o agendador do robô migra pra **Vercel Pro (cron)** ou outro agendador externo (cron-job.org grátis). A rota do robô não muda — só quem a chama.

---

## 4. Backlog (do v23, ainda válido — retomar daqui)

1. **Aba Check-in — relacionamento** (Fernando quer logo a seguir): saber quem deu check-in e quem não, pra agradecer quem foi e "senti sua falta / próximo é dia X" a quem não foi. Mapear: `Get-ChildItem -Recurse -Path src -Include *checkin*, *check-in*`. Ver se existe `checked_in_at` ou se o check-in só muda `order_items.status`.
2. **Módulo de embaixadores** (Fernando levantou no início desta sessão como candidato a prioridade): provável evolução "pessoa real" do sistema de **afiliados** que já existe (`affiliates`, código `ads`, cookie `sacode_ref` server-side, rota `admin/afiliados/[id]`). Escopo a definir: código por embaixador, painel por embaixador, recompensa/comissão, cadastro. **Aproveitar a estrutura de afiliados existente.**
3. Detalhe de pedido no admin (afiliado, método, fees, timestamps).
4. Geração de pedido offline (admin pré-registra comprador, gera QR + e-mail sem webhook).
5. Nubank "possível golpe" (banco do pagador sinaliza recebedor MP).
6. **Lote turnover desync (BUG):** homepage atualiza preço mas checkout serve lote antigo. Conecta com o ponto de baixo (o `create` ainda usa `batch.sold_count` pro estoque, enquanto o resto migrou pra `batch_availability`/`paid_count`).
7. **Multi-produtor white-label** (fundação multi-tenant — tarefa grande, candidata a Claude Code).
8. Dashboard "Público" + "Aniversariantes".
9. Melhorias: página de status-PIX auto-atualizável; view de conciliação financeira (MP real + offline/PIX-manual); limpar logs `[DIAG]`.
10. **(Novo, de baixa prioridade) Não-idempotência fina do estoque:** o Passo 2 do robô não reincrementa `sold_count` (passa `incrementStock:false`). Se um pedido virou `approved` mas falhou ANTES de incrementar, o `sold_count` dele fica subcontado. Impacto mínimo: `sold_count` é legado/em retirada; a verdade viva é a view `batch_availability` (lê `order_items` por approved). Só o guard de estoque do `create` ainda lê `sold_count`. Anotado, não corrigido.

---

## 5. Aprendizados-chave

**Novos (v24):**
- **SDK `mercadopago` v2.12.0:** `mpPayment.search({ options: { external_reference } })` → retorna `{ results: [...] }`; cada item tem `id`, `status`, `status_detail`, `payment_method_id`, `payment_type_id`. Não precisa de `get` extra. (Confirmado inspecionando os `.d.ts` do pacote.)
- **`external_reference` no MP = `order.id`** (carimbado no `create` em toda preference). É a chave pra achar o pagamento de um pedido a partir do banco.
- **Vercel Hobby:** cron embutido só **1x/dia**; `0 * * * *` **falha no deploy**. Hourly só no Pro. Solução: agendador externo (HostGator cPanel cron) batendo na rota com `Authorization: Bearer <CRON_SECRET>`.
- **Vercel não tem servidor de e-mail.** Envio fica no Resend (independente). Hospedagem compartilhada (cPanel/PHP) não roda Next.js — migrar o app pra HostGator exigiria VPS (não vale: mais trabalho/risco/custo). App fica na Vercel.
- **Padrão de cron seguro Vercel/qualquer agendador:** rota confere `req.headers.get('authorization') === \`Bearer ${process.env.CRON_SECRET}\`` → senão 401. `curl -s --max-time 120 ... >/dev/null 2>&1` no cPanel (silencia e-mail; não fica pendurado).
- **Idempotência de entrega:** QR via `qr_code_token` (gera só se faltar); e-mail via novo carimbo `orders.tickets_emailed_at` (envia só se null, carimba após sucesso → falha é re-tentada). Estoque/cupom **não** são idempotentes → só na transição real (flag `incrementStock`).
- **Endurecimento de webhook:** responder 500 (em vez de `ok:true`) faz o MP **re-tentar**; só vale onde o pedido ainda não foi alterado (ex.: falha do `mpPayment.get`). Onde já mexeu no pedido, 500 esbarraria na trava "já aprovado" → inútil; por isso o `catch` geral fica `ok:true` e o robô (Passo 2) é a rede.
- **Backfill obrigatório ao criar coluna-flag de estado** (`tickets_emailed_at`): sem carimbar os registros históricos já processados, o robô os trataria como "pendentes de entrega" e dispararia ação (reenvio de e-mail). Carimbar ANTES de ligar o agendador.

**Acumulado (de v22/v23, ainda válido):**
- `sold_count` não é confiável; verdade = `order_items` por `payment_status='approved'`, encapsulado na view `batch_availability` (`paid_count`).
- Dev/prod **mesmo banco** = maior risco; SELECT antes de todo write.
- Admin usa `service_role` (bypassa RLS); isolamento por tenant só quando isso mudar.
- MP: `payment_gateway_id` = preference id; payment id real em `payment_gateway_data->>'payment_id'`.
- QR invalidação: validador exige `order.payment_status === 'approved'` **e** `item.status === 'valid'`. Setar `order_items.status='cancelled'` derruba os dois.
- `orders_payment_status_check` inclui `abandoned` (checar o CHECK antes de gravar status novo).
- `npm run build` só com DEV parado (rodar os dois corrompe `.next`/CSS).
- PowerShell: paths com `[` `]` exigem `-LiteralPath` e aspas.
- `payment_status` pago = `approved` (não `paid`).
- `tsconfig` target < ES2015 → usar `Array.from()` (nunca `[...set]`).
- Next 14: `searchParams` é objeto normal no server component (sem `await`).
- Páginas públicas precisam de `force-dynamic` (ISR serve dados velhos).
- Diagnóstico de PIX pendente: `payment_gateway_data->>'payment_id' = null` ⇒ MP nunca notificou (abandono normal). Webhook saudável se os aprovados existem.
- `profiles.id === auth.users.id`. Telefone salvo só com dígitos. WhatsApp wa.me: `digits.length >= 12` = já tem país; senão prefixa `55`.
- Nunca testar fluxo destrutivo com conta admin/produção; usar descartável.

---

## 6. Pessoas & ferramentas

- **Fernando Zedeque** — super-admin + produtor. Dev iniciante, quer entender as mudanças.
- **Caio Lacerda** — artista/dono do evento, titular da conta MP de produção, CNPJ 44.816.216/0001-03.
- Resend envia de `SACODE <nao-responda@cantorcaiolacerda.com.br>`. Suporte (a criar): `suporte@zdkproducoes.com.br`. DPO: `privacidade@zdkproducoes.com.br`.
- Supabase SQL Editor = interface de schema/queries (sem migrations local).
- Vercel (Hobby) = hosting + env vars (`CRON_SECRET` em Production). HostGator cPanel = agendador (cron de hora em hora).
- Mercado Pago `mpPayment.search`/`get`, `mpPaymentRefund.create`. `html5-qrcode`, `lucide-react`, `@tailwindcss/typography`.
- Meta Ads: conta `1779584973842`, campanha `6958415932844`, código de afiliado `ads`.

---

## 7. Arquivos tocados nesta sessão (referência rápida)

- `src/lib/checkout/fulfillment.ts` — **NOVO**. Lib de entrega compartilhada (`fulfillOrder`), idempotente.
- `src/app/api/checkout/webhook/route.ts` — **MODIFICADO**. Usa `fulfillOrder`; endurece o catch do `mpPayment.get` (→ 500).
- `src/app/api/cron/reconciliar/route.ts` — **NOVO**. Robô (Passo 1 pending; Passo 2 approved-sem-entrega). Protegido por `CRON_SECRET`.
- Banco: `tickets_emailed_at timestamptz` (nova coluna) + backfill dos 74 approved.
- HostGator: cron `0 * * * *` chamando a rota. Vercel: env `CRON_SECRET` (rotacionado).

---

*Fim do v24. Bloco abandoned/reconciliação 100% fechado e em produção. Próxima sessão: verificar 1ª execução automática do cron; opcionalmente fechar o Passo 7 (19 cancelled → abandoned); e então escolher entre "Aba Check-in relacionamento" ou "Módulo de embaixadores" como próximo grande tema.*
