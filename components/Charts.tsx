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

const PALETTE = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

export function MiniLineChart({
  data,
  xKey,
  yKey,
  color = "#2563eb",
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
        <CartesianGrid stroke="#f1f5f9" />
        <XAxis dataKey={xKey} fontSize={11} tick={{ fill: "#64748b" }} />
        <YAxis fontSize={11} tick={{ fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(v: any) => (typeof v === "number" ? v.toLocaleString() : v)}
          contentStyle={{ fontSize: 12 }}
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
  color = "#2563eb",
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
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey={xKey} fontSize={11} tick={{ fill: "#64748b" }} />
        <YAxis fontSize={11} tick={{ fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(v: any) => (typeof v === "number" ? v.toLocaleString() : v)}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey={yKey} fill={color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
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
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={50} outerRadius={80} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: any) => (typeof v === "number" ? "Rs " + v.toLocaleString() : v)}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend
          verticalAlign="bottom"
          height={32}
          iconSize={10}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
