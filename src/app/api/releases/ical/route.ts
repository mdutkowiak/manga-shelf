import { NextRequest, NextResponse } from 'next/server'
import { getAllReleases, type PolishRelease } from '@/app/api/releases/route'
import { cleanReleaseTitle, matchPublisher } from '@/lib/publisher-scraper'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const seriesFilter = searchParams.get('series') // comma-separated titles or substrings
  const mangaIdsFilter = searchParams.get('mangaIds') // comma-separated manga IDs
  const publisherFilter = searchParams.get('publisher') // specific publisher filter
  const isPersonal = Boolean(seriesFilter || mangaIdsFilter)

  let releases: PolishRelease[] = getAllReleases()

  // Filter by publisher if specified
  if (publisherFilter && publisherFilter !== 'Wszystkie') {
    releases = releases.filter((rel) => matchPublisher(rel.publisher, publisherFilter))
  }

  // Filter by user's series if provided
  if (isPersonal) {
    const titlesList = seriesFilter ? seriesFilter.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : []
    const idsList = mangaIdsFilter ? mangaIdsFilter.split(',').map((id) => id.trim()).filter(Boolean) : []

    releases = releases.filter((rel) => {
      if (idsList.includes(rel.mangaId)) return true
      const cleaned = cleanReleaseTitle(rel.title).toLowerCase()
      const raw = rel.title.toLowerCase()
      return titlesList.some((t) => cleaned.includes(t) || t.includes(cleaned) || raw.includes(t))
    })
  }

  // Sort chronologically
  releases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const calendarName = isPersonal
    ? 'Moje Premiery Mang — Manga-Shelf'
    : 'Wszystkie Polskie Premiery Mang — Manga-Shelf'

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Manga-Shelf//Kalendarz Premier Mang//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:Europe/Warsaw',
  ]

  releases.forEach((rel) => {
    const cleanDate = rel.date ? rel.date.replace(/-/g, '') : '20260915'
    const seriesTitle = cleanReleaseTitle(rel.title)
    const summary = `[${rel.publisher}] ${seriesTitle} — Tom ${rel.volumeNumber}`
    const descParts = [
      `Wydawnictwo: ${rel.publisher}`,
      `Tom: ${rel.volumeNumber}`,
      `Szacowana cena okładkowa: ${rel.pricePLN.toFixed(2)} PLN`,
    ]
    if (rel.description) {
      descParts.push(`Opis: ${rel.description}`)
    }
    const description = descParts.join(' \\n ')

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:manga-release-${rel.id || rel.volumeNumber}-${cleanDate}@mangashelf.pl`)
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
    lines.push(`DTSTART;VALUE=DATE:${cleanDate}`)
    lines.push(`SUMMARY:${summary.replace(/[\n\r]/g, ' ')}`)
    lines.push(`DESCRIPTION:${description.replace(/[\n\r]/g, ' ')}`)
    lines.push('STATUS:CONFIRMED')
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')

  const icsContent = lines.join('\r\n')
  const filename = isPersonal ? 'moje-premiery-mangi.ics' : 'wszystkie-premiery-mangi.ics'

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=1800',
    },
  })
}
