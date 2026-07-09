"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function UserMenu({
  name,
  username,
}: {
  name: string;
  username: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">@{username}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title="退出登录"
        aria-label="退出登录"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
