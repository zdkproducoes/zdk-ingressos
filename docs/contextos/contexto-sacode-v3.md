# 📋 SACODE — Estado do Projeto (27/04/2026, ~04h)

> Documento de continuidade. Cole na primeira mensagem do novo chat para retomar de onde paramos.
> Substitui o `contexto-sacode-v2.md`.

---

## 🎯 Contexto rápido

**Quem:** Fernando Zedeque (zdkproducoes), produtor de eventos. Iniciante em código, mas com VS Code + Claude Code rodando.

**Projeto:** SACODE — plataforma própria de ingressos, validada com o evento real "SACODE 15ª edição" do Caio Lacerda (07/06/2026). Plataforma será expandida pra outros produtores depois.

**Branding decidido:** evento/artista é protagonista; "powered by ZDK Produções" no rodapé (não SACODE Tickets, não ZDK Ingressos — **ZDK Produções**, padronizado em todo lugar).

**Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Vercel + Mercado Pago Checkout Pro + Resend + Cloudflare Turnstile + Tailwind CSS.

**URL de produção:** https://sacode.cantorcaiolacerda.com.br

**Data crítica:** abertura de vendas planejada pra **sexta 01/05/2026**. Evento em **07/06/2026**.

---

## 📂 Localização

**Pasta local:** `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`

**GitHub:** https://github.com/zdkproducoes/sacode-ingressos (branch `main`)

---

## 🎨 IDENTIDADE VISUAL — paleta SACODE oficial (em produção)

A migração de paleta foi concluída e está no ar. Toda nova tela/componente DEVE seguir essa paleta.

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

### Variáveis CSS em globals.css

```css
--background: var(--sacode-wine-800);     /* #2D0F2A */
--background-elevated: var(--sacode-wine-600);
--foreground: var(--sacode-cream-200);
--accent: var(--sacode-amber-400);
```

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
- ⚠️ **Pendente/aviso sistema:** `bg-amber-950 text-amber-100` (amber NATIVO Tailwind, NÃO amber-sacode — esse é semântico)
- ❌ **Erro/cancelado:** `bg-red-950 text-red-200`, ou `bg-red-700/40` em modais

**Regra:** se a cor sinaliza **estado do sistema**, mantém o semáforo nativo. Se é **identidade visual/CTA/destaque**, usa amber-sacode.

### Templates de e-mail (HEX direto, NÃO Tailwind)

```
Fundo body/outer: #2D0F2A
Card principal: #45183F
Card secundário: #321131
Footer: #1F0A1D
Header gradient: linear-gradient(135deg, #45183F, #694060)
Texto principal: #EADBC4
Texto secundário: #D9C2A0
Texto muted: #BFA279
Bordas: #694060
CTA âmbar: bg #E4A03F + color #45183F (NUNCA branco)
Link decorativo: #E4A03F
QR Code container: bg #fff (mantido)
```

### Pegadinha conhecida

**`amber-sacode` é diferente de `amber`** (Tailwind nativo). Sempre usar `amber-sacode-*` para identidade SACODE; `amber-*` apenas para semântica de aviso.

---

## ✅ O QUE ESTÁ FUNCIONANDO EM PRODUÇÃO

### Fluxo principal validado

- Cadastro com Turnstile + e-mail de confirmação (visual SACODE)
- Login + cooldown de 60s
- Página do evento com seleção de lotes
- Checkout Pro do Mercado Pago (validado com cartão APRO)
- Webhook do MP processa pagamento, gera QR e envia e-mail
- E-mail com QR code chega no Gmail funcionando (com a paleta SACODE)
- `/minhas-compras` lista pedidos com QR codes
- Mural exclusivo pra compradores

### Painel admin

- `/admin` protegido por middleware
- 4 abas funcionais: resumo, pedidos, lotes, compradores
- Reenvio de e-mail e exportação CSV

### Recursos de operação

- Navbar global, footer com "powered by ZDK Produções"
- Busca pública de ingresso (`/buscar-ingresso`) com rate limit
- Auditoria (`audit_logs`) registrando ações sensíveis

### Infraestrutura

- Vercel + GitHub + Supabase + Resend + Turnstile no ar
- Build limpo (27 páginas, zero erros TypeScript)

---

## 🆕 MUDANÇAS DA SESSÃO 27/04/2026 (recém-aplicadas em prod)

### 1. Migração visual completa (paleta SACODE)

Migrados ~30 arquivos de componente + 2 templates de e-mail. Tudo seguindo o padrão acima. **Validado visualmente no navegador (desktop) e via deploy real.**

### 2. QR Code agora via Supabase Storage

**Bug crítico resolvido:** antes o QR ia como base64 inline no e-mail; Gmail bloqueia data URLs desde 2014.

**Solução implementada:**
- Bucket `qr-codes` no Supabase Storage (público, 512KB limit, image/png only)
- Webhook do MP (`src/app/api/checkout/webhook/route.ts`) agora:
  1. Gera QR como Buffer (não mais base64)
  2. Converte pra `Uint8Array`
  3. Upload no Storage com filename `${yyyy}/${mm}/${dd}/${randomUUID()}.png` (organizado por data, nome aleatório por segurança)
  4. Salva URL pública em `order_items.qr_code_url`
  5. Try/catch com cleanup automático: se update do banco falhar, remove PNG órfão

