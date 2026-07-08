# 🚀 Plataforma Multi-Produtor — Passo a passo de criação

> Guia para tirar a plataforma do papel usando a estrutura pronta do Sacode.
> Modelo: estilo **Blacktag** — home com todos os eventos, checkout na conta
> Mercado Pago única da plataforma, painel do produtor em subdomínio.
>
> **Regra de ouro: NADA aqui mexe no Sacode em produção.** Tudo é criado
> novo (repo, Supabase, Vercel, domínio). O Sacode segue intocado até a
> 16ª edição (02/08).

---

## 📋 Visão geral

| # | Etapa | Quem faz | Onde |
|---|---|---|---|
| 0 | Definir nome e comprar domínio | **Você** | Registro.br / Cloudflare |
| 1 | Criar repositório novo no GitHub | **Você** (5 min) | GitHub |
| 2 | Criar projeto novo no Supabase | **Você** (10 min) | Supabase |
| 3 | Exportar schema do Sacode e importar no novo | **Você + Claude** | Supabase |
| 4 | Rodar o SQL da camada de organizações | **Você** (5 min) | Supabase SQL Editor |
| 5 | Criar projeto novo na Vercel + variáveis | **Você** (15 min) | Vercel |
| 6 | Apontar domínio + subdomínio `painel.` | **Você** (10 min) | Vercel + DNS |
| 7 | Turnstile novo (antifraude) | **Você** (5 min) | Cloudflare |
| 8 | E-mail (Resend) — verificar domínio novo | **Você** (10 min) | Resend + DNS |
| 9 | Webhook do Mercado Pago (mesma conta) | **Você** (10 min) | Painel MP |
| 10 | Adaptar o código (multi-produtor, vitrine, painel) | **Claude** | Repo novo |
| 11 | Cadastrar 1ª organização e testar compra completa | **Você + Claude** | Site novo |

---

## PARTE 0 — 🏷️ Nome e domínio

1. Decida o **nome da plataforma** (define repo, domínio e remetente de e-mail).
2. Compre o domínio (ex.: Registro.br para `.com.br`).
3. **Recomendado:** aponte os nameservers para o **Cloudflare** (plano grátis)
   — facilita DNS, subdomínio do painel e o Turnstile no mesmo lugar.

> ⚠️ Sem o nome definido, os passos seguintes ficam com nomes provisórios.
> Dá pra começar mesmo assim, mas renomear depois dá trabalho.

---

## PARTE 1 — 🐙 Repositório novo no GitHub

1. Acesse https://github.com/new
2. **Owner:** `zdkproducoes` · **Nome:** o nome da plataforma (ex.: `nomedaplataforma-ingressos`)
3. **Private** ✅ · NÃO marque "Add README"
4. No seu computador, copie a pasta do projeto atual para uma pasta nova
   (fora da pasta do Sacode), depois no terminal, dentro da pasta nova:

```bash
# remove o vínculo com o repo do Sacode e cria um histórico limpo
rm -rf .git
git init
git add .
git commit -m "chore: fork inicial a partir do sacode-ingressos"
git remote add origin https://github.com/zdkproducoes/NOME-DO-REPO.git
git branch -M main
git push -u origin main
```

> 💡 A partir daqui, correções feitas no Sacode NÃO entram sozinhas na
> plataforma (e vice-versa). São dois produtos separados de propósito.

---

## PARTE 2 — 🟢 Projeto novo no Supabase

1. https://supabase.com/dashboard → **New project**
2. **Name:** nome da plataforma · **Region:** `South America (São Paulo)`
3. Guarde a **senha do banco** que você definir (vai precisar no passo 3)
4. Depois de criado, vá em **Project Settings → API Keys** e copie para o bloco de notas:
   - `Project URL`
   - `anon public`
   - `service_role` (🔴 segredo — nunca no GitHub)

---

## PARTE 3 — 🗃️ Copiar o schema do Sacode para o projeto novo

O jeito mais confiável é exportar só a **estrutura** (sem os dados dos clientes do Sacode):

