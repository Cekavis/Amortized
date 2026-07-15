import Link from "next/link";
import { ActionMessage } from "@/components/action-message";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFirstAdminAction } from "@/server/actions/setup-actions";
import { hasAnyUsers } from "@/server/services/users";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const locked = await hasAnyUsers();

  return (
    <div className="w-full max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{locked ? "初始化已完成" : "创建首个管理员"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ActionMessage searchParams={searchParams} />
          {locked ? (
            <Link className="text-sm font-medium text-primary hover:underline" href="/login">
              返回登录
            </Link>
          ) : (
            <form action={createFirstAdminAction} className="grid gap-4">
              <div className="field-grid">
                <Label htmlFor="name">显示名称</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="field-grid">
                <Label htmlFor="username">用户名</Label>
                <Input id="username" name="username" autoComplete="username" required />
              </div>
              <div className="field-grid">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>
              <SubmitButton>创建管理员</SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
