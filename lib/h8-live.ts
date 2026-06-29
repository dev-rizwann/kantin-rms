import "server-only"
import { prisma } from "./prisma"

/**
 * Live H-8 Overview data in ONE combined query.
 *
 * Why one query: the standalone runtime deadlocked when a single RSC render
 * issued many sequential Prisma round-trips. A single json_build_object query
 * (one round-trip) is fast (~400ms) and reliable. All report pages should
 * follow this pattern when migrated off the static dashboard.json.
 */

export interface H8OverviewLive {
  meta: { lastSaleDate: string | null; firstSaleDate: string | null; daysWithSales: number }
  summary: {
    totalTickets: number
    totalGross: number
    itemsSold: number
    distinctItemsSold: number
    voidTickets: number
    voidGross: number
    totalCancels: number
    totalCancelAmount: number
    totalRefunds: number
    totalRefundAmount: number
  }
  daily: { sale_date: string; gross_total: number }[]
  topCategories: { category: string; total_sales: number }[]
  paymentMix: { payment_type: string; net_paid: number }[]
  hourly: { hour_of_day: number; gross: number }[]
  openSessions: { opened_by: string | null; open_time: string; tickets: number; gross_total: number }[]
  topItems30d: { item_id: number; item: string; category: string | null; qty: number; sales: number }[]
}

const K = "h8"

