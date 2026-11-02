import fs from 'fs/promises'
import path from 'path'
import { safeFetch } from '@/lib/safe-fetch'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function toVolumeNumber(value: unknown): number {
  const n = Math.trunc(Number(value))
  return Number.isFinite(n) && n > 0 && n < 10000 ? n : 1
}

function isImageBuffer(buf: Buffer): boolean {
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const isWebp =
    buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP'
  return isJpeg || isPng || isWebp
}

/**
 * Sanitizes a string for use in file names
 */
function sanitizeFileName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics (ą->a, ę->e)
    .replace(/[^a-z0-9]/g, '-') // replace non-alphanumeric with hyphen
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, '') // trim hyphens
}

/**
 * Downloads a remote image and persists it locally in the project under public/covers/[publisher]/[filename]
 * Returns the local URL (e.g. /covers/waneko/niebieskie-pudelko_tom-20.jpg)
 */
export async function saveCoverLocally(
  remoteUrl: string,
  publisher = 'waneko',
  title = 'manga',
  volumeNumber = 1
): Promise<string> {
  try {
    if (!remoteUrl || remoteUrl.startsWith('/covers/')) {
      return remoteUrl
    }
    volumeNumber = toVolumeNumber(volumeNumber)

    const pubSlug = sanitizeFileName(publisher || 'other')
    const titleSlug = sanitizeFileName(title)
    const fileName = `${pubSlug}_${titleSlug}_tom-${volumeNumber}.jpg`

    const coversDir = path.join(process.cwd(), 'public', 'covers', pubSlug)
    const filePath = path.join(coversDir, fileName)
    const publicUrl = `/covers/${pubSlug}/${fileName}`

    // 1. Check if already exists on disk
    try {
      await fs.access(filePath)
      return publicUrl
    } catch {
      // File doesn't exist yet, proceed to download
    }

    // 2. Ensure destination directory exists
    await fs.mkdir(coversDir, { recursive: true })

    // 3. Fetch image buffer
    const res = await safeFetch(remoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!res.ok) {
      console.warn(`Failed to download cover from ${remoteUrl} (status ${res.status})`)
      return remoteUrl
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length > MAX_IMAGE_BYTES || !isImageBuffer(buffer)) {
      console.warn(`Rejected non-image or oversized cover from ${remoteUrl}`)
      return remoteUrl
    }

    // 4. Save to disk
    await fs.writeFile(filePath, buffer)

    return publicUrl
  } catch (error) {
    console.error('Error in saveCoverLocally:', error)
    return remoteUrl
  }
}

/**
 * Saves a base64-encoded or cropped image uploaded by the user
 */
export async function saveCustomUploadedCover(
  base64Data: string,
  title = 'custom',
  volumeNumber = 1
): Promise<string> {
  try {
    volumeNumber = toVolumeNumber(volumeNumber)
    const customDir = path.join(process.cwd(), 'public', 'covers', 'custom')
    await fs.mkdir(customDir, { recursive: true })

    const titleSlug = sanitizeFileName(title)
    const fileName = `custom_${titleSlug}_tom-${volumeNumber}_${Date.now()}.jpg`
    const filePath = path.join(customDir, fileName)

    // Remove data URL header if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(cleanBase64, 'base64')
    if (buffer.length > MAX_IMAGE_BYTES || !isImageBuffer(buffer)) {
      throw new Error('Niedozwolony format lub zbyt duży plik obrazu')
    }

    await fs.writeFile(filePath, buffer)

    return `/covers/custom/${fileName}`
  } catch (error) {
    console.error('Error in saveCustomUploadedCover:', error)
    throw error
  }
}
