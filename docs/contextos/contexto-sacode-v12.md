# Contexto SACODE — v12

> Atualizado em **05/05/2026** (terça-feira, fim de tarde).
> Sessão dedicada à investigação do bloqueio do Pix — descoberta da causa raiz no lado do Mercado Pago e abertura de chamado técnico para escalonamento.
> Cole esse arquivo no próximo chat junto com a frase: *"Claude, retomando o projeto SACODE. Anexo contexto-sacode-v12.md."*

---

## 🎯 Projeto

**Fernando Zedeque (ZDK Produções)** construindo plataforma própria de venda de ingressos. MVP no evento **SACODE 15ª Edição (Aquecimento Copa)** — artista Caio Lacerda, **07/06/2026** no Villa Jardim Bar (SBC/ABC paulista).

**Status do lançamento:** **adiado, sem nova data definida**. Janela ainda confortável, mas o projeto está agora **travado por dependência externa** — abertura de vendas só faz sentido com Pix habilitado, e o Pix está bloqueado por problema de conta no Mercado Pago (detalhes abaixo).

## 🛠 Stack

Next.js 14 + Tailwind / Supabase (Auth+DB+Storage, `@supabase/ssr` v0.5.2, `supabase-js` v2.104.1) / Resend (auth + transacional) / Mercado Pago (HMAC ativo, Checkout Pro) / Vercel / GitHub.

**Plugin instalado em sessões anteriores:** `@tailwindcss/typography`.

---

## 👤 Perfil do usuário e processo de trabalho

**Importante manter em todas as próximas sessões:**

- **Iniciante** — sempre fornecer instruções passo a passo simplificadas e numeradas. Não assumir conhecimento prévio.
- **Setup de 3 janelas PowerShell:** **DEV** (roda servidor local `npm run dev`), **GIT** (comandos git e PowerShell puro), **CLAUDE** (Claude Code).
- **NOVO — Preferência por janela GIT para comandos:** o usuário pediu explicitamente para sugerir a janela GIT sempre que possível, em vez da janela CLAUDE. A janela CLAUDE (Claude Code) interpreta comandos como perguntas em vez de executá-los, gerando confusão. A janela GIT é PowerShell puro e executa direto. Sempre indicar a janela GIT como primeira opção quando for um comando shell direto (Get-Content, Invoke-RestMethod, git, etc).
- **Estilo de passo a passo preferido:** dar o próximo passo + o passo seguinte com condição. Exemplo: *"Roda X. Se aparecer Y, segue pro Z. Se aparecer algo diferente, cola aqui."* O usuário decide se segue ou pausa baseado no output esperado vs inesperado.
- **NÃO repetir instruções anteriores** quando ele cola output. Só responder ao que é novo.
- **Edição manual de arquivos** (VS Code direto ou PowerShell) é a preferência.
- **Geração de arquivos prontos para download** via `present_files` é o padrão preferido pra arquivos grandes ou com acentos.
- **Encoding bagunçado no PowerShell é falso positivo:** `Get-Content` exibe arquivos UTF-8 com acentos errados, mas o arquivo está correto. Validar sempre abrindo no Notepad ou navegador.
- **SQL no painel do Supabase:** o projeto não usa `supabase/migrations` local. Toda mudança de banco é executada direto no SQL Editor do painel.

---

## ✅ O que foi feito na sessão de 05/05 (à tarde)

### 1. Ajuste de parcelamento — concluído e em produção

**Arquivo:** `src/app/api/checkout/create/route.ts` (linha 112)

**Mudança:** `installments: 12` → `installments: 1` (sem parcelamento, conforme decisão tomada na sessão anterior)

**Status:** commitado e deployado em produção (commit `checkout: desabilita parcelamento (installments 1)`). O código está pronto pra quando o Pix for liberado — não precisa mexer mais nessa parte.

### 2. Investigação completa do bloqueio do Pix

Esse foi o trabalho principal da sessão. Diagnóstico longo e metódico que culminou na descoberta de que a causa **não está no nosso código** e nem em configuração simples — é um problema interno no banco de dados do Mercado Pago.

#### Diagnóstico — passo a passo do que foi descoberto

