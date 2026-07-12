# 📋 SACODE — Estado do Projeto (27/04/2026, ~21h)

> Documento de continuidade. Cole na primeira mensagem do novo chat para retomar de onde paramos.
> Substitui o `contexto-sacode-v3.md`.

---

## 🎯 Contexto rápido

**Quem:** Fernando Zedeque (zdkproducoes), produtor de eventos. Iniciante em código, mas com VS Code + Claude Code rodando. **Voltou a usar PowerShell** após tentar VS Code sem sucesso adaptativo nesta sessão.

**Projeto:** SACODE — plataforma própria de ingressos, validada com o evento real "SACODE 15ª edição" do Caio Lacerda (07/06/2026). Plataforma será expandida pra outros produtores depois.

**Branding decidido:** evento/artista é protagonista; "powered by ZDK Produções" no rodapé.

**Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Vercel + Mercado Pago Checkout Pro + Resend + Cloudflare Turnstile + Tailwind CSS.

**URL de produção:** https://sacode.cantorcaiolacerda.com.br

**Data crítica:** abertura de vendas planejada pra **sexta 01/05/2026**. Evento em **07/06/2026**.

---

## 📂 Localização

**Pasta local:** `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`

**GitHub:** https://github.com/zdkproducoes/sacode-ingressos (branch `main`)

**Último commit:** `bf511c3` — `fix(auth): elimina race condition no botao Comprar e estende middleware para /evento`

---

## 🆕 MUDANÇAS DA SESSÃO 27/04/2026 (recém-aplicadas em prod)

### P3 (logout indevido) — RESOLVIDO ⭐

Bug funcional mais crítico aberto. Diagnóstico, correção e validação completos em 2 commits temáticos.

**Commit 1: `dd8ab02` — fix(middleware)**
- `src/middleware.ts`: matcher estendido de `['/admin/:path*']` para `['/admin/:path*', '/checkout/:path*', '/minhas-compras/:path*']` (depois `/evento/:path*` foi adicionado também no commit 2)
- Redirect dinâmico: usa `request.nextUrl.pathname + request.nextUrl.search` em vez de hardcoded `/admin`
- Role check (`profile?.role`) isolado em `if (request.nextUrl.pathname.startsWith('/admin'))` — sem isso, usuários comuns seriam bloqueados em /checkout e /minhas-compras

**Commit 2: `bf511c3` — fix(auth): race condition no EventPageClient + middleware /evento**
- `src/app/evento/[slug]/page.tsx`: Server Component agora chama `createSupabaseServerClient()` e passa `isLoggedIn={!!user}` como prop pro `EventPageClient`
- `src/app/evento/[slug]/EventPageClient.tsx`:
  - Removido `useState<any>(null)` para user
  - Removido `useEffect` que chamava `supabase.auth.getUser()` client-side (mantida a parte do affiliate code)
  - Removido `setUser(u)` do callback `onSuccess` do AuthModal
  - `handleBuyClick` agora usa `if (!isLoggedIn)` (prop) em vez de `if (!user)` (state)
- `src/middleware.ts`:
  - Matcher estendido pra incluir `/evento/:path*`
  - Adicionado conceito `isPublicRoute = request.nextUrl.pathname.startsWith('/evento')` — rotas públicas passam pelo middleware (refresh de sessão) mas não exigem login
  - Role check protegido com `if (user && request.nextUrl.pathname.startsWith('/admin'))` — guarda contra `user === null` em rotas públicas

**Bugs raiz identificados (relevante manter como aprendizado):**
1. `@supabase/ssr` exige middleware ativo na rota pra fazer refresh de sessão sem perder cookies. Sem middleware, o `setAll` falha silenciosamente em Server Components → cookie velho fica inválido → next page request faz signOut() automático
2. `EventPageClient.tsx` usava o cliente Supabase legado (`createClient` do `@supabase/supabase-js`, lê localStorage) enquanto o resto da app usa `createBrowserClient` do `@supabase/ssr` (lê cookies). Cliente errado nunca enxergava sessão
3. Race condition: `useState(null)` + `useEffect` async com `getUser()` permitia clique em "Comprar" antes da hidratação

**Validação completa em local + produção (cenários A/B/C):**
- ✅ A1-A3: anônimo passa em /evento, é bloqueado em /checkout e /minhas-compras
- ✅ B1-B4: logado consegue clicar em Comprar e ir direto pro checkout (TESTE PRINCIPAL)
- ⚠️ C5: carrinho não preserva quantidade após login via AuthModal (descoberto na sessão, virou pendência — ver abaixo)

---

