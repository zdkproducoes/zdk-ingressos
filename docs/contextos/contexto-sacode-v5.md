# 📋 SACODE — Estado do Projeto (28/04/2026, ~02h)

> Documento de continuidade. Cole na primeira mensagem do novo chat para retomar de onde paramos.
> Substitui o `contexto-sacode-v4.md`.

---

## 🎯 Contexto rápido

**Quem:** Fernando Zedeque (zdkproducoes), produtor de eventos. Iniciante em código, mas com VS Code + Claude Code rodando. Trabalha com PowerShell em 3 janelas (DEV, GIT, CLAUDE).

**Projeto:** SACODE — plataforma própria de ingressos, validada com o evento real "SACODE 15ª edição" do Caio Lacerda (07/06/2026). Plataforma será expandida pra outros produtores depois.

**Branding decidido:** evento/artista é protagonista; "powered by ZDK Produções" no rodapé.

**Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Vercel + Mercado Pago Checkout Pro + Resend + Cloudflare Turnstile + Tailwind CSS.

**URL de produção:** https://sacode.cantorcaiolacerda.com.br

**Data crítica:** abertura de vendas planejada pra **sexta 01/05/2026**. Evento em **07/06/2026**.

---

## 📂 Localização

**Pasta local:** `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`

**GitHub:** https://github.com/zdkproducoes/sacode-ingressos (branch `main`)

**Último commit:** `2400c90` — `fix(mp): pula HMAC para notificacoes IPN legacy do MP`

**Penúltimo commit:** `2829a4c` — `feat(mp): ativa validacao HMAC do webhook para producao`

---

## 🆕 MUDANÇAS DA SESSÃO 28/04/2026 (recém-aplicadas em prod)

### MP-PROD — Migração test → produção — RESOLVIDO ⭐

Item crítico não-negociável fechado em uma sessão. Banco também foi limpo no caminho.

#### Etapa 1 — Troca de credenciais MP

- Conta MP migrada da pessoal do Fernando (test user) → conta de produção do Caio Lacerda
- Atualizadas em **3 lugares sincronizados**:
  - `MP_ACCESS_TOKEN` (Vercel + .env.local)
  - `NEXT_PUBLIC_MP_PUBLIC_KEY` (Vercel + .env.local)
  - `MP_WEBHOOK_SECRET` (Vercel + .env.local + painel MP)
- URL `https://sacode.cantorcaiolacerda.com.br/api/checkout/webhook` cadastrada no painel MP da conta do Caio (eventos: `payment` apenas)
- Redeploy forçado sem cache pra carregar novas envs

#### Etapa 2 — Implementação HMAC do zero (`commit 2829a4c`)

`src/app/api/checkout/webhook/route.ts` — 3 mudanças cirúrgicas:

1. Import: `createHmac` adicionado ao `import { randomBytes, randomUUID } from 'crypto'`
2. Nova função `validateSignature(req, paymentId)`:
   - Lê `process.env.MP_WEBHOOK_SECRET`
   - Lê headers `x-signature` (formato `ts=TIMESTAMP,v1=HASH`) e `x-request-id`
   - Calcula HMAC-SHA256 do manifest `id:PAYMENT_ID;request-id:REQ_ID;ts:TIMESTAMP;`
   - Compara com `v1` do header
3. Chamada da validação após o early return de `type/paymentId`, retornando 401 se falhar

Validação local antes do push:
- `npm run build` passou limpo
- Curls com arquivo `test-body.json` (workaround pro PowerShell quebrar JSON inline) confirmaram:
  - Sem header → 401 + log "missing signature headers" ✅
  - Header inválido → 401 + log "signature mismatch" ✅

#### Etapa 3 — Validação ponta a ponta com cartão real (R$15)

Lote "Promocional" (R$15) usado na compra de teste real. Profile B (Teste Gmail Gmail) como comprador.

