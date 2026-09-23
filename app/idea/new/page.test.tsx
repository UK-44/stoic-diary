import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("@/components/idea/IdeaForm", () => ({
  IdeaForm: ({ initial }: { initial?: unknown }) => (
    <div data-testid="idea-form" data-has-initial={initial !== undefined} />
  ),
}));

import NewIdeaPage from "./page";

describe("Idea 新規ページ", () => {
  it("見出し「アイデアを追加」と空のフォームを表示する", async () => {
    render(await NewIdeaPage());

    expect(screen.getByRole("heading", { level: 1, name: "アイデアを追加" })).toBeInTheDocument();
    expect(screen.getByTestId("idea-form")).toHaveAttribute("data-has-initial", "false");
  });
});
