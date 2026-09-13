'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { detectPublisherStore } from '@/lib/scrapers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  UploadCloud,
  Image as ImageIcon,
  ZoomIn,
  Check,
  Loader2,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react'
import { getCoverUrl } from '@/lib/cover-utils'

interface CoverEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCoverUrl: string
  title: string
  volumeNumber?: number
  publisher?: string
  onCoverUpdated: (newCoverUrl: string) => void
}

export function CoverEditModal({
  open,
  onOpenChange,
  currentCoverUrl,
  title,
  volumeNumber = 1,
  publisher = 'Waneko',
  onCoverUpdated,
}: CoverEditModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>(currentCoverUrl)
  const [zoom, setZoom] = useState(1)
  const [posY, setPosY] = useState(50) // Vertical center percentage (0 - 100)
  const [posX, setPosX] = useState(50) // Horizontal center percentage
  const [isSaving, setIsSaving] = useState(false)
  const [customUrlInput, setCustomUrlInput] = useState('')
  const [alternativeCovers, setAlternativeCovers] = useState<string[]>([])
  const [loadingAlternatives, setLoadingAlternatives] = useState(false)

  // Publisher store integration state (Yatta.pl, Sklep Waneko, etc.)
  const [storeUrlInput, setStoreUrlInput] = useState('')
  const [isFetchingStore, setIsFetchingStore] = useState(false)
  const [storeFeedback, setStoreFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const detectedStore = useMemo(() => {
    return detectPublisherStore(storeUrlInput)
  }, [storeUrlInput])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleApplyPastedUrl = (urlToUse: string) => {
    const cleanUrl = urlToUse.trim()
    if (!cleanUrl || !cleanUrl.startsWith('http')) return
    if (!alternativeCovers.includes(cleanUrl)) {
      setAlternativeCovers((prev) => [cleanUrl, ...prev])
    }
    setPreviewUrl(cleanUrl)
    setSelectedFile(null)
    setZoom(1)
    setPosX(50)
    setPosY(50)
  }

  // Fetch cover(s) directly from publisher store (Yatta.pl, Sklep Waneko, etc.)
  const handleFetchFromStore = async () => {
    const url = storeUrlInput.trim()
    if (!url) return
    setIsFetchingStore(true)
    setStoreFeedback(null)

    try {
      const res = await fetch('/api/admin/covers/grab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()

      if (!res.ok || !data.success || !data.volumes || data.volumes.length === 0) {
        throw new Error(data.error || 'Nie znaleziono okładek pod tym adresem')
      }

      // Find matching volume number or default to first volume
      const matchingVol =
        data.volumes.find((v: { volumeNumber: number }) => v.volumeNumber === volumeNumber) ||
        data.volumes[0]

      if (matchingVol?.coverUrl) {
        setPreviewUrl(matchingVol.coverUrl)
        setSelectedFile(null)
        setZoom(1)
        setPosX(50)
        setPosY(50)

        // Add all scraped store covers to alternative covers
        const storeCovers = data.volumes.map((v: { coverUrl: string }) => v.coverUrl).filter(Boolean)
        setAlternativeCovers((prev) => Array.from(new Set([...storeCovers, ...prev])))

        setStoreFeedback({
          type: 'success',
          message: `Zaciągnięto ${data.volumesCount} okładek ze sklepu ${data.storeName || 'wydawcy'} dla "${data.seriesTitle}"!`,
        })
      }
    } catch (err) {
      console.error('Błąd pobierania ze sklepu:', err)
      setStoreFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Błąd podczas pobierania okładki ze sklepu wydawcy',
      })
    } finally {
      setIsFetchingStore(false)
    }
  }

  // Load alternative covers from API matching specific volume number when opening
  // (Preserves currentCoverUrl without blindly overwriting with MangaDex!)
  useEffect(() => {
    if (open && title) {
      const timer = setTimeout(() => {
        setLoadingAlternatives(true)
      }, 0)
      fetch(`/api/covers?title=${encodeURIComponent(title)}&volume=${volumeNumber || 1}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          if (data.covers && data.covers.length > 0) {
            setAlternativeCovers(data.covers)
            // Kept previewUrl unchanged so existing cover is NEVER overwritten!
          }
        })
        .catch((err) => console.error('Error loading volume covers:', err))
        .finally(() => setLoadingAlternatives(false))
      return () => clearTimeout(timer)
    }
  }, [open, title, volumeNumber])

  // Reset preview when modal opens or currentCoverUrl changes
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setPreviewUrl(currentCoverUrl)
        setSelectedFile(null)
        setZoom(1)
        setPosX(50)
        setPosY(50)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [open, currentCoverUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      setZoom(1)
      setPosX(50)
      setPosY(50)
    }
  }

  const handleSelectAlternative = (cov: string) => {
    setPreviewUrl(cov)
    setSelectedFile(null)
    setZoom(1)
    setPosX(50)
    setPosY(50)
  }

  const handleSaveCroppedCover = async () => {
    setIsSaving(true)

    try {
      let finalCoverUrl = previewUrl

      // Try canvas crop if file was uploaded or zoom changed
      if (selectedFile || zoom !== 1 || posX !== 50 || posY !== 50) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = previewUrl

          await new Promise((resolve) => {
            img.onload = resolve
            img.onerror = () => resolve(null) // Do not throw if CORS blocks canvas
          })

          if (img.complete && img.naturalWidth > 0) {
            const canvas = document.createElement('canvas')
            canvas.width = 600
            canvas.height = 900
            const ctx = canvas.getContext('2d')

            if (ctx) {
              ctx.fillStyle = '#07090E'
              ctx.fillRect(0, 0, 600, 900)

              const imgAspect = img.width / img.height
              const targetAspect = 600 / 900

              let drawWidth = 600 * zoom
              let drawHeight = 900 * zoom

              if (imgAspect > targetAspect) {
                drawHeight = 900 * zoom
                drawWidth = drawHeight * imgAspect
              } else {
                drawWidth = 600 * zoom
                drawHeight = drawWidth / imgAspect
              }

              const offsetX = (600 - drawWidth) * (posX / 100)
              const offsetY = (900 - drawHeight) * (posY / 100)

              ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
              finalCoverUrl = canvas.toDataURL('image/jpeg', 0.9)
            }
          }
        } catch (cropErr) {
          console.warn('Canvas crop fallback to original previewUrl:', cropErr)
        }
      }

      // Notify parent component of updated cover URL
      onCoverUpdated(finalCoverUrl)

      // Optionally save to backend in background
      try {
        await fetch('/api/covers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            remoteUrl: finalCoverUrl.startsWith('http') ? finalCoverUrl : undefined,
            base64Data: finalCoverUrl.startsWith('data:') ? finalCoverUrl : undefined,
            publisher,
            title,
            volumeNumber,
          }),
        })
      } catch (backendErr) {
        console.warn('Backend cover save info:', backendErr)
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Error saving cover:', error)
      onCoverUpdated(previewUrl)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl bg-[#090D18]/95 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-[#0B1020] to-cyan-950/30">
          <DialogHeader>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-0.5 text-[11px] font-bold text-purple-300 mb-1">
              <Sparkles className="h-3 w-3" />
              <span>Panel Administratora • Edytor Okładki</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white">
              Zmień Okładkę: {title} {volumeNumber > 0 ? `(Tom ${volumeNumber})` : ''}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Wgraj nowy plik, wykadruj kadr w formacie 2:3 lub wybierz z bazy alternatywnych okładek
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
          {/* Top area: Preview & Crop Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* 2:3 Aspect Ratio Preview Container */}
            <div className="sm:col-span-5 flex flex-col items-center">
              <div className="relative aspect-[2/3] w-44 overflow-hidden rounded-2xl border-2 border-primary/50 bg-black shadow-2xl ring-4 ring-primary/20">
                {/* Cropped & Zoomed Image */}
                <div
                  className="h-full w-full bg-no-repeat transition-all duration-75"
                  style={{
                    backgroundImage: `url('${previewUrl}')`,
                    backgroundSize: `${100 * zoom}%`,
                    backgroundPosition: `${posX}% ${posY}%`,
                  }}
                />

                <div className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 backdrop-blur-md">
                  Kadr 2:3
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground mt-2">Podgląd po wykadrowaniu</span>
            </div>

            {/* Controls: Upload & Sliders */}
            <div className="sm:col-span-7 space-y-4">
              {/* Option 1: Publisher store official cover fetcher (Yatta, Waneko, etc.) */}
              <div className="space-y-2 p-3 rounded-2xl bg-cyan-950/25 border border-cyan-500/30 shadow-inner">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <Label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    Pobierz ze sklepu wydawcy (Yatta.pl, Sklep Waneko...)
                  </Label>
                  <span className="text-[10px] text-cyan-400 font-bold">Oficjalne wydanie PL (HD)</span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="url"
                      placeholder="Wklej link do serii, tomu lub okładki (Yatta.pl, sklepwaneko.pl...)"
                      value={storeUrlInput}
                      onChange={(e) => setStoreUrlInput(e.target.value)}
                      className="h-9 bg-white/5 border-cyan-500/30 text-xs text-white placeholder:text-muted-foreground/60 rounded-xl flex-1 focus-visible:ring-cyan-400 pr-22"
                    />
                    {detectedStore && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-cyan-950/90 border border-cyan-500/40 px-1.5 py-0.5 text-[9px] font-extrabold text-cyan-300">
                        {detectedStore.name}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleFetchFromStore}
                    disabled={isFetchingStore || !storeUrlInput.trim()}
                    className="h-9 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl px-3 shrink-0 gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {isFetchingStore ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Pobierz Okładkę
                  </Button>
                </div>

                {storeFeedback && (
                  <p
                    className={`text-[11px] font-semibold ${
                      storeFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {storeFeedback.message}
                  </p>
                )}
              </div>

              {/* Option 2: Direct URL Input or Local File Upload */}
              <div className="space-y-2.5">
                <Label className="text-xs font-bold text-muted-foreground block">
                  Lub wklej bezpośredni link URL do obrazka
                </Label>

                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="Wklej link do obrazka (https://...)"
                    value={customUrlInput}
                    onChange={(e) => {
                      const val = e.target.value
                      setCustomUrlInput(val)
                      if (val.trim().startsWith('http')) {
                        handleApplyPastedUrl(val)
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text')
                      if (pasted && pasted.trim().startsWith('http')) {
                        handleApplyPastedUrl(pasted)
                      }
                    }}
                    className="h-10 bg-white/5 border-cyan-500/40 text-xs text-white placeholder:text-muted-foreground/60 rounded-xl flex-1 focus-visible:ring-cyan-400"
                  />
                  <Button
                    type="button"
                    onClick={() => handleApplyPastedUrl(customUrlInput)}
                    className="h-10 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl px-3.5 shrink-0 gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Użyj Linku
                  </Button>
                </div>

                <div className="flex items-center gap-2 my-1">
                  <div className="h-px bg-white/10 flex-1" />
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">lub wgraj plik z dysku</span>
                  <div className="h-px bg-white/10 flex-1" />
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white/5 border-white/15 text-xs text-white hover:bg-white/10 h-9 rounded-xl gap-2 font-bold"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />
                  Wybierz plik z dysku komputera
                </Button>
              </div>

              {/* Crop & Zoom Sliders */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-cyan-300">
                    <ZoomIn className="h-3.5 w-3.5" />
                    Przybliżenie (Zoom): {zoom.toFixed(1)}x
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1)
                      setPosX(50)
                      setPosY(50)
                    }}
                    className="text-[10px] text-muted-foreground hover:text-white underline"
                  >
                    Resetuj
                  </button>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label className="text-[10px] text-muted-foreground block mb-1">Pozycja Pionowa (Y)</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={posY}
                      onChange={(e) => setPosY(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground block mb-1">Pozycja Pozioma (X)</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={posX}
                      onChange={(e) => setPosX(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Volume Covers Gallery */}
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                2. Proponowane okładki z bazy dla Tomu {volumeNumber > 0 ? volumeNumber : 1} ({alternativeCovers.length})
              </Label>
              {loadingAlternatives && (
                <div className="flex items-center gap-1 text-[10px] text-cyan-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Pobieranie okładek tomu {volumeNumber}...
                </div>
              )}
            </div>

            {alternativeCovers.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {alternativeCovers.map((cov, idx) => {
                  const isSelected = previewUrl === cov
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectAlternative(cov)}
                      className={`relative aspect-[2/3] h-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-400 scale-105 shadow-lg shadow-cyan-400/30'
                          : 'border-white/15 opacity-75 hover:opacity-100 hover:border-white/40'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getCoverUrl(cov)}
                        alt={`Okładka Tom ${volumeNumber}`}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-1 left-1 rounded bg-black/80 backdrop-blur-xs px-1 py-0.2 text-[8px] font-extrabold text-cyan-300">
                        T.{volumeNumber}
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-muted-foreground">
                Brak dodatkowych okładek w bazie dla tego tytułu. Wgraj własny plik powyżej.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#070A12] flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-white"
          >
            Anuluj
          </Button>

          <Button
            onClick={handleSaveCroppedCover}
            disabled={isSaving}
            className="text-xs font-bold bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 text-white px-6 rounded-xl shadow-lg shadow-primary/30"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Zapisywanie okładki...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Zatwierdź i Zapisz Okładkę
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
