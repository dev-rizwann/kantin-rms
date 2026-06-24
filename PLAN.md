# Kantin RMS — Inventory & Purchasing System: Master Build Plan

**Status:** Approved design, ready to build
**Scope:** Inventory + Purchasing ONLY (no GL, payroll, AR/AP, full accounting)
**Approach:** Custom build inside the existing Next.js 14 / Prisma / Postgres app — NOT ERPNext/Odoo
**Selling side:** Stays MutfakPos. Sales already flow hourly into Postgres.
**Effort:** ~100–120 dev-days across 10 phases (single dev + AI assistance). Phase 1 usable in ~2 weeks.

This plan was produced by an 8-domain design pass + synthesis + adversarial completeness review. The review found a major asset the first draft missed (see §0) and several semantic corrections, all folded in below.

---

## 0. CRITICAL PRE-WORK — Leverage what MutfakPos already gives us

The completeness review found that **our sync pipeline already pushes MutfakPos's own inventory tables** into Postgres (`PushToVPS.java` lines 46–81). Before building a parallel recipe engine, we MUST exploit these:

| MutfakPos table (already synced) | What it is | How we use it |
|---|---|---|
| `ITEMPROLINK` | menu-item → ingredient-product links, with AMOUNT + REQUIRED | **One-time importer** to bootstrap our Recipe/RecipeLine instead of hand-authoring 62 recipes |
| `PRODUCT` | raw materials with UNIT, MINLEVEL, INVENTORYID | **Seed our Product catalog** (potato, oil, cheese, buns…) |
| `DEMAND` | MutfakPos's OWN per-sale recipe explosion (SALEID→ITEMSALE.ID, PRODUCTID, AMOUNT) | **Reconciliation oracle** — cross-check our theoretical consumption against MutfakPos's; the single best loss-prevention signal |
| `SUPPLY` | MutfakPos's goods receipts (PRODUCTID/VENDORID/QTY/PRICE) | Historical GRN reference; possible opening-balance source |
| `INVENTORY`, `WAREHOUSE`, `WHSUPPLY` | MutfakPos's inventory structure | Reference for product grouping |

**Phase 0.5 (NEW, mandatory): Query the live H-8 DB and quantify how populated `ITEMPROLINK` / `DEMAND` / `PRODUCT` / `SUPPLY` actually are.** Earlier investigation showed only 1 of 62 items (water) had a recipe and DEMAND had ~1,369 rows (all water). **If that's still true, the custom recipe layer is justified** (MutfakPos's is unused). **If H-8 has since populated them, the importer shrinks Phase 4 dramatically and DEMAND becomes a free verification ledger.** This investigation gates the recipe-build decision — do not skip it.

---

## 1. Architecture

**Stack (unchanged):** Next.js 14 App Router + TypeScript + Tailwind + Prisma + Postgres on Coolify/Hetzner.

**Three data tiers:**

- **(A) Sales tier** — MutfakPos Derby → mirror (VSS) → hourly push into `sync_batch` (JSON). A new **extraction step** materializes new batches into typed, indexed tables `mp_itemsale_t / mp_checkout_t / mp_cancel_t / mp_refund_t` (UPSERT deduped on `(kantin_slug, id)`, keep newest). The existing 12 `mp_*` **views** get repointed at these `_t` tables — the H-8 dashboard keeps working but gets fast indexed reads instead of the current full-JSON scans.
- **(B) Inventory tier** — the new PRIMARY data that exists ONLY here: Vendor / Product / Recipe / GRN / StockTake / Wastage / Transfer / VendorInvoice / VendorPayment + the **StockMovement ledger**.
- **(C) Derived tier** — `v_stock_on_hand` = `SUM(qty) FROM stock_movement GROUP BY (kantin_slug, product_id, storage_location_id)`. A plain VIEW first; promote to MATERIALIZED only if read latency demands. **Never a source-of-truth table.**