**Verificação inicial em janela anônima:** Pix continuava não aparecendo no Checkout Pro mesmo após:
- Conta migrada pra PJ no painel do MP (CNPJ 44.816.216/0001-03)
- Token "supostamente" da conta PJ no Vercel
- Deploy do `installments: 1` concluído

**Diagnóstico via API direta no MP:**

```powershell
# Variável $token = APP_USR-2668231... (token original)
Invoke-RestMethod -Uri "https://api.mercadopago.com/users/me" -Headers @{Authorization = "Bearer $token"}
```

Retorno revelou:
```
id: 658407697
nickname: MARTINSCAIODIEGO
status.mercadopago_account_type: personal  ← AQUI ESTÁ O PROBLEMA
status.user_type: simple_registration
status.site_status: active
tags: {normal, messages_as_seller, business}
```

**Tentativa 1 — Criar aplicação nova no developers panel:**
- Caio criou app `SACODE PJ Teste` na mesma conta MP
- Novo token: `APP_USR-4003718...`
- Resultado: `mercadopago_account_type: personal` (idêntico ao anterior)
- Confirma que problema é **da conta**, não da aplicação

**Tentativa 2 — Investigar chave Pix:**
- Caio entrou em **Pix → Área Pix** no painel
- Descoberta importante: a chave antiga (`ingressos@cantorcaiolacerda.com.br`) tinha **sumido** — confirma o item #2 do checklist do suporte ("alteração de tipo de conta pode desabilitar a chave Pix anterior")
- Caio cadastrou nova chave de e-mail: **`financeiro@cantorcaiolacerda.com.br`**
- Não foi possível usar CNPJ — já está cadastrado em outra conta do Caio

**Tentativa 3 — Logout total + cache limpo + 3ª aplicação:**
- Logout completo, Ctrl+Shift+Delete (cookies dos últimos 7 dias)
- Excluiu aplicações antigas
- Criou nova aplicação `SACODE Producao`
- Novo token: `APP_USR-2508548...`
- Resultado: `mercadopago_account_type: personal` **outra vez**

#### Conclusão do diagnóstico

3 Access Tokens diferentes, 3 aplicações distintas, chave Pix renovada, sessão totalmente limpa — **todos os tokens retornam `personal`** para a mesma conta (User ID `658407697`).

Como o painel exibe a conta como PJ (CNPJ 44.816.216/0001-03 — CAIO DIEGO MARTINS) mas a API insiste em `personal`, o problema é que **a conversão de tipo de conta não foi propagada internamente no banco de dados do Mercado Pago**. Sem isso, Pix não aparece no Checkout Pro.

#### Detalhe sobre o "Ação necessária" no print

Em um print intermediário, o canto superior direito do MP exibia "Ação necessária" em fundo amarelo. Confirmado pelo usuário: era **extensão do Chrome**, não notificação real do MP. Falso positivo — descartado.

### 3. Chamado aberto no suporte do Mercado Pago

**Status:** mensagem completa enviada com toda a evidência técnica. Texto completo da resposta enviada ao suporte:

> Olá, obrigado pelo checklist. Executei rigorosamente os 4 passos sugeridos e o problema persiste. Detalho abaixo:
>
> **Passo 1 — Confirmar credenciais:** confirmei que estou usando o token da conta atualizada (User ID: 658407697, nickname MARTINSCAIODIEGO, vinculada ao CNPJ 44.816.216/0001-03).
>
> **Passo 2 — Renovar chave Pix:** ao verificar o painel Pix, descobri que a chave que eu havia cadastrado anteriormente (`ingressos@cantorcaiolacerda.com.br`) foi removida automaticamente — provavelmente pela própria atualização de tipo de conta. Cadastrei uma chave nova de e-mail (`financeiro@cantorcaiolacerda.com.br`), confirmada e ativa no painel.
>
> **Passo 3 — Atualizar credenciais:** fiz logout completo, limpei cookies e cache do navegador, fiz login novamente, excluí as aplicações antigas e criei uma nova aplicação do zero (`SACODE Producao`). Gerei novo Access Token de produção.
>
> **Passo 4 — Reteste:** executei o `GET /users/me` com o token recém-gerado da nova aplicação. O retorno continua idêntico: `status.mercadopago_account_type = personal`.
>
> Resumo: 3 Access Tokens diferentes, 3 aplicações distintas, chave Pix renovada, sessão limpa — todos os tokens retornam `personal` para a mesma conta. Como o User ID `658407697` está com a mesma conta sendo exibida no painel como Pessoa Jurídica (CNPJ 44.816.216/0001-03), entendo que a conversão de tipo de conta não foi propagada internamente no banco de dados de vocês. **Preciso que escalem para o time técnico fazer a conversão manual da conta de `personal` para `business`**, ou me orientem se há algum processo formal específico que ainda não foi cumprido.
>
> Sem essa conversão, o Pix não será habilitado no Checkout Pro e não consigo abrir vendas.

