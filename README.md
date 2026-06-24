# Kantin RMS

Multi-location Retail Management System for the IESPL Kantin chain.

- **Landing** at `/` lists every kantin and their live status.
- **H-8 (live)** has the full POS-derived reporting suite under `/h8/*`.
- **Chak Shahzad** and **Model Town Multan** are placeholders until their POSes are wired up.
- **Operations** (GRN, Inventory, Stock-Take) are scaffolded — first sprint of forms next.
- **Auth** via email + password (NextAuth.js + Postgres + bcrypt).
- **User management** at `/admin/users` (admin only).

Deployed on Coolify at <https://kantin.iespl.org>.

## Locations

| Location | City | Status |
| --- | --- | --- |
| H-8 Kantin | Islamabad | Live (MutfakPos Derby DB synced) |
| Chak Shahzad Kantin | Islamabad | Coming soon |
| Model Town Kantin | Multan | Coming soon |

## Pages

- `/login` — sign-in form
- `/` — landing with 3 kantin cards
- `/h8/` — overview, daily / Z report, items, categories, cashiers, customers, payments, duplicates, catalog
- `/h8/grn` — Goods Receipt Notes (placeholder, form coming next)
- `/h8/inventory` — raw-material stock (placeholder)
- `/h8/stock-take` — physical inventory count session (placeholder)
- `/admin/users` — user management (admin only)

## Tech stack

- **Next.js 14** App Router + TypeScript + Tailwind
- **NextAuth.js** with Credentials provider, JWT sessions
- **Prisma** + **Postgres** (Coolify-managed)
- **Recharts** for charts
- **bcryptjs** for password hashing
- **Docker** standalone build for Coolify

## Data model (Prisma — see `prisma/schema.prisma`)

- **User** — email/password, role (ADMIN / MANAGER / CASHIER / VIEWER), optional kantin scope
- **Kantin** — slug, name, city, isLive
- **Vendor** — supplier per kantin
- **Product** — raw material / packaging / resale / supplies, per kantin
- **Grn** + **GrnLine** — Goods Receipt Notes
- **StockMovement** — append-only ledger of every stock change
- **StockTake** + **StockTakeItem** — physical count sessions

## Deploying to Coolify (one-time)

### 1. In the **Kantin RMS** Coolify project, add a Postgres service

- Name: `kantin-rms-db`
- Database: `kantin_rms`
- User: `kantin_rms`
- Generate a strong password
- Internal-only, persistent volume

### 2. Add the application

- New Resource → Public Repository → `https://github.com/dev-rizwann/kantin-rms`
- Build pack: **Dockerfile** (auto-detected; will use the `Dockerfile` at repo root)
- Domain: `kantin.iespl.org`
- Port: `3000`

### 3. Set environment variables (Coolify → Resource → Environment)

```
DATABASE_URL=postgresql://kantin_rms:<password>@<internal-host>:5432/kantin_rms?schema=public
NEXTAUTH_SECRET=<output of: openssl rand -base64 32>
NEXTAUTH_URL=https://kantin.iespl.org
SEED_ADMIN_EMAIL=admin@iespl.org
SEED_ADMIN_PASSWORD=<a strong password you'll change on first login>
SEED_ADMIN_NAME=Administrator
```

### 4. First-time deploy

After Coolify finishes building once, exec into the container and apply migrations + seed:

```bash
npx prisma migrate deploy
npx prisma db seed
```

(Or set Coolify's post-deploy command to run these automatically.)

### 5. Sign in

Visit <https://kantin.iespl.org/login> and sign in with the admin email/password you set above. **Change the password immediately** via your user menu.

## Local dev

```powershell
cd E:\MutfakPos\dashboard
npm install

# Spin up Postgres however you like, then:
Copy-Item .env.example .env.local
# Edit .env.local with your local connection string
npx prisma db push
npx prisma db seed
npm run dev
```

## Refreshing H-8 sales data

The H-8 reports still read `data/h8/dashboard.json` baked at build time. The Windows POS PC has the mirror + export pipeline (`E:\MutfakPos\tools\Export-Dashboard.ps1`). After Phase D, this is replaced by direct Postgres reads.

## Removing from Vercel

The old deployment at `mutfakpos-dashboard.vercel.app` should be retired:

1. Go to <https://vercel.com/dev-rizwanns-projects/mutfakpos-dashboard/settings>
2. **Settings → Git → Disconnect** (to stop auto-deploys on push)
3. **Settings → General → Delete Project** (when you're satisfied Coolify is live)
