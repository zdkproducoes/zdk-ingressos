# Contexto SACODE — v14

**Data:** 27 de maio de 2026
**Sessão anterior:** v13 (Pix ativo, vendas abertas, bug do resumo pendente)

---

## 1. Visão Geral do Projeto

**SACODE** é uma plataforma proprietária de ticketing construída pela **ZDK Produções** (Fernando Zedeque) para vender ingressos do artista **Caio Lacerda**. O objetivo estratégico é **possuir os dados dos clientes** (CPF, e-mail, telefone, histórico de compras) como diferencial competitivo frente a plataformas terceiras.

**Evento de validação do MVP:**
- **SACODE 15ª Edição** com Caio Lacerda
- **Data:** 07 de junho de 2026
- **Local:** Villa Jardim Bar, São Bernardo do Campo (ABC paulista, SP)
- **Vendas:** **ABERTAS** desde 23/05/2026

**Entidades-chave:**
- **Caio Lacerda** — headliner; conta Mercado Pago (User ID 658407697, CNPJ 44.816.216/0001-03) é a recebedora dos pagamentos; também precisa de acesso admin/Mural.
- **ZDK Produções** — produtora do Fernando; Operadora da plataforma sob a LGPD; DPO `privacidade@zdkproducoes.com.br`.

---

## 2. Stack Técnica

- **Frontend:** Next.js 14 (App Router), Tailwind CSS
- **Backend/DB:** Supabase (Auth, DB, Storage, `@supabase/ssr`) — **mesmo banco para dev e prod (decisão consciente)**
- **E-mail:** Resend com SMTP customizado no Supabase, remetente `SACODE <nao-responda@cantorcaiolacerda.com.br>`
- **Pagamento:** Mercado Pago Checkout Pro com webhook HMAC ativo (Pix funcionando)
- **Hospedagem:** Vercel
- **Versionamento:** GitHub (`zdkproducoes/sacode-ingressos`, branch `main`)
- **Mapas:** Google Maps iframe (sem API key)
- **Migrations:** alterações de schema feitas direto no SQL Editor do Supabase (sem pasta de migrations local)

**Dev environment:**
- Windows + VS Code
- Três janelas PowerShell: **DEV** (servidor local), **GIT** (git e comandos puros), **CLAUDE** (Claude Code)
- Projeto em `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`

**Produção:** `https://sacode.cantorcaiolacerda.com.br`

---

## 3. Estado Atual

### ✅ Concluído na sessão v14

#### Bug do resumo admin — RESOLVIDO

**O que estava errado:** o resumo mostrava "41 ingressos vendidos" quando o real eram 16 pagos + 5 cortesias. Causa raiz: `src/app/admin/resumo/page.tsx` e `src/app/admin/lotes/page.tsx` usavam `ticket_batches.sold_count` como fonte da verdade, que estava poluído por (a) pedidos `pending`/`expired` do MP e (b) somava o lote oculto "Cortesia" junto.

**Correção aplicada:**
- **`src/app/admin/resumo/page.tsx` refatorado** — agora conta `order_items` com `payment_status='approved'` e separa `is_courtesy`. Mostra 8 caixinhas: Total de pedidos, Pedidos aprovados, Faturamento total (com taxa), Ingressos vendidos, Cortesias geradas, Valor de ingressos vendidos, Valor total de taxas, Ticket médio.
- **`src/app/admin/lotes/page.tsx` refatorado** — também conta `order_items` reais. Coluna "Vendidos" mostra apenas pagos não-cortesia; nova coluna "Cortesias" separada. Para o lote "Cortesia" (price=0), "Vendidos" reflete o total emitido (visão de ocupação). Progresso (%) usa total emitido (vendidos + cortesias).
- **Acentos corrigidos** em cabeçalhos ("Preço", em-dash "—").

#### Etapa A de Afiliados — IMPLEMENTADA E TESTADA

