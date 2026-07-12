# Contexto SACODE — v13

**Data:** 23 de maio de 2026
**Sessão anterior:** v12 (Pix integrado, vendas abertas)

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

- **Frontend:** Next.js 14, Tailwind CSS
- **Backend/DB:** Supabase (Auth, DB, Storage, `@supabase/ssr`)
- **E-mail:** Resend com SMTP customizado no Supabase, remetente `SACODE <nao-responda@cantorcaiolacerda.com.br>`
- **Pagamento:** Mercado Pago Checkout Pro com webhook HMAC ativo (Pix funcionando)
- **Hospedagem:** Vercel
- **Versionamento:** GitHub
- **Mapas:** Google Maps iframe (sem API key)
- **Migrations:** alterações de schema feitas direto no SQL Editor do Supabase (sem pasta de migrations local)

**Dev environment:**
- Windows + VS Code
- Três janelas PowerShell: **DEV** (servidor local), **GIT** (git e comandos puros), **CLAUDE** (Claude Code)
- Projeto em `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`

---

## 3. Estado Atual

### ✅ Concluído

- **Pix integrado e funcionando** — Mercado Pago resolveu o problema do tipo de conta (era `personal` mesmo com CNPJ; foi escalado internamente e corrigido).
- **Vendas abertas** — plataforma operando em produção; primeiros pedidos pagos chegando.
- **Limpeza pré-launch** — `orders`, `order_items` zerados e `sold_count` de todos os lotes resetado antes da abertura.
- **Sistema de cortesias (Etapa 2)** — admin busca por CPF/e-mail, emite 1–10 ingressos em um pedido, todos em um único e-mail com QR codes individuais. Usa o lote oculto "Cortesia" (`is_visible=false`, `price=0`). Rollback completo em falha de QR; pedido preservado se só o e-mail falhar.
- **Mural com acesso admin** — `src/app/evento/[slug]/mural/page.tsx` agora libera acesso para `profiles.role IN ('admin', 'producer')` mesmo sem ingresso pago. Mesma lógica usada em `src/app/admin/layout.tsx`.
- **Página `evento/[slug]/mural/page.tsx`** — modificada e em produção.
- **Documentos legais** — Termos de Uso e Política de Privacidade (LGPD) em `/termos` e `/privacidade`; componentes `TermosContent.tsx` e `PrivacidadeContent.tsx` com prop `darkBg`; `LegalModal.tsx` com Esc-to-close, click-fora, scroll lock e a11y.

### ⏳ Pendente / Bug Ativo

#### 🔴 BUG: Resumo do admin mostra número errado de ingressos vendidos

- **Sintoma:** Há 17 ingressos pagos + 5 cortesias geradas (total real: 22), mas o resumo do admin exibe **41 ingressos vendidos**.
- **Hipóteses de causa raiz (em ordem de probabilidade):**
  1. A query do resumo está contando `order_items` **sem filtrar por status `paid`** — pedidos `pending` e `expired` do Mercado Pago estão sendo somados. (Mais provável, dado o histórico de testes.)
  2. A query soma `quantity` ao mesmo tempo em que conta linhas, causando dupla contagem.
  3. Está somando `sold_count` de todos os lotes (incluindo o lote oculto "Cortesia") **e** contando itens individuais — dupla contagem.
- **Onde investigar primeiro:** arquivo do dashboard admin, provavelmente `src/app/admin/page.tsx` ou similar; e a query/RPC que alimenta os números.

#### 🆕 Pendências do resumo (a serem implementadas junto com o fix do bug)

Atualmente o resumo mostra um único número agregado. Reformatar para exibir caixinhas separadas:

1. **Caixa: Ingressos vendidos** — apenas pedidos com status `paid`, excluindo cortesias.
2. **Caixa: Cortesias geradas** — apenas itens do lote "Cortesia" (preço 0).
3. **Caixa: Valor total de ingressos vendidos** — soma do `price` dos `order_items` pagos (sem taxa).
4. **Caixa: Valor total de taxas** — soma das taxas cobradas nos pedidos pagos.
5. **Caixa: Ticket médio** — valor total de ingressos vendidos ÷ número de ingressos vendidos.

Manter o card resumo geral se já existir, mas as métricas acima precisam estar individualizadas e visualmente separadas.

#### 🟡 Etapa 3 — Sistema de Check-in (planejado, ainda não implementado)

**Decisões já tomadas:**
- Login único compartilhado: `checkin@cantorcaiolacerda.com.br` (já criado)
- Dropdown "Hostess" (não "Porteiro")
- QR scanner como interface primária + busca por CPF/nome como fallback
- Reuso das colunas existentes em `order_items`: `checked_in_at`, `checked_in_by`
- **Não depende** de outras pendências — pode ser feito em paralelo

#### 🟢 Bugs/melhorias conhecidas não-bloqueantes

