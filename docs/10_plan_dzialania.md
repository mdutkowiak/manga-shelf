# Plan działania

Aktualizowany: 3 listopada 2026. Łączy plan z audytu (ten czat) z planem z drugiego czatu (marka MangaHub.pl,
motyw „Dzień”, nawigacja). Szczegóły techniczne: `07_roadmap_and_improvements.md` (funkcje), `08_backlog.md`
(drobne błędy), `09_importer.md` (importer).

## Zrobione

| Etap | Zawartość | Commit |
|---|---|---|
| Bezpieczeństwo | Guardy auth we wszystkich endpointach, ochrona SSRF (`safeFetch`), walidacja uploadów, brak domyślnego sekretu JWT, administratorzy z `ADMIN_EMAILS`, limit prób logowania, prywatność kolekcji, ochrona `/admin` w `proxy.ts` | `7639799` |
| Porządki | ESLint bez błędów, ikony PWA i manifest, odblokowany zoom, CI (tsc, lint, build), usunięcie martwych plików | `f7a36e3` |
| Domena | Przeniesienie na mangahub.pl (nginx, certbot, `NEXTAUTH_URL`, przekierowanie starej domeny) | `4588a67` |
| Etap 1: wygląd | Motywy „Nocna półka” i „Regał”, wybór użytkownika (`/profile/appearance`), panel `/admin/settings` (motywy, funkcje, rejestracja, ogłoszenie), skip link, focus, reduced motion | `ed56b57` |
| Import danych | Importer z Biblioteki Narodowej: wszyscy wydawcy, nowi trafiają do panelu, kolejka zatwierdzania, ochrona ręcznych zmian, cron | `9ce8fa5`, `97a0d3f` |
| Marka i UI (drugi czat) | Nazwa i logo MangaHub.pl, jasny motyw „Dzień”, odświeżona nawigacja, przebudowa pulpitu, weryfikacja na danych | `c1e7d99`, `59f7999` |

## Do zrobienia

### A. Wdrożenie i weryfikacja tego, co już jest (najpierw)
- Wdrożyć importer na mini PC, ustawić `CRON_SECRET`, dodać wpisy crona (`09_importer.md`).
- Uruchomić pierwszy pełny import (kilka przebiegów), przejrzeć nowych wydawców, zatwierdzić kolejkę per wydawca.
- Przetestować na serwerze `/admin/settings`: zapis ustawień, wyłączanie funkcji, ogłoszenie, zamknięcie rejestracji, zapis wyglądu na koncie. (Lokalnie nie było bazy.)
- ~~Naprawić błąd ogłoszenia~~ Zrobione 3 listopada 2026 (pasek przyklejony do nagłówka, tekst wyśrodkowany).

### B. Nawigacja (z drugiego czatu, punkt 2), zrobione 3 listopada 2026
- ✅ Stały przycisk „Dodaj serię” (desktop: z napisem od 1280 px, niżej sam „+”; telefon: ikona w górnym pasku; tablet: w pasku bocznym).
- ✅ Menu „Więcej” (kalendarz, statystyki, lista zakupów, „O projekcie”) na desktopie, tablecie i telefonie. „Szukaj” usunięte z linków desktopu (jest pole wyszukiwania), rząd mieści się od 1100 px.
- ✅ Skróty `/` i `S` nie działają w polach, z modyfikatorami ani przy otwartym oknie dialogowym.
- ✅ Tablet: pasek boczny z „Dodaj” i „Więcej”, naprawiony poziomy scroll.
- ✅ Błąd ogłoszenia znikającego po odświeżeniu (`08_backlog.md`).
- Do rozstrzygnięcia: ta nawigacja a moja koncepcja „Półka” (4 miejsca plus środkowe „+”). Ustalić jeden układ przed etapem 2.

### C. Czytelność (z drugiego czatu, punkt 3)
- ✅ Przyklejanie nawigacji i ogłoszenia do góry ekranu włączane osobno w `/admin/settings` (domyślnie włączone; zasłaniają część treści przy przewijaniu). Sprawdzone wszystkie cztery kombinacje.
- ✅ Napisy 7–10 px podniesione do 11 px (381 miejsc); w trybie „duży tekst” 11 px → 13 px (reguła CSS była nieprawidłowa i nie działała).
- ✅ Animacje wejścia (`animate-in fade-in`) usunięte z korzeni stron, więc treść nie zostaje półprzezroczysta.
- ✅ Kontrast zmierzony skryptem (każdy tekst, z uwzględnieniem tła i przezroczystości) na 17 stronach w motywie Dzień oraz kluczowych stronach w Nocnej półce i Regale. Poprawione: odcienie `-400`, `-500`, `-600` w Dniu, plakietki na ciemnych nakładkach, biały tekst na przycisku w Nocy, jaśniejszy `muted-foreground` w Nocy, tekst z przezroczystością `muted-foreground/40–75`, filtr w Regale. Pozostałe wyniki skryptu to tła z gradientem lub zdjęciem (nie da się zmierzyć) i wyłączone przyciski (wyjęte z wymogów).
- ✅ Nazwy dla czytników ekranu: pola bez etykiety biorą nazwę z placeholdera, ikony miesiąca i karuzeli, edycja/usuwanie wydawcy, przełącznik widoku kolekcji (`aria-pressed`). Cele dotykowe: filtry wydawców i linki „powrót” min. 32 px, przyciski ikon 32 px.
- Dług: 37 miejsc z `<Link><Button/></Link>` (zagnieżdżone elementy interaktywne). Poprawione na logowaniu i rejestracji, reszta do zrobienia przy porządkach (F).
- Nie sprawdzone: strona publiczna profilu, szczegóły tomu, okna modalne, tryb dużego tekstu na urządzeniu, czytnik ekranu na żywo.
- Do rozważenia: pozwolić też użytkownikowi wyłączyć przyklejanie u siebie (strona „Wygląd”), a na telefonie zmniejszać pasek przy przewijaniu w dół.
- Najmniejsze napisy (8–10 px) podnieść do 11–12 px.
- Kontrast WCAG AA we wszystkich trzech motywach (Dzień, Nocna półka, Regał), szczególnie kolorowe plakietki.
- Ograniczyć animacje wejścia (`animate-in`), które zostawiają treść półprzezroczystą.
- Dokończyć audyt dostępności: 11 podstron nie było jeszcze mierzonych (Społeczność, Promocje, Checklista, Profil, Profil publiczny, Szczegóły tomu, logowanie, rejestracja, O projekcie, panel admina). Cele dotykowe, nazwy dla czytników ekranu.

