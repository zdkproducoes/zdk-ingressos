# 🎨 Migração de identidade visual — SACODE

> **Objetivo:** trocar a paleta vermelho/roxo atual pela paleta oficial SACODE (vinho, malva, âmbar, creme) de forma global, via Tailwind config + variáveis CSS.
>
> **Decisões já travadas:**
> - Aplicação global de uma vez (não página por página)
> - Badges de status mantém semáforos semânticos (verde/vermelho/amarelo) — não puxar pra paleta
> - Cores oficiais: `#45183F`, `#694060`, `#E4A03F`, `#EADBC4` + variações próximas

---

## 📋 Como executar (resumo pro Claude Code)

Cole este documento inteiro pro Claude Code e peça pra executar **na ordem**:

1. Substituir `tailwind.config.ts` (ou `.js`) pela versão deste documento
2. Substituir o bloco de variáveis CSS no `src/app/globals.css`
3. Aplicar o **find & replace global** das classes Tailwind antigas pelas novas (lista no final)
4. Rodar `npm run build` localmente pra validar
5. Commit + push

---

## 🎨 Paleta expandida — escala oficial SACODE

As 4 cores base foram expandidas em escalas Tailwind (50–950) usando variações próximas, autorizadas pelo Fernando.

### `wine` (vinho — fundos principais)

| Stop | Hex | Uso |
|------|-----|-----|
| 50 | `#F5E8F1` | (raro — texto sobre fundos escuros) |
| 100 | `#E5C4D9` | |
| 200 | `#C998B6` | |
| 300 | `#A56F92` | |
| 400 | `#7E4D74` | hover de elementos malva |
| 500 | `#5C2253` | superfície intermediária |
| 600 | `#45183F` | **★ cor oficial** — fundo de cards/headers |
| 700 | `#321131` | fundo secundário |
| 800 | `#2D0F2A` | fundo geral de páginas |
| 900 | `#1F0A1D` | fundo mais escuro (raro) |
| 950 | `#140711` | bordas escuras / sombras |

### `mauve` (malva — superfícies/bordas)

| Stop | Hex | Uso |
|------|-----|-----|
| 50 | `#F4ECF1` | |
| 100 | `#E5D2DF` | |
| 200 | `#D2B5C9` | |
| 300 | `#B98FAC` | |
| 400 | `#8B5E82` | hover de elementos |
| 500 | `#7A4F71` | bordas em destaque |
| 600 | `#694060` | **★ cor oficial** — bordas padrão, divisores |
| 700 | `#52314B` | bordas escuras |
| 800 | `#3F2639` | |
| 900 | `#2A1926` | |

### `amber-sacode` (âmbar — destaques/CTAs)

⚠️ Nome `amber-sacode` (não `amber`) pra não conflitar com o `amber` nativo do Tailwind.

| Stop | Hex | Uso |
|------|-----|-----|
| 50 | `#FCF3E2` | fundos suaves de info |
| 100 | `#F8E1B5` | |
| 200 | `#F2CB85` | |
| 300 | `#EFB560` | foco / ring |
| 400 | `#E4A03F` | **★ cor oficial** — botões primários, CTAs |
| 500 | `#D08F30` | hover de botões |
| 600 | `#C88A33` | pressed |
| 700 | `#A06D26` | bordas de botão |
| 800 | `#75501C` | |
| 900 | `#4D3412` | texto sobre fundos amber claros |

### `cream` (creme — texto e elementos claros)

| Stop | Hex | Uso |
|------|-----|-----|
| 50 | `#FBF6ED` | |
| 100 | `#F4EBD9` | |
| 200 | `#EADBC4` | **★ cor oficial** — texto principal sobre fundos escuros |
| 300 | `#D9C2A0` | texto secundário |
| 400 | `#BFA279` | texto terciário / dicas |
| 500 | `#A0855A` | |
| 600 | `#7D6644` | |

---

## 1️⃣ `tailwind.config.ts` — versão final

