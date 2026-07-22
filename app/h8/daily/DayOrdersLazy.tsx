"use client"

import { useEffect, useState } from "react"
import type { H8Order } from "@/lib/h8-live"
import { OrderList } from "./OrderList"

/** Ticket list for the day-detail page. Fetched client-side so the page's own
 *  (already ~1s) summary query isn't serialised behind a second one. */
export function DayOrdersLazy({ date }: { date: string }) {
  const [orders, setOrders] = useState<H8Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/h8/day-orders?date=${date}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 403 ? "You don't have access to ticket detail." : `Could not load orders (${r.status}).`))))
      .then((j) => { if (alive) setOrders(j.orders ?? []) })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Could not load orders.") })
    return () => { alive = false }
  }, [date])

  if (error) return <div className="rounded-lg border border-stone-200 bg-white px-4 py-6 text-center text-[12px] text-red-600">{error}</div>
  if (!orders) return <div className="rounded-lg border border-stone-200 bg-white px-4 py-6 text-center text-[12px] text-stone-400">Loading orders…</div>
  return <OrderList orders={orders} />
}
