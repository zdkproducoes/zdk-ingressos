import Link from 'next/link';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { requirePanelContext } from '@/lib/auth/panel';
import { getSelectedEvent } from '@/lib/admin/selected-event';

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  draft: 'Rascunho',
  pending: 'Aguardando aprovação',
  finished: 'Arquivado',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePanelContext({ redirectTo: '/admin' });

  const selectedEvent = await getSelectedEvent(ctx);

  return (
    <div className="min-h-screen bg-surface-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-cream-200 mb-1">Dashboard</h1>
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
        <AdminTabs
          showFinanceiro={ctx.isSuperadmin || ctx.memberships.some((m) => m.role === 'owner')}
          showPlataforma={ctx.isSuperadmin}
        />
        {children}
      </div>
    </div>
  );
}
