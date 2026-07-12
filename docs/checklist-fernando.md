# ✅ Checklist do Fernando — ZDK Ingressos

> Gerado em 12/07/2026. O código das 7 fases está pronto e commitado; o banco
> novo (Supabase `zdk-ingressos`) está criado com schema e seed de teste.
> Este arquivo lista **o que só você pode fazer**, na ordem certa.
> Marque os `[ ]` conforme for concluindo.

---

## PARTE A — Testar localmente ✅ CONCLUÍDA em 12/07/2026
> A1–A4 feitos (A2–A4 automatizados pelo Claude: contas de teste confirmadas
> via script, seed aplicado e suíte E2E `scripts/e2e-run.mjs` com **26/26
> testes passando** — isolamento entre organizações validado).
> Senha das contas de teste: `TesteE2E!12345` (produtor.a@teste.com,
> produtor.b@teste.com, comprador@teste.com). A5 (compra MP) fica para o
> deploy na Vercel (B7), onde o webhook funciona.

### A1. Colar a chave service_role no .env.local
- [ ] Abra https://supabase.com/dashboard → projeto **zdk-ingressos** (⚠️ não o sacode-mvp!)
- [ ] Menu **Project Settings → API Keys** → copie a chave **service_role**
- [ ] No arquivo `.env.local` deste repo, troque o valor de
      `SUPABASE_SERVICE_ROLE_KEY=PLACEHOLDER_COLE_A_CHAVE_DO_PROJETO_ZDK_INGRESSOS`
      pela chave copiada
- 💡 O `.env.local` já aponta pro Supabase novo. O antigo (que apontava pra
  **produção do Sacode** — perigoso) está guardado em `.env.sacode.local`.

### A2. Rodar o app e criar as contas de teste
- [ ] No terminal: `npm run dev` → abra http://localhost:3000
      (a home já deve mostrar 2 eventos de teste: Festival Alfa e Baile Beta)
- [ ] Cadastre-se em `/cadastro` com **conteudo@zdkproducoes.com.br** (você = superadmin)
- [ ] Cadastre também (pode usar CPFs de teste diferentes):
      - **produtor.a@teste.com** (será o dono da Produtora Alfa)
      - **produtor.b@teste.com** (será o dono da Produtora Beta)
- 💡 Sem Turnstile configurado o cadastro pula a validação (modo dev). Se o
  e-mail de confirmação não chegar (Resend em modo teste), confirme os
  usuários manualmente no dashboard: Authentication → Users → ⋮ → Confirm email.

### A3. Rodar o seed final no SQL Editor
- [ ] No Supabase (projeto zdk-ingressos): **SQL Editor → New query**
- [ ] Cole o conteúdo de `sql/plataforma/02_seed_teste_e2e.sql` → **Run**
      (promove você a superadmin e vincula os produtores às organizações)

### A4. Roteiro de teste do isolamento (o mais importante!)
- [ ] Logado como **você** → `/admin` deve mostrar as abas **Financeiro** e
      **Plataforma**, e a lista de eventos com as DUAS organizações
- [ ] Em `/admin/plataforma`: confira as 2 orgs, GMV zerado, membros owners
- [ ] Deslogue e entre como **produtor.a@teste.com**:
      - `/admin/eventos` deve listar **só** o Festival Alfa
      - Financeiro deve mostrar só a Produtora Alfa
      - Tentar abrir a URL de check-in do evento do outro (`/checkin/baile-beta`)
        deve dar **404**
- [ ] Entre como **produtor.b@teste.com** e confira o espelho (só Baile Beta)
- [ ] Como produtor A, use "Editar página" no evento e preencha lineup/subtítulo
      → confira a página pública `/evento/festival-alfa`

### A5. Compra de teste (opcional agora; obrigatória antes do lançamento)
- [ ] Com `MP_ACCESS_TOKEN` de teste (ou o atual), compre 1 ingresso do
      Festival Alfa: cartão `5031 4332 1540 6351` · CVV `123` · validade
      futura · nome **APRO** · CPF `12345678909`
- [ ] Confira: e-mail com QR chegou (remetente "Produtora Alfa · ZDK Ingressos"),
      pedido `approved` no Supabase, venda no painel do produtor A,
      check-in do QR funciona
- ⚠️ Webhook local não recebe notificação do MP — para testar o fluxo completo
      de pagamento use o deploy na Vercel (PARTE B) ou um túnel (ngrok).

---

## PARTE B — Colocar no ar (1–2h, tem custos: domínio ~R$ 40/ano)

### B1. Domínio
- [ ] Comprar **zdkingressos.com.br** no Registro.br
- [ ] (Recomendado) Apontar os nameservers para o **Cloudflare** (plano grátis)

### B2. GitHub + Vercel
- [ ] Criar repo privado `zdkproducoes/zdk-ingressos` no GitHub e dar push:
      `git remote add origin https://github.com/zdkproducoes/zdk-ingressos.git`
      `git push -u origin main`
