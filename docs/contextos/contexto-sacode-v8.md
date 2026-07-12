# Contexto SACODE — v8

> Atualizado em **03/05/2026** (domingo, 02h da manhã) após sessão noturna de implementação da recuperação de senha.
> Cole esse arquivo no próximo chat junto com a frase: *"Claude, retomando o projeto SACODE. Anexo contexto-sacode-v8.md."*

---

## 🎯 Projeto

**Fernando Zedeque (ZDK Produções)** construindo plataforma própria de venda de ingressos. MVP no evento **SACODE 15ª Edição (Aquecimento Copa)** — artista Caio Lacerda, **07/06/2026** no Villa Jardim Bar (SBC/ABC paulista).

**Lançamento das vendas:** **04/05/2026 (segunda-feira) às 12h** — ~33h de margem a partir desse contexto.

## 🛠 Stack

Next.js 14 + Tailwind / Supabase (Auth+DB+Storage, `@supabase/ssr` v0.5.2, `supabase-js` v2.104.1) / Resend / Mercado Pago (HMAC ativo) / Vercel / GitHub.

---

## ✅ O que foi feito na sessão de 02/05 noite

Branch `feature/recuperacao-senha` no GitHub (origin), commit `78cb841`. **NÃO MERGEADA na main.** Main intacta no commit `f32b7dd` (substituição OpenStreetMap por Google Maps embed da sessão anterior).

### Arquivos criados/alterados

| Arquivo | O que faz | Status |
|---|---|---|
| `src/app/recuperar-senha/page.tsx` | Tela onde o usuário pede o link | ✅ Funciona |
| `src/components/auth/RecuperarSenhaForm.tsx` | Form que chama `resetPasswordForEmail`, mensagem genérica sempre, banner vermelho se `?erro=link_invalido` | ✅ Funciona |
| `src/app/auth/callback/route.ts` | Route Handler server-side que faz `exchangeCodeForSession` (PKCE flow) e redireciona | ⚠️ Funciona mas suspeito — ver bug |
| `src/app/redefinir-senha/page.tsx` | Tela onde cai após callback | ✅ Funciona |
| `src/components/auth/RedefinirSenhaForm.tsx` | Form de nova senha, validações, tratamento de erro 422 | ⚠️ Trava em "Redefinindo…" — ver bug |
| `src/components/auth/LoginForm.tsx` | Banner verde `?reset=success` + link "Esqueci minha senha" | ✅ Funciona |

### Configurações no Supabase Dashboard (já feitas)

- ✅ Redirect URLs adicionadas: `https://sacode.cantorcaiolacerda.com.br/redefinir-senha` + `http://localhost:3000/redefinir-senha`
- ✅ Template "Reset Password" customizado com identidade SACODE (paleta vinho, botão dourado, PT-BR, footer ZDK)

> Observação: o `redirectTo` do `resetPasswordForEmail` foi alterado para `/auth/callback?next=/redefinir-senha` — então as URLs de redirect cadastradas no Dashboard precisam **também** incluir `http://localhost:3000/auth/callback` e `https://sacode.cantorcaiolacerda.com.br/auth/callback`. **Verificar se essa parte foi feita** — se não, adicionar antes de retomar.

---

## 🐛 Bug aberto bloqueante

### Sintoma
Após clicar "Redefinir senha" com senha válida e diferente da atual, o botão fica eternamente em "Redefinindo…". A senha **é alterada com sucesso no banco** (testado: login funciona com a senha nova), mas o frontend nunca chega ao estado `success` (workaround) nem redireciona.

### Comportamentos observados
- Quando o usuário cai em `/redefinir-senha` vindo do callback, o **header do site mostra "Olá, [Nome]"** — sugerindo que o callback faz **login completo**, não sessão de recovery
- Tentativa de adicionar `signOut()` antes do redirect: piorou (travou também)
- Workaround sem `signOut()` (apenas `setPageState('success')`): ainda trava
- Erro `422 same_password` aparece corretamente quando usuário tenta senha igual à atual; o form é tecnicamente capaz de mostrar erros — então o `setLoading(false)` no caminho de erro funciona, mas no caminho de **sucesso** não funciona