**Modelo de negócio:**
- Afiliado e embaixador são a mesma coisa (decisão do Fernando)
- Cada afiliado é amarrado a um evento (não global)
- Apenas admin cria afiliados (sem auto-cadastro)
- Tracking via link único `?ref=code` com **last-click wins**, cookie de **30 dias**
- Comissão configurável por afiliado (cada um tem sua %)
- Pagamento de comissão é offline (plataforma só mostra relatório)
- Painel do afiliado: link mágico com token (Fase 1); login Supabase virá depois

**O que foi construído:**

1. **Schema do banco** (executado no SQL Editor do Supabase):
   - Tabela `affiliates` — `id`, `event_id` FK, `code` (lowercase + números + hífen, único por evento), `name`, `email`, `phone`, `commission_percent` (CHECK 0-100), `panel_token` (48 hex chars, gerado automático via `pgcrypto`), `profile_id` nullable, `is_active`, `notes`, `visits`, `created_at`, `updated_at`
   - Tabela `affiliate_visits` — `affiliate_id` FK, `ip_address`, `user_agent`, `referer`, `created_at`
   - Constraint UNIQUE `(event_id, code)` — mesmo "joao" pode existir em eventos diferentes
   - Trigger automático para `updated_at`
   - RPC `track_affiliate_visit(p_code, p_event_id, p_ip_address, p_user_agent, p_referer)` — `SECURITY DEFINER`, atômico, valida + insere visita + incrementa contador numa transação só. Retorna `affiliate_id` se válido, NULL se não. Resolve race condition do código antigo.
   - RLS: admins/producers gerenciam tudo. Painel público usa `supabaseAdmin` no servidor.
   - Índices: `affiliates(event_id)`, `affiliates(is_active)`, `affiliate_visits(affiliate_id)`, `affiliate_visits(created_at DESC)`, `orders(affiliate_code) WHERE affiliate_code IS NOT NULL`

2. **`src/lib/affiliate.ts`** — Helper de cookie:
   - `AFFILIATE_COOKIE_NAME = 'sacode_ref'`, `AFFILIATE_COOKIE_MAX_AGE = 30 dias`
   - `setAffiliateCookieClient(code)` (não usado mais, mas mantido pra futuro)
   - `getAffiliateCookieClient()`
   - `readAffiliateCodeFromHeader(cookieHeader)` — usado server-side

3. **`src/hooks/useAffiliateTracking.ts`** — Hook client unificado:
   - Detecta `?ref=` na URL, valida formato (`^[a-z0-9-]+$`), envia POST pro endpoint
   - **Cookie é setado APENAS pelo servidor** (códigos inválidos não poluem)
   - Proteção contra dupla chamada: `useRef` (Strict Mode) + Set módulo-level (`eventId::code`)
   - Falha em silêncio

4. **`src/app/api/affiliate/track/route.ts`** — Endpoint POST:
   - Body: `{ code, event_id }`
   - Valida formato, captura IP via `x-forwarded-for`/`x-real-ip`, user-agent, referer
   - Chama RPC `track_affiliate_visit` (atômico)
   - Se válido (200): seta cookie `sacode_ref` via `Set-Cookie` com `Max-Age=2592000`, `Path=/`, `SameSite=Lax`, `HttpOnly=false`
   - Se inválido (404): NÃO seta cookie (preserva afiliado válido anterior)

5. **`src/app/api/checkout/create/route.ts`** — 3 edições cirúrgicas:
   - Import de `readAffiliateCodeFromHeader`
   - Bloco antes do `INSERT orders`: lê cookie, valida que afiliado existe + ativo + pertence ao evento (`maybeSingle()`, não quebra checkout em caso de falha)
   - `affiliate_code: affiliateCode` adicionado no INSERT

6. **`src/components/evento/LoteAtivoCopaWrapper.tsx`** — refatorado para usar o hook (`'use client'` adicionado, removido código duplicado e localStorage)

7. **`src/app/evento/[slug]/EventPageClient.tsx`** — refatorado para usar o hook (removido `affiliateCode` state, função `trackAffiliateVisit`, localStorage)

