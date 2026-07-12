# ZDK Ingressos — Plataforma Multi-Produtor

## O que é este projeto

**ZDK Ingressos** (`www.zdkingressos.com.br`, domínio ainda não comprado;
painel em `painel.zdkingressos.com.br`): plataforma de venda de ingressos
multi-produtor/multi-evento, criada em julho/2026 como fork do projeto
`sacode-ingressos` (que fica em `..\banco_de_dados\sacode-ingressos` e segue
em produção — **nunca mexer lá a partir daqui**). O Sacode será migrado para
dentro da plataforma como uma organização depois que ela estiver estável.

A identidade da plataforma (nome, URLs, e-mail, pixel, CNPJ) vem de
`src/lib/config.ts` (objeto `platform`), alimentado por env vars — nunca
hardcodear marca no código.

## Identidade visual (manual da marca v1.0, aprovado em 12/07/2026)

- Conceito: "cada batida vira entrada" — símbolo = ingresso com picote +
  barras de equalizador (herda a ZDK Produções). Componentes em
  `src/components/brand/Logo.tsx`; arquivos em `public/brand/`.
- Paleta: Preto Palco/Grafite (`surface`), Ouro ZDK `#D9A63F` (`accent`),
  Prata/Gelo (`cream`/`muted`). Tokens em `tailwind.config.ts` +
  `globals.css` (--brand-*); organizações sobrescrevem via
  `organizations.brand` (BrandTheme).
- Tipografia: Archivo Expanded (display, next/font com eixo wdth +
  font-stretch 125% via .font-display/.font-display-bold) + Inter (corpo).
- O manual completo está publicado como artifact (Claude) — pedir o link
  ao Fernando se precisar.

## Decisões de arquitetura (fechadas com o Fernando)

- **Modelo estilo blacktag.com.br**: home = vitrine com todos os eventos de todos
  os produtores; cliente entra na página do evento (`/evento/[slug]`) e compra.
- **Mercado Pago: conta ÚNICA da plataforma** (mesma conta do Sacode, aplicação
  MP separada). SEM split/OAuth por produtor por enquanto. Repasses aos
  produtores são registrados na tabela `payouts`.
- **Painel em subdomínio** (`painel.DOMINIO`): mesmo projeto Vercel/codebase; o
  middleware reconhece o Host e serve só as rotas admin. Cada produtor enxerga
  apenas os dados da sua organização.
- **Infra própria**: Supabase novo **já criado** (projeto `zdk-ingressos`,
  ref `wohcypmrxwtjbqoxhqzp`, região São Paulo) com schema aplicado
  (`sql/plataforma/000_schema_base.sql` + `00_camada_organizacoes.sql` +
  `01_conteudo_e_seed.sql`) e buckets `wall-images`/`qr-codes`/`event-assets`.
  Faltam: Vercel, domínio, Turnstile, Resend. Guia em
  `docs/plataforma-passo-a-passo.md`.

## Banco de dados

- O schema base (events, orders, tickets, batches, coupons, affiliates, profiles,
  wall_*, etc.) é o do Sacode — migrations históricas em `sql/`.
- A camada multi-produtor está em `sql/plataforma/00_camada_organizacoes.sql`:
  `organizations` (taxa da plataforma, brand jsonb, payout_info),
  `organization_members` (roles: owner/admin/staff/checkin), `venues`,
  `events.organization_id`, `payouts`, função `is_org_member()`, RLS.
- `profiles.role`: 'admin' = superadmin da plataforma; 'producer' = acessa o
  painel com escopo via organization_members; 'user' = comprador.

## ⚠️ Ponto crítico de segurança

As rotas `/api/admin/*` usam `service_role`, que **bypassa RLS**. O isolamento
por produtor TEM que ser aplicado no código: toda rota do painel resolve a(s)
organização(ões) do usuário logado via `organization_members` e filtra por
`organization_id` / eventos da org. Um filtro esquecido = um produtor vendo
vendas de outro.

## Trabalho pendente (ordem)

1. Gate do painel por `organization_members` (substituir admin único)
2. Escopo por organização em TODAS as rotas `/api/admin`
3. Home vitrine (hoje a home é o evento único do Sacode)
4. Middleware: subdomínio `painel.` serve só o admin
5. Desacoplar marca: ~291 ocorrências hardcoded de "SACODE/cantorcaiolacerda"
   em ~60 arquivos de `src/` → ler de `organizations.brand` / config do tenant
6. Painel financeiro do produtor (vendas, taxa, repasses/`payouts`)
7. Tela do superadmin (criar org, definir taxa, registrar repasse)

## Convenções herdadas do Sacode

- Textos e comentários em português (pt-BR)
- Commits em português: `feat:`, `fix:`, `docs:`, `chore:`
- Supabase via `@supabase/ssr` (server/browser/admin em `src/lib/supabase/`)
- Nunca commitar chaves; `.env.local` está no .gitignore
