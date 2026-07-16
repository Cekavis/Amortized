import { describe, expect, it } from "vitest";
import {
  averageHistoricalSeries,
  buildCumulativeSpendSeries,
  buildHistoricalSeries,
  calculateAssetAmortization,
  calculateDailyCostCents,
  categoryBreakdownForDate,
  dailyCostForDate,
  type HistoricalPoint,
} from "@/lib/amortization";
import { inclusiveDays } from "@/lib/date";

describe("amortization calculations", () => {
  it("increases cumulative spend on purchase and decreases it on sale", () => {
    const series = buildCumulativeSpendSeries(
      [
        {
          id: "a1",
          name: "手机",
          categoryId: "c1",
          priceCents: 10000,
          purchaseDate: "2026-07-01",
          startDate: "2026-07-01",
          endDate: "2026-07-03",
          soldPriceCents: 4000,
        },
        {
          id: "a2",
          name: "耳机",
          categoryId: "c1",
          priceCents: 5000,
          startDate: "2026-07-02",
        },
      ],
      { from: "2026-07-02", to: "2026-07-03" },
    );

    expect(series.map((point) => point.totalCents)).toEqual([15000, 11000]);
  });

  it("counts inclusive days", () => {
    expect(inclusiveDays("2026-07-01", "2026-07-01")).toBe(1);
    expect(inclusiveDays("2026-07-01", "2026-07-03")).toBe(3);
  });

  it("handles same-day usage", () => {
    const result = calculateAssetAmortization({
      id: "a1",
      name: "相机",
      categoryId: "c1",
      priceCents: 120000,
      startDate: "2026-07-01",
      endDate: "2026-07-01",
    });

    expect(result.activeDays).toBe(1);
    expect(result.dailyCostCents).toBe(120000);
  });

  it("uses today's Asia/Shanghai date for active assets", () => {
    const result = calculateAssetAmortization(
      {
        id: "a1",
        name: "耳机",
        categoryId: "c1",
        priceCents: 30000,
        startDate: "2026-07-01",
        endDate: null,
      },
      "2026-07-10",
    );

    expect(result.activeEndDate).toBe("2026-07-10");
    expect(result.activeDays).toBe(10);
    expect(result.dailyCostCents).toBe(3000);
  });

  it("treats omitted sold price as zero", () => {
    const result = calculateAssetAmortization({
      id: "a1",
      name: "键盘",
      categoryId: "c1",
      priceCents: 10000,
      soldPriceCents: null,
      startDate: "2026-07-01",
      endDate: "2026-07-10",
    });

    expect(result.netCostCents).toBe(10000);
  });

  it("supports sold price equal to purchase price", () => {
    const result = calculateAssetAmortization({
      id: "a1",
      name: "镜头",
      categoryId: "c1",
      priceCents: 80000,
      soldPriceCents: 80000,
      startDate: "2026-07-01",
      endDate: "2026-07-08",
    });

    expect(result.dailyCostCents).toBe(0);
  });

  it("supports sold price greater than purchase price and negative daily cost", () => {
    const result = calculateAssetAmortization({
      id: "a1",
      name: "限量物品",
      categoryId: "c1",
      priceCents: 50000,
      soldPriceCents: 65000,
      startDate: "2026-07-01",
      endDate: "2026-07-05",
    });

    expect(result.netCostCents).toBe(-15000);
    expect(result.dailyCostCents).toBe(-3000);
  });

  it("supports zero price", () => {
    const result = calculateAssetAmortization({
      id: "a1",
      name: "赠品",
      categoryId: "c1",
      priceCents: 0,
      startDate: "2026-07-01",
      endDate: "2026-07-03",
    });

    expect(result.dailyCostCents).toBe(0);
  });

  it("backfills current-known net cost across historical days", () => {
    const series = buildHistoricalSeries(
      [
        {
          id: "a1",
          name: "手机",
          categoryId: "c1",
          priceCents: 10000,
          soldPriceCents: 4000,
          startDate: "2026-07-01",
          endDate: "2026-07-03",
        },
      ],
      { from: "2026-07-01", to: "2026-07-03", today: "2026-07-10" },
    );

    expect(series.map((point) => point.totalCents)).toEqual([2000, 2000, 2000]);
  });

  it("distributes net cost with logarithmic decay", () => {
    const amortization = calculateAssetAmortization(
      {
        id: "a1",
        name: "电脑",
        categoryId: "c1",
        priceCents: 60000,
        startDate: "2026-07-01",
        endDate: "2026-07-03",
      },
      "2026-07-10",
      "logarithmic",
    );
    const costs = ["2026-07-01", "2026-07-02", "2026-07-03"].map((date) =>
      dailyCostForDate(amortization, date),
    );

    expect(costs[0]).toBeCloseTo(27956.166430490204, 8);
    expect(costs[1]).toBeCloseTo(18722.570475109133, 8);
    expect(costs[2]).toBeCloseTo(13321.263094400665, 8);
    expect(costs[0]).toBeGreaterThan(costs[1]);
    expect(costs[1]).toBeGreaterThan(costs[2]);
    expect(costs.reduce((sum, cost) => sum + cost, 0)).toBeCloseTo(60000, 8);
  });

  it("does not renormalize logarithmic costs to the chart window", () => {
    const series = buildHistoricalSeries(
      [
        {
          id: "a1",
          name: "电脑",
          categoryId: "c1",
          priceCents: 60000,
          startDate: "2026-07-01",
          endDate: "2026-07-03",
        },
      ],
      {
        from: "2026-07-02",
        to: "2026-07-03",
        today: "2026-07-10",
        model: "logarithmic",
      },
    );

    expect(series[0].totalCents).toBeCloseTo(18722.570475109133, 8);
    expect(series[1].totalCents).toBeCloseTo(13321.263094400665, 8);
  });

  it("recalculates active history as today advances", () => {
    const asset = {
      id: "a1",
      name: "手机",
      categoryId: "c1",
      priceCents: 60000,
      startDate: "2026-07-01",
      endDate: null,
    };
    const first = buildHistoricalSeries([asset], {
      from: "2026-07-01",
      to: "2026-07-03",
      today: "2026-07-03",
      model: "logarithmic",
    });
    const next = buildHistoricalSeries([asset], {
      from: "2026-07-01",
      to: "2026-07-04",
      today: "2026-07-04",
      model: "logarithmic",
    });

    expect(next[0].totalCents).not.toBeCloseTo(first[0].totalCents, 8);
    expect(first.reduce((sum, point) => sum + point.totalCents, 0)).toBeCloseTo(
      60000,
      8,
    );
    expect(next.reduce((sum, point) => sum + point.totalCents, 0)).toBeCloseTo(
      60000,
      8,
    );
  });

  it("keeps ended logarithmic history stable as today advances", () => {
    const asset = {
      id: "a1",
      name: "手机",
      categoryId: "c1",
      priceCents: 60000,
      startDate: "2026-07-01",
      endDate: "2026-07-03",
    };
    const build = (today: string) =>
      buildHistoricalSeries([asset], {
        from: "2026-07-01",
        to: "2026-07-03",
        today,
        model: "logarithmic",
      }).map((point) => point.totalCents);

    expect(build("2026-07-10")).toEqual(build("2026-07-20"));
  });

  it("averages historical values by calendar week or month", () => {
    const series: HistoricalPoint[] = [
      { date: "2026-01-31", totalCents: 100, categories: { c1: 100 } },
      {
        date: "2026-02-01",
        totalCents: 300,
        categories: { c1: 100, c2: 200 },
      },
      { date: "2026-02-02", totalCents: 500, categories: { c2: 500 } },
    ];

    expect(averageHistoricalSeries(series, "week")).toEqual([
      {
        date: "2026-01-26",
        totalCents: 200,
        categories: { c1: 100, c2: 100 },
      },
      { date: "2026-02-02", totalCents: 500, categories: { c2: 500 } },
    ]);
    expect(averageHistoricalSeries(series, "month")).toEqual([
      { date: "2026-01-01", totalCents: 100, categories: { c1: 100 } },
      {
        date: "2026-02-01",
        totalCents: 400,
        categories: { c1: 50, c2: 350 },
      },
    ]);
  });

  it("handles logarithmic edge cases and out-of-range dates", () => {
    const sameDay = {
      id: "a1",
      name: "相机",
      categoryId: "c1",
      priceCents: 120000,
      startDate: "2026-07-01",
      endDate: "2026-07-01",
    };
    const negative = {
      ...sameDay,
      priceCents: 50000,
      soldPriceCents: 65000,
      endDate: "2026-07-03",
    };

    expect(
      calculateDailyCostCents(
        sameDay,
        "2026-07-01",
        "2026-07-10",
        "logarithmic",
      ),
    ).toBe(120000);
    expect(
      calculateDailyCostCents(
        { ...sameDay, priceCents: 0 },
        "2026-07-01",
        "2026-07-10",
        "logarithmic",
      ),
    ).toBe(0);
    expect(
      calculateDailyCostCents(
        negative,
        "2026-07-01",
        "2026-07-10",
        "logarithmic",
      ),
    ).toBeLessThan(0);
    expect(
      calculateDailyCostCents(
        sameDay,
        "2026-06-30",
        "2026-07-10",
        "logarithmic",
      ),
    ).toBe(0);
    expect(
      calculateDailyCostCents(
        { ...sameDay, startDate: "2026-07-20", endDate: null },
        "2026-07-10",
        "2026-07-10",
        "logarithmic",
      ),
    ).toBe(0);
  });

  it("aggregates categories for a date", () => {
    const breakdown = categoryBreakdownForDate(
      [
        {
          id: "a1",
          name: "手机",
          categoryId: "c1",
          priceCents: 9000,
          startDate: "2026-07-01",
          endDate: "2026-07-03",
        },
        {
          id: "a2",
          name: "椅子",
          categoryId: "c2",
          priceCents: 6000,
          startDate: "2026-07-02",
          endDate: "2026-07-03",
        },
      ],
      "2026-07-02",
      "2026-07-03",
    );

    expect(breakdown.get("c1")).toBe(3000);
    expect(breakdown.get("c2")).toBe(3000);
  });
});
