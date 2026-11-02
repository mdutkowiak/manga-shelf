import { NextRequest, NextResponse } from 'next/server'
import { scrapePublisherPlan, mergeReleasesWithDiff } from '@/lib/publisher-scraper'
import type { PolishRelease } from '../route'
import { requireUser } from '@/lib/api-auth'
import { defaultPublisherSources } from '@/lib/publisher-sources'

export async function GET() {
  return NextResponse.json({
    sources: defaultPublisherSources,
  })
}

export async function POST(request: NextRequest) {
  const guard = await requireUser()
  if (guard.error) return guard.error

  try {
    const body = await request.json()
    const { url, publisher, existingReleases = [] } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Adres URL jest wymagany' }, { status: 400 })
    }

    // Tylko znane strony wydawców – zapobiega użyciu endpointu jako otwartego proxy
    const allowedHosts = defaultPublisherSources.map((s) => new URL(s.url).hostname.replace(/^www\./, ''))
    let requestedHost = ''
    try {
      requestedHost = new URL(url).hostname.replace(/^www\./, '')
    } catch {}
    if (!allowedHosts.includes(requestedHost)) {
      return NextResponse.json({ error: 'Nieobsługiwany adres wydawcy' }, { status: 400 })
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
