-- =====================================================================
-- ZDK INGRESSOS — Área do cliente (tokens de troca) + fix de segurança
-- =====================================================================
-- Aplicada no projeto zdk-ingressos em 12/07/2026 (migration
-- area_cliente_tokens_e_grant_perfil).
--
-- ⚠️ O FIX DE GRANT ABAIXO TAMBÉM SE APLICA AO SACODE EM PRODUÇÃO:
-- lá a mesma policy profiles_update_self + GRANT amplo permite um usuário
-- autenticado alterar o próprio role para 'admin' via PostgREST.
-- Rodar o bloco "FIX DE SEGURANÇA" no projeto sacode-mvp também
-- (ajustando a lista de colunas ao schema de lá, que é o mesmo).

CREATE TABLE IF NOT EXISTS public.account_change_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('email', 'phone')),
  new_value  text NOT NULL,           -- novo e-mail ou novo celular
  token_hash text NOT NULL,           -- sha256 do token/código
  attempts   integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_change_tokens_user
  ON public.account_change_tokens (user_id, kind, created_at DESC);

ALTER TABLE public.account_change_tokens ENABLE ROW LEVEL SECURITY;
-- service_role only (BYPASSRLS); nenhuma policy para anon/authenticated

-- ============================================================
-- 🔒 FIX DE SEGURANÇA: grant por coluna no UPDATE de profiles
-- ============================================================
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  full_name, first_name, last_name, birth_date, gender,
  city, neighborhood, state, referral_source,
  marketing_consent, avatar_url, avatar_url_self
) ON public.profiles TO authenticated;
-- phone/email/cpf/role/email_confirmed_at: só via rotas do servidor
-- (service_role) com as devidas validações.
