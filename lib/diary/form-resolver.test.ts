// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    diaryComponent: { findMany: vi.fn() },
    diaryEntry: { findUnique: vi.fn() },
    diaryEntryValue: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));

import { resolveFormForDate } from "./form-resolver";

const component = (overrides: Record<string, unknown>) => ({
  id: "c1",
  key: "c1",
  name: "メモ",
  type: "RICH_TEXT",
  config: {},
  order: 10,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.diaryComponent.findMany.mockResolvedValue([]);
  prisma.diaryEntry.findUnique.mockResolvedValue(null);
  prisma.diaryEntryValue.findMany.mockResolvedValue([]);
});

describe("resolveFormForDate", () => {
  it("ユーザーの項目を並び順で取得し、その日のエントリを探す", async () => {
    await resolveFormForDate("2026-09-24", "user-1");

    expect(prisma.diaryComponent.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { order: "asc" },
    });
    expect(prisma.diaryEntry.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_date: { userId: "user-1", date: new Date("2026-09-24T00:00:00Z") } },
      }),
    );
  });

  it("既存エントリの値を項目に紐づけ、値の無い項目は null にする", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([
      component({ id: "c1", name: "今日の目標" }),
      component({ id: "c2", name: "メモ" }),
    ]);
    prisma.diaryEntry.findUnique.mockResolvedValue({
      values: [{ componentId: "c1", value: "<p>走る</p>" }],
    });

    const { components } = await resolveFormForDate("2026-09-24", "user-1");

    expect(components.map((c) => [c.name, c.value])).toEqual([
      ["今日の目標", "<p>走る</p>"],
      ["メモ", null],
    ]);
  });

  it("固定メッセージは設定の文面を message に入れる（他の種類は null）", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([
      component({ id: "m", type: "FIXED_MESSAGE", config: { message: "Keep simple." } }),
      component({ id: "m2", type: "FIXED_MESSAGE", config: {} }),
      component({ id: "r", type: "RICH_TEXT" }),
    ]);

    const { components } = await resolveFormForDate("2026-09-24", "user-1");

    expect(components.map((c) => c.message)).toEqual(["Keep simple.", "", null]);
  });

  it("習慣は選択日より前にチェックした日数を習慣ごとに数える", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([
      component({
        id: "h",
        type: "HABIT",
        config: {
          habits: [
            { id: "run", name: "ランニング", difficulty: "EASY" },
            { id: "read", name: "読書", difficulty: "HARD" },
          ],
        },
      }),
    ]);
    prisma.diaryEntryValue.findMany.mockResolvedValue([
      { componentId: "h", value: { run: true, read: true } },
      { componentId: "h", value: { run: true, read: false } },
      { componentId: "h", value: null },
    ]);

    const { components } = await resolveFormForDate("2026-09-24", "user-1");

    expect(prisma.diaryEntryValue.findMany).toHaveBeenCalledWith({
      where: {
        componentId: { in: ["h"] },
        entry: { userId: "user-1", date: { lt: new Date("2026-09-24T00:00:00Z") } },
      },
      select: { componentId: true, value: true },
    });
    expect(components[0].habit).toEqual([
      { id: "run", name: "ランニング", difficulty: "EASY", targetDays: 21, checkedBefore: 2 },
      { id: "read", name: "読書", difficulty: "HARD", targetDays: 90, checkedBefore: 1 },
    ]);
  });

  it("別の習慣項目のチェックは数えない", async () => {
    const habitConfig = { habits: [{ id: "run", name: "ランニング", difficulty: "NORMAL" }] };
    prisma.diaryComponent.findMany.mockResolvedValue([
      component({ id: "h1", type: "HABIT", config: habitConfig }),
      component({ id: "h2", type: "HABIT", config: habitConfig }),
    ]);
    prisma.diaryEntryValue.findMany.mockResolvedValue([{ componentId: "h2", value: { run: true } }]);

    const { components } = await resolveFormForDate("2026-09-24", "user-1");

    expect(components.map((c) => c.habit?.[0].checkedBefore)).toEqual([0, 1]);
  });

  it("習慣以外の項目は habit が null", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([component({ type: "RICH_TEXT" })]);

    const { components } = await resolveFormForDate("2026-09-24", "user-1");

    expect(components[0].habit).toBeNull();
  });

  it("習慣項目が無ければ過去の値を読みに行かない", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([component({ type: "RICH_TEXT" })]);

    await resolveFormForDate("2026-09-24", "user-1");

    expect(prisma.diaryEntryValue.findMany).not.toHaveBeenCalled();
  });
});
