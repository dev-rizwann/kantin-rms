# Kantin RMS — Restaurant Management Build Plan (v2)

Reviewed independently (Fable 5) against **live-verified** MutfakPos data + the actual codebase.
**Verdict: GO.** This v2 re-sequences to ship value *before* the fragile parts, and cuts a large
amount of over-engineering the first draft carried.

MutfakPos keeps selling — unchanged. This is the backend management layer.

---

## What changed from v1 — and why

**Re-sequenced to ship count-free value first.** v1 buried the payoff behind ~62 hand-authored
recipes + a go-live count + sustained daily counting — four large phases before anything useful
appeared. v2 ships **per-item costing → a count-free "theoretical usage" report → waste log** first.
Those stand alone and need **zero physical counting**, so the project delivers even if the count
discipline never materialises.

**Cut (verified as unnecessary):**
- `order_status` reverse-scan — **it's constant `3`** across all 38.6k rows; not a signal.
- Mode-based packaging branching — H-8 is **99.94% one mode**; build one dine-in path.
- Separate Coolify **worker container + advisory lock + heartbeat + /ops alerts** — over-scale for an hourly, single-outlet, idempotent batch (and you declined alerts). → a cron-triggered route + a row lock.
- **All of v1 Phase 5 procurement** (VendorOffering, price-history, PurchaseOrder/POLine, category tree, par engine) — none of it detects loss. Kept only the trivial below-minStock flag.
- **Full StockTake state machine + ABC scheduling + WastageLog model** — trimmed to a 15-item critical-list MVP + a waste movement with a reason string.
- **Historical COGS reconstruction** (110 days / Rs 7.1M) — unfalsifiable (no past count to check against), zero forward value.
- DEMAND-oracle and the ITEMPROLINK recipe importer — **verified empty** (~1–2 rows); recipes are hand-authored.

**Load-bearing technical corrections (found in the actual code):**
1. **Reconciliation, not a watermark.** `views.sql` collapses re-sent rows with `DISTINCT ON … received_at DESC`, so a later hourly push can flip `void` or add a cancel/refund on an *already-depleted* sale. A monotonic `MAX(id)` cursor **provably misses late voids**. → each run re-scans a **trailing window** of recently-settled tickets and posts compensating `REVERSAL` rows (distinct `refType` per source, coexisting under the existing idempotency unique).
2. **Harden `postGrn`.** `actions.ts:288` **resets `avgCost` to the latest purchase cost when priorQty ≤ 0**. Forward-only depletion routinely drives theoretical on-hand negative between counts, so the next GRN would silently erase cost history — compounding under PKR inflation. → carry prior avgCost forward + flag negative-on-hand.
3. **Characterise `promosaleid`/combos first.** The `mp_itemsale` view doesn't even expose `promosaleid`. Before writing the explode step, query live data and assert "**1 costed itemsale row = 1 explodable unit**" with a skip catch-all — or promo bundles corrupt the ledger silently.
4. **Reuse existing logic.** The settled-and-not-cancelled SQL the theoretical report needs already exists in `lib/h8-live.ts` (mp_cancel join, mp_refund, `NOT void`) — factor it into a shared fragment, don't reinvent.

---

## Core concept (unchanged): Theoretical-vs-Actual (AvT)
- **Theoretical** = recipe × units sold (auto, from the hourly sync). "What you *should* have used."
- **Actual** = opening + purchases − closing count (physical). "What you *really* used."
- **Gap = waste + over-portioning + theft = your leak.** All as signed rows in the existing append-only ledger.

## The floor: P2–P4 must stand alone
If no manager ever commits to the weekly count, **P2–P4 are still a real product** (costing, margins,
count-free theoretical usage, waste log, reorder flag). Keep them shippable and valuable on their own.
The counted-AvT chain (P5–P7) only proceeds once a count owner is committed.

---

## The phases (v2)

| Phase | Delivers | Effort | Counts needed? |
|---|---|---|---|
| **P2 · Recipes + plate cost** | Per-item food-cost %, margin, menu-engineering quadrant | L | No |
| **P3 · Theoretical usage report** | "You sold X → should've used Y kg / Rs C COGS" — the count-free flagship | M | No |
| **P4 · Waste log + reorder flag** | Cheapest QSR wins; below-minStock list; GRN receiving-variance | S | No |
| **P5 · Depletion (cron route)** | Sales auto-deduct ingredients; late-void reconciliation | L | No (writes ledger) |
| **P6 · Stock-take MVP + go-live count** | 15-item critical count; explicit go/no-go gate | M | **Yes (weekly)** |
| **P7 · AvT + recipe calibration** | Rupee-ranked loss report; self-correcting portions | M | Yes |

