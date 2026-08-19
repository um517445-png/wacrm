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
  const [isAndroid, setIsAndroid] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }

      const userAgent = window.navigator.userAgent;
      const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent);
      const isAndroidDevice = /Android/i.test(userAgent);
      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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
      setShowModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }

    setShowModal(true);
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

      {/* Guidance Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center justify-end gap-2 text-lg font-bold text-foreground">
              <span>{isAndroid ? 'تنزيل تطبيق Vorder للأندرويد (APK)' : 'تثبيت تطبيق Vorder على شاشتك'}</span>
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
            ) : isAndroid ? (
              <div className="space-y-3 rounded-xl bg-indigo-500/10 p-4 border border-indigo-500/30">
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">⚡ دليل التثبيت الفوري المضمون للأندرويد:</p>
                <ol className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center justify-end gap-2">
                    <span>1. اضغط على زر "تثبيت التطبيق الفوري للأندرويد ⚡" أدناه.</span>
                    <Smartphone className="size-4 text-indigo-500 shrink-0" />
                  </li>
                  <li className="flex items-center justify-end gap-2">
                    <span>2. اختر "تثبيت" في نافذة الأندرويد المباشرة التي تظهر.</span>
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  </li>
                  <li className="flex items-center justify-end gap-2">
                    <span>3. سيتم إضافة تطبيق Vorder بـ لوجو المنصة على الشاشة الرئيسية فوراً.</span>
                    <PlusSquare className="size-4 text-primary shrink-0" />
                  </li>
                </ol>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={async () => {
                      if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') setIsInstalled(true);
                        setDeferredPrompt(null);
                        setShowModal(false);
                      } else {
                        alert('تطبيق Vorder جاهز للتثبيت! يرجى اختيار "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية" من قائمة المتصفح العلوي ⋮');
                      }
                    }}
                    className="w-full gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-md font-bold text-xs py-2.5"
                  >
                    <Smartphone className="size-4 animate-bounce" />
                    <span>تثبيت التطبيق الفوري للأندرويد ⚡</span>
                  </Button>

                  <a
                    href="/downloads/vorder-v1.0.apk"
                    download="vorder-v1.0.apk"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-muted/60 hover:bg-muted px-4 py-2 text-[11px] font-semibold text-muted-foreground border border-border transition-all mt-1"
                  >
                    <Download className="size-3.5" />
                    <span>تنزيل ملف APK الاحتياطي (vorder-v1.0.apk)</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl bg-muted/50 p-4 border border-border">
                <p className="text-sm font-semibold text-foreground">تثبيت التطبيق على الكمبيوتر (Windows / Linux):</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  من قائمة المتصفح العلوي <strong>⋮</strong> اضغط على <strong>"تثبيت Vorder"</strong> أو <strong>"إضافة إلى سطح المكتب"</strong> للوصول السريع بضغطة زر.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowModal(false)}>
              حسناً، فهمت
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
