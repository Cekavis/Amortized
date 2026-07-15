import { addDays, todayInTimeZone, toDateKey } from "@/lib/date";
import {
  averageHistoricalSeries,
  buildHistoricalSeries,
  calculateDailyCostCents,
  isAssetActiveOnDate,
  type AmortizationModel,
  type HistoricalPoint,
} from "@/lib/amortization";
import { prisma } from "@/lib/prisma";

export type DashboardRange = "30" | "90" | "365" | "all";

const RANGE_DAYS: Record<Exclude<DashboardRange, "all">, number> = {
  "30": 30,
  "90": 90,
  "365": 365,
};

export async function getDashboardData(
  userId: string,
  range: DashboardRange = "30",
  model: AmortizationModel = "average",
) {
  const [categories, assets] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.asset.findMany({
      where: { userId },
      include: { category: true },
      orderBy: [{ startDate: "asc" }],
    }),
  ]);

  const today = todayInTimeZone();
  const earliestStart = assets[0]?.startDate
    ? toDateKey(assets[0].startDate)
    : today;
  const from =
    range === "all" ? earliestStart : addDays(today, -(RANGE_DAYS[range] - 1));
  const series = buildHistoricalSeries(assets, {
    from,
    to: today,
    today,
    model,
  });
  const todayPoint: HistoricalPoint =
    series.find((point) => point.date === today) ??
    { date: today, totalCents: 0, categories: {} };
  const yesterdayPoint = series.find((point) => point.date === addDays(today, -1));
  const categoryBreakdown = categories
    .map((category) => {
      const cents = todayPoint.categories[category.id] ?? 0;
      return {
        id: category.id,
        name: category.name,
        color: category.color,
        cents,
        share:
          todayPoint.totalCents === 0 ? 0 : cents / todayPoint.totalCents,
      };
    })
    .filter((item) => item.cents !== 0)
    .sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents));

  const assetCosts = assets
    .filter((asset) => isAssetActiveOnDate(asset, today, today))
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      categoryName: asset.category.name,
      categoryColor: asset.category.color,
      dailyCostCents: calculateDailyCostCents(asset, today, today, model),
    }))
    .sort((a, b) => Math.abs(b.dailyCostCents) - Math.abs(a.dailyCostCents))
    .slice(0, 8);

  let chartSeries = series;
  let chartPeriod: "day" | "week" | "month" = "day";
  if (range === "365" || range === "all") {
    chartSeries = averageHistoricalSeries(series, "week");
    chartPeriod = "week";
    if (chartSeries.length > 90) {
      chartSeries = averageHistoricalSeries(series, "month");
      chartPeriod = "month";
    }
  }

  const chartData = chartSeries.map((point) => {
    const row: Record<string, string | number> = {
      date: point.date,
      total: Number((point.totalCents / 100).toFixed(2)),
    };
    for (const category of categories) {
      row[category.id] = Number(
        ((point.categories[category.id] ?? 0) / 100).toFixed(2),
      );
    }
    return row;
  });

  return {
    categories,
    chartData,
    chartPeriod,
    chartYearsOnly: series.length > 365,
    today,
    todayTotalCents: todayPoint.totalCents,
    yesterdayTotalCents: yesterdayPoint?.totalCents ?? 0,
    categoryBreakdown,
    assetCosts,
    assetCount: assets.length,
    range,
  };
}
