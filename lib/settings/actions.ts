"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 長期目標（プロフィール的設定）を保存する。 */
export async function saveLongTermGoal(goal: string): Promise<ActionResult> {
  const user = await requireUser();
  const value = goal.trim() === "" ? null : goal.trim();
  await prisma.user.update({ where: { id: user.id }, data: { longTermGoal: value } });
  revalidatePath("/settings");
  return { ok: true };
}
