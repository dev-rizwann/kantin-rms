"use client"

import { useEffect, useState } from "react"
import { agoLabel, pktDateTime } from "@/lib/format"
import type { SyncStatus as Status } from "@/lib/sync-status"

/** Last push from the canteen PC, always shown in Pakistan time — the server
 *  runs UTC and the viewer could be anywhere. The relative age ticks on a timer
 *  and starts empty so the server and client markup match on first paint. */
export function SyncStatus({ status }: { status: Status }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const at = status.lastContactAt
  const mins = at && now ? (now - new Date(at).getTime()) / 60000 : null
  const dot = mins == null ? "bg-white/30" : mins < 90 ? "bg-leaf-300 shadow-[0_0_7px_rgba(177,218,124,.9)]" : mins < 720 ? "bg-amber-300" : "bg-white/35"

  return (
    <div className="flex items-center gap-1.5 px-1.5 pb-1.5 pt-0.5 text-[9.5px] leading-tight text-white/45" title={at ? `Last push received ${pktDateTime(at)} PKT${status.lastRowsAt && status.lastRowsAt !== at ? ` · last new rows ${pktDateTime(status.lastRowsAt)} PKT` : ""}` : status.unavailable ? "Could not read the sync state just now." : "No push has ever been received from the canteen PC."}>
      <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + dot} />
      <span className="sidebar-copy truncate">
        {at ? <>Synced {pktDateTime(at)} PKT{now && <span className="text-white/30"> · {agoLabel(at, now)}</span>}</> : status.unavailable ? "Sync status unavailable" : "Never synced"}
      </span>
    </div>
  )
}
