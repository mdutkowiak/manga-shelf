/**
 * Universal Publisher Store Scraper Registry
 * Allows easily scraping official volume titles and HD covers across various manga publishers.
 * To add a new store, simply implement StoreScraper and add it to `publisherScrapers`.
 */

import type { StoreScraper, StoreScrapeResult, ScrapedStoreVolume } from './types'
import { yattaScraper } from './yatta-scraper'
import { wanekoScraper } from './waneko-scraper'

export * from './types'
export * from './yatta-scraper'
export * from './waneko-scraper'

/**
 * List of active publisher store scrapers
 */
export const publisherScrapers: StoreScraper[] = [
  yattaScraper,
  wanekoScraper,
]

/**
 * Detect which store a URL belongs to
 */
export function detectPublisherStore(url: string): StoreScraper | null {
  if (!url) return null
  const cleanUrl = url.trim()
  return publisherScrapers.find((scraper) => scraper.canHandle(cleanUrl)) || null
}

/**
 * Get human-readable list of supported stores
 */
export function getSupportedStores(): { id: string; name: string; domains: string[]; publisherDefault?: string }[] {
  return publisherScrapers.map((s) => ({
    id: s.id,
    name: s.name,
    domains: s.domains,
    publisherDefault: s.publisherDefault,
  }))
}

/**
 * Scrape manga volumes and covers from any supported publisher store
 */
export async function scrapePublisherStore(url: string): Promise<StoreScrapeResult> {
  const cleanUrl = url?.trim() || ''
  if (!cleanUrl) {
    return {
      success: false,
      storeName: 'Nieznany sklep',
      seriesTitle: '',
      sourceUrl: cleanUrl,
      volumesCount: 0,
      volumes: [],
      error: 'Nie podano adresu URL sklepu',
    }
  }

  const scraper = detectPublisherStore(cleanUrl)
  if (!scraper) {
    const supportedList = publisherScrapers.map((s) => s.name).join(', ')
    return {
      success: false,
      storeName: 'Nieznany sklep',
      seriesTitle: '',
      sourceUrl: cleanUrl,
      volumesCount: 0,
      volumes: [],
      error: `Nieobsługiwany sklep. Aktualnie obsługiwane sklepy to: ${supportedList}.`,
    }
  }

  return scraper.scrape(cleanUrl)
}
