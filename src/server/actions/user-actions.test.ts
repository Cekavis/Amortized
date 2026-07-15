import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  requireCurrentUser: vi.fn(),
  updateAmortizationModel: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/current-user", () => ({
  requireAdminUser: vi.fn(),
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@/server/services/users", () => ({
  createUser: vi.fn(),
  updateAmortizationModel: mocks.updateAmortizationModel,
  updateUserRole: vi.fn(),
}));

import { updateAmortizationModelAction } from "@/server/actions/user-actions";

describe("updateAmortizationModelAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: "current-user" });
  });

  it("updates only the authenticated user's model and refreshes both views", async () => {
    const formData = new FormData();
    formData.set("amortizationModel", "logarithmic");
    formData.set("range", "90");
    formData.set("userId", "other-user");

    await updateAmortizationModelAction(formData);

    expect(mocks.updateAmortizationModel).toHaveBeenCalledWith(
      "current-user",
      "logarithmic",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/assets");
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard?range=90");
  });
});
