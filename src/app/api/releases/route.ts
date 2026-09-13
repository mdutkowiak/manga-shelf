import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

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
  shopPrice?: number | null
  coverUrl: string
  bannerUrl?: string | null
  status: string
  logoBg: string
  logoText: string
  description?: string | null
  shopUrl?: string | null
  shopLinks?: { name: string; url: string; price?: number; logo?: string }[]
}

const monthsList = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

// Harmonogram bazowy - wyczyszczony pod ręczne wprowadzanie premier przez administratora
export function getAllReleases(): PolishRelease[] {
  return []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || monthsList[new Date().getMonth()]
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)

  let dbReleases: PolishRelease[] = []
  try {
    const volumes = await prisma.volume.findMany({
      where: {
        polishReleaseDate: { not: null },
      },
      include: {
        manga: {
          include: {
            publisher: true,
          },
        },
        prices: {
          include: {
            shop: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
      },
      orderBy: {
        polishReleaseDate: 'asc',
      },
    })

    dbReleases = volumes.map((vol) => {
      const date = vol.polishReleaseDate ? new Date(vol.polishReleaseDate) : new Date()
      const mIdx = date.getMonth()
      const mName = monthsList[mIdx]
      const y = date.getFullYear()
      const pubName = vol.manga?.publisher?.name || 'Wydawnictwo'
      const mangaTitle = vol.manga?.polishTitle || vol.manga?.title || 'Manga'
      const title = `${pubName}: "${mangaTitle} ${vol.volumeNumber}"`

      const shopLinks = vol.prices?.map((p) => ({
        name: p.shop?.name || 'Sklep',
        url: p.url,
        price: Number(p.price),
        logo: p.shop?.logo || undefined,
      })) || []

      const lowestPrice = vol.prices?.length > 0 ? Number(vol.prices[0].price) : null
      const shopUrl = shopLinks[0]?.url || null

      return {
        id: `db-${vol.id}`,
        mangaId: vol.mangaId,
        day: `${date.getDate()} ${mName.slice(0, 3)}`,
        date: date.toISOString().slice(0, 10),
        month: mName,
        year: y,
        publisher: pubName,
        title,
        volumeNumber: vol.volumeNumber,
        pricePLN: vol.pricePLN || 34.99,
        shopPrice: lowestPrice,
        coverUrl: vol.customCoverUrl || vol.coverImage || vol.manga?.customCoverUrl || vol.manga?.defaultCover || '',
        bannerUrl: null,
        status: 'PREORDER',
        logoBg: 'bg-primary',
        logoText: pubName.slice(0, 2).toUpperCase(),
        description: vol.description || null,
        shopUrl,
        shopLinks,
      }
    })
  } catch (err) {
    console.error('Błąd podczas pobierania premier z bazy:', err)
  }

  const allReleases = dbReleases
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
    allReleases,
  })
}

