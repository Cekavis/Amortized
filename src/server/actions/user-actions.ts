"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createUserSchema,
  firstValidationError,
  formDataToObject,
  updateUserRoleSchema,
} from "@/lib/validation";
import { pathWithMessage } from "@/server/actions/redirect";
import { requireAdminUser } from "@/server/current-user";
import { createUser, deleteUser, updateUserRole } from "@/server/services/users";

const USERS_PATH = "/admin/users";

export async function createUserAction(formData: FormData) {
  await requireAdminUser();
  const parsed = createUserSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(pathWithMessage(USERS_PATH, "error", firstValidationError(parsed.error)));
  }

  try {
    await createUser(parsed.data);
  } catch (error) {
    redirect(
      pathWithMessage(
        USERS_PATH,
        "error",
        error instanceof Error ? error.message : "创建用户失败",
      ),
    );
  }

  revalidatePath(USERS_PATH);
  redirect(pathWithMessage(USERS_PATH, "success", "用户已创建"));
}

export async function updateUserRoleAction(formData: FormData) {
  const actor = await requireAdminUser();
  const parsed = updateUserRoleSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(pathWithMessage(USERS_PATH, "error", firstValidationError(parsed.error)));
  }

  try {
    await updateUserRole({ actorId: actor.id, ...parsed.data });
  } catch (error) {
    redirect(
      pathWithMessage(
        USERS_PATH,
        "error",
        error instanceof Error ? error.message : "更新角色失败",
      ),
    );
  }

  revalidatePath(USERS_PATH);
  redirect(pathWithMessage(USERS_PATH, "success", "角色已更新"));
}

export async function deleteUserAction(formData: FormData) {
  const actor = await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    redirect(pathWithMessage(USERS_PATH, "error", "缺少用户 ID"));
  }

  try {
    await deleteUser({ actorId: actor.id, userId });
  } catch (error) {
    redirect(
      pathWithMessage(
        USERS_PATH,
        "error",
        error instanceof Error ? error.message : "删除用户失败",
      ),
    );
  }

  revalidatePath(USERS_PATH);
  redirect(pathWithMessage(USERS_PATH, "success", "用户及其数据已删除"));
}
