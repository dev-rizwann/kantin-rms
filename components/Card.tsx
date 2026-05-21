import clsx from "clsx"

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-white border border-slate-200 rounded-lg shadow-sm", className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("p-4", className)}>{children}</div>
}
