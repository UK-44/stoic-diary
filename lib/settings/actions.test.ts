// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, revalidatePath } = vi.hoisted(() => ({
  prisma: {
    user: { update: vi.fn() },
    diaryComponent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn((args: unknown) => ({ op: "update", args })),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (ops: unknown) => ops),
  },
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("next/cache", () => ({ revalidatePath }));

import {
  createComponent,
  deleteComponent,
  moveComponent,
  reorderComponents,
  saveLongTermGoal,
  updateComponent,
  type ComponentInput,
} from "./actions";
import type { ComponentType } from "@/lib/diary/types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveLongTermGoal", () => {
  it("長期目標は前後の空白を除いて、対象日と一緒に保存する", async () => {
    const result = await saveLongTermGoal("  フルマラソン完走 ", "2027-03-01");

    expect(result).toEqual({ ok: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        longTermGoal: "フルマラソン完走",
        longTermGoalDate: new Date("2027-03-01T00:00:00Z"),
      },
    });
  });

  it("長期目標が空白だけなら null で保存する", async () => {
    await saveLongTermGoal("  ", "2027-03-01");

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ longTermGoal: null }) }),
    );
  });

  it.each(["", "2027/03/01"])("対象日 %j は null で保存する", async (date) => {
    await saveLongTermGoal("目標", date);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ longTermGoalDate: null }) }),
    );
  });

  it("設定画面と Home を再検証する", async () => {
    await saveLongTermGoal("目標", "");

    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("createComponent", () => {
  beforeEach(() => {
    prisma.diaryComponent.findMany.mockResolvedValue([]);
    prisma.diaryComponent.aggregate.mockResolvedValue({ _max: { order: null } });
    prisma.diaryComponent.create.mockResolvedValue({});
  });

  const createdData = () => prisma.diaryComponent.create.mock.calls[0][0].data;

  it("項目名が空白だけならエラーを返し、作成しない", async () => {
    const result = await createComponent("RICH_TEXT", { name: "  " });

    expect(result).toEqual({ ok: false, error: "項目名を入力してください" });
    expect(prisma.diaryComponent.create).not.toHaveBeenCalled();
  });

  it("最初の項目は key=c1・並び順 10 で作る", async () => {
    const result = await createComponent("RICH_TEXT", { name: " メモ " });

    expect(result).toEqual({ ok: true });
    expect(createdData()).toEqual({
      userId: "user-1",
      key: "c1",
      name: "メモ",
      type: "RICH_TEXT",
      config: {},
      order: 10,
    });
  });

  it("key は既存の cN の最大番号 + 1（欠番や cN 以外の key は無視）", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([
      { key: "c2" },
      { key: "c7" },
      { key: "daily_goal" },
      { key: "c10x" },
    ]);

    await createComponent("RICH_TEXT", { name: "メモ" });

    expect(createdData().key).toBe("c8");
  });

  it("並び順は既存の最大 + 10（末尾）", async () => {
    prisma.diaryComponent.aggregate.mockResolvedValue({ _max: { order: 60 } });

    await createComponent("RICH_TEXT", { name: "メモ" });

    expect(createdData().order).toBe(70);
  });

  it.each<{ type: ComponentType; input: Partial<ComponentInput>; config: object }>([
    { type: "RICH_TEXT", input: { placeholder: "自由に" }, config: { placeholder: "自由に" } },
    { type: "CHECKBOX_LIST", input: { placeholder: "" }, config: {} },
    { type: "LABELED_TEXT", input: { groups: ["Good", " ", "Bad"] }, config: { groups: ["Good", "Bad"] } },
    { type: "FIXED_MESSAGE", input: {}, config: { message: "" } },
  ])("$type の設定は $config", async ({ type, input, config }) => {
    await createComponent(type, { name: "項目", ...input });

    expect(createdData().config).toEqual(config);
  });

  it("習慣は名前が空の行を捨て、名前を trim し、id が無ければ採番する", async () => {
    await createComponent("HABIT", {
      name: "習慣",
      habits: [
        { id: "keep", name: " 読書 ", difficulty: "HARD" },
        { id: "", name: "瞑想", difficulty: "EASY" },
        { id: "blank", name: "  ", difficulty: "NORMAL" },
      ],
    });

    const habits = createdData().config.habits;
    expect(habits).toHaveLength(2);
    expect(habits[0]).toEqual({ id: "keep", name: "読書", difficulty: "HARD" });
    expect(habits[1]).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), name: "瞑想", difficulty: "EASY" });
  });

  it("DB エラー時は「作成に失敗しました」を返す", async () => {
    prisma.diaryComponent.create.mockRejectedValue(new Error("unique"));

    const result = await createComponent("RICH_TEXT", { name: "メモ" });

    expect(result).toEqual({ ok: false, error: "作成に失敗しました" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateComponent", () => {
  it("他人の（存在しない）項目はエラーを返し、更新しない", async () => {
    prisma.diaryComponent.findFirst.mockResolvedValue(null);

    const result = await updateComponent("other", { name: "x" });

    expect(prisma.diaryComponent.findFirst).toHaveBeenCalledWith({
      where: { id: "other", userId: "user-1" },
    });
    expect(result).toEqual({ ok: false, error: "対象が見つかりません" });
    expect(prisma.diaryComponent.update).not.toHaveBeenCalled();
  });

  it("項目名が空白だけならエラーを返し、更新しない", async () => {
    prisma.diaryComponent.findFirst.mockResolvedValue({ id: "c1", type: "RICH_TEXT" });

    const result = await updateComponent("c1", { name: " " });

    expect(result).toEqual({ ok: false, error: "項目名を入力してください" });
    expect(prisma.diaryComponent.update).not.toHaveBeenCalled();
  });

  it("既存の種類に合わせて設定を作り直して更新する", async () => {
    prisma.diaryComponent.findFirst.mockResolvedValue({ id: "c1", type: "LABELED_TEXT" });

    const result = await updateComponent("c1", {
      name: " Good/Bad ",
      groups: ["Good", "Bad"],
      placeholder: "無視される",
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.diaryComponent.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { name: "Good/Bad", config: { groups: ["Good", "Bad"] } },
    });
  });
});

describe("deleteComponent", () => {
  it("他人の（存在しない）項目はエラーを返し、削除しない", async () => {
    prisma.diaryComponent.findFirst.mockResolvedValue(null);

    const result = await deleteComponent("other");

    expect(prisma.diaryComponent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "other", userId: "user-1" } }),
    );
    expect(result).toEqual({ ok: false, error: "対象が見つかりません" });
    expect(prisma.diaryComponent.delete).not.toHaveBeenCalled();
  });

  it("自分の項目を削除し、再検証する", async () => {
    prisma.diaryComponent.findFirst.mockResolvedValue({ id: "c1" });

    const result = await deleteComponent("c1");

    expect(result).toEqual({ ok: true });
    expect(prisma.diaryComponent.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });
});

