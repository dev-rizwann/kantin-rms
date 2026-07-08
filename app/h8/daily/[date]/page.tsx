import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardBody, CardHeader } from "@/components/Card"
import { SimpleBarChart } from "@/components/Charts"
import { PageHeader } from "@/components/PageHeader"
import { KpiStrip, LedgerTable, SectionHead, type Kpi } from "@/components/ui"
import { money, num, shortDate } from "@/lib/format"
import { getH8DayDetailLive, payLabel } from "@/lib/h8-live"

export const dynamic = "force-dynamic"

export default async function DayDetailPage({ params }: { params: { date: string } }) {
  const date = params.date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const d = await getH8DayDetailLive(date)
  const k = d.kpis
  const maxCat = Math.max(1, ...d.categories.map((c) => c.sales))
  const maxItem = Math.max(1, ...d.items.map((i) => i.sales))

  const back = (
    <div className="flex items-center justify-between gap-3">
      <Link href="/h8/daily" className="text-[13px] font-medium text-coral-700 hover:underline">← Daily & Cash</Link>
      <a
        href={`/api/export/items-daily?from=${date}&to=${date}`}
        className="text-[12.5px] font-medium text-coral-700 hover:underline"
        download
      >
        ⬇ Export this day (Excel)
      </a>
    </div>
  )

  if (!d.hasData) {
    return (
      <>
        <div className="mb-2">{back}</div>
        <PageHeader title={shortDate(date)} chips={["Daily detail", "live"]} />
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-10 text-center text-sm text-stone-500">
          No sales recorded on this date.
        </div>
      </>
    )
  }

  const kpis: Kpi[] = [
    { label: "Gross", value: money(k.gross, { compact: true }), sub: `${num(k.tickets)} tickets · avg ${money(k.avgTicket)}` },
    { label: "Items sold", value: num(k.itemsSold), sub: `${num(k.distinctItems)} distinct` },
    { label: "Cash", value: money(k.cashNet, { compact: true }), sub: "net collected" },
    { label: "Non-cash", value: money(k.nonCashNet, { compact: true }), sub: "bank / card / FP" },
    { label: "Voids / cancels", value: `${num(k.voids)} / ${num(k.cancels)}`, tone: k.voids + k.cancels > 0 ? "warn" : "default" },
  ]

  return (
    <>
      <div className="mb-2">{back}</div>
      <PageHeader title={shortDate(date)} chips={["Daily detail", "live"]} />
      <KpiStrip items={kpis} />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Sales by hour" />
          <CardBody><SimpleBarChart data={d.hourly} xKey="hour" yKey="gross" /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Cashiers" />
          <CardBody>
            <LedgerTable
              rows={d.cashiers}
              cols={[
                { key: "c", header: "Cashier", render: (r) => <span className="font-medium text-stone-900">{r.cashier}</span> },
                { key: "t", header: "Tickets", numeric: true, muted: true, render: (r) => num(r.tickets) },
                { key: "g", header: "Gross", numeric: true, lead: true, render: (r) => money(r.gross) },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <section className="mb-6">
        <SectionHead title="Categories" context={`${d.categories.length} · this day`} />
        <LedgerTable
          rows={d.categories}
          rank
          cols={[
            { key: "cat", header: "Category", render: (r) => <span className="font-medium text-stone-900">{r.category}</span> },
            { key: "qty", header: "Qty", numeric: true, muted: true, render: (r) => num(r.qty) },
            { key: "sales", header: "Sales", numeric: true, lead: true, render: (r) => money(r.sales), bar: (r) => r.sales / maxCat },
          ]}
        />
      </section>

      <section className="mb-6">
        <SectionHead title="Items" context={`${d.items.length} · top sellers first`} />
        <LedgerTable
          rows={d.items}
          rank
          cols={[
            { key: "item", header: "Item", render: (r) => <span className="font-medium text-stone-900">{r.item}</span> },
            { key: "cat", header: "Category", render: (r) => <span className="text-stone-400">{r.category ?? "—"}</span> },
            { key: "qty", header: "Qty", numeric: true, render: (r) => num(r.qty) },
            { key: "sales", header: "Sales", numeric: true, lead: true, render: (r) => money(r.sales), bar: (r) => r.sales / maxItem },
          ]}
        />
      </section>

      <section>
        <SectionHead title="Payments" context="net collected by type" />
        <LedgerTable
          rows={d.payments}
          cols={[
            { key: "type", header: "Type", render: (r) => <span className="font-medium text-stone-900">{payLabel(r.paymentType)}</span> },
            { key: "n", header: "Count", numeric: true, muted: true, render: (r) => num(r.count) },
            { key: "net", header: "Net", numeric: true, lead: true, render: (r) => money(r.net) },
          ]}
        />
      </section>
    </>
  )
}
