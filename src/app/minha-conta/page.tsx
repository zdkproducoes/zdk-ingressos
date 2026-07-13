// Área do cliente: dados pessoais, e-mail, celular, senha e privacidade.
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MinhaContaClient } from '@/components/conta/MinhaContaClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha conta' };

export default async function MinhaContaPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/minha-conta');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name, cpf, phone, email, birth_date, gender, city, neighborhood, state, marketing_consent')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login?redirect=/minha-conta');

  return (
    <main className="min-h-screen bg-surface-800">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-display-bold text-3xl text-cream-200 uppercase mb-1">Minha conta</h1>
        <p className="text-sm text-cream-400 mb-8">
          Seus dados, seu acesso e sua privacidade — tudo num lugar só.
        </p>
        <MinhaContaClient profile={profile} email={user.email ?? profile.email ?? ''} />
      </div>
    </main>
  );
}
