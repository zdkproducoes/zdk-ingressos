-- =====================================================================
-- SACODE — Migrations Completas (FASE 1)
-- =====================================================================
-- Como rodar:
--   1. Abra Supabase > SQL Editor > New query
--   2. Cole TUDO isso
--   3. Clique Run (Ctrl+Enter)
--   4. Aguarde "Success. No rows returned"
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOCO 1: Coordenadas do mapa (já preenchidas com os dados do Caio)
-- ---------------------------------------------------------------------
-- ⚠️ ATENÇÃO: ANTES DE RODAR, troque 'SLUG_DO_EVENTO' pelo slug real.
-- Como descobrir: vá em Supabase > Table Editor > events > coluna "slug"
-- ---------------------------------------------------------------------

UPDATE public.events
SET
  venue_lat  = -23.650356,
  venue_lng  = -46.583375,
  updated_at = now()
WHERE slug = 'sacode-15-edicao'  -- ← TROCAR PELO SLUG REAL ANTES DE RODAR
RETURNING id, title, slug, venue_lat, venue_lng;


-- ---------------------------------------------------------------------
-- BLOCO 2: Expandir tabela profiles
-- ---------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name        text,
  ADD COLUMN IF NOT EXISTS last_name         text,
  ADD COLUMN IF NOT EXISTS birth_date        date,
  ADD COLUMN IF NOT EXISTS gender            text
    CHECK (gender IN ('masculino','feminino','nao_binario','prefiro_nao_dizer','outro')),
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS neighborhood      text,
  ADD COLUMN IF NOT EXISTS state             text,
  ADD COLUMN IF NOT EXISTS referral_source   text
    CHECK (referral_source IN (
      'instagram','facebook','tiktok','whatsapp','amigo',
      'google','youtube','outdoor','radio','outro'
    )),
  ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url_self    text;

UPDATE public.profiles
SET
  first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
  last_name  = COALESCE(last_name, NULLIF(regexp_replace(full_name, '^\S+\s*', ''), ''))
WHERE first_name IS NULL OR last_name IS NULL;


-- ---------------------------------------------------------------------
-- BLOCO 3: Tabela de tokens de confirmação de e-mail
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_confirmations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  confirmed_at timestamptz,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_confirmations_token ON public.email_confirmations(token);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_user  ON public.email_confirmations(user_id);

ALTER TABLE public.email_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public.email_confirmations;
CREATE POLICY "service_role_only" ON public.email_confirmations
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- BLOCO 4: Tabela de rate limiting (antifraude)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,                  -- ex: "signup:177.0.0.1"
  count      integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier, window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only_rl" ON public.rate_limits;
CREATE POLICY "service_role_only_rl" ON public.rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- BLOCO 5: MURAL — Posts, replies, curtidas
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wall_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.wall_posts(id) ON DELETE CASCADE,  -- null = post principal, preenchido = reply
  content     text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  image_url   text,
  is_deleted  boolean NOT NULL DEFAULT false,
  deleted_by  uuid REFERENCES public.profiles(id),
  deleted_at  timestamptz,
  deletion_reason text,
  reply_count integer NOT NULL DEFAULT 0,
  like_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wall_posts_event   ON public.wall_posts(event_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wall_posts_parent  ON public.wall_posts(parent_id, created_at)     WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wall_posts_author  ON public.wall_posts(author_id);

CREATE TABLE IF NOT EXISTS public.wall_likes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id   uuid NOT NULL REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_wall_likes_post ON public.wall_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_wall_likes_user ON public.wall_likes(user_id);

-- Triggers para manter contadores atualizados (atomic)
CREATE OR REPLACE FUNCTION public.wall_after_post_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE public.wall_posts SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wall_after_post_insert ON public.wall_posts;
CREATE TRIGGER trg_wall_after_post_insert
  AFTER INSERT ON public.wall_posts
  FOR EACH ROW EXECUTE FUNCTION public.wall_after_post_insert();

CREATE OR REPLACE FUNCTION public.wall_after_like_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wall_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wall_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_wall_after_like_insert ON public.wall_likes;
CREATE TRIGGER trg_wall_after_like_insert
  AFTER INSERT ON public.wall_likes
  FOR EACH ROW EXECUTE FUNCTION public.wall_after_like_change();

DROP TRIGGER IF EXISTS trg_wall_after_like_delete ON public.wall_likes;
CREATE TRIGGER trg_wall_after_like_delete
  AFTER DELETE ON public.wall_likes
  FOR EACH ROW EXECUTE FUNCTION public.wall_after_like_change();


-- ---------------------------------------------------------------------
-- BLOCO 6: Função para verificar se usuário comprou ingresso pro evento
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_has_paid_ticket(p_user_id uuid, p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.customer_id = p_user_id
      AND o.event_id = p_event_id
      AND o.payment_status = 'approved'
      AND oi.status IN ('valid', 'used')
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_paid_ticket(uuid, uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------
-- BLOCO 7: RLS — Policies de segurança das tabelas
-- ---------------------------------------------------------------------

-- ===== profiles =====
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_all"   ON public.profiles;

-- Service role: tudo
CREATE POLICY "profiles_service_all" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Usuário autenticado: lê o próprio perfil completo
CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Qualquer usuário autenticado: lê dados PÚBLICOS de outros perfis (nome, avatar)
-- (necessário para mostrar autores nos posts do mural)
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
-- ⚠️ Nota: anon key NÃO tem acesso. Apenas usuários logados.

-- Update: só do próprio
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ===== orders =====
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_owner"  ON public.orders;
DROP POLICY IF EXISTS "orders_service_all"   ON public.orders;

CREATE POLICY "orders_service_all" ON public.orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "orders_select_owner" ON public.orders
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

-- ===== order_items =====
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_owner" ON public.order_items;
DROP POLICY IF EXISTS "order_items_service_all"  ON public.order_items;

CREATE POLICY "order_items_service_all" ON public.order_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "order_items_select_owner" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.customer_id = auth.uid()
    )
  );

-- ===== events =====
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_active"  ON public.events;
DROP POLICY IF EXISTS "events_service_all"    ON public.events;

CREATE POLICY "events_service_all" ON public.events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "events_select_active" ON public.events
  FOR SELECT TO authenticated, anon
  USING (status IN ('active','finished'));

-- ===== ticket_batches =====
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_batches_select_visible" ON public.ticket_batches;
DROP POLICY IF EXISTS "ticket_batches_service_all"    ON public.ticket_batches;

CREATE POLICY "ticket_batches_service_all" ON public.ticket_batches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "ticket_batches_select_visible" ON public.ticket_batches
  FOR SELECT TO authenticated, anon
  USING (
    is_visible = true AND status IN ('active','sold_out')
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_batches.event_id AND e.status = 'active'
    )
  );

