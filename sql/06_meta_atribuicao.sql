-- =====================================================================
-- SACODE — Atribuição Meta: dados do browser do comprador no pedido
-- =====================================================================
-- Como rodar:
--   1. Abra Supabase > SQL Editor > New query
--   2. Cole TUDO isso
--   3. Clique Run (Ctrl+Enter)
--   4. Aguarde "Success. No rows returned"
--
-- ⚠️ RODAR ANTES do deploy da captura no checkout.
-- =====================================================================
-- O Purchase server-side (CAPI) hoje envia só e-mail e telefone com hash
-- → EMQ 4,6/10. O Meta pontua muito mais quando recebe também os cookies
-- do pixel (_fbp/_fbc), o IP e o user agent do comprador. Esses dados só
-- existem no request do CHECKOUT (browser); o webhook/robô que dispara o
-- Purchase roda depois, sem browser. Solução: capturar no checkout,
-- guardar no pedido e ler na hora de enviar o evento.
--
-- Colunas novas (todas opcionais — pedido sem elas continua válido e o
-- Purchase continua saindo, só com match menor):
--   meta_fbp          cookie _fbp (id do browser gerado pelo pixel)
--   meta_fbc          cookie _fbc (id do clique no anúncio; só existe se
--                     o comprador chegou por link com fbclid)
--   client_ip         IP do comprador no momento do checkout
--   client_user_agent user agent do browser no momento do checkout
-- ---------------------------------------------------------------------

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS meta_fbp          text,
  ADD COLUMN IF NOT EXISTS meta_fbc          text,
  ADD COLUMN IF NOT EXISTS client_ip         text,
  ADD COLUMN IF NOT EXISTS client_user_agent text;

COMMENT ON COLUMN public.orders.meta_fbp          IS 'Cookie _fbp do pixel Meta no checkout (atribuição CAPI)';
COMMENT ON COLUMN public.orders.meta_fbc          IS 'Cookie _fbc do pixel Meta no checkout (clique de anúncio)';
COMMENT ON COLUMN public.orders.client_ip         IS 'IP do comprador no checkout (user_data.client_ip_address da CAPI)';
COMMENT ON COLUMN public.orders.client_user_agent IS 'User agent do comprador no checkout (user_data.client_user_agent da CAPI)';
