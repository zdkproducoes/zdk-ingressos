# 📋 SACODE — Estado do Projeto (26/04/2026, 21h)

> Documento de continuidade. Cole na primeira mensagem do novo chat para retomar de onde paramos.
> Substitui o `contexto-sacode.md` original.

---

## 🎯 Contexto rápido

**Quem:** Fernando Zedeque (zdkproducoes), produtor de eventos. Iniciante em código, mas com ferramentas profissionais agora (VS Code + Claude Code).

**Projeto:** SACODE — plataforma própria de ingressos (similar a Sympla), validada com o evento real "SACODE 15ª Edição" do artista Caio Lacerda.

**Visão de produto:** o MVP é pro evento do Caio (07/06/2026), mas a plataforma será expandida pra outros produtores depois. Branding: o evento/artista é protagonista; a plataforma aparece como "powered by" no rodapé.

**Stack:** Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage) + Vercel + Mercado Pago Checkout Pro + Resend (email) + Cloudflare Turnstile + Tailwind CSS.

**URL de produção:** https://sacode.cantorcaiolacerda.com.br

**Data crítica:** abertura de vendas planejada pra **sexta-feira 01/05/2026**. Evento em **07/06/2026**.

---

## 📂 Localização

**Pasta local:** `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`

**GitHub:** https://github.com/zdkproducoes/sacode-ingressos (branch `main`)

**Estrutura:** `src/` (com `"@/*": ["./src/*"]` no `tsconfig.json`)

---

## ✅ O QUE ESTÁ FUNCIONANDO (testado fim a fim)

### Fluxo principal
- ✅ Cadastro com Turnstile + validação completa
- ✅ Confirmação de e-mail por link customizado
- ✅ Login com cooldown de 60s pra reenvio
- ✅ Página do evento com seleção de lote
- ✅ Checkout Pro do Mercado Pago (cartão de crédito validado com cartão APRO)
- ✅ Webhook do MP processa pagamento aprovado e atualiza pedido
- ✅ E-mail com QR codes chega via Resend
- ✅ `/minhas-compras` lista pedidos com QR codes
- ✅ Mural exclusivo pra compradores funcionando

### Painel admin (criado hoje)
- ✅ `/admin` protegido por middleware (role admin/producer)
- ✅ `/admin/resumo` — 4 cards: total pedidos, aprovados, faturamento, ingressos vendidos
- ✅ `/admin/pedidos` — tabela últimos 50 pedidos com badge colorido + botão **Reenviar e-mail**
- ✅ `/admin/lotes` — tabela com barra de progresso e badge ESGOTADO
- ✅ `/admin/compradores` — lista com botão **Exportar CSV** (BOM UTF-8, separador `;`)
- ✅ Abas mobile viram `<select>`, tabelas roláveis

### Recursos de operação (criados hoje)
- ✅ **Navbar global** em todas as páginas (logo, links contextuais, avatar mobile com dropdown)
- ✅ **Botão de logout** funcional
- ✅ **Reenvio de e-mail no admin** — `/api/admin/orders/[id]/resend-email` com dupla auth
- ✅ **Busca pública de ingresso** — `/buscar-ingresso` com CPF + nº pedido + rate limit (5 tentativas / 15 min por IP)
- ✅ **Auditoria** — tabela `audit_logs` registrando reenvios e buscas (IP, user-agent, found, CPF mascarado)
- ✅ **Footer** com link "Localizar meu ingresso"
- ✅ **Template de e-mail atualizado** — exibe nº do pedido em destaque + link de fallback

### Infraestrutura
- ✅ Vercel + GitHub + Supabase + Resend + Turnstile configurados
- ✅ DNS apontando pra Vercel
- ✅ Variáveis de ambiente todas no ar
- ✅ Build passando sem erros (27 páginas, zero TypeScript warnings)

---

## ⚠️ DECISÕES IMPORTANTES TOMADAS

### Webhook do Mercado Pago: validação via API, não HMAC

**Contexto:** após várias horas de debug, descobrimos que a verificação de assinatura HMAC do webhook do MP **não funciona com test users** — testamos 6 variações de manifest, todas falhavam mesmo com a chave secreta correta. Suspeita: bug do MP ou comportamento não documentado de test users.

