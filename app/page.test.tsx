import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { prisma, user, resolveFormForDate } = vi.hoisted(() => ({
  prisma: { diaryEntry: { findMany: vi.fn(), findUnique: vi.fn() } },
  user: {
    current: {
      id: "user-1",
      longTermGoal: null as string | null,
      longTermGoalDate: null as Date | null,
    },
  },
  resolveFormForDate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn(async () => user.current) }));
vi.mock("@/lib/diary/form-resolver", () => ({ resolveFormForDate }));
// 子コンポーネントは受け取った props だけを検証する。
vi.mock("@/components/diary/WeekStrip", () => ({
  WeekStrip: (props: object) => <pre data-testid="week-strip">{JSON.stringify(props)}</pre>,
}));
vi.mock("@/components/diary/DiaryEditor", () => ({
  DiaryEditor: (props: object) => <pre data-testid="diary-editor">{JSON.stringify(props)}</pre>,
}));

import Home from "./page";

const propsOf = (testId: string) => JSON.parse(screen.getByTestId(testId).textContent!);

async function renderHome(d?: string) {
  render(await Home({ searchParams: Promise.resolve(d === undefined ? {} : { d }) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-24T03:00:00Z")); // JST 2026-09-24 12:00
  user.current = { id: "user-1", longTermGoal: null, longTermGoalDate: null };
  prisma.diaryEntry.findMany.mockResolvedValue([]);
  prisma.diaryEntry.findUnique.mockResolvedValue(null);
  resolveFormForDate.mockResolvedValue({ components: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Home ページ", () => {
  it("?d= が無ければ今日（JST）を表示する", async () => {
    await renderHome();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("9月24日 (木)");
    expect(propsOf("week-strip")).toMatchObject({
      selectedKey: "2026-09-24",
      todayKey: "2026-09-24",
    });
    expect(resolveFormForDate).toHaveBeenCalledWith("2026-09-24", "user-1");
  });

  it("?d= の日付を表示する", async () => {
    await renderHome("2026-01-05");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1月5日 (月)");
    expect(propsOf("diary-editor")).toMatchObject({ dateKey: "2026-01-05" });
  });

  it("?d= が不正なら今日を表示する", async () => {
    await renderHome("yesterday");

    expect(propsOf("diary-editor")).toMatchObject({ dateKey: "2026-09-24" });
  });

  it("記入済みの日付を週ストリップに渡す", async () => {
    prisma.diaryEntry.findMany.mockResolvedValue([
      { date: new Date("2026-09-21T00:00:00Z") },
      { date: new Date("2026-09-24T00:00:00Z") },
    ]);

    await renderHome();

    expect(prisma.diaryEntry.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { date: true },
    });
    expect(propsOf("week-strip").entryDates).toEqual(["2026-09-21", "2026-09-24"]);
  });

  it("その日のエントリがあれば、評価つきの記入済みとしてエディタを開く", async () => {
    prisma.diaryEntry.findUnique.mockResolvedValue({ rating: 3 });

    await renderHome("2026-09-20");

    expect(prisma.diaryEntry.findUnique).toHaveBeenCalledWith({
      where: { userId_date: { userId: "user-1", date: new Date("2026-09-20T00:00:00Z") } },
      select: { rating: true },
    });
    expect(propsOf("diary-editor")).toMatchObject({ initialRating: 3, existing: true });
  });

  it("その日のエントリが無ければ、未記入としてエディタを開く", async () => {
    await renderHome();

    expect(propsOf("diary-editor")).toMatchObject({ initialRating: null, existing: false });
  });

  it("長期目標があれば対象日つきで表示し、エディタにも渡す", async () => {
    user.current = {
      id: "user-1",
      longTermGoal: "フルマラソン完走",
      longTermGoalDate: new Date("2027-03-01T00:00:00Z"),
    };

    await renderHome();

    expect(screen.getByText("長期目標")).toBeInTheDocument();
    expect(screen.getByText("フルマラソン完走")).toBeInTheDocument();
    expect(screen.getByText("〜 2027-03-01")).toBeInTheDocument();
    expect(propsOf("diary-editor")).toMatchObject({
      longTermGoal: "フルマラソン完走",
      longTermGoalDate: "2027-03-01",
    });
  });

  it("長期目標に対象日が無ければ、目標だけを表示する", async () => {
    user.current = { id: "user-1", longTermGoal: "フルマラソン完走", longTermGoalDate: null };

    await renderHome();

    expect(screen.getByText("フルマラソン完走")).toBeInTheDocument();
    expect(screen.queryByText(/^〜/)).not.toBeInTheDocument();
  });

  it("長期目標が無ければ表示しない", async () => {
    await renderHome();

    expect(screen.queryByText("長期目標")).not.toBeInTheDocument();
    expect(propsOf("diary-editor")).toMatchObject({ longTermGoal: null, longTermGoalDate: null });
  });
});
