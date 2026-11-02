import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { requireUser } from '@/lib/api-auth'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function detectImageExtension(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp'
  return null
}

export async function POST(request: NextRequest) {
  const guard = await requireUser()
  if (guard.error) return guard.error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Plik jest za duży (max 2MB)' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Niedozwolony format pliku' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Rozszerzenie wynika z faktycznej zawartości pliku (magic bytes), a nie z nazwy ani zadeklarowanego typu
    const ext = detectImageExtension(buffer)
    if (!ext) {
      return NextResponse.json({ error: 'Niedozwolony format pliku' }, { status: 400 })
    }
    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'covers')

    await mkdir(uploadDir, { recursive: true })

    await writeFile(join(uploadDir, filename), buffer)

    const url = `/uploads/covers/${filename}`

    return NextResponse.json({ url, filename })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Błąd podczas uploadu' }, { status: 500 })
  }
}
