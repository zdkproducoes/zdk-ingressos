-- =====================================================================
-- 🧹 HOTFIX #2 — Policies legadas de "producer/admin" no Sacode (opcional)
-- =====================================================================
-- Projeto:  sacode-mvp  (ref nsbyylbgnmzlgfwzgasl)
-- Onde:     Supabase Dashboard → SQL Editor → New query → colar → Run
-- Duração:  ~1 segundo. NÃO derruba o site, NÃO altera dados.
-- Depende:  rodar DEPOIS do HOTFIX_profiles_role.sql (já aplicado).
--
-- ⚠️ CONFIRME O NOME DO PROJETO NO TOPO DO DASHBOARD (sacode-mvp).
--
-- ---------------------------------------------------------------------
-- O PROBLEMA (verificado no banco de produção em 12/07/2026)
-- ---------------------------------------------------------------------
-- Sobraram policies do modelo "single-producer" original que a interface
-- do Sacode NUNCA usa (o painel escreve tudo via service_role, que ignora
-- RLS). Elas dão a QUALQUER usuário logado poder de escrita baseado em
-- `events.producer_id = auth.uid()` ou em `profiles.role`. Combinadas com
-- o GRANT de INSERT em events/ticket_batches, permitem que um usuário
-- comum:
--   1. crie um EVENTO em nome próprio (producer_id = ele);
--   2. marque-o como status='active' (a policy é FOR ALL, cobre UPDATE);
--   3. a home do Sacode redireciona pro "evento ativo mais recente" →
--      um evento FALSO poderia sequestrar/poluir a vitrine;
--   4. crie lotes, cupons e cortesias nesse evento-fantasma dele.
--
-- ⛔ Limite do dano (o grave já foi fechado no HOTFIX #1): ele NÃO acessa
--    os eventos reais do Caio, NÃO lê dados de compradores e NÃO gera
--    ingresso válido para os eventos verdadeiros. É abuso/poluição da
--    vitrine, não roubo de dados ou dinheiro.
--
-- ---------------------------------------------------------------------
-- POR QUE É SEGURO REMOVER
-- ---------------------------------------------------------------------
-- Todas as rotas do painel e do check-in do Sacode acessam o banco via
-- service_role (BYPASSRLS) — não dependem destas policies. O que o cliente
-- autenticado legitimamente faz (editar o próprio perfil, postar no mural)
-- é coberto por OUTRAS policies, que NÃO são tocadas aqui.
--
-- (Baseado no código do zdk-ingressos, que é cópia 1:1 do Sacode nessas
--  rotas. Se quiser 100% de garantia, aplique e me chame para eu testar o
--  site do Sacode em seguida.)
-- =====================================================================


-- ============================================================
-- ANTES: o que existe hoje
-- ============================================================
SELECT 'ANTES' AS momento, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND policyname IN (
  'events_all_producer',
  'batches_all_producer',
  'Producers manage coupons',
  'Producers manage courtesies',
  'Admins manage courtesies',
  'Producers manage collaborators',
  'admins manage affiliates',
  'Checkin can create logs'
)
ORDER BY tablename, policyname;


-- ============================================================
-- Remoção das policies legadas de escrita
-- ============================================================
DROP POLICY IF EXISTS "events_all_producer"           ON public.events;
DROP POLICY IF EXISTS "batches_all_producer"          ON public.ticket_batches;
DROP POLICY IF EXISTS "Producers manage coupons"      ON public.coupons;
DROP POLICY IF EXISTS "Producers manage courtesies"   ON public.courtesies;
DROP POLICY IF EXISTS "Admins manage courtesies"      ON public.courtesies;
DROP POLICY IF EXISTS "Producers manage collaborators" ON public.event_collaborators;
DROP POLICY IF EXISTS "admins manage affiliates"      ON public.affiliates;
DROP POLICY IF EXISTS "Checkin can create logs"       ON public.access_logs;

-- Reforço (defense-in-depth): tira o INSERT/UPDATE/DELETE direto dessas
-- tabelas dos roles de cliente. O app escreve via service_role.
REVOKE INSERT, UPDATE, DELETE ON public.events            FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ticket_batches    FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.coupons           FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.courtesies        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.event_collaborators FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.affiliates        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.access_logs       FROM anon, authenticated;


-- ============================================================
-- DEPOIS: confirmação (deve retornar ZERO linhas)
-- ============================================================
SELECT 'DEPOIS' AS momento, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND policyname IN (
  'events_all_producer', 'batches_all_producer', 'Producers manage coupons',
  'Producers manage courtesies', 'Admins manage courtesies',
  'Producers manage collaborators', 'admins manage affiliates',
  'Checkin can create logs'
);

-- Sanidade: o que SOBRA de escrita p/ o cliente deve ser só o legítimo
-- (perfil próprio + mural). Esperado: profiles_update_*, wall_posts_*, wall_likes_*.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname='public' AND cmd IN ('ALL','INSERT','UPDATE','DELETE')
  AND roles::text ~ '(anon|authenticated|public)' AND roles::text <> '{service_role}'
ORDER BY tablename, policyname;


-- =====================================================================
-- ROLLBACK (improvável precisar; as policies vêm do histórico do Supabase)
-- =====================================================================
-- Se o site quebrar (não deve), recrie a policy específica a partir do
-- histórico de migrations do projeto, ou me chame com o print do erro.
-- =====================================================================
