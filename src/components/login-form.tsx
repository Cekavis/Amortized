"use client";

import { KeyRound, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setPending(false);

    if (!result?.ok) {
      setError("用户名或密码不正确，或账号已被禁用");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
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
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <KeyRound className="h-4 w-4 animate-pulse" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {pending ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