### Hipóteses
1. **`updateUser` está pendurando** (não rejeita nem resolve) — mesmo padrão do bug do `exchangeCodeForSession` no client (resolvido movendo pra server-side)
2. **Sessão de recuperação está sendo tratada como sessão de login completa** pelo callback, e isso muda o comportamento do `updateUser`
3. **React não está rerenderizando** — improvável

### Próximos passos de diagnóstico (amanhã)
1. Adicionar `console.log` antes/depois do `updateUser` em `RedefinirSenhaForm.tsx`
2. Reproduzir bug com F12 console aberto
3. Se `updateUser` não retornar: mover `updateUser` para uma Route Handler `/api/auth/redefinir-senha` (espelhar padrão do callback)
4. Se retornar mas React não rerender: investigar se há `useEffect` ou middleware interferindo

---

## 🐛 Bugs descobertos não-relacionados

### Botão "Sair" no header não funciona
- Descoberto durante teste da feature, mas **não confirmado** se é regressão ou bug pré-existente
- Workaround atual: limpar cookies + localStorage no DevTools
- **Não-bloqueante pro lançamento** (uso baixo no dia 1)
- Investigar com calma na fase 2

### Conta principal foi cobaia (não repetir!)
- Fernando usou conta principal de admin pra testar fluxo destrutivo
- Resultado: ficou trancado fora da própria conta após 422
- **Resolução:** redefinição via SQL Editor: `UPDATE auth.users SET encrypted_password = crypt('senha', gen_salt('bf')) WHERE email = 'x'`
- **Aprendizado pro futuro:** SEMPRE conta de teste descartável (`gmail+sufixo@gmail.com`) pra fluxos destrutivos

---

## 📐 Decisões técnicas dessa sessão

### PKCE flow + `@supabase/ssr` exige callback server-side
- `exchangeCodeForSession` **NÃO funciona em client component** porque o `code_verifier` é armazenado em cookie HttpOnly (inacessível ao JS do browser)
- Tentar chamar no useEffect causa **promise pendurada infinita** (sem erro, sem resolução)
- Padrão correto: Route Handler em `/auth/callback/route.ts` com `createServerClient` que tem acesso aos cookies HttpOnly
- Fluxo: e-mail → `?code=X` → callback server-side faz exchange → redireciona pra `/redefinir-senha` com sessão já estabelecida → client só chama `getSession()`

### Mensagem sempre genérica em /recuperar-senha
- Mesmo se `resetPasswordForEmail` falhar, mostra "Se existir uma conta com esse e-mail, enviamos um link..."
- Decisão de segurança: não vazar se um e-mail existe ou não no sistema
- Erros reais logados no `console.error` com prefixo `[recuperar-senha]` pra debug

### Tratamento de erros do `updateUser`
- Códigos do Supabase v2: `same_password`, `weak_password`
- Type narrow: `(error as { code?: string }).code` (Supabase exporta AuthError mas a tipagem do code é instável entre versões)
- Mensagens em PT-BR: "A nova senha deve ser diferente da senha atual.", "Senha muito fraca. Use pelo menos 8 caracteres."

### Workaround do trava: tela de sucesso interna
- Em vez de `signOut()` + `redirect`, só seta `pageState='success'` e mostra tela com botão "Ir para login"
- **NÃO funcionou** — ainda trava antes de chegar nesse estado
- Mantido no código, será reativado quando o bug do `updateUser` for resolvido

---

## 🚦 Plano para retomada (domingo manhã)

### Prioridade 1 — Resolver bug do "Redefinindo…" (~1h)
1. Adicionar logs temporários no `onSubmit` do `RedefinirSenhaForm.tsx`:
   ```ts
   console.log('[debug] antes do updateUser');
   const { error } = await supabase.auth.updateUser({ password });
   console.log('[debug] depois do updateUser', { error });
   ```
2. Testar com conta @yahoo de teste, F12 aberto
3. Diagnosticar baseado nos logs:
   - Se "antes" aparece mas "depois" nunca: `updateUser` está pendurando → mover pra server-side
   - Se "depois" aparece com `error: null`: o problema está no `setPageState` ou no React
   - Se "depois" aparece com `error`: tratamento de erro está passando por algum caminho não esperado

### Prioridade 2 — Verificar configuração Dashboard (5min)
- Confirmar que `http://localhost:3000/auth/callback` e `https://sacode.cantorcaiolacerda.com.br/auth/callback` estão nas Redirect URLs do Supabase

