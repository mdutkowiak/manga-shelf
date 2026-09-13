'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SafeSessionProvider } from '@/components/safe-session-provider'
import { DesktopTopNav } from './desktop-top-nav'
import { TabletSidebar } from './tablet-sidebar'
import { BottomNav } from './bottom-nav'
import { ScrollToTop } from './scroll-to-top'
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget'
import { PWAInstall } from '@/components/pwa-install'
import { syncGlobalOverridesFromServer } from '@/lib/admin-store'

interface LayoutProps {
  children: React.ReactNode
}

function LayoutContent({ children }: LayoutProps) {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  // Public standalone pages that don't need the dashboard shell
  const isPublicStandalonePage =
    pathname === '/about' ||
    pathname === '/login' ||
    pathname === '/register'

  // If visitor is on the root landing page and not logged in
  const isGuestLandingPage = pathname === '/' && status !== 'loading' && !session?.user

  if (isPublicStandalonePage || isGuestLandingPage) {
    return (
      <div className="min-h-screen flex flex-col bg-[#07090E] text-foreground">
        <main className="flex-1">{children}</main>
        <ScrollToTop />
        <PWAInstall />
      </div>
    )
  }

  // Authenticated App Shell (matches desktop.png, tablet.png, mobile.png)
  return (
    <div className="min-h-screen flex flex-col bg-[#07090E] text-foreground">
      {/* Desktop Top Navbar (lg and above) - sticky */}
      <div className="hidden lg:block sticky top-0 z-50">
        <DesktopTopNav />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1">
        <TabletSidebar />
        <main
          id="main-content"
          className="flex-1 px-4 py-6 md:px-6 lg:px-8 2xl:px-12 w-full max-w-7xl 2xl:max-w-[1920px] 3xl:max-w-[2600px] 4xl:max-w-[3200px] mx-auto pb-24 md:pb-8"
        >
          {children}
        </main>
      </div>

      {/* Floating Scroll to Top button */}
      <ScrollToTop />

      {/* Floating Real-time Messenger Chat Widget */}
      <FloatingChatWidget />

      {/* Mobile Floating Glass Dock (below md) */}
      <BottomNav />
      <PWAInstall />
    </div>
  )
}

export function Layout({ children }: LayoutProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
    syncGlobalOverridesFromServer().catch(() => {})
  }, [])

  return (
    <SafeSessionProvider>
      <LayoutContent>{children}</LayoutContent>
    </SafeSessionProvider>
  )
}
