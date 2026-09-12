import fs from 'fs/promises'
import path from 'path'

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
    const res = await fetch(remoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!res.ok) {
      console.warn(`Failed to download cover from ${remoteUrl} (status ${res.status})`)
      return remoteUrl
    }

    const buffer = Buffer.from(await res.arrayBuffer())

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
    const customDir = path.join(process.cwd(), 'public', 'covers', 'custom')
    await fs.mkdir(customDir, { recursive: true })

    const titleSlug = sanitizeFileName(title)
    const fileName = `custom_${titleSlug}_tom-${volumeNumber}_${Date.now()}.jpg`
    const filePath = path.join(customDir, fileName)

    // Remove data URL header if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(cleanBase64, 'base64')

    await fs.writeFile(filePath, buffer)

    return `/covers/custom/${fileName}`
  } catch (error) {
    console.error('Error in saveCustomUploadedCover:', error)
    throw error
  }
}
