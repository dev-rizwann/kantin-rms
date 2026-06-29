import clsx from "clsx"

/**
 * Shared visual primitives for the refactored dashboard.
 * Dense, low-noise, ledger-style. Color encodes MEANING only.
 */

// ---------- KPI strip (compact inline row — Form A) ----------

export interface Kpi {
  label: string
  value: string
  sub?: string
  tone?: "default" | "good" | "warn" | "bad"
}

export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="mb-6 flex flex-wrap items-stretch divide-x divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {items.map((k, i) => (
        <div key={i} className="min-w-[8.5rem] flex-1 px-4 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{k.label}</div>
          <div className="mt-0.5 text-lg font-semibold leading-tight tabular-nums text-slate-900">{k.value}</div>
          {k.sub && (
            <div
              className={clsx(
                "text-[11px] tabular-nums",
                k.tone === "good" ? "text-emerald-600" : k.tone === "bad" ? "text-red-600" : k.tone === "warn" ? "text-amber-600" : "text-slate-500",
              )}
            >
              {k.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------- Badge ----------

export function Badge({ tone = "neutral", children }: { tone?: "ok" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  const cls = {
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
    neutral: "bg-slate-100 text-slate-500",
  }[tone]
  return <span className={clsx("inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium", cls)}>{children}</span>
}

// ---------- Section heading ----------

export function SectionHead({ title, context, right }: { title: string; context?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {right ?? (context ? <span className="text-[11px] tabular-nums text-slate-500">{context}</span> : null)}
    </div>
  )
}

// ---------- Bare ledger table (server-rendered, dense) ----------

export interface Col<T> {
  key: string
  header: string
  numeric?: boolean
  lead?: boolean       // emphasise (font-medium, slate-900)
  muted?: boolean
  render: (row: T, i: number) => React.ReactNode
  /** for the in-cell share bar: fraction 0..1 */
  bar?: (row: T) => number | null
}

const T = {
  wrapper: "overflow-x-auto rounded-lg border border-slate-200 bg-white",
  table: "w-full text-[13px] border-collapse",
  th: "border-b border-slate-200 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap",
  thNum: "border-b border-slate-200 px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap",
  tbody: "divide-y divide-slate-100",
  tr: "hover:bg-slate-50",
  tdText: "px-3 py-1.5 text-slate-700",
  tdLead: "px-3 py-1.5 text-right tabular-nums font-medium text-slate-900 whitespace-nowrap",
  tdNum: "px-3 py-1.5 text-right tabular-nums text-slate-700 whitespace-nowrap",
  tdMuted: "px-3 py-1.5 text-right tabular-nums text-slate-400 whitespace-nowrap",
}

export function LedgerTable<T>({
  rows,
  cols,
  rank,
  empty = "No data",
  emptyHint,
  foot,
}: {
  rows: T[]
  cols: Col<T>[]
  rank?: boolean
  empty?: string
  emptyHint?: string
  foot?: React.ReactNode
}) {
  return (
    <div className={T.wrapper}>
      <table className={T.table}>
        <thead className="bg-slate-50">
          <tr>
            {rank && <th className={T.thNum}>#</th>}
            {cols.map((c) => (
              <th key={c.key} className={c.numeric ? T.thNum : T.th}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className={T.tbody}>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length + (rank ? 1 : 0)} className="px-3 py-10 text-center">
                <div className="text-sm text-slate-500">{empty}</div>
                {emptyHint && <div className="mt-0.5 text-xs text-slate-400">{emptyHint}</div>}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className={T.tr}>
                {rank && <td className={T.tdMuted + " w-8"}>{i + 1}</td>}
                {cols.map((c) => {
                  const frac = c.bar ? c.bar(row) : null
                  const cls = c.numeric
                    ? c.muted ? T.tdMuted : c.lead ? T.tdLead : T.tdNum
                    : T.tdText
                  if (frac != null) {
                    return (
                      <td key={c.key} className="relative px-3 py-1.5 text-right tabular-nums font-medium text-slate-900 whitespace-nowrap">
                        <span className="absolute inset-y-1 left-1 rounded-sm bg-blue-100" style={{ width: `${Math.max(2, Math.min(100, frac * 100))}%` }} />
                        <span className="relative">{c.render(row, i)}</span>
                      </td>
                    )
                  }
                  return <td key={c.key} className={cls}>{c.render(row, i)}</td>
                })}
              </tr>
            ))
          )}
        </tbody>
        {foot}
      </table>
    </div>
  )
}

export const tableClasses = T
