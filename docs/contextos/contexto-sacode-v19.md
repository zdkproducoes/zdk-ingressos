# Contexto SACODE — v19

> Documento de continuidade. Cole/suba este arquivo no início de uma nova conversa para dar sequência ao projeto.
> Atualizado ao final de uma sessão curta de verificação (Pix, relatório de pagamentos, status da campanha Meta). Evento-alvo: **07/06/2026** — faltam ~3 dias. **Decisão central desta sessão: produção CONGELADA até o evento.**

---

## 1. Quem é / o que é

**Fernando Zedeque (ZDK Produções)** está construindo o **SACODE**, plataforma própria de ingressos para os eventos do artista **Caio Lacerda**. O diferencial estratégico é a **posse dos dados do cliente** (CPF, e-mail, telefone, histórico) para marketing direto — por isso a plataforma é própria, e não de terceiros. Visão de longo prazo: virar um SaaS de ingressos multi-produtor.

O MVP está sendo validado no evento real **SACODE 15ª Edição** (tema aquecimento da Copa), **07/06/2026**, no **Villa Jardim Bar**, Av. Marginal Direita 235, São Bernardo do Campo (ABC Paulista). Atrações: Caio Lacerda (headliner), Pagode do Gordinho, Danilo Barbosa, Farra dos Plays, Cantor GG, DJ Sant.

Fernando se considera **dev iniciante** — ver seção 6 (como trabalhar comigo).

---

## 2. Stack & identificadores-chave

**Stack:** Next.js 14 (App Router, `src/`), Supabase (Auth/DB/Storage), Tailwind, Mercado Pago Checkout Pro, Resend (e-mail), Cloudflare Turnstile, Vercel, GitHub.

- Produção: `https://sacode.cantorcaiolacerda.com.br`
- Página do evento: `/evento/sacode-15-edicao`
- Projeto local: `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`
- Repo: `zdkproducoes/sacode-ingressos` (branch `main`)
- Supabase project ID: `nsbyylbgnmzlgfwzgasl`
- Event ID: `6539575d-7a71-4c50-8f62-955bc5a96947` · slug: `sacode-15-edicao`
- Suporte: `ingressos@cantorcaiolacerda.com.br` · Check-in: `checkin@cantorcaiolacerda.com.br`
- DPO/privacidade: `privacidade@zdkproducoes.com.br` · CNPJ controlador: 44.816.216/0001-03
- **Chave PIX:** `financeiro@cantorcaiolacerda.com.br`

**Meta Ads:**
- Conta de anúncios: `1779584973842`
- Campanha: `Sacode 15ed - Tráfego - Jun26` (ID `6958415932844`, objetivo TRÁFEGO/LINK_CLICKS)
- Conjunto: `A - Quente (Lista + Engajamento)` (ID `6958415932644`)
- Anúncio: `Novo anúncio de Tráfego` (ID `6958415933044`)
- Afiliado de medição do anúncio: code **`ads`** → link `…/evento/sacode-15-edicao?ref=ads`

---

## 3. Estado atual da plataforma (no ar e VALIDADA para o evento)

Plataforma **em produção**, com ingressos pagos e cortesias já vendidos/emitidos. Confirmado funcionando:
- Auth completo (cadastro, login, recuperação de senha via Route Handler server-side)
- Página do evento com skin temática da Copa
- **Mercado Pago Checkout Pro com PIX FUNCIONANDO** (parcelamento desligado). PIX é hoje o **principal meio de pagamento** (ver seção 4.1).
- Webhook validado via API do MP (não HMAC) — funcionando
- Painel admin: abas Resumo, Pedidos, Lotes, Compradores
- Sistema de **cortesias** (admin emite 1–10 por pedido, por CPF/e-mail)
- Módulo de **afiliados** (Etapa B): CRUD completo em `/admin/afiliados`, magic link, atribuição de vendas — funcionando em produção
- **Check-in (Etapa 3): IMPLEMENTADO E VALIDADO/TESTADO** ✅ (era o item URGENTE da v18; está pronto e conferido)
- Páginas legais (`/termos`, `/privacidade`)
- Busca pública de ingresso em `/buscar-ingresso` (CPF + nº do pedido)
- `audit_logs` para ações de admin

**Resumo do "está tudo pronto pro dia 07":** vendas entrando, PIX convertendo, check-in testado, campanha rodando. Daqui pra frente é OPERAÇÃO, não desenvolvimento.

---

## 4. O que aconteceu nesta sessão

