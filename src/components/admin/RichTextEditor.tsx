'use client';

// Editor de texto rico simples (contenteditable + execCommand) para a copy do
// evento. Emite HTML pelo onChange; o servidor sanitiza antes de gravar
// (src/lib/admin/sanitize-html.ts). Sem dependência de front.
import { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, Link2, Eraser } from 'lucide-react';

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Injeta o HTML inicial apenas na montagem — atualizar innerHTML a cada render
  // faria o cursor pular. A partir daí o contenteditable é a fonte da verdade.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current?.innerHTML ?? '');

  const cmd = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt('Endereço do link (https://…)');
    if (!url) return;
    cmd('createLink', /^https?:\/\//i.test(url) ? url : `https://${url}`);
  };

  const btn = 'p-1.5 rounded hover:bg-surface-900 text-cream-300 transition';

  return (
    <div className="border border-muted-600 rounded-lg overflow-hidden">
      <div className="flex items-center gap-0.5 bg-surface-900/60 border-b border-muted-700 px-1.5 py-1">
        <button type="button" onClick={() => cmd('bold')} className={btn} title="Negrito"><Bold size={15} /></button>
        <button type="button" onClick={() => cmd('italic')} className={btn} title="Itálico"><Italic size={15} /></button>
        <button type="button" onClick={() => cmd('underline')} className={btn} title="Sublinhado"><Underline size={15} /></button>
        <span className="w-px h-4 bg-muted-600 mx-1" />
        <button type="button" onClick={() => cmd('insertUnorderedList')} className={btn} title="Lista"><List size={15} /></button>
        <button type="button" onClick={addLink} className={btn} title="Link"><Link2 size={15} /></button>
        <span className="w-px h-4 bg-muted-600 mx-1" />
        <button type="button" onClick={() => cmd('removeFormat')} className={btn} title="Limpar formatação"><Eraser size={15} /></button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        className="min-h-[130px] max-h-[320px] overflow-y-auto px-3 py-2.5 text-sm text-cream-200 bg-surface-800
                   focus:outline-none leading-relaxed
                   [&_strong]:font-bold [&_b]:font-bold [&_u]:underline [&_em]:italic
                   [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-accent-400 [&_a]:underline"
      />
    </div>
  );
}