// POST endpoint do ręcznego dodawania premier przez administratora
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const body = await request.json()
    const {
      seriesTitle,
      volumeNumber,
      releaseDate,
      publisher,
      pricePLN,
      shopPrice,
      shopUrl,
      shopLinks,
      coverUrl,
      description,
    } = body

    if (!seriesTitle || !volumeNumber || !releaseDate) {
      return NextResponse.json({ error: 'Brak wymaganych pól (tytuł, tom, data)' }, { status: 400 })
    }

    // 1. Znajdź lub utwórz wydawcę
    let publisherRecord = null
    if (publisher) {
      publisherRecord = await prisma.publisher.upsert({
        where: { name: publisher },
        update: {},
        create: { name: publisher },
      })
    }

    // 2. Znajdź lub utwórz mangę
    // Usuń ewentualny doklejony numer tomu (np. "#11", "#01", "Tom 11") z nazwy serii
    const cleanSeriesTitle = seriesTitle
      .replace(/\s*#0*\d+\s*$/, '')
      .replace(/\s*Tom\s*0*\d+\s*$/i, '')
      .trim() || seriesTitle.trim()

    let manga = await prisma.manga.findFirst({
      where: {
        OR: [
          { title: { equals: cleanSeriesTitle, mode: 'insensitive' } },
          { polishTitle: { equals: cleanSeriesTitle, mode: 'insensitive' } },
          { title: { equals: seriesTitle, mode: 'insensitive' } },
        ],
      },
    })

    if (!manga) {
      manga = await prisma.manga.create({
        data: {
          title: cleanSeriesTitle,
          publisherId: publisherRecord?.id,
          defaultCover: coverUrl || null,
          customCoverUrl: coverUrl || null,
        },
      })
    }

    // 3. Utwórz lub zaktualizuj tom
    const volNum = parseInt(String(volumeNumber), 10)
    const relDate = new Date(releaseDate)

    const volume = await prisma.volume.upsert({
      where: {
        mangaId_volumeNumber: {
          mangaId: manga.id,
          volumeNumber: volNum,
        },
      },
      update: {
        polishReleaseDate: relDate,
        pricePLN: pricePLN ? parseFloat(String(pricePLN)) : null,
        coverImage: coverUrl || undefined,
        customCoverUrl: coverUrl || undefined,
        description: description || undefined,
      },
      create: {
        mangaId: manga.id,
        volumeNumber: volNum,
        polishReleaseDate: relDate,
        pricePLN: pricePLN ? parseFloat(String(pricePLN)) : null,
        coverImage: coverUrl || null,
        customCoverUrl: coverUrl || null,
        description: description || null,
      },
    })

    // 4. Jeśli tom 1, zsynchronizuj okładkę serii w bazie
    if (volNum === 1 && coverUrl && !manga.customCoverUrl) {
      await prisma.manga.update({
        where: { id: manga.id },
        data: { customCoverUrl: coverUrl },
      }).catch(() => {})
    }

    // 5. Utwórz lub zaktualizuj oferty i ceny w sklepach (VolumePrice)
    const storeOffers: { name?: string; url?: string; price?: number; logo?: string }[] = Array.isArray(shopLinks) ? [...shopLinks] : []
    if (shopUrl && !storeOffers.some((s) => s.url === shopUrl)) {
      storeOffers.unshift({
        name: publisher || 'Sklep',
        url: shopUrl,
        price: shopPrice ? parseFloat(String(shopPrice)) : undefined,
      })
    } else if (shopPrice && storeOffers.length === 0) {
      storeOffers.push({
        name: publisher || 'Sklep',
        url: shopUrl || '',
        price: parseFloat(String(shopPrice)),
      })
    }

    for (const offer of storeOffers) {
      if (!offer.url && !offer.price) continue
      const shopName = offer.name || 'Sklep'
      const shopSlug = `shop-${shopName.toLowerCase().replace(/[^a-z0-9]/g, '')}` || 'shop-default'

      let shop = await prisma.shop.findFirst({
        where: {
          OR: [
            { id: shopSlug },
            { name: { equals: shopName, mode: 'insensitive' } },
          ],
        },
      })

      if (!shop) {
        shop = await prisma.shop.create({
          data: {
            id: shopSlug,
            name: shopName,
            url: offer.url || 'https://sklep.pl',
            country: 'PL',
            logo: offer.logo || null,
          },
        }).catch(async () => {
          return prisma.shop.findFirst({ where: { name: shopName } })
        })
      }

      if (shop && (offer.price || shopPrice)) {
        const finalPrice = offer.price || shopPrice
        await prisma.volumePrice.upsert({
          where: {
            volumeId_shopId: {
              volumeId: volume.id,
              shopId: shop.id,
            },
          },
          update: {
            price: parseFloat(String(finalPrice)),
            url: offer.url || '',
            inStock: true,
          },
          create: {
            volumeId: volume.id,
            shopId: shop.id,
            price: parseFloat(String(finalPrice)),
            url: offer.url || '',
            currency: 'PLN',
            inStock: true,
          },
        }).catch((err) => console.warn('Błąd zapisu VolumePrice:', err))
      }
    }

    return NextResponse.json({
      success: true,
      volumeId: volume.id,
      mangaId: manga.id,
      message: 'Premiera została pomyślnie dodana do bazy danych',
    })
  } catch (error) {
    console.error('Błąd podczas zapisywania premiery:', error)
    return NextResponse.json({ error: 'Wystąpił błąd podczas zapisywania premiery' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await request.json()
        id = body.id
      } catch {
        // No body
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Brak ID premiery do usunięcia' }, { status: 400 })
    }

    if (id.startsWith('db-')) {
      const volumeId = id.replace(/^db-/, '')
      const vol = await prisma.volume.findUnique({
        where: { id: volumeId },
        include: {
          collections: true,
          manga: {
            include: {
              volumes: true,
              ratings: true,
            },
          },
        },
      })

      if (vol) {
        // Jeśli żaden użytkownik nie dodał tego tomu do kolekcji
        if (vol.collections.length === 0) {
          // Jeśli manga ma tylko ten jeden tom i 0 ocen, usuwamy też osieroconą mangę
          if (vol.manga.volumes.length <= 1 && vol.manga.ratings.length === 0) {
            await prisma.volumePrice.deleteMany({ where: { volumeId } }).catch(() => {})
            await prisma.priceHistory.deleteMany({ where: { volumeId } }).catch(() => {})
            await prisma.volume.delete({ where: { id: volumeId } }).catch(() => {})
            await prisma.manga.delete({ where: { id: vol.mangaId } }).catch(() => {})
          } else {
            await prisma.volume.update({
              where: { id: volumeId },
              data: { polishReleaseDate: null },
            }).catch(() => {})
          }
        } else {
          await prisma.volume.update({
            where: { id: volumeId },
            data: { polishReleaseDate: null },
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({
      success: true,
      id,
      message: 'Premiera została pomyślnie usunięta z kalendarza',
    })
  } catch (error) {
    console.error('Błąd podczas usuwania premiery:', error)
    return NextResponse.json({ error: 'Błąd podczas usuwania premiery' }, { status: 500 })
  }
}