**The ledger is the heart:** append-only, idempotent via `@@unique([kantinSlug, refType, refId, productId])`, with `qty` ALWAYS stored in the product's canonical stock UoM so on-hand is a trivial SUM with no per-row conversion.

**The worker:** a dedicated Node container (second Coolify resource, same repo/Dockerfile, worker entrypoint, shared `DATABASE_URL` over internal network) running a 5-minute advisory-locked tick:
1. **EXTRACT** — `sync_batch` → `_t` tables
2. **DEDUCT** — join active Recipe → explode RecipeLine → UoM-convert → insert SALE movements (ON CONFLICT DO NOTHING)
3. **REVERSE** — detect now-voided/cancelled sales already deducted → post compensating REVERSAL movements

**UoM:** `UnitOfMeasure` table (seeded 1:1 from the StockUnit enum + Pakistani units) + `UomConversion` (dimension-level kg↔g, l↔ml) + `ProductUom` (product-specific pack sizes: 1 bori rice = 25 kg, 1 box = 24 bottles).

**Weighted-average cost** (`Product.avgCost`) is the ONE legitimately cached path-dependent number, snapshotted per GRN with a `ProductCostHistory` audit trail. (See §7 correction on backdating.)

**Auth:** existing NextAuth (ADMIN/MANAGER/CASHIER/VIEWER, optional per-kantin scope) centralized into a single `can(session, action, kantinSlug)` predicate, with an append-only `AuditLog` written inside every mutation transaction.

**All money/valuation fields migrate Float → Decimal** to prevent rounding drift (done early while data volume is low).

---

## 2. The 5 non-negotiable rules

1. **StockMovement is APPEND-ONLY.** Never UPDATE or DELETE a movement. Corrections = compensating REVERSAL rows with `reversedById`.
2. **Every stock-on-hand number = `SUM(delta) FROM stock_movement`.** No shadow/cached stock tables. (A materialized view of that sum is OK; a hand-maintained column is not.)
3. **GRN received-qty starts BLANK and is REQUIRED.** Never autofill from PO — forces physical count. (2nd-biggest source of variance per research.)
4. **Idempotent worker** via the ledger unique constraint — replays are always safe.
5. **Sub-1%-of-plate-cost ingredients (salt, pepper, water) are EXCLUDED from BOMs** — bucketed as kitchen overhead. Variance noise destroys signal.

---

## 3. Data model (full)

