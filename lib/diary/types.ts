import type { ComponentType } from "@/lib/generated/prisma/enums";

export type { ComponentType };

// --- コンポーネントの config（DiaryComponent.config） ---
export type FixedMessageConfig = Record<string, never>;
export type RichTextConfig = { placeholder?: string };
export type LabeledTextConfig = { groups: string[] }; // ラベル名の配列（例: ["Good","Bad"]）

// --- FormVersionItem.overrides（版ごとの上書き） ---
export type FixedMessageOverrides = { message: string };

// --- DiaryEntryValue.value（型ごとの入力値） ---
export type RichTextValue = string; // HTML
export type LabeledTextValue = Record<string, string>; // ラベル → HTML
export type ComponentValue = RichTextValue | LabeledTextValue;

/** 解決済みの 1 コンポーネント（描画に必要な情報を平坦化したもの） */
export type ResolvedComponent = {
  componentId: string;
  key: string;
  name: string;
  type: ComponentType;
  config: RichTextConfig | LabeledTextConfig | FixedMessageConfig;
  /** FIXED_MESSAGE の表示文面（overrides.message） */
  message: string | null;
  /** 既存エントリの入力値（なければ null） */
  value: ComponentValue | null;
};

/** ある日付に対して解決されたフォーム全体 */
export type ResolvedForm = {
  formVersionId: string;
  formVersionName: string;
  components: ResolvedComponent[];
};

export function emptyValueFor(
  type: ComponentType,
  config: RichTextConfig | LabeledTextConfig | FixedMessageConfig,
): ComponentValue | null {
  switch (type) {
    case "RICH_TEXT":
      return "";
    case "LABELED_TEXT": {
      const groups = (config as LabeledTextConfig).groups ?? [];
      return Object.fromEntries(groups.map((g) => [g, ""]));
    }
    case "FIXED_MESSAGE":
    default:
      return null;
  }
}

/** 旧フォーマット（配列ベース）も含め、型に応じた値へ正規化する。 */
export function normalizeValue(
  type: ComponentType,
  raw: unknown,
  config: RichTextConfig | LabeledTextConfig | FixedMessageConfig,
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

/** リッチテキスト/ラベル付きの値から、検索用のプレーンテキストを取り出す。 */
export function valueToPlainText(value: ComponentValue): string {
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
