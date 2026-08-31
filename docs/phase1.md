Phase 1 is implemented, running locally in Docker, and tagged. Phase 2 and Phase 3 were not started.

Open **http://localhost:3000** (containers are up; `/api/health` returned `ok` for app, database, and storage).

---

**Phase:** 1  
**Version:** `v0.1.0`

**Implemented:**
- Local registration (PENDING → admin approve → ACTIVE), login/logout, bcrypt passwords, hashed sessions, permission-based auth (`USER` / `ADMIN`)
- Persian RTL UI, bundled Vazirmatn, Jalali week view, configurable week start (not hard-coded Saturday), `Asia/Tehran`
- Foods, meal types, org settings, weekly menu with **price snapshots**
- Reservations with cutoff, capacity, waitlist promotion, admin override + audit
- Opaque QR tickets, serving screen, atomic serve, unserved list
- Admin dashboard, Excel reports (offline), audit log, in-app notifications
- Local disk uploads, health checks, internal scheduler, Docker Compose + backup/restore scripts

**Tests:**
- Vitest: 10/10 (Jalali, week/cutoff, meal window, money snapshot, capacity, permissions)
- `tsc --noEmit` and `eslint` passed
- `npm run offline:check` passed (no Google Fonts/CDN in `src/`)
- Playwright spec exists (`e2e/demo.spec.ts`); browsers were not installed in this session, so the full click-through E2E was not executed

**Build:** `npm run build` succeeded  

**Docker:** image `food-reservation:0.1.0` built; `docker compose up -d` healthy  

**Offline verification:**
- Runtime uses only the app container ↔ PostgreSQL ↔ local `/data/uploads`
- No Google Fonts / CDN in application source
- Air-gapped install path: `scripts/build-offline-bundle.sh` (build on a connected machine, `docker load` on the isolated host)
- Full “host has no Internet” compose test was not run (images were built on a connected machine)

**Demo credentials (lab only — not for production):**

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.local` | `ChangeMe-Admin-0!` |
| User | `user@example.local` | `ChangeMe-User-0!` |
| Pending | `pending@example.local` | `ChangeMe-Pending-0!` |

Sample lunch ticket: `demo-ticket-ali-lunch` (only while that reservation is `RESERVED` **and** the lunch serving window is open).

**Demo steps:**
1. Open http://localhost:3000  
2. Admin login → **مدیریت → کاربران** → approve مینا احمدی  
3. User login → weekly Jalali menu → reserve / cancel  
4. **رزروهای من** → QR  
5. Admin **تحویل غذا** → scan or paste token → **تحویل غذا** → scan again for duplicate message  
6. Dashboard, unserved, Excel, audit  
7. `docker compose restart` — data stays in volumes  

**Known limitations:**
- Phase 2/3 (branches, SMTP send, accountant, ratings) not implemented  
- Email adapter is a no-op without `SMTP_HOST`  
- Changing a meal is cancel-then-reserve (not an in-place food picker)  
- Rate limit is in-memory (one app instance)  
- Backup/restore scripts are documented; restore was not proven on a spare host  
- Playwright E2E not run here  

**Git commit:** `b4c717706f89eaee0cc3b235854f2814b68ba316` — `feat: complete phase 1 offline food reservation system`  
**Git tag:** `v0.1.0` — `Phase 1 offline demo`

Docs: `README.md`, `README.fa.md`. Production: set `SEED_DEMO=false`, strong `SESSION_SECRET` / DB password, and non-demo admin credentials.