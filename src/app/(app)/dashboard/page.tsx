import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Boxes, CircleDollarSign } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCny } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireCurrentUser } from "@/server/current-user";
import {
  getDashboardData,
  type DashboardRange,
} from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireCurrentUser();
  const range = parseRange(searchParams.range);
  const data = await getDashboardData(user.id, range);
  const diff = data.todayTotalCents - data.yesterdayTotalCents;

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">仪表盘</h1>
          <p className="text-sm text-muted-foreground">
            今天是 {data.today}，所有统计只包含你的资产。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["30", "30 天"],
            ["90", "90 天"],
            ["365", "1 年"],
            ["all", "全部"],
          ].map(([value, label]) => (
            <Button
              key={value}
              asChild
              variant={range === value ? "default" : "outline"}
              size="sm"
            >
              <Link href={`/dashboard?range=${value}`}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>今日每日摊销</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              {formatCny(data.todayTotalCents)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "inline-flex items-center gap-1 text-sm",
                diff >= 0 ? "text-destructive" : "text-primary",
              )}
            >
              {diff >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              较昨日 {formatCny(Math.abs(diff))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>资产数量</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Boxes className="h-5 w-5 text-primary" />
              {data.assetCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/assets">管理资产</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>今日分类</CardDescription>
            <CardTitle className="text-2xl">{data.categoryBreakdown.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/categories">管理分类</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {data.assetCount === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>还没有资产</CardTitle>
            <CardDescription>
              先创建分类，再添加资产，仪表盘会立刻开始显示每日摊销。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/categories">创建分类</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/assets">添加资产</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <DashboardCharts data={data.chartData} categories={data.categories} />

          <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>今日分类分布</CardTitle>
                <CardDescription>负值代表转售价格高于购买价后的摊销收益。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {data.categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">今天没有活跃资产。</p>
                ) : (
                  data.categoryBreakdown.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCny(item.cents)}</p>
                        <p className="text-xs text-muted-foreground">
                          {(item.share * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>当前活跃资产</CardTitle>
                <CardDescription>按今日每日摊销绝对值排序。</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {data.assetCosts.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{asset.name}</p>
                      <Badge variant="outline" className="mt-1">
                        <span
                          className="mr-1.5 h-2 w-2 rounded-full"
                          style={{ backgroundColor: asset.categoryColor }}
                        />
                        {asset.categoryName}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold">{formatCny(asset.dailyCostCents)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function parseRange(value: string | string[] | undefined): DashboardRange {
  const range = Array.isArray(value) ? value[0] : value;
  return range === "90" || range === "365" || range === "all" ? range : "30";
}
