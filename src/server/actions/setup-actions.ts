"use server";

import { redirect } from "next/navigation";
import { createFirstAdmin } from "@/server/services/users";
import {
  firstValidationError,
  formDataToObject,
  setupSchema,
} from "@/lib/validation";
import { pathWithMessage } from "@/server/actions/redirect";

export async function createFirstAdminAction(formData: FormData) {
  const parsed = setupSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(pathWithMessage("/setup", "error", firstValidationError(parsed.error)));
  }

  try {
    await createFirstAdmin(parsed.data);
  } catch (error) {
    redirect(
      pathWithMessage(
        "/setup",
        "error",
        error instanceof Error ? error.message : "创建管理员失败",
      ),
    );
  }

  redirect(pathWithMessage("/login", "success", "管理员创建成功，请登录"));
}
