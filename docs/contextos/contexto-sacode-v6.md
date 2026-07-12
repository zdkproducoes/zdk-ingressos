# Contexto SACODE — v6

> Atualizado em **02/05/2026** após sessão de skin Copa, SEO e Open Graph.
> Use esse arquivo como ponto de partida na próxima conversa com o Claude.

---

## 📌 Quem é o cliente / projeto

**Fernando Zedeque** é produtor de eventos da **ZDK Produções**, construindo uma plataforma própria de venda de ingressos pra ter controle total dos dados dos compradores (CPF, e-mail, telefone, histórico) — diferencial estratégico vs. plataformas de terceiros.

O **MVP da plataforma** está sendo validado num evento real: **SACODE — 15ª Edição (Aquecimento Copa do Mundo)**, do artista **Caio Lacerda**, em **07/06/2026** no **Villa Jardim Bar — São Bernardo do Campo / ABC paulista**.

**Estratégia de marca:** O evento/artista é o protagonista visual. A plataforma (ZDK) aparece discretamente no rodapé como "powered by ZDK Produções".

---

## 🗓️ Linha do tempo + status atual

| Marco | Data | Status |
|---|---|---|
| Lançamento original | 01/05/2026 | ❌ Adiado |
| **Lançamento atual planejado** | **04/05/2026 às 12h** | 🟡 A confirmar (3 problemas críticos pendentes) |
| Evento SACODE | 07/06/2026 | 🎯 Alvo final |

**HOJE É 02/05/2026 (sábado).** Restam ~36h até o lançamento previsto. **Lançamento NÃO PODE ACONTECER nessa data se os 3 bugs críticos abaixo não forem resolvidos antes.**

---

## ✅ O que foi feito na última sessão (skin Copa)

Sessão de 01-02/05 entregou e fez deploy em produção:

1. **Skin temática Copa do Mundo** aplicada APENAS na página `/evento/sacode-15-edicao`
   - Resto do site (cadastro, login, minhas-compras, admin) **mantido na paleta vinho SACODE original**
   - Decisão estratégica: próximas edições do SACODE voltam à paleta vinho. Skin Copa é one-off.

2. **Componentes novos criados** em `src/components/evento/`:
   - `HeroCopa.tsx` — banner com a arte oficial + tarja-CTA verde com botão "Garantir meu ingresso"
   - `SecoesCopa.tsx` — Copy textual + InfoEvento + Lineup + Mapa (todos hardcoded para esse evento)
   - `LoteAtivoCopa.tsx` — card do lote ativo (single, sem contador, com aviso "Últimos ingressos disponíveis" condicional)
   - `LoteAtivoCopaWrapper.tsx` — client wrapper com **affiliate tracking preservado** + handler de compra

3. **Helper `src/lib/lote-helpers.ts`** com `calcularUrgencia(loteAtivo, proximoLote)`:
   - Critério (a): se `sold_count / quantity >= 0.9` → urgente
   - Critério (b): se `proximoLote.starts_at` for em menos de 24h → urgente
   - Hoje, lote tá com 12/100 (12%) e nenhum próximo lote criado → `isUrgent = false`

4. **`page.tsx` reescrito**:
   - `generateMetadata` dinâmico → `metadata` estático (SEO Copa)
   - `EventPageClient` removido (substituído pelos componentes novos)
   - Affiliate tracking migrado para o Wrapper
   - JSON-LD schema.org `MusicEvent` adicionado
   - Lógica de busca Supabase preservada intacta

5. **SEO + Open Graph completos**:
   - Title e description geo-aware (menciona SBC, ABC paulista, Copa)
   - ~75 keywords organizadas (identidade, atrações, geografia ABC, gêneros, sazonal)
   - Open Graph com thumb dedicada `og-image.png` (1200×630, 187KB) — pronta pra WhatsApp
   - Twitter Card configurado
   - JSON-LD com lineup completo, lat/long, oferta, performer

6. **Assets em `/public/`**:
   - `og-image.png` — thumbnail WhatsApp
   - `hero-copa.jpg` — arte horizontal otimizada
   - `logo-sacode.png` — logo grande pro footer
   - `logo-sacode-nav.png` — logo pequena pra navbar

7. **Logo oficial aplicada** em `Navbar.tsx` e `Footer.tsx`.

8. **Tailwind config atualizado**:
   - Paleta `copa-green-*`, `copa-yellow-*`, `copa-magenta-*`, `copa-cream` adicionadas (sem remover paletas SACODE)
   - Fontes `Bebas Neue` e `Anton` via `next/font/google`
   - Animação `pulse-glow` no botão "Garantir meu ingresso"

