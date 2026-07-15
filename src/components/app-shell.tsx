"use client";

import {
  BarChart3,
  Boxes,
  DatabaseBackup,
  FolderKanban,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

type ShellUser = {
  name: string;
  username: string;
  role: "admin" | "user";
};

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const navItems = [
    { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
    { href: "/assets", label: "资产", icon: Boxes },
    { href: "/categories", label: "分类", icon: FolderKanban },
    { href: "/data", label: "数据管理", icon: DatabaseBackup },
  ];

  if (user.role === "admin") {
    navItems.push({ href: "/admin/users", label: "用户", icon: Users });
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      <aside className="hidden border-r bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">Amortized</p>
        </div>
        <nav className="grid gap-1 p-3">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b bg-background/92 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">Amortized</span>
            </div>
            <nav className="hidden min-w-0 flex-1 gap-1 overflow-x-auto lg:hidden sm:flex">
              {navItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <UserMenu name={user.name} username={user.username} />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 sm:hidden">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