- FOUC no navbar
- Smoke test de tracking de afiliados em produção ainda não verificado
- Botão de logout não-funcional
- **Transferência de ingressos self-service** — planejada para Fase 2

---

## 4. Princípios e Aprendizados Acumulados

### Aprendizados técnicos

- **Mercado Pago em janela anônima:** testar pagamento logado como vendedor esconde opções (inclusive Pix). Sempre validar em janela anônima.
- **Tipo de conta MP é API-autoritativo:** o dashboard pode mostrar CNPJ corretamente enquanto a API retorna `personal`. Só escalação interna do suporte resolve.
- **Entrega de arquivos por download, não copy-paste:** `Get-Content` do PowerShell embaralha acentos. Arquivos grandes ou com acentos vão como download. PowerShell exibindo acentos quebrados é falso positivo — validar no Notepad ou navegador.
- **Operações de auth em Route Handler server-side:** `updateUser` no servidor elimina `NavigatorLockAcquireTimeoutError` de múltiplos `createSupabaseBrowserClient()` competindo pelo `navigator.locks`.
- **`window.location.href` > `router.push + refresh`** para redirects pós-auth — evita race condition do SSR Supabase.
- **Middleware deve permitir crawlers sociais:** Open Graph preview precisa de 200, não 403, para facebookexternalhit, WhatsApp, Twitterbot, etc.
- **Extensões do Chrome geram falsos positivos visuais:** alertas em screenshots podem vir de extensão, não da plataforma. Verificar antes de agir.
- **Sempre conferir constraints do banco:** `ticket_batches_status_check` estava sem `'scheduled'` mesmo com a app esperando — `ALTER TABLE` resolveu.

### Princípios de interação com o Fernando

**Fernando se identifica como desenvolvedor iniciante. Sempre seguir:**

1. **Passo a passo numerado** — sem assumir conhecimento prévio, sem pular etapas.
2. **Sempre especificar qual janela PowerShell usar:**
   - **DEV** — `npm run dev`
   - **GIT** — comandos git e PowerShell puro
   - **CLAUDE** — Claude Code (interpreta como pergunta, não executa shell)
3. **Formato sequencial:** próximo passo + condicional do passo seguinte ("Rode X. Se sair Y, rode Z. Se aparecer algo estranho, cole aqui."). Esperar Fernando colar output antes de continuar. Não repetir instruções anteriores quando ele cola output.
4. **Edição manual de arquivos preferida** sobre automação do Claude Code — fornecer conteúdo completo para copy-paste no VS Code/PowerShell. Arquivos grandes ou com acentos vão por download.
5. **Edições cirúrgicas** quando modificar arquivos existentes (preferir alterar trechos específicos, não substituir tudo).
6. **Git workflow padrão:** `git add` → `git commit -m "..."` → `git push` (sempre na janela GIT).
7. **Handoff de contexto:** ao final de sessões complexas, gerar `contexto-sacode-vN.md`.

---

## 5. Plano de Retomada (Próxima Sessão)

### Ordem sugerida

1. **Investigar o bug do resumo:**
   - Identificar o arquivo do dashboard admin que mostra o número errado.
   - Ler a query/RPC que alimenta o resumo.
   - Determinar a causa raiz (filtro de status faltando vs. dupla contagem vs. lote oculto).
2. **Refatorar o resumo com as caixinhas separadas:**
   - Ingressos vendidos (só pagos, sem cortesia)
   - Cortesias geradas
   - Valor de ingressos vendidos
   - Valor de taxas
   - Ticket médio
3. **Smoke test em produção** — conferir se os números batem com a realidade após o deploy.
4. **Quando o resumo estiver ok**, partir para a **Etapa 3 (check-in)** — não depende do resumo e pode ser feita em paralelo se preferir.

### Para começar a investigação rapidamente

Na **janela GIT**, listar arquivos candidatos:

```powershell
Get-ChildItem src/app/admin -Recurse -Filter page.tsx
```

E procurar onde o número de "vendidos" aparece:

```powershell
Get-ChildItem src/app/admin -Recurse | Select-String -Pattern "vendidos|sold_count" -List
```

Esses dois comandos já vão apontar os arquivos certos para abrir.

---

## 6. Identificadores e Recursos Úteis

- **Evento ID (SACODE 15ª Edição):** `6539575d-7a71-4c50-8f62-955bc5a96947`
- **Slug:** `sacode-15-edicao`
- **MP Access Token ativo:** termina em `APP_USR-2508548` (Vercel env `MERCADOPAGO_ACCESS_TOKEN`)
- **Chave Pix ativa:** `financeiro@cantorcaiolacerda.com.br`
- **MP User ID Caio:** 658407697
- **CNPJ Caio:** 44.816.216/0001-03
- **Login compartilhado check-in (criado, não usado ainda):** `checkin@cantorcaiolacerda.com.br`

---

**Fim do contexto v13. Próxima sessão começa investigando o bug do resumo do admin.**
