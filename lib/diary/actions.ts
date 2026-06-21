"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dateKeyToUtcDate, isDateKey } from "@/lib/date";
import type { ComponentValue } from "./types";

export type SaveDiaryInput = {
  dateKey: string;
  goal: string;
  rating: number | null;
  values: { componentId: string; value: ComponentValue }[];
};

export type SaveDiaryResult =
  | { ok: true }
  | { ok: false; error: string };

/** 日記エントリを (userId, date) で upsert し、各コンポーネント値を保存する。 */
export async function saveDiaryEntry(
  input: SaveDiaryInput,
): Promise<SaveDiaryResult> {
  const user = await requireUser();

  if (!isDateKey(input.dateKey)) {
    return { ok: false, error: "日付の形式が不正です" };
  }
  if (input.rating !== null && (input.rating < 1 || input.rating > 4)) {
    return { ok: false, error: "総合評価は 1〜4 で指定してください" };
  }

  const date = dateKeyToUtcDate(input.dateKey);
  const goal = input.goal.trim() === "" ? null : input.goal.trim();

  try {
    await prisma.$transaction(async (tx) => {
      const entry = await tx.diaryEntry.upsert({
        where: { userId_date: { userId: user.id, date } },
        update: { goal, rating: input.rating },
        create: { userId: user.id, date, goal, rating: input.rating },
      });

      for (const { componentId, value } of input.values) {
        await tx.diaryEntryValue.upsert({
          where: { entryId_componentId: { entryId: entry.id, componentId } },
          update: { value: value as object },
          create: { entryId: entry.id, componentId, value: value as object },
        });
      }
    });
  } catch (e) {
    console.error("saveDiaryEntry failed", e);
    return { ok: false, error: "保存に失敗しました" };
  }

  revalidatePath(`/diary/${input.dateKey}`);
  revalidatePath("/");
  return { ok: true };
}
