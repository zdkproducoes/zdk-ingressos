-- =====================================================================
-- SACODE — Virada de lote: expõe reserved_count na view batch_availability
-- =====================================================================
-- Como rodar:
--   1. Abra Supabase > SQL Editor > New query
--   2. Cole TUDO isso
--   3. Clique Run (Ctrl+Enter)
--   4. Aguarde "Success. No rows returned"
--
-- ⚠️ RODAR ANTES do deploy da regra de fila de lotes.
-- =====================================================================
-- A página do evento e o checkout decidem o "lote atual" com a MESMA
-- conta da reserva atômica: vendidos (sold_count) + reservados
-- (reserved_count) < quantidade. Para isso a view precisa expor a
-- coluna nova reserved_count (mantendo as colunas existentes na mesma
-- ordem — exigência do CREATE OR REPLACE VIEW).
-- ---------------------------------------------------------------------

CREATE OR REPLACE VIEW public.batch_availability AS
SELECT
  tb.id,
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
  COALESCE(p.paid_count, 0)::int AS paid_count,
  tb.reserved_count
FROM public.ticket_batches tb
LEFT JOIN (
  SELECT oi.ticket_batch_id, count(*)::int AS paid_count
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.payment_status = 'approved'
  GROUP BY 1
) p ON p.ticket_batch_id = tb.id;

-- ---------------------------------------------------------------------
-- FIM. Se chegou aqui sem erro, a view está atualizada ✔
-- ---------------------------------------------------------------------
