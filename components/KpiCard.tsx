import clsx from "clsx"

export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string
  value: string
  sub?: string
  tone?: "default" | "good" | "warn" | "bad"
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-200"
      : tone === "warn"
        ? "border-amber-200"
        : tone === "bad"
          ? "border-red-200"
          : "border-slate-200"
  return (
    <div className={clsx("bg-white border rounded-lg p-4 shadow-sm", toneCls)}>
      <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}
