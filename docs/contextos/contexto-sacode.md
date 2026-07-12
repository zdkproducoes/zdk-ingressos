# 📋 SACODE — Estado do Projeto (25/04/2026)

> Use este documento para continuar o desenvolvimento em uma nova conversa.
> Cole o conteúdo na primeira mensagem da nova conversa, anexe junto, ou referencie.

---

## 🎯 Contexto rápido

**Quem:** Fernando Zedeque (zdkproducoes), event producer, perfil iniciante em programação.

**Projeto:** SACODE — plataforma própria de ingressos (similar ao Sympla), sendo validada com o evento real "SACODE 15ª Edição" do artista Caio Lacerda.

**Estratégia:** Sair de plataformas terceiras pra ter os dados próprios dos compradores (CPF/email/telefone) e usar pra marketing futuro.

**Stack:** Next.js (App Router) + Supabase (Postgres + Auth + Storage) + Vercel + Mercado Pago Checkout Pro + Resend (e-mail) + Cloudflare Turnstile (antifraude).

**URL de produção:** https://sacode.cantorcaiolacerda.com.br

---

## 📂 Localização dos arquivos

**Pasta local do projeto:**
```
C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos
```

**GitHub:** https://github.com/zdkproducoes/sacode-ingressos (branch `main`)

**Estrutura:** projeto usa `src/` (declarado em `tsconfig.json` com `"@/*": ["./src/*"]`)

**Backup local:** `..\sacode-ingressos-BACKUP` (manter, é segurança)

---

## ✅ O QUE JÁ FOI FEITO

### Infraestrutura
- ✅ Vercel conectada ao GitHub, deploys automáticos via push na `main`
- ✅ Domínio customizado `sacode.cantorcaiolacerda.com.br` apontando pra Vercel
- ✅ Resend com domínio `cantorcaiolacerda.com.br` verificado
- ✅ Supabase project `nsbyylbgnmzlgfwzgasl` (organização: ZDK Produções, projeto: sacode-mvp)
- ✅ Cloudflare Turnstile cadastrado e configurado
- ✅ Bucket `wall-images` criado no Supabase Storage (público, max 5MB, jpg/png/webp/gif)

### Banco de dados (Supabase)
- ✅ Migration `01_migrations.sql` rodada com sucesso (8 blocos: ALTER profiles, email_confirmations, rate_limits, wall_posts, wall_likes, triggers de contadores, função `user_has_paid_ticket`, RLS policies completas, validate_coupon, increment_batch_sold, increment_coupon_usage)
- ✅ Coordenadas do evento atualizadas: `venue_lat = -23.650356, venue_lng = -46.583375`
- ✅ Slug do evento: `sacode-15-edicao`

