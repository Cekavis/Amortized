import { Prisma, type AmortizationModel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function hasAnyUsers() {
  return (await prisma.user.count()) > 0;
}

export async function createFirstAdmin(input: {
  username: string;
  name: string;
  password: string;
}) {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    throw new Error("首个管理员已经存在，公开注册已关闭");
  }

  return prisma.user.create({
    data: {
      username: input.username,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      role: "admin",
    },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isDisabled: true,
      createdAt: true,
      _count: {
        select: {
          assets: true,
          categories: true,
        },
      },
    },
  });
}

export async function createUser(input: {
  username: string;
  name: string;
  password: string;
  role: "admin" | "user";
}) {
  try {
    return await prisma.user.create({
      data: {
        username: input.username,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        role: input.role,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("用户名已存在");
    }
    throw error;
  }
}

export async function updateUserRole(input: {
  actorId: string;
  userId: string;
  role: "admin" | "user";
}) {
  if (input.actorId === input.userId) {
    throw new Error("不能修改自己的角色");
  }

  const adminCount = await prisma.user.count({
    where: { role: "admin", isDisabled: false },
  });
  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  });

  if (!target) {
    throw new Error("用户不存在");
  }

  if (target.role === "admin" && input.role !== "admin" && adminCount <= 1) {
    throw new Error("至少需要保留一个管理员");
  }

  return prisma.user.update({
    where: { id: input.userId },
    data: { role: input.role },
  });
}

export async function updateAmortizationModel(
  userId: string,
  amortizationModel: AmortizationModel,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { amortizationModel },
  });
}
