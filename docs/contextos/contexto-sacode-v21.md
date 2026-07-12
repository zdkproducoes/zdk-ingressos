# Contexto SACODE — v21

> Documento de continuidade. Suba/cole no início de uma nova conversa para dar sequência ao projeto.
> Sucessor do v20. Esta sessão foi a **primeira leva de desenvolvimento pós-evento** — fechou as dívidas baratas e o trabalho de raiz do `sold_count`/virada de lote (item 7 + melhoria "a").

---

## 1. Quem é / o que é

**Fernando Zedeque (ZDK Produções)** construiu o **SACODE**, plataforma própria de ingressos para os eventos do artista **Caio Lacerda**. Diferencial estratégico: **posse dos dados do cliente** (CPF, e-mail, telefone, idade, sexo, histórico) para marketing direto. Visão de longo prazo: virar um **SaaS de ingressos multi-produtor white-label** (ver Seção 6).

MVP validado no **SACODE 15ª Edição** (07/06/2026). Fernando se considera **dev iniciante** — ver Seção 7 (como trabalhar com ele).

---

## 2. Estado atual (pós-sessão v21)

- **Produção descongelada e ativa.** Trabalho de desenvolvimento em andamento.
- **Banco compartilhado dev=prod** — segue valendo. SQL destrutivo exige cuidado redobrado; views/grants criados no SQL Editor já valem em produção na hora.
- Lotes hoje: todos os de venda real estão `paused` ou `scheduled`; só o "Cortesia" (invisível) está `active`. Evento já passou.

### O que esta sessão (v21) entregou e fez deploy em produção:
1. **Logs `[DIAG]` removidos** do `checkout/page.tsx` (2 queries de diagnóstico que rodavam a cada acesso, removidas).
2. **Logout corrigido** — era client-side (`supabase.auth.signOut()` no browser + `router.push`), não limpava cookie HttpOnly. Agora é **server-side** via nova rota `src/app/auth/signout/route.ts` (POST → signOut → redirect 303) + `<form action="/auth/signout" method="post">` na Navbar. Sai de verdade.
3. **FOUC da navbar eliminado** — login agora é lido **no servidor** no `layout.tsx` (async, `getUser` + profile) e passado pra Navbar como prop `initialAuth`. Navbar vem preenchida no 1º HTML. `onAuthStateChange` mantido pra updates ao vivo.
4. **Mostrar/ocultar senha no login** — ícone Eye/EyeOff (toggle) no `LoginForm.tsx`. (Cadastro e redefinir-senha ainda NÃO têm — candidatos a replicar depois.)
5. **Item 7 + melhoria "a" — RESOLVIDO (o trabalho de raiz):** ver Seção 4.
6. **Coluna "Período" no admin de lotes** (`LotesAdminClient.tsx`) — mostra início/fim de cada lote (dd/mm/aa).

---

## 3. Stack & identificadores-chave

**Stack:** Next.js 14 (App Router, `src/`), Supabase (Auth/DB/Storage), Tailwind, Mercado Pago Checkout Pro + PIX, Resend (e-mail), Cloudflare Turnstile, Vercel, GitHub.

- Produção: `https://sacode.cantorcaiolacerda.com.br` · Página do evento: `/evento/sacode-15-edicao`
- Projeto local: `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`
- Repo: `zdkproducoes/sacode-ingressos` (branch `main`) · deploy automático na Vercel a cada push no `main`
- Supabase project ID: `nsbyylbgnmzlgfwzgasl`
- Event ID: `6539575d-7a71-4c50-8f62-955bc5a96947` · slug: `sacode-15-edicao`
- DPO/privacidade: `privacidade@zdkproducoes.com.br` · CNPJ controlador (Caio Lacerda): 44.816.216/0001-03
- **Meta Ads:** conta `1779584973842` · campanha `6958415932844` · conjunto `6958415932644` · anúncio `6958415933044` · afiliado de medição = code **`ads`**. Pixel `1415319082934143` ainda **não instalado**.

---

## 4. Item 7 + sold_count — o que foi feito (LER ANTES de mexer em lotes)

