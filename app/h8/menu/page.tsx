import { PageHeader } from "@/components/PageHeader"
import { KpiStrip, type Kpi } from "@/components/ui"
import { money, num, shortDate } from "@/lib/format"
import { getH8MenuLive } from "@/lib/h8-live"
import { MenuTabs } from "./MenuTabs"

export const dynamic = "force-dynamic"

export default async function MenuPage() {
  const d = await getH8MenuLive()

  const kpis: Kpi[] = [
    { label: "Items", value: num(d.kpis.totalItems), sub: `${num(d.kpis.activeItems)} active` },
    { label: "Units sold", value: num(d.kpis.totalQty) },
    { label: "Sales (all-time)", value: money(d.kpis.totalSales, { compact: true }) },
  ]

  return (
    <>
      <PageHeader
        title="Menu Performance"
        chips={["Live", `through ${shortDate(d.meta.lastSaleDate)}`, "what's selling and what isn't"]}
      />
      <KpiStrip items={kpis} />
      <MenuTabs categories={d.categories} items={d.items} />
    </>
  )
}
