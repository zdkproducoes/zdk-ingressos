# Contexto SACODE — v23

> Continuação do `contexto-sacode-v22.md`. Sessão de 27/06/2026.
> Plataforma de ingressos própria da ZDK Produções (Fernando Zedeque), construída para os eventos do Caio Lacerda, com objetivo de virar SaaS white-label multi-produtor.

---

## 0. Como trabalhamos (reforço — seguir sempre)

- **Fluxo manual mantido** (decisão desta sessão): Claude gera o arquivo completo → Fernando baixa → `Move-Item` na janela GIT → checa balanço de chaves → para o DEV → `npm run build` → testa → commita → reinicia DEV. Fernando prioriza **entender** cada mudança, não só receber código pronto. O fluxo manual está cumprindo esse papel.
- **Quando voltar a usar o Claude Code:** apenas nas tarefas "braçais" de muitos arquivos (faxina de código morto, fundação multi-tenant, refatorações grandes). Pra tudo antes disso, seguimos no fluxo manual.
- Sempre: instruções **numeradas, passo a passo**, sem conhecimento assumido (Fernando é dev iniciante).
- Sempre indicar a janela: **DEV** (servidor local), **GIT** (git/build), **CLAUDE** (Claude Code).
- Arquivos com acento → entregar como **artefato pra download**, mover com `Move-Item` (janela GIT). Pasta de downloads: `C:\Users\fzede\Downloads`.
- **SELECT antes de qualquer UPDATE destrutivo.** Dev e prod compartilham o mesmo banco Supabase — todo write é definitivo na hora.
- Validar **balanço de chaves** antes de cada build.
- Commits: mensagens em português minúsculo, agrupadas por tema.

---

## 1. Stack & coordenadas

- **Stack:** Next.js 14.2.21 (App Router, `src/`), Supabase (Auth/DB/Storage), Tailwind, TypeScript, Mercado Pago (SDK `mercadopago` v2.12.0), Resend, Cloudflare Turnstile, Vercel, GitHub (`zdkproducoes/sacode-ingressos`, branch `main`).
- **Local:** `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`
- **Produção:** `https://sacode.cantorcaiolacerda.com.br`
- **Event ID:** `6539575d-7a71-4c50-8f62-955bc5a96947` | **slug:** `sacode-15-edicao`
- **Suporte (decidido nesta sessão):** `suporte@zdkproducoes.com.br` — ⚠️ **AÇÃO PENDENTE DE FERNANDO:** criar de fato essa caixa no provedor de e-mail. As mensagens de erro do cadastro já apontam pra lá; sem a caixa existir, o cliente escreve no vazio.
- DPO: `privacidade@zdkproducoes.com.br`.

---

## 2. O que esta sessão (v23) entregou — TUDO JÁ EM PRODUÇÃO

### 2.1. Toggle de senha (mostrar/ocultar) — concluído
- Adicionado em `src/components/auth/RedefinirSenhaForm.tsx` (2 campos: nova senha + confirmar) e `src/components/auth/SignupForm.tsx` (2 campos: senha + confirmar). Cada campo tem botão de olho independente (Eye/EyeOff do `lucide-react`).
- O `LoginForm.tsx` já tinha o padrão; serviu de referência.

### 2.2. Prevenção de e-mail errado no cadastro — concluído
Contexto do problema: uma cliente errou o e-mail no cadastro, não recebeu a confirmação e não conseguia refazer (CPF já na base). Decidiu-se **prevenir + orientar**, não criar fluxo de autoatendimento de troca de e-mail (CPF é semi-público → troca self-service é risco de sequestro de cadastro; correção de e-mail travado segue sendo tarefa manual de Fernando no Supabase).
- **Detector de domínio** ("Você quis dizer joao@gmail.com?") em `SignupForm.tsx`: helper `suggestEmail()` com Levenshtein + listas `POPULAR_DOMAINS/SLDS/TLDS` + `FORCE_COM_SLDS` (gmail/outlook/icloud/live só usam .com). Roda no `onBlur` do campo e-mail; sugestão clicável corrige o campo. Testado: conserta gmial/gmail.con/gmai/hotmai/outlok e gmail.com.br→gmail.com; NÃO dá falso positivo em domínio próprio nem em hotmail.com.br/yahoo.com.br válidos.
- **Campo "Confirmar e-mail"** com **colar bloqueado** (`onPaste preventDefault`) e validação de coincidência.
- **Pop-up de aviso no envio:** `validate()` agora preenche `errors._form` quando há erro, o que abre o `ErrorModal` (pop-up). Antes, o usuário clicava em "Criar conta" e parecia que nada acontecia (o erro ficava lá no topo, fora da vista). Mensagem específica pro caso de e-mails que não coincidem; genérica pros demais.

