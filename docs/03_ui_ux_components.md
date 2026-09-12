# Interfejs Użytkownika (UI/UX) i Interaktywna Półka

## Stack UI

| Komponent     | Technologia              |
| ------------- | ------------------------ |
| CSS Framework | Tailwind CSS v4          |
| Komponenty    | Shadcn/UI                |
| Ikony         | Lucide Icons             |
| Fonty         | Geist Sans + Geist Mono  |
| Layout        | Mobile First, Responsive |

## Architektura Komponentów

```
src/
├── components/
│   ├── layout/
│   │   ├── layout.tsx           # Główny layout z SessionProvider
│   │   ├── desktop-sidebar.tsx  # Boczny panel (desktop)
│   │   ├── header.tsx           # Header z menu (mobile)
│   │   ├── bottom-nav.tsx       # Dolna nawigacja (mobile)
│   │   └── mobile-nav.tsx       # Panel nawigacji (sheet)
│   ├── manga/
│   │   ├── manga-cover.tsx      # Okładka tomu z optimistic UI
│   │   ├── collection-grid.tsx  # Siatka kolekcji
│   │   ├── collection-filter.tsx # Filtry
│   │   └── collection-stats.tsx # Statystyki
│   └── ui/                      # Komponenty Shadcn/UI
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── badge.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       └── tabs.tsx
```

## Layout Responsywny

### Breakpoints

| Urządzenie | Szerokość  | Layout                  |
| ---------- | ---------- | ----------------------- |
| Mobile     | < 768px    | Bottom nav + Sheet menu |
| Tablet     | 768-1024px | Sidebar (skrócony)      |
| Desktop    | > 1024px   | Pełny sidebar           |

### Mobile First

```css
/* Siatka kolekcji */
grid-cols-3                    /* mobile: 3 kolumny */
sm:grid-cols-4                 /* small: 4 kolumny */
md:grid-cols-5                 /* tablet: 5 kolumn */
lg:grid-cols-6                 /* desktop: 6 kolumn */
xl:grid-cols-8                 /* large: 8 kolumn */
```

## Komponenty

### MangaCover - Okładka z Optimistic UI

```typescript
// src/components/manga/manga-cover.tsx

interface MangaCoverProps {
  id: string
  title: string
  coverUrl: string | null
  volumeNumber: number
  isOwned: boolean
  onToggle: (id: string) => Promise<{ success: boolean; status: string | null }>
}
```

**Cechy:**

- Natychmiastowa zmiana stanu (optimistic UI)
- CSS `grayscale` dla nieposiadanych tomów
- Animacja hover (`scale-105`)
- Wskaźnik statusu (zielona ikona = posiadany)
- Overlay z numerem tomu

**Implementacja Optimistic UI:**

```typescript
const handleClick = async () => {
  setIsUpdating(true)
  // 1. Natychmiastowa zmiana UI
  setOwned(!owned)

  try {
    // 2. Wysłanie do serwera
    const result = await onToggle(id)
    if (!result.success) {
      // 3. Cofnięcie w razie błędu
      setOwned(isOwned)
    }
  } catch {
    setOwned(isOwned)
  } finally {
    setIsUpdating(false)
  }
}
```

### CollectionGrid - Siatka Kolekcji

```typescript
// src/components/manga/collection-grid.tsx

interface CollectionGridProps {
  volumes: VolumeWithManga[]
  userId: string
}
```

**Responsywna siatka:**

- Mobile: 3 kolumny
- Tablet: 5 kolumn
- Desktop: 8 kolumn

### CollectionFilter - Filtry

```typescript
// src/components/manga/collection-filter.tsx

interface CollectionFilters {
  status: ('OWNED' | 'WISHLIST' | 'ORDERED')[]
  publishers: string[]
  sortBy: 'title' | 'volumeNumber' | 'pricePLN' | 'releaseDate'
  sortOrder: 'asc' | 'desc'
}
```

**Filtrowanie:**

- Po statusie (posiadane, lista życzeń, zamówione)
- Po wydawcy (checkboxes)
- Sortowanie (tytuł, numer, cena, data)
- Aktywne filtry jako badges

### CollectionStats - Statystyki

```typescript
// src/components/manga/collection-stats.tsx

interface CollectionStatsProps {
  totalVolumes: number // Liczba tomów
  totalValue: number // Wartość w PLN
  uniqueManga: number // Unikalne serie
}
```

## Nawigacja

### Desktop Sidebar

```
┌─────────────────────────┐
│ 📚 Manga Shelf          │
├─────────────────────────┤
│ 🏠 Główna               │
│ 📚 Kolekcja             │
│ 🔍 Szukaj               │
│ 👤 Profil               │
├─────────────────────────┤
│ 🛡️ Panel Admina         │
├─────────────────────────┤
│ Jan Kowalski    [Wyjdź] │
│ USER                    │
└─────────────────────────┘
```

### Mobile Bottom Nav

```
┌─────────────────────────────────────┐
│                                     │
│           (treść)                   │
│                                     │
├─────────────────────────────────────┤
│ 🏠    📚    🔍    👤    🛡️        │
│Główna Kolekcja Szukaj Profil Admin │
└─────────────────────────────────────┘
```

### Mobile Sheet Menu

```
┌─────────────────────────────────────┐
│ ☰ 📚 Manga Shelf                   │
├─────────────────────────────────────┤
│ 🏠 Główna                          │
│ 📚 Kolekcja                        │
│ 🔍 Szukaj                          │
│ 👤 Profil                          │
├─────────────────────────────────────┤
│ 🛡️ Panel Admina                    │
├─────────────────────────────────────┤
│ Jan Kowalski              [Wyjdź]  │
│ USER                               │
└─────────────────────────────────────┘
```

## Strony

### / - Strona Główna

- Powitanie
- Szybkie akcje (kolekcja, szukaj, dodaj)

### /collection - Kolekcja

- Statystyki (tomy, wartość, serie)
- Filtry i sortowanie
- Siatka okładek

### /search - Wyszukiwanie

- Wyszukiwarka AniList
- Lista wyników z okładkami
- Przycisk "Dodaj" do kolekcji

## Animacje i Przejścia

### Hover Effects

```css
hover:scale-105        /* Powiększenie okładki */
hover:shadow-lg        /* Cień */
transition-all         /* Płynna animacja */
duration-200           /* 200ms */
```

### Loading States

```css
animate-spin           /* Spinner */
opacity-70             /* Przyciemnienie podczas ładowania */
cursor-wait            /* Kursor oczekiwania */
```

## Dostępność

- Focus rings na interaktywnych elementach
- Aria labels na przyciskach
- Keyboard navigation
- Semantic HTML (nav, main, header)
- Kontrast kolorów (WCAG AA)

## Przyszłe Rozszerzenia

1. **Dark Mode** - przełącznik motywu
2. **Gest** - swipe na okładkach
3. **Animacje** - Framer Motion
4. **Virtualized Grid** - wydajność przy 1000+ tomów
5. **Skeleton Loading** - placeholders podczas ładowania
