// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, tx, revalidatePath } = vi.hoisted(() => {
  const tx = {
    diaryEntry: { upsert: vi.fn() },
    diaryEntryValue: { upsert: vi.fn() },
  };
  return {
    tx,
    prisma: { $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)) },
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { saveDiaryEntry, type SaveDiaryInput } from "./actions";

const input = (overrides: Partial<SaveDiaryInput> = {}): SaveDiaryInput => ({
  dateKey: "2026-09-24",
  rating: 3,
  values: [
    { componentId: "c1", value: "<p>本文</p>" },
    { componentId: "c2", value: [{ text: "買い物", checked: false }] },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  tx.diaryEntry.upsert.mockResolvedValue({ id: "entry-1" });
});

describe("saveDiaryEntry", () => {
  it("日付の形式が不正ならエラーを返し、保存しない", async () => {
    const result = await saveDiaryEntry(input({ dateKey: "2026/09/24" }));

    expect(result).toEqual({ ok: false, error: "日付の形式が不正です" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([0, 5])("総合評価 %s はエラーを返し、保存しない", async (rating) => {
    const result = await saveDiaryEntry(input({ rating }));

    expect(result).toEqual({ ok: false, error: "総合評価は 1〜4 で指定してください" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([1, 4, null])("総合評価 %s は保存できる", async (rating) => {
    const result = await saveDiaryEntry(input({ rating }));

    expect(result).toEqual({ ok: true });
  });

  it("ログイン中ユーザーのその日のエントリを upsert する", async () => {
    await saveDiaryEntry(input());

    const date = new Date("2026-09-24T00:00:00.000Z");
    expect(tx.diaryEntry.upsert).toHaveBeenCalledWith({
      where: { userId_date: { userId: "user-1", date } },
      update: { rating: 3 },
      create: { userId: "user-1", date, rating: 3 },
    });
  });

  it("各項目の値をエントリに紐づけて upsert する", async () => {
    await saveDiaryEntry(input());

    expect(tx.diaryEntryValue.upsert).toHaveBeenCalledTimes(2);
    expect(tx.diaryEntryValue.upsert).toHaveBeenCalledWith({
      where: { entryId_componentId: { entryId: "entry-1", componentId: "c2" } },
      update: { value: [{ text: "買い物", checked: false }] },
      create: { entryId: "entry-1", componentId: "c2", value: [{ text: "買い物", checked: false }] },
    });
  });

  it("保存後に Home を再検証する", async () => {
    await saveDiaryEntry(input());

    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("DB エラー時は「保存に失敗しました」を返し、再検証しない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    tx.diaryEntryValue.upsert.mockRejectedValueOnce(new Error("db down"));

    const result = await saveDiaryEntry(input());

    expect(result).toEqual({ ok: false, error: "保存に失敗しました" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
