"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  message,
  label = "删除",
  disabled,
}: {
  message: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      disabled={disabled}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
