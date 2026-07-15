import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/submit-button", async () => {
  const React = await import("react");
  return {
    SubmitButton: ({ children }: { children: ReactNode }) =>
      React.createElement("button", null, children),
  };
});

import { CategoryForm } from "@/components/category-form";

describe("CategoryForm", () => {
  it("keeps table-row edit forms stacked", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryForm, {
        action: "/categories" as unknown as (formData: FormData) => void,
        category: {
          id: "category-1",
          name: "数码",
          color: "#0f766e",
          sortOrder: 0,
        },
        submitLabel: "保存",
      }),
    );

    expect(html).not.toContain("lg:grid-cols");
  });
});
