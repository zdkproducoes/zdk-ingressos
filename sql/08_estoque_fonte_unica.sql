-- =====================================================================
-- 08: sold_count com fonte ÚNICA de verdade (fix da contagem dupla)
-- Aplicada em produção em 11/07/2026 (migration estoque_fonte_unica),
-- DEPOIS do deploy do código que removeu increment_batch_sold do app.
-- =====================================================================
-- Bug: o trigger tr_order_stock (confirm_order_stock, criado fora do sql/)
-- JÁ incrementava sold_count na transição para approved, e o código
-- (fulfillOrder -> increment_batch_sold) incrementava DE NOVO -> toda venda
-- contava 2x. Um race entre webhook v2 + IPN legacy do MP ainda gerava um
-- 3º incremento em alguns pedidos. Resultado real na 16ª: sold_count=66 com
-- apenas 25 ingressos aprovados.
--
-- Desenho novo:
--   - Fluxo online (pedido nasce pending, webhook/robô aprova):
--     tr_order_stock em orders conta na transição -> approved e devolve em
--     cancelled/refunded. (Função confirm_order_stock mantida como está.)
--   - Fluxos que nascem approved (venda offline, cortesia): o pedido é
--     inserido ANTES dos itens, então trigger de INSERT em orders não veria
--     itens. A contagem é por item: triggers abaixo em order_items.
--   - O app NÃO mexe mais em sold_count (increment_batch_sold sem chamadores;
--     mantida no banco só por compatibilidade histórica).
-- ---------------------------------------------------------------------

-- Conta o item no lote quando ele é inserido em um pedido JÁ aprovado
-- (venda offline / cortesia). No fluxo online o pedido ainda é pending
-- nesse momento, então este trigger não age — quem conta é tr_order_stock.
CREATE OR REPLACE FUNCTION public.order_items_stock_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- Devolve o estoque quando um item de pedido aprovado é apagado
-- (ex.: rollback da emissão de cortesia). Se o pedido-pai já foi apagado
-- antes (cascade), não há como saber o status — não age; a recontagem
-- manual cobre faxinas desse tipo.
CREATE OR REPLACE FUNCTION public.order_items_stock_on_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

DROP TRIGGER IF EXISTS tr_order_items_stock_insert ON public.order_items;
CREATE TRIGGER tr_order_items_stock_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_items_stock_on_insert();

DROP TRIGGER IF EXISTS tr_order_items_stock_delete ON public.order_items;
CREATE TRIGGER tr_order_items_stock_delete
  AFTER DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.order_items_stock_on_delete();

-- ---------------------------------------------------------------------
-- Recontagem: sold_count = ingressos reais de pedidos aprovados, em TODOS
-- os lotes (corrige a 16ª e qualquer deriva histórica).
-- ---------------------------------------------------------------------
UPDATE public.ticket_batches b
SET sold_count = COALESCE((
  SELECT count(*)
  FROM public.order_items i
  JOIN public.orders o ON o.id = i.order_id
  WHERE i.ticket_batch_id = b.id AND o.payment_status = 'approved'
), 0),
updated_at = now();

-- ---------------------------------------------------------------------
-- Referência: definição do trigger legado que PERMANECE (não versionado
-- antes; criado na fundação do schema):
--   tr_order_stock: AFTER UPDATE ON orders EXECUTE confirm_order_stock()
--   confirm_order_stock(): +sold_count na transição *->approved;
--                          -sold_count na transição approved->cancelled/refunded.
-- ---------------------------------------------------------------------
