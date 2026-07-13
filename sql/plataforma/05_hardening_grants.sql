-- =====================================================================
-- ZDK INGRESSOS — Hardening: escrita de cliente só onde há policy legítima
-- =====================================================================
-- Aplicado no projeto zdk-ingressos em 12/07/2026 (migrations
-- hardening_revoke_client_writes + hardening_revoke_view_writes).
--
-- Defense-in-depth: os roles anon/authenticated recebem, por padrão do
-- Supabase, GRANT amplo de INSERT/UPDATE/DELETE em todas as tabelas.
-- Sem policy que os habilite, o RLS já nega — mas remover o grant elimina
-- a latência (evita reabrir brecha se uma policy for adicionada por engano).
--
-- Mantêm escrita de cliente (têm policy legítima):
--   profiles   → UPDATE das 12 colunas de perfil (grant de coluna)
--   wall_posts → INSERT/UPDATE do próprio autor que comprou ingresso
--   wall_likes → INSERT/DELETE das próprias curtidas
-- Todo o resto escreve apenas via service_role (rotas do servidor).

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname NOT IN ('profiles', 'wall_posts', 'wall_likes')
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- View (não atualizável, grant era inócuo)
REVOKE INSERT, UPDATE, DELETE ON public.batch_availability FROM anon, authenticated;
