'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { LogoHorizontal } from '@/components/brand/Logo';

export type UserProfile = {
  first_name: string;
  last_name: string;
  email: string;
};

// undefined = carregando | null = não logado | UserProfile = logado
type AuthState = UserProfile | null | undefined;

export function Navbar({ initialAuth }: { initialAuth: UserProfile | null }) {
  const supabase = useRef(createSupabaseBrowserClient()).current;
  // Comeca com o estado vindo do servidor (sem "carregando") -> Navbar ja vem preenchida.
  const [authState, setAuthState] = useState<AuthState>(initialAuth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', session.user.id)
            .single();
          setAuthState(data ?? null);
        } catch {
          setAuthState(null);
        }
      } else {
        setAuthState(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLoggedIn = authState !== undefined && authState !== null;
  const isGuest = authState === null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-600 border-b border-muted-600 h-14">
      <div className="max-w-6xl mx-auto h-full px-4 flex items-center justify-between">

        <Link href="/" aria-label="ZDK Ingressos — Início">
          <LogoHorizontal symbolHeight={30} />
        </Link>

        <div className="flex items-center gap-3">

          {isLoggedIn && (
            <>
              {/* Desktop: saudação + links + sair */}
              <div className="hidden md:flex items-center gap-4">
                <span className="text-cream-300 text-sm">
                  Olá,{' '}
                  <span className="font-medium text-cream-200">{authState.first_name}</span>
                </span>
                <Link
                  href="/minhas-compras"
                  className="text-cream-200/80 hover:text-accent-400 transition text-sm"
                >
                  Minhas compras
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    aria-label="Sair da conta"
                    className="flex items-center gap-1.5 text-cream-400 hover:text-accent-300 transition text-sm"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </form>
              </div>

              {/* Mobile: avatar circular com dropdown */}
              <div className="md:hidden relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  aria-label="Abrir menu do usuário"
                  className="w-9 h-9 rounded-full bg-muted-600 text-cream-200 text-sm font-semibold flex items-center justify-center"
                >
                  {authState.first_name.charAt(0).toUpperCase()}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-surface-700 border border-muted-600 rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-muted-600">
                      <p className="text-cream-200 text-sm font-medium">
                        {authState.first_name} {authState.last_name}
                      </p>
                      <p className="text-cream-400 text-xs truncate">{authState.email}</p>
                    </div>
                    <Link
                      href="/minhas-compras"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-cream-200/80 hover:text-accent-400 hover:bg-surface-500 transition"
                    >
                      Minhas compras
                    </Link>
                    <form action="/auth/signout" method="post">
                      <button
                        type="submit"
                        aria-label="Sair da conta"
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-cream-400 hover:text-accent-300 hover:bg-surface-500 transition"
                      >
                        <LogOut size={16} />
                        Sair
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}

          {isGuest && (
            <>
              <Link
                href="/login"
                aria-label="Entrar na conta"
                className="text-cream-200/80 hover:text-accent-400 transition text-sm"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                aria-label="Criar conta"
                className="bg-accent-400 hover:bg-accent-500 text-surface-800 px-4 py-1.5 rounded text-sm transition"
              >
                Cadastrar
              </Link>
            </>
          )}

        </div>
      </div>
    </nav>
  );
}
