# Contexto SACODE — v15

**Data:** 28 de maio de 2026
**Sessão anterior:** v14 (Etapa A de Afiliados — tracking via `?ref=`)

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

### ✅ Concluído na sessão v15

#### Etapa B de Afiliados — CRUD ADMIN IMPLEMENTADO, TESTADO E EM PRODUÇÃO

**O que foi entregue (9 arquivos, 4 commits temáticos):**

1. **Aba "Afiliados" no menu admin** (entre Cortesias e o resto) — `src/components/admin/AdminTabs.tsx`

2. **Listagem `/admin/afiliados`** — `src/app/admin/afiliados/page.tsx` + `src/components/admin/AfiliadosListClient.tsx`
   - Server fetch dos afiliados com join em `events!inner(title, slug)`
   - Agregação em memória de vendas/faturamento/comissão (faz 1 query em `orders` aprovados com `affiliate_code IS NOT NULL` e indexa por chave `event_id::code`)
   - **Comissão calculada sobre faturamento líquido** = `total - service_fee` (decisão tomada por Claude, validada implicitamente por Fernando ao não contestar — manter)
   - Filtros client-side: busca textual (nome/code/email/phone), evento, status (ativo/inativo/todos)
   - 4 caixinhas de totais do filtro atual (visitas, vendas, faturamento, comissão devida)
   - Tabela desktop + cards mobile
   - Botão "Copiar link" gera `${baseUrl}/evento/${slug}?ref=${code}`

3. **Criação `/admin/afiliados/novo`** — `src/app/admin/afiliados/novo/page.tsx` + `src/components/admin/AfiliadoNovoClient.tsx` + `src/app/api/admin/afiliados/create/route.ts`
   - Auto-sugestão de code a partir do nome (slugify: lowercase + sem acentos + hífen entre palavras) — desliga se user editar code manualmente
   - Validações client e server: regex `/^[a-z0-9-]+$/`, comissão 0-100, evento existe, code único no evento (mensagem clara antes da constraint)
   - API valida auth admin/producer com `createSupabaseServerClient()` + `supabaseAdmin` no `profiles`

4. **Edição `/admin/afiliados/[id]`** — `src/app/admin/afiliados/[id]/page.tsx` + `src/components/admin/AfiliadoEditClient.tsx` + `src/app/api/admin/afiliados/[id]/route.ts`
   - Server page busca afiliado + últimas 50 vendas atribuídas (filtradas por `affiliate_code` + `event_id` + `payment_status='approved'`)
   - Client tem 4 seções: header com nome/code/evento/visitas + toggle ativo; links (divulgação + painel mágico com regenerar token); form de edição completo; tabela de vendas atribuídas com cálculo individual de comissão
   - API PATCH com 3 actions discriminadas pelo campo `body.action`: `update`, `toggle_active`, `regenerate_token`
   - Regeneração de token usa `randomBytes(24).toString('hex')` do `crypto` (mesmo padrão de 48 hex chars do default do banco via pgcrypto)
   - Confirm dialogs antes de desativar/reativar e antes de regenerar token

**Bugs resolvidos durante a sessão:**

- **Cache do Router do Next.js no client:** Mesmo com `export const dynamic = 'force-dynamic'`, ao criar afiliado e voltar pra lista, o Next servia a versão cacheada do client-side Router Cache. Solução: `revalidatePath('/admin/afiliados')` no servidor antes do return das APIs de create/update/toggle. **Não usado** em `regenerate_token` (o novo token volta no JSON e o client já atualiza o state local).
- **Arquivo corrompido durante edição manual:** Edições copy-paste no `[id]/route.ts` cortaram 14 linhas e deixaram chave de fechamento faltando. Diagnóstico via contagem de chaves em PowerShell (`Get-Content -LiteralPath ... | Where-Object { $_ -eq '{' }`). Resolução: entregar arquivo completo via download pra sobrescrever.

**Validação end-to-end em produção:**
- ✅ Criação de afiliado novo aparece na lista após `revalidatePath`
- ✅ Edição de campos funciona
- ✅ Toggle ativo/inativo funciona
- ✅ Link de divulgação copia corretamente
- ✅ Build limpo (3 rotas novas dinâmicas + 2 API routes)
- ✅ Deploy Vercel rodou

