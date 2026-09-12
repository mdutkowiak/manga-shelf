'use server'

import { prisma } from '@/lib/prisma'
import { ActivityType, VolumeStatus } from '@/generated/prisma/client'
import { searchManga, getMangaById, mapAniListStatus, cleanDescription } from '@/lib/anilist'
import { z } from 'zod'

const createMangaSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany'),
  nativeTitle: z.string().optional(),
  polishTitle: z.string().optional(),
  description: z.string().optional(),
  defaultCover: z.string().url().optional().or(z.literal('')),
  customCoverUrl: z.string().optional().nullable(),
  anilistId: z.number().int().positive().optional(),
  malId: z.number().int().positive().optional(),
  statusInPoland: z.enum(['ONGOING', 'FINISHED', 'CANCELLED', 'HIATUS', 'UNKNOWN']).optional(),
  totalVolumesJapan: z.number().int().positive().optional().nullable(),
  totalVolumesPoland: z.number().int().positive().optional().nullable(),
  publisherId: z.string().cuid().optional(),
})

const updateMangaSchema = createMangaSchema.partial()

const createVolumeSchema = z.object({
  mangaId: z.string().cuid(),
  volumeNumber: z.number().int().positive(),
  isbn: z.string().optional(),
  polishReleaseDate: z.string().datetime().optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  customCoverUrl: z.string().optional().nullable(),
  pricePLN: z.number().positive().optional(),
  description: z.string().optional(),
})

const bulkCreateVolumesSchema = z.object({
  mangaId: z.string().cuid(),
  startVolume: z.number().int().positive(),
  endVolume: z.number().int().positive(),
  basePrice: z.number().positive().optional(),
  baseIsbn: z.string().optional(),
})

export type CreateMangaInput = z.infer<typeof createMangaSchema>
export type UpdateMangaInput = z.infer<typeof updateMangaSchema>
export type CreateVolumeInput = z.infer<typeof createVolumeSchema>
export type BulkCreateVolumesInput = z.infer<typeof bulkCreateVolumesSchema>

// ===========================================
// MANGA OPERATIONS
// ===========================================

export async function searchMangaFromAniList(query: string, page = 1) {
  const result = await searchManga(query, page, 10)
  return result.data.Page
}

export async function getMangaFromAniList(id: number) {
  const result = await getMangaById(id)
  return result.data.Media
}

export async function importMangaFromAniList(anilistId: number, publisherId?: string) {
  const anilistManga = await getMangaFromAniList(anilistId)

  const existingManga = await prisma.manga.findUnique({
    where: { anilistId },
  })

  if (existingManga) {
    return { success: false, error: 'Manga jest już w bazie danych', manga: existingManga }
  }

  const manga = await prisma.manga.create({
    data: {
      title: anilistManga.title.romaji,
      nativeTitle: anilistManga.title.native,
      polishTitle: anilistManga.title.english,
      description: cleanDescription(anilistManga.description),
      defaultCover: anilistManga.coverImage.large,
      anilistId: anilistManga.id,
      statusInPoland: mapAniListStatus(anilistManga.status),
      totalVolumesJapan: anilistManga.volumes || null,
      publisherId,
    },
  })

  return { success: true, manga }
}

export async function createManga(data: CreateMangaInput) {
  const validated = createMangaSchema.safeParse(data)

  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors }
  }

  const manga = await prisma.manga.create({
    data: {
      ...validated.data,
      defaultCover: validated.data.defaultCover || undefined,
    },
  })

  return { success: true, manga }
}

export async function updateManga(id: string, data: UpdateMangaInput) {
  const validated = updateMangaSchema.safeParse(data)

  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors }
  }

  const manga = await prisma.manga.update({
    where: { id },
    data: {
      ...validated.data,
      defaultCover: validated.data.defaultCover || undefined,
    },
  })

  return { success: true, manga }
}

export async function deleteManga(id: string) {
  await prisma.manga.delete({ where: { id } })
  return { success: true }
}

export async function getMangaByIdFromDB(id: string) {
  const manga = await prisma.manga.findUnique({
    where: { id },
    include: {
      publisher: true,
      volumes: {
        orderBy: { volumeNumber: 'asc' },
      },
    },
  })

  return manga
}

export async function getAllMangas(page = 1, limit = 20, search?: string) {
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { polishTitle: { contains: search, mode: 'insensitive' as const } },
          { nativeTitle: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [mangas, total] = await Promise.all([
    prisma.manga.findMany({
      where,
      include: {
        publisher: true,
        _count: { select: { volumes: true } },
      },
      orderBy: { title: 'asc' },
      skip,
      take: limit,
    }),
    prisma.manga.count({ where }),
  ])

  return {
    mangas,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ===========================================
// VOLUME OPERATIONS
// ===========================================

export async function createVolume(data: CreateVolumeInput) {
  const validated = createVolumeSchema.safeParse(data)

  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors }
  }

  const existingVolume = await prisma.volume.findUnique({
    where: {
      mangaId_volumeNumber: {
        mangaId: validated.data.mangaId,
        volumeNumber: validated.data.volumeNumber,
      },
    },
  })

  if (existingVolume) {
    return { success: false, error: 'Tom o tym numerze już istnieje' }
  }

  const volume = await prisma.volume.create({
    data: {
      ...validated.data,
      polishReleaseDate: validated.data.polishReleaseDate
        ? new Date(validated.data.polishReleaseDate)
        : undefined,
      coverImage: validated.data.coverImage || undefined,
    },
  })

  return { success: true, volume }
}

export async function bulkCreateVolumes(data: BulkCreateVolumesInput) {
  const validated = bulkCreateVolumesSchema.safeParse(data)

  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors }
  }

  const { mangaId, startVolume, endVolume, basePrice, baseIsbn } = validated.data
  const volumes = []

  for (let i = startVolume; i <= endVolume; i++) {
    const existingVolume = await prisma.volume.findUnique({
      where: {
        mangaId_volumeNumber: {
          mangaId,
          volumeNumber: i,
        },
      },
    })

    if (!existingVolume) {
      const volume = await prisma.volume.create({
        data: {
          mangaId,
          volumeNumber: i,
          pricePLN: basePrice,
          isbn: baseIsbn ? `${baseIsbn}${i}` : undefined,
        },
      })
      volumes.push(volume)
    }
  }

  return { success: true, count: volumes.length, volumes }
}