**Validação end-to-end realizada em produção:**
- ✅ Cookie `sacode_ref=teste` setado com expiração 30 dias
- ✅ 5 visitas registradas em `affiliate_visits` (com IP, user-agent, referer)
- ✅ Strict Mode neutralizado (1 mount = 1 visita)
- ✅ Código inválido (`?ref=naoexiste`) retorna 404 silencioso, **não sobrescreve cookie válido anterior**
- ✅ Pedido #58 criado com `affiliate_code='teste'` no `orders` (depois cancelado pra limpeza; mantido em produção como exemplo de funcionamento)

**Dados de teste em produção (mantidos como exemplo):**
- Afiliado `code='teste'` no evento SACODE 15ª (commission 10%, ativo)
- 5 visitas em `affiliate_visits`
- Pedido #58 cancelado com `affiliate_code='teste'`

### ⏳ Pendente / Próxima sessão

#### 🟡 Etapa B de Afiliados — CRUD admin (ESCOPO APROVADO, NÃO INICIADO)

**Páginas:**
1. **`/admin/afiliados`** — lista de afiliados do evento atual com colunas: nome, code, %, visitas, vendas, faturamento atribuído, comissão devida, ativo/inativo, ações (editar, desativar, copiar link de divulgação)
2. **`/admin/afiliados/novo`** — formulário de criação: nome, code (auto-sugestão baseada no nome), email, phone, comissão %, evento (se houver mais de um)
3. **`/admin/afiliados/[id]`** — edição + detalhes: dados do afiliado, link público de divulgação, link mágico do painel (com botão "regenerar token"), tabela de últimas vendas

**Navegação:** aba "Afiliados" no menu admin (entre "Cortesias" e o resto)

**Validações:**
- `code` em formato slug (lowercase + números + hífen) — gerar a partir do nome
- `code` único por evento (banco já garante via constraint, mas validar pra dar mensagem clara)
- Comissão entre 0 e 100
- Confirmar antes de regenerar token (invalida link antigo)

**Não inclui:** painel público do afiliado (Etapa C), relatório de comissões agregado, pagamento de comissão.

**Ordem sugerida para implementação:** listagem → criação → edição.

#### 🟡 Etapa C de Afiliados — Painel público (PLANEJADO, ESCOPO ABERTO)

- Rota `/afiliado/[code]?token=XXX` com link mágico (panel_token da tabela `affiliates`)
- Métricas: vendas, comissão acumulada, link de divulgação pronto pra copiar
- Tabela de vendas atribuídas
- Aviso: "Pagamento das comissões é combinado offline"

#### 🟡 Etapa 3 — Sistema de Check-in (não iniciado)

**Decisões já tomadas (do v13):**
- Login único compartilhado: `checkin@cantorcaiolacerda.com.br` (já criado)
- Dropdown "Hostess" (não "Porteiro")
- QR scanner como interface primária + busca por CPF/nome como fallback
- Reuso das colunas existentes em `order_items`: `checked_in_at`, `checked_in_by`
- **Não depende** de outras pendências — pode ser feito em paralelo

#### 🟢 Bugs/melhorias conhecidas não-bloqueantes

- FOUC no navbar
- Smoke test de tracking de afiliados em produção ainda não verificado (Etapa A só validou tracking, não compra real com cookie)
- Botão de logout não-funcional
- **Transferência de ingressos self-service** — planejada para Fase 2
- `ticket_batches.sold_count` continua desincronizado da realidade (39 no lote Promocional vs 21 reais). Resumo e Lotes já não usam mais. Mas se a página pública do evento ainda usar (pra mostrar "esgotando"), pode mostrar dado errado. **Recomendação:** quando der tempo, rodar SQL pra recalcular `sold_count` baseado nos `order_items` reais.

---

## 4. Princípios e Aprendizados Acumulados

### Aprendizados técnicos (novos da v14)