8 critérios validados:
- ✅ Cartão aprovado pelo MP
- ✅ Redirect pra `/checkout/sucesso`
- ✅ Webhook chegou com `live_mode: true`
- ❌ HMAC validou (FALSO NEGATIVO — explicado abaixo)
- ❌ Status 200 (FALSO NEGATIVO — explicado abaixo)
- ✅ E-mail com QR chegou
- ✅ Pedido em `/minhas-compras`
- ✅ Pedido aprovado no `/admin`

#### Etapa 4 — Descoberta: armadilha do IPN legacy (`commit 2400c90`)

Logs de produção mostraram `signature mismatch` mesmo com pagamento funcionando ponta a ponta. Investigação revelou:

**O MP envia DOIS formatos de notificação pra cada pagamento:**

| Formato | Query string | Headers |
|---|---|---|
| Webhook v2 (moderno) | `?data.id=X` | **com** `x-signature` |
| IPN legacy (antigo) | `?topic=payment&id=X` | **sem** `x-signature` |

Nosso HMAC inicial rejeitava o IPN legacy com 401 → MP retentava → 401 de novo → poluição de logs eterna.

**Correção aplicada:**

```typescript
// Detecta formato da notificação
const dataIdKey = 'data' + '.' + 'id'; // concat evita confusão de markdown
const hasDataId = url.searchParams.get(dataIdKey);
const isLegacyIpn = !hasDataId && url.searchParams.get('topic') === 'payment';

if (!isLegacyIpn) {
  // Formato v2 — exige HMAC
  if (!validateSignature(req, String(paymentId))) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 });
  }
}
// Legacy passa direto, segurança garantida pelo mpPayment.get(id) na sequência
```

Validação pós-deploy: webhook chegou com **POST 200** (sem mismatch), confirmando que a correção funciona em produção.

> 💡 Por que segurança não foi enfraquecida: legacy ainda passa pelo `mpPayment.get({ id })` na linha seguinte. Atacante precisaria de paymentId real do Caio. Idempotência (linha 41) impede duplo-processamento.

### Cleanup geral do banco (sem commit, mudança operacional)

Estado anterior: 26 orders + 43 order_items + lotes inflados + 5 customers de teste.

Operações executadas em ordem (com SELECT antes de cada DELETE, backup CSV das 3 tabelas feito antes):

1. `DELETE FROM order_items` — 43 rows
2. `DELETE FROM orders` — 26 rows
3. `UPDATE ticket_batches SET sold_count = 0` — 4 rows
4. **Manual** no Table Editor + Auth: profiles "tste teste" e "Teste Gmail Gmail" apagados (com seus respectivos `auth.users`)
5. **Manual** no Storage: ~20 PNGs órfãos do bucket `qr-codes` apagados (estrutura de pastas mantida)

#### Estado final do banco (validado)

```
orders:      0
order_items: 0
sold_count somado dos lotes: 0
profiles:    4 (Fernando admin + Caio admin + Bárbara customer + Vinícius customer)
auth.users:  4
```

Sistema oficialmente em estado "evento novo, pronto pra abrir vendas".

### Outras decisões da sessão

- Caio Lacerda promovido de `customer` → `admin` (Table Editor manual). Vai poder acessar `/admin` na sexta.
- Decisão de NÃO importar base BlackTag (~4 mil cadastros) por questões de LGPD — usar apenas dados demográficos agregados pra estratégia de mídia paga
- Reforço de protocolo de privacidade: redactar nomes/e-mails antes de compartilhar prints/dados em qualquer canal

---

## ✅ O QUE ESTÁ FUNCIONANDO EM PRODUÇÃO (consolidado)

### Fluxo principal validado
- Cadastro com Turnstile + e-mail de confirmação (visual SACODE)
- Login + cooldown de 60s
- Página do evento com seleção de lotes — sem race condition no botão Comprar
- Checkout Pro do Mercado Pago **em PRODUÇÃO** com conta do Caio
- **Webhook com HMAC ativo** processando pagamentos v2 e IPN legacy
- E-mail com QR code chega no Gmail (paleta SACODE)
- `/minhas-compras` lista pedidos com QR codes
- Mural exclusivo pra compradores

