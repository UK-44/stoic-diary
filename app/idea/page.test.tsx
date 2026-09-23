import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const { prisma } = vi.hoisted(() => ({
  prisma: { idea: { findMany: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));

import IdeaPage from "./page";

type IdeaRow = {
  id: string;
  title: string;
  content: string | null;
  rating: number;
  label: "FAMILY" | "WORK" | "MAN" | null;
};

const idea = (overrides: Partial<IdeaRow> = {}): IdeaRow => ({
  id: "idea-1",
  title: "見出し",
  content: null,
  rating: 0,
  label: null,
  ...overrides,
});

async function renderPage(ideas: IdeaRow[]) {
  prisma.idea.findMany.mockResolvedValue(ideas);
  render(await IdeaPage());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Idea 一覧ページ", () => {
  it("ログイン中ユーザーのアイデアを作成日の新しい順に取得する", async () => {
    await renderPage([]);

    expect(prisma.idea.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("0 件なら案内メッセージを表示する", async () => {
    await renderPage([]);

    expect(screen.getByText(/まだアイデアがありません/)).toBeInTheDocument();
  });

  it("各アイデアの見出しが詳細ページへのリンクになる", async () => {
    await renderPage([
      idea({ id: "a", title: "朝に散歩する" }),
      idea({ id: "b", title: "本を読む" }),
    ]);

    expect(screen.getByRole("link", { name: /朝に散歩する/ })).toHaveAttribute("href", "/idea/a");
    expect(screen.getByRole("link", { name: /本を読む/ })).toHaveAttribute("href", "/idea/b");
    expect(screen.queryByText(/まだアイデアがありません/)).not.toBeInTheDocument();
  });

  it("ラベルを日本語表示し、未設定なら表示しない", async () => {
    await renderPage([
      idea({ id: "a", title: "家族旅行", label: "FAMILY" }),
      idea({ id: "b", title: "ラベルなし", label: null }),
    ]);

    expect(within(screen.getByRole("link", { name: /家族旅行/ })).getByText("家族")).toBeInTheDocument();
    // 空のバッジも出さないこと（見出しの行に見出し以外の要素が無い）。
    const titleRow = screen.getByText("ラベルなし").parentElement!;
    expect(titleRow.children).toHaveLength(1);
  });

  it("メモは HTML タグを除いたプレーンテキストでプレビューする", async () => {
    await renderPage([idea({ content: "<p>10分<strong>だけ</strong></p>" })]);

    expect(screen.getByText("10分 だけ")).toBeInTheDocument();
  });

  it("追加ボタンが新規作成ページへリンクする", async () => {
    await renderPage([]);

    expect(screen.getByRole("link", { name: "アイデアを追加" })).toHaveAttribute("href", "/idea/new");
  });
});
