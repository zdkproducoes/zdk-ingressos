# Contexto SACODE — v16

**Data:** 29 de maio de 2026
**Sessão anterior:** v15 (Etapa B de Afiliados — CRUD Admin)
**Próximo evento:** 07/06/2026 (9 dias)

---

## 1. Visão Geral do Projeto

**SACODE** é uma plataforma proprietária de ticketing construída pela **ZDK Produções** (Fernando Zedeque) para vender ingressos do artista **Caio Lacerda**. O objetivo estratégico é **possuir os dados dos clientes** (CPF, e-mail, telefone, histórico de compras) como diferencial competitivo frente a plataformas terceiras.

**Evento de validação do MVP:**
- **SACODE 15ª Edição** com Caio Lacerda
- **Data:** 07 de junho de 2026
- **Local:** Villa Jardim Bar, São Bernardo do Campo (ABC paulista, SP)
- **Vendas:** ABERTAS desde 23/05/2026

**Entidades-chave:**
- **Caio Lacerda** — headliner; conta Mercado Pago (User ID 658407697, CNPJ 44.816.216/0001-03).
- **ZDK Produções** — produtora do Fernando; Operadora da plataforma sob a LGPD; DPO `privacidade@zdkproducoes.com.br`.

---

## 2. Stack Técnica

- **Frontend:** Next.js 14 (App Router), Tailwind CSS
- **Backend/DB:** Supabase (Auth, DB, Storage, `@supabase/ssr`) — **mesmo banco para dev e prod**
- **E-mail:** Resend com SMTP customizado, remetente `SACODE <nao-responda@cantorcaiolacerda.com.br>`
- **Pagamento:** Mercado Pago Checkout Pro com webhook HMAC ativo (Pix funcionando)
- **Hospedagem:** Vercel
- **Versionamento:** GitHub (`zdkproducoes/sacode-ingressos`, branch `main`)
- **QR Scanner:** `html5-qrcode` (novo desta sessão)
- **Migrations:** alterações de schema direto no SQL Editor do Supabase

**Dev environment:**
- Windows + VS Code
- Três janelas PowerShell: **DEV** (servidor local), **GIT** (git e PowerShell puro), **CLAUDE** (Claude Code)
- Projeto em `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`

**Produção:** `https://sacode.cantorcaiolacerda.com.br`

---

## 3. Estado Atual

### Concluído na sessão v16

#### Etapa 3 — Sistema de Check-in (COMPLETO, EM PRODUÇÃO)

**Usuário criado no Supabase Auth:**
- E-mail: `checkin@cantorcaiolacerda.com.br`
- UID atual: `a188e6cf-3531-4f63-a99b-9ecf13ad9d10` (foi recriado na sessão; senha guardada pelo Fernando)
- Profile com `role='checkin'`, `cpf='00000000000'` (placeholder NOT NULL), `full_name='Equipe Check-in SACODE'`

**Arquivos criados:**
- `src/app/checkin/layout.tsx` — protege rotas (admin/producer/checkin), header com Sair via Server Action
- `src/app/checkin/actions.ts` — Server Action de logout
- `src/app/checkin/page.tsx` — landing com lista de eventos futuros
- `src/app/checkin/[event_slug]/page.tsx` — server component com stats (Vendidos/Validados/Pendentes)
- `src/components/checkin/CheckinScannerClient.tsx` — interface principal (modal câmera fullscreen + scanner QR + busca manual + overlay fullscreen)
- `src/app/api/checkin/validate/route.ts` — valida QR token, UPDATE condicional com `IS NULL` pra prevenir race condition, registra audit_log
- `src/app/api/checkin/search/route.ts` — busca manual por CPF (auto-detect) ou nome, 3 queries paralelas em profiles + dedupe via Map (evita `.or()` do PostgREST)
- `src/app/admin/checkin/page.tsx` — aba admin com tabela + gráfico SVG (bucket de 30 min, horário SP via `Intl.DateTimeFormat`)

