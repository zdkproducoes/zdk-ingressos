# Contexto SACODE — v9

> Atualizado em **03/05/2026** (domingo, manhã/início de tarde) após sessão completa de fechamento do fluxo de recuperação de senha + deploy em produção.
> Cole esse arquivo no próximo chat junto com a frase: *"Claude, retomando o projeto SACODE. Anexo contexto-sacode-v9.md."*

---

## 🎯 Projeto

**Fernando Zedeque (ZDK Produções)** construindo plataforma própria de venda de ingressos. MVP no evento **SACODE 15ª Edição (Aquecimento Copa)** — artista Caio Lacerda, **07/06/2026** no Villa Jardim Bar (SBC/ABC paulista).

**Lançamento das vendas:** **04/05/2026 (segunda-feira) às 12h** — ~24h de margem a partir desse contexto.

## 🛠 Stack

Next.js 14 + Tailwind / Supabase (Auth+DB+Storage, `@supabase/ssr` v0.5.2, `supabase-js` v2.104.1) / Resend (auth + transacional) / Mercado Pago (HMAC ativo) / Vercel / GitHub.

---

## 👤 Perfil do usuário e processo de trabalho

**Importante manter em todas as próximas sessões:**

- **Iniciante** — sempre fornecer instruções passo a passo simplificadas e numeradas. Não assumir conhecimento prévio.
- **Setup de 3 janelas PowerShell:** **DEV** (roda servidor local `npm run dev`), **GIT** (comandos git), **CLAUDE** (Claude Code). Sempre especificar qual janela usar pra cada comando.
- **Estilo de passo a passo preferido:** dar o próximo passo + o passo seguinte com condição. Exemplo: *"Roda X. Se aparecer Y, segue pro Z. Se aparecer algo diferente, cola aqui."* O usuário decide se segue ou pausa baseado no output esperado vs inesperado.
- **NÃO repetir instruções anteriores** quando ele cola output. Só responder ao que é novo.
- **Edição manual de arquivos** (VS Code direto ou PowerShell) é a preferência — o padrão dessa sessão funcionou muito bem. Continuar fornecendo conteúdo completo de arquivos pra copy-paste manual ao invés de tentar automatizar via Claude Code.

---

## ✅ O que foi feito na sessão de 03/05

### Bug bloqueante "Redefinindo…" — **RESOLVIDO**

O bug do `NavigatorLockAcquireTimeoutError` no `updateUser` foi totalmente resolvido. Causa raiz: múltiplas instâncias de `createSupabaseBrowserClient()` no client + middleware + Header competindo pelo mesmo lock de auth (`navigator.locks`). 

**Solução implementada em 2 etapas:**

1. **Cliente único no form via `useMemo`** (mitigação parcial — fez o erro mudar de "trava infinita" pra "erro tratado")
2. **Movido `updateUser` pra Route Handler server-side** em `/api/auth/redefinir-senha/route.ts` — eliminou definitivamente o conflito (server não tem `navigator.locks`)
3. **`signOut()` server-side após sucesso** — elimina sessão fantasma que travava o login subsequente

### Arquivos criados/alterados nessa sessão

| Arquivo | O que faz |
|---|---|
| `src/app/api/auth/redefinir-senha/route.ts` | **NOVO** — Route Handler que valida, chama `updateUser` server-side, faz `signOut`, retorna JSON |
| `src/components/auth/RedefinirSenhaForm.tsx` | Reescrito — `useMemo` pro client, e onSubmit chama `fetch('/api/auth/redefinir-senha')` em vez de chamar Supabase direto |

### Configurações no Supabase Dashboard (concluídas)

- ✅ **Redirect URLs:** as 4 URLs (2 prod + 2 localhost) com `/redefinir-senha` e `/auth/callback`
- ✅ **Site URL:** trocado de `http://localhost:3000` para `https://sacode.cantorcaiolacerda.com.br` (descoberta crucial — sem isso links de e-mail vinham apontando pra localhost em produção)
- ✅ **Custom SMTP via Resend:** Host `smtp.resend.com`, Port `465`, User `resend`, Pass=API Key. Sender: `SACODE <nao-responda@cantorcaiolacerda.com.br>`
- ✅ Template "Reset Password" customizado (mantido do v8)

### Git/Deploy

- ✅ Commit final na branch `feature/recuperacao-senha`
- ✅ Merge `--no-ff` na `main` (commit `d14a3c2`)
- ✅ Push pra `origin/main`
- ✅ Vercel deploy automático em produção — Ready
- ✅ Smoke test em produção com conta @yahoo descartável passou

---

## 🐛 Bugs ainda abertos (não-bloqueantes pro lançamento)

### Botão "Sair" no header não funciona
- Status inalterado desde v8. Não foi investigado nessa sessão.
- Workaround: limpar cookies + localStorage no DevTools, ou fechar aba.
- **Não-bloqueante** — uso baixo no dia 1 e usuário consegue contornar.
- Investigar com calma na fase 2.

### FOUC navbar (cosmético)
- Inalterado, fase 2.

---

## 📐 Decisões técnicas dessa sessão

### Por que Route Handler + signOut server-side ao invés de tentar resolver no client

O contexto v8 já apontava na "Hipótese 1" que mover `updateUser` pra server-side seria a solução. Confirmado na prática. Padrão a replicar pra qualquer chamada de auth Supabase que precise rodar com sessão ativa do navegador:

- Browser → `fetch('/api/algum-endpoint')` → Server lê cookies → Server chama Supabase → Retorna JSON
- Server-side **não tem** `navigator.locks` (API só de browser), eliminando classe inteira de bugs

### Por que `signOut()` server-side funciona (e no client falhava)

No v8 a tentativa de `signOut` no client "piorou e travou também" — porque competia pelos mesmos `navigator.locks` que `updateUser`. Server-side não tem esse problema, é operação síncrona de invalidar tokens e limpar cookies.

### Resend já estava implementado em 4 fluxos

Descoberta da sessão: o Resend já era usado em `signup`, `resend-confirmation`, `webhook` (compra com QR Code) e `admin/orders/[id]/resend-email`. **Único e-mail que ainda saía do Supabase default era recuperação de senha.** Configurando Custom SMTP no Dashboard, todos os 5 fluxos passaram a sair do mesmo remetente (`SACODE <nao-responda@cantorcaiolacerda.com.br>`).

### Site URL ≠ Redirect URLs

- **Site URL:** UM valor, default do redirect quando código não passa `redirectTo` explícito. Tem que ser o domínio de produção.
- **Redirect URLs:** LISTA de URLs autorizadas. Mantém localhost + produção pra desenvolvimento + prod funcionarem.

---

## 📝 Aprendizados que valem ouro pro futuro

### `@supabase/ssr` + sessão ativa de auth = sempre Route Handler
- Qualquer chamada que envolva sessão (updateUser, signOut, refreshSession, etc) que dispare junto com outra ação Supabase tem alto risco de `NavigatorLockAcquireTimeoutError`
- Padrão obrigatório: Route Handler em `/api/...` com `createServerClient`

### Conta de teste descartável continua sendo regra de ouro
- Mantido aprendizado do v8. Funcionou perfeitamente nessa sessão.
- `gmail+sufixo@gmail.com` ou `@yahoo` descartável.

### Vim no PowerShell quando dá `git merge` sem `-m`
- Se cair no Vim por engano, sair é: `Esc` → `:wq` → `Enter`
- Se travar, fechar a janela do PowerShell e abrir nova — Git aborta o merge mas mantém os arquivos em staging
- **Sempre usar `git commit -m "msg"`** ou `git merge -m "msg"` pra evitar Vim totalmente

### LF/CRLF warning é inofensivo
- `warning: LF will be replaced by CRLF` é só housekeeping do Git no Windows
- Pode ignorar sempre

### Vercel preview pede login da Vercel
- Comportamento default. Pra smoke test de feature pequena, pular preview e ir pra produção (com conta descartável) é aceitável
- Pra features maiores, considerar configurar acesso público de previews

---

## 🚦 Plano para próxima sessão

### Lançamento iminente — segunda 04/05 às 12h
- ✅ Recuperação de senha funcional em produção
- ✅ Todos e-mails saem do domínio próprio
- ✅ Smoke test passou

### Pós-lançamento (semana 1)
- Investigar e corrigir botão "Sair" no header
- Smoke-testar affiliate tracking em produção (pendência v5/v6/v7/v8)
- Avaliar criação de área "Meu Perfil" com botão de mudar senha logado

### Roadmap maior (fase 2)
- Painel admin editável (CRUD evento)
- Embaixadores SACODE
- Transferência de titularidade self-service
- FOUC navbar
- P1/P2/A1/TD1

---

## 🎨 Decisões de design vigentes (inalteradas do v7/v8)

- Skin Copa **só em** `/evento/sacode-15-edicao`. Resto do site = paleta vinho SACODE.
- Lote único exibido sem contador (a menos que ≥90% vendido OU <24h pra próximo lote).
- Logo PNG transparente nas barras.
- Iframe Google Maps em vez de Leaflet/OSM.

## 📜 Decisões jurídicas vigentes (inalteradas do v7/v8)

Termos com advogado. Caio Lacerda (CNPJ 44.816.216/0001-03) é Organizador+Controlador; ZDK é Operadora. Sem meia-entrada. Direito de arrependimento 7d. Cancelamento: cliente escolhe crédito/reembolso. DPO: `privacidade@zdkproducoes.com.br`.

## 🐛 Pendências v5/v6/v7/v8 ainda válidas

- **Botão "Sair" no header** (descoberto na sessão de 02/05, persistente)
- **FOUC navbar** (cosmético, fase 2)
- **Affiliate tracking** — não foi smoke-testado em produção
- **Painel admin editável** (CRUD evento)
- **Embaixadores SACODE**
- **Área "Meu Perfil"** — incluindo botão de mudar senha logado (alternativa ao fluxo de recuperação)
- **Transferência de titularidade self-service**
- **P1/P2/A1/TD1**

## 🗄 Estado do banco (`ticket_batches` do evento `sacode-15-edicao`)

Inalterado desde v7/v8:
```
sort_order | name                       | price | status
1          | Ingresso Promocional       | 15    | active
2          | Ingresso Único - Lote 01   | 20    | scheduled
3          | Ingresso Único - Lote 02   | 25    | scheduled
4          | Ingresso Único - Lote 03   | 35    | scheduled
```

`event_id = '6539575d-7a71-4c50-8f62-955bc5a96947'`. Todos `is_visible=true`, `sold_count=0`.

## 🔧 Como começar a próxima sessão

> Claude, retomando o projeto SACODE. Anexo `contexto-sacode-v9.md`. Recuperação de senha foi pra produção com sucesso. Lançamento das vendas é segunda 04/05 12h. Hoje vamos retomar com [TÓPICO].

**Fim do contexto v9.**
