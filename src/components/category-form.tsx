"use client";

import type { Category } from "@prisma/client";
import { Save } from "lucide-react";
import React, { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  ["#0f766e", "松石"],
  ["#2563eb", "海蓝"],
  ["#7c3aed", "靛紫"],
  ["#0891b2", "天青"],
  ["#65a30d", "草绿"],
  ["#f59e0b", "琥珀"],
  ["#e11d48", "玫红"],
  ["#475569", "石板"],
] as const;

function CategoryColorPicker({
  id,
  defaultValue,
}: {
  id: string;
  defaultValue: string;
}) {
  const [color, setColor] = useState(defaultValue);

  return (
    <div className="field-grid">
      <Label id={`${id}-label`}>颜色</Label>
      <input type="hidden" name="color" value={color} />
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="flex flex-wrap gap-2"
      >
        {PRESET_COLORS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            aria-pressed={color.toLowerCase() === value}
            title={label}
            onClick={() => setColor(value)}
            className={cn(
              "h-8 w-8 rounded-full border-2 border-background shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              color.toLowerCase() === value &&
                "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
            style={{ backgroundColor: value }}
          />
        ))}
      </div>
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          自定义颜色 · {color.toUpperCase()}
        </summary>
        <div className="mt-2">
          <Input
            id={id}
            type="color"
            aria-label="自定义颜色"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-9 w-14 cursor-pointer p-1"
          />
        </div>
      </details>
    </div>
  );
}

export function CategoryForm({
  action,
  category,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  category?: Pick<Category, "id" | "name" | "color" | "sortOrder">;
  submitLabel: string;
}) {
  const id = category?.id ?? "new";

  return (
    <form
      action={action}
      className={cn(
        "grid gap-4",
        !category &&
          "lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)_100px_auto] lg:items-end",
      )}
    >
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="field-grid">
        <Label htmlFor={`${id}-name`}>名称</Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={category?.name}
          required
        />
      </div>
      <CategoryColorPicker
        id={`${id}-color`}
        defaultValue={category?.color ?? PRESET_COLORS[0][0]}
      />
      <div className="field-grid">
        <Label htmlFor={`${id}-sortOrder`}>排序</Label>
        <Input
          id={`${id}-sortOrder`}
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
