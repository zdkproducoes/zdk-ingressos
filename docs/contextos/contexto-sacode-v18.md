# Contexto SACODE — v18

> Documento de continuidade. Cole/suba este arquivo no início de uma nova conversa para dar sequência ao projeto.
> Atualizado ao final da sessão de marketing (campanha Meta + campanha de aniversariantes). Evento-alvo: **07/06/2026**.

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

**Meta Ads (usado nesta sessão):**
- Conta de anúncios: `1779584973842`
- Campanha: `Sacode 15ed - Tráfego - Jun26` (ID `6958415932844`, objetivo TRÁFEGO/LINK_CLICKS)
- Conjunto: `A - Quente (Lista + Engajamento)` (ID `6958415932644`)
- Anúncio: `Novo anúncio de Tráfego` (ID `6958415933044`)
- Afiliado de medição do anúncio: code **`ads`** → link `…/evento/sacode-15-edicao?ref=ads`

---

## 3. Estado atual da plataforma (já no ar)

Plataforma **em produção**, com ingressos pagos e cortesias já vendidos/emitidos. Já entregue:
- Auth completo (cadastro, login, recuperação de senha via Route Handler server-side)
- Página do evento com skin temática da Copa
- Mercado Pago Checkout Pro (parcelamento desligado)
- Webhook validado via API do MP (não HMAC) — funcionando
- Painel admin: abas Resumo, Pedidos, Lotes, Compradores
- Sistema de **cortesias** (admin emite 1–10 por pedido, por CPF/e-mail)
- Módulo de **afiliados** (Etapa B): CRUD completo em `/admin/afiliados`, magic link, atribuição de vendas — **confirmado funcionando em produção nesta sessão**
- Páginas legais (`/termos`, `/privacidade`)
- Busca pública de ingresso em `/buscar-ingresso` (CPF + nº do pedido)
- `audit_logs` para ações de admin

---

## 4. O que aconteceu nesta sessão (importante)

### 4.1 Diagnóstico da campanha do Meta — virada de estratégia
- A campanha de tráfego gerou **clique barato e estável** (CPL ~R$0,35, CTR ~3,4%), mas **alcance frio e amplo** (~32 mil pessoas, vs. público quente de ~4 mil — efeito do **Advantage+** expandindo).
- **Veredito definitivo (via painel do afiliado `ads`): 1.176 visitas → 0 vendas.** Tráfego frio **não converte** neste evento.
- **Causa:** público frio + **cadastro obrigatório** no checkout. O cadastro é fricção para o tráfego frio, MAS é **parte central do modelo de negócio** (posse de dados) — **decisão do Fernando: NÃO mexer no cadastro nem fechar o público.**
- **O que converte:** links **pessoais/afiliados** (ex.: um link de aniversário trouxe venda; o anúncio não).
- **Ação aplicada:** orçamento do conjunto reduzido de **R$60 → R$20/dia** (feito via conector). Obs.: ao editar o orçamento, o Meta **pausou o conjunto automaticamente**; foi **reativado** em seguida e ficou em "em processamento/aprendizado". Gasto acumulado até aqui ~R$203.
- O anúncio agora é **suporte de alcance/lembrança** (e aposta em venda na portaria), não o motor de vendas.

### 4.2 Campanha de aniversariantes (NOVO motor de vendas) — em execução
Repete de propósito o padrão que converte (link pessoal). Entregue:
- **Planilha `aniversariantes-sacode-whatsapp.xlsx`**: 53 aniversariantes únicos de junho (deduplicados por telefone), ordenados pela proximidade do aniversário ao dia 07/06, cada um com **link `wa.me` clicável e mensagem já preenchida** (1º nome trocado). Dois fazem aniversário **no próprio dia 07/06** (Rodolfo, Roney) — abordar primeiro.
- **Oferta (não acumulativa — vale a maior meta):**
  - Aniversariante **+ 2 convidados = cortesia** (usar o sistema de cortesias existente)
  - **15** convidados pagantes → garrafa de **Smirnoff**
  - **30** → **Absolut**
  - **50** → **Jack Daniels ou Tanqueray**
- **Mecânica:** enviar convite (mensagem curta) → quando a pessoa responder "topa", gerar o **link de afiliado pessoal dela** em `/admin/afiliados` e enviar. É esse link que conta os convidados de cada um, para premiar a meta certa.

### 4.3 Exemplo de público salvo (uso futuro)
Montado como **exemplo visual** um público "fãs de pagode no ABC" para uma futura campanha de **seguidores no Instagram do Caio** (objetivo Engajamento → visitas ao perfil). **Não foi gravado na conta**: criar público com interesses exige IDs internos do Meta, e a ferramenta de busca de IDs não está disponível no conector atual (não se inventa ID). Para criar de verdade: montar no Gerenciador (o seletor preenche os IDs ao digitar), ou fornecer os IDs para eu montar a estrutura.

### 4.4 Lembrete técnico relevante
- O **pixel está "morto"** (não dispara `Purchase`): por isso o Meta não enxerga conversão e não há retargeting. **Instalar o pixel** segue como item futuro importante — destrava campanhas de conversão e públicos de interesse de verdade.

---

## 5. Próximos passos (priorizados — evento em 07/06)

