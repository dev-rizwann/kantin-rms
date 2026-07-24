"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { hourLabel } from "@/lib/format"

// Kantin brand palette: coral first, then leaf green + warm accents
const PALETTE = ["#e96047", "#80c048", "#d97706", "#0f766e", "#78716c", "#4f46e5", "#c026d3", "#65a30d"]
const GRID = "#f0efeb"
const TICK = "#a8a29e"

/** Compact money axis: 6,000,000 -> "6M", 4,500,000 -> "4.5M", 12,000 -> "12k". */
function compactAxis(v: number): string {
  const a = Math.abs(v)
  if (a >= 1_000_000) return `${trimZero(v / 1_000_000)}M`
  if (a >= 1_000) return `${trimZero(v / 1_000)}k`
  return `${v}`
}
const trimZero = (x: number) => x.toFixed(1).replace(/\.0$/, "")

const tooltipStyle = {
  fontSize: 12,
  border: "1px solid #e7e5e4",
  borderRadius: 10,
  boxShadow: "0 4px 12px rgba(28,25,23,0.08)",
}

export function MiniLineChart({
  data,
  xKey,
  yKey,
  color = "#e96047",
  height = 200,
}: {
  data: any[]
  xKey: string
  yKey: string
  color?: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis dataKey={xKey} fontSize={11} tick={{ fill: TICK }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis fontSize={11} tick={{ fill: TICK }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(v: any) => (typeof v === "number" ? v.toLocaleString() : v)}
          contentStyle={tooltipStyle}
        />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function SimpleBarChart({
  data,
  xKey,
  yKey,
  color = "#e96047",
  height = 200,
  xFormat,
  showAllTicks,
  maxTickChars,
}: {
  data: any[]
  xKey: string
  yKey: string
  color?: string
  height?: number
  /** label style for the x axis. "hour" turns 13 into "1 PM". A plain string is
   *  passed (not a function) because this crosses the server→client boundary. */
  xFormat?: "hour"
  /** force every label to render instead of letting Recharts thin them */
  showAllTicks?: boolean
  /** truncate long axis labels to this many chars (tooltip keeps the full name) */
  maxTickChars?: number
}) {
  const angled = showAllTicks && data.length > 6
  const xTickFormatter = xFormat === "hour" ? hourLabel : undefined
  const axisTick = xTickFormatter ?? (maxTickChars ? (v: any) => { const s = String(v); return s.length > maxTickChars ? s.slice(0, maxTickChars - 1) + "…" : s } : undefined)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: angled ? 22 : 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          fontSize={angled ? 10 : 11}
          tick={{ fill: TICK }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={showAllTicks ? 0 : "preserveEnd"}
          tickFormatter={axisTick}
          angle={angled ? -35 : 0}
          textAnchor={angled ? "end" : "middle"}
          height={angled ? 58 : 30}
        />
        <YAxis fontSize={11} tick={{ fill: TICK }} tickLine={false} axisLine={false} tickFormatter={compactAxis} width={38} />
        <Tooltip
          formatter={(v: any) => (typeof v === "number" ? v.toLocaleString() : v)}
          labelFormatter={xTickFormatter}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(233,96,71,0.07)" }}
        />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DonutChart({
  data,
  nameKey,
  valueKey,
  height = 240,
}: {
  data: any[]
  nameKey: string
  valueKey: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={52} outerRadius={80} paddingAngle={1.5} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#fff" strokeWidth={1.5} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: any) => (typeof v === "number" ? "Rs " + v.toLocaleString() : v)}
          contentStyle={tooltipStyle}
        />
        <Legend
          verticalAlign="bottom"
          height={32}
          iconSize={9}
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: "#78716c" }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
