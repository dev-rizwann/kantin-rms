/**
 * Live data layer for the H-8 kantin dashboard pages.
 *
 * Reads from Postgres views (mp_checkout, mp_itemsale, etc.) that are
 * built on top of sync_batch JSON blobs. Each H-8 page imports the
 * relevant getter function from here.
 *
 * Performance: per-query ~50-200 ms over the current dataset. We wrap each
 * function in React's cache() so within a single request, repeated calls
 * are deduplicated.
 */
import "server-only"
import { cache } from "react"
import { Prisma } from "@prisma/client"
import { prisma } from "./prisma"

const KANTIN = "h8"

// Helper for typed raw queries with the kantin filter built in
function q<T>(strings: TemplateStringsArray, ...values: unknown[]) {
  return prisma.$queryRaw<T[]>(Prisma.raw(strings.join("?")), ...values)
}

// ---------- Freshness / meta ----------

export interface H8Meta {
  generatedAt: string  // when this server query ran
  firstSaleDate: string | null
  lastSaleDate: string | null
  lastSyncAt: string | null
}

export const getH8Meta = cache(async (): Promise<H8Meta> => {
  const rows = await prisma.$queryRaw<{
    first_sale: Date | null
    last_sale: Date | null
    last_sync_at: Date | null
  }[]>`
    SELECT
      (SELECT MIN(created) FROM mp_checkout WHERE kantin_slug = ${KANTIN} AND NOT void) AS first_sale,
      (SELECT MAX(created) FROM mp_checkout WHERE kantin_slug = ${KANTIN} AND NOT void) AS last_sale,
      (SELECT MAX("lastSyncAt") FROM "sync_state" WHERE "kantinSlug" = ${KANTIN}) AS last_sync_at
  `
  const r = rows[0]
  return {
    generatedAt: new Date().toISOString(),
    firstSaleDate: r?.first_sale ? r.first_sale.toISOString().slice(0, 10) : null,
    lastSaleDate: r?.last_sale ? r.last_sale.toISOString().slice(0, 10) : null,
    lastSyncAt: r?.last_sync_at ? r.last_sync_at.toISOString() : null,
  }
})

// ---------- Top-level KPIs ----------

export interface H8Summary {
  totalTickets: number
  totalGross: number
  totalRounding: number
  voidTickets: number
  voidGross: number
  itemsSold: number
  distinctItemsSold: number
  totalItems: number
  totalCategories: number
  totalCustomers: number
  namedCustomers: number
  totalCancels: number
  totalCancelAmount: number
  totalRefunds: number
  totalRefundAmount: number
  totalSessions: number
  openSessions: number
  daysWithSales: number
}

