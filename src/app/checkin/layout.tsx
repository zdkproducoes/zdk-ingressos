import Link from 'next/link';
import { requirePanelContext } from '@/lib/auth/panel';
import { signOutAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function CheckinLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePanelContext({
    allowCheckinRole: true,
    redirectTo: '/checkin',
  });

  return (
    <div className="min-h-screen bg-surface-800">
      <header className="border-b border-surface-700 bg-surface-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/checkin" className="text-cream-200 font-bold text-xl">
            SACODE Check-in
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-cream-300 text-sm hidden sm:inline">
              {profile?.full_name || profile?.email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-cream-200 text-sm border border-surface-600 px-3 py-1.5 rounded hover:bg-surface-700 transition"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}