### D. Porządki w marce (z drugiego czatu, punkt 4)
- Nazwy techniczne `mangowo_*` (localStorage, ciasteczko): **zostawić** (zmiana wymaga migracji i grozi utratą kolekcji).
- Zaktualizować dokumentację w `docs/` (motywy, logo, nazwa projektu).
- Grafika udostępniania (Open Graph) z nowym logo.

### E. Pomysły UX (z drugiego czatu, punkt 5, po akceptacji)
- Strona kolekcji: filtry w jednym pasku, „do przeczytania” jako domyślna zakładka.
- Onboarding w trzech krokach: dodaj serię, oznacz tomy, włącz powiadomienia o premierach.
- Przegląd mobilny całej aplikacji pod kątem obsługi jedną ręką.

### F. Etap 2: architektura i nowa powłoka (z audytu)
- Strona serii z własnym adresem URL zamiast okna modalnego (dziś 1329 linii w jednym pliku).
- Dodawanie tomów jednym gestem: siatka numerów tomów, dotknięcie oznacza „mam”, przeciągnięcie zaznacza zakres; jeden przycisk „+” (skan ISBN, szukanie, ręcznie), wykrywanie duplikatów.
- Serwer jako źródło prawdy dla kolekcji zamiast `localStorage` (cache po stronie klienta).
- Walidacja wejścia (Zod) we wszystkich route'ach, wspólne guardy już są.
- Podział największych plików (`series-collection-detail-modal`, `page.tsx`, `admin/users`, `calendar-view`, `collection-store`).
- Strony `loading`, `error`, `not-found`; ctrl+K; strony „wartościowej pustki” i onboarding.
- Ustawienia: stopniowo ukrywać gamifikację i moduły strony głównej (przełączniki już są w panelu admina).
- Powłoki „Panel kolekcjonera” i „Społeczność” tylko jeśli będzie zapotrzebowanie.

### G. Dane: okładki, ceny, zapowiedzi
- Automatyczne okładki i aktualne ceny ze sklepów (po jednym scraperze na sklep, z sprawdzeniem `robots.txt` i regulaminu, najlepiej oficjalne pliki produktowe).
- Zapowiedzi i daty premier ze stron wydawców (BN zawiera tylko wydane tomy).
- Dopasowanie serii do AniList; obsługa wydań specjalnych (box, deluxe), które import dziś pomija.
- Okładki są chronione prawem autorskim: ustalić zasady (zgoda wydawców lub linkowanie i usuwanie na prośbę).
- Okładki z `public/covers` trzymać w wolumenie Dockera (dziś giną przy przebudowie).

### H. Nowe funkcje (z `07_roadmap_and_improvements.md` i audytu)
1. Alerty cenowe i premier (Web Push, e-mail) na wishliście.
2. Import (MAL, AniList, CSV/JSON) i eksport kolekcji.
3. Masowa edycja tomów.
4. Recenzje i rekomendacje.
5. Wartość kolekcji i wydatki w czasie.
6. Wymiana i sprzedaż tomów między znajomymi, iCal per użytkownik, udostępnialny profil półki z Open Graph.
7. Panel admina: dziennik zmian (audit log), monitoring scraperów i importu.

### I. Bezpieczeństwo i operacje (dług po etapie 1)
- DNS rebinding w `safeFetch` (sprawdzenie i połączenie to osobne zapytania DNS).
- Nagłówki bezpieczeństwa (CSP, HSTS, nosniff) w `next.config.ts` i w nginx dla mangahub.pl (gzip, nagłówki nie przeniosły się z poprzedniego pliku).
- Audyt endpointów czatu i ocen; ochrona CSRF poza SameSite.
- Limit logowania w pamięci procesu: przy kilku instancjach przenieść do bazy lub Redisa.
- Ujednolicić formatowanie (Prettier zgłasza 116 plików) osobnym commitem.
- Testy: jednostkowe dla parsera BN i `ui-settings`, testy dostępności (axe) per motyw w CI.

## Proponowana kolejność
1. **A** (wdrożenie i weryfikacja), bo odblokowuje dane i sprawdza to, czego nie dało się przetestować lokalnie.
2. **B, C, D** (nawigacja, czytelność, marka): małe, widoczne dla użytkowników zmiany.
3. **F** (etap 2) po decyzji o układzie nawigacji.
4. **G** (okładki i ceny ze sklepów), równolegle gdy importer będzie już działał na produkcji.
5. **E, H, I** według potrzeb, **I** (nagłówki i DNS rebinding) warto zrobić przed większym ruchem.
