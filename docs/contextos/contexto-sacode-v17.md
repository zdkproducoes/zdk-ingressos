# Contexto SACODE — v17

**Data:** 01 de junho de 2026
**Sessão anterior:** v16 (Check-in completo + dashboard + CRUD de Lotes + bug crítico supabase-js)
**Próximo evento:** 07/06/2026 (6 dias)

---

## 1. Visão Geral do Projeto

**SACODE** é uma plataforma proprietária de ticketing construída pela **ZDK Produções** (Fernando Zedeque) para vender ingressos do artista **Caio Lacerda**. Objetivo estratégico: **possuir os dados dos clientes** (CPF, e-mail, telefone, histórico) como diferencial competitivo frente a plataformas terceiras.

**Evento de validação do MVP:**
- **SACODE 15ª Edição** com Caio Lacerda (Aquecimento Copa do Mundo)
- **Data:** 07 de junho de 2026 (domingo), portas ao meio-dia (12h)
- **Local:** Villa Jardim Bar, São Bernardo do Campo (ABC paulista, SP)
- **Line-up:** Caio Lacerda, Pagode do Gordinho, Danilo Barbosa, Farra dos Plays, Cantor GG, DJ Sant
- **Vendas:** ABERTAS. Lote ativo atual: **2º lote a R$ 25** (Promocional de R$ 15 já encerrou).
- **Vendas atuais (preocupante):** ~31 ingressos vendidos. Por isso foi montada campanha de tráfego (ver seção nova abaixo).

**Entidades-chave:**
- **Caio Lacerda** — headliner; conta Mercado Pago (User ID 658407697, CNPJ 44.816.216/0001-03).
- **ZDK Produções** — produtora do Fernando; Operadora sob a LGPD; DPO `privacidade@zdkproducoes.com.br`.

---

## 2. Stack Técnica

- **Frontend:** Next.js 14 (App Router, `src/`), Tailwind CSS
- **Backend/DB:** Supabase (Auth, DB, Storage, `@supabase/ssr`) — **mesmo banco dev e prod**
- **E-mail:** Resend + SMTP customizado, remetente `SACODE <nao-responda@cantorcaiolacerda.com.br>`
- **Pagamento:** Mercado Pago Checkout Pro, webhook HMAC ativo (Pix funcionando)
- **Hospedagem:** Vercel (auto-deploy do GitHub `main`)
- **Versionamento:** GitHub (`zdkproducoes/sacode-ingressos`, branch `main`)
- **Migrations:** alterações de schema direto no SQL Editor do Supabase

**Dev environment:**
- Windows + VS Code
- Três janelas PowerShell: **DEV** (servidor local), **GIT** (git), **CLAUDE** (Claude Code)
- Projeto em `C:\Users\fzede\OneDrive\Desktop\ZDK\Ticketeria\banco_de_dados\sacode-ingressos`

**Produção:** `https://sacode.cantorcaiolacerda.com.br`

---

## 3. O que foi feito na sessão v17

### ✅ Lote Teste escondido (URGENTE — RESOLVIDO)
Rodado no SQL Editor do Supabase:
```sql
UPDATE ticket_batches SET status='paused', is_visible=false
WHERE id='e7681424-0227-46cc-aece-f82326aeec09' AND name='Lote Teste'
RETURNING id, name, status, is_visible;
```
Confirmado: lote oculto. Risco de cliente comprar ingresso de teste (R$50) eliminado.

### ✅ Arte do topo (hero) atualizada (EM PRODUÇÃO)
- **Descoberta:** a imagem do topo é arquivo estático em `public/hero-copa.jpg` (NÃO está no Supabase nem em Storage). URL `/_next/image?url=%2Fhero-copa.jpg` confirma.
- **Aprendizado:** "rodei local e não mudou" era **cache** (do navegador + Next.js). Resolveu com `Ctrl+Shift+R` / Disable cache no DevTools. (Em casos mais teimosos: parar DEV, `Remove-Item -Recurse -Force .next`, `npm run dev`.)
- **Pegadinha:** Windows esconde extensões; o usuário tinha colado um PNG renomeado pra `.jpg`. Renomear NÃO converte os bytes — pode aparecer quebrado. No fim renderizou OK local e prod. **Se em produção a hero aparecer quebrada, a causa é essa: reexportar a imagem como JPG de verdade (por editor, não renomeando).**
- Commit: `evento: atualiza arte do topo (hero-copa)` → push → deploy OK.
- Arquivos `hero-copa-old` no `public/` são backup do usuário (sem impacto).

