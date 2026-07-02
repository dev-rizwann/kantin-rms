export function PageHeader({
  title,
  subtitle,
  chips,
  eyebrow,
}: {
  title: string
  subtitle?: string
  /** small status pills under the title; a chip named "Live" gets a pulse dot */
  chips?: string[]
  eyebrow?: string
}) {
  return (
    <header className="mb-6">
      {eyebrow && (
        <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-emerald-700/70">{eyebrow}</div>
      )}
      <h1 className="font-display text-[26px] font-semibold tracking-tight text-stone-900">{title}</h1>
      {chips && chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {chips.map((c, i) =>
            c === "Live" ? (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            ) : (
              <span key={i} className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-stone-500 ring-1 ring-inset ring-stone-200">
                {c}
              </span>
            ),
          )}
        </div>
      )}
      {subtitle && !chips && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
    </header>
  )
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-stone-800">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}