### Painel admin
- `/admin` protegido por middleware (role check `admin`/`producer`)
- 4 abas funcionais: resumo, pedidos, lotes, compradores
- Reenvio de e-mail e exportação CSV
- Caio agora tem acesso (role `admin`)

### Recursos de operação
- Navbar global, footer com "powered by ZDK Produções"
- Busca pública de ingresso (`/buscar-ingresso`) com rate limit
- Auditoria (`audit_logs`) registrando ações sensíveis

### Infraestrutura
- Vercel + GitHub + Supabase + Resend + Turnstile no ar
- Build limpo (27 páginas, zero erros TypeScript)
- QR Code via Supabase Storage funcionando
- **MP em produção, validado com pagamento real**

---

## 🐛 PENDÊNCIAS PRIORIZADAS (atualizadas pós-sessão 28/04)

### 🔴 PRIORIDADE CRÍTICA

✅ **MP-PROD — RESOLVIDO nessa sessão.**

Não há mais pendência crítica bloqueante. Sexta pode abrir vendas.

### 🟡 PRIORIDADE MÉDIA — fechamento visual e UX

**P1 — Tela "Quase lá!" pós-cadastro**
- Aparece após cadastro, avisando que e-mail de confirmação foi enviado
- Está toda verde — destoa da paleta SACODE
- **Padrão a aplicar:** `bg-wine-700` + `border-emerald-800/50` + `text-emerald-100` (título mantém verde semântico) + `text-cream-300` (descrição) + link em `text-amber-sacode-400`
- Localização provável: `src/app/cadastro/` ou componente filho de `SignupForm.tsx`
- Estimativa: 1h

**P2 — Tela "E-mail confirmado!"**
- Mesmo problema de paleta verde
- Mesma migração: `bg-wine-700` + borda emerald fina, manter ✅ verde, descrição em cream
- Botão "Ir para o login" JÁ está dourado correto (não mexer)
- Localização provável: `src/app/auth/confirmar/page.tsx`
- Estimativa: 1h

**A1 — Carrossel de ingressos em `/minhas-compras/[slug]/page.tsx`**
- Hoje os ingressos aparecem empilhados verticalmente
- Trocar por carrossel clássico: 1 ingresso por vez, setas pra navegar
- Comportamento igual em desktop e mobile
- Pode usar Embla Carousel ou implementar manual com state
- Manter o container do QR `bg-white` (crítico pra leitura)
- Estimativa: 2h

**C5 — Carrinho não preserva quantidade após login via AuthModal**
- Cenário: usuário deslogado adiciona N ingressos, clica em Comprar, modal de login abre, ele loga, vai pro checkout — mas chega zerado
- Hipótese: a página `/checkout` tem lógica própria de carregar carrinho do localStorage, e ela ou (a) não tá sendo executada, ou (b) tá lendo de chave diferente da que o `EventPageClient` salva (`'cart'`/`'event_id'`)
- **Não é bloqueador** (usuário chega no checkout e re-seleciona quantidade — fricção, não impedimento)
- Estimativa: 1h pra investigar + 1h pra corrigir

### 🟢 PRIORIDADE BAIXA — nice to have

**P5 — Login lento**
- Provável cold start da Vercel ou função serverless lenta
- Investigar se é constante ou só primeira chamada do dia
- Estimativa: 30min de investigação

**P6 — Navbar piscando "Entrar/Cadastrar" antes de carregar usuário logado (FOUC)**
- Solução típica: skeleton loading no canto direito enquanto auth state hidrata, ou Suspense boundary
- Estimativa: 1h

**C1 — Painel admin sem botão de Sair**
- Investigar se é por design (layout `/admin` não tem navbar global) ou se é FOUC do navbar dentro do admin
- Estimativa: 30min

