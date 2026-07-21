-- 99_limpeza_dados_teste.sql
-- Remove os dados de TESTE (seed E2E) da produção antes de subir o 1º evento real.
-- Projeto: zdk-ingressos (ref wohcypmrxwtjbqoxhqzp). Rode no SQL Editor.
--
-- ⚠️ Só apaga o que casa EXATAMENTE com os slugs/e-mails de teste abaixo — não
--    toca em nenhum dado real. É transacional: erro em qualquer passo = rollback.
--
-- Alvo:
--   eventos : festival-alfa, baile-beta
--   orgs    : produtora-alfa, produtora-beta
--   contas  : produtor.a@teste.com, produtor.b@teste.com, comprador@teste.com
--
-- A ordem respeita as FKs. As CASCADE (ticket_batches, coupons, affiliates,
-- courtesies, event_collaborators, meta_campaigns, wall_posts/wall_likes,
-- organization_members, order_items) são limpas automaticamente; os passos
-- explícitos abaixo cobrem as FKs NO ACTION (orders, access_logs, payouts).

-- ============================================================================
-- (opcional) confira o que será apagado ANTES de rodar o bloco de baixo:
--   select slug, title, status from events where slug in ('festival-alfa','baile-beta');
--   select name, slug from organizations where slug in ('produtora-alfa','produtora-beta');
--   select payment_status, total from orders
--     where event_id in (select id from events where slug in ('festival-alfa','baile-beta'));
-- ============================================================================

begin;

-- 1) Pedidos dos eventos de teste (CASCADE -> order_items)
delete from orders
where event_id in (select id from events where slug in ('festival-alfa','baile-beta'));

-- 2) FKs NO ACTION que apontam para os eventos de teste
delete from access_logs
where event_id in (select id from events where slug in ('festival-alfa','baile-beta'));
delete from payouts
where event_id in (select id from events where slug in ('festival-alfa','baile-beta'));

-- 3) Eventos de teste (CASCADE limpa lotes, cupons, afiliados, cortesias,
--    colaboradores, campanhas, mural e likes)
delete from events where slug in ('festival-alfa','baile-beta');

-- 4) Repasses e organizações de teste (CASCADE -> organization_members)
delete from payouts
where organization_id in (select id from organizations where slug in ('produtora-alfa','produtora-beta'));
delete from organizations where slug in ('produtora-alfa','produtora-beta');

commit;

-- ============================================================================
-- OPCIONAL — remover também as 3 CONTAS de teste.
-- ⚠️ Isto QUEBRA o seed do E2E (scripts/e2e-*.mjs). Só rode se não for mais
--    rodar a suíte de isolamento contra este banco.
-- ⚠️ NUNCA inclua o superadmin (conteudo@zdkproducoes.com.br).
-- ----------------------------------------------------------------------------
-- begin;
-- delete from profiles
--   where email in ('produtor.a@teste.com','produtor.b@teste.com','comprador@teste.com');
-- delete from auth.users
--   where email in ('produtor.a@teste.com','produtor.b@teste.com','comprador@teste.com');
-- commit;

-- ============================================================================
-- Conferência pós-limpeza (deve retornar 0 em tudo):
--   select
--     (select count(*) from events where slug in ('festival-alfa','baile-beta')) as eventos,
--     (select count(*) from organizations where slug in ('produtora-alfa','produtora-beta')) as orgs,
--     (select count(*) from orders) as pedidos;
-- ============================================================================
