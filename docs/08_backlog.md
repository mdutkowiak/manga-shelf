# Backlog poprawek

Drobne błędy i pomysły zgłoszone podczas testów, do zrobienia później.

## Otwarte

Brak.

## Zrobione

### Ogłoszenie znikające po odświeżeniu
Zgłoszone 3 listopada 2026 (przy weryfikacji punktu A), naprawione tego samego dnia.

- Przyczyna: zamknięcie ogłoszenia było zapamiętane w `sessionStorage` i odczytywane dopiero po załadowaniu strony, więc serwer renderował pasek, a po ułamku sekundy znikał. Dotyczyło każdego, kto raz zamknął ogłoszenie w danej karcie.
- Teraz zamknięcie zapisuje ciasteczko sesyjne `mangowo_ann` (klucz zależny od tekstu), które czyta serwer. Pasek nie miga, a po zmianie treści przez admina pokazuje się znowu.

### Ogłoszenie serwisu (pasek na górze strony)
Zgłoszone 2 listopada 2026, naprawione 3 listopada 2026.

- Pasek nie był przyklejony, więc znikał przy przewijaniu w dół i było go widać dopiero po przewinięciu w górę. Teraz jest częścią przyklejonego nagłówka (razem z nawigacją) i widać go cały czas, także na stronie startowej i logowania.
- Tekst przylegał do lewej krawędzi ekranu. Teraz jest wyśrodkowany, a przycisk zamykania ma 44 px.
