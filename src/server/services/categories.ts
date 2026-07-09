import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { assets: true },
      },
    },
  });
}

export async function ensureCategoryBelongsToUser(
  userId: string,
  categoryId: string,
) {
  const category = await prisma.category.findUnique({
    where: {
      id_userId: {
        id: categoryId,
        userId,
      },
    },
    select: { id: true },
  });

  if (!category) {
    throw new Error("分类不存在或不属于当前用户");
  }
}

export async function createCategory(
  userId: string,
  input: { name: string; color: string; sortOrder: number },
) {
  try {
    return await prisma.category.create({
      data: {
        userId,
        name: input.name,
        color: input.color,
        sortOrder: input.sortOrder,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("同名分类已经存在");
    }
    throw error;
  }
}

export async function updateCategory(
  userId: string,
  input: { id: string; name: string; color: string; sortOrder: number },
) {
  try {
    return await prisma.category.update({
      where: {
        id_userId: {
          id: input.id,
          userId,
        },
      },
      data: {
        name: input.name,
        color: input.color,
        sortOrder: input.sortOrder,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("同名分类已经存在");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new Error("分类不存在或不属于当前用户");
    }
    throw error;
  }
}

export async function deleteCategory(userId: string, categoryId: string) {
  const assets = await prisma.asset.count({
    where: { userId, categoryId },
  });

  if (assets > 0) {
    throw new Error("该分类下仍有资产，请先移动或删除这些资产");
  }

  try {
    return await prisma.category.delete({
      where: {
        id_userId: {
          id: categoryId,
          userId,
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new Error("分类不存在或不属于当前用户");
    }
    throw error;
  }
}
