'use client'

import { useState, useRef } from 'react'
import { Upload, X, User, Link as LinkIcon, Check, Loader2, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AvatarUploadProps {
  value: string | null
  onChange: (url: string | null) => void
}

/**
 * Client-side helper to crop and compress an image file to a lightweight Data URL (max 256x256 WebP/JPEG)
 * This avoids any server-side file permission issues and survives Docker rebuilds indefinitely.
 */
function compressImageToDataUrl(file: File, maxSize = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const width = img.width
        const height = img.height

        // Square center crop
        const minDim = Math.min(width, height)
        const startX = (width - minDim) / 2
        const startY = (height - minDim) / 2

        canvas.width = Math.min(maxSize, minDim)
        canvas.height = Math.min(maxSize, minDim)

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Nie udało się utworzyć kontekstu canvas'))
          return
        }

        // Draw cropped and scaled image
        ctx.drawImage(
          img,
          startX,
          startY,
          minDim,
          minDim,
          0,
          0,
          canvas.width,
          canvas.height
        )

        // Try WebP first, fallback to JPEG
        try {
          const webpData = canvas.toDataURL('image/webp', quality)
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData)
            return
          }
        } catch {
          // fallback
        }
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Nie udało się odczytać pliku obrazu'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Błąd odczytu pliku'))
    reader.readAsDataURL(file)
  })
}

export function AvatarUpload({ value, onChange }: AvatarUploadProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [validatingUrl, setValidatingUrl] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setSuccess(null)
    } else {
      setSuccess(msg)
      setError(null)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      showNotification('Plik jest za duży (max 10MB)', true)
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      showNotification('Dozwolone formaty: JPEG, PNG, WebP, GIF', true)
      return
    }

    setUploading(true)
    setError(null)

    try {
      // First compress on client to lightweight Data URL (safest, zero server disk dependency)
      const compressedDataUrl = await compressImageToDataUrl(file, 256, 0.85)
      onChange(compressedDataUrl)
      showNotification('Awatar został wczytany i zoptymalizowany!')
    } catch (err) {
      console.error('Błąd kompresji awatara:', err)
      showNotification('Nie udało się przetworzyć wybranego pliku', true)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) {
      showNotification('Wprowadź poprawny adres URL obrazka', true)
      return
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image/')) {
      showNotification('Link musi zaczynać się od https:// lub http://', true)
      return
    }

    setValidatingUrl(true)
    setError(null)

    // Validate that the image can actually be loaded
    const testImg = new Image()
    testImg.onload = () => {
      setValidatingUrl(false)
      onChange(trimmed)
      setUrlInput('')
      showNotification('Awatar z linku został pomyślnie ustawiony!')
    }
    testImg.onerror = () => {
      setValidatingUrl(false)
      showNotification('Nie udało się załadować obrazka z podanego linku. Upewnij się, że link prowadzi bezpośrednio do pliku graficznego.', true)
    }
    testImg.src = trimmed
  }

  const handleRemove = () => {
    onChange(null)
    setError(null)
    setSuccess(null)
    setUrlInput('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Avatar preview & controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="relative h-24 w-24 flex-shrink-0">
          {value ? (
            <div className="group relative h-24 w-24 rounded-full overflow-hidden border-2 border-primary/40 shadow-lg shadow-primary/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Podgląd awatara"
                className="h-full w-full object-cover"
                onError={() => {
                  showNotification('Podany obrazek nie mógł zostać załadowany', true)
                }}
              />
              <button
                type="button"
                onClick={handleRemove}
                title="Usuń awatar"
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white"
              >
                <X className="h-6 w-6 text-rose-400 hover:scale-110 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 border-2 border-dashed border-white/20">
              <User className="h-10 w-10 text-muted-foreground/60" />
            </div>
          )}

          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-2 flex-1 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('upload'); setError(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'upload'
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'bg-white/5 text-muted-foreground hover:text-white'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Wgraj plik
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('url'); setError(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'url'
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-sm shadow-purple-600/30'
                  : 'bg-white/5 text-muted-foreground hover:text-white'
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Wklej link URL
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-xl border-white/20 text-xs font-bold"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-cyan-400" />
                      Przetwarzanie...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-3.5 w-3.5 text-cyan-400" />
                      {value ? 'Zmień plik zdjęcia' : 'Wybierz plik z dysku'}
                    </>
                  )}
                </Button>
                {value && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemove} className="text-xs text-rose-400 hover:text-rose-300">
                    Usuń awatar
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Zalecany format kwadratowy (JPEG, PNG, WebP). Obraz jest automatycznie optymalizowany w przeglądarce.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/moj-awatar.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleApplyUrl()
                    }
                  }}
                  className="h-8 text-xs rounded-xl bg-white/5 border-white/20 focus-visible:ring-cyan-500"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyUrl}
                  disabled={validatingUrl || !urlInput.trim()}
                  className="h-8 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shrink-0 shadow-sm shadow-cyan-600/30"
                >
                  {validatingUrl ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Użyj linku
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Wklej bezpośredni adres URL do obrazka (np. z Discorda, AniList lub hostingu zdjęć).
              </p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileUpload}
        className="hidden"
      />

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          {success}
        </div>
      )}
    </div>
  )
}

