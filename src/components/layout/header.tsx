'use client'

import Link from 'next/link'
import { BookOpen, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'
import { MobileNav } from './mobile-nav'

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <MobileNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link href="/" className="flex items-center gap-2 font-bold">
        <BookOpen className="h-5 w-5 text-primary" />
        <span>MangOwO</span>
      </Link>
    </header>
  )
}