### ✅ Campanha de Tráfego no Meta Ads (PUBLICADA)
Contexto: vendas baixas (~31), faltando 6 dias. Usuário conectou o conector **Meta ADS** ao Claude.

**Diagnóstico crítico do PIXEL:**
- Pixel principal: **"Pixel Caio Lacerda | Sacode"**, ID `1415319082934143`, ativo no Meta.
- **PIXEL NÃO DISPARA NADA desde 22/março/2026** (estava configurado na ticketeira antiga; nunca foi instalado no site SACODE novo). Stats web vazios, server nunca disparou.
- **Conclusão:** campanha de CONVERSÃO não funciona (otimizaria às cegas). Por isso a campanha foi montada como **TRÁFEGO**, mirando público quente (não depende de pixel).

**Conta de anúncio usada:** `CA - Caio Lacerda | Sacode` (ID `1779584973842`), BRL, ativa.

**Público criado (custom audience):**
- **`Clientes Sacode - Eventos 2024-2026`** — ID `6958400671844`, status ACTIVE, ~1.000 pessoas (977 reais).
- Origem: planilha Excel do usuário, 977 nomes únicos (deduplicados, só eventos dos últimos 2 anos).
- Colunas enviadas: Email, Telefone (limpo p/ formato `5511999998888`), Primeiro Nome, Sobrenome, Cidade, Estado, Sexo (M/F). CPF e dados sensíveis NÃO enviados.
- LGPD: usuário confirmou que a Política cobre o uso (dados próprios). Aceitou Termos de Listas de Clientes no Meta.

**Públicos pré-existentes úteis (já na conta):**
- `Interação CL - 90D` (ID `6889899386044`) — ~5.000-5.900 pessoas de engajamento 90 dias. USADO na campanha.
- `Semelhante (BR, 1%) - Interação CL - 90D` (ID `6889901301044`) — lookalike pronto, disponível pra usar depois.

**Criativo (vídeo):**
- Usuário forneceu vídeo de show (Reel de jul/2025, 84s, HEVC, 720x1280).
- Claude cortou pra **22s** e converteu pra **H.264** (de 78MB → 11,9MB). Arquivo entregue: `sacode-anuncio-22s.mp4`.
- Vídeo é "atemporal" (sem data cravada na tela), mostra Caio cantando + Villa lotado + marca ZDK/Caio Lacerda. Serve.

**Estrutura da campanha PUBLICADA:**
- Campanha: `Sacode 15ed - Tráfego - Jun26`, objetivo **Tráfego**, sem CBO (orçamento no conjunto).
- Conjunto A: `A - Quente (Lista + Engajamento)`
  - Orçamento: **R$ 60/dia** (era R$45, subiu pra R$60)
  - Público incluído: `Clientes Sacode - Eventos 2024-2026` + `Interação CL - 90D`
  - Localização: Diadema, Santo André, São Bernardo do Campo, São Caetano do Sul (ABC)
  - Idade: 18-45, todos os gêneros
  - Tamanho estimado: ~3.800-4.400 (certeiro)
  - Advantage+ ligado (não bloqueante)
- Anúncio: página **Sacode do Lacerda** (Facebook) + `sacodedolacerda` (Instagram). Vídeo 22s. Destino Site → `https://sacode.cantorcaiolacerda.com.br/evento/sacode-15-edicao`. CTA "Ver detalhes". Rastreamento de eventos do site DESMARCADO (pixel inativo, correto assim).
- Textos do anúncio (público quente):
  - Principal: "Você já sacudiu com a gente — e o próximo é o maior de todos. 🔥 / Domingo, 07/06, o Sacode do Lacerda volta ao Villa Jardim (SBC) com Caio Lacerda, Pagode do Gordinho, Danilo Barbosa, Farra dos Plays, Cantor GG e DJ Sant. / Quatro dias antes da Copa, a gente esquenta os tambores. 🥁⚽ / 🎟️ Últimos ingressos antecipados — depois sobe na porta."
  - Título: "Sacode do Lacerda — 07/06 no Villa Jardim"
  - Descrição: "Garanta o seu antecipado a partir de R$ 25"
- 2 avisos de posicionamento (Coluna direita FB + Status WhatsApp) — inofensivos, ignorados.
- Aprimoramentos Advantage+ de IA (retoques de vídeo / melhorias de texto) ficaram LIGADOS (usuário não achou como desativar; não bloqueante).
- **Status: PUBLICADA** → em análise do Meta.