### 2.3. Mensagens de duplicado no signup — concluído
- `src/app/api/auth/signup/route.ts`: mensagens de **CPF duplicado** e **e-mail duplicado** reescritas, apontando pro `suporte@zdkproducoes.com.br` e orientando login / "esqueci minha senha" / contato se errou o e-mail.
- Decisão: mensagem **robusta única** (cobre confirmado e não-confirmado no texto), **não** detecta confirmado vs não-confirmado — porque a confirmação é por sistema customizado (tabela `email_confirmations` + token, `email_confirm:false`) e não dá pra ter certeza, só por aquele arquivo, se marca o campo nativo do Supabase. Se um dia quiser a versão "inteligente", precisa ver `src/app/auth/confirmar/route.ts` (ou equivalente) pra saber como a confirmação marca.

### 2.4. Admin > Pedidos: paginação + filtro + WhatsApp — concluído
Arquivo: `src/app/admin/pedidos/page.tsx` (server component).
- **Paginação server-side** via URL: `?page=N&perPage=M&status=S`. Resolve o bug do `.limit(50)` que escondia pedidos. Usa `.range(from,to)` + `{ count: 'exact' }`.
- **Números de página** com janela inteligente (`pageList()` → `1 … 4 5 6 … 20`), botões primeira/última (« ») e anterior/próximo (‹ ›).
- **Seletor de itens por página:** 10 / 30 / 50 / 100 / 200 (default 50). Trocar volta pra página 1.
- **Filtro por status** (abas no topo): Todos / Aprovados / Pendentes / Cancelados / Reembolsados / Rejeitados / **Não finalizados**. Aplica `.eq('payment_status', status)`.
- **Botão WhatsApp** por pedido (`waHref()`): abre `wa.me` com o telefone do cliente (`profiles.phone`) já normalizado e mensagem pronta (diferente pra `pending` vs demais). Normalização: `digits.length >= 12` → já tem código de país; senão prefixa `55`. Trata corretamente DDD 55 (Santa Maria/RS) e número já com 55. Aparece em todos os pedidos com telefone; some (mostra "—") se não houver telefone. Fernando gostou de manter em aprovados também (uso de suporte/fidelização).
- ⚠️ **Gotcha resolvido:** o `tsconfig` mira ES abaixo de 2015 (ou `downlevelIteration` off) → **não dá pra usar `[...set]`** (spread de Set/Map). Usar **`Array.from()`**. Quebrou o build uma vez; corrigido.
- Next 14: `searchParams` chega como **objeto normal** (sem `await`) no server component.

### 2.5. Status novo `abandoned` ("Não finalizado") — em andamento
Decisão de modelagem: separar PIX-não-pago de cancelamento-pedido-pelo-cliente. Hoje `cancelled` estava sobrecarregado (abandono + reembolso). Novo: **valor no banco `abandoned`**, **rótulo na tela "Não finalizado"**.
- ✅ **Passo 1 (banco):** `ALTER` no constraint `orders_payment_status_check` — agora aceita: `pending, approved, rejected, cancelled, refunded, in_process, **abandoned**`.
- ✅ **Passo 2 (tela de pedidos):** `statusConfig` ganhou `abandoned: { label: 'Não finalizado', classes: 'bg-wine-800 text-cream-400' }`; filtro ganhou aba "Não finalizados" (`ALLOWED_STATUS` + `STATUS_TABS`). Deployado.
- ✅ **Verificado, sem mudança necessária:**
  - `batch_availability` (view) só conta `payment_status = 'approved' AND oi.status <> 'cancelled'` como `paid_count` → **abandoned não segura vaga de lote** automaticamente.
  - Validador de check-in só aceita `approved` + item `valid` → abandoned não passa.

### 2.6. Investigação dos 19 pendentes + limpeza — concluído
- **Diagnóstico (com confiança):** o webhook do MP **funciona** (os 74 aprovados são prova). Os 19 pendentes tinham `payment_gateway_data->>'payment_id' = null` em **todos** → o MP **nunca notificou** esses pagamentos. São **PIX abandonado** (gerou QR, nunca pagou, PIX expirou sem webhook confiável). **NÃO** é bug de assinatura/HMAC (se fosse, haveria `payment_id` gravado com status pending). O pedido nasce `pending` no **checkout** (geração do PIX), não no webhook.
- **Limpeza feita:** os 19 (16 abandono confirmado por contato + 2 internos "Equipe Check-in" + Kauan/80 conferido no MP) foram marcados `cancelled` com `cancellation_reason`. Resultado pós-limpeza: `approved 74, cancelled 29, refunded 2, rejected 1`, `pending 0`.
- **Os 19 order_numbers:** `65,72,76,77,78,80,86,93,105,111,116,123,127,133,134,139,144,145,146`.
- **Decisão:** reclassificar esses 19 de `cancelled` → `abandoned` (é o **Passo 7**, ainda pendente — ver abaixo).

