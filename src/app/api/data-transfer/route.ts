import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/current-user";
import {
  assertBackupSize,
  backupCounts,
  currentCounts,
  DataTransferError,
  DataTransferSizeError,
  exportBackup,
  importBackup,
  parseBackup,
  type BackupScope,
} from "@/server/services/data-transfer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function scopeFrom(request: NextRequest): BackupScope | null {
  const scope = request.nextUrl.searchParams.get("scope");
  return scope === "user" || scope === "system" ? scope : null;
}

async function authorize(scope: BackupScope) {
  const user = await getCurrentUser();
  if (!user) return { response: error("请先登录", 401) } as const;
  if (scope === "system" && user.role !== "admin") {
    return { response: error("只有管理员可以操作整站备份", 403) } as const;
  }
  return { user } as const;
}

function filename(scope: BackupScope, username: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const owner = username.replace(/[^a-zA-Z0-9_-]/g, "_");
  return scope === "system"
    ? `amortized-system-${stamp}.json`
    : `amortized-user-${owner}-${stamp}.json`;
}

export async function GET(request: NextRequest) {
  const scope = scopeFrom(request);
  if (!scope) return error("数据范围必须是 user 或 system", 400);

  const auth = await authorize(scope);
  if ("response" in auth) return auth.response;

  try {
    const backup = await exportBackup(scope, auth.user);
    const body = `${JSON.stringify(backup, null, 2)}\n`;
    assertBackupSize(Buffer.byteLength(body));
    return new NextResponse(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename(scope, auth.user.username)}"`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (caught) {
    if (caught instanceof DataTransferSizeError) return error(caught.message, 413);
    console.error("Data export failed", caught);
    return error("数据导出失败", 500);
  }
}

export async function POST(request: NextRequest) {
  const scope = scopeFrom(request);
  const mode = request.nextUrl.searchParams.get("mode");
  if (!scope) return error("数据范围必须是 user 或 system", 400);
  if (mode !== "preview" && mode !== "import") {
    return error("操作模式必须是 preview 或 import", 400);
  }

  const auth = await authorize(scope);
  if ("response" in auth) return auth.response;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  try {
    if (Number.isFinite(contentLength)) assertBackupSize(contentLength);
    const raw = await request.text();
    const backup = parseBackup(raw, scope);
    const incoming = backupCounts(backup);

    if (mode === "preview") {
      return NextResponse.json({
        ok: true,
        preview: {
          scope,
          exportedAt: backup.exportedAt,
          sourceUser: backup.scope === "user" ? backup.data.user : undefined,
          current: await currentCounts(scope, auth.user.id),
          incoming,
        },
      });
    }

    const imported = await importBackup(backup, auth.user.id);
    try {
      ["/dashboard", "/assets", "/categories", "/admin/users", "/data"].forEach(
        (path) => revalidatePath(path),
      );
    } catch (caught) {
      console.error("Data import cache invalidation failed", caught);
    }
    const response = NextResponse.json({
      ok: true,
      imported,
      requiresRelogin: scope === "system",
    });
    if (scope === "system") {
      response.cookies.set("next-auth.session-token", "", {
        expires: new Date(0),
        path: "/",
      });
      response.cookies.set("__Secure-next-auth.session-token", "", {
        expires: new Date(0),
        path: "/",
        secure: true,
      });
    }
    return response;
  } catch (caught) {
    if (caught instanceof DataTransferSizeError) return error(caught.message, 413);
    if (caught instanceof DataTransferError) return error(caught.message, 400);
    console.error("Data import failed", caught);
    return error("导入失败，数据库未发生更改", 500);
  }
}