### Diagnóstico (confirmado por SELECTs)
- O `sold_count` gravado em `ticket_batches` estava **inflado** (ex.: Lote 02 = 170 gravado vs **61** pagos reais). Causa = mistura de: reembolsos/cancelamentos que não descontavam, possíveis webhooks MP repetidos, dados de teste removidos sem ajustar o contador, e a intervenção manual da festa.
- A função do banco `increment_batch_sold(p_batch_id, p_qty)` (em `sql/01_migrations.sql`) faz `sold_count += qty` **E** vira `status='sold_out'` automaticamente quando bate `quantity`. É chamada só no **webhook** (`api/checkout/webhook`) e em **cortesias** (`api/admin/cortesias`) — ou seja, sobe no pagamento, mas **nunca descia** → inflava → lote virava `sold_out` cedo demais → sumia das telas → motivou a intervenção manual na festa.
- Havia também **divergência home vs checkout**: cada tela refazia o filtro de "lote disponível" na mão, com critérios diferentes (a home pega o mais barato ativo; o checkout lista todos os ativos; nenhuma das duas checava as datas no início).

### Solução adotada: Opção A — "fonte única da verdade" (NÃO sincronizar sold_count)
Decisão do Fernando, recomendada: parar de confiar no `sold_count` e **contar pagos reais ao vivo**.

**O que foi criado/alterado (TUDO já em produção):**
- **View `public.batch_availability`** (criada no SQL Editor): `select b.*, count(order_items aprovados e não-cancelados) as paid_count ... group by b.id`. `grant select ... to anon, authenticated` aplicado. (É security-definer por padrão — agrega contagem correta independente de RLS; só expõe colunas do lote + `paid_count`, sem PII.)
- **`src/app/evento/[slug]/page.tsx`** (home, servidor): lê de `batch_availability`; filtro de lote ativo agora = `status==='active'` + `paid_count < quantity` + janela de datas (`starts_at`/`ends_at`).
- **`src/lib/lote-helpers.ts`**: `calcularUrgencia` usa `paid_count` (tipo `LoteRow` agora exige `paid_count`, não `sold_count`).
- **`src/components/evento/LoteAtivoCopa.tsx`**: tipo `LoteAtivo` usa `paid_count`.
- **`src/app/checkout/page.tsx`**: lê de `batch_availability`; mesmo critério da home (paid_count + datas). Mantém `supabaseAdmin`/`service_role` por ora (tirar isso é da fase multi-tenant, item 8).
- **`src/components/checkout/CheckoutClient.tsx`**: tipo `Batch` usa `paid_count` + `starts_at`/`ends_at`; `available = quantity - paid_count`.

**Resultado:** home e checkout concordam pelo mesmo critério; lote respeita janela de datas; contagem é sempre a verdade. Testado em produção.

### Aprendizado-chave sobre "agendamento de lote" (IMPORTANTE)
Existem DOIS conceitos, não confundir:
- **Agendamento PASSIVO (existe e funciona):** lote precisa estar `status='active'`; as datas `starts_at`/`ends_at` definem a **janela de exibição** (aparece/some sozinho no horário). Fernando validou: deixar vários lotes `active` com janelas de data em sequência faz eles se revezarem sozinhos. **Resolve o caso de uso dele sem cron.**
- **Agendamento ATIVO (NÃO existe):** lote `paused`/`scheduled` que vira `active` sozinho ao bater a hora. Exige um **agendador (Vercel Cron)** — infra nova. Fernando testou esperando isso e "falhou"; não é bug, é feature inexistente. Ver backlog Seção 6.

---

## 5. Etapas restantes da Opção A (NÃO concluídas — fazer quando quiser fechar 100%)

A leitura (onde o bug aparecia) está 100% migrada. Falta "limpar a casa":
- **Etapa 3 — Neutralizar o auto-`sold_out`** da função `increment_batch_sold` (o `CASE WHEN ... THEN 'sold_out'`). Hoje ele ainda pode marcar `sold_out` com base no `sold_count` inflado. Como ninguém mais LÊ `sold_count` pra disponibilidade, o impacto é menor, mas é ponta solta — "esgotado" deveria ser sempre calculado (paid_count ≥ quantity), nunca um status gravado.
- **Etapa 4 — Ressincronizar/aposentar o `sold_count`** no banco (recalcular pro valor real e deixar decorativo, ou remover). Deixa o banco honesto.
- **Travas anti-superlotação (Grupo 2):** `api/checkout/create/route.ts:47` e `api/admin/cortesias/route.ts:116` ainda checam `sold_count`. Hoje são **seguras** (conservadoras demais — bloqueiam cedo, nunca vendem além). Mexer envolve concorrência (corrida pelo último ingresso) — tratar com calma, separado.

---

## 6. BACKLOG PÓS-EVENTO (atualizado)

