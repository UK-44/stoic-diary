import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDailyPrompt, buildPeriodPrompt, openChatGptReflection } from "./reflection";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildDailyPrompt", () => {
  const base = {
    dateKey: "2026-09-24",
    longTermGoal: "フルマラソン完走",
    longTermGoalDate: "2027-03-01",
    rating: 3,
    items: [
      { name: "今日の目標", value: "<p>10km 走る</p>" },
      { name: "メモ", value: "" },
      { name: "習慣", value: { run: true } },
    ],
  };

  it("長期目標を対象日つきで含める", () => {
    expect(buildDailyPrompt(base)).toContain("# 長期目標\nフルマラソン完走（〜2027-03-01）");
  });

  it("対象日が無ければ長期目標だけを書く", () => {
    const prompt = buildDailyPrompt({ ...base, longTermGoalDate: null });

    expect(prompt).toContain("# 長期目標\nフルマラソン完走\n");
  });

  it("長期目標が空なら長期目標の見出しを出さない", () => {
    expect(buildDailyPrompt({ ...base, longTermGoal: "  " })).not.toContain("# 長期目標");
  });

  it("日付と総合評価のラベルを含める", () => {
    const prompt = buildDailyPrompt(base);

    expect(prompt).toContain("# 2026-09-24 の記録");
    expect(prompt).toContain("総合評価: 良い");
  });

  it("総合評価が無ければ書かない", () => {
    expect(buildDailyPrompt({ ...base, rating: null })).not.toContain("総合評価:");
  });

  it("テキストのある項目だけを【項目名】つきで含める", () => {
    const prompt = buildDailyPrompt(base);

    expect(prompt).toContain("【今日の目標】\n10km 走る");
    expect(prompt).not.toContain("【メモ】");
    expect(prompt).not.toContain("【習慣】");
  });

  it("明日の行動を求める", () => {
    expect(buildDailyPrompt(base)).toContain("### 4. 明日やること");
  });
});

describe("buildPeriodPrompt", () => {
  const base = {
    periodType: "WEEK" as const,
    periodLabel: "2026-09-20 〜 2026-09-26",
    longTermGoal: null,
    longTermGoalDate: null,
    review: {
      goal: "<p>毎日走る</p>",
      wentWell: "",
      couldImprove: "<p>夜更かし</p>",
      nextActions: "",
    },
    filledDays: 5,
    totalDays: 7,
    avgRating: "2.8",
    habits: [
      { name: "ランニング", achieved: false, remaining: 40, targetDays: 66, periodCount: 4 },
      { name: "読書", achieved: true, remaining: 0, targetDays: 21, periodCount: 7 },
    ],
    entries: [
      { date: "2026-09-24", ratingLabel: "良い", preview: "10km 走った" },
      { date: "2026-09-23", ratingLabel: null, preview: "" },
    ],
  };

  it("週なら「週間目標」「来週」を使う", () => {
    const prompt = buildPeriodPrompt(base);

    expect(prompt).toContain("週間目標: 毎日走る");
    expect(prompt).toContain("### 4. 来週やること");
  });

  it("月なら「月間目標」「来月」を使う", () => {
    const prompt = buildPeriodPrompt({ ...base, periodType: "MONTH" });

    expect(prompt).toContain("月間目標: 毎日走る");
    expect(prompt).toContain("### 4. 来月やること");
  });

  it("振り返りは記入のある項目だけを含める", () => {
    const prompt = buildPeriodPrompt(base);

    expect(prompt).toContain("もっと改善できたこと: 夜更かし");
    expect(prompt).not.toContain("うまくできたこと:");
  });

  it("指標（記入日数・平均評価）を含める", () => {
    expect(buildPeriodPrompt(base)).toContain("記入: 5/7日 / 平均評価: 2.8");
  });

  it("習慣は達成済みと未達成で書き分ける", () => {
    const prompt = buildPeriodPrompt(base);

    expect(prompt).toContain("ランニング: この期間 4日 / 目標まで残り40日（目標66日）");
    expect(prompt).toContain("読書: 目標達成（21日）");
  });

  it("習慣が無ければ習慣状況の見出しを出さない", () => {
    expect(buildPeriodPrompt({ ...base, habits: [] })).not.toContain("# 習慣状況");
  });

  it("日記は評価つきで並べ、本文の無い日は「（本文なし）」と書く", () => {
    const prompt = buildPeriodPrompt(base);

    expect(prompt).toContain("- 2026-09-24: [良い] 10km 走った");
    expect(prompt).toContain("- 2026-09-23: （本文なし）");
  });

  it("日記が無ければ日記の見出しを出さない", () => {
    expect(buildPeriodPrompt({ ...base, entries: [] })).not.toContain("# この期間の日記");
  });
});

describe("openChatGptReflection", () => {
  it("プロンプトをクリップボードにコピーし、ChatGPT を新しいタブで開く", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    openChatGptReflection("プロンプト");

    expect(writeText).toHaveBeenCalledWith("プロンプト");
    expect(open).toHaveBeenCalledWith("https://chatgpt.com/", "_blank", "noopener");
    vi.unstubAllGlobals();
  });
});
