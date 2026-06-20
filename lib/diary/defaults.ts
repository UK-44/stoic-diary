import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { ComponentType } from "./types";

// 新規ユーザーに最初から入れておく既定構成（Notion「Daily」を再現）。
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
  message?: string; // FIXED_MESSAGE の文面（FormVersionItem.overrides へ）
};

const DEFAULT_COMPONENTS: DefaultComponent[] = [
  { key: "morning_message", name: "マイメッセージ（朝）", type: "FIXED_MESSAGE", config: {}, order: 10, message: "Keep simple. 余白をつくる。" },
  { key: "today_thoughts", name: "今日にかける想い", type: "BULLET_LIST", config: {}, order: 20 },
  { key: "memo", name: "メモ", type: "BULLET_LIST", config: {}, order: 30 },
  { key: "good_bad_action", name: "今日の Good Action / Bad Action", type: "GROUPED_LIST", config: { groups: ["Good", "Bad"] }, order: 40 },
  { key: "tomorrow_me", name: "明日の俺へ", type: "BULLET_LIST", config: {}, order: 50 },
  { key: "night_message", name: "マイメッセージ（夜）", type: "FIXED_MESSAGE", config: {}, order: 60, message: NIGHT_MESSAGE },
];

/**
 * ユーザーにまだコンポーネントが無ければ、既定構成を一括作成する（冪等）。
 * 新規ログイン時に呼ばれることを想定。
 */
export async function ensureUserDefaults(userId: string): Promise<void> {
  const existing = await prisma.diaryComponent.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      DEFAULT_COMPONENTS.map((c) =>
        tx.diaryComponent.create({
          data: {
            userId,
            key: c.key,
            name: c.name,
            type: c.type,
            config: c.config,
            order: c.order,
          },
        }),
      ),
    );
    const idByKey = new Map(created.map((c) => [c.key, c.id]));

    const formVersion = await tx.formVersion.create({
      data: {
        userId,
        name: "現行構成（Notion 移行）",
        effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
      },
    });

    await tx.formVersionItem.createMany({
      data: DEFAULT_COMPONENTS.map((c) => ({
        formVersionId: formVersion.id,
        componentId: idByKey.get(c.key)!,
        overrides:
          c.type === "FIXED_MESSAGE"
            ? ({ message: c.message ?? "" } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      })),
    });
  });
}
