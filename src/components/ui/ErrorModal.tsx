// components/ui/ErrorModal.tsx
'use client';

import { useEffect } from 'react';

type Props = {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  variant?: 'error' | 'warning' | 'success';
};

export function ErrorModal({ open, title, message, onClose, variant = 'error' }: Props) {
  // Fecha com ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const colors = {
    error:   { ring: 'ring-red-700/40',     icon: '⚠️', title: title || 'Algo deu errado', btn: 'bg-red-600 hover:bg-red-700' },
    warning: { ring: 'ring-amber-700/40',   icon: '⚠️', title: title || 'Atenção',         btn: 'bg-amber-600 hover:bg-amber-700' },
    success: { ring: 'ring-emerald-700/40', icon: '✅', title: title || 'Sucesso',          btn: 'bg-emerald-600 hover:bg-emerald-700' },
  }[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-md rounded-2xl bg-surface-700 border border-muted-600 ring-4 ${colors.ring} p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-5xl mb-3">{colors.icon}</div>
          <h2 className="text-xl font-bold text-cream-200 mb-2">{colors.title}</h2>
          <p className="text-cream-300 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className={`w-full rounded-lg ${colors.btn} text-white font-semibold py-2.5 transition`}
            autoFocus
          >
            OK, entendi
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-600 hover:bg-surface-500 text-cream-400 hover:text-cream-200 text-sm transition flex items-center justify-center"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