**Solução implementada:** abandonamos a verificação HMAC como bloqueio e usamos **validação via API**. Cada webhook recebido faz uma chamada `mpPayment.get({ id: paymentId })` — se o MP confirma que o pagamento existe e está aprovado, processa. Se a API rejeitar, retorna ok silenciosamente.

**Por que é seguro:** o MP é a fonte da verdade; atacante não consegue forjar pagamento. Padrão aceito (IPN tradicional do MP usa essa abordagem).

**A fazer no futuro (não-bloqueador):** quando migrar pra credenciais de produção real (não test user), tentar reativar HMAC. Item registrado pra pós-MVP.

### Ferramentas de desenvolvimento

- VS Code instalado e configurado (`code` no PATH)
- Claude Code instalado e logado (`@anthropic-ai/claude-code` 2.1.119)
- Fluxo padrão: edição via Claude Code → ele faz build local → commit → push → Vercel deploya

### Branding/produto

- Cliente DEVE estar logado pra comprar (decisão estratégica de ownership de dados)
- Checkout Pro mantido (vs Bricks) — migrar pra Bricks fica pós-MVP
- Página inicial redireciona pra `/evento/sacode-15-edicao` (único evento ativo)

---

## 🗓️ ROADMAP — O QUE FALTA ANTES DE SEXTA (01/05)

**Tempo restante:** 5 dias (seg/ter/qua/qui de 3h cada + sex dia inteiro = ~13h disponíveis)

### Crítico para abertura de vendas
- [ ] Validar visualmente em celular real: cadastro → checkout → ingresso → mural (15 min)
- [ ] Configurar valores corretos dos lotes (datas de abertura, quantidades) via Supabase ou painel
- [ ] Definir estratégia de comunicação: redes sociais, lista de transmissão WhatsApp
- [ ] Texto da página do evento: descrição, política de meia-entrada, regras

### Importante mas pode aguardar
- [ ] Sistema de cupons funcional (schema já existe, falta UI/teste)
- [ ] Página "esqueci minha senha" (Supabase Auth tem nativo, só ativar)
- [ ] Tela de detalhe individual do pedido no admin
- [ ] Filtros de status na tabela de pedidos
- [ ] Edição de evento via UI (hoje edita pelo Supabase)

### Pós-MVP (após sexta)
- [ ] Sistema de check-in com leitor QR (a tabela `access_logs` existente já é pra isso)
- [ ] Dashboard de métricas avançadas (gráficos, conversão)
- [ ] Migrar pra credenciais de produção real do MP e tentar HMAC novamente
- [ ] Página pública de listagem de múltiplos eventos
- [ ] Onboarding de outros produtores
- [ ] Pen test antes de abrir pra outros produtores

---

## 🛠️ INFORMAÇÕES TÉCNICAS ÚTEIS

### Schema Supabase (resumo)
- **events** — id, slug, title, event_date, event_time, venue_*, service_fee_percent, max_tickets_per_cpf, status
- **profiles** — id (FK auth.users), email, cpf UNIQUE, full_name, first_name, last_name, phone, role (customer/admin/producer)
- **orders** — id, order_number serial, event_id, customer_id, coupon_id, totals, payment_status, payment_gateway_data jsonb, paid_at
- **order_items** — id, order_id, ticket_batch_id, attendee_name, qr_code_token UNIQUE, qr_code_url, status
- **ticket_batches** — id, event_id, name, price, quantity, sold_count, sort_order, status
- **coupons** — id, event_id, code, coupon_type, discount_value, max_uses, used_count
- **access_logs** — para futuros logs de check-in (event_id, order_item_id, checked_in_by, action, denial_reason)
- **audit_logs** — auditoria geral (action, actor_id, target_resource_*, ip, user_agent, metadata, created_at) ← criada hoje
- **wall_posts**, **wall_likes**, **email_confirmations**, **rate_limits**, **affiliates**, **courtesies**

