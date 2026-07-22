import "server-only"
import { prisma } from "./prisma"

/**
 * Live H-8 dashboard data. Each page runs ONE combined json_build_object query
 * (one round-trip) — multiple sequential Prisma queries per RSC render deadlock
 * on the standalone runtime.
 *
 * CRITICAL: every CTE is `AS MATERIALIZED`. The mp_* views expand sync_batch JSON
 * on every scan. Prisma sends parameterized queries; after a few executions PG
 * switches to a GENERIC plan that inlines CTEs (PG12+ default) and re-expands the
 * JSON views once per row — this made /h8/daily take 95s in production (245ms with
 * AS MATERIALIZED). Forcing materialization pins single-evaluation and is immune to
 * the plan. Also share one item-sales CTE rather than re-scanning mp_itemsale N times.
 */

const K = "h8"
const n = (v: any) => (v == null ? 0 : Number(v))

/** MutfakPos internal payment-type codes -> readable labels. */
export function payLabel(t: string | null | undefined): string {
  const s = (t ?? "").trim()
  if (s === "-1") return "Cash"
  if (s === "-2") return "Credit / on account"
  return s || "—"
}

// =========================================================================
// OVERVIEW
// =========================================================================

export interface H8OverviewLive {
  meta: { lastSaleDate: string | null; firstSaleDate: string | null; daysWithSales: number }
  today: { date: string | null; gross: number; tickets: number; prevDate: string | null; prevGross: number }
  summary: {
    totalTickets: number; totalGross: number; itemsSold: number; distinctItemsSold: number
    voidTickets: number; voidGross: number; totalCancels: number; totalCancelAmount: number
    totalRefunds: number; totalRefundAmount: number
  }
  daily: { sale_date: string; gross_total: number }[]
  topCategories: { category: string; total_sales: number }[]
  paymentMix: { payment_type: string; net_paid: number }[]
  hourly: { hour_of_day: number; gross: number }[]
  openSessions: { opened_by: string | null; open_time: string; tickets: number; gross_total: number }[]
  topItems30d: { item_id: number; item: string; category: string | null; qty: number; sales: number }[]
}

