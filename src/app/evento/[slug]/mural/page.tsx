// app/evento/[slug]/mural/page.tsx
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Wall } from '@/components/wall/Wall';
export const dynamic = 'force-dynamic';
export default async function MuralPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/evento/${slug}/mural`);
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, slug, title, event_date, event_time, venue_name, banner_url')
    .eq('slug', slug)
    .maybeSingle();
  if (!event) notFound();

  // Verifica se é admin/producer (libera acesso sem precisar de ingresso)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'producer';

  // Verifica se comprou ingresso
  const { data: hasTicket } = await supabaseAdmin.rpc('user_has_paid_ticket', {
    p_user_id: user.id,
    p_event_id: event.id,
  });

  // Bloqueia só se NÃO for admin E NÃO tiver ingresso
  if (!isAdmin && !hasTicket) {
    return (
      <main className="min-h-screen bg-surface-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl bg-surface-700 border border-accent-700/40 p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-accent-200 mb-2">Mural exclusivo</h1>
          <p className="text-cream-300 text-sm leading-relaxed mb-6">
            Apenas quem comprou ingresso para <strong className="text-cream-200">{event.title}</strong> pode acessar o mural.
          </p>
          <div className="flex flex-col gap-2">
            <Link href={`/checkout?event=${event.slug}`}
              className="rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-2.5 px-6 transition">
              Comprar ingresso
            </Link>
            <Link href="/minhas-compras" className="text-sm text-cream-400 hover:text-cream-200 transition mt-2">
              ← Minhas compras
            </Link>
          </div>
        </div>
      </main>
    );
  }
  const eventDate = new Date(event.event_date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
  return (
    <main className="min-h-screen bg-surface-800">
      {/* Header sticky com info do evento */}
      <header className="sticky top-0 z-10 bg-surface-800/95 backdrop-blur border-b border-muted-700">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/minhas-compras/${event.slug}`}
              className="text-sm text-cream-400 hover:text-cream-200 shrink-0">
              ← Voltar
            </Link>
            <div className="text-center min-w-0 flex-1">
              <h1 className="text-sm font-semibold text-cream-200 truncate">{event.title}</h1>
              <p className="text-xs text-cream-400">{eventDate} • {(event.event_time || '').slice(0,5)}</p>
            </div>
            <div className="w-16 shrink-0" />
          </div>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 rounded-xl bg-gradient-to-r from-surface-700/50 to-muted-700/50 border border-muted-600/30 p-4">
          <p className="text-sm text-cream-200">
            💬 <strong>Bem-vindo ao mural!</strong>
          </p>
          <p className="text-xs text-cream-400 mt-1">
            Aqui você conversa com quem também vai ao evento. Seja respeitoso — posts inadequados podem ser removidos.
          </p>
        </div>
        <Wall eventId={event.id} eventTitle={event.title} />
      </div>
    </main>
  );
}
