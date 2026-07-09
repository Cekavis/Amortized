"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  categorySchema,
  firstValidationError,
  formDataToObject,
} from "@/lib/validation";
import { pathWithMessage } from "@/server/actions/redirect";
import { requireCurrentUser } from "@/server/current-user";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/server/services/categories";

const CATEGORIES_PATH = "/categories";

export async function createCategoryAction(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = categorySchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(
      pathWithMessage(CATEGORIES_PATH, "error", firstValidationError(parsed.error)),
    );
  }

  try {
    await createCategory(user.id, parsed.data);
  } catch (error) {
    redirect(
      pathWithMessage(
        CATEGORIES_PATH,
        "error",
        error instanceof Error ? error.message : "创建分类失败",
      ),
    );
  }

  revalidatePath(CATEGORIES_PATH);
  redirect(pathWithMessage(CATEGORIES_PATH, "success", "分类已创建"));
}

export async function updateCategoryAction(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = categorySchema
    .extend({ id: categorySchema.shape.id.unwrap() })
    .safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(
      pathWithMessage(CATEGORIES_PATH, "error", firstValidationError(parsed.error)),
    );
  }

  try {
    await updateCategory(user.id, parsed.data);
  } catch (error) {
    redirect(
      pathWithMessage(
        CATEGORIES_PATH,
        "error",
        error instanceof Error ? error.message : "更新分类失败",
      ),
    );
  }

  revalidatePath(CATEGORIES_PATH);
  redirect(pathWithMessage(CATEGORIES_PATH, "success", "分类已更新"));
}

export async function deleteCategoryAction(formData: FormData) {
  const user = await requireCurrentUser();
  const categoryId = String(formData.get("id") ?? "");

  if (!categoryId) {
    redirect(pathWithMessage(CATEGORIES_PATH, "error", "缺少分类 ID"));
  }

  try {
    await deleteCategory(user.id, categoryId);
  } catch (error) {
    redirect(
      pathWithMessage(
        CATEGORIES_PATH,
        "error",
        error instanceof Error ? error.message : "删除分类失败",
      ),
    );
  }

  revalidatePath(CATEGORIES_PATH);
  redirect(pathWithMessage(CATEGORIES_PATH, "success", "分类已删除"));
}