### 4.1 PIX confirmado funcionando + relatório de meios de pagamento (via SQL)
- O bloqueio do PIX da v18 (conta MP retornando tipo `personal`) **está RESOLVIDO**. PIX funcionando e é a **maioria absoluta das vendas**.
- Relatório levantado direto no banco (Supabase SQL Editor), só leitura, pedidos pagos e **excluindo cortesias**:
  - **PIX: 36 vendas — R$ 1.298,00** (~88% das vendas pagas)
  - **Cartão de crédito: 5 vendas — R$ 269,50**
  - **Total: 41 vendas pagas — R$ 1.567,50**
- Panorama de status dos pedidos (tabela `orders`): **50 `approved`**, 9 `pending`, 6 `cancelled`, 1 `rejected`. Os 50 `approved` menos os 41 pagos-não-cortesia = **9 cortesias** (`is_courtesy = true`).

### 4.2 ACHADO IMPORTANTE — valor de status pago é `approved`, NÃO `paid`
- A coluna correta é `payment_status` e o valor de pago é **`approved`** (termo do Mercado Pago). **Não existe `'paid'`** nesse banco.
- **Esta é quase certamente a causa raiz da "supercontagem do resumo do admin"** anotada como bug — alguma query do resumo deve estar filtrando por `'paid'` (que volta vazio) ou sem filtro. Corrigir trocando o filtro para `payment_status = 'approved'`.
- Estrutura confirmada da tabela `orders` (colunas relevantes): `id`, `order_number`, `event_id`, `customer_id`, `affiliate_code`, `coupon_id`, `subtotal`, `service_fee`, `discount`, `total`, **`payment_method`** (já existe! valores limpos: `pix`, `credit_card`), **`payment_status`** (valor pago = `approved`), `payment_gateway`, `payment_gateway_id`, `payment_gateway_data` (jsonb), `paid_at`, `cancelled_at`, `cancellation_reason`, `created_at`, `updated_at`, **`is_courtesy`** (boolean), `courtesy_issued_by`.

**SQL do relatório de pagamentos (pronto, é só rodar quando quiser o número atualizado):**
```sql
SELECT
  payment_method,
  COUNT(*) AS qtd,
  SUM(total) AS faturamento
FROM orders
WHERE payment_status = 'approved'
  AND is_courtesy = false
GROUP BY payment_method
ORDER BY qtd DESC;
```

### 4.3 Campanha Meta — verificada, está saudável e rodando
- **Status: ATIVA e entregando** em todos os níveis (campanha + conjunto). A pausa automática que aconteceu ao reduzir o orçamento na v18 **NÃO travou** — está entregando normal.
- **Orçamento confirmado em R$20,00/dia** no conjunto (a redução R$60→R$20 pegou).
- Desempenho acumulado (LIFETIME): gasto **R$ 239,88**, alcance ~35.500, 1.690 cliques, **CPC R$ 0,14**, **CTR 3,53%**.
- Últimos 3 dias (já em R$20/dia): R$ 131,61 gastos, 1.028 cliques a R$ 0,13, CTR 3,72%.
- **Leitura:** clique barato e estável, mas tráfego frio/amplo. Papel definido = **alcance/lembrança + aposta em venda de portaria**, NÃO motor de venda. Quem vende é o link pessoal (campanha de aniversariantes). Até o dia 07 gasta no máximo mais ~R$60. **Sem ação necessária.**

### 4.4 Decisão de congelamento
- A 3 dias do evento, com tudo validado, **NÃO se mexe em produção.** Regra aplicada: só fazer deploy do que afete vender / fazer check-in / confiar nos números durante o evento. Nada se qualificou. Todos os bugs e melhorias foram para o pós-evento.
- Fernando confirmou: **não vai mais mexer em lotes** (uma mudança de lote foi feita direto no banco e deu certo). O bug do modal de lotes fica para o pós-evento.

---

## 5. Próximos passos

### Até o evento (07/06) — só OPERAÇÃO, zero código
**A. Tocar a campanha de aniversariantes (motor de venda).**
- Planilha `aniversariantes-sacode-whatsapp.xlsx` (53 aniversariantes de junho, link `wa.me` + mensagem pronta). Enviar de cima pra baixo (aniversários mais próximos primeiro; **Rodolfo e Roney fazem niver no dia 07**, abordar primeiro). Enviar aos poucos (evitar bloqueio de spam no WhatsApp). Quando alguém topar, gerar o link de afiliado pessoal em `/admin/afiliados` e enviar.
- **Oferta (não acumulativa — vale a maior meta):** aniversariante + 2 convidados = cortesia · 15 pagantes = Smirnoff · 30 = Absolut · 50 = Jack Daniels ou Tanqueray.
- **Pendência oferecida:** montar planilha de controle "convidado → aniversariante" pra fechar as metas de garrafa no dia. *(Claude se ofereceu pra construir — pedir na próxima conversa se quiser.)*

