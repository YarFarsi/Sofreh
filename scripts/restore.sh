#!/usr/bin/env bash
set -euo pipefail
SRC=${1:?usage: restore.sh /path/to/backup-dir}
echo "Restoring database from $SRC/database.dump"
docker compose exec -T db pg_restore --clean --if-exists -U "${POSTGRES_USER:-food}" -d "${POSTGRES_DB:-food_reservation}" < "$SRC/database.dump"
if [ -f "$SRC/uploads.tar" ]; then
  docker compose exec -T app sh -c 'tar -C /data -xf -' < "$SRC/uploads.tar"
fi
echo "Restore completed. Verify /api/health and a sample login."
