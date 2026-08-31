#!/usr/bin/env bash
set -euo pipefail
VERSION=${1:-0.1.0}
APP_IMAGE=food-reservation:${VERSION}
docker compose build
docker pull postgres:16-alpine
mkdir -p dist/docker-images dist/scripts dist/docs dist/database
docker save "$APP_IMAGE" postgres:16-alpine | gzip > "dist/docker-images/images.tar.gz"
cp docker-compose.yml dist/
cp .env.example dist/
cp LICENSE dist/ 2>/dev/null || true
cp README.md README.fa.md dist/
cp -r scripts dist/
cp -r docs dist/ 2>/dev/null || true
cp -r prisma dist/database/prisma
cat > dist/README.md << EOF
# Offline bundle food-reservation v${VERSION}

1. Copy this directory via approved offline media.
2. docker load -i docker-images/images.tar.gz
3. cp .env.example .env and edit secrets.
4. docker compose up -d
5. Wait for health: curl http://APP_HOST:3000/api/health
6. If SEED_DEMO=true an admin is created from env vars.
7. Test backup with scripts/backup.sh then restore on a spare host.
EOF
tar -czf "food-reservation-v${VERSION}-offline.tar.gz" -C dist .
echo "Wrote food-reservation-v${VERSION}-offline.tar.gz"
