import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { $transaction: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  assertBackupSize,
  backupCounts,
  DataTransferError,
  importBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
} from "@/server/services/data-transfer";

const now = "2026-07-15T00:00:00.000Z";

function category(id = "category-1", userId?: string) {
  return {
    id,
    ...(userId ? { userId } : {}),
    name: "电子设备",
    color: "#0f766e",
    sortOrder: 10,
    createdAt: now,
    updatedAt: now,
  };
}

function asset(id = "asset-1", userId?: string) {
  return {
    id,
    ...(userId ? { userId } : {}),
    categoryId: "category-1",
    name: "电脑",
    priceCents: 100_00,
    startDate: "2026-01-01",
    endDate: null,
    isActive: true,
    soldPriceCents: null,
    notes: null,
    purchaseDate: "2025-12-31",
    brand: "Test",
    model: null,
    serialNumber: null,
    imageUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

type AmortizationModel = "average" | "logarithmic";

function user(
  id = "user-1",
  role: "admin" | "user" = "admin",
  amortizationModel: AmortizationModel = "average",
) {
  return {
    id,
    username: id,
    passwordHash: "$2b$12$example",
    name: id,
    role,
    isDisabled: false,
    amortizationModel,
    createdAt: now,
    updatedAt: now,
  };
}

function personalBackup(amortizationModel: AmortizationModel = "logarithmic") {
  return {
    format: "amortized-data",
    version: 2,
    scope: "user",
    exportedAt: now,
    data: {
      user: { username: "alice", name: "Alice", amortizationModel },
      categories: [category()],
      assets: [asset()],
    },
  };
}

function systemBackup(amortizationModel: AmortizationModel = "logarithmic") {
  return {
    format: "amortized-data",
    version: 2,
    scope: "system",
    exportedAt: now,
    data: {
      users: [user("user-1", "admin", amortizationModel)],
      categories: [category("category-1", "user-1")],
      assets: [asset("asset-1", "user-1")],
    },
  };
}

function legacyPersonalBackup() {
  const backup = personalBackup();
  const { amortizationModel: _model, ...legacyUser } = backup.data.user;
  return {
    ...backup,
    version: 1,
    data: { ...backup.data, user: legacyUser },
  };
}

function legacySystemBackup() {
  const backup = systemBackup();
  return {
    ...backup,
    version: 1,
    data: {
      ...backup.data,
      users: backup.data.users.map(({ amortizationModel: _model, ...item }) => item),
    },
  };
}

function parse(input: unknown, scope: "user" | "system" = "user") {
  return parseBackup(JSON.stringify(input), scope);
}

describe("data transfer format", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockReset();
  });

  it("accepts v2 personal and system backups and preserves the model", () => {
    const personal = parse(personalBackup());
    expect(personal.scope).toBe("user");
    if (personal.scope !== "user") throw new Error("expected personal backup");
    expect(personal.data.user.amortizationModel).toBe("logarithmic");
    expect(backupCounts(personal)).toEqual({ categories: 1, assets: 1 });

    const system = parse(systemBackup(), "system");
    expect(system.scope).toBe("system");
    if (system.scope !== "system") throw new Error("expected system backup");
    expect(system.data.users[0].amortizationModel).toBe("logarithmic");
    expect(backupCounts(system)).toEqual({
      users: 1,
      categories: 1,
      assets: 1,
    });
  });

  it("normalizes missing v1 models to average", () => {
    const personal = parse(legacyPersonalBackup());
    if (personal.scope !== "user") throw new Error("expected personal backup");
    expect(personal.version).toBe(2);
    expect(personal.data.user.amortizationModel).toBe("average");

    const system = parse(legacySystemBackup(), "system");
    if (system.scope !== "system") throw new Error("expected system backup");
    expect(system.version).toBe(2);
    expect(system.data.users[0].amortizationModel).toBe("average");
  });

  it("rejects unsupported versions", () => {
    expect(() => parse({ ...personalBackup(), version: 3 })).toThrow(
      "不支持的备份版本：3",
    );
  });

  it("rejects invalid calendar dates", () => {
    const backup = personalBackup();
    backup.data.assets[0].startDate = "2026-02-30";
    expect(() => parse(backup)).toThrow("日期无效");
  });

  it("rejects duplicate identifiers", () => {
    const backup = personalBackup();
    backup.data.categories.push({ ...category(), name: "家居" });
    expect(() => parse(backup)).toThrow("分类 ID存在重复值");
  });

  it("rejects missing category relations", () => {
    const backup = personalBackup();
    backup.data.assets[0].categoryId = "missing";
    expect(() => parse(backup)).toThrow("资产引用了不存在的分类");
  });

  it("rejects cross-user category relations", () => {
    const backup = systemBackup();
    backup.data.users.push(user("user-2", "user"));
    backup.data.assets[0].userId = "user-2";
    expect(() => parse(backup, "system")).toThrow("资产引用的分类不属于同一用户");
  });

  it("rejects system backups without an enabled administrator", () => {
    const backup = systemBackup();
    backup.data.users[0].role = "user";
    expect(() => parse(backup, "system")).toThrow("至少包含一个启用的管理员");
  });

  it("updates the current user's model in a personal import transaction", async () => {
    const tx = {
      user: { update: vi.fn() },
      asset: { deleteMany: vi.fn(), createMany: vi.fn() },
      category: { deleteMany: vi.fn(), createMany: vi.fn() },
    };
    prismaMock.$transaction.mockImplementationOnce(
      async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await importBackup(parse(personalBackup("logarithmic")), "target-user");

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "target-user" },
      data: { amortizationModel: "logarithmic" },
    });
  });

  it("rejects files larger than 50 MiB", () => {
    expect(() => assertBackupSize(MAX_BACKUP_BYTES + 1)).toThrow(DataTransferError);
  });
});
