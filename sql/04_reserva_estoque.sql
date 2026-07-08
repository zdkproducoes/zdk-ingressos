-- =====================================================================
-- SACODE — Reserva atômica de estoque no checkout (fix do race)
-- =====================================================================
-- Como rodar:
--   1. Abra Supabase > SQL Editor > New query
--   2. Cole TUDO isso
--   3. Clique Run (Ctrl+Enter)
--   4. Aguarde "Success. No rows returned"
--
-- ⚠️ RODAR ANTES do deploy do código que usa reserve_order_stock.
-- =====================================================================
-- Problema: a checagem de estoque do checkout era feita em JS sobre
-- sold_count, que só cresce quando o pagamento APROVA (minutos depois).
-- Vários compradores passavam juntos pela checagem do mesmo último
-- ingresso e todos conseguiam pagar (oversell).
--
-- Solução: reserved_count no lote. O checkout reserva atomicamente
-- (UPDATE condicional em uma transação); a aprovação converte reserva em
-- venda; cancelamento/rejeição/abandono libera. Reservas de pedidos
-- pendentes com mais de 40 min (a preferência do MP expira em 30) são
-- liberadas "preguiçosamente" pela própria função de reserva quando
-- falta espaço, e pelo cron de reconciliação.
-- ---------------------------------------------------------------------

ALTER TABLE public.ticket_batches
  ADD COLUMN IF NOT EXISTS reserved_count integer NOT NULL DEFAULT 0;

-- Flag idempotente: o pedido está segurando reserva? (evita liberar 2x)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false;


-- ---------------------------------------------------------------------
-- Libera a reserva de um pedido (idempotente: só age se stock_reserved)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_order_reservation(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

GRANT EXECUTE ON FUNCTION public.release_order_reservation(uuid) TO service_role;


-- ---------------------------------------------------------------------
-- Reserva o estoque de TODOS os itens de um pedido, atomicamente.
-- Se qualquer lote não tiver espaço, tenta liberar reservas de pedidos
-- pendentes vencidos (>40 min) daquele lote e re-tenta uma vez; se ainda
-- não couber, RAISE -> a transação inteira desfaz (nada fica reservado).
-- Idempotente: se o pedido já reservou, retorna true sem duplicar.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_order_stock(p_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

GRANT EXECUTE ON FUNCTION public.reserve_order_stock(uuid) TO service_role;

-- ---------------------------------------------------------------------
-- FIM. Se chegou aqui sem erro, o estoque está protegido 🔒
-- ---------------------------------------------------------------------
