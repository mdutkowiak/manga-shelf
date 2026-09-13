/**
 * Universal Store Scraper Types
 * Used to standardize manga volume and cover extraction across various publisher stores.
 */

export interface ScrapedStoreVolume {
  volumeNumber: number
  title: string
  url: string
  coverUrl: string
  thumbUrl?: string
  pricePLN?: number
  releaseDate?: string
  isSpecialEdition?: boolean
}

export interface StoreScrapeResult {
  success: boolean
  storeName: string
  publisher?: string
  seriesTitle: string
  sourceUrl: string
  volumesCount: number
  volumes: ScrapedStoreVolume[]
  error?: string
}

export interface StoreScraper {
  id: string
  name: string
  publisherDefault?: string
  domains: string[]
  canHandle: (url: string) => boolean
  scrape: (url: string) => Promise<StoreScrapeResult>
}