export async function updateVolume(id: string, data: Partial<CreateVolumeInput>) {
  const volume = await prisma.volume.update({
    where: { id },
    data: {
      ...data,
      polishReleaseDate: data.polishReleaseDate ? new Date(data.polishReleaseDate) : undefined,
    },
  })

  return { success: true, volume }
}

export async function deleteVolume(id: string) {
  await prisma.volume.delete({ where: { id } })
  return { success: true }
}

// ===========================================
// PUBLISHER OPERATIONS
// ===========================================

export async function getAllPublishers() {
  const publishers = await prisma.publisher.findMany({
    include: {
      _count: { select: { mangas: true } },
    },
    orderBy: { name: 'asc' },
  })

  return publishers
}

export async function createPublisher(data: { name: string; website?: string }) {
  const publisher = await prisma.publisher.create({ data })
  return { success: true, publisher }
}

// ===========================================
// COLLECTION OPERATIONS
// ===========================================

async function logActivity(
  userId: string,
  type: ActivityType,
  volumeId?: string | null,
  mangaId?: string | null,
  content?: string | null
) {
  try {
    await prisma.activity.create({
      data: {
        type,
        userId,
        volumeId: volumeId || null,
        mangaId: mangaId || null,
        content: content || null,
      },
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

export async function toggleVolumeInCollection(
  userId: string,
  volumeId: string,
  purchasePrice?: number | null
) {
  // Pobierz info o volume do logowania
  const volume = await prisma.volume.findUnique({
    where: { id: volumeId },
    select: { mangaId: true, volumeNumber: true, manga: { select: { title: true } } },
  })

  const existing = await prisma.userCollection.findUnique({
    where: {
      userId_volumeId: { userId, volumeId },
    },
  })

  if (existing) {
    if (existing.status === 'OWNED') {
      await prisma.userCollection.delete({
        where: { id: existing.id },
      })
      await logActivity(userId, ActivityType.REMOVED_FROM_COLLECTION, volumeId, volume?.mangaId, volume?.manga.title)
      return { success: true, status: null }
    } else {
      await prisma.userCollection.update({
        where: { id: existing.id },
        data: {
          status: VolumeStatus.OWNED,
          purchasePrice: purchasePrice ?? existing.purchasePrice,
        },
      })
      await logActivity(userId, ActivityType.ADDED_TO_COLLECTION, volumeId, volume?.mangaId, volume?.manga.title)
      return { success: true, status: VolumeStatus.OWNED }
    }
  } else {
    const collection = await prisma.userCollection.create({
      data: {
        userId,
        volumeId,
        status: VolumeStatus.OWNED,
        purchasePrice: purchasePrice ?? null,
      },
    })
    await logActivity(userId, ActivityType.ADDED_TO_COLLECTION, volumeId, volume?.mangaId, volume?.manga.title)
    return { success: true, status: collection.status }
  }
}

export async function updateCollectionStatus(
  userId: string,
  volumeId: string,
  status: VolumeStatus,
  purchasePrice?: number | null,
  userRating?: number | null
) {
  // Pobierz info o volume do logowania
  const volume = await prisma.volume.findUnique({
    where: { id: volumeId },
    select: { mangaId: true, volumeNumber: true, manga: { select: { title: true } } },
  })

  const existing = await prisma.userCollection.findUnique({
    where: {
      userId_volumeId: { userId, volumeId },
    },
  })

  if (existing) {
    await prisma.userCollection.update({
      where: { id: existing.id },
      data: {
        status,
        purchasePrice: purchasePrice !== undefined ? purchasePrice : existing.purchasePrice,
        userRating: userRating !== undefined ? userRating : existing.userRating,
      },
    })
    await logActivity(userId, ActivityType.STATUS_CHANGED, volumeId, volume?.mangaId, status)
    return { success: true, status }
  } else {
    const collection = await prisma.userCollection.create({
      data: {
        userId,
        volumeId,
        status,
        purchasePrice: purchasePrice ?? null,
        userRating: userRating ?? null,
      },
    })
    await logActivity(userId, ActivityType.ADDED_TO_COLLECTION, volumeId, volume?.mangaId, volume?.manga.title)
    return { success: true, status: collection.status }
  }
}

export async function getUserCollection(userId: string) {
  const collection = await prisma.userCollection.findMany({
    where: { userId },
    include: {
      volume: {
        include: {
          manga: {
            include: {
              publisher: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return collection
}

export async function getCollectionStats(userId: string) {
  const stats = await prisma.userCollection.aggregate({
    where: {
      userId,
      status: 'OWNED',
    },
    _count: true,
    _sum: {
      userRating: true,
    },
  })

  const mangaCount = await prisma.userCollection.groupBy({
    by: ['volumeId'],
    where: {
      userId,
      status: 'OWNED',
    },
    _count: { volumeId: true },
  })

  return {
    totalVolumes: (stats._count as number) || 0,
    totalValue: 0,
    uniqueManga: mangaCount.length,
  }
}
