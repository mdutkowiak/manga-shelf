'use server'

import { searchManga as searchAniList } from '@/lib/anilist'

export interface SearchResult {
  id: number
  title: {
    romaji: string
    english: string | null
  }
  coverImage: {
    large: string
  }
  status: string
  volumes: number | null
}

export async function searchMangaFromAniList(
  query: string,
  page = 1
): Promise<{ media: SearchResult[] }> {
  const result = await searchAniList(query, page, 10)

  const media = result.data.Page.media.map((manga) => ({
    id: manga.id,
    title: manga.title,
    coverImage: manga.coverImage,
    status: manga.status,
    volumes: manga.volumes,
  }))

  return { media }
}
