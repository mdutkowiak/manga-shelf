# Backlog poprawek

Drobne błędy i pomysły zgłoszone podczas testów, do zrobienia później.

## Błędy

### Ogłoszenie serwisu (pasek na górze strony)
Zgłoszone 2 listopada 2026 po wdrożeniu Etapu 1 (motywy i ustawienia admina).

- Pasek ogłoszenia jest widoczny dopiero po przewinięciu strony w górę, a nie od razu po wejściu.
- Tekst ogłoszenia przylega do lewej krawędzi ekranu (brak wewnętrznego odstępu / kontenera o szerokości treści).

Wskazówki: komponent `src/components/site-announcement.tsx`, renderowany w `src/components/layout/layout.tsx` nad lepką nawigacją (`sticky top-0 z-50`). Do sprawdzenia, czy pasek nie jest zasłonięty przez nawigację lub przewinięty poza ekran przy ładowaniu, oraz czy treść powinna dostać ten sam kontener `max-w-7xl` i marginesy co zawartość strony. Rozważyć też pasek lepki albo wbudowany w nawigację.
