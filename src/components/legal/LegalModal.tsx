'use client';

import { useEffect, useRef } from 'react';

type LegalModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function LegalModal({ open, title, onClose, children }: LegalModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Fecha com Esc
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Bloqueia scroll do body enquanto aberto e foca no botão de fechar
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-wine-700 border border-mauve-600 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mauve-700">
          <h2
            id="legal-modal-title"
            className="text-lg md:text-xl font-bold text-cream-200"
          >
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-2 text-cream-300 hover:bg-wine-600 hover:text-cream-100 focus:outline-none focus:ring-2 focus:ring-amber-sacode-400 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-mauve-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-amber-sacode-400 hover:bg-amber-sacode-500 text-wine-800 font-semibold py-2 px-5 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
