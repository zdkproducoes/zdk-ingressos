# 🎟️ Plataforma de Ingressos Multi-Produtor

> Nome provisório: **plataforma-ingressos** (renomear quando o nome/domínio for definido).

Plataforma de venda de ingressos para múltiplos produtores e casas de show,
derivada da estrutura do SACODE. Modelo estilo Blacktag:

- **Home** = vitrine com todos os eventos publicados de todos os produtores
- **Checkout** = conta Mercado Pago única da plataforma (repasse posterior via `payouts`)
- **Painel** = subdomínio `painel.DOMINIO` — cada produtor vê só os eventos,
  vendas e público da sua organização

## Documentos principais

- **[docs/plataforma-passo-a-passo.md](docs/plataforma-passo-a-passo.md)** — guia completo de criação (contas, Supabase, Vercel, domínio, MP)
- **[sql/plataforma/00_camada_organizacoes.sql](sql/plataforma/00_camada_organizacoes.sql)** — blueprint da camada multi-produtor (organizations, members, venues, payouts, RLS)
- **CLAUDE.md** — contexto do projeto para o Claude Code

## Stack

Next.js (App Router) · Supabase (Postgres + Auth + Storage) · Mercado Pago ·
Resend · Cloudflare Turnstile · Vercel

## Rodar local

```bash
npm install
cp .env.example .env.local   # preencher com as chaves do projeto NOVO
npm run dev
```

⚠️ Este projeto usa Supabase/Vercel/domínio **próprios** — nunca as chaves do
Sacode em produção.
