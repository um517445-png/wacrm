'use client';

import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageToggle() {
  const [currentLocale, setCurrentLocale] = useState('en');

  useEffect(() => {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='));
    const locale = match ? match.split('=')[1] : 'en';
    setCurrentLocale(locale);
  }, []);

  const toggleLanguage = () => {
    const next = currentLocale === 'ar' ? 'en' : 'ar';
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
    window.location.reload();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-foreground bg-muted/30 border-border hover:bg-muted/80 transition-all rounded-xl cursor-pointer"
      title={currentLocale === 'ar' ? 'المنصة حالياً باللغة العربية - اضغط للتحويل إلى English' : 'Platform is currently in English - Click to switch to العربية'}
    >
      <Globe className="size-3.5 text-primary shrink-0" />
      <span className="inline sm:hidden">{currentLocale === 'ar' ? 'EN' : 'AR'}</span>
      <span className="hidden sm:inline">{currentLocale === 'ar' ? 'العربية (AR) ⇄ Switch to EN' : 'English (EN) ⇄ Switch to AR'}</span>
    </Button>
  );
}
