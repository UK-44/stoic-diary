"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateKeyToUtcDate, isDateKey } from "@/lib/date";
import type { PeriodType } from "@/lib/generated/prisma/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 期間（週/月）の目標と振り返り（3項目）を保存する。 */
export async function savePeriodReview(input: {
  periodType: PeriodType;
  periodStart: string; // YYYY-MM-DD
  goal: string;
  wentWell: string;
  couldImprove: string;
  nextActions: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  if (!isDateKey(input.periodStart)) {
    return { ok: false, error: "期間の指定が不正です" };
  }
  const periodStart = dateKeyToUtcDate(input.periodStart);
  const norm = (s: string) => (s.trim() === "" ? null : s);
  const data = {
    goal: norm(input.goal),
    wentWell: norm(input.wentWell),
    couldImprove: norm(input.couldImprove),
    nextActions: norm(input.nextActions),
  };

  await prisma.periodReview.upsert({
    where: {
      userId_periodType_periodStart: {
        userId: user.id,
        periodType: input.periodType,
        periodStart,
      },
    },
    update: data,
    create: { userId: user.id, periodType: input.periodType, periodStart, ...data },
  });
  revalidatePath("/review");
  return { ok: true };
}