**Texto pronto pro 2º anúncio (Lookalike), guardado pra quando escalar:**
- Principal: "O melhor pagode do ABC tem nome: Sacode do Lacerda. 🎶 / Domingo, 07/06, ao meio-dia, no Villa Jardim Bar (São Bernardo). Caio Lacerda + 5 atrações pra não parar de cantar. / Aquecimento oficial da Copa — samba, pagode e piseiro do começo ao fim. ⚽🍻 / 🎟️ Ingressos antecipados a partir de R$ 25. Bora?"
- Título: "O domingo de pagode que o ABC esperava"

---

## 4. Decisão adiada nesta sessão: aba "Evento" no Admin

Usuário pediu uma aba Admin pra editar nome/local/descrição/imagem/etc. do evento.

**Descoberta importante:** a página `src/app/evento/[slug]/page.tsx` usa componentes com conteúdo **CHUMBADO** (`<HeroCopa />`, `<CopyAbertura />`, `<InfoEvento />`, `<LineupSection />`, `<MapaSection />` — chamados SEM props). A tabela `events` tem os campos (title, venue_name, description, etc. + a coluna **`banner_url`** que existe mas NÃO é usada hoje), mas a página IGNORA o banco. Editar o banco não mudaria a página.

**Conclusão:** fazer a aba Evento exige "dinamizar" a página (passar dados do `event` como props aos componentes). É trabalho de risco a 6 dias do evento. **ADIADO conscientemente.** Decisão pendente pro pós-evento: dinamizar a página é essencial se for reusar a plataforma para eventos futuros.

Colunas reais da tabela `events`: id, producer_id, title, slug, description, banner_url, event_date, event_time, doors_open_time, venue_name, venue_address, venue_neighborhood, venue_city, venue_state, venue_zip, venue_lat, venue_lng, age_rating, age_rating_notes, half_price_policy, status, service_fee_percent, max_tickets_per_cpf, whatsapp_number, additional_info, published_at, created_at, updated_at.

---

## 5. Plano de Retomada (Próxima Sessão)

### Prioridade 1 — Acompanhar a campanha (em ~2 dias, ~03-04/06)
- Ler métricas via Meta ADS no Claude: cliques, CPC, alcance, visitas ao site.
- **NÃO mexer no anúncio nos primeiros 1-2 dias** (reinicia fase de aprendizado).
- Decidir: escalar orçamento do conjunto A OU ativar 2º conjunto com lookalike `Semelhante (BR, 1%) - Interação CL - 90D` + texto já pronto (seção 3).
- Reserva de verba disponível: ~R$120 (teto era R$300-700; R$60/dia x 6 ≈ R$360 comprometido).

### Prioridade 2 — Bugs técnicos pendentes do evento
1. **🔴 Bug do modal de edição de lotes** — pausar/desmarcar visibilidade pelo admin NÃO refletia no banco (contornado com SQL). Causa não identificada. Hipóteses: payload errado do `LoteFormModal.tsx`, API PATCH `action=update` não aplica todos os campos, ou `revalidatePath` faltando. Investigar editando um lote e conferindo o SQL Editor.
2. **Limpar código de DIAG do checkout** — `src/app/checkout/page.tsx` ainda tem bloco de logs `[DIAG ${reqId}]` (3 queries paralelas) em produção. Manter só fix `.order('id')` + lógica `availableBatches` + card ESGOTADO.
3. **Bug supabase-js `.order('sort_order')`** — zera resultados no checkout (contornado com `.order('id')`). Ainda presente em `evento/[slug]/page.tsx` e `admin/lotes/page.tsx`. Testar se `{ ascending: true }` explícito resolve; padronizar.

### Prioridade 3 — Pixel (pós-evento, mas estratégico)
- Instalar o pixel `1415319082934143` no site SACODE (Next.js) e disparar `PageView` + **`Purchase`** (no momento em que o webhook do Mercado Pago confirma o pagamento e gera o QR).
- NÃO ajuda nas vendas deste evento (sem tempo de acumular dados), mas é a base de TODAS as campanhas futuras (conversão real + lookalike de compradores).
- Trabalho de código: precisa ver `layout.tsx` raiz + ponto de confirmação de compra.

