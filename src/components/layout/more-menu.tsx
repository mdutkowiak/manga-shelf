'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, CalendarDays, ChevronDown, Info, MoreHorizontal, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useFeature } from '@/components/ui-settings-provider'

interface MoreMenuProps {
  /** `text` – przycisk „Więcej” z szewronem (pasek desktopowy), `stacked` – ikona nad napisem (pasek boczny), `icon` – sama ikona (telefon). */
  variant?: 'text' | 'stacked' | 'icon'
  side?: 'bottom' | 'right'
  align?: 'start' | 'end'
}

/** Menu „Więcej”: rzadziej używane strony, żeby główna lista linków nie rosła. */
export function MoreMenu({ variant = 'text', side = 'bottom', align = 'start' }: MoreMenuProps) {
  const pathname = usePathname()
  const calendarEnabled = useFeature('calendar')

  const items = [
    ...(calendarEnabled ? [{ href: '/calendar', label: 'Kalendarz premier', icon: CalendarDays }] : []),
    { href: '/stats', label: 'Statystyki', icon: BarChart3 },
    { href: '/checklist', label: 'Lista zakupów', icon: ShoppingCart },
    { href: '/about', label: 'O projekcie', icon: Info },
  ]
  const isActive = items.some((item) => pathname.startsWith(item.href))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={variant === 'text' ? undefined : 'Więcej'}
        className={cn(
          'flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          variant === 'text' && 'gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm',
          variant === 'stacked' && 'w-14 flex-col gap-1 rounded-xl p-2.5 text-[11px]',
          variant === 'icon' && 'h-11 w-11 rounded-full',
          isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        {variant === 'text' ? (
          <>
            <span>Więcej</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </>
        ) : (
          <>
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            {variant === 'stacked' && <span aria-hidden="true">Więcej</span>}
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} sideOffset={8} className="w-56 p-1.5">
        {items.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem
            key={href}
            render={<Link href={href} />}
            className="min-h-11 gap-2.5 px-3 text-sm font-medium"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
