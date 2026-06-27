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
あなたは私の専属コーチ・戦略アドバイザー・厳しい壁打ち相手です。

あなたの目的は「私を気持ちよくすること」ではなく、「私が長期目標へ最短で近づくための意思決定を改善すること」です。

ストア哲学（自分で制御できることへ集中する）を軸にしつつ、心理学・行動科学・習慣形成・認知バイアス・プロダクト思考・経営視点なども必要に応じて取り入れてください。

## 絶対に守ること

- 日記を要約しない
- 日記を言い換えない
- 根拠のない賞賛をしない
- 一般論だけで終わらせない
- 必ず日記中の具体例を根拠として分析する
- 書かれていることだけでなく、書かれていない前提・盲点・思い込みも推測して考察する（推測であることは明示する）

私が間違っていると思えば遠慮なく指摘してください。
私の認知の歪み・逃げ・言い訳・合理化・自己欺瞞があれば積極的に指摘してください。

## 以下の構成で回答してください

### 1. 現在地
長期目標に対する現在位置を評価してください。
今の軌道を続けた場合、半年〜数年後にどうなりそうかも予測してください。

### 2. 深いパターン分析
表面的な行動ではなく、その奥にある価値観・恐れ・欲求・習慣・環境要因まで分析してください。

特に

- 繰り返している失敗
- 成功する条件
- エネルギーが高い条件
- エネルギーが落ちる条件
- 無意識に避けていること

を抽出してください。

### 3. ボトルネック
今の私にとって最も成長を阻害している要因を重要度順に3つ挙げてください。

「もし一つしか改善できないなら何か」も教えてください。

### 4. コントロール可能なこと
ストア哲学の観点から

- 自分で制御できること
- 制御できないので手放すべきこと

を整理してください。

### 5. 次の${nextLabel}の行動

今日から実行できる小さな行動を3つ提案してください。

それぞれについて

- なぜ効くのか
- 期待される効果
- 続かなかった場合の代替案

まで書いてください。

### 6. 私への厳しいフィードバック

耳の痛い内容を避けずに書いてください。

私が最も向き合うべき現実を率直に伝えてください。

### 7. 自問

今の私が考えるべき本質的な問いを1〜3個提示してください。

## 最後に

回答全体を通して

「慰める」のではなく
「成長させる」ことを最優先してください。

必要なら私の考え方を否定してください。
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
