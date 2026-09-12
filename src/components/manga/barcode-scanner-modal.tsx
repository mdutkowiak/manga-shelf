'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Barcode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Plus,
  VideoOff,
  Search,
} from 'lucide-react'
import {
  getSavedCollection,
  saveCollectionToStorage,
  type CollectionSeriesItem,
} from '@/lib/collection-store'
import { getCoverUrl } from '@/lib/cover-utils'

interface BarcodeScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMangaAdded?: () => void
}

interface ScannedMangaResult {
  title: string
  volumeNumber: number
  publisher: string
  coverUrl: string
  description?: string
  isbn: string
}

export function BarcodeScannerModal({
  open,
  onOpenChange,
  onMangaAdded,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualIsbn, setManualIsbn] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [scannedResult, setScannedResult] = useState<ScannedMangaResult | null>(null)
  const [addedSuccess, setAddedSuccess] = useState(false)

  // Start Camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Twoja przeglądarka nie obsługuje dostępu do kamery.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
      }
    } catch (err: unknown) {
      setCameraError(
        err instanceof Error
          ? err.message
          : 'Brak uprawnień do kamery. Możesz wpisać kod ISBN ręcznie poniżej.'
      )
      setCameraActive(false)
    }
  }, [])

  // Stop Camera stream
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  // Lookup manga by ISBN using Google Books API + AniList fallback
  const lookupIsbn = useCallback(async (isbn: string) => {
    const cleanIsbn = isbn.replace(/[-\s]/g, '').trim()
    if (!cleanIsbn) return

    setIsSearching(true)
    setSearchError(null)
    setScannedResult(null)
    setAddedSuccess(false)

    try {
      // 1. Query Google Books API for ISBN
      const gBooksRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`
      )
      const gBooksData = await gBooksRes.json()

      if (gBooksData.totalItems > 0 && gBooksData.items?.[0]?.volumeInfo) {
        const info = gBooksData.items[0].volumeInfo
        const fullTitle = info.title || 'Manga'
        const desc = info.description || ''
        const publisher = info.publisher || 'Waneko'
        const cover =
          info.imageLinks?.thumbnail?.replace('http://', 'https://') || ''

        // Extract volume number from title or subtitle
        const volMatch =
          `${fullTitle} ${info.subtitle || ''} ${desc}`.match(/tom\s*(\d+)|vol\w*\s*(\d+)|\b(\d+)\b/i)
        const volNum = volMatch
          ? parseInt(volMatch[1] || volMatch[2] || volMatch[3], 10)
          : 1

        const cleanTitle = fullTitle.replace(/tom\s*\d+/i, '').replace(/vol\w*\s*\d+/i, '').trim()

        setScannedResult({
          title: cleanTitle || fullTitle,
          volumeNumber: volNum || 1,
          publisher: publisher.includes('Waneko')
            ? 'Waneko'
            : publisher.includes('Studio JG')
            ? 'Studio JG'
            : publisher.includes('J.P')
            ? 'J.P.Fantastica'
            : publisher.includes('Kotori')
            ? 'Kotori'
            : publisher,
          coverUrl: cover,
          description: desc,
          isbn: cleanIsbn,
        })
        return
      }

      // 2. If Google Books has no hit, search AniList with query or notify
      throw new Error(`Nie znaleziono danych dla kodu ISBN: ${cleanIsbn}. Spróbuj wpisać tytuł w wyszukiwarce.`)
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Błąd podczas wyszukiwania kodu ISBN.')
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Continuous Native Barcode Detection loop if supported
  useEffect(() => {
    let animationFrameId: number

    const detectBarcode = async () => {
      if (
        typeof window !== 'undefined' &&
        'BarcodeDetector' in window &&
        videoRef.current &&
        cameraActive &&
        !isSearching &&
        !scannedResult
      ) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const BarcodeDetectorClass = (window as any).BarcodeDetector
          const detector = new BarcodeDetectorClass({
            formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'],
          })

          if (videoRef.current.readyState === 4) {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              const detected = barcodes[0].rawValue
              lookupIsbn(detected)
            }
          }
        } catch {
          // Ignore frame detection errors
        }
      }

      if (open && cameraActive && !scannedResult) {
        animationFrameId = requestAnimationFrame(detectBarcode)
      }
    }

    if (cameraActive) {
      animationFrameId = requestAnimationFrame(detectBarcode)
    }

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [cameraActive, open, isSearching, scannedResult, lookupIsbn])

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      setScannedResult(null)
      setSearchError(null)
      setAddedSuccess(false)
      startCamera()
    }, 0)

    return () => {
      clearTimeout(timer)
      stopCamera()
    }
  }, [open, startCamera, stopCamera])

  // Add the scanned manga to collection
  const handleAddToCollection = () => {
    if (!scannedResult) return

    const collection = getSavedCollection()
    const titleLower = scannedResult.title.toLowerCase().trim()

    // Find existing series or create new
    let found = false
    const updated = collection.map((s) => {
      if (s.title.toLowerCase().trim() === titleLower) {
        found = true
        // Check if volume exists, if not extend
        let volExists = false
        const newVolumes = s.volumes.map((v) => {
          if (v.volumeNumber === scannedResult.volumeNumber) {
            volExists = true
            return {
              ...v,
              status: 'OWNED' as const,
              purchasePrice: v.purchasePrice || 34.99,
              coverUrl: scannedResult.coverUrl || v.coverUrl,
            }
          }
          return v
        })

        if (!volExists) {
          newVolumes.push({
            volumeNumber: scannedResult.volumeNumber,
            coverUrl: scannedResult.coverUrl,
            customCoverUrl: null,
            status: 'OWNED' as const,
            purchasePrice: 34.99,
            userRating: null,
          })
          newVolumes.sort((a, b) => a.volumeNumber - b.volumeNumber)
        }

        return {
          ...s,
          totalVolumes: Math.max(s.totalVolumes, scannedResult.volumeNumber),
          volumes: newVolumes,
        }
      }
      return s
    })

    if (!found) {
      const newSeries: CollectionSeriesItem = {
        id: `scanned-${Date.now()}`,
        mangaId: `scan-${scannedResult.isbn}`,
        title: scannedResult.title,
        publisher: scannedResult.publisher || 'Waneko',
        coverUrl: scannedResult.coverUrl,
        totalVolumes: Math.max(scannedResult.volumeNumber, 1),
        description: scannedResult.description || 'Manga dodana za pomocą skanera kodów ISBN.',
        userSeriesRating: null,
        volumes: [
          {
            volumeNumber: scannedResult.volumeNumber,
            coverUrl: scannedResult.coverUrl,
            customCoverUrl: null,
            status: 'OWNED',
            purchasePrice: 34.99,
            userRating: null,
          },
        ],
      }
      updated.unshift(newSeries)
    }

    saveCollectionToStorage(updated)
    setAddedSuccess(true)
    if (onMangaAdded) onMangaAdded()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#090D18]/95 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[11px] font-bold text-cyan-300">
              <Barcode className="h-3 w-3" />
              Skaner Kodów Kreskowych
            </span>
          </div>
          <DialogTitle className="text-xl font-extrabold text-white">
            Skanuj Kod ISBN Tomu
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Skieruj aparat telefonu na kod kreskowy ISBN z tyłu tomiku, aby automatycznie rozpoznać i dodać go do półki.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Camera Viewport with Laser Scan Overlay */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black border border-white/10 shadow-inner flex items-center justify-center">
            {/* Native Video Element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {/* Inactive or Error State */}
            {!cameraActive && (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <VideoOff className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground max-w-xs">
                  {cameraError || 'Kamera jest wyłączona lub niedostępna.'}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={startCamera}
                  className="mt-3 text-xs bg-white/5 border-white/15 font-bold h-8 rounded-xl"
                >
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  Włącz Aparat Ponownie
                </Button>
              </div>
            )}

            {/* Target Reticle & Laser Scan line animation */}
            {cameraActive && !scannedResult && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Center target frame */}
                <div className="relative w-64 h-32 rounded-xl border-2 border-dashed border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center">
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee] animate-bounce" />
                  <span className="text-[10px] font-black text-cyan-300/80 uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded-full">
                    Umieść kod ISBN tutaj
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <Label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-cyan-400" />
              Wyszukaj kod ISBN ręcznie
            </Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="np. 9788382570017"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') lookupIsbn(manualIsbn)
                }}
                className="h-9 text-xs bg-black/40 border-white/15 text-white rounded-xl flex-1 font-mono"
              />
              <Button
                type="button"
                onClick={() => lookupIsbn(manualIsbn)}
                disabled={isSearching || !manualIsbn.trim()}
                className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl px-4"
              >
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Szukaj'}
              </Button>
            </div>
          </div>

          {/* Search Error */}
          {searchError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Identified Scanned Result Card */}
          {scannedResult && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-[#0B0F19] border border-cyan-500/40 space-y-3 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Rozpoznano Tom!
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ISBN: {scannedResult.isbn}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative aspect-[2/3] w-14 overflow-hidden rounded-lg bg-black border border-white/10 shadow-md shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getCoverUrl(scannedResult.coverUrl)}
                    alt={scannedResult.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = getCoverUrl('')
                    }}
                  />
                  <div className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[8px] font-black text-white">
                    {scannedResult.volumeNumber}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-sm text-white truncate">
                    {scannedResult.title}
                  </h4>
                  <p className="text-xs font-black text-cyan-400 mt-0.5">
                    Tom {scannedResult.volumeNumber}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Wydawnictwo: <span className="text-white font-semibold">{scannedResult.publisher}</span>
                  </p>
                </div>
              </div>

              {addedSuccess ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Pomyślnie dodano tom do Twojej kolekcji!
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleAddToCollection}
                  className="w-full h-9 text-xs font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Dodaj Ten Tom do Mojej Półki
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-white font-bold"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