export async function getH8OverviewLive(): Promise<H8OverviewLive> {
  const rows = await prisma.$queryRaw<{ payload: any }[]>`
    WITH co AS MATERIALIZED (
      SELECT total, void, created, created::date AS d
      FROM mp_checkout WHERE kantin_slug=${K}
    ),
    si AS MATERIALIZED (
      SELECT s.id, s.item_id, s.price, s.sale_time,
             EXTRACT(HOUR FROM s.sale_time)::int AS hr,
             (cn.id IS NOT NULL) AS canceled,
             it.title AS item, cat.title AS category
      FROM mp_itemsale s
      LEFT JOIN mp_cancel cn ON cn.itemsale_id=s.id AND cn.kantin_slug=${K}
      LEFT JOIN mp_item it ON it.id=s.item_id AND it.kantin_slug=${K}
      LEFT JOIN mp_category cat ON cat.id=it.category_id AND cat.kantin_slug=${K}
      WHERE s.kantin_slug=${K}
    ),
    maxsale AS MATERIALIZED (SELECT MAX(sale_time) AS t FROM si),
    lastday AS MATERIALIZED (SELECT MAX(d) AS d FROM co WHERE NOT void),
    prevday AS MATERIALIZED (SELECT MAX(d) AS d FROM co WHERE NOT void AND d < (SELECT d FROM lastday))
    SELECT json_build_object(
      'meta', json_build_object(
        'first_sale', (SELECT MIN(d) FROM co WHERE NOT void),
        'last_sale', (SELECT d FROM lastday),
        'days_with_sales', (SELECT COUNT(DISTINCT d) FROM co WHERE NOT void)),
      'today', json_build_object(
        'date', (SELECT d FROM lastday),
        'gross', (SELECT COALESCE(SUM(total),0) FROM co WHERE NOT void AND d=(SELECT d FROM lastday)),
        'tickets', (SELECT COUNT(*) FROM co WHERE NOT void AND d=(SELECT d FROM lastday)),
        'prev_date', (SELECT d FROM prevday),
        'prev_gross', (SELECT COALESCE(SUM(total),0) FROM co WHERE NOT void AND d=(SELECT d FROM prevday))),
      'summary', json_build_object(
        'total_tickets', (SELECT COUNT(*) FROM co WHERE NOT void),
        'total_gross', (SELECT COALESCE(SUM(total),0) FROM co WHERE NOT void),
        'void_tickets', (SELECT COUNT(*) FROM co WHERE void),
        'void_gross', (SELECT COALESCE(SUM(total),0) FROM co WHERE void)),
      'items_sold', (SELECT COUNT(*) FROM si WHERE NOT canceled),
      'distinct_items_sold', (SELECT COUNT(DISTINCT item_id) FROM si),
      'total_cancels', (SELECT COUNT(*) FROM si WHERE canceled),
      'total_cancel_amount', (SELECT COALESCE(SUM(price),0) FROM si WHERE canceled),
      'total_refunds', (SELECT COUNT(*) FROM mp_refund WHERE kantin_slug=${K}),
      'total_refund_amount', (SELECT COALESCE(SUM(s.price),0) FROM mp_refund r JOIN si s ON s.id=r.itemsale_id WHERE r.kantin_slug=${K}),
      'daily', (SELECT COALESCE(json_agg(x ORDER BY x.d),'[]'::json) FROM (
          SELECT d, COALESCE(SUM(total) FILTER (WHERE NOT void),0) AS gross_total
          FROM co GROUP BY d ORDER BY d DESC LIMIT 30) x),
      'top_categories', (SELECT COALESCE(json_agg(c ORDER BY c.total_sales DESC),'[]'::json) FROM (
          SELECT category, COALESCE(SUM(price),0) AS total_sales
          FROM si WHERE NOT canceled AND COALESCE(category,'') <> ''
          GROUP BY category ORDER BY 2 DESC LIMIT 8) c),
      'payment_mix', (SELECT COALESCE(json_agg(p ORDER BY p.net_paid DESC),'[]'::json) FROM (
          SELECT pt.title AS payment_type, COALESCE(SUM(pm.paid - pm.balance),0) AS net_paid
          FROM mp_payment pm JOIN mp_paymenttype pt ON pt.id=pm.type_id AND pt.kantin_slug=${K}
          WHERE pm.kantin_slug=${K}
          GROUP BY pt.title HAVING COALESCE(SUM(pm.paid - pm.balance),0) > 0
          ORDER BY 2 DESC LIMIT 6) p),
      'hourly', (SELECT COALESCE(json_agg(h ORDER BY h.hour_of_day),'[]'::json) FROM (
          SELECT hr AS hour_of_day, COALESCE(SUM(price),0) AS gross
          FROM si WHERE NOT canceled GROUP BY hr ORDER BY hr) h),
      'open_sessions', (SELECT COALESCE(json_agg(os),'[]'::json) FROM (
          SELECT (st.fname||' '||st.sname) AS opened_by, se.start_time AS open_time,
            (SELECT COUNT(*) FROM mp_receipt r JOIN mp_checkout c ON c.receipt_id=r.id AND c.kantin_slug=${K} WHERE r.session_id=se.id AND r.kantin_slug=${K} AND NOT c.void) AS tickets,
            (SELECT COALESCE(SUM(c.total),0) FROM mp_receipt r JOIN mp_checkout c ON c.receipt_id=r.id AND c.kantin_slug=${K} WHERE r.session_id=se.id AND r.kantin_slug=${K} AND NOT c.void) AS gross_total
          FROM mp_session se LEFT JOIN mp_staff st ON st.id=se.staff_start_id AND st.kantin_slug=${K}
          WHERE se.kantin_slug=${K} AND se.close_time IS NULL ORDER BY se.start_time DESC) os),
      'top_items_30d', (SELECT COALESCE(json_agg(ti ORDER BY ti.sales DESC),'[]'::json) FROM (
          SELECT item_id, item, category, COUNT(*) AS qty, COALESCE(SUM(price),0) AS sales
          FROM si WHERE NOT canceled AND sale_time >= (SELECT t FROM maxsale) - INTERVAL '30 days'
          GROUP BY item_id, item, category ORDER BY sales DESC LIMIT 10) ti)
    ) AS payload
  `
  const p = rows[0]?.payload ?? {}
  return {
    meta: { firstSaleDate: p.meta?.first_sale ?? null, lastSaleDate: p.meta?.last_sale ?? null, daysWithSales: n(p.meta?.days_with_sales) },
    today: { date: p.today?.date ?? null, gross: n(p.today?.gross), tickets: n(p.today?.tickets), prevDate: p.today?.prev_date ?? null, prevGross: n(p.today?.prev_gross) },
    summary: {
      totalTickets: n(p.summary?.total_tickets), totalGross: n(p.summary?.total_gross),
      itemsSold: n(p.items_sold), distinctItemsSold: n(p.distinct_items_sold),
      voidTickets: n(p.summary?.void_tickets), voidGross: n(p.summary?.void_gross),
      totalCancels: n(p.total_cancels), totalCancelAmount: n(p.total_cancel_amount),
      totalRefunds: n(p.total_refunds), totalRefundAmount: n(p.total_refund_amount),
    },
    daily: (p.daily ?? []).map((d: any) => ({ sale_date: d.d, gross_total: n(d.gross_total) })),
    topCategories: (p.top_categories ?? []).map((c: any) => ({ category: c.category, total_sales: n(c.total_sales) })),
    paymentMix: (p.payment_mix ?? []).map((x: any) => ({ payment_type: payLabel(x.payment_type), net_paid: n(x.net_paid) })),
    hourly: (p.hourly ?? []).map((h: any) => ({ hour_of_day: n(h.hour_of_day), gross: n(h.gross) })),
    openSessions: (p.open_sessions ?? []).map((o: any) => ({ opened_by: o.opened_by ?? null, open_time: o.open_time, tickets: n(o.tickets), gross_total: n(o.gross_total) })),
    topItems30d: (p.top_items_30d ?? []).map((t: any) => ({ item_id: n(t.item_id), item: t.item, category: t.category ?? null, qty: n(t.qty), sales: n(t.sales) })),
  }
}

