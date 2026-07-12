-- =====================================================================
-- ZDK INGRESSOS — Schema base consolidado
-- =====================================================================
-- Gerado por introspecção (somente leitura) do projeto sacode-mvp em
-- 12/07/2026 — estrutura fiel à produção do Sacode (tabelas, funções,
-- triggers, índices), para o código forkado funcionar 1:1.
--
-- ONDE RODAR: apenas no projeto Supabase NOVO da plataforma
--             (zdk-ingressos). NUNCA no sacode-mvp.
--
-- Diferenças conscientes em relação à produção do Sacode:
--   1. Policies RLS legadas do modelo antigo (producer_id /
--      event_collaborators / role checado na policy) NÃO foram
--      replicadas — o painel opera via service_role e o isolamento
--      multi-produtor vem da camada de organizações
--      (00_camada_organizacoes.sql) + filtro no código.
--   2. Policies públicas de coupons ("Anyone can verify...") não
--      replicadas: expunham todos os códigos de cupom via anon.
--      A validação usa a RPC validate_coupon (SECURITY DEFINER).
--   3. A view batch_availability usa security_invoker = true
--      (produção usava o default, que bypassa RLS).
--   4. Event trigger rls_auto_enable não replicado (guarda operacional
--      do dashboard, não é dependência do app).
-- Ordem de aplicação: 000 (este) → 00_camada_organizacoes.sql →
--                     01_conteudo_e_seed.sql
-- =====================================================================


-- ============================================================
-- EXTENSÕES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


