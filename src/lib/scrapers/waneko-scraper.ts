/**
 * Waneko Store Scraper
 * Scrapes manga series and volumes from Sklep Waneko (sklepwaneko.pl) to extract
 * official Polish edition titles, volume numbers, and high-resolution covers.
 */

import type { StoreScraper, StoreScrapeResult, ScrapedStoreVolume } from './types'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pl,en-US;q=0.7,en;q=0.3',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

/**
 * Convert any Waneko image URL (home_default, medium_default, small_default)
 * to the highest resolution cover available (large_default).
 */
export function convertToWanekoHighResCover(url: string): string {
  if (!url) return ''
  let clean = url.trim()
  if (clean.startsWith('//')) {
    clean = 'https:' + clean
  } else if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://sklepwaneko.pl/' + clean.replace(/^\/+/, '')
  }
  return clean.replace(/\/(?:home|medium|small|cart)_default\//, '/large_default/')
}

/**
 * Extract volume number from title or URL
 * e.g. "Chainsaw man 01" -> 1
 * e.g. "Chainsaw man 20 [PREMIERA: 21.08]" -> 20
 * e.g. "8815-chainsaw-man-01-9788380969230.html" -> 1
 */
export function extractWanekoVolumeNumber(title: string, url: string = ''): number | null {
  const combined = (title + ' ' + url).replace(/%20/g, ' ')

  // 1. Try Tom 01, Tom 1
  const tomMatch = combined.match(/Tom\s*0*(\d+)/i)
  if (tomMatch) return parseInt(tomMatch[1], 10)

  // 2. Try #01, #1
  const hashMatch = combined.match(/#0*(\d+)/)
  if (hashMatch) return parseInt(hashMatch[1], 10)

  // 3. Try -01-, -01.html, _01_
  const dashNum = combined.match(/[-_ ]0*(\d+)(?:[-_.]html|\.jpg|\.png|\.webp|$|\s|\[)/i)
  if (dashNum) {
    const val = parseInt(dashNum[1], 10)
    if (val > 0 && val < 500) return val
  }

  // 4. Trailing number in title
  const cleanTitle = title.replace(/\[[^\]]*\]/g, '').trim()
  const trailingNum = cleanTitle.match(/(\d+)\s*$/)
  if (trailingNum) return parseInt(trailingNum[1], 10)

  return null
}

/**
 * Fetch HTML from Waneko store
 */
async function fetchWanekoHtml(targetUrl: string): Promise<string> {
  let urlToFetch = targetUrl.trim()
  if (!urlToFetch.startsWith('http')) {
    urlToFetch = 'https://' + urlToFetch.replace(/^\/+/, '')
  }

  const response = await fetch(urlToFetch, {
    headers: BROWSER_HEADERS,
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Błąd pobierania ze Sklepu Waneko: status HTTP ${response.status}`)
  }

  return response.text()
}

/**
 * Scrape a Waneko category/series page, product page, or direct image URL
 */
export async function scrapeWaneko(url: string): Promise<StoreScrapeResult> {
  try {
    const cleanUrl = url.trim()
    if (!cleanUrl) {
      return {
        success: false,
        storeName: 'Sklep Waneko',
        publisher: 'Waneko',
        seriesTitle: '',
        sourceUrl: cleanUrl,
        volumesCount: 0,
        volumes: [],
        error: 'Nie podano adresu URL',
      }
    }

    // 1. Direct image link (e.g. https://sklepwaneko.pl/33398-large_default/chainsaw-man-01.jpg)
    if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(cleanUrl) && cleanUrl.includes('sklepwaneko.pl')) {
      const highRes = convertToWanekoHighResCover(cleanUrl)
      const volNum = extractWanekoVolumeNumber(cleanUrl) || 1
      return {
        success: true,
        storeName: 'Sklep Waneko',
        publisher: 'Waneko',
        seriesTitle: 'Okładka Waneko',
        sourceUrl: cleanUrl,
        volumesCount: 1,
        volumes: [
          {
            volumeNumber: volNum,
            title: `Tom ${volNum}`,
            url: cleanUrl,
            coverUrl: highRes,
            thumbUrl: highRes,
          },
        ],
      }
    }

    const html = await fetchWanekoHtml(cleanUrl)

    // 2. Single product page (ends with .html)
    const isProductPage = /\.html(?:#[^"']*)?$/i.test(cleanUrl)

    if (isProductPage) {
      const ogTitle =
        html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<h1[^>]*class=["'][^"']*h1[^"']*["'][^>]*>([^<]+)<\/h1>/i) ||
        html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
      const rawTitle = ogTitle ? ogTitle[1].replace(/ - Sklep Waneko.*/i, '').trim() : 'Manga'

      const ogImage =
        html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
        html.match(/data-image-large-src=["']([^"']+)["']/i) ||
        html.match(/class=["'][^"']*js-qv-product-cover[^"']*["'][^>]+src=["']([^"']+)["']/i)
      const rawCover = ogImage ? ogImage[1] : ''
      const highRes = convertToWanekoHighResCover(rawCover)

      const volNum = extractWanekoVolumeNumber(rawTitle, cleanUrl) || 1
      const seriesTitle = rawTitle.replace(/(?:tom\s*\d+|#\d+|\s+\d+$|\[[^\]]*\])/gi, '').trim()

      return {
        success: true,
        storeName: 'Sklep Waneko',
        publisher: 'Waneko',
        seriesTitle: seriesTitle || rawTitle,
        sourceUrl: cleanUrl,
        volumesCount: 1,
        volumes: [
          {
            volumeNumber: volNum,
            title: rawTitle,
            url: cleanUrl,
            coverUrl: highRes,
            thumbUrl: highRes,
          },
        ],
      }
    }

    // 3. Category / Series page (e.g. /kategoria/910-chainsaw-man)
    const catTitleMatch =
      html.match(/<h1[^>]*class=["'][^"']*h1[^"']*["'][^>]*>([^<]+)<\/h1>/i) ||
      html.match(/<title>([^<]+)<\/title>/i)
    const seriesTitle = catTitleMatch
      ? catTitleMatch[1].replace(/ - Sklep Waneko.*/i, '').trim()
      : 'Manga'

    const itemRegex =
      /<a\s+href=["']([^"']+\.html(?:#[^"']*)?)["'][^>]*class=["'][^"']*product-thumbnail[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
    const items = [...html.matchAll(itemRegex)]

    const volumeMap = new Map<number, ScrapedStoreVolume>()

    for (const item of items) {
      const productUrl = item[1]
      const innerHtml = item[2]

      const altMatch = innerHtml.match(/alt\s*=\s*["']([^"']+)["']/i)
      const rawTitle = altMatch ? altMatch[1].trim() : ''

      const fullImgMatch =
        innerHtml.match(/data-full-size-image-url\s*=\s*["']([^"']+)["']/i) ||
        innerHtml.match(/data-src\s*=\s*["']([^"']+)["']/i) ||
        innerHtml.match(/src\s*=\s*["']([^"']+)["']/i)
      const rawImg = fullImgMatch ? fullImgMatch[1].trim() : ''
      const highRes = convertToWanekoHighResCover(rawImg)

      const volNum = extractWanekoVolumeNumber(rawTitle, productUrl)
      if (volNum !== null) {
        const isSpecial =
          rawTitle.toLowerCase().includes('edycja limitowana') ||
          rawTitle.toLowerCase().includes('pakiet') ||
          rawTitle.toLowerCase().includes('prenumerata')

        // Keep standard edition over special/pakiet or update if not set
        if (!volumeMap.has(volNum) || !isSpecial) {
          volumeMap.set(volNum, {
            volumeNumber: volNum,
            title: rawTitle,
            url: productUrl,
            coverUrl: highRes,
            thumbUrl: highRes,
            isSpecialEdition: isSpecial,
          })
        }
      }
    }

    const volumes = Array.from(volumeMap.values()).sort((a, b) => a.volumeNumber - b.volumeNumber)

    return {
      success: volumes.length > 0,
      storeName: 'Sklep Waneko',
      publisher: 'Waneko',
      seriesTitle,
      sourceUrl: cleanUrl,
      volumesCount: volumes.length,
      volumes,
      error:
        volumes.length === 0
          ? 'Nie znaleziono tomów na podanej stronie Sklepu Waneko. Upewnij się, że podajesz link do kategorii serii lub tomu.'
          : undefined,
    }
  } catch (error) {
    console.error('scrapeWaneko error:', error)
    return {
      success: false,
      storeName: 'Sklep Waneko',
      publisher: 'Waneko',
      seriesTitle: '',
      sourceUrl: url,
      volumesCount: 0,
      volumes: [],
      error:
        error instanceof Error
          ? error.message
          : 'Nieoczekiwany błąd podczas pobierania ze Sklepu Waneko',
    }
  }
}

export const wanekoScraper: StoreScraper = {
  id: 'waneko',
  name: 'Sklep Waneko',
  publisherDefault: 'Waneko',
  domains: ['sklepwaneko.pl', 'waneko.pl'],
  canHandle: (url: string) => /sklepwaneko\.pl|waneko\.pl/i.test(url),
  scrape: scrapeWaneko,
}
