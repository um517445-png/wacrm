'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BrandPageLoader } from './brand-page-loader';

export function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    setTransitioning(true);
    const timer = setTimeout(() => {
      setTransitioning(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {transitioning && <BrandPageLoader message="جاري فتح صفحة Vorder... 🚀" />}
      <div key={pathname} className="w-full animate-stagger-fade">
        {children}
      </div>
    </>
  );
}