**TD1 — Deprecation warning DEP0169 (NOVA dívida técnica descoberta nessa sessão)**
- Logs Vercel mostram: `(node:4) [DEP0169] DeprecationWarning: \`url.parse...\``
- Não bloqueia nada, webhook retorna 200 normalmente
- Provável origem: alguma dependência (Supabase SSR, MP SDK) usando `url.parse()` legado
- Importará quando Node 22+ virar padrão
- Estimativa: 30min de investigação + atualização de deps relacionadas

### 🔵 ROADMAP — pós-MVP

- Sistema de cupons funcional (schema existe, falta UI/teste end-to-end). **Confirmado nessa sessão que NUNCA foi testado em produção** — risco se for ativado sem validação prévia
- Página "esqueci minha senha" (Supabase Auth tem nativo, só ativar)
- Tela de detalhe individual de pedido no admin
- Filtros de status na tabela de pedidos
- Edição de evento via UI (hoje edita pelo Supabase)
- Texto definitivo da página do evento (descrição, política de meia-entrada, regras) — **conteúdo, não código**
- Imagens definitivas (banner, logo) — **conteúdo, não código**
- Estratégia de comunicação (redes sociais, lista WhatsApp opt-in) — **será tratada em conversa separada**
- Sistema de check-in com leitor QR (tabela `access_logs` já existe)
- Dashboard de métricas avançadas
- Listagem pública de múltiplos eventos
- Onboarding de outros produtores
- Pen test antes de abrir pra outros produtores

---

## 📅 PLANEJAMENTO DOS PRÓXIMOS DIAS (atualizado)

**Tempo restante:** ~7h de desenvolvimento + sexta (dia inteiro de lançamento)

### Quarta (29/04) — 3h planejadas
**Foco: melhorias de UX + bug do carrinho**
- 🟡 P1: tela "Quase lá!" — migração visual (1h)
- 🟡 P2: tela "E-mail confirmado!" — migração visual (1h)
- 🟡 C5: investigar e corrigir carrinho zerado pós-AuthModal (1h)

**Justificativa:** P1+P2 são quick wins que fecham a identidade visual. C5 é caso de borda mas vale resolver antes do lançamento.

### Quinta (30/04) — 3h planejadas
**Foco: A1 + buffer**
- 🟡 A1: carrossel de ingressos em /minhas-compras/[slug] (2h)
- Buffer pra imprevistos descobertos quarta
- Se sobrar tempo: P5/P6/C1 ou TD1
- **Smoke test completo em produção:** cadastro novo + login + compra de teste com cartão real de baixo valor + e-mail + QR Code + estorno

### Sexta (01/05) — Lançamento
- Manhã: smoke test final com olho clínico
- Conferir: webhook funcionando, e-mails saindo, lotes com `sold_count = 0`
- **Abrir vendas oficialmente**
- Acompanhar primeiras compras reais e estar pronto pra hotfix se necessário

### Resumo de carga
| Dia | Carga | Sobra/Buffer |
|---|---|---|
| Terça | ~5h executadas (MP-PROD + cleanup) | concluída |
| Quarta | 3h planejadas | 0h |
| Quinta | 2h planejadas | 1h buffer |
| **Total** | **~10h em ~10h disponíveis** | **1h de margem** |

Plano segue confortável. MP-PROD foi resolvido com economia de tempo (era estimado 1.5h, executou em sessão única com cleanup de bônus).

---

## 🛠️ INFORMAÇÕES TÉCNICAS

### Schema Supabase (sem mudanças nesta sessão)

- **events, profiles, orders, order_items, ticket_batches, coupons**
- **access_logs** (futuro check-in), **audit_logs** (auditoria geral)
- **wall_posts, wall_likes, email_confirmations, rate_limits, affiliates, courtesies**

### Storage Supabase

- `wall-images` (público, 5MB, image/jpeg+png+webp+gif) — fotos do mural
- `qr-codes` (público, 512KB, image/png) — PNGs dos QRs em `${yyyy}/${mm}/${dd}/${uuid}.png`

