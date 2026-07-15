import { beforeEach, describe, expect, it, vi } from "vitest";

const { userDelete } = vi.hoisted(() => ({ userDelete: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { delete: userDelete } },
}));

import { deleteUser } from "@/server/services/users";

describe("deleteUser", () => {
  beforeEach(() => userDelete.mockReset());

  it("blocks deleting the acting admin and deletes another user", async () => {
    await expect(
      deleteUser({ actorId: "admin", userId: "admin" }),
    ).rejects.toThrow("不能删除自己的账号");
    expect(userDelete).not.toHaveBeenCalled();

    userDelete.mockResolvedValue({ id: "user" });
    await deleteUser({ actorId: "admin", userId: "user" });
    expect(userDelete).toHaveBeenCalledWith({ where: { id: "user" } });
  });
});
