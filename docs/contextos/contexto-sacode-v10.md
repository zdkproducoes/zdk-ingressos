# Contexto SACODE — v10

> Atualizado em **04/05/2026** (segunda-feira, manhã — antes das 12h, horário do lançamento).
> Sessão dedicada à publicação dos documentos jurídicos finais (Termos de Uso e Política de Privacidade) com modal de aceite no cadastro.
> Cole esse arquivo no próximo chat junto com a frase: *"Claude, retomando o projeto SACODE. Anexo contexto-sacode-v10.md."*

---

## 🎯 Projeto

**Fernando Zedeque (ZDK Produções)** construindo plataforma própria de venda de ingressos. MVP no evento **SACODE 15ª Edição (Aquecimento Copa)** — artista Caio Lacerda, **07/06/2026** no Villa Jardim Bar (SBC/ABC paulista).

**Lançamento das vendas:** **04/05/2026 (segunda-feira) às 12h** — em algumas horas a partir desse contexto. Todos os bloqueadores conhecidos foram resolvidos.

## 🛠 Stack

Next.js 14 + Tailwind / Supabase (Auth+DB+Storage, `@supabase/ssr` v0.5.2, `supabase-js` v2.104.1) / Resend (auth + transacional) / Mercado Pago (HMAC ativo) / Vercel / GitHub.

**Adições nessa sessão:** plugin `@tailwindcss/typography` instalado.

---

## 👤 Perfil do usuário e processo de trabalho

**Importante manter em todas as próximas sessões:**

- **Iniciante** — sempre fornecer instruções passo a passo simplificadas e numeradas. Não assumir conhecimento prévio.
- **Setup de 3 janelas PowerShell:** **DEV** (roda servidor local `npm run dev`), **GIT** (comandos git), **CLAUDE** (Claude Code). Sempre especificar qual janela usar pra cada comando.
- **Estilo de passo a passo preferido:** dar o próximo passo + o passo seguinte com condição. Exemplo: *"Roda X. Se aparecer Y, segue pro Z. Se aparecer algo diferente, cola aqui."* O usuário decide se segue ou pausa baseado no output esperado vs inesperado.
- **NÃO repetir instruções anteriores** quando ele cola output. Só responder ao que é novo.
- **Edição manual de arquivos** (VS Code direto ou PowerShell) é a preferência. Continuar fornecendo conteúdo completo de arquivos pra copy-paste manual ao invés de tentar automatizar via Claude Code.
- **NOVO — Geração de arquivos prontos para download:** quando o conteúdo é grande ou tem caracteres especiais (acentos), Claude deve gerar o arquivo direto no ambiente e disponibilizar pra download (via `present_files`) em vez de pedir copy-paste. Esse padrão funcionou muito bem nessa sessão e elimina problemas de encoding.
- **Encoding bagunçado no PowerShell é falso positivo:** `Get-Content` exibe arquivos UTF-8 com acentos errados (`PolÃ­tica` etc.), mas o arquivo está correto. Validar sempre abrindo no Notepad ou navegador, não no PowerShell.

---

## ✅ O que foi feito na sessão de 04/05 (manhã)

### Termos de Uso e Política de Privacidade publicados

Documentos finalizados pelo advogado, ajustados (placeholder de data preenchido com "04 de maio de 2026", nota interna ao advogado removida) e implementados em produção.

### Arquitetura adotada — componentização para evitar duplicação

Em vez de ter o texto dos documentos em 2 lugares (página + modal), foi criada arquitetura com **componentes de conteúdo compartilhados**:

```
src/components/legal/
  ├── LegalModal.tsx          (modal genérico reutilizável)
  ├── TermosContent.tsx       (texto dos Termos com prop darkBg)
  └── PrivacidadeContent.tsx  (texto da Política com prop darkBg)

src/app/termos/page.tsx       (usa <TermosContent darkBg={false} />)
src/app/privacidade/page.tsx  (usa <PrivacidadeContent darkBg={false} />)

src/components/auth/SignupForm.tsx
  └── usa <LegalModal> + <TermosContent darkBg={true} />
  └── usa <LegalModal> + <PrivacidadeContent darkBg={true} />
```

