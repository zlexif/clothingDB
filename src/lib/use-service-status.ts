'use client';

import { useEffect, useState } from 'react';

export type ServiceStatus = 'checking' | 'ok' | 'down';

export function useServiceStatus(intervalMs = 60_000): ServiceStatus {
  const [state, setState] = useState<ServiceStatus>('checking');
  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch('/health', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: { ok?: boolean }) => alive && setState(d.ok ? 'ok' : 'down'))
        .catch(() => alive && setState('down'));
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);
  return state;
}

export const STATUS_COPY: Record<ServiceStatus, { label: string; dot: string }> = {
  checking: { label: 'Checking status', dot: 'bg-fg-3' },
  ok: { label: 'All systems normal', dot: 'bg-verdant' },
  down: { label: 'Status unavailable', dot: 'bg-amber' },
};
