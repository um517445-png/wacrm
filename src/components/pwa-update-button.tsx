'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useTranslations } from 'next-intl';

export function PwaUpdateButton() {
  const t = useTranslations('PWA');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Service Worker update listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      }).catch(() => {});
    }

    // Periodic deployment version check
    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const storedVersion = localStorage.getItem('vorder_build_version');
          
          if (storedVersion && data.version && storedVersion !== data.version) {
            setUpdateAvailable(true);
          } else if (data.version && !storedVersion) {
            localStorage.setItem('vorder_build_version', data.version);
          }
        }
      } catch {
        // ignore network error
      }
    };

    const interval = setInterval(checkVersion, 30000);
    void checkVersion();

    return () => clearInterval(interval);
  }, []);

  const handleApplyUpdate = async () => {
    setUpdating(true);
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.update();
        }
      } catch {
        // ignore
      }
    }
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  if (!updateAvailable) return null;

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleApplyUpdate}
      disabled={updating}
      className="animate-pulse bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-600 hover:from-amber-600 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg border border-amber-300/40 flex items-center gap-1.5 px-3 py-1 cursor-pointer transition-all"
      title={t('updateTooltip')}
    >
      {updating ? (
        <RefreshCw className="size-3.5 animate-spin shrink-0" />
      ) : (
        <Sparkles className="size-3.5 text-amber-100 shrink-0" />
      )}
      <span className="hidden sm:inline">{updating ? t('updating') : t('updateBtn')}</span>
      <span className="inline sm:hidden">🚀</span>
    </Button>
  );
}
