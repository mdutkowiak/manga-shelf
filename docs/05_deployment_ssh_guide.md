# Poradnik Wdrożenia - Manga Shelf Tracker

## Spis Treści

1. [Wymagania](#wymagania)
2. [Przygotowanie Mini PC](#przygotowanie-mini-pc)
3. [Konfiguracja Zmiennych Środowiskowych](#konfiguracja-zmiennych-środowiskowych)
4. [Deployment przez SSH](#deployment-przez-ssh)
5. [Ręczny Deployment](#ręczny-deployment)
6. [Konfiguracja Nginx / Reverse Proxy](#konfiguracja-nginx--reverse-proxy)
7. [Certyfikat SSL (Let's Encrypt)](#certyfikat-ssl)
8. [Cloudflare Tunnel (Alternatywa)](#cloudflare-tunnel)
9. [Migracje Bazy Danych](#migracje-bazy-danych)
10. [Monitoring i Logi](#monitoring-i-logi)
11. [Backup i Przywracanie](#backup-i-przywracanie)
12. [Rozwiązywanie Problemów](#rozwiązywanie-problemów)

---

## Wymagania

### Mini PC / Serwer
- **System:** Linux (Debian/Ubuntu recommended)
- **RAM:** min. 2GB (4GB recommended)
- **Dysk:** min. 10GB wolnego miejsca
- **Docker:** 24.0+
- **Docker Compose:** v2.20+

### Lokalnie
- Git
- SSH key (dostęp do Mini PC)
- Bash (Windows: Git Bash / WSL)

---

## Przygotowanie Mini PC

### 1. Instalacja Docker

```bash
# Aktualizacja systemu
sudo apt update && sudo apt upgrade -y

# Instalacja Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Dodanie użytkownika do grupy docker
sudo usermod -aG docker $USER

# Wyloguj się i zaloguj ponownie, aby zmiany zadziałały
```

### 2. Sprawdzenie Docker Compose

```bash
docker compose version
# Powinno zwrócić: Docker Compose version v2.20.0+
```

### 3. Utworzenie katalogu projektu

```bash
mkdir -p ~/manga-shelf
cd ~/manga-shelf
```

### 4. Konfiguracja SSH (z lokalnego komputera)

```bash
# Generowanie klucza SSH (jeśli nie masz)
ssh-keygen -t ed25519 -C "manga-shelf-deploy"

# Kopiowanie klucza na Mini PC
ssh-copy-id user@192.168.1.100
```

---

## Konfiguracja Zmiennych Środowiskowych

### Na lokalnym komputerze

```bash
# Ustaw zmienne przed deployem
export MINI_PC_USER="twoj_uzytkownik"
export MINI_PC_HOST="192.168.1.100"
export MINI_PC_PATH="/home/twoj_uzytkownik/manga-shelf"
export POSTGRES_PASSWORD="silne_haslo_bazy"
export NEXTAUTH_SECRET="losowy_klucz_32_znaki"
export NEXTAUTH_URL="https://manga.daqu.eu"
```

### Na serwerze (Mini PC)

Utwórz plik `.env` w katalogu projektu:

```bash
cd ~/manga-shelf
nano .env
```

Zawartość:

```env
# Database
POSTGRES_PASSWORD=twoje_silne_haslo

# NextAuth
NEXTAUTH_SECRET=losowy_klucz_32_znaki
NEXTAUTH_URL=https://manga.daqu.eu
```

---

## Deployment przez SSH

### Automatyczny (zalecany)

```bash
# Z katalogu projektu na lokalnym komputerze
chmod +x scripts/deploy-ssh.sh
./scripts/deploy-ssh.sh
```

Skrypt automatycznie:
1. Tworzy kopię zapasową bazy danych
2. Synchronizuje kod przez rsync
3. Przesyła plik .env
4. Buduje kontenery Docker
5. Uruchamia migracje bazy danych

### Ręczny przez SSH

```bash
# Połącz się z Mini PC
ssh user@192.168.1.100

# Przejdź do katalogu projektu
cd ~/manga-shelf

# Pobierz najnowszy kod
git pull origin main

# Zbuduj i uruchom kontenery
docker compose -f docker-compose.prod.yml up -d --build

# Poczekaj na uruchomienie bazy danych
sleep 15

# Uruchom migracje
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy
```

---

## Ręczny Deployment

### Krok 1: Synchronizacja kodu

```bash
# Z lokalnego komputera
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  ./ user@192.168.1.100:~/manga-shelf/
```

### Krok 2: Budowanie kontenerów

```bash
ssh user@192.168.1.100
cd ~/manga-shelf

# Budowanie (pierwszy raz lub po zmianach)
docker compose -f docker-compose.prod.yml up -d --build

# Ponowne uruchomienie (bez rebuildu)
docker compose -f docker-compose.prod.yml up -d
```

### Krok 3: Sprawdzenie statusu

```bash
# Status kontenerów
docker compose -f docker-compose.prod.yml ps

# Logi aplikacji
docker compose -f docker-compose.prod.yml logs -f app

# Logi bazy danych
docker compose -f docker-compose.prod.yml logs -f db
```

---

## Konfiguracja Nginx / Reverse Proxy

### Opcja 1: Nginx Proxy Manager (GUI)

1. Uruchom Nginx Proxy Manager:
```bash
docker run -d \
  --name nginx-proxy-manager \
  -p 80:80 \
  -p 81:81 \
  -p 443:443 \
  -v ./data:/data \
  -v ./letsencrypt:/etc/letsencrypt \
  --restart unless-stopped \
  jc21/nginx-proxy-manager:latest
```

2. Otwórz panel: `http://192.168.1.100:81`
3. Login: `admin@example.com` / `changeme`
4. Dodaj nowy Proxy Host:
   - Domain: `manga.daqu.eu`
   - Forward Hostname: `app`
   - Forward Port: `3000`
   - SSL: Request a new SSL Certificate
   - Force SSL: Yes
   - HTTP/2 Support: Yes

### Opcja 2: Ręczna konfiguracja Nginx

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

Skopiuj konfigurację:
```bash
sudo cp nginx/manga-shelf.conf /etc/nginx/sites-available/manga-shelf
sudo ln -s /etc/nginx/sites-available/manga-shelf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Certyfikat SSL

### Z Certbot (Let's Encrypt)

```bash
sudo certbot --nginx -d manga.daqu.eu
```

### Automatyczne odnawianie

```bash
sudo certbot renew --dry-run
```

### Crontab dla automatycznego odnawiania

```bash
sudo crontab -e
# Dodaj linię:
0 3 * * 1 certbot renew --post-hook "systemctl reload nginx"
```

---

## Cloudflare Tunnel (Alternatywa)

Jeśli nie chcesz otwierać portów na routerze, użyj Cloudflare Tunnel:

### 1. Instalacja cloudflared

```bash
# Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

### 2. Logowanie

```bash
cloudflared tunnel login
```

### 3. Tworzenie tunelu

```bash
cloudflared tunnel create manga-shelf
cloudflared tunnel route dns manga-shelf manga.daqu.eu
```

### 4. Konfiguracja

Utwórz `~/.cloudflared/config.yml`:

```yaml
tunnel: manga-shelf
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: manga.daqu.eu
    service: http://localhost:3000
  - service: http_status:404
```

### 5. Uruchomienie

```bash
cloudflared tunnel run manga-shelf
```

### 6. Usługa systemd

```bash
sudo tee /etc/systemd/system/cloudflared.service << EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel run manga-shelf
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Migracje Bazy Danych

### Wykonywanie migracji

```bash
# Po deployu
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy

# Tworzenie nowej migracji (lokalnie)
npx prisma migrate dev --name nazwa_migracji

# Reset bazy (UWAGA: kasuje dane!)
docker compose -f docker-compose.prod.yml exec app npx prisma migrate reset
```

### Sprawdzanie statusu migracji

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate status
```

---

## Monitoring i Logi

### Logi kontenerów

```bash
# Wszystkie logi
docker compose -f docker-compose.prod.yml logs

# Logi w czasie rzeczywistym
docker compose -f docker-compose.prod.yml logs -f

# Ostatnie 100 linii
docker compose -f docker-compose.prod.yml logs --tail 100 app
```

### Zasoby systemowe

```bash
# Stan kontenerów
docker stats

# Zajętość dysku
docker system df
```

### Healthcheck

Aplikacja automatycznie sprawdza stan co 30 sekund:

```bash
# Sprawdzenie ręczne
curl -I http://localhost:3000/

# Status Docker healthcheck
docker inspect --format='{{.State.Health.Status}}' manga-shelf-app
```

---

## Backup i Przywracanie

### Automatyczny backup bazy danych

Dodaj do crontab na Mini PC:

```bash
# Backup co dzień o 3:00
0 3 * * * cd ~/manga-shelf && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U manga_user manga_shelf | gzip > ~/backups/manga_shelf_$(date +\%Y\%m\%d).sql.gz

# Usuwanie backupów starszych niż 30 dni
0 4 * * * find ~/backups -name "*.sql.gz" -mtime +30 -delete
```

### Ręczny backup

```bash
# Backup bazy
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U manga_user manga_shelf > backup.sql

# Backup wolumenu
docker run --rm -v manga-shelf_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

### Przywracanie

```bash
# Przywracanie bazy
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U manga_user manga_shelf

# Przywracanie wolumenu
docker run --rm -v manga-shelf_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

---

## Rozwiązywanie Problemów

### Aplikacja nie uruchamia się

```bash
# Sprawdź logi
docker compose -f docker-compose.prod.yml logs app

# Sprawdź połączenie z bazą
docker compose -f docker-compose.prod.yml exec app npx prisma db push
```

### Błąd "Connection refused" do bazy danych

```bash
# Sprawdź czy baza działa
docker compose -f docker-compose.prod.yml ps db

# Restart bazy
docker compose -f docker-compose.prod.yml restart db

# Poczekaj i sprawdź ponownie
sleep 10
docker compose -f docker-compose.prod.yml exec app npx prisma db push
```

### Obrazy się nie ładują

```bash
# Sprawdź czy domeny AniList są dostępne
curl -I https://s4.anilist.co

# Sprawdź logi sieci
docker compose -f docker-compose.prod.yml logs app | grep -i image
```

### Brak miejsca na dysku

```bash
# Sprawdź zajętość
docker system df

# Wyczyść nieużywane zasoby
docker system prune -a

# Wyczyść stare backupy
find ~/backups -name "*.sql.gz" -mtime +30 -delete
```

### Błędy SSL

```bash
# Sprawdź certyfikat
sudo certbot certificates

# Wymuś odnowienie
sudo certbot renew --force-renewal

# Restart nginx
sudo systemctl restart nginx
```

---

## Przydatne Komendy

```bash
# Status
docker compose -f docker-compose.prod.yml ps

# Restart
docker compose -f docker-compose.prod.yml restart

# Logs
docker compose -f docker-compose.prod.yml logs -f

# Shell do kontenera
docker compose -f docker-compose.prod.yml exec app sh

# Shell do bazy
docker compose -f docker-compose.prod.yml exec db psql -U manga_user manga_shelf

# Zatrzymanie
docker compose -f docker-compose.prod.yml down

# Usunięcie z danymi (UWAGA!)
docker compose -f docker-compose.prod.yml down -v
```
