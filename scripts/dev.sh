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

# Migrations also insert reference data (plans). --no: never download a
# different Prisma version, use the project's own CLI.
echo -e "${GREEN}Applying migrations...${NC}"
if ! output=$(npx --no prisma migrate deploy 2>&1); then
	echo "$output"
	# P3005: a database created by the old `prisma db push` flow, with no
	# migration history. Its tables already match 0_init: mark it applied once.
	if grep -q "P3005" <<<"$output"; then
		echo -e "${YELLOW}Existing database without migration history: baselining 0_init...${NC}"
		npx --no prisma migrate resolve --applied 0_init
		npx --no prisma migrate deploy
	else
		exit 1
	fi
else
	echo "$output"
fi

echo -e "${GREEN}Starting Next.js...${NC}"
npm run dev
