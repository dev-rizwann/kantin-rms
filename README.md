# MutfakPos Dashboard

A static Next.js dashboard for MutfakPos / Kantin POS reporting. Reads pre-aggregated data from `data/dashboard.json` that is built locally by a Java JDBC probe against the Derby database, then committed and deployed via Vercel.

## Architecture

```
Local Windows PC                                        Vercel
┌────────────────────────┐                       ┌─────────────────────┐
│ Derby DB (Kantin POS)  │                       │   Next.js build     │
│        │               │                       │        │            │
│        ▼               │                       │        ▼            │
│ DashboardExport.java   │  ─── git push ───▶    │   Static dashboard  │
│        │               │                       │   (basic-auth)      │
│        ▼               │                       │                     │
│ data/dashboard.json    │                       │                     │
└────────────────────────┘                       └─────────────────────┘
```

## Pages

- **/** Overview — KPIs, daily trend, payment mix, top items, hourly heatmap
- **/daily** Daily Sales / Z Report — per-day totals with variance check + cashier sessions (open/close)
- **/items** Item-wise sales since the beginning
- **/categories** Category leaderboard + per-category item drilldown
- **/cashiers** Per-cashier totals, daily activity, payment mix
- **/customers** Customer-wise sales (walk-in + named)
- **/payments** Payment-type totals + daily cross-tab
- **/duplicates** Fuzzy-matched duplicate menu items with "keep" suggestion
- **/catalog** Menu listing per category

## First-time deploy

These steps only need to happen once.

### 1. Create the GitHub repo

```powershell
cd E:\MutfakPos\dashboard
git init
git add .
git commit -m "Initial dashboard"
```

Then create a new repo on GitHub (private recommended) and:

```powershell
git remote add origin https://github.com/<your-username>/mutfakpos-dashboard.git
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel

1. Go to <https://vercel.com/new>
2. Import the GitHub repo you just created
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: leave as default
5. Click **Deploy**

### 3. Set the password

In the Vercel project page → **Settings → Environment Variables**, add:

| Key                  | Value                |
|----------------------|----------------------|
| `DASHBOARD_PASSWORD` | (pick any password)  |

Apply to **Production, Preview, Development**. Then redeploy (Vercel → Deployments → "..." → Redeploy).

The dashboard now requires basic auth — username can be anything, password is whatever you set.

## Refreshing the data

Whenever you want to push the latest POS numbers up:

```powershell
E:\MutfakPos\tools\Export-Dashboard.ps1
```

That script:

1. Recompiles `DashboardExport.java`
2. Runs it against the read-only Derby copy → writes `dashboard/data/dashboard.json`
3. `git add` + `git commit` + `git push`
4. Vercel picks up the new commit and auto-deploys (~1 minute)

### Variations

```powershell
# Build JSON but don't touch git
E:\MutfakPos\tools\Export-Dashboard.ps1 -NoPush

# Custom commit message
E:\MutfakPos\tools\Export-Dashboard.ps1 -Message "End-of-day push 2026-05-22"
```

## Local development

```powershell
cd E:\MutfakPos\dashboard
npm install
npm run dev
```

Visit <http://localhost:3000>. The basic-auth middleware only triggers if `DASHBOARD_PASSWORD` is set — create `dashboard\.env.local` with `DASHBOARD_PASSWORD=test` if you want to test the gate, or leave it unset to skip auth locally.

## Tech

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS for styling
- Recharts for charts
- No backend — everything is static JSON at build time

## Files

- `app/` — pages (one per report)
- `components/` — Sidebar, KpiCard, Card, DataTable, Charts
- `lib/` — `data.ts` (types + JSON loader), `format.ts` (money/date helpers)
- `data/dashboard.json` — the data dump; replaced each export
- `middleware.ts` — basic auth gate (Edge runtime)

## Refreshing the Derby work copy

If you copy a fresh `server/` folder from the POS machine into `E:\MutfakPos\_read_workdb\`, remove any stale lock file before exporting:

```powershell
Remove-Item 'E:\MutfakPos\_read_workdb\server\db.lck' -Force -ErrorAction SilentlyContinue
```

Then run `Export-Dashboard.ps1` as usual.