### Prioridade 3 — Teste E2E completo (~20min)
- Conta @yahoo de teste
- Cenário 1 (fluxo feliz): pedir → e-mail → clicar → redefinir → ver tela de sucesso → ir pra login → logar com nova senha
- Cenário 2 (validações): vazio, senhas diferentes, senha igual à atual
- Cenário 3 (link inválido direto): acessar `/redefinir-senha` sem token

### Prioridade 4 — Deploy (~30min)
1. Merge `feature/recuperacao-senha` → `main`
2. Push pra origin/main → Vercel deploy automático
3. Smoke test em produção **com conta @yahoo de teste, NUNCA com a principal**
4. Verificar Redirect URLs de produção no Supabase Dashboard

### Margem de segurança
- Lançamento: segunda 04/05 às 12h
- Estimativa pra fechar tudo acima: ~2h
- **Folga de 30+ horas** — sem pressão real

---

## 📝 Aprendizados que valem ouro pro futuro

### Conta de teste descartável é OBRIGATÓRIA
- Use `seuemail+teste1@gmail.com` (Gmail) ou `seuemail+teste1@outlook.com` (Outlook) — ambos suportam aliasing com `+`
- Nunca, jamais, em hipótese alguma, testar fluxo destrutivo com conta de admin

### Plano B sempre tem que existir
- SQL Editor do Supabase com `UPDATE auth.users SET encrypted_password = crypt('senha', gen_salt('bf'))` salvou a noite
- Esse comando deveria estar documentado num runbook interno

### PKCE com `@supabase/ssr` tem armadilha
- Documentação oficial não enfatiza que client-side `exchangeCodeForSession` não funciona
- Sintoma é silencioso: promise pendurada, nada no console
- Sempre usar Route Handler `/auth/callback` server-side

### Cansaço aumenta erro exponencialmente
- Sessão de 02/05 começou produtiva, ficou ineficiente após 23h
- Decisão de parar às 02h foi acertada — tentar deploy às 03-04h teria custado caro

---

## 🎨 Decisões de design vigentes (inalteradas do v7)

- Skin Copa **só em** `/evento/sacode-15-edicao`. Resto do site = paleta vinho SACODE.
- Lote único exibido sem contador (a menos que ≥90% vendido OU <24h pra próximo lote).
- Logo PNG transparente nas barras.
- Iframe Google Maps em vez de Leaflet/OSM.

## 📜 Decisões jurídicas vigentes (inalteradas do v7)

Termos com advogado. Caio Lacerda (CNPJ 44.816.216/0001-03) é Organizador+Controlador; ZDK é Operadora. Sem meia-entrada. Direito de arrependimento 7d. Cancelamento: cliente escolhe crédito/reembolso. DPO: `privacidade@zdkproducoes.com.br`.

## 🐛 Pendências v5/v6/v7 ainda válidas

- **FOUC navbar** (cosmético, fase 2)
- **Affiliate tracking** — não foi smoke-testado em produção
- **Painel admin editável** (CRUD evento)
- **Embaixadores SACODE**
- **Área "Meu Perfil"** — incluindo botão de mudar senha logado (alternativa ao fluxo de recuperação)
- **Transferência de titularidade self-service**
- **P1/P2/A1/TD1**

## 🗄 Estado do banco (`ticket_batches` do evento `sacode-15-edicao`)

Inalterado desde v7:
```
sort_order | name                       | price | status
1          | Ingresso Promocional       | 15    | active
2          | Ingresso Único - Lote 01   | 20    | scheduled
3          | Ingresso Único - Lote 02   | 25    | scheduled
4          | Ingresso Único - Lote 03   | 35    | scheduled
```

`event_id = '6539575d-7a71-4c50-8f62-955bc5a96947'`. Todos `is_visible=true`, `sold_count=0`.

## 🔧 Como começar a próxima sessão

> Claude, retomando o projeto SACODE. Anexo `contexto-sacode-v8.md` com o estado pós-sessão de implementação da recuperação de senha (madrugada de 03/05). A feature está em branch `feature/recuperacao-senha` no GitHub, **não mergeada**. Main intacta. Vamos retomar pelo diagnóstico do bug "Redefinindo…" eterno na P1 do plano.

**Fim do contexto v8.**
