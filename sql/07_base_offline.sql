-- =====================================================================
-- 07: Base de público OFFLINE (importada de outra plataforma)
-- Aplicada em produção em 11/07/2026 (migration base_offline_publico).
-- Usada SOMENTE na aba Público do admin (filtro de origem Sacode/Offline/
-- Todos). Não participa de pedidos, login ou qualquer fluxo transacional.
-- Import: arquivo modelo em docs/base-offline-modelo.csv.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.offline_audience (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,
  first_name  text,
  phone       text,
  gender      text CHECK (gender IN ('masculino','feminino','nao_binario','prefiro_nao_dizer','outro')),
  birth_date  date,
  city        text,
  email       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Acesso apenas via service role (admin do site); nenhum acesso client-side.
ALTER TABLE public.offline_audience ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS offline_audience_birth_date_idx ON public.offline_audience (birth_date);
