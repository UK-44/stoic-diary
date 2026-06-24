import { valueToPlainText, type ComponentValue } from "@/lib/diary/types";
import type { PeriodType } from "@/lib/generated/prisma/enums";

// 日次の総合評価ラベル（DiaryEditor と揃える）。
const DAILY_RATING_LABELS = ["", "悪い", "普通", "良い", "最高"];

/**
 * 振り返りプロンプト（全文）をクリップボードへコピーし、ChatGPT を新規タブで開く。
 * URL には載せない（長文 + ログイン Cookie で 431 になるため）。プロンプトは
 * 省略・切り詰めせず全文をコピーし、ユーザーが入力欄に貼り付ける。
 */
export function openChatGptReflection(prompt: string): void {
  navigator.clipboard?.writeText(prompt).catch(() => {});
  window.open("https://chatgpt.com/", "_blank", "noopener");
}

/** HTML/値 → プレーンテキスト（空なら空文字）。 */
function toText(value: ComponentValue | string | null | undefined): string {
  if (value == null || value === "") return "";
  return valueToPlainText(value as ComponentValue);
}

/**
 * コーチングの指示文。単なる要約・反復ではなく、多角的な分析と
 * 目標とのギャップの指摘、具体的な改善策を引き出すよう強く指定する。
 */
function coachInstruction(scopeLabel: string, nextLabel: string): string {
  return [
    `あなたは私の専属コーチ兼戦略アドバイザーです。ストア哲学（自分で制御できることに集中する）の視点も交えながら、${scopeLabel}の記録を多角的に分析してください。`,
    "重要: 日記の内容をそのまま要約・反復するのは不要です。行間、繰り返し現れるパターン、書かれていない盲点まで踏み込んで考察してください。",
    "",
    "次の観点で、それぞれ見出しを付けて回答してください:",
    "1. 現在地の評価 — 長期目標に対して今どの位置にいるか。このままの延長線上で目標に到達できそうか、率直に。",
    "2. パターンと根本原因 — 繰り返し現れる行動・感情・思考のクセ。うまくいく時とそうでない時の違いは何か。",
    "3. 目標達成に足りていないもの — ギャップを具体的に指摘してください。耳の痛い指摘も歓迎します。",
    `4. より良い自分になるための具体策 — ${nextLabel}から実行できる小さな一歩を3つ。それぞれ「なぜ効くのか」も添えてください。`,
    "5. 自問すべき問い — 私が次に向き合うべき本質的な問いを1〜2個。",
    "",
    "ただ励ましたり褒めたりするだけにせず、私が成長するために忖度なく踏み込んでください。",
  ].join("\n");
}

function goalBlock(goal: string | null, goalDate: string | null): string[] {
  if (!goal?.trim()) return [];
  return [
    "# 長期目標",
    goalDate ? `${goal}（〜${goalDate}）` : goal,
    "",
  ];
}

// --- 日次 ---

export type DailyItem = { name: string; value: ComponentValue | null };

export function buildDailyPrompt(args: {
  dateKey: string;
  longTermGoal: string | null;
  longTermGoalDate: string | null;
  rating: number | null;
  items: DailyItem[];
}): string {
  const lines: string[] = [
    coachInstruction("今日", "明日"),
    "",
    ...goalBlock(args.longTermGoal, args.longTermGoalDate),
    `# ${args.dateKey} の記録`,
  ];
  if (args.rating != null) {
    lines.push(`総合評価: ${DAILY_RATING_LABELS[args.rating] ?? args.rating}`);
  }
  for (const it of args.items) {
    const text = toText(it.value);
    if (!text) continue;
    lines.push(`【${it.name}】`, text);
  }
  return lines.join("\n");
}

// --- 週次/月次 ---

export type PeriodHabit = {
  name: string;
  achieved: boolean;
  remaining: number;
  targetDays: number;
  periodCount: number;
};

export type PeriodEntry = {
  date: string;
  ratingLabel: string | null;
  preview: string;
};

export function buildPeriodPrompt(args: {
  periodType: PeriodType;
  periodLabel: string;
  longTermGoal: string | null;
  longTermGoalDate: string | null;
  review: { goal: string; wentWell: string; couldImprove: string; nextActions: string };
  filledDays: number;
  totalDays: number;
  avgRating: string;
  habits: PeriodHabit[];
  entries: PeriodEntry[];
}): string {
  const isWeek = args.periodType === "WEEK";
  const scopeLabel = isWeek ? "この1週間" : "この1ヶ月";
  const nextLabel = isWeek ? "来週" : "来月";
  const goalLabel = isWeek ? "週間目標" : "月間目標";

  const lines: string[] = [
    coachInstruction(scopeLabel, nextLabel),
    "",
    ...goalBlock(args.longTermGoal, args.longTermGoalDate),
    `# ${args.periodLabel} の振り返り`,
  ];

  const r = args.review;
  const reviewRows: [string, string][] = [
    [goalLabel, toText(r.goal)],
    ["うまくできたこと", toText(r.wentWell)],
    ["もっと改善できたこと", toText(r.couldImprove)],
    ["次のサイクルで取り組むこと", toText(r.nextActions)],
  ];
  for (const [label, text] of reviewRows) {
    if (text) lines.push(`${label}: ${text}`);
  }

  lines.push("", "# 指標", `記入: ${args.filledDays}/${args.totalDays}日 / 平均評価: ${args.avgRating}`);

  if (args.habits.length > 0) {
    lines.push("", "# 習慣状況");
    for (const h of args.habits) {
      lines.push(
        h.achieved
          ? `${h.name}: 目標達成（${h.targetDays}日）`
          : `${h.name}: この期間 ${h.periodCount}日 / 目標まで残り${h.remaining}日（目標${h.targetDays}日）`,
      );
    }
  }

  if (args.entries.length > 0) {
    lines.push("", "# この期間の日記");
    for (const e of args.entries) {
      const rating = e.ratingLabel ? `[${e.ratingLabel}] ` : "";
      const preview = e.preview || "（本文なし）";
      lines.push(`- ${e.date}: ${rating}${preview}`);
    }
  }

  return lines.join("\n");
}
