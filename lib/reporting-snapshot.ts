/** New Kantin POS snapshot contract. Legacy outlet sync is deliberately untouched. */
export const REPORT_COLUMNS = {
  RECEIPT: "id sessionid tableid staffid opentime customerid source",
  CHECKOUT: "id receiptid staffid total rounding void created",
  ITEMSALE: "id receiptid itemid staffid price saletime mode orderstatus plate",
  PAYMENT: "id checkoutid staffid paid balance paymenttime typeid",
  CANCEL: "id itemsaleid staffid reason canceltime",
  REFUND: "id receiptid staffid refundon itemsaleid reason",
  SESSION: "id staffstartid staffcloseid starttime closetime pettycash",
  ITEM: "id categoryid title price pricetakeaway pricedelivery tax status onsale itemtype barcode description",
  CATEGORY: "id title status",
  STAFF: "id fname sname workpos status",
  CUSTOMER: "id title status",
  PAYMENTTYPE: "id title status",
} as const
export type ReportTable = keyof typeof REPORT_COLUMNS
export type Row = Record<string, unknown>
export type Snapshot = Record<ReportTable, Row[]>
const TABLES = Object.keys(REPORT_COLUMNS) as ReportTable[]
const QA = /\b(?:qa|test|demo|training)\b/i
const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?$/
const TEXT_COLUMNS = new Set("title fname sname barcode description".split(" "))
const TIME_COLUMNS = new Set("opentime created saletime paymenttime canceltime refundon starttime closetime".split(" "))
export function validLocal(value: unknown): value is string {
  if (typeof value !== "string" || !LOCAL.test(value)) return false
  const d = new Date(value.slice(0, 19) + "Z")
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 19) === value.slice(0, 19)
}
function id(row: Row, field = "id"): number {
  const n = row[field]
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0 || n > 2147483647) throw new Error(`Invalid ${field}`)
  return n
}
function after(row: Row, field: string, from: string): boolean {
  if (!validLocal(row[field])) throw new Error(`Invalid ${field}`)
  return (row[field] as string) >= from
}

export function filterReportingSnapshot(input: unknown, baseline: number, from: string): Snapshot {
  if (!Number.isInteger(baseline) || baseline < 0 || !validLocal(from)) throw new Error("Reporting boundary is not configured")
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid snapshot")
  const raw = input as Record<string, unknown>
  if (Object.keys(raw).length !== TABLES.length || TABLES.some(t => !Array.isArray(raw[t]))) throw new Error("Complete reporting snapshot required")
  const data = {} as Snapshot
  for (const table of TABLES) {
    const seen = new Set<number>()
    data[table] = (raw[table] as unknown[]).map(value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${table} row`)
      const row = value as Row
      const key = id(row)
      if (seen.has(key)) throw new Error(`Duplicate ${table} id`)
      seen.add(key)
      const safe: Row = {}
      for (const column of REPORT_COLUMNS[table].split(" ")) {
        const v = row[column] ?? null
        if (v !== null && !["number", "string", "boolean"].includes(typeof v)) throw new Error("Non-scalar field")
        if (typeof v === "number" && !Number.isFinite(v)) throw new Error("Non-finite number")
        if (v !== null) {
          if (TIME_COLUMNS.has(column)) { if (!validLocal(v)) throw new Error(`Invalid ${column}`) }
          else if (TEXT_COLUMNS.has(column)) { if (typeof v !== "string") throw new Error(`Invalid ${column}`) }
          else if (column === "void" || column === "onsale") { if (typeof v !== "boolean") throw new Error(`Invalid ${column}`) }
          else if (typeof v !== "number") throw new Error(`Invalid ${column}`)
        }
        safe[column] = v
      }
      return safe
    })
  }
  const qaCategories = new Set(data.CATEGORY.filter(r => QA.test(String(r.title))).map(r => id(r)))
  const qaItems = new Set(data.ITEM.filter(r => QA.test(String(r.title)) || qaCategories.has(id(r, "categoryid"))).map(r => id(r)))
  // Exclude the WHOLE ticket, not just the QA line: its checkout/payments must
  // never leak into financial totals through a mixed test order.
  const qaReceipts = new Set(data.ITEMSALE.filter(r => qaItems.has(id(r, "itemid"))).map(r => id(r, "receiptid")))
  data.RECEIPT = data.RECEIPT.filter(r => id(r) > baseline && after(r, "opentime", from) && !qaReceipts.has(id(r)))
  const receipts = new Set(data.RECEIPT.map(r => id(r)))
  data.CHECKOUT = data.CHECKOUT.filter(r => receipts.has(id(r, "receiptid")) && after(r, "created", from))
  const checkouts = new Set(data.CHECKOUT.map(r => id(r)))
  data.ITEMSALE = data.ITEMSALE.filter(r => receipts.has(id(r, "receiptid")) && after(r, "saletime", from))
  const sales = new Set(data.ITEMSALE.map(r => id(r)))
  // Native POS can retain unassigned prepayments (nullable checkout/time).
  // They are not collected payments against an eligible finalized ticket.
  data.PAYMENT = data.PAYMENT.filter(r => r.checkoutid != null && r.paymenttime != null && checkouts.has(id(r, "checkoutid")) && after(r, "paymenttime", from))
  data.CANCEL = data.CANCEL.filter(r => sales.has(id(r, "itemsaleid")) && after(r, "canceltime", from))
  data.REFUND = data.REFUND.filter(r => sales.has(id(r, "itemsaleid")) && receipts.has(id(r, "receiptid")) && after(r, "refundon", from))
  const sessions = new Set(data.RECEIPT.map(r => id(r, "sessionid")))
  data.SESSION = data.SESSION.filter(r => sessions.has(id(r)))
  const customers = new Set(data.RECEIPT.filter(r => r.customerid != null).map(r => id(r, "customerid")))
  data.CUSTOMER = data.CUSTOMER.filter(r => customers.has(id(r)))
  data.ITEM = data.ITEM.filter(r => !qaItems.has(id(r)))
  data.CATEGORY = data.CATEGORY.filter(r => !qaCategories.has(id(r)))
  return data
}
