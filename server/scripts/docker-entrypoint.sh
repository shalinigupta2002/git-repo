#!/bin/sh
# Docker container entrypoint.
# Runs database migrations (and optional seed) then hands off to the API server.
#
# Environment variables:
#   DATABASE_URL   — required; passed in via docker-compose / platform secrets
#   SEED_DB        — set to "true" to seed demo data (development / staging only)
set -e

echo "[entrypoint] Waiting for database to accept connections..."
until node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect().then(() => { c.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "[entrypoint] Database not ready — retrying in 2 s..."
  sleep 2
done
echo "[entrypoint] Database is ready."

echo "[entrypoint] Running Prisma migrations (deploy)..."
npx prisma migrate deploy

echo "[entrypoint] Running catalog schema migrations..."
node src/db/migrate.js

if [ "${SEED_DB:-false}" = "true" ]; then
  echo "[entrypoint] Seeding Prisma demo data..."
  node prisma/seed.js
  echo "[entrypoint] Seeding catalog demo data..."
  node src/db/migrate.js --seed
fi

echo "[entrypoint] Starting API server..."
exec node src/index.js