**Aguardando retorno do suporte MP.**

---

## 🔧 Estado atual do Mercado Pago

**Conta:** User ID 658407697 / nickname MARTINSCAIODIEGO / CNPJ 44.816.216/0001-03
**Tipo na API:** `personal` (deveria ser `business`)
**Tipo no painel:** Pessoa Jurídica (exibe CNPJ corretamente)
**Chave Pix ativa:** `financeiro@cantorcaiolacerda.com.br`
**Aplicação ativa no developers:** `SACODE Producao`
**Access Token em produção (Vercel):** `APP_USR-2508548...` (token V3, da 3ª aplicação)
**Aplicações criadas durante a investigação:** todas as antigas foram excluídas; só restou `SACODE Producao`

⚠️ **Importante:** quando o suporte resolver e a conta passar pra `business`, **provavelmente o token atual continuará válido** (não é o token que muda, é o tipo da conta vinculada a ele). Mas vale revalidar com `GET /users/me` antes de testar Pix em produção.

---

## 🐛 Bugs ainda abertos

### Botão "Sair" no header não funciona
- Persistente desde v8/v9/v10/v11.
- Workaround: limpar cookies + localStorage no DevTools, ou fechar aba.

### FOUC navbar (cosmético)
- Inalterado, fase 2.

### Encoding em strings JSX
- Não-bloqueante. Varredura geral fica pra fase 2.

---

## 📐 Decisões técnicas dessa sessão

### Diagnóstico via API > confiar no painel
Quando o painel do MP mostrava conta PJ mas o Pix não aparecia, foi a chamada direta ao endpoint `/users/me` que revelou a discrepância. Lição que vale ouro: **quando uma plataforma mostra uma coisa visualmente mas o comportamento não bate, consulte a API direto**. O painel pode mascarar o estado real do banco de dados.

### Criar aplicação nova ≠ resolver problema de conta
A criação de aplicações novas no developers panel não muda o tipo da conta. Tanto que rodamos 3 aplicações diferentes e o `mercadopago_account_type` continuou `personal`. Aplicações são "filhas" da conta — herdam o status dela.

### Não excluir aplicação antiga sem ter nova testada
Princípio adotado durante a sessão: criar a nova app **antes** de excluir a antiga, testar via API que a nova retorna algo válido, e só depois excluir a anterior. Princípio de "deploy paralelo sem downtime" aplicado a integrações de gateway.

---

## 📝 Aprendizados que valem ouro

### "Migrar conta pra PJ" no painel ≠ converter tipo de conta no banco do MP
O que o usuário fez (atualizar dados cadastrais pra CNPJ no painel) não é a mesma coisa que o MP converter a conta de `personal` pra `business`. A primeira é cosmética; a segunda é o que libera Pix no Checkout Pro. Provavelmente o MP exige um processo formal interno que não está exposto ao usuário.

### Chave Pix some quando conta migra
Item documentado no checklist do suporte e confirmado na prática: a chave Pix anterior foi removida automaticamente quando o tipo de cadastro mudou. Pra futuras integrações de gateway, sempre **revalidar chaves após qualquer mudança cadastral**.

### CNPJ não pode ser chave Pix em duas contas
O Caio já tinha o CNPJ vinculado como chave Pix em outra conta (provavelmente a antiga conta CPF, ou outro banco). Pra usar como chave de recebimento na conta MP, teria que liberar do outro lugar primeiro. Solução adotada: usar e-mail novo (`financeiro@cantorcaiolacerda.com.br`).