A prop `darkBg` adapta a paleta: cores escuras em fundo branco (página) ou cores claras em fundo wine (modal). Atualizar texto futuro = mexer em 1 lugar.

### Recursos do `LegalModal`

- Fecha clicando fora, no botão X (canto superior direito), no botão "Fechar" do rodapé, ou apertando `Esc`
- Bloqueia scroll do body enquanto aberto
- Foco automático no botão de fechar ao abrir (acessibilidade)
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (acessibilidade)
- Scroll interno no conteúdo (máximo 90vh de altura)
- Backdrop escuro com blur

### Mudanças no `SignupForm.tsx`

- Adicionados 3 imports (`LegalModal`, `TermosContent`, `PrivacidadeContent`)
- Adicionados 2 estados: `showTermosModal` e `showPrivacidadeModal`
- Substituídos 2 `<a href="/termos">` e `<a href="/privacidade">` por `<button onClick>` que abrem os modais
- **Detalhe crítico:** `e.preventDefault()` no onClick — sem isso, o clique no botão dentro do `<label>` propagaria pro checkbox e marcaria/desmarcaria sem o usuário querer
- Adicionados 2 componentes `<LegalModal>` no fim do JSX, antes do `</>`

### Plugin Tailwind Typography instalado

Necessário pro `prose` funcionar (estilização automática de texto longo). Sem ele, links sairiam com cor padrão do navegador (roxo) e o texto sem espaçamento. Comando usado: `npm install -D @tailwindcss/typography`. Adicionado em `tailwind.config.ts` na seção `plugins: [require("@tailwindcss/typography")]`.

### Decisões jurídicas embutidas nos textos

- **Controlador:** 44.816.216 CAIO DIEGO MARTINS (CNPJ 44.816.216/0001-03)
- **Operador:** ZDK Produções
- **DPO:** Fernando Zedeque — `privacidade@zdkproducoes.com.br`
- **Atendimento:** `ingressos@cantorcaiolacerda.com.br`
- **Direito de arrependimento:** 7 dias (art. 49 CDC)
- **Cancelamento de evento:** reembolso integral em 30 dias
- **Adiamento:** opção entre manter ingresso ou solicitar reembolso (15 dias para optar)
- **Transferência:** 1 transferência por ingresso, mínimo 6h antes do evento, manual via e-mail (até função self-service ser implementada)
- **Sem meia-entrada** — preço único promocional por lote
- **Foro:** domicílio do consumidor (art. 101 CDC)

---

## 🐛 Bugs ainda abertos (não-bloqueantes pro lançamento)

### Botão "Sair" no header não funciona
- Status inalterado desde v8/v9. Não foi investigado nessa sessão.
- Workaround: limpar cookies + localStorage no DevTools, ou fechar aba.
- Investigar com calma na fase 2.

### FOUC navbar (cosmético)
- Inalterado, fase 2.

### Encoding visual no PowerShell
- `Get-Content` exibe acentos errados (`Ã©`, `â€¦`), mas o arquivo é UTF-8 válido. Falso positivo do PowerShell, não é bug do código.

---

## 📐 Decisões técnicas dessa sessão

### Por que componentes compartilhados em vez de copiar texto

Tinha duas opções: (a) duplicar o texto entre página e modal, ou (b) extrair em componente. Escolhida (b) porque atualizações futuras (advogado pedindo ajuste) serão inevitáveis, e ter 2 fontes de verdade é receita pra divergência. O custo extra (1 prop `darkBg`) é mínimo.

### Por que `<button>` em vez de `<a href="/termos" target="_blank">`

Discutido brevemente. Botão dentro de `<label>` requer `e.preventDefault()` pra não acionar o checkbox, mas mantém o usuário no fluxo de cadastro sem perder dados preenchidos. Abrir nova aba (`target="_blank"`) tira o usuário do fluxo, e a UX ficaria pior em mobile (que é o caso de uso predominante).

### Por que páginas `/termos` e `/privacidade` foram mantidas

