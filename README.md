# Kantin RMS

A multi-location Reporting & Management System for the IESPL Kantin chain.

Landing page lists each location; locations that are live link into a full
analytics dashboard powered by data exported from the on-site POS.

## Locations

| Location | City | Status |
| --- | --- | --- |
| H-8 Kantin | Islamabad | Live (MutfakPos Derby DB synced) |
| Chak Shahzad Kantin | Islamabad | Coming soon |
| Model Town Kantin | Multan | Coming soon |

## Architecture

```
H-8 POS PC (Windows)                     Build / Deploy
┌────────────────────────┐               ┌────────────────────────┐
│ MutfakPos Derby DB     │               │ Next.js build          │
│        │               │               │   ↓                    │
│        ▼               │               │ Static, multi-route    │
│ Mirror-POSDB.ps1       │               │ site at                │
│ (VSS, zero-impact)     │               │ kantin.iespl.org       │
│        │               │               │ (Coolify / Vercel)     │
│        ▼               │               │ basic-auth gated       │
│ Local mirror           │               └────────────────────────┘
│        │               │
│        ▼               │
│ DashboardExport.java   │
│        │               │
│        ▼               │   git push
│ data/h8/dashboard.json │ ─────────────►
└────────────────────────┘
```

Other locations will follow the same model: their POS PC runs the same mirror
script and exports to `data/<slug>/dashboard.json`, then the Kantin RMS site
flips them from "Coming soon" to "Live".

## Pages per kantin (H-8 today)

- `/` Landing — kantin cards
- `/h8/` Overview — KPI cards, daily trend, payment mix, top items
- `/h8/daily` Daily Sales / Z Report — per-day totals with variance check
- `/h8/items` Per-item sales since the beginning
- `/h8/categories` Category leaderboard + drill-down
- `/h8/cashiers` Per-cashier totals, daily activity, payment mix
- `/h8/customers` Customer-wise sales
- `/h8/payments` Payment-type totals + daily cross-tab
- `/h8/duplicates` Fuzzy-matched duplicate menu items
- `/h8/catalog` Menu listing per category

## Local dev

```powershell
cd E:\MutfakPos\dashboard
npm install
npm run dev
```

Visit <http://localhost:3000>.

## Refreshing the H-8 data

```powershell
E:\MutfakPos\tools\Export-Dashboard.ps1
```

This re-runs the Java probe → regenerates `dashboard/data/h8/dashboard.json` →
commits → pushes to GitHub → Vercel/Coolify auto-deploys (~1 minute).

## Auth

Basic-auth middleware reads `DASHBOARD_PASSWORD` from env. Username is anything,
password is whatever you set in the host (Vercel / Coolify env vars).

## Tech

- Next.js 14 App Router + TypeScript
- Tailwind CSS
- Recharts
- Static rendering — no backend at request time