- **Dev e prod compartilham o mesmo banco Supabase (decisão consciente do Fernando)** — exige cuidado redobrado: nunca rodar `DELETE FROM`, `TRUNCATE` ou `DROP` sem dupla verificação. Testes em "local" persistem em produção. Mitigação aplicada: cancelar pedidos de teste (não deletar).
- **React Strict Mode em dev faz double-mount** — qualquer `useEffect` com side effect externo (POST, INSERT, increment) precisa ser idempotente. Solução: `useRef` flag local + Set módulo-level com chave do recurso.
- **Cookie deve ser setado APENAS no servidor depois de validar** — escrever otimisticamente no client antes de validar deixa cookie poluído quando o código é inválido. Trade-off: pequeno delay até o cookie aparecer; ganho: cookie sempre confiável.
- **`maybeSingle()` em vez de `single()` em consultas opcionais** — `single()` joga erro se não achar; `maybeSingle()` retorna `null`. Crítico em fluxos onde "não achou" é caminho válido (cookie velho, código deletado).
- **RPC atômico (`SECURITY DEFINER`) resolve race conditions** — substitui o padrão `SELECT → calcular → UPDATE` que duas chamadas concorrentes quebram. RPC executa tudo numa transação só.
- **`'use client'` é fácil de esquecer ao refatorar** — qualquer componente com `useState`/`useEffect`/`useRouter` precisa do marker. Server Components é default no App Router.
- **PowerShell trata `[` e `]` como wildcards** — pra ler `src\app\evento\[slug]\...`, usar `-LiteralPath`.
- **Paste longo em arquivos pode truncar silenciosamente** — depois de salvar arquivo via copy/paste, conferir tamanho (`Measure-Object -Line`) ou contar chaves (`{` vs `}`). Sintoma: `Expected '}', got '<eof>'` no build.
- **Supabase SQL Editor mostra só o resultado da última query quando rodadas em batch** — rodar uma de cada vez quando se quer ver todas.

### Aprendizados técnicos (mantidos do v13)

- **Mercado Pago em janela anônima:** testar pagamento logado como vendedor esconde opções (inclusive Pix). Sempre validar em janela anônima.
- **Tipo de conta MP é API-autoritativo:** o dashboard pode mostrar CNPJ corretamente enquanto a API retorna `personal`. Só escalação interna do suporte resolve.
- **Entrega de arquivos por download, não copy-paste:** `Get-Content` do PowerShell embaralha acentos. PowerShell exibindo acentos quebrados é falso positivo — validar no Notepad ou navegador.
- **Operações de auth em Route Handler server-side:** `updateUser` no servidor elimina `NavigatorLockAcquireTimeoutError` de múltiplos `createSupabaseBrowserClient()` competindo pelo `navigator.locks`.
- **`window.location.href` > `router.push + refresh`** para redirects pós-auth — evita race condition do SSR Supabase.
- **Middleware deve permitir crawlers sociais:** Open Graph preview precisa de 200, não 403.
- **Extensões do Chrome geram falsos positivos visuais:** alertas em screenshots podem vir de extensão, não da plataforma.
- **Sempre conferir constraints do banco** antes de assumir que app e schema estão alinhados.

### Princípios de interação com o Fernando

**Fernando se identifica como desenvolvedor iniciante. Sempre seguir:**

1. **Passo a passo numerado** — sem assumir conhecimento prévio, sem pular etapas.
2. **Sempre especificar qual janela PowerShell usar:**
   - **DEV** — `npm run dev`
   - **GIT** — comandos git e PowerShell puro
   - **CLAUDE** — Claude Code (interpreta como pergunta, não executa shell)
