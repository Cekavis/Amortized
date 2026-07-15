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
  period,
  yearsOnly,
}: {
  data: Record<string, string | number>[];
  categories: Category[];
  period: "day" | "week" | "month";
  yearsOnly: boolean;
}) {
  const activeCategories = categories.filter((category) =>
    data.some((row) => Number(row[category.id] ?? 0) !== 0),
  );
  const periodLabel = {
    day: "每日",
    week: "每周平均",
    month: "每月平均",
  }[period];
  const tooltipLabel = (value: string | number) =>
    period === "day"
      ? `日期 ${value}`
      : period === "week"
        ? `周起始 ${value}`
        : `月份 ${String(value).slice(0, 7)}`;
  const yearTicks = yearsOnly
    ? data
        .filter(
          (row, index) =>
            index === 0 ||
            String(row.date).slice(0, 4) !==
              String(data[index - 1].date).slice(0, 4),
        )
        .map((row) => row.date)
    : undefined;
  const xAxis = {
    dataKey: "date",
    ticks: yearTicks,
    tickFormatter: (value: string | number) =>
      yearsOnly ? String(value).slice(0, 4) : String(value).slice(5),
    minTickGap: 24,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="surface p-5">
        <h2 className="mb-4 text-base font-semibold">{periodLabel}总摊销</h2>
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
              <XAxis {...xAxis} />
              <YAxis tickFormatter={(value) => `¥${value}`} width={58} />
              <Tooltip
                formatter={(value) => formatCny(Number(value) * 100)}
                labelFormatter={tooltipLabel}
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
        <h2 className="mb-4 text-base font-semibold">{periodLabel}分类堆叠</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis {...xAxis} />
              <YAxis tickFormatter={(value) => `¥${value}`} width={58} />
              <Tooltip
                formatter={(value, name) => [
                  formatCny(Number(value) * 100),
                  categories.find((category) => category.id === name)?.name ?? name,
                ]}
                labelFormatter={tooltipLabel}
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
