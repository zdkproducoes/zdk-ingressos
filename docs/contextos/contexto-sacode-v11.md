# Contexto SACODE — v11

> Atualizado em **05/05/2026** (madrugada de terça-feira).
> Sessão dedicada à implementação do sistema de cortesia + investigação do Pix (parcialmente bloqueada por aprovação de conta PJ no Mercado Pago).
> Cole esse arquivo no próximo chat junto com a frase: *"Claude, retomando o projeto SACODE. Anexo contexto-sacode-v11.md."*

---

## 🎯 Projeto

**Fernando Zedeque (ZDK Produções)** construindo plataforma própria de venda de ingressos. MVP no evento **SACODE 15ª Edição (Aquecimento Copa)** — artista Caio Lacerda, **07/06/2026** no Villa Jardim Bar (SBC/ABC paulista).

**Status do lançamento:** **adiado novamente** por motivos estratégicos (não-técnicos). Nova data de abertura de vendas a definir, mas a janela é confortável — todas as etapas estão sendo construídas com calma.

## 🛠 Stack

Next.js 14 + Tailwind / Supabase (Auth+DB+Storage, `@supabase/ssr` v0.5.2, `supabase-js` v2.104.1) / Resend (auth + transacional) / Mercado Pago (HMAC ativo, Checkout Pro) / Vercel / GitHub.

**Plugin instalado em sessões anteriores:** `@tailwindcss/typography`.

---

## 👤 Perfil do usuário e processo de trabalho

**Importante manter em todas as próximas sessões:**

- **Iniciante** — sempre fornecer instruções passo a passo simplificadas e numeradas. Não assumir conhecimento prévio.
- **Setup de 3 janelas PowerShell:** **DEV** (roda servidor local `npm run dev`), **GIT** (comandos git), **CLAUDE** (Claude Code). Sempre especificar qual janela usar pra cada comando.
- **Estilo de passo a passo preferido:** dar o próximo passo + o passo seguinte com condição. Exemplo: *"Roda X. Se aparecer Y, segue pro Z. Se aparecer algo diferente, cola aqui."* O usuário decide se segue ou pausa baseado no output esperado vs inesperado.
- **NÃO repetir instruções anteriores** quando ele cola output. Só responder ao que é novo.
- **Edição manual de arquivos** (VS Code direto ou PowerShell) é a preferência.
- **Geração de arquivos prontos para download** via `present_files` é o padrão preferido pra arquivos grandes ou com acentos. Funciona muito melhor que copy-paste.
- **Encoding bagunçado no PowerShell é falso positivo:** `Get-Content` exibe arquivos UTF-8 com acentos errados, mas o arquivo está correto. Validar sempre abrindo no Notepad ou navegador.
- **NOVO — SQL no painel do Supabase:** o projeto não usa `supabase/migrations` local. Toda mudança de banco é executada direto no SQL Editor do painel. Quando precisar de mudanças de schema, gerar SQL pronto pra colar com `IF NOT EXISTS` quando aplicável.

---

## ✅ O que foi feito na sessão de 04-05/05

### 1. Sistema de Cortesia completo (Etapa 2 do plano da sessão)

Implementação completa, testada e funcional. O usuário aprovou ("ficou melhor do que eu gostaria"). Permite ao admin emitir 1 a 10 ingressos cortesia para um convidado já cadastrado.

#### Mudanças no banco (executadas via SQL Editor do Supabase)

```sql
-- Adicionou colunas de cortesia em orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_courtesy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS courtesy_issued_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Adicionou coluna de cortesia em order_items (pra facilitar query)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_courtesy boolean NOT NULL DEFAULT false;

-- Index pra busca rápida de cortesias
CREATE INDEX IF NOT EXISTS idx_orders_is_courtesy ON orders(is_courtesy) WHERE is_courtesy = true;

-- Criou lote "Cortesia" no evento SACODE
INSERT INTO ticket_batches (event_id, name, price, quantity, sold_count, max_per_order, min_per_order, status, is_visible, sort_order)
VALUES ('6539575d-7a71-4c50-8f62-955bc5a96947', 'Cortesia', 0, 500, 0, 10, 1, 'active', false, 0);
```

