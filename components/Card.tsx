import clsx from "clsx"

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]", className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="border-b border-stone-100 px-4 py-3">
      <div className="font-display text-[13.5px] font-semibold tracking-tight text-stone-800">{title}</div>
      {sub && <div className="mt-0.5 text-[11px] text-stone-400">{sub}</div>}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("p-4", className)}>{children}</div>
}
