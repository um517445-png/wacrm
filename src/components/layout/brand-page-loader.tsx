'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const WAITING_PHRASES = [
  'جاري تحضير مساحة عمل Vorder الفاخرة... 🔮',
  'جاري مزامنة تحليلات المنصة المباشرة... ⚡',
  'جاري تأمين الاتصال والشبكات... 🌐',
  'أهلاً بك في منصة إدارة مبيعات واتساب الذكية 🚀',
];

export function BrandPageLoader({ message }: { message?: string }) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % WAITING_PHRASES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl transition-all duration-300">
      <div className="relative flex flex-col items-center justify-center gap-6 text-center">
        {/* Glow Ring Halo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-2xl bg-card border border-primary/20 shadow-2xl p-4 transition-transform hover:scale-105 duration-300">
            <Image
              src="/vorder-logo.png"
              alt="Vorder"
              width={90}
              height={90}
              priority
              className="object-contain animate-pulse"
            />
          </div>
        </div>

        {/* Rotating Spinner Line */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary/80 animate-pulse" />
          <div className="h-2 w-2 rounded-full bg-primary animate-ping delay-150" />
        </div>

        {/* Dynamic Waiting Phrase */}
        <div className="min-h-[28px] px-4">
          <p className="text-sm font-medium tracking-wide text-foreground animate-fade-in transition-all duration-300">
            {message || WAITING_PHRASES[phraseIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
