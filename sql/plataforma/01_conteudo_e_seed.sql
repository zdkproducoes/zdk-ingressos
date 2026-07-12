-- =====================================================================
-- ZDK INGRESSOS — Conteúdo data-driven da página do evento + seeds
-- =====================================================================
-- Rodar DEPOIS de 000_schema_base.sql e 00_camada_organizacoes.sql,
-- apenas no projeto Supabase da plataforma (zdk-ingressos).
--
-- A página pública do evento deixa de ter conteúdo hardcoded (era o
-- Sacode fixo) e passa a ler tudo do banco:
--   - banner_url (já existia)   → imagem hero
--   - og_image_url (novo)       → imagem de compartilhamento (OG/Twitter)
--   - venue_lat/venue_lng (já existiam) → mapa + JSON-LD geo
--   - content (novo, jsonb)     → textos/estrutura flexível:
--       {
--         "subtitle":        "texto curto abaixo do título",
--         "opening_notice":  "ex.: vendas abrem 08/07 às 18h",
--         "about_html":      "descrição longa (HTML sanitizado)",
--         "lineup":          [{ "name": "Artista", "genre": "Pagode" }],
--         "seo_keywords":    ["show", "cidade", ...]
--       }
-- =====================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS content      jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.events.og_image_url IS 'Imagem OpenGraph/Twitter do evento (fallback: brand da organização)';
COMMENT ON COLUMN public.events.content      IS 'Conteúdo flexível da página do evento: subtitle, opening_notice, about_html, lineup[], seo_keywords[]';


-- ============================================================
-- SEED: superadmin da plataforma
-- ============================================================
-- Rodar manualmente APÓS o primeiro login do Fernando criar o profile:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'conteudo@zdkproducoes.com.br';
