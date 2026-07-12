// components/auth/RecuperarSenhaForm.tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function RecuperarSenhaForm() {
  const searchParams = useSearchParams();
  const linkInvalido = searchParams.get('erro') === 'link_invalido';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    try {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
    } catch (err) {
      console.error('[recuperar-senha] resetPasswordForEmail error:', err);
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-cream-200">
          Se existir uma conta com esse e-mail, enviamos um link de recuperação.
          Verifique sua caixa de entrada e a pasta de spam. O link expira em 1 hora.
        </p>
        <Link href="/login" className="block text-sm text-accent-400 hover:text-accent-300 underline pt-2">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {linkInvalido && (
        <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-200">
          Link inválido ou expirado. Solicite um novo link abaixo.
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-cream-200 mb-1.5">E-mail</label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-lg bg-surface-700 border border-muted-600 px-3 py-2.5 text-cream-200 focus:outline-none focus:border-accent-400"
          placeholder="voce@email.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-surface-800 font-semibold py-3 transition"
      >
        {loading ? 'Enviando…' : 'Enviar link de recuperação'}
      </button>

      <p className="text-center text-sm text-cream-400 pt-2">
        Lembrou a senha?{' '}
        <Link href="/login" className="text-accent-400 hover:text-accent-300 underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
