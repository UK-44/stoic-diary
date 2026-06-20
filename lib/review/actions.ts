"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateKeyToUtcDate, isDateKey } from "@/lib/date";
import type { PeriodType } from "@/lib/generated/prisma/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 期間（週/月）のまとめ振り返り文を保存する。 */
export async function savePeriodReview(input: {
  periodType: PeriodType;
  periodStart: string; // YYYY-MM-DD
  content: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!isDateKey(input.periodStart)) {
    return { ok: false, error: "期間の指定が不正です" };
  }
  const periodStart = dateKeyToUtcDate(input.periodStart);
  const content = input.content.trim() === "" ? null : input.content;

  await prisma.periodReview.upsert({
    where: {
      userId_periodType_periodStart: {
        userId: user.id,
        periodType: input.periodType,
        periodStart,
      },
    },
    update: { content },
    create: { userId: user.id, periodType: input.periodType, periodStart, content },
  });
  revalidatePath("/review");
  return { ok: true };
}
