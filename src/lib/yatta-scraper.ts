/**
 * Yatta.pl Scraper Utility
 * Scrapes manga series and volumes from Yatta.pl to extract
 * official Polish edition titles, volume numbers, and high-resolution covers.
 */

export interface YattaVolumeScraped {
  volumeNumber: number
  title: string
  url: string
  coverUrl: string
  thumbUrl: string
  isSpecialEdition?: boolean
}

export interface YattaScrapeResult {
  success: boolean
  seriesTitle: string
  sourceUrl: string
  volumesCount: number
  volumes: YattaVolumeScraped[]
  error?: string
}

/**
 * Convert any Yatta thumbnail URL (e.g. size200, size120, size300)
 * to the maximum available resolution (size601 / border0 / es3)
 */
export function convertToYattaHighResCover(url: string): string {
  if (!url) return ''
  let clean = url.trim()
  if (clean.startsWith('//')) {
    clean = 'https:' + clean
  } else if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean.replace(/^\/+/, '')
  }

  // If already a yatta static cache URL
  if (clean.includes('yatta-static.pl')) {
    return clean
      .replace(/cache\d*\.yatta-static\.pl/, 'cache.yatta-static.pl')
      .replace(/\/size\d+\/border\d+\/es\d+/, '/size601/border0/es3')
  }

  return clean
}

/**
 * Extract volume number from title or URL
 * e.g. "Kaoru i Rin. Rozkwitając z tobą #01" -> 1
 * e.g. "Kaoru_i_Rin_Rozkwitajac_z_toba_01,271730,p" -> 1
 * e.g. "Tom 05" -> 5
 */