### Webhook Mercado Pago (atualizado nessa sessão — agora em PROD)

- URL: `https://sacode.cantorcaiolacerda.com.br/api/checkout/webhook`
- Conta MP: do Caio Lacerda (produção)
- **Validação:**
  - Webhook v2 (`?data.id=X`): **HMAC obrigatório** + `mpPayment.get(id)`
  - IPN legacy (`?topic=payment&id=X`): **sem HMAC**, segurança via `mpPayment.get(id)` apenas
- Geração de QR: `QRCode.toBuffer()` → `new Uint8Array()` → upload no Storage → URL pública salva no banco
- Idempotência: linha 41 (early return se `payment_status === 'approved'`) + lógica em `onApproved` (skip se `qr_code_token` já existe)

### Cartões de teste do MP

⚠️ **Cartões APRO/OTHE NÃO funcionam mais em local** — agora `.env.local` tem credenciais de produção. Pra testar pagamento real, usar cartão real e estornar depois pelo painel MP.

### Estado dos lotes (zerados após cleanup de 28/04)

| Lote | quantity | price | sold_count |
|---|---|---|---|
| Lote 01 | 250 | R$20 | 0 |
| Lote 02 | 250 | R$25 | 0 |
| Lote 03 | 1000 | R$35 | 0 |
| Promocional | 100 | R$15 | 0 |

> 💡 O lote "Promocional" foi muito usado em testes. Considerar renomear pra algo comercial antes de abrir vendas (decisão de produto, não código).

---

## 🎨 IDENTIDADE VISUAL — paleta SACODE oficial (em produção)

A migração de paleta foi concluída em sessões anteriores e está no ar. Toda nova tela/componente DEVE seguir essa paleta.

### Cores oficiais (Tailwind config)

```typescript
// tailwind.config.ts já tem:
wine: { 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 }
mauve: { 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 }
"amber-sacode": { 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 }
cream: { 50, 100, 200, 300, 400, 500, 600 }
```

**Cores oficiais base:**
- `wine-600` = `#45183F` (vinho profundo — fundo de cards)
- `mauve-600` = `#694060` (malva — bordas, divisores)
- `amber-sacode-400` = `#E4A03F` (âmbar/dourado — CTAs)
- `cream-200` = `#EADBC4` (creme — texto principal)

### Padrões de aplicação

- **Fundo de página:** `bg-wine-800`
- **Cards/superfícies:** `bg-wine-600` ou `bg-wine-700`
- **Bordas padrão:** `border-mauve-600` ou `border-mauve-700`
- **Texto principal:** `text-cream-200`
- **Texto secundário:** `text-cream-300`
- **Texto muted:** `text-cream-400`
- **Botão CTA primário:** `bg-amber-sacode-400 text-wine-800 hover:bg-amber-sacode-500` (texto VINHO sobre âmbar, NUNCA branco)
- **Botão secundário/cancelar:** `bg-mauve-600 hover:bg-mauve-500 text-cream-200`
- **Inputs:** `bg-wine-700 border-mauve-600 text-cream-200 placeholder:text-cream-400 focus:border-amber-sacode-400`

### Semáforos semânticos PRESERVADOS (não trocar)

- ✅ **Sucesso/aprovado:** `bg-emerald-950 text-emerald-300`
- ⚠️ **Pendente/aviso sistema:** `bg-amber-950 text-amber-100` (amber NATIVO Tailwind, NÃO amber-sacode)
- ❌ **Erro/cancelado:** `bg-red-950 text-red-200`, ou `bg-red-700/40` em modais

**Regra:** se a cor sinaliza **estado do sistema**, mantém o semáforo nativo. Se é **identidade visual/CTA/destaque**, usa amber-sacode.

### Pegadinha conhecida

**`amber-sacode` é diferente de `amber`** (Tailwind nativo). Sempre usar `amber-sacode-*` para identidade SACODE; `amber-*` apenas para semântica de aviso.

---