## ✅ O QUE ESTÁ FUNCIONANDO EM PRODUÇÃO (consolidado)

### Fluxo principal validado
- Cadastro com Turnstile + e-mail de confirmação (visual SACODE)
- Login + cooldown de 60s
- Página do evento com seleção de lotes — agora **sem race condition no botão Comprar**
- Checkout Pro do Mercado Pago (validado com cartão APRO)
- Webhook do MP processa pagamento, gera QR e envia e-mail
- E-mail com QR code chega no Gmail funcionando (com a paleta SACODE)
- `/minhas-compras` lista pedidos com QR codes
- Mural exclusivo pra compradores

### Painel admin
- `/admin` protegido por middleware (role check `admin`/`producer`)
- 4 abas funcionais: resumo, pedidos, lotes, compradores
- Reenvio de e-mail e exportação CSV

### Recursos de operação
- Navbar global, footer com "powered by ZDK Produções"
- Busca pública de ingresso (`/buscar-ingresso`) com rate limit
- Auditoria (`audit_logs`) registrando ações sensíveis

### Infraestrutura
- Vercel + GitHub + Supabase + Resend + Turnstile no ar
- Build limpo (27 páginas, zero erros TypeScript)
- QR Code via Supabase Storage (resolvido na sessão anterior)

---

## 🐛 PENDÊNCIAS PRIORIZADAS (atualizadas pós-sessão 27/04)

### 🔴 PRIORIDADE CRÍTICA — não pode entrar em produção sem isso

**MP-PROD — Migração de credenciais MP test → produção**
- Hoje o sistema usa test user do Mercado Pago
- Sexta vai receber dinheiro real
- Necessário: trocar as keys, **reativar validação HMAC do webhook** (não funciona em test user, hoje valida via `mpPayment.get(id)`), testar com cartão real de baixo valor antes de abrir
- **Não-negociável antes de sexta**
- Estimativa: 1.5h

### 🟡 PRIORIDADE MÉDIA — fechamento visual e UX (não bloqueiam, mas dão polimento)

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

**C5 — Carrinho não preserva quantidade após login via AuthModal (NOVO bug descoberto na sessão)**
- Cenário: usuário deslogado adiciona N ingressos, clica em Comprar, modal de login abre, ele loga, vai pro checkout — mas chega zerado
- Hipótese: a página `/checkout` tem lógica própria de carregar carrinho do localStorage, e ela ou (a) não tá sendo executada, ou (b) tá lendo de chave diferente da que o `EventPageClient` salva (`'cart'`/`'event_id'`)
- Pode ser bug pré-existente que estava mascarado pelo P3 ou regressão sutil da nossa mudança
- **Não é bloqueador** (usuário chega no checkout e re-seleciona quantidade — fricção, não impedimento)
- Estimativa: 1h pra investigar + 1h pra corrigir

### 🟢 PRIORIDADE BAIXA — nice to have, não bloqueia

**P5 — Login lento**
- Provável cold start da Vercel ou função serverless lenta
- Investigar se é constante ou só primeira chamada do dia
- Estimativa: 30min de investigação

**P6 — Navbar piscando "Entrar/Cadastrar" antes de carregar usuário logado (FOUC)**
- Reconfirmado na sessão (cenário C3 do teste)
- Solução típica: skeleton loading no canto direito enquanto auth state hidrata, ou Suspense boundary
- Estimativa: 1h

**C1 — Painel admin sem botão de Sair (descoberto na sessão)**
- Investigar se é por design (layout `/admin` não tem navbar global) ou se é FOUC do navbar dentro do admin
- Estimativa: 30min

### 🔵 ROADMAP — pós-MVP, não pra antes de sexta

- Sistema de cupons funcional (schema existe, falta UI/teste end-to-end)
- Página "esqueci minha senha" (Supabase Auth tem nativo, só ativar)
- Tela de detalhe individual de pedido no admin
- Filtros de status na tabela de pedidos
- Edição de evento via UI (hoje edita pelo Supabase)
- Texto definitivo da página do evento (descrição, política de meia-entrada, regras) — **conteúdo, não código**
- Imagens definitivas (banner, logo) — **conteúdo, não código**
- Estratégia de comunicação (redes sociais, lista WhatsApp) — **será tratada em conversa separada**
- Sistema de check-in com leitor QR (tabela `access_logs` já existe)
- Dashboard de métricas avançadas
- Listagem pública de múltiplos eventos
- Onboarding de outros produtores
- Pen test antes de abrir pra outros produtores

---

## 📅 PLANEJAMENTO DOS PRÓXIMOS DIAS

**Tempo restante:** ~10h de desenvolvimento + sexta (dia inteiro de lançamento)