// =========================================================================
// LANDING SUMMARY (lightweight — for the locations card)
// =========================================================================

export interface H8LandingSummary {
  totalGross: number; totalTickets: number; daysWithSales: number; lastSaleDate: string | null
}

export async function getH8LandingSummary(): Promise<H8LandingSummary> {
  const rows = await prisma.$queryRaw<{ payload: any }[]>`
    WITH co AS MATERIALIZED (SELECT total, void, created::date AS d FROM mp_checkout WHERE kantin_slug=${K})
    SELECT json_build_object(
      'gross', (SELECT COALESCE(SUM(total),0) FROM co WHERE NOT void),
      'tickets', (SELECT COUNT(*) FROM co WHERE NOT void),
      'days', (SELECT COUNT(DISTINCT d) FROM co WHERE NOT void),
      'last_sale', (SELECT MAX(d) FROM co WHERE NOT void)
    ) AS payload
  `
  const p = rows[0]?.payload ?? {}
  return { totalGross: n(p.gross), totalTickets: n(p.tickets), daysWithSales: n(p.days), lastSaleDate: p.last_sale ?? null }
}

// =========================================================================
// MENU PERFORMANCE
// =========================================================================

export interface H8MenuItem {
  itemId: number; item: string; category: string | null; price: number; tax: number
  status: string; onSale: string; qty: number; sales: number; cancels: number; lastSold: string | null
}
export interface H8MenuCategory { category: string; items: number; qty: number; sales: number }
export interface H8MenuLive {
  meta: { lastSaleDate: string | null }
  kpis: { totalItems: number; activeItems: number; totalQty: number; totalSales: number; neverSold: number }
  categories: H8MenuCategory[]
  items: H8MenuItem[]
}

export async function getH8MenuLive(): Promise<H8MenuLive> {
  const rows = await prisma.$queryRaw<{ payload: any }[]>`
    WITH it AS MATERIALIZED (
      SELECT i.id, i.title, i.category_id, i.price, i.tax, i.status, i.on_sale, cat.title AS category
      FROM mp_item i LEFT JOIN mp_category cat ON cat.id=i.category_id AND cat.kantin_slug=${K}
      WHERE i.kantin_slug=${K}
    ),
    sales AS MATERIALIZED (
      SELECT s.item_id,
        COUNT(*) FILTER (WHERE cn.id IS NULL) AS qty,
        COALESCE(SUM(s.price) FILTER (WHERE cn.id IS NULL),0) AS sales,
        COUNT(*) FILTER (WHERE cn.id IS NOT NULL) AS cancels,
        MAX(s.sale_time) FILTER (WHERE cn.id IS NULL) AS last_sold
      FROM mp_itemsale s LEFT JOIN mp_cancel cn ON cn.itemsale_id=s.id AND cn.kantin_slug=${K}
      WHERE s.kantin_slug=${K} GROUP BY s.item_id
    ),
    joined AS MATERIALIZED (
      SELECT it.*, COALESCE(sa.qty,0) AS qty, COALESCE(sa.sales,0) AS sales,
             COALESCE(sa.cancels,0) AS cancels, sa.last_sold
      FROM it LEFT JOIN sales sa ON sa.item_id=it.id
    )
    SELECT json_build_object(
      'meta', json_build_object('last_sale', (SELECT MAX(created)::date FROM mp_checkout WHERE kantin_slug=${K} AND NOT void)),
      'kpis', json_build_object(
        'total_items', (SELECT COUNT(*) FROM it),
        'active_items', (SELECT COUNT(*) FROM it WHERE status=1),
        'total_qty', (SELECT COALESCE(SUM(qty),0) FROM joined),
        'total_sales', (SELECT COALESCE(SUM(sales),0) FROM joined),
        'never_sold', (SELECT COUNT(*) FROM joined WHERE qty=0)),
      'categories', (SELECT COALESCE(json_agg(c ORDER BY c.sales DESC),'[]'::json) FROM (
        SELECT COALESCE(category,'(uncategorized)') AS category, COUNT(*) AS items,
               COALESCE(SUM(qty),0) AS qty, COALESCE(SUM(sales),0) AS sales
        FROM joined GROUP BY COALESCE(category,'(uncategorized)')) c),
      'items', (SELECT COALESCE(json_agg(j ORDER BY j.sales DESC),'[]'::json) FROM (
        SELECT id AS item_id, title AS item, category, price, tax, status, on_sale, qty, sales, cancels, last_sold
        FROM joined) j)
    ) AS payload
  `
  const p = rows[0]?.payload ?? {}
  return {
    meta: { lastSaleDate: p.meta?.last_sale ?? null },
    kpis: {
      totalItems: n(p.kpis?.total_items), activeItems: n(p.kpis?.active_items),
      totalQty: n(p.kpis?.total_qty), totalSales: n(p.kpis?.total_sales), neverSold: n(p.kpis?.never_sold),
    },
    categories: (p.categories ?? []).map((c: any) => ({ category: c.category, items: n(c.items), qty: n(c.qty), sales: n(c.sales) })),
    items: (p.items ?? []).map((i: any) => ({
      itemId: n(i.item_id), item: i.item, category: i.category ?? null, price: n(i.price), tax: n(i.tax),
      status: i.status === 1 ? "Active" : "Inactive", onSale: i.on_sale ? "Yes" : "No",
      qty: n(i.qty), sales: n(i.sales), cancels: n(i.cancels), lastSold: i.last_sold ?? null,
    })),
  }
}

