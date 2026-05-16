'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker en cliente. Idempotente: si ya hay uno activo no
 * hace nada. Se monta una vez desde el layout de /obras.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // silenciar errores en navegadores que bloquean SW (file://, etc.)
    });
  }, []);
  return null;
}
