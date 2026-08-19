"use client"

import Link from 'next/link'
import { UserPlus, Briefcase, Radio, Zap } from 'lucide-react'
import type { ComponentType } from 'react'

import { useTranslations } from 'next-intl'

// Quick-action shortcuts. Each navigates to the page that owns the
// relevant "create" flow. We deliberately don't try to auto-open any
// modal on the target page — that'd require touching those pages,
// which is out of scope here.
interface Action {
  labelKey: string
  href: string
  icon: ComponentType<{ className?: string }>
  tint: string
}

const ACTIONS: Action[] = [
  { labelKey: 'newContact', href: '/contacts', icon: UserPlus, tint: 'text-primary' },
  { labelKey: 'newDeal', href: '/pipelines', icon: Briefcase, tint: 'text-blue-400' },
  { labelKey: 'newBroadcast', href: '/broadcasts/new', icon: Radio, tint: 'text-amber-400' },
  { labelKey: 'newAutomation', href: '/automations/new', icon: Zap, tint: 'text-primary' },
]

export function QuickActions() {
  const t = useTranslations('Dashboard.quickActions')
  
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {ACTIONS.map((a) => {
        const Icon = a.icon
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3.5 rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/5 px-4 py-3.5 shadow-md hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 backdrop-blur-xl"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 ${a.tint} shadow-md shadow-primary/10 group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300 shrink-0`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t(a.labelKey as string)}</span>
          </Link>
        )
      })}
    </div>
  )
}
