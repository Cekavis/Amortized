import { describe, expect, it } from "vitest";
import {
  assertBackupSize,
  backupCounts,
  DataTransferError,
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

function user(id = "user-1", role: "admin" | "user" = "admin") {
  return {
    id,
    username: id,
    passwordHash: "$2b$12$example",
    name: id,
    role,
    isDisabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

function personalBackup() {
  return {
    format: "amortized-data",
    version: 1,
    scope: "user",
    exportedAt: now,
    data: {
      user: { username: "alice", name: "Alice" },
      categories: [category()],
      assets: [asset()],
    },
  };
}

function systemBackup() {
  return {
    format: "amortized-data",
    version: 1,
    scope: "system",
    exportedAt: now,
    data: {
      users: [user()],
      categories: [category("category-1", "user-1")],
      assets: [asset("asset-1", "user-1")],
    },
  };
}

function parse(input: unknown, scope: "user" | "system" = "user") {
  return parseBackup(JSON.stringify(input), scope);
}

describe("data transfer format", () => {
  it("accepts personal and system backups and reports preview counts", () => {
    expect(backupCounts(parse(personalBackup()))).toEqual({ categories: 1, assets: 1 });
    expect(backupCounts(parse(systemBackup(), "system"))).toEqual({
      users: 1,
      categories: 1,
      assets: 1,
    });
  });

  it("rejects unsupported versions", () => {
    expect(() => parse({ ...personalBackup(), version: 2 })).toThrow(
      "不支持的备份版本：2",
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

  it("rejects files larger than 50 MiB", () => {
    expect(() => assertBackupSize(MAX_BACKUP_BYTES + 1)).toThrow(DataTransferError);
  });
});