// =========================================================================
// DAILY & CASH
// =========================================================================

export interface H8DailyRow {
  saleDate: string; tickets: number; gross: number; paymentsNet: number
  rounding: number; variance: number; voids: number; cancels: number; refunds: number
}
export interface H8SessionRow {
  sessionId: number; openTime: string; closeTime: string | null; openedBy: string | null
  closedBy: string | null; status: "open" | "closed"; tickets: number; gross: number; pettyCash: number
}
export interface H8CashierRow {
  cashier: string; tickets: number; gross: number; avgTicket: number; daysWorked: number
  cashNet: number; firstTicket: string | null; lastTicket: string | null
}
export interface H8PayTypeRow { paymentType: string; count: number; tendered: number; changeDue: number; netPaid: number }
export interface H8PayMatrixRow { saleDate: string; byType: Record<string, number>; total: number }
export interface H8DailyCashLive {
  meta: { lastSaleDate: string | null }
  kpis: {
    todayGross: number; todayTickets: number; prevGross: number; prevDate: string | null; todayDate: string | null
    cashNet: number; nonCashNet: number; openSessions: number; walkInTickets: number; namedTickets: number
  }
  daily: H8DailyRow[]
  sessions: H8SessionRow[]
  cashiers: H8CashierRow[]
  paymentTypes: H8PayTypeRow[]
  payMatrix: H8PayMatrixRow[]
  payTypeNames: string[]
}

