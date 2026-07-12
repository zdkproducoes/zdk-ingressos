// components/auth/RedefinirSenhaForm.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type PageState = 'checking' | 'invalid' | 'ready' | 'success';

export function RedefinirSenhaForm() {
  const [pageState, setPageState] = useState<PageState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  // Cliente browser usado APENAS pra checar se existe sessão de recuperação ao montar.
  // O updateUser foi movido pra Route Handler /api/auth/redefinir-senha pra evitar
  // conflitos de NavigatorLock no client (Hipótese 1 do contexto v8).
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setPageState(data.session ? 'ready' : 'invalid');
    });
    return () => { cancelled = true; };
  }, [supabase]);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e: { password?: string; confirm?: string } = {};
    if (password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (password !== confirm) e.confirm = 'Senhas não coincidem';
    if (Object.keys(e).length) { setErrors(e); return; }

    setErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrors({ form: data.error ?? 'Erro ao redefinir senha. Tente novamente.' });
        return;
      }

      setPageState('success');
    } catch (err) {
      console.error('[redefinir-senha] fetch error:', err);
      setErrors({ form: 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  if (pageState === 'checking') {
    return <p className="text-center text-cream-400 py-4">Verificando link…</p>;
  }

  if (pageState === 'invalid') {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-xl font-bold text-cream-200">Link inválido ou expirado</h2>
        <p className="text-sm text-cream-400">
          Este link de recuperação não é mais válido. Os links expiram em 1 hora por segurança. Solicite um novo link.
        </p>
        <Link
          href="/recuperar-senha"
          className="block w-full rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-3 transition"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-emerald-950 border border-emerald-800 p-3 text-sm text-emerald-200">
          Senha alterada com sucesso!
        </div>
        <p className="text-sm text-cream-400">
          Use sua nova senha para fazer login.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-accent-400 hover:bg-accent-500 text-surface-800 font-semibold py-3 transition"
        >
          Ir para login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errors.form && (
        <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-200">
          {errors.form}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-cream-200 mb-1.5">Nova senha</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={password}
            onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })); }}
            className={`${cls(errors.password)} pr-10`}
            placeholder="Mínimo 8 caracteres"
          />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-cream-400 hover:text-accent-300 transition">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-cream-200 mb-1.5">Confirmar nova senha</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={e => { setConfirm(e.target.value); if (errors.confirm) setErrors(prev => ({ ...prev, confirm: undefined })); }}
            className={`${cls(errors.confirm)} pr-10`}
          />
          <button type="button" onClick={() => setShowConfirm(v => !v)}
            aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-cream-400 hover:text-accent-300 transition">
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.confirm && <p className="mt-1 text-xs text-red-400">{errors.confirm}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-surface-800 font-semibold py-3 transition"
      >
        {loading ? 'Redefinindo…' : 'Redefinir senha'}
      </button>
    </form>
  );
}

function cls(error?: string): string {
  const base = 'w-full rounded-lg bg-surface-700 border px-3 py-2.5 text-cream-200 placeholder:text-cream-400 focus:outline-none focus:ring-2 transition';
  return error
    ? `${base} border-red-700 focus:ring-red-600`
    : `${base} border-muted-600 focus:border-accent-400 focus:ring-accent-400/30`;
}