export const getH8Summary = cache(async (): Promise<H8Summary> => {
  const rows = await prisma.$queryRaw<{
    total_tickets: bigint
    total_gross: number | null
    total_rounding: number | null
    void_tickets: bigint
    void_gross: number | null
    items_sold: bigint
    distinct_items_sold: bigint
    total_items: bigint
    total_categories: bigint
    total_customers: bigint
    named_customers: bigint
    total_cancels: bigint
    total_cancel_amount: number | null
    total_refunds: bigint
    total_refund_amount: number | null
    total_sessions: bigint
    open_sessions: bigint
    days_with_sales: bigint
  }[]>`
    SELECT
      (SELECT COUNT(*) FROM mp_checkout WHERE kantin_slug=${KANTIN} AND NOT void) AS total_tickets,
      (SELECT COALESCE(SUM(total),0) FROM mp_checkout WHERE kantin_slug=${KANTIN} AND NOT void) AS total_gross,
      (SELECT COALESCE(SUM(rounding),0) FROM mp_checkout WHERE kantin_slug=${KANTIN} AND NOT void) AS total_rounding,
      (SELECT COUNT(*) FROM mp_checkout WHERE kantin_slug=${KANTIN} AND void) AS void_tickets,
      (SELECT COALESCE(SUM(total),0) FROM mp_checkout WHERE kantin_slug=${KANTIN} AND void) AS void_gross,
      (SELECT COUNT(*) FROM mp_itemsale s
         WHERE s.kantin_slug=${KANTIN}
         AND NOT EXISTS (SELECT 1 FROM mp_cancel c WHERE c.itemsale_id=s.id AND c.kantin_slug=${KANTIN})) AS items_sold,
      (SELECT COUNT(DISTINCT item_id) FROM mp_itemsale WHERE kantin_slug=${KANTIN}) AS distinct_items_sold,
      (SELECT COUNT(*) FROM mp_item WHERE kantin_slug=${KANTIN}) AS total_items,
      (SELECT COUNT(*) FROM mp_category WHERE kantin_slug=${KANTIN}) AS total_categories,
      (SELECT COUNT(*) FROM mp_customer WHERE kantin_slug=${KANTIN}) AS total_customers,
      (SELECT COUNT(DISTINCT r.customer_id) FROM mp_receipt r
         JOIN mp_checkout c ON c.receipt_id=r.id AND c.kantin_slug=${KANTIN}
         WHERE r.kantin_slug=${KANTIN} AND r.customer_id IS NOT NULL AND NOT c.void) AS named_customers,
      (SELECT COUNT(*) FROM mp_cancel WHERE kantin_slug=${KANTIN}) AS total_cancels,
      (SELECT COALESCE(SUM(s.price),0) FROM mp_cancel cn JOIN mp_itemsale s ON s.id=cn.itemsale_id AND s.kantin_slug=${KANTIN} WHERE cn.kantin_slug=${KANTIN}) AS total_cancel_amount,
      (SELECT COUNT(*) FROM mp_refund WHERE kantin_slug=${KANTIN}) AS total_refunds,
      (SELECT COALESCE(SUM(s.price),0) FROM mp_refund r JOIN mp_itemsale s ON s.id=r.itemsale_id AND s.kantin_slug=${KANTIN} WHERE r.kantin_slug=${KANTIN}) AS total_refund_amount,
      (SELECT COUNT(*) FROM mp_session WHERE kantin_slug=${KANTIN}) AS total_sessions,
      (SELECT COUNT(*) FROM mp_session WHERE kantin_slug=${KANTIN} AND close_time IS NULL) AS open_sessions,
      (SELECT COUNT(DISTINCT created::date) FROM mp_checkout WHERE kantin_slug=${KANTIN} AND NOT void) AS days_with_sales
  `
  const r = rows[0]
  return {
    totalTickets: Number(r.total_tickets ?? 0),
    totalGross: Number(r.total_gross ?? 0),
    totalRounding: Number(r.total_rounding ?? 0),
    voidTickets: Number(r.void_tickets ?? 0),
    voidGross: Number(r.void_gross ?? 0),
    itemsSold: Number(r.items_sold ?? 0),
    distinctItemsSold: Number(r.distinct_items_sold ?? 0),
    totalItems: Number(r.total_items ?? 0),
    totalCategories: Number(r.total_categories ?? 0),
    totalCustomers: Number(r.total_customers ?? 0),
    namedCustomers: Number(r.named_customers ?? 0),
    totalCancels: Number(r.total_cancels ?? 0),
    totalCancelAmount: Number(r.total_cancel_amount ?? 0),
    totalRefunds: Number(r.total_refunds ?? 0),
    totalRefundAmount: Number(r.total_refund_amount ?? 0),
    totalSessions: Number(r.total_sessions ?? 0),
    openSessions: Number(r.open_sessions ?? 0),
    daysWithSales: Number(r.days_with_sales ?? 0),
  }
})

// ---------- Daily summaries ----------

export interface H8DailyRow {
  saleDate: string  // YYYY-MM-DD
  tickets: number
  grossTotal: number
  roundingTotal: number
  voidTickets: number
  voidTotal: number
}

