-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "PeriodReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "periodStart" DATE NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeriodReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeriodReview_userId_periodType_periodStart_idx" ON "PeriodReview"("userId", "periodType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodReview_userId_periodType_periodStart_key" ON "PeriodReview"("userId", "periodType", "periodStart");

-- AddForeignKey
ALTER TABLE "PeriodReview" ADD CONSTRAINT "PeriodReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