export async function getH8DailyCashLive(): Promise<H8DailyCashLive> {
  const rows = await prisma.$queryRaw<{ payload: any }[]>`
    WITH co AS MATERIALIZED (
      SELECT id, receipt_id, staff_id, total, rounding, void, created, created::date AS d
      FROM mp_checkout WHERE kantin_slug=${K}
    ),
    pm AS MATERIALIZED (
      SELECT p.staff_id, p.paid, p.balance, p.payment_time::date AS d, pt.title AS ptype, (p.paid - p.balance) AS net
      FROM mp_payment p JOIN mp_paymenttype pt ON pt.id=p.type_id AND pt.kantin_slug=${K}
      WHERE p.kantin_slug=${K} AND p.payment_time IS NOT NULL
    ),
    rcpt AS MATERIALIZED (
      SELECT r.session_id, r.customer_id, c.total, c.void
      FROM mp_receipt r JOIN co c ON c.receipt_id = r.id
      WHERE r.kantin_slug=${K}
    ),
    sess_agg AS MATERIALIZED (
      SELECT session_id, COUNT(*) FILTER (WHERE NOT void) AS tickets,
             COALESCE(SUM(total) FILTER (WHERE NOT void),0) AS gross
      FROM rcpt GROUP BY session_id
    ),
    cancels AS MATERIALIZED (SELECT cancel_time::date AS d, COUNT(*) AS nn FROM mp_cancel WHERE kantin_slug=${K} GROUP BY 1),
    refunds AS MATERIALIZED (SELECT refund_on::date AS d, COUNT(*) AS nn FROM mp_refund WHERE kantin_slug=${K} GROUP BY 1),
    daypay AS MATERIALIZED (SELECT d, COALESCE(SUM(net),0) AS net FROM pm GROUP BY d),
    lastday AS MATERIALIZED (SELECT MAX(d) AS d FROM co WHERE NOT void),
    prevday AS MATERIALIZED (SELECT MAX(d) AS d FROM co WHERE NOT void AND d < (SELECT d FROM lastday))
    SELECT json_build_object(
      'meta', json_build_object('last_sale', (SELECT d FROM lastday)),
      'kpis', json_build_object(
        'today_date', (SELECT d FROM lastday),
        'today_gross', (SELECT COALESCE(SUM(total),0) FROM co WHERE NOT void AND d=(SELECT d FROM lastday)),
        'today_tickets', (SELECT COUNT(*) FROM co WHERE NOT void AND d=(SELECT d FROM lastday)),
        'prev_date', (SELECT d FROM prevday),
        'prev_gross', (SELECT COALESCE(SUM(total),0) FROM co WHERE NOT void AND d=(SELECT d FROM prevday)),
        'cash_net', (SELECT COALESCE(SUM(net),0) FROM pm WHERE ptype=' -1'),
        'noncash_net', (SELECT COALESCE(SUM(net),0) FROM pm WHERE ptype<>' -1'),
        'open_sessions', (SELECT COUNT(*) FROM mp_session WHERE kantin_slug=${K} AND close_time IS NULL),
        'walkin_tickets', (SELECT COUNT(*) FROM rcpt WHERE NOT void AND customer_id IS NULL),
        'named_tickets', (SELECT COUNT(*) FROM rcpt WHERE NOT void AND customer_id IS NOT NULL)),
      'daily', (SELECT COALESCE(json_agg(x ORDER BY x.d DESC),'[]'::json) FROM (
        SELECT co.d,
          COUNT(*) FILTER (WHERE NOT void) AS tickets,
          COALESCE(SUM(total) FILTER (WHERE NOT void),0) AS gross,
          COALESCE(SUM(rounding) FILTER (WHERE NOT void),0) AS rounding,
          COUNT(*) FILTER (WHERE void) AS voids,
          COALESCE((SELECT net FROM daypay dp WHERE dp.d=co.d),0) AS payments_net,
          COALESCE((SELECT nn FROM cancels c WHERE c.d=co.d),0) AS cancels,
          COALESCE((SELECT nn FROM refunds rf WHERE rf.d=co.d),0) AS refunds
        FROM co GROUP BY co.d ORDER BY co.d DESC LIMIT 60) x),
      'sessions', (SELECT COALESCE(json_agg(s ORDER BY s.start_time DESC),'[]'::json) FROM (
        SELECT se.id, se.start_time, se.close_time, se.petty_cash,
          (s1.fname||' '||s1.sname) AS opened_by,
          CASE WHEN s2.fname IS NULL THEN NULL ELSE s2.fname||' '||s2.sname END AS closed_by,
          COALESCE(sg.tickets,0) AS tickets, COALESCE(sg.gross,0) AS gross
        FROM mp_session se
        LEFT JOIN sess_agg sg ON sg.session_id = se.id
        LEFT JOIN mp_staff s1 ON s1.id=se.staff_start_id AND s1.kantin_slug=${K}
        LEFT JOIN mp_staff s2 ON s2.id=se.staff_close_id AND s2.kantin_slug=${K}
        WHERE se.kantin_slug=${K} ORDER BY se.start_time DESC LIMIT 30) s),
      'cashiers', (SELECT COALESCE(json_agg(c ORDER BY c.gross DESC),'[]'::json) FROM (
        SELECT (st.fname||' '||st.sname) AS cashier, COUNT(*) AS tickets, COALESCE(SUM(co.total),0) AS gross,
          COUNT(DISTINCT co.d) AS days_worked, MIN(co.created) AS first_ticket, MAX(co.created) AS last_ticket,
          COALESCE((SELECT SUM(net) FROM pm WHERE pm.staff_id=st.id AND pm.ptype=' -1'),0) AS cash_net
        FROM co JOIN mp_staff st ON st.id=co.staff_id AND st.kantin_slug=${K}
        WHERE NOT co.void GROUP BY st.id, st.fname, st.sname) c),
      'payment_types', (SELECT COALESCE(json_agg(p ORDER BY p.net DESC),'[]'::json) FROM (
        SELECT ptype AS payment_type, COUNT(*) AS cnt, COALESCE(SUM(paid),0) AS tendered,
               COALESCE(SUM(balance),0) AS change_due, COALESCE(SUM(net),0) AS net
        FROM pm GROUP BY ptype) p),
      'pay_matrix', (SELECT COALESCE(json_agg(m ORDER BY m.d DESC),'[]'::json) FROM (
        SELECT d, json_object_agg(ptype, net) AS by_type, SUM(net) AS total
        FROM (SELECT d, ptype, SUM(net) AS net FROM pm GROUP BY d, ptype) z
        GROUP BY d ORDER BY d DESC LIMIT 30) m)
    ) AS payload
  `
  const p = rows[0]?.payload ?? {}
  const daily: H8DailyRow[] = (p.daily ?? []).map((x: any) => {
    const gross = n(x.gross), pay = n(x.payments_net)
    return { saleDate: x.d, tickets: n(x.tickets), gross, paymentsNet: pay, rounding: n(x.rounding), variance: pay - gross, voids: n(x.voids), cancels: n(x.cancels), refunds: n(x.refunds) }
  })
  const payTypeNames = Array.from(new Set((p.pay_matrix ?? []).flatMap((m: any) => Object.keys(m.by_type ?? {})))).sort() as string[]
  return {
    meta: { lastSaleDate: p.meta?.last_sale ?? null },
    kpis: {
      todayGross: n(p.kpis?.today_gross), todayTickets: n(p.kpis?.today_tickets),
      prevGross: n(p.kpis?.prev_gross), prevDate: p.kpis?.prev_date ?? null, todayDate: p.kpis?.today_date ?? null,
      cashNet: n(p.kpis?.cash_net), nonCashNet: n(p.kpis?.noncash_net), openSessions: n(p.kpis?.open_sessions),
      walkInTickets: n(p.kpis?.walkin_tickets), namedTickets: n(p.kpis?.named_tickets),
    },
    daily,
    sessions: (p.sessions ?? []).map((s: any) => ({
      sessionId: n(s.id), openTime: s.start_time, closeTime: s.close_time ?? null, openedBy: s.opened_by ?? null,
      closedBy: s.closed_by ?? null, status: s.close_time ? "closed" : "open", tickets: n(s.tickets), gross: n(s.gross), pettyCash: n(s.petty_cash),
    })),
    cashiers: (p.cashiers ?? []).map((c: any) => ({
      cashier: c.cashier, tickets: n(c.tickets), gross: n(c.gross),
      avgTicket: n(c.tickets) ? n(c.gross) / n(c.tickets) : 0, daysWorked: n(c.days_worked), cashNet: n(c.cash_net),
      firstTicket: c.first_ticket ?? null, lastTicket: c.last_ticket ?? null,
    })),
    paymentTypes: (p.payment_types ?? []).map((x: any) => ({ paymentType: x.payment_type, count: n(x.cnt), tendered: n(x.tendered), changeDue: n(x.change_due), netPaid: n(x.net) })),
    payMatrix: (p.pay_matrix ?? []).map((m: any) => {
      const byType: Record<string, number> = {}
      for (const [k2, v] of Object.entries(m.by_type ?? {})) byType[k2] = n(v)
      return { saleDate: m.d, byType, total: n(m.total) }
    }),
    payTypeNames,
  }
}

