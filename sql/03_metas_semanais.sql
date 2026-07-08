-- =====================================================================
-- SACODE — Gamificação dos embaixadores (pódio + metas)
-- =====================================================================
-- Como rodar:
--   1. Abra Supabase > SQL Editor > New query
--   2. Cole TUDO isso
--   3. Clique Run (Ctrl+Enter)
--   4. Aguarde "Success. No rows returned"
-- =====================================================================
-- As metas são POR EVENTO e valem para TODOS os embaixadores (cada um vê
-- o próprio progresso no painel /afiliado/<code>). Medidas em ingressos
-- vendidos (order_items de pedidos aprovados com affiliate_code).
--
-- Há dois tipos de meta:
--   - Meta do evento (a "grande meta"): 1 por evento, total da campanha.
--   - Metas semanais: quebram a grande meta em partes.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- BLOCO 1: Afiliados da organização ficam FORA do pódio e das metas
-- ---------------------------------------------------------------------

ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS is_staff boolean NOT NULL DEFAULT false;

-- Links da própria produção (não são embaixadores de verdade)
UPDATE public.affiliates
SET is_staff = true
WHERE code IN ('mr', 'insta-sacode', 'caio-lacerda');


-- ---------------------------------------------------------------------
-- BLOCO 2: Meta do evento (a grande meta — 1 por evento)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.affiliate_event_goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  target_tickets integer NOT NULL CHECK (target_tickets >= 1),  -- por embaixador, no evento todo
  reward         text,                                          -- ex: "Camarote + prêmio em dinheiro"
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_event_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliate_event_goals_service_all" ON public.affiliate_event_goals;
CREATE POLICY "affiliate_event_goals_service_all" ON public.affiliate_event_goals
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- BLOCO 3: Metas semanais (quebram a grande meta em partes)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.affiliate_weekly_goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title          text,                                   -- ex: "Semana 1 — Aquecimento"
  week_start     date NOT NULL,
  week_end       date NOT NULL,
  target_tickets integer NOT NULL CHECK (target_tickets >= 1),
  reward         text,                                   -- ex: "Camisa exclusiva do SACODE"
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_weekly_goals_range CHECK (week_end >= week_start),
  CONSTRAINT affiliate_weekly_goals_unique_start UNIQUE (event_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_weekly_goals_event
  ON public.affiliate_weekly_goals(event_id, week_start);

-- Acesso apenas via service_role (admin e painel do embaixador passam
-- pelo servidor Next; o token do painel é a credencial, não o Supabase).
ALTER TABLE public.affiliate_weekly_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliate_weekly_goals_service_all" ON public.affiliate_weekly_goals;
CREATE POLICY "affiliate_weekly_goals_service_all" ON public.affiliate_weekly_goals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- FIM. Se chegou aqui sem erro, a gamificação está pronta 🎯
-- ---------------------------------------------------------------------
