import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { parseDateKey, toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

const idSchema = z.string().min(1);
const textSchema = z.string().min(1);
const timestampSchema = z.string().datetime();
const moneySchema = z.number().int().min(0).max(2_147_483_647);
const amortizationModelSchema = z.enum(["average", "logarithmic"]);
const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => toDateKey(parseDateKey(value)) === value, "日期无效");

const userFields = {
  id: idSchema,
  username: textSchema,
  passwordHash: textSchema,
  name: textSchema,
  role: z.enum(["admin", "user"]),
  isDisabled: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
};

const legacyUserSchema = z.object(userFields).strict();
const userSchema = z
  .object({ ...userFields, amortizationModel: amortizationModelSchema })
  .strict();

const categoryFields = {
  id: idSchema,
  name: textSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sortOrder: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
};

const personalCategorySchema = z.object(categoryFields).strict();
const systemCategorySchema = z
  .object({ ...categoryFields, userId: idSchema })
  .strict();

const assetFields = {
  id: idSchema,
  categoryId: idSchema,
  name: textSchema,
  priceCents: moneySchema,
  startDate: dateKeySchema,
  endDate: dateKeySchema.nullable(),
  isActive: z.boolean(),
  soldPriceCents: moneySchema.nullable(),
  notes: z.string().nullable(),
  purchaseDate: dateKeySchema.nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  serialNumber: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
};

const personalAssetSchema = z.object(assetFields).strict();
const systemAssetSchema = z.object({ ...assetFields, userId: idSchema }).strict();

const backupHeaderFields = {
  format: z.literal("amortized-data"),
  exportedAt: timestampSchema,
};

const personalUserFields = { username: textSchema, name: textSchema };
const legacyPersonalUserSchema = z.object(personalUserFields).strict();
const personalUserSchema = z
  .object({
    ...personalUserFields,
    amortizationModel: amortizationModelSchema,
  })
  .strict();

const personalBackupSchema = z
  .object({
    ...backupHeaderFields,
    version: z.literal(2),
    scope: z.literal("user"),
    data: z
      .object({
        user: personalUserSchema,
        categories: z.array(personalCategorySchema),
        assets: z.array(personalAssetSchema),
      })
      .strict(),
  })
  .strict();

const systemBackupSchema = z
  .object({
    ...backupHeaderFields,
    version: z.literal(2),
    scope: z.literal("system"),
    data: z
      .object({
        users: z.array(userSchema).min(1),
        categories: z.array(systemCategorySchema),
        assets: z.array(systemAssetSchema),
      })
      .strict(),
  })
  .strict();

const backupSchema = z.discriminatedUnion("scope", [
  personalBackupSchema,
  systemBackupSchema,
]);

const legacyPersonalBackupSchema = z
  .object({
    ...backupHeaderFields,
    version: z.literal(1),
    scope: z.literal("user"),
    data: z
      .object({
        user: legacyPersonalUserSchema,
        categories: z.array(personalCategorySchema),
        assets: z.array(personalAssetSchema),
      })
      .strict(),
  })
  .strict();

const legacySystemBackupSchema = z
  .object({
    ...backupHeaderFields,
    version: z.literal(1),
    scope: z.literal("system"),
    data: z
      .object({
        users: z.array(legacyUserSchema).min(1),
        categories: z.array(systemCategorySchema),
        assets: z.array(systemAssetSchema),
      })
      .strict(),
  })
  .strict();

const legacyBackupSchema = z.discriminatedUnion("scope", [
  legacyPersonalBackupSchema,
  legacySystemBackupSchema,
]);

export type BackupScope = "user" | "system";
export type Backup = z.infer<typeof backupSchema>;
type LegacyBackup = z.infer<typeof legacyBackupSchema>;
type AmortizationModel = z.infer<typeof amortizationModelSchema>;
export type BackupCounts = {
  users?: number;
  categories: number;
  assets: number;
};

export class DataTransferError extends Error {}
export class DataTransferSizeError extends DataTransferError {}

export function assertBackupSize(bytes: number) {
  if (bytes > MAX_BACKUP_BYTES) {
    throw new DataTransferSizeError("备份文件超过 50 MiB，请改用 PostgreSQL 运维备份");
  }
}

function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  const path = issue?.path.length ? `${issue.path.join(".")}：` : "";
  return `${path}${issue?.message ?? "内容不完整"}`;
}

function assertUnique(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new DataTransferError(`${label}存在重复值`);
  }
}

function assertAssetDates(
  assets: Array<{ startDate: string; endDate: string | null; isActive: boolean }>,
) {
  for (const asset of assets) {
    if (asset.isActive !== (asset.endDate === null)) {
      throw new DataTransferError("资产使用状态与结束日期不一致");
    }
    if (asset.endDate && asset.endDate < asset.startDate) {
      throw new DataTransferError("资产结束日期不能早于开始日期");
    }
  }
}