export const getH8Daily = cache(async (): Promise<H8DailyRow[]> => {
  const rows = await prisma.$queryRaw<{
    sale_date: Date
    tickets: bigint
    gross: number | null
    rounding: number | null
    void_tickets: bigint
    void_total: number | null
  }[]>`
    SELECT
      created::date AS sale_date,
      COUNT(*) FILTER (WHERE NOT void) AS tickets,
      COALESCE(SUM(total) FILTER (WHERE NOT void), 0) AS gross,
      COALESCE(SUM(rounding) FILTER (WHERE NOT void), 0) AS rounding,
      COUNT(*) FILTER (WHERE void) AS void_tickets,
      COALESCE(SUM(total) FILTER (WHERE void), 0) AS void_total
    FROM mp_checkout
    WHERE kantin_slug=${KANTIN}
    GROUP BY 1
    ORDER BY 1
  `
  return rows.map((r) => ({
    saleDate: r.sale_date.toISOString().slice(0, 10),
    tickets: Number(r.tickets ?? 0),
    grossTotal: Number(r.gross ?? 0),
    roundingTotal: Number(r.rounding ?? 0),
    voidTickets: Number(r.void_tickets ?? 0),
    voidTotal: Number(r.void_total ?? 0),
  }))
})

// ---------- Daily payment breakdown ----------

export interface H8DailyPaymentRow {
  saleDate: string
  paymentType: string
  paymentCount: number
  netPaid: number
  tendered: number
  changeDue: number
}

export const getH8DailyPayments = cache(async (): Promise<H8DailyPaymentRow[]> => {
  const rows = await prisma.$queryRaw<{
    sale_date: Date
    payment_type: string
    n: bigint
    net_paid: number
    tendered: number
    change_due: number
  }[]>`
    SELECT
      p.payment_time::date AS sale_date,
      pt.title AS payment_type,
      COUNT(*) AS n,
      COALESCE(SUM(p.paid - p.balance), 0) AS net_paid,
      COALESCE(SUM(p.paid), 0) AS tendered,
      COALESCE(SUM(p.balance), 0) AS change_due
    FROM mp_payment p
    JOIN mp_paymenttype pt ON pt.id = p.type_id AND pt.kantin_slug=${KANTIN}
    WHERE p.kantin_slug=${KANTIN} AND p.payment_time IS NOT NULL
    GROUP BY p.payment_time::date, pt.title
    ORDER BY 1, 2
  `
  return rows.map((r) => ({
    saleDate: r.sale_date.toISOString().slice(0, 10),
    paymentType: r.payment_type ?? "",
    paymentCount: Number(r.n ?? 0),
    netPaid: Number(r.net_paid ?? 0),
    tendered: Number(r.tendered ?? 0),
    changeDue: Number(r.change_due ?? 0),
  }))
})

// ---------- Daily cancels + refunds ----------

export interface H8DailyCancelRefundRow {
  saleDate: string
  kind: "cancel" | "refund"
  count: number
  amount: number
}

export const getH8DailyCancelsRefunds = cache(async (): Promise<H8DailyCancelRefundRow[]> => {
  const rows = await prisma.$queryRaw<{
    sale_date: Date
    kind: "cancel" | "refund"
    n: bigint
    amount: number
  }[]>`
    SELECT sale_date, kind, SUM(cnt) AS n, SUM(amt) AS amount FROM (
      SELECT cn.cancel_time::date AS sale_date, 'cancel'::text AS kind,
             COUNT(*) AS cnt, COALESCE(SUM(s.price),0) AS amt
      FROM mp_cancel cn JOIN mp_itemsale s ON s.id=cn.itemsale_id AND s.kantin_slug=${KANTIN}
      WHERE cn.kantin_slug=${KANTIN}
      GROUP BY 1
      UNION ALL
      SELECT r.refund_on::date AS sale_date, 'refund'::text AS kind,
             COUNT(*) AS cnt, COALESCE(SUM(s.price),0) AS amt
      FROM mp_refund r JOIN mp_itemsale s ON s.id=r.itemsale_id AND s.kantin_slug=${KANTIN}
      WHERE r.kantin_slug=${KANTIN}
      GROUP BY 1
    ) t
    GROUP BY sale_date, kind ORDER BY sale_date, kind
  `
  return rows.map((r) => ({
    saleDate: r.sale_date.toISOString().slice(0, 10),
    kind: r.kind,
    count: Number(r.n ?? 0),
    amount: Number(r.amount ?? 0),
  }))
})

