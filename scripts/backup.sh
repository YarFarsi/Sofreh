#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=${1:-"./backups/backup-$STAMP"}
mkdir -p "$OUT"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-food}" -d "${POSTGRES_DB:-food_reservation}" -F c > "$OUT/database.dump"
docker compose exec -T app sh -c 'tar -C /data -cf - uploads' > "$OUT/uploads.tar" || true
echo "Backup written to $OUT"
echo "Restore is not proven until scripts/restore.sh succeeds against a test instance."