9. **Correções aplicadas durante a sessão**:
   - `lote-helpers.ts`: nome de coluna `activation_date` → `starts_at` (descoberto que `activation_date` não existe na tabela)
   - `LoteAtivoCopa.tsx`: hardcode `MAX_QTY_DEFAULT=5` substituído por `lote.max_per_order` e `lote.min_per_order` vindos do banco
   - `HeroCopa.tsx` + `LoteAtivoCopa.tsx`: shadows com `theme(colors.copa-yellow-X)` substituídos por hex direto (`#D9A82F`, `#B58D24`) — resolveu warning do Tailwind
   - Build limpo: 27 páginas geradas, sem warnings

10. **Deploy no Vercel feito com sucesso.** Visualmente, a página em produção bate com o local.

**Total de commits da sessão:** ~7 commits temáticos.

---

## 🚨 PROBLEMAS CRÍTICOS DESCOBERTOS NO SMOKE TEST EM PRODUÇÃO

**Os 3 problemas abaixo PRECISAM ser resolvidos antes da abertura de vendas em 04/05.** O lançamento não pode rolar com nenhum deles em aberto.

### 🔴 P-CRÍTICO 1: Checkout sem autenticação

**Sintoma:** Usuário deslogado clica em "Comprar agora" no card do lote → vai DIRETO pra `/checkout` sem passar pelo login → consegue até finalizar a compra sem estar logado.

**Hipóteses do que pode estar acontecendo:**
- O middleware deveria interceptar `/checkout` e redirecionar pra `/login?redirect=/checkout`
- Na investigação anterior, confirmamos que o middleware tem `/checkout/:path*` no matcher e faz `if (!user && !isPublicRoute) redirect`
- Possíveis causas:
  1. Middleware não está rodando por algum motivo (cache, configuração)
  2. `isPublicRoute` está retornando `true` quando não deveria
  3. Algum cookie/sessão antigo está fazendo o middleware "achar" que tem usuário logado quando não tem
  4. O `LoteAtivoCopaWrapper` faz `router.push('/checkout')` que pode não acionar o middleware (improvável, mas vale verificar — talvez precise ser `window.location.href` ou similar)

**Severidade:** ⚠️ **CRÍTICA.** Quebra um requisito de produto fundamental: "criar conta antes de comprar para garantir ownership de dados dos clientes". É o pilar da estratégia de negócio do projeto.

**Como reproduzir:**
1. Abrir aba anônima
2. Acessar `https://sacode.cantorcaiolacerda.com.br/evento/sacode-15-edicao`
3. Clicar em "Comprar agora"
4. Observar que vai pra `/checkout` direto

---

### 🔴 P-CRÍTICO 2: Quantidade não preservada no checkout

**Sintoma:** Usuário seleciona N ingressos no card → clica "Comprar agora" → no checkout, a quantidade aparece zerada/diferente da selecionada.

**Histórico:** Esse é o **bug C5 do v5**. Foi documentado lá e ficou pendente. O `LoteAtivoCopaWrapper` foi escrito **com a intenção** de salvar no `localStorage` antes de redirecionar, MAS:
- Não validamos na sessão atual se o `/checkout` lê dessa mesma chave
- A chave usada no Wrapper é `'cart'` com formato `[{loteId, quantity, price, name, addedAt}]`
- A página `/checkout` pode estar lendo de chave diferente, ou de query param `?event=`, ou de outro formato

**Investigação prévia (do Claude Code):**
- O `EventPageClient` antigo redirecionava pra `/login?redirect=/checkout?event=slug`
- O Wrapper novo redireciona só pra `/checkout` (sem query param)
- Se `/checkout` depende de `?event=` na URL → não funciona
- Se `/checkout` depende de localStorage → depende da chave exata

**Severidade:** ⚠️ **ALTA.** É fricção real no momento de maior conversão (cliente já decidiu comprar, tá com cartão na mão).

**Como reproduzir:**
1. Selecionar 3 ingressos no card
2. Clicar "Comprar agora"
3. Logar (após resolver P-CRÍTICO 1)
4. Observar que checkout mostra quantidade diferente de 3

---

### 🔴 P-CRÍTICO 3: Checkout mostra todos os lotes

**Sintoma:** Na página `/checkout`, todos os lotes aparecem (incluindo `scheduled` e `ended`). Deveria mostrar APENAS o lote ativo, igual ao card da home.

**Decisão de produto:** Página de evento mostra só lote ativo, sem contador → checkout deve seguir a mesma regra. Coerência visual.

**Severidade:** 🟡 **MÉDIA.** Não bloqueia a venda mas confunde o usuário e expõe lotes futuros que ainda não devem ser comerciais.

