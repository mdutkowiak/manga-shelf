import { NextResponse } from 'next/server'
import { getVerifiedWanekoAnnouncements, getVerifiedJPFAnnouncements } from '@/lib/publisher-scraper'

export interface PolishRelease {
  id: string
  mangaId: string
  day: string
  date: string
  month: string
  year: number
  publisher: string
  title: string
  volumeNumber: number
  pricePLN: number
  coverUrl: string
  bannerUrl?: string | null
  status: string
  logoBg: string
  logoText: string
  description?: string | null
}

// Bazowy harmonogram innych wydawców (Studio JG, JPF, Kotori, Dango)
const studioJgAndJpfReleases: PolishRelease[] = [
  // Sierpień 2026
  {
    id: 'sjg-2026-csm-19',
    mangaId: '117832',
    day: '26 Sie',
    date: '2026-08-26',
    month: 'Sierpień',
    year: 2026,
    publisher: 'Studio JG',
    title: 'Studio JG: "Chainsaw Man 19"',
    volumeNumber: 19,
    pricePLN: 36.99,
    coverUrl: 'https://uploads.mangadex.org/covers/a7774285-d604-4863-9560-b9f5e040f7b1/5c5c1653-559d-4c3e-8628-98e37452d3a3.512.jpg',
    logoBg: 'bg-red-600',
    logoText: 'JG',
    status: 'PREORDER',
    description: 'Denji i Asa stają w obliczu przebudzenia Demona Starzenia i nowego chaosu w Tokio.',
  },
  {
    id: 'sjg-2026-kagura-4',
    mangaId: '168988',
    day: '31 Sie',
    date: '2026-08-31',
    month: 'Sierpień',
    year: 2026,
    publisher: 'Studio JG',
    title: 'Studio JG: "Kagurabachi 4"',
    volumeNumber: 4,
    pricePLN: 34.99,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx168988-sA0gOQJ49Dbg.jpg',
    logoBg: 'bg-red-600',
    logoText: 'JG',
    status: 'PREORDER',
    description: 'Chihiro Rokuhira podczas aukcji Rakuzaichi toczy walkę o odzyskanie zaczarowanego miecza Shinuchi.',
  },

  // Wrzesień 2026
  {
    id: 'sjg-2026-frieren-14',
    mangaId: '118586',
    day: '4 Wrz',
    date: '2026-09-04',
    month: 'Wrzesień',
    year: 2026,
    publisher: 'Studio JG',
    title: 'Studio JG: "Frieren. U kresu drogi 14"',
    volumeNumber: 14,
    pricePLN: 36.99,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx118586-kXFpB7n16k5A.jpg',
    logoBg: 'bg-red-600',
    logoText: 'JG',
    status: 'PREORDER',
    description: 'Wyprawa na Płaskowyż Północny i nowe wyzwania drużyny Frieren, Fern i Starka.',
  },
  {
    id: 'jpf-2026-op-110',
    mangaId: '30013',
    day: '18 Wrz',
    date: '2026-09-18',
    month: 'Wrzesień',
    year: 2026,
    publisher: 'J.P.Fantastica',
    title: 'J.P.Fantastica: "One Piece 110"',
    volumeNumber: 110,
    pricePLN: 31.99,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-1O9ILH89zgG4.jpg',
    logoBg: 'bg-purple-700',
    logoText: 'JPF',
    status: 'PREORDER',
    description: 'Kulminacja incydentu na Egghead i transmisja Dr. Vegapunka wstrząsająca całym światem!',
  },
  {
    id: 'sjg-2026-dandadan-16',
    mangaId: '132029',
    day: '25 Wrz',
    date: '2026-09-25',
    month: 'Wrzesień',
    year: 2026,
    publisher: 'Studio JG',
    title: 'Studio JG: "Dandadan 16"',
    volumeNumber: 16,
    pricePLN: 36.99,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx132029-7mR15o63E75A.jpg',
    logoBg: 'bg-red-600',
    logoText: 'JG',
    status: 'PREORDER',
    description: 'Wielka bitwa z kurumejskimi istotami pozaziemskimi i nowa potęga Okaruna.',
  },

  // Październik 2026
  {
    id: 'sjg-2026-onk-16',
    mangaId: '117195',
    day: '2 Paź',
    date: '2026-10-02',
    month: 'Październik',
    year: 2026,
    publisher: 'Studio JG',
    title: 'Studio JG: "Oshi no Ko 16 (Finał)"',
    volumeNumber: 16,
    pricePLN: 36.99,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx117195-2s5b3n4pZ9Ea.jpg',
    logoBg: 'bg-red-600',
    logoText: 'JG',
    status: 'PREORDER',
    description: 'Wielki finał historii Aquy i Ruby Hoshino. Wszystkie tajemnice przeszłości zostają ujawnione.',
  },
  {
    id: 'sjg-2026-kaiju-14',
    mangaId: '120760',
    day: '9 Paź',
    date: '2026-10-09',
    month: 'Październik',
    year: 2026,
    publisher: 'Studio JG',
    title: 'Studio JG: "Kaiju No. 8 14"',
    volumeNumber: 14,
    pricePLN: 34.99,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx120760-4H1XqJ35027x.jpg',
    logoBg: 'bg-red-600',
    logoText: 'JG',
    status: 'PREORDER',
    description: 'Kafka Hibino staje do ostatecznego starcia z potężnym Kaiju No. 9.',
  },
  {
    id: 'jpf-2026-berserk-43',
    mangaId: '30002',
    day: '23 Paź',
    date: '2026-10-23',
    month: 'Październik',
    year: 2026,
    publisher: 'J.P.Fantastica',
    title: 'J.P.Fantastica: "Berserk 43"',
    volumeNumber: 43,
    pricePLN: 42.99,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30002-79MzgPbp3w33.jpg',
    logoBg: 'bg-purple-700',
    logoText: 'JPF',
    status: 'PREORDER',
    description: 'Guts na wyspie Skellig po porwaniu Cascy przez Griffitha. Nowy rozdział sagi Czarnego Szermierza.',
  },
]

// All combined releases across years (2026, 2027+)
export function getAllReleases(): PolishRelease[] {
  const wanekoReleases = getVerifiedWanekoAnnouncements()
  const jpfReleases = getVerifiedJPFAnnouncements()
  const combined = [...studioJgAndJpfReleases, ...wanekoReleases, ...jpfReleases]
  combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return combined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || 'Sierpień'
  const year = parseInt(searchParams.get('year') || '2026', 10)
  const allReleases = getAllReleases()

  // Strict filter by month name and year
  const matchingReleases = allReleases.filter(
    (rel) => rel.month.toLowerCase() === month.toLowerCase() && rel.year === year
  )

  return NextResponse.json({
    success: true,
    month,
    year,
    count: matchingReleases.length,
    releases: matchingReleases,
    allCount: allReleases.length,
    allReleases, // Also return full database for multi-month / quarter views
  })
}
