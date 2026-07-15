import { DataTransfer } from "@/components/data-transfer";
import { requireCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const user = await requireCurrentUser();

  return (
    <div className="page-shell">
      <h1 className="text-2xl font-semibold">数据管理</h1>
      <DataTransfer isAdmin={user.role === "admin"} />
    </div>
  );
}
