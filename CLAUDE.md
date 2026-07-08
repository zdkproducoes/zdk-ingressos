# Plataforma de Ingressos Multi-Produtor

## O que é este projeto

Plataforma de venda de ingressos multi-produtor/multi-evento, criada em julho/2026
como fork do projeto `sacode-ingressos` (que fica em
`..\banco_de_dados\sacode-ingressos` e segue em produção — **nunca mexer lá a
partir daqui**). O código ainda é uma cópia 1:1 do Sacode e precisa ser adaptado
(ver "Trabalho pendente").

## Decisões de arquitetura (fechadas com o Fernando)

- **Modelo estilo blacktag.com.br**: home = vitrine com todos os eventos de todos
  os produtores; cliente entra na página do evento (`/evento/[slug]`) e compra.
- **Mercado Pago: conta ÚNICA da plataforma** (mesma conta do Sacode, aplicação
  MP separada). SEM split/OAuth por produtor por enquanto. Repasses aos
  produtores são registrados na tabela `payouts`.
- **Painel em subdomínio** (`painel.DOMINIO`): mesmo projeto Vercel/codebase; o
  middleware reconhece o Host e serve só as rotas admin. Cada produtor enxerga
  apenas os dados da sua organização.
- **Infra própria**: Supabase novo, Vercel novo, domínio novo, Turnstile novo,
  domínio verificado no Resend. Guia completo em `docs/plataforma-passo-a-passo.md`.
- Nome/domínio da plataforma: **ainda não definidos** (pasta com nome provisório).

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
