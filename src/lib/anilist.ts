const ANILIST_API_URL = process.env.ANILIST_API_URL || 'https://graphql.anilist.co'

export interface AniListManga {
  id: number
  title: {
    romaji: string
    english: string | null
    native: string | null
  }
  description: string | null
  coverImage: {
    extraLarge?: string
    large: string
    medium: string
    color?: string
  }
  bannerImage: string | null
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS'
  chapters: number | null
  volumes: number | null
  startDate: {
    year: number | null
    month: number | null
    day: number | null
  } | null
  meanScore: number | null
  genres: string[]
  synonyms: string[]
}

export interface AniListSearchResult {
  data: {
    Page: {
      pageInfo: {
        total: number
        currentPage: number
        lastPage: number
        hasNextPage: boolean
        perPage: number
      }
      media: AniListManga[]
    }
  }
}

export interface AniListMangaResult {
  data: {
    Media: AniListManga
  }
}

const SEARCH_QUERY = `
  query SearchManga($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(search: $search, type: MANGA) {
        id
        title {
          romaji
          english
          native
        }
        description(asHtml: false)
        coverImage {
          extraLarge
          large
          medium
          color
        }
        bannerImage
        status
        chapters
        volumes
        startDate {
          year
          month
          day
        }
        meanScore
        genres
        synonyms
      }
    }
  }
`

const TRENDING_MANGA_QUERY = `
  query TrendingManga($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        hasNextPage
      }
      media(type: MANGA, sort: [TRENDING_DESC, POPULARITY_DESC]) {
        id
        title {
          romaji
          english
          native
        }
        description(asHtml: false)
        coverImage {
          extraLarge
          large
          medium
          color
        }
        bannerImage
        status
        chapters
        volumes
        meanScore
        genres
      }
    }
  }
`

const MANGA_BY_ID_QUERY = `
  query GetMangaById($id: Int) {
    Media(id: $id, type: MANGA) {
      id
      title {
        romaji
        english
        native
      }
      description(asHtml: false)
      coverImage {
        extraLarge
        large
        medium
        color
      }
      bannerImage
      status
      chapters
      volumes
      startDate {
        year
        month
        day
      }
      meanScore
      genres
      synonyms
    }
  }
`

async function fetchAniList<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 }, // Cache for 1 hour
  })

  if (!response.ok) {
    throw new Error(`AniList API error: ${response.status}`)
  }

  const json = await response.json()

  if (json.errors) {
    throw new Error(json.errors[0]?.message || 'AniList API error')
  }

  return json as T
}

export async function searchManga(
  query: string,
  page = 1,
  perPage = 20
): Promise<AniListSearchResult> {
  return fetchAniList<AniListSearchResult>(SEARCH_QUERY, {
    search: query,
    page,
    perPage,
  })
}

export async function getTrendingManga(
  page = 1,
  perPage = 12
): Promise<AniListSearchResult> {
  return fetchAniList<AniListSearchResult>(TRENDING_MANGA_QUERY, {
    page,
    perPage,
  })
}

export async function getMangaById(id: number): Promise<AniListMangaResult> {
  return fetchAniList<AniListMangaResult>(MANGA_BY_ID_QUERY, { id })
}

export function mapAniListStatus(
  status: AniListManga['status']
): 'ONGOING' | 'FINISHED' | 'CANCELLED' | 'HIATUS' {
  const statusMap: Record<AniListManga['status'], 'ONGOING' | 'FINISHED' | 'CANCELLED' | 'HIATUS'> =
    {
      RELEASING: 'ONGOING',
      FINISHED: 'FINISHED',
      CANCELLED: 'CANCELLED',
      HIATUS: 'HIATUS',
      NOT_YET_RELEASED: 'ONGOING',
    }
  return statusMap[status] || 'ONGOING'
}

export function cleanDescription(description: string | null): string | null {
  if (!description) return null
  return description
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/~/g, '')
    .trim()
}
