import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { prisma } = vi.hoisted(() => ({
  prisma: { diaryComponent: { findMany: vi.fn() } },
}));
vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("@/components/settings/ComponentManager", () => ({
  ComponentManager: ({ components }: { components: unknown }) => (
    <pre data-testid="component-manager">{JSON.stringify(components)}</pre>
  ),
}));

import DiarySettingsPage from "./page";

describe("日記の構成ページ", () => {
  it("ユーザーの項目を並び順で取得し、設定を行データに変換して渡す（未設定は空）", async () => {
    const habits = [{ id: "run", name: "ランニング", difficulty: "EASY" }];
    prisma.diaryComponent.findMany.mockResolvedValue([
      { id: "a", name: "今日の目標", type: "RICH_TEXT", config: { placeholder: "目標" } },
      { id: "b", name: "Good/Bad", type: "LABELED_TEXT", config: { groups: ["Good", "Bad"] } },
      { id: "c", name: "朝", type: "FIXED_MESSAGE", config: { message: "<p>Keep</p>" } },
      { id: "d", name: "習慣", type: "HABIT", config: { habits } },
      { id: "e", name: "やること", type: "CHECKBOX_LIST", config: null },
    ]);

    render(await DiarySettingsPage());

    expect(prisma.diaryComponent.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { order: "asc" },
    });
    const empty = { placeholder: "", groups: [], message: "", habits: [] };
    expect(JSON.parse(screen.getByTestId("component-manager").textContent!)).toEqual([
      { id: "a", name: "今日の目標", type: "RICH_TEXT", ...empty, placeholder: "目標" },
      { id: "b", name: "Good/Bad", type: "LABELED_TEXT", ...empty, groups: ["Good", "Bad"] },
      { id: "c", name: "朝", type: "FIXED_MESSAGE", ...empty, message: "<p>Keep</p>" },
      { id: "d", name: "習慣", type: "HABIT", ...empty, habits },
      { id: "e", name: "やること", type: "CHECKBOX_LIST", ...empty },
    ]);
  });
});
