"use client"

import { useMemo, useState } from "react"
import clsx from "clsx"

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
  numeric?: boolean
  sortValue?: (row: T) => number | string
}

export function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  search,
  searchKeys,
  pageSize = 50,
  initialSort,
}: {
  rows: T[]
  columns: Column<T>[]
  search?: boolean
  searchKeys?: (keyof T)[]
  pageSize?: number
  initialSort?: { key: string; dir: "asc" | "desc" }
}) {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null)

  const filtered = useMemo(() => {
    let r = rows
    if (query.trim() && searchKeys?.length) {
      const q = query.toLowerCase().trim()
      r = r.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
      )
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col) {
        const accessor = col.sortValue ?? ((row: T) => row[col.key as keyof T] as any)
        const mul = sort.dir === "asc" ? 1 : -1
        r = [...r].sort((a, b) => {
          const av = accessor(a)
          const bv = accessor(b)
          if (av == null && bv == null) return 0
          if (av == null) return 1
          if (bv == null) return -1
          if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul
          return String(av).localeCompare(String(bv)) * mul
        })
      }
    }
    return r
  }, [rows, query, sort, columns, searchKeys])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function toggleSort(key: string) {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "desc" }
      if (s.dir === "desc") return { key, dir: "asc" }
      return null
    })
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm overflow-hidden">
      {search && (
        <div className="p-3 border-b border-stone-100 flex items-center gap-3">
          <input
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            className="px-3 py-1.5 border border-stone-200 rounded-md text-sm w-72 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-xs text-stone-500">
            {filtered.length.toLocaleString()} rows
          </span>
        </div>
      )}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wide">
            <tr>
              {columns.map((c) => {
                const isSort = sort?.key === c.key
                return (
                  <th
                    key={String(c.key)}
                    onClick={() => toggleSort(String(c.key))}
                    className={clsx(
                      "px-3 py-2 text-left font-medium cursor-pointer select-none whitespace-nowrap",
                      c.numeric && "text-right",
                      c.className,
                    )}
                  >
                    {c.header}
                    {isSort && <span className="ml-1 text-stone-400">{sort?.dir === "asc" ? "▲" : "▼"}</span>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pageRows.map((row, i) => (
              <tr key={i} className="hover:bg-stone-50">
                {columns.map((c) => (
                  <td
                    key={String(c.key)}
                    className={clsx(
                      "px-3 py-2 whitespace-nowrap",
                      c.numeric && "text-right tabular-nums",
                      c.className,
                    )}
                  >
                    {c.render ? c.render(row) : String(row[c.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-stone-400">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-stone-100 text-xs text-stone-500">
          <div>
            Page {page} of {pages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 border border-stone-200 rounded hover:bg-stone-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-2 py-1 border border-stone-200 rounded hover:bg-stone-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
