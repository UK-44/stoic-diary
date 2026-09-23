import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    diaryEntry: { findMany: vi.fn() },
    periodReview: { findUnique: vi.fn() },
    diaryComponent: { findMany: vi.fn() },
    diaryEntryValue: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", longTermGoal: null, longTermGoalDate: null })),
}));
vi.mock("@/components/review/PeriodReflection", () => ({
  PeriodReflection: (props: object) => (
    <pre data-testid="period-reflection">{JSON.stringify(props)}</pre>
  ),
}));
vi.mock("@/components/ai/AiReflectionButton", () => ({
  AiReflectionButton: ({ prompt }: { prompt: string }) => <pre data-testid="ai-prompt">{prompt}</pre>,
}));

import ReviewPage from "./page";

const utc = (key: string) => new Date(`${key}T00:00:00Z`);
const entry = (key: string, rating: number | null, text = "") => ({
  date: utc(key),
  rating,
  values: [{ value: text }],
});

async function renderReview(params: { period?: string; start?: string } = {}) {
  render(await ReviewPage({ searchParams: Promise.resolve(params) }));
}

const section = (heading: string) => screen.getByText(heading).closest("section")!;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-24T03:00:00Z")); // JST 2026-09-24（木）
  prisma.diaryEntry.findMany.mockResolvedValue([]);
  prisma.periodReview.findUnique.mockResolvedValue(null);
  prisma.diaryComponent.findMany.mockResolvedValue([]);
  prisma.diaryEntryValue.findMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Review ページ（期間）", () => {
  it("期間指定が無ければ今週（日曜始まり）を表示する", async () => {
    await renderReview();

    expect(screen.getByText("2026-09-20 〜 2026-09-26")).toBeInTheDocument();
    expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", date: { gte: utc("2026-09-20"), lte: utc("2026-09-26") } },
      }),
    );
  });

  it("period=month なら今月を表示する", async () => {
    await renderReview({ period: "month" });

    expect(screen.getByText("2026年9月")).toBeInTheDocument();
    expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", date: { gte: utc("2026-09-01"), lte: utc("2026-09-30") } },
      }),
    );
  });

  it("start を指定するとその期間を表示する", async () => {
    await renderReview({ start: "2026-08-30" });
    expect(screen.getByText("2026-08-30 〜 2026-09-05")).toBeInTheDocument();
  });

  it("start が不正なら今週を表示する", async () => {
    await renderReview({ start: "last-week" });

    expect(screen.getByText("2026-09-20 〜 2026-09-26")).toBeInTheDocument();
  });

  it("週の 前へ / 次へ は 1 週間前後を指す", async () => {
    await renderReview();

    expect(screen.getByRole("link", { name: "← 前へ" })).toHaveAttribute(
      "href",
      "/review?period=week&start=2026-09-13",
    );
    expect(screen.getByRole("link", { name: "次へ →" })).toHaveAttribute(
      "href",
      "/review?period=week&start=2026-09-27",
    );
  });

  it("月の 前へ / 次へ は年をまたいで前後の月を指す", async () => {
    await renderReview({ period: "month", start: "2026-12-01" });

    expect(screen.getByRole("link", { name: "← 前へ" })).toHaveAttribute(
      "href",
      "/review?period=month&start=2026-11-01",
    );
    expect(screen.getByRole("link", { name: "次へ →" })).toHaveAttribute(
      "href",
      "/review?period=month&start=2027-01-01",
    );
  });

  it("選択中の期間タブを強調する", async () => {
    await renderReview({ period: "month" });

    expect(screen.getByRole("link", { name: "1ヶ月" })).toHaveClass("bg-zinc-200");
    expect(screen.getByRole("link", { name: "1週間" })).not.toHaveClass("bg-zinc-200");
  });
});

describe("Review ページ（サマリー・日記一覧）", () => {
  it("記入日数と平均評価（小数 1 桁、未評価の日は除く）を表示する", async () => {
    prisma.diaryEntry.findMany.mockResolvedValue([
      entry("2026-09-24", 4),
      entry("2026-09-22", 3),
      entry("2026-09-21", null),
      entry("2026-09-20", 3),
    ]);

    await renderReview();

    expect(screen.getByText(/^記入/).parentElement).toHaveTextContent("記入 4 / 7 日");
    expect(screen.getByText(/^平均評価/)).toHaveTextContent("平均評価 3.3");
  });

  it("評価のある日が無ければ平均評価は —", async () => {
    prisma.diaryEntry.findMany.mockResolvedValue([entry("2026-09-24", null)]);

    await renderReview();

    expect(screen.getByText(/^平均評価/)).toHaveTextContent("平均評価 —");
  });

  it("期間内の日記を、その日へのリンクとして評価・プレビューつきで一覧表示する", async () => {
    prisma.diaryEntry.findMany.mockResolvedValue([
      entry("2026-09-24", 4, "<p>10km 走った</p>"),
      entry("2026-09-22", null, "<p>休養</p>"),
    ]);

    await renderReview();

    const list = within(section("この期間の日記"));
    const first = list.getByRole("link", { name: /2026-09-24/ });
    expect(first).toHaveAttribute("href", "/?d=2026-09-24");
    expect(first).toHaveTextContent("10km 走った");
    expect(first).toHaveTextContent("最高");
    expect(list.getByRole("link", { name: /2026-09-22/ })).toHaveTextContent("休養");
  });

  it("期間内の記入が無ければ案内を表示する", async () => {
    await renderReview();

    expect(screen.getByText("この期間の記入はありません。")).toBeInTheDocument();
  });

  it("保存済みの振り返りを期間つきで入力欄に渡す（無ければ空文字）", async () => {
    prisma.periodReview.findUnique.mockResolvedValue({
      goal: "<p>毎日走る</p>",
      wentWell: null,
      couldImprove: "<p>夜更かし</p>",
      nextActions: null,
    });

    await renderReview();

    expect(prisma.periodReview.findUnique).toHaveBeenCalledWith({
      where: {
        userId_periodType_periodStart: {
          userId: "user-1",
          periodType: "WEEK",
          periodStart: utc("2026-09-20"),
        },
      },
    });
    expect(JSON.parse(screen.getByTestId("period-reflection").textContent!)).toEqual({
      periodType: "WEEK",
      periodStart: "2026-09-20",
      initial: { goal: "<p>毎日走る</p>", wentWell: "", couldImprove: "<p>夜更かし</p>", nextActions: "" },
    });
  });

  it("AI 振り返りのプロンプトに期間・指標・日記を含める", async () => {
    prisma.diaryEntry.findMany.mockResolvedValue([entry("2026-09-24", 3, "<p>10km 走った</p>")]);

    await renderReview();

    const prompt = screen.getByTestId("ai-prompt").textContent!;
    expect(prompt).toContain("# 2026-09-20 〜 2026-09-26 の振り返り");
    expect(prompt).toContain("記入: 1/7日 / 平均評価: 3.0");
    expect(prompt).toContain("- 2026-09-24: [良い] 10km 走った");
  });
});

