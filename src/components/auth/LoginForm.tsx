// components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/minhas-compras';
  const resetSuccess = searchParams.get('reset') === 'success';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null); setShowResend(false);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });

    if (authErr) {
      const msg = authErr.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setError('Você ainda não confirmou seu e-mail.');
        setShowResend(true);
      } else if (msg.includes('invalid login')) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Erro ao entrar. Tente novamente.');
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(false);
      window.location.href = redirectTo;
    } catch {
      setError('Erro ao redirecionar. Tente novamente.');
      setLoading(false);
    }
  }

  async function resend() {
    if (resendCooldown > 0) return;
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      const cd = data.cooldown || 60;
      setResendCooldown(cd);
      const t = setInterval(() => setResendCooldown(c => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      }), 1000);
    } catch {}
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {resetSuccess && (
        <div className="rounded-lg bg-emerald-950 border border-emerald-800 p-3 text-sm text-emerald-200">
          Senha redefinida com sucesso. Faça login com sua nova senha.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-200">
          {error}
          {showResend && (
            <button type="button" onClick={resend} disabled={resendCooldown > 0}
              className="block mt-2 text-red-300 hover:text-red-100 underline disabled:opacity-50 disabled:no-underline">
              {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar e-mail de confirmação'}
            </button>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-cream-200 mb-1.5">E-mail</label>
        <input type="email" autoComplete="email" required value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-lg bg-surface-700 border border-muted-600 px-3 py-2.5 text-cream-200 focus:outline-none focus:border-accent-400"
          placeholder="voce@email.com" />
      </div>

      <div>
        <label className="block text-sm font-medium text-cream-200 mb-1.5">Senha</label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-lg bg-surface-700 border border-muted-600 px-3 py-2.5 pr-10 text-cream-200 focus:outline-none focus:border-accent-400" />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-cream-400 hover:text-accent-300 transition">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="w-full rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-surface-800 font-semibold py-3 transition">
        {loading ? 'Entrando…' : 'Entrar'}
      </button>

      <div className="space-y-1 text-center text-sm pt-2">
        <p>
          <Link href="/recuperar-senha" className="text-accent-400 hover:text-accent-300 underline">
            Esqueci minha senha
          </Link>
        </p>
        <p className="text-cream-400">
          Não tem conta? <Link href="/cadastro" className="text-accent-400 hover:text-accent-300 underline">Criar conta</Link>
        </p>
      </div>
    </form>
  );
}