// ---------- Sessions (Z report) ----------

export interface H8SessionRow {
  sessionId: number
  openTime: string
  closeTime: string | null
  saleDate: string
  pettyCash: number
  openedBy: string | null
  closedBy: string | null
  status: "open" | "closed"
  tickets: number
  grossTotal: number
  voidTickets: number
}

export const getH8Sessions = cache(async (): Promise<H8SessionRow[]> => {
  const rows = await prisma.$queryRaw<{
    id: bigint
    start_time: Date
    close_time: Date | null
    sale_date: Date
    petty_cash: number
    opened_by: string | null
    closed_by: string | null
    tickets: bigint
    gross_total: number
    void_tickets: bigint
  }[]>`
    SELECT
      s.id,
      s.start_time,
      s.close_time,
      s.start_time::date AS sale_date,
      COALESCE(s.petty_cash, 0) AS petty_cash,
      (s1.fname || ' ' || s1.sname) AS opened_by,
      CASE WHEN s2.fname IS NULL THEN NULL ELSE s2.fname || ' ' || s2.sname END AS closed_by,
      COALESCE((SELECT COUNT(*) FROM mp_receipt r
                JOIN mp_checkout c ON c.receipt_id = r.id AND c.kantin_slug=${KANTIN}
                WHERE r.session_id = s.id AND r.kantin_slug=${KANTIN} AND NOT c.void), 0) AS tickets,
      COALESCE((SELECT SUM(c.total) FROM mp_receipt r
                JOIN mp_checkout c ON c.receipt_id = r.id AND c.kantin_slug=${KANTIN}
                WHERE r.session_id = s.id AND r.kantin_slug=${KANTIN} AND NOT c.void), 0) AS gross_total,
      COALESCE((SELECT COUNT(*) FROM mp_receipt r
                JOIN mp_checkout c ON c.receipt_id = r.id AND c.kantin_slug=${KANTIN}
                WHERE r.session_id = s.id AND r.kantin_slug=${KANTIN} AND c.void), 0) AS void_tickets
    FROM mp_session s
    LEFT JOIN mp_staff s1 ON s1.id = s.staff_start_id AND s1.kantin_slug=${KANTIN}
    LEFT JOIN mp_staff s2 ON s2.id = s.staff_close_id AND s2.kantin_slug=${KANTIN}
    WHERE s.kantin_slug=${KANTIN}
    ORDER BY s.start_time DESC
  `
  return rows.map((r) => ({
    sessionId: Number(r.id),
    openTime: r.start_time.toISOString(),
    closeTime: r.close_time?.toISOString() ?? null,
    saleDate: r.sale_date.toISOString().slice(0, 10),
    pettyCash: Number(r.petty_cash ?? 0),
    openedBy: r.opened_by,
    closedBy: r.closed_by,
    status: r.close_time ? "closed" : "open",
    tickets: Number(r.tickets ?? 0),
    grossTotal: Number(r.gross_total ?? 0),
    voidTickets: Number(r.void_tickets ?? 0),
  }))
})

// ---------- Items ----------

export interface H8ItemRow {
  itemId: number
  item: string
  categoryId: number | null
  category: string | null
  price: number
  priceTakeaway: number
  priceDelivery: number
  tax: number
  status: string
  onSale: string
  barcode: string | null
  totalQty: number
  totalSales: number
  firstSold: string | null
  lastSold: string | null
  cancelQty: number
}