### New tables
- **UnitOfMeasure** — `code @id`, name, nameUr, dimension (MASS/VOLUME/COUNT), isBaseForDimension, ratioToBase Decimal(20,6). Seeded: KG, GRAM, LITRE, ML, PIECE, PACK, BOX, BOTTLE, DOZEN, PACKET, BORI, MAUND, TIN, CAN, CRATE, TRAY.
- **UomConversion** — dimension-level factors (kg↔g, l↔ml, dozen=12). The test-asserted pair table for mass-conservation tests.
- **ProductUom** — per-product pack sizes (1 BORI = 25 kg). `qtyInStockUom`, role (PURCHASE/COUNT/STOCK/BOTH), isDefaultPurchase. **This is where cross-dimension bridges live (1 bun = 55 g).**
- **PurchaseOrder / PurchaseOrderLine** — optional PO, advisory only (never touches ledger). Status: DRAFT/SENT/PARTIALLY_RECEIVED/RECEIVED/CLOSED/CANCELED.
- **VendorInvoice** — vendor's bill; 3rd leg of 3-way match. matchStatus, paymentStatus, fbrInvoiceNo. Lightweight, not an AP subledger.
- **VendorPayment / VendorPaymentAllocation** — cash/bank outflow via Pakistani rails (CASH/JAZZCASH/EASYPAISA/BANK_TRANSFER/CHEQUE), splittable across invoices.
- **VendorCreditNote** *(added per review)* — short-weight/short-delivery credit applied against a FUTURE invoice (common in mandi/wholesale). VendorPayment only moves money toward invoices; this moves it back.
- **Recipe / RecipeLine** — versioned BOM keyed on `mpItemId` (BigInt, FK-by-value to the mp_item view, NOT a Prisma relation). effectiveFrom/effectiveTo for historical-correct explosion. yieldQty, producesProductId (prep/sub-recipe), status, overheadPct, wastePct.
- **RecipeAlias** *(added per review)* — maps multiple `mpItemId`s (e.g. Foodpanda duplicate menu items) to ONE canonical recipe.
- **StockMovement (MODIFY)** — extend kind with REVERSAL/PURCHASE_RETURN/PRODUCTION; add reversedById self-relation, recipeId/recipeVersion, storageLocationId, valueDelta, `@@unique([kantinSlug,refType,refId,productId])`; qty/unitCost Float→Decimal. `occurredAt` = business time, `createdAt` = insert time.
- **WastageLog / WastageLine** — reason-coded (SPOILAGE/OVERCOOK/DROPPED/EXPIRED/STAFF_MEAL/SAMPLING/SPILLAGE/BURNT/THEFT/TRAINING/OTHER), photo, posts WASTAGE movements.
- **StockTake / StockTakeItem (MODIFY)** — add frozenAt, type (FULL/CYCLE/PARTIAL), scope, blindCount, storageLocationId, approver, rejectedReason. countedQty BLANK by default.
- **Transfer / TransferLine** — inter-branch (DRAFT→DISPATCHED→RECEIVED/DISPUTED). sourceProductId/destProductId, qtyDispatched/qtyReceived.
- **ProductCostHistory** — audit trail of weighted-avg cost recomputes (the one cached number, made reproducible).
- **StorageLocation** — optional sub-location (STORE/KITCHEN/FRIDGE/FREEZER). Nullable everywhere; default "Main Store".
- **InventoryCategory** — storeroom categories (Dairy/Frozen/Dry/Packaging), distinct from MutfakPos menu categories.
- **MasterProduct / KantinProduct** — shared catalog with per-kantin overrides (multi-branch).
- **AuditLog** — append-only who/what/when, written inside every mutation transaction.
- **SchoolCalendar** *(added per review)* — term dates, holidays, recess, exam-day closures per kantin. **Required** — all "selling days only" and alert-suppression logic depends on it.
- **PriceList / PriceListLine** *(added per review)* — agreed/expected vendor rates → overcharge guard at GRN (flag "charged 20% above agreed rate").
- **Worker state** — SyncExtractState, InventoryWorkerState, WorkerRun.
- **Alert** — rule-driven (LOW_STOCK/EXPIRY/BIG_VARIANCE/UNRECIPED_ITEM/NO_SYNC/NEGATIVE_STOCK), dedupe, ack/snooze, auto-resolve.

### Modified existing tables
- **Product** — +stockUomCode, +avgCost, +lastPurchaseCost, +purchaseUomCode, +reorderQty/+minStock, +preferredVendorId, +nameUr, +inventoryCategoryId, +masterProductId, +countFrequency, +lastCountedAt; Float→Decimal.
- **Vendor** — +contactPerson, +whatsapp, +paymentTermsDays, +leadTimeDays, +deliveryDays, +supplyCadence, +ntn, +strn, +isSalesTaxRegistered, +bank/jazzcash/easypaisa fields, +nameUr, +performance rollups.
- **Grn / GrnLine** — +poId, +vendorInvoiceId, +storageLocationId, +receivedById, +challanPhotoUrl, +isInformal, FBR tax fields, +rejectedQty, +batchNo, +expiryDate; Float→Decimal.
- **Kantin** — +defaultCurrency (PKR), +ntn, +strn, +fbrPosRegNo placeholder, +onboardingProgress, settings.

