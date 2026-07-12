-- =====================================================================
-- 09: FIX de segurança — vazamento de PII na tabela profiles
-- Aplicada em produção em 11/07/2026 (migration fix_vazamento_profiles).
-- =====================================================================
-- Falha (CRÍTICA): a policy `profiles_select_public` dava SELECT com
-- USING (true) para o papel `authenticated`. Como o app expõe a anon key
-- publicamente, QUALQUER usuário logado (qualquer um dos clientes) podia
-- dumpar a tabela profiles inteira — nome, CPF, e-mail, telefone, endereço,
-- nascimento de todos — via /rest/v1/profiles?select=*. Confirmado por
-- teste: usuário comum leu os 99 perfis.
--
-- Correção: remover a policy aberta. A leitura legítima do próprio perfil
-- (Navbar client-side) segue coberta por profiles_select_self / _own
-- (id = auth.uid()). Todo acesso a perfis de terceiros no app é feito por
-- rotas server-side com service_role (que ignora RLS) — nada quebra.
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_select_public ON public.profiles;

-- Consolida as duplicatas self-only remanescentes em uma só (limpeza).
DROP POLICY IF EXISTS profiles_select_own  ON public.profiles;  -- {public} auth.uid()=id
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;  -- {authenticated} id=auth.uid()

CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Anon continua sem ler nada (profiles_select_anon: USING false) e o
-- service_role continua com acesso total (profiles_service_all).
