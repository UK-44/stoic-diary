import type { ComponentType } from "@/lib/generated/prisma/enums";

export type { ComponentType };

// --- コンポーネントの config（DiaryComponent.config） ---
export type FixedMessageConfig = { message?: string }; // 表示する固定文面
export type RichTextConfig = { placeholder?: string };
export type LabeledTextConfig = { groups: string[] }; // ラベル名の配列（例: ["Good","Bad"]）
export type CheckboxListConfig = { placeholder?: string }; // 項目追加欄のプレースホルダ

// --- 習慣（HABIT） ---
// 1 つの「習慣」コンポーネントの中に、複数の習慣（名前＋難易度）を持てる。
export type HabitDifficulty = "EASY" | "NORMAL" | "HARD";
export type HabitItem = {
  id: string; // 日次の達成状況を日をまたいで紐づけるための安定 ID
  name: string;
  difficulty: HabitDifficulty;
};
export type HabitConfig = { habits: HabitItem[] };
/** 難易度ごとの目標日数。 */
export const HABIT_TARGET_DAYS: Record<HabitDifficulty, number> = {
  EASY: 21,
  NORMAL: 66,
  HARD: 90,
};
export const HABIT_DIFFICULTY_LABEL: Record<HabitDifficulty, string> = {
  EASY: "簡単",
  NORMAL: "普通",
  HARD: "難しい",
};

// --- DiaryEntryValue.value（型ごとの入力値） ---
export type RichTextValue = string; // HTML
export type LabeledTextValue = Record<string, string>; // ラベル → HTML
export type CheckboxListItem = { text: string; checked: boolean };
export type CheckboxListValue = CheckboxListItem[]; // 毎日その場で追加する ToDo 配列
// （HABIT の型・定数は上部「習慣（HABIT）」セクションを参照）
export type HabitValue = Record<string, boolean>; // habitId → その日に達成したか
export type ComponentValue =
  | RichTextValue
  | LabeledTextValue
  | CheckboxListValue
  | HabitValue;

/** 習慣 1 件の進捗（config の定義＋集計を描画用に解決したもの）。 */
export type HabitProgress = {
  id: string;
  name: string;
  difficulty: HabitDifficulty;
  targetDays: number;
  /** 選択日より前にチェックした日数（当日分は value 側で加味する）。 */
  checkedBefore: number;
};

/** 解決済みの 1 コンポーネント（描画に必要な情報を平坦化したもの） */
export type ResolvedComponent = {
  componentId: string;
  key: string;
  name: string;
  type: ComponentType;
  config:
    | RichTextConfig
    | LabeledTextConfig
    | FixedMessageConfig
    | CheckboxListConfig
    | HabitConfig;
  /** FIXED_MESSAGE の表示文面（overrides.message） */
  message: string | null;
  /** 既存エントリの入力値（なければ null） */
  value: ComponentValue | null;
  /** HABIT の各習慣の進捗（HABIT 以外は null） */
  habit: HabitProgress[] | null;
};

/** ある日付に対して解決されたフォーム全体（＝ユーザーの項目一覧） */
export type ResolvedForm = {
  components: ResolvedComponent[];
};

type AnyConfig =
  | RichTextConfig
  | LabeledTextConfig
  | FixedMessageConfig
  | CheckboxListConfig
  | HabitConfig;

export function emptyValueFor(
  type: ComponentType,
  config: AnyConfig,
): ComponentValue | null {
  switch (type) {
    case "RICH_TEXT":
      return "";
    case "LABELED_TEXT": {
      const groups = (config as LabeledTextConfig).groups ?? [];
      return Object.fromEntries(groups.map((g) => [g, ""]));
    }
    case "CHECKBOX_LIST":
      return [];
    case "HABIT":
      return {};
    case "FIXED_MESSAGE":
    default:
      return null;
  }
}

/** 旧フォーマット（配列ベース）も含め、型に応じた値へ正規化する。 */
export function normalizeValue(
  type: ComponentType,
  raw: unknown,
  config: AnyConfig,
): ComponentValue | null {
  if (type === "RICH_TEXT") {
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) return arrayToHtml(raw); // 旧 BULLET_LIST
    return "";
  }
  if (type === "LABELED_TEXT") {
    const groups = (config as LabeledTextConfig).groups ?? [];
    const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    return Object.fromEntries(
      groups.map((g) => {
        const v = obj[g];
        if (typeof v === "string") return [g, v];
        if (Array.isArray(v)) return [g, arrayToHtml(v)]; // 旧 GROUPED_LIST
        return [g, ""];
      }),
    );
  }
  if (type === "CHECKBOX_LIST") {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
      .map((it) => ({
        text: typeof it.text === "string" ? it.text : "",
        checked: it.checked === true,
      }));
  }
  if (type === "HABIT") {
    const obj = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<
      string,
      unknown
    >;
    const out: HabitValue = {};
    for (const [habitId, checked] of Object.entries(obj)) {
      if (checked === true) out[habitId] = true;
    }
    return out;
  }
  return null;
}

function arrayToHtml(items: unknown[]): string {
  const lis = items
    .filter((s) => typeof s === "string" && s.trim() !== "")
    .map((s) => `<li><p>${escapeHtml(s as string)}</p></li>`) // TipTap の listItem は内部に paragraph を持つ
    .join("");
  return lis ? `<ul>${lis}</ul>` : "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** エントリの値リストから、一覧表示用のプレビュー（最初の非空テキスト）を作る。 */
export function previewFromValues(values: { value: unknown }[]): string {
  for (const v of values) {
    const t = valueToPlainText(v.value as ComponentValue);
    if (t) return t;
  }
  return "";
}

/** リッチテキスト/ラベル付き/チェックボックスの値から、検索用のプレーンテキストを取り出す。 */
export function valueToPlainText(value: ComponentValue): string {
  if (Array.isArray(value)) {
    // CHECKBOX_LIST: 各項目のテキストを連結する。
    return value
      .map((it) => (it && typeof it === "object" ? it.text : ""))
      .filter((t) => t.trim() !== "")
      .join(" ");
  }
  // HABIT: habitId → boolean のマップ。一覧プレビュー・検索には載せない。
  if (
    value &&
    typeof value === "object" &&
    Object.values(value).every((v) => typeof v === "boolean")
  ) {
    return "";
  }
  const html = typeof value === "string" ? value : Object.values(value).join(" ");
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