**B. (Opcional) Smoke test final** — se ainda não fez, comprar 1 ingresso real com conta de teste descartável e validar QR no check-in. (Check-in já está validado, então é só conforto extra.)

### Pós-evento — fila de melhorias/bugs (NADA disso antes do dia 07)
1. **Relatório de meios de pagamento no painel admin** — levar a quebra PIX/cartão (SQL da seção 4.2) pra aba Resumo, como bloco visual / cards de métrica.
2. **Fix da supercontagem do Resumo do admin** — trocar filtro para `payment_status = 'approved'` (ver achado 4.2). Reformatar Resumo em cards: ingressos pagos, cortesias, faturamento bruto, taxas, ticket médio.
3. 🔴 **Bug do modal de edição de lotes** — não dá pra ativar/pausar/ocultar lote pela UI (hoje depende de SQL na mão).
4. Limpar logs `[DIAG]` do checkout em produção.
5. Botão de **logout** não funciona (workaround: limpar cookies/localStorage).
6. **FOUC** na navbar.
7. Bug do `sort_order`.

### Futuro (estratégico, pós-evento)
- **Instalar o pixel do Meta** (está "morto", não dispara `Purchase`) → destrava conversão/retargeting/públicos de interesse de verdade.
- Criar de verdade o público salvo "fãs de pagode ABC" (precisa dos IDs de interesse do Meta — montar no Gerenciador ou fornecer IDs).
- Etapa C dos afiliados (painel público com magic link/token).
- Programa **Embaixadores do Sacode** (comissão 10%/ingresso, brindes por volume; revisão jurídica do termo antes da 1ª comissão; **nunca usar "multinível" publicamente**).
- Expansão SaaS multi-produtor (onboarding, UI de cupom, transferência self-service de ingresso) — Fase 2.

---

## 6. Como trabalhar comigo (padrões a aplicar sempre)

1. **Passo a passo numerado e simplificado**, sem assumir conhecimento prévio.
2. **Sempre dizer qual janela do PowerShell usar:** DEV (`npm run dev`), GIT (git e shell puro), CLAUDE (Claude Code).
3. **Padrão sequencial:** dar o próximo passo + o seguinte com condição ("rode X; se aparecer Y, rode Z; se algo estranho, cole aqui"). Fernando decide se segue ou pausa. Não repetir passos anteriores quando ele colar a saída.
4. **Entrega de arquivos:** preferir edição manual no VS Code / PowerShell, com conteúdo completo para copiar-colar. Arquivos grandes ou com acento → entregar como artefato para download (`present_files`); ele usa `Move-Item`. Evitar diffs parciais em arquivos já editados manualmente várias vezes.
5. **Commits:** mensagens em português minúsculo, pequenos e temáticos.
6. **Shell:** sugerir a janela **GIT** (PowerShell puro) — o Claude Code interpreta comandos como perguntas.
7. **Validar cada passo antes de seguir** (padrão de checkpoint).

**Gotchas críticos:**
- **Dev e produção compartilham o MESMO banco Supabase** → confirmar antes de qualquer SQL destrutivo. (Consultas de leitura/SELECT são seguras.)
- **Nunca editar arquivos pela interface web do GitHub** (causou builds quebrados).
- **Sempre `npm run build` local antes de commitar.**
- Usar **conta de teste descartável** para fluxos destrutivos.
- PowerShell: `[` e `]` são curinga → usar `-LiteralPath "..."` com aspas; `git add "src/...[id]/"` com aspas duplas. `Get-Content` mostra acentos UTF-8 "quebrados" → **falso positivo**, não trocar arquivo por isso. Variáveis não persistem entre sessões (re-declarar `$token` etc.).
- **Login pós-Supabase SSR:** usar `window.location.href` (não `router.push`+`refresh`); `exchangeCodeForSession` roda **server-side** (Route Handler) com `@supabase/ssr`.
- Trigger `handle_new_user` cria o profile no signup → a rota de signup deve **UPDATE**, nunca INSERT.
- Cache do Router do Next pode servir listagem velha → `revalidatePath()` nos route handlers; página pública do evento usa `force-dynamic`.
- **Status de pedido pago = `approved`** (não `paid`). Filtrar sempre por `payment_status = 'approved'` e, para faturamento real, `is_courtesy = false`.

---

## 7. Jurídico (v1.0, publicado)
Sem meia-entrada; transferência de ingresso gratuita até 6h antes via suporte; direito de arrependimento em 7 dias; reembolso integral em até 30 dias em caso de cancelamento/adiamento. ZDK = Operadora; Caio Lacerda (CNPJ 44.816.216/0001-03) = Controladora/Organizadora; Fernando = DPO.