**Decisão de segurança (registrada):** filename random ≠ `qr_code_token`. Atacante que descobre o token NÃO consegue construir a URL da imagem (camadas independentes). Validação real de entrada continua via `access_logs` (1 uso por ingresso).

### 3. Fallback no e-mail de ingresso

`src/emails/ticket.tsx`: adicionado botão âmbar **"🎟️ Ver no site"** abaixo dos QR codes (link pra `/minhas-compras`). Funciona como salva-vidas se algum cliente futuro tiver Gmail bloqueando imagens.

### 4. Pedidos antigos NÃO migrados

Pedidos no banco com `qr_code_url` em base64 continuam assim. Foram só pedidos de teste, sem cliente real. `/minhas-compras` continua renderizando ambos os formatos (base64 e URL) sem problema.

---

## 🐛 BUGS/MELHORIAS PENDENTES (PRIORIZADOS)

### 🟡 Prioridade média — fechar identidade visual

**P1 — Tela "Quase lá!" pós-cadastro**
- Aparece após cadastro, avisando que o e-mail de confirmação foi enviado
- Está toda verde (fundo + textos) — destoa da paleta SACODE
- **Padrão a aplicar:** `bg-wine-700` + `border-emerald-800/50` (borda fina) + `text-emerald-100` (título mantém verde semântico) + `text-cream-300` (descrição) + link "Já confirmei → Ir para login" em `text-amber-sacode-400`
- Localização provável: `src/app/cadastro/` ou componente filho de `SignupForm.tsx`

**P2 — Tela "E-mail confirmado!"**
- Mesmo problema: card todo verde
- Mesma migração: `bg-wine-700` + borda emerald fina, manter ✅ verde, descrição em cream
- Botão "Ir para o login" JÁ está dourado correto (não mexer nele)
- Localização provável: `src/app/auth/confirmar/page.tsx` (pode ser estado dentro do componente já migrado)

### 🔴 Prioridade alta — bug funcional

**P3 — Logout indevido ao clicar "Ver eventos disponíveis"**
- Cenário: usuário logado em `/minhas-compras` (zero pedidos) → clica no CTA "Ver eventos disponíveis" → vai pra página do evento e **aparece deslogado**
- Pendente diagnóstico: pode ser logout real (cookie sendo destruído em algum redirect) ou apenas "flash" da navbar (estado de auth ainda não hidratado quando navbar renderiza)
- **Teste pra distinguir:** ao chegar na página do evento aparentemente deslogado, dar F5. Se voltar logado = é só FOUC do navbar (P6). Se continuar deslogado = bug real.
- **Esse teste NÃO foi feito ainda.**

### 🟢 Prioridade média — melhorias

**A1 — Carrossel de ingressos em `/minhas-compras/[slug]/page.tsx`**
- Hoje os ingressos aparecem empilhados verticalmente
- Trocar por **carrossel clássico**: 1 ingresso por vez, setas pra navegar
- Comportamento igual em desktop e mobile
- Pode usar Embla Carousel ou implementar manual com state
- Manter o container do QR `bg-white` (crítico pra leitura)

### 🟡 Prioridade baixa — performance

**P5 — Login está demorando**
- Provável cold start da Vercel ou função serverless lenta
- Investigar se é constante ou só primeira chamada do dia

**P6 — Navbar piscando "Entrar/Cadastrar" antes de carregar usuário logado**
- FOUC clássico de auth state
- Solução típica: skeleton loading no canto direito enquanto auth state hidrata
- Ou usar Suspense boundary

### 🔵 Pendentes do roadmap original (não-bloqueadores)

- Sistema de cupons funcional (schema existe, falta UI/teste end-to-end)
- Página "esqueci minha senha" (Supabase Auth tem nativo, só ativar)
- Tela de detalhe individual de pedido no admin
- Filtros de status na tabela de pedidos
- Edição de evento via UI (hoje edita pelo Supabase)
- Texto definitivo da página do evento (descrição, política de meia-entrada, regras)
- Imagens definitivas (banner, logo)
- Estratégia de comunicação (redes sociais, lista WhatsApp)

### 🟢 Pós-MVP (após sexta)

- Sistema de check-in com leitor QR (tabela `access_logs` já existe pra isso)
- Dashboard de métricas avançadas (gráficos, conversão)
- Migrar pra credenciais de produção real do MP (hoje usa test user — HMAC do webhook não funciona com test user, então valida via `mpPayment.get(id)`)
- Listagem pública de múltiplos eventos
- Onboarding de outros produtores
- Pen test antes de abrir pra outros produtores

---

## 🛠️ INFORMAÇÕES TÉCNICAS

### Schema Supabase (resumo, sem mudanças nesta sessão)