**Features finais:**
- QR scanner em modal **fullscreen** (z-40)
- Feedback ao validar: **som via Web Audio API** (beep agudo/médio/grave), **vibração** via `navigator.vibrate()`, **overlay fullscreen colorido** (verde/amarelo/vermelho) z-50, **fica visível até a hostess tocar PRÓXIMO**
- Câmera continua ligada por trás do overlay (não para — pronta pro próximo QR)
- **Bloqueia leituras durante overlay** (overlayVisibleRef) — evita validações empilhadas
- **2 botões "FECHAR CÂMERA"** vermelhos grandes (topo + rodapé) — mobile UX
- `router.refresh()` ao fechar câmera atualiza contadores
- Busca manual com **debounce de 400ms**
- Roles permitidas: `admin`, `producer`, `checkin`

**Lições críticas:**
- **iOS exige HTTPS** pra getUserMedia (câmera). Localhost via IP da rede local não funciona no iPhone — teste em produção (Vercel = HTTPS automático).
- **iPhone Chrome usa WebKit por baixo** (limitação Apple) — mudar navegador no iPhone não muda nada.
- **Web Audio API funciona em todos navegadores móveis** — gera beeps sem precisar arquivos de áudio.

**SQL útil de desvalidação (reutilizável):**
```sql
-- Desvalida ingresso de teste (Fernando, pedido #47)
UPDATE order_items
SET checked_in_at = NULL, checked_in_by = NULL
WHERE id = '484a1970-2ad5-4ca1-850e-e1ee8747f570'
RETURNING id, attendee_name, checked_in_at, checked_in_by;
```

---

#### Etapa 4 — Melhorias no `/admin/resumo` (EM PRODUÇÃO)

**Arquivo:** `src/app/admin/resumo/page.tsx` — substituição completa.