### Arquitetura de proteção do `/admin`
1. **`src/middleware.ts`** intercepta `/admin/*`, busca user via cookies, valida role no profile
2. **`src/app/admin/layout.tsx`** re-verifica auth + role no servidor (defesa em profundidade)
3. **`supabaseAdmin` (service role)** usado nas queries do painel — bypassa RLS, só roda no servidor

### Templates de e-mail (Resend)
- `src/emails/confirmation.tsx` — confirmação de cadastro
- `src/emails/ticket.tsx` — ingressos com QR + nº do pedido em destaque + link `/buscar-ingresso`

### Auditoria — `audit_logs` registra:
- `action: 'admin_resend_email'` — quando admin reenvia e-mail
  - metadata: `{ sent_to, success }`
  - actor_id: id do admin
- `action: 'public_ticket_search'` — quando alguém usa busca pública
  - metadata: `{ cpf_masked, found }`
  - actor_id: null (público)

### Webhook do Mercado Pago
- URL: `https://sacode.cantorcaiolacerda.com.br/api/checkout/webhook`
- Configurado no painel MP (vendedor de teste, "Modo de teste") com evento "Pagamentos"
- Validação via `mpPayment.get(id)` — confiável, sem HMAC
- Log mínimo no entry: `[MP webhook] received { paymentId, type, live_mode }`

### Cartões de teste do MP
- **Mastercard:** `5031 4332 1540 6351` | CVV `123` | Validade `11/30`
- **Nome:** `APRO` (aprova) ou `OTHE` (recusa)
- **CPF do comprador:** `12345678909`

---

## 🎨 ESTILO VISUAL

- Tema dark: `bg-neutral-950`, `bg-neutral-900`
- Marca: `red-600` + `purple-700` (gradients)
- Form inputs: `bg-neutral-900 border-neutral-700 focus:border-red-600`
- Botões primários: `bg-red-600 hover:bg-red-700`
- Modal de erro: vermelho `red-700/40`; sucesso: `emerald-950 / emerald-800`

---

## 📝 PERFIL DO USUÁRIO (Fernando)

- Iniciante em código — precisa de tutoriais passo a passo
- Windows 11 + PowerShell + VS Code + Claude Code
- **NÃO** faz print de `.env*` ou tokens (instrução firme)
- Trabalha com tela compartilhada com frequência (cuidado com prints)
- Bom debugging colaborativo, descreve problemas com clareza
- **NÃO** edita arquivos pelo navegador no GitHub — toda edição passa pelo Claude Code (regra firmada após conflito de ontem)

---

## 🔑 LOG DE SEGURANÇA

- ✅ `RESEND_API_KEY` rotacionada (vazou em print, deletada e reemitida)
- ✅ `JWT_SECRET` rotacionada
- ✅ `MP_WEBHOOK_SECRET` regenerada e atualizada na Vercel (mas não é mais usada como bloqueio — só registrada)
- ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` apareceu em print no passado — RLS protege, rotação é boa prática mas não-urgente

---

## 🚀 COMO RETOMAR DAQUI

Quando começar o próximo chat, **cole este documento inteiro na primeira mensagem** + diga em que ponto quer continuar. Sugestões de pontos de partida:

1. **"Quero validar o sistema completo no celular antes de abrir vendas"** — testes finais de UX
2. **"Quero fazer o sistema de cupons funcionar"** — funcionalidade que já tem schema
3. **"Quero configurar a página do evento com texto e imagens definitivos"** — preparação pra anúncio
4. **"Quero criar tela de detalhe de pedido no admin"** — refinar painel
5. **"Quero acelerar a estratégia de comunicação pra venda"** — marketing + sistema integrados

---

## ⏱️ ESTIMATIVA DE TEMPO RESTANTE

- Hoje (domingo): **0h** — fechado em alta
- Segunda: 3h
- Terça: 3h
- Quarta: 3h
- Quinta: 3h
- Sexta: dia inteiro (lançamento)

**Total disponível: ~13h** — suficiente pra fechar o crítico e ainda abrir folga pra ajustes finais.

---

**Status final do dia 26/04/2026:** Dia muito produtivo. Webhook (maior risco técnico) resolvido, painel admin completo, ferramentas operacionais (reenvio + busca pública) prontas. Próxima sessão começa de patamar alto.
