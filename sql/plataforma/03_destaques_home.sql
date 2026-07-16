-- =====================================================================
-- DESTAQUES DA HOME — carrossel com até 5 posições (espaço pago)
-- =====================================================================
-- O superadmin define a posição (1..5) de um evento no carrossel da home
-- pelo painel (aba Eventos). null = não destacado.
-- Sem nenhum destaque marcado, o carrossel completa as vagas com os
-- próximos eventos por data (comportamento padrão).
--
-- Rodar no SQL Editor do projeto zdk-ingressos (wohcypmrxwtjbqoxhqzp).

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS featured_order smallint
  CHECK (featured_order BETWEEN 1 AND 5);

COMMENT ON COLUMN public.events.featured_order IS
  'Posição no carrossel de destaques da home (1..5); null = não destacado. Definido apenas pelo superadmin (espaço pago).';

-- Consulta da home filtra por "featured_order is not null"
CREATE INDEX IF NOT EXISTS idx_events_featured
  ON public.events (featured_order)
  WHERE featured_order IS NOT NULL;
