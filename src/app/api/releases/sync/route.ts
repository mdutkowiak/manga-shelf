import { NextRequest, NextResponse } from 'next/server'
import { scrapePublisherPlan, mergeReleasesWithDiff } from '@/lib/publisher-scraper'
import type { PolishRelease } from '../route'

export const defaultPublisherSources = [
  {
    id: 'sjg',
    name: 'Wydawnictwo Studio JG',
    url: 'https://studiojg.pl/plan-wydawniczy',
    logo: 'JG',
    color: 'bg-red-600',
    lastSync: 'Przed chwilą',
  },
  {
    id: 'waneko',
    name: 'Wydawnictwo Waneko',
    url: 'https://waneko.pl/zapowiedzi/',
    logo: 'W',
    color: 'bg-orange-500',
    lastSync: 'Dzisiaj, 14:30',
  },
  {
    id: 'jpf',
    name: 'J.P.Fantastica',
    url: 'https://www.jpf.com.pl/page,Zapowiedzi,19',
    logo: 'JPF',
    color: 'bg-purple-700',
    lastSync: 'Dzisiaj',
  },
  {
    id: 'kotori',
    name: 'Wydawnictwo Kotori',
    url: 'https://kotori.pl/plan-wydawniczy',
    logo: 'KO',
    color: 'bg-pink-600',
    lastSync: '2 dni temu',
  },
  {
    id: 'dango',
    name: 'Wydawnictwo Dango',
    url: 'https://sklep-dango.pl/zapowiedzi',
    logo: 'DA',
    color: 'bg-amber-600',
    lastSync: '3 dni temu',
  },
]

export async function GET() {
  return NextResponse.json({
    sources: defaultPublisherSources,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, publisher, existingReleases = [] } = body

    if (!url) {
      return NextResponse.json({ error: 'Adres URL jest wymagany' }, { status: 400 })
    }

    const targetPublisherName = publisher || 'Waneko'
    const cleanTargetPub = targetPublisherName.toLowerCase().replace(/wydawnictwo\s*/i, '').trim()

    // 1. Scrape live publisher releases for target publisher
    const incomingReleases = await scrapePublisherPlan(url, targetPublisherName)

    // Filter incoming releases to ONLY the target publisher
    const publisherOnlyIncoming = incomingReleases.filter((rel) => {
      const pubLower = rel.publisher.toLowerCase()
      return pubLower.includes(cleanTargetPub) || cleanTargetPub.includes(pubLower)
    })

    // Filter existing releases to ONLY the target publisher
    const publisherOnlyExisting = existingReleases.filter((rel: PolishRelease) => {
      const pubLower = (rel.publisher || '').toLowerCase()
      return pubLower.includes(cleanTargetPub) || cleanTargetPub.includes(pubLower)
    })

    // 2. Perform Diffing & Deduplication for THIS publisher
    const diff = mergeReleasesWithDiff(publisherOnlyExisting, publisherOnlyIncoming)

    // Ensure final result list contains ONLY target publisher
    const filteredMerged = diff.merged.filter((rel) => {
      const pubLower = rel.publisher.toLowerCase()
      return pubLower.includes(cleanTargetPub) || cleanTargetPub.includes(pubLower)
    })

    return NextResponse.json({
      success: true,
      url,
      publisher: targetPublisherName,
      totalCount: filteredMerged.length,
      addedCount: diff.addedCount,
      updatedCount: diff.updatedCount,
      unchangedCount: diff.unchangedCount,
      releases: filteredMerged,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('POST /api/releases/sync error:', error)
    return NextResponse.json({ error: 'Błąd podczas synchronizacji planu wydawcy' }, { status: 500 })
  }
}