### Variáveis de ambiente (Vercel + .env.local)
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `MP_ACCESS_TOKEN` (chave APP_USR-... do **vendedor de teste**)
- ✅ `MP_PUBLIC_KEY` (idem)
- ✅ `MP_WEBHOOK_SECRET` (configurado)
- ✅ `RESEND_API_KEY` (rotacionada após vazamento — chave atual é nova)
- ✅ `EMAIL_FROM=SACODE <nao-responda@cantorcaiolacerda.com.br>`
- ✅ `NEXT_PUBLIC_SITE_URL=https://sacode.cantorcaiolacerda.com.br`
- ✅ `JWT_SECRET` (rotacionada após vazamento — chave atual é nova)
- ✅ `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- ✅ `TURNSTILE_SECRET_KEY`

> ⚠️ **Ainda pendente:** rotacionar `NEXT_PUBLIC_SUPABASE_ANON_KEY` (vazou em print mas RLS protege; não é urgente)

### Código entregue (todos commitados em `main`)
- ✅ `src/app/cadastro/page.tsx` — página de cadastro
- ✅ `src/app/login/page.tsx` — página de login
- ✅ `src/app/auth/confirmar/page.tsx` — confirmação de e-mail via token
- ✅ `src/app/checkout/page.tsx` — recebe `?event=SLUG`
- ✅ `src/app/checkout/sucesso/page.tsx`, `falha/page.tsx`, `pendente/page.tsx`
- ✅ `src/app/minhas-compras/page.tsx` — lista pedidos por evento
- ✅ `src/app/minhas-compras/[slug]/page.tsx` — detalhe com QR codes
- ✅ `src/app/evento/[slug]/mural/page.tsx` — mural exclusivo p/ compradores
- ✅ APIs: `/api/auth/signup`, `/api/auth/resend-confirmation`, `/api/checkout/create`, `/api/checkout/webhook`, `/api/coupons/validate`, `/api/wall/posts`, `/api/wall/likes`, `/api/wall/upload`
- ✅ Componentes: `SignupForm`, `LoginForm`, `CheckoutClient`, `CouponInput`, `Wall`, `ErrorModal` (modal centralizado)
- ✅ Lib: `supabase/{admin,server,browser}.ts`, `mercadopago/client.ts`, `email/resend.ts`, `turnstile/{verify,ratelimit}.ts`
- ✅ Templates de e-mail: `confirmation.tsx`, `ticket.tsx`

### Funcionalidades testadas e funcionando
- ✅ Cadastro com Turnstile e validação completa
- ✅ E-mail de confirmação com link customizado (gradient red/purple)
- ✅ Modal de erro centralizado (em vez de banner no topo)
- ✅ Antifraude com rate limit por IP (5 cadastros/h, 10 reenvios/h, 30 posts/h, 20 uploads/h)
- ✅ Login com cooldown de 60s para reenvio
- ✅ Botão "Comprar" da página do evento → `/checkout?event=sacode-15-edicao`
- ✅ Build local OK, deploy na Vercel OK

---

## ⚠️ DECISÕES IMPORTANTES JÁ TOMADAS

1. **Mercado Pago em modo TESTE** — usando credenciais `APP_USR-...` do **vendedor de teste** criado em `https://www.mercadopago.com.br/developers/panel/test-users`. Quando for pra produção, basta trocar 3 variáveis na Vercel.

2. **Trigger automática `handle_new_user` existe no Supabase** — cria profile automaticamente quando user é inserido em `auth.users`, populando `id, full_name, cpf, phone, email, role` (lê de `user_metadata`). O `signup/route.ts` já está adaptado: passa tudo no `user_metadata` na criação E faz `UPDATE` no profile com campos extras (birth_date, gender, city, etc.). **NÃO** faz `INSERT` no profile.

3. **Mural** — estilo Twitter (posts + curtidas + replies, 1 nível só), só compradores podem ler/postar (validado via RLS + função `user_has_paid_ticket`), posts visíveis na hora mas autor/admin pode soft-delete, posts permitem texto + foto + reply.

4. **Modo Checkout Pro** — usuário sai do site para pagar no MP e volta. Decisão consciente — migrar para Bricks (embedded) só DEPOIS de validar o MVP.

5. **Página inicial:** `src/app/page.tsx` redireciona pra `/evento/sacode-15-edicao` (página única do MVP).

6. **EventPageClient** já existia (20.669 bytes), foi preservada. Apenas a função `handleBuyClick` foi atualizada pra apontar pra `/checkout?event=${event.slug}`.

7. **Conta antiga `src/lib/supabase.ts` e `src/lib/utils.ts`** — preservadas, têm types úteis (Event, TicketBatch, Profile, Order, Coupon, Affiliate) e funções utilitárias (formatCurrency, validateCPF, isBatchAvailable, etc.).

---

## 🐛 PROBLEMA ATUAL EM ABERTO (urgente)

**Sintoma:** Após pagamento aprovado no MP:
- ❌ E-mail com QR codes NÃO chega
- ❌ Pedido NÃO aparece em "Minhas compras"
- ❌ Pedido fica como `payment_status = 'pending'` no banco

