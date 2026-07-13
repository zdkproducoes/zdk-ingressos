-- =====================================================================
-- 🚨 HOTFIX DE SEGURANÇA — RODAR NO SACODE EM PRODUÇÃO (sacode-mvp)
-- =====================================================================
-- Projeto:  sacode-mvp  (ref nsbyylbgnmzlgfwzgasl)
-- Onde:     Supabase Dashboard → SQL Editor → New query → colar → Run
-- Duração:  ~1 segundo. NÃO derruba o site, NÃO altera dados.
-- Data:     12/07/2026
--
-- ⚠️ CONFIRA O NOME DO PROJETO NO TOPO DO DASHBOARD ANTES DE RODAR.
--
-- ---------------------------------------------------------------------
-- O PROBLEMA (verificado no banco de produção em 12/07/2026)
-- ---------------------------------------------------------------------
-- Os papéis `anon` e `authenticated` têm GRANT de UPDATE/INSERT/DELETE em
-- TODAS as colunas de public.profiles — inclusive na coluna `role`. Como a
-- policy "profiles_update_self" permite ao usuário atualizar a PRÓPRIA
-- linha, qualquer pessoa com uma conta comum consegue, direto pela API
-- REST do Supabase (a anon key é pública, está no JS do site):
--
--   PATCH /rest/v1/profiles?id=eq.<meu_id>   { "role": "admin" }
--
-- E ao virar `admin`, as policies "Admins can manage all orders" e
-- "Admins can manage all items" (FOR ALL, USING profiles.role = 'admin')
-- liberam ALL em orders e order_items. Ou seja, a partir de uma conta
-- comum é possível:
--   1. ler os dados pessoais de TODOS os compradores (vazamento/LGPD);
--   2. inserir order_items com QR próprio e marcar orders como 'approved'
--      → INGRESSO VÁLIDO DE GRAÇA, que passa no check-in;
--   3. alterar/cancelar pedidos de terceiros.
--
-- Não há indício de exploração — é uma brecha aberta, não um incidente.
-- Mas com o evento de 02/08 chegando e a anon key exposta no site, o
-- risco é alto e o conserto é trivial.
--
-- ---------------------------------------------------------------------
-- A CORREÇÃO
-- ---------------------------------------------------------------------
-- BLOCO 1 (obrigatório): tira de anon/authenticated o poder de escrever em
--   profiles, devolvendo a `authenticated` apenas o UPDATE das colunas de
--   perfil que não são sensíveis. role/cpf/email/phone/id passam a ser
--   alteráveis somente pelo servidor (service_role), que já é como o app
--   faz hoje.
-- BLOCO 2 (recomendado): remove as policies "Admins can manage ..." de
--   orders/order_items. O painel admin do Sacode acessa o banco via
--   service_role (que ignora RLS), então essas policies não são usadas
--   pelo app — só ampliam a superfície de ataque.
--
-- ✅ Por que é seguro: no código do site NENHUMA tela grava em profiles
--    pelo navegador (só leitura); cadastro/checkout/painel escrevem via
--    rotas de servidor com service_role. Verificado no repositório.
--
-- Nota: há duas policies de update-self ativas (profiles_update_own e
-- profiles_update_self). Não precisamos removê-las — o fix age na camada
-- de GRANT (abaixo da RLS): sem UPDATE na coluda `role`, nenhuma policy
-- consegue liberar a escrita dela. As duas continuam valendo para as
-- colunas de perfil permitidas.
-- =====================================================================


-- ============================================================
-- ANTES: diagnóstico (rode e guarde o resultado)
-- ============================================================
SELECT 'ANTES' AS momento, grantee, privilege_type, count(*) AS colunas
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN ('INSERT', 'UPDATE')
GROUP BY grantee, privilege_type
ORDER BY grantee, privilege_type;


-- ============================================================
-- BLOCO 1 — profiles: escrita só nas colunas seguras  [OBRIGATÓRIO]
-- ============================================================

-- anon (visitante não logado) não escreve nada em profiles.
-- O cadastro cria o profile via trigger handle_new_user (SECURITY DEFINER),
-- que não depende destes grants.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;

-- authenticated: zera e devolve só o que é de perfil.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;

GRANT UPDATE (
  full_name,
  first_name,
  last_name,
  birth_date,
  gender,
  city,
  neighborhood,
  state,
  referral_source,
  marketing_consent,
  avatar_url,
  avatar_url_self
) ON public.profiles TO authenticated;

-- Colunas que ficam de fora de propósito (só o servidor altera):
--   role                → escalada de privilégio
--   cpf                 → identifica o ingresso / dado fiscal
--   email, phone        → precisam de revalidação (link/código)
--   email_confirmed_at  → burlaria a confirmação de e-mail
--   id, created_at, updated_at → chaves e metadados


-- ============================================================
-- BLOCO 2 — orders/order_items: tirar as policies de "admin"  [RECOMENDADO]
-- ============================================================
-- Essas policies dão ALL a quem tiver profiles.role='admin' via API
-- pública. O painel do Sacode não usa esse caminho (usa service_role),
-- então removê-las não afeta o app — e fecha o segundo elo do ataque.
-- Se preferir aplicar só o BLOCO 1 agora, pode: sem o role='admin' o
-- atacante não alcança essas policies.

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all items"  ON public.order_items;

-- Bônus: o INSERT direto de orders pelo cliente não é usado pelo checkout
-- (que cria o pedido no servidor, via service_role). Sem itens o pedido não
-- vira ingresso, mas ele sujaria relatórios. Removendo:
DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
REVOKE INSERT ON public.orders FROM anon, authenticated;


-- ============================================================
-- DEPOIS: confirmação
-- ============================================================
-- Esperado:
--   anon          → nenhuma linha (sem INSERT/UPDATE)
--   authenticated → UPDATE com 12 colunas
SELECT 'DEPOIS' AS momento, grantee, privilege_type, count(*) AS colunas
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND grantee IN ('anon', 'authenticated')
  AND privilege_type IN ('INSERT', 'UPDATE')
GROUP BY grantee, privilege_type
ORDER BY grantee, privilege_type;

-- Deve retornar ZERO linhas (as policies de admin sumiram):
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN ('Admins can manage all orders', 'Admins can manage all items', 'Customers can create orders');


-- =====================================================================
-- COMO TESTAR QUE FECHOU (opcional, 1 min)
-- =====================================================================
-- No navegador, logado no site do Sacode com uma conta comum, abra o
-- console (F12) e rode:
--
--   const { data: { session } } = await window.supabase.auth.getSession()
--
-- ...ou simplesmente peça pro Claude rodar o script de teste. O ataque
-- (PATCH em profiles trocando role para 'admin') deve responder 401/403.
-- Antes do fix ele respondia 204 (sucesso).
--
-- =====================================================================
-- ROLLBACK (só se algo inesperado quebrar — improvável)
-- =====================================================================
-- GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
-- GRANT INSERT, UPDATE, DELETE ON public.profiles TO anon;
-- GRANT INSERT ON public.orders TO anon, authenticated;
-- (as policies do BLOCO 2 podem ser recriadas a partir do histórico do
--  Supabase, mas o app não precisa delas)
-- =====================================================================
