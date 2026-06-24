"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import { dateKeyToUtcDate, isDateKey } from "@/lib/date";
import type { ComponentType, HabitItem } from "@/lib/diary/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ---------- アカウント ----------

/** 長期目標（テキスト＋対象日）を保存する。 */
export async function saveLongTermGoal(
  goal: string,
  date: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const value = goal.trim() === "" ? null : goal.trim();
  const goalDate = date && isDateKey(date) ? dateKeyToUtcDate(date) : null;
  await prisma.user.update({
    where: { id: user.id },
    data: { longTermGoal: value, longTermGoalDate: goalDate },
  });
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

// ---------- 項目（コンポーネント） ----------
// テンプレ（種類）は固定。ユーザーはどのテンプレを使い、どんな名前・並び順にするかを決める。

export type ComponentInput = {
  name: string;
  placeholder?: string; // RICH_TEXT
  groups?: string[]; // LABELED_TEXT
  message?: string; // FIXED_MESSAGE
  habits?: HabitItem[]; // HABIT（名前空の行は捨て、ID が無ければ採番）
};

function buildConfig(type: ComponentType, input: ComponentInput): Prisma.InputJsonValue {
  switch (type) {
    case "RICH_TEXT":
    case "CHECKBOX_LIST":
      return input.placeholder ? { placeholder: input.placeholder } : {};
    case "LABELED_TEXT":
      return { groups: (input.groups ?? []).filter((g) => g.trim() !== "") };
    case "FIXED_MESSAGE":
      return { message: input.message ?? "" };
    case "HABIT":
      return {
        habits: (input.habits ?? [])
          .map((h) => ({
            id: h.id && h.id.trim() !== "" ? h.id : crypto.randomUUID(),
            name: h.name.trim(),
            difficulty: h.difficulty,
          }))
          .filter((h) => h.name !== ""),
      };
    default:
      return {};
  }
}

export async function createComponent(
  type: ComponentType,
  input: ComponentInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const name = input.name.trim();
  if (name === "") return { ok: false, error: "項目名を入力してください" };

  // key は自動採番（手入力しない）。order は末尾。
  const [count, agg] = await Promise.all([
    prisma.diaryComponent.count({ where: { userId: user.id } }),
    prisma.diaryComponent.aggregate({ where: { userId: user.id }, _max: { order: true } }),
  ]);

  try {
    await prisma.diaryComponent.create({
      data: {
        userId: user.id,
        key: `c${count + 1}`,
        name,
        type,
        config: buildConfig(type, input),
        order: (agg._max.order ?? 0) + 10,
      },
    });
  } catch {
    return { ok: false, error: "作成に失敗しました" };
  }
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

export async function updateComponent(
  id: string,
  input: ComponentInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.diaryComponent.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false, error: "対象が見つかりません" };
  if (input.name.trim() === "") return { ok: false, error: "項目名を入力してください" };

  await prisma.diaryComponent.update({
    where: { id },
    data: { name: input.name.trim(), config: buildConfig(existing.type, input) },
  });
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

/**
 * 項目を完全に削除する。紐づく日記の入力データ（DiaryEntryValue）も
 * 外部キーの ON DELETE CASCADE により連動して削除される。
 */
export async function deleteComponent(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const existing = await prisma.diaryComponent.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "対象が見つかりません" };

  await prisma.diaryComponent.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}

/** 並び順を 1 つ上/下に移動する（隣と order を入れ替え）。 */
export async function moveComponent(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const user = await requireUser();
  const list = await prisma.diaryComponent.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, error: "対象が見つかりません" };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return { ok: true };

  const a = list[idx];
  const b = list[swapIdx];
  await prisma.$transaction([
    prisma.diaryComponent.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.diaryComponent.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true };
}