**Diagnóstico provável:** O webhook do Mercado Pago não está sendo chamado **porque foi configurado na conta REAL do Fernando, mas as compras estão sendo feitas pelo vendedor de teste** (que é uma conta separada).

**Solução pendente:**
1. Logar como `TESTUSER...` (vendedor de teste)
2. Ir em https://www.mercadopago.com.br/developers/panel
3. Acessar a aplicação `SACODE Teste` que está dentro dessa conta
4. Configurar webhook lá:
   - URL: `https://sacode.cantorcaiolacerda.com.br/api/checkout/webhook`
   - Evento: Pagamentos
   - Modo: Produção (sim, mesmo sendo teste — é a config interna do MP)
5. Copiar a chave secreta gerada
6. Atualizar `MP_WEBHOOK_SECRET` na Vercel
7. Redeploy

**Também investigar:**
- Logs da Vercel (filtro `webhook`) para confirmar que MP nunca chamou
- Painel MP do vendedor teste — histórico de notificações

---

## 📋 PRÓXIMOS PASSOS (em ordem)

### Imediato (resolver problema atual)
1. **Configurar webhook na conta do vendedor de teste**
2. **Testar fluxo completo end-to-end:** cadastrar → confirmar e-mail → comprar → receber e-mail → ver QR codes em /minhas-compras → acessar mural

### Curto prazo (refinamentos)
3. **Sobre testes Mercado Pago:** confirmar uso correto de cartões de teste (Master `5031 4332 1540 6351`, CVV `123`, nome `APRO`)
4. **Adicionar botão de logout visível** na navegação (atualmente só dá pra deslogar via DevTools)
5. **Verificar política de "user_has_paid_ticket"** (RLS pode estar bloqueando o webhook de inserir QR? checar logs)
6. **Limpar usuários órfãos** se houver (já apagamos 2: `da1958ce-...` e `c17f475f-...`)
7. **Validar idempotência do webhook** com simulador do MP

### Médio prazo
8. **Migrar de Checkout Pro pra Checkout Bricks** (embedded — não sair do site)
9. **Painel admin:** o `src/app/admin/` existe mas não foi explorado — verificar conteúdo e adaptar
10. **Botão de logout / nav user**
11. **Trocar credenciais TESTE pra PRODUÇÃO** quando for lançar comercialmente
12. **Rotacionar `NEXT_PUBLIC_SUPABASE_ANON_KEY`** (boa prática de segurança)

### Longo prazo (pós-MVP)
13. **Cupons** — testar fluxo completo de aplicação
14. **Afiliados** — sistema existe na tabela mas não foi explorado nesta conversa
15. **Cortesias** — idem
16. **Sistema de check-in** com leitor de QR
17. **Página pública de listagem** de múltiplos eventos (hoje só 1 evento)
18. **Melhorias UX** mobile e desktop

---

## 🛠️ INFORMAÇÕES TÉCNICAS ÚTEIS

### Schema Supabase (resumido)
- `events` — id, slug, title, event_date, event_time, venue_*, service_fee_percent, max_tickets_per_cpf, status (active/draft/finished)
- `profiles` — id (FK auth.users), email, cpf UNIQUE NOT NULL, full_name, first_name, last_name, phone, birth_date, gender, city, state, neighborhood, referral_source, marketing_consent, role (customer/admin/producer)
- `orders` — id, order_number serial, event_id, customer_id, coupon_id, subtotal, service_fee, discount, total, payment_status (pending/in_process/approved/rejected/cancelled/refunded), payment_method, payment_gateway, payment_gateway_id, payment_gateway_data jsonb, paid_at, created_at
- `order_items` — id, order_id, ticket_batch_id, attendee_name, attendee_cpf, unit_price, qr_code_token UNIQUE, qr_code_url, status (valid/used/cancelled), checked_in_at
- `ticket_batches` — id, event_id, name, price, quantity, sold_count, sort_order, starts_at, ends_at, status (active/paused/sold_out/ended), is_visible, max_per_order
- `coupons` — id, event_id, code, coupon_type (discount_percent/discount_fixed/free_fee), discount_value, max_uses, used_count, valid_from, valid_until, is_active
- `affiliates`, `affiliate_visits`, `courtesies`, `access_logs`, `event_collaborators` (não explorados)
- `email_confirmations` — id, user_id, email, token UNIQUE, expires_at, confirmed_at, last_sent_at
- `rate_limits` — id, identifier, count, window_start
- `wall_posts` — id, event_id, author_id, parent_id (null=top-level, preenchido=reply), content, image_url, is_deleted, like_count, reply_count, created_at
- `wall_likes` — id, post_id, user_id, UNIQUE(post_id, user_id)