**Limpeza do banco realizada:**
- Deletados: `teste-cache` e `cl` (0 visitas, 0 pedidos, eram lixo de teste)
- Mantido: `teste` (5 visitas + pedido #58 atribuído, serve como exemplo histórico de funcionamento da Etapa A)

### ⏳ Pendente / Próxima sessão

#### 🟡 Etapa C de Afiliados — Painel público (ESCOPO ABERTO, NÃO INICIADO)

- Rota `/afiliado/[code]?token=XXX` com link mágico (`panel_token` da tabela `affiliates`)
- Validação server-side: code+token tem que bater + afiliado tem que estar ativo
- Métricas: total de visitas, vendas, comissão acumulada, comissão paga (offline), link de divulgação pronto pra copiar
- Tabela de vendas atribuídas (mesma da página admin de edição, mas só leitura)
- Aviso destacado: "Pagamento das comissões é combinado offline"
- **Decisão pendente:** página deve ser autenticada de alguma forma adicional (cookie? captcha?) ou o token sozinho é suficiente? Token tem 48 hex chars = 192 bits de entropia, então tecnicamente é suficiente, mas vale conversar.

#### 🟡 Etapa 3 — Sistema de Check-in (não iniciado)

**Decisões já tomadas (do v13/v14):**
- Login único compartilhado: `checkin@cantorcaiolacerda.com.br` (já criado)
- Dropdown "Hostess" (não "Porteiro")
- QR scanner como interface primária + busca por CPF/nome como fallback
- Reuso das colunas existentes em `order_items`: `checked_in_at`, `checked_in_by`
- **Não depende** de outras pendências — pode ser feito em paralelo
- **Crítico:** evento é em 07/06/2026. Faz sentido priorizar Check-in sobre Etapa C de Afiliados.

#### 🟢 Bugs/melhorias conhecidas não-bloqueantes

- FOUC no navbar
- Smoke test de tracking de afiliados em produção ainda não verificado em fluxo completo de compra (a Etapa A só validou tracking, não compra real com cookie afetando o pedido — embora a infraestrutura esteja pronta)
- Botão de logout não-funcional
- **Transferência de ingressos self-service** — planejada para Fase 2
- `ticket_batches.sold_count` continua desincronizado da realidade (39 no lote Promocional vs 21 reais). Resumo e Lotes já não usam mais. Mas se a página pública do evento ainda usar (pra mostrar "esgotando"), pode mostrar dado errado. **Recomendação:** quando der tempo, rodar SQL pra recalcular `sold_count` baseado nos `order_items` reais.

---

## 4. Princípios e Aprendizados Acumulados

### Aprendizados técnicos (novos da v15)

- **`force-dynamic` não invalida o Router Cache do client.** Ele cuida do server fetch cache, mas a navegação client-side com `router.push` pode ainda servir versão cacheada de outra rota. Solução: chamar `revalidatePath('/rota')` **no servidor** (Route Handler) depois de mutações. Funciona com Server Actions também.
- **Edição manual copy-paste em arquivos TS/TSX pode cortar blocos silenciosamente.** Sempre validar com contagem de chaves após edição:
  ```powershell
  $c = Get-Content -LiteralPath "arquivo.ts" -Raw
  $open = ($c.ToCharArray() | Where-Object { $_ -eq '{' }).Count
  $close = ($c.ToCharArray() | Where-Object { $_ -eq '}' }).Count
  Write-Host "Diferenca: $($open - $close)"
  ```
  Diferença ≠ 0 = arquivo quebrado. Para arquivos com edições multi-trecho, **entregar arquivo completo por download** evita esse risco.
- **Tipagem do Supabase em joins com `!inner(...)`:** o cliente JS pode tipar como array ou objeto dependendo da versão. Padrão defensivo: `const rel = Array.isArray(row.relacao) ? row.relacao[0] : row.relacao;`
- **Caminhos com `[id]` em PowerShell precisam de aspas + `-LiteralPath`** (já no v14 também). Para `git add` funciona com aspas duplas: `git add "src/app/api/admin/afiliados/[id]/"`.
- **Agregação em memória > múltiplas queries** quando o volume é pequeno e razoavelmente fechado. Para listagem de afiliados com vendas/comissão, 1 query em `orders` aprovados + indexação por Map em memória é mais simples e mais rápido que view ou RPC agregado.
- **3 actions discriminadas num único endpoint PATCH** com `body.action` (`update` / `toggle_active` / `regenerate_token`) reduz boilerplate vs 3 endpoints separados quando a auth e o lookup do recurso são idênticos. Trade-off: validação fica mais ramificada — aceitar.

### Aprendizados técnicos (mantidos do v14)

- **Dev e prod compartilham o mesmo banco Supabase (decisão consciente do Fernando)** — exige cuidado redobrado: nunca rodar `DELETE FROM`, `TRUNCATE` ou `DROP` sem dupla verificação. Testes em "local" persistem em produção. Mitigação aplicada: cancelar pedidos de teste (não deletar).
- **React Strict Mode em dev faz double-mount** — qualquer `useEffect` com side effect externo precisa ser idempotente.
- **Cookie deve ser setado APENAS no servidor depois de validar.**
- **`maybeSingle()` em vez de `single()` em consultas opcionais** — `single()` joga erro se não achar.
- **RPC atômico (`SECURITY DEFINER`) resolve race conditions** em padrões `SELECT → calcular → UPDATE`.
- **`'use client'` é fácil de esquecer ao refatorar.**
- **PowerShell trata `[` e `]` como wildcards** — usar `-LiteralPath`.
- **Paste longo em arquivos pode truncar silenciosamente** — conferir tamanho/chaves.
- **Supabase SQL Editor mostra só o resultado da última query quando rodadas em batch.**

### Aprendizados técnicos (mantidos do v13)

- **Mercado Pago em janela anônima:** testar pagamento logado como vendedor esconde opções (inclusive Pix).
- **Tipo de conta MP é API-autoritativo:** dashboard pode mentir.
- **Entrega de arquivos por download, não copy-paste** para arquivos grandes ou com acentos.
- **Operações de auth em Route Handler server-side** evitam `NavigatorLockAcquireTimeoutError`.
- **`window.location.href` > `router.push + refresh`** para redirects pós-auth.
- **Middleware deve permitir crawlers sociais.**
- **Extensões do Chrome geram falsos positivos visuais.**
- **Sempre conferir constraints do banco** antes de assumir alinhamento.

### Princípios de interação com o Fernando

**Fernando se identifica como desenvolvedor iniciante. Sempre seguir:**

1. **Passo a passo numerado** — sem assumir conhecimento prévio, sem pular etapas.
2. **Sempre especificar qual janela PowerShell usar:**
   - **DEV** — `npm run dev`
   - **GIT** — comandos git e PowerShell puro
   - **CLAUDE** — Claude Code
3. **Formato sequencial:** próximo passo + condicional do passo seguinte. Esperar Fernando colar output antes de continuar. Não repetir instruções anteriores quando ele cola output.
4. **Edição manual de arquivos preferida** sobre automação do Claude Code — fornecer conteúdo completo para copy-paste. Arquivos grandes ou com acentos vão por download. **Para correções em arquivos já editados, entregar arquivo completo por download é mais seguro que múltiplas edições cirúrgicas adicionais** (lição da v15).
5. **Edições cirúrgicas** ao modificar arquivos existentes (preferir alterar trechos específicos, não substituir tudo) — exceto quando o arquivo já tem múltiplas edições pendentes.
6. **Git workflow padrão:** commits temáticos com mensagens em português (`"afiliados: pagina de listagem com filtros e agregacoes"`).
7. **Handoff de contexto:** ao final de sessões complexas, gerar `contexto-sacode-vN.md`.
8. **Confirmar dados antes de SQL destrutivo** — especialmente porque dev e prod compartilham banco.

---

## 5. Plano de Retomada (Próxima Sessão)

### Ordem sugerida

Com o evento em **07/06/2026 (10 dias)**, a prioridade muda:

1. **Etapa 3 — Check-in** (CRÍTICO, evento próximo)
2. **Etapa C de Afiliados — Painel público** (não-bloqueante, mas afiliados já estão cadastrados e operando — ter o painel pronto antes do evento aumenta o senso de profissionalismo da plataforma para os afiliados)

### Para começar Etapa 3 (Check-in) rapidamente

Estrutura provável:
- Rota `/checkin` com login dedicado (`checkin@cantorcaiolacerda.com.br`)
- Mesma proteção do `/admin/layout.tsx` mas verificando `role='checkin'` ou similar
- Páginas: `/checkin/[event_slug]` (scanner QR + busca CPF/nome)
- API: `POST /api/checkin/validate` (recebe `order_item_id` ou `qr_code`, valida que não foi feito antes, grava `checked_in_at` e `checked_in_by`)

Confirmar antes:

```sql
-- Confere se já existe role 'checkin' ou 'hostess' em uso
SELECT DISTINCT role FROM profiles;

-- Confere se as colunas de check-in já existem em order_items
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('checked_in_at', 'checked_in_by');
```

### Para Etapa C (Painel afiliado)

Decidir antes de codar:
- Token sozinho é autenticação suficiente? (defesa em profundidade: rate limit no endpoint? captcha? OAuth do Google só pro afiliado?)
- Tabela `affiliate_payments` pra registrar pagamentos offline (opcional, mas útil pra mostrar "comissão devida ainda" vs "comissão total acumulada")

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
- **Afiliado de teste em produção:** `code='teste'`, evento SACODE 15ª, comissão 10%, ativo, 5 visitas + 1 pedido (#58, cancelado)

### Arquivos criados/modificados na v15

**Criados:**
- `src/app/admin/afiliados/page.tsx`
- `src/app/admin/afiliados/novo/page.tsx`
- `src/app/admin/afiliados/[id]/page.tsx`
- `src/app/api/admin/afiliados/create/route.ts`
- `src/app/api/admin/afiliados/[id]/route.ts`
- `src/components/admin/AfiliadosListClient.tsx`
- `src/components/admin/AfiliadoNovoClient.tsx`
- `src/components/admin/AfiliadoEditClient.tsx`

**Modificados:**
- `src/components/admin/AdminTabs.tsx` (aba "Afiliados" adicionada)

**Mudanças no banco:** nenhuma (Etapa B só consumiu o schema da Etapa A). Limpeza manual de dois afiliados de teste (`teste-cache`, `cl`).

### Commits da v15 (na main)

1. `admin: adiciona aba Afiliados no menu`
2. `afiliados: pagina de listagem com filtros e agregacoes`
3. `afiliados: formulario de criacao + API com revalidatePath`
4. `afiliados: pagina de edicao + API com regenerar token e toggle ativo`

---

**Fim do contexto v15. Próxima sessão começa pela Etapa 3 (Check-in) por causa da proximidade do evento, ou pela Etapa C (Painel público de afiliado) se Fernando preferir terminar o módulo de afiliados primeiro.**
