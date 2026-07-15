import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { ActionMessage } from "@/components/action-message";
import { AssetForm } from "@/components/asset-form";
import { InlineDetails } from "@/components/category-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateDailyCostCents } from "@/lib/amortization";
import { todayInTimeZone, toDateKey } from "@/lib/date";
import { formatCny } from "@/lib/money";
import {
  createAssetAction,
  deleteAssetAction,
  updateAssetAction,
} from "@/server/actions/asset-actions";
import { requireCurrentUser } from "@/server/current-user";
import { listAssets, type AssetSort, type AssetStatusFilter } from "@/server/services/assets";
import { listCategories } from "@/server/services/categories";

export const dynamic = "force-dynamic";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireCurrentUser();
  const [categories, assets] = await Promise.all([
    listCategories(user.id),
    listAssets(user.id, {
      categoryId: single(searchParams.categoryId),
      status: parseStatus(searchParams.status),
      sort: parseSort(searchParams.sort),
      model: user.amortizationModel,
    }),
  ]);
  const today = todayInTimeZone();

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h1 className="text-2xl font-semibold">资产</h1>
        <Button asChild variant="outline">
          <Link href="/categories">管理分类</Link>
        </Button>
      </div>
      <ActionMessage searchParams={searchParams} />

      {categories.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>先创建分类</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/categories">创建分类</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              新建资产
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssetForm
              action={createAssetAction}
              categories={categoryOptions}
              submitLabel="创建资产"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>资产列表</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-4 md:items-end">
            <div className="field-grid">
              <label className="text-sm font-medium" htmlFor="categoryId">分类</label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={single(searchParams.categoryId) ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">全部分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-grid">
              <label className="text-sm font-medium" htmlFor="status">状态</label>
              <select
                id="status"
                name="status"
                defaultValue={single(searchParams.status) ?? "all"}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">全部</option>
                <option value="active">仍在使用</option>
                <option value="ended">已结束</option>
              </select>
            </div>
            <div className="field-grid">
              <label className="text-sm font-medium" htmlFor="sort">排序</label>
              <select
                id="sort"
                name="sort"
                defaultValue={single(searchParams.sort) ?? "startDate"}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="startDate">开始日期</option>
                <option value="price">购买价格</option>
                <option value="dailyCost">当日分摊</option>
                <option value="name">名称</option>
              </select>
            </div>
            <Button type="submit">应用筛选</Button>
          </form>

          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">没有匹配的资产。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>资产</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>购买价</TableHead>
                  <TableHead>使用期</TableHead>
                  <TableHead>出售</TableHead>
                  <TableHead>当前/结束日分摊</TableHead>
                  <TableHead className="w-[420px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const dailyCostCents = calculateDailyCostCents(
                    asset,
                    asset.endDate ?? today,
                    today,
                    user.amortizationModel,
                  );
                  return (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {asset.brand || asset.model
                              ? [asset.brand, asset.model].filter(Boolean).join(" ")
                              : "未填写品牌型号"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <span
                            className="mr-1.5 h-2 w-2 rounded-full"
                            style={{ backgroundColor: asset.category.color }}
                          />
                          {asset.category.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCny(asset.priceCents)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{toDateKey(asset.startDate)}</p>
                          <p className="text-muted-foreground">
                            {asset.endDate ? toDateKey(asset.endDate) : "仍在使用"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {asset.soldPriceCents == null
                          ? "未填写"
                          : formatCny(asset.soldPriceCents)}
                      </TableCell>
                      <TableCell>{formatCny(dailyCostCents)}</TableCell>
                      <TableCell>
                        <div className="grid gap-2">
                          <InlineDetails title="编辑">
                            <AssetForm
                              action={updateAssetAction}
                              asset={asset}
                              categories={categoryOptions}
                              submitLabel="保存资产"
                            />
                          </InlineDetails>
                          <form action={deleteAssetAction}>
                            <input type="hidden" name="id" value={asset.id} />
                            <ConfirmSubmitButton message={`确认删除资产「${asset.name}」？`} />
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function single(value: string | string[] | undefined) {
  const result = Array.isArray(value) ? value[0] : value;
  return result || undefined;
}

function parseStatus(value: string | string[] | undefined): AssetStatusFilter {
  const status = single(value);
  return status === "active" || status === "ended" ? status : "all";
}

function parseSort(value: string | string[] | undefined): AssetSort {
  const sort = single(value);
  return sort === "price" || sort === "dailyCost" || sort === "name"
    ? sort
    : "startDate";
}
