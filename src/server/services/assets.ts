import type { Prisma } from "@prisma/client";
import {
  calculateDailyCostCents,
  type AmortizationModel,
} from "@/lib/amortization";
import { todayInTimeZone } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { ensureCategoryBelongsToUser } from "@/server/services/categories";

export type AssetSort = "startDate" | "price" | "dailyCost" | "name";
export type AssetStatusFilter = "all" | "active" | "ended";

export type AssetInput = {
  name: string;
  categoryId: string;
  priceCents: number;
  startDate: string;
  status: "active" | "ended";
  endDate: string | null;
  soldPriceCents: number | null;
  notes: string | null;
  purchaseDate: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  imageUrl: string | null;
};

function dateKeyToDate(dateKey: string | null) {
  return dateKey ? new Date(`${dateKey}T00:00:00.000Z`) : null;
}

function assetData(userId: string, input: AssetInput) {
  return {
    userId,
    categoryId: input.categoryId,
    name: input.name,
    priceCents: input.priceCents,
    startDate: dateKeyToDate(input.startDate) as Date,
    endDate: dateKeyToDate(input.endDate),
    isActive: input.endDate == null,
    soldPriceCents: input.soldPriceCents,
    notes: input.notes,
    purchaseDate: dateKeyToDate(input.purchaseDate),
    brand: input.brand,
    model: input.model,
    serialNumber: input.serialNumber,
    imageUrl: input.imageUrl,
  };
}

export async function listAssets(
  userId: string,
  filters: {
    categoryId?: string;
    status?: AssetStatusFilter;
    sort?: AssetSort;
    model?: AmortizationModel;
  } = {},
) {
  const where: Prisma.AssetWhereInput = {
    userId,
  };

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.status === "active") {
    where.endDate = null;
  } else if (filters.status === "ended") {
    where.endDate = { not: null };
  }

  const orderBy: Prisma.AssetOrderByWithRelationInput[] =
    filters.sort === "price"
      ? [{ priceCents: "desc" }]
      : filters.sort === "name"
        ? [{ name: "asc" }]
        : [{ startDate: "desc" }, { createdAt: "desc" }];

  const assets = await prisma.asset.findMany({
    where,
    orderBy,
    include: { category: true },
  });

  if (filters.sort === "dailyCost") {
    const today = todayInTimeZone();
    return assets.sort((a, b) => {
      const costA = calculateDailyCostCents(
        a,
        a.endDate ?? today,
        today,
        filters.model,
      );
      const costB = calculateDailyCostCents(
        b,
        b.endDate ?? today,
        today,
        filters.model,
      );
      return costB - costA;
    });
  }

  return assets;
}

export async function createAsset(userId: string, input: AssetInput) {
  await ensureCategoryBelongsToUser(userId, input.categoryId);

  return prisma.asset.create({
    data: assetData(userId, input),
  });
}

export async function updateAsset(
  userId: string,
  input: AssetInput & { id: string },
) {
  await ensureCategoryBelongsToUser(userId, input.categoryId);

  try {
    return await prisma.asset.update({
      where: {
        id_userId: {
          id: input.id,
          userId,
        },
      },
      data: assetData(userId, input),
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new Error("资产不存在或不属于当前用户");
    }
    throw error;
  }
}

export async function deleteAsset(userId: string, assetId: string) {
  try {
    return await prisma.asset.delete({
      where: {
        id_userId: {
          id: assetId,
          userId,
        },
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new Error("资产不存在或不属于当前用户");
    }
    throw error;
  }
}
