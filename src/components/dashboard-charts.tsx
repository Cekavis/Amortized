"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCny } from "@/lib/money";

type Category = {
  id: string;
  name: string;
  color: string;
};

export function DashboardCharts({
  data,
  categories,
}: {
  data: Record<string, string | number>[];
  categories: Category[];
}) {
  const activeCategories = categories.filter((category) =>
    data.some((row) => Number(row[category.id] ?? 0) !== 0),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="surface p-5">
        <h2 className="mb-4 text-base font-semibold">每日总摊销</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="totalCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => String(value).slice(5)}
                minTickGap={24}
              />
              <YAxis tickFormatter={(value) => `¥${value}`} width={58} />
              <Tooltip
                formatter={(value) => formatCny(Number(value) * 100)}
                labelFormatter={(value) => `日期 ${value}`}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#0f766e"
                strokeWidth={2}
                fill="url(#totalCost)"
                name="总摊销"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="surface p-5">
        <h2 className="mb-4 text-base font-semibold">分类堆叠</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => String(value).slice(5)}
                minTickGap={24}
              />
              <YAxis tickFormatter={(value) => `¥${value}`} width={58} />
              <Tooltip
                formatter={(value, name) => [
                  formatCny(Number(value) * 100),
                  categories.find((category) => category.id === name)?.name ?? name,
                ]}
                labelFormatter={(value) => `日期 ${value}`}
              />
              {activeCategories.map((category) => (
                <Bar
                  key={category.id}
                  dataKey={category.id}
                  stackId="category"
                  fill={category.color}
                  name={category.name}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