function validateRelations(backup: Backup) {
  if (backup.scope === "user") {
    assertUnique(backup.data.categories.map((item) => item.id), "分类 ID");
    assertUnique(backup.data.categories.map((item) => item.name), "分类名称");
    assertUnique(backup.data.assets.map((item) => item.id), "资产 ID");
    const categoryIds = new Set(backup.data.categories.map((item) => item.id));
    if (backup.data.assets.some((asset) => !categoryIds.has(asset.categoryId))) {
      throw new DataTransferError("资产引用了不存在的分类");
    }
    assertAssetDates(backup.data.assets);
    return;
  }

  assertUnique(backup.data.users.map((item) => item.id), "用户 ID");
  assertUnique(backup.data.users.map((item) => item.username), "用户名");
  assertUnique(backup.data.categories.map((item) => item.id), "分类 ID");
  assertUnique(backup.data.assets.map((item) => item.id), "资产 ID");
  assertUnique(
    backup.data.categories.map((item) => `${item.userId}\0${item.name}`),
    "同一用户的分类名称",
  );

  if (!backup.data.users.some((user) => user.role === "admin" && !user.isDisabled)) {
    throw new DataTransferError("整站备份必须至少包含一个启用的管理员");
  }

  const userIds = new Set(backup.data.users.map((item) => item.id));
  const categories = new Map(
    backup.data.categories.map((item) => [item.id, item.userId]),
  );
  if (backup.data.categories.some((category) => !userIds.has(category.userId))) {
    throw new DataTransferError("分类引用了不存在的用户");
  }
  for (const asset of backup.data.assets) {
    if (!userIds.has(asset.userId)) {
      throw new DataTransferError("资产引用了不存在的用户");
    }
    if (categories.get(asset.categoryId) !== asset.userId) {
      throw new DataTransferError("资产引用的分类不属于同一用户");
    }
  }
  assertAssetDates(backup.data.assets);
}

function normalizeLegacyBackup(backup: LegacyBackup): Backup {
  if (backup.scope === "user") {
    return {
      ...backup,
      version: 2,
      data: {
        ...backup.data,
        user: { ...backup.data.user, amortizationModel: "average" },
      },
    };
  }

  return {
    ...backup,
    version: 2,
    data: {
      ...backup.data,
      users: backup.data.users.map((user) => ({
        ...user,
        amortizationModel: "average" as const,
      })),
    },
  };
}

export function parseBackup(raw: string, expectedScope?: BackupScope): Backup {
  assertBackupSize(Buffer.byteLength(raw));

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new DataTransferError("备份文件不是有效的 JSON");
  }

  if (
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    input.version !== 1 &&
    input.version !== 2
  ) {
    throw new DataTransferError(`不支持的备份版本：${String(input.version)}`);
  }

  const parsed =
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    input.version === 1
      ? legacyBackupSchema.safeParse(input)
      : backupSchema.safeParse(input);
  if (!parsed.success) {
    throw new DataTransferError(`备份文件格式不正确：${firstIssue(parsed.error)}`);
  }
  const backup = parsed.data.version === 1 ? normalizeLegacyBackup(parsed.data) : parsed.data;
  if (expectedScope && backup.scope !== expectedScope) {
    throw new DataTransferError(
      expectedScope === "user" ? "请选择个人数据备份" : "请选择整站数据备份",
    );
  }

  validateRelations(backup);
  return backup;
}

export function backupCounts(backup: Backup): BackupCounts {
  return {
    ...(backup.scope === "system" ? { users: backup.data.users.length } : {}),
    categories: backup.data.categories.length,
    assets: backup.data.assets.length,
  };
}

function date(value: Date | null) {
  return value ? toDateKey(value) : null;
}

function timestamp(value: Date) {
  return value.toISOString();
}

function exportedCategory(category: {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    sortOrder: category.sortOrder,
    createdAt: timestamp(category.createdAt),
    updatedAt: timestamp(category.updatedAt),
  };
}

function exportedAsset(asset: {
  id: string;
  categoryId: string;
  name: string;
  priceCents: number;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  soldPriceCents: number | null;
  notes: string | null;
  purchaseDate: Date | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: asset.id,
    categoryId: asset.categoryId,
    name: asset.name,
    priceCents: asset.priceCents,
    startDate: date(asset.startDate) as string,
    endDate: date(asset.endDate),
    isActive: asset.isActive,
    soldPriceCents: asset.soldPriceCents,
    notes: asset.notes,
    purchaseDate: date(asset.purchaseDate),
    brand: asset.brand,
    model: asset.model,
    serialNumber: asset.serialNumber,
    imageUrl: asset.imageUrl,
    createdAt: timestamp(asset.createdAt),
    updatedAt: timestamp(asset.updatedAt),
  };
}

