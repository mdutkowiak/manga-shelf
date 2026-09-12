# Panel Administracyjny i PWA

## Panel Administracyjny

### Dostęp

- URL: `/admin`
- Wymagana rola: `ADMIN`
- Ochrona przez middleware

### Struktura

```
/admin
├── layout.tsx           # Layout admina z nawigacją
├── page.tsx             # Dashboard ze statystykami
├── manga/
│   ├── page.tsx         # Lista mang
│   ├── new/
│   │   └── page.tsx     # Dodawanie manga (z importem AniList)
│   └── bulk/
│       └── page.tsx     # Masowy import tomów
├── publishers/
│   └── page.tsx         # Zarządzanie wydawcami
└── users/
    └── page.tsx         # Zarządzanie użytkownikami
```

### Dashboard

Wyświetla:

- Statystyki (manga, tomów, użytkownicy, wartość)
- Ostatnie aktywności
- Szybkie akcje

### Zarządzanie Mangą

#### Lista Mang

- Tabela z okładką, tytułem, wydawcą, statusem, liczbą tomów
- Wyszukiwanie
- Akcje: edytuj, tomy, usuń

#### Dodawanie Manga

- Import z AniList (wyszukiwarka)
- Formularz z danymi manga
- Podgląd okładki
- Walidacja danych

#### Masowy Import

- Tworzenie tomów 1-20 naraz
- Cena bazowa i ISBN
- Podgląd liczby tomów

### Zarządzanie Wydawcami

- Lista wydawców z liczbą mang
- Dodawanie/edycja (dialog)
- Link do strony WWW
- Usuwanie

### Zarządzanie Użytkownikami

- Lista użytkowników
- Zmiana roli (USER/ADMIN)
- Liczba tomów w kolekcji
- Usuwanie

## PWA (Progressive Web App)

### Konfiguracja

#### manifest.json

```json
{
  "name": "Manga Shelf Tracker",
  "short_name": "Manga Shelf",
  "display": "standalone",
  "theme_color": "#000000",
  "icons": [...]
}
```

#### Service Worker (sw.js)

- Cache'owanie statycznych assetów
- Offline-first dla obrazków
- Stale-while-revalidate dla stron
- Strona offline fallback

### Funkcje PWA

#### Instalacja

- Automatyczny prompt "Dodaj do ekranu głównego"
- Przycisk instalacji w komponencie `PWAInstall`
- Zapamiętanie odrzucenia (localStorage)

#### Cache'owanie

| Cache        | Zawartość            |
| ------------ | -------------------- |
| `static-v1`  | Strony HTML, CSS, JS |
| `dynamic-v1` | Dynamiczne zasoby    |
| `images-v1`  | Okładki manga        |

#### Offline

- Strona `/offline` z komunikatem
- Fallback do cache'a dla nawigacji
- Obrazki z cache'a

### Ikony PWA

Wymagane rozmiary ikon:

- 72x72, 96x96, 128x128, 144x144
- 152x152, 192x192, 384x384, 512x512

Ikony powinny być w formacie PNG z przezroczystością.

### Aktualizacje

Service Worker automatycznie:

1. Pobiera nową wersję przy odświeżeniu
2. Instaluje nowe cache
3. Czysci stare cache po aktywacji
4. Powiadamia użytkownika o aktualizacji

## Typy i Interfejsy

### Publisher

```typescript
interface Publisher {
  id: string
  name: string
  website: string | null
  _count: { mangas: number }
}
```

### User (Admin View)

```typescript
interface AdminUser {
  id: string
  name: string | null
  email: string
  role: 'USER' | 'ADMIN'
  _count: { collections: number }
}
```

## Bezpieczeństwo

- Middleware chroni trasy `/admin/*`
- Wymagana rola ADMIN w session
- WALIDACJA danych wejściowych (Zod)
- CSRF protection (NextAuth)

## Przyszłe Rozszerzenia

1. **Analytics** - wykresy aktywności
2. **Bulk Edit** - masowa edycja ISBN/cen
3. **Import CSV** - import z plików CSV
4. **Export** - eksport kolekcji
5. **Notifications** - powiadomienia push
