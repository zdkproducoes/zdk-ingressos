import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { signOutAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function CheckinLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/checkin');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  const allowed = profile?.role === 'admin' || profile?.role === 'producer' || profile?.role === 'checkin';
  if (!allowed) redirect('/');

  return (
    <div className="min-h-screen bg-wine-800">
      <header className="border-b border-wine-700 bg-wine-900">
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
                className="text-cream-200 text-sm border border-wine-600 px-3 py-1.5 rounded hover:bg-wine-700 transition"
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