**Adicionados:**
- **Gráfico de pizza SVG** de ingressos por gênero (Mulheres rosa #ec4899, Homens azul #3b82f6, Outros cinza #9ca3af). Conta apenas ingressos pagos (cortesias excluídas).
- **Tabela "Vendas por dia"** — Data | Pedidos | Ingressos | Faturamento. Datas em horário de São Paulo (não UTC). Ordem decrescente. Linha de Total no rodapé.

**Decisões:**
- SVG puro pra evitar dependência nova (recharts/chart.js).
- Pizza usa `path` SVG com fallback `<circle>` quando 100%.
- Grid de stats existente mantido intacto.

**Distribuição atual:** Feminino 20 / Masculino 6 / null 1.

---

#### Etapa 5 — CRUD de Lotes (EM PRODUÇÃO)

| Arquivo | Tipo | O quê |
|---|---|---|
| `src/app/admin/lotes/page.tsx` | Substituído | Server fetch com sold_count REAL via join em order_items + lista de eventos pro select. Tipos `BatchRow` e `EventOption` exportados. |
| `src/components/admin/LotesAdminClient.tsx` | Novo | Tabela + botões Editar / Ativar-Desativar / Novo lote |
| `src/components/admin/LoteFormModal.tsx` | Novo | Modal reutilizável (criar e editar). TODOS os campos: nome, descrição, preço, quantidade, sort_order, status, is_visible, min/max_per_order, starts_at, ends_at, event_id |
| `src/app/api/admin/lotes/create/route.ts` | Novo | POST + validações + audit_log + revalidatePath |
| `src/app/api/admin/lotes/[id]/route.ts` | Novo | PATCH com 2 actions: `update` e `toggle_status`. Validação CRÍTICA: quantidade ≥ vendidos REAIS (recalcula via order_items, não confia em sold_count) |

**Decisões técnicas:**
- "Ativar/Desativar" = `status='active' ↔ 'paused'` (não há valor `'inactive'` no constraint).
- Status do form: `active`, `paused`, `scheduled`, `ended`, `sold_out`.
- Datas via `<input type="datetime-local">` (horário local), convertido pra ISO UTC ao enviar.
- Sem exclusão — apenas pausar.
- Visibilidade separada do status (`is_visible` boolean) pra esconder cortesias.

---

#### Fix do lote ativo na home pública

**Arquivo:** `src/app/evento/[slug]/page.tsx` — edição cirúrgica.

**Mudanças:**
1. Adicionado `export const dynamic = 'force-dynamic'` e `export const revalidate = 0`. **Sem isso, a home cacheava ISR** e não refletia mudanças em tempo real.
2. Lógica de seleção mudou de "primeiro ativo na ordem" para **"mais barato dentre os ativos não-esgotados"**:
   ```tsx
   const lotesAtivos = allBatches
     .filter((b) => b.status === 'active' && b.sold_count < b.quantity)
     .sort((a, b) => Number(a.price) - Number(b.price))
   const loteAtivo = lotesAtivos[0] ?? null
   ```
3. Quando `loteAtivo = null`, mostra card vermelho "● ESGOTADO / Ingressos esgotados" com botão desabilitado.

---

#### Fix do checkout (filtros + cenário esgotado)

**Arquivo:** `src/app/checkout/page.tsx` — edição cirúrgica.

**Mudanças:**
1. Filtro pós-query: `availableBatches = batches.filter(b => b.sold_count < b.quantity)` pra excluir esgotados.
2. **Trocado `.order('sort_order')` por `.order('id')`** — ver bug crítico abaixo.
3. Quando `availableBatches.length === 0`, mostra card vermelho com botão "Voltar para o evento".

---

#### Correção do `sold_count` desincronizado

**Antes:** Promocional tinha `sold_count=53` mas só 21 ingressos reais aprovados (32 a mais de testes antigos).

**Fix:** `UPDATE ticket_batches SET sold_count=21 WHERE id='0ace706e-...' AND sold_count=53;` (com guarda de segurança).

**SQL diagnóstico reutilizável (salvar em sqls-uteis/):**
```sql
SELECT 
  tb.id, tb.name, tb.status,
  tb.sold_count AS sold_count_banco,
  COALESCE(real.cnt, 0) AS sold_count_real,
  tb.sold_count - COALESCE(real.cnt, 0) AS diferenca,
  tb.quantity AS capacidade
FROM ticket_batches tb
LEFT JOIN (
  SELECT oi.ticket_batch_id, COUNT(*) AS cnt
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.payment_status = 'approved'
  GROUP BY oi.ticket_batch_id
) real ON real.ticket_batch_id = tb.id
WHERE tb.event_id = '6539575d-7a71-4c50-8f62-955bc5a96947'
ORDER BY tb.sort_order;
```

---

### BUG CRÍTICO DESCOBERTO — `.order('sort_order')` no supabase-js (CONTORNADO, NÃO INVESTIGADO A FUNDO)

**Sintoma:** A query do checkout retornava `[]` consistentemente, MESMO com o Promocional no banco com `status='active'`, `is_visible=true`, `sold_count<quantity`.

**Diagnóstico (3 queries lado a lado em produção, mesma request):**
- `PRINCIPAL` (`.eq().eq().eq().order('sort_order')`): **len=0** ❌
- `MINIMAL` (`.eq().eq().eq()` sem .order): **len=1** ✅
- `PRINCIPAL_SEM_ORDER` (mais colunas, sem .order): **len=2** ✅

**Conclusão:** O `.order('sort_order')` no supabase-js está ZERANDO o resultado. Não é RLS (JWT confirmado como `service_role`), não é cache (`force-dynamic` ativo), não é replica (SQL Editor mostra os dados).

**Contorno:** Trocar por `.order('id')` no checkout. Funciona, mas é gambiarra.

**PENDENTE pra investigar:**
- Outros arquivos que usam `.order('sort_order')` podem estar afetados em silêncio:
  - `src/app/evento/[slug]/page.tsx` — usa `.order('sort_order', { ascending: true })`
  - `src/app/admin/lotes/page.tsx` — usa `.order('sort_order', { ascending: true })`
- Hipótese: talvez o `{ ascending: true }` explícito resolva. Testar.
- Se sim, padronizar `.order('coluna', { ascending: true })` em todo o projeto.

---

### Pendente / Próxima sessão

#### Bug aparente no modal de edição de lotes (PRECISA INVESTIGAR)

**Fato observado no fim da sessão:** Fernando relatou que pausou + desmarcou visibilidade do "Lote Teste" no admin, mas SQL no banco mostrava `status='active'` e `is_visible=true`. Não confirmamos a causa (encerramento da sessão).

**Hipóteses pendentes:**
1. Modal `LoteFormModal.tsx` não está salvando direito (payload errado pra API?).
2. API PATCH com `action='update'` não está aplicando todos os campos.
3. `revalidatePath` não está sendo chamado depois do update.

**Como investigar:**
- Editar Lote Teste no admin → status=paused, is_visible=false → Salvar → conferir SQL Editor.
- Se NÃO mudou: bug na API ou no payload.
- Se mudou mas admin/lotes ainda mostra antigo: bug de revalidatePath.

**🔴 IMPORTANTE pra rodar antes do evento:**
```sql
UPDATE ticket_batches
SET status = 'paused', is_visible = false
WHERE id = 'e7681424-0227-46cc-aece-f82326aeec09'
  AND name = 'Lote Teste'
RETURNING id, name, status, is_visible;
```

#### Limpar código de DIAG do checkout (HÁ EM PRODUÇÃO AGORA)

`src/app/checkout/page.tsx` ainda tem o bloco completo de logs `[DIAG ${reqId}]` (3 queries de diagnóstico paralelas). Funciona em produção mas suja logs. Substituir mantendo apenas:
- Fix `.order('id')` em vez de `.order('sort_order')`
- Lógica `availableBatches` e card ESGOTADO

#### Etapa C de Afiliados — Painel público (NÃO INICIADO)

- Rota `/afiliado/[code]?token=XXX`
- Decisões pendentes: token sozinho é auth suficiente? Tabela `affiliate_payments`?
- Não-bloqueante pro evento.

#### Bugs/melhorias não-bloqueantes

- FOUC no navbar
- Botão de logout não-funcional em alguns lugares
- Transferência de ingressos self-service (Fase 2)

---

## 4. Princípios e Aprendizados Acumulados

### Aprendizados técnicos NOVOS da v16

- **iOS exige HTTPS pra getUserMedia (câmera).** Localhost via IP da rede local NÃO funciona em iPhone.
- **iPhone Chrome usa WebKit por baixo** — mudar navegador no iPhone não resolve nada.
- **Web Audio API funciona em todos navegadores móveis** — gera beeps sem arquivos.
- **`navigator.vibrate()`**: Android perfeito; iOS limitado.
- **`force-dynamic` + `revalidate=0`** é obrigatório em páginas server que dependem de dados frequentemente alterados. Sem isso, Next.js ISR cacheia mesmo páginas dinâmicas.
- **Bug do supabase-js com `.order('sort_order')`:** ver seção dedicada. Contorno: trocar por `.order('id')`.
- **`.or()` do PostgREST tem syntax frágil** — preferir 2-3 queries separadas + dedupe via Set/Map.
- **PowerShell `curl` é alias de `Invoke-WebRequest`** e não aceita flags do curl-Unix:
  ```powershell
  $r = Invoke-WebRequest -Uri "..." -UseBasicParsing
  $r.Content -match 'palavra'
  ```
- **Middleware redireciona `/checkout` pra `/login` quando deslogado** — testes anônimos sem login enganam diagnóstico via curl.
- **Cold start de serverless** pode causar comportamento intermitente nas primeiras requests.
- **SQL Editor mostra realidade do banco**, mas supabase-js pode ter comportamento estranho com mesma query. **Sempre validar com `console.log` em produção** lendo nos Vercel Logs.
- **Edição manual em arquivo com vários trechos** é arriscada. Validar com contagem de chaves sempre. Se >2 trechos, **entregar arquivo completo por download**.
- **Diagnóstico cirúrgico em produção:** rodar queries paralelas com `console.log` e ler nos Vercel Logs com `reqId` único identifica bugs invisíveis no banco.

### Aprendizados técnicos mantidos da v15

- `force-dynamic` não invalida Router Cache do client; usar `revalidatePath('/rota')` no server.
- Edição manual copy-paste pode cortar blocos silenciosamente. Validar:
  ```powershell
  $c = Get-Content -LiteralPath "arquivo.ts" -Raw
  $open = ($c.ToCharArray() | Where-Object { $_ -eq '{' }).Count
  $close = ($c.ToCharArray() | Where-Object { $_ -eq '}' }).Count
  Write-Host "Diferenca: $($open - $close)"
  ```
- Tipagem do Supabase em joins `!inner(...)` pode vir como array ou objeto. Padrão defensivo: `Array.isArray(row.rel) ? row.rel[0] : row.rel`.
- PowerShell trata `[` e `]` como wildcards — usar `-LiteralPath`.
- Agregação em memória > múltiplas queries quando volume pequeno.

### Aprendizados técnicos mantidos v14/v13

- Dev e prod compartilham banco — nunca DELETE/TRUNCATE sem dupla checagem. SQLs destrutivos sempre com ID cravado.
- `maybeSingle()` > `single()` em consultas opcionais.
- RPC atômico (SECURITY DEFINER) resolve race conditions.
- Mercado Pago só testa Pix em janela anônima (logado como vendedor esconde opções).
- Extensões do Chrome geram falsos positivos visuais.

### Princípios de interação com o Fernando

Fernando se identifica como **desenvolvedor iniciante**. Sempre seguir:

1. **Passo a passo numerado** — sem assumir conhecimento prévio.
2. **Sempre especificar qual janela PowerShell:** DEV / GIT / CLAUDE.
3. **Formato sequencial:** próximo passo + condicional. Esperar Fernando colar output antes de continuar.
4. **Edição manual via VS Code preferida** sobre Claude Code; **arquivos grandes ou múltiplos trechos → entregar completo por download**.
5. **Edições cirúrgicas via str_replace** quando 1-2 trechos.
6. **Git workflow padrão:** commits temáticos com mensagens em português.
7. **Handoff de contexto:** ao final, gerar `contexto-sacode-vN.md`.
8. **Confirmar dados antes de SQL destrutivo** — dev e prod compartilham banco.
9. **Dados sensíveis (CPF, e-mails reais):** respeitar quando ele optar por não colar outputs.
10. **Sessão muito longa pode ser fechada com pendências documentadas no contexto.**

---

## 5. Plano de Retomada (Próxima Sessão)

### Prioridade absoluta — antes de 07/06

1. **🔴 Rodar UPDATE manual no Lote Teste** pra garantir que esteja oculto:
   ```sql
   UPDATE ticket_batches SET status='paused', is_visible=false 
   WHERE id='e7681424-0227-46cc-aece-f82326aeec09';
   ```
2. **Investigar bug do modal de edição de lotes** — Lote Teste continuou ativo após pausar/desmarcar.
3. **Limpar código de DIAG do checkout** — manter só o fix `.order('id')` e lógica `availableBatches`.

### Importante mas não-bloqueante

4. **Investigar bug supabase-js `.order('sort_order')`** — testar outras queries do projeto. Talvez `{ ascending: true }` explícito resolva.
5. **Etapa C de Afiliados** — painel público.

### Smoke test pré-evento (3-4 dias antes)

- Comprar 1 ingresso real com Pix em produção end-to-end (login, escolha, MP, e-mail).
- Validar 1 QR no `/checkin/sacode-15-edicao` em produção, no celular.
- Conferir `/admin/checkin` mostra a validação na tabela e no gráfico.
- Conferir `/admin/resumo` mostra os totais corretos.

### No dia do evento (07/06)

- Compartilhar login `checkin@cantorcaiolacerda.com.br` com hostess via WhatsApp efêmero ou em pessoa.
- Monitorar logs Vercel + Mercado Pago.
- Ter acesso ao `/admin/checkin` aberto pra acompanhar entradas em tempo real.

---

## 6. Identificadores e Recursos Úteis

- **Evento ID (SACODE 15ª Edição):** `6539575d-7a71-4c50-8f62-955bc5a96947`
- **Slug:** `sacode-15-edicao`
- **URL evento prod:** `https://sacode.cantorcaiolacerda.com.br/evento/sacode-15-edicao`
- **URL check-in prod:** `https://sacode.cantorcaiolacerda.com.br/checkin/sacode-15-edicao`
- **URL admin/checkin prod:** `https://sacode.cantorcaiolacerda.com.br/admin/checkin`
- **MP Access Token:** termina em `APP_USR-2508548`
- **Chave Pix:** `financeiro@cantorcaiolacerda.com.br`
- **MP User ID Caio:** 658407697
- **CNPJ Caio:** 44.816.216/0001-03

### Login compartilhado de Check-in

- **E-mail:** `checkin@cantorcaiolacerda.com.br`
- **UID:** `a188e6cf-3531-4f63-a99b-9ecf13ad9d10`
- **Profile:** role=`checkin`, cpf placeholder `00000000000`, full_name "Equipe Check-in SACODE"
- **Senha:** guardada pelo Fernando no gerenciador

### Estado dos lotes (snapshot fim da sessão v16)

| Lote | Status | Visible | Quantity | Sold | Price |
|---|---|---|---|---|---|
| Cortesia | active | **false** (oculto) | 500 | 5 | R$ 0 |
| Ingresso Promocional | active | true | 100 | 21 | R$ 15 |
| **Lote Teste (deveria estar paused/oculto, está active/visible!)** | **active** | **true** | 99 | 0 | R$ 50 |
| Ingresso Único - Lote 01 | scheduled | true | 250 | 0 | R$ 20 |
| Ingresso Único - Lote 02 | scheduled | true | 250 | 0 | R$ 25 |
| Ingresso Único - Lote 03 | scheduled | true | 1000 | 0 | R$ 35 |

### Arquivos criados/modificados na v16

**Sistema de Check-in (8 arquivos novos):**
- `src/app/checkin/layout.tsx`
- `src/app/checkin/actions.ts`
- `src/app/checkin/page.tsx`
- `src/app/checkin/[event_slug]/page.tsx`
- `src/components/checkin/CheckinScannerClient.tsx`
- `src/app/api/checkin/validate/route.ts`
- `src/app/api/checkin/search/route.ts`
- `src/app/admin/checkin/page.tsx`

**Dashboard Resumo (1 arquivo):**
- `src/app/admin/resumo/page.tsx` (substituído)

**CRUD de Lotes (5 arquivos):**
- `src/app/admin/lotes/page.tsx` (substituído)
- `src/components/admin/LotesAdminClient.tsx` (novo)
- `src/components/admin/LoteFormModal.tsx` (novo)
- `src/app/api/admin/lotes/create/route.ts` (novo)
- `src/app/api/admin/lotes/[id]/route.ts` (novo)

**Fixes em arquivos existentes:**
- `src/components/admin/AdminTabs.tsx` (aba Check-in)
- `src/app/evento/[slug]/page.tsx` (force-dynamic + lote mais barato + card esgotado)
- `src/app/checkout/page.tsx` (filtro esgotados + card esgotado + `.order('id')`)

**Dependência nova:**
- `html5-qrcode`

### Commits da v16 (na main, ordem cronológica)

```
checkin: instala html5-qrcode para scanner
checkin: layout protegido com role checkin e landing de eventos
checkin: pagina do evento com scanner QR e busca manual
checkin: APIs de validacao e busca com debounce e race-safe
checkin: feedback sonoro, vibracao e overlay grande ao validar
checkin: camera em modal fullscreen e overlay fullscreen com dismiss manual
checkin: botoes FECHAR CAMERA grandes e vermelhos no topo e rodape do scanner
checkin: aba admin com tabela e grafico SVG + refresh ao fechar camera
resumo: grafico de pizza por genero e tabela de vendas por dia
lotes: CRUD admin com modal de edicao/criacao e toggle ativo/pausado
evento: home mostra lote ativo mais barato e card vermelho quando esgotado
checkout: filtra lotes esgotados e exibe card indisponivel sem lotes ativos
evento: force-dynamic para refletir mudancas de lote em tempo real
checkout: logs temporarios pra debug do bug de lote nao aparecer
checkout: diagnostico cirurgico dos filtros
checkout: diagnostico cirurgico dos filtros (arquivo limpo)
checkout: remove logs de diagnostico
checkout: diag lado a lado principal vs minimal vs sem-order
checkout: tenta ordenar por id em vez de sort_order   ← fix do bug crítico
```

---

**Fim do contexto v16. Sessão extensa cobrindo Sistema de Check-in completo + dashboard turbinado + CRUD de Lotes + correções de exibição + descoberta de bug crítico do supabase-js. Próxima sessão começa pelas 3 prioridades absolutas: rodar UPDATE no Lote Teste, investigar modal de edição, limpar código de DIAG. Evento em 9 dias.**