### Postgres objects (not Prisma)
- `v_stock_on_hand` VIEW (current stock = SUM delta).
- `mp_*_t` typed indexed sales tables + repointed `mp_*` views.

---

## 4. CRITICAL SEMANTIC CORRECTIONS (from the completeness review — these are mistakes the naive design would have made)

These are locked decisions, not open questions:

1. **CANCEL ≠ REFUND for stock.** CANCEL = item never made → **reverse** consumption (stock comes back). REFUND = item made & served, money returned → **do NOT reverse stock** (food was consumed). Treating both the same would systematically over-credit inventory and hide shrinkage. Configurable per kantin, but this is the default.

2. **Deduction gates on ticket CLOSE, not add-time.** `ITEMSALE.SALETIME` is stamped when an item is ADDED to an open receipt, not when paid. The worker must only deduct ITEMSALE rows whose `RECEIPTID` has a **non-void CHECKOUT** (the close event). The `mp_itemsale_t` extraction must carry the checkout linkage so the worker can join ITEMSALE → RECEIPT → CHECKOUT.

3. **Two distinct void paths.** Whole-ticket void flips `CHECKOUT.VOID` (keyed on RECEIPTID). Single-line cancel inserts a `CANCEL` row (keyed on ITEMSALE.ID). The REVERSE pass needs BOTH queries.

4. **ITEMSALE has NO quantity column.** Quantity N = N separate ITEMSALE rows. `lib/explode.ts` must NOT look for a qty field; one row = one unit. Unit test must assert N rows = N × recipe.

5. **Late voids are missed by a pure forward watermark.** A re-pushed `sync_batch` row that flips void false→true AFTER a SALE was deducted is BEHIND the watermark. The REVERSE pass must re-evaluate already-processed itemsales for newly-appeared voids, not just scan rows past the watermark.

6. **Reversal idempotency key.** A SALE and its REVERSAL would collide under `unique(refType,refId,productId)`. **Resolution:** reversal uses a distinct `refType` (e.g. `SALE_REVERSAL`) so the positive and negative rows coexist, both idempotent. Lock this before Phase 5.

7. **Stock-take adjustment basis.** Adjustment = `countedQty − (ledger SUM at approval)`, but between frozenAt and approval, GRNs/wastage/transfers (not just sales) can post. The adjustment absorbs ALL of them. **Resolution:** freeze the product against non-count movements during an open take (block GRN/transfer on in-count products, or compute adjustment against the frozenAt sum + only-SALE-since). Defined precisely in Phase 2.

8. **avgCost cannot be naively cached if backdating is allowed.** Backdated GRNs, replay, and returns invalidate a forward-computed avgCost. **Resolution:** forbid backdated cost-bearing movements by default; if a backdate is needed, trigger a deterministic cost-replay from ordered cost-bearing movements. Never let cached cost silently diverge.

9. **MODE + PROMO affect realized price.** `ITEMSALE.MODE` selects PRICE/PRICETAKEAWAY/PRICEDELIVERY (and is the Foodpanda discriminator). `PROMOSALEID` may reduce realized revenue. COGS/margin math must read the mode-correct, post-promo price — not `ITEM.PRICE`.

10. **Portion/weight-priced items (e.g. JUICE by size).** `ITEM.PORTION` flags variable-price items a fixed per-unit recipe can't explode. These need a portion-aware recipe variant or explicit handling — flag them, don't silently mis-deduct.

11. **Refund-where-food-was-made** double-counts stock back if reversed. Covered by correction #1.

---

## 5. Phased roadmap

Each phase delivers usable value and builds on the last. Effort = single dev + AI.