export async function exportBackup(
  scope: BackupScope,
  actor: {
    id: string;
    username: string;
    name: string;
    amortizationModel: AmortizationModel;
  },
) {
  const exportedAt = new Date().toISOString();

  if (scope === "user") {
    const [categories, assets] = await Promise.all([
      prisma.category.findMany({
        where: { userId: actor.id },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      }),
      prisma.asset.findMany({
        where: { userId: actor.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ]);
    return personalBackupSchema.parse({
      format: "amortized-data",
      version: 2,
      scope,
      exportedAt,
      data: {
        user: {
          username: actor.username,
          name: actor.name,
          amortizationModel: actor.amortizationModel,
        },
        categories: categories.map(exportedCategory),
        assets: assets.map(exportedAsset),
      },
    });
  }

  const [users, categories, assets] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ username: "asc" }, { id: "asc" }] }),
    prisma.category.findMany({
      orderBy: [
        { userId: "asc" },
        { sortOrder: "asc" },
        { name: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.asset.findMany({
      orderBy: [{ userId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  return systemBackupSchema.parse({
    format: "amortized-data",
    version: 2,
    scope,
    exportedAt,
    data: {
      users: users.map((user) => ({
        ...user,
        createdAt: timestamp(user.createdAt),
        updatedAt: timestamp(user.updatedAt),
      })),
      categories: categories.map((category) => ({
        ...exportedCategory(category),
        userId: category.userId,
      })),
      assets: assets.map((asset) => ({
        ...exportedAsset(asset),
        userId: asset.userId,
      })),
    },
  });
}

export async function currentCounts(
  scope: BackupScope,
  userId: string,
): Promise<BackupCounts> {
  if (scope === "user") {
    const [categories, assets] = await Promise.all([
      prisma.category.count({ where: { userId } }),
      prisma.asset.count({ where: { userId } }),
    ]);
    return { categories, assets };
  }
  const [users, categories, assets] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.asset.count(),
  ]);
  return { users, categories, assets };
}

function importedCategory(category: z.infer<typeof personalCategorySchema>) {
  return {
    name: category.name,
    color: category.color,
    sortOrder: category.sortOrder,
    createdAt: new Date(category.createdAt),
    updatedAt: new Date(category.updatedAt),
  };
}

function importedAsset(asset: z.infer<typeof personalAssetSchema>) {
  return {
    name: asset.name,
    priceCents: asset.priceCents,
    startDate: parseDateKey(asset.startDate),
    endDate: asset.endDate ? parseDateKey(asset.endDate) : null,
    isActive: asset.isActive,
    soldPriceCents: asset.soldPriceCents,
    notes: asset.notes,
    purchaseDate: asset.purchaseDate ? parseDateKey(asset.purchaseDate) : null,
    brand: asset.brand,
    model: asset.model,
    serialNumber: asset.serialNumber,
    imageUrl: asset.imageUrl,
    createdAt: new Date(asset.createdAt),
    updatedAt: new Date(asset.updatedAt),
  };
}

export async function importBackup(backup: Backup, userId: string) {
  if (backup.scope === "user") {
    const categoryIds = new Map(
      backup.data.categories.map((category) => [category.id, randomUUID()]),
    );
    const categories = backup.data.categories.map((category) => ({
      id: categoryIds.get(category.id) as string,
      userId,
      ...importedCategory(category),
    }));
    const assets = backup.data.assets.map((asset) => ({
      id: randomUUID(),
      userId,
      categoryId: categoryIds.get(asset.categoryId) as string,
      ...importedAsset(asset),
    }));

    await prisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { amortizationModel: backup.data.user.amortizationModel },
        });
        await tx.asset.deleteMany({ where: { userId } });
        await tx.category.deleteMany({ where: { userId } });
        if (categories.length) await tx.category.createMany({ data: categories });
        if (assets.length) await tx.asset.createMany({ data: assets });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 },
    );
    return backupCounts(backup);
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.asset.deleteMany();
      await tx.category.deleteMany();
      await tx.user.deleteMany();
      await tx.user.createMany({
        data: backup.data.users.map((user) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        })),
      });
      if (backup.data.categories.length) {
        await tx.category.createMany({
          data: backup.data.categories.map((category) => ({
            id: category.id,
            userId: category.userId,
            ...importedCategory(category),
          })),
        });
      }
      if (backup.data.assets.length) {
        await tx.asset.createMany({
          data: backup.data.assets.map((asset) => ({
            id: asset.id,
            userId: asset.userId,
            categoryId: asset.categoryId,
            ...importedAsset(asset),
          })),
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 },
  );
  return backupCounts(backup);
}