-- ===== coupons =====
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_service_all" ON public.coupons;
CREATE POLICY "coupons_service_all" ON public.coupons
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Cupons só são acessíveis via service_role (via API com função validate_coupon)

-- ===== wall_posts =====
ALTER TABLE public.wall_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wall_posts_service_all"      ON public.wall_posts;
DROP POLICY IF EXISTS "wall_posts_select_buyers"    ON public.wall_posts;
DROP POLICY IF EXISTS "wall_posts_insert_buyers"    ON public.wall_posts;
DROP POLICY IF EXISTS "wall_posts_update_self"      ON public.wall_posts;

CREATE POLICY "wall_posts_service_all" ON public.wall_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- LER: só quem comprou ingresso pro evento
CREATE POLICY "wall_posts_select_buyers" ON public.wall_posts
  FOR SELECT TO authenticated
  USING (public.user_has_paid_ticket(auth.uid(), event_id));

-- POSTAR: só quem comprou ingresso
CREATE POLICY "wall_posts_insert_buyers" ON public.wall_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.user_has_paid_ticket(auth.uid(), event_id)
  );

-- Soft-delete pelo próprio autor
CREATE POLICY "wall_posts_update_self" ON public.wall_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- ===== wall_likes =====
ALTER TABLE public.wall_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wall_likes_service_all"   ON public.wall_likes;
DROP POLICY IF EXISTS "wall_likes_select_buyers" ON public.wall_likes;
DROP POLICY IF EXISTS "wall_likes_insert_self"   ON public.wall_likes;
DROP POLICY IF EXISTS "wall_likes_delete_self"   ON public.wall_likes;

CREATE POLICY "wall_likes_service_all" ON public.wall_likes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "wall_likes_select_buyers" ON public.wall_likes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wall_posts p
      WHERE p.id = wall_likes.post_id
        AND public.user_has_paid_ticket(auth.uid(), p.event_id)
    )
  );

CREATE POLICY "wall_likes_insert_self" ON public.wall_likes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.wall_posts p
      WHERE p.id = wall_likes.post_id
        AND public.user_has_paid_ticket(auth.uid(), p.event_id)
    )
  );

CREATE POLICY "wall_likes_delete_self" ON public.wall_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ---------------------------------------------------------------------
-- BLOCO 8: Funções de cupom + estoque
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_event_id uuid, p_code text, p_subtotal numeric
)
RETURNS TABLE (coupon_id uuid, coupon_type text, discount_amount numeric, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

GRANT EXECUTE ON FUNCTION public.validate_coupon(uuid, text, numeric) TO authenticated, anon, service_role;


CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coupons SET used_count = used_count + 1
  WHERE id = p_coupon_id AND (max_uses IS NULL OR used_count < max_uses);
END $$;

GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO service_role;


CREATE OR REPLACE FUNCTION public.increment_batch_sold(p_batch_id uuid, p_qty int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ticket_batches
  SET sold_count = sold_count + p_qty,
      status = CASE WHEN sold_count + p_qty >= quantity THEN 'sold_out' ELSE status END,
      updated_at = now()
  WHERE id = p_batch_id;
END $$;

GRANT EXECUTE ON FUNCTION public.increment_batch_sold(uuid, int) TO service_role;


-- ---------------------------------------------------------------------
-- FIM. Se chegou aqui sem erro, parabéns 🎉
-- Próximo passo: criar bucket "wall-images" no Supabase Storage (instruções no README)
-- ---------------------------------------------------------------------