**Foreign keys importantes (para joins do Supabase):**
- `orders_customer_id_fkey` → profiles(id)
- `orders_courtesy_issued_by_fkey` → profiles(id) ON DELETE SET NULL

#### Arquivos criados

```
src/app/admin/cortesias/page.tsx                     ← server component, busca eventos
src/app/api/admin/cortesias/route.ts                 ← GET (lista) + POST (emite)
src/app/api/admin/cortesias/buscar/route.ts          ← GET (busca convidado por CPF/email)
src/components/admin/CortesiasClient.tsx             ← UI completa com busca + emissão + lista
```

#### Arquivos modificados

```
src/components/admin/AdminTabs.tsx                   ← adicionou tab "Cortesias"
```

#### Funcionalidades implementadas

- **Busca de convidado por CPF (com máscara automática) ou e-mail**
- **Convidado encontrado:** mostra card com nome/email/CPF + input editável de "Nome no ingresso" + seletor de quantidade (botões `−` `+` e input numérico, máx 10)
- **Convidado não encontrado:** mostra link de cadastro com botão "Copiar link" pra mandar via WhatsApp/e-mail
- **Emissão:** cria 1 `order` + N `order_items`, gera N QR Codes únicos, faz upload no Supabase Storage `qr-codes`, dispara 1 e-mail único com todos os QRs
- **Assunto do e-mail:** `🎁 Você recebeu uma cortesia para SACODE 15ª Edição` (quantity=1) ou `🎁 Você recebeu 3 cortesias para SACODE 15ª Edição` (quantity>1)
- **Auditoria:** tabela mostra quem emitiu cada cortesia, quando, pra quem, quantos ingressos. Coluna "Qtd" com badge dourado quando >1.
- **Rollback robusto:** se qualquer QR falhar no meio do loop, apaga uploads do storage + items + order. Se e-mail falhar (mas QRs OK), retorna `warning` mas mantém o pedido — admin pode reenviar manualmente.
- **Reuso da RPC `increment_batch_sold`** já existente no banco — incrementa o `sold_count` do lote Cortesia em N de uma vez.

#### Decisão de design — "1 convidado, N ingressos, mesmo nome"

Usuário escolheu o "Caminho A" (referência: como funcionava na BlackTag). Cada cortesia tem 1 destinatário e 1 nome único usado em todos os ingressos. Se admin quiser nomes diferentes, precisa emitir cortesias separadas. Comportamento intencionalmente simples — usuário descartou versões mais elaboradas (lote/fila com múltiplos destinatários).

#### Smoke test executado

- Teste 1: cortesia com `quantity=1` → ✅ ok, e-mail chegou
- Teste 2: cortesia com `quantity=3` → ✅ ok, e-mail único com 3 QRs

### 2. Investigação do Pix — bloqueada por aprovação MP

Caminho original era ir direto pro Pix, mas surgiu bloqueio na conta. Resumo:

#### Diagnóstico

- O código **já tem `excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }]`** — não exclui Pix
- Teste em janela anônima mostrou que **Pix não aparecia mesmo assim** (só Cartão de Crédito + Cartão Débito Virtual CAIXA)
- Causa raiz: a conta MP usada pra receber é **conta pessoal (CPF) do Caio Diego Martins**, não conta PJ
- Conta CPF tem chave Pix cadastrada (`ingressos@cantorcaiolacerda.com.br`), mas isso é pra receber transferências avulsas — Checkout Pro precisa de aceitação Pix configurada na conta, geralmente automática em PJ

#### Ação tomada

- Usuário **migrou a conta MP pra PJ** (CNPJ 44.816.216/0001-03 — CAIO DIEGO MARTINS)
- Aprovação do MP demora até **24h** (solicitação aberta em ~22h de 04/05)
- Quando aprovado, basta:
  1. Trocar o `MERCADOPAGO_ACCESS_TOKEN` no Vercel (Production env vars) pelo token da conta PJ
  2. Trocar também na `.env.local` se for testar localmente
  3. Validar em janela anônima que Pix aparece no checkout
  4. Ajustar `installments: 12` → `installments: 1` em `src/app/api/checkout/create/route.ts` (escolha do usuário: sem parcelamento)

