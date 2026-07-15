import { DataTransfer } from "@/components/data-transfer";
import { requireCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const user = await requireCurrentUser();

  return (
    <div className="page-shell">
      <div>
        <h1 className="text-2xl font-semibold">数据管理</h1>
        <p className="text-sm text-muted-foreground">
          导出可迁移的 JSON 备份，或在校验预览后覆盖恢复数据。
        </p>
      </div>
      <DataTransfer isAdmin={user.role === "admin"} />
    </div>
  );
}
