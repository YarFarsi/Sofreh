# Food Reservation (On-Premise, Air-Gapped)

Persian-first RTL web application for company meal reservation. It is designed to run entirely on a private LAN with **no Internet access at runtime**.

Phase 1 (this release) includes local authentication, weekly menus, Jalali calendar, capacity/waitlist, QR meal tickets, serving, reports (Excel), audit logs, and Docker offline deployment.

## Demo credentials (development only)

Do **not** use these passwords in production.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.local` | `ChangeMe-Admin-0!` |
| User | `user@example.local` | `ChangeMe-User-0!` |
| Pending user | `pending@example.local` | `ChangeMe-Pending-0!` |
| Branch admin (north only) | `branch@example.local` | `ChangeMe-Branch-0!` |
| Accountant | `accountant@example.local` | `ChangeMe-Account-0!` |

Pending user must be approved in **مدیریت → کاربران**.

A sample lunch ticket token for serving tests: `demo-ticket-ali-lunch` (valid only while that reservation stays `RESERVED` and the lunch serving window is open).

## Local development

Requirements: Node.js 22, Docker, PostgreSQL 16 (or Docker Compose).

```bash
cp .env.example .env
docker compose up -d db
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open `http://localhost:3000`.

## Air-gapped deployment

### 1. Build on a connected machine

```bash
npm ci
npx prisma generate
npm test
npm run lint
npm run typecheck
npm run build
bash scripts/build-offline-bundle.sh 0.1.0
```

The bundle `food-reservation-v0.1.0-offline.tar.gz` contains Docker images, compose file, env example, scripts, and docs.

### 2. Transfer with approved offline media

Copy the archive onto the isolated network. Do not expect `npm install`, `apt update`, or `docker pull` to work there.

### 3. Import images

```bash
tar -xzf food-reservation-v0.1.0-offline.tar.gz
docker load -i docker-images/images.tar.gz
```

### 4. Configure

```bash
cp .env.example .env
# set SESSION_SECRET, POSTGRES_PASSWORD, APP_URL=http://food.company.local
# production: SEED_DEMO=false
```

### 5–9. Start, migrate, admin, health, backup

```bash
docker compose up -d
# entrypoint runs prisma migrate deploy
# if SEED_DEMO=true, demo admin is created
curl http://food.company.local:3000/api/health
bash scripts/backup.sh
```

Create the first production admin with a strong password via seed disabled + SQL/Prisma, or temporarily seed then change passwords and disable demo users.

Health checks hit only the local app and PostgreSQL. They never call the Internet.

## Security notes

- Passwords are bcrypt-hashed.
- Sessions are random tokens stored as SHA-256 hashes in PostgreSQL, httpOnly cookies.
- Authorization is permission-based and enforced on the server.
- Reservation and serving use row locks / conditional updates.
- Historical reservation prices are snapshotted and never recomputed from current food prices.
- Uploads are type-checked by magic bytes and stored on local disk (`/data/uploads`).

## Branding

Set `orgNameFa` in organization settings. Replace `public/` static assets as needed. Do not fork business logic for logos.

## Tests

```bash
npm test
npm run offline:check
```

Playwright (`npm run test:e2e`) expects the app to be running.

## License

MIT
