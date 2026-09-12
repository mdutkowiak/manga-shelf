# Silnik Danych Mangi - Integracja AniList + Polskie Wydania

## Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                      Manga Data Engine                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │  AniList    │    │  Database   │    │   Admin     │    │
│  │   API       │◄──►│  (Prisma)   │◄──►│   Panel     │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │  GraphQL    │    │  PostgreSQL │    │  Server     │    │
│  │  Client     │    │  Database   │    │  Actions    │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Serwis AniList API

### Lokalizacja

`src/lib/anilist.ts`

### Funkcje

#### searchManga(query, page?, perPage?)

Wyszukuje manga w AniList po tytule.

```typescript
const results = await searchManga('Attack on Titan', 1, 10)
// Zwraca: { data: { Page: { pageInfo, media: [...] } } }
```

#### getMangaById(id)

Pobiera szczegóły mangi po ID AniList.

```typescript
const manga = await getMangaById(12345)
// Zwraca: { data: { Media: { id, title, ... } } }
```

#### mapAniListStatus(status)

Mapuje status AniList na status polski.

```typescript
mapAniListStatus('RELEASING') // -> 'ONGOING'
mapAniListStatus('FINISHED') // -> 'FINISHED'
mapAniListStatus('HIATUS') // -> 'HIATUS'
```

#### cleanDescription(description)

Czyści opis z tagów HTML.

```typescript
cleanDescription('<p>Attack on Titan</p>') // -> "Attack on Titan"
```

## Moduł Hybrydowy

### Import z AniList

```typescript
// src/lib/actions/manga.ts

export async function importMangaFromAniList(anilistId: number, publisherId?: string) {
  // 1. Pobiera dane z AniList API
  // 2. Sprawdza czy manga już istnieje w bazie
  // 3. Tworzy nowy rekord z danymi z AniList
  // 4. Opcjonalnie przypisuje polskiego wydawcę
}
```

### Przykład użycia

```typescript
import { importMangaFromAniList } from '@/lib/actions/manga'

// Import manga z AniList
const result = await importMangaFromAniList(12345, 'publisher-id-waneko')

if (result.success) {
  console.log('Zaimportowano:', result.manga.title)
} else {
  console.log('Błąd:', result.error)
}
```

## Zarządzanie Tomami

### Kreator Tomów (Bulk Create)

Umożliwia szybkie tworzenie wielu tomów naraz.

```typescript
import { bulkCreateVolumes } from '@/lib/actions/manga'

// Utwórz tomy 1-20 dla serii X
const result = await bulkCreateVolumes({
  mangaId: 'manga-id',
  startVolume: 1,
  endVolume: 20,
  basePrice: 29.99,
  baseIsbn: '978-83-',
})

console.log(`Utworzono ${result.count} tomów`)
```

### Tworzenie Pojedynczego Tomu

```typescript
import { createVolume } from '@/lib/actions/manga'

const result = await createVolume({
  mangaId: 'manga-id',
  volumeNumber: 1,
  isbn: '978-83-1234567-8',
  polishReleaseDate: '2024-03-15T00:00:00.000Z',
  pricePLN: 29.99,
  coverImage: 'https://example.com/cover.jpg',
})
```

## Zarządzanie Kolekcją

### Przełączanie Tomu w Kolekcji

```typescript
import { toggleVolumeInCollection } from '@/lib/actions/manga'

// Kliknięcie w okładkę tomu
const result = await toggleVolumeInCollection('user-id', 'volume-id')

if (result.status === 'OWNED') {
  // Tom dodany do kolekcji
} else {
  // Tom usunięty z kolekcji
}
```

### Pobieranie Kolekcji Użytkownika

```typescript
import { getUserCollection } from '@/lib/actions/manga'

const collection = await getUserCollection('user-id')
// Zwraca listę tomów z danymi mangi i wydawcy
```

### Statystyki Kolekcji

```typescript
import { getCollectionStats } from '@/lib/actions/manga'

const stats = await getCollectionStats('user-id')
// {
//   totalVolumes: 45,
//   totalValue: 1349.55,
//   uniqueManga: 12
// }
```

## GraphQL Queries AniList

### Wyszukiwanie

```graphql
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
        large
        medium
      }
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
    }
  }
}
```

### Pobieranie po ID

```graphql
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
      large
      medium
    }
    status
    chapters
    volumes
    meanScore
    genres
  }
}
```

## Status Mangi w Polsce

| Status      | Opis                |
| ----------- | ------------------- |
| `ONGOING`   | Wychodzi regularnie |
| `FINISHED`  | Zakończone wydanie  |
| `CANCELLED` | Wydanie anulowane   |
| `HIATUS`    | Przerwa w wydawaniu |
| `UNKNOWN`   | Nieznany status     |

## Status Kolekcji

| Status     | Opis         |
| ---------- | ------------ |
| `OWNED`    | Posiadany    |
| `READ`     | Przeczytany  |
| `WISHLIST` | Lista życzeń |
| `ORDERED`  | Zamówiony    |
| `PREORDER` | Preorder     |

## Błędy i Obsługa

### Typowe Błędy

```typescript
const result = await createManga({ title: '' })

if (!result.success) {
  // result.error zawiera błędy walidacji
  // { title: ['Tytuł jest wymagany'] }
}
```

### Walidacja Danych

Wszystkie dane wejściowe są walidowane za pomocą Zod:

```typescript
const createMangaSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany'),
  anilistId: z.number().int().positive().optional(),
  // ...
})
```

## Cache'owanie

Dane z AniList są cache'owane przez 1 godzinę:

```typescript
const response = await fetch(ANILIST_API_URL, {
  next: { revalidate: 3600 },
})
```

## Przyszłe Rozszerzenia

1. **WebSocket** - powiadomienia o nowych datach premier
2. **Crawling** - automatyczne pobieranie cen z Ceneo.pl
3. **OCR** - skanowanie kodów ISBN z okładek
4. **AI** - rekomendacje na podstawie kolekcji