## 📝 PERFIL DO USUÁRIO (Fernando) — REGRAS FIRMADAS

- **Iniciante em código** — precisa explicações claras com passo a passo simplificado
- **Windows 11 + PowerShell** com 3 janelas (DEV, GIT, CLAUDE)
- **VS Code instalado** mas pouco utilizado — preferência atual é PowerShell puro
- **NUNCA fazer print de `.env*` ou tokens** (instrução firme)
- **NUNCA compartilhar e-mails/nomes de clientes reais sem redactar** (reforçado nessa sessão — Fernando aprendeu na prática)
- Trabalha com tela compartilhada com frequência
- **NÃO edita arquivos pelo navegador no GitHub** — toda edição via Claude Code

### REGRAS DE TRABALHO COM CLAUDE CODE (consolidadas + ajustes da sessão 28/04)

1. **Aplicar mudanças em LOTES por arquivo, não no projeto inteiro de uma vez.** Tabela de substituições primeiro, diff depois, aprovação humana, então aplicar.
2. **Recusar comandos bash com `IFS`/`sed`/`xargs`/`awk`** para find-replace. Usar edição direta arquivo por arquivo.
3. **Cuidar com "Yes, allow all edits during this session"** — economiza confirmações mas reduz visibilidade. Usar com moderação.
4. **`git status` ANTES de qualquer commit** — confirmar que apenas arquivos esperados foram tocados.
5. **`npm run build` ANTES de cada commit.** Salvou múltiplos deploys quebrados ao longo do projeto.
6. **Commits pequenos e temáticos** (ex: `feat(mp)` + `fix(mp)`), não 1 commit gigante.
7. **NÃO push sem testar visualmente** — `npm run dev` + curls/cliques nas páginas críticas.
8. **Validação real em produção** depois de cada push significativo.
9. **Ler diff antes de aprovar.** Sempre. Recusar e pedir versão mais cirúrgica é normal e aceito.
10. **Cuidado com renderização markdown em prompts.** Strings tipo `data.id` podem virar links `[data.id](http://data.id)` no diff exibido. Quando precisar de strings com pontos que parecem domínio, declarar como concatenação: `'data' + '.' + 'id'`. (descoberto nessa sessão)
11. **Comandos pra colar no Claude Code SEMPRE em caixinha de código única** pra Fernando usar o botão de copiar sem risco. (combinado nessa sessão)

### REGRAS DE SEGURANÇA DE DADOS (reforçadas nessa sessão)

1. Nome completo + e-mail combinados são PII. Tratar como sensível.
2. Antes de mandar print/screenshot do banco em qualquer chat, **redactar e-mails** (mostrar só primeiros 5-6 caracteres antes do `@`).
3. **IDs de pagamento**, **secrets**, **tokens** nunca aparecem em mensagens — nem em curl test, nem em log.
4. Quando comparar dados entre Vercel e .env.local, **nunca colar valores** — só confirmar visualmente que batem.
5. **Backup CSV antes de DELETE em massa.** Free, instantâneo, salva o dia se algo der errado.
6. **SELECT antes de DELETE** sempre. Roda o SELECT, vê o que vai ser apagado, então roda o DELETE com mesma WHERE clause.

### REGRAS DE TRABALHO COM POWERSHELL

1. **3 janelas separadas:** DEV (`npm run dev` permanente), CLAUDE (`claude` interativo), GIT (livre pra comandos pontuais).
2. Pode renomear o título: `$Host.UI.RawUI.WindowTitle = "DEV"`
3. Quando travar em visualizador (`less`, paginador), apertar `q` pra sair.
4. **Cuidado com OneDrive** sincronizando enquanto desenvolve. Pausar sync se notar comportamento estranho.
5. Limpar cache do Next.js: `Remove-Item -Recurse -Force .next`
6. Matar Node fantasma: `taskkill /F /IM node.exe`
7. Reinício de servidor é **obrigatório** após mudança em middleware OU `.env.local`.
8. **PowerShell quebra JSON inline em curl.** Pra testar webhooks via curl, criar arquivo temporário: `'{"k":"v"}' | Out-File -Encoding ascii -NoNewline body.json` + `curl.exe ... --data-binary "@body.json"`. Nunca passar JSON com `-d` direto. (descoberto nessa sessão)