export const getH8Items = cache(async (): Promise<H8ItemRow[]> => {
  const rows = await prisma.$queryRaw<{
    id: bigint
    title: string
    category_id: bigint | null
    category: string | null
    price: number | null
    price_takeaway: number | null
    price_delivery: number | null
    tax: number | null
    status: number
    on_sale: boolean
    barcode: string | null
    total_qty: bigint
    total_sales: number | null
    first_sold: Date | null
    last_sold: Date | null
    cancel_qty: bigint
  }[]>`
    SELECT
      i.id,
      i.title,
      i.category_id,
      cat.title AS category,
      i.price,
      i.price_takeaway,
      i.price_delivery,
      i.tax,
      i.status,
      i.on_sale,
      i.barcode,
      COALESCE(sales.qty, 0) AS total_qty,
      COALESCE(sales.amt, 0) AS total_sales,
      sales.first_sold,
      sales.last_sold,
      COALESCE(canceled.qty, 0) AS cancel_qty
    FROM mp_item i
    LEFT JOIN mp_category cat ON cat.id = i.category_id AND cat.kantin_slug=${KANTIN}
    LEFT JOIN (
      SELECT s.item_id,
             COUNT(*) AS qty,
             SUM(s.price) AS amt,
             MIN(s.sale_time) AS first_sold,
             MAX(s.sale_time) AS last_sold
      FROM mp_itemsale s
      LEFT JOIN mp_cancel c ON c.itemsale_id = s.id AND c.kantin_slug=${KANTIN}
      WHERE s.kantin_slug=${KANTIN} AND c.id IS NULL
      GROUP BY s.item_id
    ) sales ON sales.item_id = i.id
    LEFT JOIN (
      SELECT s.item_id, COUNT(*) AS qty
      FROM mp_itemsale s
      JOIN mp_cancel c ON c.itemsale_id = s.id AND c.kantin_slug=${KANTIN}
      WHERE s.kantin_slug=${KANTIN}
      GROUP BY s.item_id
    ) canceled ON canceled.item_id = i.id
    WHERE i.kantin_slug=${KANTIN}
    ORDER BY COALESCE(sales.amt, 0) DESC
  `
  return rows.map((r) => ({
    itemId: Number(r.id),
    item: r.title,
    categoryId: r.category_id == null ? null : Number(r.category_id),
    category: r.category,
    price: Number(r.price ?? 0),
    priceTakeaway: Number(r.price_takeaway ?? 0),
    priceDelivery: Number(r.price_delivery ?? 0),
    tax: Number(r.tax ?? 0),
    status: r.status === 1 ? "Active" : "Inactive",
    onSale: r.on_sale ? "Yes" : "No",
    barcode: r.barcode,
    totalQty: Number(r.total_qty ?? 0),
    totalSales: Number(r.total_sales ?? 0),
    firstSold: r.first_sold?.toISOString() ?? null,
    lastSold: r.last_sold?.toISOString() ?? null,
    cancelQty: Number(r.cancel_qty ?? 0),
  }))
})

// ---------- Categories ----------

export interface H8CategoryRow {
  categoryId: number
  category: string
  status: string
  itemCount: number
  totalQty: number
  totalSales: number
}