export function extractVolumeNumber(title: string, url: string = ''): number | null {
  // Try #01, #1, #12
  const hashMatch = title.match(/#0*(\d+)/)
  if (hashMatch) return parseInt(hashMatch[1], 10)

  // Try Tom 01, Tom 1
  const tomMatch = title.match(/Tom\s*0*(\d+)/i)
  if (tomMatch) return parseInt(tomMatch[1], 10)

  // Try from URL _01, _1
  const urlMatch = url.match(/_0*(\d+),\d+,p/i)
  if (urlMatch) return parseInt(urlMatch[1], 10)

  // Try trailing number in title
  const endNumMatch = title.match(/(\d+)\s*$/)
  if (endNumMatch) return parseInt(endNumMatch[1], 10)

  return null
}

/**
 * Fetch HTML from URL with browser-like headers
 */
async function fetchHtml(targetUrl: string): Promise<string> {
  let urlToFetch = targetUrl.trim()
  if (!urlToFetch.startsWith('http')) {
    urlToFetch = 'https://' + urlToFetch.replace(/^\/+/, '')
  }

  const response = await fetch(urlToFetch, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Błąd pobierania ze sklepu Yatta.pl: status HTTP ${response.status}`)
  }

  return response.text()
}

/**
 * Scrape a Yatta.pl series or volume page
 */
export async function scrapeYatta(url: string): Promise<YattaScrapeResult> {
  try {
    const cleanUrl = url.trim()
    if (!cleanUrl) {
      return {
        success: false,
        seriesTitle: '',
        sourceUrl: cleanUrl,
        volumesCount: 0,
        volumes: [],
        error: 'Nie podano adresu URL',
      }
    }

    // Direct image URL provided
    if (cleanUrl.includes('yatta-static.pl') && cleanUrl.includes('img=')) {
      const highRes = convertToYattaHighResCover(cleanUrl)
      return {
        success: true,
        seriesTitle: 'Okładka Yatta',
        sourceUrl: cleanUrl,
        volumesCount: 1,
        volumes: [
          {
            volumeNumber: 1,
            title: 'Okładka Yatta',
            url: cleanUrl,
            coverUrl: highRes,
            thumbUrl: highRes,
          },
        ],
      }
    }

    const html = await fetchHtml(cleanUrl)

    // Check if single product page (ends with ,p or contains ,p?)
    const isSingleProduct = /,\d+,p(\?|$)/i.test(cleanUrl)

    if (isSingleProduct) {
      // 1. Extract cover from single product page
      // Look for size601 lightbox image or primary image
      const size601Match = html.match(/href=["'](?:\/\/)?([^"']*cache\.yatta-static\.pl[^"']*size601[^"']*)["']/i)
      const generalImgMatch = html.match(/src=["'](?:\/\/)?([^"']*cache\d*\.yatta-static\.pl[^"']*img=towary[^"']*)["']/i)

      let singleCoverUrl = ''
      if (size601Match) {
        singleCoverUrl = convertToYattaHighResCover(size601Match[1])
      } else if (generalImgMatch) {
        singleCoverUrl = convertToYattaHighResCover(generalImgMatch[1])
      }

      // Title from og:title or h1
      const titleMatch =
        html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
      const rawTitle = titleMatch ? titleMatch[1].replace(/ - YATTA\.PL.*/i, '').trim() : 'Manga'

      const volNum = extractVolumeNumber(rawTitle, cleanUrl) || 1

      const singleVolume: YattaVolumeScraped = {
        volumeNumber: volNum,
        title: rawTitle,
        url: cleanUrl,
        coverUrl: singleCoverUrl,
        thumbUrl: singleCoverUrl,
      }

      // Also look for other volumes linked on product page in related items
      const otherVolumes: YattaVolumeScraped[] = [singleVolume]
      const relatedMatches = [
        ...html.matchAll(
          /<a\s+href=["'](?:\/\/yatta\.pl)?(\/[^"']+,(\d+),p)["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*>[\s\S]*?<div[^>]*>([^<]+)<\/div>/gi
        ),
      ]

      for (const m of relatedMatches) {
        const pUrl = 'https://yatta.pl' + m[1]
        const pImg = m[3]
        const pTitle = m[4].replace(/\.\.\.$/, '').trim()
        const vNum = extractVolumeNumber(pTitle, pUrl)
        if (vNum && !otherVolumes.some((v) => v.volumeNumber === vNum)) {
          otherVolumes.push({
            volumeNumber: vNum,
            title: pTitle,
            url: pUrl,
            coverUrl: convertToYattaHighResCover(pImg),
            thumbUrl: convertToYattaHighResCover(pImg),
          })
        }
      }

      otherVolumes.sort((a, b) => a.volumeNumber - b.volumeNumber)

      return {
        success: true,
        seriesTitle: rawTitle.replace(/#\d+.*/, '').trim(),
        sourceUrl: cleanUrl,
        volumesCount: otherVolumes.length,
        volumes: otherVolumes,
      }
    }

    // 2. Series Page parsing (e.g. ends with ,st)
    // Product containers pattern:
    // <a href="//yatta.pl/Kaoru_i_Rin_Rozkwitajac_z_toba_01,271730,p" TITLE="Kaoru i Rin. Rozkwitając z tobą #01" ...>
    //   <img data-src="//cache3.yatta-static.pl/cache/size200/border0/es4/zoom0/pi0/img=towary/..." ...>
    const volRegex =
      /<a\s+href=["'](?:\/\/yatta\.pl)?(\/[^"']+,(\d+),p)["'][^>]*TITLE=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]+(?:data-src|src)=["']([^"']+)["']/gi
    const matches = [...html.matchAll(volRegex)]

    const volumeMap = new Map<number, YattaVolumeScraped>()

    for (const m of matches) {
      const productUrl = 'https://yatta.pl' + m[1]
      const productTitle = m[3].trim()
      let thumbUrl = m[4]
      if (thumbUrl.startsWith('//')) thumbUrl = 'https:' + thumbUrl

      const fullCoverUrl = convertToYattaHighResCover(thumbUrl)
      const volumeNumber = extractVolumeNumber(productTitle, productUrl)

      if (volumeNumber !== null) {
        const isSpecial =
          productTitle.toLowerCase().includes('specjal') ||
          productTitle.toLowerCase().includes('edycja') ||
          productTitle.toLowerCase().includes('prenumerata')

        // If standard edition exists, keep standard over special, or update if not set
        if (!volumeMap.has(volumeNumber) || !isSpecial) {
          volumeMap.set(volumeNumber, {
            volumeNumber,
            title: productTitle,
            url: productUrl,
            coverUrl: fullCoverUrl,
            thumbUrl,
            isSpecialEdition: isSpecial,
          })
        }
      }
    }

    const volumes = Array.from(volumeMap.values()).sort((a, b) => a.volumeNumber - b.volumeNumber)

    // Series title from page
    const titleMatch =
      html.match(/<h1[^>]*class=["'][^"']*pageTitle[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["']pageTitletext["']>([^<]+)<\/span>/i) ||
      html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
      html.match(/<title>([^<]+)<\/title>/i)
    let seriesTitle = titleMatch ? titleMatch[1].replace(/ - YATTA\.PL.*/i, '').trim() : 'Manga'
    if (seriesTitle.toLowerCase() === 'mangi' && volumes.length > 0) {
      // derive series title from first volume
      seriesTitle = volumes[0].title.replace(/#\d+.*/, '').trim()
    }

    return {
      success: volumes.length > 0,
      seriesTitle,
      sourceUrl: cleanUrl,
      volumesCount: volumes.length,
      volumes,
      error: volumes.length === 0 ? 'Nie znaleziono tomów na podanej stronie Yatta.pl' : undefined,
    }
  } catch (error) {
    console.error('scrapeYatta error:', error)
    return {
      success: false,
      seriesTitle: '',
      sourceUrl: url,
      volumesCount: 0,
      volumes: [],
      error: error instanceof Error ? error.message : 'Nieoczekiwany błąd podczas pobierania ze sklepu Yatta.pl',
    }
  }
}
