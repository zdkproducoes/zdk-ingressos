'use client';

import { useEffect, useRef } from 'react';

const trackedThisSession = new Set<string>();

export function useAffiliateTracking(eventId: string) {
  const ranOnceRef = useRef(false);

  useEffect(() => {
    if (!eventId || ranOnceRef.current) return;
    ranOnceRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return;

    const code = ref.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(code)) return;

    const key = `${eventId}::${code}`;
    if (trackedThisSession.has(key)) return;
    trackedThisSession.add(key);

    fetch('/api/affiliate/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, event_id: eventId }),
    }).catch((err) => {
      console.debug('[affiliate] track falhou (silencioso):', err);
    });
  }, [eventId]);
}