describe("Review ページ（習慣状況）", () => {
  const habitComponent = {
    id: "h",
    config: {
      habits: [
        { id: "run", name: "ランニング", difficulty: "EASY" },
        { id: "read", name: "読書", difficulty: "NORMAL" },
      ],
    },
  };
  const checked = (key: string, value: Record<string, boolean>) => ({
    componentId: "h",
    value,
    entry: { date: utc(key) },
  });

  /** 習慣 1 件の行。 */
  const habitRow = (name: string) =>
    within(section("習慣状況")).getByText(name).closest("li")!;
  /** 習慣の日別ドットの状態（title）を日付順に。 */
  const dailyStates = (name: string) =>
    Array.from(habitRow(name).querySelectorAll("[title]")).map((el) => el.getAttribute("title"));

  it("習慣項目が無ければ習慣状況を表示しない", async () => {
    await renderReview();

    expect(screen.queryByText("習慣状況")).not.toBeInTheDocument();
    expect(prisma.diaryEntryValue.findMany).not.toHaveBeenCalled();
  });

  it("通算の達成日数から残り日数を出す（期間外の達成も数える）", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([habitComponent]);
    prisma.diaryEntryValue.findMany.mockResolvedValue([
      checked("2026-08-01", { run: true }),
      checked("2026-09-21", { run: true, read: true }),
      checked("2026-09-22", { run: false }),
    ]);

    await renderReview();

    expect(prisma.diaryComponent.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", type: "HABIT" },
      orderBy: { order: "asc" },
    });
    expect(habitRow("ランニング")).toHaveTextContent("残り 19 / 21 日");
    expect(habitRow("読書")).toHaveTextContent("残り 65 / 66 日");
  });

  it("目標日数に届いたら「目標達成」を表示する", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([habitComponent]);
    prisma.diaryEntryValue.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, i) =>
        checked(`2026-08-${String(i + 1).padStart(2, "0")}`, { run: true }),
      ),
    );

    await renderReview();

    expect(habitRow("ランニング")).toHaveTextContent("目標達成 🎉");
    expect(habitRow("ランニング")).not.toHaveTextContent("残り");
  });

  it("目標日数を超えて達成しても「目標達成」のまま（残りはマイナスにならない）", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([habitComponent]);
    prisma.diaryEntryValue.findMany.mockResolvedValue(
      Array.from({ length: 22 }, (_, i) =>
        checked(`2026-08-${String(i + 1).padStart(2, "0")}`, { run: true }),
      ),
    );

    await renderReview();

    expect(habitRow("ランニング")).toHaveTextContent("目標達成 🎉");
  });

  it("習慣項目が複数あっても、それぞれの項目のチェックだけを数える", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([
      habitComponent,
      { id: "h2", config: { habits: [{ id: "run", name: "筋トレ", difficulty: "EASY" }] } },
    ]);
    prisma.diaryEntryValue.findMany.mockResolvedValue([
      checked("2026-09-21", { run: true }),
      { componentId: "h2", value: { run: true }, entry: { date: utc("2026-09-22") } },
      { componentId: "h2", value: { run: true }, entry: { date: utc("2026-09-23") } },
    ]);

    await renderReview();

    expect(habitRow("ランニング")).toHaveTextContent("残り 20 / 21 日");
    expect(habitRow("筋トレ")).toHaveTextContent("残り 19 / 21 日");
  });

  it("この期間の達成日数には期間外の達成を含めない", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([habitComponent]);
    prisma.diaryEntryValue.findMany.mockResolvedValue([
      checked("2026-08-01", { run: true }),
      checked("2026-09-21", { run: true }),
    ]);

    await renderReview();

    expect(screen.getByTestId("ai-prompt")).toHaveTextContent(
      "ランニング: この期間 1日 / 目標まで残り19日（目標21日）",
    );
  });

  it("期間内の日ごとに 達成 / 未達成 / 未来 を表示する", async () => {
    prisma.diaryComponent.findMany.mockResolvedValue([habitComponent]);
    prisma.diaryEntryValue.findMany.mockResolvedValue([
      checked("2026-09-21", { run: true }),
      checked("2026-09-24", { run: true }),
    ]);

    await renderReview();

    // 9/20(日)〜9/26(土)、今日は 9/24。
    expect(dailyStates("ランニング")).toEqual([
      "未達成",
      "達成",
      "未達成",
      "未達成",
      "達成",
      "未来",
      "未来",
    ]);
  });
});