Mesmo com modais no cadastro, as páginas continuam acessíveis em URL própria. Útil pra:
- Compartilhamento (link em e-mail, redes sociais, suporte)
- SEO (Google indexa)
- Direito legal de o usuário ter um link permanente pros termos
- Linkagem futura no rodapé do site

### Por que evitar substituir o `SignupForm.tsx` inteiro

O arquivo é grande (~280 linhas) e tem lógica não-trivial (Turnstile, validações, máscaras de CPF/telefone, fluxo de reenvio com cooldown). Substituir tudo aumenta risco de regressão. Mudanças cirúrgicas (3 imports + 2 estados + substituir 1 trecho do JSX + adicionar 2 modais no fim) são mais seguras e fáceis de revisar.

---

## 📝 Aprendizados que valem ouro pro futuro

### Geração de arquivos pra download > copy-paste pra textos longos
- Copy-paste de arquivo grande pro VS Code novo pode bagunçar encoding (Windows-1252 vs UTF-8)
- Geração no ambiente do Claude + `present_files` + `Move-Item` é mais confiável
- Funcionou perfeitamente nessa sessão pra os 5 arquivos (LegalModal, 2 components, 2 pages)

### Mudanças cirúrgicas em arquivos existentes — fornecer trechos a substituir, não o arquivo inteiro
- Arquivo grande com lógica importante? Não substituir, fazer N substituições pequenas localizadas
- Format ideal: "encontra esse trecho X e substitui por Y" + "adiciona Z depois da linha W"
- Reduz risco de regressão e facilita revisão

### `@tailwindcss/typography` é praticamente obrigatório pra texto longo
- Sem o plugin, `prose` não faz nada — links saem na cor padrão do navegador (roxo), espaçamento ruim
- Plugin é dev-only (`-D`), zero custo em runtime
- Aplicado nessa sessão com `prose-zinc` (fundo branco) e `prose-invert` (fundo escuro)

### Botão dentro de `<label>` propaga clique pro input — `e.preventDefault()` resolve
- Comportamento HTML padrão do `<label>`: qualquer clique dentro dele aciona o input vinculado
- `preventDefault` no onClick do botão é a solução padrão
- Aprendizado relevante pra qualquer interação semelhante futura (modal "ajuda" dentro de label, tooltip clicável, etc.)

### Cores do projeto (paleta SACODE referência)
- `wine-700`, `wine-800` — fundos principais escuros
- `mauve-600`, `mauve-700` — bordas
- `cream-100`, `cream-200`, `cream-300`, `cream-400` — texto sobre fundo escuro
- `amber-sacode-300`, `amber-sacode-400`, `amber-sacode-500` — destaques (botões, links)
- `zinc-200`, `zinc-300`, `zinc-700`, `zinc-900` — paleta neutra (páginas com fundo branco)
- `red-700`, `red-800` — links em fundo branco

### Arquivo `page.tsx` na pasta `src/app/cadastro/` tem strings com encoding bagunçado
- Strings JSX visíveis (`Já tem conta?`, `Voltar`, `Criar minha conta`) aparecem com `Ã©`, `â†` em alguns arquivos
- Notepad mostra correto, então é apenas problema de visualização, não do código
- **Pendência futura:** quando tiver tempo, fazer varredura geral pra normalizar — mas não é bloqueante pro lançamento

---

## 🚦 Plano para próxima sessão

### Lançamento iminente — segunda 04/05 às 12h (horário deste contexto)

Tudo está em produção. Já passou:
- ✅ Recuperação de senha
- ✅ Termos de Uso publicados em `/termos`
- ✅ Política de Privacidade publicada em `/privacidade`
- ✅ Modais de aceite no cadastro
- ✅ Checkbox de aceite protegido contra clique acidental

### Pós-lançamento (semana 1)
- **Monitorar** primeiras compras reais (logs Vercel, Supabase, e-mails Resend)
- Investigar e corrigir botão "Sair" no header
- Smoke-testar affiliate tracking em produção (pendência v5/v6/v7/v8/v9)
- Avaliar criação de área "Meu Perfil" com botão de mudar senha logado
- Considerar adicionar links pros documentos legais no footer do site (atualmente só estão acessíveis via cadastro e URL direta)