1. No projeto **Sacode** do Supabase: **Database → Backups** não serve para isso —
   use o SQL Editor ou me peça ajuda com o comando abaixo.
2. **Opção recomendada (me chame para fazer junto):** com o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado:

```bash
# exporta APENAS a estrutura (tabelas, funções, policies) do Sacode
supabase db dump --db-url "postgresql://postgres:[SENHA]@db.nsbyylbgnmzlgfwzgasl.supabase.co:5432/postgres" --schema public -f schema_sacode.sql
```

3. Revisamos o arquivo juntos (para limpar o que é específico do Sacode) e
   rodamos no SQL Editor do projeto **novo**.
4. Crie também o bucket de fotos no projeto novo: **Storage → New bucket**
   - Name: `wall-images` · Public: ✅ · Limite: 5 MB
   - MIME types: `image/jpeg,image/png,image/webp,image/gif`

> ⚠️ **NUNCA** rode SQL de teste no projeto do Sacode. Confira sempre o nome
> do projeto no topo do dashboard antes de clicar em Run.

---

## PARTE 4 — 🏢 Rodar o SQL da camada de organizações

1. Abra o arquivo **`sql/plataforma/00_camada_organizacoes.sql`** (está neste repo)
2. Copie tudo e cole no **SQL Editor do projeto NOVO** → **Run**
3. Ele cria: `organizations`, `organization_members`, `venues`, `payouts`,
   a coluna `events.organization_id` e as regras de segurança (RLS)
4. O **BLOCO 8** (final do arquivo) está comentado — é o cadastro da primeira
   organização. Vamos rodá-lo juntos na PARTE 11, com os dados reais.

---

## PARTE 5 — ⚡ Projeto novo na Vercel

1. https://vercel.com/new → **Import** o repositório novo do GitHub
2. Antes de fazer o deploy, adicione as **Environment Variables**
   (Production + Preview + Development em todas):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase **novo** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do Supabase **novo** |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role do Supabase **novo** |
| `NEXT_PUBLIC_SITE_URL` | `https://SEUDOMINIO.com.br` |
| `MP_ACCESS_TOKEN` | **o mesmo do Sacode** (conta MP única) |
| `MP_PUBLIC_KEY` | **o mesmo do Sacode** |
| `MP_WEBHOOK_SECRET` | *(vazio — preenche na PARTE 9)* |
| `RESEND_API_KEY` | o mesmo do Sacode (ou uma key nova) |
| `EMAIL_FROM` | `NomeDaPlataforma <nao-responda@SEUDOMINIO.com.br>` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | *(vazio — preenche na PARTE 7)* |
| `TURNSTILE_SECRET_KEY` | *(vazio — preenche na PARTE 7)* |

3. Clique em **Deploy**

---

## PARTE 6 — 🌐 Domínio e subdomínio do painel

1. Na Vercel, no projeto novo: **Settings → Domains**
2. Adicione **dois** domínios apontando para o MESMO projeto:
   - `SEUDOMINIO.com.br` → site público (vitrine + checkout)
   - `painel.SEUDOMINIO.com.br` → painel dos produtores
3. A Vercel mostra os registros DNS a criar (CNAME/A). Crie-os no Cloudflare
   (ou onde estiver o DNS) e aguarde o ✅ verde na Vercel.

> 💡 O código (PARTE 10) vai reconhecer o `painel.` e servir só o admin nele.

---

## PARTE 7 — ☁️ Turnstile novo (antifraude)

1. https://dash.cloudflare.com/ → **Turnstile** → **Add Site**
2. **Site name:** nome da plataforma · **Hostname:** `SEUDOMINIO.com.br`
   (adicione também `painel.SEUDOMINIO.com.br`)