### Resposta-padrão de suporte ≠ resposta técnica
A primeira resposta do suporte MP era um checklist genérico. Algumas ações já tínhamos feito, mas executar o checklist completo (mesmo o que já fizemos) deu **munição pra escalonamento**: "fiz tudo que vocês pediram, persiste, escalem". Sem essa documentação, o suporte teria pingado a gente de volta pro começo.

### Falso positivo do "Ação necessária"
Extensões do Chrome sobrepõem badges em sites do MP de forma que parecem nativos. Da próxima vez que algo "amarelo de alerta" aparecer no MP, **clicar e validar** antes de assumir que é da plataforma.

---

## 🚦 Plano para próxima sessão

### Cenário A — Suporte MP respondeu e resolveu

**Tempo estimado:** 15 min

1. Caio confirma que conta agora aparece como `business` na API
2. Roda na janela GIT:
   ```powershell
   $token = "APP_USR-2508548..."  # ou o que estiver no Vercel
   Invoke-RestMethod -Uri "https://api.mercadopago.com/users/me" -Headers @{Authorization = "Bearer $token"} | Select-Object -ExpandProperty status | Select-Object mercadopago_account_type, site_status | Format-List
   ```
3. Se vier `business` → testa em janela anônima:
   - Adiciona ingresso ao carrinho
   - Vai pro checkout
   - **Espera ver Pix** + Cartão Crédito + Cartão Débito + Saldo MP
4. Smoke test: comprar 1 ingresso via Pix (R$ 15-25), validar webhook + e-mail + ingresso em "Minhas compras"
5. Se tudo ok → **destravar projeto**, partir pra Etapa 3 (Check-in)

### Cenário B — Suporte MP respondeu mas não resolveu / passou processo

**Avaliar:**
- Se o MP pediu documentos adicionais → mandar e aguardar
- Se o MP disse "não dá pra converter, abra outra conta" → discutir com Caio se vale criar conta nova MP ou voltar pra avaliar **PagBank** (Fernando tem conta PJ ativa lá) ou outro gateway
- Se o MP demorou demais → considerar paralelizar avaliação de outros gateways

### Cenário C — Suporte MP ainda não respondeu

**Decisões:**
- Esperar mais 24-48h sem fazer nada (custo zero, o projeto está travado mesmo)
- OU adiantar Etapa 3 (Check-in) que **independe do Pix** — esse trabalho é todo aproveitável quando vendas abrirem

### Etapa 3 — Sistema de Check-in (independe do Pix)

**Tempo estimado:** 2h30 a 3h.

**Decisões já confirmadas pelo usuário (da v11):**

- **3 modos:** QR Code (principal) + busca por CPF (fallback) + nome (fallback)
- **1 login compartilhado:** `checkin@cantorcaiolacerda.com.br` (já criado, falta promover a `staff` no banco)
- **Identificação de Hostess:** dropdown na tela inicial, escolha persiste em `localStorage`
- **Antiduplicação:** UNIQUE constraint em `order_items.checked_in_at` quando não null (ou via lógica de application)
- **Tela do check-in:**
  - ✅ Verde grande: "Check-in OK — [Nome do convidado]"
  - ❌ Vermelho grande: "JÁ FOI USADO às 22h13 por Hostess 2" / "INGRESSO INVÁLIDO"

**Sub-etapas previstas:**
1. SQL: criar role `staff` (se não existir como valor válido em `profiles.role`), promover usuário `checkin@cantorcaiolacerda.com.br`, criar tabela ou colunas pra registrar Hostess
2. API: endpoint de validação de check-in (recebe QR token, retorna status + dados do ingresso)
3. Página `/checkin`: tela inicial com dropdown Hostess + scanner QR + busca manual
4. Library de QR scanner: `html5-qrcode` (testar compatibilidade mobile Chrome/Safari)
5. Smoke test em celular real usando ingressos cortesia já gerados (Teste 1 e Teste 2 da sessão de cortesia)

### Limpeza pré-lançamento

