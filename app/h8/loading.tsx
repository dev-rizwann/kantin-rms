export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-48 rounded bg-slate-200" />
      <div className="mb-6 flex gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 px-4 py-2.5">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-2 h-5 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="h-9 border-b border-slate-200 bg-slate-50" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-2">
            <div className="h-3 w-32 rounded bg-slate-100" />
            <div className="ml-auto h-3 w-16 rounded bg-slate-100" />
            <div className="h-3 w-20 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
