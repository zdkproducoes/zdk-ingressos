// app/admin/afiliados/novo/page.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { AfiliadoNovoClient } from '@/components/admin/AfiliadoNovoClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Novo afiliado — Admin SACODE' };

export default async function AfiliadoNovoPage() {
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, title')
    .eq('status', 'active')
    .order('event_date', { ascending: true });

  return (
    <div>
      <Link
        href="/admin/afiliados"
        className="inline-flex items-center gap-1.5 text-sm text-cream-400 hover:text-cream-200 transition mb-4"
      >
        <ArrowLeft size={16} /> Voltar para a lista
      </Link>

      <div className="bg-wine-700 border border-mauve-700 rounded-lg p-6 max-w-2xl">
        <h2 className="text-xl font-bold text-cream-200 mb-1">Novo afiliado</h2>
        <p className="text-sm text-cream-400 mb-6">
          O afiliado fica amarrado a um evento específico. O code é usado no link de divulgação:
          <span className="font-mono text-cream-300"> /evento/&lt;slug&gt;?ref=&lt;code&gt;</span>
        </p>

        <AfiliadoNovoClient events={events ?? []} />
      </div>
    </div>
  );
}