### Roadmap maior (fase 2)
- Painel admin editável (CRUD evento)
- Embaixadores SACODE
- Transferência de titularidade self-service (atualmente manual via e-mail conforme cláusula 6.4 dos Termos)
- FOUC navbar
- Varredura geral de encoding em strings JSX
- P1/P2/A1/TD1

---

## 🎨 Decisões de design vigentes (inalteradas)

- Skin Copa **só em** `/evento/sacode-15-edicao`. Resto do site = paleta vinho SACODE.
- Lote único exibido sem contador (a menos que ≥90% vendido OU <24h pra próximo lote).
- Logo PNG transparente nas barras.
- Iframe Google Maps em vez de Leaflet/OSM.
- **NOVO:** Páginas legais (`/termos`, `/privacidade`) usam fundo branco com `prose-zinc` (saem da paleta vinho intencionalmente, pra leitura confortável e neutralidade).
- **NOVO:** Modais legais usam fundo `wine-700` com `prose-invert` (mantém imersão na identidade SACODE quando exibidos no fluxo de cadastro).

## 📜 Decisões jurídicas vigentes

Termos com advogado, **publicados em produção**. Caio Lacerda (CNPJ 44.816.216/0001-03) é Organizador+Controlador; ZDK é Operadora. Sem meia-entrada. Direito de arrependimento 7d. Cancelamento: cliente escolhe crédito/reembolso. DPO: `privacidade@zdkproducoes.com.br`.

## 🐛 Pendências v5–v9 ainda válidas

- **Botão "Sair" no header** (descoberto na sessão de 02/05, persistente)
- **FOUC navbar** (cosmético, fase 2)
- **Affiliate tracking** — não foi smoke-testado em produção
- **Painel admin editável** (CRUD evento)
- **Embaixadores SACODE**
- **Área "Meu Perfil"** — incluindo botão de mudar senha logado (alternativa ao fluxo de recuperação)
- **Transferência de titularidade self-service**
- **P1/P2/A1/TD1**
- **Varredura geral de encoding** em strings JSX (não-bloqueante)

## 🗄 Estado do banco (`ticket_batches` do evento `sacode-15-edicao`)

Inalterado desde v7/v8/v9:
```
sort_order | name                       | price | status
1          | Ingresso Promocional       | 15    | active
2          | Ingresso Único - Lote 01   | 20    | scheduled
3          | Ingresso Único - Lote 02   | 25    | scheduled
4          | Ingresso Único - Lote 03   | 35    | scheduled
```

`event_id = '6539575d-7a71-4c50-8f62-955bc5a96947'`. Todos `is_visible=true`, `sold_count=0`.

## 🗂 Estrutura de arquivos relevante (após sessão 04/05)

```
src/
├── app/
│   ├── cadastro/
│   │   └── page.tsx
│   ├── termos/
│   │   └── page.tsx              ← NOVO (sessão 04/05)
│   ├── privacidade/
│   │   └── page.tsx              ← NOVO (sessão 04/05)
│   └── api/auth/
│       ├── signup/route.ts
│       ├── redefinir-senha/route.ts
│       └── resend-confirmation/route.ts
├── components/
│   ├── auth/
│   │   ├── SignupForm.tsx        ← MODIFICADO (sessão 04/05)
│   │   └── RedefinirSenhaForm.tsx
│   ├── legal/                    ← NOVO (sessão 04/05)
│   │   ├── LegalModal.tsx
│   │   ├── TermosContent.tsx
│   │   └── PrivacidadeContent.tsx
│   └── ui/
│       └── ErrorModal.tsx
└── ...
```

## 🔧 Como começar a próxima sessão

> Claude, retomando o projeto SACODE. Anexo `contexto-sacode-v10.md`. Lançamento das vendas ocorreu em 04/05/2026 às 12h. Termos e Política de Privacidade estão em produção com modais de aceite no cadastro. Hoje vamos retomar com [TÓPICO].

**Fim do contexto v10.**
