'use client'

import { useState, useRef } from 'react'
import { Upload, X, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AvatarUploadProps {
  value: string | null
  onChange: (url: string | null) => void
}

export function AvatarUpload({ value, onChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Walidacja: kwadratowy, max 2MB
    if (file.size > 2 * 1024 * 1024) {
      setError('Plik jest za duży (max 2MB)')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Niedozwolony format pliku')
      return
    }

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
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 flex-shrink-0">
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Avatar"
                className="h-full w-full rounded-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-muted border-2 border-dashed">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
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
            {uploading ? 'Upload...' : value ? 'Zmień avatar' : 'Dodaj avatar'}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              Usuń
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        className="hidden"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">
        JPEG, PNG lub WebP. Zalecany kwadratowy format. Max 2MB.
      </p>
    </div>
  )
}
