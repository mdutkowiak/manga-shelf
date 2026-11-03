'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SafeSessionProvider } from '@/components/safe-session-provider'
import { DesktopTopNav } from './desktop-top-nav'
import { TabletSidebar } from './tablet-sidebar'
import { BottomNav } from './bottom-nav'
import { MobileTopBar } from './mobile-top-bar'
import { ScrollToTop } from './scroll-to-top'
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget'
import { PWAInstall } from '@/components/pwa-install'
import { syncGlobalOverridesFromServer } from '@/lib/admin-store'
import { Toaster } from 'sonner'
import { SiteAnnouncement } from '@/components/site-announcement'
import { useFeature, useUiSettings } from '@/components/ui-settings-provider'

interface LayoutProps {
  children: React.ReactNode
}

function LayoutContent({ children }: LayoutProps) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const chatEnabled = useFeature('chat')
  const { theme } = useUiSettings()

  // Public standalone pages that don't need the dashboard shell
  const isPublicStandalonePage =
    pathname === '/about' ||
    pathname === '/login' ||
    pathname === '/register'

  // If visitor is on the root landing page and not logged in
  const isGuestLandingPage = pathname === '/' && status !== 'loading' && !session?.user

  if (isPublicStandalonePage || isGuestLandingPage) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-0 text-foreground">
        <div className="sticky top-0 z-50">
          <SiteAnnouncement />
        </div>
        <main id="main-content" className="flex-1">{children}</main>
        <ScrollToTop />
        <PWAInstall />
      </div>
    )
  }

  // Authenticated App Shell (matches desktop.png, tablet.png, mobile.png)
  return (
    <div className="min-h-screen flex flex-col bg-surface-0 text-foreground">
      {/* Ogłoszenie i nawigacja w jednym przyklejonym bloku, żeby ogłoszenie było widoczne także po przewinięciu strony */}
      <div className="sticky top-0 z-50">
        <SiteAnnouncement />

        {/* Desktop Top Navbar (lg and above) */}
        <div className="hidden lg:block">
          <DesktopTopNav />
        </div>

        {/* Kompaktowy pasek z logo i szybkim wyszukiwaniem (poniżej lg) */}
        <MobileTopBar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1">
        <TabletSidebar />
        <main
          id="main-content"
          className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8 2xl:px-12 w-full max-w-7xl 2xl:max-w-[1920px] 3xl:max-w-[2600px] 4xl:max-w-[3200px] mx-auto pb-36 md:pb-8"
        >
          {children}
        </main>
      </div>

      {/* Floating Scroll to Top button */}
      <ScrollToTop />

      {/* Floating Real-time Messenger Chat Widget */}
      {chatEnabled && <FloatingChatWidget />}

      {/* Mobile Floating Glass Dock (below md) */}
      <BottomNav />
      <PWAInstall />
      <Toaster position="bottom-center" theme={theme === 'day' ? 'light' : 'dark'} richColors />
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