export async function getH8OverviewLive(): Promise<H8OverviewLive> {
  const rows = await prisma.$queryRaw<{ payload: any }[]>`
    SELECT json_build_object(
      'meta', (SELECT json_build_object(
          'first_sale', MIN(created)::date,
          'last_sale', MAX(created)::date,
          'days_with_sales', COUNT(DISTINCT created::date)
        ) FROM mp_checkout WHERE kantin_slug=${K} AND NOT void),

      'summary', (SELECT json_build_object(
          'total_tickets', COUNT(*) FILTER (WHERE NOT void),
          'total_gross', COALESCE(SUM(total) FILTER (WHERE NOT void),0),
          'void_tickets', COUNT(*) FILTER (WHERE void),
          'void_gross', COALESCE(SUM(total) FILTER (WHERE void),0)
        ) FROM mp_checkout WHERE kantin_slug=${K}),

      'items_sold', (SELECT COUNT(*) FROM mp_itemsale s
          WHERE s.kantin_slug=${K}
          AND NOT EXISTS (SELECT 1 FROM mp_cancel c WHERE c.itemsale_id=s.id AND c.kantin_slug=${K})),
      'distinct_items_sold', (SELECT COUNT(DISTINCT item_id) FROM mp_itemsale WHERE kantin_slug=${K}),

      'total_cancels', (SELECT COUNT(*) FROM mp_cancel WHERE kantin_slug=${K}),
      'total_cancel_amount', (SELECT COALESCE(SUM(s.price),0) FROM mp_cancel cn
          JOIN mp_itemsale s ON s.id=cn.itemsale_id AND s.kantin_slug=${K} WHERE cn.kantin_slug=${K}),
      'total_refunds', (SELECT COUNT(*) FROM mp_refund WHERE kantin_slug=${K}),
      'total_refund_amount', (SELECT COALESCE(SUM(s.price),0) FROM mp_refund r
          JOIN mp_itemsale s ON s.id=r.itemsale_id AND s.kantin_slug=${K} WHERE r.kantin_slug=${K}),

      'daily', (SELECT COALESCE(json_agg(d ORDER BY d.sale_date),'[]'::json) FROM (
          SELECT created::date AS sale_date,
                 COALESCE(SUM(total) FILTER (WHERE NOT void),0) AS gross_total
          FROM mp_checkout WHERE kantin_slug=${K} GROUP BY 1 ORDER BY 1 DESC LIMIT 30) d),

      'top_categories', (SELECT COALESCE(json_agg(c ORDER BY c.total_sales DESC),'[]'::json) FROM (
          SELECT cat.title AS category, COALESCE(SUM(s.price),0) AS total_sales
          FROM mp_itemsale s
          JOIN mp_item i ON i.id=s.item_id AND i.kantin_slug=${K}
          JOIN mp_category cat ON cat.id=i.category_id AND cat.kantin_slug=${K}
          LEFT JOIN mp_cancel cn ON cn.itemsale_id=s.id AND cn.kantin_slug=${K}
          WHERE s.kantin_slug=${K} AND cn.id IS NULL AND COALESCE(cat.title,'') <> ''
          GROUP BY cat.title ORDER BY 2 DESC LIMIT 8) c),

      'payment_mix', (SELECT COALESCE(json_agg(p ORDER BY p.net_paid DESC),'[]'::json) FROM (
          SELECT pt.title AS payment_type, COALESCE(SUM(pm.paid - pm.balance),0) AS net_paid
          FROM mp_payment pm JOIN mp_paymenttype pt ON pt.id=pm.type_id AND pt.kantin_slug=${K}
          WHERE pm.kantin_slug=${K}
          GROUP BY pt.title HAVING COALESCE(SUM(pm.paid - pm.balance),0) > 0
          ORDER BY 2 DESC LIMIT 6) p),

      'hourly', (SELECT COALESCE(json_agg(h ORDER BY h.hour_of_day),'[]'::json) FROM (
          SELECT EXTRACT(HOUR FROM s.sale_time)::int AS hour_of_day, COALESCE(SUM(s.price),0) AS gross
          FROM mp_itemsale s LEFT JOIN mp_cancel cn ON cn.itemsale_id=s.id AND cn.kantin_slug=${K}
          WHERE s.kantin_slug=${K} AND cn.id IS NULL
          GROUP BY 1 ORDER BY 1) h),

      'open_sessions', (SELECT COALESCE(json_agg(os),'[]'::json) FROM (
          SELECT (st.fname || ' ' || st.sname) AS opened_by, s.start_time AS open_time,
            COALESCE((SELECT COUNT(*) FROM mp_receipt r JOIN mp_checkout c ON c.receipt_id=r.id AND c.kantin_slug=${K}
                      WHERE r.session_id=s.id AND r.kantin_slug=${K} AND NOT c.void),0) AS tickets,
            COALESCE((SELECT SUM(c.total) FROM mp_receipt r JOIN mp_checkout c ON c.receipt_id=r.id AND c.kantin_slug=${K}
                      WHERE r.session_id=s.id AND r.kantin_slug=${K} AND NOT c.void),0) AS gross_total
          FROM mp_session s LEFT JOIN mp_staff st ON st.id=s.staff_start_id AND st.kantin_slug=${K}
          WHERE s.kantin_slug=${K} AND s.close_time IS NULL
          ORDER BY s.start_time DESC) os),

      'top_items_30d', (SELECT COALESCE(json_agg(ti ORDER BY ti.sales DESC),'[]'::json) FROM (
          SELECT i.id AS item_id, i.title AS item, cat.title AS category,
                 COUNT(*) AS qty, COALESCE(SUM(s.price),0) AS sales
          FROM mp_itemsale s
          JOIN mp_item i ON i.id=s.item_id AND i.kantin_slug=${K}
          LEFT JOIN mp_category cat ON cat.id=i.category_id AND cat.kantin_slug=${K}
          LEFT JOIN mp_cancel cn ON cn.itemsale_id=s.id AND cn.kantin_slug=${K}
          WHERE s.kantin_slug=${K} AND cn.id IS NULL
            AND s.sale_time >= (SELECT MAX(sale_time) FROM mp_itemsale WHERE kantin_slug=${K}) - INTERVAL '30 days'
          GROUP BY i.id, i.title, cat.title ORDER BY sales DESC LIMIT 10) ti)
    ) AS payload
  `
  const p = rows[0]?.payload ?? {}
  const n = (v: any) => (v == null ? 0 : Number(v))
  return {
    meta: {
      firstSaleDate: p.meta?.first_sale ?? null,
      lastSaleDate: p.meta?.last_sale ?? null,
      daysWithSales: n(p.meta?.days_with_sales),
    },
    summary: {
      totalTickets: n(p.summary?.total_tickets),
      totalGross: n(p.summary?.total_gross),
      itemsSold: n(p.items_sold),
      distinctItemsSold: n(p.distinct_items_sold),
      voidTickets: n(p.summary?.void_tickets),
      voidGross: n(p.summary?.void_gross),
      totalCancels: n(p.total_cancels),
      totalCancelAmount: n(p.total_cancel_amount),
      totalRefunds: n(p.total_refunds),
      totalRefundAmount: n(p.total_refund_amount),
    },
    daily: (p.daily ?? []).map((d: any) => ({ sale_date: d.sale_date, gross_total: n(d.gross_total) })),
    topCategories: (p.top_categories ?? []).map((c: any) => ({ category: c.category, total_sales: n(c.total_sales) })),
    paymentMix: (p.payment_mix ?? []).map((x: any) => ({ payment_type: x.payment_type, net_paid: n(x.net_paid) })),
    hourly: (p.hourly ?? []).map((h: any) => ({ hour_of_day: n(h.hour_of_day), gross: n(h.gross) })),
    openSessions: (p.open_sessions ?? []).map((o: any) => ({
      opened_by: o.opened_by ?? null,
      open_time: o.open_time,
      tickets: n(o.tickets),
      gross_total: n(o.gross_total),
    })),
    topItems30d: (p.top_items_30d ?? []).map((t: any) => ({
      item_id: n(t.item_id),
      item: t.item,
      category: t.category ?? null,
      qty: n(t.qty),
      sales: n(t.sales),
    })),
  }
}