> Substitua o arquivo inteiro pela versão abaixo. Ajuste o caminho de `content` se sua estrutura for diferente.

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/emails/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial SACODE
        wine: {
          50:  "#F5E8F1",
          100: "#E5C4D9",
          200: "#C998B6",
          300: "#A56F92",
          400: "#7E4D74",
          500: "#5C2253",
          600: "#45183F",
          700: "#321131",
          800: "#2D0F2A",
          900: "#1F0A1D",
          950: "#140711",
        },
        mauve: {
          50:  "#F4ECF1",
          100: "#E5D2DF",
          200: "#D2B5C9",
          300: "#B98FAC",
          400: "#8B5E82",
          500: "#7A4F71",
          600: "#694060",
          700: "#52314B",
          800: "#3F2639",
          900: "#2A1926",
        },
        "amber-sacode": {
          50:  "#FCF3E2",
          100: "#F8E1B5",
          200: "#F2CB85",
          300: "#EFB560",
          400: "#E4A03F",
          500: "#D08F30",
          600: "#C88A33",
          700: "#A06D26",
          800: "#75501C",
          900: "#4D3412",
        },
        cream: {
          50:  "#FBF6ED",
          100: "#F4EBD9",
          200: "#EADBC4",
          300: "#D9C2A0",
          400: "#BFA279",
          500: "#A0855A",
          600: "#7D6644",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "sacode-gradient": "linear-gradient(135deg, #45183F 0%, #694060 100%)",
        "sacode-amber-gradient": "linear-gradient(135deg, #E4A03F 0%, #D08F30 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 2️⃣ `src/app/globals.css` — variáveis CSS

> Substitua o bloco `:root` (e qualquer `@layer base` correlato) pelo abaixo. Mantenha as importações do Tailwind no topo.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Paleta SACODE — variáveis CSS pra uso fora do Tailwind (e-mails, SVG inline, etc.) */
  --sacode-wine-600: #45183F;
  --sacode-wine-700: #321131;
  --sacode-wine-800: #2D0F2A;
  --sacode-wine-900: #1F0A1D;

  --sacode-mauve-600: #694060;
  --sacode-mauve-700: #52314B;

  --sacode-amber-400: #E4A03F;
  --sacode-amber-500: #D08F30;
  --sacode-amber-300: #EFB560;

  --sacode-cream-200: #EADBC4;
  --sacode-cream-300: #D9C2A0;
  --sacode-cream-400: #BFA279;

  /* Aliases semânticos (defaults do projeto) */
  --background: var(--sacode-wine-800);
  --background-elevated: var(--sacode-wine-600);
  --foreground: var(--sacode-cream-200);
  --foreground-muted: var(--sacode-cream-300);
  --foreground-subtle: var(--sacode-cream-400);
  --border-default: var(--sacode-mauve-600);
  --accent: var(--sacode-amber-400);
  --accent-hover: var(--sacode-amber-500);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
}

/* Scrollbar customizada (opcional, mas combina com a identidade) */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: var(--sacode-wine-900);
}
::-webkit-scrollbar-thumb {
  background: var(--sacode-mauve-700);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--sacode-mauve-600);
}

