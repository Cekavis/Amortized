"use client";

import { Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

type Scope = "user" | "system";
type Counts = { users?: number; categories: number; assets: number };
type Preview = {
  exportedAt: string;
  sourceUser?: { username: string; name: string };
  current: Counts;
  incoming: Counts;
};

function counts(counts: Counts) {
  return [
    ...(counts.users === undefined ? [] : [`${counts.users} 个用户`]),
    `${counts.categories} 个分类`,
    `${counts.assets} 个资产`,
  ].join(" / ");
}

async function apiError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `请求失败（${response.status}）`;
}

function DataTransferPanel({ scope }: { scope: Scope }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"export" | "preview" | "import" | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const system = scope === "system";

  async function download() {
    setBusy("export");
    setMessage(null);
    try {
      const response = await fetch(`/api/data-transfer?scope=${scope}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await apiError(response));
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const name = disposition.match(/filename="([^"]+)"/)?.[1] ?? `amortized-${scope}.json`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage({ type: "success", text: "备份已导出，请妥善保存" });
    } catch (caught) {
      setMessage({
        type: "error",
        text: caught instanceof Error ? caught.message : "数据导出失败",
      });
    } finally {
      setBusy(null);
    }
  }

  async function selectFile(file: File | undefined) {
    setRaw(null);
    setPreview(null);
    setMessage(null);
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setMessage({ type: "error", text: "备份文件超过 50 MiB" });
      return;
    }

    setBusy("preview");
    try {
      const content = await file.text();
      const response = await fetch(
        `/api/data-transfer?scope=${scope}&mode=preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: content,
        },
      );
      if (!response.ok) throw new Error(await apiError(response));
      const body = (await response.json()) as { preview: Preview };
      setRaw(content);
      setPreview(body.preview);
    } catch (caught) {
      setMessage({
        type: "error",
        text: caught instanceof Error ? caught.message : "无法读取备份文件",
      });
    } finally {
      setBusy(null);
    }
  }

  async function commitImport() {
    if (!raw || !preview) return;
    setBusy("import");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/data-transfer?scope=${scope}&mode=import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: raw,
        },
      );
      if (!response.ok) throw new Error(await apiError(response));
      if (system) {
        window.location.assign("/login");
        return;
      }
      setRaw(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      setMessage({ type: "success", text: "个人数据已完整导入" });
      router.refresh();
    } catch (caught) {
      setMessage({
        type: "error",
        text: caught instanceof Error ? caught.message : "数据导入失败",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className={system ? "border-destructive/40" : undefined}>
      <CardHeader>
        <CardTitle>{system ? "整站数据" : "我的数据"}</CardTitle>
        <CardDescription>
          {system
            ? "包含所有用户、密码哈希、分摊设置、分类和资产。导入会覆盖整站并退出当前登录。"
            : "包含你的分摊设置、全部分类和资产。可导入到其他账号，数据将归属当前账号。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {system ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            整站备份是高敏感明文文件。请勿通过不可信渠道传输，恢复前建议先导出当前数据。
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={download} disabled={busy !== null}>
            {busy === "export" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            导出{system ? "整站" : "个人"}备份
          </Button>
          <span className="text-xs text-muted-foreground">版本化 JSON，最大 50 MiB</span>
        </div>

        <div className="field-grid">
          <Label htmlFor={`${scope}-backup`}>选择要覆盖导入的备份</Label>
          <Input
            ref={inputRef}
            id={`${scope}-backup`}
            type="file"
            accept=".json,application/json"
            disabled={busy !== null}
            onChange={(event) => void selectFile(event.target.files?.[0])}
          />
          {busy === "preview" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 正在校验备份…
            </p>
          ) : null}
        </div>

        {preview ? (
          <div className="grid gap-3 rounded-lg border p-4 text-sm">
            <div>
              <p className="font-medium">导入预览</p>
              <p className="text-muted-foreground">
                导出时间：{new Date(preview.exportedAt).toLocaleString("zh-CN")}
                {preview.sourceUser
                  ? ` · 来源：${preview.sourceUser.name} (@${preview.sourceUser.username})`
                  : ""}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">当前数据</p>
                <p className="font-medium">{counts(preview.current)}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">导入后数据</p>
                <p className="font-medium">{counts(preview.incoming)}</p>
              </div>
            </div>
            <p className="text-destructive">
              此操作将删除当前范围内的数据并用备份内容替换，不能撤销。
            </p>
            <Button
              type="button"
              variant="destructive"
              onClick={commitImport}
              disabled={busy !== null}
            >
              {busy === "import" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {system ? "覆盖并恢复整站数据" : "覆盖并导入我的数据"}
            </Button>
          </div>
        ) : null}

        {message ? (
          <div
            className={
              message.type === "success"
                ? "rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
                : "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            }
            role={message.type === "error" ? "alert" : "status"}
          >
            {message.text}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DataTransfer({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="grid gap-6">
      <DataTransferPanel scope="user" />
      {isAdmin ? <DataTransferPanel scope="system" /> : null}
    </div>
  );
}
