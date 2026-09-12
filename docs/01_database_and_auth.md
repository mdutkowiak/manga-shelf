# Baza Danych i Autentykacja

## Technologie

| Komponent    | Technologia           |
| ------------ | --------------------- |
| ORM          | Prisma 7.9.1          |
| Baza Danych  | PostgreSQL 15         |
| Autentykacja | Auth.js (NextAuth v5) |
| Hasła        | bcryptjs              |

## Schemat Bazy Danych

### Diagram ER

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │  Publisher  │       │    Manga    │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email (UQ)  │       │ name (UQ)   │       │ title       │
│ password    │       │ website     │       │ nativeTitle │
│ name        │       │ logo        │       │ polishTitle │
│ role        │       │ createdAt   │       │ description │
│ image       │       │ updatedAt   │       │ defaultCover│
│ createdAt   │       └─────────────┘       │ anilistId   │
│ updatedAt   │              │              │ malId       │
└─────────────┘              │              │ statusInPL  │
       │                     │              │ publisherId │
       │                     └──────────────┤ createdAt   │
       │                                    │ updatedAt   │
       │                                    └─────────────┘
       │                                           │
       │                                    ┌─────────────┐
       │                                    │   Volume    │
       │                                    ├─────────────┤
       │                                    │ id (PK)     │
       │                                    │ volumeNumber│
       │                                    │ isbn (UQ)   │
       │                                    │ releaseDate │
       │                                    │ coverImage  │
       │                                    │ pricePLN    │
       │                                    │ mangaId (FK)│
       │                                    └─────────────┘
       │                                           │
       │                                    ┌─────────────┐
       └────────────────────────────────────│UserCollection│
                                            ├─────────────┤
                                            │ id (PK)     │
                                            │ status      │
                                            │ userRating  │
                                            │ notes       │
                                            │ userId (FK) │
                                            │ volumeId(FK)│
                                            └─────────────┘
```

### Modele

#### User

Przechowuje dane użytkowników aplikacji.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      UserRole @default(USER)
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  collections UserCollection[]
}
```

**Role:**

- `USER` - zwykły użytkownik
- `ADMIN` - administrator (dostęp do panelu admina)

#### Publisher

Wydawcy mangi w Polsce (np. Waneko, Studio JG, JPF).

```prisma
model Publisher {
  id        String @id @default(cuid())
  name      String @unique
  website   String?
  logo      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  mangas Manga[]
}
```

#### Manga

Główna encja mangi z danymi z AniList i polskiego rynku.

```prisma
model Manga {
  id               String           @id @default(cuid())
  title            String
  nativeTitle      String?          // Japoński tytuł
  polishTitle      String?          // Polski tytuł
  description      String?
  defaultCover     String?          // URL okładki
  anilistId        Int?             @unique
  malId            Int?             @unique
  statusInPoland   PolishMangaStatus @default(UNKNOWN)
  publisherId      String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  publisher Publisher? @relation(fields: [publisherId], references: [id])
  volumes   Volume[]
}
```

**Status polskiego wydania:**

- `ONGOING` - wychodzi
- `FINISHED` - zakończone
- `CANCELLED` - anulowane
- `HIATUS` - przerwa
- `UNKNOWN` - nieznany

#### Volume

Poszczególne tomy mangi z danymi polskiego wydania.

```prisma
model Volume {
  id                String   @id @default(cuid())
  volumeNumber      Int
  isbn              String?  @unique
  polishReleaseDate DateTime?
  coverImage        String?
  pricePLN          Float?
  description       String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  mangaId String
  manga   Manga @relation(fields: [mangaId], references: [id])

  collections UserCollection[]

  @@unique([mangaId, volumeNumber])
}
```

#### UserCollection

Kolekcja użytkownika - śledzenie posiadanych tomów.

```prisma
model UserCollection {
  id        String       @id @default(cuid())
  status    VolumeStatus @default(WISHLIST)
  userRating Int?        // 1-10
  notes     String?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  userId   String
  volumeId String

  user   User   @relation(fields: [userId], references: [id])
  volume Volume @relation(fields: [volumeId], references: [id])

  @@unique([userId, volumeId])
}
```

**Status kolekcji:**

- `OWNED` - posiadany
- `READ` - przeczytany
- `WISHLIST` - lista życzeń
- `ORDERED` - zamówiony
- `PREORDER` - preorder

## Autentykacja

### Konfiguracja Auth.js

Plik: `src/lib/auth.ts`

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      async authorize(credentials) {
        // Weryfikacja email + hasło
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Dodanie roli do tokena
    },
    async session({ session, token }) {
      // Dodanie roli do sesji
    },
  },
})
```

### Middleware Ochrony Tras

Plik: `src/middleware.ts`

```typescript
export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
```

### Server Action - Rejestracja

Plik: `src/lib/actions/auth.ts`

```typescript
'use server'

export async function register(data: RegisterInput) {
  // Walidacja danych
  // Hashowanie hasła
  // Tworzenie użytkownika
}
```

## Polecenia Prisma

```bash
# Generowanie klienta
npx prisma generate

# Tworzenie migracji
npx prisma migrate dev --name init

# Nakładanie migracji (produkcja)
npx prisma migrate deploy

# Reset bazy danych
npx prisma migrate reset

# Przeglądanie danych (Studio)
npx prisma studio

# Pull schematu z istniejącej bazy
npx prisma db pull
```

## Zmienne Środowiskowe

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/manga_shelf"

# Auth
NEXTAUTH_SECRET="secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Typy Session

Dodaj rozszerzenie typów w `src/types/next-auth.d.ts`:

```typescript
import 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
  }

  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    id: string
  }
}
```
