import { cn } from '@/lib/utils'

/** Znak MangaHub.pl: grzbiety tomów na półce, jeden z nich pochylony i w kolorze akcentu. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="MangaHub.pl" className={cn('h-9 w-9 shrink-0', className)}>
      <rect width="64" height="64" rx="16" fill="#6D28D9" />
      <rect x="13" y="17" width="9" height="30" rx="2.5" fill="#fff" />
      <rect x="25" y="12" width="9" height="35" rx="2.5" fill="#fff" fillOpacity="0.88" />
      <rect x="37" y="21" width="9" height="26" rx="2.5" fill="#fff" fillOpacity="0.88" />
      <rect x="0" y="0" width="9" height="30" rx="2.5" fill="#FB7185" transform="translate(50.5 18.5) rotate(14)" />
      <rect x="10" y="49" width="44" height="3.5" rx="1.75" fill="#fff" fillOpacity="0.55" />
    </svg>
  )
}

interface LogoProps {
  className?: string
  markClassName?: string
  /** Sam znak, bez napisu (np. wąski pasek boczny). */
  markOnly?: boolean
  /** Rozmiar napisu, np. „text-lg”. */
  textClassName?: string
}

export function Logo({ className, markClassName, markOnly = false, textClassName = 'text-lg' }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      {!markOnly && (
        <span className={cn('font-extrabold leading-none tracking-tight text-foreground', textClassName)}>
          Manga<span className="text-primary">Hub</span>
          <span className="font-semibold text-muted-foreground">.pl</span>
        </span>
      )}
    </span>
  )
}
