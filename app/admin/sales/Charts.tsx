"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

const WAGON = "#C5392C";
const INK = "#271F17";
const MUTED = "#6F6354";

// Distinct colors per product (strawberry red, asparagus green, rhubarb amber).
const PRODUCT_FILL: Record<string, string> = {
  QUART: "#C5392C",
  ASPARAGUS: "#8FA06A",
  RHUBARB: "#D98B3A",
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const axisMoney = (cents: number) => `$${Math.round(cents / 100)}`;

function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: "short", day: "numeric" });
}
function longDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

// Horizontal revenue bars by category (cashier, location, …).
export function RevenueBars({ data }: { data: { name: string; revenue: number }[] }) {
  const height = Math.max(110, data.length * 46);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 14, bottom: 4, left: 0 }}>
        <XAxis type="number" tickFormatter={axisMoney} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 12, fill: INK }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "rgba(39,31,23,0.05)" }} formatter={(v) => [money(v as number), "Revenue"]} />
        <Bar dataKey="revenue" fill={WAGON} radius={[0, 6, 6, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Revenue share by produce (donut).
export function ProductPie({ data }: { data: { name: string; value: number; mode: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
          stroke="none"
          label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
          labelLine={false}
        >
          {data.map((d) => (
            <Cell key={d.mode} fill={PRODUCT_FILL[d.mode] ?? "#ccc"} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [money(v as number), "Revenue"]} />
        <Legend iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Vertical revenue bars over time (one bar per day, oldest → newest).
export function DayBars({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
        <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tickFormatter={axisMoney} tick={{ fontSize: 10, fill: MUTED }} width={44} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [money(v as number), "Revenue"]} labelFormatter={(d) => longDay(d as string)} />
        <Bar dataKey="revenue" fill={WAGON} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
