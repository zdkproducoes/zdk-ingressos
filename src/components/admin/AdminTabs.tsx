'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const tabs = [
  { label: 'Eventos',     href: '/admin/eventos' },
  { label: 'Resumo',      href: '/admin/resumo' },
  { label: 'Pedidos',     href: '/admin/pedidos' },
  { label: 'Lotes',       href: '/admin/lotes' },
  { label: 'Compradores', href: '/admin/compradores' },
  { label: 'Cortesias',   href: '/admin/cortesias' },
  { label: 'Venda offline', href: '/admin/venda-offline' },
  { label: 'Check-in',    href: '/admin/checkin' },
  { label: 'Afiliados',   href: '/admin/afiliados' },
];

export function AdminTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const activeHref = tabs.find(t => pathname.startsWith(t.href))?.href ?? tabs[0].href;

  return (
    <>
      {/* Desktop: abas horizontais */}
      <div className="hidden md:flex border-b border-mauve-700 gap-1 mb-6">
        {tabs.map(tab => {
          const isActive = activeHref === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                isActive
                  ? 'text-cream-200 border-amber-sacode-400'
                  : 'text-cream-400 border-transparent hover:text-cream-200 hover:border-mauve-500'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile: select */}
      <div className="md:hidden mb-6">
        <select
          value={activeHref}
          onChange={e => router.push(e.target.value)}
          className="w-full bg-wine-700 text-cream-200 border border-mauve-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-sacode-400"
        >
          {tabs.map(tab => (
            <option key={tab.href} value={tab.href}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
