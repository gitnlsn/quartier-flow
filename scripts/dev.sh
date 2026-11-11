#!/usr/bin/env bash
# Local development: start Postgres (docker compose), wait until healthy,
# apply the Prisma schema, then run the Next.js dev server.
# Ctrl+C stops Next.js and the database container (data is kept in the volume).
set -euo pipefail

cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Always use the local database, even if .env points to a remote one (e.g. Neon).
# Real environment variables take precedence over .env for both Prisma and Next.js.
export DATABASE_URL="postgresql://postgres:password@localhost:5432/quartier-flow"

if ! docker info >/dev/null 2>&1; then
	echo -e "${RED}Docker is not running. Start Docker Desktop and try again.${NC}"
	exit 1
fi

cleanup() {
	echo -e "\n${YELLOW}Stopping database container (data is kept)...${NC}"
	docker compose stop postgres >/dev/null 2>&1 || true
}
trap cleanup EXIT

if [ ! -x node_modules/.bin/prisma ]; then
	echo -e "${GREEN}Installing dependencies...${NC}"
	npm install
fi

echo -e "${GREEN}Starting Postgres...${NC}"
docker compose up -d --wait postgres

# --no: never download a different Prisma version, use the project's own CLI.
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
	echo -e "${GREEN}Applying migrations...${NC}"
	npx --no prisma migrate deploy
else
	echo -e "${YELLOW}No migrations folder found, syncing schema with prisma db push...${NC}"
	npx --no prisma db push
fi

echo -e "${GREEN}Seeding plans...${NC}"
npm run --silent script scripts/seed-plans.ts

echo -e "${GREEN}Starting Next.js...${NC}"
npm run dev
