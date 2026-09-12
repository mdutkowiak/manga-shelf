# Manga Shelf Tracker - Przegląd Projektu

## Cel Projektu

**Manga Shelf Tracker** to aplikacja webowa/PWA do zarządzania kolekcją mangi z naciskiem na polski rynek wydawniczy. Aplikacja umożliwia:

- Śledzenie posiadanych tomów mangi
- Monitorowanie dat premier polskich wydań
- Zarządzanie kolekcją (posiadane, brakujące, lista życzeń)
- Wycenę kolekcji w PLN
- Automatyczną synchronizację danych z AniList API
- Instalację na urządzeniach mobilnych (PWA)

## Stack Technologiczny

| Warstwa        | Technologia                              |
| -------------- | ---------------------------------------- |
| Framework      | Next.js 16+ (App Router, Server Actions) |
| Język          | TypeScript                               |
| Baza Danych    | PostgreSQL                               |
| ORM            | Prisma                                   |
| Style          | Tailwind CSS                             |
| UI Components  | Shadcn/UI                                |
| Ikony          | Lucide Icons                             |
| PWA            | Next-PWA                                 |
| API Zewnętrzne | AniList (GraphQL)                        |
| Konteneryzacja | Docker Compose                           |
| Deploy         | SSH / Rsync / Git                        |

## Struktura Projektu

```
manga-shelf/
├── src/
│   ├── app/                    # App Router (strony, layouty, API routes)
│   │   ├── (auth)/             # Grupa tras autentykacji
│   │   ├── (dashboard)/        # Główny panel użytkownika
│   │   ├── admin/              # Panel administracyjny
│   │   ├── api/                # API Routes
│   │   ├── layout.tsx          # Główny layout
│   │   └── page.tsx            # Strona główna
│   ├── components/             # Komponenty React
│   │   ├── ui/                 # Komponenty Shadcn/UI
│   │   ├── manga/              # Komponenty manga
│   │   └── layout/             # Komponenty layoutu
│   ├── lib/                    # Utility functions, serwisy
│   │   ├── anilist.ts          # Client AniList API
│   │   ├── prisma.ts           # Client Prisma
│   │   └── auth.ts             # Logika autentykacji
│   └── types/                  # Typy TypeScript
├── prisma/
│   └── schema.prisma           # Schemat bazy danych
├── public/                     # Statyczne zasoby
├── docs/                       # Dokumentacja projektu
├── scripts/                    # Skrypty deploymentowe
├── docker-compose.yml          # Docker Compose (dev)
├── docker-compose.prod.yml     # Docker Compose (produkcja)
├── Dockerfile                  # Build Docker
├── tailwind.config.ts          # Konfiguracja Tailwind
└── package.json
```

## Funkcje Kluczowe

### Dla Użytkownika

- 📚 Przeglądanie kolekcji manga w formie siatki okładek
- 🎨 Wizualny stan tomów (kolorowe = posiadane, wyszarzone = brakujące)
- ⚡ Optimistic UI - natychmiastowa aktualizacja interfejsu
- 🔍 Filtrowanie po statusie, wydawcy, wadze kolekcji
- 📱 Instalacja PWA na iOS/Android
- 🔒 Prywatna kolekcja (wymaga logowania)

### Dla Administratora

- ➕ Szybkie dodawanie polskich wydań
- 📦 Masowy import tomów (generator tomów 1-20)
- 👥 Zarządzanie użytkownikami
- 📊 Statystyki kolekcji

## Fazy Rozwoju

| Faza | Opis                                 | Status      |
| ---- | ------------------------------------ | ----------- |
| 1    | Inicjalizacja i Dokumentacja         | 🔄 W toku   |
| 2    | Baza Danych i Autentykacja           | ⏳ Oczekuje |
| 3    | Integracja AniList + Polskie Wydania | ⏳ Oczekuje |
| 4    | UI/UX i Interaktywna Półka           | ⏳ Oczekuje |
| 5    | Panel Admina i PWA                   | ⏳ Oczekuje |
| 6    | Docker i Deploy SSH                  | ⏳ Oczekuje |

## Środowisko Deweloperskie

### Wymagania

- Node.js 18+
- npm 9+
- PostgreSQL 15+ (lub Docker)
- Git

### Uruchomienie

```bash
# Instalacja zależności
npm install

# Uruchomienie开发serwera
npm run dev

# Budowanie
npm run build

# Formatowanie kodu
npm run format

# Linting
npm run lint
```

## Dekyzje Architektoniczne

1. **App Router** - preferowany nad Pages Router dla lepszej obsługi Server Components
2. **Server Actions** - do mutations zamiast tradycyjnych API Routes
3. **Prisma** - typowanie end-to-end z TypeScript
4. **Shadcn/UI** - komponenty copy-paste z pełną kontrolą nad kodem
5. **PWA** - offline-first dla mobilnych użytkowników
