-- =====================================================================
-- ZDK INGRESSOS — Categoria do evento (classificação da vitrine)
-- =====================================================================
-- Aplicada no projeto zdk-ingressos em 12/07/2026 (migration
-- categoria_evento). Lista de categorias e labels: src/lib/categories.ts.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category text;

COMMENT ON COLUMN public.events.category IS 'Categoria da vitrine (slug: pagode-samba, sertanejo, eletronico, rock, funk, festa-junina, futebol, ...)';

CREATE INDEX IF NOT EXISTS idx_events_category ON public.events (category);
