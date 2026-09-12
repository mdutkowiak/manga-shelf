# Roadmapa i Propozycje Ulepszeń - Manga Shelf Tracker

Ten dokument gromadzi propozycje innowacyjnych funkcjonalności i ulepszeń architektonicznych zaplanowanych do wdrożenia w kolejnych etapach rozwoju projektu **Manga Shelf Tracker**.

---

## 1. Kalendarz Premier Wydań Polskich (`/calendar`)

### Opis
Wizualny kalendarz i harmonogram premier tomów w Polsce zintegrowany z oficjalnymi zapowiedziami wydawnictw (Waneko, Studio JG, J.P.Fantastica, Kotori, Dango, Hanami).

### Kluczowe funkcje
- **Widok kalendarza miesięcznego i tygodniowego**: Wyświetlanie okładek premier w poszczególnych dniach miesiąca.
- **Filtrowanie**: Po wydawcy, serii oraz pozycjach znajdujących się na liście życzeń / preorderach użytkownika.
- **Oznaczenie stanu**: *"W mojej kolekcji"*, *"Zamówione"*, *"Zaplanuj zakup"*.
- **Subskrypcja iCal / Google Calendar**: Możliwość wygenerowania linku do subskrypcji kalendarza premier w zewnętrznych aplikacjach.

---

## 2. Mobilny Skaner Kodów Kreskowych ISBN (Kamera PWA)

### Opis
Wykorzystanie kamery w smartfonie lub tablecie (w ramach PWA) do natychmiastowego skanowania kodów EAN-13 / ISBN z tylnej okładki fizycznego tomu.

### Kluczowe funkcje
- **Biblioteki**: `html5-qrcode` lub `@zxing/library`.
- **Szybkie dodawanie w księgarni / na konwencie**: Skan kodu kreskowego automatycznie wyszukuje tom w bazie i pozwala jednym kliknięciem:
  - Sprawdzić, czy dany tom już posiadamy w kolekcji (uniknięcie dubli!).
  - Dodać tom do kolekcji lub listy życzeń.
  - Sprawdzić sugerowaną cenę katalogową i aktualne oferty w innych sklepach.

---

## 3. Powiadomienia Push i Alerty Cenowe

### Opis
System monitorowania cen i premier z powiadomieniami dla użytkownika.

### Kluczowe funkcje
- **Alert cenowy na wishlistę**: Ustawienie progu cenowego (np. *"Powiadom, gdy Chainsaw Man tom 5 spadnie poniżej 22 PLN"*).
- **Web Push Notifications**: Wykorzystanie Service Workera do wysyłania powiadomień na urządzeniach mobilnych i desktopie o zbliżających się premierach lub spadkach cen.
- **Centrum powiadomień w aplikacji**: Dzwonek powiadomień w nagłówku z listą ostatnich alertów.

---

## 4. Eksport i Kopia Zapasowa Kolekcji (PDF / CSV / JSON)

### Opis
Możliwość pobrania danych swojej biblioteczki w uniwersalnych formatach.

### Kluczowe funkcje
- **Raport Pamiątkowy / Ubezpieczeniowy (PDF)**: Wygenerowanie eleganckiego dokumentu PDF z podsumowaniem wartości całej kolekcji, wykazem wszystkich tomów, ich stanem i unikalnymi numerami ISBN (np. dla ubezpieczyciela mieszkania lub do druku).
- **Eksport CSV / Excel**: Zestawienie tabelaryczne ze wszystkimi kolumnami (Tytuł, Tom, Wydawca, ISBN, Data zakupu, Cena zakupu, Ocena).
- **Kopia zapasowa JSON**: Kompletny zrzut kolekcji z możliwością późniejszego importu.

---

## 5. System Oceniania i Recenzji Społecznościowych

### Opis
Rozbudowa profilu i widoku tomu o moduł recenzji i ocen.

### Kluczowe funkcje
- **Skala 1-10 gwiazdek**: Możliwość oceniania poszczególnych tomów lub całej serii.
- **Krótkie mini-recenzje**: Dodawanie opinii (max 500 znaków) z tagami (np. *"Świetny druk"*, *"Niesamowity plot twist"*).
- **Średnia społeczności**: Wyświetlanie średniej oceny użytkowników Manga Shelf obok oceny z AniList.
- **Rekomendacje**: Sugerowanie nowych tytułów na podstawie ocen i posiadanych serii podobnych użytkowników.

---

## 6. Tryb "Półka 3D / Grzbiety" (Spine / Shelf View)

### Opis
Dodanie trzeciego trybu wyświetlania kolekcji stylizowanego na fizyczną drewnianą półkę z grzbietami mang.

### Kluczowe funkcje
- **Spine View**: Wąskie karty z tytułem, numerem tomu i logiem wydawnictwa pionowo, imitujące grzbiet mangi stojącej na półce.
- **Wizualna szerokość tomów**: Różna grubość tomów zwykłych vs wydań zbiorczych (2w1, 3w1, edycje Deluxe).
- **Tematyczne półki**: Możliwość wirtualnego układania mang wg własnego uznania na "drewnianych deskach".

---

## 7. Masowa Edycja i Inteligentny Import

### Opis
Ułatwienia w zarządzaniu dużymi kolekcjami (100+ tomów).

### Kluczowe funkcje
- **Bulk Edit**: Zaznaczenie wielu tomów jednocześnie i zmiana statusu (np. *"Oznacz tomy 1-10 jako przeczytane"* lub *"Ustaw cenę zakupu 20 zł dla wszystkich zaznaczonych"*).
- **Import z MyAnimeList / AniList XML**: Wgranie pliku eksportu z MAL/AniList i automatyczne dopasowanie do polskich tomów.
