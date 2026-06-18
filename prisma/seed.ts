import "dotenv/config";
import { prisma } from "../lib/db";
import { Prisma } from "../lib/generated/prisma/client";
import type { ComponentType } from "../lib/generated/prisma/enums";

// Notion「Daily」の現行構成を初期データとして再現する。
// 仕様: docs/spec/02-domain-model.md の「初期シードデータ」

const NIGHT_MESSAGE = [
  "似た者同士の街の中",
  "空っぽ同士の腕で今",
  "躊躇いひとつもなくあなたを抱き寄せる",
  "別れの時まで",
  "ひと時だって愛しそびれないように",
  "そう言い聞かすように",
].join("\n");

type SeedComponent = {
  key: string;
  name: string;
  type: ComponentType;
  config: Prisma.InputJsonValue;
  order: number;
  overrides?: Prisma.InputJsonValue;
};

const COMPONENTS: SeedComponent[] = [
  {
    key: "morning_message",
    name: "マイメッセージ（朝）",
    type: "FIXED_MESSAGE",
    config: {},
    order: 1,
    overrides: { message: "Keep simple. 余白をつくる。" },
  },
  {
    key: "today_thoughts",
    name: "今日にかける想い",
    type: "BULLET_LIST",
    config: {},
    order: 2,
  },
  {
    key: "memo",
    name: "メモ",
    type: "BULLET_LIST",
    config: {},
    order: 3,
  },
  {
    key: "good_bad_action",
    name: "今日の Good Action / Bad Action",
    type: "GROUPED_LIST",
    config: { groups: ["Good", "Bad"] },
    order: 4,
  },
  {
    key: "tomorrow_me",
    name: "明日の俺へ",
    type: "BULLET_LIST",
    config: {},
    order: 5,
  },
  {
    key: "night_message",
    name: "マイメッセージ（夜）",
    type: "FIXED_MESSAGE",
    config: {},
    order: 6,
    overrides: { message: NIGHT_MESSAGE },
  },
];

const FORM_VERSION_NAME = "現行構成（Notion 移行）";
// 過去の全エントリに適用されるよう十分に過去の日付を有効開始日にする。
const EFFECTIVE_FROM = new Date("2020-01-01T00:00:00.000Z");

async function main() {
  // 1) コンポーネントマスタを upsert（key で冪等）。
  const componentByKey = new Map<string, string>();
  for (const c of COMPONENTS) {
    const saved = await prisma.diaryComponent.upsert({
      where: { key: c.key },
      update: { name: c.name, type: c.type, config: c.config },
      create: { key: c.key, name: c.name, type: c.type, config: c.config },
    });
    componentByKey.set(c.key, saved.id);
  }

  // 2) フォーム構成版を find-or-create（name で冪等に扱う）。
  let formVersion = await prisma.formVersion.findFirst({
    where: { name: FORM_VERSION_NAME },
  });
  formVersion ??= await prisma.formVersion.create({
    data: { name: FORM_VERSION_NAME, effectiveFrom: EFFECTIVE_FROM },
  });

  // 3) 版に属する各部品を upsert（(formVersionId, componentId) で冪等）。
  for (const c of COMPONENTS) {
    const componentId = componentByKey.get(c.key)!;
    await prisma.formVersionItem.upsert({
      where: {
        formVersionId_componentId: {
          formVersionId: formVersion.id,
          componentId,
        },
      },
      update: { order: c.order, overrides: c.overrides ?? undefined },
      create: {
        formVersionId: formVersion.id,
        componentId,
        order: c.order,
        overrides: c.overrides ?? undefined,
      },
    });
  }

  console.log(
    `seed 完了: components=${COMPONENTS.length}, formVersion="${FORM_VERSION_NAME}"`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
