import { z } from "zod";
import { compareDateKey } from "@/lib/date";
import { parseCnyToCents } from "@/lib/money";

const dateKeySchema = z
  .string({ required_error: "请选择日期" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式不正确");

const requiredText = (label: string) =>
  z
    .string({ required_error: `${label}不能为空` })
    .trim()
    .min(1, `${label}不能为空`);

const requiredMoneySchema = (label: string) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const cents = parseCnyToCents(value);
      if (cents == null || cents < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}必须是有效的非负金额，最多两位小数`,
        });
      }
    })
    .transform((value) => {
      return parseCnyToCents(value) ?? 0;
    });

const optionalMoneySchema = (label: string) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!value) return;
      const cents = parseCnyToCents(value);
      if (cents == null || cents < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label}必须是有效的非负金额，最多两位小数`,
        });
      }
    })
    .transform((value) => {
      if (!value) return null;
      return parseCnyToCents(value) ?? 0;
    });

export const setupSchema = z.object({
  username: requiredText("用户名").min(3, "用户名至少需要 3 个字符"),
  name: requiredText("显示名称"),
  password: requiredText("密码").min(8, "密码至少需要 8 个字符"),
});

export const createUserSchema = setupSchema.extend({
  role: z.enum(["admin", "user"], {
    required_error: "请选择角色",
  }),
});

export const updateUserRoleSchema = z.object({
  userId: requiredText("用户"),
  role: z.enum(["admin", "user"], {
    required_error: "请选择角色",
  }),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: requiredText("分类名称"),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "请选择有效颜色"),
  sortOrder: z.coerce.number().int("排序必须是整数").default(0),
});

export const assetSchema = z
  .object({
    id: z.string().optional(),
    name: requiredText("资产名称"),
    categoryId: requiredText("分类"),
    priceCents: requiredMoneySchema("购买价格"),
    startDate: dateKeySchema,
    status: z.enum(["active", "ended"], {
      required_error: "请选择使用状态",
    }),
    endDate: z.string().trim().optional(),
    soldPriceCents: optionalMoneySchema("出售价格"),
    notes: z.string().trim().optional(),
    purchaseDate: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    model: z.string().trim().optional(),
    serialNumber: z.string().trim().optional(),
    imageUrl: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "ended" && !value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "结束使用时必须填写结束日期",
        path: ["endDate"],
      });
    }

    if (value.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(value.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "结束日期格式不正确",
        path: ["endDate"],
      });
    }

    if (
      value.endDate &&
      compareDateKey(value.endDate, value.startDate) < 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "结束日期不能早于开始日期",
        path: ["endDate"],
      });
    }

    if (
      value.purchaseDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(value.purchaseDate)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "购买日期格式不正确",
        path: ["purchaseDate"],
      });
    }
  })
  .transform((value) => ({
    ...value,
    endDate: value.status === "active" ? null : value.endDate ?? null,
    purchaseDate: value.purchaseDate || null,
    notes: value.notes || null,
    brand: value.brand || null,
    model: value.model || null,
    serialNumber: value.serialNumber || null,
    imageUrl: value.imageUrl || null,
  }));

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export function firstValidationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "表单内容不完整";
}