- **Remover ingressos cortesia de teste** (sold_count do lote Cortesia atualmente = 4)
- Investigar e corrigir botão "Sair" no header
- Smoke-testar affiliate tracking em produção
- Adicionar links pros documentos legais no footer do site

### Roadmap maior (fase 2)

- Painel admin editável (CRUD evento)
- Embaixadores SACODE
- Transferência de titularidade self-service
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
- Painel admin segue paleta vinho. Cortesias usa cards `bg-wine-700 border-mauve-700`, com destaque `amber-sacode-400` em CTAs e badge de quantidade.

## 📜 Decisões jurídicas vigentes

Termos com advogado, **publicados em produção** desde v10. Caio Lacerda (CNPJ 44.816.216/0001-03) é Organizador+Controlador; ZDK é Operadora. Sem meia-entrada. Direito de arrependimento 7d. Cancelamento: cliente escolhe crédito/reembolso. DPO: `privacidade@zdkproducoes.com.br`.

**Checkout sem parcelamento** (`installments: 1`) — confirmado e em produção desde 05/05.

## 🐛 Pendências v5–v11 ainda válidas

- Botão "Sair" no header
- FOUC navbar (cosmético, fase 2)
- Affiliate tracking — não foi smoke-testado em produção
- Painel admin editável (CRUD evento)
- Embaixadores SACODE
- Área "Meu Perfil" — incluindo botão de mudar senha logado
- Transferência de titularidade self-service
- P1/P2/A1/TD1
- Varredura geral de encoding em strings JSX (não-bloqueante)
- Botão de reenvio de e-mail na tela de cortesias (componente `ResendEmailButton` já existe, falta integrar)

## 🗄 Estado do banco (`ticket_batches` do evento `sacode-15-edicao`)

Inalterado desde v11:
```
sort_order | name                       | price | quantity | sold_count | is_visible
0          | Cortesia                   | 0     | 500      | 4 (testes) | false
1          | Ingresso Promocional       | 15    | ?        | 0          | true
2          | Ingresso Único - Lote 01   | 20    | ?        | 0          | true
3          | Ingresso Único - Lote 02   | 25    | ?        | 0          | true
4          | Ingresso Único - Lote 03   | 35    | ?        | 0          | true
```

`event_id = '6539575d-7a71-4c50-8f62-955bc5a96947'`. Todos `is_visible=true` exceto Cortesia.

## 🗂 Estrutura de arquivos relevante (inalterada desde v11)

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
│   │   ├── cortesias/
│   │   │   └── page.tsx
│   │   ├── checkin/                 (vazia, próxima sessão)
│   │   ├── compradores/, lotes/, pedidos/, resumo/
│   │   ├── afiliados/, colaboradores/, cupons/, evento/, financeiro/, ingressos/, vendas/  (vazias)
│   └── api/
│       ├── auth/
│       ├── buscar-ingresso/
│       ├── checkout/
│       │   ├── create/route.ts      (installments: 1 desde 05/05/2026)
│       │   ├── webhook/route.ts     (webhook MP — gera QR, envia e-mail)
│       ├── coupons/, wall/
│       └── admin/
│           ├── orders/
│           └── cortesias/
│               ├── route.ts
│               └── buscar/
│                   └── route.ts
├── components/
│   ├── auth/SignupForm.tsx, RedefinirSenhaForm.tsx
│   ├── admin/
│   │   ├── AdminTabs.tsx
│   │   ├── CortesiasClient.tsx
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

> Claude, retomando o projeto SACODE. Anexo `contexto-sacode-v12.md`. Pix continua bloqueado por causa do tipo de conta MP (`personal` em vez de `business`). Chamado aberto com o suporte do MP — [aguardando resposta / suporte respondeu, vou colar a resposta / suporte resolveu, partimos pro teste]. Hoje vamos [TÓPICO].

**Tópicos prováveis pra próxima sessão (em ordem de prioridade):**

1. **Se MP resolveu:** validar Pix em produção + smoke test + destravar projeto
2. **Se MP não resolveu:** avaliar caminhos alternativos (PagBank, conta MP nova, outro gateway)
3. **Independente do MP:** Etapa 3 (Sistema de Check-in) — todo o trabalho é aproveitável quando vendas abrirem

**Fim do contexto v12.**
