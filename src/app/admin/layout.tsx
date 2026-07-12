import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { getSelectedEvent } from '@/lib/admin/selected-event';

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  finished: 'Arquivado',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin' && profile?.role !== 'producer') redirect('/');

  const selectedEvent = await getSelectedEvent();

  return (
    <div className="min-h-screen bg-surface-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-cream-200 mb-1">Painel Admin</h1>
        {selectedEvent && (
          <p className="text-sm text-cream-400 mb-5">
            Gerenciando:{' '}
            <span className="text-cream-200 font-medium">{selectedEvent.title}</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-muted-600 bg-surface-700 text-cream-300">
              {STATUS_LABEL[selectedEvent.status] ?? selectedEvent.status}
            </span>
            <Link href="/admin/eventos" className="ml-2 text-accent-400 hover:text-accent-300 underline underline-offset-2">
              trocar
            </Link>
          </p>
        )}
        <AdminTabs />
        {children}
      </div>
    </div>
  );
}
