# Importer danych z Biblioteki Narodowej

Importer pobiera polskie wydania mang, manhwy i komiksów azjatyckich z otwartego API
[data.bn.org.pl](https://data.bn.org.pl) i zapisuje je w katalogu (serie i tomy). Panel: `/admin/import`.

## Co importuje

Z każdego rekordu: polski tytuł i tytuł oryginału, numer tomu, ISBN, wydawcę, miesiąc i rok wydania,
liczbę stron oraz **cenę okładkową**. Okładek BN nie ma, te pochodzą ze sklepów i wydawców (scrapery).

Importer bierze pod uwagę **wszystkich** wydawców: nie filtruje po nazwie, tylko po gatunku
(Manga, Manhwa, Manhua, Komiks z oryginałem japońskim, koreańskim lub chińskim) i po języku wydania (polski).
Wydawca, którego nie ma jeszcze w bazie, jest zakładany automatycznie i trafia na górę listy
`/admin/publishers` z oznaczeniem „Nowy z importu”.

## Przepływ

1. **Pobranie**: kilka strumieni zapytań do BN, każdy z własnym kursorem. Pierwsze uruchomienie pobiera cały
   katalog etapami (każdy przebieg do 10 minut, wznawiany od kursora), kolejne tylko nowe rekordy.
2. **Kolejka**: rekordy trafiają do tabeli `import_records` jako „Do zatwierdzenia”.
3. **Zatwierdzenie**: ręcznie (zaznaczone, albo wszystkie z filtra) lub automatycznie dla wydawców z włączonym
   „Auto-zatwierdzaniem”. Zatwierdzenie zapisuje rekord w katalogu.
4. **Odświeżanie**: tryb „Odśwież ostatnie lata” ponownie przegląda bieżący, poprzedni i następny rok,
   żeby uzupełnić zmiany (np. nowe ceny po dodruku).

Statusy rekordów: **Do zatwierdzenia**, **W katalogu**, **Pominięte** (wydanie specjalne, brak numeru tomu w serii
wielotomowej, dodruk już istniejącego tomu, ISBN przypisany do innego tomu), **Odrzucone**.
Pominięte i odrzucone można przywrócić do kolejki.

## Ochrona ręcznych zmian

Każde pole uzupełnione importem (`isbn`, `polishReleaseDate`, `pricePLN`, `totalVolumesPoland`) ma wpis w kolumnie
`fieldMeta` z wartością, którą zapisał import. Import nadpisuje pole tylko wtedy, gdy:

- jest puste, albo
- ma nadal dokładnie tę wartość, którą wcześniej zapisał import (czyli nikt jej nie zmienił).

Zmiana w panelu admina automatycznie „odblokowuje” pole przed importem, bez żadnych dodatkowych kroków.
Jedyny wyjątek to cena 34,99 zł bez wpisu w `fieldMeta`, czyli domyślna cena, którą aplikacja wstawia przy tworzeniu
tomu bez ceny: ją import zastępuje prawdziwą ceną okładkową.

## Wydawcy

Nazwy z BN są niespójne („Wydawnictwo Waneko Waneko,”, „Story House Egmont” i „Story Egmont House”). Importer sprowadza
je do jednej nazwy: znani wydawcy (Waneko, Studio JG, J.P.Fantastica, Kotori, Dango, Hanami) mają stałe nazwy, pozostali
dostają nazwę oczyszczoną z przedrostków i form prawnych, a porównanie nie zależy od kolejności słów.

Jeśli ten sam wydawca pojawi się pod dwiema różnymi nazwami (np. „Egmont Polska” i „Story House Egmont”), użyj
**„Połącz”** na liście wydawców: serie i rekordy importu przechodzą do wybranego wydawcy, a nazwa źródła zostaje
aliasem, więc kolejne importy trafiają od razu we właściwe miejsce.

## Automatyczne uruchamianie (cron)

Endpoint `POST /api/cron/import` startuje import w tle. Wymaga nagłówka `x-cron-secret` równego zmiennej `CRON_SECRET`
(bez ustawionej zmiennej zawsze zwraca 401).

1. Ustaw w `.env` na serwerze: `CRON_SECRET=<długi losowy ciąg>`.
2. Dodaj na serwerze do crona (`crontab -e`):

```
# nowe rekordy co noc o 3:15
15 3 * * * curl -s -X POST -H "x-cron-secret: TWÓJ_SEKRET" http://127.0.0.1:3002/api/cron/import > /dev/null
# odświeżenie ostatnich lat w niedzielę o 4:00
0 4 * * 0 curl -s -X POST -H "x-cron-secret: TWÓJ_SEKRET" "http://127.0.0.1:3002/api/cron/import?mode=refresh" > /dev/null
```

Jeśli import już trwa, kolejne wywołanie zwraca `started: false`. Przerwany import (np. po restarcie serwera)
jest po 30 minutach oznaczany jako błąd, a następny przebieg wznawia od kursora.

## Ograniczenia

- BN zawiera **wydane** tomy (zapowiedzi pochodzą ze stron wydawców, osobnym mechanizmem).
- Starsze tomy (sprzed 2020) mają mniej cen, a część numerów w seriach może brakować (zwłaszcza starszy katalog JPF).
- Wydania specjalne (box, deluxe, zestawy) trafiają do „Pominiętych” i nie są dodawane automatycznie.
- Importer nie dopasowuje serii do AniList. Seria dostaje ID z AniList przy pierwszej ręcznej edycji w panelu.

## Test

Test integracyjny działa na lokalnej bazie testowej (nazwa kończy się na `test`) i **czyści jej tabele**:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/mangatest" npx prisma db push
DATABASE_URL="postgresql://user:pass@localhost:5432/mangatest" npx tsx scripts/importer-integration-test.ts
```

Sprawdza m.in.: dopasowanie do istniejącej serii bez duplikatu, ochronę ręcznej ceny, aktualizację pola z importu,
zakładanie nowych wydawców, brak wydawców z rekordów w innym języku, postęp kursora i brak zduplikowanych rekordów.
