-- 「今日の目標」を固定列からコンポーネントへ移行し、長期目標に日付を追加する。

-- 1) 各ユーザーに「今日の目標」項目（フリー＝RICH_TEXT, order=5）を用意（無ければ）。
INSERT INTO "DiaryComponent" ("id","userId","key","name","type","config","order","createdAt","updatedAt")
SELECT gen_random_uuid()::text, u."id", 'daily_goal', '今日の目標', 'RICH_TEXT', '{}'::jsonb, 5, now(), now()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "DiaryComponent" dc WHERE dc."userId" = u."id" AND dc."key" = 'daily_goal'
);

-- 2) 既存エントリの goal を、その項目の値（HTML 段落）へ移す。
INSERT INTO "DiaryEntryValue" ("id","entryId","componentId","value")
SELECT
  gen_random_uuid()::text,
  e."id",
  dc."id",
  to_jsonb('<p>' || replace(replace(replace(e."goal", '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>')
FROM "DiaryEntry" e
JOIN "DiaryComponent" dc ON dc."userId" = e."userId" AND dc."key" = 'daily_goal'
WHERE e."goal" IS NOT NULL AND e."goal" <> ''
ON CONFLICT ("entryId","componentId") DO NOTHING;

-- 3) goal 列を削除。
ALTER TABLE "DiaryEntry" DROP COLUMN "goal";

-- 4) 長期目標の対象日を追加。
ALTER TABLE "User" ADD COLUMN "longTermGoalDate" DATE;