#### Decisões pendentes confirmadas pelo usuário (pra quando o Pix for executado)

- **Métodos:** Opção B do plano original = **Pix + Crédito + Débito + Saldo MP** (manter `excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }]`)
- **Parcelamento:** **sem parcelamento** (`installments: 1`)
- **Continuar com Checkout Pro** (Caminho A do plano original — não migrar pra Transparente agora; reforma fica pra fase 2)

### 3. Descobertas sobre arquitetura do projeto

Mapeamento que vai ajudar nas próximas sessões:

- **Painel admin já existe** com auth via coluna `role` em `profiles` (valores: `customer` / `admin` / `producer`). Layout protegido em `src/app/admin/layout.tsx`.
- **Tabs admin** estão em `src/components/admin/AdminTabs.tsx` (Resumo, Pedidos, Lotes, Compradores, **Cortesias** ← novo nessa sessão).
- **Pastas vazias** já criadas em 24/04 que servirão como esqueleto futuro: `src/app/admin/checkin/`, `src/app/admin/afiliados/`, `src/app/admin/colaboradores/`, `src/app/admin/cupons/`, `src/app/admin/evento/`, `src/app/admin/financeiro/`, `src/app/admin/ingressos/`, `src/app/admin/vendas/`.
- **QR Codes:** já são gerados no webhook do MP (`src/app/api/checkout/webhook/route.ts`) quando pagamento é aprovado. Storage: bucket `qr-codes` no Supabase, organizado por `YYYY/MM/DD/uuid.png`. Tokens no formato `SCD-` + 24 hex chars uppercase. Mesma estratégia foi reusada para cortesias.
- **`order_items` já tem colunas `checked_in_at` e `checked_in_by`** — check-in vai usar esses campos prontos, não precisa criar.
- **RPC `increment_batch_sold`** já existe no banco e é usada tanto no fluxo de pagamento quanto no de cortesia.

---

## 🐛 Bugs ainda abertos

### Botão "Sair" no header não funciona
- Persistente desde v8/v9/v10. Não foi investigado nessa sessão.
- Workaround: limpar cookies + localStorage no DevTools, ou fechar aba.

### FOUC navbar (cosmético)
- Inalterado, fase 2.

### Encoding visual no PowerShell
- `Get-Content` exibe acentos errados, mas arquivo é UTF-8 válido. Falso positivo.

### Encoding em strings JSX (`src/app/cadastro/page.tsx` e similares)
- Strings tipo `Já tem conta?` aparecem com `Ã©` em alguns arquivos quando lidos via `Get-Content`
- Não-bloqueante (Notepad mostra correto). Varredura geral fica pra fase 2.

---

## 📐 Decisões técnicas dessa sessão

### Por que componentes client + server separados na rota admin

`src/app/admin/cortesias/page.tsx` é **server component** que busca eventos do Supabase e passa pro `CortesiasClient.tsx` (client component). Isso evita expor `supabaseAdmin` ao cliente e respeita o padrão Next.js 14 (App Router).

### Por que detecção CPF vs e-mail no input de busca

Em vez de ter dois campos separados, um único campo detecta se o usuário está digitando CPF (só números → aplica máscara `000.000.000-00`) ou e-mail (tem `@` ou letras → mantém como está). UX mais fluida, especialmente em mobile.

### Por que e-mail único com todos os QRs em vez de N e-mails

Decisão de UX: quando admin emite 5 cortesias pra Maria, Maria recebe **1 e-mail** com 5 QRs anexados, não 5 e-mails separados. Reduz spam e centraliza tudo em uma só thread. Padrão idêntico ao já usado nas compras pagas.

### Por que rollback completo se qualquer QR falhar

Loop de geração de QR é a parte mais frágil (faz upload no storage + update no DB). Se 1 dos N QRs falhar, sobra `order_items` sem QR no banco — estado inconsistente. Solução: try/catch envolvendo todo o loop, e rollback completo (storage + items + order) se qualquer um falhar. Custa um pouco mais de código mas garante atomicidade.

### Por que NÃO fazer rollback se e-mail falhar