### Terça (28/04) — 3h
**Foco: estabilizar visualmente + migração MP**
- 🔴 MP-PROD: migração de credenciais MP + reativar HMAC + teste real (1.5h)
- 🟡 P1: tela "Quase lá!" — migração visual (1h)
- 🟡 P2: tela "E-mail confirmado!" — migração visual (0.5h)

**Justificativa:** MP em produção é o item mais crítico — quanto mais cedo melhor pra ter tempo de testar com pagamento real e detectar problema. P1+P2 são quick wins de paleta que fecham a identidade visual.

### Quarta (29/04) — 3h
**Foco: melhorias de UX + bug do carrinho**
- 🟡 A1: carrossel de ingressos em /minhas-compras/[slug] (2h)
- 🟡 C5: investigar e corrigir carrinho zerado pós-AuthModal (1h)

**Justificativa:** A1 é satisfatório de ver pronto e melhora UX visual. C5 é um caso de borda mas vale investigar antes do lançamento — se for bug simples, resolve.

### Quinta (30/04) — 3h
**Foco: buffer + polimento final**
- Buffer pra imprevistos descobertos terça/quarta
- Se sobrar tempo: P5 (login lento), P6 (FOUC navbar), C1 (botão sair admin)
- **Smoke test completo em produção:** cadastro novo + login + compra de teste APRO + e-mail + QR Code

**Justificativa:** quinta é dia de buffer estratégico. Lançamento na sexta exige tempo de respiro pra resolver imprevistos descobertos nos testes.

### Sexta (01/05) — Lançamento
- Manhã: smoke test final com olho clínico
- Conferir: MP credenciais corretas, webhook funcionando, e-mails saindo
- **Abrir vendas oficialmente**
- Acompanhar primeiras compras reais e estar pronto pra hotfix se necessário

### Resumo de carga
| Dia | Carga | Sobra/Buffer |
|---|---|---|
| Terça | 3h planejadas | 0h |
| Quarta | 3h planejadas | 0h |
| Quinta | 0-2h planejadas | 1-3h de buffer |
| **Total** | **6-8h em ~9h disponíveis** | **1-3h de margem** |

Plano é confortável. Tem buffer real pra absorver imprevistos sem queimar quinta inteira.

---

## 🛠️ INFORMAÇÕES TÉCNICAS

### Schema Supabase (sem mudanças nesta sessão)

- **events, profiles, orders, order_items, ticket_batches, coupons**
- **access_logs** (futuro check-in), **audit_logs** (auditoria geral)
- **wall_posts, wall_likes, email_confirmations, rate_limits, affiliates, courtesies**

### Storage Supabase

- `wall-images` (público, 5MB, image/jpeg+png+webp+gif) — fotos do mural
- `qr-codes` (público, 512KB, image/png) — PNGs dos QRs em `${yyyy}/${mm}/${dd}/${uuid}.png`

### Webhook Mercado Pago (atual — precisa migrar pra prod)

- URL: `https://sacode.cantorcaiolacerda.com.br/api/checkout/webhook`
- Validação: `mpPayment.get(id)` (sem HMAC — test user não suporta)
- Geração de QR: `QRCode.toBuffer()` → `new Uint8Array()` → upload no Storage → URL pública salva no banco
- Idempotência: linha 42 (early return se `payment_status === 'approved'`) + linha 87 (skip se `qr_code_token` já existe)

### Cartões de teste do MP (continuam servindo em test user)

- Mastercard: `5031 4332 1540 6351` | CVV `123` | Val `11/30`
- Nome: `APRO` (aprova) ou `OTHE` (recusa)
- CPF: `12345678909`

---

## 🎨 IDENTIDADE VISUAL — paleta SACODE oficial (em produção)

A migração de paleta foi concluída na sessão anterior e está no ar. Toda nova tela/componente DEVE seguir essa paleta.

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
- **Windows 11 + PowerShell** (voltou pra cá após tentativa frustrada de migrar pro VS Code nesta sessão; pode tentar de novo no futuro)
- **VS Code instalado mas pouco utilizado** — preferência atual é PowerShell puro com 3 janelas (DEV, GIT, CLAUDE)
- **NUNCA fazer print de `.env*` ou tokens** (instrução firme)
- Trabalha com tela compartilhada com frequência
- **NÃO edita arquivos pelo navegador no GitHub** — toda edição via Claude Code

### REGRAS DE TRABALHO COM CLAUDE CODE (consolidadas)