### Itens NOVOS mapeados nesta sessão (v21)
- **[NOVO] Auto-resgate de cortesia pelo público (self-service).** Lote `price=0` visível no site → usuário logado **resgata** ingresso grátis sozinho (gera QR + e-mail, SEM Mercado Pago). **Bug atual:** no checkout, lote 0 mostra "Ir para pagamento" e trava em "valor total inválido". **Solução:** detectar total/preço 0 e desviar pra fluxo de resgate que cria pedido aprovado/cortesia + dispara QR/e-mail (reusar engrenagem de `api/admin/cortesias`); botão vira "Resgatar ingresso grátis". **Cuidados:** limite por pessoa (antiabuso), exigir login+e-mail confirmado, respeitar limite do lote, decidir se conta como `is_courtesy`. Primo do item 5 (venda offline) — ambos geram ingresso sem webhook.
- **[NOVO] Agendamento ATIVO de lote (Vercel Cron).** Lote vira `active` sozinho ao bater `starts_at` (e anterior vira `ended`). Precisa de Vercel Cron chamando uma rota periódica. Decisões: frequência, o que muda, antiabuso. NOTA: o agendamento passivo já cobre o caso de uso atual do Fernando — avaliar se o ativo é mesmo necessário.
- **[NOVO] Remover/simplificar o status `scheduled`.** Fernando quer tirar `scheduled` do seletor (acha confuso; "deixa active + janela de datas que funciona"). **Cuidado — 3 pontos a tocar:** (1) seletor no `LoteFormModal.tsx`; (2) `proximoLote = allBatches.find(b => b.status === 'scheduled')` na home (`evento/[slug]/page.tsx`) — usado pro aviso de urgência "vira em X horas", quebra se remover; (3) `StatusBadge` no `LotesAdminClient.tsx`. Decidir o que fazer com o aviso de urgência.
- **[NOVO] Faxina de código morto / arquivos órfãos.** Remover não-usados + limpar trechos mortos. **Já confirmados:** `src/app/evento/[slug]/EventPageClient.tsx` (versão antiga da página do evento, NENHUM import aponta pra ele) e, por tabela, as funções `isBatchAvailable` + `getBatchStatusLabel` em `src/lib/utils.ts` (só o EventPageClient morto as chamava). Ferramenta: **Claude Cowork** (varre imports na base toda), ou `npx knip`/`npx ts-prune`. CUIDADO: rotas Next (page/route/layout) são "usadas por convenção", ferramenta pode marcá-las como órfãs por engano → revisão humana + `npm run build` antes de apagar. Fazer ANTES do multi-tenant.
- **[NOVO/concluído parcial] Toggle de senha** — feito no login; replicar em cadastro (`SignupForm`) e redefinir-senha (`RedefinirSenhaForm`) se desejar.

### Correções/melhorias do v20 ainda pendentes
1. **Cancelamento/Reembolso de pedido** (item 1, prioridade) — botão no `admin/pedidos`: `order_items.status='cancelled'` + estorno no MP. Automatiza o runbook do #70.
2. **Detalhe de pedido no admin** (item 3) — afiliado, forma de pagamento, status, taxas, datas.
3. **Admin>Pedidos não lista todos** (item 4) — investigar `LIMIT`/filtro/paginação.
4. **Venda offline / PIX manual** (item 5) — cadastro prévio + pedido que conta como venda real (separado de cortesia), gera QR+e-mail sem webhook.
5. **Nubank "possível golpe"** (item 6) — origem externa; investigar/mitigar (razão social clara no checkout).
6. **Resumo do admin** — usar `payment_status='approved'` (não `'paid'`/`sold_count`); cards (pagos, cortesias, faturamento, taxas, ticket médio) + relatório PIX/cartão.
7. **Página de status PIX que se atualiza sozinha** (melhoria b) · **Reconciliação financeira no admin** (melhoria c).
8. **FOUC navbar** — ✅ FEITO no v21.

### Áreas novas / escala (inalterado do v20)
- **Área "Público"** (dashboard por produtor: idade/sexo/aniversariantes) + sub-área **Aniversariantes** (WhatsApp).
- **Escala multi-produtor white-label** (item 8): manter schema; separar DEV/PROD; `organizations` + `organization_id`; RLS por tenant; **tirar `service_role` do admin/checkout**; super-admin (Fernando) acima das orgs. Pentest antes do 1º produtor externo.

---

## 7. Como trabalhar com o Fernando (aplicar sempre)

