import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { isForeignCover } from '@/lib/cover-utils'

const PLACEHOLDER_PRICE = 34.99

interface Plan {
  clearCoverImage: string[]
  clearCustomCover: string[]
  clearPrice: string[]
  series: Set<string>
}

/** Wyznacza, co naprawić: obce okładki w tomach serii z polską okładką i ceny zastępcze bez źródła. */
async function buildPlan(): Promise<Plan> {
  const plan: Plan = { clearCoverImage: [], clearCustomCover: [], clearPrice: [], series: new Set() }
  const mangas = await prisma.manga.findMany({
    select: {
      id: true,
      title: true,
      customCoverUrl: true,
      defaultCover: true,
      volumes: { select: { id: true, coverImage: true, customCoverUrl: true, pricePLN: true, fieldMeta: true } },
    },
  })
  for (const m of mangas) {
    const polishSeries =
      Boolean(m.customCoverUrl && !isForeignCover(m.customCoverUrl)) ||
      Boolean(m.defaultCover && !isForeignCover(m.defaultCover))
    for (const v of m.volumes) {
      if (polishSeries && isForeignCover(v.coverImage)) {
        plan.clearCoverImage.push(v.id)
        plan.series.add(m.title)
      }
      if (polishSeries && isForeignCover(v.customCoverUrl)) {
        plan.clearCustomCover.push(v.id)
        plan.series.add(m.title)
      }
      const meta = (v.fieldMeta && typeof v.fieldMeta === 'object' ? v.fieldMeta : {}) as Record<string, unknown>
      if (v.pricePLN === PLACEHOLDER_PRICE && !meta.pricePLN) {
        plan.clearPrice.push(v.id)
        plan.series.add(m.title)
      }
    }
  }
  return plan
}

/**
 * Jednorazowa naprawa danych po błędzie synchronizacji kolekcji (użytkownicy nadpisywali wspólne tomy).
 * Bez `apply: true` tylko raportuje, co zmieni.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const apply = body?.apply === true
  const plan = await buildPlan()
  // Dawny status READ (posiadany i przeczytany) -> OWNED + isRead (kolekcje użytkowników migrują się też przy każdym zapisie)
  const legacyRead = await prisma.userCollection.count({ where: { status: 'READ' } })

  if (apply) {
    await prisma.$transaction([
      prisma.volume.updateMany({ where: { id: { in: plan.clearCoverImage } }, data: { coverImage: null } }),
      prisma.volume.updateMany({ where: { id: { in: plan.clearCustomCover } }, data: { customCoverUrl: null } }),
      prisma.volume.updateMany({ where: { id: { in: plan.clearPrice } }, data: { pricePLN: null } }),
      prisma.userCollection.updateMany({ where: { status: 'READ' }, data: { status: 'OWNED', isRead: true } }),
    ])
  }

  return NextResponse.json({
    applied: apply,
    foreignCoverImages: plan.clearCoverImage.length,
    foreignCustomCovers: plan.clearCustomCover.length,
    placeholderPrices: plan.clearPrice.length,
    legacyRead,
    seriesAffected: plan.series.size,
    sampleSeries: Array.from(plan.series).slice(0, 15),
  })
}