describe("reorderComponents", () => {
  beforeEach(() => {
    prisma.diaryComponent.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });

  it("渡された順に 10, 20, 30 を振り直す", async () => {
    const result = await reorderComponents(["c", "a", "b"]);

    expect(result).toEqual({ ok: true });
    expect(prisma.diaryComponent.update.mock.calls.map(([args]) => args)).toEqual([
      { where: { id: "c" }, data: { order: 10 } },
      { where: { id: "a" }, data: { order: 20 } },
      { where: { id: "b" }, data: { order: 30 } },
    ]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it.each([
    { case: "不足", ids: ["a", "b"] },
    { case: "重複", ids: ["a", "a", "b"] },
    { case: "他人の id", ids: ["a", "b", "x"] },
    { case: "余分", ids: ["a", "b", "c", "x"] },
  ])("$case があればエラーを返し、更新しない", async ({ ids }) => {
    const result = await reorderComponents(ids);

    expect(result).toEqual({ ok: false, error: "並び替えに失敗しました" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("moveComponent", () => {
  beforeEach(() => {
    prisma.diaryComponent.findMany.mockResolvedValue([
      { id: "a", order: 10 },
      { id: "b", order: 20 },
      { id: "c", order: 40 },
    ]);
  });

  const updates = () => prisma.diaryComponent.update.mock.calls.map(([args]) => args);

  it("上へ: 1 つ上の項目と並び順を入れ替える", async () => {
    const result = await moveComponent("c", "up");

    expect(result).toEqual({ ok: true });
    expect(updates()).toEqual([
      { where: { id: "c" }, data: { order: 20 } },
      { where: { id: "b" }, data: { order: 40 } },
    ]);
  });

  it("下へ: 1 つ下の項目と並び順を入れ替える", async () => {
    await moveComponent("a", "down");

    expect(updates()).toEqual([
      { where: { id: "a" }, data: { order: 20 } },
      { where: { id: "b" }, data: { order: 10 } },
    ]);
  });

  it.each([
    { id: "a", direction: "up" },
    { id: "c", direction: "down" },
  ] as const)("端（$id を $direction）では何もしない", async ({ id, direction }) => {
    const result = await moveComponent(id, direction);

    expect(result).toEqual({ ok: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("他人の（一覧に無い）項目はエラー", async () => {
    const result = await moveComponent("x", "up");

    expect(result).toEqual({ ok: false, error: "対象が見つかりません" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