1. **Aplicar mudanças em LOTES por arquivo, não no projeto inteiro de uma vez.** Tabela de substituições primeiro, diff depois, aprovação humana, então aplicar.
2. **Recusar comandos bash com `IFS`/`sed`/`xargs`/`awk`** para find-replace. Usar edição direta arquivo por arquivo.
3. **Cuidar com "Yes, allow all edits during this session"** — economiza confirmações mas reduz visibilidade. Usar com moderação.
4. **`git status` + `git diff --stat` ANTES de qualquer commit** — confirmar que apenas arquivos esperados foram tocados.
5. **`npm run build` ANTES de cada commit.** Se compila localmente, evita o ciclo "push → Vercel quebra → reverter". **Esta regra salvou 2 deploys quebrados na sessão de 27/04.**
6. **Commits pequenos e temáticos** (ex: "fix(middleware): ..." + "fix(auth): ..."), não 1 commit gigante.
7. **NÃO push sem testar visualmente** — `npm run dev` + navegar pelas páginas críticas + bateria A/B/C.
8. **Validação real em produção** depois de cada push significativo: fazer cadastro novo + compra de teste com APRO + checar e-mail no Gmail.
9. **Ler diff antes de aprovar.** Sempre. O Claude Code às vezes propõe mudanças desnecessárias ou com efeitos colaterais — recusar e pedir versão mais cirúrgica é normal e aceito.

### REGRAS DE TRABALHO COM POWERSHELL

1. **3 janelas separadas:** DEV (`npm run dev` permanente), CLAUDE (`claude` interativo), GIT (livre pra comandos pontuais).
2. Pode renomear o título: `$Host.UI.RawUI.WindowTitle = "DEV"`
3. Quando travar em visualizador (`less`, paginador), apertar `q` pra sair.
4. **Cuidado com OneDrive** sincronizando enquanto desenvolve. Pausar sync se notar comportamento estranho.
5. Limpar cache do Next.js: `Remove-Item -Recurse -Force .next`
6. Matar Node fantasma: `taskkill /F /IM node.exe`
7. Reinício de servidor é **obrigatório** após mudança em middleware.

---

## 🔑 SEGURANÇA — STATUS

- ✅ `RESEND_API_KEY` rotacionada
- ✅ `JWT_SECRET` rotacionada
- ✅ `MP_WEBHOOK_SECRET` regenerada (não usada como bloqueio em test user, será reativada na migração pra prod)
- ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` apareceu em print no passado — RLS protege, rotação é boa prática mas não-urgente

### Decisões de segurança consolidadas

- **Bucket `qr-codes` público** + filename random + token separado = camadas independentes; entrada validada por `access_logs` (1 uso por ingresso)
- **Cleanup automático** de PNG órfão no Storage se update do banco falhar (try/catch no webhook)
- **Middleware ativo em /checkout, /minhas-compras, /admin** — refresh de sessão server-side garantido
- **Middleware ativo em /evento mas como rota pública** — refresh sem exigir login

---

## 🚀 COMO RETOMAR DAQUI

Quando começar o próximo chat, **cole este documento inteiro na primeira mensagem** + diga em qual ponto quer continuar.

**Sugestão de abertura:**
> "Continuando do commit `bf511c3`. Quero atacar [item X]. Aqui está o estado atual:" + colar este documento

**Pontos de partida sugeridos (em ordem do plano):**
1. **"Quero migrar as credenciais do Mercado Pago pra produção (MP-PROD)"** — CRÍTICO, recomendado primeiro
2. **"Quero migrar a paleta das telas verdes pós-cadastro (P1 e P2)"**
3. **"Quero implementar o carrossel de ingressos (A1)"**
4. **"Quero investigar o bug do carrinho não preservar quantidade pós-AuthModal (C5)"**
5. **"Quero atacar P5/P6/C1 (UX e polimentos finais)"**

---

**Status final 27/04/2026 ~21h:** Sessão muito produtiva. P3 (logout indevido) — bug funcional mais grave aberto — RESOLVIDO em produção via 2 commits temáticos (`dd8ab02` e `bf511c3`). Sistema mais robusto: 4 rotas críticas agora têm refresh de sessão garantido pelo middleware, race condition no botão "Comprar" eliminada, EventPageClient refatorado pra padrão Server Component → prop. Build local pegou 2 erros de TypeScript que teriam quebrado o deploy. Validação completa local + produção. Fernando dominou o fluxo Claude Code + git no PowerShell. Faltam: migração MP test→prod (CRÍTICO), telas verdes (P1+P2), carrossel (A1), C5 (carrinho zerado pós-modal), e polimentos (P5/P6/C1). Plano dos próximos 3 dias é confortável com 1-3h de buffer.