export const getH8Categories = cache(async (): Promise<H8CategoryRow[]> => {
  const rows = await prisma.$queryRaw<{
    id: bigint
    title: string
    status: number
    item_count: bigint
    total_qty: bigint
    total_sales: number | null
  }[]>`
    SELECT
      cat.id,
      cat.title,
      cat.status,
      (SELECT COUNT(*) FROM mp_item i WHERE i.category_id = cat.id AND i.kantin_slug=${KANTIN}) AS item_count,
      (SELECT COUNT(*) FROM mp_itemsale s
        JOIN mp_item i ON i.id = s.item_id AND i.kantin_slug=${KANTIN}
        LEFT JOIN mp_cancel cn ON cn.itemsale_id = s.id AND cn.kantin_slug=${KANTIN}
        WHERE s.kantin_slug=${KANTIN} AND i.category_id = cat.id AND cn.id IS NULL) AS total_qty,
      (SELECT COALESCE(SUM(s.price),0) FROM mp_itemsale s
        JOIN mp_item i ON i.id = s.item_id AND i.kantin_slug=${KANTIN}
        LEFT JOIN mp_cancel cn ON cn.itemsale_id = s.id AND cn.kantin_slug=${KANTIN}
        WHERE s.kantin_slug=${KANTIN} AND i.category_id = cat.id AND cn.id IS NULL) AS total_sales
    FROM mp_category cat
    WHERE cat.kantin_slug=${KANTIN}
    ORDER BY cat.title
  `
  return rows.map((r) => ({
    categoryId: Number(r.id),
    category: r.title,
    status: r.status === 1 ? "Active" : "Inactive",
    itemCount: Number(r.item_count ?? 0),
    totalQty: Number(r.total_qty ?? 0),
    totalSales: Number(r.total_sales ?? 0),
  }))
})

// ---------- Cashiers ----------

export interface H8CashierRow {
  cashierId: number
  cashier: string
  workpos: number
  status: string
  tickets: number
  grossTotal: number
  daysWorked: number
  firstTicket: string | null
  lastTicket: string | null
}

export const getH8Cashiers = cache(async (): Promise<H8CashierRow[]> => {
  const rows = await prisma.$queryRaw<{
    id: bigint
    name: string
    work_pos: number
    status: number
    tickets: bigint
    gross_total: number | null
    days_worked: bigint
    first_ticket: Date | null
    last_ticket: Date | null
  }[]>`
    SELECT
      st.id,
      (st.fname || ' ' || st.sname) AS name,
      st.work_pos,
      st.status,
      COALESCE(c.tickets, 0) AS tickets,
      COALESCE(c.gross_total, 0) AS gross_total,
      COALESCE(c.days_worked, 0) AS days_worked,
      c.first_ticket,
      c.last_ticket
    FROM mp_staff st
    LEFT JOIN (
      SELECT
        ck.staff_id,
        COUNT(*) AS tickets,
        SUM(ck.total) AS gross_total,
        COUNT(DISTINCT ck.created::date) AS days_worked,
        MIN(ck.created) AS first_ticket,
        MAX(ck.created) AS last_ticket
      FROM mp_checkout ck
      WHERE ck.kantin_slug=${KANTIN} AND NOT ck.void
      GROUP BY ck.staff_id
    ) c ON c.staff_id = st.id
    WHERE st.kantin_slug=${KANTIN}
    ORDER BY COALESCE(c.gross_total, 0) DESC
  `
  return rows.map((r) => ({
    cashierId: Number(r.id),
    cashier: r.name,
    workpos: Number(r.work_pos),
    status: r.status === 1 ? "Active" : "Inactive",
    tickets: Number(r.tickets ?? 0),
    grossTotal: Number(r.gross_total ?? 0),
    daysWorked: Number(r.days_worked ?? 0),
    firstTicket: r.first_ticket?.toISOString() ?? null,
    lastTicket: r.last_ticket?.toISOString() ?? null,
  }))
})

// ---------- Cashier per-day ----------

export interface H8CashierDailyRow {
  cashierId: number
  cashier: string
  saleDate: string
  tickets: number
  grossTotal: number
}

export const getH8CashierDaily = cache(async (): Promise<H8CashierDailyRow[]> => {
  const rows = await prisma.$queryRaw<{
    cashier_id: bigint
    cashier: string
    sale_date: Date
    tickets: bigint
    gross_total: number | null
  }[]>`
    SELECT
      ck.staff_id AS cashier_id,
      (st.fname || ' ' || st.sname) AS cashier,
      ck.created::date AS sale_date,
      COUNT(*) AS tickets,
      SUM(ck.total) AS gross_total
    FROM mp_checkout ck
    JOIN mp_staff st ON st.id = ck.staff_id AND st.kantin_slug=${KANTIN}
    WHERE ck.kantin_slug=${KANTIN} AND NOT ck.void
    GROUP BY ck.staff_id, st.fname, st.sname, ck.created::date
    ORDER BY 3 DESC, 5 DESC
  `
  return rows.map((r) => ({
    cashierId: Number(r.cashier_id),
    cashier: r.cashier,
    saleDate: r.sale_date.toISOString().slice(0, 10),
    tickets: Number(r.tickets ?? 0),
    grossTotal: Number(r.gross_total ?? 0),
  }))
})

