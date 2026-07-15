import { UserPlus } from "lucide-react";
import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createUserAction,
  updateUserRoleAction,
} from "@/server/actions/user-actions";
import { requireAdminUser } from "@/server/current-user";
import { listUsers } from "@/server/services/users";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const actor = await requireAdminUser();
  const users = await listUsers();

  return (
    <div className="page-shell">
      <h1 className="text-2xl font-semibold">用户管理</h1>
      <ActionMessage searchParams={searchParams} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            创建用户
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_140px_auto] xl:items-end">
            <div className="field-grid">
              <Label htmlFor="name">显示名称</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="field-grid">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" name="username" autoComplete="username" required />
            </div>
            <div className="field-grid">
              <Label htmlFor="password">初始密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="field-grid">
              <Label htmlFor="role">角色</Label>
              <select
                id="role"
                name="role"
                defaultValue="user"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <SubmitButton>创建</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>数据概览</TableHead>
                <TableHead className="w-[260px]">设置角色</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? "管理员" : "普通用户"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user._count.categories} 个分类 / {user._count.assets} 个资产
                  </TableCell>
                  <TableCell>
                    <form action={updateUserRoleAction} className="flex gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="role"
                        defaultValue={user.role}
                        disabled={user.id === actor.id}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </select>
                      <SubmitButton
                        size="sm"
                        variant="outline"
                        disabled={user.id === actor.id}
                      >
                        保存
                      </SubmitButton>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
