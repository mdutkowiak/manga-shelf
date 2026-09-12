import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Layout } from '@/components/layout/layout'

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
  title: 'MangOwO — Twój Portal Kolekcjonera Mangi',
  description: 'Zarządzaj swoją kolekcją mangi, śledź polskie premiery, sprawdzaj ceny i rywalizuj ze znajomymi na MangOwO!',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#07090E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`dark ${jakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#070A14] text-foreground font-sans selection:bg-primary/30 selection:text-white">
        <Layout>{children}</Layout>
      </body>
    </html>
  )
}
