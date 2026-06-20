-- コンポーネント／フォーム構成をユーザー所有にし、コンポーネントに order を追加する。
-- 既存はグローバル seed の捨てデータのみ（実エントリなし）なので、先に削除して NOT NULL 列を追加する。

-- Clear throwaway seed data (FK 依存順で削除)
DELETE FROM "FormVersionItem";
DELETE FROM "FormVersion";
DELETE FROM "DiaryComponent";

-- DropIndex
DROP INDEX "DiaryComponent_key_key";

-- DropIndex
DROP INDEX "FormVersion_effectiveFrom_idx";

-- DropIndex
DROP INDEX "FormVersionItem_formVersionId_order_idx";

-- AlterTable
ALTER TABLE "DiaryComponent" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FormVersion" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FormVersionItem" DROP COLUMN "order";

-- CreateIndex
CREATE INDEX "DiaryComponent_userId_order_idx" ON "DiaryComponent"("userId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryComponent_userId_key_key" ON "DiaryComponent"("userId", "key");

-- CreateIndex
CREATE INDEX "FormVersion_userId_effectiveFrom_idx" ON "FormVersion"("userId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "DiaryComponent" ADD CONSTRAINT "DiaryComponent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormVersion" ADD CONSTRAINT "FormVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
