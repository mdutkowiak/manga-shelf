'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CoverUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
}

export function CoverUpload({ value, onChange, label = 'Okładka' }: CoverUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Błąd uploadu')
        return
      }

      onChange(data.url)
    } catch {
      setError('Błąd połączenia z serwerem')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    onChange(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      {value ? (
        <div className="flex items-center gap-4">
          <div className="relative h-40 w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Podgląd okładki"
              className="h-full w-full rounded object-cover"
            />
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Zmień
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <X className="mr-2 h-4 w-4" />
              Usuń
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-40 w-28 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/50 transition-colors hover:bg-muted"
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Upload...' : 'Dodaj obraz'}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className="hidden"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">JPEG, PNG lub WebP. Max 2MB.</p>
    </div>
  )
}
