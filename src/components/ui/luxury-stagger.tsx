'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LuxuryStaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  staggerStepMs?: number;
}

export function LuxuryStagger({
  children,
  staggerStepMs = 45,
  className,
  ...props
}: LuxuryStaggerProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={cn('w-full', className)} {...props}>
      {childrenArray.map((child, index) => (
        <div
          key={index}
          className="animate-stagger-fade"
          style={{ animationDelay: `${index * staggerStepMs}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
