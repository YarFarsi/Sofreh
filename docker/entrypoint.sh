#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
if [ "${SEED_DEMO}" = "true" ]; then
  echo "Seeding demo data (SEED_DEMO=true)..."
  npx tsx prisma/seed.ts || true
fi
echo "Starting application..."
exec node server.js
