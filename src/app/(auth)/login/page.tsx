import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ActionMessage } from "@/components/action-message";
import { LoginForm } from "@/components/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/server/auth";
import { hasAnyUsers } from "@/server/services/users";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [session, hasUsers] = await Promise.all([
    getServerSession(authOptions),
    hasAnyUsers(),
  ]);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  if (!hasUsers) {
    redirect("/setup");
  }

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>登录 Amortized</CardTitle>
          <CardDescription>使用管理员创建的账号继续管理你的资产摊销。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ActionMessage searchParams={searchParams} />
          <LoginForm />
          <p className="text-center text-xs text-muted-foreground">
            公开注册已关闭。需要新账号时请联系管理员。
          </p>
          <Link className="text-center text-sm text-primary hover:underline" href="/setup">
            查看初始化状态
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