3. **Widget Mode:** Managed → **Create**
4. Copie **Site Key** e **Secret Key** para as variáveis na Vercel
   (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`) → Save

---

## PARTE 8 — 📧 Resend (e-mails do domínio novo)

1. https://resend.com/domains → **Add Domain** → `SEUDOMINIO.com.br`
2. Crie os registros DNS que o Resend pedir (SPF, DKIM) no Cloudflare
3. Aguarde o status **Verified** (pode levar alguns minutos)
4. Confirme que `EMAIL_FROM` na Vercel usa esse domínio

> 💡 Todos os e-mails (confirmação, ingresso, transferência) sairão do domínio
> da plataforma, com o nome do produtor no conteúdo. E-mail com domínio
> próprio do produtor fica para o futuro.

---

## PARTE 9 — 💳 Webhook do Mercado Pago (mesma conta)

Na **mesma conta MP** de hoje, crie uma **aplicação nova** (não mexa na do Sacode):

1. https://www.mercadopago.com.br/developers/panel → **Criar aplicação**
2. Nome: o da plataforma
3. Na aplicação nova: **Webhooks → Configurar notificações**
   - Modo: **Produção**
   - URL: `https://SEUDOMINIO.com.br/api/checkout/webhook`
   - Eventos: ✅ **Pagamentos**
4. Copie a **chave secreta** que aparece → cole em `MP_WEBHOOK_SECRET` na Vercel
5. Se a aplicação nova gerar credenciais próprias (Access Token / Public Key),
   use **as da aplicação nova** em `MP_ACCESS_TOKEN` / `MP_PUBLIC_KEY`
   — é a mesma conta bancária recebendo, mas separa os relatórios por produto.

> ⚠️ **Nota fiscal/contábil:** todo o faturamento dos produtores externos vai
> transitar pelo CNPJ da ZDK. Antes de assinar com o primeiro produtor de fora,
> alinhe com o contador como emitir (intermediação/agenciamento) e formalize a
> taxa da plataforma em contrato.

---

## PARTE 10 — 💻 Adaptação do código (trabalho meu, no repo novo)

Essa parte é comigo — você só revisa e aprova. Na ordem:

1. **Gate do painel** → trocar o admin único por `organization_members`
   (produtor só vê os eventos da organização dele; superadmin vê tudo)
2. **Escopo nas rotas `/api/admin`** → toda query filtrada pela organização
   do usuário logado (crítico: as rotas usam service_role, que ignora RLS)
3. **Home vitrine** → listar todos os eventos publicados (hoje a home é o
   evento único do Sacode)
4. **Subdomínio** → middleware reconhece `painel.` e serve só o admin
5. **Marca por tenant** → remover os ~291 hardcodes "SACODE" (nome, cores,
   e-mails, termos, footer) e ler do banco (`organizations.brand`)
6. **Painel financeiro do produtor** → vendas, taxa da plataforma e repasses
   (tabela `payouts`)
7. **Tela do superadmin** → criar organização, definir taxa, registrar repasse

---

## PARTE 11 — 🧪 Primeira organização e teste completo

1. Rodar juntos o **BLOCO 8** do SQL (cadastrar a 1ª organização e o owner)
2. Criar um evento de teste pelo painel
3. Comprar com cartão de teste do MP:
   - Cartão `5031 4332 1540 6351` · CVV `123` · Validade futura
   - Nome **APRO** (aprova) · CPF `12345678909`
4. Conferir: e-mail com QR chegou · pedido `approved` no Supabase ·
   venda aparece no painel do produtor · produtor NÃO vê dados de outra org
5. Testar check-in com o QR gerado

---

## ✅ Checklist rápido (imprima ou marque aqui)

- [ ] 0. Nome definido + domínio comprado + DNS no Cloudflare
- [ ] 1. Repo novo no GitHub com o código copiado
- [ ] 2. Projeto novo no Supabase (chaves guardadas)
- [ ] 3. Schema do Sacode importado + bucket `wall-images`
- [ ] 4. SQL `00_camada_organizacoes.sql` rodado
- [ ] 5. Projeto Vercel + todas as variáveis
- [ ] 6. Domínio + `painel.` apontados
- [ ] 7. Turnstile criado e chaves na Vercel
- [ ] 8. Domínio verificado no Resend
- [ ] 9. App nova no MP + webhook + secret na Vercel
- [ ] 10. Código adaptado (Claude)
- [ ] 11. Compra de teste completa funcionando

---

Qualquer erro em qualquer parte: screenshot + me chama. 💪
