import type { Category } from "@prisma/client";
import { Save } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CategoryForm({
  action,
  category,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  category?: Pick<Category, "id" | "name" | "color" | "sortOrder">;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_120px_120px_auto] sm:items-end">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="field-grid">
        <Label htmlFor={`${category?.id ?? "new"}-name`}>名称</Label>
        <Input
          id={`${category?.id ?? "new"}-name`}
          name="name"
          defaultValue={category?.name}
          required
        />
      </div>
      <div className="field-grid">
        <Label htmlFor={`${category?.id ?? "new"}-color`}>颜色</Label>
        <Input
          id={`${category?.id ?? "new"}-color`}
          name="color"
          type="color"
          defaultValue={category?.color ?? "#0f766e"}
          required
          className="p-1"
        />
      </div>
      <div className="field-grid">
        <Label htmlFor={`${category?.id ?? "new"}-sortOrder`}>排序</Label>
        <Input
          id={`${category?.id ?? "new"}-sortOrder`}
          name="sortOrder"
          type="number"
          defaultValue={category?.sortOrder ?? 0}
        />
      </div>
      <SubmitButton>
        <Save className="h-4 w-4" />
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export function InlineDetails({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border bg-background p-3">
      <summary className="cursor-pointer text-sm font-medium">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
