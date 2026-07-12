import Link from 'next/link';
import { platform } from '@/lib/config';
import { LogoVertical } from '@/components/brand/Logo';

export function Footer() {
  return (
    <footer className="bg-surface-900 border-t border-muted-700 py-10 px-4 mt-auto">
      <div className="max-w-6xl mx-auto mb-6 flex justify-center">
        <LogoVertical symbolHeight={40} />
      </div>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-cream-400">
        <div className="flex items-center gap-6 flex-wrap justify-center">
          <Link href="/buscar-ingresso" className="hover:text-accent-400 transition">
            Localizar meu ingresso
          </Link>
          <Link href="/sobre" className="hover:text-accent-400 transition">
            Sobre nós
          </Link>
          <Link href="/anuncie" className="hover:text-accent-400 transition">
            Anuncie seu evento
          </Link>
          <Link href="/termos" className="hover:text-accent-400 transition">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-accent-400 transition">
            Privacidade
          </Link>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-xs text-cream-500">
            🔒 Pagamento seguro via Mercado Pago · QR Code na hora
          </p>
          <p className="text-xs text-cream-500 mt-1">
            {platform.name} · powered by {platform.legal.companyName}
            {platform.legal.document ? ` · CNPJ ${platform.legal.document}` : ''}
          </p>
        </div>
      </div>
    </footer>
  );
}
