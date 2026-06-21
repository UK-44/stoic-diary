-- 版管理（FormVersion）を廃止し、日記フォームをユーザーの「項目一覧」へ一本化する。

-- 固定メッセージの文面を、版の overrides からコンポーネント config.message へ移す（消失防止）。
UPDATE "DiaryComponent" dc
SET "config" = jsonb_set(
  COALESCE(dc."config", '{}'::jsonb),
  '{message}',
  fvi."overrides"->'message',
  true
)
FROM "FormVersionItem" fvi
WHERE fvi."componentId" = dc."id"
  AND dc."type" = 'FIXED_MESSAGE'
  AND fvi."overrides" ? 'message';

-- DiaryEntry の版参照を撤去
ALTER TABLE "DiaryEntry" DROP CONSTRAINT IF EXISTS "DiaryEntry_formVersionId_fkey";
ALTER TABLE "DiaryEntry" DROP COLUMN "formVersionId";

-- 版テーブルを削除
DROP TABLE "FormVersionItem";
DROP TABLE "FormVersion";
