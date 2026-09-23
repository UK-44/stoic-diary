// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, revalidatePath } = vi.hoisted(() => ({
  prisma: {
    idea: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { createIdea, deleteIdea, updateIdea, type IdeaInput } from "./actions";

const input = (overrides: Partial<IdeaInput> = {}): IdeaInput => ({
  title: "見出し",
  content: "<p>メモ</p>",
  rating: 3,
  label: "WORK",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.idea.create.mockResolvedValue({ id: "idea-1" });
});

describe("createIdea", () => {
  it("見出しが空白のみならエラーを返し、保存しない", async () => {
    const result = await createIdea(input({ title: "   " }));

    expect(result).toEqual({ ok: false, error: "見出しを入力してください" });
    expect(prisma.idea.create).not.toHaveBeenCalled();
  });

  it("見出しは前後の空白を除いて保存する", async () => {
    await createIdea(input({ title: "  散歩する  " }));

    expect(prisma.idea.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "散歩する" }),
    });
  });

  it("ログイン中ユーザーのアイデアとして保存する", async () => {
    await createIdea(input());

    expect(prisma.idea.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1" }),
    });
  });

  it("メモが空白のみなら null で保存する", async () => {
    await createIdea(input({ content: " \n " }));

    expect(prisma.idea.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ content: null }),
    });
  });

  it("メモは（空でなければ）入力のまま保存する", async () => {
    await createIdea(input({ content: " <p>メモ</p> " }));

    expect(prisma.idea.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ content: " <p>メモ</p> " }),
    });
  });

  describe("評価は 0〜5 の整数に丸める", () => {
    it.each([
      { rating: -1, expected: 0 },
      { rating: 6, expected: 5 },
      { rating: 3.6, expected: 4 },
      { rating: Number.NaN, expected: 0 },
    ])("$rating → $expected", async ({ rating, expected }) => {
      await createIdea(input({ rating }));

      expect(prisma.idea.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ rating: expected }),
      });
    });
  });

  it("成功時は作成 id を返し、/idea を再検証する", async () => {
    const result = await createIdea(input());

    expect(result).toEqual({ ok: true, id: "idea-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/idea");
  });
});

describe("updateIdea", () => {
  it("自分のものでない（存在しない）id はエラーを返し、更新しない", async () => {
    prisma.idea.findFirst.mockResolvedValue(null);

    const result = await updateIdea("other-idea", input());

    expect(prisma.idea.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "other-idea", userId: "user-1" } }),
    );
    expect(result).toEqual({ ok: false, error: "対象が見つかりません" });
    expect(prisma.idea.update).not.toHaveBeenCalled();
  });

  it("見出しが空白のみならエラーを返し、更新しない", async () => {
    prisma.idea.findFirst.mockResolvedValue({ id: "idea-1" });

    const result = await updateIdea("idea-1", input({ title: " " }));

    expect(result).toEqual({ ok: false, error: "見出しを入力してください" });
    expect(prisma.idea.update).not.toHaveBeenCalled();
  });

  it("正常時は正規化した値で更新し、/idea を再検証する", async () => {
    prisma.idea.findFirst.mockResolvedValue({ id: "idea-1" });

    const result = await updateIdea(
      "idea-1",
      input({ title: " 新しい見出し ", content: "  ", rating: 9, label: null }),
    );

    expect(result).toEqual({ ok: true });
    expect(prisma.idea.update).toHaveBeenCalledWith({
      where: { id: "idea-1" },
      data: { title: "新しい見出し", content: null, rating: 5, label: null },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/idea");
  });
});

describe("deleteIdea", () => {
  it("自分のものでない（存在しない）id はエラーを返し、削除しない", async () => {
    prisma.idea.findFirst.mockResolvedValue(null);

    const result = await deleteIdea("other-idea");

    expect(prisma.idea.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "other-idea", userId: "user-1" } }),
    );
    expect(result).toEqual({ ok: false, error: "対象が見つかりません" });
    expect(prisma.idea.delete).not.toHaveBeenCalled();
  });

  it("正常時は削除し、/idea を再検証する", async () => {
    prisma.idea.findFirst.mockResolvedValue({ id: "idea-1" });

    const result = await deleteIdea("idea-1");

    expect(result).toEqual({ ok: true });
    expect(prisma.idea.delete).toHaveBeenCalledWith({ where: { id: "idea-1" } });
    expect(revalidatePath).toHaveBeenCalledWith("/idea");
  });
});
