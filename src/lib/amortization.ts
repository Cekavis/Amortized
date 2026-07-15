import {
  compareDateKey,
  eachDateKey,
  inclusiveDays,
  todayInTimeZone,
  toDateKey,
  type DateInput,
} from "@/lib/date";

export type AmortizationCategory = {
  id: string;
  name: string;
  color: string;
};

export type AmortizationModel = "average" | "logarithmic";

export type AmortizationAsset = {
  id: string;
  name: string;
  categoryId: string;
  category?: AmortizationCategory;
  priceCents: number;
  soldPriceCents?: number | null;
  startDate: DateInput;
  endDate?: DateInput | null;
};

export type AssetAmortization = {
  assetId: string;
  categoryId: string;
  grossCostCents: number;
  soldPriceCents: number;
  netCostCents: number;
  activeStartDate: string;
  activeEndDate: string;
  activeDays: number;
  model: AmortizationModel;
  weightSum: number;
  dailyCostCents: number;
};

export type HistoricalPoint = {
  date: string;
  totalCents: number;
  categories: Record<string, number>;
};

export function calculateAssetAmortization(
  asset: AmortizationAsset,
  today = todayInTimeZone(),
  model: AmortizationModel = "average",
): AssetAmortization {
  const activeStartDate = toDateKey(asset.startDate);
  const activeEndDate = toDateKey(asset.endDate ?? today);
  const activeDays = inclusiveDays(activeStartDate, activeEndDate);
  const soldPriceCents = asset.soldPriceCents ?? 0;
  const netCostCents = asset.priceCents - soldPriceCents;
  let weightSum = activeDays;

  if (model === "logarithmic") {
    // ponytail: O(n) per asset; add a request-local normalizer table only if long histories become measurable.
    weightSum = 0;
    for (let day = 1; day <= activeDays; day += 1) {
      weightSum += Math.log(activeDays / day) + 1;
    }
  }

  return {
    assetId: asset.id,
    categoryId: asset.categoryId,
    grossCostCents: asset.priceCents,
    soldPriceCents,
    netCostCents,
    activeStartDate,
    activeEndDate,
    activeDays,
    model,
    weightSum,
    dailyCostCents: netCostCents / weightSum,
  };
}

export function dailyCostForDate(
  amortization: AssetAmortization,
  date: DateInput,
) {
  const dateKey = toDateKey(date);
  if (
    compareDateKey(dateKey, amortization.activeStartDate) < 0 ||
    compareDateKey(dateKey, amortization.activeEndDate) > 0
  ) {
    return 0;
  }

  if (amortization.model === "average") {
    return amortization.dailyCostCents;
  }

  const day = inclusiveDays(amortization.activeStartDate, dateKey);
  const weight = Math.log(amortization.activeDays / day) + 1;
  return (amortization.netCostCents * weight) / amortization.weightSum;
}

export function calculateDailyCostCents(
  asset: AmortizationAsset,
  date: DateInput,
  today = todayInTimeZone(),
  model: AmortizationModel = "average",
) {
  return dailyCostForDate(calculateAssetAmortization(asset, today, model), date);
}

export function isAssetActiveOnDate(
  asset: AmortizationAsset,
  date: DateInput,
  today = todayInTimeZone(),
) {
  const activeStartDate = toDateKey(asset.startDate);
  const activeEndDate = toDateKey(asset.endDate ?? today);
  const dateKey = toDateKey(date);
  return (
    compareDateKey(dateKey, activeStartDate) >= 0 &&
    compareDateKey(dateKey, activeEndDate) <= 0
  );
}

export function buildHistoricalSeries(
  assets: AmortizationAsset[],
  options: {
    from: DateInput;
    to: DateInput;
    today?: string;
    model?: AmortizationModel;
  },
) {
  const today = options.today ?? todayInTimeZone();
  const from = toDateKey(options.from);
  const to = toDateKey(options.to);
  const points = new Map<string, HistoricalPoint>();

  for (const date of eachDateKey(from, to)) {
    points.set(date, { date, totalCents: 0, categories: {} });
  }

  for (const asset of assets) {
    const amortization = calculateAssetAmortization(
      asset,
      today,
      options.model,
    );
    const rangeStart =
      compareDateKey(amortization.activeStartDate, from) > 0
        ? amortization.activeStartDate
        : from;
    const rangeEnd =
      compareDateKey(amortization.activeEndDate, to) < 0
        ? amortization.activeEndDate
        : to;

    if (compareDateKey(rangeStart, rangeEnd) > 0) {
      continue;
    }

    for (const date of eachDateKey(rangeStart, rangeEnd)) {
      const point = points.get(date);
      if (!point) continue;
      const dailyCostCents = dailyCostForDate(amortization, date);
      point.totalCents += dailyCostCents;
      point.categories[asset.categoryId] =
        (point.categories[asset.categoryId] ?? 0) + dailyCostCents;
    }
  }

  return Array.from(points.values());
}

export function categoryBreakdownForDate(
  assets: AmortizationAsset[],
  date: DateInput,
  today = todayInTimeZone(),
  model: AmortizationModel = "average",
) {
  const dateKey = toDateKey(date);
  const result = new Map<string, number>();

  for (const asset of assets) {
    if (!isAssetActiveOnDate(asset, dateKey, today)) continue;
    const amortization = calculateAssetAmortization(asset, today, model);
    const dailyCostCents = dailyCostForDate(amortization, dateKey);
    result.set(asset.categoryId, (result.get(asset.categoryId) ?? 0) + dailyCostCents);
  }

  return result;
}
