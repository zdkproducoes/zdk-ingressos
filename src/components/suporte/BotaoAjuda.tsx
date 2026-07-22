'use client';

import { useState } from 'react';
import { HelpCircle, X, CheckCircle2, Loader2 } from 'lucide-react';

// Máscaras leves só para exibição; o backend re-normaliza tudo.
function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCelular(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export function BotaoAjuda() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [celular, setCelular] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [website, setWebsite] = useState(''); // honeypot

  const reset = () => {
    setNome(''); setCpf(''); setCelular(''); setMensagem(''); setWebsite('');
    setErro(null); setSent(false);
  };

  const fechar = () => {
    setOpen(false);
    // pequeno atraso para não "piscar" o form ao fechar depois de enviar
    setTimeout(reset, 200);
  };

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch('/api/suporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cpf, celular, mensagem, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data?.error ?? 'Não foi possível enviar. Tente de novo.');
        return;
      }
      setSent(true);
    } catch {
      setErro('Falha de conexão. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-lg bg-surface-800 border border-muted-700 px-3 py-2 text-sm text-cream-200 ' +
    'placeholder:text-cream-400 focus:outline-none focus:border-accent-400';

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-accent-400
                     px-4 py-3 font-display-bold text-sm text-surface-800 shadow-lg shadow-black/30
                     hover:bg-accent-300 transition"
          aria-label="Precisa de ajuda?"
        >
          <HelpCircle size={18} />
          PRECISA DE AJUDA?
        </button>
      )}

      {/* Pop-up no canto */}
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Formulário de ajuda"
          className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-muted-700
                     bg-surface-700 shadow-2xl shadow-black/40"
        >
          <div className="flex items-center justify-between border-b border-muted-700 px-4 py-3">
            <h2 className="flex items-center gap-2 font-display-bold text-cream-200">
              <HelpCircle size={18} className="text-accent-400" />
              Precisa de ajuda?
            </h2>
            <button
              type="button"
              onClick={fechar}
              className="text-cream-400 hover:text-cream-200 transition"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
              <CheckCircle2 size={40} className="text-green-400" />
              <p className="font-display-bold text-cream-200">Solicitação enviada com sucesso!</p>
              <p className="text-sm text-cream-400">
                Ela será respondida em até 24 horas.
              </p>
              <button
                type="button"
                onClick={fechar}
                className="mt-2 rounded-lg bg-accent-400 px-4 py-2 text-sm font-semibold text-surface-800 hover:bg-accent-300 transition"
              >
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-3 px-4 py-4">
              <p className="text-xs text-cream-400">
                Preencha os dados abaixo e nossa equipe entra em contato.
              </p>

              {/* honeypot invisível */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              <input
                className={inputCls}
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={120}
                required
              />
              <input
                className={inputCls}
                placeholder="CPF"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                inputMode="numeric"
              />
              <input
                className={inputCls}
                placeholder="Celular (com DDD)"
                value={celular}
                onChange={(e) => setCelular(maskCelular(e.target.value))}
                inputMode="tel"
                required
              />
              <textarea
                className={`${inputCls} resize-none`}
                placeholder="Como podemos ajudar?"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={4}
                maxLength={2000}
                required
              />

              {erro && <p className="text-sm text-red-400">{erro}</p>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-400 px-4 py-2.5
                           text-sm font-semibold text-surface-800 hover:bg-accent-300 transition
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Enviando…' : 'Enviar'}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
