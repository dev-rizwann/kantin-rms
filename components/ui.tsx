import clsx from "clsx"

/**
 * Shared visual primitives — "fresh ledger" theme.
 * Warm stone neutrals, deep forest accent, dense tabular numerals.
 * Color encodes MEANING only (emerald good · amber warn · red bad).
 */

// ---------- KPI strip (compact inline row) ----------

export interface Kpi {
  label: string
  value: string
  sub?: string
  tone?: "default" | "good" | "warn" | "bad"
}

export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="mb-6 flex flex-wrap items-stretch divide-x divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      {items.map((k, i) => (
        <div key={i} className="min-w-[8.5rem] flex-1 px-4 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-400">{k.label}</div>
          <div
            className={clsx(
              "mt-1 text-xl font-semibold leading-tight tracking-tight tabular-nums",
              // when there is no sub-line, let the value itself carry the tone
              !k.sub && k.tone === "warn" ? "text-amber-600" : !k.sub && k.tone === "bad" ? "text-red-600" : !k.sub && k.tone === "good" ? "text-leaf-700" : "text-stone-900",
            )}
          >
            {k.value}
          </div>
          {k.sub && (
            <div
              className={clsx(
                "mt-0.5 text-[11px] tabular-nums",
                k.tone === "good" ? "font-medium text-leaf-700" : k.tone === "bad" ? "font-medium text-red-600" : k.tone === "warn" ? "font-medium text-amber-600" : "text-stone-500",
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
    ok: "bg-leaf-50 text-leaf-800 ring-leaf-600/20",
    warn: "bg-amber-50 text-amber-700 ring-amber-600/20",
    bad: "bg-red-50 text-red-700 ring-red-600/15",
    neutral: "bg-stone-100 text-stone-500 ring-stone-500/10",
  }[tone]
  return <span className={clsx("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", cls)}>{children}</span>
}

// ---------- Section heading ----------

export function SectionHead({ title, context, right }: { title: string; context?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[15px] font-semibold tracking-tight text-stone-800">{title}</h2>
      {right ?? (context ? <span className="text-[11px] tabular-nums text-stone-400">{context}</span> : null)}
    </div>
  )
}

// ---------- Bare ledger table (server-rendered, dense) ----------

export interface Col<T> {
  key: string
  header: string
  numeric?: boolean
  lead?: boolean       // emphasise (font-medium, stone-900)
  muted?: boolean
  render: (row: T, i: number) => React.ReactNode
  /** for the in-cell share bar: fraction 0..1 */
  bar?: (row: T) => number | null
}

const T = {
  wrapper: "overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]",
  table: "w-full text-[13px] border-collapse",
  th: "border-b border-stone-200 bg-stone-50/80 px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-400 whitespace-nowrap",
  thNum: "border-b border-stone-200 bg-stone-50/80 px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-400 whitespace-nowrap",
  tbody: "divide-y divide-stone-100",
  tr: "transition-colors hover:bg-coral-50/70",
  tdText: "px-3 py-1.5 text-stone-600",
  tdLead: "px-3 py-1.5 text-right tabular-nums font-medium text-stone-900 whitespace-nowrap",
  tdNum: "px-3 py-1.5 text-right tabular-nums text-stone-600 whitespace-nowrap",
  tdMuted: "px-3 py-1.5 text-right tabular-nums text-stone-400 whitespace-nowrap",
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
        <thead>
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
                <div className="text-sm text-stone-500">{empty}</div>
                {emptyHint && <div className="mt-0.5 text-xs text-stone-400">{emptyHint}</div>}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className={T.tr}>
                {rank && <td className={T.tdMuted + " w-8 text-stone-300"}>{i + 1}</td>}
                {cols.map((c) => {
                  const frac = c.bar ? c.bar(row) : null
                  const cls = c.numeric
                    ? c.muted ? T.tdMuted : c.lead ? T.tdLead : T.tdNum
                    : T.tdText
                  if (frac != null) {
                    return (
                      <td key={c.key} className="relative px-3 py-1.5 text-right tabular-nums font-medium text-stone-900 whitespace-nowrap">
                        <span className="absolute inset-y-[5px] left-1 rounded-[3px] bg-leaf-200/60" style={{ width: `${Math.max(2, Math.min(100, frac * 100))}%` }} />
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