1. **Passo a passo numerado e simplificado**, sem assumir conhecimento.
2. **Dizer qual janela:** DEV (`npm run dev`), GIT (git/shell), CLAUDE (Claude Code). **SQL vai no Supabase SQL Editor.**
3. **Padrão sequencial:** próximo passo + o seguinte com condição. Ele decide se segue ou pausa. Não repetir passos quando ele cola a saída.
4. **Entrega de arquivos:** artefato pra download (`present_files`) → ele usa `Move-Item -LiteralPath`. Conteúdo completo, nunca diff parcial em arquivo grande.
5. **Commits:** mensagens em português minúsculo, pequenos e temáticos.
6. **Validar cada passo (checkpoint).** SELECT antes de UPDATE/DELETE.
7. **Fechamento de sessão:** gerar `contexto-sacode-vN.md`.

**Ritual de edição de arquivo (seguir SEMPRE nesta ordem):**
1. **Parar o `npm run dev`** (Ctrl+C na janela DEV) ANTES de buildar.
2. `Move-Item` o arquivo.
3. Checar integridade (chaves): `$c = Get-Content -LiteralPath "arquivo" -Raw; $open = ($c.ToCharArray() | Where-Object { $_ -eq '{' }).Count; $close = ($c.ToCharArray() | Where-Object { $_ -eq '}' }).Count; Write-Host "Diferenca: $($open - $close)"` → tem que dar 0.
4. `npm run build` (com dev parado).
5. Subir `npm run dev` de novo pra teste visual.

**Gotchas críticos:**
- **NUNCA rodar `npm run build` com o `npm run dev` ligado** — os dois escrevem em `.next` e corrompem o CSS/estado (aconteceu nesta sessão; sintoma = site sem estilo, fontes serifadas). Conserto: parar dev → `Remove-Item -Recurse -Force .next` → `npm run dev` → Ctrl+Shift+R.
- **Dev e produção compartilham o MESMO banco Supabase.** Views/grants/SQL valem em produção na hora. SELECT antes de tudo.
- **Status de pedido pago = `approved`** (não `paid`). Faturamento real: `payment_status='approved' AND is_courtesy=false`. Disponibilidade de lote agora = **`paid_count`** (da view `batch_availability`), nunca `sold_count`.
- **Auth com `@supabase/ssr`:** operações de auth (signOut, updateUser, exchangeCodeForSession) precisam rodar **server-side** (Route Handler/server action) — cookie de sessão é HttpOnly, browser não limpa. Pós-login/logout usar **`window.location.href`** (recarga real), não `router.push`.
- **`.order('sort_order')` quebra com múltiplos `.eq()`** → workaround `.order('id')`.
- PowerShell: `[`/`]` são curinga → sempre `-LiteralPath "..."`; "Success. No rows returned" é normal pra UPDATE/CREATE VIEW.
- `EventPageClient.tsx` é **código morto** (não usado). A página viva do evento é `evento/[slug]/page.tsx` (skin Copa: `HeroCopa`, `LoteAtivoCopaWrapper`).

---

## 8. Jurídico (v1.0, publicado — inalterado)
Sem meia-entrada; transferência gratuita até 6h antes; arrependimento 7 dias; reembolso integral até 30 dias em cancelamento/adiamento. ZDK = Operadora; Caio Lacerda (CNPJ 44.816.216/0001-03) = Controlador. No multi-produtor: cada produtor vira Controlador; ZDK = Operadora de vários.

---

## 9. Como começar a próxima sessão
> Claude, retomando o SACODE. Anexo `contexto-sacode-v21.md`. Quero atacar [ITEM DA SEÇÃO 6].

**Sugestão de ordem de ataque:**
1. Pendências baratas restantes / confiança nos números: **Resumo do admin** (`approved`+cards), **Admin>Pedidos listando tudo**, replicar toggle de senha.
2. Fechar a Opção A: **etapas 3-4** (neutralizar auto-`sold_out`, ressincronizar/aposentar `sold_count`).
3. Features de operação: **cancelar/reembolsar** (item 1), **auto-resgate de cortesia** + **venda offline** (engrenagem comum), **detalhe de pedido**, **status PIX**, **reconciliação**.
4. **Faxina de código morto** (Cowork) — antes do multi-tenant.
5. Fundação multi-tenant (dev/prod → organizations → RLS → tirar service_role) → área Público → rebrand/white-label → pentest.

**Itens rápidos/baixo risco pra "aquecer":** replicar toggle de senha (cadastro/redefinir), remover `scheduled` (com os 3 cuidados), datas com hora na coluna Período se quiser.
