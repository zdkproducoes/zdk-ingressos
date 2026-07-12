# Contexto SACODE — v22

> Documento de continuidade. Suba/cole no início de uma nova conversa para dar sequência ao projeto.
> Sucessor do v21. Esta sessão fechou: **Opção A 100%** (sold_count), **Resumo do admin** (relatório por forma de pagamento + faturamento líquido + anti-subcontagem) e a **feature item 1 — Cancelamento/Reembolso de pedido** (a maior prioridade do backlog), testada em produção de ponta a ponta.

---

## 1. Quem é / o que é

**Fernando Zedeque (ZDK Produções)** construiu o **SACODE**, plataforma própria de ingressos para os eventos do artista **Caio Lacerda**. Diferencial estratégico: **posse dos dados do cliente** (CPF, e-mail, telefone, idade, sexo, histórico) para marketing direto. Visão de longo prazo: virar um **SaaS de ingressos multi-produtor white-label** (ver Seção 6).

MVP validado no **SACODE 15ª Edição** (07/06/2026). Fernando se considera **dev iniciante** — ver Seção 7 (como trabalhar com ele).

---

## 2. Estado atual (pós-sessão v22)

- **Produção descongelada e ativa.** Trabalho de desenvolvimento em andamento.
- **Banco compartilhado dev=prod** — segue valendo. SQL destrutivo exige cuidado redobrado; views/grants/funções criados no SQL Editor já valem em produção na hora.
- Evento já passou; lotes de venda real estão `paused`/`scheduled`; só "Cortesia" (invisível) está `active`.

### O que esta sessão (v22) entregou e fez deploy em produção:

1. **Opção A — FECHADA 100%** (era a ponta solta do v21; ver Seção 4):
   - **Etapa 3:** função `increment_batch_sold` teve o auto-`sold_out` **removido**. Agora ela só faz `sold_count += qty` + `updated_at`; nunca mais marca `status='sold_out'` sozinha. Lote não se esconde mais por contador inflado.
   - **Etapa 4:** `sold_count` **ressincronizado** com os pagos reais via `UPDATE ... SET sold_count = batch_availability.paid_count`. Banco honesto (Lote 02: 170→61; Promocional: 31→25). Bônus: as travas anti-superlotação que ainda leem `sold_count` agora estão **precisas** em vez de "conservadoras demais".

2. **Resumo do admin** (`src/app/admin/resumo/page.tsx`) — o arquivo já estava certo no essencial (usava `approved`, não usava `sold_count`, separava cortesia). Foi **complementado**:
   - **Novo: relatório "Faturamento por forma de pagamento"** (PIX / Cartão de crédito / Outro), tabela com pedidos + faturamento + % do total. Era o único item do backlog 6 que faltava.
   - **`.range(0, 49999)`** adicionado às 3 queries de dados (`order_items` x2, `orders` x1) — defesa contra o corte padrão de 1000 linhas do PostgREST (subcontaria faturamento em evento futuro cheio).
   - **Faturamento agora é LÍQUIDO** (`total − service_fee`) em todos os lugares (card headline, tabela de forma de pagamento, vendas por dia). **Nenhuma menção a "taxa" na tela** (decisão do Fernando). O card "Valor total de taxas" foi **removido**. NOTA: "Faturamento total" e "Valor de ingressos vendidos" ficam quase iguais agora — é esperado (tirando a taxa, faturamento = valor dos ingressos).
   - **Gráfico "Ingressos por gênero" agora INCLUI cortesias** (antes só pagos). Cortesias sem perfil/gênero caem em "Outros".

3. **Item 1 do backlog — Cancelamento/Reembolso de pedido (FEATURE COMPLETA, testada em prod):** ver Seção 5.

---

## 3. Stack & identificadores-chave

**Stack:** Next.js 14 (App Router, `src/`), Supabase (Auth/DB/Storage), Tailwind, Mercado Pago Checkout Pro + PIX, Resend (e-mail), Cloudflare Turnstile, Vercel, GitHub.