### Smoke test pré-evento (3-4 dias antes)
- Comprar 1 ingresso real com Pix em produção end-to-end (login, escolha, MP, e-mail).
- Validar 1 QR no `/checkin/sacode-15-edicao` em produção, no celular.
- Conferir `/admin/checkin` (tabela + gráfico) e `/admin/resumo` (totais corretos).

### No dia do evento (07/06)
- Compartilhar login `checkin@cantorcaiolacerda.com.br` com hostess (WhatsApp efêmero ou pessoalmente).
- Monitorar logs Vercel + Mercado Pago.
- Ter `/admin/checkin` aberto pra acompanhar entradas em tempo real.

---

## 6. Identificadores e Recursos Úteis

- **Evento ID (SACODE 15ª Edição):** `6539575d-7a71-4c50-8f62-955bc5a96947`
- **Slug:** `sacode-15-edicao`
- **URL evento prod:** `https://sacode.cantorcaiolacerda.com.br/evento/sacode-15-edicao`
- **URL check-in prod:** `https://sacode.cantorcaiolacerda.com.br/checkin/sacode-15-edicao`
- **URL admin/checkin prod:** `https://sacode.cantorcaiolacerda.com.br/admin/checkin`
- **Supabase project ID:** `nsbyylbgnmzlgfwzgasl` (região São Paulo)
- **MP Access Token:** termina em `APP_USR-2508548`
- **Chave Pix:** `financeiro@cantorcaiolacerda.com.br`
- **MP User ID Caio:** 658407697 / **CNPJ:** 44.816.216/0001-03
- **Lote Teste (oculto):** id `e7681424-0227-46cc-aece-f82326aeec09`
- **Hero do topo:** `public/hero-copa.jpg` (arquivo estático no repo)

### Meta Ads
- **Conta de anúncio:** `CA - Caio Lacerda | Sacode`, ID `1779584973842`, BRL
- **Business:** `BM - Caio Lacerda / Sacode`, ID `378877677228099`
- **Pixel:** `Pixel Caio Lacerda | Sacode`, ID `1415319082934143` (INATIVO no site novo — instalar)
- **Custom audience nova:** `Clientes Sacode - Eventos 2024-2026`, ID `6958400671844` (~1.000)
- **Engajamento:** `Interação CL - 90D`, ID `6889899386044` (~5-6 mil)
- **Lookalike pronto:** `Semelhante (BR, 1%) - Interação CL - 90D`, ID `6889901301044`
- **Páginas:** "Sacode do Lacerda" (FB) + `sacodedolacerda` (IG) — usar SEMPRE a do Sacode, não a do Caio
- **Campanha publicada:** `Sacode 15ed - Tráfego - Jun26` / Conjunto `A - Quente (Lista + Engajamento)` R$60/dia

### Login compartilhado de Check-in
- **E-mail:** `checkin@cantorcaiolacerda.com.br`
- **UID:** `a188e6cf-3531-4f63-a99b-9ecf13ad9d10`
- **Profile:** role=`checkin`, cpf placeholder `00000000000`, full_name "Equipe Check-in SACODE"
- **Senha:** guardada pelo Fernando

### Estado dos lotes (snapshot fim v17)
| Lote | Status | Visible | Quantity | Sold | Price |
|---|---|---|---|---|---|
| Cortesia | active | false (oculto) | 500 | 5 | R$ 0 |
| Ingresso Promocional | (encerrado/esgotado) | true | 100 | 21 | R$ 15 |
| **Lote Teste** | **paused** | **false (oculto)** ✅ | 99 | 0 | R$ 50 |
| Ingresso 2º Lote (ativo) | active | true | — | — | R$ 25 |
| Ingresso Único - Lote 03 | scheduled | true | 1000 | 0 | R$ 35 |

---

## 7. Princípios de interação com o Fernando

Fernando se identifica como **desenvolvedor iniciante** e **leigo em tráfego pago**. Sempre seguir:

