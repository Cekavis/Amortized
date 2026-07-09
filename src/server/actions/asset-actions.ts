"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assetSchema,
  firstValidationError,
  formDataToObject,
} from "@/lib/validation";
import { pathWithMessage } from "@/server/actions/redirect";
import { requireCurrentUser } from "@/server/current-user";
import {
  createAsset,
  deleteAsset,
  updateAsset,
} from "@/server/services/assets";

const ASSETS_PATH = "/assets";

export async function createAssetAction(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = assetSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(pathWithMessage(ASSETS_PATH, "error", firstValidationError(parsed.error)));
  }

  try {
    await createAsset(user.id, parsed.data);
  } catch (error) {
    redirect(
      pathWithMessage(
        ASSETS_PATH,
        "error",
        error instanceof Error ? error.message : "创建资产失败",
      ),
    );
  }

  revalidatePath(ASSETS_PATH);
  revalidatePath("/dashboard");
  redirect(pathWithMessage(ASSETS_PATH, "success", "资产已创建"));
}

export async function updateAssetAction(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = assetSchema.safeParse(formDataToObject(formData));

  if (!parsed.success || !parsed.data.id) {
    redirect(
      pathWithMessage(
        ASSETS_PATH,
        "error",
        parsed.success ? "缺少资产 ID" : firstValidationError(parsed.error),
      ),
    );
  }

  try {
    await updateAsset(user.id, { ...parsed.data, id: parsed.data.id });
  } catch (error) {
    redirect(
      pathWithMessage(
        ASSETS_PATH,
        "error",
        error instanceof Error ? error.message : "更新资产失败",
      ),
    );
  }

  revalidatePath(ASSETS_PATH);
  revalidatePath("/dashboard");
  redirect(pathWithMessage(ASSETS_PATH, "success", "资产已更新"));
}

export async function deleteAssetAction(formData: FormData) {
  const user = await requireCurrentUser();
  const assetId = String(formData.get("id") ?? "");

  if (!assetId) {
    redirect(pathWithMessage(ASSETS_PATH, "error", "缺少资产 ID"));
  }

  try {
    await deleteAsset(user.id, assetId);
  } catch (error) {
    redirect(
      pathWithMessage(
        ASSETS_PATH,
        "error",
        error instanceof Error ? error.message : "删除资产失败",
      ),
    );
  }

  revalidatePath(ASSETS_PATH);
  revalidatePath("/dashboard");
  redirect(pathWithMessage(ASSETS_PATH, "success", "资产已删除"));
}
