'use client';

// Carrossel de destaques da home: até 5 eventos (definidos pelo superadmin
// via events.featured_order; vagas restantes = próximos eventos por data).
// Troca sozinho a cada 5s, com setas laterais e bolinhas de navegação.
// Pausa o autoplay enquanto o mouse está em cima.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { type VitrineEvent } from '@/components/vitrine/EventCard';
import { categoryLabel } from '@/lib/categories';

const AUTOPLAY_MS = 5000;

function fmtPrice(v: number) {
  return v % 1 === 0 ? String(v) : v.toFixed(2).replace('.', ',');
}

export function HeroCarousel({ slides }: { slides: VitrineEvent[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count],
  );

  // Autoplay: reinicia a contagem sempre que o slide muda (inclusive por clique)
  useEffect(() => {
    if (count <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, paused, index]);

  if (count === 0) return null;

  return (
    <div
      className="group relative rounded-3xl overflow-hidden border border-muted-700 mb-10
                 hover:border-accent-400/60 transition-all shadow-[0_18px_60px_rgba(0,0,0,.45)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Eventos em destaque"
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <Link
            key={slide.id}
            href={`/evento/${slide.slug}`}
            aria-hidden={!active}
            tabIndex={active ? 0 : -1}
            className={`block transition-opacity duration-700 ease-in-out ${
              i === 0 ? 'relative' : 'absolute inset-0'
            } ${active ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'}`}
          >
            <div className="relative aspect-[16/7] min-h-[260px] bg-gradient-to-br from-surface-600 to-muted-700">
              {slide.banner_url && (
                <Image
                  src={slide.banner_url}
                  alt={slide.title}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1152px) 100vw, 1152px"
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-900/95 via-surface-900/35 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 sm:p-9 sm:pb-12 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-display text-accent-300 text-xs tracking-[0.28em] uppercase mb-2">
                    Em destaque{categoryLabel(slide.category) ? ` · ${categoryLabel(slide.category)}` : ''}
                  </p>
                  <h2 className="font-display-bold text-[clamp(1.6rem,4.5vw,3rem)] leading-none text-cream-100 uppercase mb-3">
                    {slide.title}
                  </h2>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cream-300">
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      <Calendar className="w-4 h-4 stroke-accent-400" />
                      {new Date(slide.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'short', day: '2-digit', month: 'long',
                      })}
                      {slide.event_time ? ` • ${slide.event_time.slice(0, 5)}` : ''}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 stroke-accent-400" />
                      {slide.venue_name} — {slide.venue_city}/{slide.venue_state}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {slide.price_from != null && (
                    <div className="text-right leading-tight">
                      <span className="block text-[11px] uppercase tracking-wider text-cream-400">a partir de</span>
                      <span className="font-display-bold text-2xl text-accent-300">R$ {fmtPrice(slide.price_from)}</span>
                    </div>
                  )}
                  <span className="bg-accent-400 group-hover:bg-accent-300 text-surface-900 font-display-bold uppercase tracking-wide text-sm px-6 py-3.5 rounded-xl shadow-[0_4px_0_#7C5A16] transition">
                    Garantir meu lugar
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {count > 1 && (
        <>
          {/* Setas laterais */}
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Destaque anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-[2] w-10 h-10 rounded-full
                       bg-surface-900/60 hover:bg-surface-900/90 border border-cream-100/15
                       flex items-center justify-center text-cream-100 backdrop-blur-sm
                       transition opacity-70 hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Próximo destaque"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-[2] w-10 h-10 rounded-full
                       bg-surface-900/60 hover:bg-surface-900/90 border border-cream-100/15
                       flex items-center justify-center text-cream-100 backdrop-blur-sm
                       transition opacity-70 hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Bolinhas centralizadas no meio inferior */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[2] flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir para o destaque ${i + 1}: ${s.title}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? 'w-5 bg-accent-400'
                    : 'w-2 bg-cream-100/40 hover:bg-cream-100/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
