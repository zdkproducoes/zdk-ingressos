-- 06_evento_nao_listado.sql
-- "Evento não listado": publicado e vendendo por link direto, mas fora da
-- vitrine da home e do sitemap.
--
-- Caso de uso que motivou: o evento precisa abrir vendas na data combinada,
-- mas a arte oficial ainda não ficou pronta — não dá pra estampar a vitrine
-- com um banner provisório. Serve também pra pré-venda fechada (lista de
-- convidados, link de afiliado) antes do anúncio público.
--
-- Não é controle de acesso: a página do evento continua pública pra quem tem
-- o link (é isso que permite vender). O que muda é só a DIVULGAÇÃO pela
-- plataforma. Quem esconde de verdade é status <> 'active'.

alter table public.events
  add column if not exists is_unlisted boolean not null default false;

comment on column public.events.is_unlisted is
  'true = evento publicado que NAO aparece na vitrine da home nem no sitemap; vende normalmente por link direto.';

-- Índice parcial: a vitrine filtra is_unlisted = false em toda visita.
create index if not exists idx_events_vitrine
  on public.events (event_date)
  where status = 'active' and is_unlisted = false;
