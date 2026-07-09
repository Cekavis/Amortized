import { cn } from "@/lib/utils";

export function ActionMessage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const success = pick(searchParams.success);
  const error = pick(searchParams.error);
  const message = success ?? error;

  if (!message) return null;

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        success
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
      role="status"
    >
      {message}
    </div>
  );
}

function pick(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
