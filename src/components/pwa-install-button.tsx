'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Download, Share, PlusSquare, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useTranslations } from 'next-intl';

export function PWAInstallButton() {
  const t = useTranslations('PWA');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }

      // Check if iOS
      const userAgent = window.navigator.userAgent;
      const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent);
      setIsIOS(isIOSDevice);

      // Listen for browser install prompt (Android & Desktop)
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Listen for app installed event
      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If no prompt event, show helpful modal (e.g. desktop instructions)
      setShowIOSModal(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 sm:px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400" title={t('installedTooltip')}>
        <CheckCircle2 className="size-3.5 shrink-0" />
        <span className="hidden sm:inline">{t('installed')}</span>
      </div>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={handleInstallClick}
        className="relative gap-1.5 border-0 bg-gradient-to-r from-primary via-indigo-600 to-violet-600 text-white shadow-md shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 text-xs font-semibold transition-all duration-300 rounded-xl px-2.5 sm:px-3.5 py-1"
        title={t('installTooltip')}
      >
        <Smartphone className="size-3.5 shrink-0 text-white animate-pulse" />
        <span className="hidden sm:inline">{t('installBtn')}</span>
        <span className="inline sm:hidden">{t('installBtnShort')}</span>
      </Button>

      {/* iOS & Browser Guidance Modal */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2 text-lg font-bold text-foreground">
              <span>تثبيت Vorder على شاشتك</span>
              <Smartphone className="size-5 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              احصل على تجربة تطبيق سريعة ومستقلة مع لوجو Vorder المفرغ على شاشة هاتفك أو كمبيوترك.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-right">
            {isIOS ? (
              <div className="space-y-3 rounded-xl bg-muted/50 p-4 border border-border">
                <p className="text-sm font-semibold text-foreground">خطوات التثبيت على الآيفون (iOS Safari):</p>
                <ol className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center justify-end gap-2">
                    <span>1. اضغط على زر المشاركة</span>
                    <Share className="size-4 text-primary shrink-0" />
                  </li>
                  <li className="flex items-center justify-end gap-2">
                    <span>2. اختر الإضافة إلى الشاشة الرئيسية</span>
                    <PlusSquare className="size-4 text-primary shrink-0" />
                  </li>
                  <li className="flex items-center justify-end gap-2">
                    <span>3. اضغط على زر "إضافة" في الأعلى</span>
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl bg-muted/50 p-4 border border-border">
                <p className="text-sm font-semibold text-foreground">تثبيت التطبيق على الكمبيوتر أو الأندرويد:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  من قائمة المتصفح العلوي <strong>⋮</strong> اضغط على <strong>"تثبيت Vorder"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong> للوصول السريع بضغطة زر.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowIOSModal(false)}>
              حسناً، فهمت
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
