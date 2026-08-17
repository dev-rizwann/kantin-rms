import { PageHeader } from "@/components/PageHeader"
import { KpiStrip, type Kpi } from "@/components/ui"
import { money, num } from "@/lib/format"
import { getH8MenuLive } from "@/lib/h8-live"
import { MenuTabs } from "@/app/h8/menu/MenuTabs"

export const dynamic = "force-dynamic"
const SLUG = "chak-shahzad"

export default async function ChakShahzadMenu() {
  const d = await getH8MenuLive(SLUG)
  const kpis: Kpi[] = [
    { label: "Items", value: num(d.kpis.totalItems), sub: `${num(d.kpis.activeItems)} active` },
    { label: "Units sold", value: num(d.kpis.totalQty) },
    { label: "Sales (all-time)", value: money(d.kpis.totalSales, { compact: true }) },
  ]
  return (
    <>
      <PageHeader title="Menu Performance" chips={["what is selling and what is not"]} />
      <KpiStrip items={kpis} />
      <MenuTabs categories={d.categories} items={d.items} />
    </>
  )
}