- Produção: `https://sacode.cantorcaiolacerda.com.br` · Página do evento: `/evento/sacode-15-edicao`
- Projeto local: `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`
- **Pasta de Downloads do Fernando: `C:\Users\fzede\Downloads`** (usar esse caminho direto nos `Move-Item`)
- Repo: `zdkproducoes/sacode-ingressos` (branch `main`) · deploy automático na Vercel a cada push no `main`
- Supabase project ID: `nsbyylbgnmzlgfwzgasl`
- Event ID: `6539575d-7a71-4c50-8f62-955bc5a96947` · slug: `sacode-15-edicao`
- DPO/privacidade: `privacidade@zdkproducoes.com.br` · CNPJ controlador (Caio Lacerda): 44.816.216/0001-03
- **Meta Ads:** conta `1779584973842` · campanha `6958415932844` · conjunto `6958415932644` · anúncio `6958415933044` · afiliado de medição = code **`ads`**. Pixel `1415319082934143` ainda **não instalado**.
- Lib `mercadopago` = **v2.12.0** · cliente em `src/lib/mercadopago/client.ts` (agora exporta `mpPreference`, `mpPayment`, `mpPaymentRefund`).

---

## 4. Opção A — FECHADA (histórico; ler antes de mexer em lotes)

**Fonte única da verdade:** disponibilidade de lote = `paid_count` da view `public.batch_availability` (conta `order_items` aprovados e não-cancelados), **nunca** `sold_count`.

Estado final desta sessão:
- `increment_batch_sold` **não marca mais `sold_out`** (só incrementa o contador).
- `sold_count` no banco **bate com os pagos reais** (ressincronizado).
- Home e checkout já liam de `batch_availability` desde o v21 (filtro = `status='active'` + `paid_count < quantity` + janela `starts_at`/`ends_at`).

### Pontas soltas remanescentes (baixa prioridade, banco já está honesto)
- **`sold_count` ainda é incrementado** pela função a cada pagamento. Como ninguém mais o usa pra disponibilidade (só 2 travas anti-superlotação em `api/checkout/create/route.ts:47` e `api/admin/cortesias/route.ts:116`), num ciclo futuro dá pra aposentá-lo de vez (fazer as travas lerem `batch_availability`). Não urgente.
- **Agendamento ATIVO de lote** (lote `paused`→`active` sozinho na hora) continua **não existindo** — precisa de Vercel Cron. O **agendamento PASSIVO** (lote `active` + janela de datas que aparece/some sozinho) já cobre o caso de uso atual.

---

## 5. Item 1 — Cancelamento/Reembolso (FEATURE COMPLETA — ler se for mexer)

**Arquivos:**
- `src/app/api/admin/orders/[id]/reembolsar/route.ts` (POST) — a rota. **OBS:** o caminho é em `orders` (não `pedidos`), junto do `resend-email` existente.
- `src/components/admin/ReembolsarButton.tsx` — botão + modal (confirmação dupla + caixa de motivo obrigatória).
- `src/app/admin/pedidos/page.tsx` — encaixa o botão na coluna "Ações" (só em pedidos `approved`), passa `isCourtesy`.
- `src/lib/mercadopago/client.ts` — ganhou `export const mpPaymentRefund = new PaymentRefund(mpConfig);`.