// =========================================================================
// DAY ORDERS — every ticket for one date, with its item lines.
// Feeds the inline day expander on /h8/daily and the day-detail page.
// A ticket = mp_receipt (the order) + mp_checkout (its settlement); item
// lines hang off receipt_id. mp_itemsale has NO qty column — one row is one
// unit — so quantity is a COUNT and repeats collapse by item_id here.
// =========================================================================

export interface H8OrderLine { item: string; category: string | null; qty: number; unitPrice: number; lineTotal: number; canceled: number }
export interface H8Order {
  checkoutId: number; receiptId: number; openTime: string | null; closeTime: string | null
  cashier: string | null; customer: string | null; payments: string[]
  itemCount: number; itemsTotal: number; total: number; rounding: number; void: boolean
  lines: H8OrderLine[]
}

export async function getH8DayOrdersLive(date: string): Promise<H8Order[]> {
  const rows = await prisma.$queryRaw<{ payload: any }[]>`
    WITH co AS MATERIALIZED (
      SELECT id, receipt_id, staff_id, total, rounding, void, created
      FROM mp_checkout WHERE kantin_slug=${K} AND created::date = ${date}::date
    ),
    rc AS MATERIALIZED (
      SELECT r.id, r.open_time, r.customer_id
      FROM mp_receipt r WHERE r.kantin_slug=${K} AND r.id IN (SELECT receipt_id FROM co)
    ),
    si AS MATERIALIZED (
      SELECT s.receipt_id, s.item_id, s.price,
             (cn.id IS NOT NULL) AS canceled,
             COALESCE(it.title,'(unknown item)') AS item, cat.title AS category
      FROM mp_itemsale s
      LEFT JOIN mp_cancel cn ON cn.itemsale_id=s.id AND cn.kantin_slug=${K}
      LEFT JOIN mp_item it ON it.id=s.item_id AND it.kantin_slug=${K}
      LEFT JOIN mp_category cat ON cat.id=it.category_id AND cat.kantin_slug=${K}
      WHERE s.kantin_slug=${K} AND s.receipt_id IN (SELECT id FROM rc)
    ),
    ln AS MATERIALIZED (
      SELECT receipt_id, item, category, MAX(price) AS unit_price,
             COUNT(*) FILTER (WHERE NOT canceled) AS qty,
             COUNT(*) FILTER (WHERE canceled) AS canceled,
             COALESCE(SUM(price) FILTER (WHERE NOT canceled),0) AS line_total
      FROM si GROUP BY receipt_id, item, category
    ),
    -- pre-aggregate per receipt: a correlated re-scan per ticket would re-expand
    -- the JSON-backed views once per row (the /h8/daily 95s class of bug).
    agg AS MATERIALIZED (
      SELECT receipt_id, SUM(qty) AS item_count, SUM(line_total) AS items_total,
             json_agg(json_build_object('item', item, 'category', category, 'qty', qty,
               'unit_price', unit_price, 'line_total', line_total, 'canceled', canceled)
               ORDER BY line_total DESC) AS lines
      FROM ln GROUP BY receipt_id
    ),
    pay AS MATERIALIZED (
      SELECT p.checkout_id, array_agg(DISTINCT pt.title) AS payments
      FROM mp_payment p JOIN mp_paymenttype pt ON pt.id=p.type_id AND pt.kantin_slug=${K}
      WHERE p.kantin_slug=${K} AND p.checkout_id IN (SELECT id FROM co)
      GROUP BY p.checkout_id
    )
    SELECT COALESCE(json_agg(o ORDER BY o.close_time DESC NULLS LAST, o.checkout_id DESC),'[]'::json) AS payload
    FROM (
      SELECT co.id AS checkout_id, co.receipt_id, rc.open_time, co.created AS close_time,
             (st.fname||' '||st.sname) AS cashier, cu.title AS customer, co.total, co.rounding, co.void,
             COALESCE(pay.payments,'{}') AS payments,
             COALESCE(agg.item_count,0) AS item_count,
             COALESCE(agg.items_total,0) AS items_total,
             COALESCE(agg.lines,'[]'::json) AS lines
      FROM co
      JOIN rc ON rc.id = co.receipt_id
      LEFT JOIN agg ON agg.receipt_id = co.receipt_id
      LEFT JOIN pay ON pay.checkout_id = co.id
      LEFT JOIN mp_staff st ON st.id=co.staff_id AND st.kantin_slug=${K}
      LEFT JOIN mp_customer cu ON cu.id=rc.customer_id AND cu.kantin_slug=${K}
    ) o
  `
  const list: any[] = rows[0]?.payload ?? []
  return list.map((o) => ({
    checkoutId: n(o.checkout_id), receiptId: n(o.receipt_id),
    openTime: o.open_time ?? null, closeTime: o.close_time ?? null,
    cashier: (o.cashier ?? "").trim() || null, customer: (o.customer ?? "").trim() || null,
    payments: (o.payments ?? []).map((p: string) => payLabel(p)),
    itemCount: n(o.item_count), itemsTotal: n(o.items_total),
    total: n(o.total), rounding: n(o.rounding), void: !!o.void,
    lines: (o.lines ?? []).map((l: any) => ({
      item: l.item, category: l.category ?? null, qty: n(l.qty),
      unitPrice: n(l.unit_price), lineTotal: n(l.line_total), canceled: n(l.canceled),
    })),
  }))
}