**Como reproduzir:**
1. Ir pra `/checkout` (após resolver P-CRÍTICO 1)
2. Observar que aparecem múltiplos lotes em vez do ativo único

---

## 🎯 ROTEIRO PROPOSTO PARA A PRÓXIMA SESSÃO

**Tempo estimado:** 2-3h.

### Etapa 1 — Diagnóstico do P-CRÍTICO 1 (~30 min)

Pedir ao Claude Code:

1. Mostrar o conteúdo COMPLETO de `src/middleware.ts`
2. Mostrar a função `createSupabaseServerClient` ou similar usada pelo middleware
3. Em produção (aba anônima), abrir DevTools → Network → tentar acessar `/checkout` → ver se o middleware é chamado e qual resposta retorna
4. Verificar se há algum bypass ou regra que está deixando passar
5. Verificar se o redirect do Wrapper (`router.push('/checkout')`) realmente aciona o middleware

**Ações possíveis dependendo do diagnóstico:**
- Ajustar matcher do middleware
- Ajustar lógica de `isPublicRoute`
- Trocar `router.push` por `window.location.href` no Wrapper se necessário
- Limpar cookies de sessão antigos que estejam confundindo o middleware

### Etapa 2 — Resolver P-CRÍTICO 2 e 3 juntos (~1h)

Pedir ao Claude Code:

1. Mostrar conteúdo completo de `src/app/checkout/page.tsx` (ou `CheckoutClient.tsx`)
2. Identificar como ele atualmente:
   - Carrega o evento (query param `?event=`? localStorage? sessão?)
   - Carrega os lotes (query? Supabase direto? props?)
   - Define quantidade inicial (campo controlado? props? localStorage?)
3. Alinhar 3 pontos:
   - **Fonte única de verdade** para evento + carrinho (recomendação: localStorage com chave única)
   - Wrapper salva: `cart = [{loteId, qty}]` + `event_id = "uuid-do-evento"`
   - Checkout lê: cart + event_id, busca evento+lotes do banco com base nesses dados
4. Filtrar lotes no checkout para mostrar apenas `status === 'active'` (ou apenas o lote do `cart`)

### Etapa 3 — Smoke test crítico (~30 min)

Em aba anônima:

- [ ] Visitar `/evento/sacode-15-edicao` deslogado
- [ ] Selecionar 3 ingressos
- [ ] Clicar "Comprar agora"
- [ ] **Deve redirecionar pra `/login`** (não pra `/checkout`)
- [ ] Logar com conta de cliente
- [ ] **Deve cair no `/checkout`** com 3 ingressos pré-selecionados, mostrando apenas o lote ativo
- [ ] Finalizar compra teste com cartão de R$15
- [ ] Verificar se ingresso é gerado corretamente

### Etapa 4 — Affiliate tracking (sanity check ~10 min)

- [ ] Visitar `/evento/sacode-15-edicao?ref=TESTE_V6`
- [ ] DevTools → Application → localStorage → ver chave `affiliate_code` = `TESTE_V6`
- [ ] Supabase Studio → tabela `affiliate_visits` → ver linha nova
- [ ] Tabela `affiliates` → coluna `visits` incrementada

### Etapa 5 — Deploy + smoke em produção

- [ ] Commits temáticos (sugestão: 1 commit para middleware/auth, 1 para checkout)
- [ ] Push para main
- [ ] Aguardar Vercel
- [ ] Repetir smoke test do Etapa 3 em produção
- [ ] **Só então confirmar que pode abrir vendas**

---

## 📂 Estado atual do projeto

### Stack técnica (mantida)

- **Frontend:** Next.js 14 + Tailwind CSS, deploy Vercel
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **E-mail:** Resend
- **Pagamento:** Mercado Pago (em produção, validado, HMAC ativo)
- **Versionamento:** GitHub
- **Hosting do site original (legado):** HostGator

### Estado do banco

**Tabela `ticket_batches` — colunas confirmadas em 02/05:**
```
id, event_id, name, description, price, quantity, sold_count,
sort_order, starts_at, ends_at, status, is_visible,
min_per_order, max_per_order, created_at, updated_at
```

**⚠️ ATENÇÃO:** A coluna que originalmente eu chamei de `activation_date` é na verdade `starts_at`. Helper `calcularUrgencia` já corrigido.

**Lote SACODE atual:**
- 4 lotes existem no banco
- Apenas 1 com `status = 'active'`: "Lote Pré-Venda" (renomeado de "Promocional"), R$15
- 12/100 vendidos (números de teste)
- Profiles: 4 (2 admin + 2 customers reais)
- Caio promovido a `admin`
- Storage limpo