E-mail é o último passo. Se Resend cair, os QRs já estão gerados, ingressos já estão válidos, sold_count já incrementado. Apagar tudo seria pior — o ingresso seria "perdido" mesmo tendo sido criado com sucesso. Em vez disso, retorna `warning: 'reenvie manualmente'` e mantém o pedido. Admin pode reenviar pelo botão "Reenviar e-mail" (que já existe em outras telas — `ResendEmailButton.tsx`). **Pendência:** ainda não foi adicionado botão de reenvio na tela de cortesias, mas o componente existe.

---

## 📝 Aprendizados que valem ouro pro futuro

### Quando algo "não funciona", checa configurações de conta antes de mexer em código

O Pix não aparecer no Checkout Pro **não era bug do código**. Era conta CPF em vez de PJ. Antes de mudar 1 linha sequer, verificar painel da plataforma poupou horas. **Sempre testar em janela anônima** quando o assunto é gateway de pagamento — login do vendedor esconde opções.

### `live_mode` no webhook indica se o pagamento foi real ou sandbox

No log do webhook do MP (`src/app/api/checkout/webhook/route.ts`) tem `body?.live_mode` — útil pra distinguir testes de pagamentos reais. Já está sendo logado, é só consultar nos logs do Vercel se precisar.

### Foreign keys nominais no Supabase = joins inteligentes

Pra fazer 2 joins na mesma tabela (ex: `customer_id` E `courtesy_issued_by` ambos apontando pra `profiles`), o Supabase precisa saber qual FK usar em cada um. Sintaxe: `profiles!orders_customer_id_fkey ( ... )` e `issuer:profiles!orders_courtesy_issued_by_fkey ( ... )`. Aliasar (`issuer:`) evita colisão de nomes no resultado.

### `Array.from({ length: N }, () => ({...}))` pra criar N items idênticos

Útil pra inserir N order_items de cortesia em batch:
```typescript
const itemsToInsert = Array.from({ length: qty }, () => ({
  order_id: order.id,
  ticket_batch_id: batch.id,
  // ...
}));
```
Mais limpo que `for` loop com push.

### "Move-Item pra pasta errada" — atenção redobrada quando paths são parecidos

