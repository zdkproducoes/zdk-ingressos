import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-wine-900 border-t border-mauve-700 py-8 px-4 mt-auto">
      <div className="max-w-6xl mx-auto mb-5 flex justify-center">
        <Image
          src="/logo-sacode.png"
          alt="Sacode do Lacerda"
          width={600}
          height={338}
          className="h-[70px] w-auto opacity-90"
        />
      </div>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-cream-400">
        <div className="flex items-center gap-6">
          <Link href="/buscar-ingresso" className="hover:text-amber-sacode-400 transition">
            Localizar meu ingresso
          </Link>
        </div>
        <p className="text-xs text-mauve-500">powered by ZDK Produções</p>
      </div>
    </footer>
  );
}