// =========================================================================
// DAY DETAIL — one date drill-down (totals, categories, items, payments)
// Single-date filter keeps it tiny & fast; materialized CTEs = plan-proof.
// =========================================================================

export interface H8DayDetail {
  date: string
  hasData: boolean
  kpis: {
    tickets: number; gross: number; rounding: number; voids: number
    itemsSold: number; distinctItems: number; cancels: number
    cashNet: number; nonCashNet: number; avgTicket: number
  }
  payments: { paymentType: string; count: number; net: number }[]
  cashiers: { cashier: string; tickets: number; gross: number }[]
  categories: { category: string; qty: number; sales: number }[]
  items: { item: string; category: string | null; qty: number; sales: number }[]
  hourly: { hour: number; gross: number }[]
}

export async function getH8DayDetailLive(date: string): Promise<H8DayDetail> {
  const rows = await prisma.$queryRaw<{ payload: any }[]>`
    WITH co AS MATERIALIZED (
      SELECT id, staff_id, total, rounding, void
      FROM mp_checkout WHERE kantin_slug=${K} AND created::date = ${date}::date
    ),
    si AS MATERIALIZED (
      SELECT s.id, s.item_id, s.price, EXTRACT(HOUR FROM s.sale_time)::int AS hr,
             (cn.id IS NOT NULL) AS canceled, it.title AS item, cat.title AS category
      FROM mp_itemsale s
      LEFT JOIN mp_cancel cn ON cn.itemsale_id=s.id AND cn.kantin_slug=${K}
      LEFT JOIN mp_item it ON it.id=s.item_id AND it.kantin_slug=${K}
      LEFT JOIN mp_category cat ON cat.id=it.category_id AND cat.kantin_slug=${K}
      WHERE s.kantin_slug=${K} AND s.sale_time::date = ${date}::date
    ),
    pm AS MATERIALIZED (
      SELECT pt.title AS ptype, (p.paid - p.balance) AS net
      FROM mp_payment p JOIN mp_paymenttype pt ON pt.id=p.type_id AND pt.kantin_slug=${K}
      WHERE p.kantin_slug=${K} AND p.payment_time::date = ${date}::date
    )
    SELECT json_build_object(
      'kpis', json_build_object(
        'tickets', (SELECT COUNT(*) FROM co WHERE NOT void),
        'gross', (SELECT COALESCE(SUM(total),0) FROM co WHERE NOT void),
        'rounding', (SELECT COALESCE(SUM(rounding),0) FROM co WHERE NOT void),
        'voids', (SELECT COUNT(*) FROM co WHERE void),
        'items_sold', (SELECT COUNT(*) FROM si WHERE NOT canceled),
        'distinct_items', (SELECT COUNT(DISTINCT item_id) FROM si WHERE NOT canceled),
        'cancels', (SELECT COUNT(*) FROM si WHERE canceled),
        'cash_net', (SELECT COALESCE(SUM(net),0) FROM pm WHERE ptype=' -1'),
        'noncash_net', (SELECT COALESCE(SUM(net),0) FROM pm WHERE ptype<>' -1')),
      'payments', (SELECT COALESCE(json_agg(p ORDER BY p.net DESC),'[]'::json) FROM (
        SELECT ptype AS payment_type, COUNT(*) AS cnt, COALESCE(SUM(net),0) AS net FROM pm GROUP BY ptype) p),
      'cashiers', (SELECT COALESCE(json_agg(c ORDER BY c.gross DESC),'[]'::json) FROM (
        SELECT (st.fname||' '||st.sname) AS cashier,
               COUNT(*) FILTER (WHERE NOT co.void) AS tickets,
               COALESCE(SUM(co.total) FILTER (WHERE NOT co.void),0) AS gross
        FROM co JOIN mp_staff st ON st.id=co.staff_id AND st.kantin_slug=${K}
        GROUP BY st.id, st.fname, st.sname) c),
      'categories', (SELECT COALESCE(json_agg(x ORDER BY x.sales DESC),'[]'::json) FROM (
        SELECT COALESCE(category,'(uncategorized)') AS category, COUNT(*) AS qty, COALESCE(SUM(price),0) AS sales
        FROM si WHERE NOT canceled GROUP BY COALESCE(category,'(uncategorized)')) x),
      'items', (SELECT COALESCE(json_agg(y ORDER BY y.sales DESC),'[]'::json) FROM (
        SELECT item, category, COUNT(*) AS qty, COALESCE(SUM(price),0) AS sales
        FROM si WHERE NOT canceled GROUP BY item, category) y),
      'hourly', (SELECT COALESCE(json_agg(h ORDER BY h.hour),'[]'::json) FROM (
        SELECT hr AS hour, COALESCE(SUM(price),0) AS gross FROM si WHERE NOT canceled GROUP BY hr) h)
    ) AS payload
  `
  const p = rows[0]?.payload ?? {}
  const k = p.kpis ?? {}
  const tickets = n(k.tickets)
  return {
    date,
    hasData: tickets > 0 || n(k.items_sold) > 0,
    kpis: {
      tickets, gross: n(k.gross), rounding: n(k.rounding), voids: n(k.voids),
      itemsSold: n(k.items_sold), distinctItems: n(k.distinct_items), cancels: n(k.cancels),
      cashNet: n(k.cash_net), nonCashNet: n(k.noncash_net),
      avgTicket: tickets ? n(k.gross) / tickets : 0,
    },
    payments: (p.payments ?? []).map((x: any) => ({ paymentType: x.payment_type, count: n(x.cnt), net: n(x.net) })),
    cashiers: (p.cashiers ?? []).map((c: any) => ({ cashier: c.cashier, tickets: n(c.tickets), gross: n(c.gross) })),
    categories: (p.categories ?? []).map((x: any) => ({ category: x.category, qty: n(x.qty), sales: n(x.sales) })),
    items: (p.items ?? []).map((y: any) => ({ item: y.item, category: y.category ?? null, qty: n(y.qty), sales: n(y.sales) })),
    hourly: (p.hourly ?? []).map((h: any) => ({ hour: n(h.hour), gross: n(h.gross) })),
  }
}
