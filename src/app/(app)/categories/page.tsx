import { FolderPlus } from "lucide-react";
import { ActionMessage } from "@/components/action-message";
import { CategoryForm, InlineDetails } from "@/components/category-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/server/actions/category-actions";
import { requireCurrentUser } from "@/server/current-user";
import { listCategories } from "@/server/services/categories";

export const dynamic = "force-dynamic";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireCurrentUser();
  const categories = await listCategories(user.id);

  return (
    <div className="page-shell">
      <div>
        <h1 className="text-2xl font-semibold">分类</h1>
        <p className="text-sm text-muted-foreground">
          每个分类只属于当前用户，分类名在你的账号内保持唯一。
        </p>
      </div>
      <ActionMessage searchParams={searchParams} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            新建分类
          </CardTitle>
          <CardDescription>选择一个颜色，仪表盘会用它绘制分类图表。</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryForm action={createCategoryAction} submitLabel="创建" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>分类列表</CardTitle>
          <CardDescription>有资产的分类不能直接删除。</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无分类。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>资产</TableHead>
                  <TableHead className="w-[360px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{category._count.assets}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-2">
                        <InlineDetails title="编辑">
                          <CategoryForm
                            action={updateCategoryAction}
                            category={category}
                            submitLabel="保存"
                          />
                        </InlineDetails>
                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="id" value={category.id} />
                          <ConfirmSubmitButton
                            disabled={category._count.assets > 0}
                            message={`确认删除分类「${category.name}」？`}
                          />
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