| # | Title | Days | Goal |
|---|---|---|---|
| **0** | Foundations: migrations, UoM, ledger hardening, Decimal | 12 | Make schema safe to build on. Real migration files, UoM system, idempotent append-only ledger, Float→Decimal, `can()` + AuditLog. |
| **0.5** | **Investigate + leverage MutfakPos native tables** | 2 | Query ITEMPROLINK/DEMAND/PRODUCT/SUPPLY population. Decide recipe-build depth. Build the importer if warranted. *(NEW per review)* |
| **1** | Vendor + GRN (record real deliveries week one) | 16 | H-8 records real goods receipts + vendors. Stock starts rising in the ledger. Includes **product catalog seed** from MutfakPos PRODUCT. |
| **2** | Stock-take, Wastage, Opening Balances | 13 | Seed real starting stock (H-8 has no history). Tools to keep the ledger honest manually before automation depends on it. |
| **3** | Sales extraction + worker scaffold (no explosion yet) | 10 | Fix JSON scans (→ `_t` tables). Stand up the worker container + advisory lock + health/dead-man's-switch + `/ops`. **Move NO_SYNC/NEGATIVE_STOCK/worker-dead alerts here** *(per review — they're needed when the worker goes live, not Phase 7)*. |
| **4** | Recipes + COGS authoring (no auto-deduction yet) | 14 | Author/import BOMs, see plate cost/margin. `lib/explode.ts` pure function with mass-conservation tests. **Includes MODE/PROMO realized-price handling and portion-item handling** *(per review — COGS can't be correct without it)*. |
| **5** | Explosion worker live (deduct + reverse) | 12 | Real-time stock depletion from POS sales — the core payoff. Correct close-gating, cancel-vs-refund, late-void re-evaluation, DEMAND cross-check. |
| **6** | Purchasing depth: PO, 3-way match, returns, credit notes, replay | 14 | Complete the formal purchasing cycle + recipe-correction tooling + overcharge guard via PriceList. |
| **7** | Reporting suite, alerts, FBR/Pakistan reports, exports | 16 | The analytical + compliance payoff. Variance report (loss-prevention centerpiece), COGS, purchase analysis, wastage, valuation, input-tax. |
| **8** | Multi-branch: master catalog, transfers, onboarding, full user admin | 16 | Chak Shahzad + Multan onboardable; safely multi-operator. **(User CRUD partially pulled earlier — see §6 sequencing fix.)** |
| **9** | Operational hardening: backups, DR runbooks, monitoring | 8 | Make the now-primary inventory data survivable. Offsite encrypted backups + monthly restore test + DR runbooks. |

**Phase 1 is usable in ~2 weeks. Full system ~100–120 days.**

---

## 6. Sequencing fixes (from review)

- **Critical ops alerts** (NO_SYNC, NEGATIVE_STOCK, worker-dead) move from Phase 7 → **Phase 3/5** where they're operationally needed.
- **User CRUD + password reset + deactivation** partially pulled from Phase 8 → a lightweight version in **Phase 1** (multi-user H-8 runs for months before Phase 8 otherwise).
- **MODE/PROMO/portion realized-price work** explicitly scheduled in **Phase 4** (COGS can't compute correct margin without it).
- **MasterProduct backfill**: a migration bridges Phase-1 local products (masterProductId=null) to the Phase-8 master catalog before any transfer works.
- **Recipe-calibration workflow** added to Phase 5/6 — the first stock-take after go-live will show huge variances that are recipe-error, not theft; need a way to tune recipes from reality (back-solve portion size from receipts − count − wastage / units sold).

---

## 7. Permission matrix

- **ADMIN** (scope=null, all kantins): everything. Sole role for user.*, kantin.*, synctoken.*, master_catalog.edit, settings.edit_all, transfer.resolve_dispute, audit.view_all.
- **MANAGER** (own kantin): grn.post, po.*, stocktake.approve, recipe.edit, product.edit/override, vendor.edit, invoice.approve, payment.record, purchase_return, transfer.dispatch/receive, adjustment, wastage, settings (subset), reports (own). Denied: user.*, kantin.*, master catalog, all-kantin reports.
- **STOREKEEPER/CASHIER** (own kantin): grn.create (draft, enter received qty), quick_cash, stocktake.count, wastage.log, transfer.create (draft), inventory.view, non-cost reports. Denied: post/approve, recipe/product/vendor edit, invoices, payments, any cost-sensitive report.
- **VIEWER** (own or all): reports + ledger + audit (read-only, in scope). Denied: every write.

**Predicate:** `can(session, action, kantinSlug)` = role-grants-action AND (scope is global OR matches). Single check gates every mutation + protected page. UI **hides** (not just disables) out-of-scope actions.

Guards: cannot deactivate/demote the last active ADMIN or self; re-validate `isActive` on sensitive mutations (long-lived JWT); rotate `NEXTAUTH_SECRET` on offboarding.

---

## 8. Key workflows (designed in detail)

1. **GRN entry & post** — the highest-value screen. Tablet-optimized, received-qty BLANK+required, over-receipt amber-confirm, challan photo, atomic post (movements + avg-cost recompute + cost-history + PO status), idempotent, posted-GRN immutable.
2. **Worker tick (5 min, advisory-locked)** — EXTRACT → DEDUCT (close-gated) → REVERSE (both void paths + late voids) → WorkerRun + dead-man's-switch.
3. **Full stock-take → ledger reconcile** — snapshot expectedQty at frozenAt, count (blank, blind option), variance + reasons, approve posts STOCK_TAKE adjustment.
4. **Void/refund/cancel reversal** — cancel reverses, refund does not (corrected); whole-ticket vs line paths.
5. **Daily cash-market purchase (Quick Cash)** — the most common transaction; informal GRN + auto-CASH payment, no tax columns, excluded from input-tax report.
6. **Theoretical vs actual variance** — loss-prevention centerpiece; wastage + staff-meals netted out; cross-checked against MutfakPos DEMAND where available.
7. **Retroactive recipe correction (replay)** — dry-run diff → commit REVERSAL+new SALE, refuses dates before an approved stock-take.
8. **Inter-branch transfer** — dispatch (TRANSFER_OUT) → receive (forced count, TRANSFER_IN), in-transit nets to zero.

---

## 9. Reports

Current Stock · Reorder (one-click PO) · COGS & Margin · Purchase Analysis (+ price trend) · Wastage (Pareto) · **Variance (theoretical vs actual — centerpiece)** · Stock Movement Ledger viewer · Vendor Payables (aging) · Inventory Valuation (as-of-date replay) · Input-tax/FBR · Audit/transparency pack · Vendor Scorecard · Coverage (unrecipe'd-items-selling) · Multi-kantin consolidated · Per-product price history. Every report exports XLSX + PDF (Urdu font, PKR formatting).

**Plus (from review's "additional features"):** Daily prep/par-sheet (the operator's real daily pain) · Menu-engineering quadrant (margin × popularity) · Cash reconciliation (till cash vs sales vs cash purchases vs payouts) · Owner WhatsApp daily digest.

---

## 10. Operations

- **Worker:** dedicated Node container, 2nd Coolify resource, 5-min tick, pg advisory lock, catch-up on boot. **Lock-staleness handling in Phase 3** (zombie connection can hold advisory lock — don't wait for Phase 9 watchdog).
- **Migrations:** baseline current schema into `prisma/migrations`; `migrate deploy` in the WEB deploy hook ONLY (never the worker); `views.sql` folded into a migration.
- **Backups (CRITICAL — inventory data exists ONLY here):** nightly full pg_dump (7-day local) + **6-hourly inventory-only dump** (exclude `sync_batch`, which is re-syncable) → encrypted offsite (restic/rclone) → monthly automated restore test asserting `SUM(delta)` reconciliation.
- **Monitoring:** `/api/health`, sync-freshness alert (suppressed on school-closed days via SchoolCalendar), worker dead-man's-switch, watchdog for hung ticks.
- **Timezone:** all "today"/roll-up/alert logic uses Asia/Karachi + SchoolCalendar, not server UTC.
- **DR runbooks:** VPS down / Postgres corrupt / sync stalled / worker stuck / ledger-bug recovery via bulk compensating REVERSALs (never UPDATE/DELETE).

---

## 11. Open decisions (each has a recommended default — say "go with defaults" to proceed)

| # | Decision | Recommended default |
|---|---|---|
| 1 | Cancel vs refund stock treatment | **Cancel reverses, refund does NOT** (corrected from "both reverse") |
| 2 | Reversal idempotency | Distinct refType `SALE_REVERSAL` so +/− rows coexist |
| 3 | Float→Decimal scope | Full conversion now (Phase 0) |
| 4 | Backdated cost-bearing movements | Forbid by default; cost-replay only if needed |
| 5 | Vendor scoping | Per-kantin (matches existing schema); revisit if a shared supplier hurts |
| 6 | Combo items (Fries & Nuggets) | Flatten to raw ingredients for v1 |
| 7 | Prep/sub-recipes (sauces, marinated chicken) | Support via `producesProductId` + simple Prep Batch; defer full ProductionOrder |
| 8 | H-8 opening balances | One-time OPENING_BALANCE wizard/CSV at a go-live date, then lock |
| 9 | FBR POS sales integration | Out of scope (belongs to MutfakPos); placeholder only. Purchase-side input-tax IS in scope |
| 10 | Stock granularity | Include storageLocationId in GROUP BY now (nulls collapse) so multi-location is a no-schema-change toggle |
| 11 | Negative on-hand | Allow + flag (ledger is truth), never clamp |
| 12 | current-stock VIEW vs MATERIALIZED | Plain VIEW first; materialize only if >200ms |
| 13 | Alert channels | In-app + email v1; add WhatsApp/Telegram later |
| 14 | Foodpanda duplicate menu items | RecipeAlias mapping multiple mpItemIds → one recipe |
| 15 | Mode-conditional packaging (box/bag) | Ignore mode for food in v1; add packaging lines later |

---

## 12. Risk register (top items)

- Ledger corruption from a buggy explosion → recover via compensating REVERSALs, never edit/delete; reconciliation job flags drift.
- Double-processing → unique constraint + ON CONFLICT + advisory lock.
- JSON-scan blowup → `_t` tables (Phase 3) + prune extracted batches.
- Float drift → Decimal everywhere (Phase 0).
- Single-VPS SPOF → encrypted OFFSITE backups + monthly restore test + rebuild runbook.
- Inventory data unrecoverable if lost → separate 6-hourly inventory-only dump.
- Phantom variance mid-count → frozen-window + freeze non-count movements on in-count products.
- Unrecipe'd items → never zero; log to coverage + alert.
- UoM mis-conversion → conversion table + mass-conservation CI tests; block save/post on missing path; **cross-dimension via ProductUom is the real risk — test it explicitly**.
- Recipe drift masquerading as theft on first stock-take → recipe-calibration workflow.
- Staff/student free meals as systemic consumption → daily staff-meal entry, netted in variance.

---

## 13. What makes this safe to build solo

One architectural rule keeps it comprehensible: **every stock number is `SUM(delta) FROM stock_movement`** — no shadow tables, no cached quantities. Pair with append-only discipline (corrections = reversals) and the system stays debuggable and replayable. Keep this README + CLAUDE.md current so an AI assistant or contractor ramps in days.

**Charter discipline:** inventory + purchasing ONLY. If GL/payroll/AR-AP needs become urgent, that's the trigger to re-evaluate ERPNext *with real operational data in hand* — not to keep extending this app.

---

*Plan generated 2026-06-24 via 8-domain design + synthesis + adversarial completeness review. The review's "significant_gaps" findings (MutfakPos native tables, cancel/refund semantics, close-gating, portion items, MODE/promo, school calendar, recipe calibration) are folded into the phases and corrections above.*