---

## 🔑 SEGURANÇA — STATUS

- ✅ `RESEND_API_KEY` rotacionada
- ✅ `JWT_SECRET` rotacionada
- ✅ `MP_WEBHOOK_SECRET` em produção (conta do Caio), HMAC ativo
- ✅ `MP_ACCESS_TOKEN` em produção (conta do Caio)
- ✅ `NEXT_PUBLIC_MP_PUBLIC_KEY` em produção (conta do Caio)
- ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` apareceu em print no passado — RLS protege, rotação é boa prática mas não-urgente

### Decisões de segurança consolidadas

- **Bucket `qr-codes` público** + filename random + token separado = camadas independentes; entrada validada por `access_logs` (1 uso por ingresso)
- **Cleanup automático** de PNG órfão no Storage se update do banco falhar (try/catch no webhook)
- **Middleware ativo em /checkout, /minhas-compras, /admin, /evento** — refresh de sessão server-side garantido
- **Webhook em produção:** v2 exige HMAC, legacy IPN passa direto (mas é validado por `mpPayment.get`)
- **Idempotência no webhook:** mesmo recebendo notificação 2x (v2 + legacy + retentativas), só processa uma vez

---

## 🚀 COMO RETOMAR DAQUI

Quando começar o próximo chat, **cole este documento inteiro na primeira mensagem** + diga em qual ponto quer continuar.

**Sugestão de abertura:**
> "Continuando do commit `2400c90`. Quero atacar [item X]. Aqui está o estado atual:" + colar este documento

**Pontos de partida sugeridos (em ordem do plano):**
1. **"Quero migrar a paleta das telas verdes pós-cadastro (P1 e P2)"** — quick wins visuais
2. **"Quero investigar o bug do carrinho não preservar quantidade pós-AuthModal (C5)"**
3. **"Quero implementar o carrossel de ingressos (A1)"**
4. **"Quero atacar P5/P6/C1 (UX e polimentos finais)"**
5. **"Quero investigar a dívida técnica TD1 (DEP0169 url.parse warning)"**
6. **"Quero renomear o lote Promocional pra algo comercial antes de abrir vendas"** (decisão de produto, sem código)

---

**Status final 28/04/2026 ~02h:** Sessão excepcionalmente produtiva. **MP-PROD — item crítico não-negociável — RESOLVIDO** via 2 commits temáticos (`2829a4c` e `2400c90`). HMAC implementado do zero, validado localmente com curls e arquivo temporário, validado em produção com cartão real (R$15 com Profile B). **Descoberta importante:** MP envia notificações em DOIS formatos (v2 com HMAC + IPN legacy sem HMAC) — código corrigido pra tratar ambos com segurança preservada. **Cleanup geral do banco** executado em paralelo: 26 orders + 43 order_items apagados, 4 lotes zerados, 2 profiles de teste removidos (com `auth.users` correspondentes), ~20 PNGs órfãos limpos do Storage. Estado final: 0 orders, 4 profiles (2 admin + 2 customer reais), lotes prontos pra abrir. **Decisão estratégica:** NÃO importar base BlackTag (4k cadastros) por LGPD — usar só dados demográficos agregados. **Dívida técnica nova:** DEP0169 deprecation warning (não bloqueia). Fernando dominou conceitos novos: HMAC, formatos de notificação MP, foreign keys e ordem de DELETE, redacting de PII, importância de SELECT antes de DELETE. **Plano da semana segue confortável com 1h de buffer real.** Faltam: P1+P2 (paletas verdes), C5 (carrinho pós-modal), A1 (carrossel), e polimentos. Sexta 01/05 mantém abertura de vendas planejada.