**A. Executar a campanha de aniversariantes (MAIOR prioridade de venda agora)**
1. Enviar os convites de cima para baixo na planilha (aniversários mais próximos primeiro; começar por Rodolfo e Roney, que fazem niver no dia do evento).
2. Enviar aos poucos, de forma pessoal (evitar disparo em massa = risco de spam/bloqueio no WhatsApp).
3. Quando alguém responder, gerar o link de afiliado pessoal em `/admin/afiliados` e enviar.
4. **Montar uma planilha de controle "convidado → aniversariante"** para fechar as metas de garrafa no dia sem confusão. *(Claude se ofereceu para construir — pedir na próxima conversa.)*

**B. Check-in (Etapa 3) — URGENTE dado que o evento é em poucos dias**
- Login único (`checkin@cantorcaiolacerda.com.br`), dropdown de "Hostess" (até 4 simultâneas), leitura de QR Code como principal + busca por CPF/nome como fallback, feedback verde/vermelho em tela cheia, nome da hostess logado por check-in. Papel `staff` planejado (não implementado). **Ainda não iniciado.**

**C. Smoke test end-to-end (3–4 dias antes)**
- Comprar 1 ingresso real, validar o QR no check-in pelo celular, conferir painéis do admin. Usar conta de teste descartável.

**D. Verificar amanhã: o anúncio voltou a "entregando" a R$20/dia?** (confirmar que não ficou travado em processamento).

**E. Bugs/itens pendentes (adiados nesta sessão para focar na campanha):**
- 🔴 Bug do **modal de edição de lotes** (não dá pra ativar Lote 03 / pausar / ocultar pela UI — hoje depende de SQL na mão).
- Limpar logs `[DIAG]` do checkout em produção.
- **Resumo do admin superContagem** (falta filtro `status = 'paid'`) → reformatar em cards de métrica (ingressos pagos, cortesias, faturamento bruto, taxas, ticket médio).
- Bug do `sort_order`; botão de **logout** não funciona (workaround: limpar cookies/localStorage); **FOUC** na navbar.

**F. Verificar (status incerto — confirmar na próxima sessão):**
- **Pix**: estava como bloqueio (conta MP retornando tipo `personal` apesar do CNPJ). Confirmar se já liberou. Chave PIX nova: `financeiro@cantorcaiolacerda.com.br`.

**G. Futuro (pós-evento):**
- Instalar o **pixel** (destrava conversão/retargeting/interesses).
- Criar de verdade o público salvo "fãs de pagode ABC" para campanha de seguidores no IG.
- Etapa C (painel público de afiliados); programa **Embaixadores do Sacode** (comissão 10%/ingresso, brindes por volume; revisão jurídica do termo de adesão antes da 1ª comissão; **nunca usar o termo "multinível" publicamente**).

---

## 6. Como trabalhar comigo (padrões a aplicar sempre)

1. **Passo a passo numerado e simplificado**, sem assumir conhecimento prévio.
2. **Sempre dizer qual janela do PowerShell usar:** DEV (`npm run dev`), GIT (git e shell puro), CLAUDE (Claude Code).
3. **Padrão sequencial:** dar o próximo passo + o seguinte com condição ("rode X; se aparecer Y, rode Z; se algo estranho, cole aqui"). Fernando decide se segue ou pausa. Não repetir passos anteriores quando ele colar a saída.
4. **Entrega de arquivos:** preferir edição manual no VS Code / PowerShell, com conteúdo completo para copiar-colar. Arquivos grandes ou com acento → entregar como artefato para download (`present_files`); ele usa `Move-Item`. Evitar diffs parciais em arquivos já editados manualmente várias vezes.
5. **Commits:** mensagens em português minúsculo, pequenos e temáticos.
6. **Shell:** sugerir a janela **GIT** (PowerShell puro) — o Claude Code interpreta comandos como perguntas.

**Gotchas críticos:**
- **Dev e produção compartilham o MESMO banco Supabase** → confirmar antes de qualquer SQL destrutivo.
- **Nunca editar arquivos pela interface web do GitHub** (causou builds quebrados).
- **Sempre `npm run build` local antes de commitar.**
- Usar **conta de teste descartável** para fluxos destrutivos.
- PowerShell: `[` e `]` são curinga → usar `-LiteralPath "..."` com aspas; `git add "src/...[id]/"` com aspas duplas. `Get-Content` mostra acentos UTF-8 "quebrados" → **falso positivo**, não trocar arquivo por isso. Variáveis não persistem entre sessões (re-declarar `$token` etc.).
- **Login pós-Supabase SSR:** usar `window.location.href` (não `router.push`+`refresh`); `exchangeCodeForSession` roda **server-side** (Route Handler) com `@supabase/ssr`.
- Trigger `handle_new_user` cria o profile no signup → a rota de signup deve **UPDATE**, nunca INSERT.
- Cache do Router do Next pode servir listagem velha → `revalidatePath()` nos route handlers.

---

## 7. Jurídico (v1.0, publicado)
Sem meia-entrada; transferência de ingresso gratuita até 6h antes via suporte; direito de arrependimento em 7 dias; reembolso integral em até 30 dias em caso de cancelamento/adiamento. ZDK = Operadora; Caio Lacerda (CNPJ acima) = Controladora/Organizadora; Fernando = DPO.
