-- コンポーネント参照の外部キーを ON DELETE CASCADE にする。
-- コンポーネント削除（およびユーザー削除のカスケード）で、参照する
-- FormVersionItem / DiaryEntryValue も連動して削除されるようにする。

-- DropForeignKey
ALTER TABLE "FormVersionItem" DROP CONSTRAINT "FormVersionItem_componentId_fkey";

-- DropForeignKey
ALTER TABLE "DiaryEntryValue" DROP CONSTRAINT "DiaryEntryValue_componentId_fkey";

-- AddForeignKey
ALTER TABLE "FormVersionItem" ADD CONSTRAINT "FormVersionItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "DiaryComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntryValue" ADD CONSTRAINT "DiaryEntryValue_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "DiaryComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
