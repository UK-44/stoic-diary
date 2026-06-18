import type { ComponentType } from "@/lib/generated/prisma/enums";

export type { ComponentType };

// --- コンポーネントの config（DiaryComponent.config） ---
export type FixedMessageConfig = Record<string, never>;
export type BulletListConfig = { placeholder?: string };
export type GroupedListConfig = { groups: string[] };

// --- FormVersionItem.overrides（版ごとの上書き） ---
export type FixedMessageOverrides = { message: string };

// --- DiaryEntryValue.value（型ごとの入力値） ---
export type BulletListValue = string[];
export type GroupedListValue = Record<string, string[]>;
export type ComponentValue = BulletListValue | GroupedListValue;

/** 解決済みの 1 コンポーネント（描画に必要な情報を平坦化したもの） */
export type ResolvedComponent = {
  componentId: string;
  key: string;
  name: string;
  type: ComponentType;
  config: BulletListConfig | GroupedListConfig | FixedMessageConfig;
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
  config: BulletListConfig | GroupedListConfig | FixedMessageConfig,
): ComponentValue | null {
  switch (type) {
    case "BULLET_LIST":
      return [];
    case "GROUPED_LIST": {
      const groups = (config as GroupedListConfig).groups ?? [];
      return Object.fromEntries(groups.map((g) => [g, [] as string[]]));
    }
    case "FIXED_MESSAGE":
    default:
      return null;
  }
}
