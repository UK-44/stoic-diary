-- Idea（アイデア）と Review の項目化。

-- Idea
CREATE TYPE "IdeaLabel" AS ENUM ('FAMILY', 'WORK', 'MAN');

CREATE TABLE "Idea" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "rating" INTEGER NOT NULL DEFAULT 0,
  "label" "IdeaLabel",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Idea_userId_createdAt_idx" ON "Idea"("userId", "createdAt");
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PeriodReview を項目化（goal / wentWell / couldImprove / nextActions）
ALTER TABLE "PeriodReview" ADD COLUMN "goal" TEXT;
ALTER TABLE "PeriodReview" ADD COLUMN "wentWell" TEXT;
ALTER TABLE "PeriodReview" ADD COLUMN "couldImprove" TEXT;
ALTER TABLE "PeriodReview" ADD COLUMN "nextActions" TEXT;
UPDATE "PeriodReview" SET "wentWell" = "content" WHERE "content" IS NOT NULL;
ALTER TABLE "PeriodReview" DROP COLUMN "content";