// ---------- Cashier x payment-type ----------

export interface H8CashierPaymentRow {
  cashierId: number
  cashier: string
  paymentType: string
  paymentCount: number
  netPaid: number
}

export const getH8CashierPayments = cache(async (): Promise<H8CashierPaymentRow[]> => {
  const rows = await prisma.$queryRaw<{
    cashier_id: bigint
    cashier: string
    payment_type: string
    n: bigint
    net_paid: number | null
  }[]>`
    SELECT
      p.staff_id AS cashier_id,
      (st.fname || ' ' || st.sname) AS cashier,
      pt.title AS payment_type,
      COUNT(*) AS n,
      SUM(p.paid - p.balance) AS net_paid
    FROM mp_payment p
    JOIN mp_staff st ON st.id = p.staff_id AND st.kantin_slug=${KANTIN}
    JOIN mp_paymenttype pt ON pt.id = p.type_id AND pt.kantin_slug=${KANTIN}
    WHERE p.kantin_slug=${KANTIN}
    GROUP BY p.staff_id, st.fname, st.sname, pt.title
    ORDER BY p.staff_id, net_paid DESC
  `
  return rows.map((r) => ({
    cashierId: Number(r.cashier_id),
    cashier: r.cashier,
    paymentType: r.payment_type,
    paymentCount: Number(r.n ?? 0),
    netPaid: Number(r.net_paid ?? 0),
  }))
})

// ---------- Customers ----------

export interface H8CustomerRow {
  customerId: number
  customer: string
  tickets: number
  grossTotal: number
  firstVisit: string
  lastVisit: string
}

export const getH8Customers = cache(async (): Promise<H8CustomerRow[]> => {
  const rows = await prisma.$queryRaw<{
    customer_id: bigint | null
    customer: string | null
    tickets: bigint
    gross_total: number | null
    first_visit: Date
    last_visit: Date
  }[]>`
    SELECT
      COALESCE(cu.id, 0) AS customer_id,
      COALESCE(cu.title, '(Walk-in)') AS customer,
      COUNT(DISTINCT ck.id) AS tickets,
      SUM(ck.total) AS gross_total,
      MIN(ck.created) AS first_visit,
      MAX(ck.created) AS last_visit
    FROM mp_checkout ck
    JOIN mp_receipt r ON r.id = ck.receipt_id AND r.kantin_slug=${KANTIN}
    LEFT JOIN mp_customer cu ON cu.id = r.customer_id AND cu.kantin_slug=${KANTIN}
    WHERE ck.kantin_slug=${KANTIN} AND NOT ck.void
    GROUP BY cu.id, cu.title
    ORDER BY SUM(ck.total) DESC
  `
  return rows.map((r) => ({
    customerId: Number(r.customer_id ?? 0),
    customer: r.customer ?? "(Walk-in)",
    tickets: Number(r.tickets ?? 0),
    grossTotal: Number(r.gross_total ?? 0),
    firstVisit: r.first_visit.toISOString(),
    lastVisit: r.last_visit.toISOString(),
  }))
})

// ---------- Payment types ----------

export interface H8PaymentTypeRow {
  paymentTypeId: number
  paymentType: string
  status: string
  paymentCount: number
  netPaid: number
  tendered: number
  changeDue: number
}

