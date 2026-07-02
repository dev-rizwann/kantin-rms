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

// fresh-ledger palette: forest first, then teal/amber/stone accents
const PALETTE = ["#047857", "#0d9488", "#d97706", "#78716c", "#dc2626", "#0369a1", "#7c3aed", "#65a30d"]
const GRID = "#f0efeb"
const TICK = "#a8a29e"

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
  color = "#047857",
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
  color = "#047857",
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
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} fontSize={11} tick={{ fill: TICK }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis fontSize={11} tick={{ fill: TICK }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(v: any) => (typeof v === "number" ? v.toLocaleString() : v)}
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(4,120,87,0.06)" }}
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
