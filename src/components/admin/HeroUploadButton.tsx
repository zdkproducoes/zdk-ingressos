'use client';

// Botão de upload da hero (banner 2:1) do evento. Valida a dimensão no
// navegador (feedback instantâneo) e envia para /api/admin/eventos/upload-hero,
// que revalida tipo/tamanho/dimensão no servidor. Ao concluir, devolve a URL
// pública pelo onChange.
import { useRef, useState } from 'react';
import { ImageUp, Loader2 } from 'lucide-react';
import { validateHeroSize } from '@/lib/images/dimensions';

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não consegui ler a imagem.'));
    };
    img.src = url;
  });
}

export function HeroUploadButton({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo
    if (!file) return;
    setError(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Use JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo maior que 5MB.');
      return;
    }

    setBusy(true);
    try {
      const dims = await readDimensions(file);
      const sizeError = validateHeroSize(dims.width, dims.height);
      if (sizeError) { setError(sizeError); return; }

      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/eventos/upload-hero', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'Erro ao enviar imagem.'); return; }
      onChange(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar imagem.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-muted-600 bg-surface-800 hover:bg-surface-900 disabled:opacity-50 text-cream-300 transition"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />}
          {busy ? 'Enviando…' : value ? 'Trocar imagem' : 'Enviar imagem'}
        </button>
        {value && !busy && (
          <span className="text-xs text-emerald-400">✓ imagem carregada</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePick}
        className="hidden"
      />
      <p className="text-xs text-cream-400 mt-1">Proporção 2:1 — ideal 2160×1080 (mín. 1200×600).</p>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      {value && (
        <img src={value} alt="Prévia da hero" className="mt-2 rounded-lg border border-muted-700 w-full max-h-32 object-cover" />
      )}
    </div>
  );
}