/* Seleção de texto */
::selection {
  background: var(--sacode-amber-400);
  color: var(--sacode-wine-800);
}
```

---

## 3️⃣ Find & Replace global (CRÍTICO — ordem importa)

> Execute na ordem exata abaixo. Use o **find/replace global** do VS Code (Ctrl+Shift+H) com **case-sensitive** e **whole word** ligados quando indicado. Faça os replaces **um por vez** e revise o diff antes de salvar.

### 3.1 — Fundos (do mais escuro pro mais claro, pra evitar conflito)

| Buscar | Substituir | Notas |
|--------|------------|-------|
| `bg-neutral-950` | `bg-wine-800` | fundo geral |
| `bg-neutral-900` | `bg-wine-600` | cards e superfícies elevadas |
| `bg-neutral-800` | `bg-wine-700` | superfícies intermediárias |
| `bg-black` | `bg-wine-900` | revisar caso a caso (header pode querer wine-600) |

### 3.2 — Bordas

| Buscar | Substituir |
|--------|------------|
| `border-neutral-700` | `border-mauve-600` |
| `border-neutral-800` | `border-mauve-700` |
| `border-neutral-600` | `border-mauve-500` |

### 3.3 — Texto

| Buscar | Substituir |
|--------|------------|
| `text-white` | `text-cream-200` |
| `text-neutral-200` | `text-cream-200` |
| `text-neutral-300` | `text-cream-300` |
| `text-neutral-400` | `text-cream-400` |
| `text-neutral-500` | `text-cream-400` |

### 3.4 — Marca (vermelho/roxo → âmbar/vinho)

⚠️ **Esta é a parte mais sensível.** O vermelho era a cor de destaque/CTA — agora vira âmbar.

| Buscar | Substituir | Onde aparece |
|--------|------------|--------------|
| `bg-red-600` | `bg-amber-sacode-400` | botões primários |
| `bg-red-700` | `bg-amber-sacode-500` | hover de botões |
| `hover:bg-red-700` | `hover:bg-amber-sacode-500` | |
| `text-red-600` | `text-amber-sacode-400` | links/destaques |
| `text-red-500` | `text-amber-sacode-300` | |
| `border-red-600` | `border-amber-sacode-400` | bordas de foco |
| `focus:border-red-600` | `focus:border-amber-sacode-400` | |
| `focus:ring-red-600` | `focus:ring-amber-sacode-400` | |
| `from-red-600` | `from-amber-sacode-400` | gradients |
| `to-red-600` | `to-amber-sacode-400` | |
| `bg-purple-700` | `bg-wine-600` | (era a cor secundária da marca) |
| `from-purple-700` | `from-wine-600` | |
| `to-purple-700` | `to-wine-600` | |
| `text-purple-600` | `text-mauve-400` | |

### 3.5 — Cor do texto sobre o âmbar (CRÍTICO)

⚠️ **Atenção especial:** botões âmbar precisam de texto **escuro** (não branco) pra ter contraste adequado. Procure manualmente por botões com classe `bg-amber-sacode-400` e ajuste o texto:

```diff
- <button className="bg-red-600 text-white hover:bg-red-700">
+ <button className="bg-amber-sacode-400 text-wine-800 hover:bg-amber-sacode-500 font-medium">
```

**Regra:** texto sobre âmbar = `text-wine-800` (vinho escuro). Texto sobre vinho = `text-cream-200` (creme).

### 3.6 — Inputs de formulário

Procure pelo padrão antigo de input e substitua:

```diff
- className="bg-neutral-900 border-neutral-700 focus:border-red-600 text-white"
+ className="bg-wine-700 border-mauve-600 focus:border-amber-sacode-400 text-cream-200 placeholder:text-cream-400"
```

### 3.7 — Modais (manter cores semânticas pros estados)

⚠️ **NÃO MEXER** nestes — a decisão foi manter semáforos:
- `bg-emerald-*` / `text-emerald-*` (sucesso)
- `bg-red-700/40`, `border-red-700` (erros — diferente do `bg-red-600` puro de botão)
- `bg-yellow-*` / `text-yellow-*` (warning)
- Badges de status: APROVADO (verde), PENDENTE (amarelo), CANCELADO (vermelho), ESGOTADO (vermelho)

**Regra prática:** se o vermelho/verde/amarelo está num **badge de status** ou **mensagem de erro/sucesso/aviso**, mantém. Se está num **botão de ação** (comprar, salvar, enviar), troca pra âmbar.

---

## 4️⃣ Ajustes finos (manuais)

Depois do find/replace, alguns componentes precisam de revisão manual.

### 4.1 — Navbar global

```tsx
// Cabeçalho:
<nav className="bg-wine-600 border-b border-mauve-600">

// Logo (texto):
<span className="text-cream-200 font-medium">SACODE</span>

// Links:
<a className="text-cream-200/80 hover:text-amber-sacode-400 transition">

// Avatar:
<div className="bg-mauve-600 text-cream-200">FZ</div>
```

### 4.2 — Footer

```tsx
<footer className="bg-wine-900 border-t border-mauve-700 text-cream-400">
  <p>Powered by SACODE Tickets</p>
  <a href="/buscar-ingresso" className="text-amber-sacode-400 hover:text-amber-sacode-300">
    Localizar meu ingresso
  </a>