- **events, profiles, orders, order_items, ticket_batches, coupons**
- **access_logs** (futuro check-in), **audit_logs** (auditoria geral)
- **wall_posts, wall_likes, email_confirmations, rate_limits, affiliates, courtesies**

### Storage Supabase

- `wall-images` (público, 5MB, image/jpeg+png+webp+gif) — fotos do mural
- `qr-codes` (público, 512KB, image/png) — **NOVO nesta sessão** — PNGs dos QRs organizados em `${yyyy}/${mm}/${dd}/${uuid}.png`

### Webhook Mercado Pago (atualizado)

- URL: `https://sacode.cantorcaiolacerda.com.br/api/checkout/webhook`
- Validação: `mpPayment.get(id)` (sem HMAC — test user não suporta)
- Geração de QR: `QRCode.toBuffer()` → `new Uint8Array()` → upload no Storage → URL pública salva no banco
- Idempotência: linha 42 (early return se `payment_status === 'approved'`) + linha 87 (skip se `qr_code_token` já existe)

### Cartões de teste do MP

- Mastercard: `5031 4332 1540 6351` | CVV `123` | Val `11/30`
- Nome: `APRO` (aprova) ou `OTHE` (recusa)
- CPF: `12345678909`

---

## 📝 PERFIL DO USUÁRIO (Fernando) — REGRAS FIRMADAS

- Iniciante em código — precisa explicações claras, não só código solto
- Windows 11 + PowerShell + VS Code + Claude Code 2.1.119
- **NUNCA fazer print de `.env*` ou tokens** (instrução firme)
- Trabalha com tela compartilhada com frequência
- Bom debugging colaborativo
- **NÃO edita arquivos pelo navegador no GitHub** — toda edição via Claude Code

### REGRAS DE TRABALHO COM CLAUDE CODE (descobertas e firmadas nesta sessão)

1. **Aplicar mudanças em LOTES por arquivo, não no projeto inteiro de uma vez.** Tabela de substituições primeiro, diff depois, aprovação humana, então aplicar.
2. **Recusar comandos bash com `IFS`/`sed`/`xargs`/`awk` para find-replace.** Usar edição direta arquivo por arquivo.
3. **Cuidar com "Yes, allow all edits during this session"** (shift+tab) — economiza confirmações mas reduz visibilidade. Usar com moderação.
4. **`git status` + `git diff --stat` ANTES de qualquer commit** — confirmar que apenas arquivos esperados foram tocados.
5. **Build local (`npm run build`) ANTES de cada commit.** Se compila localmente, evita o ciclo "push → Vercel quebra → reverter".
6. **Commits pequenos e temáticos** (ex: "feat(ui): paleta SACODE em jornada de compra" + "feat: QR via Storage"), não 1 commit gigante.
7. **NÃO push sem testar visualmente** — `npm run dev` + navegar pelas páginas críticas.
8. **Validação real em produção** depois de cada push significativo: fazer cadastro novo + compra de teste com APRO + checar e-mail no Gmail.

---

## 🔑 SEGURANÇA — STATUS

- ✅ `RESEND_API_KEY` rotacionada
- ✅ `JWT_SECRET` rotacionada
- ✅ `MP_WEBHOOK_SECRET` regenerada (não usada como bloqueio, só registrada)
- ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` apareceu em print no passado — RLS protege, rotação é boa prática mas não-urgente

### Decisões de segurança desta sessão

- **Bucket `qr-codes` público** + filename random + token separado = camadas independentes; entrada validada por `access_logs` (1 uso por ingresso)
- **Cleanup automático** de PNG órfão no Storage se update do banco falhar (try/catch no webhook)

---

## ⏱️ TEMPO RESTANTE

- Hoje (segunda 27/04): ~3h
- Terça: 3h
- Quarta: 3h
- Quinta: 3h
- Sexta: dia inteiro (lançamento)

**Total ~13h.** Suficiente pra fechar P1+P2+P3+A1+conteúdo da página do evento + comunicação.

---

## 🚀 COMO RETOMAR DAQUI

Quando começar o próximo chat, **cole este documento inteiro na primeira mensagem** + diga em qual ponto quer continuar. Sugestões de pontos de partida:

1. **"Quero diagnosticar e consertar o P3 (logout indevido)"** — bug funcional mais grave restante; recomendado começar por aqui
2. **"Quero implementar o carrossel de ingressos (A1)"** — visual e satisfatório de ver pronto
3. **"Quero fechar P1 e P2 (telas verdes pós-cadastro)"** — completa identidade visual
4. **"Quero configurar texto e imagens definitivos da página do evento"** — preparação pra anúncio
5. **"Quero acelerar a estratégia de comunicação pra venda"** — marketing + sistema integrados

---

**Status final 27/04/2026 ~04h:** Sessão maratona, mas extremamente produtiva. Migração de paleta visual completa e em produção. Bug crítico do QR Code descoberto e resolvido (era preexistente, não da migração). Sistema validado em produção real com teste end-to-end no Gmail. Plataforma SACODE está visualmente coerente e funcionalmente pronta pra abertura de vendas. Faltam ajustes de polimento (telas verdes, carrossel) e UX (logout indevido).
