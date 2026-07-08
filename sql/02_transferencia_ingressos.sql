-- =====================================================================
-- SACODE — Transferência de ingressos (migração)
-- =====================================================================
-- Como rodar:
--   1. Abra Supabase > SQL Editor > New query
--   2. Cole TUDO isso
--   3. Clique Run (Ctrl+Enter)
--
-- Tudo aqui é ADITIVO (colunas novas, tabela nova, função atualizada).
-- Nenhuma linha existente é alterada — seguro rodar em produção.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOCO 1: Colunas novas em order_items
-- ---------------------------------------------------------------------
-- owner_id: dono ATUAL do ingresso.
--   NULL      = dono é o comprador do pedido (comportamento de hoje;
--               todos os ingressos existentes continuam como estão).
--   Preenchido = ingresso foi transferido para essa pessoa.
--
-- transferred_at: carimbo da transferência.
--   Preenchido = já foi transferido UMA vez → nunca mais pode ser
--   transferido de novo (regra da transferência única).
-- ---------------------------------------------------------------------

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS owner_id       uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS transferred_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_order_items_owner
  ON public.order_items(owner_id)
  WHERE owner_id IS NOT NULL;


-- ---------------------------------------------------------------------
-- BLOCO 2: Tabela de auditoria das transferências
-- ---------------------------------------------------------------------
-- Guarda quem transferiu pra quem e os dois tokens (o cancelado e o
-- novo). O UNIQUE (order_item_id) reforça NO BANCO a regra de que um
-- ingresso só pode ser transferido uma única vez.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ticket_transfers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  from_user_id  uuid NOT NULL REFERENCES public.profiles(id),
  to_user_id    uuid NOT NULL REFERENCES public.profiles(id),
  old_qr_token  text NOT NULL,
  new_qr_token  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_transfers_from ON public.ticket_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to   ON public.ticket_transfers(to_user_id);

ALTER TABLE public.ticket_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_transfers_service_all" ON public.ticket_transfers;
CREATE POLICY "ticket_transfers_service_all" ON public.ticket_transfers
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ---------------------------------------------------------------------
-- BLOCO 3: RLS — quem recebeu o ingresso enxerga o item
-- ---------------------------------------------------------------------
-- Hoje só o dono do PEDIDO lê os itens (order_items_select_owner).
-- Essa policy adiciona: o dono ATUAL do ingresso também lê.
-- ---------------------------------------------------------------------

DROP POLICY IF EXISTS "order_items_select_received" ON public.order_items;
CREATE POLICY "order_items_select_received" ON public.order_items
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());


-- ---------------------------------------------------------------------
-- BLOCO 4: user_has_paid_ticket considera o dono atual
-- ---------------------------------------------------------------------
-- Essa função controla o acesso ao MURAL. Antes: só o comprador do
-- pedido. Agora: quem recebeu por transferência ganha acesso; quem
-- transferiu TODOS os seus ingressos perde (coerente — não tem mais
-- ingresso).
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
    WHERE o.event_id = p_event_id
      AND o.payment_status = 'approved'
      AND oi.status IN ('valid', 'used')
      AND COALESCE(oi.owner_id, o.customer_id) = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_paid_ticket(uuid, uuid) TO authenticated, service_role;


-- ---------------------------------------------------------------------
-- VERIFICAÇÃO (rode depois, opcional):
-- ---------------------------------------------------------------------
-- 1. Colunas criadas?
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'order_items' AND column_name IN ('owner_id','transferred_at');
--
-- 2. Nenhum ingresso existente foi tocado? (tem que retornar 0)
--    SELECT count(*) FROM public.order_items WHERE owner_id IS NOT NULL OR transferred_at IS NOT NULL;
--
-- 3. Tabela de auditoria vazia e com RLS?
--    SELECT count(*) FROM public.ticket_transfers;
-- ---------------------------------------------------------------------
