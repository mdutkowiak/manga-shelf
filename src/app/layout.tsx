import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Layout } from '@/components/layout/layout'
import { UiSettingsProvider } from '@/components/ui-settings-provider'
import { getResolvedUi } from '@/lib/site-settings'

const jakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MangaHub.pl — Twój portal kolekcjonera mangi',
  description: 'Zarządzaj swoją kolekcją mangi, śledź polskie premiery, sprawdzaj ceny i rywalizuj ze znajomymi na MangaHub.pl!',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: { capable: true, title: 'MangaHub.pl', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F6F5F2',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const ui = await getResolvedUi()

  return (
    <html lang="pl" data-theme={ui.theme} data-density={ui.density} data-text={ui.textSize} className={`${ui.theme === 'day' ? '' : 'dark '}${jakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-surface-0 text-foreground font-sans">
        <a href="#main-content" className="skip-link">
          Przejdź do treści
        </a>
        <UiSettingsProvider value={ui}>
          <Layout>{children}</Layout>
        </UiSettingsProvider>
      </body>
    </html>
  )
}