### Páginas e rotas

- `/` — home (institucional)
- `/evento/[slug]` — página do evento (skin Copa aplicada) ✅ funcionando em produção
- `/evento/[slug]/mural` — mural do evento (não tocado nessa sessão)
- `/cadastro`, `/login`, `/auth/confirmar` — fluxo de auth
- `/checkout`, `/checkout/sucesso`, `/checkout/falha`, `/checkout/pendente` — fluxo de compra **(PROBLEMAS P1, P2, P3 acima)**
- `/minhas-compras`, `/minhas-compras/[slug]` — área do cliente
- `/admin/*` — painel administrativo
- `/buscar-ingresso` — busca pública por CPF
- `/api/*` — endpoints (signup, checkout, webhook MP, wall, etc.)

### Build em 02/05/2026
- 27 páginas geradas com sucesso
- Build limpo, sem warnings
- Types ok
- Deploy verde no Vercel

---

## 📋 Pendências do v5 que ainda valem (todas pós-MVP)

Coisas que ficaram pra depois do lançamento e ainda valem revisar:

### Bloqueantes pré-lançamento
- ~~Termos de Uso e Política de Privacidade~~ — ✅ Rascunho entregue para advogado, aguardando devolução
- **Recuperação de senha** — feature ainda não implementada. **Crítica antes de abrir vendas.** ~2-3h.

### Pós-lançamento (Fase 2)
- **Embaixadores do SACODE** — sistema completo de affiliates com dashboard, comissão 10% individual + 5% override líder. Discutimos: pra 5-20 pessoas iniciais, MVP em planilha pode ser suficiente. ~20-30h se fizer no código.
- **Painel admin editável do evento** — CRUD de evento (texto, lotes, imagem, localização). ~8-12h. Importante notar que com a skin Copa atual, vários campos viraram hardcode no componente (descrição do evento, lineup, endereço). Quando o painel admin for implementado, esses campos voltam a ser dinâmicos.
- **Área "Meu Perfil"** — cliente edita nome, telefone, troca senha. ~3-4h.
- **Transferência de titularidade self-service** — hoje os Termos prometem que será via canal de atendimento. Implementar feature self-service depois. ~4-6h.
- **Pendências visuais do v5:**
  - P1 — tela "Quase lá!" (paleta verde → SACODE)
  - P2 — tela "E-mail confirmado!" (mesma migração)
  - A1 — carrossel de ingressos em `/minhas-compras/[slug]`
  - P5/P6/C1 — login lento, FOUC navbar, botão sair admin
  - TD1 — DEP0169 deprecation warning

---

## 🎨 Decisões de design vigentes

- **Paleta SACODE oficial** (vinho/âmbar/creme) — usada em todo o site EXCETO `/evento/[slug]`
- **Skin Copa** (verde/amarelo/roxo) — usada SOMENTE em `/evento/sacode-15-edicao`. Próximos eventos voltam à paleta SACODE.
- **Lote único exibido** na página do evento — não mostra contador a não ser quando 90%+ vendido OU <24h pra virar lote
- **Renomear "Promocional" → "Pré-Venda"** já feito
- **Logo oficial** ("Sacode do Lacerda") em PNG transparente nas barras de navegação

## 📜 Decisões jurídicas vigentes (para os Termos)

- Caio Lacerda (CNPJ 44.816.216/0001-03) é Organizador (vendedor) e Controlador de dados
- ZDK Produções é Operadora de dados / Plataforma técnica
- Transferência de titularidade: gratuita, 1x por ingresso, até 6h antes do evento, via canal de atendimento (self-service futuro)
- Direito de arrependimento: 7 dias CDC
- Cancelamento/adiamento: cliente escolhe entre crédito e reembolso
- **Sem oferecer meia-entrada** (decisão consciente de risco assumido)
- Menores: somente com pais/responsáveis legais, termo na portaria fornecido pela casa
- Cláusula de uso de imagem: incluída
- E-mail DPO: `privacidade@zdkproducoes.com.br`

---

## 🚦 Como começar a próxima sessão

Cole essa mensagem na nova conversa:

> Claude, vamos retomar o projeto SACODE. Anexo arquivo `contexto-sacode-v6.md` com tudo que aconteceu até agora. Hoje é XX/05/2026 e a abertura de vendas está prevista pra 04/05/2026 às 12h. Tem 3 problemas críticos descobertos no smoke test em produção que precisamos resolver antes do lançamento. Comecemos pelo P-CRÍTICO 1 (checkout sem autenticação) que é o mais grave.

E anexa este arquivo. Claude vai ter contexto suficiente pra continuar de onde paramos.

---

**Fim do contexto v6.**