**Como funciona (testado em produção, pedido #148 — PIX R$2 estornado de verdade):**
1. Valida admin/producer.
2. **Motivo obrigatório** (mín. 3 chars) → gravado em `orders.cancellation_reason` + `audit_logs`.
3. Busca o pedido; lê o **`payment_id` real de `payment_gateway_data->>'payment_id'`** (número puro, ex. `162192364903`). **NÃO usar `payment_gateway_id`** — esse é o ID da *preference* (formato `658407697-uuid`), inútil pro refund.
4. **Idempotência:** recusa se já for `refunded`/`cancelled`, ou se não for `approved`.
5. **Decisão estorno vs cortesia:**
   - **Pedido pago** (tem `payment_id`): estorna TOTAL no MP via `mpPaymentRefund.create({ payment_id: Number(id), body: {} })` → se OK, `orders.payment_status='refunded'`.
   - **Cortesia** (`is_courtesy=true`, sem `payment_id`): **pula o estorno** (nada a devolver) → `orders.payment_status='cancelled'`.
   - **Sem `payment_id` e NÃO cortesia** (venda manual futura): **bloqueia** (422) — não sabe lidar ainda.
6. Em ambos os casos: **`order_items.status='cancelled'`** + `cancelled_at`. Isso **anula o QR** e **libera a vaga** de uma vez.
7. **Banco só é tocado DEPOIS do estorno dar certo.** Se o MP falhar, nada muda (sem inconsistência) → toast de erro.

**Por que `status='cancelled'` resolve QR + vaga (confirmado lendo o validador `api/checkin/validate/route.ts`):**
- Check-in só passa se `order_items.status === 'valid'` **E** `orders.payment_status === 'approved'`. Reembolso quebra os dois → QR recusado (dupla trava).
- `batch_availability` conta `order_items` com `status != 'cancelled'` → marcar `cancelled` libera a vaga.
- Ou seja: `cancelled` é o valor que satisfaz as duas regras. (Valores observados em `order_items.status`: `valid`, `cancelled`.)

**Limite de prazo:** o código não tem limite de data; o MP é quem pode recusar estorno antigo. Fernando confirmou que **não haverá reembolso com mais de 60 dias**, então o prazo do MP não é problema na prática.

---

## 6. BACKLOG PÓS-EVENTO (atualizado)

### Concluídos nesta sessão (v22)
- ✅ **Opção A etapas 3-4** (auto-`sold_out` desarmado + `sold_count` ressincronizado).
- ✅ **Resumo do admin** (relatório PIX/cartão, faturamento líquido, anti-subcontagem, cortesias no gráfico de gênero).
- ✅ **Item 1 — Cancelamento/Reembolso** (pago estorna no MP + cortesia cancela só QR).

### Itens NOVOS mapeados (vindos do v21, ainda abertos)
- **[NOVO] Auto-resgate de cortesia pelo público (self-service).** Lote `price=0` visível → usuário logado resgata grátis (gera QR + e-mail, SEM MP). Bug atual: checkout trava em "valor total inválido" pra lote 0. Solução: detectar total 0 → fluxo de resgate (reusar engrenagem de `api/admin/cortesias`); botão vira "Resgatar ingresso grátis". Cuidados: limite por pessoa, login+e-mail confirmado, limite do lote.
- **[NOVO] Agendamento ATIVO de lote (Vercel Cron).** Avaliar se é mesmo necessário (passivo já cobre).
- **[NOVO] Remover/simplificar status `scheduled`.** Fernando acha confuso. 3 pontos a tocar: (1) seletor no `LoteFormModal.tsx`; (2) `proximoLote = allBatches.find(b => b.status === 'scheduled')` na home (`evento/[slug]/page.tsx`, usado pro aviso "vira em X horas"); (3) `StatusBadge` no `LotesAdminClient.tsx`.
- **[NOVO] Faxina de código morto.** Confirmados: `src/app/evento/[slug]/EventPageClient.tsx` (morto, nenhum import) + `isBatchAvailable`/`getBatchStatusLabel` em `src/lib/utils.ts`. Ferramenta: Claude Cowork ou `npx knip`/`ts-prune`. Cuidado: rotas Next são "usadas por convenção" — revisão humana + `npm run build` antes de apagar. Fazer ANTES do multi-tenant.
- **[NOVO/parcial] Toggle de senha** — feito no login (v21). Falta replicar em cadastro (`SignupForm`) e redefinir-senha (`RedefinirSenhaForm.tsx`).

### Correções/melhorias do v20 ainda pendentes
1. ~~Cancelamento/Reembolso~~ ✅ FEITO (v22).
2. **Detalhe de pedido no admin** (item 3) — afiliado, forma de pagamento, status, taxas, datas por pedido.
3. **Admin>Pedidos não lista todos** (item 4) — hoje tem `.limit(50)` explícito no `pedidos/page.tsx`. Investigar paginação/filtro pra mostrar tudo.
4. **Venda offline / PIX manual** (item 5) — cadastro prévio + pedido que conta como venda real (separado de cortesia), gera QR+e-mail sem webhook. (Primo do auto-resgate.)
5. **Nubank "possível golpe"** (item 6) — origem externa; mitigar (razão social clara no checkout).
6. **Página de status PIX que se atualiza sozinha** (melhoria b) · **Reconciliação financeira no admin** (melhoria c).

### Áreas novas / escala
- **Área "Público"** (dashboard por produtor: idade/sexo/aniversariantes) + sub-área **Aniversariantes** (WhatsApp).
- **Escala multi-produtor white-label** (item 8): manter schema; separar DEV/PROD; `organizations` + `organization_id`; RLS por tenant; **tirar `service_role` do admin/checkout**; super-admin (Fernando) acima das orgs. Pentest antes do 1º produtor externo.

---

## 7. Como trabalhar com o Fernando (aplicar sempre)

1. **Passo a passo numerado e simplificado**, sem assumir conhecimento.
2. **Dizer qual janela:** DEV (`npm run dev`), GIT (git/shell), CLAUDE (Claude Code). **SQL vai no Supabase SQL Editor.**
3. **Padrão sequencial:** próximo passo + o seguinte com condição. Ele decide se segue ou pausa. Não repetir passos quando ele cola a saída.
4. **Entrega de arquivos:** artefato pra download (`present_files`) → ele move com:
   `Move-Item -LiteralPath "C:\Users\fzede\Downloads\<arquivo>" -Destination "<destino>" -Force`
   Conteúdo completo, nunca diff parcial em arquivo grande.
5. **Commits:** mensagens em português minúsculo, pequenos e temáticos.
6. **Validar cada passo (checkpoint).** SELECT antes de UPDATE/DELETE.
7. **Fechamento de sessão:** gerar `contexto-sacode-vN.md`.

**Ritual de edição de arquivo (SEMPRE nesta ordem):**
1. **Parar o `npm run dev`** (Ctrl+C na janela DEV) ANTES de buildar.
2. `Move-Item` o arquivo (caminho do Downloads: `C:\Users\fzede\Downloads\...`).
3. Checar integridade (chaves): `$c = Get-Content -LiteralPath "arquivo" -Raw; $open = ($c.ToCharArray() | Where-Object { $_ -eq '{' }).Count; $close = ($c.ToCharArray() | Where-Object { $_ -eq '}' }).Count; Write-Host "Diferenca: $($open - $close)"` → tem que dar 0.
4. `npm run build` (com dev parado).
5. Subir `npm run dev` de novo pra teste visual.

**Gotchas críticos:**
- **NUNCA rodar `npm run build` com o `npm run dev` ligado** — corrompem o `.next`. Conserto: parar dev → `Remove-Item -Recurse -Force .next` → `npm run dev` → Ctrl+Shift+R.
- **Dev e produção compartilham o MESMO banco Supabase.** Views/grants/funções/SQL valem em produção na hora. SELECT antes de tudo.
- **Status de pedido pago = `approved`** (não `paid`). Faturamento (líquido) = `total − service_fee` com `payment_status='approved' AND is_courtesy=false`. Disponibilidade de lote = **`paid_count`** (view `batch_availability`), nunca `sold_count`.
- **payment_id do MP** está em `payment_gateway_data->>'payment_id'` (número puro). `payment_gateway_id` é a preference (inútil pra refund).
- **Auth com `@supabase/ssr`:** operações de auth (signOut/updateUser/exchangeCodeForSession) rodam **server-side** (Route Handler). Pós-login/logout: `window.location.href` (recarga real), não `router.push`.
- **`.order('sort_order')` quebra com múltiplos `.eq()`** → workaround `.order('id')`.
- **Queries Supabase grandes:** PostgREST corta em ~1000 linhas por padrão → usar `.range(0, N)` em agregações que precisam de todas as linhas.
- PowerShell: `[`/`]` são curinga → sempre `-LiteralPath "..."`; "Success. No rows returned" é normal pra UPDATE/CREATE VIEW/FUNCTION.
- `EventPageClient.tsx` é **código morto**. Página viva do evento = `evento/[slug]/page.tsx`.

---

## 8. Jurídico (v1.0, publicado — inalterado)
Sem meia-entrada; transferência gratuita até 6h antes; arrependimento 7 dias; reembolso integral até 30 dias em cancelamento/adiamento. ZDK = Operadora; Caio Lacerda (CNPJ 44.816.216/0001-03) = Controlador. No multi-produtor: cada produtor vira Controlador; ZDK = Operadora de vários.

---

## 9. Como começar a próxima sessão
> Claude, retomando o SACODE. Anexo `contexto-sacode-v22.md`. Quero atacar [ITEM DA SEÇÃO 6].

**Sugestão de ordem de ataque:**
1. Pendências baratas / confiança: **Admin>Pedidos listando tudo** (tirar/paginar o `.limit(50)`), replicar **toggle de senha** (cadastro/redefinir), **detalhe de pedido** no admin.
2. Features de operação: **auto-resgate de cortesia** + **venda offline** (engrenagem comum, geram ingresso sem webhook), **status PIX auto-atualizável**, **reconciliação financeira**.
3. Limpeza: **remover `scheduled`** (3 cuidados) + **faxina de código morto** (Cowork) — antes do multi-tenant.
4. Aposentar de vez o `sold_count` (fazer as 2 travas lerem `batch_availability`).
5. Fundação multi-tenant (dev/prod → organizations → RLS → tirar service_role) → área Público → rebrand/white-label → pentest.

**Itens rápidos/baixo risco pra "aquecer":** replicar toggle de senha; tirar/paginar o `.limit(50)` em pedidos; detalhe de pedido no admin.