</footer>
```

### 4.3 — Cards de lote (página do evento)

```tsx
// Card disponível:
<div className="bg-wine-600 border border-mauve-600 rounded-lg p-5 hover:border-amber-sacode-400 transition">
  <span className="text-cream-200 font-medium">1º Lote — Pista</span>
  <span className="bg-amber-sacode-400/20 text-amber-sacode-300 text-xs px-2 py-1 rounded-full">
    DISPONÍVEL
  </span>
  <span className="text-amber-sacode-400 text-2xl font-medium">R$ 60,00</span>
</div>

// Card esgotado/futuro:
<div className="bg-mauve-600/40 border border-mauve-600 rounded-lg p-5 opacity-60">
  ...
</div>
```

### 4.4 — Badges de status (mantém semáforo, mas com cor de fundo ajustada pro novo tema)

```tsx
// Aprovado:
<span className="bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-2 py-1 rounded-full text-xs">
  APROVADO
</span>

// Pendente:
<span className="bg-yellow-950 text-yellow-300 border border-yellow-800/50 px-2 py-1 rounded-full text-xs">
  PENDENTE
</span>

// Cancelado:
<span className="bg-red-950 text-red-300 border border-red-800/50 px-2 py-1 rounded-full text-xs">
  CANCELADO
</span>

// Esgotado:
<span className="bg-red-950 text-red-300 border border-red-800/50 px-2 py-1 rounded-full text-xs">
  ESGOTADO
</span>
```

### 4.5 — Template de e-mail (`src/emails/ticket.tsx` e `confirmation.tsx`)

E-mails **não usam Tailwind** — usam estilos inline. Precisa atualizar manualmente as cores hex:

```diff
- backgroundColor: "#0a0a0a"
+ backgroundColor: "#2D0F2A"

- backgroundColor: "#171717"
+ backgroundColor: "#45183F"

- color: "#dc2626"  // vermelho
+ color: "#E4A03F"  // âmbar

- color: "#ffffff"
+ color: "#EADBC4"

- borderColor: "#404040"
+ borderColor: "#694060"
```

---

## 5️⃣ Validação

Depois de todas as alterações, rode na ordem:

```bash
# 1. Build local — pega erros de TypeScript e Tailwind antes do deploy
npm run build

# 2. Dev server pra inspeção visual
npm run dev
```

**Checklist visual (antes do commit):**

- [ ] Página `/evento/sacode-15-edicao` — fundo vinho, lotes com âmbar, CTA dourado
- [ ] `/cadastro` e `/login` — formulários legíveis, foco âmbar visível
- [ ] `/minhas-compras` — cards de pedido com QR codes legíveis
- [ ] `/admin/resumo` — 4 cards de métricas com bom contraste
- [ ] `/admin/pedidos` — tabela com badges semânticos preservados
- [ ] Mobile: navbar, dropdown, formulários
- [ ] E-mail de confirmação (testar enviando um cadastro de teste)
- [ ] E-mail de ingresso (testar fazendo uma compra com cartão APRO)

---

## 6️⃣ Commit sugerido

```bash
git add .
git commit -m "feat(ui): aplica identidade visual oficial SACODE (vinho/malva/âmbar/creme)"
git push
```

---

## ⚠️ Pegadinhas comuns

1. **Classe `bg-amber-sacode-400` não funciona?** Provavelmente o `tailwind.config` não foi salvo ou o servidor não reiniciou. Mate o `npm run dev` e suba de novo.

2. **Texto "sumiu" sobre o botão âmbar?** Era branco antes. Coloque `text-wine-800` no botão.

3. **Borda do input não aparece no foco?** O `outline-none` do Tailwind pode estar removendo. Adicione `focus:ring-2 focus:ring-amber-sacode-400/50`.

4. **E-mails ficaram quebrados?** Os clientes de e-mail (Gmail, Outlook) **não suportam** variáveis CSS — você PRECISA usar hex direto nos templates (`#E4A03F`, etc.), não `var(--sacode-amber-400)`.

5. **Build falhou com erro Tailwind "unknown utility"?** O nome `amber-sacode` tem hífen — confirme que escreveu igual no `tailwind.config.ts` e no JSX.

---

**FIM.** Cole tudo no Claude Code, peça pra executar passo a passo, e revise o diff de cada etapa antes de commitar.
