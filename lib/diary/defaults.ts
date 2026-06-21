import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { ComponentType } from "./types";

// 新規ユーザーに最初から入れておく既定の項目（Notion「Daily」を再現）。
const NIGHT_MESSAGE = [
  "似た者同士の街の中",
  "空っぽ同士の腕で今",
  "躊躇いひとつもなくあなたを抱き寄せる",
  "別れの時まで",
  "ひと時だって愛しそびれないように",
  "そう言い聞かすように",
].join("\n");

type DefaultComponent = {
  key: string;
  name: string;
  type: ComponentType;
  config: Prisma.InputJsonValue;
  order: number;
};

const DEFAULT_COMPONENTS: DefaultComponent[] = [
  { key: "morning_message", name: "マイメッセージ（朝）", type: "FIXED_MESSAGE", config: { message: "Keep simple. 余白をつくる。" }, order: 10 },
  { key: "today_thoughts", name: "今日にかける想い", type: "RICH_TEXT", config: {}, order: 20 },
  { key: "memo", name: "メモ", type: "RICH_TEXT", config: {}, order: 30 },
  { key: "good_bad_action", name: "今日の Good Action / Bad Action", type: "LABELED_TEXT", config: { groups: ["Good", "Bad"] }, order: 40 },
  { key: "tomorrow_me", name: "明日の俺へ", type: "RICH_TEXT", config: {}, order: 50 },
  { key: "night_message", name: "マイメッセージ（夜）", type: "FIXED_MESSAGE", config: { message: NIGHT_MESSAGE }, order: 60 },
];

/**
 * ユーザーにまだ項目（コンポーネント）が無ければ、既定の項目を一括作成する（冪等）。
 * 新規ログイン時に呼ばれることを想定。
 */
export async function ensureUserDefaults(userId: string): Promise<void> {
  const existing = await prisma.diaryComponent.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.diaryComponent.createMany({
    data: DEFAULT_COMPONENTS.map((c) => ({
      userId,
      key: c.key,
      name: c.name,
      type: c.type,
      config: c.config,
      order: c.order,
    })),
  });
}
