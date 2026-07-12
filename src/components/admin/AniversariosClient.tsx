'use client';

// Lista de aniversariantes do mês + pop-up para editar a mensagem do convite.
// O texto fica salvo no navegador (localStorage) e vale para todos os botões.

import { useEffect, useState } from 'react';
import { MessageCircle, PencilLine, X } from 'lucide-react';
import {
  SERIES,
  MONTHS_PT,
  fmtPhone,
  fillTemplate,
  waHref,
  DEFAULT_BIRTHDAY_TEMPLATE,
  type Aniversariante,
} from '@/lib/admin/publico';

const STORAGE_KEY = 'publico_msg_aniversario';

const ORIGIN_BADGE = {
  online:  { label: 'Plataforma',  classes: 'bg-green-900 text-green-300' },
  offline: { label: 'Offline', classes: 'bg-muted-700 text-cream-300' },
} as const;

export function AniversariosClient({
  people,
  mes,
  eventTitle,
  showOrigin,
}: {
  people: Aniversariante[];
  mes: number; // 1-12
  eventTitle: string | null;
  showOrigin: boolean;
}) {
  const [template, setTemplate] = useState(DEFAULT_BIRTHDAY_TEMPLATE);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setTemplate(saved);
  }, []);

  const monthLabel = MONTHS_PT[mes - 1].toLowerCase();
  const evento = eventTitle || 'nosso próximo evento';

  const openModal = () => { setDraft(template); setModalOpen(true); };
  const saveTemplate = () => {
    const value = draft.trim() || DEFAULT_BIRTHDAY_TEMPLATE;
    setTemplate(value);
    localStorage.setItem(STORAGE_KEY, value);
    setModalOpen(false);
  };

  const previewName = people[0]?.firstName || 'Fulano';
  const previewAge = people[0]?.ageTurning ?? 25;

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap px-6 py-3 border-b border-muted-700">
        <p className="text-cream-400 text-xs">
          Mensagem atual: <span className="text-cream-300 italic">“{template.length > 90 ? `${template.slice(0, 90)}…` : template}”</span>
        </p>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-1.5 text-accent-400 hover:text-accent-300 transition text-sm shrink-0"
        >
          <PencilLine size={14} /> Editar mensagem
        </button>
      </div>

      {people.length === 0 ? (
        <p className="text-cream-400 text-sm p-6">Nenhum aniversariante em {MONTHS_PT[mes - 1]}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-800 text-cream-300 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Dia</th>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Idade</th>
                <th className="text-left p-3">Gênero</th>
                {showOrigin && <th className="text-left p-3">Origem</th>}
                <th className="text-left p-3">WhatsApp</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const msg = fillTemplate(template, {
                  nome: p.firstName || 'tudo bem',
                  mes: monthLabel,
                  evento,
                  idade: p.ageTurning,
                });
                const wa = waHref(p.phone, msg);
                const badge = ORIGIN_BADGE[p.origin];
                return (
                  <tr key={p.id} className="border-t border-muted-700 text-cream-200">
                    <td className="p-3 whitespace-nowrap font-mono">
                      {String(p.day).padStart(2, '0')}/{String(mes).padStart(2, '0')}
                    </td>
                    <td className="p-3 max-w-xs">
                      <p className="truncate" title={p.name}>{p.name || '—'}</p>
                    </td>
                    <td className="p-3 whitespace-nowrap text-cream-300">faz {p.ageTurning}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-cream-300">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SERIES[p.gender].color }} />
                        {SERIES[p.gender].label.replace('Outros / não informado', 'Outro / N.I.')}
                      </span>
                    </td>
                    {showOrigin && (
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </td>
                    )}
                    <td className="p-3 whitespace-nowrap font-mono text-cream-300">{fmtPhone(p.phone)}</td>
                    <td className="p-3 text-right">
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-400 text-surface-800 font-semibold text-xs hover:bg-accent-300 transition whitespace-nowrap"
                        >
                          <MessageCircle size={14} /> Convidar
                        </a>
                      ) : (
                        <span className="text-cream-400 text-xs">sem telefone</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pop-up de edição da mensagem */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModalOpen(false)}>
          <div
            className="bg-surface-700 rounded-lg border border-muted-700 w-full max-w-lg p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-cream-200 font-bold">Mensagem do convite</h3>
              <button onClick={() => setModalOpen(false)} className="text-cream-400 hover:text-cream-200 transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-cream-400 text-xs">
              Use os curingas: <code className="text-accent-300">{'{nome}'}</code> (primeiro nome),{' '}
              <code className="text-accent-300">{'{mes}'}</code> (mês do aniversário),{' '}
              <code className="text-accent-300">{'{evento}'}</code> (evento selecionado) e{' '}
              <code className="text-accent-300">{'{idade}'}</code> (idade que a pessoa faz).
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="w-full bg-surface-800 text-cream-200 border border-muted-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-400 resize-y"
            />
            <div className="bg-surface-800 border border-muted-700 rounded-lg p-3">
              <p className="text-cream-400 text-xs mb-1">Prévia:</p>
              <p className="text-cream-300 text-sm">
                {fillTemplate(draft || DEFAULT_BIRTHDAY_TEMPLATE, {
                  nome: previewName, mes: monthLabel, evento, idade: previewAge,
                })}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={() => setDraft(DEFAULT_BIRTHDAY_TEMPLATE)}
                className="text-cream-400 hover:text-cream-200 transition text-xs"
              >
                Restaurar padrão
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-muted-600 text-cream-200 hover:bg-surface-800 transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveTemplate}
                  className="px-4 py-2 rounded-lg bg-accent-400 text-surface-800 font-semibold hover:bg-accent-300 transition text-sm"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
