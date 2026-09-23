import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    diaryComponent: { findMany: vi.fn() },
    diaryEntry: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));

import SearchPage from "./page";

const entry = (key: string, ...values: unknown[]) => ({
  date: new Date(`${key}T00:00:00Z`),
  values: values.map((value) => ({ value })),
});

async function renderSearch(params: { q?: string; c?: string } = {}) {
  render(await SearchPage({ searchParams: Promise.resolve(params) }));
}

const resultKeys = () =>
  screen.queryAllByRole("link").map((a) => a.getAttribute("href"));

beforeEach(() => {
  vi.clearAllMocks();
  prisma.diaryComponent.findMany.mockResolvedValue([
    { id: "c1", name: "今日の目標" },
    { id: "c2", name: "メモ" },
  ]);
  prisma.diaryEntry.findMany.mockResolvedValue([
    entry("2026-09-24", "<p>Morning Run 10km</p>"),
    entry("2026-09-20", '<p><a href="https://run.example">リンク</a></p>'),
    entry("2026-09-18", [{ text: "ランニングシューズを買う", checked: false }]),
  ]);
});

describe("Search ページ", () => {
  it("条件が無ければ案内を表示し、日記を検索しない", async () => {
    await renderSearch();

    expect(screen.getByText("キーワードや項目で過去の日記を検索できます。")).toBeInTheDocument();
    expect(prisma.diaryEntry.findMany).not.toHaveBeenCalled();
  });

  it("空白だけのキーワードは条件なしとみなす", async () => {
    await renderSearch({ q: "   " });

    expect(prisma.diaryEntry.findMany).not.toHaveBeenCalled();
  });

  it("項目の選択肢を並び順どおりに表示する", async () => {
    await renderSearch();

    expect(prisma.diaryComponent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, orderBy: { order: "asc" } }),
    );
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "すべての項目",
      "今日の目標",
      "メモ",
    ]);
  });

  it("ログイン中ユーザーの日記を新しい順に取得する", async () => {
    await renderSearch({ q: "run" });

    expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, orderBy: { date: "desc" } }),
    );
  });

  it("キーワードは大文字小文字・前後の空白を無視して本文を部分一致で探す", async () => {
    await renderSearch({ q: "  MORNING run " });

    expect(resultKeys()).toEqual(["/?d=2026-09-24"]);
  });

  it("HTML タグの中身（リンク先 URL など）にはヒットしない", async () => {
    await renderSearch({ q: "example" });

    expect(resultKeys()).toEqual([]);
    expect(screen.getByText("該当する日記はありません。")).toBeInTheDocument();
  });

  it("チェックリストの項目テキストも検索対象にする", async () => {
    await renderSearch({ q: "シューズ" });

    expect(resultKeys()).toEqual(["/?d=2026-09-18"]);
  });

  it("ヒットした日記を日付とプレビューつきで表示する", async () => {
    await renderSearch({ q: "run" });

    const link = screen.getByRole("link", { name: /2026-09-24/ });
    expect(link).toHaveAttribute("href", "/?d=2026-09-24");
    expect(link).toHaveTextContent("Morning Run 10km");
  });

  it("項目を指定すると、その項目の値があるエントリに絞って取得する", async () => {
    await renderSearch({ c: "c2" });

    expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", values: { some: { componentId: "c2" } } },
      }),
    );
    expect(resultKeys()).toHaveLength(3);
  });

  it("入力した条件をフォームに残す", async () => {
    await renderSearch({ q: "run", c: "c2" });

    expect(screen.getByPlaceholderText("キーワード")).toHaveValue("run");
    expect(screen.getByRole("combobox")).toHaveValue("c2");
  });
});
