-- =====================================================================
-- PLATAFORMA MULTI-PRODUTOR — Camada de organizações (RASCUNHO / BLUEPRINT)
-- =====================================================================
-- ONDE RODAR: no projeto Supabase NOVO da plataforma, DEPOIS de replicar
--             o schema base do Sacode (events, orders, tickets, batches,
--             coupons, affiliates, profiles, etc.).
-- NÃO RODAR no Supabase do Sacode em produção.
--
-- Modelo (estilo Blacktag):
--   - Home = vitrine com todos os eventos publicados de todos os produtores
--   - Checkout = conta Mercado Pago ÚNICA da plataforma (repasse posterior)
--   - Painel = subdomínio (painel.dominio.com.br); cada produtor enxerga
--     apenas os eventos/vendas/público da sua organização
--
-- IMPORTANTE (segurança): as rotas /api/admin usam service_role, que
-- BYPASSA RLS. O isolamento por produtor precisa ser garantido no código:
-- toda rota do painel deve resolver a organização do usuário logado
-- (via organization_members) e filtrar por organization_id/event_id.
-- As policies abaixo protegem o acesso via anon/authenticated.
-- =====================================================================


-- ============================================================
-- BLOCO 1: organizations — o produtor / a marca
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  slug                 text NOT NULL UNIQUE,          -- usado em URLs: /produtor/[slug]
  document             text,                          -- CNPJ ou CPF (repasse/fiscal)
  contact_email        text,
  contact_phone        text,
  logo_url             text,
  -- identidade visual da página do produtor/evento (cores, banner, etc.)
  brand                jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- taxa da plataforma em % sobre o valor vendido (ajustável por contrato)
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 10.00
                       CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
  -- dados bancários/pix para repasse (preencher pelo superadmin)
  payout_info          jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- BLOCO 2: organization_members — quem administra o quê
-- ============================================================
-- Substitui o "admin único" atual. profiles.role continua existindo:
--   'admin'    = superadmin da PLATAFORMA (vê tudo, cria organizações)
--   'producer' = tem acesso ao painel, escopo definido por esta tabela
--   'user'     = comprador comum
--
-- Papéis dentro da organização:
--   owner   — dono; gerencia membros e vê financeiro
--   admin   — gerencia eventos, lotes, cupons, afiliados
--   staff   — operacional (cortesias, venda offline, listas)
--   checkin — só o app de check-in

CREATE TABLE IF NOT EXISTS public.organization_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'admin'
                  CHECK (role IN ('owner', 'admin', 'staff', 'checkin')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON public.organization_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org
  ON public.organization_members (organization_id);


-- ============================================================
-- BLOCO 3: venues — casas de show (opcional, mas recomendado)
-- ============================================================
-- Uma casa de show pode ser reutilizada por vários eventos/produtores.

CREATE TABLE IF NOT EXISTS public.venues (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  address    text,
  city       text,
  state      text,
  lat        double precision,
  lng        double precision,
  capacity   integer,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- BLOCO 4: vincular events à organização (a única FK obrigatória)
-- ============================================================
-- orders/tickets/batches/coupons/affiliates já pendem de event_id,
-- então herdam a organização através do evento — não precisa espalhar
-- organization_id pelas outras tabelas.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS venue_id        uuid REFERENCES public.venues(id);

CREATE INDEX IF NOT EXISTS idx_events_org
  ON public.events (organization_id);

-- Depois do backfill (BLOCO 8), travar:
-- ALTER TABLE public.events ALTER COLUMN organization_id SET NOT NULL;


-- ============================================================
-- BLOCO 5: payouts — repasses aos produtores
-- ============================================================
-- Como o dinheiro cai na conta MP da plataforma, cada repasse ao
-- produtor é registrado aqui (transparência no painel do produtor
-- e controle do superadmin).

CREATE TABLE IF NOT EXISTS public.payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  event_id        uuid REFERENCES public.events(id),  -- null = repasse consolidado
  period_start    date,
  period_end      date,
  gross_amount    numeric(12,2) NOT NULL,             -- total vendido no período
  platform_fee    numeric(12,2) NOT NULL,             -- taxa retida pela plataforma
  mp_fees         numeric(12,2) NOT NULL DEFAULT 0,   -- tarifas do Mercado Pago repassadas
  net_amount      numeric(12,2) NOT NULL,             -- valor efetivamente transferido
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at         timestamptz,
  receipt_url     text,                               -- comprovante da transferência
  notes           text,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_org
  ON public.payouts (organization_id, status);


-- ============================================================
-- BLOCO 6: helper para RLS e para o código do painel
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_org_member(p_org uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = p_user
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid)
  TO authenticated, service_role;


-- ============================================================
-- BLOCO 7: RLS
-- ============================================================

ALTER TABLE public.organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts              ENABLE ROW LEVEL SECURITY;

-- service_role: tudo (painel/admin passam por aqui, com filtro no código)
DROP POLICY IF EXISTS "orgs_service_all" ON public.organizations;
CREATE POLICY "orgs_service_all" ON public.organizations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "org_members_service_all" ON public.organization_members;
CREATE POLICY "org_members_service_all" ON public.organization_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "venues_service_all" ON public.venues;
CREATE POLICY "venues_service_all" ON public.venues
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "payouts_service_all" ON public.payouts;
CREATE POLICY "payouts_service_all" ON public.payouts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Vitrine pública: nome/logo/marca das organizações ativas são públicos
DROP POLICY IF EXISTS "orgs_select_public" ON public.organizations;
CREATE POLICY "orgs_select_public" ON public.organizations
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Casas de show são públicas (aparecem na página do evento)
DROP POLICY IF EXISTS "venues_select_public" ON public.venues;
CREATE POLICY "venues_select_public" ON public.venues
  FOR SELECT TO anon, authenticated
  USING (true);

-- Usuário enxerga os próprios vínculos (para o painel saber suas orgs)
DROP POLICY IF EXISTS "org_members_select_self" ON public.organization_members;
CREATE POLICY "org_members_select_self" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Owner da organização pode ver os repasses da sua org
DROP POLICY IF EXISTS "payouts_select_owner" ON public.payouts;
CREATE POLICY "payouts_select_owner" ON public.payouts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = payouts.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );


-- ============================================================
-- BLOCO 8: SEED / BACKFILL — primeira organização
-- ============================================================
-- Ajustar os valores antes de rodar. Exemplo com o Sacode como
-- produtor nº 1 da plataforma:
--
-- INSERT INTO public.organizations (name, slug, contact_email, platform_fee_percent)
-- VALUES ('SACODE', 'sacode', 'conteudo@zdkproducoes.com.br', 0.00)
-- ON CONFLICT (slug) DO NOTHING;
--
-- UPDATE public.events
-- SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'sacode')
-- WHERE organization_id IS NULL;
--
-- -- vincular o dono ao painel (substituir o e-mail):
-- INSERT INTO public.organization_members (organization_id, user_id, role)
-- SELECT o.id, p.id, 'owner'
-- FROM public.organizations o, public.profiles p
-- WHERE o.slug = 'sacode' AND p.email = 'EMAIL_DO_DONO'
-- ON CONFLICT (organization_id, user_id) DO NOTHING;
--
-- -- por fim, travar a coluna:
-- ALTER TABLE public.events ALTER COLUMN organization_id SET NOT NULL;
