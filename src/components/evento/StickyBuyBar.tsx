'use client';

// Barra de compra fixa (mobile): o CTA nunca sai da tela — padrão dos
// grandes players (Ingresse/Eventim). Some quando a seção #ingressos
// já está visível, pra não duplicar o botão na tela.
import { useEffect, useState } from 'react';

export function StickyBuyBar({ price }: { price: number }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById('ingressos');
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { rootMargin: '0px 0px -20% 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const priceFmt = price % 1 === 0 ? String(price) : price.toFixed(2).replace('.', ',');

  return (
    <div
      className={`md:hidden fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="glass border-t border-muted-600 px-4 py-3 flex items-center justify-between gap-3">
        <div className="leading-tight">
          <span className="block text-[10px] uppercase tracking-wider text-cream-400">a partir de</span>
          <span className="font-display-bold text-xl text-accent-300">R$ {priceFmt}</span>
        </div>
        <a
          href="#ingressos"
          className="bg-accent-400 hover:bg-accent-300 text-surface-900 font-display-bold uppercase tracking-wide
                     text-sm px-6 py-3 rounded-xl shadow-[0_3px_0_#7C5A16] transition"
        >
          Garantir ingresso
        </a>
      </div>
    </div>
  );
}
