'use client'

import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0

      const mainEl = document.getElementById('main-content')
      const mainScroll = mainEl ? mainEl.scrollTop : 0

      setVisible(scrollY > 250 || mainScroll > 250)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    const mainEl = document.getElementById('main-content')
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true })
    }

    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const mainEl = document.getElementById('main-content')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 animate-in fade-in zoom-in-75 duration-200">
      <Button
        type="button"
        size="icon"
        onClick={scrollToTop}
        aria-label="Przewiń na górę strony"
        className="h-11 w-11 rounded-full bg-gradient-to-tr from-cyan-500 to-primary text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  )
}