export const getH8PaymentTypes = cache(async (): Promise<H8PaymentTypeRow[]> => {
  const rows = await prisma.$queryRaw<{
    id: bigint
    title: string
    status: number
    n: bigint
    net_paid: number | null
    tendered: number | null
    change_due: number | null
  }[]>`
    SELECT
      pt.id,
      pt.title,
      pt.status,
      COALESCE(p.cnt, 0) AS n,
      COALESCE(p.net, 0) AS net_paid,
      COALESCE(p.tend, 0) AS tendered,
      COALESCE(p.chg, 0) AS change_due
    FROM mp_paymenttype pt
    LEFT JOIN (
      SELECT type_id,
             COUNT(*) AS cnt,
             SUM(paid - balance) AS net,
             SUM(paid) AS tend,
             SUM(balance) AS chg
      FROM mp_payment
      WHERE kantin_slug=${KANTIN}
      GROUP BY type_id
    ) p ON p.type_id = pt.id
    WHERE pt.kantin_slug=${KANTIN}
    ORDER BY COALESCE(p.net, 0) DESC
  `
  return rows.map((r) => ({
    paymentTypeId: Number(r.id),
    paymentType: r.title,
    status: r.status === 1 ? "Active" : "Inactive",
    paymentCount: Number(r.n ?? 0),
    netPaid: Number(r.net_paid ?? 0),
    tendered: Number(r.tendered ?? 0),
    changeDue: Number(r.change_due ?? 0),
  }))
})

// ---------- Hourly pattern (across the entire dataset) ----------

export interface H8HourlyRow {
  hourOfDay: number
  itemsSold: number
  gross: number
}

export const getH8HourlyPattern = cache(async (): Promise<H8HourlyRow[]> => {
  const rows = await prisma.$queryRaw<{
    hour: number
    items_sold: bigint
    gross: number | null
  }[]>`
    SELECT
      EXTRACT(HOUR FROM s.sale_time)::int AS hour,
      COUNT(*) AS items_sold,
      COALESCE(SUM(s.price), 0) AS gross
    FROM mp_itemsale s
    LEFT JOIN mp_cancel c ON c.itemsale_id = s.id AND c.kantin_slug=${KANTIN}
    WHERE s.kantin_slug=${KANTIN} AND c.id IS NULL
    GROUP BY 1
    ORDER BY 1
  `
  return rows.map((r) => ({
    hourOfDay: Number(r.hour),
    itemsSold: Number(r.items_sold ?? 0),
    gross: Number(r.gross ?? 0),
  }))
})

// ---------- Top items in the last N days ----------

export interface H8TopItemRow {
  itemId: number
  item: string
  category: string | null
  qty: number
  sales: number
}

export const getH8TopItems30d = cache(async (): Promise<H8TopItemRow[]> => {
  const rows = await prisma.$queryRaw<{
    id: bigint
    item: string
    category: string | null
    qty: bigint
    sales: number | null
  }[]>`
    SELECT
      i.id,
      i.title AS item,
      cat.title AS category,
      COUNT(*) AS qty,
      SUM(s.price) AS sales
    FROM mp_itemsale s
    JOIN mp_item i ON i.id = s.item_id AND i.kantin_slug=${KANTIN}
    LEFT JOIN mp_category cat ON cat.id = i.category_id AND cat.kantin_slug=${KANTIN}
    LEFT JOIN mp_cancel c ON c.itemsale_id = s.id AND c.kantin_slug=${KANTIN}
    WHERE s.kantin_slug=${KANTIN}
      AND c.id IS NULL
      AND s.sale_time >= (SELECT MAX(sale_time) FROM mp_itemsale WHERE kantin_slug=${KANTIN}) - INTERVAL '30 days'
    GROUP BY i.id, i.title, cat.title
    ORDER BY sales DESC NULLS LAST
    LIMIT 25
  `
  return rows.map((r) => ({
    itemId: Number(r.id),
    item: r.item,
    category: r.category,
    qty: Number(r.qty ?? 0),
    sales: Number(r.sales ?? 0),
  }))
})
