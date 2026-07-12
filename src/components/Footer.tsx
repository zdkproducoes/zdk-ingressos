import Link from 'next/link';
import { platform } from '@/lib/config';

export function Footer() {
  return (
    <footer className="bg-surface-900 border-t border-muted-700 py-8 px-4 mt-auto">
      <div className="max-w-6xl mx-auto mb-5 flex justify-center">
        <span className="font-display text-3xl tracking-wide text-cream-200 opacity-90">
          ZDK <span className="text-accent-400">Ingressos</span>
        </span>
      </div>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-cream-400">
        <div className="flex items-center gap-6">
          <Link href="/buscar-ingresso" className="hover:text-accent-400 transition">
            Localizar meu ingresso
          </Link>
          <Link href="/termos" className="hover:text-accent-400 transition">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-accent-400 transition">
            Privacidade
          </Link>
        </div>
        <p className="text-xs text-muted-500">{platform.name} · powered by {platform.legal.companyName}</p>
      </div>
    </footer>
  );
}
