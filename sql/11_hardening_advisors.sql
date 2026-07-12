-- =====================================================================
-- 11: Hardening de segurança (itens de menor prioridade dos advisors)
-- Aplicada em produção em 11/07/2026 (migration hardening_advisors).
-- =====================================================================

-- (A) search_path fixo nas funções (evita search_path injection em
-- SECURITY DEFINER). Só pin de config; não altera o corpo das funções.
ALTER FUNCTION public.update_updated_at()        SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user()          SET search_path = public, pg_temp;
ALTER FUNCTION public.wall_after_post_insert()   SET search_path = public, pg_temp;
ALTER FUNCTION public.wall_after_like_change()   SET search_path = public, pg_temp;
ALTER FUNCTION public.set_affiliates_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.confirm_order_stock()      SET search_path = public, pg_temp;

-- (B) view batch_availability: era SECURITY DEFINER (rodava como o dono,
-- ignorando RLS). Passa a SECURITY INVOKER. Só expõe contagem de estoque
-- (não-sensível). Consumidores:
--   - página do evento (anon): usa sold_count/reserved_count (de
--     ticket_batches, que o anon já lê) — paid_count não é usado ali.
--   - checkout e reembolso (service_role): BYPASSRLS, paid_count correto.
-- Para preservar o comportamento atual (a view definer mostrava lotes
-- 'scheduled' visíveis na fila), a policy anon de ticket_batches passa a
-- incluir 'scheduled' — lote prestes a abrir não é dado sensível.
DROP POLICY IF EXISTS ticket_batches_select_visible ON public.ticket_batches;
CREATE POLICY ticket_batches_select_visible ON public.ticket_batches
  FOR SELECT TO anon, authenticated
  USING (
    is_visible = true
    AND status = ANY (ARRAY['active','sold_out','scheduled'])
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = ticket_batches.event_id AND e.status = 'active')
  );

CREATE OR REPLACE VIEW public.batch_availability
WITH (security_invoker = true) AS
SELECT tb.id, tb.event_id, tb.name, tb.description, tb.price, tb.quantity,
       tb.sold_count, tb.sort_order, tb.starts_at, tb.ends_at, tb.status,
       tb.is_visible, tb.min_per_order, tb.max_per_order, tb.created_at,
       tb.updated_at, COALESCE(p.paid_count, 0) AS paid_count, tb.reserved_count
FROM public.ticket_batches tb
LEFT JOIN (
  SELECT oi.ticket_batch_id, count(*)::integer AS paid_count
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.payment_status = 'approved'
  GROUP BY oi.ticket_batch_id
) p ON p.ticket_batch_id = tb.id;

-- (C) handle_new_user é função de trigger (dispara no INSERT de auth.users);
-- não precisa de EXECUTE público — revoga p/ não ficar exposta como RPC.
-- O trigger segue funcionando (não depende de grant de EXECUTE). Testado:
-- criar user via admin ainda cria o profile.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- NOTA: "Leaked password protection" (HaveIBeenPwned) é config do Supabase
-- Auth — NÃO dá pra ativar por SQL. Ativar no dashboard:
-- Authentication > Policies (Password) > Enable "Leaked password protection".
-- ---------------------------------------------------------------------
