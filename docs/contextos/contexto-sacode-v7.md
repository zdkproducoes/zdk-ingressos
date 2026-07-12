# Contexto SACODE — v7

> Atualizado em **02/05/2026** (sábado, fim de tarde) após sessão de bugfixes pré-lançamento.
> Cole esse arquivo no próximo chat junto com a frase: *"Claude, retomando o projeto SACODE. Anexo contexto-sacode-v7.md."*

---

## 🎯 Projeto

**Fernando Zedeque (ZDK Produções)** construindo plataforma própria de venda de ingressos. MVP validado no evento **SACODE 15ª Edição (Aquecimento Copa)** — artista Caio Lacerda, **07/06/2026** no Villa Jardim Bar (SBC/ABC paulista).

**Lançamento das vendas previsto:** **04/05/2026 às 12h** (~36h após o fim dessa sessão).

## 🛠 Stack

Next.js 14 + Tailwind / Supabase (Auth+DB+Storage) / Resend / Mercado Pago (HMAC ativo) / Vercel / GitHub.

---

## ✅ O que foi resolvido nessa sessão (02/05)

Todos os 3 P-CRÍTICOS do v6 + bugs descobertos no caminho. Tudo em produção:

| Bug | Causa | Fix |
|---|---|---|
| **Open Graph** (WhatsApp/FB sem prévia) | Middleware retornava 403 pra crawlers | Bypass de `facebookexternalhit\|WhatsApp\|Twitterbot\|LinkedInBot\|Slackbot\|TelegramBot\|Googlebot\|bingbot\|Discordbot\|SkypeUriPreview\|Applebot` no início do `middleware.ts` |
| **P-CRÍTICO 1** Checkout sem auth | (já resolvido antes da sessão) | Login obrigatório funcionando |
| **P-CRÍTICO 2** Quantidade zerada no checkout | `CheckoutClient` nunca lia o localStorage. Wrapper salvava em `'cart'` mas client iniciava `qty={}` | `useEffect` lê `'cart'`, valida TTL 2h via `addedAt`, faz clamp contra `min/max_per_order`, limpa cart se `loteId` não está mais ativo |
| **P-CRÍTICO 3** Todos lotes no checkout | Query sem `.eq('status', 'active')` | Adicionado filtro + 4 lotes do banco que estavam todos `active` foram corrigidos: 1 active + 3 scheduled |
| **Dívida no banco** | Constraint `ticket_batches_status_check` não aceitava `'scheduled'` (só active/sold_out/ended/paused) — código TypeScript usava esse valor | `ALTER TABLE` adicionou `'scheduled'` ao CHECK |
| **Login travado em "Entrando..."** (P5/P6 do v6) | `setLoading(false)` faltando no caminho de sucesso + `router.push`+`router.refresh` causavam race condition | Trocado por `window.location.href` + `setLoading(false)` antes do redirect + try/catch |
| **Mapa OpenStreetMap feio** | Componente Leaflet/OSM | Substituído por iframe Google Maps embed (sem API key), `w-full`, altura 350px |

## 🗄 Estado atual do banco (`ticket_batches` do evento `sacode-15-edicao`)

```
sort_order | name                       | price | status
1          | Ingresso Promocional       | 15    | active
2          | Ingresso Único - Lote 01   | 20    | scheduled
3          | Ingresso Único - Lote 02   | 25    | scheduled
4          | Ingresso Único - Lote 03   | 35    | scheduled
```

`event_id = '6539575d-7a71-4c50-8f62-955bc5a96947'`. Todos com `is_visible=true`, `sold_count=0`.

## 📐 Contratos importantes (LocalStorage)

Wrapper do card → Checkout, chave **`'cart'`**:
```ts
[{ loteId, quantity, price, name, addedAt: ISO_string }]
```
Checkout descarta se `addedAt` > 2h, ou se `loteId` não está em `batches` ativos. Faz clamp da quantity contra `min_per_order`/`max_per_order`.

## 📝 Decisões da sessão e o porquê

- **localStorage como fonte única de verdade entre card→checkout** (em vez de query params): wrapper já tentava esse padrão; menor retrabalho. Single-lote por vez (não array) — overengineering pra futuro multi-lote.
- **TTL de 2h no carrinho**: evita estado fantasma se usuário voltar 3 dias depois com lote já mudado.
- **`scheduled` no banco em vez de workaround com `paused`**: alinha código (TypeScript já usava) com banco. Pavimenta caminho do painel admin futuro de eventos.
- **`window.location.href` em vez de `router.push`+`router.refresh` pós-login**: padrão recomendado Supabase SSR; força navegação completa, lê cookie fresco no próximo request, elimina race condition.
- **Iframe embed Google Maps em vez de JS API**: zero API key, zero custo, suficiente pro caso "mostrar local do evento".
- **Mantidos nomes atuais dos lotes** ("Ingresso Promocional" / "Ingresso Único - Lote 01-03") — pedido do Fernando.

## 🚦 Próximo passo exato (pendente)

**Recuperação de senha** — feature ainda não implementada, **bloqueante pré-lançamento** (já era do v6). Estimativa: 2-3h.

**Decisão pendente do Fernando:** atacar agora (sábado fim de tarde) ou retomar domingo cedo, antes do lançamento de 12h. Não há margem pra empurrar mais que isso.

Fluxo a implementar: tela `/recuperar-senha` com input de e-mail → chama `supabase.auth.resetPasswordForEmail()` com `redirectTo` pra uma rota nova `/redefinir-senha` → callback recebe token, exibe form de nova senha → chama `supabase.auth.updateUser({password})`. Configurar template de e-mail no Supabase Dashboard. Adicionar link "Esqueci minha senha" no `LoginForm.tsx`.

## 🐛 Bugs/dívidas conhecidos não-bloqueantes

- **FOUC navbar** (P5/P6) — parcialmente atacado mas o flash visual ainda existe. Cosmético. Fase 2.
- **Affiliate tracking** — não foi smoke-testado em produção nessa sessão (estava no roteiro v6 mas pulamos pra ganhar tempo). Vale rodar o teste `?ref=TESTE_PROD` antes de abrir vendas.
- **Pendências v5 ainda valem:** painel admin editável (CRUD evento), Embaixadores SACODE, área "Meu Perfil", transferência de titularidade self-service, P1/P2/A1/TD1.

## 🎨 Decisões de design vigentes (inalteradas)

- Skin Copa **só em** `/evento/sacode-15-edicao`. Resto do site = paleta vinho SACODE.
- Lote único exibido sem contador (a menos que ≥90% vendido OU <24h pra próximo lote — `calcularUrgencia` em `lote-helpers.ts`).
- Logo PNG transparente nas barras.

## 📜 Decisões jurídicas vigentes

Termos com advogado. Caio Lacerda (CNPJ 44.816.216/0001-03) é Organizador+Controlador; ZDK é Operadora. Sem meia-entrada. Direito de arrependimento 7d. Cancelamento: cliente escolhe crédito/reembolso. DPO: `privacidade@zdkproducoes.com.br`.

## 🔧 Como começar a próxima sessão

> Claude, retomando o projeto SACODE. Anexo `contexto-sacode-v7.md` com o estado pós-sessão de bugfixes do dia 02/05. Os 3 P-CRÍTICOS estão resolvidos em produção. A pendência bloqueante restante é **recuperação de senha** — vamos implementar agora antes do lançamento de [DATA] às 12h.

**Fim do contexto v7.**