`src\app\admin\cortesias\` (página admin) vs `src\app\api\admin\cortesias\` (rota API) confundiu na hora de mover arquivos. Da próxima vez, separar visualmente os caminhos com indentação ou seções claras nos comandos.

---

## 🚦 Plano para próxima sessão

### Prioridade 1 — Verificar aprovação MP do Caio (Pix)

Tempo estimado: 10 min se já aprovado.

1. Caio confirma aprovação da conta PJ no painel do MP
2. Pega novo `MERCADOPAGO_ACCESS_TOKEN` (token de produção da conta PJ)
3. Atualiza no Vercel (Settings → Environment Variables → produção)
4. Faz redeploy ou aguarda próximo deploy
5. Testa em janela anônima:
   - Adiciona ingresso ao carrinho
   - Vai pro checkout
   - **Espera ver Pix como opção** + Cartão Crédito + Cartão Débito + Saldo MP
6. Se Pix aparecer: ajustar `installments: 12` → `installments: 1` em `src/app/api/checkout/create/route.ts` (linha ~85)
7. Pequeno smoke test: comprar 1 ingresso real via Pix (R$ 15-25), verificar webhook + e-mail + ingresso em "Minhas compras"
8. Se Pix NÃO aparecer mesmo com PJ aprovado, investigar mais (pode ser que conta PJ recém-criada precise de validação adicional)

### Prioridade 2 — Etapa 3: Sistema de Check-in

Tempo estimado: 2h30 a 3h.

**Decisões já confirmadas pelo usuário:**

- **3 modos:** QR Code (principal) + busca por CPF (fallback) + nome (fallback)
- **1 login compartilhado:** `checkin@cantorcaiolacerda.com.br` (já criado pelo usuário, falta só promover a `staff` no banco)
- **Identificação de Hostess:** dropdown na tela inicial ("Estou trabalhando como: [Hostess 1] [Hostess 2] [Hostess 3] [Hostess 4]"). Escolha persiste em `localStorage` da sessão.
- **Tela do check-in:**
  - ✅ Verde grande: "Check-in OK — [Nome do convidado]"
  - ❌ Vermelho grande: "JÁ FOI USADO às 22h13 por Hostess 2" / "INGRESSO INVÁLIDO"
- **Antiduplicação:** UNIQUE constraint em `order_items.checked_in_at` quando não null (ou via lógica de application)
- **Tabela:** vai precisar criar `ticket_checkins` ou expandir `order_items` com `hostess_name`. Pendente decidir.

**Sub-etapas previstas:**
1. SQL: criar role `staff` (se não existir como valor válido em `profiles.role`), promover usuário `checkin@cantorcaiolacerda.com.br`, criar tabela ou colunas pra registrar Hostess
2. API: endpoint de validação de check-in (recebe QR token, retorna status + dados do ingresso)
3. Página `/checkin`: tela inicial com dropdown Hostess + scanner QR + busca manual
4. Library de QR scanner: `html5-qrcode` (testar compatibilidade mobile Chrome/Safari)
5. Smoke test em celular real usando ingressos cortesia já gerados

**Importante:** o usuário **já tem ingressos válidos** dos testes de cortesia (Teste 1 e Teste 2) — pode usar esses QRs pra testar o check-in sem precisar gerar mais nada.

### Prioridade 3 — Limpeza pré-lançamento

- **Remover ingressos cortesia de teste** que foram gerados pra validação (sold_count do lote Cortesia atualmente = 4, vindos dos testes)
- Investigar e corrigir botão "Sair" no header (pendência v8-v10)
- Smoke-testar affiliate tracking em produção (pendência v5-v10)
- Adicionar links pros documentos legais no footer do site (pendência v10)

### Roadmap maior (fase 2)

- Painel admin editável (CRUD evento)
- Embaixadores SACODE
- Transferência de titularidade self-service (atualmente manual via e-mail conforme cláusula 6.4 dos Termos)
- Botão de reenvio de e-mail na tela de cortesias (componente `ResendEmailButton` já existe)
- Migração pra Checkout Transparente (Pix + Cartão tudo no site)
- Área "Meu Perfil" — incluindo botão de mudar senha logado
- FOUC navbar
- Varredura geral de encoding em strings JSX
- P1/P2/A1/TD1

---

## 🎨 Decisões de design vigentes (inalteradas)

- Skin Copa **só em** `/evento/sacode-15-edicao`. Resto do site = paleta vinho SACODE.
- Lote único exibido sem contador (a menos que ≥90% vendido OU <24h pra próximo lote).
- Logo PNG transparente nas barras.
- Iframe Google Maps em vez de Leaflet/OSM.
- Páginas legais (`/termos`, `/privacidade`) usam fundo branco com `prose-zinc`.
- Modais legais (no cadastro) usam fundo `wine-700` com `prose-invert`.
- **NOVO:** Painel admin segue paleta vinho. Cortesias usa cards `bg-wine-700 border-mauve-700`, com destaque `amber-sacode-400` em CTAs e badge de quantidade. Mensagens de feedback em verde (`bg-green-950`) ou vermelho (`bg-red-950`).

## 📜 Decisões jurídicas vigentes

Termos com advogado, **publicados em produção** desde v10. Caio Lacerda (CNPJ 44.816.216/0001-03) é Organizador+Controlador; ZDK é Operadora. Sem meia-entrada. Direito de arrependimento 7d. Cancelamento: cliente escolhe crédito/reembolso. DPO: `privacidade@zdkproducoes.com.br`.

**Atenção financeira:** conta MP de recebimento estava em CPF do Caio (descompasso com CNPJ). Migração pra PJ em curso (aprovação 24h). Quando aprovada, regulariza fluxo financeiro.

## 🐛 Pendências v5–v10 ainda válidas

- Botão "Sair" no header (descoberto na sessão de 02/05, persistente)
- FOUC navbar (cosmético, fase 2)
- Affiliate tracking — não foi smoke-testado em produção
- Painel admin editável (CRUD evento)
- Embaixadores SACODE
- Área "Meu Perfil" — incluindo botão de mudar senha logado
- Transferência de titularidade self-service
- P1/P2/A1/TD1
- Varredura geral de encoding em strings JSX (não-bloqueante)
- **NOVO:** Botão de reenvio de e-mail na tela de cortesias (componente `ResendEmailButton` já existe, falta integrar)

## 🗄 Estado do banco (`ticket_batches` do evento `sacode-15-edicao`)

Após sessão 04-05/05:
```
sort_order | name                       | price | quantity | sold_count | is_visible
0          | Cortesia                   | 0     | 500      | 4 (testes) | false
1          | Ingresso Promocional       | 15    | ?        | 0          | true
2          | Ingresso Único - Lote 01   | 20    | ?        | 0          | true
3          | Ingresso Único - Lote 02   | 25    | ?        | 0          | true
4          | Ingresso Único - Lote 03   | 35    | ?        | 0          | true
```

`event_id = '6539575d-7a71-4c50-8f62-955bc5a96947'`. Todos `is_visible=true` exceto Cortesia.

**Limpeza pré-lançamento:** zerar `sold_count` do lote Cortesia OU manter como está (já que cortesias reais virão por cima — não atrapalha).

## 🗂 Estrutura de arquivos relevante (após sessão 04-05/05)

```
src/
├── app/
│   ├── cadastro/
│   │   └── page.tsx
│   ├── checkout/
│   │   ├── page.tsx
│   │   ├── falha/, pendente/, sucesso/
│   ├── termos/, privacidade/
│   ├── admin/
│   │   ├── layout.tsx               (auth: role = admin/producer)
│   │   ├── page.tsx                 (redireciona pra /admin/resumo)
│   │   ├── cortesias/               ← NOVO (sessão 04-05/05)
│   │   │   └── page.tsx
│   │   ├── checkin/                 (vazia, próxima sessão)
│   │   ├── compradores/, lotes/, pedidos/, resumo/
│   │   ├── afiliados/, colaboradores/, cupons/, evento/, financeiro/, ingressos/, vendas/  (vazias)
│   └── api/
│       ├── auth/
│       ├── buscar-ingresso/
│       ├── checkout/
│       │   ├── create/route.ts      (preferência MP — onde mexer pra installments)
│       │   ├── webhook/route.ts     (webhook MP — gera QR, envia e-mail)
│       ├── coupons/, wall/
│       └── admin/
│           ├── orders/
│           └── cortesias/           ← NOVO (sessão 04-05/05)
│               ├── route.ts         (GET lista + POST emite)
│               └── buscar/
│                   └── route.ts     (GET busca convidado por CPF/email)
├── components/
│   ├── auth/SignupForm.tsx, RedefinirSenhaForm.tsx
│   ├── admin/
│   │   ├── AdminTabs.tsx            ← MODIFICADO (sessão 04-05/05)
│   │   ├── CortesiasClient.tsx      ← NOVO (sessão 04-05/05)
│   │   ├── ExportCSVButton.tsx
│   │   └── ResendEmailButton.tsx
│   ├── checkout/CheckoutClient.tsx
│   ├── legal/LegalModal.tsx, TermosContent.tsx, PrivacidadeContent.tsx
│   └── ui/ErrorModal.tsx
└── lib/
    ├── supabase/server.ts, admin.ts
    ├── mercadopago/client.ts
    ├── email/resend.ts
    └── turnstile/ratelimit.ts
```

## 🔧 Como começar a próxima sessão

> Claude, retomando o projeto SACODE. Anexo `contexto-sacode-v11.md`. Cortesia foi finalizada com sucesso (1 a 10 ingressos por convidado, e-mail único, auditoria completa). Conta MP foi migrada pra PJ — aguarda aprovação de 24h pra liberar Pix. Hoje vamos retomar com [TÓPICO].

**Tópicos prováveis pra próxima sessão (em ordem de prioridade):**

1. Verificar Pix em produção após aprovação MP + ajuste de installments
2. Implementar Etapa 3 (Check-in) com Hostess dropdown + QR scanner + busca manual
3. Ajustes finos antes do lançamento

**Fim do contexto v11.**
