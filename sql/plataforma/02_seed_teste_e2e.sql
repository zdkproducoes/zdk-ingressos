-- =====================================================================
-- SEED DE TESTE E2E — 2 organizações + eventos (APENAS ambiente de teste)
-- =====================================================================
-- Rodar no projeto zdk-ingressos DEPOIS que os usuários de teste existirem
-- (criar via /cadastro do app; o trigger handle_new_user cria os profiles):
--   - conteudo@zdkproducoes.com.br  → superadmin (Fernando)
--   - produtor.a@teste.com          → owner da org A
--   - produtor.b@teste.com          → owner da org B
--
-- ⚠️ NÃO rodar em produção quando a plataforma estiver no ar de verdade.

-- 1) Superadmin
UPDATE public.profiles SET role = 'admin'
WHERE email = 'conteudo@zdkproducoes.com.br';

-- 2) Organizações de teste (fees diferentes p/ validar o financeiro)
INSERT INTO public.organizations (name, slug, contact_email, platform_fee_percent)
VALUES
  ('Produtora Alfa', 'produtora-alfa', 'produtor.a@teste.com', 10.00),
  ('Produtora Beta', 'produtora-beta', 'produtor.b@teste.com', 5.00)
ON CONFLICT (slug) DO NOTHING;

-- 3) Owners (exige os cadastros feitos antes)
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT o.id, p.id, 'owner'
FROM public.organizations o
JOIN public.profiles p ON p.email = 'produtor.a@teste.com'
WHERE o.slug = 'produtora-alfa'
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT o.id, p.id, 'owner'
FROM public.organizations o
JOIN public.profiles p ON p.email = 'produtor.b@teste.com'
WHERE o.slug = 'produtora-beta'
ON CONFLICT (organization_id, user_id) DO NOTHING;

UPDATE public.profiles SET role = 'producer'
WHERE email IN ('produtor.a@teste.com', 'produtor.b@teste.com')
  AND role = 'customer';

-- 4) Um evento ativo para cada organização
INSERT INTO public.events (
  organization_id, title, slug, event_date, event_time,
  venue_name, venue_address, venue_city, venue_state,
  status, service_fee_percent,
  content
)
SELECT o.id, 'Festival Alfa', 'festival-alfa', (current_date + 30), '16:00',
       'Espaço Alfa', 'Rua das Flores, 100', 'São Paulo', 'SP',
       'active', 10,
       '{"subtitle":"1ª edição","lineup":[{"name":"Banda Alfa","genre":"Rock","tier":"headliner"},{"name":"DJ Zeta","tier":"dj"}]}'::jsonb
FROM public.organizations o WHERE o.slug = 'produtora-alfa'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.events (
  organization_id, title, slug, event_date, event_time,
  venue_name, venue_address, venue_city, venue_state,
  status, service_fee_percent,
  content
)
SELECT o.id, 'Baile Beta', 'baile-beta', (current_date + 45), '22:00',
       'Clube Beta', 'Av. Central, 200', 'Santo André', 'SP',
       'active', 10,
       '{"subtitle":"edição de verão","opening_notice":"em breve"}'::jsonb
FROM public.organizations o WHERE o.slug = 'produtora-beta'
ON CONFLICT (slug) DO NOTHING;

-- 5) Lotes do Festival Alfa (Baile Beta fica sem lote = "vendas em breve")
INSERT INTO public.ticket_batches (event_id, name, price, quantity, sort_order, status)
SELECT e.id, '1º Lote', 50.00, 100, 1, 'active'
FROM public.events e WHERE e.slug = 'festival-alfa'
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_batches tb
    WHERE tb.event_id = e.id AND tb.name = '1º Lote'
  );

INSERT INTO public.ticket_batches (event_id, name, price, quantity, sort_order, status)
SELECT e.id, 'Cortesia', 0.00, 20, 99, 'active'
FROM public.events e WHERE e.slug = 'festival-alfa'
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_batches tb
    WHERE tb.event_id = e.id AND tb.name = 'Cortesia'
  );

-- Cortesia não aparece na página pública
UPDATE public.ticket_batches SET is_visible = false
WHERE name = 'Cortesia'
  AND event_id IN (SELECT id FROM public.events WHERE slug = 'festival-alfa');