---

## 3. PRÓXIMOS PASSOS (retomar exatamente aqui)

Plano do status `abandoned` + reconciliação, em ordem segura. Já feitos: Passo 1, Passo 2.

### → Passo 4 (PONTO DE ENTRADA DA PRÓXIMA SESSÃO): conferir o resumo/financeiro do admin
- Garantir que "Não finalizado" (`abandoned`) **não** seja contado como venda nem se misture com reembolso.
- Pedir a Fernando (janela GIT, só leitura): `Get-Content -LiteralPath "src\app\admin\resumo\page.tsx" -Raw` (confirmar o caminho real do resumo/dashboard financeiro).
- Lembrar: status "pago" = **`approved`** (termo do MP), nunca `paid`.

### Passo 3: montar a reconciliação automática (Vercel Cron)
- Robô agendado que pega pedidos `pending` com mais de X horas, **consulta o MP** o status real de cada um, e corrige o banco (aprova o raro "pagou mas webhook sumiu"; grava **`abandoned`** nos não pagos). Nunca cancela pelo relógio às cegas — sempre confirma no MP antes.
- Pra implementar, vou precisar ver **como o checkout cria o pedido** (achar o pagamento no MP a partir do pedido) — provavelmente `src/app/api/checkout/route.ts` ou similar. O `external_reference` no MP é o `order.id` (visto no webhook).
- **Endurecer junto:** o webhook (`src/app/api/checkout/webhook/route.ts`) responde `ok:true` em alguns caminhos de erro (falha do `mpPayment.get`, catch genérico) → MP acha que deu certo e **não retenta** → fonte de webhooks perdidos. Não foi a causa dos 19, mas vale corrigir junto da reconciliação.

### Passo 7 (por último): reclassificar os 19 `cancelled` → `abandoned`
- SELECT antes, UPDATE travado em `payment_status = 'cancelled'` + lista dos 19 order_numbers + `RETURNING`. Distinguir: só reclassificar os que foram da nossa limpeza (não tocar em cancelamentos legítimos/reembolso). Como a limpeza usou `cancellation_reason = 'Limpeza pos-evento: PIX pendente nao pago (abandono/interno)'`, dá pra filtrar com segurança por `order_number IN (...)` E/OU por esse reason.

---

## 4. Backlog (depois do bloco abandoned/reconciliação)

Em destaque, o que Fernando pediu/priorizou nesta sessão:

1. **Aba Check-in — relacionamento (Fernando quer logo a seguir).** Saber **quem deu check-in e quem não deu**, pra: mandar **agradecimento** a quem foi e **"senti sua falta / próximo é dia X"** a quem não foi. Mapear primeiro: `Get-ChildItem -Recurse -Path src -Include *checkin*, *check-in* | Select-Object FullName`. Verificar se existe campo tipo `checked_in_at` ou se o check-in só muda `order_items.status`. Provavelmente criar/!registrar data de entrada sem quebrar o validador atual.
2. Detalhe de pedido no admin (visão rica por pedido: afiliado, método, fees, timestamps).
3. Geração de pedido offline (admin pré-registra comprador, gera QR + e-mail sem webhook).
4. Nubank "possível golpe" (banco do pagador sinaliza recebedor MP).
5. Lote turnover desync (BUG): homepage atualiza preço mas checkout serve lote antigo.
6. **Multi-produtor white-label** (fundação multi-tenant — tarefa grande, candidata a Claude Code).
7. Dashboard "Público" + "Aniversariantes" (campanha de WhatsApp por mês).
8. Melhorias aprovadas: página de status-PIX auto-atualizável; view de conciliação financeira (MP real + offline/PIX-manual); limpar logs `[DIAG]`.

---

## 5. Aprendizados-chave (acumulado + novos desta sessão)

