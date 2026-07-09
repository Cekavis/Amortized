import { describe, expect, it } from "vitest";
import {
  buildHistoricalSeries,
  calculateAssetAmortization,
  categoryBreakdownForDate,
} from "@/lib/amortization";
import { inclusiveDays } from "@/lib/date";

describe("amortization calculations", () => {
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