- [ ] https://vercel.com/new → importar o repo
- [ ] Environment Variables (use `.env.example` como gabarito). As principais:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wohcypmrxwtjbqoxhqzp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do projeto zdk-ingressos |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role do zdk-ingressos (🔴 segredo) |
| `NEXT_PUBLIC_PLATFORM_NAME` | `ZDK Ingressos` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.zdkingressos.com.br` |
| `NEXT_PUBLIC_PANEL_HOST` | `painel.zdkingressos.com.br` |
| `MP_ACCESS_TOKEN` / `MP_PUBLIC_KEY` | da aplicação NOVA no MP (B5) |
| `MP_WEBHOOK_SECRET` | da aplicação nova (B5) |
| `RESEND_API_KEY` | a mesma conta Resend |
| `EMAIL_FROM` | `ZDK Ingressos <nao-responda@zdkingressos.com.br>` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | do Turnstile novo (B4) |
| `NEXT_PUBLIC_LEGAL_NAME` | razão social da ZDK |
| `NEXT_PUBLIC_LEGAL_DOCUMENT` | CNPJ da ZDK (aparece nos Termos) |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | e-mail de atendimento ao comprador |
| `CRON_SECRET` | o mesmo gerado no `.env.local` |

### B3. Domínios na Vercel (mesmo projeto, DOIS domínios)
- [ ] Settings → Domains → adicionar `www.zdkingressos.com.br` (site público)
- [ ] Adicionar também `painel.zdkingressos.com.br` (o middleware já reconhece
      e serve só o admin/check-in nele)
- [ ] Criar os registros DNS que a Vercel pedir (no Cloudflare)

### B4. Turnstile (antifraude do cadastro)
- [ ] https://dash.cloudflare.com → Turnstile → Add Site
- [ ] Hostnames: `www.zdkingressos.com.br` **e** `painel.zdkingressos.com.br`
- [ ] Copiar Site Key + Secret Key para as envs da Vercel

### B5. Mercado Pago (mesma conta, aplicação NOVA)
- [ ] https://www.mercadopago.com.br/developers/panel → **Criar aplicação**
      com o nome "ZDK Ingressos" (NÃO mexer na aplicação do Sacode)
- [ ] Webhooks → Configurar notificações → Produção:
      URL `https://www.zdkingressos.com.br/api/checkout/webhook` · evento **Pagamentos**
- [ ] Copiar a chave secreta do webhook → `MP_WEBHOOK_SECRET` na Vercel
- [ ] Usar Access Token / Public Key **da aplicação nova** nas envs
- ⚠️ Antes de assinar com o primeiro produtor externo: alinhar com o contador
      a emissão de NF (intermediação/agenciamento) — todo o faturamento passa
      pelo CNPJ da ZDK.

### B6. Resend (e-mails com o domínio novo)
- [ ] https://resend.com/domains → Add Domain → `zdkingressos.com.br`
- [ ] Criar os registros SPF/DKIM no Cloudflare → aguardar **Verified**
- [ ] Conferir que `EMAIL_FROM` na Vercel usa `nao-responda@zdkingressos.com.br`

### B7. Teste de fogo em produção
- [ ] Repetir o roteiro A4 no site publicado
- [ ] Compra real de valor baixo (pode estornar depois pelo painel de Pedidos)
- [ ] Conferir que `painel.zdkingressos.com.br` abre o admin e que
      `www.zdkingressos.com.br/admin` redireciona pra lá

---

## PARTE C — Limpeza e próximos passos (com o Claude)

### Limpeza (quando a plataforma estiver validada)
- [ ] Apagar os dados de teste (orgs Alfa/Beta, eventos, contas de teste)
- [ ] Trocar as fotos placeholder: subir logo real da ZDK Ingressos
      (hoje Navbar/Footer usam wordmark em texto) e favicon (`src/app/icon.png`
      ainda é o do Sacode)
- [ ] Decidir o que fazer com o projeto `backstage` no Supabase (está pausado;
      free só permite 2 ativos)

### Próximas features (me chame para fazer)
1. **Upload de imagens no painel** (banner/OG do evento direto pro bucket
   `event-assets`, sem colar URL)
2. **Aba Público por organização** (hoje restrita ao superadmin porque
   agregava dados de todos)
3. **Captura automática das tarifas do MP** (`payment.fee_details` no webhook
   → financeiro preciso sem digitação manual)
4. **Editor de brand da organização** (cores/logo pelo painel do superadmin —
   hoje é via JSON no banco)
5. **Página do produtor** (`/produtor/[slug]` com os eventos da organização)
6. **Migração do Sacode** para dentro da plataforma como organização
   (dados históricos + domínio próprio/whitelabel) — só depois da 16ª edição
   (02/08) e com a plataforma estável

### Referências rápidas
- Supabase novo: projeto `zdk-ingressos` · ref `wohcypmrxwtjbqoxhqzp` · região São Paulo
- Guia de infra detalhado: `docs/plataforma-passo-a-passo.md`
- Seed de teste: `sql/plataforma/02_seed_teste_e2e.sql`
- Identidade da plataforma no código: `src/lib/config.ts` (tudo via env)
- Qualquer erro: screenshot + me chama 💪