1. **Passo a passo numerado**, sem assumir conhecimento prévio.
2. **Sempre especificar a janela PowerShell:** DEV / GIT / CLAUDE.
3. **SQL roda no Supabase SQL Editor (navegador), NUNCA no PowerShell** — ele já confundiu uma vez.
4. **Formato sequencial:** próximo passo + condicional. Esperar ele colar output antes de seguir.
5. **Edição manual via VS Code preferida** sobre Claude Code; arquivos grandes/múltiplos trechos → entregar completo por download.
6. **Edições cirúrgicas via str_replace** quando 1-2 trechos.
7. **Git workflow:** commits temáticos em português; sempre `npm run build` antes de commitar código; nunca push sem teste visual.
8. **Confirmar antes de SQL destrutivo** — dev e prod compartilham banco; usar ID cravado.
9. **Dados sensíveis (CPF, e-mails reais):** respeitar quando ele optar por não colar outputs / não subir dados.
10. **Em tráfego pago:** Claude NÃO publica anúncios nem gasta a verba sozinho. Monta/orienta; o usuário revisa e clica em publicar. Decisões de orçamento/público são dele. Avisar sempre sobre o que protege a verba (geolocalização, público certo).
11. **Sessão longa pode encerrar com pendências documentadas neste contexto.**
12. **Continuidade:** Fernando usa arquivos versionados `contexto-sacode-vN.md` pra carregar estado entre conversas.

---

## 8. Aprendizados técnicos acumulados (mantidos + novos)

### Novos da v17
- **Hero/imagens do topo:** arquivo estático em `public/`, servido como `/hero-copa.jpg` via `/_next/image`. Trocar = substituir arquivo + commit + push.
- **"Não mudou ao trocar imagem" = cache.** `Ctrl+Shift+R`; se persistir, apagar `.next` e reiniciar DEV.
- **Renomear PNG→JPG no Windows não converte os bytes.** Pode quebrar. Reexportar por editor se necessário.
- **Windows esconde extensões por padrão** — pode mascarar formato errado. Ativar "Extensões de nomes de arquivos".
- **Coluna `banner_url` existe em `events` mas não é usada** — caminho limpo pra futura edição de imagem por painel.
- **Pixel configurado em ticketeira antiga para de disparar ao migrar** — precisa reinstalar no site novo.
- **Campanha de conversão exige pixel disparando `Purchase`** — sem isso, usar objetivo Tráfego com público quente.
- **Custom audience (lista própria) NÃO depende de pixel** — desvia do problema do pixel; ótima pra prazo curto.
- **No Gerenciador Meta:** "público salvo" ≠ "público personalizado" — ficam em campos diferentes. Personalizado entra em "Incluir estes públicos personalizados" (sob "Sugira um público" com Advantage+).
- **Erro clássico de iniciante:** deixar localização "Brasil" (160MM pessoas) — sempre apertar geografia primeiro; o "Tamanho estimado" é o termômetro.
- **Telefone pro Meta:** só dígitos com país, `5511999998888` (sem `+`, espaço, parênteses, traço).

### Mantidos das versões anteriores
- `force-dynamic` + `revalidate=0` obrigatório em páginas server com dados que mudam; `force-dynamic` não invalida Router Cache do client (usar `revalidatePath`).
- Edição copy-paste pode cortar blocos: validar contagem de chaves `{` vs `}` no PowerShell. Se >2 trechos, entregar arquivo completo por download.
- Tipagem Supabase em joins `!inner(...)` pode vir array ou objeto: `Array.isArray(x) ? x[0] : x`.
- PowerShell trata `[` `]` como wildcards — usar `-LiteralPath`. `curl` é alias de `Invoke-WebRequest`.
- Agregação em memória > múltiplas queries em volume pequeno.
- `maybeSingle()` > `single()` em consultas opcionais.
- Dev e prod compartilham banco — nunca DELETE/TRUNCATE sem ID cravado e dupla checagem.
- `.or()` do PostgREST é frágil — preferir 2-3 queries separadas + dedupe via Map/Set.
- iOS exige HTTPS pra câmera (getUserMedia); testar check-in em produção (Vercel = HTTPS).
- Web Audio API funciona em todos os navegadores móveis (beeps sem arquivo).
- Mercado Pago só mostra Pix em janela anônima (logado como vendedor esconde).
- SQL Editor mostra a realidade do banco; supabase-js pode divergir — validar com `console.log` nos Vercel Logs.

---

**Fim do contexto v17. Sessão focada em: esconder Lote Teste, atualizar arte do topo, e — principal — diagnosticar o pixel morto e publicar a primeira campanha de tráfego no Meta (público quente da lista de 977 + engajamento, R$60/dia, vídeo de 22s). Próxima sessão: ler métricas da campanha em ~2 dias e decidir escalar/lookalike; depois atacar os bugs técnicos pendentes (modal de lotes, DIAG do checkout, sort_order) e instalar o pixel. Evento em 6 dias.**
