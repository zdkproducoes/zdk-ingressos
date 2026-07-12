# Contexto SACODE — v20

> Documento de continuidade. Suba/cole no início de uma nova conversa para dar sequência ao projeto.
> Primeiro contexto **pós-evento**. O evento ocorreu em 07/06/2026. **Produção DESCONGELADA** — trabalho de desenvolvimento pode voltar.

---

## 1. Quem é / o que é

**Fernando Zedeque (ZDK Produções)** construiu o **SACODE**, plataforma própria de ingressos para os eventos do artista **Caio Lacerda**. Diferencial estratégico: **posse dos dados do cliente** (CPF, e-mail, telefone, idade, sexo, histórico) para marketing direto — por isso a plataforma é própria. Visão de longo prazo: virar um **SaaS de ingressos multi-produtor** (ver Seção 6).

MVP validado no **SACODE 15ª Edição** (07/06/2026, Villa Jardim Bar, São Bernardo do Campo / ABC).

Fernando se considera **dev iniciante** — ver Seção 7 (como trabalhar com ele).

---

## 2. Estado pós-evento

- **A festa aconteceu.** Nota dada pelo Fernando à plataforma: **~7/10**. A plataforma vendeu, processou PIX/cartão, fez check-in e **sobreviveu a uma intervenção manual no meio do evento** (reativação de lote durante a festa por problema de cache no checkout).
- **Resultado financeiro da edição: negativo** — público abaixo do esperado. (Resultado da *festa*, não da *plataforma*; o produto cumpriu o papel. Reforça por que as ferramentas de público/marketing da Seção 6 importam.)
- **Ponto positivo de marketing:** pela **primeira vez houve venda atribuída ao Meta Ads** (link do afiliado de medição `ads`). Confirmar nº exato com o SELECT por `affiliate_code = 'ads'`.
- **Fechamento financeiro já feito** pelo Fernando. Registros manuais pendentes (ex.: pedido #121 da Laura) **não serão mais mexidos** — decisão tomada.

---

## 3. Stack & identificadores-chave

**Stack:** Next.js 14 (App Router, `src/`), Supabase (Auth/DB/Storage), Tailwind, Mercado Pago Checkout Pro + PIX, Resend (e-mail), Cloudflare Turnstile, Vercel, GitHub.

- Produção: `https://sacode.cantorcaiolacerda.com.br`
- Página do evento: `/evento/sacode-15-edicao`
- Projeto local: `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`
- Repo: `zdkproducoes/sacode-ingressos` (branch `main`)
- Supabase project ID: `nsbyylbgnmzlgfwzgasl`
- Event ID: `6539575d-7a71-4c50-8f62-955bc5a96947` · slug: `sacode-15-edicao`
- Suporte: `ingressos@cantorcaiolacerda.com.br` · Check-in: `checkin@cantorcaiolacerda.com.br`
- DPO/privacidade: `privacidade@zdkproducoes.com.br` · CNPJ controlador: 44.816.216/0001-03
- Chave PIX: `financeiro@cantorcaiolacerda.com.br`

**Meta Ads:** conta `1779584973842` · campanha `6958415932844` (Tráfego) · conjunto `6958415932644` · anúncio `6958415933044` · afiliado de medição = code **`ads`**. Pixel `1415319082934143` ainda **não instalado** na plataforma (bloqueia campanhas de conversão).

---

## 4. O que a plataforma já faz (em produção)

Auth completo · página do evento (skin Copa) · Checkout Pro + **PIX (88% das vendas)** · webhook validado via API do MP (idempotente) · admin (Resumo, Pedidos, Lotes, Compradores) · cortesias (1–10 por pedido) · afiliados (CRUD + magic link + atribuição) · **check-in testado** (lê QR + busca por nome/CPF; feedback verde/amarelo/vermelho) · páginas legais · busca pública de ingresso · `audit_logs`.

**Aprendizado confirmado nesta sessão:** o check-in **respeita `order_items.status`** — itens com `status = 'cancelled'` somem da lista e não liberam entrada. Logo, cancelar pelo banco é um jeito seguro de invalidar ingresso (testado no pedido #70).

---

## 5. Operações manuais feitas (runbook — viram features na Seção 6)

**Reembolso / cancelamento (pedido #70, Vagner Miranda, 2 ingressos, R$55, PIX):**
1. Devolução total no painel do Mercado Pago (pelo `payment_gateway_id`).
2. `UPDATE order_items SET status='cancelled' WHERE id IN (...)`.
3. `UPDATE orders SET payment_status='refunded', cancelled_at=now(), cancellation_reason='...' WHERE order_number=70`.
4. Verificado: sumiu do check-in. QR morto. Resumo do admin cai sozinho (conta só item aprovado).

**PIX manual / pedido travado em pending (pedido #121, Laura):** dinheiro entrou por fora do MP → webhook não rodou → QRs nunca gerados (`qr_code_token`/`qr_code_url` null). Marcar como pago **não** gera QR. Workaround usado: **emitir cortesia** (gera QR + e-mail de ponta a ponta) e cancelar o pedido original. Efeito colateral: venda vira "cortesia" e some do faturamento → exige conciliação à parte (o que motiva a feature de "pagamento manual / venda offline"). **#121 ficou como está, por decisão do Fernando.**

---

## 6. BACKLOG PÓS-EVENTO (ordem: pendências antigas → correções → melhorias → áreas novas → escala)

### Pendências antigas que continuam valendo
- Bug do **modal de edição de lotes** (ativar/pausar/ocultar pela UI; hoje SQL na mão).
- **Resumo do admin**: usar `payment_status = 'approved'` (não `'paid'`, que não existe; não `sold_count`). Reformatar em cards (ingressos pagos, cortesias, faturamento, taxas, ticket médio).
- **Relatório de meios de pagamento** no Resumo (quebra PIX/cartão).
- Bug do `sort_order` (workaround: `.order('id')`).
- **FOUC** na navbar.

### 7 Correções/melhorias pedidas (07/06)
1. **Cancelamento/Reembolso de pedido** — botão no `admin/pedidos`: cancela QRs (`order_items.status='cancelled'`) + dispara estorno no MP. Automatiza o runbook do #70.
2. **Mostrar/ocultar senha** no login — ícone de olho.
3. **Detalhe de pedido no admin** — afiliado usado, forma de pagamento, status, taxas, datas.
4. **Admin>Pedidos não lista todos** — investigar (provável `LIMIT 50`, filtro de status, ou falta de paginação). Confirmar que mostra o conjunto completo.
5. **Venda offline** — cadastro prévio do comprador + gerar pedido que conta como **venda offline / PIX manual** (faturamento real, separado de cortesia). Irmão do "confirmar pagamento manual": gera QR + e-mail sem depender do webhook; idealmente `payment_method = 'pix_manual'`.
6. **Nubank "possível golpe"** no PIX/QR pra conta MP — **origem externa** (banco do pagador sinaliza recebedor vs nome do evento), não bug da plataforma. Ação = **investigar/mitigar** (deixar a razão social do recebedor clara no checkout; revisar dados/histórico da conta MP), pode não ser 100% eliminável.
7. **Virada de lote (BUG importante)** — ao trocar o lote ativo, a home/página do evento atualiza o preço, mas **o checkout não vira** (serve o lote antigo). Pistas: query do checkout não filtra/ordena os lotes igual à da página do evento, ou serve cache (`force-dynamic` já resolveu cache parecido na página pública antes). Cobre virada manual **e** agendada.

### 4 Melhorias aprovadas (sugeridas e aceitas)
a. **Sincronizar ou aposentar o `sold_count`** — está dessincronizado; verdade = `order_items` filtrados por aprovado.
b. **Página de status de pagamento PIX que se atualiza sozinha** — dá feedback ao cliente quando o PIX demora/falha (reduz venda manual como o #121 travado).
c. **Reconciliação financeira no admin** — visão com faturamento real (MP) + vendas offline/PIX-manual juntas (fecha o buraco do "controle à parte").
d. **Limpar logs `[DIAG]`** e **corrigir o botão de logout** (dívidas baratas da auditoria).

### Áreas novas (Seção estratégica — colhem o modelo de posse de dados)
**9. Área "Público" (uma por produtor).** Dashboard detalhado do público a partir dos dados próprios:
- quantidade por faixa de idade
- quantidade por faixa de idade **e** sexo
- quantidade por sexo
- aniversariantes por mês
- público por evento
- *(mais itens depois)*

**Sub-área "Aniversariantes"** dentro de Público: ver aniversariantes do mês e enviar mensagem **automática/semi-automática** (WhatsApp) pra promover a festa — evolução da campanha de aniversariantes que já converteu.

**Pré-requisitos / cuidados da área Público:**
- Depende de `birth_date` e `gender` **preenchidos e padronizados** no cadastro. Checar % de cadastros com idade/sexo válidos antes de montar os gráficos.
- Guardar junto: canal de aquisição (`affiliate_code`/`referral_source`) e recência (último evento) → permite segmentar ("foi nos últimos 3 eventos + faz niver esse mês") em vez de disparar pra todos.
- **LGPD:** dashboard expõe dados pessoais em massa → isolamento por tenant é obrigatório (um produtor só vê o público dele). Respeitar `marketing_consent` e oferecer descadastro nos envios.
- **WhatsApp:** disparo em massa por conta pessoal = bloqueio (já sentido). Caminho "de verdade" = **API oficial do WhatsApp Business** com modelos aprovados (semi-automático por natureza). Decidir nível de automação com os pés no chão.

### 8. Escala — plataforma multi-produtor (white-label)
**Decisão do Fernando:** escalar **mantendo o schema, o banco e a estrutura atuais**; mudar **só nome e design** ("envelopar/rebrand" a base existente, **não** reescrever).

**Modelo de acesso (requisito firme):** isolamento estrito por tenant — **cada produtor acessa SÓ os próprios dados** (eventos, pedidos, clientes, dashboard Público). **Fernando = super-admin da plataforma** vê **TUDO**, com recorte/filtro por produtor e por evento. Super-admin é um papel **acima** das organizações, distinto de um admin de produtor. (Atenção: produtores da mesma região são concorrentes diretos — vazar base de um pro outro destrói a confiança no produto.)

**Fundamentos multi-tenant obrigatórios (mesmo mantendo o schema — aplicar por cima, sem reescrita):**
- **Separar banco DEV e PRODUÇÃO** (hoje compartilham o mesmo Supabase). Pré-requisito de tudo.
- Camada de **`organizations` + `organization_id`** nas tabelas (migrar o evento atual pra uma org "ZDK/Caio").
- **RLS por tenant** (a regra mora no banco, não na tela) + **parar de usar `service_role` no admin** (ele ignora o RLS; um `WHERE` esquecido vaza dados entre produtores).
- `organization_members` (papéis por organização) + super-admin acima.
- Dinamizar a página do evento (hoje hardcoded `<HeroCopa/>`, ignora campos do `events` inclusive `banner_url`).
- Storage isolado por org (bucket privado + URLs assinadas).
- LGPD multi-controlador (cada produtor = Controlador; ZDK = Operadora de vários; DPA por onboarding).
- Fee por organização + onboarding de produtor.
- **Pentest de verdade** contra staging antes do 1º produtor externo.

> Detalhamento completo no documento **`sacode-auditoria-e-escala-v1.md`** (auditoria de segurança/antifraude + blueprint de escala), gerado nesta fase.

---

## 7. Como trabalhar com o Fernando (aplicar sempre)

1. **Passo a passo numerado e simplificado**, sem assumir conhecimento prévio.
2. **Dizer qual janela usar:** DEV (`npm run dev`), GIT (git/shell puro), CLAUDE (Claude Code). **SQL vai no Supabase SQL Editor**, nunca no PowerShell.
3. **Padrão sequencial:** próximo passo + o seguinte com condição ("rode X; se aparecer Y, rode Z; se algo estranho, cole aqui"). Ele decide se segue ou pausa. Não repetir passos quando ele cola a saída.
4. **Entrega de arquivos:** edição manual no VS Code/PowerShell, conteúdo completo pra copiar-colar. Arquivos grandes/com acento → artefato pra download (`present_files`); ele usa `Move-Item`.
5. **Commits:** mensagens em português minúsculo, pequenos e temáticos.
6. **Validar cada passo (checkpoint) antes de seguir.** SELECT antes de qualquer UPDATE.
7. **Fechamento de sessão:** gerar `contexto-sacode-vN.md`.

**Gotchas críticos:**
- **Dev e produção compartilham o MESMO banco Supabase** → cuidado redobrado com SQL destrutivo (SELECT é seguro). **Resolver isso é prioridade pré-escala.**
- "Success. No rows returned" no SQL Editor é **normal** pra UPDATE (não retorna linhas) — confirmar efeito com um SELECT depois.
- **Status de pedido pago = `approved`** (não `paid`). Faturamento real: `payment_status='approved' AND is_courtesy=false`.
- Nunca editar arquivos pela interface web do GitHub. Sempre `npm run build` antes de commitar. Conta de teste descartável pra fluxos destrutivos.
- PowerShell: `[`/`]` são curinga → `-LiteralPath "..."`; acentos "quebrados" no `Get-Content` = falso positivo.
- Login pós-Supabase SSR: `window.location.href` (não `router.push`+`refresh`). `force-dynamic` na página pública do evento (cache).

---

## 8. Jurídico (v1.0, publicado)
Sem meia-entrada; transferência gratuita até 6h antes via suporte; arrependimento em 7 dias; reembolso integral em até 30 dias em cancelamento/adiamento. ZDK = Operadora; Caio Lacerda (CNPJ 44.816.216/0001-03) = Controlador/Organizador; Fernando = DPO. **No multi-produtor:** cada produtor vira Controlador próprio; ZDK = Operadora de vários.

---

## 9. Como começar a próxima sessão
> Claude, retomando o SACODE. Anexo `contexto-sacode-v20.md` (pós-evento, produção descongelada). Quero atacar [ITEM DO BACKLOG DA SEÇÃO 6]. Ver também `sacode-auditoria-e-escala-v1.md` para segurança/escala.

**Sugestão de ordem de ataque:** (1) dívidas baratas + bugs que afetam confiança nos números (Resumo do admin, Admin>Pedidos listando tudo, virada de lote, sold_count, logout, [DIAG]); (2) features de operação (cancelar/reembolsar, pagamento manual/venda offline, detalhe de pedido, status PIX, reconciliação); (3) fundação multi-tenant (separar dev/prod → organizations → RLS por tenant → tirar service_role do admin); (4) área Público + Aniversariantes; (5) rebrand/white-label + onboarding; (6) pentest antes do 1º produtor externo.
