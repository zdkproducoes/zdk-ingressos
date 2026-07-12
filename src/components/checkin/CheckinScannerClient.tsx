'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type CheckinResult =
  | { kind: 'success'; attendeeName: string; batchName: string; orderNumber: number }
  | { kind: 'already'; attendeeName: string; batchName: string; orderNumber: number; checkedInAt: string; checkedInBy: string }
  | { kind: 'not_found' }
  | { kind: 'wrong_event'; expectedEvent: string }
  | { kind: 'invalid_status'; status: string }
  | { kind: 'error'; message: string };

interface SearchHit {
  order_item_id: string;
  qr_code_token: string;
  attendee_name: string;
  batch_name: string;
  order_number: number;
  checked_in_at: string | null;
  checked_in_by_name: string | null;
}

function playBeep(kind: 'success' | 'warning' | 'error') {
  try {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === 'success') {
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (kind === 'warning') {
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // ignora
  }
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignora
  }
}

function triggerFeedback(kind: CheckinResult['kind']) {
  if (kind === 'success') {
    playBeep('success');
    vibrate(150);
  } else if (kind === 'already') {
    playBeep('warning');
    vibrate([100, 50, 100]);
  } else {
    playBeep('error');
    vibrate([200, 100, 200]);
  }
}

export function CheckinScannerClient({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [mode, setMode] = useState<'scanner' | 'search'>('scanner');
  const router = useRouter();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef<{ token: string; at: number } | null>(null);
  const overlayVisibleRef = useRef(false);
  const containerId = 'qr-scanner-container';
  void eventSlug;

  useEffect(() => {
    overlayVisibleRef.current = overlayVisible;
  }, [overlayVisible]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const validateToken = useCallback(async (token: string) => {
    if (processing) return;
    if (overlayVisibleRef.current) return;
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.token === token && now - lastScanRef.current.at < 3000) {
      return;
    }
    lastScanRef.current = { token, at: now };

    setProcessing(true);
    setResult(null);
    try {
      const res = await fetch('/api/checkin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code_token: token, event_id: eventId }),
      });
      const data = await res.json();
      setResult(data);
      triggerFeedback(data.kind);
      setOverlayVisible(true);
    } catch (err: any) {
      const errResult: CheckinResult = { kind: 'error', message: err?.message || 'Erro de rede' };
      setResult(errResult);
      triggerFeedback('error');
      setOverlayVisible(true);
    } finally {
      setProcessing(false);
    }
  }, [processing, eventId]);

  const startScanner = useCallback(async () => {
    if (scannerActive) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          validateToken(decodedText);
        },
        () => { /* ignora erros de frame */ }
      );
      setScannerActive(true);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setResult({ kind: 'error', message: 'Nao foi possivel acessar a camera: ' + msg });
      setOverlayVisible(true);
    }
  }, [scannerActive, validateToken]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {/* ignora */}
      scannerRef.current = null;
    }
    setScannerActive(false);
  }, []);

  useEffect(() => {
    if (cameraOpen && !scannerActive) {
      const timeout = setTimeout(() => { startScanner(); }, 100);
      return () => clearTimeout(timeout);
    }
    if (!cameraOpen && scannerActive) {
      stopScanner();
    }
  }, [cameraOpen, scannerActive, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear?.();
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== 'scanner' && cameraOpen) {
      setCameraOpen(false);
    }
  }, [mode, cameraOpen]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch('/api/checkin/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, event_id: eventId }),
      });
      const data = await res.json();
      if (Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, eventId]);

  useEffect(() => {
    if (mode !== 'search') return;
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      handleSearch();
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, mode, handleSearch]);

  const handleValidateFromSearch = useCallback(async (token: string) => {
    await validateToken(token);
    handleSearch();
  }, [validateToken, handleSearch]);

  const dismissOverlay = useCallback(() => {
    setOverlayVisible(false);
    lastScanRef.current = null;
  }, []);

  const handleCloseCamera = useCallback(() => {
    setCameraOpen(false);
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-4 relative">
      {cameraOpen && (
        <CameraModal
          containerId={containerId}
          onClose={handleCloseCamera}
        />
      )}

      {overlayVisible && result && (
        <FullscreenOverlay result={result} onDismiss={dismissOverlay} />
      )}

      <div className="flex gap-2 border-b border-surface-600">
        <button
          onClick={() => setMode('scanner')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            mode === 'scanner'
              ? 'border-cream-200 text-cream-200'
              : 'border-transparent text-cream-400 hover:text-cream-300'
          }`}
        >
          Scanner QR
        </button>
        <button
          onClick={() => setMode('search')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            mode === 'search'
              ? 'border-cream-200 text-cream-200'
              : 'border-transparent text-cream-400 hover:text-cream-300'
          }`}
        >
          Buscar manualmente
        </button>
      </div>

      {mode === 'scanner' && !cameraOpen && (
        <div>
          <button
            onClick={() => setCameraOpen(true)}
            className="w-full bg-cream-200 text-surface-900 font-bold py-4 rounded-lg hover:bg-cream-300 transition text-lg"
          >
            Ativar camera
          </button>
          <p className="text-cream-400 text-xs text-center mt-2">
            A camera abrira em tela cheia
          </p>
        </div>
      )}

      {mode === 'search' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Digite nome ou CPF (busca automatica a partir de 3 letras)"
              className="flex-1 bg-surface-900 border border-surface-600 text-cream-200 placeholder-cream-500 rounded-lg px-3 py-2"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="bg-cream-200 text-surface-900 font-bold px-4 py-2 rounded-lg hover:bg-cream-300 transition disabled:opacity-50"
            >
              {searching ? '...' : 'Buscar'}
            </button>
          </div>

          {searchResults.length === 0 && searchQuery.trim().length >= 3 && !searching && (
            <p className="text-cream-400 text-sm">Nenhum ingresso encontrado.</p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((hit) => (
                <div
                  key={hit.order_item_id}
                  className="bg-surface-700 border border-surface-600 rounded-lg p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-cream-200 font-medium truncate">{hit.attendee_name || 'Sem nome'}</p>
                    <p className="text-cream-400 text-xs">
                      Pedido #{hit.order_number} | {hit.batch_name}
                    </p>
                    {hit.checked_in_at && (
                      <p className="text-yellow-300 text-xs mt-1">
                        Validado em {new Date(hit.checked_in_at).toLocaleString('pt-BR')}
                        {hit.checked_in_by_name && ` por ${hit.checked_in_by_name}`}
                      </p>
                    )}
                  </div>
                  {!hit.checked_in_at ? (
                    <button
                      onClick={() => handleValidateFromSearch(hit.qr_code_token)}
                      disabled={processing}
                      className="bg-cream-200 text-surface-900 font-bold text-sm px-3 py-1.5 rounded hover:bg-cream-300 transition disabled:opacity-50 whitespace-nowrap"
                    >
                      Validar
                    </button>
                  ) : (
                    <span className="text-yellow-300 text-xs whitespace-nowrap">Ja validado</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {processing && !overlayVisible && (
        <div className="bg-surface-700 border border-surface-600 rounded-lg p-4 text-cream-200 text-center">
          Validando...
        </div>
      )}
    </div>
  );
}

function CameraModal({ containerId, onClose }: { containerId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-surface-900 flex flex-col">
      {/* Header com botao fechar grande e vermelho */}
      <div className="flex items-center justify-between p-4 border-b border-surface-700 bg-surface-900">
        <p className="text-cream-200 font-bold text-lg">Scanner ativo</p>
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 text-white font-black text-base px-5 py-2.5 rounded-lg shadow-lg transition active:scale-95"
        >
          FECHAR CAMERA
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center bg-black p-2">
        <div
          id={containerId}
          className="w-full h-full max-w-md"
          style={{ minHeight: 300 }}
        />
      </div>

      {/* Rodape com dica + botao fechar tambem embaixo (acessivel sem precisar subir) */}
      <div className="bg-surface-900 border-t border-surface-700 px-4 py-3 space-y-2">
        <p className="text-cream-300 text-sm text-center">
          Aponte a camera para o QR code do ingresso
        </p>
        <button
          onClick={onClose}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-base py-3 rounded-lg shadow-lg transition active:scale-95"
        >
          FECHAR CAMERA
        </button>
      </div>
    </div>
  );
}

function FullscreenOverlay({ result, onDismiss }: { result: CheckinResult; onDismiss: () => void }) {
  let bg = '';
  let icon = '';
  let title = '';
  let subtitle = '';
  let extraInfo: React.ReactNode = null;

  switch (result.kind) {
    case 'success':
      bg = 'bg-green-600';
      icon = 'OK';
      title = 'LIBERADO';
      subtitle = result.attendeeName;
      extraInfo = (
        <p className="text-white text-lg mt-2 opacity-90">
          Pedido #{result.orderNumber} | {result.batchName}
        </p>
      );
      break;
    case 'already':
      bg = 'bg-yellow-500';
      icon = '!';
      title = 'JA VALIDADO';
      subtitle = result.attendeeName;
      extraInfo = (
        <>
          <p className="text-white text-lg mt-2 opacity-90">
            Pedido #{result.orderNumber} | {result.batchName}
          </p>
          <p className="text-white text-base mt-3 opacity-90">
            Validado em {new Date(result.checkedInAt).toLocaleString('pt-BR')}
            {result.checkedInBy && <><br />por {result.checkedInBy}</>}
          </p>
        </>
      );
      break;
    case 'not_found':
      bg = 'bg-red-600';
      icon = 'X';
      title = 'NAO ENCONTRADO';
      subtitle = 'Este QR nao corresponde a nenhum ingresso';
      break;
    case 'wrong_event':
      bg = 'bg-red-600';
      icon = 'X';
      title = 'OUTRO EVENTO';
      subtitle = `Este ingresso e do evento "${result.expectedEvent}"`;
      break;
    case 'invalid_status':
      bg = 'bg-red-600';
      icon = 'X';
      title = 'INVALIDO';
      subtitle = `Status: ${result.status}`;
      break;
    case 'error':
      bg = 'bg-red-600';
      icon = 'X';
      title = 'ERRO';
      subtitle = result.message;
      break;
  }

  return (
    <div className={`fixed inset-0 z-50 ${bg} flex flex-col items-center justify-center p-6`}>
      <div className="text-center mb-12">
        <p className="text-white text-8xl font-black mb-6">{icon}</p>
        <p className="text-white text-4xl font-black mb-4 tracking-wide">{title}</p>
        <p className="text-white text-2xl font-bold">{subtitle}</p>
        {extraInfo}
      </div>

      <button
        onClick={onDismiss}
        className="bg-white text-surface-900 font-black text-2xl px-12 py-5 rounded-2xl shadow-2xl active:scale-95 transition"
      >
        PROXIMO
      </button>
    </div>
  );
}
