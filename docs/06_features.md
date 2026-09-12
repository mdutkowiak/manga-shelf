# Dokumentacja Funkcjonalności Manga Shelf Tracker

Dokument zawiera wykaz wszystkich zaimplementowanych i działających modułów systemu **Manga Shelf Tracker**.

---

## Spis Treści
1. [Silnik Wyszukiwania i Baza Mangi](#1-silnik-wyszukiwania-i-baza-mangi)
2. [Zarządzanie Kolekcją i Półka Mangi](#2-zarządzanie-kolekcją-i-półka-mangi)
3. [Profile Użytkowników i Znajomi](#3-profile-użytkowników-i-znajomi)
4. [Sklepy i Porównywarka Cen](#4-sklepy-i-porównywarka-cen)
5. [Wycena i Analityka Finansowa](#5-wycena-i-analityka-finansowa)
6. [Kalendarz Premier Polskich Wydań](#6-kalendarz-premier-polskich-wydań)
7. [Dedykowana Podstrona Tomu](#7-dedykowana-podstrona-tomu)
8. [Landing Page dla Gości](#8-landing-page-dla-gości)
9. [Strona Informacyjna /about](#9-strona-informacyjna-about)
10. [Stylistyka Tokyo Cyber-Dark & Responsywność 1:1](#10-stylistyka-tokyo-cyber-dark--responsywność-11)
11. [Struktura Plików](#11-struktura-plików)

---

## 1. Silnik Wyszukiwania i Baza Mangi
- **AniList GraphQL API Integration**: Wyszukiwanie serii na żywo z oficjalnego API AniList (`https://graphql.anilist.co`).
- **Pobieranie Metadanych**: Japoński tytuł (Romaji / Native), tytuł angielski, opis, okładki HD (`extraLarge`), banery, status, liczba tomów, ocena społeczności.
- **Import do Bazy**: Możliwość zaimportowania serii jednym kliknięciem do bazy lokalnej i wygenerowania jej tomów.

---

## 2. Zarządzanie Kolekcją i Półka Mangi
- **Zero-Latency Optimistic UI**: Błyskawiczna zmiana statusu tomu (*Posiadane / Przeczytane / Wishlista / Zamówione*) bez opóźnień sieciowych.
- **Wielopoziomowe Filtrowanie**:
  - Pasek szybkiego filtrowania polskich wydawnictw (*Waneko, Studio JG, J.P.Fantastica, Kotori, Dango, Hanami*),
  - Filtrowanie po statusie kolekcji oraz sortowanie po tytule, numerze tomu i cenie.
- **Widok Siatki i Listy**: Elastyczna siatka (**2 kolumny na smartfonie, 4 na tablecie, 6 na desktopie**) lub szczegółowa lista tabelaryczna.

---

## 3. Profile Użytkowników i Znajomi
- **System Odznak i Poziomów**: Odznaka rangi kolekcjonera (*np. COLLECTOR LVL 14 💎*),
- **Relacje Znajomych**: Wyszukiwarka kolekcjonerów, zaproszenia do znajomych, statusy prywatności (*Publiczny / Tylko Znajomi / Prywatny*),
- **Live Activity Feed**: Śledzenie dodawanych tomów i ocen znajomych w czasie rzeczywistym.

---

## 4. Sklepy i Porównywarka Cen
- **Polskie Księgarnie**: Dedykowane zestawienie ofert z najważniejszych sklepów z mangą w Polsce:
  - **Empik.com**
  - **Yatta.pl**
  - **Gildia.pl**
  - **Mangarden.pl**
  - **Sklepy Wydawców**
- **Wskaźnik Dostępności**: Informacja o stanie magazynowym (*W magazynie / Chwilowo brak / Pre-order*).
- **Bezpośrednie Linki Zakupu**: Przyciski *„Kup w sklepie”* przekierowujące bezpośrednio do karty produktu.

---

## 5. Wycena i Analityka Finansowa
- **Śledzenie Cen Zakupu (`purchasePrice`)**: Zapisywanie realnie zapłaconej kwoty za każdy tom.
- **Katalogowa Wycena vs Realne Wydatki**: Automatyczne wyliczanie zaoszczędzonej kwoty na promocjach i rabatach.
- **Wykresy i Podsumowania**:
  - Udział wydatków wg wydawnictw (Waneko, Studio JG, JPF itp.),
  - Najbardziej dofinansowane serie,
  - Średnia cena za tom i stopień przeczytania kolekcji.

---

## 6. Kalendarz Premier Polskich Wydań
- **Endpoint `/api/releases`**: Dynamiczny generator harmonogramu wydań zintegrowany z bazą AniList i polskimi wydawcami.
- **Interaktywna Paginacja Miesięcy (`< >`)**: Płynne przeglądanie premier w dowolnym miesiącu z automatycznym pobieraniem danych.
- **Bezpośrednie Przejście do Tomu**: Kliknięcie dowolnej pozycji w kalendarzu przenosi do pełnej podstrony tomu z cenami i sklepami.

---

## 7. Dedykowana Podstrona Tomu
- **Ścieżka**: `/manga/[id]/volume/[n]`
- **Zawartość**:
  - Oficjalna polska okładka w jakości HD z neonową poświatą,
  - Tytuł serii, numer tomu, wydawnictwo, data premiery, kod ISBN,
  - Pełny opis fabularny tomu i serii,
  - **Tabela Porównywarki Cen**: Ceny w PLN w poszczególnych księgarniach z wyliczeniem oszczędności,
  - **Historia Zmian Cen**: Interaktywne zestawienie historycznych wahań cenowych.

---

## 8. Landing Page dla Gości
- Dostępny na `/` dla niezalogowanych użytkowników.
- Zawiera Hero banner z dual CTA, interaktywny mockup 3D półki, 6 filarów możliwości, prezentację polskich wydawców, tabelę porównawczą i przycisk szybkiego logowania *Wypróbuj Demo*.

---

## 9. Strona Informacyjna /about
- Dostępna na `/about`.
- Zawiera opis misji, katalog modułów, pełny stack technologiczny (Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, PostgreSQL 15, Prisma ORM 7, NextAuth v5, Recharts, Lucide, Docker) oraz wyróżniki architektoniczne.

---

## 10. Stylistyka Tokyo Cyber-Dark & Responsywność 1:1
- **Desktop (1:1 według `desktop.png`)**:
  - Top Glass Navbar (Logo gradientowe, Szukaj `S` `[/]`, linki Dashboard/Collection/Search/Profile, awatar i boks rangi Collector Lvl 14),
  - Hero banner z mangowym tłem,
  - Karuzela *Currently Reading* z paskami postępu (`72%`, `45%`, `91%`, `80%`),
  - 4 szklane karty statystyk ze sparkline,
  - Boks *Quick Actions* z neonową obwódką oraz interaktywny kalendarz premier.
- **Tablet (1:1 według `tablet.png`)**:
  - Wąski boczny pasek ikon `TabletSidebar`,
  - Pasek filtrów polskich wydawców i budżetu,
  - 4-kolumnowa siatka tomów na szklanych podstawkach ze statusem (*Read, Ongoing, Unread, Pre-Order*).
- **Mobile (1:1 według `mobile.png`)**:
  - Nagłówek profilowy z rangą i wyszukiwarką,
  - 2-kolumnowa dotykowa siatka półki,
  - Pływający dolny dock ze szkła (*Shelf, Explore, Community, Profile*).

---

## 11. Struktura Plików

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── collection/page.tsx
│   │   ├── friends/page.tsx
│   │   ├── manga/[id]/volume/[n]/page.tsx
│   │   ├── profile/
│   │   │   ├── page.tsx
│   │   │   └── edit/page.tsx
│   │   ├── search/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [username]/page.tsx
│   │   └── offline/page.tsx
│   ├── about/
│   │   └── page.tsx
│   ├── admin/
│   │   ├── manga/
## 11. Pływające Okno Tomu (Floating Window / Modal)
- **Komponent**: `src/components/manga/volume-detail-modal.tsx`
- **Działanie**:
  - Otwiera się bez przeładowania strony po kliknięciu w okładkę, tytuł tomu w kalendarzu, półce lub wyszukiwarce.
  - Zawiera:
    - Podgląd okładki HD, danych tomu, wydawnictwa i opisu,
    - Interaktywny formularz zmiany statusu tomu (*Posiadane, Przeczytane, Chcę kupić, Zamówione*),
    - Pole wprowadzania ceny zakupu w PLN,
    - Ocenę gwiazdkową (1-10) oraz notatki kolekcjonera,
    - Pełną porównywarkę cen w polskich księgarniach (*Yatta, Gildia, Empik, Mangarden, Sklep Wydawcy*) z bezpośrednimi linkami,
    - Przyciski *„Anuluj”* oraz *„Zapisz i Potwierdź”* zapisujące stan natychmiastowo.

---

## 12. Silnik Web Scrapingu i Zaciągania Planów Wydawniczych
- **Plik źródłowy**: `src/lib/publisher-scraper.ts`, `src/app/api/releases/sync/route.ts`
- **Komponent**: `src/components/manga/publisher-sync-modal.tsx`
- **Działanie**:
  - Umożliwia podanie dowolnego adresu URL strony wydawcy (np. `https://studiojg.pl/plan-wydawniczy`, `https://waneko.pl/kalendarz-wydawniczy`, `https://jpf.com.pl/premiery` itp.) lub wybór gotowego profilu wydawcy,
  - Na żywo pobiera i parsuje tytuły, numery tomów, daty premier, okładki i linki do zakupu,
  - Zapewnia podgląd na żywo przed wdrożeniem i jednym kliknięciem aktualizuje kalendarz.

---

## 13. Pływające Okno Pełnego Kalendarza (FullCalendarModal)
- **Komponent**: `src/components/manga/full-calendar-modal.tsx`
- **Działanie**:
  - Otwierane po kliknięciu w ikonę kalendarza w boksie *Nadchodzące Polskie Premiery*,
  - **3 Elastyczne Widoki**:
    1. **Widok Tygodnia (Week View)**: rozkład 7-dniowy (Pn–Nd) z miniaturkami tomów,
    2. **Widok Pełnego Miesiąca (Month Grid)**: kompletna siatka dni z plakietkami wydawców i cenami w PLN,
    3. **Widok 3 Miesięcy (Quarter Timeline)**: oś czasu na najbliższy kwartał (*Sierpień – Wrzesień – Październik 2026*).
  - Filtrowanie po wydawcach (*Waneko, Studio JG, JPF, Kotori, Dango, Hanami*),
  - Kliknięcie w dowolny tom otwiera pływające okno szczegółów i porównywarkę cen (`VolumeDetailModal`).

---

## 14. Panel Zarządzania Premierami w Panelu Admina
- **Ścieżka**: `/admin/releases` (`src/app/admin/releases/page.tsx`)
- **Działanie**:
  - Formularz ręcznego dodawania nowych premier (Wydawca, Tytuł, Numer tomu, Data, Cena PLN, Okładka, ISBN),
---

## 15. Lokalne Utrwalanie Okładek na Dysku (Cover Storage Engine)
- **Plik źródłowy**: `src/lib/cover-storage.ts`, `src/app/api/covers/route.ts`
- **Działanie**:
  - Pobiera okładki ze stron wydawców lub AniList API i trwale zapisuje je na dysku serwera w folderze `public/covers/[wydawca]/[seria]_tom-[n].jpg`,
  - Umożliwia działanie aplikacji w trybie offline oraz chroni przed zniknięciem grafik z sieci,
  - Zapewnia natychmiastowe serwowanie lokalnych plików bez obciążania zewnętrznych serwerów.

---

## 16. Edytor Okładek dla Administratora z Kadrowaniem (CoverEditModal)
- **Komponent**: `src/components/manga/cover-edit-modal.tsx`
- **Działanie**:
  - Dostępny po najechaniu na okładkę (ikonka ołówka ✏️) dla użytkowników o roli `ADMIN`,
  - **Wgrywanie z kadrowaniem**:
    - Wybór pliku z komputera (JPG/PNG/WebP),
    - Suwak przybliżenia (Zoom) i precyzyjne pozycjonowanie osi X/Y w formacie 2:3,
  - **Galeria alternatywnych okładek**:
    - Miniaturki wszystkich dostępnych wariantów okładek danej mangi (np. polska, japońska, promocyjne) z możliwością wyboru jednym kliknięciem.

---

## 17. Multi-Selektor Dodawania Mangi (AddMangaModal)
- **Komponent**: `src/components/manga/add-manga-modal.tsx`
- **Działanie**:
  - Otwierany z poziomu *Szybkich Akcji* (*„+ Dodaj Mangę do Kolekcji”*),
  - Wyszukiwarka serii na żywo w AniList i bazie mangi,
  - Scrollowalna siatka kafelków tomów z możliwością szybkiego zaklikiwania posiadanych pozycji,
  - Przyciski zbiorcze: *„Zaznacz wszystkie”*, *„Odznacz”*, *„Zaznacz zakres (np. 1–10)”*.

---

## 18. Struktura Plików

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── collection/page.tsx
│   │   ├── friends/page.tsx
│   │   ├── manga/[id]/volume/[n]/page.tsx
│   │   ├── profile/
│   │   │   ├── page.tsx
│   │   │   └── edit/page.tsx
│   │   ├── search/page.tsx
│   │   ├── stats/page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [username]/page.tsx
│   │   └── offline/page.tsx
│   ├── about/
│   │   └── page.tsx
│   ├── admin/
│   │   ├── manga/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── bulk/page.tsx
│   │   ├── releases/
│   │   │   └── page.tsx
│   │   ├── publishers/page.tsx
│   │   └── users/page.tsx
│   ├── api/
│   │   ├── activities/route.ts
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── covers/route.ts
│   │   ├── friends/route.ts
│   │   ├── manga/[id]/route.ts
│   │   ├── releases/
│   │   │   ├── route.ts
│   │   │   └── sync/route.ts
│   │   ├── shops/route.ts
│   │   ├── upload/route.ts
│   │   ├── users/
│   │   │   ├── me/route.ts
│   │   │   ├── search/route.ts
│   │   │   └── [username]/route.ts
│   │   └── volume-prices/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── activity/
│   │   └── activity-feed.tsx
│   ├── landing/
│   │   ├── landing-nav.tsx
│   │   └── landing-page.tsx
│   ├── layout/
│   │   ├── bottom-nav.tsx
│   │   ├── desktop-sidebar.tsx
│   │   ├── desktop-top-nav.tsx
│   │   ├── tablet-sidebar.tsx
│   │   ├── header.tsx
│   │   ├── layout.tsx
│   │   └── mobile-nav.tsx
│   ├── manga/
│   │   ├── add-manga-modal.tsx
│   │   ├── collection-filter.tsx
│   │   ├── collection-grid.tsx
│   │   ├── collection-list-view.tsx
│   │   ├── collection-stats.tsx
│   │   ├── collection-view-toggle.tsx
│   │   ├── cover-edit-modal.tsx
│   │   ├── cover-upload.tsx
│   │   ├── full-calendar-modal.tsx
│   │   ├── manga-cover.tsx
│   │   ├── publisher-sync-modal.tsx
│   │   └── volume-detail-modal.tsx
│   ├── ui/
│   ├── pwa-install.tsx
│   └── safe-session-provider.tsx
├── lib/
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── manga.ts
│   │   └── search.ts
│   ├── anilist.ts
│   ├── auth.ts
│   ├── cover-storage.ts
│   ├── prisma.ts
│   ├── publisher-scraper.ts
│   └── utils.ts
└── prisma/
    └── schema.prisma
```