-- ============================================================
-- PROFILES (espelho de auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name          text NOT NULL,
  cpf                text NOT NULL UNIQUE,
  phone              text,
  email              text,
  role               text NOT NULL DEFAULT 'customer'
                     CHECK (role IN ('customer','producer','admin','checkin')),
  avatar_url         text,
  first_name         text,
  last_name          text,
  birth_date         date,
  gender             text
                     CHECK (gender IN ('masculino','feminino','nao_binario','prefiro_nao_dizer','outro')),
  city               text,
  neighborhood       text,
  state              text,
  referral_source    text
                     CHECK (referral_source IN (
                       'instagram','facebook','tiktok','whatsapp','amigo',
                       'google','youtube','outdoor','radio','outro')),
  email_confirmed_at timestamptz,
  marketing_consent  boolean NOT NULL DEFAULT false,
  avatar_url_self    text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_cpf  ON public.profiles (cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- Cria o profile automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, cpf, phone, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- EVENTS
-- ============================================================
-- producer_id é legado do modelo single-producer; a plataforma usa
-- events.organization_id (criado em 00_camada_organizacoes.sql).

CREATE TABLE IF NOT EXISTS public.events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id         uuid REFERENCES public.profiles(id),
  title               text NOT NULL,
  slug                text NOT NULL UNIQUE,
  description         text,
  banner_url          text,
  event_date          date NOT NULL,
  event_time          time NOT NULL DEFAULT '12:00:00',
  doors_open_time     time,
  venue_name          text NOT NULL,
  venue_address       text NOT NULL,
  venue_neighborhood  text,
  venue_city          text NOT NULL,
  venue_state         text NOT NULL DEFAULT 'SP',
  venue_zip           text,
  venue_lat           numeric,
  venue_lng           numeric,
  age_rating          text DEFAULT 'Livre',
  age_rating_notes    text,
  half_price_policy   text,
  status              text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','pending','active','finished','cancelled')),
  service_fee_percent numeric NOT NULL DEFAULT 10.00,
  max_tickets_per_cpf integer DEFAULT 5,
  whatsapp_number     text,
  additional_info     text,
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_date   ON public.events (event_date);
CREATE INDEX IF NOT EXISTS idx_events_slug   ON public.events (slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events (status);


-- ============================================================
-- TICKET_BATCHES (lotes)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ticket_batches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text,
  price          numeric NOT NULL,
  quantity       integer NOT NULL,
  sold_count     integer NOT NULL DEFAULT 0,
  reserved_count integer NOT NULL DEFAULT 0,
  sort_order     integer NOT NULL DEFAULT 0,
  starts_at      timestamptz,
  ends_at        timestamptz,
  status         text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','sold_out','ended','paused','scheduled')),
  is_visible     boolean NOT NULL DEFAULT true,
  min_per_order  integer NOT NULL DEFAULT 1,
  max_per_order  integer NOT NULL DEFAULT 10,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_batches_event ON public.ticket_batches (event_id);


-- ============================================================
-- ORDERS + ORDER_ITEMS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq;

CREATE TABLE IF NOT EXISTS public.orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number         integer NOT NULL DEFAULT nextval('orders_order_number_seq'::regclass),
  event_id             uuid NOT NULL REFERENCES public.events(id),
  customer_id          uuid NOT NULL REFERENCES public.profiles(id),
  affiliate_code       text,
  coupon_id            uuid,
  subtotal             numeric NOT NULL DEFAULT 0,
  service_fee          numeric NOT NULL DEFAULT 0,
  discount             numeric NOT NULL DEFAULT 0,
  total                numeric NOT NULL DEFAULT 0,
  payment_method       text CHECK (payment_method IN ('pix','credit_card','courtesy')),
  payment_status       text NOT NULL DEFAULT 'pending'
                       CHECK (payment_status IN ('pending','approved','rejected','cancelled','refunded','in_process','abandoned')),
  payment_gateway      text DEFAULT 'mercadopago',
  payment_gateway_id   text,
  payment_gateway_data jsonb,
  paid_at              timestamptz,
  cancelled_at         timestamptz,
  cancellation_reason  text,
  is_courtesy          boolean NOT NULL DEFAULT false,
  courtesy_issued_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tickets_emailed_at   timestamptz,
  stock_reserved       boolean NOT NULL DEFAULT false,
  meta_fbp             text,
  meta_fbc             text,
  client_ip            text,
  client_user_agent    text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER SEQUENCE public.orders_order_number_seq OWNED BY public.orders.order_number;

COMMENT ON COLUMN public.orders.meta_fbp          IS 'Cookie _fbp do pixel Meta no checkout (atribuição CAPI)';
COMMENT ON COLUMN public.orders.meta_fbc          IS 'Cookie _fbc do pixel Meta no checkout (clique de anúncio)';
COMMENT ON COLUMN public.orders.client_ip         IS 'IP do comprador no checkout (user_data.client_ip_address da CAPI)';
COMMENT ON COLUMN public.orders.client_user_agent IS 'User agent do comprador no checkout (user_data.client_user_agent da CAPI)';

CREATE INDEX IF NOT EXISTS idx_orders_affiliate      ON public.orders (affiliate_code);
CREATE INDEX IF NOT EXISTS idx_orders_customer       ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_event          ON public.orders (event_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_courtesy    ON public.orders (is_courtesy) WHERE is_courtesy = true;
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS orders_affiliate_code_idx ON public.orders (affiliate_code) WHERE affiliate_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_batch_id uuid NOT NULL REFERENCES public.ticket_batches(id),
  attendee_name   text,
  attendee_cpf    text,
  unit_price      numeric NOT NULL,
  qr_code_token   text UNIQUE,
  qr_code_url     text,
  status          text NOT NULL DEFAULT 'valid'
                  CHECK (status IN ('valid','used','cancelled','transferred')),
  checked_in_at   timestamptz,
  checked_in_by   uuid REFERENCES public.profiles(id),
  is_courtesy     boolean NOT NULL DEFAULT false,
  owner_id        uuid REFERENCES public.profiles(id),
  transferred_at  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order  ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_owner  ON public.order_items (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_qr     ON public.order_items (qr_code_token);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items (status);


-- ============================================================
-- COUPONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code           text NOT NULL,
  coupon_type    text NOT NULL CHECK (coupon_type IN ('discount_percent','discount_fixed','free_fee')),
  discount_value numeric,
  max_uses       integer,
  used_count     integer NOT NULL DEFAULT 0,
  valid_from     timestamptz,
  valid_until    timestamptz,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_code  ON public.coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_event ON public.coupons (event_id);


-- ============================================================
-- AFILIADOS (+ visitas e metas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.affiliates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code               text NOT NULL CHECK (code ~ '^[a-z0-9-]+$'),
  name               text NOT NULL,
  email              text,
  phone              text,
  commission_percent numeric NOT NULL DEFAULT 0
                     CHECK (commission_percent >= 0 AND commission_percent <= 100),
  panel_token        text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  profile_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active          boolean NOT NULL DEFAULT true,
  is_staff           boolean NOT NULL DEFAULT false,
  is_ads             boolean NOT NULL DEFAULT false,
  notes              text,
  visits             integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, code)
);

COMMENT ON COLUMN public.affiliates.is_ads IS 'Link de canal de trafego pago (Meta Ads etc). Oculto da lista de afiliados; exibido na aba Campanhas.';

CREATE INDEX IF NOT EXISTS affiliates_event_id_idx  ON public.affiliates (event_id);
CREATE INDEX IF NOT EXISTS affiliates_is_active_idx ON public.affiliates (is_active);

CREATE TABLE IF NOT EXISTS public.affiliate_visits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  ip_address   text,
  user_agent   text,
  referer      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_visits_affiliate_id_idx ON public.affiliate_visits (affiliate_id);
CREATE INDEX IF NOT EXISTS affiliate_visits_created_at_idx   ON public.affiliate_visits (created_at DESC);

CREATE TABLE IF NOT EXISTS public.affiliate_event_goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  target_tickets integer NOT NULL CHECK (target_tickets >= 1),
  reward         text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_weekly_goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title          text,
  week_start     date NOT NULL,
  week_end       date NOT NULL,
  target_tickets integer NOT NULL CHECK (target_tickets >= 1),
  reward         text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_weekly_goals_event ON public.affiliate_weekly_goals (event_id, week_start);


-- ============================================================
-- LEGADO (mantidos por compatibilidade com o código forkado)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.courtesies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_batch_id uuid NOT NULL REFERENCES public.ticket_batches(id),
  guest_name      text NOT NULL,
  guest_cpf       text,
  guest_email     text,
  guest_phone     text,
  qr_code_token   text UNIQUE,
  status          text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','used','cancelled')),
  checked_in_at   timestamptz,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courtesies_event ON public.courtesies (event_id);
CREATE INDEX IF NOT EXISTS idx_courtesies_qr    ON public.courtesies (qr_code_token);

CREATE TABLE IF NOT EXISTS public.access_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.events(id),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id),
  checked_in_by uuid REFERENCES public.profiles(id),
  action        text NOT NULL DEFAULT 'entry' CHECK (action IN ('entry','exit','denied')),
  denial_reason text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_event ON public.access_logs (event_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_item  ON public.access_logs (order_item_id);

CREATE TABLE IF NOT EXISTS public.event_collaborators (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id),
  role       text NOT NULL CHECK (role IN ('admin','manager','financial','checkin','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);


-- ============================================================
-- INFRA (e-mail, rate limit, auditoria, base offline)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_confirmations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  token        text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  confirmed_at timestamptz,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_confirmations_token ON public.email_confirmations (token);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_user  ON public.email_confirmations (user_id);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier   text NOT NULL,
  count        integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits (identifier, window_start);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action               text NOT NULL,
  actor_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_resource_type text,
  target_resource_id   text,
  ip                   text,
  user_agent           text,
  metadata             jsonb DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_action_idx     ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx   ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.offline_audience (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  text NOT NULL,
  first_name text,
  phone      text,
  gender     text CHECK (gender IN ('masculino','feminino','nao_binario','prefiro_nao_dizer','outro')),
  birth_date date,
  city       text,
  email      text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offline_audience_birth_date_idx ON public.offline_audience (birth_date);


-- ============================================================
-- MURAL (wall)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wall_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  content         text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  image_url       text,
  is_deleted      boolean NOT NULL DEFAULT false,
  deleted_by      uuid REFERENCES public.profiles(id),
  deleted_at      timestamptz,
  deletion_reason text,
  reply_count     integer NOT NULL DEFAULT 0,
  like_count      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wall_posts_event  ON public.wall_posts (event_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wall_posts_parent ON public.wall_posts (parent_id, created_at)     WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wall_posts_author ON public.wall_posts (author_id);

CREATE TABLE IF NOT EXISTS public.wall_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wall_likes_post ON public.wall_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_wall_likes_user ON public.wall_likes (user_id);


-- ============================================================
-- TRANSFERÊNCIA DE INGRESSOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ticket_transfers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL UNIQUE REFERENCES public.order_items(id) ON DELETE CASCADE,
  from_user_id  uuid NOT NULL REFERENCES public.profiles(id),
  to_user_id    uuid NOT NULL REFERENCES public.profiles(id),
  old_qr_token  text NOT NULL,
  new_qr_token  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_from ON public.ticket_transfers (from_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to   ON public.ticket_transfers (to_user_id);


-- ============================================================
-- META ADS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  campaign_id text PRIMARY KEY,
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.meta_campaigns IS 'Campanhas do Meta Ads vinculadas a eventos (filtro da aba Campanhas do admin)';


-- ============================================================
-- VIEW: disponibilidade real por lote
-- ============================================================

CREATE OR REPLACE VIEW public.batch_availability
WITH (security_invoker = true) AS
SELECT tb.id,
       tb.event_id,
       tb.name,
       tb.description,
       tb.price,
       tb.quantity,
       tb.sold_count,
       tb.sort_order,
       tb.starts_at,
       tb.ends_at,
       tb.status,
       tb.is_visible,
       tb.min_per_order,
       tb.max_per_order,
       tb.created_at,
       tb.updated_at,
       COALESCE(p.paid_count, 0) AS paid_count,
       tb.reserved_count
FROM public.ticket_batches tb
LEFT JOIN (
  SELECT oi.ticket_batch_id, count(*)::integer AS paid_count
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.payment_status = 'approved'
  GROUP BY oi.ticket_batch_id
) p ON p.ticket_batch_id = tb.id;


-- ============================================================
-- FUNÇÕES
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_affiliates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wall_after_post_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE public.wall_posts SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.wall_after_like_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wall_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wall_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Comprou ingresso válido pro evento? (considera dono atual pós-transferência)
CREATE OR REPLACE FUNCTION public.user_has_paid_ticket(p_user_id uuid, p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.event_id = p_event_id
      AND o.payment_status = 'approved'
      AND oi.status IN ('valid', 'used')
      AND COALESCE(oi.owner_id, o.customer_id) = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_coupon(p_event_id uuid, p_code text, p_subtotal numeric)
RETURNS TABLE(coupon_id uuid, coupon_type text, discount_amount numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_coupon record;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons
  WHERE event_id = p_event_id AND upper(code) = upper(p_code) AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 'Cupom inválido'::text; RETURN; END IF;
  IF v_coupon.valid_from IS NOT NULL AND now() < v_coupon.valid_from THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 'Cupom ainda não está ativo'::text; RETURN; END IF;
  IF v_coupon.valid_until IS NOT NULL AND now() > v_coupon.valid_until THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 'Cupom expirado'::text; RETURN; END IF;
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 0::numeric, 'Cupom esgotado'::text; RETURN; END IF;
  IF v_coupon.coupon_type = 'discount_percent' THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.coupon_type, ROUND(p_subtotal * (v_coupon.discount_value / 100.0), 2), 'OK'::text;
  ELSIF v_coupon.coupon_type = 'discount_fixed' THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.coupon_type, LEAST(v_coupon.discount_value, p_subtotal), 'OK'::text;
  ELSIF v_coupon.coupon_type = 'free_fee' THEN
    RETURN QUERY SELECT v_coupon.id, v_coupon.coupon_type, 0::numeric, 'OK'::text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.coupons SET used_count = used_count + 1
  WHERE id = p_coupon_id AND (max_uses IS NULL OR used_count < max_uses);
END $$;

CREATE OR REPLACE FUNCTION public.increment_batch_sold(p_batch_id uuid, p_qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.ticket_batches
  SET sold_count = sold_count + p_qty,
      updated_at = now()
  WHERE id = p_batch_id;
END $$;

-- Estoque: reserva atômica no checkout (com limpeza de carrinhos abandonados)
CREATE OR REPLACE FUNCTION public.release_order_reservation(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record;
BEGIN
  UPDATE public.orders SET stock_reserved = false
  WHERE id = p_order_id AND stock_reserved = true;
  IF NOT FOUND THEN RETURN; END IF;  -- já liberado (ou nunca reservou)

  FOR r IN
    SELECT ticket_batch_id, count(*)::int AS qty
    FROM public.order_items WHERE order_id = p_order_id
    GROUP BY 1 ORDER BY 1
  LOOP
    UPDATE public.ticket_batches
    SET reserved_count = GREATEST(0, reserved_count - r.qty),
        updated_at = now()
    WHERE id = r.ticket_batch_id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.reserve_order_stock(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record;
BEGIN
  UPDATE public.orders SET stock_reserved = true
  WHERE id = p_order_id AND stock_reserved = false;
  IF NOT FOUND THEN RETURN true; END IF;  -- já reservado

  FOR r IN
    SELECT ticket_batch_id, count(*)::int AS qty
    FROM public.order_items WHERE order_id = p_order_id
    GROUP BY 1 ORDER BY 1  -- ordem determinística evita deadlock entre reservas concorrentes
  LOOP
    UPDATE public.ticket_batches
    SET reserved_count = reserved_count + r.qty, updated_at = now()
    WHERE id = r.ticket_batch_id
      AND status = 'active'
      AND sold_count + reserved_count + r.qty <= quantity;

    IF NOT FOUND THEN
      -- Sem espaço: libera reservas de carrinhos abandonados deste lote
      -- (pendentes > 40 min; a preferência do MP expira em 30) e re-tenta.
      PERFORM public.release_order_reservation(o.id)
      FROM public.orders o
      WHERE o.stock_reserved = true
        AND o.payment_status = 'pending'
        AND o.created_at < now() - interval '40 minutes'
        AND o.id <> p_order_id
        AND EXISTS (
          SELECT 1 FROM public.order_items oi
          WHERE oi.order_id = o.id AND oi.ticket_batch_id = r.ticket_batch_id
        );

      UPDATE public.ticket_batches
      SET reserved_count = reserved_count + r.qty, updated_at = now()
      WHERE id = r.ticket_batch_id
        AND status = 'active'
        AND sold_count + reserved_count + r.qty <= quantity;

      IF NOT FOUND THEN
        -- Desfaz TUDO desta transação (flag + reservas dos lotes anteriores)
        RAISE EXCEPTION 'SEM_ESTOQUE:%', r.ticket_batch_id USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END LOOP;

  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.payment_status = 'approved' AND OLD.payment_status != 'approved' THEN
    UPDATE public.ticket_batches tb
    SET sold_count = sold_count + oi.qty
    FROM (
      SELECT ticket_batch_id, COUNT(*) as qty
      FROM public.order_items
      WHERE order_id = NEW.id
      GROUP BY ticket_batch_id
    ) oi
    WHERE tb.id = oi.ticket_batch_id;
  END IF;

  -- Se cancelar, devolver estoque
  IF NEW.payment_status IN ('cancelled', 'refunded') AND OLD.payment_status = 'approved' THEN
    UPDATE public.ticket_batches tb
    SET sold_count = GREATEST(sold_count - oi.qty, 0)
    FROM (
      SELECT ticket_batch_id, COUNT(*) as qty
      FROM public.order_items
      WHERE order_id = NEW.id
      GROUP BY ticket_batch_id
    ) oi
    WHERE tb.id = oi.ticket_batch_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.order_items_stock_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = NEW.order_id AND o.payment_status = 'approved'
  ) THEN
    UPDATE public.ticket_batches
    SET sold_count = sold_count + 1, updated_at = now()
    WHERE id = NEW.ticket_batch_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.order_items_stock_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = OLD.order_id AND o.payment_status = 'approved'
  ) THEN
    UPDATE public.ticket_batches
    SET sold_count = GREATEST(0, sold_count - 1), updated_at = now()
    WHERE id = OLD.ticket_batch_id;
  END IF;
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.track_affiliate_visit(
  p_code text, p_event_id uuid,
  p_ip_address text DEFAULT NULL, p_user_agent text DEFAULT NULL, p_referer text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_affiliate_id uuid;
BEGIN
  SELECT id INTO v_affiliate_id
  FROM affiliates
  WHERE code = p_code
    AND event_id = p_event_id
    AND is_active = true
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO affiliate_visits (affiliate_id, ip_address, user_agent, referer)
  VALUES (v_affiliate_id, p_ip_address, p_user_agent, p_referer);

  UPDATE affiliates
  SET visits = visits + 1
  WHERE id = v_affiliate_id;

  RETURN v_affiliate_id;
END;
$$;


-- ============================================================
-- TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tr_events_updated_at ON public.events;
CREATE TRIGGER tr_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tr_ticket_batches_updated_at ON public.ticket_batches;
CREATE TRIGGER tr_ticket_batches_updated_at
  BEFORE UPDATE ON public.ticket_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tr_orders_updated_at ON public.orders;
CREATE TRIGGER tr_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tr_order_stock ON public.orders;
CREATE TRIGGER tr_order_stock
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.confirm_order_stock();

DROP TRIGGER IF EXISTS tr_order_items_stock_insert ON public.order_items;
CREATE TRIGGER tr_order_items_stock_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_items_stock_on_insert();

DROP TRIGGER IF EXISTS tr_order_items_stock_delete ON public.order_items;
CREATE TRIGGER tr_order_items_stock_delete
  AFTER DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_items_stock_on_delete();

DROP TRIGGER IF EXISTS affiliates_set_updated_at ON public.affiliates;
CREATE TRIGGER affiliates_set_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.set_affiliates_updated_at();

DROP TRIGGER IF EXISTS trg_wall_after_post_insert ON public.wall_posts;
CREATE TRIGGER trg_wall_after_post_insert
  AFTER INSERT ON public.wall_posts
  FOR EACH ROW EXECUTE FUNCTION public.wall_after_post_insert();

DROP TRIGGER IF EXISTS trg_wall_after_like_insert ON public.wall_likes;
CREATE TRIGGER trg_wall_after_like_insert
  AFTER INSERT ON public.wall_likes
  FOR EACH ROW EXECUTE FUNCTION public.wall_after_like_change();

DROP TRIGGER IF EXISTS trg_wall_after_like_delete ON public.wall_likes;
CREATE TRIGGER trg_wall_after_like_delete
  AFTER DELETE ON public.wall_likes
  FOR EACH ROW EXECUTE FUNCTION public.wall_after_like_change();


-- ============================================================
-- RLS — habilitar em tudo + policies curadas
-- ============================================================
-- service_role tem BYPASSRLS; as policies service_all ficam como
-- documentação explícita da intenção.

ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_batches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_visits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_event_goals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courtesies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_collaborators    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_confirmations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_audience       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_likes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_transfers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_campaigns         ENABLE ROW LEVEL SECURITY;

-- ===== profiles =====
DROP POLICY IF EXISTS "profiles_service_all" ON public.profiles;
CREATE POLICY "profiles_service_all" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ===== events =====
DROP POLICY IF EXISTS "events_service_all" ON public.events;
CREATE POLICY "events_service_all" ON public.events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "events_select_active" ON public.events;
CREATE POLICY "events_select_active" ON public.events
  FOR SELECT TO anon, authenticated
  USING (status IN ('active','finished'));

-- ===== ticket_batches =====
DROP POLICY IF EXISTS "ticket_batches_service_all" ON public.ticket_batches;
CREATE POLICY "ticket_batches_service_all" ON public.ticket_batches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ticket_batches_select_visible" ON public.ticket_batches;
CREATE POLICY "ticket_batches_select_visible" ON public.ticket_batches
  FOR SELECT TO anon, authenticated
  USING (
    is_visible = true AND status IN ('active','sold_out','scheduled')
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_batches.event_id AND e.status = 'active'
    )
  );

-- ===== orders =====
DROP POLICY IF EXISTS "orders_service_all" ON public.orders;
CREATE POLICY "orders_service_all" ON public.orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orders_select_owner" ON public.orders;
CREATE POLICY "orders_select_owner" ON public.orders
  FOR SELECT TO authenticated
  USING (customer_id = (SELECT auth.uid()));

-- ===== order_items =====
DROP POLICY IF EXISTS "order_items_service_all" ON public.order_items;
CREATE POLICY "order_items_service_all" ON public.order_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_select_owner" ON public.order_items;
CREATE POLICY "order_items_select_owner" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.customer_id = (SELECT auth.uid())
    )
  );

-- Ingressos recebidos por transferência
DROP POLICY IF EXISTS "order_items_select_received" ON public.order_items;
CREATE POLICY "order_items_select_received" ON public.order_items
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- ===== coupons (só via RPC validate_coupon / service_role) =====
DROP POLICY IF EXISTS "coupons_service_all" ON public.coupons;
CREATE POLICY "coupons_service_all" ON public.coupons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===== afiliados (painel público usa panel_token via service_role;
--        visitas via RPC track_affiliate_visit) =====
DROP POLICY IF EXISTS "affiliates_service_all" ON public.affiliates;
CREATE POLICY "affiliates_service_all" ON public.affiliates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "affiliate_visits_service_all" ON public.affiliate_visits;
CREATE POLICY "affiliate_visits_service_all" ON public.affiliate_visits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "affiliate_event_goals_service_all" ON public.affiliate_event_goals;
CREATE POLICY "affiliate_event_goals_service_all" ON public.affiliate_event_goals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "affiliate_weekly_goals_service_all" ON public.affiliate_weekly_goals;
CREATE POLICY "affiliate_weekly_goals_service_all" ON public.affiliate_weekly_goals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===== infra: somente service_role =====
DROP POLICY IF EXISTS "service_role_only" ON public.email_confirmations;
CREATE POLICY "service_role_only" ON public.email_confirmations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_only_rl" ON public.rate_limits;
CREATE POLICY "service_role_only_rl" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- audit_logs / offline_audience / courtesies / access_logs /
-- event_collaborators / meta_campaigns: RLS habilitada sem policy de
-- anon/authenticated = acesso só via service_role (BYPASSRLS).

DROP POLICY IF EXISTS "ticket_transfers_service_all" ON public.ticket_transfers;
CREATE POLICY "ticket_transfers_service_all" ON public.ticket_transfers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===== mural =====
DROP POLICY IF EXISTS "wall_posts_service_all" ON public.wall_posts;
CREATE POLICY "wall_posts_service_all" ON public.wall_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wall_posts_select_buyers" ON public.wall_posts;
CREATE POLICY "wall_posts_select_buyers" ON public.wall_posts
  FOR SELECT TO authenticated
  USING (public.user_has_paid_ticket((SELECT auth.uid()), event_id));

DROP POLICY IF EXISTS "wall_posts_insert_buyers" ON public.wall_posts;
CREATE POLICY "wall_posts_insert_buyers" ON public.wall_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND public.user_has_paid_ticket((SELECT auth.uid()), event_id)
  );

DROP POLICY IF EXISTS "wall_posts_update_self" ON public.wall_posts;
CREATE POLICY "wall_posts_update_self" ON public.wall_posts
  FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "wall_likes_service_all" ON public.wall_likes;
CREATE POLICY "wall_likes_service_all" ON public.wall_likes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wall_likes_select_buyers" ON public.wall_likes;
CREATE POLICY "wall_likes_select_buyers" ON public.wall_likes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wall_posts p
      WHERE p.id = wall_likes.post_id
        AND public.user_has_paid_ticket((SELECT auth.uid()), p.event_id)
    )
  );

DROP POLICY IF EXISTS "wall_likes_insert_self" ON public.wall_likes;
CREATE POLICY "wall_likes_insert_self" ON public.wall_likes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.wall_posts p
      WHERE p.id = wall_likes.post_id
        AND public.user_has_paid_ticket((SELECT auth.uid()), p.event_id)
    )
  );

DROP POLICY IF EXISTS "wall_likes_delete_self" ON public.wall_likes;
CREATE POLICY "wall_likes_delete_self" ON public.wall_likes
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));


-- ============================================================
-- GRANTS de funções (mínimo necessário)
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user()                          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at()                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_affiliates_updated_at()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wall_after_post_insert()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wall_after_like_change()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_order_stock()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_items_stock_on_insert()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_items_stock_on_delete()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_batch_sold(uuid, integer)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_order_stock(uuid)                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_order_reservation(uuid)            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_paid_ticket(uuid, uuid)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(uuid, text, numeric)       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.track_affiliate_visit(text, uuid, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_has_paid_ticket(uuid, uuid)            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_coupon(uuid, text, numeric)        TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_affiliate_visit(text, uuid, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid)                TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_batch_sold(uuid, integer)         TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock(uuid)                   TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_reservation(uuid)             TO service_role;
