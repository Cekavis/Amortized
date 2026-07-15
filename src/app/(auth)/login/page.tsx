import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ActionMessage } from "@/components/action-message";
import { LoginForm } from "@/components/login-form";
import {
  Card,
  CardContent,
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
        </CardHeader>
        <CardContent className="grid gap-4">
          <ActionMessage searchParams={searchParams} />
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