**P2 — Recipe/BOM + plate cost (ship first).** `Recipe`/`RecipeLine`/`RecipeAlias` + `lib/recipe-cost.ts`
rollup (explode → convert via ProductUom → value at `avgCost` → food-cost %/margin vs `mp_item.price`).
Author **top ~10 volume items first**, ship at partial coverage behind a **"% of sales rupees covered"** banner.
Needs nothing new; writes no ledger rows; can't corrupt anything. *(Keep recipe versioning minimal for now — point-in-time recipes; add effective-dating only when the calibration loop first edits a portion.)*

**P3 — Theoretical usage report (count-free flagship).** Read-only over already-synced sales × recipe →
theoretical consumption per raw item + COGS + food-cost % for any date range. Reuses the existing
settled-not-cancelled SQL. **This is v1's biggest miss** — the leading indicator real chains live on, earned
with zero counting.

**P4 — Waste log + reorder flag (parallel, S-effort).** Waste screen → `WASTAGE` movement + reason; below-minStock
list from existing data; GRN overcharge/rejected-qty flag. Independent of recipes.

**P5 — Depletion as a cron-triggered route.** Characterise promos first → one `DepletionState` row +
authenticated `/api/depletion/run` invoked by Coolify cron after each hourly sync, guarded by
`SELECT … FOR UPDATE` (no container/advisory-lock/heartbeat). **Trailing-window reconciliation** for late
voids/cancels/refunds. Gate on **ticket-settled** (receipt has non-void checkout), not session close. Harden
`postGrn`. One dine-in packaging path. Needs a **replayable test harness** — this is the most bug-prone piece.

**P6 — Stock-take MVP + opening anchor (go/no-go gate).** Freeze → **blind** whole-pack count → approve →
`STOCK_TAKE` adjustment, using the existing schema (only the stub page + one action are missing). Scope to the
**~15 highest avgCost×volume items** (fits on one sheet), pre-open freeze, 60-second tally. **Explicit gate:** if the
go-live count doesn't reconcile, the variance report stays OFF (theoretical report still stands). No ABC/scheduling/compliance-KPI machinery yet.

**P7 — AvT + recipe calibration loop.** variance = theoretical − actual − logged waste, ranked by rupee value,
scoped to the 15 counted items. **Calibration is first-class and early:** day-one hand-authored portions will be
10–30% wrong, so present initial variance as **"recipe accuracy"** with one-click portion accept — then flip to
loss-prevention framing once portions stabilise. Weekly recount, owned by the **on-site manager (not cashiers)**.

---

## Decisions (resolved as sensible defaults — override any)
1. **Forward-only COGS** — no historical backfill.
2. **One go-live count**, but only ~15 critical items, gated as explicit go/no-go, at depletion start.
3. **Count owner = on-site manager, weekly.** If none can be committed → stop after P4; the count-free half is still a product.
4. **H-8 only** until the weekly-count habit holds 4+ weeks.
5. **Start with recipes**, top-10 first; ship the count-free theoretical report before touching counts.

## Top risks (all human/data, not architectural)
- **Weekly count discipline** — the whole counted-AvT chain rests on it. Fallback (P2–P4 standalone) is sacred.
- **Recipe authoring** is the true critical path — treat as ongoing owner activity, not a checkbox; top-10 first.
- **promosaleid/combos uncharacterised** — the one place a wrong assumption corrupts the ledger. Characterise before P5.
- **avgCost integrity under inflation** — the postGrn hardening must not slip to "later."
- **Late-void reconciliation** correctness — needs a replayable test harness.

## Watch for scope re-inflation (over-engineering flags)
Recipe temporal versioning, strict as-of-occurredAt costing, and the 15-item count workflow can all quietly
re-grow into the XL scope just removed. Hold the line: point-in-time recipes, value at reconcile-time avgCost
for v1, a 60-second whole-pack tally. No health-check/alerting surface (you declined alerts) — an in-app
last-run badge is the ceiling.