**Novos (v23):**
- `tsconfig` target < ES2015 (ou downlevelIteration off) → **nunca** `[...set]`/`[...map]`; usar `Array.from()`. (quebrou build)
- Next 14: `searchParams` é objeto normal no server component (sem `await`).
- `batch_availability` conta só `approved` + item `<> cancelled` → **qualquer** status não-aprovado (incl. `abandoned`) libera a vaga sozinho.
- `orders_payment_status_check` agora inclui `abandoned`. (Se for gravar status novo no futuro, **checar o CHECK antes** — senão o write é rejeitado.)
- WhatsApp wa.me: `digits.length >= 12` = já tem país; senão prefixa `55`. Trata DDD 55 corretamente.
- Diagnóstico de pendente: `payment_gateway_data->>'payment_id' = null` ⇒ MP nunca notificou (PIX abandonado normal). Webhook saudável se os aprovados existem.
- `ErrorModal` é o pop-up; setar `errors._form` abre ele; erros de servidor (`data.error`) também caem em `_form`.
- `profiles.id === auth.users.id` (trigger `handle_new_user`). Dup de CPF é checada em `profiles.cpf`.
- Telefone é salvo só com dígitos (o signup faz `.replace(/\D/g,'')`).

**Acumulado (de v22, ainda válido):**
- `sold_count` não é confiável (cancelamentos não decrementam); fonte da verdade é `order_items` por `payment_status='approved'`, encapsulado na view `batch_availability` (`paid_count`).
- Dev/prod **mesmo banco** = maior risco arquitetural; SELECT antes de todo write.
- Admin usa `service_role` (bypassa RLS); isolamento por tenant só será possível quando isso mudar.
- MP: `payment_gateway_id` guarda o **preference id** (`658407697-uuid`); o payment id real está em `payment_gateway_data->>'payment_id'`.
- QR invalidação tem 2 guardas no validador: `order.payment_status !== 'approved'` **e** `item.status !== 'valid'`. Setar `order_items.status='cancelled'` satisfaz os dois.
- `npm run build` só com o DEV parado (rodar os dois corrompe `.next`/CSS). Fix: parar dev → `Remove-Item -Recurse -Force .next` → reiniciar → hard refresh.
- PowerShell: paths com `[` `]` exigem `-LiteralPath` e aspas.
- `payment_status` pago = `approved` (não `paid`).
- `navigator.locks`: múltiplos clientes Supabase no mesmo browser → `NavigatorLockAcquireTimeoutError`; Route Handlers server-side resolvem.
- Páginas públicas precisam de `force-dynamic` (ISR serve dados velhos).
- Pós-login: `window.location.href` em vez de `router.push`+`refresh`.
- Cookie de afiliado só server-side.
- `.order('sort_order')` com múltiplos `.eq()` zera resultados (bug conhecido); workaround `.order('id')`.
- Nunca testar fluxo destrutivo com conta admin/produção; usar descartável (`email+teste1@gmail.com`).

---

## 6. Pessoas & ferramentas

- **Fernando Zedeque** — super-admin da plataforma + produtor. Dev iniciante, quer entender as mudanças.
- **Caio Lacerda** — artista/dono do evento, titular da conta MP de produção, CNPJ 44.816.216/0001-03.
- Resend envia de `SACODE <nao-responda@cantorcaiolacerda.com.br>`. Suporte (a criar): `suporte@zdkproducoes.com.br`.
- Supabase SQL Editor = interface principal de schema/queries (sem pasta de migrations local).
- Vercel = hosting + env vars. Mercado Pago `mpPaymentRefund.create` p/ reembolso. `html5-qrcode` (check-in), `lucide-react`, `@tailwindcss/typography`.
- Meta Ads: conta `1779584973842`, campanha `6958415932844`, código de afiliado `ads`.

---

## 7. Arquivos tocados nesta sessão (referência rápida)

- `src/components/auth/RedefinirSenhaForm.tsx` — toggle de senha (2 campos).
- `src/components/auth/SignupForm.tsx` — toggle de senha, detector de domínio (`suggestEmail` + Levenshtein), confirmar e-mail (colar bloqueado), pop-up no envio.
- `src/app/api/auth/signup/route.ts` — mensagens de CPF/e-mail duplicado com suporte.
- `src/app/admin/pedidos/page.tsx` — paginação (números/primeira/última/itens por página), filtro por status, botão WhatsApp, badge+aba `abandoned`/"Não finalizado".
- Banco: `ALTER` no `orders_payment_status_check` (+`abandoned`); UPDATE dos 19 pendentes → `cancelled`.

---

*Fim do v23. Retomar no **Passo 4** (conferir o resumo/financeiro do admin), depois reconciliação (Passo 3) e reclassificação dos 19 (Passo 7).*
