#!/bin/bash

# ===========================================
# Manga Shelf Tracker - Deploy Script
# ===========================================
# Użycie: ./scripts/deploy-ssh.sh
#
# Wymagane zmienne środowiskowe:
#   MINI_PC_USER     - użytkownik SSH na Mini PC
#   MINI_PC_HOST     - adres IP/hostname Mini PC
#   MINI_PC_PATH     - ścieżka do projektu na Mini PC
#   POSTGRES_PASSWORD - hasło do bazy danych
#   NEXTAUTH_SECRET  - sekret NextAuth

set -e

# Kolory
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Sprawdzenie zmiennych środowiskowych
if [ -z "$MINI_PC_USER" ] || [ -z "$MINI_PC_HOST" ] || [ -z "$MINI_PC_PATH" ]; then
  echo -e "${RED}Błąd: Nie ustawiono zmiennych środowiskowych!${NC}"
  echo ""
  echo "Ustaw zmienne:"
  echo "  export MINI_PC_USER='twoj_uzytkownik'"
  echo "  export MINI_PC_HOST='192.168.1.100'"
  echo "  export MINI_PC_PATH='/home/twoj_uzytkownik/manga-shelf'"
  echo "  export POSTGRES_PASSWORD='silne_haslo'"
  echo "  export NEXTAUTH_SECRET='losowy_klucz_32_znaki'"
  exit 1
fi

echo -e "${YELLOW}=== Manga Shelf Tracker - Deploy ===${NC}"
echo -e "Serwer: ${MINI_PC_USER}@${MINI_PC_HOST}"
echo -e "Ścieżka: ${MINI_PC_PATH}"
echo ""

# 1. Tworzenie kopii zapasowej na serwerze
echo -e "${YELLOW}[1/5] Tworzenie kopii zapasowej...${NC}"
ssh ${MINI_PC_USER}@${MINI_PC_HOST} "cd ${MINI_PC_PATH} && \
  if [ -f docker-compose.prod.yml ]; then \
    docker compose -f docker-compose.prod.yml down; \
  fi && \
  if [ -d postgres_data ]; then \
    tar -czf backup_\$(date +%Y%m%d_%H%M%S).tar.gz postgres_data/ 2>/dev/null || true; \
  fi"

# 2. Synchronizacja kodu
echo -e "${YELLOW}[2/5] Synchronizacja kodu...${NC}"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'postgres_data' \
  --exclude '*.tar.gz' \
  ./ ${MINI_PC_USER}@${MINI_PC_HOST}:${MINI_PC_PATH}/

# 3. Przesyłanie plików env
echo -e "${YELLOW}[3/5] Przesyłanie konfiguracji...${NC}"
cat > /tmp/.env.prod << EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-manga_secret_password}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}
NEXTAUTH_URL=${NEXTAUTH_URL:-https://manga.daqu.eu}
EOF

scp /tmp/.env.prod ${MINI_PC_USER}@${MINI_PC_HOST}:${MINI_PC_PATH}/.env
rm /tmp/.env.prod

# 4. Budowanie i uruchamianie
echo -e "${YELLOW}[4/5] Budowanie kontenerów...${NC}"
ssh ${MINI_PC_USER}@${MINI_PC_HOST} "cd ${MINI_PC_PATH} && \
  docker compose -f docker-compose.prod.yml up -d --build"

# 5. Migracje bazy danych
echo -e "${YELLOW}[5/5] Migracje bazy danych...${NC}"
sleep 10
ssh ${MINI_PC_USER}@${MINI_PC_HOST} "cd ${MINI_PC_PATH} && \
  docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate deploy || true"

echo ""
echo -e "${GREEN}=== Deploy zakończony pomyślnie! ===${NC}"
echo -e "Aplikacja dostępna pod adresem: ${NEXTAUTH_URL:-http://${MINI_PC_HOST}:3000}"
