import raw from "@/data/dashboard.json"

export interface Meta {
  generated_at: string
  first_sale_date: string | null
  last_sale_date: string | null
  schema: string
}

export interface Summary {
  total_tickets: number
  total_gross: number
  total_rounding: number
  void_tickets: number
  void_gross: number
  items_sold: number
  distinct_items_sold: number
  total_items: number
  total_categories: number
  total_customers: number
  named_customers: number
  total_cancels: number
  total_cancel_amount: number
  total_refunds: number
  total_refund_amount: number
  total_sessions: number
  open_sessions: number
  days_with_sales: number
}

export interface DailyRow {
  sale_date: string
  tickets: number
  gross_total: number
  rounding_total: number
  void_tickets: number
  void_total: number
}

export interface DailyPaymentRow {
  sale_date: string
  payment_type: string
  payment_count: number
  net_paid: number
  tendered: number
  change_due: number
}

export interface DailyCancelRefundRow {
  sale_date: string
  kind: "cancel" | "refund"
  count_: number
  amount: number
}

export interface SessionRow {
  session_id: number
  open_time: string
  close_time: string | null
  sale_date: string
  petty_cash: number
  opened_by: string | null
  closed_by: string | null
  status: "open" | "closed"
  tickets: number
  gross_total: number
  void_tickets: number
}

export interface CategoryRow {
  category_id: number
  category: string
  status: string
  item_count: number
  total_qty: number
  total_sales: number
}

export interface ItemRow {
  item_id: number
  item: string
  category_id: number | null
  category: string | null
  price: number
  price_takeaway: number
  price_delivery: number
  tax: number
  status: string
  on_sale: string
  barcode: string | null
  total_qty: number
  total_sales: number
  first_sold: string | null
  last_sold: string | null
  cancel_qty: number
}

export interface CashierRow {
  cashier_id: number
  cashier: string
  workpos: number
  status: string
  tickets: number
  gross_total: number
  days_worked: number
  first_ticket: string | null
  last_ticket: string | null
}

export interface CashierDailyRow {
  cashier_id: number
  cashier: string
  sale_date: string
  tickets: number
  gross_total: number
}

export interface CashierPaymentRow {
  cashier_id: number
  cashier: string
  payment_type: string
  payment_count: number
  net_paid: number
}

export interface CustomerRow {
  customer_id: number
  customer: string
  tickets: number
  gross_total: number
  first_visit: string
  last_visit: string
}

export interface PaymentTypeRow {
  payment_type_id: number
  payment_type: string
  status: string
  payment_count: number
  net_paid: number
  tendered: number
  change_due: number
}

export interface HourlyRow {
  hour_of_day: number
  items_sold: number
  gross: number
}

export interface TopItemRow {
  item_id: number
  item: string
  category: string | null
  qty: number
  sales: number
}

export interface DuplicateItem {
  item_id: number
  item: string
  category: string | null
  price: number
  status: string
  total_qty: number
  total_sales: number
  last_sold: string | null
}

export interface DuplicateGroup {
  group_key: string
  confidence: "high" | "medium" | "low"
  score: number
  items: DuplicateItem[]
}

export interface Dashboard {
  meta: Meta
  summary: Summary
  daily: DailyRow[]
  daily_payments: DailyPaymentRow[]
  daily_cancels_refunds: DailyCancelRefundRow[]
  sessions: SessionRow[]
  categories: CategoryRow[]
  items: ItemRow[]
  cashiers: CashierRow[]
  cashier_daily: CashierDailyRow[]
  cashier_payments: CashierPaymentRow[]
  customers: CustomerRow[]
  payment_types: PaymentTypeRow[]
  hourly_pattern: HourlyRow[]
  top_items_30d: TopItemRow[]
  duplicates: DuplicateGroup[]
}

export const dashboard = raw as unknown as Dashboard
