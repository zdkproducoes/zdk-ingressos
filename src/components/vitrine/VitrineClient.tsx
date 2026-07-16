'use client';

// Vitrine da home: carrossel de destaques (até 5, controlados pelo
// superadmin via featured_order), busca, chips de cidade e grid com TODOS
// os eventos — padrão dos grandes players, com a cara da ZDK.
import { useMemo, useState } from 'react';
import { Search, ShieldCheck, QrCode, Headset } from 'lucide-react';
import { EventCard, type VitrineEvent } from '@/components/vitrine/EventCard';
import { HeroCarousel } from '@/components/vitrine/HeroCarousel';
import { EVENT_CATEGORIES } from '@/lib/categories';

export function VitrineClient({
  events,
  destaques,
}: {
  events: VitrineEvent[];
  destaques: VitrineEvent[];
}) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const cities = useMemo(
    () => Array.from(new Set(events.map((e) => e.venue_city))).sort(),
    [events],
  );
  const categories = useMemo(() => {
    const present = new Set(events.map((e) => e.category).filter(Boolean));
    return EVENT_CATEGORIES.filter((c) => present.has(c.slug));
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (city && e.venue_city !== city) return false;
      if (category && e.category !== category) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.venue_name.toLowerCase().includes(q) ||
        e.venue_city.toLowerCase().includes(q) ||
        (e.organization_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [events, query, city, category]);

  return (
    <>
      {/* Carrossel de destaques (independente dos filtros) */}
      <HeroCarousel slides={destaques} />

      {/* Busca + chips de cidade */}
      <div className="max-w-3xl mx-auto mb-8">
        <label className="relative block mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 stroke-cream-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar evento, casa ou produtora…"
            aria-label="Buscar eventos"
            className="w-full bg-surface-700 border border-muted-600 rounded-full pl-11 pr-5 py-3 text-sm text-cream-200 placeholder:text-cream-500"
          />
        </label>
        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {categories.map((c) => (
              <button
                key={c.slug}
                onClick={() => setCategory(c.slug === category ? null : c.slug)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] border transition ${
                  category === c.slug
                    ? 'bg-accent-400 border-accent-400 text-surface-900 font-bold'
                    : 'bg-surface-700 border-muted-600 text-cream-300 hover:border-cream-400'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        )}
        {cities.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setCity(null)}
              className={`px-4 py-1.5 rounded-full text-sm border transition ${
                city === null
                  ? 'bg-accent-400 border-accent-400 text-surface-900 font-bold'
                  : 'bg-surface-700 border-muted-600 text-cream-300 hover:border-cream-400'
              }`}
            >
              Todas
            </button>
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c === city ? null : c)}
                className={`px-4 py-1.5 rounded-full text-sm border transition ${
                  city === c
                    ? 'bg-accent-400 border-accent-400 text-surface-900 font-bold'
                    : 'bg-surface-700 border-muted-600 text-cream-300 hover:border-cream-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="max-w-md mx-auto bg-surface-700 border border-muted-700 rounded-2xl p-10 text-center">
          <h2 className="font-display-bold text-2xl text-cream-200 mb-3">
            {events.length === 0 ? 'Nada anunciado por enquanto' : 'Nenhum evento encontrado'}
          </h2>
          <p className="text-sm text-cream-400">
            {events.length === 0
              ? 'Os próximos rolês da região aparecem aqui. Volte em breve!'
              : 'Tente outra busca ou limpe o filtro de cidade.'}
          </p>
        </div>
      ) : (
        // Grid com TODOS os eventos (inclusive os do carrossel)
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Faixa de confiança */}
      <div className="mt-16 grid sm:grid-cols-3 gap-4 border-t border-muted-700 pt-10">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 stroke-accent-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-cream-200 mb-0.5">Pagamento seguro</p>
            <p className="text-[13px] text-cream-400 leading-snug">Cartão e Pix processados pelo Mercado Pago. Nada fica salvo aqui.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <QrCode className="w-6 h-6 stroke-accent-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-cream-200 mb-0.5">QR Code na hora</p>
            <p className="text-[13px] text-cream-400 leading-snug">Aprovou, chegou: seu ingresso vai pro e-mail e fica em “Minhas compras”.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Headset className="w-6 h-6 stroke-accent-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-cream-200 mb-0.5">Suporte de gente</p>
            <p className="text-[13px] text-cream-400 leading-snug">Plataforma da ZDK Produções — quem faz evento no ABC há anos.</p>
          </div>
        </div>
      </div>
    </>
  );
}
