-- =====================================================================
-- 10: FIX de segurança — RPCs de mutação expostos ao público
-- Aplicada em produção em 11/07/2026 (migration revoke_rpc_publicos_from_public).
-- =====================================================================
-- Falha: funções SECURITY DEFINER de mutação de estoque/pedido tinham
-- EXECUTE para o pseudo-papel PUBLIC (default do Postgres). Confirmado por
-- teste: anon chamou increment_batch_sold e reserve/release com HTTP 204/200.
-- Como o batch_id aparece na página pública do evento, um atacante poderia
-- forjar esgotamento (griefing) ou provocar oversell (qty negativo).
--
-- ⚠️ GOTCHA: `REVOKE ... FROM anon, authenticated` NÃO resolve — o grant vem
-- de PUBLIC (herdado por todos os papéis). É preciso `REVOKE ... FROM PUBLIC`
-- e então `GRANT ... TO service_role` (senão o backend também perde acesso).
--
-- Mantidas públicas de propósito (usadas pelo browser no checkout/afiliado):
--   validate_coupon, track_affiliate_visit, user_has_paid_ticket (read-only).
-- ---------------------------------------------------------------------

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.increment_batch_sold(uuid, integer)',
    'public.increment_coupon_usage(uuid)',
    'public.reserve_order_stock(uuid)',
    'public.release_order_reservation(uuid)',
    'public.confirm_order_stock()',
    'public.order_items_stock_on_insert()',
    'public.order_items_stock_on_delete()',
    'public.rls_auto_enable()'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated;', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', fn);
  END LOOP;
END $$;

-- PostgREST cacheia o schema; força reload pra o REVOKE valer na hora.
NOTIFY pgrst, 'reload schema';