### Função RLS crítica
`user_has_paid_ticket(user_id, event_id) returns boolean` — usada nas RLS policies do mural pra validar acesso. Confere se existe order com payment_status='approved' + order_item válido.

### Trigger crítica (PRÉ-EXISTENTE no projeto)
`handle_new_user()` em `auth.users` AFTER INSERT — cria profile automaticamente. Espera `user_metadata: { full_name, cpf, phone, role }`. **Importante**: `signup/route.ts` precisa passar tudo no metadata.

### Cartões de teste do MP
- **Mastercard:** `5031 4332 1540 6351`
- **CVV:** `123`
- **Validade:** qualquer futura (ex: `11/30`)
- **Nome:** `APRO` (aprova) ou `OTHE` (recusa)
- **CPF do comprador:** `12345678909`

---

## 🎨 ESTILO VISUAL CONSOLIDADO
- Tema dark (`bg-neutral-950`, `bg-neutral-900`)
- Cor de marca: vermelho `red-600` + roxo `purple-700` (gradients)
- Páginas estruturadas em `<main>` com `max-w-*` centralizado
- Form inputs: `bg-neutral-900 border-neutral-700 focus:border-red-600`
- Botões primários: `bg-red-600 hover:bg-red-700`
- Modal de erro: vermelho com ring red-700/40
- Modal de sucesso: emerald-950 com border emerald-800

---

## 📝 PERFIL DO USUÁRIO (Fernando)
- Inteiramente iniciante em código — precisa de tutoriais passo a passo
- Sistema operacional: Windows 11, usa PowerShell
- **NÃO** faz print de arquivos `.env*` ou tokens (instrução já passada após vazamento)
- Trabalha com tela compartilhada/prints com frequência
- Tem hábito de descrever bem o problema observado (bom debugging colaborativo)
- Já tem familiaridade com Supabase Dashboard, Vercel Dashboard, GitHub
- Git instalado e configurado (`user.name`, `user.email`)

---

## 🔑 LOG DE CHAVES ROTACIONADAS (segurança)
- ✅ `RESEND_API_KEY` — rotacionada (chave antiga vazou em print, foi deletada no Resend)
- ✅ `JWT_SECRET` — rotacionada (chave antiga vazou)
- ✅ `MP_ACCESS_TOKEN` e `MP_PUBLIC_KEY` — não foi necessário rotacionar (eram TEST-, agora estão usando APP_USR- do vendedor de teste, que são novas)
- ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` — apareceu em print, mas como RLS protege e ela é design "pública", a rotação é boa prática mas não urgente

---

## 📦 ARQUIVOS DA ENTREGA INICIAL
- `sacode-entrega2.zip` — pacote inicial completo (pode ser referenciado)
- `01_migrations.sql` — script SQL rodado no Supabase
- `README.md` — tutorial passo a passo de instalação (já no repo)
- `docs/teste-webhook-mp.md` — documento sobre como testar webhook MP

---

**Status final:** ~85% do MVP funcional. Falta resolver webhook + testes finais. Estimativa: mais 1-2 horas de trabalho pra MVP estar 100% pronto pra anunciar a venda dos ingressos.