3. **Formato sequencial:** próximo passo + condicional do passo seguinte ("Rode X. Se sair Y, rode Z. Se aparecer algo estranho, cole aqui."). Esperar Fernando colar output antes de continuar. Não repetir instruções anteriores quando ele cola output.
4. **Edição manual de arquivos preferida** sobre automação do Claude Code — fornecer conteúdo completo para copy-paste no VS Code/PowerShell. Arquivos grandes ou com acentos vão por download.
5. **Edições cirúrgicas** quando modificar arquivos existentes (preferir alterar trechos específicos, não substituir tudo).
6. **Git workflow padrão:** `git add` → `git commit -m "..."` → `git push` (sempre na janela GIT).
7. **Handoff de contexto:** ao final de sessões complexas, gerar `contexto-sacode-vN.md`.
8. **Confirmar dados antes de SQL destrutivo** — especialmente porque dev e prod compartilham banco.

---

## 5. Plano de Retomada (Próxima Sessão)

### Ordem sugerida

1. **Etapa B de Afiliados — CRUD admin** (escopo aprovado, ordem: listagem → criação → edição). Adicionar aba "Afiliados" no menu admin.
2. **Etapa C de Afiliados — Painel público** com link mágico via `panel_token`.
3. **Etapa 3 — Check-in** (independente, pode ser priorizado se o evento estiver próximo).

### Para começar Etapa B rapidamente

Confirmar estrutura da navegação admin atual:

```powershell
Get-ChildItem src\app\admin -Recurse -Filter "layout.tsx"
Get-ChildItem src\app\admin -Recurse -Filter "page.tsx"
```

Provavelmente tem um `layout.tsx` com a barra de abas onde adicionar "Afiliados".

---

## 6. Identificadores e Recursos Úteis

- **Evento ID (SACODE 15ª Edição):** `6539575d-7a71-4c50-8f62-955bc5a96947`
- **Slug:** `sacode-15-edicao`
- **URL evento prod:** `https://sacode.cantorcaiolacerda.com.br/evento/sacode-15-edicao`
- **MP Access Token ativo:** termina em `APP_USR-2508548` (Vercel env `MERCADOPAGO_ACCESS_TOKEN`)
- **Chave Pix ativa:** `financeiro@cantorcaiolacerda.com.br`
- **MP User ID Caio:** 658407697
- **CNPJ Caio:** 44.816.216/0001-03
- **Login compartilhado check-in (criado, não usado ainda):** `checkin@cantorcaiolacerda.com.br`
- **Afiliado de teste em produção:** `code='teste'`, evento SACODE 15ª, comissão 10%, ativo

### Arquivos criados/modificados na v14

**Criados:**
- `src/lib/affiliate.ts`
- `src/hooks/useAffiliateTracking.ts`
- `src/app/api/affiliate/track/route.ts`

**Modificados:**
- `src/app/admin/resumo/page.tsx` (refatorado para contar order_items reais)
- `src/app/admin/lotes/page.tsx` (refatorado, coluna Cortesias adicionada)
- `src/app/api/checkout/create/route.ts` (3 edições cirúrgicas para gravar affiliate_code)
- `src/components/evento/LoteAtivoCopaWrapper.tsx` (usa hook, removido código duplicado)
- `src/app/evento/[slug]/EventPageClient.tsx` (usa hook, removido state/função/localStorage)

### Mudanças no banco (executadas via SQL Editor)

- `DROP TABLE affiliates CASCADE` (estava vazia, sem perda de dados)
- `DROP TABLE affiliate_visits CASCADE` (estava vazia)
- `CREATE EXTENSION pgcrypto`
- `CREATE TABLE affiliates` (12 colunas + constraints + indices)
- `CREATE TABLE affiliate_visits` (5 colunas + FK + indices)
- `CREATE INDEX orders_affiliate_code_idx` (filtrado, não-null)
- `CREATE FUNCTION set_affiliates_updated_at` + trigger
- `CREATE FUNCTION track_affiliate_visit` (RPC atômico, SECURITY DEFINER)
- `ENABLE ROW LEVEL SECURITY` + policies em ambas tabelas

---

**Fim do contexto v14. Próxima sessão começa pela Etapa B de Afiliados (CRUD admin), começando pela listagem em `/admin/afiliados`.**
