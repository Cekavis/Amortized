import type { Asset, Category } from "@prisma/client";
import { Save } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToInput } from "@/lib/money";
import { toDateKey } from "@/lib/date";

type AssetWithCategory = Asset & { category?: Category };

export function AssetForm({
  action,
  asset,
  categories,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  asset?: AssetWithCategory;
  categories: Pick<Category, "id" | "name">[];
  submitLabel: string;
}) {
  const status = asset?.endDate ? "ended" : "active";

  return (
    <form action={action} className="grid gap-4">
      {asset ? <input type="hidden" name="id" value={asset.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-name`}>资产名称</Label>
          <Input
            id={`${asset?.id ?? "new"}-name`}
            name="name"
            defaultValue={asset?.name}
            required
          />
        </div>
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-category`}>分类</Label>
          <select
            id={`${asset?.id ?? "new"}-category`}
            name="categoryId"
            defaultValue={asset?.categoryId ?? ""}
            required
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              选择分类
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-price`}>购买价格</Label>
          <Input
            id={`${asset?.id ?? "new"}-price`}
            name="priceCents"
            inputMode="decimal"
            placeholder="例如 1299.00"
            defaultValue={centsToInput(asset?.priceCents)}
            required
          />
        </div>
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-start`}>开始使用日期</Label>
          <Input
            id={`${asset?.id ?? "new"}-start`}
            name="startDate"
            type="date"
            defaultValue={asset ? toDateKey(asset.startDate) : undefined}
            required
          />
        </div>
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-status`}>状态</Label>
          <select
            id={`${asset?.id ?? "new"}-status`}
            name="status"
            defaultValue={status}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="active">仍在使用</option>
            <option value="ended">已结束/已出售</option>
          </select>
        </div>
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-end`}>结束使用日期</Label>
          <Input
            id={`${asset?.id ?? "new"}-end`}
            name="endDate"
            type="date"
            defaultValue={asset?.endDate ? toDateKey(asset.endDate) : undefined}
          />
        </div>
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-sold`}>出售价格</Label>
          <Input
            id={`${asset?.id ?? "new"}-sold`}
            name="soldPriceCents"
            inputMode="decimal"
            placeholder="可留空"
            defaultValue={centsToInput(asset?.soldPriceCents)}
          />
        </div>
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-purchase`}>购买日期</Label>
          <Input
            id={`${asset?.id ?? "new"}-purchase`}
            name="purchaseDate"
            type="date"
            defaultValue={
              asset?.purchaseDate ? toDateKey(asset.purchaseDate) : undefined
            }
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-brand`}>品牌</Label>
          <Input
            id={`${asset?.id ?? "new"}-brand`}
            name="brand"
            defaultValue={asset?.brand ?? ""}
          />
        </div>
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-model`}>型号</Label>
          <Input
            id={`${asset?.id ?? "new"}-model`}
            name="model"
            defaultValue={asset?.model ?? ""}
          />
        </div>
        <div className="field-grid">
          <Label htmlFor={`${asset?.id ?? "new"}-serial`}>序列号</Label>
          <Input
            id={`${asset?.id ?? "new"}-serial`}
            name="serialNumber"
            defaultValue={asset?.serialNumber ?? ""}
          />
        </div>
      </div>
      <div className="field-grid">
        <Label htmlFor={`${asset?.id ?? "new"}-notes`}>备注</Label>
        <textarea
          id={`${asset?.id ?? "new"}-notes`}
          name="notes"
          defaultValue={asset?.notes ?? ""}
          rows={3}
          className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <SubmitButton className="w-fit">
        <Save className="h-4 w-4" />
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
