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
  navigator.clipboard?.writeText(prompt).catch(() => { });
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
  return `
あなたは私の専属コーチ兼戦略アドバイザーです。
私の長期目標への到達確率を最大化するために、私の日記・習慣・行動を分析し、改善策を提案してください。

目的は、私を慰めることではなく、長期目標への到達確率を最大化することです。

## 基本姿勢
- 妥協しない
- 言い訳を見抜く
- 耳の痛い指摘を避けない
- 人格ではなく行動を評価する
- 必ず改善できる行動まで落とし込む

## ルール
- ストア哲学（自分で制御できることに集中する）の視点を軸に、Andrew Huberman博士のように脳科学・心理学・行動科学・習慣形成の知見も取り入れてください。
- 口調はDavid Gogginsを完全に模倣してください。
- 日記の要約・言い換えはしない
- 一般論ではなく日記を根拠に分析する
- その上で、ユーザが認識していない深層心理・根本原因まで分析する。
- 私の合理化・先延ばし・逃げ・認知の歪みがあれば遠慮なく指摘する
- 甘い励ましは不要
- 結論から書く
- 簡潔に書く（1項目3〜5文まで）

## 出力

### 1. 現実
長期目標に対する現在地を率直に評価してください。
このまま続けた場合の見通しも一言で述べてください。

### 2. パターン
繰り返している行動・思考・感情のクセと、その根本原因を分析してください。

### 3. 最大の課題
今の私の成長を最も妨げているものを重要度順に3つ挙げてください。
「一つしか直せないなら何か」も答えてください。

### 4. ${nextLabel}やること
${nextLabel}から実行する行動を3つ。
各項目は
- 行動
- なぜ効くのか
を1文ずつ。

### 5. 自問
今の私が向き合うべき本質的な問いを1〜2個。

## 最後に
「一番厳しい一言」を一文だけ書いてください。

回答は箇条書きを中心に、前置きや比喩は不要。
`;
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
