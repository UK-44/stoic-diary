// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, revalidatePath } = vi.hoisted(() => ({
  prisma: { periodReview: { upsert: vi.fn() } },
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => ({ id: "user-1" })) }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { savePeriodReview } from "./actions";

const input = (overrides: Partial<Parameters<typeof savePeriodReview>[0]> = {}) => ({
  periodType: "WEEK" as const,
  periodStart: "2026-09-20",
  goal: "<p>毎日走る</p>",
  wentWell: "<p>早起き</p>",
  couldImprove: "<p>夜更かし</p>",
  nextActions: "<p>22時就寝</p>",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("savePeriodReview", () => {
  it("期間の開始日が不正ならエラーを返し、保存しない", async () => {
    const result = await savePeriodReview(input({ periodStart: "2026-9-20" }));

    expect(result).toEqual({ ok: false, error: "期間の指定が不正です" });
    expect(prisma.periodReview.upsert).not.toHaveBeenCalled();
  });

  it("(ユーザー, 期間種別, 開始日) で upsert する", async () => {
    await savePeriodReview(input({ periodType: "MONTH", periodStart: "2026-09-01" }));

    const periodStart = new Date("2026-09-01T00:00:00Z");
    const data = {
      goal: "<p>毎日走る</p>",
      wentWell: "<p>早起き</p>",
      couldImprove: "<p>夜更かし</p>",
      nextActions: "<p>22時就寝</p>",
    };
    expect(prisma.periodReview.upsert).toHaveBeenCalledWith({
      where: {
        userId_periodType_periodStart: { userId: "user-1", periodType: "MONTH", periodStart },
      },
      update: data,
      create: { userId: "user-1", periodType: "MONTH", periodStart, ...data },
    });
  });

  it("空白だけの項目は null で保存する", async () => {
    await savePeriodReview(input({ goal: " ", nextActions: "" }));

    expect(prisma.periodReview.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ goal: null, nextActions: null, wentWell: "<p>早起き</p>" }),
      }),
    );
  });

  it("保存後に /review を再検証する", async () => {
    const result = await savePeriodReview(input());

    expect(result).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/review");
  });
});
