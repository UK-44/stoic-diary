import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { prisma, notFound } = vi.hoisted(() => ({
  prisma: { idea: { findFirst: vi.fn() } },
  // 本物の notFound() と同じく、呼ばれたら描画を打ち切る。
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/components/idea/IdeaForm", () => ({
  IdeaForm: ({ initial }: { initial: unknown }) => (
    <pre data-testid="idea-form">{JSON.stringify(initial)}</pre>
  ),
}));

import IdeaDetailPage from "./page";

const params = (id: string) => Promise.resolve({ id });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Idea 詳細ページ", () => {
  it("自分のものでない（存在しない）id なら notFound にする", async () => {
    prisma.idea.findFirst.mockResolvedValue(null);

    await expect(IdeaDetailPage({ params: params("other-idea") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(prisma.idea.findFirst).toHaveBeenCalledWith({
      where: { id: "other-idea", userId: "user-1" },
    });
  });

  it("取得したアイデアを初期値としてフォームに表示する（メモ null は空文字）", async () => {
    prisma.idea.findFirst.mockResolvedValue({
      id: "idea-1",
      title: "見出し",
      content: null,
      rating: 3,
      label: "MAN",
    });

    render(await IdeaDetailPage({ params: params("idea-1") }));

    expect(JSON.parse(screen.getByTestId("idea-form").textContent!)).toEqual({
      id: "idea-1",
      title: "見出し",
      content: "",
      rating: 3,
      label: "MAN",
    });
    expect(screen.getByRole("link", { name: "← Idea" })).toHaveAttribute("href", "/idea");
  });
});
