'use client'

import { useState, useEffect, useRef } from 'react'
import { Link2, X, Image as ImageIcon, Sparkles, Check, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getCoverUrl } from '@/lib/cover-utils'

interface CoverUploadProps {
  value: string | null
  fallbackUrl?: string | null
  onChange: (url: string | null) => void
  label?: string
}

export function CoverUpload({ value, fallbackUrl, onChange, label = 'Główna Okładka Serii' }: CoverUploadProps) {
  const [urlInput, setUrlInput] = useState(value || '')
  const [imgError, setImgError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setUrlInput(value || '')
    setImgError(false)
  }, [value])

  const handleApplyUrl = (val?: string) => {
    const toApply = val !== undefined ? val : urlInput
    const trimmed = toApply.trim()
    setImgError(false)
    if (trimmed) {
      onChange(trimmed)
    } else {
      onChange(null)
    }
  }

  const handleRemove = () => {
    setUrlInput('')
    setImgError(false)
    onChange(null)
  }

  // Active display cover: custom value takes priority, fallback to Tom 1 cover
  const isCustom = Boolean(value && value.trim())
  const displayCover = isCustom ? value! : (fallbackUrl || null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.url) {
        setUrlInput(data.url)
        onChange(data.url)
      }
    } catch {
      console.warn('Upload error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-muted-foreground">{label}</label>
        {isCustom ? (
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] gap-1 font-bold">
            <Sparkles className="h-3 w-3" />
            Własna okładka serii
          </Badge>
        ) : fallbackUrl ? (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-bold">
            <Check className="h-3 w-3" />
            Domyślna (z Tomu 1)
          </Badge>
        ) : null}
      </div>

      {/* URL Input Box */}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="url"
              placeholder="Wklej adres URL okładki (https://...)"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                setImgError(false)
              }}
              onBlur={() => handleApplyUrl()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleApplyUrl()
                }
              }}
              className="h-9 pl-9 text-xs bg-white/5 border-white/15 rounded-xl text-white placeholder:text-muted-foreground/60 focus-visible:ring-cyan-400"
            />
          </div>
          {urlInput.trim() !== (value || '') && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleApplyUrl()}
              className="h-9 px-3 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl shrink-0"
            >
              Zastosuj
            </Button>
          )}
          {isCustom && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="h-9 px-2.5 text-xs text-rose-300 border-rose-500/30 hover:bg-rose-500/10 rounded-xl shrink-0"
              title="Usuń własną okładkę i przywróć okładkę Tomu 1"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Przywróć Tom 1
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          {isCustom
            ? 'Ustawiono niestandardowy link. Możesz go w każdej chwili usunąć, aby przywrócić okładkę pierwszego tomu.'
            : fallbackUrl
            ? 'Pole puste — seria automatycznie wyświetla oficjalną okładkę Tomu 1.'
            : 'Wklej bezpośredni link do obrazka JPG/PNG/WebP, aby ustawić okładkę serii.'}
        </p>
      </div>

      {/* Image Preview & Details Card */}
      <div className="flex items-start gap-4 p-3 rounded-2xl bg-black/40 border border-white/10">
        <div className="relative aspect-[2/3] w-24 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-black/60 border border-white/10 shadow-lg">
          {displayCover && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getCoverUrl(displayCover)}
              alt="Podgląd okładki"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-muted-foreground">
              <ImageIcon className="h-6 w-6 mb-1 opacity-40" />
              <span className="text-[10px] leading-tight">
                {imgError ? 'Nieprawidłowy adres URL obrazka' : 'Brak okładki'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2 py-0.5 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Aktualny podgląd okładki:
            </span>
            <p className="text-white font-bold mt-0.5">
              {isCustom ? 'Własna okładka serii' : fallbackUrl ? 'Okładka Tomu 1' : 'Brak przypisanej okładki'}
            </p>
          </div>

          {displayCover && (
            <div className="text-[11px] text-muted-foreground break-all line-clamp-2 bg-white/5 p-2 rounded-lg border border-white/5 font-mono">
              {displayCover}
            </div>
          )}

          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-[11px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Upload className="h-3 w-3" />
              <span>{uploading ? 'Wysyłanie...' : 'Opcjonalnie: wgraj plik z dysku'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
